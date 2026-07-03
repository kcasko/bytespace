import { query } from './pool.js';


export const defaultSectionOrder = ['about', 'interests', 'music', 'friends', 'bulletins', 'comments'];
export const allowedSectionKeys = new Set(defaultSectionOrder);

export function normalizeSectionOrder(value) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalized = [];

  for (const item of source) {
    if (allowedSectionKeys.has(item) && !seen.has(item)) {
      normalized.push(item);
      seen.add(item);
    }
  }

  for (const item of defaultSectionOrder) {
    if (!seen.has(item)) {
      normalized.push(item);
    }
  }

  return normalized;
}

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


const SAFE_THEME_DEFAULTS = {
  backgroundColor: '#d6e6f2',
  textColor: '#111111',
  boxColor: '#ffffff',
  borderColor: '#336699',
  headerColor: '#336699',
  fontFamily: 'Arial',
  backgroundRepeat: 'repeat',
  backgroundSize: 'auto',
  backgroundPosition: 'center'
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const backgroundRepeatValues = new Set(['repeat', 'no-repeat', 'repeat-x', 'repeat-y']);
const backgroundSizeValues = new Set(['auto', 'cover', 'contain']);
const backgroundPositionValues = new Set(['center', 'top', 'bottom', 'left', 'right']);

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();

  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }

  const hex = trimmed.toLowerCase();

  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return hex;
}

function safeOption(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback;
}

function safeFont(value) {
  return allowedProfileFonts.includes(value) ? value : SAFE_THEME_DEFAULTS.fontFamily;
}

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

const profileColumnAvailability = new Map();

async function hasProfileColumn(columnName) {
  if (profileColumnAvailability.has(columnName)) {
    return profileColumnAvailability.get(columnName);
  }

  const result = await query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = $1
      LIMIT 1
    `,
    [columnName]
  );

  const available = result.rowCount > 0;
  profileColumnAvailability.set(columnName, available);
  return available;
}

function layoutPresetSelect(hasColumn) {
  return hasColumn ? 'profiles.layout_preset' : `'classic' AS layout_preset`;
}

function sectionOrderSelect(hasColumn) {
  return hasColumn ? 'profiles.section_order' : `'["about", "interests", "music", "friends", "bulletins", "comments"]'::jsonb AS section_order`;
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
    sectionOrder: normalizeSectionOrder(row.section_order),
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
      backgroundColor: normalizeHexColor(row.theme_background_color, SAFE_THEME_DEFAULTS.backgroundColor),
      textColor: normalizeHexColor(row.theme_text_color, SAFE_THEME_DEFAULTS.textColor),
      boxColor: normalizeHexColor(row.theme_box_color, SAFE_THEME_DEFAULTS.boxColor),
      borderColor: normalizeHexColor(row.theme_border_color, SAFE_THEME_DEFAULTS.borderColor),
      headerColor: normalizeHexColor(row.theme_header_color, SAFE_THEME_DEFAULTS.headerColor),
      fontFamily: safeFont(row.theme_font_family),
      backgroundRepeat: safeOption(row.theme_background_repeat, backgroundRepeatValues, SAFE_THEME_DEFAULTS.backgroundRepeat),
      backgroundSize: safeOption(row.theme_background_size, backgroundSizeValues, SAFE_THEME_DEFAULTS.backgroundSize),
      backgroundPosition: safeOption(row.theme_background_position, backgroundPositionValues, SAFE_THEME_DEFAULTS.backgroundPosition)
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
    sectionOrder: normalizeSectionOrder(row.section_order),
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
    themeBackgroundColor: normalizeHexColor(row.theme_background_color, SAFE_THEME_DEFAULTS.backgroundColor),
    themeTextColor: normalizeHexColor(row.theme_text_color, SAFE_THEME_DEFAULTS.textColor),
    themeBoxColor: normalizeHexColor(row.theme_box_color, SAFE_THEME_DEFAULTS.boxColor),
    themeBorderColor: normalizeHexColor(row.theme_border_color, SAFE_THEME_DEFAULTS.borderColor),
    themeHeaderColor: normalizeHexColor(row.theme_header_color, SAFE_THEME_DEFAULTS.headerColor),
    themeFontFamily: safeFont(row.theme_font_family),
    themeBackgroundRepeat: safeOption(row.theme_background_repeat, backgroundRepeatValues, SAFE_THEME_DEFAULTS.backgroundRepeat),
    themeBackgroundSize: safeOption(row.theme_background_size, backgroundSizeValues, SAFE_THEME_DEFAULTS.backgroundSize),
    themeBackgroundPosition: safeOption(row.theme_background_position, backgroundPositionValues, SAFE_THEME_DEFAULTS.backgroundPosition)
  };
}

export async function getOwnProfileByUserId(userId) {
  const hasLayoutPreset = await hasProfileColumn('layout_preset');
  const hasSectionOrder = await hasProfileColumn('section_order');
  const result = await query(
    `
      SELECT
        profiles.display_name,
        profiles.headline,
        profiles.mood,
        profiles.status_message,
        ${layoutPresetSelect(hasLayoutPreset)},
        ${sectionOrderSelect(hasSectionOrder)},
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
  const hasSectionOrder = await hasProfileColumn('section_order');
  const sectionUpdate = hasSectionOrder ? 'section_order = $25::jsonb,' : '';
  const sectionReturn = hasSectionOrder ? 'section_order,' : `'["about", "interests", "music", "friends", "bulletins", "comments"]'::jsonb AS section_order,`;

  const result = await query(
    `
      UPDATE profiles
      SET
        display_name = $2,
        headline = $3,
        mood = $4,
        status_message = $5,
        layout_preset = $6,
        about_me = $7,
        who_id_like_to_meet = $8,
        general_interests = $9,
        music = $10,
        movies = $11,
        games = $12,
        theme_background_color = $13,
        theme_text_color = $14,
        theme_box_color = $15,
        theme_border_color = $16,
        theme_header_color = $17,
        theme_font_family = $18,
        theme_background_repeat = $19,
        theme_background_size = $20,
        theme_background_position = $21,
        profile_song_title = $22,
        profile_song_artist = $23,
        profile_song_url = $24,
        ${sectionUpdate}
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        display_name,
        headline,
        mood,
        status_message,
        layout_preset,
        ${sectionReturn}
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
    [
      userId,
      profileInput.displayName,
      profileInput.headline,
      profileInput.mood,
      profileInput.statusMessage,
      profileInput.layoutPreset || 'classic',
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
      profileInput.profileSongUrl,
      ...(hasSectionOrder ? [JSON.stringify(normalizeSectionOrder(profileInput.sectionOrder))] : [])
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapEditableProfileRow(result.rows[0]);
}

export async function getProfileByUsername(username) {
  const hasLayoutPreset = await hasProfileColumn('layout_preset');
  const hasSectionOrder = await hasProfileColumn('section_order');
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
        ${sectionOrderSelect(hasSectionOrder)},
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
