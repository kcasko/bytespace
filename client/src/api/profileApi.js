const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function getProfile(username) {
  const response = await fetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(username)}`);

  if (!response.ok) {
    throw new Error('Profile not found or server unavailable.');
  }

  const data = await response.json();
  return data.profile;
}
