# Learn Me Stupid - Master Audit To-Do List
**Generated: 2026-04-17 | Updated: 2026-04-17**
**Sources: 10 expert agents (architect, SR scientist, UX designer, bug hunter, product manager, code quality, deps/config, build, live site, git/tests)**

---

## PHASE 0: CRITICAL BUGS — DONE
> All critical bugs fixed in commit `04e61e9`.

- [x] `saveDb()` debounced (2s async writes, graceful shutdown flush)
- [x] Transaction boundaries on card updates
- [x] `handleGrade()` race condition (disabled during POST)
- [x] NaN propagation guards (`safeInt()` helper)
- [x] `cascadeRegression()` NaN guard
- [x] Timezone aligned to Indiana for budgets/streaks
- [x] `response_time_ms` validation
- [x] CSP `unsafe-eval` removed
- [x] Path traversal protection on media deletion
- [x] `.env.example` created
- [x] Deploy workflow dynamic URL
- [x] Store error feedback for failed fetches
- [x] Speech recognition cleanup leak fixed
- [ ] No concurrent write safety (mutex) — deferred, single-user app
- [ ] Fix 9 npm vulnerabilities — run `npm audit fix` when ready to test breaking changes

---

## PHASE 1: CODE QUALITY & STABILITY — PARTIALLY DONE

### Done
- [x] Error state in Zustand store (`fetchError` + `clearError()`)
- [x] Null checks after `queryOne()` calls
- [x] `.env.example` created
- [x] Deploy workflow hardcoded URL fixed

### Remaining
- [ ] Eliminate 50+ `any` types — define `CardRow`, `CardSideRow`, `MediaBlockRow` interfaces
- [ ] Replace `as any` browser API casts with proper type declarations
- [ ] Type search overlay props
- [ ] Add AbortController with 10s timeout on all fetch calls
- [ ] Replace bare `catch (_) {}` blocks in migrations with logged warnings
- [ ] Improve error responses (4xx vs 5xx differentiation)
- [ ] Handle server start failure (exit with non-zero status)
- [ ] Fix N+1 query pattern in `getFullCard()` (JOIN instead of 80 queries for 20 cards)
- [ ] Stop re-fetching entire topic tree after creating 1 card
- [ ] Add request deduplication for `fetchTopics()`
- [ ] Add idempotency keys to review submissions
- [ ] Set up structured logging (pino/winston)
- [ ] Add test framework (vitest) + SR engine tests
- [ ] Add ESLint with TypeScript rules
- [ ] Consider `minReplicas: 1` on Azure Container Apps (43s cold start)
- [ ] Split `/api/study/due` into separate endpoints

---

## PHASE 2: UI/UX OVERHAUL — PARTIALLY DONE

### Done
- [x] New color palette (amber/gold accent `#d4a853`, warm charcoal bg, muted tones)
- [x] Redesigned tier colors, border colors, text hierarchy
- [x] Updated border radius (10px cards, 14px modals)
- [x] Secondary color (`#5b8a9a` teal)
- [x] Muted success/error/warning colors

### Remaining — NEXT SESSION PRIORITY
- [ ] **Complete component restyling** — buttons, inputs, modals need to use new tokens consistently
- [ ] **Header/nav bar polish** — subtle gradient or glass effect, active state uses accent
- [ ] **Study card face styling** — update surface colors, border treatment for new palette
- [ ] **Dashboard stat cards** — command center feel with new colors
- [ ] Add visible focus states (`ring-2 ring-accent`)
- [ ] Add aria-labels to icon-only buttons
- [ ] Add session duration guidance (timer + break suggestions)
- [ ] Improve Pipeline mode messaging
- [ ] Improve empty session screen with countdown timer
- [ ] Reduce mobile card min-height (`min-h-[350px] sm:min-h-[500px]`)
- [ ] Add decay check feedback toast
- [ ] Add keyboard shortcuts in card editor
- [ ] Add breadcrumb navigation in card editor
- [ ] Rename "Deep Dive" to "Mind Map"
- [ ] Add Memory Palace to main nav
- [ ] Add truncation to long topic names
- [ ] Expand forecast chart to day-by-day
- [ ] Add mastery definition tooltip
- [ ] Add learning velocity metric
- [ ] Show sample size next to accuracy

---

## PHASE 3: SR ENGINE IMPROVEMENTS — DONE
> All shipped in commit `7a145df`.

- [x] Per-card ease factor (SM-2 style, `sr_ease_factor` column, quality-based adjustment)
- [x] Learning phase (slot 1 = in-session re-test, auto-graduates to slot 4)
- [x] Exponential interval rebalancing (1d/3d/1w/2w/1mo/2mo/4mo/8mo/1yr/2yr)
- [x] Ease-scaled intervals for slots 5+ (`ease / 2.5` multiplier)
- [x] DB migration for `sr_ease_factor` column
- [x] Auto-graduation for cards left in learning slot between sessions
- [x] Updated slot labels across all client components

### Remaining
- [ ] Intelligent interleaving (alternate difficulty, space related cards)
- [ ] Lapse tracking (counter per card, aggressive regression for chronic failures)
- [ ] Configurable retention target (85% default, auto-adjust new card rate)

---

## PHASE 4: NEW STUDY MODES & CARD TYPES — NOT STARTED
> Cloze + typing agent hit rate limit. Restart next session.

- [ ] **Cloze deletion cards** — `{{c1::word}}` syntax, card_type enum, editor UI, study view rendering
- [ ] **Typing answer mode** — text input + fuzzy matching (Levenshtein), auto-grading
- [ ] **Cram mode** — repeat wrong cards in-session, no SR changes
- [ ] Reverse/bidirectional cards
- [ ] Smart Session mode (auto-balance review + new)

---

## PHASE 5: DATA PORTABILITY — MOSTLY DONE
> CSV + JSON export/import shipped in commit `7a145df`.

- [x] CSV export (`GET /api/export/csv`)
- [x] JSON export (`GET /api/export/json`)
- [x] Stats export (`GET /api/export/stats`)
- [x] CSV import (`POST /api/import/csv`)
- [x] JSON import (`POST /api/import/json`)
- [x] Settings UI with export/import buttons + status feedback

### Remaining
- [ ] Anki `.apkg` importer (parse ZIP+SQLite, map schema, extract media)
- [ ] Anki `.apkg` exporter
- [ ] Scheduled automated backups
- [ ] One-click backup from Settings (download current DB)

---

## PHASE 6: ENGAGEMENT & RETENTION — PARTIALLY DONE
> Onboarding agent made partial progress before rate limit.

### Done (partial — verify in next session)
- [x] Onboarding flow component created (`OnboardingFlow.tsx`)
- [x] Daily goal tracker on dashboard
- [x] Enhanced streak display
- [x] Session complete motivational copy
- [x] Quick add card from study screen

### Remaining
- [ ] **Verify onboarding flow works end-to-end** (agent may have been mid-edit)
- [ ] Achievement system (badges for milestones)
- [ ] Achievement toast notifications
- [ ] Web push notifications (opt-in)
- [ ] "Come back tomorrow" nudge with countdown on session complete
- [ ] "How It Works" learning science primer in Settings
- [ ] Memory Palace contextual help
- [ ] Palace completion tracking

---

## PHASE 7: ADVANCED ANALYTICS — NOT STARTED

- [ ] Retention curves (% correct at each interval)
- [ ] Learning velocity tracking (cards promoted per week)
- [ ] Time efficiency metrics (cards mastered per hour)
- [ ] Predicted future workload (30-day forecast)
- [ ] Accuracy by subject (identify weak topics)
- [ ] Study duration distribution

---

## PHASE 8: CONTENT PIPELINE — NOT STARTED

- [ ] AI card generation (Claude API → structured cards)
- [ ] PDF/document extraction
- [ ] Pronunciation auto-fetch
- [ ] Image auto-fetch

---

## PHASE 9: INTEGRATIONS — NOT STARTED

- [ ] Readwise API
- [ ] Browser extension (web clipper)
- [ ] Obsidian/Logseq plugin

---

## PHASE 10: COMPONENT REFACTORING — NOT STARTED

- [ ] Split StudyView.tsx into 6 components
- [ ] Add batch API endpoints
- [ ] Add FTS5 full-text search
- [ ] Add pagination for list endpoints

---

## SCORECARD (Updated)

| Area | Before | After | Key Changes |
|------|--------|-------|-------------|
| **Build/Deploy** | 8/10 | 8/10 | npm vulns still pending |
| **Code Quality** | 5/10 | 6.5/10 | Error handling, validation, cleanup |
| **SR Algorithm** | 6.5/10 | 8.5/10 | Ease factor, learning phase, rebalanced |
| **Bug Count** | 15 found | 2 remaining | 13 fixed, 2 deferred |
| **UX/Design** | 6/10 | 7/10 | New palette, partial component refresh |
| **Data Portability** | 1/10 | 7/10 | CSV+JSON export/import shipped |
| **Engagement** | 4/10 | 6/10 | Onboarding, goals, streak (partial) |
| **Analytics** | 7/10 | 7/10 | No change yet |
| **Content Pipeline** | 5/10 | 5/10 | No change yet |

---

## NEXT SESSION PRIORITIES
1. **Verify partial work** — test onboarding, daily goals, streak, quick add (Phase 6 partials)
2. **Complete UI component restyling** — buttons, cards, nav using new palette (Phase 2 remainder)
3. **Cloze + typing cards** (Phase 4) — biggest feature gap vs Anki
4. **Anki importer** (Phase 5) — #1 adoption driver

*Estimated remaining: ~80 items across 8 phases. Major progress made on foundation.*
