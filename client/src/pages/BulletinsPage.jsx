import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReportAction from '../components/ReportAction.jsx';
import {
  createBulletin,
  deleteBulletin,
  getFriendBulletins,
  getMyBulletins
} from '../api/bulletinApi.js';

function formatBulletinDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function BulletinCard({ bulletin, showAuthor = false, actions, currentUser }) {
  return (
    <article className="bulletin-card">
      <header>
        <h3>{bulletin.title}</h3>
        <span>{formatBulletinDate(bulletin.createdAt)}</span>
      </header>
      {showAuthor && (
        <div className="bulletin-card__author">
          By <Link to={`/profile/${bulletin.authorUsername}`}>{bulletin.authorDisplayName}</Link>
          <span>@{bulletin.authorUsername}</span>
        </div>
      )}
      <p>{bulletin.body}</p>
      {(actions || currentUser) && (
        <div className="bulletin-card__actions">
          {actions}
          <ReportAction
            currentUser={currentUser}
            targetType="bulletin"
            targetId={bulletin.id}
            label="Report Bulletin"
          />
        </div>
      )}
    </article>
  );
}

export default function BulletinsPage({ currentUser }) {
  const [form, setForm] = useState({ title: '', body: '' });
  const [myBulletins, setMyBulletins] = useState([]);
  const [friendBulletins, setFriendBulletins] = useState([]);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadBulletins() {
    if (!currentUser) {
      setStatus('logged-out');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const [own, friends] = await Promise.all([
        getMyBulletins(),
        getFriendBulletins()
      ]);

      setMyBulletins(own);
      setFriendBulletins(friends);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  }

  useEffect(() => {
    loadBulletins();
  }, [currentUser]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
    setMessage('');
    setError('');
  }

  async function submitBulletin(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const bulletin = await createBulletin(form);
      setForm({ title: '', body: '' });
      setMyBulletins((current) => [bulletin, ...current]);
      setMessage('Bulletin posted. The glitter void has been notified.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeBulletin(id) {
    setMessage('');
    setError('');

    try {
      await deleteBulletin(id);
      setMyBulletins((current) => current.filter((bulletin) => bulletin.id !== id));
      setMessage('Bulletin deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Bulletins</h1>
          <div className="auth-error">Log in to post bulletins and scream into the glitter void.</div>
          <p className="auth-switch">
            <Link to="/login">Login</Link> or <Link to="/register">Register</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell bulletins-shell">
      <section className="bulletins-panel">
        <h1>Bulletin Board</h1>
        {message && <div className="editor-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {status === 'loading' && <div className="retro-state">Loading bulletins...</div>}

        <section className="bulletins-section">
          <h2>Post a Bulletin</h2>
          <form className="bulletin-form" onSubmit={submitBulletin}>
            <label>
              Title
              <input
                name="title"
                value={form.title}
                onChange={updateField}
              />
            </label>
            <label>
              Body
              <textarea
                name="body"
                value={form.body}
                onChange={updateField}
              />
            </label>
            <div className="bulletin-form__footer">
              <span>{form.title.trim().length}/120 title · {form.body.trim().length}/2000 body</span>
              <button type="submit">Post Bulletin</button>
            </div>
          </form>
        </section>

        <div className="bulletins-layout">
          <section className="bulletins-section">
            <h2>Your Bulletins</h2>
            {myBulletins.length === 0 ? (
              <div className="friend-empty-note">You have not yelled into the bulletin board yet.</div>
            ) : myBulletins.map((bulletin) => (
              <BulletinCard
                key={bulletin.id}
                bulletin={bulletin}
                currentUser={currentUser}
                actions={(
                  <button type="button" onClick={() => removeBulletin(bulletin.id)}>
                    Delete
                  </button>
                )}
              />
            ))}
          </section>

          <section className="bulletins-section">
            <h2>Friend Bulletins</h2>
            {friendBulletins.length === 0 ? (
              <div className="friend-empty-note">No friend bulletins yet.</div>
            ) : friendBulletins.map((bulletin) => (
              <BulletinCard key={bulletin.id} bulletin={bulletin} showAuthor currentUser={currentUser} />
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
