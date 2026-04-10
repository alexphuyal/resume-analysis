import { Request, Response } from "express";
import { Status } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import fs from "fs";
import path from "path";
import { AIProvider, resumeService } from "./resumes.service";
import { Result } from "../../common/http/result";
import { handleControllerError } from "../../common/http/handle-controller-error";
import { ApplicationException } from "../../common/errors/application-exception";

const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const resumesController = {
  /**
   * @description Accept a resume upload, extract text, run AI analysis, and persist full analysis results.
   * @input multipart/form-data with file field `resume` and body fields: jobRole (required), optional jobDescription, aiProvider, keys, jobUrl.
   * @returns 200 with { id, message } when analysis succeeds, or an error response.
   */
  async analyze(req: Request, res: Response): Promise<void> {
    let tempPath: string | null = null;

    try {
      if (!req.file) {
        throw new ApplicationException(
          "Resume file is required",
          400,
          "RESUME_FILE_REQUIRED",
        );
      }

      const resumeFile = req.file;

      // todo : all this will be extracted using the file and no need to be passed
      const {
        jobRole,
        jobDescription,
        geminiKey,
        groqKey,
        hfKey,
        aiProvider,
        jobUrl,
      } = req.body as {
        jobRole: string;
        jobDescription?: string;
        geminiKey?: string;
        groqKey?: string;
        hfKey?: string;
        aiProvider?: string;
        jobUrl?: string;
      };

      if (!req.userId) {
        throw new ApplicationException(
          "Unauthorized",
          401,
          "UNAUTHORIZED",
        );
      }

      const providerResult = resumeService.resolveProviderAndKey(
        aiProvider,
        geminiKey,
        groqKey,
        hfKey,
      );

      if (!allowedMimeTypes.includes(resumeFile.mimetype)) {
        throw new ApplicationException(
          "Only PDF and Word documents are supported",
          400,
          "INVALID_FILE_TYPE",
        );
      }

      tempPath = resumeFile.path || null;
      const fileBuffer =
        tempPath && fs.existsSync(tempPath) ? fs.readFileSync(tempPath) : null;

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new ApplicationException(
          "File upload failed. Received empty file.",
          400,
          "EMPTY_FILE",
        );
      }

      let resumeText = "";

      try {
        resumeText = await resumeService.extractWithAIService(
          fileBuffer,
          resumeFile.originalname,
          resumeFile.mimetype,
        );
      } catch {
        // Fallback is handled below.
      }

      if (!resumeText || resumeText.trim().length < 100) {
        resumeText = await resumeService.extractTextFromBuffer(
          fileBuffer,
          resumeFile.originalname,
        );
        resumeText = resumeText.replace(/\s+/g, " ").trim();
      }

      if (!resumeText || resumeText.trim().length < 50) {
        throw new ApplicationException(
          "Could not extract text from the resume file. Please use a text-based PDF/Word file.",
          422,
          "TEXT_EXTRACTION_FAILED",
        );
      }

      const resume = await prisma.resume.create({
        data: {
          fileName: resumeFile.originalname,
          fileSize: resumeFile.size,
          jobRole,
          jobDescription: jobDescription || null,
          jobUrl: jobUrl || null,
          userId: req.userId,
          status: "PROCESSING",
        },
      });

      const ext = path.extname(resumeFile.originalname);
      const savedFilePath = path.join(
        resumeService.uploadsDir,
        `${resume.id}${ext}`,
      );
      fs.writeFileSync(savedFilePath, fileBuffer);

      try {
        const { provider, apiKey } = providerResult;
        const analysis = await resumeService.runAIAnalysis(
          provider as AIProvider,
          apiKey,
          resumeText,
          jobRole,
          jobDescription,
        );
        await resumeService.persistAnalysis(
          resume.id,
          analysis.result,
          resumeText,
          analysis.modelName,
        );
      } catch (err) {
        await prisma.resume.update({
          where: { id: resume.id },
          data: { status: "FAILED" },
        });
        const provider = providerResult.provider as AIProvider;
        throw resumeService.toProviderException(provider, err);
      }

      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.json(
        Result.ok("Analysis complete", {
          id: resume.id,
          message: "Analysis complete",
        }),
      );
    } catch (error) {
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore cleanup errors
        }
      }

      handleControllerError(res, error, "Analysis failed");
    }
  },

  /**
   * @description Stream a stored resume file by resume ID.
   * @input req.params: { id: string }
   * @returns File stream response when available, or an error response.
   */
  async getFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      if (!req.userId) {
        throw new ApplicationException(
          "Unauthorized",
          401,
          "UNAUTHORIZED",
        );
      }

      const resume = await prisma.resume.findFirst({
        where: { id, userId: req.userId },
        select: { fileName: true },
      });

      if (!resume) {
        res
          .status(404)
          .json(Result.fail("Resume not found", "RESUME_NOT_FOUND"));
        return;
      }

      const ext = path.extname(resume.fileName);
      const filePath = path.join(resumeService.uploadsDir, `${id}${ext}`);

      if (!fs.existsSync(filePath)) {
        res
          .status(404)
          .json(
            Result.fail(
              "File not available. It may have been submitted before file storage was enabled.",
              "FILE_NOT_FOUND",
            ),
          );
        return;
      }

      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      res.setHeader(
        "Content-Type",
        mimeTypes[ext] || "application/octet-stream",
      );
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${resume.fileName}"`,
      );
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      handleControllerError(res, error, "Failed to serve file");
    }
  },

  /**
   * @description Fetch a full resume analysis payload by resume ID.
   * @input req.params: { id: string }
   * @returns 200 with normalized analysis payload, or an error response.
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      if (!req.userId) {
        throw new ApplicationException(
          "Unauthorized",
          401,
          "UNAUTHORIZED",
        );
      }

      const resume = await prisma.resume.findFirst({
        where: { id, userId: req.userId },
        include: {
          skills: true,
          keywords: true,
          suggestions: { orderBy: { priority: "asc" } },
          learningResources: true,
        },
      });

      if (!resume) {
        res
          .status(404)
          .json(Result.fail("Resume not found", "RESUME_NOT_FOUND"));
        return;
      }

      const ext = path.extname(resume.fileName);
      const filePath = path.join(
        resumeService.uploadsDir,
        `${resume.id}${ext}`,
      );
      const hasFile = fs.existsSync(filePath);

      res.json(
        Result.ok("Resume fetched successfully", {
          id: resume.id,
          fileName: resume.fileName,
          fileSize: resume.fileSize,
          jobRole: resume.jobRole,
          jobUrl: resume.jobUrl,
          overallScore: resume.overallScore,
          atsScore: resume.atsScore,
          contentScore: resume.contentScore,
          keywordScore: resume.keywordScore,
          formatScore: resume.formatScore,
          impactScore: resume.impactScore,
          readabilityScore: resume.readabilityScore,
          skillsScore: resume.skillsScore,
          experienceScore: resume.experienceScore,
          summary: resume.summary,
          rawText: resume.rawText,
          aiModel: resume.aiModel,
          status: resume.status,
          createdAt: resume.createdAt,
          hasFile,
          enhancedBullets: resume.enhancedBullets
            ? JSON.parse(resume.enhancedBullets)
            : [],
          skills: {
            found: resume.skills
              .filter((s) => s.type === "FOUND")
              .map((s) => s.name),
            missing: resume.skills
              .filter((s) => s.type === "MISSING")
              .map((s) => s.name),
          },
          keywords: {
            matched: resume.keywords
              .filter((k) => k.type === "MATCHED")
              .map((k) => k.word),
            missing: resume.keywords
              .filter((k) => k.type === "MISSING")
              .map((k) => k.word),
          },
          suggestions: resume.suggestions.map((s) => ({
            type: s.type.toLowerCase(),
            text: s.text,
          })),
          learningResources: resume.learningResources.map((r) => ({
            skill: r.skill,
            platform: r.platform,
            title: r.title,
            url: r.url,
            isFree: r.isFree,
          })),
        }),
      );
    } catch (error) {
      handleControllerError(res, error, "Failed to fetch result");
    }
  },

  /**
   * @description List analysis history for the authenticated user.
   * @input req.query: { page?: number; limit?: number }
   * @returns 200 with resume summary list, or an error response.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        throw new ApplicationException(
          "Unauthorized",
          401,
          "UNAUTHORIZED",
        );
      }

      const { page, limit, status } = req.query as unknown as {
        page: number;
        limit: number;
        status?: Status;
      };

      const resumes = await prisma.resume.findMany({
        where: {
          userId: req.userId,
          status: status || undefined,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fileName: true,
          jobRole: true,
          overallScore: true,
          atsScore: true,
          contentScore: true,
          keywordScore: true,
          formatScore: true,
          impactScore: true,
          skillsScore: true,
          status: true,
          createdAt: true,
        },
      });

      res.json(Result.ok("Resume history fetched successfully", resumes));
    } catch (error) {
      handleControllerError(res, error, "Failed to fetch history");
    }
  },

  /**
   * @description Delete a resume analysis record and its stored file.
   * @input req.params: { id: string }
   * @returns 200 with delete confirmation, or an error response.
   */
  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      if (!req.userId) {
        throw new ApplicationException(
          "Unauthorized",
          401,
          "UNAUTHORIZED",
        );
      }

      const resume = await prisma.resume.findFirst({
        where: { id, userId: req.userId },
        select: { fileName: true },
      });

      if (!resume) {
        res
          .status(404)
          .json(Result.fail("Resume not found", "RESUME_NOT_FOUND"));
        return;
      }

      const ext = path.extname(resume.fileName);
      const filePath = path.join(resumeService.uploadsDir, `${id}${ext}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await prisma.resume.delete({ where: { id } });
      res.json(
        Result.ok("Resume deleted successfully", { message: "Deleted" }),
      );
    } catch (error) {
      handleControllerError(res, error, "Delete failed");
    }
  },
};
