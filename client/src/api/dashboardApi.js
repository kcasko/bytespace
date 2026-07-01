const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export async function getMyDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/me`, {
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Dashboard request failed.');
  }

  return data;
}
