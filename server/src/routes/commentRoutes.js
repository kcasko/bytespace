import { Router } from 'express';
import { createProfileComment, getCommentsForProfileUsername } from '../db/commentQueries.js';
import { getProfileByUsername } from '../db/profileQueries.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();
const MAX_COMMENT_LENGTH = 500;

router.get('/:username', async (req, res) => {
  try {
    const profile = await getProfileByUsername(req.params.username);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const comments = await getCommentsForProfileUsername(req.params.username);
    return res.json({ comments });
  } catch (error) {
    console.error('Failed to load profile comments:', {
      code: error.code,
      message: error.message
    });

    return res.status(500).json({ error: 'Comments unavailable' });
  }
});

router.post('/:username', sessionMiddleware, async (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'You must be logged in to comment' });
  }

  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

  if (!body) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  if (body.length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: 'Comment must be 500 characters or less' });
  }

  try {
    const comment = await createProfileComment({
      profileUsername: req.params.username,
      authorUserId: req.session.user.id,
      body
    });

    if (!comment) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.status(201).json({ comment });
  } catch (error) {
    console.error('Failed to create profile comment:', {
      code: error.code,
      message: error.message
    });

    return res.status(500).json({ error: 'Comment could not be posted' });
  }
});

export default router;
