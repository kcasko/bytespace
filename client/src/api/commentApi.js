const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function getComments(username) {
  const response = await fetch(`${API_BASE_URL}/api/comments/${encodeURIComponent(username)}`, {
    credentials: 'include'
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Comments unavailable.');
  }

  return data.comments;
}

export async function postComment(username, body) {
  const response = await fetch(`${API_BASE_URL}/api/comments/${encodeURIComponent(username)}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Comment could not be posted.');
  }

  return data.comment;
}
