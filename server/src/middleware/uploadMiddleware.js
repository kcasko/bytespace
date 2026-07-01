import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve upload directories relative to this file: server/src/middleware → server/uploads
const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

// Extension map for safe filename generation. SVG is intentionally excluded.
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

/**
 * Build a multer instance for a specific upload subdirectory.
 *
 * File size limit: 5 MB for both avatars and backgrounds.
 * If you need separate limits in the future, pass a `limits` override.
 */
function buildUploader(subfolder, limits = { fileSize: 5 * 1024 * 1024 }) {
  const storage = multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, path.join(uploadsRoot, subfolder));
    },
    filename(_req, file, cb) {
      // Do NOT use the original filename. Generate a random hex name with the
      // correct extension based on the validated MIME type so path traversal
      // is impossible and the stored name is safe.
      const ext = MIME_TO_EXT[file.mimetype] || '.bin';
      const safeName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      cb(null, safeName);
    }
  });

  function fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      // Pass an error so the route handler can return a 400.
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }

    cb(null, true);
  }

  return multer({ storage, fileFilter, limits });
}

export const avatarUploader = buildUploader('avatars', { fileSize: 2 * 1024 * 1024 });
export const backgroundUploader = buildUploader('backgrounds', { fileSize: 5 * 1024 * 1024 });

/**
 * Express error handler for multer errors.
 * Returns structured 400 responses instead of crashing the server.
 */
export function handleUploadError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum allowed size exceeded.' });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unsupported image type. Allowed: jpeg, png, webp, gif.' });
    }

    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Unknown error — pass along
  return next(err);
}
