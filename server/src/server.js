import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import accountRoutes from './routes/accountRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import blockRoutes from './routes/blockRoutes.js';
import bulletinRoutes from './routes/bulletinRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import dbRoutes from './routes/dbRoutes.js';
import dmRoutes from './routes/dmRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { sessionMiddleware } from './middleware/sessionMiddleware.js';
import {
  apiNotFoundHandler,
  authRateLimiter,
  errorHandler,
  uploadRateLimiter,
  writeRateLimiter
} from './middleware/securityMiddleware.js';
import { uploadsRoot } from './middleware/uploadMiddleware.js';
import { ensureOperationalSchema } from './db/ensureSchema.js';

const app = express();
const port = process.env.PORT || 5000;
const environment = process.env.NODE_ENV || 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

if (process.env.TRUST_PROXY === 'true' || environment === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '100kb' }));

// Serve uploaded user images from UPLOADS_DIR as /uploads/*.
// Local disk is acceptable for a single-server demo; production should plan
// backups or object storage before real users depend on uploaded files.
app.use('/uploads', express.static(uploadsRoot));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bytespace-api',
    environment
  });
});

app.post(['/api/auth/login', '/api/auth/register'], authRateLimiter);
app.post('/api/comments/:username', writeRateLimiter);
app.post('/api/bulletins', writeRateLimiter);
app.post('/api/friends/request/:username', writeRateLimiter);
app.post('/api/reports', writeRateLimiter);
app.post('/api/dms/conversations', writeRateLimiter);
app.post('/api/dms/conversations/:id/messages', writeRateLimiter);
app.post(['/api/profile/me/avatar', '/api/profile/me/background'], uploadRateLimiter);

app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', sessionMiddleware, authRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/dms', dmRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use(apiNotFoundHandler);

if (environment === 'production' && fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

app.use(errorHandler);

try {
  await ensureOperationalSchema();
} catch (error) {
  console.error('Failed to verify operational database schema:', {
    code: error.code,
    message: error.message
  });
  process.exit(1);
}

app.listen(port, () => {
  console.log(`ByteSpace API listening on http://localhost:${port}`);
});
