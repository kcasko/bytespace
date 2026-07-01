import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db/pool.js';

const PgSession = connectPgSimple(session);
const environment = process.env.NODE_ENV || 'development';
const cookieSameSite = process.env.SESSION_COOKIE_SAMESITE || 'lax';

export const sessionMiddleware = session({
  name: 'bytespace.sid',
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  // SESSION_SECRET must be strong and unique in production. Sessions are stored
  // in PostgreSQL through connect-pg-simple; do not replace this with MemoryStore
  // for production.
  secret: process.env.SESSION_SECRET || 'development-only-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // For same-site frontend/backend deployments, lax is usually right.
    // If the frontend and API are on different domains, production may require
    // SESSION_COOKIE_SAMESITE=none plus HTTPS secure cookies.
    sameSite: cookieSameSite,
    secure: environment === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});
