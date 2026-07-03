import { Router } from 'express';
import { completeOnboarding, getOnboardingStatus, updateOnboardingStep } from '../db/onboardingQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();

router.use(sessionMiddleware, requireAuth);

router.get('/status', async (req, res) => {
  try {
    const onboarding = await getOnboardingStatus(req.session.user.id);
    return res.json({ onboarding });
  } catch (error) {
    console.error('Failed to load onboarding status:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Onboarding status unavailable.' });
  }
});

router.put('/complete', async (req, res) => {
  try {
    const onboarding = await completeOnboarding(req.session.user.id);
    req.session.user = {
      ...req.session.user,
      onboardingCompletedAt: onboarding.completedAt,
      lastSeenOnboardingStep: onboarding.currentStep
    };
    return res.json({ onboarding });
  } catch (error) {
    console.error('Failed to complete onboarding:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Onboarding could not be completed.' });
  }
});

router.put('/step', async (req, res) => {
  try {
    const onboarding = await updateOnboardingStep(req.session.user.id, req.body?.step);
    req.session.user = {
      ...req.session.user,
      lastSeenOnboardingStep: onboarding.currentStep
    };
    return res.json({ onboarding });
  } catch (error) {
    console.error('Failed to update onboarding step:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Onboarding step could not be saved.' });
  }
});

export default router;
