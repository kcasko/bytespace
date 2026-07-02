import { query } from './pool.js';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 50;

function normalizeLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(limit, MAX_LIMIT);
}

function normalizeInternalLink(linkUrl) {
  if (!linkUrl || typeof linkUrl !== 'string') {
    return null;
  }

  const trimmed = linkUrl.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//') ? trimmed : null;
}

function mapNotificationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    actorUserId: row.actor_user_id,
    actorUsername: row.actor_username || '',
    actorDisplayName: row.actor_display_name || row.actor_username || '',
    type: row.type,
    title: row.title,
    body: row.body || '',
    linkUrl: row.link_url || '',
    metadata: row.metadata_json || {},
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

export async function createNotification({
  userId,
  actorUserId = null,
  type,
  title,
  body = '',
  linkUrl = '',
  metadata = null
}) {
  if (!userId || (actorUserId && Number(actorUserId) === Number(userId))) {
    return null;
  }

  const result = await query(
    `
      INSERT INTO notifications (user_id, actor_user_id, type, title, body, link_url, metadata_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, actor_user_id, type, title, body, link_url, metadata_json, read_at, created_at
    `,
    [
      userId,
      actorUserId,
      String(type || '').slice(0, 80),
      String(title || '').slice(0, 160),
      body ? String(body).slice(0, 500) : null,
      normalizeInternalLink(linkUrl),
      metadata ? JSON.stringify(metadata) : null
    ]
  );

  return mapNotificationRow(result.rows[0]);
}

export async function safeCreateNotification(input) {
  try {
    return await createNotification(input);
  } catch (error) {
    console.error('Notification creation failed:', { code: error.code, message: error.message, type: input?.type });
    return null;
  }
}

export async function createFriendBulletinNotifications({ actorUserId, bulletin }) {
  try {
    const friendsResult = await query(
      `
        SELECT users.id, users.username
        FROM friendships
        INNER JOIN users ON users.id = CASE
          WHEN friendships.requester_id = $1 THEN friendships.receiver_id
          ELSE friendships.requester_id
        END
        LEFT JOIN profiles friend_profiles ON friend_profiles.user_id = users.id
        WHERE (friendships.requester_id = $1 OR friendships.receiver_id = $1)
          AND friendships.status = 'accepted'
          AND COALESCE(friend_profiles.bulletin_visibility, 'public') IN ('public', 'friends')
          AND NOT EXISTS (
            SELECT 1
            FROM blocked_users
            WHERE (blocker_id = $1 AND blocked_id = users.id)
               OR (blocker_id = users.id AND blocked_id = $1)
          )
      `,
      [actorUserId]
    );

    await Promise.all(friendsResult.rows.map((friend) => createNotification({
      userId: friend.id,
      actorUserId,
      type: 'friend_bulletin',
      title: `${bulletin.authorDisplayName || bulletin.authorUsername} posted a bulletin`,
      body: bulletin.title,
      linkUrl: '/bulletins',
      metadata: { bulletinId: bulletin.id }
    })));
  } catch (error) {
    console.error('Friend bulletin notifications failed:', { code: error.code, message: error.message });
  }
}

export async function getNotificationsForUser(userId, { limit } = {}) {
  const result = await query(
    `
      SELECT
        notifications.id,
        notifications.user_id,
        notifications.actor_user_id,
        actor_users.username AS actor_username,
        actor_profiles.display_name AS actor_display_name,
        notifications.type,
        notifications.title,
        notifications.body,
        notifications.link_url,
        notifications.metadata_json,
        notifications.read_at,
        notifications.created_at
      FROM notifications
      LEFT JOIN users actor_users ON actor_users.id = notifications.actor_user_id
      LEFT JOIN profiles actor_profiles ON actor_profiles.user_id = actor_users.id
      WHERE notifications.user_id = $1
      ORDER BY notifications.created_at DESC
      LIMIT $2
    `,
    [userId, normalizeLimit(limit)]
  );

  return result.rows.map(mapNotificationRow);
}

export async function getUnreadNotificationCount(userId) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE user_id = $1
        AND read_at IS NULL
    `,
    [userId]
  );

  return result.rows[0]?.count || 0;
}

export async function markNotificationRead(userId, notificationId) {
  const result = await query(
    `
      WITH updated_notification AS (
        UPDATE notifications
        SET read_at = COALESCE(read_at, NOW())
        WHERE id = $1
          AND user_id = $2
        RETURNING id, user_id, actor_user_id, type, title, body, link_url, metadata_json, read_at, created_at
      )
      SELECT
        updated_notification.id,
        updated_notification.user_id,
        updated_notification.actor_user_id,
        actor_users.username AS actor_username,
        actor_profiles.display_name AS actor_display_name,
        updated_notification.type,
        updated_notification.title,
        updated_notification.body,
        updated_notification.link_url,
        updated_notification.metadata_json,
        updated_notification.read_at,
        updated_notification.created_at
      FROM updated_notification
      LEFT JOIN users actor_users ON actor_users.id = updated_notification.actor_user_id
      LEFT JOIN profiles actor_profiles ON actor_profiles.user_id = actor_users.id
    `,
    [notificationId, userId]
  );

  return result.rows[0] ? mapNotificationRow(result.rows[0]) : null;
}

export async function markAllNotificationsRead(userId) {
  const result = await query(
    `
      UPDATE notifications
      SET read_at = COALESCE(read_at, NOW())
      WHERE user_id = $1
        AND read_at IS NULL
      RETURNING id
    `,
    [userId]
  );

  return result.rowCount;
}
