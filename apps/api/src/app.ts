import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRouter } from "./features/auth/auth.routes";
import { resumesRouter } from "./features/resumes/resumes.routes";
import { scrapeRouter } from "./features/scrape/scrape.routes";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";

export const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRouter);
app.use("/api/resumes", resumesRouter);
app.use("/api/scrape", scrapeRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "resume-analysis-api", version: "2.0.0" });
});

app.use(notFoundHandler);
app.use(errorHandler);
