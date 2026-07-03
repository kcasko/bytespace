import bcrypt from 'bcrypt';
import { pool, query } from '../db/pool.js';

const USERNAME_PATTERN = /^[a-z0-9_-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 12;
const REGISTRATION_MODES = new Set(['open', 'disabled', 'invite']);

function normalizeRegistrationMode(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveRegistrationMode(env = process.env) {
  const allowRegistration = String(env.ALLOW_REGISTRATION || '').trim().toLowerCase();
  const configuredMode = normalizeRegistrationMode(env.REGISTRATION_MODE);

  if (allowRegistration === 'false') {
    return 'disabled';
  }

  if (REGISTRATION_MODES.has(configuredMode)) {
    return configuredMode;
  }

  if (allowRegistration === 'true') {
    return 'open';
  }

  return env.NODE_ENV === 'production' ? 'disabled' : 'open';
}

export function getRegistrationGate(body = {}, env = process.env) {
  const mode = resolveRegistrationMode(env);

  if (mode === 'disabled') {
    return { allowed: false, status: 403, error: 'Registration is currently closed.' };
  }

  if (mode === 'invite') {
    const configuredInviteCode = String(env.INVITE_CODE || '');
    const submittedInviteCode = String(body.inviteCode || '').trim();

    if (!configuredInviteCode) {
      return { allowed: false, status: 403, error: 'Registration is invite-only, but invites are not configured.' };
    }

    if (!submittedInviteCode || submittedInviteCode !== configuredInviteCode) {
      return { allowed: false, status: 403, error: 'A valid invite code is required to register.' };
    }
  }

  return { allowed: true, mode };
}

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: Boolean(user.is_admin ?? user.isAdmin),
    suspendedAt: user.suspended_at || user.suspendedAt || null,
    onboardingCompletedAt: user.onboarding_completed_at || user.onboardingCompletedAt || null,
    lastSeenOnboardingStep: user.last_seen_onboarding_step || user.lastSeenOnboardingStep || null
  };
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateRegistration({ username, email, password }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedUsername) {
    return { error: 'Username is required.' };
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    return { error: 'Username must be between 3 and 30 characters.' };
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return { error: 'Username can only use letters, numbers, underscores, and hyphens.' };
  }

  if (!normalizedEmail) {
    return { error: 'Email is required.' };
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { error: 'Email must be valid.' };
  }

  if (!password) {
    return { error: 'Password is required.' };
  }

  if (String(password).length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  return {
    values: {
      username: normalizedUsername,
      email: normalizedEmail,
      password: String(password)
    }
  };
}

function setSessionUser(req, user) {
  req.session.user = safeUser(user);
}

export async function register(req, res) {
  const registrationGate = getRegistrationGate(req.body || {});

  if (!registrationGate.allowed) {
    return res.status(registrationGate.status).json({ error: registrationGate.error });
  }

  const validation = validateRegistration(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { username, email, password } = validation.values;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      [username, email]
    );

    if (existingResult.rowCount > 0) {
      await client.query('ROLLBACK');
      const existing = existingResult.rows[0];
      const field = existing.username === username ? 'Username' : 'Email';
      return res.status(409).json({ error: `${field} is already taken.` });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userResult = await client.query(
      `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email
      `,
      [username, email, passwordHash]
    );

    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO profiles (user_id, display_name, headline, mood)
        VALUES ($1, $2, $3, $4)
      `,
      [user.id, username, 'New here. Still decorating.', 'figuring it out']
    );

    await client.query('COMMIT');
    setSessionUser(req, user);

    return res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration failed:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Registration failed.' });
  } finally {
    client?.release();
  }
}

export async function login(req, res) {
  const emailOrUsername = String(req.body?.emailOrUsername || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Email or username and password are required.' });
  }

  try {
    let userResult;

    try {
      userResult = await query(
        `
          SELECT id, username, email, password_hash, is_admin, suspended_at, onboarding_completed_at, last_seen_onboarding_step
          FROM users
          WHERE LOWER(username) = $1 OR LOWER(email) = $1
          LIMIT 1
        `,
        [emailOrUsername]
      );
    } catch (error) {
      if (error.code !== '42703') {
        throw error;
      }

      userResult = await query(
        `
          SELECT id, username, email, password_hash, is_admin, suspended_at
          FROM users
          WHERE LOWER(username) = $1 OR LOWER(email) = $1
          LIMIT 1
        `,
        [emailOrUsername]
      );
    }

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid login.' });
    }

    const user = userResult.rows[0];

    if (user.suspended_at) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    let passwordMatches = false;

    try {
      passwordMatches = await bcrypt.compare(password, user.password_hash);
    } catch {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid login.' });
    }

    setSessionUser(req, user);

    return res.json({ user: safeUser(user) });
  } catch (error) {
    console.error('Login failed:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Login failed.' });
  }
}

export function me(req, res) {
  return res.json({
    user: req.session?.user || null
  });
}

export function logout(req, res) {
  if (!req.session) {
    res.clearCookie('bytespace.sid');
    return res.json({ status: 'ok' });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error('Logout failed:', { message: error.message });
      return res.status(500).json({ error: 'Logout failed.' });
    }

    res.clearCookie('bytespace.sid');
    return res.json({ status: 'ok' });
  });
}
