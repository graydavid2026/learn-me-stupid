// Spaced Repetition Engine — 13-Slot System
// Reference: docs/spaced-repetition-spec.md
// Timezone: America/Indiana/Indianapolis

const TZ = 'America/Indiana/Indianapolis';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// Slot intervals in milliseconds
export const SLOT_INTERVALS_MS: Record<number, number> = {
  1: 5 * 60 * 1000,       // 5 minutes
  2: 1 * HOUR,            // 1 hour
  3: 4 * HOUR,            // 4 hours
  4: 1 * DAY,             // 24 hours
  5: 2 * DAY,             // 48 hours
  6: 1 * WEEK,            // 1 week
  7: 2 * WEEK,            // 2 weeks
  8: 4 * WEEK,            // 4 weeks
  9: 8 * WEEK,            // 8 weeks
  10: 90 * DAY,           // 3 months
  11: 180 * DAY,          // 6 months
  12: 270 * DAY,          // 9 months
  13: 365 * DAY,          // 1 year
};

// Grace periods per slot in milliseconds
export const SLOT_GRACE_MS: Record<number, number> = {
  1: 2 * HOUR,            // 2 hours
  2: 2 * HOUR,            // 2 hours
  3: 2 * HOUR,            // 2 hours
  4: 1 * DAY,             // 24 hours
  5: 1 * DAY,             // 24 hours
  6: 1 * DAY,             // 24 hours
  7: 3 * DAY,             // 72 hours
  8: 3 * DAY,             // 72 hours
  9: 3 * DAY,             // 72 hours
  10: 2 * WEEK,           // 2 weeks
  11: 2 * WEEK,           // 2 weeks
  12: 4 * WEEK,           // 4 weeks
  13: 4 * WEEK,           // 4 weeks
};

// Tranche assignments
export const SLOT_TRANCHE: Record<number, number> = {
  1: 1, 2: 1, 3: 1,                     // Immediate Recall
  4: 2, 5: 2, 6: 2,                     // Short-Term
  7: 3, 8: 3, 9: 3,                     // Medium-Term
  10: 4, 11: 4,                          // Long-Term
  12: 5, 13: 5,                          // Mastery
};

export const TRANCHE_NAMES: Record<number, string> = {
  1: 'Immediate Recall',
  2: 'Short-Term',
  3: 'Medium-Term',
  4: 'Long-Term',
  5: 'Mastery',
};

export const SLOT_LABELS: Record<number, string> = {
  0: 'New',
  1: '5m', 2: '1h', 3: '4h',
  4: '1d', 5: '2d', 6: '1w',
  7: '2w', 8: '4w', 9: '8w',
  10: '3mo', 11: '6mo',
  12: '9mo', 13: '1yr',
};

// Slots 1–3 (5m / 1h / 4h) are retired — the minimum interval is 1 day.
// A correct answer on a new card promotes straight to slot 4; wrong
// answers on existing cards floor at slot 4 instead of cascading to
// sub-day intervals. Slots 1–3 remain in SLOT_INTERVALS_MS for
// historical review-log entries only.
export const MIN_SLOT = 4;
export const MAX_SLOT = 13;

/** Get current time in Indiana */
export function nowIndiana(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/** Get today's date string in Indiana timezone (YYYY-MM-DD) */
export function todayIndiana(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Calculate next due date from now + slot interval */
export function calculateNextDue(slot: number): string {
  const interval = SLOT_INTERVALS_MS[Math.min(Math.max(slot, MIN_SLOT), MAX_SLOT)];
  return new Date(Date.now() + interval).toISOString();
}

/** Calculate grace deadline = dueDate + grace period for the slot */
export function calculateGraceDeadline(nextDueAt: string, slot: number): string {
  const dueMs = new Date(nextDueAt).getTime();
  const grace = SLOT_GRACE_MS[Math.min(Math.max(slot, MIN_SLOT), MAX_SLOT)];
  return new Date(dueMs + grace).toISOString();
}

/** Check if a card is currently due (past due date but within or past grace) */
export function isDue(nextDueAt: string | null): boolean {
  if (!nextDueAt) return true; // New card, never scheduled
  return Date.now() >= new Date(nextDueAt).getTime();
}

/** Check if a card is past its grace deadline */
export function isPastGrace(nextDueAt: string | null, slot: number): boolean {
  if (!nextDueAt || slot <= 0) return false;
  const dueMs = new Date(nextDueAt).getTime();
  const grace = SLOT_GRACE_MS[Math.min(Math.max(slot, MIN_SLOT), MAX_SLOT)];
  return Date.now() > dueMs + grace;
}

/**
 * Cascade regression for a card that has been neglected.
 * Steps down one slot at a time, recalculating from each slot,
 * until the card is within a valid grace window or hits Slot 1.
 *
 * Returns the new slot after all regressions.
 */
export function calculateCascadeRegression(currentSlot: number, nextDueAt: string | null): number {
  if (!nextDueAt || currentSlot <= 0) return currentSlot;

  let slot = currentSlot;
  let dueMs = new Date(nextDueAt).getTime();
  const now = Date.now();

  while (slot > MIN_SLOT) {
    const grace = SLOT_GRACE_MS[slot] || SLOT_GRACE_MS[MIN_SLOT];
    const graceDeadline = dueMs + grace;

    if (now <= graceDeadline) {
      // Within grace window for this slot — stop regressing
      break;
    }

    // Past grace deadline — regress one slot
    slot--;

    // Recalculate due date as if the regression happened at the grace deadline
    // New due = graceDeadline + new slot's interval
    const newInterval = SLOT_INTERVALS_MS[slot] || SLOT_INTERVALS_MS[MIN_SLOT];
    dueMs = graceDeadline + newInterval;
  }

  // If we're at slot 1 and still past grace, stay at slot 1 (floor rule)
  return Math.max(slot, MIN_SLOT);
}

export interface ReviewResult {
  newSlot: number;
  nextDueAt: string | null;
  graceDeadline: string | null;
  scheduleLocked: boolean;
  reviewType: 'standard' | 'early';
}

/**
 * Process a review event.
 *
 * Rules from spec:
 * - Correct within grace → advance to next slot
 * - Correct AFTER grace expired → regress one slot, restart clock
 * - Wrong at any time → regress one slot, restart clock
 * - Early review (not yet due) → log but don't alter schedule
 */
export function processReview(
  result: 'correct' | 'wrong',
  currentSlot: number,
  nextDueAt: string | null
): ReviewResult {
  const now = Date.now();
  const cardIsDue = isDue(nextDueAt);
  const isNew = currentSlot === 0; // Never been reviewed

  // Early review — card not yet due
  if (!isNew && !cardIsDue) {
    return {
      newSlot: currentSlot,
      nextDueAt: nextDueAt!,
      graceDeadline: calculateGraceDeadline(nextDueAt!, currentSlot),
      scheduleLocked: true,
      reviewType: 'early',
    };
  }

  let newSlot: number;

  if (isNew) {
    if (result === 'correct') {
      // First correct → enter the SR cycle at slot 4 (1d).
      newSlot = MIN_SLOT;
    } else {
      // Wrong on a new card — stay at slot 0, no schedule yet. The card
      // remains in the "Learn New" pool. The user must get it right at
      // least once before it advances into the review cycle.
      return {
        newSlot: 0,
        nextDueAt: null,
        graceDeadline: null,
        scheduleLocked: false,
        reviewType: 'standard',
      };
    }
  } else if (result === 'correct') {
    // Check if within grace period
    const pastGrace = isPastGrace(nextDueAt, currentSlot);
    if (pastGrace) {
      // Correct but too late — regress one slot
      newSlot = Math.max(currentSlot - 1, MIN_SLOT);
    } else {
      // Correct within grace — advance
      newSlot = Math.min(currentSlot + 1, MAX_SLOT);
    }
  } else {
    // Wrong — regress one slot
    newSlot = Math.max(currentSlot - 1, MIN_SLOT);
  }

  const newNextDueAt = calculateNextDue(newSlot);
  const newGraceDeadline = calculateGraceDeadline(newNextDueAt, newSlot);

  return {
    newSlot,
    nextDueAt: newNextDueAt,
    graceDeadline: newGraceDeadline,
    scheduleLocked: false,
    reviewType: 'standard',
  };
}
