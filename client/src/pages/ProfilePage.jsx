import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProfile } from '../api/profileApi.js';

const fallbackProfileImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=500&q=80';

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
          src={profile.profileImageUrl || fallbackProfileImage}
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
      <div className="friends-grid">
        {friends.map((friend, index) => (
          <article className="friend-tile" key={friend}>
            <div className="friend-avatar">{friend.slice(0, 2).toUpperCase()}</div>
            <strong>{friend}</strong>
            <span>#{index + 1}</span>
          </article>
        ))}
      </div>
    </Box>
  );
}

function Comments({ comments }) {
  return (
    <Box title="Profile Comments">
      <div className="comments-list">
        {comments.map((comment) => (
          <article className="comment" key={`${comment.author}-${comment.date}`}>
            <div className="comment__meta">
              <strong>{comment.author}</strong>
              <span>{comment.date}</span>
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

export default function ProfilePage() {
  const { username = 'keith' } = useParams();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const profileData = await getProfile(username);

        if (!ignore) {
          setProfile(profileData);
          setStatus('loaded');
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

  return (
    <main className="page-shell">
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
          <Comments comments={profile.comments} />
          <Bulletins bulletins={profile.bulletins} />
        </section>
      </div>
    </main>
  );
}
