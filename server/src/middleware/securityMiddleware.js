import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function buildRateLimiter({ windowMs, max, name }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests. Try again later.'
    },
    handler: (req, res, _next, options) => {
      console.warn('Rate limit exceeded:', {
        name,
        ip: req.ip,
        path: req.originalUrl
      });

      return res.status(options.statusCode).json(options.message);
    }
  });
}

export const authRateLimiter = buildRateLimiter({
  name: 'auth',
  windowMs: readPositiveIntegerEnv('AUTH_RATE_LIMIT_WINDOW_MS', FIFTEEN_MINUTES),
  max: readPositiveIntegerEnv('AUTH_RATE_LIMIT_MAX', 10)
});

export const writeRateLimiter = buildRateLimiter({
  name: 'write',
  windowMs: readPositiveIntegerEnv('WRITE_RATE_LIMIT_WINDOW_MS', FIFTEEN_MINUTES),
  max: readPositiveIntegerEnv('WRITE_RATE_LIMIT_MAX', 60)
});

export const uploadRateLimiter = buildRateLimiter({
  name: 'upload',
  windowMs: readPositiveIntegerEnv('UPLOAD_RATE_LIMIT_WINDOW_MS', FIFTEEN_MINUTES),
  max: readPositiveIntegerEnv('UPLOAD_RATE_LIMIT_MAX', 30)
});

export function apiNotFoundHandler(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  return next();
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

  console.error('Unhandled request error:', {
    code: err.code,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  if (req.path.startsWith('/api/')) {
    return res.status(safeStatusCode).json({
      error: safeStatusCode === 500 ? 'Server error' : err.message,
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack })
    });
  }

  return res.status(safeStatusCode).send(process.env.NODE_ENV === 'production'
    ? 'Server error'
    : err.stack || err.message);
}
