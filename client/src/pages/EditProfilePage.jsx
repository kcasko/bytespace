import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProfile, updateMyProfile } from '../api/profileApi.js';

const fontOptions = [
  'Arial',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Comic Sans MS'
];

const emptyProfile = {
  displayName: '',
  headline: '',
  mood: '',
  aboutMe: '',
  whoIdLikeToMeet: '',
  generalInterests: '',
  music: '',
  movies: '',
  games: '',
  themeBackgroundColor: '#1a0f6d',
  themeTextColor: '#111111',
  themeBoxColor: '#f5fbff',
  themeBorderColor: '#003d9c',
  themeHeaderColor: '#004fbf',
  themeFontFamily: 'Arial'
};

function TextInput({ label, name, value, onChange, multiline = false }) {
  return (
    <label>
      {label}
      {multiline ? (
        <textarea name={name} value={value} onChange={onChange} />
      ) : (
        <input name={name} value={value} onChange={onChange} />
      )}
    </label>
  );
}

function ThemeColor({ label, name, value, onChange }) {
  return (
    <label>
      {label}
      <span className="color-row">
        <input type="color" name={name} value={value} onChange={onChange} />
        <input name={name} value={value} onChange={onChange} />
      </span>
    </label>
  );
}

export default function EditProfilePage({ currentUser }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (!currentUser) {
        setStatus('logged-out');
        return;
      }

      try {
        const profileData = await getMyProfile();

        if (!ignore) {
          setProfile({ ...emptyProfile, ...profileData });
          setStatus('ready');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setStatus('error');
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  function updateField(event) {
    setProfile((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
    setMessage('');
    setError('');
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setStatus('saving');

    try {
      const updatedProfile = await updateMyProfile(profile);
      setProfile({ ...emptyProfile, ...updatedProfile });
      setStatus('ready');
      setMessage('Profile saved. Your chaos has been preserved.');
    } catch (err) {
      setStatus('ready');
      setError(err.message);
    }
  }

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Profile Editor</h1>
          <div className="auth-error">You need to log in before editing your profile.</div>
          <p className="auth-switch">
            <Link to="/login">Login</Link> or <Link to="/register">Register</Link>
          </p>
        </section>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className="page-shell">
        <div className="retro-state">Loading your profile chaos...</div>
      </main>
    );
  }

  return (
    <main className="page-shell editor-shell">
      <form className="editor-layout" onSubmit={saveProfile}>
        <section className="editor-panel">
          <h1>Profile Control Panel</h1>
          {message && <div className="editor-success">{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <fieldset>
            <legend>Basic Info</legend>
            <TextInput label="Display Name" name="displayName" value={profile.displayName} onChange={updateField} />
            <TextInput label="Headline" name="headline" value={profile.headline} onChange={updateField} />
            <TextInput label="Mood" name="mood" value={profile.mood} onChange={updateField} />
          </fieldset>

          <fieldset>
            <legend>About Me</legend>
            <TextInput label="About Me" name="aboutMe" value={profile.aboutMe} onChange={updateField} multiline />
            <TextInput
              label="Who I'd Like To Meet"
              name="whoIdLikeToMeet"
              value={profile.whoIdLikeToMeet}
              onChange={updateField}
              multiline
            />
          </fieldset>

          <fieldset>
            <legend>Interests</legend>
            <TextInput label="General" name="generalInterests" value={profile.generalInterests} onChange={updateField} multiline />
            <TextInput label="Music" name="music" value={profile.music} onChange={updateField} multiline />
            <TextInput label="Movies" name="movies" value={profile.movies} onChange={updateField} multiline />
            <TextInput label="Games" name="games" value={profile.games} onChange={updateField} multiline />
          </fieldset>
        </section>

        <aside className="editor-panel">
          <h2>Profile Theme</h2>
          <ThemeColor label="Background" name="themeBackgroundColor" value={profile.themeBackgroundColor} onChange={updateField} />
          <ThemeColor label="Text" name="themeTextColor" value={profile.themeTextColor} onChange={updateField} />
          <ThemeColor label="Box" name="themeBoxColor" value={profile.themeBoxColor} onChange={updateField} />
          <ThemeColor label="Border" name="themeBorderColor" value={profile.themeBorderColor} onChange={updateField} />
          <ThemeColor label="Header" name="themeHeaderColor" value={profile.themeHeaderColor} onChange={updateField} />
          <label>
            Font
            <select name="themeFontFamily" value={profile.themeFontFamily} onChange={updateField}>
              {fontOptions.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </label>

          <div
            className="profile-preview-panel"
            style={{
              background: profile.themeBackgroundColor,
              color: profile.themeTextColor,
              borderColor: profile.themeBorderColor,
              fontFamily: profile.themeFontFamily
            }}
          >
            <h3 style={{ background: profile.themeHeaderColor }}>{profile.displayName || currentUser.username}</h3>
            <p><b>Mood:</b> {profile.mood}</p>
            <div style={{ background: profile.themeBoxColor, borderColor: profile.themeBorderColor }}>
              <strong>{profile.headline}</strong>
              <p>{profile.aboutMe}</p>
            </div>
          </div>

          <button type="submit" className="save-profile-button" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Save Profile'}
          </button>
          <Link className="view-profile-link" to={`/profile/${currentUser.username}`}>View your profile</Link>
        </aside>
      </form>
    </main>
  );
}
