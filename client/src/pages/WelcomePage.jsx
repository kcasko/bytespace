import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completeOnboarding, getOnboardingStatus, updateOnboardingStep } from '../api/onboardingApi.js';

const steps = [
  {
    key: 'welcome',
    title: 'Welcome to ByteSpace',
    body: 'You made it into the invite-only retro profile zone. Build a weird little page, find people, and keep the guestbook dust moving.',
    links: []
  },
  {
    key: 'profile',
    title: 'Set up your profile',
    body: 'Add a status, avatar, profile music, themes, layouts, and section ordering. This is where your page gets its questionable charisma.',
    links: [{ to: '/profile/edit', label: 'Edit Profile' }]
  },
  {
    key: 'people',
    title: 'Find people',
    body: 'Browse profiles, send friend requests, and construct a Top 8 with the gravity it deserves.',
    links: [{ to: '/browse', label: 'Browse Profiles' }, { to: '/friends', label: 'Manage Friends' }]
  },
  {
    key: 'posting',
    title: 'Post and interact',
    body: 'Post bulletins, leave comments, and watch notifications for signs of life from the retro web.',
    links: [{ to: '/bulletins', label: 'Open Bulletins' }, { to: '/notifications', label: 'Notifications' }]
  },
  {
    key: 'safety',
    title: 'Safety tools',
    body: 'Use report buttons, blocking, privacy settings, and admin moderation when someone brings bad vibes to the glitter hallway.',
    links: [{ to: '/settings', label: 'Privacy Settings' }]
  },
  {
    key: 'finish',
    title: 'Enter ByteSpace',
    body: 'You know enough to start poking buttons. Finish onboarding and head to your command center.',
    links: []
  }
];

export default function WelcomePage({ currentUser }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const step = steps[index];
  const progress = useMemo(() => `${index + 1} of ${steps.length}`, [index]);

  useEffect(() => {
    let ignore = false;

    async function loadStatus() {
      if (!currentUser) {
        setStatus('logged-out');
        return;
      }

      setStatus('loading');
      setError('');

      try {
        const onboarding = await getOnboardingStatus();
        if (!ignore) {
          setStatus(onboarding.isComplete ? 'complete' : 'ready');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setStatus('error');
        }
      }
    }

    loadStatus();

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && status === 'ready') {
      updateOnboardingStep(step.key).catch(() => {});
    }
  }, [currentUser, status, step.key]);

  async function finishOnboarding() {
    setSaving(true);
    setError('');

    try {
      await completeOnboarding();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Welcome Mat Rolled Up</h1>
          <p className="auth-note">Log in before starting the ByteSpace orientation cassette.</p>
          <p className="auth-switch"><Link to="/login">Login</Link> or <Link to="/register">Register with invite</Link></p>
        </section>
      </main>
    );
  }

  if (status === 'loading') {
    return <main className="page-shell dashboard-shell"><div className="retro-state">Loading the welcome tape...</div></main>;
  }

  if (status === 'error') {
    return <main className="page-shell dashboard-shell"><div className="retro-state retro-state--error">{error}</div></main>;
  }

  return (
    <main className="page-shell welcome-shell">
      <section className="welcome-panel">
        <p className="welcome-kicker">Getting Started - {progress}</p>
        <h1>{status === 'complete' ? 'Welcome Back to ByteSpace' : step.title}</h1>
        {status === 'complete' ? (
          <p>Onboarding is complete. Your command center is ready, and the wallpaper is probably loud.</p>
        ) : (
          <p>{step.body}</p>
        )}

        {error && <div className="auth-error">{error}</div>}

        {status !== 'complete' && (
          <>
            <div className="welcome-step-list" aria-label="Onboarding steps">
              {steps.map((item, itemIndex) => (
                <button
                  key={item.key}
                  type="button"
                  className={itemIndex === index ? 'welcome-step-pill is-active' : 'welcome-step-pill'}
                  onClick={() => setIndex(itemIndex)}
                >
                  {itemIndex + 1}. {item.title}
                </button>
              ))}
            </div>

            {step.links.length > 0 && (
              <div className="welcome-links">
                {step.links.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}
              </div>
            )}

            <div className="welcome-actions">
              <button type="button" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>Back</button>
              {index < steps.length - 1 ? (
                <button type="button" onClick={() => setIndex(index + 1)}>Next</button>
              ) : (
                <button type="button" onClick={finishOnboarding} disabled={saving}>{saving ? 'Saving...' : 'Enter ByteSpace'}</button>
              )}
              <Link to="/">Skip for now</Link>
            </div>
          </>
        )}

        {status === 'complete' && (
          <div className="welcome-actions">
            <Link to="/">Open Dashboard</Link>
            <Link to="/profile/edit">Edit Profile</Link>
          </div>
        )}
      </section>
    </main>
  );
}
