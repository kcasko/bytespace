import { query } from './pool.js';

function mapCommentRow(row) {
  return {
    id: row.id,
    author: row.author_display_name || row.author_username,
    authorUsername: row.author_username,
    authorProfileImageUrl: row.author_profile_image_url || '',
    body: row.body,
    createdAt: row.created_at
  };
}

export async function getCommentsForProfileUsername(username) {
  const result = await query(
    `
      SELECT
        profile_comments.id,
        author_users.username AS author_username,
        author_profiles.display_name AS author_display_name,
        author_profiles.profile_image_url AS author_profile_image_url,
        profile_comments.body,
        profile_comments.created_at
      FROM users profile_users
      INNER JOIN profile_comments ON profile_comments.profile_user_id = profile_users.id
      INNER JOIN users author_users ON author_users.id = profile_comments.author_user_id
      LEFT JOIN profiles author_profiles ON author_profiles.user_id = author_users.id
      WHERE LOWER(profile_users.username) = LOWER($1)
      ORDER BY profile_comments.created_at DESC
    `,
    [username]
  );

  return result.rows.map(mapCommentRow);
}

export async function createProfileComment({ profileUsername, authorUserId, body }) {
  const targetResult = await query(
    'SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
    [profileUsername]
  );

  if (targetResult.rowCount === 0) {
    return null;
  }

  const insertResult = await query(
    `
      WITH inserted_comment AS (
        INSERT INTO profile_comments (profile_user_id, author_user_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, author_user_id, body, created_at
      )
      SELECT
        inserted_comment.id,
        author_users.username AS author_username,
        author_profiles.display_name AS author_display_name,
        author_profiles.profile_image_url AS author_profile_image_url,
        inserted_comment.body,
        inserted_comment.created_at
      FROM inserted_comment
      INNER JOIN users author_users ON author_users.id = inserted_comment.author_user_id
      LEFT JOIN profiles author_profiles ON author_profiles.user_id = author_users.id
    `,
    [targetResult.rows[0].id, authorUserId, body]
  );

  return mapCommentRow(insertResult.rows[0]);
}
