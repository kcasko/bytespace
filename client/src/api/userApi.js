const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export async function searchUsers({ query = '', sort = 'newest', hasMusic = false, hasStatus = false } = {}) {
  const params = new URLSearchParams();
  const trimmedQuery = String(query || '').trim().slice(0, 80);

  if (trimmedQuery) params.set('q', trimmedQuery);
  if (sort) params.set('sort', sort);
  if (hasMusic) params.set('hasMusic', 'true');
  if (hasStatus) params.set('hasStatus', 'true');

  const response = await fetch(`${API_BASE_URL}/api/users/search?${params.toString()}`, {
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'User search failed.');
  }

  return data.users;
}
