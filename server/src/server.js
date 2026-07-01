import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import dbRoutes from './routes/dbRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import { sessionMiddleware } from './middleware/sessionMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve uploaded user images from server/uploads as /uploads/*
// e.g. /uploads/avatars/abc123.jpg, /uploads/backgrounds/xyz456.webp
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bytespace-api'
  });
});

app.use('/api/auth', sessionMiddleware, authRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/profile', profileRoutes);

app.listen(port, () => {
  console.log(`ByteSpace API listening on http://localhost:${port}`);
});
