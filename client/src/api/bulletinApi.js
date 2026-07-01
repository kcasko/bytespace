const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function bulletinFetch(path, options = {}) {
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
    throw new Error(data.error || 'Bulletin request failed.');
  }

  return data;
}

export async function getUserBulletins(username) {
  const data = await bulletinFetch(`/api/bulletins/user/${encodeURIComponent(username)}`);
  return data.bulletins;
}

export async function getMyBulletins() {
  const data = await bulletinFetch('/api/bulletins/me');
  return data.bulletins;
}

export async function getFriendBulletins() {
  const data = await bulletinFetch('/api/bulletins/friends');
  return data.bulletins;
}

export async function createBulletin({ title, body }) {
  const data = await bulletinFetch('/api/bulletins', {
    method: 'POST',
    body: JSON.stringify({ title, body })
  });

  return data.bulletin;
}

export async function deleteBulletin(id) {
  return bulletinFetch(`/api/bulletins/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
