import { query as dbQuery } from './pool.js';

export const discoverySorts = new Set(['newest', 'updated', 'username']);

function mapUserCard(row, currentUserId) {
  const isPrivate = row.profile_visibility === 'private';
  const card = {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    headline: isPrivate ? '' : row.headline || '',
    mood: isPrivate ? '' : row.mood || '',
    statusMessage: isPrivate ? '' : row.status_message || '',
    profileImageUrl: row.profile_image_url || '',
    layoutPreset: row.layout_preset || 'classic',
    hasProfileMusic: Boolean(!isPrivate && (row.profile_song_title || row.profile_song_artist || row.profile_song_url)),
    friendCount: Number(row.friend_count || 0),
    createdAt: row.created_at,
    updatedAt: row.profile_updated_at || row.created_at
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

function getOrderBy(sort) {
  switch (sort) {
    case 'username':
      return 'LOWER(users.username) ASC, users.created_at DESC';
    case 'updated':
      return 'profiles.updated_at DESC NULLS LAST, users.created_at DESC';
    case 'newest':
    default:
      return 'users.created_at DESC';
  }
}

export async function searchUsers({ query = '', currentUserId = null, sort = 'newest', hasMusic = false, hasStatus = false } = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase().slice(0, 80);
  const normalizedSort = discoverySorts.has(sort) ? sort : 'newest';
  const hasQuery = normalizedQuery.length > 0;
  const searchPattern = `%${normalizedQuery}%`;
  const orderBy = getOrderBy(normalizedSort);

  const result = await dbQuery(
    `
      SELECT
        users.id,
        users.username,
        users.created_at,
        profiles.display_name,
        profiles.headline,
        profiles.mood,
        profiles.status_message,
        profiles.profile_image_url,
        profiles.profile_visibility,
        profiles.layout_preset,
        profiles.profile_song_title,
        profiles.profile_song_artist,
        profiles.profile_song_url,
        profiles.updated_at AS profile_updated_at,
        friendships.status AS friendship_status,
        friendships.requester_id AS friendship_requester_id,
        friendships.receiver_id AS friendship_receiver_id,
        (
          SELECT COUNT(*)::int
          FROM friendships accepted_friendships
          WHERE accepted_friendships.status = 'accepted'
            AND (accepted_friendships.requester_id = users.id OR accepted_friendships.receiver_id = users.id)
        ) AS friend_count
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      LEFT JOIN friendships ON $3::int IS NOT NULL
        AND (
          (friendships.requester_id = $3::int AND friendships.receiver_id = users.id)
          OR (friendships.receiver_id = $3::int AND friendships.requester_id = users.id)
        )
      WHERE users.suspended_at IS NULL
        AND (
          $1::boolean = false
          OR LOWER(users.username) LIKE $2
          OR LOWER(COALESCE(profiles.display_name, '')) LIKE $2
          OR LOWER(COALESCE(profiles.status_message, '')) LIKE $2
        )
        AND (
          $5::boolean = false
          OR NULLIF(profiles.profile_song_title, '') IS NOT NULL
          OR NULLIF(profiles.profile_song_artist, '') IS NOT NULL
          OR NULLIF(profiles.profile_song_url, '') IS NOT NULL
        )
        AND (
          $6::boolean = false
          OR NULLIF(profiles.status_message, '') IS NOT NULL
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
        ${orderBy}
      LIMIT 50
    `,
    [hasQuery, searchPattern, currentUserId, normalizedQuery, Boolean(hasMusic), Boolean(hasStatus)]
  );

  return result.rows.map((row) => mapUserCard(row, currentUserId));
}
