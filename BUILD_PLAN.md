# Build plan

A phased plan for implementing v1. Each phase is a self-contained, reviewable increment ending in something runnable, so progress can be checked between phases. Phases are ordered to build the most-depended-on, most-testable pieces first (data and pure logic) and to defer cross-cutting concerns (auth, offline) until the core loop works end to end.

## Phase 0 — Scaffold & tooling
- SvelteKit (Svelte 5, TS), adapter-node, ESLint/Prettier, base layout and routing shell.
- Drizzle wired to SQLite; `.env.example`; npm scripts (`dev`, `db:migrate`, `db:seed`).
- PWA manifest stub (not yet functional offline).
- **Done when:** `npm run dev` serves a blank app shell and the DB connection succeeds.

## Phase 1 — Data layer
- Drizzle schema for `users`, `courses`, `holes`, `rounds`, `scorings` (enums for `fairway_hit`, `penalty_type`).
- Migrations plus a seed script that inserts one sample course and a default dev user (so rounds can be created before auth lands in Phase 7).
- Typed query helpers in `lib/server/db/queries.ts`.
- **Done when:** migrations apply cleanly, seed runs, and a small script reads a course and its holes back.

## Phase 2 — Shared scoring logic (`workflow.ts`)
- The branching state machine (par-3 skip; fairway → miss-direction; penalty → penalty-type), the score-floor validation (`score ≥ putts + penalties + 1`), and GIR derivation — all pure functions, no UI or DB.
- Unit tests covering each branch, the validation floor, and GIR edge cases.
- **Done when:** the test suite passes and the module fully describes the flow. Everything after this builds on it.

## Phase 3 — Core API
- `+server.ts` handlers: courses (create/list), rounds (create/get/list/complete), scores (submit), stats.
- Score submission runs the Phase 2 validation server-side and stores only raw facts.
- Stats endpoint computes aggregates and GIR from raw scorings.
- **Done when:** a script or REST client can create a course, start a round, submit holes, and read back correct stats.

## Phase 4 — Course setup & round start (UI)
- Screens to create and list courses, and to start a round (course, tees, hole count).
- **Done when:** a user can create a course and open a fresh in-progress round entirely through the UI.

## Phase 5 — Scoring workflow (UI) — the core loop
- The per-hole screens, driven by `workflow.ts`: Yes/No vertical stacks, putts/score steppers, the directional miss pad, penalty-type list, and the review screen with auto-derived GIR.
- Consistent design language; progress indicator; per-hole persistence via the API.
- **Done when:** a full round can be played hole-by-hole and every scoring appears correctly in the DB.

## Phase 6 — Scorecard, history & stats dashboard
- Round history list, per-round scorecard view, and the stats dashboard (scoring average, putts/round, FIR%, GIR%, by par type).
- **Done when:** completed rounds show accurate scorecards and the dashboard numbers match hand-checked values.

## Phase 7 — Auth
- Session-based sign-up/sign-in; replace the default dev user; scope courses and rounds to the signed-in user; protect API routes.
- **Done when:** two accounts see only their own data, and unauthenticated API calls are rejected.

## Phase 8 — PWA & offline
- Functional service worker and manifest (installable); buffer the in-progress round in IndexedDB; submit and reconcile when connectivity returns.
- CORS hook in place, so a future Capacitor client can call the API.
- **Done when:** the app installs, a full round can be recorded with the network off, and it syncs on reconnect.

## Phase 9 — Polish & deploy
- The deferred visual-alignment pass on the scoring screens; empty/error/loading states; responsive check on a phone viewport.
- Swap SQLite → Postgres via config; deploy; add the live URL and screenshots to the README.
- **Done when:** it's deployed, shareable by link, and the README shows it off.

## Working agreement
- I implement one phase at a time and pause for your review before moving on.
- Each phase leaves the app runnable; I won't land a phase that breaks the previous one.
- Tests go where they earn their keep — heaviest around `workflow.ts` and the stats math.
- Anything that changes a design decision (schema, endpoints, flow) gets flagged and reflected back into ARCHITECTURE.md.