import { query } from './pool.js';

export async function ensureOperationalSchema() {
  try {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS suspension_reason TEXT
    `);
  } catch (error) {
    if (error.code !== '42501') {
      throw error;
    }

    console.warn('Skipping users admin-column migration because the app database user is not the table owner.');
  }


  await query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(80) NOT NULL,
      target_type VARCHAR(40) NOT NULL,
      target_id INTEGER,
      target_username VARCHAR(40),
      summary TEXT NOT NULL,
      metadata_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs(created_at DESC)');
  await query('CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_user_id_idx ON admin_audit_logs(admin_user_id)');
  await query('CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs(action)');
  await query('CREATE INDEX IF NOT EXISTS admin_audit_logs_target_type_idx ON admin_audit_logs(target_type)');

  await query(`
    CREATE TABLE IF NOT EXISTS content_reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type VARCHAR(20) NOT NULL,
      target_id INTEGER,
      target_username VARCHAR(40),
      reason VARCHAR(50) NOT NULL,
      details TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      admin_note TEXT,
      resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT content_reports_target_type_check CHECK (target_type IN ('profile', 'comment', 'bulletin')),
      CONSTRAINT content_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
      CONSTRAINT content_reports_target_required_check CHECK (
        (target_type = 'profile' AND target_username IS NOT NULL)
        OR (target_type IN ('comment', 'bulletin') AND target_id IS NOT NULL)
      )
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS content_reports_reporter_id_idx ON content_reports(reporter_id)');
  await query('CREATE INDEX IF NOT EXISTS content_reports_status_idx ON content_reports(status)');
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS content_reports_open_unique_idx
      ON content_reports (reporter_id, target_type, COALESCE(target_id, -1), COALESCE(LOWER(target_username), ''))
      WHERE status = 'open'
  `);
}
