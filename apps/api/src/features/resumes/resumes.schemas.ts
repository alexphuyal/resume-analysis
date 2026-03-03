import Joi from 'joi';

export const analyzeResumeSchema = Joi.object({
  jobRole: Joi.string().trim().min(2).max(120).required(),
  jobDescription: Joi.string().allow('').max(15000).optional(),
  geminiKey: Joi.string().trim().allow('').optional(),
  groqKey: Joi.string().trim().allow('').optional(),
  hfKey: Joi.string().trim().allow('').optional(),
  aiProvider: Joi.string().valid('gemini', 'groq', 'huggingface').default('gemini'),
  userId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).optional(),
  jobUrl: Joi.string().uri({ scheme: ['http', 'https'] }).allow('').optional(),
});

export const resumeIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
});

export const resumeListQuerySchema = Joi.object({
  userId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).optional(),
});
