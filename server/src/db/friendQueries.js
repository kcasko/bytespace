import { pool, query } from './pool.js';
import { isBlockedBetween } from './blockQueries.js';
import { shareAcceptedFriend } from './settingsQueries.js';

function mapFriendRow(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    profileImageUrl: row.profile_image_url || '',
    position: row.position
  };
}

export async function getUserByUsername(username) {
  const result = await query(
    `
      SELECT id, username, email
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
    `,
    [String(username || '').trim()]
  );

  return result.rows[0] || null;
}

export async function getFriendshipBetweenUsers(userIdA, userIdB) {
  const result = await query(
    `
      SELECT id, requester_id, receiver_id, status
      FROM friendships
      WHERE (requester_id = $1 AND receiver_id = $2)
         OR (requester_id = $2 AND receiver_id = $1)
      LIMIT 1
    `,
    [userIdA, userIdB]
  );

  return result.rows[0] || null;
}

export async function sendFriendRequest(requesterId, receiverUsername) {
  const receiver = await getUserByUsername(receiverUsername);

  if (!receiver) {
    return { error: 'User not found.', statusCode: 404 };
  }

  if (receiver.id === requesterId) {
    return { error: 'You cannot send a friend request to yourself.', statusCode: 400 };
  }

  const blockStatus = await isBlockedBetween(requesterId, receiver.id);

  if (blockStatus.blocked) {
    return { error: 'This interaction is blocked. The glitter wall is up.', statusCode: 403 };
  }

  const permissionResult = await query(
    `
      SELECT friend_request_permission
      FROM profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [receiver.id]
  );
  const friendRequestPermission = permissionResult.rows[0]?.friend_request_permission || 'everyone';

  if (friendRequestPermission === 'none') {
    return { error: 'This user is not accepting friend requests.', statusCode: 403 };
  }

  if (friendRequestPermission === 'friends_of_friends') {
    const sharesFriend = await shareAcceptedFriend(requesterId, receiver.id);

    if (!sharesFriend) {
      return { error: 'This user only accepts friend requests from friends of friends.', statusCode: 403 };
    }
  }

  const existing = await getFriendshipBetweenUsers(requesterId, receiver.id);

  if (existing?.status === 'accepted') {
    return { error: 'You are already friends.', statusCode: 409 };
  }

  if (existing?.status === 'pending') {
    return { error: 'A friend request is already pending.', statusCode: 409 };
  }

  if (existing?.status === 'blocked') {
    return { error: 'Friend request unavailable.', statusCode: 403 };
  }

  await query(
    `
      INSERT INTO friendships (requester_id, receiver_id, status)
      VALUES ($1, $2, 'pending')
    `,
    [requesterId, receiver.id]
  );

  return { ok: true };
}

export async function getIncomingFriendRequests(userId) {
  const result = await query(
    `
      SELECT users.id, users.username, profiles.display_name, profiles.profile_image_url
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
      ORDER BY friendships.created_at ASC
    `,
    [userId]
  );

  return result.rows.map(mapFriendRow);
}

export async function getOutgoingFriendRequests(userId) {
  const result = await query(
    `
      SELECT users.id, users.username, profiles.display_name, profiles.profile_image_url
      FROM friendships
      INNER JOIN users ON users.id = friendships.receiver_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE friendships.requester_id = $1
        AND friendships.status = 'pending'
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users
          WHERE (blocker_id = $1 AND blocked_id = users.id)
             OR (blocker_id = users.id AND blocked_id = $1)
        )
      ORDER BY friendships.created_at ASC
    `,
    [userId]
  );

  return result.rows.map(mapFriendRow);
}

export async function acceptFriendRequest(userId, requesterUsername) {
  const requester = await getUserByUsername(requesterUsername);

  if (!requester) {
    return { error: 'User not found.', statusCode: 404 };
  }

  const result = await query(
    `
      UPDATE friendships
      SET status = 'accepted', updated_at = NOW()
      WHERE requester_id = $1
        AND receiver_id = $2
        AND status = 'pending'
      RETURNING id
    `,
    [requester.id, userId]
  );

  if (result.rowCount === 0) {
    return { error: 'Incoming friend request not found.', statusCode: 404 };
  }

  return { ok: true };
}

export async function rejectFriendRequest(userId, requesterUsername) {
  const requester = await getUserByUsername(requesterUsername);

  if (!requester) {
    return { error: 'User not found.', statusCode: 404 };
  }

  const result = await query(
    `
      DELETE FROM friendships
      WHERE requester_id = $1
        AND receiver_id = $2
        AND status = 'pending'
      RETURNING id
    `,
    [requester.id, userId]
  );

  if (result.rowCount === 0) {
    return { error: 'Incoming friend request not found.', statusCode: 404 };
  }

  return { ok: true };
}

export async function getAcceptedFriends(userId) {
  const result = await query(
    `
      SELECT users.id, users.username, profiles.display_name, profiles.profile_image_url
      FROM friendships
      INNER JOIN users ON users.id = CASE
        WHEN friendships.requester_id = $1 THEN friendships.receiver_id
        ELSE friendships.requester_id
      END
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE (friendships.requester_id = $1 OR friendships.receiver_id = $1)
        AND friendships.status = 'accepted'
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users
          WHERE (blocker_id = $1 AND blocked_id = users.id)
             OR (blocker_id = users.id AND blocked_id = $1)
        )
      ORDER BY LOWER(COALESCE(profiles.display_name, users.username)) ASC
    `,
    [userId]
  );

  return result.rows.map(mapFriendRow);
}

export async function getTopFriends(userId) {
  const result = await query(
    `
      SELECT
        users.id,
        users.username,
        profiles.display_name,
        profiles.profile_image_url,
        top_friends.position
      FROM top_friends
      INNER JOIN users ON users.id = top_friends.friend_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE top_friends.user_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users
          WHERE (blocker_id = $1 AND blocked_id = users.id)
             OR (blocker_id = users.id AND blocked_id = $1)
        )
      ORDER BY top_friends.position ASC
    `,
    [userId]
  );

  return result.rows.map(mapFriendRow);
}

export async function setTopFriends(userId, friendUserIdsInOrder) {
  if (!Array.isArray(friendUserIdsInOrder)) {
    return { error: 'friendUserIds must be an array.', statusCode: 400 };
  }

  if (friendUserIdsInOrder.length > 8) {
    return { error: 'Top 8 can include at most 8 friends.', statusCode: 400 };
  }

  const friendIds = friendUserIdsInOrder.map((id) => Number(id));

  if (friendIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: 'friendUserIds must contain valid user IDs.', statusCode: 400 };
  }

  if (new Set(friendIds).size !== friendIds.length) {
    return { error: 'Top 8 cannot include duplicate friends.', statusCode: 400 };
  }

  if (friendIds.includes(userId)) {
    return { error: 'You cannot add yourself to your Top 8.', statusCode: 400 };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (friendIds.length > 0) {
      const acceptedResult = await client.query(
        `
          SELECT users.id
          FROM users
          INNER JOIN friendships ON (
            (friendships.requester_id = $1 AND friendships.receiver_id = users.id)
            OR (friendships.receiver_id = $1 AND friendships.requester_id = users.id)
          )
          WHERE users.id = ANY($2::int[])
            AND friendships.status = 'accepted'
            AND NOT EXISTS (
              SELECT 1
              FROM blocked_users
              WHERE (blocker_id = $1 AND blocked_id = users.id)
                 OR (blocker_id = users.id AND blocked_id = $1)
            )
        `,
        [userId, friendIds]
      );

      if (acceptedResult.rowCount !== friendIds.length) {
        await client.query('ROLLBACK');
        return { error: 'Only accepted friends can be added to Top 8.', statusCode: 400 };
      }
    }

    await client.query('DELETE FROM top_friends WHERE user_id = $1', [userId]);

    for (const [index, friendId] of friendIds.entries()) {
      await client.query(
        `
          INSERT INTO top_friends (user_id, friend_id, position)
          VALUES ($1, $2, $3)
        `,
        [userId, friendId, index + 1]
      );
    }

    await client.query('COMMIT');
    return { topFriends: await getTopFriends(userId) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function removeTopFriend(userId, friendId) {
  const current = await getTopFriends(userId);
  const nextIds = current
    .filter((friend) => friend.id !== Number(friendId))
    .map((friend) => friend.id);

  return setTopFriends(userId, nextIds);
}
