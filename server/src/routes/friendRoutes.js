import { Router } from 'express';
import {
  acceptFriendRequest,
  getAcceptedFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getTopFriends,
  rejectFriendRequest,
  sendFriendRequest,
  setTopFriends
} from '../db/friendQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

function currentUserId(req) {
  return req.session.user.id;
}

function handleFriendResult(res, result, successBody) {
  if (result.error) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }

  return res.json(successBody);
}

router.get('/', async (req, res) => {
  try {
    const friends = await getAcceptedFriends(currentUserId(req));
    return res.json({ friends });
  } catch (error) {
    console.error('Failed to load friends:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Friends unavailable.' });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const userId = currentUserId(req);
    const [incoming, outgoing] = await Promise.all([
      getIncomingFriendRequests(userId),
      getOutgoingFriendRequests(userId)
    ]);

    return res.json({ incoming, outgoing });
  } catch (error) {
    console.error('Failed to load friend requests:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Friend requests unavailable.' });
  }
});

router.post('/request/:username', async (req, res) => {
  try {
    const result = await sendFriendRequest(currentUserId(req), req.params.username);
    return handleFriendResult(res, result, {
      status: 'ok',
      message: 'Friend request sent'
    });
  } catch (error) {
    console.error('Failed to send friend request:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Friend request failed.' });
  }
});

router.post('/accept/:username', async (req, res) => {
  try {
    const result = await acceptFriendRequest(currentUserId(req), req.params.username);
    return handleFriendResult(res, result, {
      status: 'ok',
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Failed to accept friend request:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Friend request accept failed.' });
  }
});

router.post('/reject/:username', async (req, res) => {
  try {
    const result = await rejectFriendRequest(currentUserId(req), req.params.username);
    return handleFriendResult(res, result, {
      status: 'ok',
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Failed to reject friend request:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Friend request reject failed.' });
  }
});

router.get('/top', async (req, res) => {
  try {
    const topFriends = await getTopFriends(currentUserId(req));
    return res.json({ topFriends });
  } catch (error) {
    console.error('Failed to load top friends:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Top 8 unavailable.' });
  }
});

router.put('/top', async (req, res) => {
  try {
    const result = await setTopFriends(currentUserId(req), req.body?.friendUserIds);

    if (result.error) {
      return res.status(result.statusCode || 400).json({ error: result.error });
    }

    return res.json({ topFriends: result.topFriends });
  } catch (error) {
    console.error('Failed to save top friends:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Top 8 save failed.' });
  }
});

export default router;
