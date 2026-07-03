import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { changePassword, getAccountSettings, updateAccountPreferences } from '../api/accountApi.js';
import { blockUser, getBlockedUsers, unblockUser } from '../api/blockApi.js';
import { getMySettings, updateMySettings } from '../api/settingsApi.js';

const emptyAccount = {
  user: null,
  profile: { displayName: '' },
  preferences: {
    showInDirectory: true,
    showMusicInDirectory: true,
    showStatusInDirectory: true
  },
  preferencesUnavailable: false
};

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
  const [account, setAccount] = useState(emptyAccount);
  const [settings, setSettings] = useState(emptySettings);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockUsername, setBlockUsername] = useState('');
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
        const [data, blockedData, accountData] = await Promise.all([
          getMySettings(),
          getBlockedUsers(),
          getAccountSettings()
        ]);

        if (!ignore) {
          setSettings({ ...emptySettings, ...data });
          setBlockedUsers(blockedData);
          setAccount({ ...emptyAccount, ...accountData, preferences: { ...emptyAccount.preferences, ...(accountData?.preferences || {}) } });
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

  function updatePreference(event) {
    const { name, checked } = event.target;
    setAccount((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        [name]: checked
      }
    }));
    setMessage('');
    setError('');
  }

  function updatePasswordField(event) {
    setPasswordForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
    setMessage('');
    setError('');
  }

  async function savePreferences(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const savedAccount = await updateAccountPreferences(account.preferences);
      setAccount({ ...emptyAccount, ...savedAccount, preferences: { ...emptyAccount.preferences, ...(savedAccount?.preferences || {}) } });
      setMessage('Account preferences saved. Your directory listing knows its boundaries.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password confirmation does not match.');
      return;
    }

    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password updated. The gate has a new squeaky hinge.');
    } catch (err) {
      setError(err.message);
    }
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

  async function submitBlock(event) {
    event.preventDefault();
    const username = blockUsername.trim();

    if (!username) {
      setError('Username is required.');
      setMessage('');
      return;
    }

    setMessage('');
    setError('');

    try {
      await blockUser(username);
      setBlockUsername('');
      setBlockedUsers(await getBlockedUsers());
      setMessage('User blocked. The glitter curtain has been slammed shut.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeBlock(username) {
    setMessage('');
    setError('');

    try {
      await unblockUser(username);
      setBlockedUsers((current) => current.filter((user) => user.username !== username));
      setMessage('User unblocked. Choose chaos responsibly.');
    } catch (err) {
      setError(err.message);
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

        <section className="settings-section account-basics-section">
          <h2>Account Basics</h2>
          <div className="account-basics-grid">
            <div><strong>@{account.user?.username || currentUser.username}</strong><span>Username</span></div>
            <div><strong>{account.profile?.displayName || currentUser.username}</strong><span>Display name</span></div>
            <div><strong>{account.user?.createdAt ? new Date(account.user.createdAt).toLocaleDateString() : 'unknown'}</strong><span>Joined</span></div>
            <div><strong>{account.user?.onboardingCompletedAt ? 'Complete' : 'Not complete'}</strong><span>Onboarding</span></div>
            {currentUser.isAdmin && <div><strong>Admin</strong><span>Badge</span></div>}
            {account.user?.suspendedAt && <div><strong>Suspended</strong><span>Status</span></div>}
          </div>
        </section>

        <section className="settings-section account-preferences-section">
          <h2>Browse Directory Preferences</h2>
          <p>These control what appears in Browse only. Your public profile URL still works according to your privacy settings.</p>
          {account.preferencesUnavailable && <div className="auth-error">Browse preferences are waiting on a database migration.</div>}
          <form className="account-preferences-form" onSubmit={savePreferences}>
            <label>
              <input
                name="showInDirectory"
                type="checkbox"
                checked={account.preferences.showInDirectory}
                onChange={updatePreference}
              />
              Show my profile in Browse
            </label>
            <label>
              <input
                name="showMusicInDirectory"
                type="checkbox"
                checked={account.preferences.showMusicInDirectory}
                onChange={updatePreference}
              />
              Show profile music indicator in Browse
            </label>
            <label>
              <input
                name="showStatusInDirectory"
                type="checkbox"
                checked={account.preferences.showStatusInDirectory}
                onChange={updatePreference}
              />
              Show status message in Browse
            </label>
            <button type="submit" disabled={account.preferencesUnavailable}>Save Browse Preferences</button>
          </form>
        </section>

        <section className="settings-section password-settings-section">
          <h2>Password</h2>
          <form className="password-settings-form" onSubmit={submitPasswordChange}>
            <label>
              Current password
              <input
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={updatePasswordField}
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={updatePasswordField}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={updatePasswordField}
                autoComplete="new-password"
              />
            </label>
            <button type="submit">Change Password</button>
          </form>
        </section>

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

        <section className="settings-section blocked-users-section">
          <h2>Blocked Users</h2>
          <form className="block-user-form" onSubmit={submitBlock}>
            <label>
              Username
              <input
                value={blockUsername}
                onChange={(event) => setBlockUsername(event.target.value)}
                placeholder="username to block"
              />
            </label>
            <button type="submit">Block User</button>
          </form>

          {blockedUsers.length === 0 ? (
            <div className="friend-empty-note">No blocked users.</div>
          ) : (
            <div className="blocked-users-list">
              {blockedUsers.map((user) => (
                <article className="blocked-user-card" key={user.id}>
                  <div>
                    <strong>{user.displayName}</strong>
                    <span>@{user.username}</span>
                  </div>
                  <button type="button" onClick={() => removeBlock(user.username)}>Unblock</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
