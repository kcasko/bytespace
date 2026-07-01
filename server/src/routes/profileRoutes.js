import { Router } from 'express';
import { mockProfiles } from '../data/mockProfiles.js';
import { getProfileByUsername } from '../db/profileQueries.js';

const router = Router();

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
