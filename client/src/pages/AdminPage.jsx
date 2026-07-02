import { useEffect, useState } from 'react';
import {
  deleteAdminBulletin,
  deleteAdminComment,
  getAdminUsers,
  getRecentBulletins,
  getRecentComments,
  getRecentSignups,
  suspendUser,
  unsuspendUser
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
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadAdminData(search = query) {
    setLoading(true);
    setError('');

    try {
      const [usersData, signupsData, commentsData, bulletinsData] = await Promise.all([
        getAdminUsers(search),
        getRecentSignups(),
        getRecentComments(),
        getRecentBulletins()
      ]);

      setUsers(usersData.users || []);
      setRecentSignups(signupsData.users || []);
      setRecentComments(commentsData.comments || []);
      setRecentBulletins(bulletinsData.bulletins || []);
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
