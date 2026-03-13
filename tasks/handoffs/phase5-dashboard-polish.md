# Learn Me Stupid — Phase 5 Handoff

## Project
- **Path**: `C:\Users\DMolin\learn-me-stupid`
- **Run**: `npm run dev` (client :5173, server :3001)
- **Branch**: `master`
- **Build**: TypeScript clean, Vite builds, all APIs tested

## What's Complete (Phases 1-4)

### Phase 1: Foundation
- Vite + React 18 + TS + Tailwind (dark theme) + Express + sql.js
- SQLite schema: 8 tables with indexes, FK constraints
- Topic & Card Set CRUD APIs + UI

### Phase 2: Card System
- Card CRUD API with sides + media blocks (6 endpoints)
- Media upload API (multer, 200MB limit)
- Card Editor modal: text/image/audio/video/youtube blocks per side
- CardsView with expandable sets, card list, tier dots, tags

### Phase 3: Spaced Repetition
- SR engine: 9-tier intervals, promotion/demotion, daily touch rule, decay
- Study API: due/pipeline/stats/review/decay-check
- Study UI: 4 modes, card flip, keyboard shortcuts (Space/1/2), session summary

### Phase 4: Mind Map
- ReactFlow interactive mind map: Topic → Sets → Cards hierarchy
- Custom dark-themed nodes with tier color coding
- Auto-generates from data, drag/zoom/pan

## What's Left (Phase 5: Dashboard & Polish)

### Priority Items
1. **Dashboard/Stats view** (`client/src/components/dashboard/DashboardView.tsx`)
   - Overview cards: total, due today, overdue, mastered, new
   - Tier distribution bar chart (use recharts, already installed)
   - Heatmap calendar (GitHub-style review activity)
   - Accuracy trend line chart (last 30 days)
   - Upcoming due timeline (next 2 weeks)
   - Streak counter
   - API: `GET /api/study/stats?topic=X` already exists

2. **Quick Search (Cmd+K)** — global search overlay
   - Search cards, sets, topics by text
   - API: `GET /api/search?q=term` needs to be built on server

3. **Keyboard shortcuts** — already working in study (Space/1/2), add global shortcuts

4. **Framer Motion animations** — card flip in study, page transitions (framer-motion already in deps)

5. **Polish** — loading states, empty states (most already done), error handling

### Key Files to Read
- `CLAUDE.md` — full spec with detailed component specs
- `client/src/stores/useStore.ts` — all state and actions
- `server/routes/study.ts` — study API with stats endpoint
- `shared/types.ts` — all TypeScript interfaces
- `server/db/index.ts` — sql.js helpers (queryAll, queryOne, run, exec)

### Notes
- sql.js (pure JS SQLite) used instead of better-sqlite3 (no VS C++ build tools available)
- DB file: `server/db/mnemonic.db` — sql.js loads into memory, saves to disk on writes
- Recharts is installed for charts
- Framer-motion is installed but not yet used
- cmdk is in deps for Cmd+K search
- @dnd-kit is in deps but not yet used for block reordering
