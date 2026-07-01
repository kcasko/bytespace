const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function friendFetch(path, options = {}) {
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
    throw new Error(data.error || 'Friend request failed.');
  }

  return data;
}

export async function getFriends() {
  const data = await friendFetch('/api/friends');
  return data.friends;
}

export async function getFriendRequests() {
  return friendFetch('/api/friends/requests');
}

export async function sendFriendRequest(username) {
  return friendFetch(`/api/friends/request/${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function acceptFriendRequest(username) {
  return friendFetch(`/api/friends/accept/${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function rejectFriendRequest(username) {
  return friendFetch(`/api/friends/reject/${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function getTopFriends() {
  const data = await friendFetch('/api/friends/top');
  return data.topFriends;
}

export async function updateTopFriends(friendUserIds) {
  const data = await friendFetch('/api/friends/top', {
    method: 'PUT',
    body: JSON.stringify({ friendUserIds })
  });

  return data.topFriends;
}
