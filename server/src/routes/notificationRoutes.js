import { Router } from 'express';
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from '../db/notificationQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

router.get('/', async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(req.session.user.id, { limit: req.query.limit }),
      getUnreadNotificationCount(req.session.user.id)
    ]);

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Failed to load notifications:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Notifications unavailable.' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const unreadCount = await getUnreadNotificationCount(req.session.user.id);
    return res.json({ unreadCount });
  } catch (error) {
    console.error('Failed to load notification count:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Notification count unavailable.' });
  }
});

router.put('/:id/read', async (req, res) => {
  const notificationId = Number(req.params.id);

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ error: 'Notification ID is invalid.' });
  }

  try {
    const notification = await markNotificationRead(req.session.user.id, notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    return res.json({ notification });
  } catch (error) {
    console.error('Failed to mark notification read:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Notification update failed.' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    const updatedCount = await markAllNotificationsRead(req.session.user.id);
    return res.json({ status: 'ok', updatedCount });
  } catch (error) {
    console.error('Failed to mark notifications read:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Notification update failed.' });
  }
});

export default router;
