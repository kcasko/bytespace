import bcrypt from 'bcrypt';
import { query } from './pool.js';

const SALT_ROUNDS = 12;
let browsePreferenceColumnsAvailable = null;

async function hasBrowsePreferenceColumns() {
  if (browsePreferenceColumnsAvailable !== null) return browsePreferenceColumnsAvailable;

  const result = await query(`
    SELECT COUNT(*)::int AS column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name IN ('show_in_directory', 'show_music_in_directory', 'show_status_in_directory')
  `);

  browsePreferenceColumnsAvailable = result.rows[0]?.column_count === 3;
  return browsePreferenceColumnsAvailable;
}

function strictBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function mapAccountSettings(row, hasPreferences) {
  return {
    user: {
      username: row.username,
      isAdmin: Boolean(row.is_admin),
      suspendedAt: row.suspended_at || null,
      createdAt: row.created_at,
      onboardingCompletedAt: row.onboarding_completed_at || null
    },
    profile: {
      displayName: row.display_name || row.username
    },
    preferences: {
      showInDirectory: hasPreferences ? row.show_in_directory !== false : true,
      showMusicInDirectory: hasPreferences ? row.show_music_in_directory !== false : true,
      showStatusInDirectory: hasPreferences ? row.show_status_in_directory !== false : true
    },
    preferencesUnavailable: !hasPreferences
  };
}

export async function getAccountSettings(userId) {
  const hasPreferences = await hasBrowsePreferenceColumns();
  const preferenceSelect = hasPreferences
    ? 'profiles.show_in_directory, profiles.show_music_in_directory, profiles.show_status_in_directory'
    : 'TRUE AS show_in_directory, TRUE AS show_music_in_directory, TRUE AS show_status_in_directory';

  const result = await query(
    `
      SELECT
        users.id,
        users.username,
        users.is_admin,
        users.suspended_at,
        users.created_at,
        users.onboarding_completed_at,
        profiles.display_name,
        ${preferenceSelect}
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE users.id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ? mapAccountSettings(result.rows[0], hasPreferences) : null;
}

export async function updateAccountPreferences(userId, preferencesInput) {
  const hasPreferences = await hasBrowsePreferenceColumns();

  if (!hasPreferences) {
    return { unavailable: true, settings: await getAccountSettings(userId) };
  }

  const showInDirectory = strictBoolean(preferencesInput.showInDirectory);
  const showMusicInDirectory = strictBoolean(preferencesInput.showMusicInDirectory);
  const showStatusInDirectory = strictBoolean(preferencesInput.showStatusInDirectory);

  if (showInDirectory === null || showMusicInDirectory === null || showStatusInDirectory === null) {
    return { error: 'Browse preferences must be boolean values.' };
  }

  await query(
    `
      UPDATE profiles
      SET show_in_directory = $2,
          show_music_in_directory = $3,
          show_status_in_directory = $4,
          updated_at = NOW()
      WHERE user_id = $1
    `,
    [userId, showInDirectory, showMusicInDirectory, showStatusInDirectory]
  );

  return { settings: await getAccountSettings(userId) };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const current = String(currentPassword || '');
  const next = String(newPassword || '');

  if (!current || !next) {
    return { error: 'Current password and new password are required.', status: 400 };
  }

  if (next.length < 8) {
    return { error: 'New password must be at least 8 characters.', status: 400 };
  }

  const result = await query(
    `
      SELECT password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return { error: 'Account not found.', status: 404 };
  }

  let matches = false;
  try {
    matches = await bcrypt.compare(current, result.rows[0].password_hash);
  } catch {
    matches = false;
  }

  if (!matches) {
    return { error: 'Current password is incorrect.', status: 403 };
  }

  const passwordHash = await bcrypt.hash(next, SALT_ROUNDS);
  await query(
    `
      UPDATE users
      SET password_hash = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId, passwordHash]
  );

  return { ok: true };
}
