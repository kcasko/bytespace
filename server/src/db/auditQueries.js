import { query } from './pool.js';

function sanitizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const blockedKeys = new Set([
    'password',
    'passwordHash',
    'password_hash',
    'sessionSecret',
    'SESSION_SECRET',
    'inviteCode',
    'INVITE_CODE',
    'databaseUrl',
    'DATABASE_URL',
    'authorization',
    'cookie'
  ]);

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !blockedKeys.has(key))
  );
}

function mapAuditLog(row) {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    adminUsername: row.admin_username || '',
    adminDisplayName: row.admin_display_name || row.admin_username || '',
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetUsername: row.target_username || '',
    summary: row.summary,
    metadata: row.metadata_json || null,
    createdAt: row.created_at
  };
}

export async function writeAdminAuditLog({
  adminUserId,
  action,
  targetType,
  targetId = null,
  targetUsername = null,
  summary,
  metadata = null
}) {
  try {
    await query(
      `
        INSERT INTO admin_audit_logs (
          admin_user_id,
          action,
          target_type,
          target_id,
          target_username,
          summary,
          metadata_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        adminUserId,
        action,
        targetType,
        targetId,
        targetUsername,
        summary,
        sanitizeMetadata(metadata)
      ]
    );
  } catch (error) {
    console.error('Admin audit log write failed:', { code: error.code, message: error.message });
  }
}

export async function getAdminAuditLogs({ limit = 50, action = '', targetType = '', adminUsername = '' } = {}) {
  const result = await query(
    `
      SELECT
        admin_audit_logs.*,
        users.username AS admin_username,
        profiles.display_name AS admin_display_name
      FROM admin_audit_logs
      LEFT JOIN users ON users.id = admin_audit_logs.admin_user_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE ($1 = '' OR admin_audit_logs.action = $1)
        AND ($2 = '' OR admin_audit_logs.target_type = $2)
        AND ($3 = '' OR LOWER(users.username) = LOWER($3))
      ORDER BY admin_audit_logs.created_at DESC
      LIMIT $4
    `,
    [action, targetType, adminUsername, limit]
  );

  return result.rows.map(mapAuditLog);
}

export async function getAdminAuditLogById(id) {
  const result = await query(
    `
      SELECT
        admin_audit_logs.*,
        users.username AS admin_username,
        profiles.display_name AS admin_display_name
      FROM admin_audit_logs
      LEFT JOIN users ON users.id = admin_audit_logs.admin_user_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE admin_audit_logs.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rowCount > 0 ? mapAuditLog(result.rows[0]) : null;
}
