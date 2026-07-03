import { query } from './pool.js';

let onboardingColumnsAvailable = null;

async function hasOnboardingColumns() {
  if (onboardingColumnsAvailable !== null) {
    return onboardingColumnsAvailable;
  }

  const result = await query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'onboarding_completed_at'
    LIMIT 1
  `);

  onboardingColumnsAvailable = result.rowCount > 0;
  return onboardingColumnsAvailable;
}

function mapStatus(row, hasColumns) {
  if (!hasColumns) {
    return {
      isComplete: true,
      completedAt: null,
      currentStep: null,
      unavailable: true
    };
  }

  return {
    isComplete: Boolean(row?.onboarding_completed_at),
    completedAt: row?.onboarding_completed_at || null,
    currentStep: row?.last_seen_onboarding_step || null
  };
}

export async function getOnboardingStatus(userId) {
  const hasColumns = await hasOnboardingColumns();

  if (!hasColumns) {
    return mapStatus(null, false);
  }

  const result = await query(
    `
      SELECT onboarding_completed_at, last_seen_onboarding_step
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return mapStatus(result.rows[0], true);
}

export async function completeOnboarding(userId) {
  const hasColumns = await hasOnboardingColumns();

  if (!hasColumns) {
    return mapStatus(null, false);
  }

  const result = await query(
    `
      UPDATE users
      SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
          last_seen_onboarding_step = 'complete',
          updated_at = NOW()
      WHERE id = $1
      RETURNING onboarding_completed_at, last_seen_onboarding_step
    `,
    [userId]
  );

  return mapStatus(result.rows[0], true);
}

export async function updateOnboardingStep(userId, step) {
  const hasColumns = await hasOnboardingColumns();

  if (!hasColumns) {
    return mapStatus(null, false);
  }

  const normalizedStep = String(step || '').trim().slice(0, 40) || null;
  const result = await query(
    `
      UPDATE users
      SET last_seen_onboarding_step = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING onboarding_completed_at, last_seen_onboarding_step
    `,
    [userId, normalizedStep]
  );

  return mapStatus(result.rows[0], true);
}
