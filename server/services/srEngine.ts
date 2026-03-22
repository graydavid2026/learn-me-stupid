// Spaced Repetition Engine
// Timezone: America/Indiana/Indianapolis (Eastern, no DST shenanigans)
// Rules:
//   - Early practice does NOT push schedule further out
//   - Cards must be reviewed within their tier's window or drop 1 tier
//   - Missing 2+ consecutive windows drops additional tiers
//   - 60 days no engagement → full reset to tier 0

const TZ = 'America/Indiana/Indianapolis';

export const TIER_INTERVALS_MS: Record<number, number> = {
  0: 0,
  1: 4 * 60 * 60 * 1000,         // 4 hours
  2: 24 * 60 * 60 * 1000,        // 1 day
  3: 2 * 24 * 60 * 60 * 1000,    // 2 days
  4: 7 * 24 * 60 * 60 * 1000,    // 1 week
  5: 14 * 24 * 60 * 60 * 1000,   // 2 weeks
  6: 30 * 24 * 60 * 60 * 1000,   // 1 month
  7: 90 * 24 * 60 * 60 * 1000,   // 3 months
  8: 180 * 24 * 60 * 60 * 1000,  // 6 months
};

// Grace period: how long after due date before decay kicks in
// For each tier, you get 1x the interval as grace period
// e.g., tier 4 (1 week interval) → 1 week grace → drops after 2 weeks overdue
const GRACE_MULTIPLIER = 1.0;

export const TIER_LABELS: Record<number, string> = {
  0: 'New', 1: '4h', 2: '1d', 3: '2d', 4: '1w', 5: '2w', 6: '1mo', 7: '3mo', 8: '6mo',
};

/** Get current time in Indiana */
export function nowIndiana(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/** Get ISO string for "now" in Indiana context */
function nowISO(): string {
  return new Date().toISOString();
}

/** Get today's date string in Indiana timezone (YYYY-MM-DD) */
export function todayIndiana(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // en-CA gives YYYY-MM-DD
}

export function calculateNextDue(tier: number): string {
  const interval = TIER_INTERVALS_MS[Math.min(tier, 8)] ?? TIER_INTERVALS_MS[8];
  return new Date(Date.now() + interval).toISOString();
}

export function isAlreadyReviewedToday(lastReviewedAt: string | null): boolean {
  if (!lastReviewedAt) return false;
  const lastReviewDate = new Date(lastReviewedAt).toLocaleDateString('en-CA', { timeZone: TZ });
  const today = todayIndiana();
  return lastReviewDate === today;
}

/**
 * Calculate decayed tier based on how overdue a card is.
 * Rules:
 *   - Not overdue → no decay (even if absent for months — only due cards decay)
 *   - No due date set → no decay
 *   - Overdue by 1x grace period (1x interval) → drop 1 tier
 *   - Each additional grace period missed → drop 1 more tier
 *   - High tiers (6mo/3mo) are hard-won — cap decay at half the tier (round up)
 *     e.g., tier 8 (6mo) can only decay to tier 4 max, not to 0
 *   - Lower tiers (1-4) can decay to 0 normally
 */
export function calculateDecayedTier(currentTier: number, nextDueAt: string | null): number {
  // No due date or already tier 0 → no decay
  if (!nextDueAt || currentTier === 0) return currentTier;

  const now = Date.now();
  const due = new Date(nextDueAt).getTime();

  // Not overdue → no decay, regardless of how long until next review
  if (now <= due) return currentTier;

  const overdueMs = now - due;

  // Grace period = 1x the tier's interval
  const tierInterval = TIER_INTERVALS_MS[currentTier] || TIER_INTERVALS_MS[1];
  const graceMs = tierInterval * GRACE_MULTIPLIER;

  if (graceMs <= 0) return currentTier;

  // Each full grace period missed = 1 tier drop
  const drops = Math.floor(overdueMs / graceMs);
  if (drops === 0) return currentTier;

  // For high tiers (6+), cap decay at halfway — these were hard-won
  // Tier 8 (6mo) → min tier 4. Tier 7 (3mo) → min tier 4. Tier 6 (1mo) → min tier 3.
  const minTier = currentTier >= 6
    ? Math.ceil(currentTier / 2)
    : 0;

  return Math.max(minTier, currentTier - drops);
}

export interface ReviewResult {
  newTier: number;
  nextDueAt: string;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  scheduleLocked: boolean;
}

/**
 * Process a review.
 * Key rule: Early practice does NOT push the schedule further out.
 * If a card is reviewed before it's due, the existing due date stays.
 * Only when a card IS due (or overdue) does a correct answer advance the schedule.
 */
export function processReview(
  result: 'correct' | 'wrong',
  currentTier: number,
  consecutiveCorrect: number,
  consecutiveWrong: number,
  lastReviewedAt: string | null,
  nextDueAt: string | null
): ReviewResult {
  const alreadyReviewedToday = isAlreadyReviewedToday(lastReviewedAt);
  const now = Date.now();
  const isDue = !nextDueAt || new Date(nextDueAt).getTime() <= now;

  let newTier = currentTier;
  let newConsecutiveCorrect = consecutiveCorrect;
  let newConsecutiveWrong = consecutiveWrong;

  if (result === 'correct') {
    newConsecutiveCorrect = consecutiveCorrect + 1;
    newConsecutiveWrong = 0;
    // Only promote if the card is actually due (not early practice)
    if (isDue) {
      newTier = Math.min(currentTier + 1, 8);
    }
  } else {
    // Wrong answer
    newConsecutiveWrong = consecutiveWrong + 1;
    newConsecutiveCorrect = 0;

    if (consecutiveWrong >= 1) {
      // Second consecutive wrong → demote
      newTier = Math.max(currentTier - 1, 0);
      newConsecutiveWrong = 0;
    }
  }

  // Schedule logic:
  // - If already reviewed today → lock schedule (daily touch rule)
  // - If early practice (not due) → keep existing schedule, don't push out
  // - If due/overdue and correct → set new schedule from new tier
  // - If due/overdue and wrong → set new schedule from current/demoted tier
  let newNextDueAt: string;
  let scheduleLocked = false;

  if (alreadyReviewedToday) {
    scheduleLocked = true;
    newNextDueAt = nextDueAt || calculateNextDue(newTier);
  } else if (!isDue && result === 'correct') {
    // Early practice — keep existing schedule, don't push out
    scheduleLocked = true;
    newNextDueAt = nextDueAt || calculateNextDue(newTier);
  } else {
    // Card is due/overdue — set new schedule
    newNextDueAt = calculateNextDue(newTier);
  }

  return {
    newTier,
    nextDueAt: newNextDueAt,
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveWrong: newConsecutiveWrong,
    scheduleLocked,
  };
}
