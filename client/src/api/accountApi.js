const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function accountFetch(path, options = {}) {
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
    throw new Error(data.error || 'Account request failed.');
  }

  return data;
}

export async function getAccountSettings() {
  const data = await accountFetch('/api/account/settings');
  return data.account;
}

export async function updateAccountPreferences(preferences) {
  const data = await accountFetch('/api/account/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences)
  });
  return data.account;
}

export async function changePassword({ currentPassword, newPassword }) {
  return accountFetch('/api/account/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}
