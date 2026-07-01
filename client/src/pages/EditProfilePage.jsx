import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProfile, updateMyProfile, uploadAvatar, uploadBackground } from '../api/profileApi.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

/**
 * ImageUploader — standalone upload section for avatar or background.
 * Does NOT submit with the main profile form.
 */
function ImageUploader({ label, fieldName, onUpload, currentUrl }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentUrl || '');
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | success | error
  const [uploadMessage, setUploadMessage] = useState('');
  const inputRef = useRef(null);

  // Keep preview in sync when the parent provides a currentUrl (initial load)
  useEffect(() => {
    if (currentUrl && !file) {
      setPreview(currentUrl.startsWith('http') ? currentUrl : `${API_BASE_URL}${currentUrl}`);
    }
  }, [currentUrl, file]);

  function handleFileChange(event) {
    const selected = event.target.files[0];

    if (!selected) {
      return;
    }

    setFile(selected);
    setUploadMessage('');
    setUploadStatus('idle');

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(selected);
    setPreview(objectUrl);
  }

  async function handleUpload(event) {
    // Prevent any accidental form submission propagation
    event.preventDefault();
    event.stopPropagation();

    if (!file) {
      setUploadMessage('Please select an image file first.');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage('');

    try {
      const publicUrl = await onUpload(file);
      setUploadStatus('success');
      setUploadMessage('Image uploaded successfully!');
      setFile(null);
      // Update preview to the persisted URL from the server
      setPreview(`${API_BASE_URL}${publicUrl}`);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(err.message || 'Upload failed.');
    }
  }

  return (
    <fieldset>
      <legend>{label}</legend>
      {preview && (
        <img
          src={preview}
          alt={`${label} preview`}
          style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block', marginBottom: '0.5rem' }}
        />
      )}
      <label>
        Choose file
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          name={fieldName}
        />
      </label>
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploadStatus === 'uploading' || !file}
        style={{ marginTop: '0.4rem' }}
      >
        {uploadStatus === 'uploading' ? 'Uploading...' : `Upload ${label}`}
      </button>
      {uploadStatus === 'success' && (
        <div className="editor-success">{uploadMessage}</div>
      )}
      {uploadStatus === 'error' && (
        <div className="auth-error">{uploadMessage}</div>
      )}
    </fieldset>
  );
}

export default function EditProfilePage({ currentUser }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Track current image URLs so ImageUploader can show an initial preview
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState('');

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
          setCurrentAvatarUrl(profileData.profileImageUrl || '');
          setCurrentBackgroundUrl(profileData.backgroundImageUrl || '');
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
          <div className="auth-error">You must log in to edit your profile or upload images.</div>
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

          {/* Image upload sections — separate from the main profile save form */}
          <ImageUploader
            label="Profile Picture"
            fieldName="avatar"
            currentUrl={currentAvatarUrl}
            onUpload={uploadAvatar}
          />
          <ImageUploader
            label="Background Image"
            fieldName="background"
            currentUrl={currentBackgroundUrl}
            onUpload={uploadBackground}
          />
        </aside>
      </form>
    </main>
  );
}
