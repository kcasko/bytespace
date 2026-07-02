const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function adminFetch(path, options = {}) {
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
    throw new Error(data.error || 'Admin request failed.');
  }

  return data;
}

export function getAdminUsers(query = '') {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  return adminFetch(`/api/admin/users${params}`);
}

export function getRecentSignups() {
  return adminFetch('/api/admin/recent/signups');
}

export function getRecentComments() {
  return adminFetch('/api/admin/recent/comments');
}

export function getRecentBulletins() {
  return adminFetch('/api/admin/recent/bulletins');
}

export function suspendUser(username, reason = '') {
  return adminFetch(`/api/admin/users/${encodeURIComponent(username)}/suspend`, {
    method: 'PUT',
    body: JSON.stringify({ reason })
  });
}

export function unsuspendUser(username) {
  return adminFetch(`/api/admin/users/${encodeURIComponent(username)}/unsuspend`, {
    method: 'PUT',
    body: JSON.stringify({})
  });
}

export function deleteAdminComment(id) {
  return adminFetch(`/api/admin/comments/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({})
  });
}

export function deleteAdminBulletin(id) {
  return adminFetch(`/api/admin/bulletins/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({})
  });
}


export function getAdminReports(status = '') {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  return adminFetch(`/api/admin/reports${params}`);
}

export function updateReportStatus(id, { status, adminNote = '' }) {
  return adminFetch(`/api/admin/reports/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, adminNote })
  });
}


export function getAuditLogs({ action = '', targetType = '', limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (targetType) params.set('targetType', targetType);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return adminFetch(`/api/admin/audit-logs${query ? `?${query}` : ''}`);
}
