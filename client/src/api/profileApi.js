const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function getProfile(username) {
  const response = await fetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(username)}`, {
    credentials: 'include'
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Profile not found or server unavailable.');
  }

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

/**
 * Upload a profile picture (avatar).
 * @param {File} file - The image File object from a file input.
 * @returns {Promise<string>} The public URL of the saved avatar.
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`${API_BASE_URL}/api/profile/me/avatar`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Avatar upload failed.');
  }

  return data.profileImageUrl;
}

/**
 * Upload a background image.
 * @param {File} file - The image File object from a file input.
 * @returns {Promise<string>} The public URL of the saved background image.
 */
export async function uploadBackground(file) {
  const formData = new FormData();
  formData.append('background', file);

  const response = await fetch(`${API_BASE_URL}/api/profile/me/background`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Background upload failed.');
  }

  return data.backgroundImageUrl;
}
