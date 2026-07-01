import { query } from './pool.js';

function mapBulletinRow(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name || row.author_username,
    authorProfileImageUrl: row.author_profile_image_url || ''
  };
}

const bulletinSelect = `
  SELECT
    bulletins.id,
    bulletins.title,
    bulletins.body,
    bulletins.created_at,
    bulletins.updated_at,
    users.username AS author_username,
    profiles.display_name AS author_display_name,
    profiles.profile_image_url AS author_profile_image_url
  FROM bulletins
  INNER JOIN users ON users.id = bulletins.user_id
  LEFT JOIN profiles ON profiles.user_id = users.id
`;

export async function getBulletinsForUsername(username) {
  const result = await query(
    `
      ${bulletinSelect}
      WHERE LOWER(users.username) = LOWER($1)
      ORDER BY bulletins.created_at DESC
      LIMIT 25
    `,
    [String(username || '').trim()]
  );

  return result.rows.map(mapBulletinRow);
}

export async function getOwnBulletins(userId) {
  const result = await query(
    `
      ${bulletinSelect}
      WHERE bulletins.user_id = $1
      ORDER BY bulletins.created_at DESC
      LIMIT 50
    `,
    [userId]
  );

  return result.rows.map(mapBulletinRow);
}

export async function getFriendBulletins(userId) {
  const result = await query(
    `
      ${bulletinSelect}
      INNER JOIN friendships ON (
        (friendships.requester_id = $1 AND friendships.receiver_id = bulletins.user_id)
        OR (friendships.receiver_id = $1 AND friendships.requester_id = bulletins.user_id)
      )
      WHERE friendships.status = 'accepted'
      ORDER BY bulletins.created_at DESC
      LIMIT 50
    `,
    [userId]
  );

  return result.rows.map(mapBulletinRow);
}

export async function createBulletin(userId, { title, body }) {
  const result = await query(
    `
      WITH inserted_bulletin AS (
        INSERT INTO bulletins (user_id, title, body)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, title, body, created_at, updated_at
      )
      SELECT
        inserted_bulletin.id,
        inserted_bulletin.title,
        inserted_bulletin.body,
        inserted_bulletin.created_at,
        inserted_bulletin.updated_at,
        users.username AS author_username,
        profiles.display_name AS author_display_name,
        profiles.profile_image_url AS author_profile_image_url
      FROM inserted_bulletin
      INNER JOIN users ON users.id = inserted_bulletin.user_id
      LEFT JOIN profiles ON profiles.user_id = users.id
    `,
    [userId, title, body]
  );

  return mapBulletinRow(result.rows[0]);
}

export async function deleteOwnBulletin(userId, bulletinId) {
  const result = await query(
    `
      DELETE FROM bulletins
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [bulletinId, userId]
  );

  return result.rowCount > 0;
}
