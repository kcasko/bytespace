import { Router } from 'express';
import { createReport, reportReasons } from '../db/reportQueries.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = Router();
const targetTypes = new Set(['profile', 'comment', 'bulletin']);
const MAX_DETAILS_LENGTH = 1000;

function validateReportInput(body) {
  const targetType = String(body?.targetType || '').trim();
  const reason = String(body?.reason || '').trim();
  const details = String(body?.details || '').trim();
  const targetUsername = String(body?.targetUsername || '').trim().toLowerCase();
  const targetId = Number(body?.targetId);

  if (!targetTypes.has(targetType)) {
    return { error: 'targetType is not supported.' };
  }

  if (!reportReasons.has(reason)) {
    return { error: 'A valid report reason is required.' };
  }

  if (details.length > MAX_DETAILS_LENGTH) {
    return { error: `Report details must be ${MAX_DETAILS_LENGTH} characters or less.` };
  }

  if (targetType === 'profile') {
    if (!targetUsername) {
      return { error: 'targetUsername is required for profile reports.' };
    }

    return { input: { targetType, targetUsername, reason, details } };
  }

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return { error: 'targetId is required for this report type.' };
  }

  return { input: { targetType, targetId, reason, details } };
}

router.post('/', sessionMiddleware, requireAuth, async (req, res) => {
  const validation = validateReportInput(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const result = await createReport(req.session.user.id, validation.input);

    if (result.duplicate) {
      return res.status(409).json({ error: 'You already have an open report for this item.' });
    }

    return res.status(201).json({ status: 'ok', reportId: result.reportId });
  } catch (error) {
    console.error('Failed to create report:', { code: error.code, message: error.message });
    return res.status(500).json({ error: 'Report could not be submitted.' });
  }
});

export default router;
