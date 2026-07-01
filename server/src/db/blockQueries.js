import { pool, query } from './pool.js';

function mapBlockedUserRow(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    profileImageUrl: row.profile_image_url || '',
    blockedAt: row.blocked_at
  };
}

async function getUserByUsername(username) {
  const result = await query(
    `
      SELECT id, username
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
    `,
    [String(username || '').trim()]
  );

  return result.rows[0] || null;
}

export async function hasBlocked(blockerId, blockedId) {
  if (!blockerId || !blockedId) {
    return false;
  }

  const result = await query(
    `
      SELECT id
      FROM blocked_users
      WHERE blocker_id = $1
        AND blocked_id = $2
      LIMIT 1
    `,
    [blockerId, blockedId]
  );

  return result.rowCount > 0;
}

export async function isBlockedBetween(userIdA, userIdB) {
  if (!userIdA || !userIdB) {
    return {
      blocked: false,
      aBlockedB: false,
      bBlockedA: false
    };
  }

  const result = await query(
    `
      SELECT blocker_id, blocked_id
      FROM blocked_users
      WHERE (blocker_id = $1 AND blocked_id = $2)
         OR (blocker_id = $2 AND blocked_id = $1)
    `,
    [userIdA, userIdB]
  );

  const aBlockedB = result.rows.some((row) => row.blocker_id === userIdA && row.blocked_id === userIdB);
  const bBlockedA = result.rows.some((row) => row.blocker_id === userIdB && row.blocked_id === userIdA);

  return {
    blocked: aBlockedB || bBlockedA,
    aBlockedB,
    bBlockedA
  };
}

export async function blockUser(blockerId, blockedUsername) {
  const blockedUser = await getUserByUsername(blockedUsername);

  if (!blockedUser) {
    return { error: 'User not found.', statusCode: 404 };
  }

  if (blockedUser.id === blockerId) {
    return { error: 'You cannot block yourself.', statusCode: 400 };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
        INSERT INTO blocked_users (blocker_id, blocked_id)
        VALUES ($1, $2)
        ON CONFLICT (blocker_id, blocked_id) DO NOTHING
      `,
      [blockerId, blockedUser.id]
    );

    await client.query(
      `
        DELETE FROM friendships
        WHERE (requester_id = $1 AND receiver_id = $2)
           OR (requester_id = $2 AND receiver_id = $1)
      `,
      [blockerId, blockedUser.id]
    );

    await client.query(
      `
        DELETE FROM top_friends
        WHERE (user_id = $1 AND friend_id = $2)
           OR (user_id = $2 AND friend_id = $1)
      `,
      [blockerId, blockedUser.id]
    );

    await client.query('COMMIT');

    return { ok: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function unblockUser(blockerId, blockedUsername) {
  const blockedUser = await getUserByUsername(blockedUsername);

  if (!blockedUser) {
    return { error: 'User not found.', statusCode: 404 };
  }

  await query(
    `
      DELETE FROM blocked_users
      WHERE blocker_id = $1
        AND blocked_id = $2
    `,
    [blockerId, blockedUser.id]
  );

  return { ok: true };
}

export async function getBlockedUsers(blockerId) {
  const result = await query(
    `
      SELECT
        users.id,
        users.username,
        profiles.display_name,
        profiles.profile_image_url,
        blocked_users.created_at AS blocked_at
      FROM blocked_users
      INNER JOIN users ON users.id = blocked_users.blocked_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE blocked_users.blocker_id = $1
      ORDER BY blocked_users.created_at DESC
    `,
    [blockerId]
  );

  return result.rows.map(mapBlockedUserRow);
}
