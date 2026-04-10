import { Router } from "express";
import { jobsController } from "./jobs.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { resumeUpload } from "../resumes/resumes.upload";

const router = Router();

router.use(authMiddleware);

router.get("/", jobsController.list);
router.get("/:id/match", jobsController.match);
router.post(
  "/:id/analyze",
  resumeUpload.single("resume"),
  jobsController.analyze,
);
router.get("/:id", jobsController.getById);

export { router as jobsRouter };
