import { query } from './pool.js';

function mapRequestRow(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    profileImageUrl: row.profile_image_url || '',
    createdAt: row.created_at
  };
}

function mapBulletinRow(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body || '',
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name || row.author_username,
    authorProfileImageUrl: row.author_profile_image_url || '',
    createdAt: row.created_at
  };
}

function mapCommentRow(row) {
  return {
    id: row.id,
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name || row.author_username,
    body: row.body || '',
    createdAt: row.created_at
  };
}

export async function getDashboardForUser(userId) {
  const [
    userResult,
    profileResult,
    countsResult,
    incomingResult,
    friendBulletinsResult,
    commentsResult
  ] = await Promise.all([
    query(
      `
        SELECT id, username
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    ),
    query(
      `
        SELECT display_name, headline, mood, status_message, profile_image_url, background_image_url, profile_song_title, profile_song_artist, profile_song_url
        FROM profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    ),
    query(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM friendships
            INNER JOIN users friend_users ON friend_users.id = CASE
              WHEN friendships.requester_id = $1 THEN friendships.receiver_id
              ELSE friendships.requester_id
            END
            WHERE (friendships.requester_id = $1 OR friendships.receiver_id = $1)
              AND friendships.status = 'accepted'
              AND NOT EXISTS (
                SELECT 1
                FROM blocked_users
                WHERE (blocker_id = $1 AND blocked_id = friend_users.id)
                   OR (blocker_id = friend_users.id AND blocked_id = $1)
              )
          )::int AS friends,
          (
            SELECT COUNT(*)
            FROM friendships
            INNER JOIN users requester_users ON requester_users.id = friendships.requester_id
            WHERE friendships.receiver_id = $1
              AND friendships.status = 'pending'
              AND NOT EXISTS (
                SELECT 1
                FROM blocked_users
                WHERE (blocker_id = $1 AND blocked_id = requester_users.id)
                   OR (blocker_id = requester_users.id AND blocked_id = $1)
              )
          )::int AS incoming_requests,
          (
            SELECT COUNT(*)
            FROM friendships
            INNER JOIN users receiver_users ON receiver_users.id = friendships.receiver_id
            WHERE friendships.requester_id = $1
              AND friendships.status = 'pending'
              AND NOT EXISTS (
                SELECT 1
                FROM blocked_users
                WHERE (blocker_id = $1 AND blocked_id = receiver_users.id)
                   OR (blocker_id = receiver_users.id AND blocked_id = $1)
              )
          )::int AS outgoing_requests,
          (
            SELECT COUNT(*)
            FROM top_friends
            INNER JOIN users friend_users ON friend_users.id = top_friends.friend_id
            WHERE top_friends.user_id = $1
              AND NOT EXISTS (
                SELECT 1
                FROM blocked_users
                WHERE (blocker_id = $1 AND blocked_id = friend_users.id)
                   OR (blocker_id = friend_users.id AND blocked_id = $1)
              )
          )::int AS top_friends,
          (
            SELECT COUNT(*)
            FROM bulletins
            WHERE user_id = $1
          )::int AS bulletins,
          (
            SELECT COUNT(*)
            FROM profile_comments
            INNER JOIN users author_users ON author_users.id = profile_comments.author_user_id
            WHERE profile_comments.profile_user_id = $1
              AND NOT EXISTS (
                SELECT 1
                FROM blocked_users
                WHERE (blocker_id = $1 AND blocked_id = author_users.id)
                   OR (blocker_id = author_users.id AND blocked_id = $1)
              )
          )::int AS comments,
          (
            SELECT COUNT(*)
            FROM blocked_users
            WHERE blocker_id = $1
          )::int AS blocked_users
      `,
      [userId]
    ),
    query(
      `
        SELECT
          users.id,
          users.username,
          profiles.display_name,
          profiles.profile_image_url,
          friendships.created_at
        FROM friendships
        INNER JOIN users ON users.id = friendships.requester_id
        LEFT JOIN profiles ON profiles.user_id = users.id
        WHERE friendships.receiver_id = $1
          AND friendships.status = 'pending'
          AND NOT EXISTS (
            SELECT 1
            FROM blocked_users
            WHERE (blocker_id = $1 AND blocked_id = users.id)
               OR (blocker_id = users.id AND blocked_id = $1)
          )
        ORDER BY friendships.created_at DESC
        LIMIT 5
      `,
      [userId]
    ),
    query(
      `
        SELECT
          bulletins.id,
          bulletins.title,
          bulletins.body,
          bulletins.created_at,
          users.username AS author_username,
          profiles.display_name AS author_display_name,
          profiles.profile_image_url AS author_profile_image_url
        FROM bulletins
        INNER JOIN friendships ON (
          (friendships.requester_id = $1 AND friendships.receiver_id = bulletins.user_id)
          OR (friendships.receiver_id = $1 AND friendships.requester_id = bulletins.user_id)
        )
        INNER JOIN users ON users.id = bulletins.user_id
        LEFT JOIN profiles ON profiles.user_id = users.id
        WHERE friendships.status = 'accepted'
          AND NOT EXISTS (
            SELECT 1
            FROM blocked_users
            WHERE (blocker_id = $1 AND blocked_id = users.id)
               OR (blocker_id = users.id AND blocked_id = $1)
          )
        ORDER BY bulletins.created_at DESC
        LIMIT 5
      `,
      [userId]
    ),
    query(
      `
        SELECT
          profile_comments.id,
          profile_comments.body,
          profile_comments.created_at,
          author_users.username AS author_username,
          author_profiles.display_name AS author_display_name
        FROM profile_comments
        INNER JOIN users author_users ON author_users.id = profile_comments.author_user_id
        LEFT JOIN profiles author_profiles ON author_profiles.user_id = author_users.id
        WHERE profile_comments.profile_user_id = $1
          AND NOT EXISTS (
            SELECT 1
            FROM blocked_users
            WHERE (blocker_id = $1 AND blocked_id = author_users.id)
               OR (blocker_id = author_users.id AND blocked_id = $1)
          )
        ORDER BY profile_comments.created_at DESC
        LIMIT 5
      `,
      [userId]
    )
  ]);

  const user = userResult.rows[0];
  const profile = profileResult.rows[0] || {};
  const counts = countsResult.rows[0] || {};

  return {
    user: {
      id: user.id,
      username: user.username
    },
    profile: {
      displayName: profile.display_name || user.username,
      headline: profile.headline || '',
      mood: profile.mood || '',
      statusMessage: profile.status_message || '',
      profileImageUrl: profile.profile_image_url || '',
      backgroundImageUrl: profile.background_image_url || '',
      profileSongTitle: profile.profile_song_title || '',
      profileSongArtist: profile.profile_song_artist || '',
      profileSongUrl: profile.profile_song_url || ''
    },
    counts: {
      friends: counts.friends || 0,
      incomingRequests: counts.incoming_requests || 0,
      outgoingRequests: counts.outgoing_requests || 0,
      topFriends: counts.top_friends || 0,
      bulletins: counts.bulletins || 0,
      comments: counts.comments || 0,
      blockedUsers: counts.blocked_users || 0
    },
    incomingRequests: incomingResult.rows.map(mapRequestRow),
    recentFriendBulletins: friendBulletinsResult.rows.map(mapBulletinRow),
    recentProfileComments: commentsResult.rows.map(mapCommentRow)
  };
}
