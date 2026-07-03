const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

async function onboardingFetch(path, options = {}) {
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
    throw new Error(data.error || 'Onboarding request failed.');
  }

  return data.onboarding;
}

export async function getOnboardingStatus() {
  return onboardingFetch('/api/onboarding/status');
}

export async function completeOnboarding() {
  return onboardingFetch('/api/onboarding/complete', {
    method: 'PUT',
    body: JSON.stringify({})
  });
}

export async function updateOnboardingStep(step) {
  return onboardingFetch('/api/onboarding/step', {
    method: 'PUT',
    body: JSON.stringify({ step })
  });
}
