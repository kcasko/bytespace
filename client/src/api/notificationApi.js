const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function notificationFetch(path, options = {}) {
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
    throw new Error(data.error || 'Notification request failed.');
  }

  return data;
}

export async function getNotifications() {
  return notificationFetch('/api/notifications');
}

export async function getUnreadNotificationCount() {
  const data = await notificationFetch('/api/notifications/unread-count');
  return data.unreadCount;
}

export async function markNotificationRead(id) {
  const data = await notificationFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
    body: JSON.stringify({})
  });

  return data.notification;
}

export async function markAllNotificationsRead() {
  return notificationFetch('/api/notifications/read-all', {
    method: 'PUT',
    body: JSON.stringify({})
  });
}
