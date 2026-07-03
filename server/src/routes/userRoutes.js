import { Router } from 'express';
import { discoverySorts, searchUsers } from '../db/userQueries.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.get('/search', sessionMiddleware, async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 80);
  const sort = String(req.query.sort || 'newest').trim();
  const hasMusic = String(req.query.hasMusic || '') === 'true';
  const hasStatus = String(req.query.hasStatus || '') === 'true';

  if (!discoverySorts.has(sort)) {
    return res.status(400).json({ error: 'Discovery sort is not supported.' });
  }

  try {
    const users = await searchUsers({
      query,
      currentUserId: req.session?.user?.id || null,
      sort,
      hasMusic,
      hasStatus
    });

    return res.json({ users });
  } catch (error) {
    console.error('Failed to search users:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'User search unavailable.' });
  }
});

export default router;
