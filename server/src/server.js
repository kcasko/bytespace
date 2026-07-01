import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import dbRoutes from './routes/dbRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import { sessionMiddleware } from './middleware/sessionMiddleware.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bytespace-api'
  });
});

app.use('/api/auth', sessionMiddleware, authRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/profile', profileRoutes);

app.listen(port, () => {
  console.log(`ByteSpace API listening on http://localhost:${port}`);
});
