import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { sendFriendRequest } from '../api/friendApi.js';
import { searchUsers } from '../api/userApi.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
const sortOptions = new Set(['newest', 'updated', 'username']);

function toAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function formatDate(value) {
  if (!value) return 'mysterious era';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
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

function normalizeControls(searchParams) {
  const query = String(searchParams.get('q') || '').slice(0, 80);
  const sort = sortOptions.has(searchParams.get('sort')) ? searchParams.get('sort') : 'newest';

  return {
    query,
    sort,
    hasMusic: searchParams.get('hasMusic') === 'true',
    hasStatus: searchParams.get('hasStatus') === 'true'
  };
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
          <div className="browse-card__avatar" aria-label="Missing avatar">{user.displayName.slice(0, 2).toUpperCase()}</div>
        )}
        <div>
          <h2>{user.displayName}</h2>
          <span>@{user.username}</span>
        </div>
      </div>

      {user.statusMessage && <p className="browse-card__status">{user.statusMessage}</p>}
      {user.headline && <p className="browse-card__headline">{user.headline}</p>}
      {user.mood && <p><b>Mood:</b> {user.mood}</p>}

      <div className="browse-card__meta" aria-label="Public profile hints">
        <span>{user.layoutPreset ? user.layoutPreset.replace(/_/g, ' ') : 'classic'} layout</span>
        <span>{user.friendCount ?? 0} friends</span>
        {user.hasProfileMusic && <span>profile song</span>}
        <span>joined {formatDate(user.createdAt)}</span>
      </div>

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
  const [searchParams, setSearchParams] = useSearchParams();
  const controls = useMemo(() => normalizeControls(searchParams), [searchParams]);
  const [form, setForm] = useState(controls);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadUsers(nextControls = controls) {
    setStatus('loading');
    setError('');

    try {
      const results = await searchUsers(nextControls);
      setUsers(results);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  }

  useEffect(() => {
    setForm(controls);
    loadUsers(controls);
  }, [currentUser, searchParams]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    setMessage('');
    const next = new URLSearchParams();
    const trimmedQuery = form.query.trim().slice(0, 80);
    if (trimmedQuery) next.set('q', trimmedQuery);
    if (form.sort && form.sort !== 'newest') next.set('sort', form.sort);
    if (form.hasMusic) next.set('hasMusic', 'true');
    if (form.hasStatus) next.set('hasStatus', 'true');
    setSearchParams(next);
  }

  function clearSearch() {
    setMessage('');
    setSearchParams(new URLSearchParams());
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

  const featured = users.slice(0, 3);
  const hasActiveSearch = controls.query || controls.sort !== 'newest' || controls.hasMusic || controls.hasStatus;

  return (
    <main className="page-shell browse-shell">
      <section className="browse-panel">
        <h1>Browse ByteSpace</h1>
        <div className="browse-intro">
          <strong>Find Your People</strong>
          <span>Search the retro directory by username, display name, or status. No trench coat, no algorithmic destiny, just profile cards.</span>
        </div>

        <form className="browse-search-form browse-search-form--polished" onSubmit={handleSearch}>
          <label>
            Search profiles
            <input
              name="query"
              value={form.query}
              onChange={updateField}
              placeholder="keith, Lacutis, haunting the dial-up hallway..."
              maxLength="80"
            />
          </label>
          <label>
            Sort
            <select name="sort" value={form.sort} onChange={updateField}>
              <option value="newest">Newest</option>
              <option value="updated">Recently Updated</option>
              <option value="username">Username A-Z</option>
            </select>
          </label>
          <label className="browse-checkbox">
            <input name="hasMusic" type="checkbox" checked={form.hasMusic} onChange={updateField} />
            Has profile music
          </label>
          <label className="browse-checkbox">
            <input name="hasStatus" type="checkbox" checked={form.hasStatus} onChange={updateField} />
            Has status
          </label>
          <div className="browse-search-actions">
            <button type="submit">Search</button>
            <button type="button" onClick={clearSearch}>Reset</button>
          </div>
        </form>

        {message && <div className="editor-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {status === 'loading' && <div className="retro-state">Scanning the directory...</div>}

        {status !== 'loading' && featured.length > 0 && !hasActiveSearch && (
          <section className="browse-featured">
            <h2>New Around Here</h2>
            <div className="browse-featured-strip">
              {featured.map((user) => (
                <Link key={user.id} to={`/profile/${user.username}`}>
                  {user.profileImageUrl ? <img src={toAssetUrl(user.profileImageUrl)} alt="" /> : <span>{user.displayName.slice(0, 2).toUpperCase()}</span>}
                  <b>{user.displayName}</b>
                  <small>@{user.username}</small>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="browse-results">
          <h2>{hasActiveSearch ? 'Search Results' : 'Profile Directory'}</h2>
          {status !== 'loading' && users.length === 0 && (
            <div className="friend-empty-note">No profiles found. The directory coughs up glitter and shrugs.</div>
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
