import { getUserAdminStatus } from '../db/adminQueries.js';

export async function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await getUserAdminStatus(req.session.user.id);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.session.user = {
      ...req.session.user,
      username: user.username,
      isAdmin: user.isAdmin,
      suspendedAt: user.suspendedAt
    };

    if (user.suspendedAt) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    return next();
  } catch (error) {
    console.error('Authentication check failed:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Authentication unavailable' });
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await getUserAdminStatus(req.session.user.id);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.session.user = {
      ...req.session.user,
      username: user.username,
      isAdmin: user.isAdmin,
      suspendedAt: user.suspendedAt
    };

    if (user.suspendedAt) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
  } catch (error) {
    console.error('Admin authorization check failed:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Admin authorization unavailable' });
  }
}
