import { Router } from 'express';
import { getDashboardForUser } from '../db/dashboardQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

router.get('/me', async (req, res) => {
  try {
    const dashboard = await getDashboardForUser(req.session.user.id);
    return res.json(dashboard);
  } catch (error) {
    console.error('Failed to load dashboard:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Dashboard unavailable.' });
  }
});

export default router;
