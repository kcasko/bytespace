const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function getProfile(username) {
  const response = await fetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(username)}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Profile not found or server unavailable.');
  }

  const data = await response.json();
  return data.profile;
}

export async function getMyProfile() {
  const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Profile not found or server unavailable.');
  }

  return data.profile;
}

export async function updateMyProfile(profileInput) {
  const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileInput)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Profile update failed.');
  }

  return data.profile;
}
