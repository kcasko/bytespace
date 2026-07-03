import { query } from './pool.js';

export const reportReasons = new Set([
  'harassment',
  'spam',
  'inappropriate_content',
  'impersonation',
  'other'
]);

export const reportStatuses = new Set([
  'open',
  'reviewed',
  'dismissed',
  'action_taken'
]);

function mapReport(row) {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterUsername: row.reporter_username,
    reporterDisplayName: row.reporter_display_name || row.reporter_username,
    targetType: row.target_type,
    targetId: row.target_id,
    targetUsername: row.target_username || row.profile_username || row.bulletin_author_username || row.comment_author_username || '',
    targetDisplayName: row.target_display_name || row.profile_display_name || row.bulletin_author_display_name || row.comment_author_display_name || '',
    targetPreview: row.target_preview || '',
    reason: row.reason,
    details: row.details || '',
    status: row.status,
    adminNote: row.admin_note || '',
    resolvedBy: row.resolved_by,
    resolvedByUsername: row.resolved_by_username || '',
    resolvedAt: row.resolved_at,
    createdAt: row.created_at
  };
}

const reportSelect = `
  SELECT
    content_reports.*,
    reporter_users.username AS reporter_username,
    reporter_profiles.display_name AS reporter_display_name,
    resolved_users.username AS resolved_by_username,
    profile_users.username AS profile_username,
    profile_profiles.display_name AS profile_display_name,
    comment_authors.username AS comment_author_username,
    comment_author_profiles.display_name AS comment_author_display_name,
    LEFT(profile_comments.body, 240) AS comment_preview,
    bulletin_authors.username AS bulletin_author_username,
    bulletin_author_profiles.display_name AS bulletin_author_display_name,
    LEFT(CONCAT(bulletins.title, ': ', COALESCE(bulletins.body, '')), 240) AS bulletin_preview,
    dm_senders.username AS dm_sender_username,
    dm_sender_profiles.display_name AS dm_sender_display_name,
    LEFT(dm_messages.body, 240) AS dm_preview,
    CASE
      WHEN content_reports.target_type = 'comment' THEN LEFT(profile_comments.body, 240)
      WHEN content_reports.target_type = 'bulletin' THEN LEFT(CONCAT(bulletins.title, ': ', COALESCE(bulletins.body, '')), 240)
      WHEN content_reports.target_type = 'dm_message' THEN LEFT(dm_messages.body, 240)
      ELSE content_reports.target_username
    END AS target_preview
  FROM content_reports
  INNER JOIN users reporter_users ON reporter_users.id = content_reports.reporter_id
  LEFT JOIN profiles reporter_profiles ON reporter_profiles.user_id = reporter_users.id
  LEFT JOIN users resolved_users ON resolved_users.id = content_reports.resolved_by
  LEFT JOIN users profile_users ON content_reports.target_type = 'profile'
    AND LOWER(profile_users.username) = LOWER(content_reports.target_username)
  LEFT JOIN profiles profile_profiles ON profile_profiles.user_id = profile_users.id
  LEFT JOIN profile_comments ON content_reports.target_type = 'comment'
    AND profile_comments.id = content_reports.target_id
  LEFT JOIN users comment_authors ON comment_authors.id = profile_comments.author_user_id
  LEFT JOIN profiles comment_author_profiles ON comment_author_profiles.user_id = comment_authors.id
  LEFT JOIN bulletins ON content_reports.target_type = 'bulletin'
    AND bulletins.id = content_reports.target_id
  LEFT JOIN users bulletin_authors ON bulletin_authors.id = bulletins.user_id
  LEFT JOIN profiles bulletin_author_profiles ON bulletin_author_profiles.user_id = bulletin_authors.id
  LEFT JOIN dm_messages ON content_reports.target_type = 'dm_message'
    AND dm_messages.id = content_reports.target_id
  LEFT JOIN users dm_senders ON dm_senders.id = dm_messages.sender_id
  LEFT JOIN profiles dm_sender_profiles ON dm_sender_profiles.user_id = dm_senders.id
`;

export async function createReport(reporterId, input) {
  const result = await query(
    `
      INSERT INTO content_reports (
        reporter_id,
        target_type,
        target_id,
        target_username,
        reason,
        details
      )
      VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
      ON CONFLICT (reporter_id, target_type, (COALESCE(target_id, -1)), (COALESCE(LOWER(target_username), '')))
        WHERE status = 'open'
        DO NOTHING
      RETURNING id
    `,
    [
      reporterId,
      input.targetType,
      input.targetId || null,
      input.targetUsername || null,
      input.reason,
      input.details || ''
    ]
  );

  if (result.rowCount === 0) {
    return { duplicate: true };
  }

  return { reportId: result.rows[0].id };
}

export async function getReports({ status = '', limit = 50 } = {}) {
  const result = await query(
    `
      ${reportSelect}
      WHERE $1 = '' OR content_reports.status = $1
      ORDER BY content_reports.created_at DESC
      LIMIT $2
    `,
    [status, limit]
  );

  return result.rows.map(mapReport);
}

export async function getReportById(reportId) {
  const result = await query(
    `
      ${reportSelect}
      WHERE content_reports.id = $1
      LIMIT 1
    `,
    [reportId]
  );

  return result.rowCount > 0 ? mapReport(result.rows[0]) : null;
}

export async function updateReportStatus(reportId, adminUserId, { status, adminNote = '' }) {
  const result = await query(
    `
      UPDATE content_reports
      SET status = $2::varchar,
          admin_note = NULLIF($3, ''),
          resolved_by = $4,
          resolved_at = CASE WHEN $2::varchar = 'open' THEN NULL ELSE NOW() END
      WHERE id = $1
      RETURNING id
    `,
    [reportId, status, String(adminNote || '').trim(), adminUserId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getReportById(reportId);
}
