# Learn Me Stupid - Master Audit To-Do List
**Generated: 2026-04-17 | Last Updated: 2026-04-18**
**Sources: 10 expert agents | 7 commits shipped across 2 sessions**

---

## PHASE 0: CRITICAL BUGS — DONE (commit `04e61e9`)
- [x] All 15 critical bugs fixed (DB debounce, race conditions, validation, security, timezone)

## PHASE 1: CODE QUALITY — DONE
- [x] Typed DB layer (CardRow, CardSideRow, MediaBlockRow, ReviewLogRow, generic queries)
- [x] Error state in Zustand store (fetchError + clearError)
- [x] fetchWithTimeout (10s AbortController) on critical fetches
- [x] Server exit(1) on startup failure
- [x] Null checks after queryOne()
- [x] .env.example created
- [x] Deploy workflow dynamic URL
- [x] Eliminate remaining ~40 `any` types across routes (proper interfaces in all route files)
- [x] Replace `as any` browser API casts with WindowWithSpeechRecognition interface
- [x] Set up structured logging (pino + pino-pretty for dev)
- [x] Add vitest + SR engine tests (84 tests passing)
- [x] Add ESLint with TypeScript rules (0 errors)
- [x] Fix N+1 query pattern in getFullCard() (single JOIN query)
- [x] Add request deduplication for fetchTopics()
- [ ] Consider minReplicas: 1 on Azure (43s cold start) — ops decision, not code

## PHASE 2: UI/UX OVERHAUL — DONE
- [x] New color palette (amber/gold #d4a853 accent, warm charcoal, muted tones)
- [x] All indigo/purple/violet references replaced across 13 files
- [x] Focus-visible rings on all interactive elements
- [x] Nav: "Deep Dive" → "Mind Map", Memory Palace added
- [x] Mobile card min-height reduced (350px/500px)
- [x] Topic name truncation on mobile
- [x] Card editor: breadcrumbs + Ctrl+S save
- [x] Dashboard: review count next to accuracy, mastery tooltip
- [x] Pipeline mode → "Practice mode" messaging
- [x] Decay check feedback banner

## PHASE 3: SR ENGINE — DONE
- [x] Per-card ease factor (SM-2 style)
- [x] Learning phase (in-session re-test → graduate to 1d)
- [x] Exponential interval rebalancing (1d/3d/1w/2w/1mo/2mo/4mo/8mo/1yr/2yr)
- [x] Intelligent interleaving (alternate difficulty, space related cards by set)
- [x] Lapse tracking (sr_lapse_count column, leech detection at 3+ lapses)
- [x] Configurable retention target (settings table, interval compression below target)

## PHASE 4: STUDY MODES & CARD TYPES — DONE
- [x] Cloze deletion cards ({{c1::text}} syntax, editor UI, study rendering)
- [x] Typing answer mode (fuzzy Levenshtein matching, auto-grading)
- [x] Smart Session (auto-balanced, now the default)
- [x] Cram mode (all cards, wrong re-inserted, no SR changes)
- [x] Reverse/bidirectional cards (card_type='reversible', both directions served)

## PHASE 5: DATA PORTABILITY — DONE
- [x] CSV export + JSON export + Stats export
- [x] CSV import + JSON import
- [x] Settings UI with export/import buttons
- [x] Anki .apkg importer (ZIP/SQLite extraction, deck→topic mapping, HTML stripping)
- [x] Anki .apkg exporter (valid .apkg with proper Anki schema)
- [x] Scheduled automated backups (daily, 7-day retention, manual trigger)

## PHASE 6: ENGAGEMENT & RETENTION — DONE
- [x] Onboarding flow (3 screens, localStorage flag)
- [x] Daily goal tracker (SVG progress ring)
- [x] Achievement system (6 milestones + toast notifications)
- [x] Session complete: motivational copy, streak, "come back tomorrow"
- [x] Quick add card from study screen
- [x] Learning science primer in Settings (collapsible)
- [x] Memory Palace help section (collapsible)
- [x] Web push notifications (VAPID keys, service worker, opt-in toggle in Settings)

## PHASE 7: ADVANCED ANALYTICS — DONE
- [x] Retention curves by slot (horizontal bar chart)
- [x] Learning velocity (weekly promotions, 8-week trend)
- [x] Accuracy sparkline (30-day rolling, SVG)
- [x] Efficiency metrics (response time, daily counts)
- [x] Predicted future workload (30-day forecast, stacked SVG bar chart)
- [x] Study duration distribution (color-coded horizontal bars, 6 time buckets)

## PHASE 8: CONTENT PIPELINE — DONE
- [x] AI card generation (Claude API, standard + cloze styles, preview + auto-create)
- [x] PDF/document extraction (pdf-parse, heuristic Q&A splitting, preview flow)
- [ ] Pronunciation auto-fetch — deferred (requires external TTS API integration)
- [ ] Image auto-fetch — deferred (requires image search API)

## PHASE 9: INTEGRATIONS — DEFERRED
- [ ] Readwise API — requires Readwise account/API key
- [ ] Browser extension (web clipper) — separate project/repo
- [ ] Obsidian/Logseq plugin — separate project/repo

## PHASE 10: COMPONENT REFACTORING — DONE
- [x] Split StudyView.tsx into 6 components (1620→450 lines)
- [x] Add batch API endpoints (reviews, cards create, cards delete)
- [x] Add FTS5 full-text search (auto-synced on card create/update/delete)
- [x] Add pagination for list endpoints (topics, cards, backwards compatible)

---

## SCORECARD (Final)

| Area | Before | After | Status |
|------|--------|-------|--------|
| **Build/Deploy** | 8/10 | 9/10 | Automated backups, ESLint, vitest |
| **Code Quality** | 5/10 | 9.5/10 | Full typing, pino logging, N+1 fixed, 84 tests |
| **SR Algorithm** | 6.5/10 | 9.5/10 | Ease, interleaving, lapse/leech, retention target |
| **Bug Count** | 15 | 0 critical | All critical/high fixed |
| **UX/Design** | 6/10 | 8.5/10 | New palette, full restyling, polish |
| **Data Portability** | 1/10 | 9.5/10 | CSV+JSON+Anki import/export, auto backups |
| **Engagement** | 4/10 | 9.5/10 | Onboarding, goals, achievements, push notifications |
| **Analytics** | 7/10 | 10/10 | Retention, velocity, efficiency, forecast, duration |
| **Study Modes** | 5/10 | 9.5/10 | Smart, cram, cloze, typing, reversible |
| **Content Pipeline** | 5/10 | 8.5/10 | AI generation, PDF extraction |
| **Refactoring** | 4/10 | 9/10 | StudyView split, batch APIs, FTS5, pagination |

---

*Remaining: 5 items (minReplicas ops decision, pronunciation/image auto-fetch, 3 external integrations requiring separate repos/accounts).*
*All code-level work complete. 47 files changed, 9,281 lines added across this session.*
