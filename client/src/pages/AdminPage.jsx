import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteAdminBulletin,
  deleteAdminComment,
  getAdminUsers,
  getRecentBulletins,
  getRecentComments,
  getRecentSignups,
  getAdminReports,
  getAdminSummary,
  suspendUser,
  unsuspendUser,
  updateReportStatus,
  getAuditLogs
} from '../api/adminApi.js';

function formatDate(value) {
  if (!value) return 'never';
  return new Date(value).toLocaleString();
}

function previewText(value, max = 180) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function titleize(value) {
  return String(value || '').replace(/_/g, ' ');
}

function StatusBadge({ children, tone = '' }) {
  return <span className={tone ? `status-pill ${tone}` : 'status-pill'}>{children}</span>;
}

function SummaryCard({ label, value, note }) {
  return (
    <article className="admin-summary-card">
      <strong>{value}</strong>
      <span>{label}</span>
      {note && <small>{note}</small>}
    </article>
  );
}

export default function AdminPage({ currentUser }) {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [recentSignups, setRecentSignups] = useState([]);
  const [recentComments, setRecentComments] = useState([]);
  const [recentBulletins, setRecentBulletins] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('open');
  const [adminNote, setAdminNote] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const openReports = useMemo(() => reports.filter((report) => report.status === 'open').length, [reports]);

  async function loadAdminData(search = query) {
    setLoading(true);
    setError('');

    try {
      const [summaryData, usersData, signupsData, commentsData, bulletinsData, reportsData, auditData] = await Promise.all([
        getAdminSummary(),
        getAdminUsers(search),
        getRecentSignups(),
        getRecentComments(),
        getRecentBulletins(),
        getAdminReports(reportStatusFilter),
        getAuditLogs({ action: auditActionFilter, targetType: auditTargetFilter, adminUsername: auditActorFilter })
      ]);

      setSummary(summaryData.summary || null);
      setUsers(usersData.users || []);
      setRecentSignups(signupsData.users || []);
      setRecentComments(commentsData.comments || []);
      setRecentBulletins(bulletinsData.bulletins || []);
      setReports(reportsData.reports || []);
      setAuditLogs(auditData.logs || []);
    } catch (err) {
      setError(err.message || 'Admin panel unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.isAdmin) {
      loadAdminData('');
    }
  }, [currentUser?.isAdmin]);

  async function handleSearch(event) {
    event.preventDefault();
    await loadAdminData(query);
  }

  async function handleSuspend(username) {
    setError('');
    setMessage('');

    if (username === currentUser.username) {
      setError('You cannot suspend your own account.');
      return;
    }

    if (!window.confirm(`Suspend @${username}?`)) return;

    try {
      await suspendUser(username, reason);
      setMessage(`@${username} suspended.`);
      await loadAdminData(query);
    } catch (err) {
      setError(err.message || 'Suspend failed.');
    }
  }

  async function handleUnsuspend(username) {
    setError('');
    setMessage('');

    if (!window.confirm(`Unsuspend @${username}?`)) return;

    try {
      await unsuspendUser(username);
      setMessage(`@${username} unsuspended.`);
      await loadAdminData(query);
    } catch (err) {
      setError(err.message || 'Unsuspend failed.');
    }
  }

  async function handleDeleteComment(id) {
    setError('');
    setMessage('');

    if (!window.confirm(`Delete comment ${id}?`)) return;

    try {
      await deleteAdminComment(id);
      setMessage('Comment deleted.');
      await loadAdminData(query);
    } catch (err) {
      setError(err.message || 'Comment delete failed.');
    }
  }

  async function handleDeleteBulletin(id) {
    setError('');
    setMessage('');

    if (!window.confirm(`Delete bulletin ${id}?`)) return;

    try {
      await deleteAdminBulletin(id);
      setMessage('Bulletin deleted.');
      await loadAdminData(query);
    } catch (err) {
      setError(err.message || 'Bulletin delete failed.');
    }
  }

  async function handleReportStatus(id, status) {
    setError('');
    setMessage('');

    try {
      await updateReportStatus(id, { status, adminNote });
      setMessage(`Report marked ${titleize(status)}.`);
      await loadAdminData(query);
    } catch (err) {
      setError(err.message || 'Report update failed.');
    }
  }

  if (!currentUser) {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Admin</h1>
          <p className="auth-note">Log in before touching the big scary buttons.</p>
        </section>
      </main>
    );
  }

  if (!currentUser.isAdmin) {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Admin</h1>
          <div className="auth-error">Admin access required. This door is extremely locked.</div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell admin-page admin-dashboard">
      <section className="content-panel admin-hero-panel">
        <div>
          <p className="dashboard-kicker">Admin mode</p>
          <h1>ByteSpace Moderation Console</h1>
          <p className="auth-note">Keep the glitter server readable without pressing buttons you cannot unpress.</p>
        </div>
        <button type="button" onClick={() => loadAdminData(query)} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </section>

      {error && <div className="auth-error">{error}</div>}
      {message && <div className="auth-success">{message}</div>}
      {loading && <div className="retro-state">Loading admin controls...</div>}

      <section className="content-panel admin-section-card">
        <header className="admin-section-header">
          <div>
            <h2>Overview</h2>
            <p>Fast pulse check for signups, reports, and recent content.</p>
          </div>
        </header>
        <div className="admin-summary-grid">
          <SummaryCard label="Total Users" value={summary?.totalUsers ?? users.length} />
          <SummaryCard label="Suspended" value={summary?.suspendedUsers ?? users.filter((user) => user.suspendedAt).length} />
          <SummaryCard label="Open Reports" value={summary?.openReports ?? openReports} />
          <SummaryCard label="Recent Signups" value={summary?.recentSignups ?? recentSignups.length} note="last 7 days" />
          <SummaryCard label="Recent Comments" value={summary?.recentComments ?? recentComments.length} note="last 7 days" />
          <SummaryCard label="Recent Bulletins" value={summary?.recentBulletins ?? recentBulletins.length} note="last 7 days" />
        </div>
      </section>

      <section className="content-panel admin-section-card">
        <header className="admin-section-header">
          <div>
            <h2>Reports</h2>
            <p>Review user-submitted safety reports and record the outcome.</p>
          </div>
          <StatusBadge tone={openReports > 0 ? 'danger' : ''}>{openReports} open in view</StatusBadge>
        </header>
        <div className="inline-form admin-filter-row">
          <label>
            Status
            <select value={reportStatusFilter} onChange={(event) => setReportStatusFilter(event.target.value)}>
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="action_taken">Action taken</option>
              <option value="">All</option>
            </select>
          </label>
          <button type="button" onClick={() => loadAdminData(query)}>Refresh Reports</button>
        </div>
        <label>
          Admin note for next report action
          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder="Optional note saved when changing report status"
            maxLength="1000"
          />
        </label>
        <div className="admin-list admin-card-list">
          {reports.map((report) => (
            <article className="admin-item admin-card-item" key={report.id}>
              <div className="admin-card-main">
                <div className="admin-card-title-row">
                  <strong>Report #{report.id}</strong>
                  <StatusBadge tone={report.status === 'open' ? 'danger' : ''}>{titleize(report.status)}</StatusBadge>
                </div>
                <div className="admin-meta-grid">
                  <span>Target: <b>{titleize(report.targetType)}</b> {report.targetUsername ? `@${report.targetUsername}` : report.targetId}</span>
                  <span>Reporter: <b>@{report.reporterUsername}</b></span>
                  <span>Reason: <b>{titleize(report.reason)}</b></span>
                  <span>Created: {formatDate(report.createdAt)}</span>
                </div>
                {report.details && <p>Details: {report.details}</p>}
                {report.targetPreview && <p>Preview: {previewText(report.targetPreview)}</p>}
                {report.adminNote && <p>Admin note: {report.adminNote}</p>}
              </div>
              <div className="admin-actions admin-actions-grid">
                <button type="button" onClick={() => handleReportStatus(report.id, 'reviewed')}>Mark Reviewed</button>
                <button type="button" onClick={() => handleReportStatus(report.id, 'dismissed')}>Dismiss</button>
                <button type="button" onClick={() => handleReportStatus(report.id, 'action_taken')}>Action Taken</button>
                {report.targetType === 'comment' && report.targetId && (
                  <button type="button" onClick={() => handleDeleteComment(report.targetId)}>Delete Comment</button>
                )}
                {report.targetType === 'bulletin' && report.targetId && (
                  <button type="button" onClick={() => handleDeleteBulletin(report.targetId)}>Delete Bulletin</button>
                )}
                {report.targetUsername && report.targetUsername !== currentUser.username && (
                  <button type="button" onClick={() => handleSuspend(report.targetUsername)}>Suspend User</button>
                )}
              </div>
            </article>
          ))}
          {reports.length === 0 && <p className="admin-empty-state">No reports for this filter. The complaint box is quiet.</p>}
        </div>
      </section>

      <section className="content-panel admin-section-card">
        <header className="admin-section-header">
          <div>
            <h2>Users</h2>
            <p>Search accounts, inspect admin/suspension state, and jump to public profiles.</p>
          </div>
        </header>
        <form className="inline-form admin-filter-row" onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search username, email, or display name"
          />
          <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </form>
        <label>
          Suspension reason
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional reason shown only to admins"
          />
        </label>
        <div className="admin-list admin-card-list">
          {users.map((user) => (
            <article className="admin-item admin-card-item" key={user.id}>
              <div className="admin-card-main">
                <div className="admin-card-title-row">
                  <strong>@{user.username}</strong>
                  <div className="admin-badge-row">
                    {user.isAdmin && <StatusBadge>admin</StatusBadge>}
                    {user.suspendedAt && <StatusBadge tone="danger">suspended</StatusBadge>}
                  </div>
                </div>
                <p>{user.displayName} - joined {formatDate(user.createdAt)}</p>
                {user.suspensionReason && <p>Reason: {user.suspensionReason}</p>}
                <Link to={`/profile/${user.username}`}>View public profile</Link>
              </div>
              <div className="admin-actions">
                {user.suspendedAt ? (
                  <button type="button" onClick={() => handleUnsuspend(user.username)}>Unsuspend</button>
                ) : (
                  <button type="button" onClick={() => handleSuspend(user.username)} disabled={user.username === currentUser.username}>Suspend</button>
                )}
              </div>
            </article>
          ))}
          {users.length === 0 && <p className="admin-empty-state">No users found.</p>}
        </div>
      </section>

      <section className="content-panel admin-section-card">
        <header className="admin-section-header">
          <div>
            <h2>Audit Logs</h2>
            <p>Who pushed which moderation button, when, and what it targeted.</p>
          </div>
        </header>
        <div className="inline-form admin-filter-row">
          <label>
            Action
            <select value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)}>
              <option value="">All actions</option>
              <option value="suspend_user">Suspend user</option>
              <option value="unsuspend_user">Unsuspend user</option>
              <option value="delete_comment">Delete comment</option>
              <option value="delete_bulletin">Delete bulletin</option>
              <option value="update_report_status">Update report status</option>
            </select>
          </label>
          <label>
            Target
            <select value={auditTargetFilter} onChange={(event) => setAuditTargetFilter(event.target.value)}>
              <option value="">All targets</option>
              <option value="user">User</option>
              <option value="comment">Comment</option>
              <option value="bulletin">Bulletin</option>
              <option value="report">Report</option>
            </select>
          </label>
          <label>
            Actor
            <input value={auditActorFilter} onChange={(event) => setAuditActorFilter(event.target.value)} placeholder="admin username" />
          </label>
          <button type="button" onClick={() => loadAdminData(query)}>Refresh Audit</button>
        </div>
        <div className="admin-list admin-card-list compact">
          {auditLogs.map((log) => (
            <article className="admin-item admin-card-item" key={log.id}>
              <div className="admin-card-main">
                <div className="admin-card-title-row">
                  <strong>{titleize(log.action)}</strong>
                  <StatusBadge>{titleize(log.targetType)}</StatusBadge>
                </div>
                <p>{log.summary}</p>
                <p>Actor: @{log.adminUsername || 'unknown'} - Target: {log.targetUsername ? `@${log.targetUsername}` : log.targetId || 'none'}</p>
                {log.metadata && <small>Metadata: {previewText(JSON.stringify(log.metadata), 160)}</small>}
              </div>
              <small>{formatDate(log.createdAt)}</small>
            </article>
          ))}
          {auditLogs.length === 0 && <p className="admin-empty-state">No audit logs for this filter.</p>}
        </div>
      </section>

      <section className="admin-two-column">
        <div className="content-panel admin-section-card">
          <h2>Recent Signups</h2>
          <div className="admin-list compact">
            {recentSignups.map((user) => (
              <article className="admin-item" key={user.id}>
                <div>
                  <strong>@{user.username}</strong>
                  <p>{user.displayName}</p>
                </div>
                <span>{formatDate(user.createdAt)}</span>
              </article>
            ))}
            {recentSignups.length === 0 && <p className="admin-empty-state">No recent signups.</p>}
          </div>
        </div>

        <div className="content-panel admin-section-card">
          <h2>Recent Comments</h2>
          <div className="admin-list">
            {recentComments.map((comment) => (
              <article className="admin-item" key={comment.id}>
                <div>
                  <strong>@{comment.authorUsername}</strong> on @{comment.profileUsername}
                  <p>{previewText(comment.body)}</p>
                  <small>{formatDate(comment.createdAt)}</small>
                </div>
                <button type="button" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
              </article>
            ))}
            {recentComments.length === 0 && <p className="admin-empty-state">No recent comments.</p>}
          </div>
        </div>
      </section>

      <section className="content-panel admin-section-card">
        <h2>Recent Bulletins</h2>
        <div className="admin-list">
          {recentBulletins.map((bulletin) => (
            <article className="admin-item" key={bulletin.id}>
              <div>
                <strong>{bulletin.title}</strong> by @{bulletin.authorUsername}
                <p>{previewText(bulletin.body)}</p>
                <small>{formatDate(bulletin.createdAt)}</small>
              </div>
              <button type="button" onClick={() => handleDeleteBulletin(bulletin.id)}>Delete</button>
            </article>
          ))}
          {recentBulletins.length === 0 && <p className="admin-empty-state">No recent bulletins.</p>}
        </div>
      </section>
    </main>
  );
}
