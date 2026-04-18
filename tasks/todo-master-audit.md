# Learn Me Stupid - Master Audit To-Do List
**Generated: 2026-04-17**
**Sources: 10 expert agents (architect, SR scientist, UX designer, bug hunter, product manager, code quality, deps/config, build, live site, git/tests)**

---

## PHASE 0: CRITICAL BUGS (Fix Immediately)
> Data loss, corruption, or security risks. Fix before any feature work.

### Database & Persistence
- [ ] **BUG: `saveDb()` uses blocking `fs.writeFileSync` with no error handling** — if disk is full or write fails, data is silently lost. Debounce writes (every 5-10s instead of per-operation) and switch to async `fs.writeFile()`. (`server/db/index.ts:45`)
- [ ] **BUG: No transaction boundaries on card updates** — media block delete-then-insert is not transactional. If INSERT fails after DELETE, media is permanently lost. Wrap in sql.js transaction. (`server/routes/cards.ts:152-185`)
- [ ] **BUG: No concurrent write safety** — sql.js in-memory DB has no locking. Two simultaneous requests can overwrite each other's data silently. Add request serialization or mutex. (`server/db/index.ts:15-46`)

### Race Conditions
- [ ] **BUG: Double review submission race condition** — rapid-clicking correct/wrong submits two reviews against same card state. Second overwrites first. Add optimistic locking with version field or `sr_last_updated_at` timestamp, reject stale updates with 409. (`server/routes/study.ts:441-499`)
- [ ] **BUG: `handleGrade()` race in UI** — if user clicks next while POST is in-flight, `currentIndex` changes but response updates old index. Disable next button during POST or use request-in-flight guard. (`client/src/components/study/StudyView.tsx:695-763`)

### Input Validation
- [ ] **BUG: NaN propagation in new card limits** — invalid `dailyNewLimit` or `globalNewLimit` produces NaN, which flows into SQL `LIMIT` clause causing unpredictable behavior. Add `Number.isFinite()` guards. (`server/routes/study.ts:95,120,158,160`)
- [ ] **BUG: No bounds checking on `slotMin`/`slotMax`** — accepts negative, >13, Infinity. Clamp to `Math.max(0, Math.min(13, ...))`. (`server/routes/study.ts:186-192`)
- [ ] **BUG: `response_time_ms` not validated** — accepts negative or huge values. Validate `>= 0 && < 3600000`. (`server/routes/study.ts:443,464`)

### SR Engine Bugs
- [ ] **BUG: `cascadeRegression()` silent failure on invalid dates** — corrupted `nextDueAt` produces NaN, loop comparisons always fail, card never regresses. Add `if (isNaN(dueMs)) return MIN_SLOT`. (`server/services/srEngine.ts:123-150`)
- [ ] **BUG: Early review log inconsistency** — when `scheduleLocked=true`, review log shows slot progression (4→5) but card stays at 4. Set `slot_after = slot_before` in log for early reviews. (`server/services/srEngine.ts:178-186`)
- [ ] **BUG: Timezone mismatch in `newCardsLearnedToday()`** — uses UTC 12h rolling window, not Indiana timezone as documented. Budget resets at inconsistent times. (`server/routes/study.ts:23-26`)
- [ ] **BUG: Streak calculation uses server local time vs UTC `reviewed_at`** — off-by-one day errors depending on server timezone. (`server/routes/study.ts:316-331`)

### Security
- [ ] **Remove `unsafe-eval` from CSP** — unnecessary for a flashcard app, enables XSS code execution. Test without it first. (`server/index.ts:24`)
- [ ] **Add path traversal protection on media deletion** — validate `file_path` is a safe basename before joining with UPLOADS_DIR. (`server/routes/media.ts:96-100`)
- [ ] **Fix 9 npm vulnerabilities** (3 moderate, 6 high) — multer/busboy crash, path-to-regexp ReDoS, lodash code injection, picomatch injection, esbuild dev server exposure. Run `npm audit fix --force` and test thoroughly.

---

## PHASE 1: CODE QUALITY & STABILITY
> Technical debt, error handling, type safety. Builds confidence for feature work.

### TypeScript
- [ ] **Eliminate 50+ `any` types throughout codebase** — define proper interfaces: `CardRow`, `CardSideRow`, `MediaBlockRow`, `ReviewLogRow`. Start with `server/db/index.ts:49,54,63,69` and `server/routes/study.ts:64-65,113,127,149`
- [ ] **Replace `as any` browser API casts** — create proper type declarations for `SpeechRecognition`, `webkitSpeechRecognition`. (`client/src/components/study/StudyView.tsx:539`)
- [ ] **Type the search overlay props** — replace `any[]` with `Topic[]`, `CardSet[]`, `CardFull[]`. (`client/src/components/layout/SearchOverlay.tsx:7-9`)

### Error Handling
- [ ] **Add error state to Zustand store + toast notifications** — failed API calls currently fail silently. User never knows fetch failed. (`client/src/stores/useStore.ts:310-320`)
- [ ] **Add AbortController with 10s timeout on all fetch calls** — prevent infinite loading spinners on network hangs.
- [ ] **Replace bare `catch (_) {}` blocks in migrations** — log warnings instead of silently swallowing. (`server/db/migrate.ts:140,143,152`)
- [ ] **Improve error responses** — differentiate 4xx (validation) vs 5xx (server error) instead of generic `{ error: 'Failed to X' }` everywhere.
- [ ] **Add null checks after all `queryOne()` calls** — `maxOrder.next` can crash if query returns null. (`server/routes/media.ts:69-72`)
- [ ] **Handle server start failure gracefully** — `start().catch(console.error)` should exit with non-zero status. (`server/index.ts:68`)

### Performance
- [ ] **Fix N+1 query pattern in `getFullCard()`** — 20 cards = 80 queries. Use single JOIN query to fetch card + sides + media in one pass. (`server/routes/cards.ts:12-38`)
- [ ] **Stop re-fetching entire topic tree after creating 1 card** — `createCard()` triggers 4 sequential fetches. Server should return updated counts in response. (`client/src/stores/useStore.ts:322-343`)
- [ ] **Add request deduplication** — `fetchTopics()` called multiple times in quick succession all hit server. Add `lastFetchTime` debounce. (`client/src/stores/useStore.ts:201-210`)
- [ ] **Add idempotency keys to review submissions** — prevent duplicate review log entries on network retry. (`server/routes/study.ts:441`)

### Memory Leaks
- [ ] **Fix speech recognition restart loop leak** — `setTimeout(safeStart, 250)` may not be cleaned up on unmount. Use cleanup ref or WeakMap. (`client/src/components/study/StudyView.tsx:549-596`)
- [ ] **Ensure TTS stops on navigation** — verify `speechSynthesis.cancel()` is called in all cleanup paths.

### Infrastructure
- [ ] **Create `.env.example`** documenting `PORT`, `NODE_ENV`, `DB_PATH`. Currently missing entirely.
- [ ] **Move hardcoded health check URL to GitHub secret** in deploy workflow. (`.github/workflows/deploy.yml:39`)
- [ ] **Set up structured logging** — replace 40+ `console.log`/`console.error` calls with proper logger (pino or winston) with severity levels.
- [ ] **Add test framework** — zero tests exist. Set up vitest, add tests for SR engine at minimum.
- [ ] **Add ESLint** — no linter configured. Add with TypeScript rules.
- [ ] **Consider `minReplicas: 1`** on Azure Container Apps — cold start takes ~43 seconds currently.

### API Design
- [ ] **Split `/api/study/due` into separate endpoints** — currently has 6 behaviors in 137 lines based on query params. Split to `/due/review`, `/due/new`, `/due/mixed`, `/reintroduce`. (`server/routes/study.ts:92-229`)
- [ ] **Remove unused grace period entries for retired slots 1-3** — code handles it but confusing to maintain. (`server/services/srEngine.ts`)

---

## PHASE 2: UI/UX OVERHAUL
> The user explicitly wants a design refresh. Kill the "default AI slop" aesthetic.

### Visual Design System
- [ ] **Design a distinctive brand identity** — replace generic dark theme with intentional design language. Define:
  - Primary, secondary, accent colors (not default indigo #6366f1)
  - Typography hierarchy (headers, body, data, mono)
  - Spacing scale, border radius, shadow system
  - Component library (buttons, cards, inputs, modals)
- [ ] **Redesign color palette** — current palette feels AI-generated. Choose colors with personality and purpose. Consider warm dark theme (dark navy/charcoal vs pure black) with distinctive accent.
- [ ] **Improve contrast for accessibility** — `text-gray-500` on dark bg is borderline WCAG AA (4.2:1). Upgrade small text to `text-gray-400`. (`tailwind.config.js`)
- [ ] **Add visible focus states** — tab navigation has suppressed focus rings with no replacement. Add `ring-2 ring-accent ring-offset-2` to all interactive elements.
- [ ] **Add aria-labels to all icon-only buttons** — close, delete, grip handle buttons lack screen reader text.

### Study Session UX
- [ ] **Add session duration guidance** — "Recommended: 15-20 minutes" with timer. Suggest breaks at 15/30/45 min marks.
- [ ] **Improve session complete screen** — add motivational copy based on accuracy (>80%: "Crushing it!", >50%: "Nice work", <50%: "Keep practicing"). Show streak prominently.
- [ ] **Add "next due in X hours" nudge** on session complete — "Your next 5 cards are due in 4h 22m"
- [ ] **Improve Pipeline mode messaging** — change "sandbox — no SR changes" to "Practice mode: review risk-free without affecting your schedule"
- [ ] **Improve empty session screen** — add countdown timer to next due card, suggest alternative study modes instead of dead end.
- [ ] **Reduce mobile card min-height** — 500px is too tall for iPhone SE. Use `min-h-[350px] sm:min-h-[500px]`. (`StudyView.tsx:1001`)
- [ ] **Add decay check feedback** — show toast "2 cards regressed due to inactivity" after `runDecayCheck()` instead of silent POST. (`StudyView.tsx:630`)

### Card Creation
- [ ] **Add Quick Entry mode** — two stacked text inputs (front/back), Tab between them, Enter to save and clear for next card. Should take 5s/card instead of 30s.
- [ ] **Add keyboard shortcuts in card editor** — Shift+Enter = save & new, Tab = next field, Ctrl+S = save.
- [ ] **Add breadcrumb navigation in card editor** — show "Russian Vocabulary > Set 1 > Card 5/47" context.

### Navigation
- [ ] **Rename "Deep Dive" to "Mind Map"** — current label is unclear. (`AppShell.tsx`)
- [ ] **Add Memory Palace to main nav** — currently only accessible via direct URL `/palace`.
- [ ] **Add truncation to long topic names** — overflow issues on mobile with 180px dropdown. (`AppShell.tsx:31`)

### Dashboard & Stats
- [ ] **Expand forecast chart to day-by-day** for next 7 days with peak day indicator.
- [ ] **Add mastery definition tooltip** — clarify what "mastered" means (slot 12+ with 90%+ accuracy on last 3 reviews).
- [ ] **Add learning velocity metric** — "Avg time to slot 7: 14 days" and "cards advancing per week."
- [ ] **Show sample size next to accuracy** — "85% (142 reviews)" not just "85%."
- [ ] **Add streak counter to study session screen** — visible during study, not just on dashboard.

---

## PHASE 3: SR ENGINE IMPROVEMENTS
> Learning science upgrades. Each one measurably improves retention.

### Per-Card Ease Factor (15-25% retention gain)
- [ ] **Implement SM-2-style ease factor** — add `sr_ease_factor` (starts at 2.0) and `sr_last_quality` (0-5) to cards table. Adjust ease on each review based on response quality. Personalize intervals per card instead of fixed slots. (`server/services/srEngine.ts`)
- [ ] **DB migration** — add `sr_ease_factor REAL DEFAULT 2.0` and `sr_last_quality INTEGER DEFAULT 0` columns.

### Learning Phase for New Cards (10-15% retention gain)
- [ ] **Add multi-step learning phase** — new cards should require 2-3 consecutive correct answers (10m → 1h → 4h → 1d) before graduating to spaced intervals. Prevents premature mastery claims.
- [ ] **Distinguish "learning" vs "review" in study UI** — different indicators for cards still being learned vs cards in long-term review.

### Interval Rebalancing (5% retention gain)
- [ ] **Rebalance to exponential growth** — current intervals have irregular growth (4w→8w is 2x, then 8w→3mo is 1.375x). Consider: 1d → 3d → 1w → 2w → 4w → 8w → 4mo → 8mo → 1yr.

### Intelligent Interleaving (10-20% retention gain)
- [ ] **Replace random shuffle with intentional interleaving** — alternate difficulty levels, ensure no two cards from same set are adjacent, space related concepts by 5+ intervening cards. (`StudyView.tsx` shuffle logic)

### Lapse Tracking
- [ ] **Track lapse count per card** — when a mature card (slot 8+) is answered wrong, increment lapse counter. Cards with 3+ lapses should regress more aggressively (2 slots instead of 1).

### Retention Target
- [ ] **Add configurable retention target** (e.g., 85%) — dynamically adjust new-card introduction rate to maintain target. Show current retention rate on dashboard.

---

## PHASE 4: NEW STUDY MODES & CARD TYPES
> Features that make the app competitive with Anki/Quizlet.

### Cloze Deletion Cards
- [ ] **Add cloze card type** — support `{{c1::word}}` syntax. One card side with multiple occludable words. Show/hide each cloze group on flip. Add `card_type` enum ('standard', 'cloze') to schema.
- [ ] **Cloze editor UI** — highlight text and click "Make cloze" to wrap in `{{c1::...}}` syntax.
- [ ] **TTS support for cloze** — read card correctly, replacing hidden words with "blank."

### Typing Answer Mode
- [ ] **Add typing validation** — after flip, show text input. Compare answer with fuzzy matching (Levenshtein distance, strip accents). Grade as correct/wrong based on match threshold.
- [ ] **Support multiple acceptable answers** — comma-separated in back side.

### Cram Mode
- [ ] **Add cram study mode** — repeat wrong cards within same session (every other card). Aggressive repetition for exam prep. No SR schedule changes.

### Reverse/Bidirectional Cards
- [ ] **Allow front↔back reversal** — cards can be studied in both directions with separate SR tracking per direction.

### Smart Session Mode
- [ ] **Add "Smart Session" mode** — auto-balance review + new cards based on daily goals. Remove decision fatigue from mode selection.

---

## PHASE 5: DATA PORTABILITY
> Critical for adoption and trust.

### Export
- [ ] **CSV export** — all cards with `front_text, back_text, tags, sr_slot, last_reviewed, accuracy`. One-click download from Settings.
- [ ] **JSON export** — full structure with media (base64-encoded). Enables backup/restore.
- [ ] **Anki `.apkg` export** — valid format for Anki desktop import.

### Import
- [ ] **Bulk paste import** — paste CSV/markdown table, parse into cards automatically.
- [ ] **JSON import** — restore from JSON backup with optional SR history reset.
- [ ] **Anki `.apkg` importer** — parse ZIP+SQLite, map Anki schema to LMS, extract media, preserve review history. This is the #1 adoption driver.

### Backup
- [ ] **Scheduled automated backups** — daily backup of DB to Azure Files or export to downloadable URL.
- [ ] **One-click backup from Settings** — "Download my data" button.

---

## PHASE 6: ENGAGEMENT & RETENTION
> Features that turn "I tried it" into "I use it every day."

### Onboarding
- [ ] **Add first-run welcome flow** — 3-screen carousel explaining spaced repetition, guiding topic + card creation. Detect via localStorage flag.
- [ ] **Add contextual hints** — "New here? Create your first topic" on empty study screen.

### Motivation
- [ ] **Add daily goal tracker** — "Goal: 20 cards/day - Progress: 7 (35%)" with visual progress bar on dashboard.
- [ ] **Add achievement system** — badges for milestones (first 100 reviews, 7-day streak, 100% accuracy session, first mastered card).
- [ ] **Achievement toast notifications** — "7-day Streak!" on session complete when milestone is hit.

### Reminders
- [ ] **Add web push notifications** (opt-in) — "You have 12 cards due today" at configurable time.
- [ ] **Add "come back in X hours" prompt** on session complete with countdown to next due cards.

### Learning Science Education
- [ ] **Add "How It Works" section in Settings** — 3-minute primer on spaced repetition, forgetting curve, grace periods. Help users trust the system.

### Memory Palace Integration
- [ ] **Add contextual help to Memory Palace** — teach method of loci technique ("Make images vivid and unusual").
- [ ] **Link from session complete to Memory Palace** — "Encode these cards in your palace."
- [ ] **Track palace completion** — "20/50 cards encoded" progress bar.

---

## PHASE 7: ADVANCED ANALYTICS
> Power-user differentiation.

- [ ] **Retention curves** — for each slot, show "% correct at 1d/7d/14d/30d later." Reveals if intervals are optimal.
- [ ] **Learning velocity tracking** — cards promoted past slot 6 per week, with trend line.
- [ ] **Time efficiency metrics** — cards mastered per hour of study.
- [ ] **Predicted future workload** — "Based on current cards, here's your daily load 30 days from now."
- [ ] **Accuracy by subject** — identify weak topics automatically.
- [ ] **Study duration distribution** — when do you study longest? What times are most productive?

---

## PHASE 8: CONTENT PIPELINE
> Make card creation effortless.

- [ ] **AI card generation** — "Generate 20 cards teaching the Russian dative case" → calls Claude API → returns structured cards for review before saving.
- [ ] **PDF/document extraction** — upload PDF, auto-segment into cards using LLM.
- [ ] **Pronunciation auto-fetch** — auto-generate TTS audio for language cards on creation.
- [ ] **Image auto-fetch** — suggest relevant images from search when creating vocab cards.

---

## PHASE 9: INTEGRATIONS
> Multiply the app's value through external connections.

- [ ] **Readwise API** — auto-import highlights from reading (Kindle, web, PDFs) and convert to cards.
- [ ] **Browser extension** — right-click "Create card from selection" on any web page.
- [ ] **Obsidian/Logseq plugin** — bidirectional sync of notes ↔ cards via `#flashcard` tag.

---

## PHASE 10: COMPONENT REFACTORING
> Code health for long-term maintainability.

- [ ] **Split StudyView.tsx (1161 lines)** into:
  - `<StudySession>` — state machine for session flow
  - `<CardRenderer>` — render one card (text, images, media)
  - `<ElaborationPanel>` — notes feature
  - `<TTSManager>` — speech synthesis logic (custom hook)
  - `<CommandListener>` — keyboard + voice commands
  - `<SessionStats>` — session complete screen
- [ ] **Add batch API endpoints** — `PUT /api/cards/batch` for bulk operations (move, tag, delete).
- [ ] **Add FTS5 full-text search** — current LIKE search is O(n). Add SQLite FTS extension for fast search at scale.
- [ ] **Add pagination** — list endpoints return all results. Add cursor-based pagination for 10k+ cards.
- [ ] **Add export/import API** — `GET /api/export` (JSON dump), `POST /api/import` (restore).

---

## SCORECARD SUMMARY

| Area | Current Score | Target | Key Gaps |
|------|--------------|--------|----------|
| **Build/Deploy** | 8/10 | 9/10 | Cold start latency, npm vulns |
| **Code Quality** | 5/10 | 8/10 | Types, error handling, no tests |
| **SR Algorithm** | 6.5/10 | 9/10 | No ease factor, no learning phase |
| **Bug Count** | 15 found | 0 critical | 3 critical, 3 high, 6 medium, 3 low |
| **UX/Design** | 6/10 | 9/10 | No onboarding, generic theme, engagement |
| **Data Portability** | 1/10 | 8/10 | No import/export at all |
| **Engagement** | 4/10 | 8/10 | No goals, weak streaks, no notifications |
| **Analytics** | 7/10 | 9/10 | Missing retention curves, velocity |
| **Content Pipeline** | 5/10 | 8/10 | Manual only, no AI generation |

---

*Total items: ~120 across 10 phases. Estimated effort: 16-20 weeks for full completion.*
*Recommended approach: Phase 0 first (1-2 weeks), then Phase 2 UI overhaul + Phase 3 SR improvements in parallel.*
