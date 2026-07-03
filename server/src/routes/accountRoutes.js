import { Router } from 'express';
import { changePassword, getAccountSettings, updateAccountPreferences } from '../db/accountQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

router.get('/settings', async (req, res) => {
  try {
    const settings = await getAccountSettings(req.session.user.id);

    if (!settings) return res.status(404).json({ error: 'Account settings not found.' });

    return res.json({ account: settings });
  } catch (error) {
    console.error('Failed to load account settings:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Account settings unavailable.' });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const result = await updateAccountPreferences(req.session.user.id, req.body || {});

    if (result.error) return res.status(400).json({ error: result.error });
    if (result.unavailable) return res.status(503).json({ error: 'Account preferences are not available until the database migration is complete.' });

    return res.json({ account: result.settings });
  } catch (error) {
    console.error('Failed to update account preferences:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Account preferences update failed.' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const result = await changePassword(req.session.user.id, req.body || {});

    if (result.error) return res.status(result.status || 400).json({ error: result.error });

    return res.json({ status: 'ok', message: 'Password updated.' });
  } catch (error) {
    console.error('Failed to change password:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Password change failed.' });
  }
});

export default router;
