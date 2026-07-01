import { Router } from 'express';
import {
  getSettingsForUser,
  settingsOptions,
  updateSettingsForUser
} from '../db/settingsQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

function validateSettingsInput(body) {
  const input = {};

  for (const [field, allowedValues] of Object.entries(settingsOptions)) {
    const value = typeof body?.[field] === 'string' ? body[field].trim() : '';

    if (!allowedValues.includes(value)) {
      return { error: `${field} is not supported.` };
    }

    input[field] = value;
  }

  return { input };
}

router.get('/me', async (req, res) => {
  try {
    const settings = await getSettingsForUser(req.session.user.id);

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found.' });
    }

    return res.json({ settings });
  } catch (error) {
    console.error('Failed to load settings:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Settings unavailable.' });
  }
});

router.put('/me', async (req, res) => {
  const validation = validateSettingsInput(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const settings = await updateSettingsForUser(req.session.user.id, validation.input);

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found.' });
    }

    return res.json({ settings });
  } catch (error) {
    console.error('Failed to update settings:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Settings update failed.' });
  }
});

export default router;
