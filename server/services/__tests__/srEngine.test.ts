import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  processReview,
  calculateNextDue,
  calculateGraceDeadline,
  calculateCascadeRegression,
  isDue,
  isPastGrace,
  SLOT_INTERVALS_MS,
  SLOT_GRACE_MS,
  DEFAULT_EASE,
  MIN_EASE,
  MIN_SLOT,
  MAX_SLOT,
  LEARNING_SLOT,
} from '../srEngine.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Helper: freeze Date.now to a fixed point
function freezeNow(ms: number) {
  vi.spyOn(Date, 'now').mockReturnValue(ms);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// calculateNextDue
// ---------------------------------------------------------------------------
describe('calculateNextDue', () => {
  it('uses slot interval from current time', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const due = calculateNextDue(4);
    const dueMs = new Date(due).getTime();
    expect(dueMs).toBe(now + SLOT_INTERVALS_MS[4]);
  });

  it('clamps slot to minimum of 1', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const due = calculateNextDue(0);
    expect(new Date(due).getTime()).toBe(now + SLOT_INTERVALS_MS[1]);
  });

  it('clamps slot to MAX_SLOT', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const due = calculateNextDue(99);
    expect(new Date(due).getTime()).toBe(now + SLOT_INTERVALS_MS[MAX_SLOT]);
  });

  it('applies ease scaling for slots >= 5', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const ease = 3.0;
    const due = calculateNextDue(5, ease);
    const expected = Math.round(SLOT_INTERVALS_MS[5] * (ease / DEFAULT_EASE));
    expect(new Date(due).getTime()).toBe(now + expected);
  });

  it('does NOT apply ease scaling for slot 4', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const due = calculateNextDue(4, 3.0);
    expect(new Date(due).getTime()).toBe(now + SLOT_INTERVALS_MS[4]);
  });
});

// ---------------------------------------------------------------------------
// calculateGraceDeadline
// ---------------------------------------------------------------------------
describe('calculateGraceDeadline', () => {
  it('adds grace period to due date', () => {
    const dueIso = new Date(1_700_000_000_000).toISOString();
    const grace = calculateGraceDeadline(dueIso, 4);
    expect(new Date(grace).getTime()).toBe(1_700_000_000_000 + SLOT_GRACE_MS[4]);
  });

  it('clamps slot to minimum of 1', () => {
    const dueIso = new Date(1_700_000_000_000).toISOString();
    const grace = calculateGraceDeadline(dueIso, 0);
    expect(new Date(grace).getTime()).toBe(1_700_000_000_000 + SLOT_GRACE_MS[1]);
  });
});

// ---------------------------------------------------------------------------
// isDue
// ---------------------------------------------------------------------------
describe('isDue', () => {
  it('returns true for null (new card)', () => {
    expect(isDue(null)).toBe(true);
  });

  it('returns true when now >= due date', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isDue(past)).toBe(true);
  });

  it('returns false when now < due date', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isDue(future)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPastGrace
// ---------------------------------------------------------------------------
describe('isPastGrace', () => {
  it('returns false for null nextDueAt', () => {
    expect(isPastGrace(null, 4)).toBe(false);
  });

  it('returns false for slot 0', () => {
    const past = new Date(Date.now() - 999_999_999).toISOString();
    expect(isPastGrace(past, 0)).toBe(false);
  });

  it('returns true when now > due + grace', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - SLOT_GRACE_MS[4] - 1;
    expect(isPastGrace(new Date(dueMs).toISOString(), 4)).toBe(true);
  });

  it('returns false when within grace window', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - SLOT_GRACE_MS[4] + 1000;
    expect(isPastGrace(new Date(dueMs).toISOString(), 4)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateCascadeRegression
// ---------------------------------------------------------------------------
describe('calculateCascadeRegression', () => {
  it('returns same slot when within grace window', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    // Due was recent, within grace
    const dueMs = now - 1000;
    expect(calculateCascadeRegression(6, new Date(dueMs).toISOString())).toBe(6);
  });

  it('regresses one slot when just past grace', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    // Slot 6 (1 week), grace = 1 day. Due far enough in past to exceed grace for slot 6
    // but not enough to exceed the cascaded interval+grace
    const dueMs = now - SLOT_GRACE_MS[6] - 1;
    const result = calculateCascadeRegression(6, new Date(dueMs).toISOString());
    expect(result).toBeLessThan(6);
    expect(result).toBeGreaterThanOrEqual(MIN_SLOT);
  });

  it('floors at MIN_SLOT (4)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    // Way in the past — must exceed all cumulative intervals + grace to cascade fully
    // Total span of slots 13→4 cascading: each step adds grace + next interval
    // Use 20 years to guarantee full regression
    const dueMs = now - 20 * 365 * DAY;
    expect(calculateCascadeRegression(13, new Date(dueMs).toISOString())).toBe(MIN_SLOT);
  });

  it('returns currentSlot for null nextDueAt', () => {
    expect(calculateCascadeRegression(7, null)).toBe(7);
  });

  it('returns currentSlot for slot 0', () => {
    expect(calculateCascadeRegression(0, '2024-01-01T00:00:00Z')).toBe(0);
  });

  it('returns MIN_SLOT for NaN date', () => {
    expect(calculateCascadeRegression(8, 'not-a-date')).toBe(MIN_SLOT);
  });

  it('skips retired slots 2-3 during regression', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    // Slot 4 with due far in the past — can't go below MIN_SLOT
    const dueMs = now - 365 * DAY;
    const result = calculateCascadeRegression(5, new Date(dueMs).toISOString());
    expect(result).toBe(MIN_SLOT);
    // Should never land on slots 2 or 3
    expect(result).not.toBe(2);
    expect(result).not.toBe(3);
  });
});

// ---------------------------------------------------------------------------
// SM-2 Ease Factor Calculation (tested via processReview)
// ---------------------------------------------------------------------------
describe('ease factor (SM-2 formula)', () => {
  it('increases ease on correct answer with quality 5 (fast response)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, DEFAULT_EASE, 1000); // fast = quality 5
    // SM-2: ease + 0.1 - (5-5)*(0.08 + (5-5)*0.02) = ease + 0.1
    expect(result.easeAfter).toBeCloseTo(DEFAULT_EASE + 0.1, 5);
  });

  it('increases ease less on correct with quality 4 (slow response)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, DEFAULT_EASE, 5000); // slow = quality 4
    // SM-2: ease + 0.1 - (5-4)*(0.08 + (5-4)*0.02) = ease + 0.1 - 0.1 = ease
    expect(result.easeAfter).toBeCloseTo(DEFAULT_EASE, 5);
  });

  it('decreases ease by 0.2 on wrong answer', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', 5, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.easeAfter).toBeCloseTo(DEFAULT_EASE - 0.2, 5);
  });

  it('floors ease at MIN_EASE (1.3)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', 5, new Date(dueMs).toISOString(), MIN_EASE);
    expect(result.easeAfter).toBe(MIN_EASE);
  });

  it('floors ease at MIN_EASE even with repeated wrongs', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', 5, new Date(dueMs).toISOString(), 1.0);
    expect(result.easeAfter).toBe(MIN_EASE);
  });

  it('handles NaN ease by defaulting to DEFAULT_EASE', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, undefined, 1000);
    expect(result.easeAfter).toBeCloseTo(DEFAULT_EASE + 0.1, 5);
  });
});

// ---------------------------------------------------------------------------
// calculateQuality (tested indirectly via processReview ease changes)
// ---------------------------------------------------------------------------
describe('calculateQuality (via processReview)', () => {
  it('quality 5 for correct + fast (< 3s): ease increases by 0.1', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, 2.5, 2999);
    expect(result.easeAfter).toBeCloseTo(2.6, 5);
  });

  it('quality 4 for correct + slow (>= 3s): ease unchanged', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, 2.5, 3000);
    expect(result.easeAfter).toBeCloseTo(2.5, 5);
  });

  it('quality 4 for correct + null responseTime: ease unchanged', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, 2.5, null);
    expect(result.easeAfter).toBeCloseTo(2.5, 5);
  });

  it('quality 4 for correct + undefined responseTime: ease unchanged', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, 2.5);
    expect(result.easeAfter).toBeCloseTo(2.5, 5);
  });

  it('quality 1 for wrong: ease decreases by 0.2', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', 5, new Date(dueMs).toISOString(), 2.5, 500);
    expect(result.easeAfter).toBeCloseTo(2.3, 5);
  });
});

// ---------------------------------------------------------------------------
// processReview — Learning Phase
// ---------------------------------------------------------------------------
describe('processReview — learning phase', () => {
  it('slot 0 correct → slot 1 (in-session re-test)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null);
    expect(result.newSlot).toBe(LEARNING_SLOT);
    expect(result.nextDueAt).not.toBeNull();
    expect(result.scheduleLocked).toBe(false);
    expect(result.reviewType).toBe('standard');
  });

  it('slot 0 wrong → stays at slot 0, no schedule', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('wrong', 0, null);
    expect(result.newSlot).toBe(0);
    expect(result.nextDueAt).toBeNull();
    expect(result.graceDeadline).toBeNull();
    expect(result.scheduleLocked).toBe(false);
  });

  it('slot 1 correct → graduates to slot 4 (review cycle)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000; // due in the past = card is due
    const result = processReview('correct', LEARNING_SLOT, new Date(dueMs).toISOString());
    expect(result.newSlot).toBe(MIN_SLOT); // slot 4
    expect(result.nextDueAt).not.toBeNull();
    expect(result.graceDeadline).not.toBeNull();
  });

  it('slot 1 wrong → back to slot 0', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', LEARNING_SLOT, new Date(dueMs).toISOString());
    expect(result.newSlot).toBe(0);
    expect(result.nextDueAt).toBeNull();
    expect(result.graceDeadline).toBeNull();
  });

  it('slot 1 card not yet due still processes (learning cards always process)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const futureMs = now + 60_000;
    // Learning cards don't go through early-review path
    const result = processReview('correct', LEARNING_SLOT, new Date(futureMs).toISOString());
    expect(result.newSlot).toBe(MIN_SLOT);
    expect(result.reviewType).toBe('standard');
  });
});

// ---------------------------------------------------------------------------
// processReview — Review Phase (slots 4+)
// ---------------------------------------------------------------------------
describe('processReview — review phase', () => {
  it('correct within grace → advance one slot', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000; // just past due, within grace
    const result = processReview('correct', 5, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(6);
    expect(result.scheduleLocked).toBe(false);
    expect(result.reviewType).toBe('standard');
  });

  it('correct AFTER grace → regress one slot', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    // Due far enough in the past to be past grace
    const dueMs = now - SLOT_GRACE_MS[6] - SLOT_INTERVALS_MS[6] - 1;
    const result = processReview('correct', 6, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(5);
  });

  it('wrong → regress one slot', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', 7, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(6);
  });

  it('wrong at MIN_SLOT → stays at MIN_SLOT', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', MIN_SLOT, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(MIN_SLOT);
  });

  it('correct at MAX_SLOT → stays at MAX_SLOT', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('correct', MAX_SLOT, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(MAX_SLOT);
  });

  it('correct after grace at MIN_SLOT → stays at MIN_SLOT (floor)', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - SLOT_GRACE_MS[MIN_SLOT] - SLOT_INTERVALS_MS[MIN_SLOT] - 1;
    const result = processReview('correct', MIN_SLOT, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(MIN_SLOT);
  });
});

// ---------------------------------------------------------------------------
// processReview — Early Review
// ---------------------------------------------------------------------------
describe('processReview — early review', () => {
  it('review-phase card not yet due → schedule locked, no slot change', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const futureMs = now + 60_000;
    const result = processReview('correct', 6, new Date(futureMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(6);
    expect(result.scheduleLocked).toBe(true);
    expect(result.reviewType).toBe('early');
    expect(result.easeAfter).toBe(DEFAULT_EASE); // ease unchanged on early review
  });

  it('early review with wrong answer still locks schedule', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const futureMs = now + 60_000;
    const result = processReview('wrong', 6, new Date(futureMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(6);
    expect(result.scheduleLocked).toBe(true);
    expect(result.reviewType).toBe('early');
  });

  it('new cards (slot 0) are never early-reviewed', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    // Slot 0 with a future due date — should still process, not early
    const result = processReview('correct', 0, null);
    expect(result.reviewType).toBe('standard');
  });
});

// ---------------------------------------------------------------------------
// processReview — Grace period integration
// ---------------------------------------------------------------------------
describe('processReview — grace period', () => {
  it('sets graceDeadline correctly on advancement', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('correct', 5, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.graceDeadline).not.toBeNull();
    const nextDueMs = new Date(result.nextDueAt!).getTime();
    const graceMs = new Date(result.graceDeadline!).getTime();
    expect(graceMs).toBe(nextDueMs + SLOT_GRACE_MS[6]);
  });

  it('grace deadline uses correct slot after regression', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const result = processReview('wrong', 8, new Date(dueMs).toISOString(), DEFAULT_EASE);
    expect(result.newSlot).toBe(7);
    const nextDueMs = new Date(result.nextDueAt!).getTime();
    const graceMs = new Date(result.graceDeadline!).getTime();
    expect(graceMs).toBe(nextDueMs + SLOT_GRACE_MS[7]);
  });
});

// ---------------------------------------------------------------------------
// processReview — Interval with ease scaling
// ---------------------------------------------------------------------------
describe('processReview — ease-scaled intervals', () => {
  it('slot 5+ nextDueAt is scaled by ease factor', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const dueMs = now - 1000;
    const ease = 3.0;
    const result = processReview('correct', 5, new Date(dueMs).toISOString(), ease, 1000);
    // New slot = 6, ease increases by 0.1 (quality 5)
    const newEase = ease + 0.1;
    const expectedInterval = Math.round(SLOT_INTERVALS_MS[6] * (newEase / DEFAULT_EASE));
    const nextDueMs = new Date(result.nextDueAt!).getTime();
    expect(nextDueMs).toBe(now + expectedInterval);
  });

  it('slot 4 nextDueAt is NOT scaled by ease', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    // Slot 1 correct → graduates to slot 4
    const dueMs = now - 1000;
    const result = processReview('correct', LEARNING_SLOT, new Date(dueMs).toISOString(), 3.0);
    const nextDueMs = new Date(result.nextDueAt!).getTime();
    expect(nextDueMs).toBe(now + SLOT_INTERVALS_MS[4]);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('processReview with undefined ease defaults to DEFAULT_EASE', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null, undefined);
    // Should not throw, ease should be based on DEFAULT_EASE
    expect(result.easeAfter).toBeDefined();
    expect(typeof result.easeAfter).toBe('number');
    expect(Number.isNaN(result.easeAfter)).toBe(false);
  });

  it('processReview returns valid ISO date strings', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);
    const result = processReview('correct', 0, null);
    expect(result.nextDueAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('multiple sequential reviews produce consistent state', () => {
    const now = 1_700_000_000_000;
    freezeNow(now);

    // New → slot 1
    const r1 = processReview('correct', 0, null, DEFAULT_EASE, 1000);
    expect(r1.newSlot).toBe(1);

    // Slot 1 correct → slot 4
    freezeNow(now + 15 * 60_000); // 15 min later
    const r2 = processReview('correct', r1.newSlot, r1.nextDueAt, r1.easeAfter, 2000);
    expect(r2.newSlot).toBe(4);

    // Slot 4 correct → slot 5
    freezeNow(now + 2 * DAY); // 2 days later
    const r3 = processReview('correct', r2.newSlot, r2.nextDueAt, r2.easeAfter, 1500);
    expect(r3.newSlot).toBe(5);

    // Slot 5 wrong → slot 4 (must be past due date so it's not an early review)
    const r3DueMs = new Date(r3.nextDueAt!).getTime();
    freezeNow(r3DueMs + 1000); // just past due
    const r4 = processReview('wrong', r3.newSlot, r3.nextDueAt, r3.easeAfter);
    expect(r4.newSlot).toBe(4);
    expect(r4.easeAfter).toBeLessThan(r3.easeAfter);
  });
});
