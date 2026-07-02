const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export const reportReasons = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' }
];

export async function submitReport(input) {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Report could not be submitted.');
  }

  return data;
}
