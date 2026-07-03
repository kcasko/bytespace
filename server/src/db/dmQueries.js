import { query, pool } from './pool.js';
import { isBlockedBetween } from './blockQueries.js';
import { getFriendshipBetweenUsers, getUserByUsername } from './friendQueries.js';

const MAX_BODY_LENGTH = 1000;

function normalizePair(userIdA, userIdB) {
  return Number(userIdA) < Number(userIdB)
    ? [Number(userIdA), Number(userIdB)]
    : [Number(userIdB), Number(userIdA)];
}

function mapOtherUser(row) {
  return {
    id: row.other_user_id,
    username: row.other_username,
    displayName: row.other_display_name || row.other_username,
    profileImageUrl: row.other_profile_image_url || ''
  };
}

function mapConversation(row) {
  return {
    id: row.id,
    otherUser: mapOtherUser(row),
    latestMessage: row.latest_message_id ? {
      id: row.latest_message_id,
      senderId: row.latest_sender_id,
      body: row.latest_deleted_at ? 'Message deleted' : row.latest_body || '',
      isDeleted: Boolean(row.latest_deleted_at),
      createdAt: row.latest_created_at
    } : null,
    isBlocked: Boolean(row.is_blocked),
    isFriend: Boolean(row.is_friend),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    senderDisplayName: row.sender_display_name || row.sender_username,
    body: row.deleted_at ? 'Message deleted' : row.body,
    isDeleted: Boolean(row.deleted_at),
    canDelete: Boolean(row.can_delete),
    createdAt: row.created_at,
    deletedAt: row.deleted_at || null
  };
}

async function getActiveUserByUsername(username) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const result = await query('SELECT id, username, suspended_at FROM users WHERE id = $1 LIMIT 1', [user.id]);
  const row = result.rows[0];
  return row && !row.suspended_at ? row : null;
}

async function isAcceptedFriend(userIdA, userIdB) {
  const friendship = await getFriendshipBetweenUsers(userIdA, userIdB);
  return friendship?.status === 'accepted';
}

export async function canUsersMessage(userIdA, userIdB) {
  if (!userIdA || !userIdB || Number(userIdA) === Number(userIdB)) {
    return { ok: false, error: 'You cannot message yourself.', statusCode: 400 };
  }

  const blockStatus = await isBlockedBetween(userIdA, userIdB);
  if (blockStatus.blocked) {
    return { ok: false, error: 'This interaction is blocked. The glitter wall is up.', statusCode: 403 };
  }

  const friends = await isAcceptedFriend(userIdA, userIdB);
  if (!friends) {
    return { ok: false, error: 'Direct messages are friends-only.', statusCode: 403 };
  }

  return { ok: true };
}

export async function createOrGetConversation(currentUserId, recipientUsername) {
  const recipient = await getActiveUserByUsername(recipientUsername);
  if (!recipient) return { error: 'User not found.', statusCode: 404 };

  const canMessage = await canUsersMessage(currentUserId, recipient.id);
  if (!canMessage.ok) return canMessage;

  const [userOneId, userTwoId] = normalizePair(currentUserId, recipient.id);
  const result = await query(
    `
      INSERT INTO dm_conversations (user_one_id, user_two_id)
      VALUES ($1, $2)
      ON CONFLICT (user_one_id, user_two_id)
      DO UPDATE SET updated_at = dm_conversations.updated_at
      RETURNING id
    `,
    [userOneId, userTwoId]
  );

  const conversation = await getConversationForUser(currentUserId, result.rows[0].id);
  return { conversation };
}

export async function listConversations(userId) {
  const result = await query(
    `
      SELECT
        dm_conversations.*,
        other_users.id AS other_user_id,
        other_users.username AS other_username,
        other_profiles.display_name AS other_display_name,
        other_profiles.profile_image_url AS other_profile_image_url,
        latest.id AS latest_message_id,
        latest.sender_id AS latest_sender_id,
        latest.body AS latest_body,
        latest.deleted_at AS latest_deleted_at,
        latest.created_at AS latest_created_at,
        EXISTS (
          SELECT 1 FROM blocked_users
          WHERE (blocker_id = $1 AND blocked_id = other_users.id)
             OR (blocker_id = other_users.id AND blocked_id = $1)
        ) AS is_blocked,
        EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
            AND ((requester_id = $1 AND receiver_id = other_users.id)
              OR (requester_id = other_users.id AND receiver_id = $1))
        ) AS is_friend
      FROM dm_conversations
      INNER JOIN users other_users ON other_users.id = CASE
        WHEN dm_conversations.user_one_id = $1 THEN dm_conversations.user_two_id
        ELSE dm_conversations.user_one_id
      END
      LEFT JOIN profiles other_profiles ON other_profiles.user_id = other_users.id
      LEFT JOIN LATERAL (
        SELECT id, sender_id, body, deleted_at, created_at
        FROM dm_messages
        WHERE conversation_id = dm_conversations.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE (dm_conversations.user_one_id = $1 OR dm_conversations.user_two_id = $1)
        AND other_users.suspended_at IS NULL
      ORDER BY dm_conversations.updated_at DESC
      LIMIT 50
    `,
    [userId]
  );

  return result.rows.map(mapConversation);
}

export async function getConversationForUser(userId, conversationId) {
  const result = await query(
    `
      SELECT
        dm_conversations.*,
        other_users.id AS other_user_id,
        other_users.username AS other_username,
        other_profiles.display_name AS other_display_name,
        other_profiles.profile_image_url AS other_profile_image_url,
        NULL::int AS latest_message_id,
        NULL::int AS latest_sender_id,
        NULL::text AS latest_body,
        NULL::timestamptz AS latest_deleted_at,
        NULL::timestamptz AS latest_created_at,
        EXISTS (
          SELECT 1 FROM blocked_users
          WHERE (blocker_id = $1 AND blocked_id = other_users.id)
             OR (blocker_id = other_users.id AND blocked_id = $1)
        ) AS is_blocked,
        EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
            AND ((requester_id = $1 AND receiver_id = other_users.id)
              OR (requester_id = other_users.id AND receiver_id = $1))
        ) AS is_friend
      FROM dm_conversations
      INNER JOIN users other_users ON other_users.id = CASE
        WHEN dm_conversations.user_one_id = $1 THEN dm_conversations.user_two_id
        ELSE dm_conversations.user_one_id
      END
      LEFT JOIN profiles other_profiles ON other_profiles.user_id = other_users.id
      WHERE dm_conversations.id = $2
        AND (dm_conversations.user_one_id = $1 OR dm_conversations.user_two_id = $1)
      LIMIT 1
    `,
    [userId, conversationId]
  );

  return result.rows[0] ? mapConversation(result.rows[0]) : null;
}

export async function getMessagesForConversation(userId, conversationId, limit = 50) {
  const conversation = await getConversationForUser(userId, conversationId);
  if (!conversation) return { error: 'Conversation not found.', statusCode: 404 };

  const result = await query(
    `
      SELECT
        dm_messages.*,
        users.username AS sender_username,
        profiles.display_name AS sender_display_name,
        (dm_messages.sender_id = $1 AND dm_messages.deleted_at IS NULL) AS can_delete
      FROM dm_messages
      INNER JOIN users ON users.id = dm_messages.sender_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE dm_messages.conversation_id = $2
      ORDER BY dm_messages.created_at DESC
      LIMIT $3
    `,
    [userId, conversationId, Math.min(Math.max(Number(limit) || 50, 1), 50)]
  );

  return {
    conversation,
    messages: result.rows.reverse().map(mapMessage)
  };
}

export async function sendMessage(userId, conversationId, body) {
  const conversation = await getConversationForUser(userId, conversationId);
  if (!conversation) return { error: 'Conversation not found.', statusCode: 404 };

  const canMessage = await canUsersMessage(userId, conversation.otherUser.id);
  if (!canMessage.ok) return canMessage;

  const text = String(body || '').trim();
  if (!text) return { error: 'Message body is required.', statusCode: 400 };
  if (text.length > MAX_BODY_LENGTH) return { error: `Message body must be ${MAX_BODY_LENGTH} characters or less.`, statusCode: 400 };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        INSERT INTO dm_messages (conversation_id, sender_id, body)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [conversationId, userId, text]
    );
    await client.query('UPDATE dm_conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
    await client.query('COMMIT');
    return { messageId: result.rows[0].id, conversation };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteOwnMessage(userId, messageId) {
  const result = await query(
    `
      UPDATE dm_messages
      SET deleted_at = NOW(),
          deleted_by_user_id = $1
      WHERE id = $2
        AND sender_id = $1
        AND deleted_at IS NULL
      RETURNING id
    `,
    [userId, messageId]
  );

  return result.rowCount > 0;
}

export async function canReportDmMessage(userId, messageId) {
  const result = await query(
    `
      SELECT dm_messages.id
      FROM dm_messages
      INNER JOIN dm_conversations ON dm_conversations.id = dm_messages.conversation_id
      WHERE dm_messages.id = $2
        AND dm_messages.deleted_at IS NULL
        AND (dm_conversations.user_one_id = $1 OR dm_conversations.user_two_id = $1)
      LIMIT 1
    `,
    [userId, messageId]
  );

  return result.rowCount > 0;
}
