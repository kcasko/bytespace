import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyDashboard } from '../api/dashboardApi.js';
import { detectMusicService, getSongSummary, isHttpUrl } from '../utils/musicUtils.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

function toAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function previewText(text, maxLength = 120) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function Avatar({ url, name }) {
  if (url) {
    return <img src={toAssetUrl(url)} alt={`${name} avatar`} />;
  }

  return <div className="dashboard-avatar-fallback">{String(name || 'BS').slice(0, 2).toUpperCase()}</div>;
}

export default function DashboardPage({ currentUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      if (!currentUser) {
        setStatus('logged-out');
        return;
      }

      setStatus('loading');
      setError('');

      try {
        const data = await getMyDashboard();

        if (!ignore) {
          setDashboard(data);
          setStatus('ready');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setStatus('error');
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Dashboard Locked</h1>
          <p className="auth-note">Log in to see your ByteSpace command center.</p>
          <p className="auth-switch"><Link to="/login">Login</Link> or <Link to="/register">Register</Link></p>
        </section>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className="page-shell dashboard-shell">
        <div className="retro-state">Loading your command center...</div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="page-shell dashboard-shell">
        <div className="retro-state retro-state--error">{error}</div>
      </main>
    );
  }

  const profile = dashboard.profile;
  const displayName = profile.displayName || dashboard.user.username;

  return (
    <main className="page-shell dashboard-shell">
      <section className="dashboard-panel">
        <h1>Your ByteSpace Command Center</h1>

        <div className="dashboard-layout">
          <section className="dashboard-welcome">
            <div className="dashboard-avatar">
              <Avatar url={profile.profileImageUrl} name={displayName} />
            </div>
            <div>
              <p className="dashboard-kicker">Logged in as @{dashboard.user.username}</p>
              <h2>Welcome back, {displayName}</h2>
              {profile.headline && <p className="dashboard-headline">{profile.headline}</p>}
              <p><b>Mood:</b> {profile.mood || 'mysteriously blank'}</p>
              <p><b>Status:</b> {profile.statusMessage || 'No status posted yet.'}</p>
              {(profile.profileSongTitle || profile.profileSongArtist || profile.profileSongUrl) && (
                <p className="dashboard-song-summary">
                  <b>Now Playing:</b> {getSongSummary(profile)} ({detectMusicService(profile.profileSongUrl)})
                  {isHttpUrl(profile.profileSongUrl) && ' - link set'}
                </p>
              )}
              <div className="dashboard-actions">
                <Link to={`/profile/${dashboard.user.username}`}>View My Profile</Link>
                <Link to="/profile/edit">Edit Profile</Link>
              </div>
            </div>
          </section>

          <section className="dashboard-section dashboard-quick-actions">
            <h2>Quick Actions</h2>
            <div>
              <Link to="/profile/edit">Edit Profile</Link>
              <Link to="/browse">Browse Users</Link>
              <Link to="/friends">Manage Friends</Link>
              <Link to="/bulletins">Post Bulletin</Link>
              <Link to="/settings">Settings</Link>
            </div>
          </section>

          <section className="dashboard-section dashboard-stats">
            <h2>Stats/Counts</h2>
            <div className="dashboard-stat-grid">
              <div><strong>{dashboard.counts.friends}</strong><span>Friends</span></div>
              <div><strong>{dashboard.counts.topFriends}</strong><span>Top 8</span></div>
              <div><strong>{dashboard.counts.incomingRequests}</strong><span>Incoming Requests</span></div>
              <div><strong>{dashboard.counts.outgoingRequests}</strong><span>Outgoing Requests</span></div>
              <div><strong>{dashboard.counts.bulletins}</strong><span>Bulletins</span></div>
              <div><strong>{dashboard.counts.comments}</strong><span>Comments</span></div>
              <div><strong>{dashboard.counts.blockedUsers}</strong><span>Blocked Users</span></div>
            </div>
          </section>

          <section className="dashboard-section">
            <h2>Incoming Friend Requests</h2>
            {dashboard.incomingRequests.length === 0 ? (
              <div className="friend-empty-note">No pending requests. The velvet rope is quiet.</div>
            ) : (
              <div className="dashboard-mini-list">
                {dashboard.incomingRequests.map((request) => (
                  <article className="dashboard-mini-card" key={request.id}>
                    <Avatar url={request.profileImageUrl} name={request.displayName} />
                    <div>
                      <Link to={`/profile/${request.username}`}>{request.displayName}</Link>
                      <span>@{request.username} - {formatDate(request.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <Link className="dashboard-section-link" to="/friends">Open Friends</Link>
          </section>

          <section className="dashboard-section">
            <h2>Recent Friend Bulletins</h2>
            {dashboard.recentFriendBulletins.length === 0 ? (
              <div className="friend-empty-note">No friend bulletins yet. The board is gathering dust.</div>
            ) : (
              <div className="dashboard-feed">
                {dashboard.recentFriendBulletins.map((bulletin) => (
                  <article className="dashboard-feed-card" key={bulletin.id}>
                    <header>
                      <strong>{bulletin.title}</strong>
                      <span>{formatDate(bulletin.createdAt)}</span>
                    </header>
                    <p>{previewText(bulletin.body)}</p>
                    <Link to={`/profile/${bulletin.authorUsername}`}>
                      {bulletin.authorDisplayName} @{bulletin.authorUsername}
                    </Link>
                  </article>
                ))}
              </div>
            )}
            <Link className="dashboard-section-link" to="/bulletins">Open Bulletins</Link>
          </section>

          <section className="dashboard-section">
            <h2>Recent Profile Comments</h2>
            {dashboard.recentProfileComments.length === 0 ? (
              <div className="friend-empty-note">No recent comments. Your guestbook is dramatically still.</div>
            ) : (
              <div className="dashboard-feed">
                {dashboard.recentProfileComments.map((comment) => (
                  <article className="dashboard-feed-card" key={comment.id}>
                    <header>
                      <strong>{comment.authorDisplayName}</strong>
                      <span>{formatDate(comment.createdAt)}</span>
                    </header>
                    <p>{previewText(comment.body)}</p>
                    <Link to={`/profile/${dashboard.user.username}`}>View profile comments</Link>
                  </article>
                ))}
              </div>
            )}
            <Link className="dashboard-section-link" to={`/profile/${dashboard.user.username}`}>Open My Profile</Link>
          </section>
        </div>
      </section>
    </main>
  );
}
