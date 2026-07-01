import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import blockRoutes from './routes/blockRoutes.js';
import bulletinRoutes from './routes/bulletinRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import dbRoutes from './routes/dbRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { sessionMiddleware } from './middleware/sessionMiddleware.js';
import { uploadsRoot } from './middleware/uploadMiddleware.js';

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
app.use(express.json());

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

app.use('/api/auth', sessionMiddleware, authRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);

if (environment === 'production' && fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

app.listen(port, () => {
  console.log(`ByteSpace API listening on http://localhost:${port}`);
});
