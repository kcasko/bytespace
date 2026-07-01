import { query } from './pool.js';

function formatProfileDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  }).format(new Date(value));
}

function mapProfileRow(row) {
  return {
    username: row.username,
    displayName: row.display_name || row.username,
    headline: row.headline || '',
    mood: row.mood || '',
    lastLogin: '06/30/2006 11:48 PM',
    online: true,
    profileImageUrl: row.profile_image_url || '',
    backgroundImageUrl: row.background_image_url || '',
    profileTitle: `${row.display_name || row.username}'s ByteSpace`,
    aboutMe: row.about_me || '',
    whoIdLikeToMeet: row.who_id_like_to_meet || '',
    interests: {
      general: row.general_interests || '',
      music: row.music || '',
      movies: row.movies || '',
      games: row.games || ''
    },
    theme: {
      backgroundColor: row.theme_background_color,
      textColor: row.theme_text_color,
      boxColor: row.theme_box_color,
      borderColor: row.theme_border_color,
      headerColor: row.theme_header_color,
      fontFamily: row.theme_font_family
    }
  };
}

export async function getProfileByUsername(username) {
  const profileResult = await query(
    `
      SELECT
        users.id AS user_id,
        users.username,
        profiles.display_name,
        profiles.headline,
        profiles.mood,
        profiles.about_me,
        profiles.who_id_like_to_meet,
        profiles.general_interests,
        profiles.music,
        profiles.movies,
        profiles.games,
        profiles.profile_image_url,
        profiles.background_image_url,
        profiles.theme_background_color,
        profiles.theme_text_color,
        profiles.theme_box_color,
        profiles.theme_border_color,
        profiles.theme_header_color,
        profiles.theme_font_family
      FROM users
      INNER JOIN profiles ON profiles.user_id = users.id
      WHERE LOWER(users.username) = LOWER($1)
    `,
    [username]
  );

  if (profileResult.rowCount === 0) {
    return null;
  }

  const row = profileResult.rows[0];
  const userId = row.user_id;
  const profile = mapProfileRow(row);

  const [topFriendsResult, commentsResult, bulletinsResult] = await Promise.all([
    query(
      `
        SELECT
          COALESCE(friend_profiles.display_name, friend_users.username) AS display_name
        FROM top_friends
        INNER JOIN users friend_users ON friend_users.id = top_friends.friend_id
        LEFT JOIN profiles friend_profiles ON friend_profiles.user_id = friend_users.id
        WHERE top_friends.user_id = $1
        ORDER BY top_friends.position ASC
      `,
      [userId]
    ),
    query(
      `
        SELECT
          COALESCE(author_profiles.display_name, author_users.username) AS author,
          profile_comments.body,
          profile_comments.created_at
        FROM profile_comments
        INNER JOIN users author_users ON author_users.id = profile_comments.author_user_id
        LEFT JOIN profiles author_profiles ON author_profiles.user_id = author_users.id
        WHERE profile_comments.profile_user_id = $1
        ORDER BY profile_comments.created_at ASC
      `,
      [userId]
    ),
    query(
      `
        SELECT title, created_at
        FROM bulletins
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `,
      [userId]
    )
  ]);

  return {
    ...profile,
    topFriends: topFriendsResult.rows.map((friend) => friend.display_name),
    comments: commentsResult.rows.map((comment) => ({
      author: comment.author,
      body: comment.body,
      date: formatProfileDate(comment.created_at)
    })),
    bulletins: bulletinsResult.rows.map((bulletin) => ({
      title: bulletin.title,
      date: formatProfileDate(bulletin.created_at)
    }))
  };
}
