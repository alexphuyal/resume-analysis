import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
});

export const googleSchema = Joi.object({
  accessToken: Joi.string().trim().required(),
});

export const githubSchema = Joi.object({
  code: Joi.string().trim().required(),
});
