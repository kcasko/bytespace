import { Router } from 'express';
import {
  createOrGetConversation,
  deleteOwnMessage,
  getMessagesForConversation,
  listConversations,
  sendMessage
} from '../db/dmQueries.js';
import { safeCreateNotification } from '../db/notificationQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/conversations', async (req, res) => {
  try {
    const conversations = await listConversations(req.session.user.id);
    return res.json({ conversations });
  } catch (error) {
    console.error('Failed to load DM conversations:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Messages unavailable.' });
  }
});

router.post('/conversations', async (req, res) => {
  const recipientUsername = String(req.body?.recipientUsername || '').trim();

  if (!recipientUsername) {
    return res.status(400).json({ error: 'recipientUsername is required.' });
  }

  try {
    const result = await createOrGetConversation(req.session.user.id, recipientUsername);

    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error });

    return res.status(201).json({ conversation: result.conversation });
  } catch (error) {
    console.error('Failed to create DM conversation:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Conversation could not be started.' });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) return res.status(400).json({ error: 'Conversation ID is invalid.' });

  try {
    const result = await getMessagesForConversation(req.session.user.id, conversationId, req.query?.limit);

    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error });

    return res.json(result);
  } catch (error) {
    console.error('Failed to load DM messages:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Messages unavailable.' });
  }
});

router.post('/conversations/:id/messages', async (req, res) => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) return res.status(400).json({ error: 'Conversation ID is invalid.' });

  try {
    const result = await sendMessage(req.session.user.id, conversationId, req.body?.body);

    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error });

    await safeCreateNotification({
      userId: result.conversation.otherUser.id,
      actorUserId: req.session.user.id,
      type: 'direct_message',
      title: `@${req.session.user.username} sent you a message`,
      body: 'You have a new ByteSpace direct message.',
      linkUrl: '/messages',
      metadata: { conversationId }
    });

    const refreshed = await getMessagesForConversation(req.session.user.id, conversationId);
    return res.status(201).json(refreshed);
  } catch (error) {
    console.error('Failed to send DM:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Message could not be sent.' });
  }
});

router.delete('/messages/:id', async (req, res) => {
  const messageId = parseId(req.params.id);
  if (!messageId) return res.status(400).json({ error: 'Message ID is invalid.' });

  try {
    const deleted = await deleteOwnMessage(req.session.user.id, messageId);

    if (!deleted) return res.status(404).json({ error: 'Message not found or cannot be deleted.' });

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to delete DM:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Message delete failed.' });
  }
});

export default router;
