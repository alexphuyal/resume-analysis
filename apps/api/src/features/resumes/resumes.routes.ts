import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { resumesController } from './resumes.controller';
import { analyzeResumeSchema, resumeIdParamSchema, resumeListQuerySchema } from './resumes.schemas';
import { resumeUpload } from './resumes.upload';

const router = Router();

router.post('/analyze', resumeUpload.single('resume'), validate(analyzeResumeSchema), resumesController.analyze);
router.get('/:id/file', validate(resumeIdParamSchema, 'params'), resumesController.getFile);
router.get('/:id', validate(resumeIdParamSchema, 'params'), resumesController.getById);
router.get('/', validate(resumeListQuerySchema, 'query'), resumesController.list);
router.delete('/:id', validate(resumeIdParamSchema, 'params'), resumesController.remove);

export { router as resumesRouter };
