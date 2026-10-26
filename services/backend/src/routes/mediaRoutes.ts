import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadMedia, getMediaById } from '../controllers/mediaController';

const router = Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `road-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i;
    const isMimeValid = allowed.test(file.mimetype);
    const isExtValid = allowed.test(path.extname(file.originalname).slice(1));
    if (isMimeValid && isExtValid) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP image formats are supported.'));
    }
  }
});

router.post('/upload', upload.single('file'), uploadMedia);
router.get('/:id', getMediaById);

export default router;
