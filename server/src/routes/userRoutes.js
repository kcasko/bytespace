import { Router } from 'express';
import { searchUsers } from '../db/userQueries.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.get('/search', sessionMiddleware, async (req, res) => {
  try {
    const users = await searchUsers({
      query: req.query.q || '',
      currentUserId: req.session?.user?.id || null
    });

    return res.json({ users });
  } catch (error) {
    console.error('Failed to search users:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'User search unavailable.' });
  }
});

export default router;
