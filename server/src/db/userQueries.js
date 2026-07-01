import { query as dbQuery } from './pool.js';

function mapUserCard(row, currentUserId) {
  const card = {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    headline: row.profile_visibility === 'private' ? '' : row.headline || '',
    mood: row.profile_visibility === 'private' ? '' : row.mood || '',
    profileImageUrl: row.profile_image_url || '',
    createdAt: row.created_at
  };

  if (currentUserId) {
    if (row.id === currentUserId) {
      card.friendStatus = 'self';
    } else if (row.friendship_status === 'accepted') {
      card.friendStatus = 'friend';
    } else if (row.friendship_status === 'pending' && row.friendship_requester_id === currentUserId) {
      card.friendStatus = 'outgoing_pending';
    } else if (row.friendship_status === 'pending' && row.friendship_receiver_id === currentUserId) {
      card.friendStatus = 'incoming_pending';
    } else {
      card.friendStatus = 'none';
    }
  }

  return card;
}

export async function searchUsers({ query = '', currentUserId = null }) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;
  const searchPattern = `%${normalizedQuery}%`;

  const result = await dbQuery(
    `
      SELECT
        users.id,
        users.username,
        users.created_at,
        profiles.display_name,
        profiles.headline,
        profiles.mood,
        profiles.profile_image_url,
        profiles.profile_visibility,
        friendships.status AS friendship_status,
        friendships.requester_id AS friendship_requester_id,
        friendships.receiver_id AS friendship_receiver_id
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      LEFT JOIN friendships ON $3::int IS NOT NULL
        AND (
          (friendships.requester_id = $3::int AND friendships.receiver_id = users.id)
          OR (friendships.receiver_id = $3::int AND friendships.requester_id = users.id)
        )
      WHERE (
        $1::boolean = false
        OR LOWER(users.username) LIKE $2
        OR LOWER(COALESCE(profiles.display_name, '')) LIKE $2
      )
        AND (
          $3::int IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM blocked_users
            WHERE (blocker_id = $3::int AND blocked_id = users.id)
               OR (blocker_id = users.id AND blocked_id = $3::int)
          )
        )
      ORDER BY
        CASE WHEN $1::boolean = true AND LOWER(users.username) = LOWER($4) THEN 0 ELSE 1 END,
        CASE WHEN $1::boolean = true AND LOWER(users.username) LIKE $2 THEN 0 ELSE 1 END,
        CASE WHEN $1::boolean = true AND LOWER(COALESCE(profiles.display_name, '')) LIKE $2 THEN 0 ELSE 1 END,
        users.created_at DESC
      LIMIT 25
    `,
    [hasQuery, searchPattern, currentUserId, normalizedQuery]
  );

  return result.rows.map((row) => mapUserCard(row, currentUserId));
}
