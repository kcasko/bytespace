const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function authFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Authentication request failed.');
  }

  return data;
}

export async function register({ username, email, password, inviteCode }) {
  return authFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, inviteCode })
  });
}

export async function login({ emailOrUsername, password }) {
  return authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername, password })
  });
}

export async function logout() {
  return authFetch('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function getMe() {
  return authFetch('/api/auth/me');
}
