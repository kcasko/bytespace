import { Router } from 'express';
import { mockProfiles } from '../data/mockProfiles.js';
import {
  allowedProfileFonts,
  getOwnProfileByUserId,
  getProfileByUsername,
  updateOwnProfile
} from '../db/profileQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const textFieldLimits = {
  displayName: 50,
  headline: 160,
  mood: 80,
  aboutMe: 2000,
  whoIdLikeToMeet: 2000,
  generalInterests: 1000,
  music: 1000,
  movies: 1000,
  games: 1000
};

const colorFields = [
  'themeBackgroundColor',
  'themeTextColor',
  'themeBoxColor',
  'themeBorderColor',
  'themeHeaderColor'
];

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
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

router.get('/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
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

export default router;
