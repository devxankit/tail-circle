import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Multer with in-memory storage: files are kept as buffers and streamed
 * straight to Cloudinary — nothing touches the local disk. Keeps the
 * server stateless and horizontally scalable.
 */

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
]);

const DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const makeFilter = (allowed) => (_req, file, cb) => {
  if (!allowed || allowed.has(file.mimetype)) return cb(null, true);
  return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
};

const base = {
  storage: multer.memoryStorage(),
  limits: { fileSize: env.upload.maxFileSizeBytes },
};

/** Images only (jpeg/png/webp/gif/avif/heic). */
export const uploadImage = multer({ ...base, fileFilter: makeFilter(IMAGE_MIME) });

/** Images + common documents (pdf/doc/xls/txt/csv). */
export const uploadFile = multer({
  ...base,
  fileFilter: makeFilter(new Set([...IMAGE_MIME, ...DOC_MIME])),
});

/** Any file type (use sparingly). */
export const uploadAny = multer({ ...base, fileFilter: makeFilter(null) });

/**
 * Wrap a multer middleware to convert its errors into ApiError so the
 * global error handler returns a clean JSON response.
 */
export const handleMulter = (mw) => (req, res, next) =>
  mw(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          ApiError.badRequest(
            `File too large. Max ${env.upload.maxFileSizeBytes / (1024 * 1024)}MB.`
          )
        );
      }
      return next(ApiError.badRequest(err.message));
    }
    return next(err);
  });
