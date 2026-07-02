import { Router } from 'express';
import { mockProfiles } from '../data/mockProfiles.js';
import {
  allowedProfileFonts,
  getOwnProfileByUserId,
  getProfileByUsername,
  updateOwnProfile,
  updateProfileImageUrl,
  updateBackgroundImageUrl
} from '../db/profileQueries.js';
import { isBlockedBetween } from '../db/blockQueries.js';
import { canViewProfile, getPrivacyForUsername } from '../db/settingsQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';
import {
  avatarUploader,
  backgroundUploader,
  handleUploadError
} from '../middleware/uploadMiddleware.js';

const router = Router();

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const textFieldLimits = {
  displayName: 50,
  headline: 160,
  mood: 80,
  statusMessage: 120,
  aboutMe: 2000,
  whoIdLikeToMeet: 2000,
  generalInterests: 1000,
  music: 1000,
  movies: 1000,
  games: 1000,
  profileSongTitle: 120,
  profileSongArtist: 120,
  profileSongUrl: 500
};

const colorFields = [
  'themeBackgroundColor',
  'themeTextColor',
  'themeBoxColor',
  'themeBorderColor',
  'themeHeaderColor'
];

const optionFields = {
  themeBackgroundRepeat: ['repeat', 'no-repeat', 'repeat-x', 'repeat-y'],
  themeBackgroundSize: ['auto', 'cover', 'contain'],
  themeBackgroundPosition: ['center', 'top', 'bottom', 'left', 'right']
};

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}


function validateProfileSongUrl(value) {
  if (!value) {
    return null;
  }

  if (value.length > textFieldLimits.profileSongUrl) {
    return 'profileSongUrl must be 500 characters or less.';
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    return 'profileSongUrl must be a valid http:// or https:// URL.';
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return 'profileSongUrl must use http:// or https://.';
  }

  if (!parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
    return 'profileSongUrl must be a normal http:// or https:// link.';
  }

  return null;
}

function validateProfileInput(body) {
  const input = {};

  for (const [field, limit] of Object.entries(textFieldLimits)) {
    const value = trimString(body[field]);

    if (value.length > limit) {
      return { error: `${field} must be ${limit} characters or less.` };
    }

    input[field] = value;
  }

  const profileSongUrlError = validateProfileSongUrl(input.profileSongUrl);

  if (profileSongUrlError) {
    return { error: profileSongUrlError };
  }

  for (const field of colorFields) {
    const value = trimString(body[field]);

    if (!HEX_COLOR_PATTERN.test(value)) {
      return { error: `${field} must be a valid hex color like #336699.` };
    }

    input[field] = value;
  }

  const themeFontFamily = trimString(body.themeFontFamily);

  if (!allowedProfileFonts.includes(themeFontFamily)) {
    return { error: 'themeFontFamily is not supported.' };
  }

  input.themeFontFamily = themeFontFamily;

  for (const [field, allowedValues] of Object.entries(optionFields)) {
    const value = trimString(body[field]);

    if (!allowedValues.includes(value)) {
      return { error: `${field} is not supported.` };
    }

    input[field] = value;
  }

  return { input };
}

const databaseUnavailableCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  '28P01',
  '3D000'
]);

function isDatabaseUnavailable(error) {
  return databaseUnavailableCodes.has(error.code) || error.message?.includes('Connection terminated');
}

router.get('/me', sessionMiddleware, requireAuth, async (req, res) => {
  try {
    const profile = await getOwnProfileByUserId(req.session.user.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json({ profile });
  } catch (error) {
    console.error('Failed to load own profile:', {
      code: error.code,
      message: error.message
    });

    return res.status(500).json({ error: 'Profile unavailable' });
  }
});

router.put('/me', sessionMiddleware, requireAuth, async (req, res) => {
  const validation = validateProfileInput(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const profile = await updateOwnProfile(req.session.user.id, validation.input);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json({ profile });
  } catch (error) {
    console.error('Failed to update own profile:', {
      code: error.code,
      message: error.message
    });

    return res.status(500).json({ error: 'Profile update failed' });
  }
});

router.get('/:username', sessionMiddleware, async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const privacy = await getPrivacyForUsername(username);

    if (!privacy) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const viewerUserId = req.session?.user?.id || null;

    if (viewerUserId && viewerUserId !== privacy.userId) {
      const blockStatus = await isBlockedBetween(viewerUserId, privacy.userId);

      if (blockStatus.bBlockedA) {
        return res.status(403).json({ error: 'This profile is unavailable' });
      }

      if (blockStatus.aBlockedB) {
        return res.status(403).json({ error: 'You blocked this user' });
      }
    }

    const allowed = await canViewProfile(privacy, viewerUserId);

    if (!allowed) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    const profile = await getProfileByUsername(username);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json({ profile });
  } catch (error) {
    console.error('Failed to load profile from database:', {
      code: error.code,
      message: error.message
    });

    if (isDatabaseUnavailable(error) && mockProfiles[username]) {
      console.warn(`Using mock profile fallback for "${username}" because the database is unavailable.`);
      return res.json({ profile: mockProfiles[username] });
    }

    return res.status(500).json({ error: 'Profile unavailable' });
  }
});

// ── Image upload routes ──────────────────────────────────────────────────────

/**
 * POST /api/profile/me/avatar
 * Form field: avatar
 * Requires authentication.
 * Saves the uploaded file and updates profile_image_url in PostgreSQL.
 * Returns the public URL path only (never a local filesystem path).
 */
router.post(
  '/me/avatar',
  sessionMiddleware,
  requireAuth,
  avatarUploader.single('avatar'),
  handleUploadError,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Build the public URL served by the static middleware in server.js
    const publicUrl = `/uploads/avatars/${req.file.filename}`;

    try {
      const savedUrl = await updateProfileImageUrl(req.session.user.id, publicUrl);

      if (savedUrl === null) {
        return res.status(404).json({ error: 'Profile not found.' });
      }

      return res.json({ profileImageUrl: savedUrl });
    } catch (error) {
      console.error('Failed to save avatar URL:', { code: error.code, message: error.message });
      return res.status(500).json({ error: 'Avatar upload failed.' });
    }
  }
);

/**
 * POST /api/profile/me/background
 * Form field: background
 * Requires authentication.
 * Saves the uploaded file and updates background_image_url in PostgreSQL.
 * Returns the public URL path only (never a local filesystem path).
 */
router.post(
  '/me/background',
  sessionMiddleware,
  requireAuth,
  backgroundUploader.single('background'),
  handleUploadError,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const publicUrl = `/uploads/backgrounds/${req.file.filename}`;

    try {
      const savedUrl = await updateBackgroundImageUrl(req.session.user.id, publicUrl);

      if (savedUrl === null) {
        return res.status(404).json({ error: 'Profile not found.' });
      }

      return res.json({ backgroundImageUrl: savedUrl });
    } catch (error) {
      console.error('Failed to save background URL:', { code: error.code, message: error.message });
      return res.status(500).json({ error: 'Background upload failed.' });
    }
  }
);

// Multer error handler must come after the upload routes so it catches
// errors thrown by the multer middleware above.
router.use(handleUploadError);

export default router;
