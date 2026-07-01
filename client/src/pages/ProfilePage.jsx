import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getComments, postComment } from '../api/commentApi.js';
import { getProfile } from '../api/profileApi.js';

const fallbackProfileImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=500&q=80';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function toAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function Box({ title, children, className = '' }) {
  return (
    <section className={`retro-box ${className}`}>
      <h2>{title}</h2>
      <div className="retro-box__body">{children}</div>
    </section>
  );
}

function ContactBox({ displayName }) {
  const actions = ['Add Friend', 'Send Message', 'Add Favorite', 'Block User'];

  return (
    <Box title={`Contact ${displayName}`}>
      <div className="contact-grid">
        {actions.map((action) => (
          <button key={action} type="button">{action}</button>
        ))}
      </div>
    </Box>
  );
}

function Sidebar({ profile }) {
  return (
    <aside className="sidebar">
      <Box title={`${profile.displayName}'s Blurbz`} className="profile-card">
        <img
          className="profile-photo"
          src={toAssetUrl(profile.profileImageUrl) || fallbackProfileImage}
          alt={`${profile.displayName} profile`}
        />
        <div className="identity">
          <strong>{profile.displayName}</strong>
          <span>@{profile.username}</span>
        </div>
        <p><b>Mood:</b> {profile.mood}</p>
        <p><b>Last Login:</b> {profile.lastLogin}</p>
        {profile.online && <div className="online-badge">Online Now!</div>}
      </Box>

      <ContactBox displayName={profile.displayName} />

      <Box title="Interests">
        <dl className="interests-list">
          <dt>General</dt>
          <dd>{profile.interests.general}</dd>
          <dt>Music</dt>
          <dd>{profile.interests.music}</dd>
          <dt>Movies</dt>
          <dd>{profile.interests.movies}</dd>
          <dt>Games</dt>
          <dd>{profile.interests.games}</dd>
        </dl>
      </Box>
    </aside>
  );
}

function TopFriends({ friends }) {
  return (
    <Box title="Top 8">
      {friends.length === 0 ? (
        <div className="friend-empty-note">This user has not weaponized friendship rankings yet.</div>
      ) : (
        <div className="friends-grid">
          {friends.map((friend, index) => {
            const friendObject = typeof friend === 'string'
              ? { displayName: friend, username: friend.toLowerCase(), profileImageUrl: '' }
              : friend;

            return (
              <article className="friend-tile" key={friendObject.id || friendObject.username || friendObject.displayName}>
                {friendObject.profileImageUrl ? (
                  <img
                    className="friend-avatar friend-avatar--image"
                    src={toAssetUrl(friendObject.profileImageUrl)}
                    alt={`${friendObject.displayName} avatar`}
                  />
                ) : (
                  <div className="friend-avatar">{friendObject.displayName.slice(0, 2).toUpperCase()}</div>
                )}
                <Link to={`/profile/${friendObject.username}`}>
                  <strong>{friendObject.displayName}</strong>
                </Link>
                <span>@{friendObject.username}</span>
                <span>#{friendObject.position || index + 1}</span>
              </article>
            );
          })}
        </div>
      )}
    </Box>
  );
}

function formatCommentDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function Comments({ comments, currentUser, profileUsername, onCommentPosted }) {
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submitComment(event) {
    event.preventDefault();
    const trimmedBody = body.trim();
    setError('');
    setMessage('');

    if (!trimmedBody) {
      setError('Comment cannot be empty.');
      return;
    }

    if (trimmedBody.length > 500) {
      setError('Comment is too long.');
      return;
    }

    setStatus('posting');

    try {
      const comment = await postComment(profileUsername, trimmedBody);
      onCommentPosted(comment);
      setBody('');
      setMessage('Comment posted to the guestbook.');
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  }

  return (
    <Box title="Profile Comments">
      {currentUser ? (
        <form className="comment-form" onSubmit={submitComment}>
          <label>
            Sign the guestbook
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength="500"
            />
          </label>
          <div className="comment-form__footer">
            <span>{body.trim().length}/500</span>
            <button type="submit" disabled={status === 'posting'}>
              {status === 'posting' ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
          {message && <div className="comment-success">{message}</div>}
          {error && <div className="comment-error">{error}</div>}
        </form>
      ) : (
        <div className="comment-login-prompt">Log in to leave a comment in the guestbook.</div>
      )}
      <div className="comments-list">
        {comments.map((comment) => (
          <article
            className="comment"
            key={comment.id || `${comment.author}-${comment.date || comment.createdAt}-${comment.body}`}
          >
            <div className="comment__meta">
              <strong>{comment.author}</strong>
              {comment.authorUsername && <span>@{comment.authorUsername}</span>}
              <span>{comment.createdAt ? formatCommentDate(comment.createdAt) : comment.date}</span>
            </div>
            <p>{comment.body}</p>
          </article>
        ))}
      </div>
    </Box>
  );
}

function Bulletins({ bulletins }) {
  return (
    <Box title="Bulletins Preview">
      <ul className="bulletins-list">
        {bulletins.map((bulletin) => (
          <li key={bulletin.title}>
            <a href="/bulletins">{bulletin.title}</a>
            <span>{bulletin.date}</span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

export default function ProfilePage({ currentUser }) {
  const { username = 'keith' } = useParams();
  const [profile, setProfile] = useState(null);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const profileData = await getProfile(username);

        if (!ignore) {
          setProfile(profileData);
          setComments(profileData.comments || []);
          setStatus('loaded');
        }

        const commentsData = await getComments(username);

        if (!ignore) {
          setComments(commentsData);
        }
      } catch {
        if (!ignore) {
          setStatus('error');
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [username]);

  if (status === 'loading') {
    return (
      <main className="page-shell">
        <div className="retro-state">Loading profile chaos...</div>
      </main>
    );
  }

  if (status === 'error' || !profile) {
    return (
      <main className="page-shell">
        <div className="retro-state retro-state--error">Profile not found or server unavailable.</div>
      </main>
    );
  }

  const themeStyle = profile.theme ? {
    '--profile-bg': profile.theme.backgroundColor || '#f5fbff',
    '--profile-text': profile.theme.textColor || '#111111',
    '--profile-box': profile.theme.boxColor || '#f5fbff',
    '--profile-border': profile.theme.borderColor || '#003d9c',
    '--profile-header': profile.theme.headerColor || '#004fbf',
    fontFamily: profile.theme.fontFamily || 'Arial, Helvetica, sans-serif'
  } : undefined;

  // Apply background image when the profile has one set.
  // The image overlays (but does not replace) the theme background color.
  const backgroundImageStyle = profile.backgroundImageUrl
    ? {
        backgroundImage: `url(${toAssetUrl(profile.backgroundImageUrl)})`,
        backgroundRepeat: profile.theme?.backgroundRepeat || 'repeat',
        backgroundSize: profile.theme?.backgroundSize || 'auto',
        backgroundPosition: profile.theme?.backgroundPosition || 'center'
      }
    : {};

  return (
    <main
      className="page-shell profile-themed-shell"
      style={{ ...themeStyle, ...backgroundImageStyle }}
    >
      <div className="status-strip">
        <marquee>BYTE ALERT: Keith updated his mood and may be operating on caffeine and spite.</marquee>
      </div>

      <div className="layout-grid">
        <Sidebar profile={profile} />

        <section className="profile-main" aria-label={`${profile.displayName} profile`}>
          <div className="profile-hero">
            <p className="profile-kicker">Public Profile</p>
            <h1>{profile.profileTitle}</h1>
            <p>{profile.headline}</p>
          </div>

          <Box title="About Me" className="about-box">
            <p>{profile.aboutMe}</p>
          </Box>

          <Box title="Who I'd Like To Meet">
            <p>{profile.whoIdLikeToMeet}</p>
          </Box>

          <TopFriends friends={profile.topFriends} />
          <Comments
            comments={comments}
            currentUser={currentUser}
            profileUsername={profile.username}
            onCommentPosted={(comment) => setComments((current) => [comment, ...current])}
          />
          <Bulletins bulletins={profile.bulletins} />
        </section>
      </div>
    </main>
  );
}
