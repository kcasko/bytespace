import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sendFriendRequest } from '../api/friendApi.js';
import { searchUsers } from '../api/userApi.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function toAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function statusText(friendStatus, currentUser) {
  if (!currentUser) return 'Log in to add friends.';

  switch (friendStatus) {
    case 'self':
      return 'Your profile';
    case 'friend':
      return 'Friends';
    case 'outgoing_pending':
      return 'Request sent';
    case 'incoming_pending':
      return 'Request received';
    default:
      return '';
  }
}

function UserCard({ user, currentUser, onAddFriend }) {
  const canAddFriend = currentUser && (!user.friendStatus || user.friendStatus === 'none');
  const status = statusText(user.friendStatus, currentUser);

  return (
    <article className="browse-card">
      <div className="browse-card__header">
        {user.profileImageUrl ? (
          <img src={toAssetUrl(user.profileImageUrl)} alt={`${user.displayName} avatar`} />
        ) : (
          <div className="browse-card__avatar">{user.displayName.slice(0, 2).toUpperCase()}</div>
        )}
        <div>
          <h2>{user.displayName}</h2>
          <span>@{user.username}</span>
        </div>
      </div>

      {user.headline && <p className="browse-card__headline">{user.headline}</p>}
      {user.mood && <p><b>Mood:</b> {user.mood}</p>}

      <div className="browse-card__actions">
        <Link to={`/profile/${user.username}`}>View Profile</Link>
        {canAddFriend ? (
          <button type="button" onClick={() => onAddFriend(user.username)}>Add Friend</button>
        ) : (
          <span>{status}</span>
        )}
        {user.friendStatus === 'incoming_pending' && <Link to="/friends">Respond</Link>}
      </div>
    </article>
  );
}

export default function BrowsePage({ currentUser }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadUsers(nextQuery = query) {
    setStatus('loading');
    setError('');

    try {
      const results = await searchUsers(nextQuery);
      setUsers(results);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  }

  useEffect(() => {
    loadUsers('');
  }, [currentUser]);

  async function handleSearch(event) {
    event.preventDefault();
    setMessage('');
    await loadUsers(query);
  }

  async function addFriend(username) {
    setMessage('');
    setError('');

    try {
      const result = await sendFriendRequest(username);
      setMessage(result.message);
      setUsers((current) => current.map((user) => (
        user.username === username ? { ...user, friendStatus: 'outgoing_pending' } : user
      )));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page-shell browse-shell">
      <section className="browse-panel">
        <h1>Browse ByteSpace</h1>
        <div className="browse-intro">
          <strong>Find Your People</strong>
          <span>Search usernames and display names, then decide who gets near the Top 8 blast radius.</span>
        </div>

        <form className="browse-search-form" onSubmit={handleSearch}>
          <label>
            Search users
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="keith, Lacutis, ByteGeist..."
            />
          </label>
          <button type="submit">Search</button>
        </form>

        {message && <div className="editor-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {status === 'loading' && <div className="retro-state">Scanning the directory...</div>}

        <section className="browse-results">
          <h2>Search Results</h2>
          {status !== 'loading' && users.length === 0 && (
            <div className="friend-empty-note">No users found.</div>
          )}
          <div className="browse-grid">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUser={currentUser}
                onAddFriend={addFriend}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
