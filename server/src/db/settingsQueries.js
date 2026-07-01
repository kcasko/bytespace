import { query } from './pool.js';

export const settingsOptions = {
  profileVisibility: ['public', 'friends', 'private'],
  commentPermission: ['everyone', 'friends', 'none'],
  bulletinVisibility: ['public', 'friends', 'private'],
  friendRequestPermission: ['everyone', 'friends_of_friends', 'none']
};

function mapSettingsRow(row) {
  return {
    profileVisibility: row.profile_visibility || 'public',
    commentPermission: row.comment_permission || 'everyone',
    bulletinVisibility: row.bulletin_visibility || 'public',
    friendRequestPermission: row.friend_request_permission || 'everyone'
  };
}

export async function getSettingsForUser(userId) {
  const result = await query(
    `
      SELECT
        profile_visibility,
        comment_permission,
        bulletin_visibility,
        friend_request_permission
      FROM profiles
      WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] ? mapSettingsRow(result.rows[0]) : null;
}

export async function updateSettingsForUser(userId, settingsInput) {
  const result = await query(
    `
      UPDATE profiles
      SET
        profile_visibility = $2,
        comment_permission = $3,
        bulletin_visibility = $4,
        friend_request_permission = $5,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        profile_visibility,
        comment_permission,
        bulletin_visibility,
        friend_request_permission
    `,
    [
      userId,
      settingsInput.profileVisibility,
      settingsInput.commentPermission,
      settingsInput.bulletinVisibility,
      settingsInput.friendRequestPermission
    ]
  );

  return result.rows[0] ? mapSettingsRow(result.rows[0]) : null;
}

export async function getPrivacyForUsername(username) {
  const result = await query(
    `
      SELECT
        users.id AS user_id,
        users.username,
        profiles.profile_visibility,
        profiles.comment_permission,
        profiles.bulletin_visibility,
        profiles.friend_request_permission
      FROM users
      INNER JOIN profiles ON profiles.user_id = users.id
      WHERE LOWER(users.username) = LOWER($1)
      LIMIT 1
    `,
    [String(username || '').trim()]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    username: row.username,
    ...mapSettingsRow(row)
  };
}

export async function areAcceptedFriends(userIdA, userIdB) {
  if (!userIdA || !userIdB) {
    return false;
  }

  const result = await query(
    `
      SELECT id
      FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = $1 AND receiver_id = $2)
          OR (requester_id = $2 AND receiver_id = $1)
        )
      LIMIT 1
    `,
    [userIdA, userIdB]
  );

  return result.rowCount > 0;
}

export async function shareAcceptedFriend(userIdA, userIdB) {
  if (!userIdA || !userIdB) {
    return false;
  }

  const result = await query(
    `
      WITH user_a_friends AS (
        SELECT CASE
          WHEN requester_id = $1 THEN receiver_id
          ELSE requester_id
        END AS friend_id
        FROM friendships
        WHERE status = 'accepted'
          AND (requester_id = $1 OR receiver_id = $1)
      ),
      user_b_friends AS (
        SELECT CASE
          WHEN requester_id = $2 THEN receiver_id
          ELSE requester_id
        END AS friend_id
        FROM friendships
        WHERE status = 'accepted'
          AND (requester_id = $2 OR receiver_id = $2)
      )
      SELECT user_a_friends.friend_id
      FROM user_a_friends
      INNER JOIN user_b_friends ON user_b_friends.friend_id = user_a_friends.friend_id
      LIMIT 1
    `,
    [userIdA, userIdB]
  );

  return result.rowCount > 0;
}

export async function canViewProfile(profilePrivacy, viewerUserId) {
  if (!profilePrivacy) {
    return false;
  }

  if (profilePrivacy.profileVisibility === 'public') {
    return true;
  }

  if (viewerUserId === profilePrivacy.userId) {
    return true;
  }

  if (profilePrivacy.profileVisibility === 'friends') {
    return areAcceptedFriends(viewerUserId, profilePrivacy.userId);
  }

  return false;
}

export async function canViewBulletins(profilePrivacy, viewerUserId) {
  if (!profilePrivacy) {
    return false;
  }

  if (profilePrivacy.bulletinVisibility === 'public') {
    return true;
  }

  if (viewerUserId === profilePrivacy.userId) {
    return true;
  }

  if (profilePrivacy.bulletinVisibility === 'friends') {
    return areAcceptedFriends(viewerUserId, profilePrivacy.userId);
  }

  return false;
}

export async function canCommentOnProfile(profilePrivacy, viewerUserId) {
  if (!profilePrivacy || !viewerUserId) {
    return false;
  }

  if (viewerUserId === profilePrivacy.userId) {
    return true;
  }

  if (profilePrivacy.commentPermission === 'everyone') {
    return true;
  }

  if (profilePrivacy.commentPermission === 'friends') {
    return areAcceptedFriends(viewerUserId, profilePrivacy.userId);
  }

  return false;
}

