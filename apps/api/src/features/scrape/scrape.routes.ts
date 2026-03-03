import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { scrapeController } from './scrape.controller';
import { scrapeJobSchema } from './scrape.schemas';

const router = Router();

router.post('/job', validate(scrapeJobSchema), scrapeController.scrapeJob);

export { router as scrapeRouter };
