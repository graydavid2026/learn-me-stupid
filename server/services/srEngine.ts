// Spaced Repetition Engine — exact spec from CLAUDE.md

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

export const TIER_LABELS: Record<number, string> = {
  0: 'New', 1: '4h', 2: '1d', 3: '2d', 4: '1w', 5: '2w', 6: '1mo', 7: '3mo', 8: '6mo',
};

export function calculateNextDue(tier: number): string {
  const interval = TIER_INTERVALS_MS[Math.min(tier, 8)] ?? TIER_INTERVALS_MS[8];
  return new Date(Date.now() + interval).toISOString();
}

export function isAlreadyReviewedToday(lastReviewedAt: string | null): boolean {
  if (!lastReviewedAt) return false;
  const lastReview = new Date(lastReviewedAt);
  const now = new Date();
  return (
    lastReview.getFullYear() === now.getFullYear() &&
    lastReview.getMonth() === now.getMonth() &&
    lastReview.getDate() === now.getDate()
  );
}

export function calculateDecayedTier(currentTier: number, nextDueAt: string | null): number {
  if (!nextDueAt || currentTier === 0) return currentTier;

  const now = Date.now();
  const due = new Date(nextDueAt).getTime();
  if (now <= due) return currentTier; // not overdue

  const overdueDays = Math.floor((now - due) / 86_400_000);

  // 60 days no engagement → full reset
  if (overdueDays >= 60) return 0;

  // Every 28 days overdue → drop 1 tier
  const drops = Math.floor(overdueDays / 28);
  return Math.max(0, currentTier - drops);
}

export interface ReviewResult {
  newTier: number;
  nextDueAt: string;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  scheduleLocked: boolean; // true if already reviewed today
}

export function processReview(
  result: 'correct' | 'wrong',
  currentTier: number,
  consecutiveCorrect: number,
  consecutiveWrong: number,
  lastReviewedAt: string | null
): ReviewResult {
  const alreadyReviewedToday = isAlreadyReviewedToday(lastReviewedAt);

  let newTier = currentTier;
  let newConsecutiveCorrect = consecutiveCorrect;
  let newConsecutiveWrong = consecutiveWrong;

  if (result === 'correct') {
    newConsecutiveCorrect = consecutiveCorrect + 1;
    newConsecutiveWrong = 0;
    newTier = Math.min(currentTier + 1, 8); // promote
  } else {
    // Wrong answer
    newConsecutiveWrong = consecutiveWrong + 1;
    newConsecutiveCorrect = 0;

    if (consecutiveWrong >= 1) {
      // Second consecutive wrong (or more) → demote
      newTier = Math.max(currentTier - 1, 0);
      newConsecutiveWrong = 0; // reset after demotion
    }
    // else: first wrong → stay at current tier
  }

  // Calculate next due date
  // Only set if NOT already reviewed today (daily touch rule)
  const nextDueAt = alreadyReviewedToday
    ? '' // won't be used, but signal that schedule is locked
    : calculateNextDue(newTier);

  return {
    newTier,
    nextDueAt,
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveWrong: newConsecutiveWrong,
    scheduleLocked: alreadyReviewedToday,
  };
}
