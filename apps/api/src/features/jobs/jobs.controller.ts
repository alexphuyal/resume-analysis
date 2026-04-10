import { Request, Response } from "express";
import { handleControllerError } from "../../common/http/handle-controller-error";
import { Result } from "../../common/http/result";
import { ApplicationException } from "../../common/errors/application-exception";
import {
  getJobs,
  getJobById,
  getJobMatch,
  analyzeResumeForJob,
} from "./jobs.services";

export const jobsController = {
  list: (req: Request, res: Response) => {
    try {
      const result = getJobs(req.query as any);
      res.json(result);
    } catch (err) {
      console.error("Jobs list error:", err);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  },

  getById: (req: Request, res: Response) => {
    try {
      const job = getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (err) {
      console.error("Job getById error:", err);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  },

  async match(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        throw new ApplicationException("Unauthorized", 401, "UNAUTHORIZED");
      }

      const match = await getJobMatch(req.userId, req.params.id);
      res.json(Result.ok("Job match calculated successfully", match));
    } catch (error) {
      handleControllerError(res, error, "Failed to calculate job match");
    }
  },

  async analyze(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        throw new ApplicationException("Unauthorized", 401, "UNAUTHORIZED");
      }

      if (!req.file) {
        throw new ApplicationException(
          "Resume file is required",
          400,
          "RESUME_FILE_REQUIRED",
        );
      }

      const match = await analyzeResumeForJob(
        req.userId,
        req.params.id,
        req.file,
      );
      res.json(Result.ok("Resume analyzed against job successfully", match));
    } catch (error) {
      handleControllerError(res, error, "Failed to analyze resume for job");
    }
  },
};
