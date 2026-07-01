import { Router } from 'express';
import { blockUser, getBlockedUsers, unblockUser } from '../db/blockQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

function currentUserId(req) {
  return req.session.user.id;
}

function handleBlockResult(res, result, successBody) {
  if (result.error) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }

  return res.json(successBody);
}

router.get('/', async (req, res) => {
  try {
    const blockedUsers = await getBlockedUsers(currentUserId(req));
    return res.json({ blockedUsers });
  } catch (error) {
    console.error('Failed to load blocked users:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Blocked users unavailable.' });
  }
});

router.post('/:username', async (req, res) => {
  try {
    const result = await blockUser(currentUserId(req), req.params.username);
    return handleBlockResult(res, result, {
      status: 'ok',
      message: 'User blocked'
    });
  } catch (error) {
    console.error('Failed to block user:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Block failed.' });
  }
});

router.delete('/:username', async (req, res) => {
  try {
    const result = await unblockUser(currentUserId(req), req.params.username);
    return handleBlockResult(res, result, {
      status: 'ok',
      message: 'User unblocked'
    });
  } catch (error) {
    console.error('Failed to unblock user:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Unblock failed.' });
  }
});

export default router;
