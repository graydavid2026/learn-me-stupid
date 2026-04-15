# Study Tab Dashboard + Daily New-Card Limit

## Goal
Replace/augment the current Study tab landing with a tranche-based dashboard that drives all review entry. Mobile-first, swipeable.

## UX Spec

### Dashboard layout (Study tab landing)
- **Top strip**: total due now, total due in next 24h, new-card budget remaining today (e.g. "1 / 2 new today"), last-studied summary.
- **Tranche timeline** (the centerpiece):
  - Up to 14 columns left-to-right, one per SR slot (0=New … 13=1yr), color-coded via existing `SLOT_COLORS`/`SLOT_LABELS`.
  - **Only tranches with at least one DUE card appear.** Empty tranches (and not-yet-due cards) are hidden entirely.
  - **Collapsed by default.** Each column header shows: tranche label, due count, **soonest-due callout** (e.g. "next: in 12m" / "2d overdue"), red ring if any in this column are due within 24h.
  - **Tap a column header → expands** that column downward into a vertical stack of card chips, sorted **oldest due at top → newest due at bottom**. Tap header again to collapse. Multiple columns can be expanded at once.
  - Each chip shows ONLY:
    - last-result icon (✓ green / ✗ red / — gray for never-reviewed)
    - due date + time (e.g. "Apr 15, 2:30p" or "in 3h" / "2d overdue")
    - NO card text/content
  - **Chips are selectable** — tap to highlight/unhighlight. Selection persists across collapse/expand and across columns.
  - Mobile: horizontal swipe across columns, vertical scroll within an expanded column. Desktop: horizontal scroll + click-drag panning.
- **Sticky action bar** (bottom on mobile, top on desktop):
  - When 0 selected: "Review all due (N)" — starts session over every due card (the existing Review Due flow).
  - When ≥1 selected: "Study selected (N)" — starts session over highlighted cards only. Plus a "Clear" link.

### New-card daily limit
- New `daily_new_card_limit` setting (default 2, configurable in Settings).
- "New today" = count of `review_log` rows where `slot_before = 0 AND slot_after > 0` for the current Indianapolis-tz day (a New card that successfully advanced).
- When budget hit: study session refuses to introduce more new cards and surfaces a banner: *"Daily new-card limit reached. Study upcoming cards early instead."* with a button that pulls the next-soonest non-due cards.
- Wrong answers on a New card don't count against the budget (card never advanced).

## Data / API

### New endpoint
`GET /api/study/tranche-dashboard` → only includes tranches with ≥1 due card; only includes due cards.
```ts
{
  tranches: Array<{
    slot: number;            // 0..13
    label: string;
    color: string;
    dueCount: number;
    dueIn24hCount: number;
    soonestDueAt: string;    // ISO — earliest due_at in this tranche
    cards: Array<{
      id: string;
      slot: number;
      due_at: string;        // ISO, oldest first
      last_reviewed_at: string | null;
      last_result: 'correct' | 'wrong' | null;
    }>;
  }>;
  totals: { dueNow: number; dueIn24h: number };
  newToday: { used: number; limit: number };
  lastStudiedAt: string | null;
}
```

### Selected-card session
`POST /api/study/session` with `{ cardIds: string[] }` → returns the same shape as `/api/study/due` so the existing study flow can consume it. (Or extend `/due` with an optional `ids` query param — simpler.)

### Reuse
- `/api/study/due` already exists for session start.
- `review_log` table already has everything we need (`slot_before`, `slot_after`, `result`, `reviewed_at`).

### Settings
- Add `dailyNewCardLimit: number` to `useStore` persisted state (default 2).
- Settings page: numeric input (0–20).
- `/api/study/due` (or session bootstrap) reads the limit via query param and respects it when picking new cards.

## Files to touch
- `server/routes/study.ts` — add `tranche-dashboard` route; respect `newLimit` in `/due`.
- `client/src/stores/useStore.ts` — add `dailyNewCardLimit` field + setter, persist.
- `client/src/components/settings/SettingsView.tsx` — add the input.
- `client/src/components/study/StudyView.tsx` — replace landing pre-session UI with `<TrancheDashboard />`. Add daily-limit banner mid-session.
- `client/src/components/study/TrancheDashboard.tsx` — NEW. Swipe/scroll horizontal columns, drill-in view, chip rendering.

## Implementation phases (single session, ~1 commit each)
1. **Backend**: `tranche-dashboard` endpoint + `/due` newLimit support. Verify with curl.
2. **Settings**: store field + Settings UI input.
3. **Dashboard component**: columns, chips, totals strip, due-now binding to "Review Due" button. Desktop scroll first.
4. **Mobile polish**: touch swipe, large tap targets, no-zoom font sizing, drag-to-pan on desktop.
5. **Drill-in view + new-card banner**: column tap → full-screen list; mid-session limit banner.
6. **Build, smoke-test, commit, push, verify deploy.**

## Out of scope
- No card content shown on chips (per user).
- No grouping of tranches (all 14 visible).
- No pair logic.
