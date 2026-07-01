import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  getTopFriends,
  rejectFriendRequest,
  sendFriendRequest,
  updateTopFriends
} from '../api/friendApi.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

function toAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function FriendMiniCard({ friend, actions }) {
  return (
    <article className="friend-manager-card">
      {friend.profileImageUrl ? (
        <img src={toAssetUrl(friend.profileImageUrl)} alt={`${friend.displayName} avatar`} />
      ) : (
        <div className="friend-manager-avatar">{friend.displayName.slice(0, 2).toUpperCase()}</div>
      )}
      <div>
        <Link to={`/profile/${friend.username}`}>{friend.displayName}</Link>
        <span>@{friend.username}</span>
      </div>
      {actions && <div className="friend-manager-actions">{actions}</div>}
    </article>
  );
}

function EmptyNote({ children }) {
  return <div className="friend-empty-note">{children}</div>;
}

export default function FriendsPage({ currentUser }) {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [topFriends, setTopFriends] = useState([]);
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const topFriendIds = useMemo(() => topFriends.map((friend) => friend.id), [topFriends]);

  async function loadFriends() {
    if (!currentUser) {
      setStatus('logged-out');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const [friendData, requestData, topFriendData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
        getTopFriends()
      ]);

      setFriends(friendData);
      setIncoming(requestData.incoming);
      setOutgoing(requestData.outgoing);
      setTopFriends(topFriendData);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  }

  useEffect(() => {
    loadFriends();
  }, [currentUser]);

  function setLocalTopFriends(nextIds) {
    const byId = new Map(friends.map((friend) => [friend.id, friend]));
    setTopFriends(nextIds.map((id, index) => ({
      ...byId.get(id),
      position: index + 1
    })).filter((friend) => friend.id));
  }

  function addToTop(friend) {
    setMessage('');
    setError('');

    if (topFriendIds.includes(friend.id)) {
      setError(`${friend.displayName} is already in your Top 8.`);
      return;
    }

    if (topFriends.length >= 8) {
      setError('Top 8 can include at most 8 friends.');
      return;
    }

    setLocalTopFriends([...topFriendIds, friend.id]);
  }

  function removeFromTop(friendId) {
    setMessage('');
    setError('');
    setLocalTopFriends(topFriendIds.filter((id) => id !== friendId));
  }

  function moveTopFriend(friendId, direction) {
    const index = topFriendIds.indexOf(friendId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= topFriendIds.length) {
      return;
    }

    const nextIds = [...topFriendIds];
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    setLocalTopFriends(nextIds);
  }

  async function submitFriendRequest(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const result = await sendFriendRequest(username.trim());
      setUsername('');
      setMessage(result.message);
      await loadFriends();
    } catch (err) {
      setError(err.message);
    }
  }

  async function accept(usernameToAccept) {
    setMessage('');
    setError('');

    try {
      const result = await acceptFriendRequest(usernameToAccept);
      setMessage(result.message);
      await loadFriends();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reject(usernameToReject) {
    setMessage('');
    setError('');

    try {
      const result = await rejectFriendRequest(usernameToReject);
      setMessage(result.message);
      await loadFriends();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveTopFriends() {
    setMessage('');
    setError('');

    try {
      const savedTopFriends = await updateTopFriends(topFriendIds);
      setTopFriends(savedTopFriends);
      setMessage('Top 8 saved. The ranking drama is now official.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Friends</h1>
          <div className="auth-error">Log in to manage your friends and destroy someone emotionally with Top 8 placement.</div>
          <p className="auth-switch">
            <Link to="/login">Login</Link> or <Link to="/register">Register</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell friends-shell">
      <section className="friends-panel">
        <h1>Friends Control Panel</h1>
        {message && <div className="editor-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {status === 'loading' && <div className="retro-state">Loading friend drama...</div>}

        <div className="friends-layout">
          <section className="friends-section">
            <h2>Add Friend</h2>
            <form className="friend-request-form" onSubmit={submitFriendRequest}>
              <label>
                Username
                <input value={username} onChange={(event) => setUsername(event.target.value)} />
              </label>
              <button type="submit">Send Friend Request</button>
            </form>
          </section>

          <section className="friends-section">
            <h2>Incoming Requests</h2>
            {incoming.length === 0 ? (
              <EmptyNote>No incoming requests.</EmptyNote>
            ) : incoming.map((friend) => (
              <FriendMiniCard
                key={friend.id}
                friend={friend}
                actions={(
                  <>
                    <button type="button" onClick={() => accept(friend.username)}>Accept</button>
                    <button type="button" onClick={() => reject(friend.username)}>Reject</button>
                  </>
                )}
              />
            ))}
          </section>

          <section className="friends-section">
            <h2>Outgoing Requests</h2>
            {outgoing.length === 0 ? (
              <EmptyNote>No outgoing requests.</EmptyNote>
            ) : outgoing.map((friend) => (
              <FriendMiniCard key={friend.id} friend={friend} />
            ))}
          </section>

          <section className="friends-section">
            <h2>Your Friends</h2>
            {friends.length === 0 ? (
              <EmptyNote>No accepted friends yet.</EmptyNote>
            ) : friends.map((friend) => (
              <FriendMiniCard
                key={friend.id}
                friend={friend}
                actions={(
                  <button
                    type="button"
                    onClick={() => addToTop(friend)}
                    disabled={topFriendIds.includes(friend.id)}
                  >
                    {topFriendIds.includes(friend.id) ? 'In Top 8' : 'Add to Top 8'}
                  </button>
                )}
              />
            ))}
          </section>

          <section className="friends-section friends-section--wide">
            <h2>Manage Top 8</h2>
            {topFriends.length === 0 ? (
              <EmptyNote>Your Top 8 is empty.</EmptyNote>
            ) : (
              <ol className="top-editor-list">
                {topFriends.map((friend, index) => (
                  <li key={friend.id}>
                    <FriendMiniCard friend={friend} />
                    <div className="top-editor-actions">
                      <button type="button" onClick={() => moveTopFriend(friend.id, -1)} disabled={index === 0}>Up</button>
                      <button type="button" onClick={() => moveTopFriend(friend.id, 1)} disabled={index === topFriends.length - 1}>Down</button>
                      <button type="button" onClick={() => removeFromTop(friend.id)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" className="save-profile-button" onClick={saveTopFriends}>
              Save Top 8
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
