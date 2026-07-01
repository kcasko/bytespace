const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function settingsFetch(path, options = {}) {
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
    throw new Error(data.error || 'Settings request failed.');
  }

  return data;
}

export async function getMySettings() {
  const data = await settingsFetch('/api/settings/me');
  return data.settings;
}

export async function updateMySettings(settingsInput) {
  const data = await settingsFetch('/api/settings/me', {
    method: 'PUT',
    body: JSON.stringify(settingsInput)
  });

  return data.settings;
}
