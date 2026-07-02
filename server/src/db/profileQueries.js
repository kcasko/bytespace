import { query } from './pool.js';

export const allowedProfileFonts = [
  'Arial',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Comic Sans MS',
  'Arial, Helvetica, sans-serif'
];

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

function buildProfileBadges(row) {
  const joinedAt = row.user_created_at ? new Date(row.user_created_at) : null;
  const joinedRecently = joinedAt
    ? Date.now() - joinedAt.getTime() < 14 * 24 * 60 * 60 * 1000
    : false;

  return {
    admin: Boolean(row.is_admin),
    newMember: joinedRecently,
    founder: Number(row.user_id) <= 10
  };
}

let layoutPresetColumnAvailable = null;

async function hasLayoutPresetColumn() {
  if (layoutPresetColumnAvailable !== null) {
    return layoutPresetColumnAvailable;
  }

  const result = await query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'layout_preset'
      LIMIT 1
    `
  );

  layoutPresetColumnAvailable = result.rowCount > 0;
  return layoutPresetColumnAvailable;
}

function layoutPresetSelect(hasColumn) {
  return hasColumn ? 'profiles.layout_preset' : `'classic' AS layout_preset`;
}

function mapProfileRow(row) {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name || row.username,
    headline: row.headline || '',
    mood: row.mood || '',
    statusMessage: row.status_message || '',
    layoutPreset: row.layout_preset || 'classic',
    lastLogin: '06/30/2006 11:48 PM',
    online: true,
    joinedAt: row.user_created_at || null,
    joinedDate: formatProfileDate(row.user_created_at),
    badges: buildProfileBadges(row),
    profileImageUrl: row.profile_image_url || '',
    backgroundImageUrl: row.background_image_url || '',
    profileSongTitle: row.profile_song_title || '',
    profileSongArtist: row.profile_song_artist || '',
    profileSongUrl: row.profile_song_url || '',
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
      fontFamily: row.theme_font_family,
      backgroundRepeat: row.theme_background_repeat || 'repeat',
      backgroundSize: row.theme_background_size || 'auto',
      backgroundPosition: row.theme_background_position || 'center'
    }
  };
}

function mapEditableProfileRow(row) {
  return {
    displayName: row.display_name || '',
    headline: row.headline || '',
    mood: row.mood || '',
    statusMessage: row.status_message || '',
    layoutPreset: row.layout_preset || 'classic',
    aboutMe: row.about_me || '',
    whoIdLikeToMeet: row.who_id_like_to_meet || '',
    generalInterests: row.general_interests || '',
    music: row.music || '',
    movies: row.movies || '',
    games: row.games || '',
    profileImageUrl: row.profile_image_url || '',
    backgroundImageUrl: row.background_image_url || '',
    profileSongTitle: row.profile_song_title || '',
    profileSongArtist: row.profile_song_artist || '',
    profileSongUrl: row.profile_song_url || '',
    profileVisibility: row.profile_visibility || 'public',
    commentPermission: row.comment_permission || 'everyone',
    bulletinVisibility: row.bulletin_visibility || 'public',
    friendRequestPermission: row.friend_request_permission || 'everyone',
    themeBackgroundColor: row.theme_background_color || '#1a0f6d',
    themeTextColor: row.theme_text_color || '#111111',
    themeBoxColor: row.theme_box_color || '#f5fbff',
    themeBorderColor: row.theme_border_color || '#003d9c',
    themeHeaderColor: row.theme_header_color || '#004fbf',
    themeFontFamily: row.theme_font_family || 'Arial',
    themeBackgroundRepeat: row.theme_background_repeat || 'repeat',
    themeBackgroundSize: row.theme_background_size || 'auto',
    themeBackgroundPosition: row.theme_background_position || 'center'
  };
}

export async function getOwnProfileByUserId(userId) {
  const hasLayoutPreset = await hasLayoutPresetColumn();
  const result = await query(
    `
      SELECT
        profiles.display_name,
        profiles.headline,
        profiles.mood,
        profiles.status_message,
        ${layoutPresetSelect(hasLayoutPreset)},
        profiles.about_me,
        profiles.who_id_like_to_meet,
        profiles.general_interests,
        profiles.music,
        profiles.movies,
        profiles.games,
        profiles.profile_image_url,
        profiles.background_image_url,
        profiles.profile_song_title,
        profiles.profile_song_artist,
        profiles.profile_song_url,
        profiles.profile_visibility,
        profiles.comment_permission,
        profiles.bulletin_visibility,
        profiles.friend_request_permission,
        profiles.theme_background_color,
        profiles.theme_text_color,
        profiles.theme_box_color,
        profiles.theme_border_color,
        profiles.theme_header_color,
        profiles.theme_font_family,
        profiles.theme_background_repeat,
        profiles.theme_background_size,
        profiles.theme_background_position
      FROM profiles
      WHERE profiles.user_id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapEditableProfileRow(result.rows[0]);
}

export async function updateOwnProfile(userId, profileInput) {
  const hasLayoutPreset = await hasLayoutPresetColumn();
  const layoutUpdate = hasLayoutPreset ? 'layout_preset = $6,' : '';
  const layoutReturn = hasLayoutPreset ? 'layout_preset,' : `'classic' AS layout_preset,`;
  const values = [
    userId,
    profileInput.displayName,
    profileInput.headline,
    profileInput.mood,
    profileInput.statusMessage,
    ...(hasLayoutPreset ? [profileInput.layoutPreset || 'classic'] : []),
    profileInput.aboutMe,
    profileInput.whoIdLikeToMeet,
    profileInput.generalInterests,
    profileInput.music,
    profileInput.movies,
    profileInput.games,
    profileInput.themeBackgroundColor,
    profileInput.themeTextColor,
    profileInput.themeBoxColor,
    profileInput.themeBorderColor,
    profileInput.themeHeaderColor,
    profileInput.themeFontFamily,
    profileInput.themeBackgroundRepeat,
    profileInput.themeBackgroundSize,
    profileInput.themeBackgroundPosition,
    profileInput.profileSongTitle,
    profileInput.profileSongArtist,
    profileInput.profileSongUrl
  ];
  const offset = hasLayoutPreset ? 0 : -1;
  const param = (index) => `$${index + offset}`;

  const result = await query(
    `
      UPDATE profiles
      SET
        display_name = $2,
        headline = $3,
        mood = $4,
        status_message = $5,
        ${layoutUpdate}
        about_me = ${param(7)},
        who_id_like_to_meet = ${param(8)},
        general_interests = ${param(9)},
        music = ${param(10)},
        movies = ${param(11)},
        games = ${param(12)},
        theme_background_color = ${param(13)},
        theme_text_color = ${param(14)},
        theme_box_color = ${param(15)},
        theme_border_color = ${param(16)},
        theme_header_color = ${param(17)},
        theme_font_family = ${param(18)},
        theme_background_repeat = ${param(19)},
        theme_background_size = ${param(20)},
        theme_background_position = ${param(21)},
        profile_song_title = ${param(22)},
        profile_song_artist = ${param(23)},
        profile_song_url = ${param(24)},
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        display_name,
        headline,
        mood,
        status_message,
        ${layoutReturn}
        about_me,
        who_id_like_to_meet,
        general_interests,
        music,
        movies,
        games,
        profile_song_title,
        profile_song_artist,
        profile_song_url,
        theme_background_color,
        theme_text_color,
        theme_box_color,
        theme_border_color,
        theme_header_color,
        theme_font_family,
        theme_background_repeat,
        theme_background_size,
        theme_background_position
    `,
    values
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapEditableProfileRow(result.rows[0]);
}

export async function getProfileByUsername(username) {
  const hasLayoutPreset = await hasLayoutPresetColumn();
  const profileResult = await query(
    `
      SELECT
        users.id AS user_id,
        users.username,
        users.created_at AS user_created_at,
        users.is_admin,
        profiles.display_name,
        profiles.headline,
        profiles.mood,
        profiles.status_message,
        ${layoutPresetSelect(hasLayoutPreset)},
        profiles.about_me,
        profiles.who_id_like_to_meet,
        profiles.general_interests,
        profiles.music,
        profiles.movies,
        profiles.games,
        profiles.profile_image_url,
        profiles.background_image_url,
        profiles.profile_song_title,
        profiles.profile_song_artist,
        profiles.profile_song_url,
        profiles.theme_background_color,
        profiles.theme_text_color,
        profiles.theme_box_color,
        profiles.theme_border_color,
        profiles.theme_header_color,
        profiles.theme_font_family,
        profiles.theme_background_repeat,
        profiles.theme_background_size,
        profiles.theme_background_position
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

  const [topFriendsResult, commentsResult, bulletinsResult, friendCountResult, bulletinCountResult] = await Promise.all([
    query(
      `
        SELECT
          friend_users.id,
          friend_users.username,
          COALESCE(friend_profiles.display_name, friend_users.username) AS display_name,
          friend_profiles.profile_image_url,
          top_friends.position
        FROM top_friends
        INNER JOIN users friend_users ON friend_users.id = top_friends.friend_id
        LEFT JOIN profiles friend_profiles ON friend_profiles.user_id = friend_users.id
        WHERE top_friends.user_id = $1
          AND NOT EXISTS (
            SELECT 1
            FROM blocked_users
            WHERE (blocker_id = top_friends.user_id AND blocked_id = friend_users.id)
               OR (blocker_id = friend_users.id AND blocked_id = top_friends.user_id)
          )
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
    ),
    query(
      `
        SELECT COUNT(*)::int AS count
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
      `,
      [userId]
    ),
    query(
      `
        SELECT COUNT(*)::int AS count
        FROM bulletins
        WHERE user_id = $1
      `,
      [userId]
    )
  ]);

  return {
    ...profile,
    topFriends: topFriendsResult.rows.map((friend) => ({
      id: friend.id,
      username: friend.username,
      displayName: friend.display_name,
      profileImageUrl: friend.profile_image_url || '',
      position: friend.position
    })),
    comments: commentsResult.rows.map((comment) => ({
      author: comment.author,
      body: comment.body,
      date: formatProfileDate(comment.created_at)
    })),
    stats: {
      friendCount: friendCountResult.rows[0]?.count || 0,
      commentCount: commentsResult.rowCount,
      bulletinCount: bulletinCountResult.rows[0]?.count || 0,
      joinedDate: profile.joinedDate
    },
    bulletins: bulletinsResult.rows.map((bulletin) => ({
      title: bulletin.title,
      date: formatProfileDate(bulletin.created_at)
    }))
  };
}

/**
 * Persist a new avatar URL for the given user.
 * Returns the stored URL string, or null if no profile row was found.
 */
export async function updateProfileImageUrl(userId, publicUrl) {
  const result = await query(
    `
      UPDATE profiles
      SET profile_image_url = $2, updated_at = NOW()
      WHERE user_id = $1
      RETURNING profile_image_url
    `,
    [userId, publicUrl]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0].profile_image_url;
}

/**
 * Persist a new background image URL for the given user.
 * Returns the stored URL string, or null if no profile row was found.
 */
export async function updateBackgroundImageUrl(userId, publicUrl) {
  const result = await query(
    `
      UPDATE profiles
      SET background_image_url = $2, updated_at = NOW()
      WHERE user_id = $1
      RETURNING background_image_url
    `,
    [userId, publicUrl]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0].background_image_url;
}
