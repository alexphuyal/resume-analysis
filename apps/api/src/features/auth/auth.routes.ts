import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authMiddleware } from './auth.middleware';
import { authController } from './auth.controller';
import { githubSchema, googleSchema, loginSchema, registerSchema } from './auth.schemas';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.me);
router.post('/google', validate(googleSchema), authController.google);
router.post('/github', validate(githubSchema), authController.github);

export { router as authRouter };
