import { useEffect, useState } from 'react';
import {
  deleteAdminBulletin,
  deleteAdminComment,
  getAdminUsers,
  getRecentBulletins,
  getRecentComments,
  getRecentSignups,
  getAdminReports,
  suspendUser,
  unsuspendUser,
  updateReportStatus,
  getAuditLogs
} from '../api/adminApi.js';

function formatDate(value) {
  if (!value) return 'never';
  return new Date(value).toLocaleString();
}

export default function AdminPage({ currentUser }) {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadAdminData(search = query) {
    setLoading(true);
    setError('');

    try {
      const [usersData, signupsData, commentsData, bulletinsData, reportsData, auditData] = await Promise.all([
        getAdminUsers(search),
        getRecentSignups(),
        getRecentComments(),
        getRecentBulletins(),
        getAdminReports(reportStatusFilter),
        getAuditLogs({ action: auditActionFilter, targetType: auditTargetFilter })
      ]);

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
      setMessage(`Report marked ${status}.`);
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
    <main className="page-shell admin-page">
      <section className="content-panel">
        <h1>ByteSpace Admin</h1>
        <p className="auth-note">Moderation controls for keeping the glitter server upright.</p>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
      </section>





      <section className="content-panel">
        <h2>Audit Log</h2>
        <div className="inline-form">
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
          <button type="button" onClick={() => loadAdminData(query)}>Refresh Audit</button>
        </div>
        <div className="admin-list">
          {auditLogs.map((log) => (
            <article className="admin-item" key={log.id}>
              <div>
                <strong>{log.action}</strong> by @{log.adminUsername || 'unknown'}
                <p>{log.summary}</p>
                <p>Target: {log.targetType} {log.targetUsername ? `@${log.targetUsername}` : log.targetId || ''}</p>
                {log.metadata && <small>Metadata: {JSON.stringify(log.metadata)}</small>}
              </div>
              <small>{formatDate(log.createdAt)}</small>
            </article>
          ))}
          {auditLogs.length === 0 && <p>No audit logs for this filter.</p>}
        </div>
      </section>

      <section className="content-panel">
        <h2>Reports</h2>
        <div className="inline-form">
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
          Admin note
          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder="Optional note saved when changing report status"
            maxLength="1000"
          />
        </label>
        <div className="admin-list">
          {reports.map((report) => (
            <article className="admin-item" key={report.id}>
              <div>
                <strong>#{report.id} {report.targetType}</strong> <span className="status-pill">{report.status}</span>
                <p>Reporter: @{report.reporterUsername}</p>
                <p>Target: {report.targetUsername ? `@${report.targetUsername}` : report.targetId}</p>
                <p>Reason: {report.reason}</p>
                {report.details && <p>Details: {report.details}</p>}
                {report.targetPreview && <p>Preview: {report.targetPreview}</p>}
                {report.adminNote && <p>Admin note: {report.adminNote}</p>}
                <small>{formatDate(report.createdAt)}</small>
              </div>
              <div className="admin-actions">
                <button type="button" onClick={() => handleReportStatus(report.id, 'reviewed')}>Reviewed</button>
                <button type="button" onClick={() => handleReportStatus(report.id, 'dismissed')}>Dismiss</button>
                <button type="button" onClick={() => handleReportStatus(report.id, 'action_taken')}>Action Taken</button>
                {report.targetType === 'comment' && report.targetId && (
                  <button type="button" onClick={() => handleDeleteComment(report.targetId)}>Delete Comment</button>
                )}
                {report.targetType === 'bulletin' && report.targetId && (
                  <button type="button" onClick={() => handleDeleteBulletin(report.targetId)}>Delete Bulletin</button>
                )}
                {report.targetUsername && (
                  <button type="button" onClick={() => handleSuspend(report.targetUsername)}>Suspend User</button>
                )}
              </div>
            </article>
          ))}
          {reports.length === 0 && <p>No reports for this filter.</p>}
        </div>
      </section>

      <section className="content-panel">
        <h2>Users</h2>
        <form className="inline-form" onSubmit={handleSearch}>
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
        <div className="admin-list">
          {users.map((user) => (
            <article className="admin-item" key={user.id}>
              <div>
                <strong>@{user.username}</strong> {user.isAdmin && <span className="status-pill">admin</span>} {user.suspendedAt && <span className="status-pill danger">suspended</span>}
                <p>{user.displayName} · joined {formatDate(user.createdAt)}</p>
                {user.suspensionReason && <p>Reason: {user.suspensionReason}</p>}
              </div>
              {user.suspendedAt ? (
                <button type="button" onClick={() => handleUnsuspend(user.username)}>Unsuspend</button>
              ) : (
                <button type="button" onClick={() => handleSuspend(user.username)}>Suspend</button>
              )}
            </article>
          ))}
          {users.length === 0 && <p>No users found.</p>}
        </div>
      </section>

      <section className="content-panel">
        <h2>Recent Signups</h2>
        <div className="admin-list compact">
          {recentSignups.map((user) => (
            <article className="admin-item" key={user.id}>
              <strong>@{user.username}</strong>
              <span>{formatDate(user.createdAt)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="content-panel">
        <h2>Recent Comments</h2>
        <div className="admin-list">
          {recentComments.map((comment) => (
            <article className="admin-item" key={comment.id}>
              <div>
                <strong>@{comment.authorUsername}</strong> on @{comment.profileUsername}
                <p>{comment.body}</p>
                <small>{formatDate(comment.createdAt)}</small>
              </div>
              <button type="button" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
            </article>
          ))}
          {recentComments.length === 0 && <p>No recent comments.</p>}
        </div>
      </section>

      <section className="content-panel">
        <h2>Recent Bulletins</h2>
        <div className="admin-list">
          {recentBulletins.map((bulletin) => (
            <article className="admin-item" key={bulletin.id}>
              <div>
                <strong>{bulletin.title}</strong> by @{bulletin.authorUsername}
                <p>{bulletin.body}</p>
                <small>{formatDate(bulletin.createdAt)}</small>
              </div>
              <button type="button" onClick={() => handleDeleteBulletin(bulletin.id)}>Delete</button>
            </article>
          ))}
          {recentBulletins.length === 0 && <p>No recent bulletins.</p>}
        </div>
      </section>
    </main>
  );
}
