import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMySettings, updateMySettings } from '../api/settingsApi.js';

const emptySettings = {
  profileVisibility: 'public',
  commentPermission: 'everyone',
  bulletinVisibility: 'public',
  friendRequestPermission: 'everyone'
};

function SelectSetting({ title, name, value, options, helper, onChange }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      <label>
        {title}
        <select name={name} value={value} onChange={onChange}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <p>{helper}</p>
    </section>
  );
}

export default function SettingsPage({ currentUser }) {
  const [settings, setSettings] = useState(emptySettings);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      if (!currentUser) {
        setStatus('logged-out');
        return;
      }

      setStatus('loading');
      setError('');

      try {
        const data = await getMySettings();

        if (!ignore) {
          setSettings({ ...emptySettings, ...data });
          setStatus('ready');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setStatus('ready');
        }
      }
    }

    loadSettings();
    return () => { ignore = true; };
  }, [currentUser]);

  function updateField(event) {
    setSettings((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
    setMessage('');
    setError('');
  }

  async function saveSettings(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setStatus('saving');

    try {
      const savedSettings = await updateMySettings(settings);
      setSettings(savedSettings);
      setMessage('Settings saved. Your boundaries have been weaponized.');
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  }

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Settings</h1>
          <div className="auth-error">Log in before adjusting your privacy force field.</div>
          <p className="auth-switch">
            <Link to="/login">Login</Link> or <Link to="/register">Register</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell settings-shell">
      <section className="settings-panel">
        <h1>Account & Privacy Settings</h1>
        {message && <div className="editor-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {status === 'loading' && <div className="retro-state">Loading privacy switches...</div>}

        <form className="settings-form" onSubmit={saveSettings}>
          <SelectSetting
            title="Profile Visibility"
            name="profileVisibility"
            value={settings.profileVisibility}
            options={[
              { value: 'public', label: 'public' },
              { value: 'friends', label: 'friends' },
              { value: 'private', label: 'private' }
            ]}
            helper="public = everyone can view; friends = only accepted friends can view; private = only you can view."
            onChange={updateField}
          />

          <SelectSetting
            title="Comments"
            name="commentPermission"
            value={settings.commentPermission}
            options={[
              { value: 'everyone', label: 'everyone' },
              { value: 'friends', label: 'friends' },
              { value: 'none', label: 'none' }
            ]}
            helper="Choose who can sign your guestbook. You can still comment on your own profile."
            onChange={updateField}
          />

          <SelectSetting
            title="Bulletins"
            name="bulletinVisibility"
            value={settings.bulletinVisibility}
            options={[
              { value: 'public', label: 'public' },
              { value: 'friends', label: 'friends' },
              { value: 'private', label: 'private' }
            ]}
            helper="Control who can read your public-profile bulletin board."
            onChange={updateField}
          />

          <SelectSetting
            title="Friend Requests"
            name="friendRequestPermission"
            value={settings.friendRequestPermission}
            options={[
              { value: 'everyone', label: 'everyone' },
              { value: 'friends_of_friends', label: 'friends_of_friends' },
              { value: 'none', label: 'none' }
            ]}
            helper="friends_of_friends requires the requester to share at least one accepted friend with you."
            onChange={updateField}
          />

          <button type="submit" className="save-profile-button" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </section>
    </main>
  );
}
