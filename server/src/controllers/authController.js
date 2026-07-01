import bcrypt from 'bcrypt';
import { pool, query } from '../db/pool.js';

const USERNAME_PATTERN = /^[a-z0-9_-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 12;

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email
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
    const userResult = await query(
      `
        SELECT id, username, email, password_hash
        FROM users
        WHERE LOWER(username) = $1 OR LOWER(email) = $1
        LIMIT 1
      `,
      [emailOrUsername]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid login.' });
    }

    const user = userResult.rows[0];
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
