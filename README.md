# Fairway

A simple, fast golf round tracker: log each hole through a streamlined end-of-hole workflow, then see your stats. Built in the spirit of The Grint, 18Birdies, and Arccos — deliberately scoped small.

> Portfolio project, full-stack SvelteKit. Built to be a clean, complete v1 rather than a broad, half-finished one.

## Demo

- Live: _coming soon_
- Screenshots: _coming soon_

## Features (v1)

- Create reusable courses (name, per-hole par, yardage)
- Start and track 9 or 18-hole rounds
- Fast, branching end-of-hole scoring — fairway, putts, penalties, score — surfacing only the follow-ups that matter (miss direction, penalty type)
- Automatic derivations (greens in regulation, fairways hit, and more) computed from raw data, never manually entered
- Round history and per-round scorecards
- Stats dashboard: scoring average, putts/round, fairways hit %, GIR%, and scoring by par type
- Installable PWA that keeps working when you lose signal mid-course

## Tech stack

- **SvelteKit** (Svelte 5, TypeScript) — full-stack: UI, API, and server logic in one codebase
- **Drizzle ORM** over **SQLite** (dev) / **Postgres** (prod)
- **Session-based auth**
- **PWA** (offline-capable), architected so the same client can later be wrapped with **Capacitor** for native Android/iOS

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design — data model, scoring workflow, API surface, and offline strategy. In short: the app captures a few honest facts per hole and derives everything interesting on the server.
