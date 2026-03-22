# Learn Me Stupid — Spaced Repetition Specification

## Interval Sequence & Tranches

| Tranche | Slot | Interval | Grace Period |
|---------|------|----------|--------------|
| 1 — Immediate Recall | 1 | 5 minutes | 2 hours |
| 1 — Immediate Recall | 2 | 1 hour | 2 hours |
| 1 — Immediate Recall | 3 | 4 hours | 2 hours |
| 2 — Short-Term | 4 | 24 hours | 24 hours |
| 2 — Short-Term | 5 | 48 hours | 24 hours |
| 2 — Short-Term | 6 | 1 week | 24 hours |
| 3 — Medium-Term | 7 | 2 weeks | 72 hours |
| 3 — Medium-Term | 8 | 4 weeks | 72 hours |
| 3 — Medium-Term | 9 | 8 weeks | 72 hours |
| 4 — Long-Term | 10 | 3 months | 2 weeks |
| 4 — Long-Term | 11 | 6 months | 2 weeks |
| 5 — Mastery | 12 | 9 months | 4 weeks |
| 5 — Mastery | 13 | 1 year | 4 weeks |

## Advancement Rules

- Card answered **correct** within the grace period → advance to next slot
- Card answered **correct** but AFTER grace period has expired → card regresses one slot; clock restarts for new slot's interval
- Card answered **wrong** at any time → card regresses one slot; clock restarts for new slot's interval
- Card **not reviewed at all** and grace period expires → card regresses one slot automatically; new grace period starts immediately

## Floor Rule

If a card is already at Slot 1 (5 minutes) and is answered wrong or expires, it stays at Slot 1. It does not leave the system. The 5-minute interval and 2-hour grace period restart.

## Ceiling Rule

If a card is at Slot 13 (1 year) and answered correctly within grace, it stays at Slot 13. The 1-year interval restarts. Card is considered "mastered" but still cycles.

## Out-of-Sequence Reviews

If a user opens a card and reviews it BEFORE it is due (early review), the review is displayed normally (flip card, see answer) but selecting correct/wrong does NOT affect the spaced repetition timeline. The card stays in its current slot with its current due date unchanged. This should be logged as an "early review" event type but not alter scheduling.

## Due Date Calculation

- `nextDueDate = lastReviewTimestamp + slotInterval`
- `graceDeadline = nextDueDate + trancheGracePeriod`
- A card is "due" when `now >= nextDueDate`
- A card is "overdue/expired" when `now > graceDeadline`

## Automatic Regression

The system must run a check (on app load, on navigation to any review/dashboard screen, and/or via background job) that identifies cards past their graceDeadline and auto-regresses them one slot. This must cascade — if a card has been neglected long enough to miss multiple grace periods, it regresses one slot at a time, each time recalculating from the new slot, until it reaches a slot where it is currently within the grace window or hits the floor (Slot 1).

## Tranche Names

| Tranche | Name |
|---------|------|
| 1 | Immediate Recall |
| 2 | Short-Term |
| 3 | Medium-Term |
| 4 | Long-Term |
| 5 | Mastery |

## Slot Labels (for UI)

| Slot | Short Label |
|------|-------------|
| 1 | 5m |
| 2 | 1h |
| 3 | 4h |
| 4 | 1d |
| 5 | 2d |
| 6 | 1w |
| 7 | 2w |
| 8 | 4w |
| 9 | 8w |
| 10 | 3mo |
| 11 | 6mo |
| 12 | 9mo |
| 13 | 1yr |
