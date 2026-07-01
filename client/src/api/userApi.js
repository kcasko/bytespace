const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export async function searchUsers(query = '') {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set('q', query.trim());
  }

  const response = await fetch(`${API_BASE_URL}/api/users/search?${params.toString()}`, {
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'User search failed.');
  }

  return data.users;
}
