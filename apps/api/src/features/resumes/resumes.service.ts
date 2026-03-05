import { KeywordType, SkillType, SuggestionType } from '@prisma/client';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import mammoth from 'mammoth';
import path from 'path';
import { Readable } from 'stream';
import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ApplicationException } from '../../common/errors/application-exception';

export type AIProvider = 'gemini' | 'groq' | 'huggingface';

interface AIResult {
  overall_score?: number;
  ats_score?: number;
  content_score?: number;
  keyword_score?: number;
  format_score?: number;
  impact_score?: number;
  readability_score?: number;
  skills_score?: number;
  experience_score?: number;
  summary?: string;
  skills?: { found?: string[]; missing?: string[] };
  keywords?: { matched?: string[]; missing?: string[] };
  suggestions?: Array<{ type?: string; text?: string }>;
  enhanced_bullets?: Array<{ original?: string; improved?: string }>;
  learning_resources?: Array<{
    skill?: string;
    platform?: string;
    title?: string;
    url?: string;
    is_free?: boolean;
  }>;
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const score = (value: unknown, fallback: number): number => {
  const parsed = Math.round(Number(value) || fallback);
  return Math.min(100, Math.max(0, parsed));
};

const parseAIResponse = (raw: string): AIResult => {
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);

  return JSON.parse(cleaned) as AIResult;
};

const buildPrompt = (resumeText: string, jobRole: string, jobDescription?: string): string => {
  const jd = jobDescription ? `\n\nJob Description:\n${jobDescription.slice(0, 2500)}` : '';

  return `You are a world-class resume analyst and career coach with 15+ years in technical recruiting.
Analyze the following resume for a "${jobRole}" position and return a SINGLE valid JSON object. No markdown, no code blocks, just raw JSON.

Resume Text:
${resumeText.slice(0, 4000)}
${jd}

Return EXACTLY this JSON (all fields required, use real values from the resume):
{
  "overall_score": <integer 0-100 based on actual resume quality>,
  "ats_score": <integer 0-100>,
  "content_score": <integer 0-100>,
  "keyword_score": <integer 0-100>,
  "format_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "readability_score": <integer 0-100>,
  "skills_score": <integer 0-100>,
  "experience_score": <integer 0-100>,
  "summary": "<2-3 sentence executive summary>",
  "skills": {
    "found": ["<actual skill from resume>"],
    "missing": ["<critical skill not found>"]
  },
  "keywords": {
    "matched": ["<keyword found>"],
    "missing": ["<important keyword missing>"]
  },
  "suggestions": [
    {"type": "critical", "text": "<specific actionable improvement>"},
    {"type": "warning", "text": "<specific actionable improvement>"},
    {"type": "info", "text": "<specific actionable improvement>"}
  ],
  "enhanced_bullets": [
    {"original": "<actual bullet>", "improved": "<rewrite with metric + impact>"}
  ],
  "learning_resources": [
    {"skill": "<missing skill>", "platform": "Coursera", "title": "<course>", "url": "https://www.coursera.org/learn/example", "is_free": false}
  ]
}

IMPORTANT: Return ONLY raw JSON.`;
};

const analyzeWithGemini = async (apiKey: string, resumeText: string, jobRole: string, jobDescription?: string): Promise<AIResult> => {
  const prompt = buildPrompt(resumeText, jobRole, jobDescription);

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 90000 },
  );

  const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) throw new Error('Unexpected Gemini response format');

  return parseAIResponse(raw);
};

const analyzeWithGroq = async (apiKey: string, resumeText: string, jobRole: string, jobDescription?: string): Promise<AIResult> => {
  const groq = new Groq({ apiKey });
  const prompt = buildPrompt(resumeText, jobRole, jobDescription);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a resume analysis expert. Respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('Unexpected Groq response format');

  return parseAIResponse(raw);
};

const analyzeWithHuggingFace = async (apiKey: string, resumeText: string, jobRole: string, jobDescription?: string): Promise<AIResult> => {
  const prompt = buildPrompt(resumeText, jobRole, jobDescription);

  const response = await axios.post(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
    {
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 4096,
        temperature: 0.3,
        return_full_text: false,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    },
  );

  let raw = '';
  if (Array.isArray(response.data) && response.data[0]?.generated_text) {
    raw = response.data[0].generated_text.trim();
  } else if (response.data?.generated_text) {
    raw = response.data.generated_text.trim();
  }

  if (!raw) throw new Error('Unexpected HuggingFace response format');
  return parseAIResponse(raw);
};

export const resumeService = {
  uploadsDir: UPLOADS_DIR,

  /**
   * @description Extract plain text from a resume buffer (PDF/DOC/DOCX).
   * @input buffer: Buffer, filename: string
   * @returns Extracted text string (empty string when unsupported/unreadable).
   */
  async extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'pdf') {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
      const result = await parser.getText();
      return result?.text || '';
    }

    if (ext === 'docx' || ext === 'doc') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    return '';
  },

  /**
   * @description Resolve selected AI provider and choose a valid API key source.
   * @input providerRaw?: string, geminiKey?: string, groqKey?: string, hfKey?: string
   * @returns Provider/key pair.
   */
  resolveProviderAndKey(providerRaw?: string, geminiKey?: string, groqKey?: string, hfKey?: string): { provider: AIProvider; apiKey: string } {
    const provider = ((providerRaw || 'gemini').toLowerCase() as AIProvider);

    if (provider === 'groq') {
      const apiKey = groqKey || env.groqApiKey;
      if (!apiKey) throw new ApplicationException('Groq API key is required. Enter it in the form above.', 400, 'GROQ_KEY_REQUIRED');
      return { provider, apiKey };
    }

    if (provider === 'huggingface') {
      const apiKey = hfKey || env.hfApiKey;
      if (!apiKey) throw new ApplicationException('HuggingFace API key is required. Enter it in the form above.', 400, 'HF_KEY_REQUIRED');
      return { provider, apiKey };
    }

    const apiKey = geminiKey || env.geminiApiKey;
    if (!apiKey) throw new ApplicationException('Gemini API key is required. Enter it in the form above.', 400, 'GEMINI_KEY_REQUIRED');

    return { provider: 'gemini', apiKey };
  },

  /**
   * @description Dispatch AI analysis request to the configured provider.
   * @input provider: AIProvider, apiKey: string, resumeText: string, jobRole: string, jobDescription?: string
   * @returns Structured AI analysis result and model name.
   */
  async runAIAnalysis(provider: AIProvider, apiKey: string, resumeText: string, jobRole: string, jobDescription?: string): Promise<{ result: AIResult; modelName: string }> {
    switch (provider) {
      case 'groq':
        return { result: await analyzeWithGroq(apiKey, resumeText, jobRole, jobDescription), modelName: 'llama-3.3-70b-versatile (Groq)' };
      case 'huggingface':
        return { result: await analyzeWithHuggingFace(apiKey, resumeText, jobRole, jobDescription), modelName: 'Mistral-7B-Instruct (HuggingFace)' };
      case 'gemini':
      default:
        return { result: await analyzeWithGemini(apiKey, resumeText, jobRole, jobDescription), modelName: 'gemini-2.5-flash' };
    }
  },

  /**
   * @description Send uploaded file bytes to the external AI extraction service.
   * @input fileBuffer: Buffer, fileName: string, mimetype: string
   * @returns Extracted resume text string from AI service response.
   */
  async extractWithAIService(fileBuffer: Buffer, fileName: string, mimetype: string): Promise<string> {
    const fd = new FormData();
    const readableStream = Readable.from(fileBuffer);

    fd.append('resume', readableStream, {
      filename: fileName,
      contentType: mimetype,
      knownLength: fileBuffer.length,
    });

    const extractRes = await axios.post(`${env.aiServiceUrl}/extract`, fd, {
      headers: fd.getHeaders(),
      timeout: 15000,
    });

    return extractRes.data?.text || '';
  },

  /**
   * @description Convert provider-specific runtime errors into a unified application exception.
   * @input provider: AIProvider, err: unknown
   * @returns ApplicationException with normalized message and code.
   */
  toProviderException(provider: AIProvider, err: unknown): ApplicationException {
    const e = err as any;

    if (provider === 'gemini') {
      const geminiError = e?.response?.data?.error;
      if (geminiError?.status === 'INVALID_ARGUMENT') return new ApplicationException('Invalid Gemini API key format', 500, 'GEMINI_INVALID_ARGUMENT');
      if (geminiError?.status === 'PERMISSION_DENIED') return new ApplicationException('Gemini API key is invalid or has no access. Get a free key at aistudio.google.com', 500, 'GEMINI_PERMISSION_DENIED');
      if (geminiError?.status === 'RESOURCE_EXHAUSTED') return new ApplicationException('Gemini API quota exceeded. Try again later or use a different key.', 500, 'GEMINI_QUOTA_EXHAUSTED');
      if (geminiError?.message) return new ApplicationException(geminiError.message, 500, 'GEMINI_ANALYSIS_FAILED');
      if (e?.code === 'ECONNABORTED') return new ApplicationException('Gemini API timed out. Try again.', 500, 'GEMINI_TIMEOUT');
    }

    if (provider === 'groq') {
      const status = e?.status || e?.response?.status;
      if (status === 401) return new ApplicationException('Invalid Groq API key. Get a free key at console.groq.com', 500, 'GROQ_UNAUTHORIZED');
      if (status === 429) return new ApplicationException('Groq rate limit exceeded. Try again in a moment.', 500, 'GROQ_RATE_LIMIT');
      if (e?.code === 'ECONNABORTED') return new ApplicationException('Groq API timed out. Try again.', 500, 'GROQ_TIMEOUT');
      return new ApplicationException(e?.message || 'Groq analysis failed', 500, 'GROQ_ANALYSIS_FAILED');
    }

    if (provider === 'huggingface') {
      const status = e?.response?.status;
      if (status === 401) return new ApplicationException('Invalid HuggingFace API key. Get a free key at huggingface.co/settings/tokens', 500, 'HF_UNAUTHORIZED');
      if (status === 503) return new ApplicationException('HuggingFace model is loading. Try again in ~30 seconds.', 500, 'HF_MODEL_LOADING');
      if (status === 429) return new ApplicationException('HuggingFace rate limit exceeded. Try again later.', 500, 'HF_RATE_LIMIT');
      if (e?.code === 'ECONNABORTED') return new ApplicationException('HuggingFace API timed out. The model may be loading. Try again.', 500, 'HF_TIMEOUT');
      return new ApplicationException(e?.response?.data?.error || e?.message || 'HuggingFace analysis failed', 500, 'HF_ANALYSIS_FAILED');
    }

    return new ApplicationException('AI analysis failed', 500, 'AI_ANALYSIS_FAILED');
  },

  /**
   * @description Persist AI analysis scores, suggestions, keywords, and resources into the database.
   * @input resumeId: string, aiResult: AIResult, resumeText: string, modelName: string
   * @returns Promise<void> after successful persistence.
   */
  async persistAnalysis(resumeId: string, aiResult: AIResult, resumeText: string, modelName: string): Promise<void> {
    const skillsFound = Array.isArray(aiResult.skills?.found) ? aiResult.skills?.found : [];
    const skillsMissing = Array.isArray(aiResult.skills?.missing) ? aiResult.skills?.missing : [];
    const kwMatched = Array.isArray(aiResult.keywords?.matched) ? aiResult.keywords?.matched : [];
    const kwMissing = Array.isArray(aiResult.keywords?.missing) ? aiResult.keywords?.missing : [];
    const suggestions = Array.isArray(aiResult.suggestions) ? aiResult.suggestions : [];
    const learningResources = Array.isArray(aiResult.learning_resources) ? aiResult.learning_resources : [];
    const enhancedBullets = Array.isArray(aiResult.enhanced_bullets) ? aiResult.enhanced_bullets : [];

    const suggestionType = (type: string | undefined): SuggestionType => {
      const normalized = (type || 'info').toUpperCase();
      if (normalized === 'CRITICAL') return SuggestionType.CRITICAL;
      if (normalized === 'WARNING') return SuggestionType.WARNING;
      return SuggestionType.INFO;
    };

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        overallScore: score(aiResult.overall_score, 70),
        atsScore: score(aiResult.ats_score, 70),
        contentScore: score(aiResult.content_score, 70),
        keywordScore: score(aiResult.keyword_score, 70),
        formatScore: score(aiResult.format_score, 70),
        impactScore: score(aiResult.impact_score, 60),
        readabilityScore: score(aiResult.readability_score, 75),
        skillsScore: score(aiResult.skills_score, 70),
        experienceScore: score(aiResult.experience_score, 70),
        rawText: resumeText.slice(0, 15000),
        summary: String(aiResult.summary || ''),
        enhancedBullets: JSON.stringify(enhancedBullets),
        aiModel: modelName,
        status: 'COMPLETED',
        skills: {
          create: [
            ...skillsFound.map((name) => ({ name: String(name), type: SkillType.FOUND })),
            ...skillsMissing.map((name) => ({ name: String(name), type: SkillType.MISSING })),
          ],
        },
        keywords: {
          create: [
            ...kwMatched.map((word) => ({ word: String(word), type: KeywordType.MATCHED })),
            ...kwMissing.map((word) => ({ word: String(word), type: KeywordType.MISSING })),
          ],
        },
        suggestions: {
          create: suggestions.map((entry, index) => ({
            type: suggestionType(entry.type),
            text: String(entry.text || ''),
            priority: index,
          })),
        },
        learningResources: {
          create: learningResources.map((resource) => ({
            skill: String(resource.skill || ''),
            platform: String(resource.platform || 'Online'),
            title: String(resource.title || ''),
            url: String(resource.url || '#'),
            isFree: Boolean(resource.is_free ?? true),
          })),
        },
      },
    });
  },
};
