import { Router } from 'express';
import {
  createBulletin,
  deleteOwnBulletin,
  getBulletinsForUsername,
  getFriendBulletins,
  getOwnBulletins
} from '../db/bulletinQueries.js';
import { canViewBulletins, getPrivacyForUsername } from '../db/settingsQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateBulletinInput(body) {
  const title = trimString(body?.title);
  const bodyText = trimString(body?.body);

  if (!title) {
    return { error: 'Title is required.' };
  }

  if (!bodyText) {
    return { error: 'Body is required.' };
  }

  if (title.length > 120) {
    return { error: 'Title must be 120 characters or less.' };
  }

  if (bodyText.length > 2000) {
    return { error: 'Body must be 2000 characters or less.' };
  }

  return {
    input: {
      title,
      body: bodyText
    }
  };
}

router.get('/user/:username', sessionMiddleware, async (req, res) => {
  try {
    const privacy = await getPrivacyForUsername(req.params.username);

    if (!privacy) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const allowed = await canViewBulletins(privacy, req.session?.user?.id || null);

    if (!allowed) {
      return res.status(403).json({ error: 'These bulletins are private' });
    }

    const bulletins = await getBulletinsForUsername(req.params.username);
    return res.json({ bulletins });
  } catch (error) {
    console.error('Failed to load user bulletins:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Bulletins unavailable.' });
  }
});

router.get('/me', sessionMiddleware, requireAuth, async (req, res) => {
  try {
    const bulletins = await getOwnBulletins(req.session.user.id);
    return res.json({ bulletins });
  } catch (error) {
    console.error('Failed to load own bulletins:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Bulletins unavailable.' });
  }
});

router.get('/friends', sessionMiddleware, requireAuth, async (req, res) => {
  try {
    const bulletins = await getFriendBulletins(req.session.user.id);
    return res.json({ bulletins });
  } catch (error) {
    console.error('Failed to load friend bulletins:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Friend bulletins unavailable.' });
  }
});

router.post('/', sessionMiddleware, requireAuth, async (req, res) => {
  const validation = validateBulletinInput(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const bulletin = await createBulletin(req.session.user.id, validation.input);
    return res.status(201).json({ bulletin });
  } catch (error) {
    console.error('Failed to create bulletin:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Bulletin creation failed.' });
  }
});

router.delete('/:id', sessionMiddleware, requireAuth, async (req, res) => {
  const bulletinId = Number(req.params.id);

  if (!Number.isInteger(bulletinId) || bulletinId <= 0) {
    return res.status(400).json({ error: 'Bulletin ID is invalid.' });
  }

  try {
    const deleted = await deleteOwnBulletin(req.session.user.id, bulletinId);

    if (!deleted) {
      return res.status(404).json({ error: 'Bulletin not found.' });
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to delete bulletin:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Bulletin delete failed.' });
  }
});

export default router;
