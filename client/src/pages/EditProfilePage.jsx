import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProfile, updateMyProfile, uploadAvatar, uploadBackground } from '../api/profileApi.js';
import { detectMusicService, getSafeYouTubeEmbedUrl, getSongSummary, isHttpUrl } from '../utils/musicUtils.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

function toAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

const fontOptions = [
  { label: 'System Retro', value: 'Arial' },
  { label: 'Verdana Classic', value: 'Verdana' },
  { label: 'Trebuchet Web', value: 'Trebuchet MS' },
  { label: 'Georgia Diary', value: 'Georgia' },
  { label: 'Courier Terminal', value: 'Courier New' },
  { label: 'Comic Sans Chaos', value: 'Comic Sans MS' },
  { label: 'Tahoma Portal', value: 'Tahoma' },
  { label: 'Times New Roman Zine', value: 'Times New Roman' }
];

const emptyProfile = {
  displayName: '',
  headline: '',
  mood: '',
  statusMessage: '',
  layoutPreset: 'classic',
  sectionOrder: ['about', 'interests', 'music', 'friends', 'bulletins', 'comments'],
  aboutMe: '',
  whoIdLikeToMeet: '',
  generalInterests: '',
  music: '',
  movies: '',
  games: '',
  profileSongTitle: '',
  profileSongArtist: '',
  profileSongUrl: '',
  themeBackgroundColor: '#1a0f6d',
  themeTextColor: '#111111',
  themeBoxColor: '#f5fbff',
  themeBorderColor: '#003d9c',
  themeHeaderColor: '#004fbf',
  themeFontFamily: 'Arial',
  themeBackgroundRepeat: 'repeat',
  themeBackgroundSize: 'auto',
  themeBackgroundPosition: 'center'
};

const themePresets = [
  {
    name: 'Blue Classic',
    description: 'Clean old-web profile energy.',
    values: {
      themeBackgroundColor: '#d6e6f2',
      themeTextColor: '#111111',
      themeBoxColor: '#ffffff',
      themeBorderColor: '#336699',
      themeHeaderColor: '#336699',
      themeFontFamily: 'Arial'
    }
  },
  {
    name: 'Scene Kid Disaster',
    description: 'Hot pink chaos in the best way.',
    values: {
      themeBackgroundColor: '#160016',
      themeTextColor: '#ff66cc',
      themeBoxColor: '#250025',
      themeBorderColor: '#ff00ff',
      themeHeaderColor: '#660066',
      themeFontFamily: 'Comic Sans MS'
    }
  },
  {
    name: 'Cyber Rot',
    description: 'Terminal slime and electric borders.',
    values: {
      themeBackgroundColor: '#050505',
      themeTextColor: '#00ff66',
      themeBoxColor: '#101010',
      themeBorderColor: '#00ccff',
      themeHeaderColor: '#003333',
      themeFontFamily: 'Courier New'
    }
  },
  {
    name: 'Mall Goth',
    description: 'Dark, dramatic, and diary-coded.',
    values: {
      themeBackgroundColor: '#111111',
      themeTextColor: '#dddddd',
      themeBoxColor: '#1d1d1d',
      themeBorderColor: '#990000',
      themeHeaderColor: '#330000',
      themeFontFamily: 'Georgia'
    }
  },
  {
    name: 'VHS Static',
    description: 'Gray tape hiss and analog dust.',
    values: {
      themeBackgroundColor: '#2b2b2b',
      themeTextColor: '#f2f2f2',
      themeBoxColor: '#3a3a3a',
      themeBorderColor: '#999999',
      themeHeaderColor: '#555555',
      themeFontFamily: 'Trebuchet MS'
    }
  },
  {
    name: 'Neon Mall',
    description: 'Food court lights after midnight.',
    values: {
      themeBackgroundColor: '#10183d',
      themeTextColor: '#fff7fb',
      themeBoxColor: '#171f52',
      themeBorderColor: '#ff4fd8',
      themeHeaderColor: '#008cff',
      themeFontFamily: 'Trebuchet MS'
    }
  },
  {
    name: 'Vaporwave',
    description: 'Chrome sunset, pastel modem hum.',
    values: {
      themeBackgroundColor: '#27104f',
      themeTextColor: '#ffe6ff',
      themeBoxColor: '#3b1b70',
      themeBorderColor: '#00e5ff',
      themeHeaderColor: '#ff66cc',
      themeFontFamily: 'Verdana'
    }
  },
  {
    name: 'Terminal Green',
    description: 'CRT glow for command-line souls.',
    values: {
      themeBackgroundColor: '#001100',
      themeTextColor: '#b8ffb8',
      themeBoxColor: '#061806',
      themeBorderColor: '#00cc44',
      themeHeaderColor: '#003d16',
      themeFontFamily: 'Courier New'
    }
  },
  {
    name: 'Pink Glitter',
    description: 'Bubblegum sparkle overload.',
    values: {
      themeBackgroundColor: '#ffe1f5',
      themeTextColor: '#33002a',
      themeBoxColor: '#fff8fd',
      themeBorderColor: '#ff4fbd',
      themeHeaderColor: '#c4007a',
      themeFontFamily: 'Comic Sans MS'
    }
  },
  {
    name: 'Dark Arcade',
    description: 'Cabinet glow and high-score menace.',
    values: {
      themeBackgroundColor: '#070915',
      themeTextColor: '#f5f5ff',
      themeBoxColor: '#101426',
      themeBorderColor: '#ffcc00',
      themeHeaderColor: '#7a00ff',
      themeFontFamily: 'Tahoma'
    }
  },
  {
    name: 'Blue GeoCities',
    description: 'Peak personal homepage blue.',
    values: {
      themeBackgroundColor: '#003399',
      themeTextColor: '#ffffff',
      themeBoxColor: '#e8f3ff',
      themeBorderColor: '#ffff00',
      themeHeaderColor: '#000080',
      themeFontFamily: 'Arial'
    }
  },
  {
    name: 'LimeWire Infection',
    description: 'Definitely downloaded from somewhere.',
    values: {
      themeBackgroundColor: '#001a00',
      themeTextColor: '#ccffcc',
      themeBoxColor: '#002b00',
      themeBorderColor: '#39ff14',
      themeHeaderColor: '#004d00',
      themeFontFamily: 'Verdana'
    }
  }
];

const blueClassicTheme = themePresets[0].values;
const backgroundRepeatOptions = ['repeat', 'no-repeat', 'repeat-x', 'repeat-y'];
const backgroundSizeOptions = ['auto', 'cover', 'contain'];
const backgroundPositionOptions = ['center', 'top', 'bottom', 'left', 'right'];


const defaultSectionOrder = ['about', 'interests', 'music', 'friends', 'bulletins', 'comments'];
const sectionLabels = {
  about: 'About Me',
  interests: 'Interests',
  music: 'Now Playing',
  friends: 'Friends / Top 8',
  bulletins: 'Bulletins',
  comments: 'Comments'
};

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
    if (!seen.has(item)) {
      normalized.push(item);
    }
  }

  return normalized;
}

const layoutPresetOptions = [
  { value: 'classic', label: 'Classic', description: 'The default ByteSpace profile grid with sidebar and main chaos.' },
  { value: 'compact', label: 'Compact', description: 'Tighter spacing for short profiles and quick scanning.' },
  { value: 'wide', label: 'Wide', description: 'More room for posts, comments, music, and long blurbs.' },
  { value: 'sidebar_left', label: 'Sidebar Left', description: 'Profile info on the left, content on the right.' },
  { value: 'sidebar_right', label: 'Sidebar Right', description: 'Main content first with the profile sidebar on the right.' },
  { value: 'spotlight', label: 'Spotlight', description: 'Bigger header energy for status, music, and stats.' }
];

function getLayoutPresetLabel(value) {
  return layoutPresetOptions.find((option) => option.value === value)?.label || 'Classic';
}


function getThemePresetName(profile) {
  const match = themePresets.find((preset) => (
    preset.values.themeBackgroundColor === profile.themeBackgroundColor
    && preset.values.themeTextColor === profile.themeTextColor
    && preset.values.themeBoxColor === profile.themeBoxColor
    && preset.values.themeBorderColor === profile.themeBorderColor
    && preset.values.themeHeaderColor === profile.themeHeaderColor
    && preset.values.themeFontFamily === profile.themeFontFamily
  ));

  return match?.name || 'Custom Mix';
}

function fontLabelForValue(value) {
  return fontOptions.find((font) => font.value === value)?.label || 'System Retro';
}

function ThemePresetCard({ preset, active, onClick }) {
  const colors = [
    preset.values.themeBackgroundColor,
    preset.values.themeTextColor,
    preset.values.themeBoxColor,
    preset.values.themeBorderColor,
    preset.values.themeHeaderColor
  ];

  return (
    <button
      type="button"
      className={`theme-preset-card ${active ? 'theme-preset-card--active' : ''}`}
      onClick={onClick}
    >
      <strong>{preset.name}</strong>
      <span>{preset.description}</span>
      <span className="theme-swatch-row" aria-hidden="true">
        {colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
      </span>
    </button>
  );
}

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

function SelectInput({ label, name, value, options, onChange }) {
  return (
    <label>
      {label}
      <select name={name} value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * ImageUploader — completely standalone upload widget.
 * Must NOT be placed inside the profile save <form>.
 * Uses its own state, its own button (type="button"), and its own fetch call.
 */
function ImageUploader({ label, fieldName, onUpload, currentUrl }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | success | error
  const [uploadMessage, setUploadMessage] = useState('');
  const inputRef = useRef(null);

  // Sync preview when parent provides initial URL after profile loads
  useEffect(() => {
    if (currentUrl) {
      setPreview(toAssetUrl(currentUrl));
    }
  }, [currentUrl]);

  function handleFileChange(event) {
    const selected = event.target.files[0];
    if (!selected) return;

    setFile(selected);
    setUploadMessage('');
    setUploadStatus('idle');

    // Show local blob preview immediately so the user can see what they picked
    setPreview(URL.createObjectURL(selected));
  }

  async function handleUpload() {
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
      setUploadMessage(
        fieldName === 'avatar'
          ? 'Profile picture uploaded successfully.'
          : 'Background image uploaded successfully.'
      );
      setFile(null);
      // Switch preview to the persisted server URL
      setPreview(toAssetUrl(publicUrl));
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(err.message || 'Upload failed.');
    }
  }

  const buttonLabel = fieldName === 'avatar' ? 'Upload Profile Picture' : 'Upload Background Image';

  return (
    <div className="upload-section">
      <div className="upload-section__legend">{label}</div>

      {preview && (
        <img
          src={preview}
          alt={`${label} preview`}
          className="upload-preview"
        />
      )}

      <input
        ref={inputRef}
        id={`file-input-${fieldName}`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="upload-file-input"
      />
      {file && <div className="upload-file-name">{file.name}</div>}

      <button
        type="button"
        className="upload-button"
        onClick={handleUpload}
        disabled={uploadStatus === 'uploading' || !file}
      >
        {uploadStatus === 'uploading' ? 'Uploading…' : buttonLabel}
      </button>

      {uploadStatus === 'success' && (
        <div className="editor-success">{uploadMessage}</div>
      )}
      {uploadStatus === 'error' && (
        <div className="upload-error">{uploadMessage}</div>
      )}
    </div>
  );
}

export default function EditProfilePage({ currentUser }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Separate state for image URLs so they survive profile saves without getting blanked.
  // The updateOwnProfile RETURNING clause does not include image URL columns.
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState('');
  const previewAvatarUrl = toAssetUrl(currentAvatarUrl || profile.profileImageUrl);
  const previewBackgroundUrl = toAssetUrl(currentBackgroundUrl || profile.backgroundImageUrl);

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
          setProfile({ ...emptyProfile, ...profileData, sectionOrder: normalizeSectionOrder(profileData.sectionOrder) });
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
    return () => { ignore = true; };
  }, [currentUser]);

  function updateField(event) {
    setProfile((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
    setMessage('');
    setError('');
  }

  function applyTheme(values) {
    setProfile((current) => ({
      ...current,
      ...values
    }));
    setMessage('');
    setError('');
  }

  function resetTheme() {
    applyTheme({
      ...blueClassicTheme,
      themeBackgroundRepeat: 'repeat',
      themeBackgroundSize: 'auto',
      themeBackgroundPosition: 'center'
    });
  }

  function moveSection(index, direction) {
    setProfile((current) => {
      const order = normalizeSectionOrder(current.sectionOrder);
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= order.length) {
        return current;
      }

      const nextOrder = [...order];
      [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
      return { ...current, sectionOrder: nextOrder };
    });
    setMessage('');
    setError('');
  }

  function resetSectionOrder() {
    setProfile((current) => ({ ...current, sectionOrder: defaultSectionOrder }));
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
      // Preserve image URLs — the PUT response does not include them
      setProfile((current) => ({ ...emptyProfile, ...updatedProfile, profileImageUrl: current.profileImageUrl, backgroundImageUrl: current.backgroundImageUrl }));
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
      {/*
        The grid wrapper is a plain <div>, NOT the <form>.
        The <form> only wraps text + theme fields so that:
          a) ImageUploaders are fully outside the form (no accidental submission, no input clearing)
          b) Pressing Enter in a text field saves the profile, not the images
      */}
      <div className="editor-layout">

        {/* ── Left panel: text fields + save button ───────────────────────── */}
        <form id="profile-form" className="editor-panel" onSubmit={saveProfile}>
          <h1>Profile Control Panel</h1>

          {message && <div className="editor-success">{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <fieldset>
            <legend>Basic Info</legend>
            <TextInput label="Display Name" name="displayName" value={profile.displayName} onChange={updateField} />
            <TextInput label="Headline" name="headline" value={profile.headline} onChange={updateField} />
            <TextInput label="Mood" name="mood" value={profile.mood} onChange={updateField} />
            <TextInput label="Status Message" name="statusMessage" value={profile.statusMessage} onChange={updateField} />
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

          <fieldset>
            <legend>Profile Layout</legend>
            <p className="editor-helper">Layout presets are safe structure changes only. No raw HTML, CSS, or script injection.</p>
            <label>
              Layout preset
              <select name="layoutPreset" value={profile.layoutPreset} onChange={updateField}>
                {layoutPresetOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="layout-preset-preview-grid" aria-label="Layout preset descriptions">
              {layoutPresetOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`layout-preset-card ${profile.layoutPreset === option.value ? 'layout-preset-card--active' : ''}`}
                  onClick={() => updateField({ target: { name: 'layoutPreset', value: option.value } })}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Profile Sections</legend>
            <p className="editor-helper">Choose the order for major profile sections. This is safe ordering only, not freeform HTML or custom code.</p>
            <div className="section-order-list" aria-label="Profile section order">
              {normalizeSectionOrder(profile.sectionOrder).map((sectionKey, index) => (
                <div className="section-order-item" key={sectionKey}>
                  <span>{index + 1}. {sectionLabels[sectionKey]}</span>
                  <div>
                    <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0}>Up</button>
                    <button type="button" onClick={() => moveSection(index, 1)} disabled={index === normalizeSectionOrder(profile.sectionOrder).length - 1}>Down</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="reset-theme-button" onClick={resetSectionOrder}>Reset Section Order</button>
          </fieldset>

          <fieldset>
            <legend>Profile Song</legend>
            <p className="editor-helper">Paste a YouTube, Spotify, SoundCloud, Bandcamp, Apple Music, or music link. No uploads or autoplay. Keep it chill.</p>
            <TextInput label="Song Title" name="profileSongTitle" value={profile.profileSongTitle} onChange={updateField} />
            <TextInput label="Artist" name="profileSongArtist" value={profile.profileSongArtist} onChange={updateField} />
            <TextInput label="Song URL" name="profileSongUrl" value={profile.profileSongUrl} onChange={updateField} />
          </fieldset>

          {/* Save button inside the form so Enter key and explicit click both work */}
          <button type="submit" className="save-profile-button" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save Profile'}
          </button>
        </form>

        {/* ── Right panel: theme + image uploads (outside the form) ──────── */}
        <aside className="editor-panel">
          <h2>Profile Theme</h2>

          <div className="editor-aside-fields theme-control-panel">
            <p className="editor-helper">Preset changes are preview-only until you hit Save Profile.</p>
            <p className="editor-helper">Theme controls are safe presets, hex colors, allowed fonts, and background dropdowns only. No raw CSS or HTML.</p>

            <section className="theme-control-group">
              <h3>Theme preset</h3>
              <div className="theme-preset-grid" aria-label="Theme presets">
                {themePresets.map((preset) => (
                  <ThemePresetCard
                    key={preset.name}
                    preset={preset}
                    active={getThemePresetName(profile) === preset.name}
                    onClick={() => applyTheme(preset.values)}
                  />
                ))}
              </div>

              <button type="button" className="reset-theme-button" onClick={resetTheme}>
                Reset Theme
              </button>
            </section>

            <section className="theme-control-group">
              <h3>Colors</h3>
              <ThemeColor label="Background" name="themeBackgroundColor" value={profile.themeBackgroundColor} onChange={updateField} />
              <ThemeColor label="Text" name="themeTextColor" value={profile.themeTextColor} onChange={updateField} />
              <ThemeColor label="Box/Card" name="themeBoxColor" value={profile.themeBoxColor} onChange={updateField} />
              <ThemeColor label="Border" name="themeBorderColor" value={profile.themeBorderColor} onChange={updateField} />
              <ThemeColor label="Header/Accent" name="themeHeaderColor" value={profile.themeHeaderColor} onChange={updateField} />
            </section>

            <section className="theme-control-group">
              <h3>Font</h3>
              <label>
                Font family
                <select name="themeFontFamily" value={profile.themeFontFamily} onChange={updateField}>
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </label>
            </section>

            <section className="theme-control-group">
              <h3>Background image behavior</h3>
              <SelectInput
                label="Background repeat"
                name="themeBackgroundRepeat"
                value={profile.themeBackgroundRepeat}
                options={backgroundRepeatOptions}
                onChange={updateField}
              />
              <SelectInput
                label="Background size"
                name="themeBackgroundSize"
                value={profile.themeBackgroundSize}
                options={backgroundSizeOptions}
                onChange={updateField}
              />
              <SelectInput
                label="Background position"
                name="themeBackgroundPosition"
                value={profile.themeBackgroundPosition}
                options={backgroundPositionOptions}
                onChange={updateField}
              />
            </section>
          </div>

          <div
            className="profile-preview-panel"
            style={{
              background: profile.themeBackgroundColor,
              backgroundImage: previewBackgroundUrl ? `url(${previewBackgroundUrl})` : undefined,
              backgroundRepeat: profile.themeBackgroundRepeat,
              backgroundSize: profile.themeBackgroundSize,
              backgroundPosition: profile.themeBackgroundPosition,
              color: profile.themeTextColor,
              borderColor: profile.themeBorderColor,
              fontFamily: profile.themeFontFamily
            }}
          >
            <h3 style={{ background: profile.themeHeaderColor }}>Live Profile Preview</h3>
            <p className="profile-preview-layout-label">
              Layout: {getLayoutPresetLabel(profile.layoutPreset)} | Theme: {getThemePresetName(profile)} | Font: {fontLabelForValue(profile.themeFontFamily)}
            </p>
            <div className="profile-preview-identity" style={{ background: profile.themeBoxColor, borderColor: profile.themeBorderColor }}>
              {previewAvatarUrl ? (
                <img
                  src={previewAvatarUrl}
                  alt={`${profile.displayName || currentUser.username} preview`}
                  className="profile-preview-avatar"
                />
              ) : (
                <div className="profile-preview-avatar-placeholder">No Avatar</div>
              )}
              <div>
                <strong>{profile.displayName || currentUser.username}</strong>
                <span>@{currentUser.username}</span>
                <p><b>Mood:</b> {profile.mood || 'mysterious'}</p>
                <p><b>Status:</b> {profile.statusMessage || 'typing a mysterious away message...'}</p>
              </div>
            </div>
            <div className="profile-preview-box" style={{ background: profile.themeBoxColor, borderColor: profile.themeBorderColor }}>
              <strong>{profile.headline || 'Your headline goes here.'}</strong>
              <p>{profile.aboutMe || 'About Me preview text will show up here as you type.'}</p>
            </div>
            <div className="profile-preview-box" style={{ background: profile.themeBoxColor, borderColor: profile.themeBorderColor }}>
              <strong>Section Order</strong>
              <div className="section-stack-preview">
                {normalizeSectionOrder(profile.sectionOrder).map((sectionKey) => (
                  <span key={sectionKey}>{sectionLabels[sectionKey]}</span>
                ))}
              </div>
            </div>
            <div className="profile-preview-box profile-song-preview" style={{ background: profile.themeBoxColor, borderColor: profile.themeBorderColor }}>
              <strong>Now Playing</strong>
              <p>
                {profile.profileSongTitle || profile.profileSongArtist || profile.profileSongUrl
                  ? getSongSummary(profile)
                  : 'No profile song yet. The jukebox is dusty.'}
              </p>
              <span className="music-service-label">{detectMusicService(profile.profileSongUrl)}</span>
              {isHttpUrl(profile.profileSongUrl) && (
                <a href={profile.profileSongUrl} target="_blank" rel="noopener noreferrer">Open music link</a>
              )}
              {getSafeYouTubeEmbedUrl(profile.profileSongUrl) && (
                <div className="youtube-preview-frame youtube-preview-frame--small">
                  <iframe
                    src={getSafeYouTubeEmbedUrl(profile.profileSongUrl)}
                    title={`YouTube preview for ${getSongSummary(profile)}`}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
            <div className="profile-preview-box" style={{ background: profile.themeBoxColor, borderColor: profile.themeBorderColor }}>
              <strong>Top 8 Preview</strong>
              <div className="profile-preview-friends">
                {['Tom', 'Byte', 'Null', 'Crash'].map((friend) => (
                  <span key={friend} style={{ borderColor: profile.themeBorderColor }}>{friend}</span>
                ))}
              </div>
            </div>
          </div>

          {/*
            This save button submits the profile-form above via the HTML `form` attribute.
            It is outside the <form> element but still wired to it.
            This way users who focus on the theme panel see a save button here too.
          */}
          <button
            type="submit"
            form="profile-form"
            className="save-profile-button"
            disabled={status === 'saving'}
          >
            {status === 'saving' ? 'Saving…' : 'Save Profile'}
          </button>
          <Link className="view-profile-link" to={`/profile/${currentUser.username}`}>View your profile</Link>

          {/* Image uploaders — completely outside the <form> */}
          <ImageUploader
            label="Profile Picture"
            fieldName="avatar"
            currentUrl={currentAvatarUrl}
            onUpload={async (file) => {
              const url = await uploadAvatar(file);
              setProfile((current) => ({ ...current, profileImageUrl: url }));
              setCurrentAvatarUrl(url);
              return url;
            }}
          />
          <ImageUploader
            label="Background Image"
            fieldName="background"
            currentUrl={currentBackgroundUrl}
            onUpload={async (file) => {
              const url = await uploadBackground(file);
              setProfile((current) => ({ ...current, backgroundImageUrl: url }));
              setCurrentBackgroundUrl(url);
              return url;
            }}
          />
        </aside>

      </div>
    </main>
  );
}
