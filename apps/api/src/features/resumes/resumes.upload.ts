import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { resumeService } from './resumes.service';

const TEMP_UPLOADS_DIR = path.join(resumeService.uploadsDir, 'tmp');
if (!fs.existsSync(TEMP_UPLOADS_DIR)) fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const resumeUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});
