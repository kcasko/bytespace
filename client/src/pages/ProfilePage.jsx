import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReportAction from '../components/ReportAction.jsx';
import { blockUser } from '../api/blockApi.js';
import { getUserBulletins } from '../api/bulletinApi.js';
import { getComments, postComment } from '../api/commentApi.js';
import { getProfile } from '../api/profileApi.js';
import { detectMusicService, getSafeYouTubeEmbedUrl, getSongSummary, isHttpUrl } from '../utils/musicUtils.js';

const fallbackProfileImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=500&q=80';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');


const defaultSectionOrder = ['about', 'interests', 'music', 'friends', 'bulletins', 'comments'];

function normalizeSectionOrder(value) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalized = [];

  for (const item of source) {
    if (defaultSectionOrder.includes(item) && !seen.has(item)) {
      normalized.push(item);
      seen.add(item);
    }
  }

  for (const item of defaultSectionOrder) {
    if (!seen.has(item)) normalized.push(item);
  }

  return normalized;
}

const layoutClassNames = new Set(['classic', 'compact', 'wide', 'sidebar_left', 'sidebar_right', 'spotlight']);

function getLayoutClassName(layoutPreset) {
  const preset = layoutClassNames.has(layoutPreset) ? layoutPreset : 'classic';
  return `profile-layout profile-layout--${preset}`;
}

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


function ProfileBadges({ badges = {} }) {
  const items = [
    badges.admin && 'Admin',
    badges.founder && 'Founder',
    badges.newMember && 'New Member'
  ].filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="profile-badges" aria-label="Profile badges">
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}

function ProfileStats({ stats = {} }) {
  const statItems = [
    ['Friends', stats.friendCount ?? 0],
    ['Comments', stats.commentCount ?? 0],
    ['Bulletins', stats.bulletinCount ?? 0],
    ['Joined', stats.joinedDate || 'mysterious era']
  ];

  return (
    <Box title="Profile Stats" className="profile-stats-box">
      <div className="profile-stats-grid">
        {statItems.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Box>
  );
}

function ContactBox({ displayName, username, currentUser }) {
  return (
    <Box title={`Contact ${displayName}`}>
      <div className="contact-grid">
        <button type="button">Add Friend</button>
        {currentUser && currentUser.username !== username ? (
          <Link to={`/messages?user=${encodeURIComponent(username)}`}>Message</Link>
        ) : (
          <button type="button" disabled>Message</button>
        )}
        <button type="button">Add Favorite</button>
      </div>
    </Box>
  );
}

function Sidebar({ profile, currentUser }) {
  return (
    <aside className="sidebar">
      <Box title={`${profile.displayName}'s Blurbz`} className="profile-card">
        <img
          className="profile-photo"
          src={toAssetUrl(profile.profileImageUrl) || fallbackProfileImage}
          alt={`${profile.displayName} profile`}
        />
        {!profile.profileImageUrl && <div className="profile-avatar-empty">No avatar uploaded yet. Mystery silhouette mode.</div>}
        <div className="identity">
          <strong>{profile.displayName}</strong>
          <span>@{profile.username}</span>
        </div>
        <ProfileBadges badges={profile.badges} />
        <p><b>Mood:</b> {profile.mood || 'unlisted'}</p>
        {profile.statusMessage && <p className="profile-status-message"><b>Status:</b> {profile.statusMessage}</p>}
        <p><b>Last Login:</b> {profile.lastLogin}</p>
        {profile.online && <div className="online-badge">Online Now!</div>}
      </Box>

      <ContactBox displayName={profile.displayName} username={profile.username} currentUser={currentUser} />

      <ProfileStats stats={profile.stats} />

      {currentUser?.username !== profile.username && (
        <Box title="Safety">
          <ReportAction
            currentUser={currentUser}
            targetType="profile"
            targetUsername={profile.username}
            label="Report Profile"
          />
        </Box>
      )}

    </aside>
  );
}


function Interests({ interests = {} }) {
  return (
    <Box title="Interests">
      <dl className="interests-list">
        <dt>General</dt>
        <dd>{interests.general || 'No general interests listed yet.'}</dd>
        <dt>Music</dt>
        <dd>{interests.music || 'No music interests listed yet.'}</dd>
        <dt>Movies</dt>
        <dd>{interests.movies || 'No movie interests listed yet.'}</dd>
        <dt>Games</dt>
        <dd>{interests.games || 'No game interests listed yet.'}</dd>
      </dl>
    </Box>
  );
}

function OrderedProfileSections({ profile, comments, currentUser, bulletins, bulletinError, onCommentPosted }) {
  const sections = {
    about: (
      <div className="ordered-section" key="about" data-section="about">
        <Box title="About Me" className="about-box">
          <p>{profile.aboutMe || 'This profile has not written an About Me yet. Mysterious.'}</p>
        </Box>
        <Box title="Who I'd Like To Meet">
          <p>{profile.whoIdLikeToMeet || 'No meeting wishlist yet. The social radar is quiet.'}</p>
        </Box>
      </div>
    ),
    interests: <Interests key="interests" interests={profile.interests} />,
    music: <ProfileSong key="music" profile={profile} />,
    friends: <TopFriends key="friends" friends={profile.topFriends} />,
    comments: (
      <Comments
        key="comments"
        comments={comments}
        currentUser={currentUser}
        profileUsername={profile.username}
        onCommentPosted={onCommentPosted}
      />
    ),
    bulletins: bulletinError ? (
      <Box key="bulletins" title="Bulletin Board">
        <div className="friend-empty-note">
          {bulletinError === 'These bulletins are private'
            ? 'These bulletins are private.'
            : bulletinError}
        </div>
      </Box>
    ) : <Bulletins key="bulletins" bulletins={bulletins} currentUser={currentUser} />
  };

  return normalizeSectionOrder(profile.sectionOrder).map((sectionKey) => sections[sectionKey]);
}

function TopFriends({ friends }) {
  return (
    <Box title="Top 8">
      {friends.length === 0 ? (
        <div className="friend-empty-note">No Top 8 yet. The ranking drama machine is idle.</div>
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

function ProfileSong({ profile }) {
  const hasSong = profile.profileSongTitle || profile.profileSongArtist || profile.profileSongUrl;
  const serviceLabel = detectMusicService(profile.profileSongUrl);
  const embedUrl = getSafeYouTubeEmbedUrl(profile.profileSongUrl);

  return (
    <Box title="Now Playing" className="profile-song-box profile-song-box--polished">
      <div className="now-playing-widget">
        <div className="equalizer-bars" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="now-playing-details">
          {hasSong ? (
            <>
              <p className="now-playing-label">Profile Song</p>
              <strong>{profile.profileSongTitle || 'Untitled'}</strong>
              <span>{profile.profileSongArtist || 'Unknown Artist'}</span>
              <span className="music-service-label">{serviceLabel}</span>
              {isHttpUrl(profile.profileSongUrl) && (
                <a href={profile.profileSongUrl} target="_blank" rel="noopener noreferrer">
                  Add to your imaginary 2006 playlist
                </a>
              )}
            </>
          ) : (
            <p>No profile song yet. The jukebox is dusty.</p>
          )}
        </div>
      </div>
      {embedUrl && (
        <div className="youtube-preview-frame">
          <iframe
            src={embedUrl}
            title={`YouTube preview for ${getSongSummary(profile)}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
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
        {comments.length === 0 ? (
          <div className="friend-empty-note">No guestbook comments yet. Be the first to scribble on the wall.</div>
        ) : comments.map((comment) => (
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
            <ReportAction
              currentUser={currentUser}
              targetType="comment"
              targetId={comment.id}
              label="Report Comment"
            />
          </article>
        ))}
      </div>
    </Box>
  );
}

function Bulletins({ bulletins, currentUser }) {
  return (
    <Box title="Bulletin Board">
      {bulletins.length === 0 ? (
        <div className="friend-empty-note">No bulletins yet. The glitter void remains silent and slightly dial-up.</div>
      ) : (
        <div className="profile-bulletins-list">
          {bulletins.slice(0, 5).map((bulletin) => (
            <article className="profile-bulletin" key={bulletin.id}>
              <header>
                <strong>{bulletin.title}</strong>
                <span>{formatCommentDate(bulletin.createdAt)}</span>
              </header>
              <p>{bulletin.body}</p>
              <ReportAction
                currentUser={currentUser}
                targetType="bulletin"
                targetId={bulletin.id}
                label="Report Bulletin"
              />
            </article>
          ))}
        </div>
      )}
    </Box>
  );
}

export default function ProfilePage({ currentUser }) {
  const { username = 'keith' } = useParams();
  const [profile, setProfile] = useState(null);
  const [comments, setComments] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [bulletinError, setBulletinError] = useState('');
  const [status, setStatus] = useState('loading');
  const [pageMessage, setPageMessage] = useState('');
  const [pageError, setPageError] = useState('');

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

        try {
          const commentsData = await getComments(username);

          if (!ignore) {
            setComments(commentsData);
          }
        } catch (err) {
          if (!ignore) {
            if (err.message === 'This profile is private') {
              setStatus('private');
            } else if (err.message === 'This interaction is blocked. The glitter wall is up.') {
              setStatus('blocked');
            }
          }
        }

        try {
          const bulletinData = await getUserBulletins(username);

          if (!ignore) {
            setBulletins(bulletinData);
            setBulletinError('');
          }
        } catch (err) {
          if (!ignore) {
            setBulletins([]);
            setBulletinError(err.message);
          }
        }
      } catch (err) {
        if (!ignore) {
          if (err.message === 'This profile is private') {
            setStatus('private');
          } else if (err.message === 'This profile is unavailable' || err.message === 'You blocked this user') {
            setStatus('blocked');
          } else {
            setStatus('error');
          }
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [username]);

  async function handleBlockUser() {
    if (!profile) return;

    const confirmed = window.confirm(`Are you sure you want to block @${profile.username}?`);

    if (!confirmed) {
      return;
    }

    setPageMessage('');
    setPageError('');

    try {
      await blockUser(profile.username);
      setPageMessage('User blocked. The glitter curtain has been slammed shut.');
      setStatus('blocked');
    } catch (err) {
      setPageError(err.message);
    }
  }

  if (status === 'loading') {
    return (
      <main className="page-shell">
        <div className="retro-state">Loading profile chaos...</div>
      </main>
    );
  }

  if (status === 'private') {
    return (
      <main className="page-shell">
        <div className="retro-state retro-state--error">
          This profile is private. The glitter curtain is closed.
        </div>
      </main>
    );
  }

  if (status === 'blocked') {
    return (
      <main className="page-shell">
        <div className="retro-state retro-state--error">
          {pageMessage || 'This interaction is blocked. The glitter wall is up.'}
        </div>
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
        <marquee>BYTE ALERT: {profile.displayName} says {profile.statusMessage || profile.mood || 'the profile signal is alive'}.</marquee>
      </div>

      <div className={`layout-grid ${getLayoutClassName(profile.layoutPreset)}`}>
        <Sidebar profile={profile} currentUser={currentUser} />

        <section className="profile-main" aria-label={`${profile.displayName} profile`}>
          {pageMessage && <div className="editor-success">{pageMessage}</div>}
          {pageError && <div className="auth-error">{pageError}</div>}
          <div className="profile-hero">
            <p className="profile-kicker">Public Profile</p>
            <h1>{profile.profileTitle}</h1>
            <ProfileBadges badges={profile.badges} />
            {profile.statusMessage && <p className="profile-status-hero">{profile.statusMessage}</p>}
            <p>{profile.headline}</p>
            <Link className="profile-discover-link" to="/browse">Discover more profiles</Link>
            {!profile.backgroundImageUrl && (
              <div className="profile-background-empty">No custom background yet. Default wallpaper energy engaged.</div>
            )}
            {currentUser && currentUser.username !== profile.username && (
              <button type="button" className="profile-block-button" onClick={handleBlockUser}>
                Block User
              </button>
            )}
          </div>

          <OrderedProfileSections
            profile={profile}
            comments={comments}
            currentUser={currentUser}
            bulletins={bulletins}
            bulletinError={bulletinError}
            onCommentPosted={(comment) => setComments((current) => [comment, ...current])}
          />
        </section>
      </div>
    </main>
  );
}
