import { Router } from 'express';
import { testConnection } from '../db/testConnection.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    const databaseTime = await testConnection();

    return res.json({
      status: 'ok',
      databaseTime
    });
  } catch {
    return res.status(500).json({
      status: 'error',
      message: 'Database unavailable'
    });
  }
});

export default router;
