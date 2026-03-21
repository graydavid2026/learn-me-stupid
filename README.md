# Learn Me Stupid

A spaced repetition flashcard app with Memory Palace visualization, built for deep learning retention.

## Features

- **Card System** — Rich media cards with text, images, audio, video, and YouTube embeds
- **Spaced Repetition** — 9-tier SR algorithm with decay, daily touch rules, and streak tracking
- **Memory Palace** — Method of loci visualization with themed worlds and walkthrough mode
- **Dashboard** — Stats, tier distribution, accuracy trends, heatmap calendar, 14-day forecast
- **Quick Search** — Cmd+K global search across cards, sets, and topics

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts + Framer Motion
- **Backend:** Express + sql.js (pure JS SQLite — no native dependencies)
- **State:** Zustand

## Quick Start

```bash
git clone https://github.com/DMolin/learn-me-stupid.git
cd learn-me-stupid
npm install
npm run db:migrate
npm run dev
```

App runs at `http://localhost:5173` (client) with API at `http://localhost:3001`.

## Docker

```bash
docker compose build
docker compose up -d
```

App runs at `http://localhost:3001`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server (hot reload) |
| `npm run build` | Build client for production |
| `npm run db:migrate` | Create/update database schema |
| `npm run db:seed` | Load sample data (3 topics, 3 sets) |

## Project Structure

```
client/          React frontend (Vite)
  src/
    components/
      cards/     Card CRUD + editor
      dashboard/ Stats & charts
      layout/    AppShell, search overlay
      palace/    Memory Palace (method of loci)
      study/     Study session UI
    stores/      Zustand state
server/          Express API
  db/            sql.js database + migrations
  routes/        REST endpoints
  services/      SR engine
shared/          TypeScript types
```

## SR Algorithm

9 tiers from **New** → **6 months**, with promotion on correct answers and demotion + decay on missed reviews. Cards are scheduled with increasing intervals: 4h → 1d → 2d → 1w → 2w → 1mo → 3mo → 6mo.
