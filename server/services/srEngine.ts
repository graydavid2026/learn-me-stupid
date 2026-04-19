// Spaced Repetition Engine — 13-Slot System with In-Session Learning + SM-2 Ease
// Reference: docs/spaced-repetition-spec.md
// Timezone: America/Indiana/Indianapolis

const TZ = 'America/Indiana/Indianapolis';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// Slot intervals in milliseconds
// Slot 1: Learning (in-session re-test, 10 min nominal — slot-1 cards are
//         re-served within the same study session. If the session ends
//         first, they auto-graduate to slot 3 on next startup.)
// Slot 2: Retired / unused (kept for historical review-log entries)
// Slot 3: Post-learning bridge (4h due, 20h grace → 24h total window).
//         First stop after learning, before the 1-day review cycle.
// Slots 4-13: Review phase (exponential growth)
export const SLOT_INTERVALS_MS: Record<number, number> = {
  1: 10 * 60 * 1000,         // 10 minutes (in-session re-test)
  2: 1 * HOUR,               // (retired)
  3: 4 * HOUR,               // 4 hours (post-learning bridge)
  4: 1 * DAY,                // 1 day
  5: 3 * DAY,                // 3 days
  6: 1 * WEEK,               // 1 week
  7: 2 * WEEK,               // 2 weeks
  8: 4 * WEEK,               // 1 month
  9: 8 * WEEK,               // 2 months
  10: 120 * DAY,             // 4 months
  11: 240 * DAY,             // 8 months
  12: 365 * DAY,             // 1 year
  13: 730 * DAY,             // 2 years
};

// Grace periods per slot in milliseconds
export const SLOT_GRACE_MS: Record<number, number> = {
  1: 2 * HOUR,            // 2 hours
  2: 2 * HOUR,            // (retired)
  3: 20 * HOUR,           // 20 hours (→ 24h total window from review)
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
  1: 1, 2: 1, 3: 1,                     // Learning / Immediate Recall
  4: 2, 5: 2, 6: 2,                     // Short-Term
  7: 3, 8: 3, 9: 3,                     // Medium-Term
  10: 4, 11: 4,                          // Long-Term
  12: 5, 13: 5,                          // Mastery
};

export const TRANCHE_NAMES: Record<number, string> = {
  1: 'Learning',
  2: 'Short-Term',
  3: 'Medium-Term',
  4: 'Long-Term',
  5: 'Mastery',
};

export const SLOT_LABELS: Record<number, string> = {
  0: 'New',
  1: '10m', 2: '1h', 3: '4h',
  4: '1d', 5: '3d', 6: '1w',
  7: '2w', 8: '1mo', 9: '2mo',
  10: '4mo', 11: '8mo',
  12: '1yr', 13: '2yr',
};

// Slot 1 is the in-session learning slot. Slot 2 is retired.
export const LEARNING_SLOT = 1;

// Slot 3 is the post-learning bridge (4h/20h grace). Graduates from slot 1.
export const GRADUATION_SLOT = 3;

// Review slots (the main SR cycle — 1 day and beyond)
export const MIN_SLOT = 4;
export const MAX_SLOT = 13;

// Cooldown applied when a card is demoted back to slot 0 after a wrong
// answer. The card cannot be re-drawn from the new-card pool until this
// window elapses — prevents gaming the system by immediately re-seeing
// the card after flipping to the answer.
export const WRONG_COOLDOWN_MS = 10 * 60 * 1000;

// Default ease factor for new cards (SM-2 standard)
export const DEFAULT_EASE = 2.5;
// Floor — ease never drops below this
export const MIN_EASE = 1.3;

/** Get current time in Indiana */
export function nowIndiana(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/** Get today's date string in Indiana timezone (YYYY-MM-DD) */
export function todayIndiana(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Calculate next due date from now + slot interval, with optional ease scaling for slots 5+ */
export function calculateNextDue(slot: number, ease?: number): string {
  const clampedSlot = Math.max(slot, 1);
  const baseInterval = SLOT_INTERVALS_MS[Math.min(clampedSlot, MAX_SLOT)];

  // Apply ease factor scaling for review slots 5+ (slot 4 is always 1 day)
  let interval = baseInterval;
  if (slot >= 5 && ease !== undefined) {
    interval = Math.round(baseInterval * (ease / DEFAULT_EASE));
  }

  return new Date(Date.now() + interval).toISOString();
}

/** Calculate grace deadline = dueDate + grace period for the slot */
export function calculateGraceDeadline(nextDueAt: string, slot: number): string {
  const dueMs = new Date(nextDueAt).getTime();
  const clampedSlot = Math.max(slot, 1);
  const grace = SLOT_GRACE_MS[Math.min(clampedSlot, MAX_SLOT)];
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
  const clampedSlot = Math.max(slot, 1);
  const grace = SLOT_GRACE_MS[Math.min(clampedSlot, MAX_SLOT)];
  return Date.now() > dueMs + grace;
}

/**
 * Cascade regression for a card that has been neglected.
 * Steps down one slot at a time, recalculating from each slot,
 * until the card is within a valid grace window or hits the floor.
 *
 * Returns the new slot after all regressions.
 */
export function calculateCascadeRegression(currentSlot: number, nextDueAt: string | null): number {
  if (!nextDueAt || currentSlot <= 0) return currentSlot;

  let slot = currentSlot;
  let dueMs = new Date(nextDueAt).getTime();
  if (isNaN(dueMs)) return MIN_SLOT;
  const now = Date.now();

  while (slot > MIN_SLOT) {
    const grace = SLOT_GRACE_MS[slot] || SLOT_GRACE_MS[MIN_SLOT];
    const graceDeadline = dueMs + grace;

    if (now <= graceDeadline) {
      break;
    }

    slot--;
    const newInterval = SLOT_INTERVALS_MS[slot] || SLOT_INTERVALS_MS[MIN_SLOT];
    dueMs = graceDeadline + newInterval;
  }

  return Math.max(slot, MIN_SLOT);
}

/**
 * Calculate SM-2 quality score from review result and response time.
 * - Correct + fast (< 3s): quality 5 (perfect recall)
 * - Correct + slow (>= 3s): quality 4 (correct with hesitation)
 * - Wrong: quality 1
 */
function calculateQuality(result: 'correct' | 'wrong', responseTimeMs?: number | null): number {
  if (result === 'wrong') return 1;
  if (responseTimeMs !== undefined && responseTimeMs !== null && responseTimeMs < 3000) return 5;
  return 4;
}

/**
 * Update ease factor using SM-2 formula.
 * On correct: ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
 * On wrong: ease - 0.2
 * Floor at MIN_EASE (1.3)
 */
function updateEase(currentEase: number, result: 'correct' | 'wrong', quality: number): number {
  if (result === 'wrong') {
    return Math.max(MIN_EASE, currentEase - 0.2);
  }
  const newEase = currentEase + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return Math.max(MIN_EASE, newEase);
}

export interface ReviewResult {
  newSlot: number;
  nextDueAt: string | null;
  graceDeadline: string | null;
  scheduleLocked: boolean;
  reviewType: 'standard' | 'early';
  easeAfter: number;
  /** True when the card lapsed (wrong answer at slot 5+) */
  lapsed: boolean;
}

/**
 * Process a review event.
 *
 * Learning phase (once-a-day user design):
 * - New card (slot 0) correct → slot 1 (in-session re-test, due in 10 min)
 * - New card (slot 0) wrong → stay at slot 0 with 10-min cooldown
 * - Slot 1 correct → slot 3 (post-learning bridge, 4h / 20h grace)
 * - Slot 1 wrong → slot 0 with 10-min cooldown
 * - If a slot-1 card's session ends before re-test, the study route
 *   auto-graduates it to slot 3 on next load.
 *
 * Bridge phase (slot 3):
 * - Correct within grace → advance to slot 4 (enters review cycle)
 * - Correct AFTER grace → demote to slot 0 with 10-min cooldown
 * - Wrong → demote to slot 0 with 10-min cooldown
 *
 * Review phase (slots 4+):
 * - Correct within grace → advance to next slot
 * - Correct AFTER grace → regress one slot (floor at slot 4)
 * - Wrong → regress one slot (floor at slot 4)
 * - Early review (not yet due) → log but don't alter schedule
 *
 * Ease factor updated on every review via SM-2 formula.
 */
/**
 * Apply a retention-based interval multiplier.
 * If retention is below target for the slot range, intervals are compressed
 * (multiplied by intervalMultiplier, typically 0.9) to increase review frequency.
 */
export function calculateNextDueWithRetention(
  slot: number,
  ease?: number,
  intervalMultiplier?: number,
): string {
  const clampedSlot = Math.max(slot, 1);
  const baseInterval = SLOT_INTERVALS_MS[Math.min(clampedSlot, MAX_SLOT)];

  let interval = baseInterval;
  if (slot >= 5 && ease !== undefined) {
    interval = Math.round(baseInterval * (ease / DEFAULT_EASE));
  }

  // Apply retention-based compression
  if (intervalMultiplier !== undefined && intervalMultiplier > 0 && intervalMultiplier < 1) {
    interval = Math.round(interval * intervalMultiplier);
  }

  return new Date(Date.now() + interval).toISOString();
}

export function processReview(
  result: 'correct' | 'wrong',
  currentSlot: number,
  nextDueAt: string | null,
  currentEase?: number,
  responseTimeMs?: number | null,
  intervalMultiplier?: number,
): ReviewResult {
  const ease = currentEase ?? DEFAULT_EASE;
  const quality = calculateQuality(result, responseTimeMs);
  const cardIsDue = isDue(nextDueAt);
  const isNew = currentSlot === 0;
  const isLearning = currentSlot === LEARNING_SLOT;

  // A lapse occurs when a review-phase card (slot 5+) is answered wrong
  const lapsed = result === 'wrong' && currentSlot >= 5;

  // Early review — card not yet due (only for review-phase cards, not learning)
  if (!isNew && !isLearning && !cardIsDue) {
    return {
      newSlot: currentSlot,
      nextDueAt: nextDueAt!,
      graceDeadline: calculateGraceDeadline(nextDueAt!, currentSlot),
      scheduleLocked: true,
      reviewType: 'early',
      easeAfter: ease,
      lapsed: false,
    };
  }

  let newSlot: number;
  let newEase = ease;

  // Demote to slot 0 with a 10-minute cooldown. Used whenever a card
  // in the learning/bridge phase is answered wrong or recovered too
  // late — the user must wait before re-drawing it as a new card.
  const demoteToNewWithCooldown = (): ReviewResult => ({
    newSlot: 0,
    nextDueAt: new Date(Date.now() + WRONG_COOLDOWN_MS).toISOString(),
    graceDeadline: null,
    scheduleLocked: false,
    reviewType: 'standard',
    easeAfter: updateEase(ease, result, quality),
    lapsed: false,
  });

  if (isNew) {
    if (result === 'correct') {
      // First correct → slot 1 (in-session re-test)
      newSlot = LEARNING_SLOT;
      newEase = updateEase(ease, result, quality);
    } else {
      // Wrong on a new card — stay at slot 0 with cooldown
      return demoteToNewWithCooldown();
    }
  } else if (isLearning) {
    // In-session learning re-test
    newEase = updateEase(ease, result, quality);
    if (result === 'correct') {
      // Graduate to the post-learning bridge (4h / 20h grace)
      newSlot = GRADUATION_SLOT;
    } else {
      // Wrong during learning → back to slot 0 with cooldown
      return demoteToNewWithCooldown();
    }
  } else if (currentSlot === GRADUATION_SLOT) {
    // Post-learning bridge (slot 3)
    newEase = updateEase(ease, result, quality);
    if (result === 'correct') {
      const pastGrace = isPastGrace(nextDueAt, currentSlot);
      if (pastGrace) {
        // Recovered too late — restart from new with cooldown
        return demoteToNewWithCooldown();
      }
      // Advance into the review cycle
      newSlot = MIN_SLOT;
    } else {
      // Wrong on the bridge → back to slot 0 with cooldown
      return demoteToNewWithCooldown();
    }
  } else {
    // Review phase (slots 4+)
    newEase = updateEase(ease, result, quality);
    if (result === 'correct') {
      const pastGrace = isPastGrace(nextDueAt, currentSlot);
      if (pastGrace) {
        newSlot = Math.max(currentSlot - 1, MIN_SLOT);
      } else {
        newSlot = Math.min(currentSlot + 1, MAX_SLOT);
      }
    } else {
      // Wrong — regress one slot, floor at MIN_SLOT (4)
      newSlot = Math.max(currentSlot - 1, MIN_SLOT);
    }
  }

  const newNextDueAt = calculateNextDueWithRetention(newSlot, newEase, intervalMultiplier);
  const newGraceDeadline = calculateGraceDeadline(newNextDueAt, newSlot);

  return {
    newSlot,
    nextDueAt: newNextDueAt,
    graceDeadline: newGraceDeadline,
    scheduleLocked: false,
    reviewType: 'standard',
    easeAfter: newEase,
    lapsed,
  };
}
