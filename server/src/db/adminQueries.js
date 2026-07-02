import { query } from './pool.js';

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name || row.username,
    profileImageUrl: row.profile_image_url || '',
    isAdmin: Boolean(row.is_admin),
    suspendedAt: row.suspended_at,
    suspensionReason: row.suspension_reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapComment(row) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    profileUsername: row.profile_username,
    profileDisplayName: row.profile_display_name || row.profile_username,
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name || row.author_username
  };
}

function mapBulletin(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name || row.author_username
  };
}

const userSelect = `
  SELECT
    users.id,
    users.username,
    users.email,
    users.is_admin,
    users.suspended_at,
    users.suspension_reason,
    users.created_at,
    users.updated_at,
    profiles.display_name,
    profiles.profile_image_url
  FROM users
  LEFT JOIN profiles ON profiles.user_id = users.id
`;

export async function getUserAdminStatus(userId) {
  let result;

  try {
    result = await query(
      'SELECT id, username, is_admin, suspended_at FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
  } catch (error) {
    if (error.code !== '42703') {
      throw error;
    }

    result = await query(
      'SELECT id, username FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
  }

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    isAdmin: Boolean(row.is_admin),
    suspendedAt: row.suspended_at || null
  };
}

export async function listUsers({ search = '', limit = 100 } = {}) {
  const normalizedSearch = String(search || '').trim();
  const result = await query(
    `
      ${userSelect}
      WHERE $1 = ''
        OR LOWER(users.username) LIKE LOWER('%' || $1 || '%')
        OR LOWER(users.email) LIKE LOWER('%' || $1 || '%')
        OR LOWER(COALESCE(profiles.display_name, '')) LIKE LOWER('%' || $1 || '%')
      ORDER BY users.created_at DESC
      LIMIT $2
    `,
    [normalizedSearch, limit]
  );

  return result.rows.map(mapUser);
}

export async function getUserDetail(identifier) {
  const value = String(identifier || '').trim();
  const numericId = Number(value);
  const result = await query(
    `
      ${userSelect}
      WHERE users.username = LOWER($1)
        OR ($2::integer IS NOT NULL AND users.id = $2::integer)
      LIMIT 1
    `,
    [value.toLowerCase(), Number.isInteger(numericId) ? numericId : null]
  );

  return result.rowCount > 0 ? mapUser(result.rows[0]) : null;
}

export async function countAdminsExcluding(userId) {
  const result = await query(
    `
      SELECT COUNT(*)::integer AS admin_count
      FROM users
      WHERE is_admin = TRUE
        AND id <> $1
        AND suspended_at IS NULL
    `,
    [userId]
  );

  return result.rows[0].admin_count;
}

export async function suspendUserByUsername(username, reason = '') {
  const result = await query(
    `
      UPDATE users
      SET suspended_at = NOW(),
          suspension_reason = NULLIF($2, ''),
          updated_at = NOW()
      WHERE LOWER(username) = LOWER($1)
      RETURNING id
    `,
    [String(username || '').trim(), String(reason || '').trim()]
  );

  return result.rowCount > 0;
}

export async function unsuspendUserByUsername(username) {
  const result = await query(
    `
      UPDATE users
      SET suspended_at = NULL,
          suspension_reason = NULL,
          updated_at = NOW()
      WHERE LOWER(username) = LOWER($1)
      RETURNING id
    `,
    [String(username || '').trim()]
  );

  return result.rowCount > 0;
}

export async function getRecentSignups(limit = 10) {
  const result = await query(
    `
      ${userSelect}
      ORDER BY users.created_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(mapUser);
}

export async function getRecentComments(limit = 25) {
  const result = await query(
    `
      SELECT
        profile_comments.id,
        profile_comments.body,
        profile_comments.created_at,
        profile_users.username AS profile_username,
        profile_profiles.display_name AS profile_display_name,
        author_users.username AS author_username,
        author_profiles.display_name AS author_display_name
      FROM profile_comments
      INNER JOIN users profile_users ON profile_users.id = profile_comments.profile_user_id
      INNER JOIN users author_users ON author_users.id = profile_comments.author_user_id
      LEFT JOIN profiles profile_profiles ON profile_profiles.user_id = profile_users.id
      LEFT JOIN profiles author_profiles ON author_profiles.user_id = author_users.id
      ORDER BY profile_comments.created_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(mapComment);
}

export async function getRecentBulletins(limit = 25) {
  const result = await query(
    `
      SELECT
        bulletins.id,
        bulletins.title,
        bulletins.body,
        bulletins.created_at,
        bulletins.updated_at,
        users.username AS author_username,
        profiles.display_name AS author_display_name
      FROM bulletins
      INNER JOIN users ON users.id = bulletins.user_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      ORDER BY bulletins.created_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(mapBulletin);
}

export async function deleteCommentById(commentId) {
  const result = await query('DELETE FROM profile_comments WHERE id = $1 RETURNING id', [commentId]);
  return result.rowCount > 0;
}

export async function deleteBulletinById(bulletinId) {
  const result = await query('DELETE FROM bulletins WHERE id = $1 RETURNING id', [bulletinId]);
  return result.rowCount > 0;
}
