# Quant Polymarket NZ App - Handover

Last updated: 2026-03-06

## 1) Project purpose
This repo is a compliance-scoped autonomous Polymarket trading console with:
- web UI (Next.js, TypeScript, Tailwind/shadcn-style components)
- API layer (Next route handlers)
- Postgres + Prisma storage
- always-on worker for market ingestion, signal scoring, opportunities, and autonomous execution

Primary modes:
- Paper autonomous trading (intended default for testing)
- Live autonomous intent creation with preflight/risk gates

## 2) Current high-level state
Working:
- Login/session roles:
  - `operator_admin_nz` (can change settings, control bot/live)
  - `analyst_readonly` (read-only)
- Worker ingests real feed and creates ranked opportunities.
- Names backfill endpoint exists and works for `Market 0x...` fallback rows.
- Tags now infer across: `general`, `politics`, `sports`, `crypto`, `macro`, `oil`, `trending`, `finance`.
- Market sampling rotates over time (not fixed first 40 forever).
- Paper execution path can place autonomous paper trades (with fallback if strict liquidity filter returns none).

Recently fixed:
- Old/stale 2023/2024 markets flooding opportunities: hardened filters (`closed/archived/past`) and moved primary source to `/sampling-markets`.
- Repetitive ranked list: rotating window selection.
- Name resolution: CLOB + Gamma enrichment + manual backfill endpoint.
- Settings save rejecting `minLiquidityUsd=0`: API now permits zero.

## 3) Architecture map
- Web pages:
  - `src/app/(dashboard)/page.tsx` (opportunities + bot/risk panels)
  - `src/app/portfolio/page.tsx`
  - `src/app/trades/page.tsx`
  - `src/app/settings/page.tsx`
- Worker:
  - `worker/src/index.ts`
- Market feed client:
  - `src/lib/polymarket/client.ts`
- Core services:
  - `src/lib/services/opportunities.ts`
  - `src/lib/services/paper.ts`
  - `src/lib/services/bot.ts`
- Auth/guards:
  - `src/lib/auth.ts`, `src/lib/guards.ts`, `src/middleware.ts`
- Persistence:
  - `prisma/schema.prisma`, `prisma/seed.ts`

## 4) Data flow
1. Worker fetches market feed and books.
2. Worker computes signal (posterior, edge, confidence, score).
3. Worker writes:
   - `MarketSnapshot`
   - `SignalScore`
   - `Opportunity`
4. Worker runs:
   - paper mark/auto-close routines
   - paper decision routine
   - live decision routine
5. UI consumes API endpoints from DB snapshots and order tables.

## 5) Important behavior details
- Paper auto-trading is disabled whenever `liveEnabled=true`.
- Cadence is tied to mode:
  - `minutes_to_hours` ~ 5 min decision cadence
  - `hours_to_days` ~ 30 min decision cadence
- `lastOrderAt` currently gates both live and paper cadence.
- If strict opportunity filters produce none, worker now falls back to `minLiquidity=0` query before skipping.

## 6) APIs to know
Core control/read:
- `POST /api/bot/live/enable`
- `POST /api/bot/live/disable`
- `POST /api/bot/kill-switch`
- `POST /api/bot/mode`
- `GET /api/bot/status`
- `GET /api/opportunities`
- `GET /api/portfolio`
- `GET /api/orders`
- `GET/POST /api/settings`

Paper utilities:
- `POST /api/paper/run-once`
- `GET /api/paper/orders`
- `GET /api/paper/portfolio`

Name repair utility:
- `POST /api/opportunities/backfill-names` (operator-only)

## 7) Known limitations / risks
- Real feed liquidity field can be sparse/unreliable; spread and confidence are currently better quality gates than liquidity.
- Tagging is heuristic for many markets; classification can still mislabel edge cases.
- Feed quality and endpoint behavior can change without warning.
- Build can occasionally fail from stale `.next` artifacts (see runbook).

## 8) Recommended next work (priority order)
1. Replace heuristic tagging with canonical market taxonomy from official upstream metadata.
2. Improve liquidity estimation using richer order book depth (not single top level / sparse feed fields).
3. Separate `lastPaperOrderAt` and `lastLiveOrderAt` cadence state to avoid cross-mode coupling.
4. Add strategy-level telemetry dashboard:
   - reasons for skip
   - fill/open/close rates
   - per-tag win/loss distribution
5. Add migration-safe config versioning and settings history snapshots.

## 9) Compliance/control model notes
Design intent:
- operator-owned production control
- strict role boundaries
- audit records for state-changing actions
- preflight checks required before live enable

Legal/compliance should be reviewed independently before any non-paper deployment.
