const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function blockFetch(path, options = {}) {
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
    throw new Error(data.error || 'Block request failed.');
  }

  return data;
}

export async function getBlockedUsers() {
  const data = await blockFetch('/api/blocks');
  return data.blockedUsers;
}

export async function blockUser(username) {
  return blockFetch(`/api/blocks/${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function unblockUser(username) {
  return blockFetch(`/api/blocks/${encodeURIComponent(username)}`, {
    method: 'DELETE'
  });
}
