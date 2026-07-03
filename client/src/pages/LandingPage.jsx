import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Custom Profiles',
    body: 'Build a strange little homepage with blurbs, status, badges, and enough personality to scare a search engine.'
  },
  {
    title: 'Themes and Layouts',
    body: 'Pick safe retro presets, colors, fonts, wallpapers, and profile layouts without raw CSS chaos.'
  },
  {
    title: 'Profile Music',
    body: 'Add a plain music link and a Now Playing box. No uploads, no autoplay, no cursed embed paste.'
  },
  {
    title: 'Friends and Top 8',
    body: 'Send requests, manage friends, and arrange the classic social pressure machine.'
  },
  {
    title: 'Bulletins',
    body: 'Post tiny dispatches into the glitter void and read what your friends are yelling about.'
  },
  {
    title: 'Guestbook Comments',
    body: 'Leave profile comments like it is 2006 and everyone still has a guestbook.'
  },
  {
    title: 'Notifications',
    body: 'See friend requests, comments, accepted requests, and fresh friend bulletins without a websocket circus.'
  },
  {
    title: 'Safety Tools',
    body: 'Reports, blocking, privacy settings, and admin moderation keep the weird web from becoming the bad weird web.'
  }
];

export default function LandingPage() {
  return (
    <main className="page-shell landing-shell">
      <section className="landing-panel">
        <div className="landing-hero landing-hero--polished">
          <div className="landing-copy">
            <p className="landing-kicker">Invite-only retro social static</p>
            <h1>Your weird little corner of the retro web.</h1>
            <p className="landing-tagline">
              ByteSpace is a nostalgic social space for profiles, friends, bulletins, comments, music, themes, layouts, and vibes.
            </p>
            <p className="landing-note">
              Registration is invite-only right now. Existing users can log in and keep decorating the internet improperly.
            </p>
            <div className="landing-actions" aria-label="Landing page actions">
              <Link to="/login">Log In</Link>
              <Link to="/register">Register with Invite</Link>
              <Link to="/browse">Browse Profiles</Link>
            </div>
          </div>

          <aside className="sample-profile-card sample-profile-card--vapor" aria-label="Static sample profile preview">
            <div className="sample-profile-card__top">Mock Profile Preview</div>
            <div className="sample-profile-card__body">
              <div className="sample-profile-card__photo" aria-hidden="true">BG</div>
              <div>
                <strong>byteghost</strong>
                <span>@byteghost</span>
                <p><b>Status:</b> haunting the dial-up hallway</p>
                <p><b>Theme:</b> Vaporwave</p>
                <p><b>Layout:</b> Spotlight</p>
              </div>
            </div>
            <div className="sample-profile-card__song">Now Playing: Imaginary Mixtape</div>
            <div className="sample-profile-card__top-eight" aria-label="Mock Top 8 preview">
              <span>Top 8</span>
              <i>404</i><i>LOL</i><i>BRB</i><i>OMG</i>
            </div>
          </aside>
        </div>

        <section className="landing-feature-box landing-feature-box--intro" aria-labelledby="landing-features-title">
          <h2 id="landing-features-title">What Lives Here</h2>
          <div className="landing-feature-grid landing-feature-grid--expanded">
            {features.map((feature) => (
              <article className="landing-feature" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-invite-box" aria-labelledby="landing-invite-title">
          <h2 id="landing-invite-title">The Door Is Not Wide Open</h2>
          <p>
            ByteSpace is invite-only while the site grows. No invite code is shown here, because that would defeat the entire bit.
          </p>
          <div className="landing-actions">
            <Link to="/login">Existing User Login</Link>
            <Link to="/register">I Have an Invite</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
