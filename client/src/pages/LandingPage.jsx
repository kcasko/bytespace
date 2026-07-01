import { Link } from 'react-router-dom';

const features = [
  'Customize your profile',
  'Choose your Top 8',
  'Post bulletins',
  'Leave guestbook comments',
  'Browse weirdos',
  'Set a profile song'
];

export default function LandingPage() {
  return (
    <main className="page-shell landing-shell">
      <section className="landing-panel">
        <div className="landing-hero">
          <div>
            <p className="landing-kicker">Welcome to the glitter-wired directory</p>
            <h1>ByteSpace</h1>
            <p className="landing-tagline">
              A chaotic retro social network for ugly-beautiful profile pages.
            </p>
            <div className="landing-actions">
              <Link to="/register">Register</Link>
              <Link to="/login">Login</Link>
              <Link to="/browse">Browse Profiles</Link>
            </div>
          </div>

          <aside className="sample-profile-card" aria-label="Sample profile preview">
            <div className="sample-profile-card__top">Sample Profile</div>
            <div className="sample-profile-card__body">
              <div className="sample-profile-card__photo">BS</div>
              <div>
                <strong>Glitter_Crash</strong>
                <span>@demo</span>
                <p>Mood: dial-up triumphant</p>
              </div>
            </div>
            <div className="sample-profile-card__song">Now Playing: modem shriek remix</div>
          </aside>
        </div>

        <section className="landing-feature-box">
          <h2>What You Can Do</h2>
          <div className="landing-feature-grid">
            {features.map((feature) => (
              <div className="landing-feature" key={feature}>{feature}</div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
