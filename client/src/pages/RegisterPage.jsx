import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/authApi.js';

export default function RegisterPage({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', inviteCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const registrationClosed = error.toLowerCase().includes('registration is currently closed');

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await register(form);
      onAuth(data.user);
      navigate(`/profile/${data.user.username}`);
    } catch (err) {
      const message = err.message || 'Registration failed.';
      if (message.toLowerCase().includes('invite')) {
        setShowInviteCode(true);
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-panel">
        <h1>Register</h1>
        <p className="auth-note">Claim a corner of the loud internet.</p>
        {registrationClosed && (
          <p className="auth-note">New page creation is closed right now. Existing users can still log in.</p>
        )}
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input
              name="username"
              value={form.username}
              onChange={updateField}
              autoComplete="username"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
            />
          </label>
          {showInviteCode && (
            <label>
              Invite Code
              <input
                name="inviteCode"
                type="password"
                value={form.inviteCode}
                onChange={updateField}
                autoComplete="off"
              />
            </label>
          )}
          <button type="submit" disabled={submitting || registrationClosed}>
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-switch">
          Already have a page? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
