# Runbook

Last updated: 2026-03-06

## 1) Local start
From repo root:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Run app and worker in separate terminals:

```bash
npm run dev
npm run worker:dev
```

## 2) Login
Configured from `.env`:
- `OPERATOR_USERNAME` / `OPERATOR_PASSWORD`
- `ANALYST_USERNAME` / `ANALYST_PASSWORD`

Operator role is required for live controls, settings updates, and name backfill endpoint.

## 3) Quick operational checklist
Before expecting autonomous paper trades:
1. Worker is running and logging every ~5 seconds.
2. In UI bot panel:
   - Live is disabled (for paper auto-trading)
   - Kill switch is clear
   - Worker healthy
   - Data fresh
3. Settings sanity:
   - Paper auto-trading enabled
   - `minLiquidityUsd` can be `0` for current feed behavior
   - Reasonable thresholds (`edge`, `confidence`, `maxSpread`)
4. Wait for cadence window:
   - `minutes_to_hours` mode: up to ~5 minutes between decisions

## 4) Useful commands
Lint:
```bash
npm run lint
```

Build:
```bash
npm run build
```

If build throws missing chunk/module errors from `.next`, clean cache and rebuild:
```bash
rm -rf .next
npm run build
```

## 5) Troubleshooting by symptom

### A) "No opportunities" in UI
- Open settings and loosen filters temporarily:
  - low `minLiquidityUsd`
  - low `minConfidence`
  - low `edgeThreshold`
- Confirm worker is writing rows.

### B) Opportunities show `Market 0x...`
- Use UI button `Backfill Names` in opportunities panel.
- Or call operator endpoint: `POST /api/opportunities/backfill-names`.

### C) Bot never places paper trades
Check worker log reason codes (printed each tick):
- `paper_disabled_or_live_enabled_or_killed`
- `cadence_guard`
- `no_eligible_opportunity`
- `max_positions_day`
- `paper_order_created`

Action pattern:
- ensure `liveEnabled=false`
- ensure paper autotrading enabled
- reduce filter strictness
- allow cadence time to pass

### D) Settings save fails with invalid payload
- Ensure numeric fields contain valid numbers.
- `minLiquidityUsd=0` is now allowed.

### E) Login fails
- Confirm credentials are set in `.env` (not only `.env.example`).
- Restart `npm run dev` after env changes.

## 6) Environment variables (critical)
Database/session:
- `DATABASE_URL`
- `SESSION_COOKIE_NAME`
- `SESSION_TTL_HOURS`

Auth users:
- `OPERATOR_USERNAME`
- `OPERATOR_PASSWORD`
- `ANALYST_USERNAME`
- `ANALYST_PASSWORD`

Bot/security:
- `KILL_SWITCH_SHARED_SECRET`
- `LIVE_WALLET_KEY_REF`

Polymarket feed:
- `POLYMARKET_FEED_MODE` (`real` or `mock`)
- `POLYMARKET_CLOB_BASE_URL`
- `POLYMARKET_GAMMA_BASE_URL`
- `POLYMARKET_API_KEY`
- `POLYMARKET_API_SECRET`
- `POLYMARKET_API_PASSPHRASE`
- `POLYMARKET_PROFILE_KEY`

## 7) DB sanity checks (optional)
Use any SQL/Prisma client to inspect:
- `WorkerHeartbeat` recency
- latest `Opportunity` rows
- `PaperOrder` counts in last 24h
- `BotState` flags (`liveEnabled`, `killSwitchActive`, `lastOrderAt`)

## 8) Handoff note
Read `docs/HANDOVER.md` first for architecture and current limitations before making strategy changes.
