const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function dmFetch(path, options = {}) {
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
    throw new Error(data.error || 'Messages request failed.');
  }

  return data;
}

export function getConversations() {
  return dmFetch('/api/dms/conversations');
}

export function startConversation(recipientUsername) {
  return dmFetch('/api/dms/conversations', {
    method: 'POST',
    body: JSON.stringify({ recipientUsername })
  });
}

export function getMessages(conversationId) {
  return dmFetch(`/api/dms/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId, body) {
  return dmFetch(`/api/dms/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
}

export function deleteMessage(messageId) {
  return dmFetch(`/api/dms/messages/${messageId}`, {
    method: 'DELETE',
    body: JSON.stringify({})
  });
}
