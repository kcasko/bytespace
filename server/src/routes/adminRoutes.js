import { Router } from 'express';
import {
  countAdminsExcluding,
  deleteBulletinById,
  deleteCommentById,
  getRecentBulletins,
  getRecentComments,
  getRecentSignups,
  getUserDetail,
  listUsers,
  suspendUserByUsername,
  unsuspendUserByUsername
} from '../db/adminQueries.js';
import { getAdminAuditLogById, getAdminAuditLogs, writeAdminAuditLog } from '../db/auditQueries.js';
import { getReportById, getReports, reportStatuses, updateReportStatus } from '../db/reportQueries.js';
import { requireAdmin } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAdmin);

function parseLimit(value, fallback = 25, max = 100) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}


router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await getAdminAuditLogs({
      limit: parseLimit(req.query?.limit, 50, 100),
      action: typeof req.query?.action === 'string' ? req.query.action.trim() : '',
      targetType: typeof req.query?.targetType === 'string' ? req.query.targetType.trim() : '',
      adminUsername: typeof req.query?.adminUsername === 'string' ? req.query.adminUsername.trim() : ''
    });

    return res.json({ logs });
  } catch (error) {
    console.error('Failed to load audit logs:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Audit logs unavailable.' });
  }
});

router.get('/audit-logs/:id', async (req, res) => {
  const auditLogId = Number(req.params.id);

  if (!Number.isInteger(auditLogId) || auditLogId <= 0) {
    return res.status(400).json({ error: 'Audit log ID is invalid.' });
  }

  try {
    const log = await getAdminAuditLogById(auditLogId);

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found.' });
    }

    return res.json({ log });
  } catch (error) {
    console.error('Failed to load audit log:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Audit log unavailable.' });
  }
});

router.get('/reports', async (req, res) => {
  const status = typeof req.query?.status === 'string' ? req.query.status.trim() : '';

  if (status && !reportStatuses.has(status)) {
    return res.status(400).json({ error: 'Report status is not supported.' });
  }

  try {
    const reports = await getReports({
      status,
      limit: parseLimit(req.query?.limit, 50, 100)
    });
    return res.json({ reports });
  } catch (error) {
    console.error('Failed to load reports:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Reports unavailable.' });
  }
});

router.get('/reports/:id', async (req, res) => {
  const reportId = Number(req.params.id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return res.status(400).json({ error: 'Report ID is invalid.' });
  }

  try {
    const report = await getReportById(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    return res.json({ report });
  } catch (error) {
    console.error('Failed to load report:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Report unavailable.' });
  }
});

router.put('/reports/:id/status', async (req, res) => {
  const reportId = Number(req.params.id);
  const status = String(req.body?.status || '').trim();
  const adminNote = String(req.body?.adminNote || '').trim();

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return res.status(400).json({ error: 'Report ID is invalid.' });
  }

  if (!reportStatuses.has(status)) {
    return res.status(400).json({ error: 'Report status is not supported.' });
  }

  if (adminNote.length > 1000) {
    return res.status(400).json({ error: 'Admin note must be 1000 characters or less.' });
  }

  try {
    const report = await updateReportStatus(reportId, req.session.user.id, { status, adminNote });

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    await writeAdminAuditLog({
      adminUserId: req.session.user.id,
      action: 'update_report_status',
      targetType: 'report',
      targetId: report.id,
      targetUsername: report.targetUsername || null,
      summary: `Admin ${req.session.user.username} marked report ${report.id} as ${status}.`,
      metadata: { status, hasAdminNote: Boolean(adminNote) }
    });

    return res.json({ report });
  } catch (error) {
    console.error('Failed to update report:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Report update failed.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await listUsers({
      search: req.query?.q || '',
      limit: parseLimit(req.query?.limit, 100, 200)
    });
    return res.json({ users });
  } catch (error) {
    console.error('Failed to list admin users:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Users unavailable.' });
  }
});

router.get('/users/:username', async (req, res) => {
  try {
    const user = await getUserDetail(req.params.username);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Failed to load admin user detail:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'User unavailable.' });
  }
});

router.put('/users/:username/suspend', async (req, res) => {
  try {
    const user = await getUserDetail(req.params.username);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.id === req.session.user.id) {
      return res.status(400).json({ error: 'You cannot suspend your own account.' });
    }

    if (user.isAdmin) {
      const otherAdminCount = await countAdminsExcluding(user.id);
      if (otherAdminCount === 0) {
        return res.status(400).json({ error: 'Cannot suspend the only active admin.' });
      }
    }

    const suspensionReason = req.body?.reason || '';
    const suspended = await suspendUserByUsername(user.username, suspensionReason);

    if (!suspended) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await writeAdminAuditLog({
      adminUserId: req.session.user.id,
      action: 'suspend_user',
      targetType: 'user',
      targetId: user.id,
      targetUsername: user.username,
      summary: `Admin ${req.session.user.username} suspended user ${user.username}.`,
      metadata: { hasReason: Boolean(String(suspensionReason || '').trim()) }
    });

    const updatedUser = await getUserDetail(user.username);
    return res.json({ user: updatedUser });
  } catch (error) {
    console.error('Failed to suspend user:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'User suspension failed.' });
  }
});

router.put('/users/:username/unsuspend', async (req, res) => {
  try {
    const user = await getUserDetail(req.params.username);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const unsuspended = await unsuspendUserByUsername(user.username);

    if (!unsuspended) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await writeAdminAuditLog({
      adminUserId: req.session.user.id,
      action: 'unsuspend_user',
      targetType: 'user',
      targetId: user.id,
      targetUsername: user.username,
      summary: `Admin ${req.session.user.username} unsuspended user ${user.username}.`
    });

    const updatedUser = await getUserDetail(user.username);
    return res.json({ user: updatedUser });
  } catch (error) {
    console.error('Failed to unsuspend user:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'User unsuspend failed.' });
  }
});

router.get('/recent/signups', async (req, res) => {
  try {
    const users = await getRecentSignups(parseLimit(req.query?.limit, 10, 50));
    return res.json({ users });
  } catch (error) {
    console.error('Failed to load recent signups:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Recent signups unavailable.' });
  }
});

router.get('/recent/comments', async (req, res) => {
  try {
    const comments = await getRecentComments(parseLimit(req.query?.limit, 25, 100));
    return res.json({ comments });
  } catch (error) {
    console.error('Failed to load recent comments:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Recent comments unavailable.' });
  }
});

router.get('/recent/bulletins', async (req, res) => {
  try {
    const bulletins = await getRecentBulletins(parseLimit(req.query?.limit, 25, 100));
    return res.json({ bulletins });
  } catch (error) {
    console.error('Failed to load recent bulletins:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Recent bulletins unavailable.' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  const commentId = Number(req.params.id);

  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ error: 'Comment ID is invalid.' });
  }

  try {
    const deleted = await deleteCommentById(commentId);

    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    await writeAdminAuditLog({
      adminUserId: req.session.user.id,
      action: 'delete_comment',
      targetType: 'comment',
      targetId: commentId,
      summary: `Admin ${req.session.user.username} deleted comment ${commentId}.`
    });

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to delete comment:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Comment delete failed.' });
  }
});

router.delete('/bulletins/:id', async (req, res) => {
  const bulletinId = Number(req.params.id);

  if (!Number.isInteger(bulletinId) || bulletinId <= 0) {
    return res.status(400).json({ error: 'Bulletin ID is invalid.' });
  }

  try {
    const deleted = await deleteBulletinById(bulletinId);

    if (!deleted) {
      return res.status(404).json({ error: 'Bulletin not found.' });
    }

    await writeAdminAuditLog({
      adminUserId: req.session.user.id,
      action: 'delete_bulletin',
      targetType: 'bulletin',
      targetId: bulletinId,
      summary: `Admin ${req.session.user.username} deleted bulletin ${bulletinId}.`
    });

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to delete bulletin:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Bulletin delete failed.' });
  }
});

export default router;
