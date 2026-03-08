# Quant Polymarket NZ Operator Console

Compliance-safe autonomous trading app scaffold built with Next.js + TypeScript + Prisma.

## Handover docs

- `docs/HANDOVER.md` - architecture, current state, known limits, next steps
- `docs/RUNBOOK.md` - startup, operations, troubleshooting, env checklist

## What is implemented

- Role model:
  - `operator_admin_nz`: can control live bot and settings.
  - `analyst_readonly`: read-only analytics and monitoring.
- Session auth with HTTP-only cookie.
- API endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/bot/live/enable`
  - `POST /api/bot/live/disable`
  - `POST /api/bot/kill-switch`
  - `POST /api/bot/mode`
  - `GET /api/bot/status`
  - `GET /api/opportunities`
  - `GET /api/markets/:id`
  - `GET /api/portfolio`
  - `GET /api/risk`
  - `GET /api/orders`
  - `GET /api/settings`
  - `POST /api/settings`
- `POST /api/alerts/email-toggle`
- `GET /api/paper/orders`
- `GET /api/paper/portfolio`
- Preflight checks before enabling live mode:
  - wallet key reference exists
  - risk limits configured
  - worker heartbeat healthy
  - market data fresh
  - kill switch not active
- Immutable audit event insertions for critical actions.
- Autonomous worker loop (mock feed by default) with:
  - 1-5s ingestion cadence
  - signal generation
  - opportunity ranking persistence
  - autonomous paper-trade simulation loop when live mode is disabled
  - low-frequency autonomous live order intent creation
  - daily loss stop and risk halt behavior
- Fancy `shadcn`-style UI:
  - opportunities dashboard
  - market deep dive (`/markets/[id]`)
  - portfolio/risk page (`/portfolio`)
  - settings/model controls (`/settings`)

## NZ operator login

The app uses env-based credentials:

- `OPERATOR_USERNAME`
- `OPERATOR_PASSWORD`
- `ANALYST_USERNAME`
- `ANALYST_PASSWORD`

Login UI: `/login`

## Local setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Set strong credentials and secrets in `.env`.
   - Include Polymarket credentials:
     - `POLYMARKET_API_KEY`
     - `POLYMARKET_API_SECRET`
     - `POLYMARKET_API_PASSPHRASE`
     - `POLYMARKET_PROFILE_KEY`
   - Set `POLYMARKET_FEED_MODE=real` to use live market-data ingestion.

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and migrate:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed singleton records:

```bash
npm run seed
```

6. Run app and worker (separate terminals):

```bash
npm run dev
npm run worker:dev
```

## Signed kill-switch API

`POST /api/bot/kill-switch` accepts either:

- operator session cookie, or
- signed headers:
  - `x-kill-timestamp`
  - `x-kill-signature`

Signature algorithm:

- payload string: `${timestamp}.${raw_json_body}`
- digest: `HMAC-SHA256` with `KILL_SWITCH_SHARED_SECRET`

## Production notes

- Put Vercel project, database project, and worker runtime under NZ operator-controlled accounts.
- Keep live trading keys only in NZ operator-managed secret store/KMS.
- Keep non-operator users as read-only.
- Integrate real Polymarket transport in `src/lib/polymarket/client.ts` (`RealPolymarketClient`).
  - Current `RealPolymarketClient` consumes official CLOB endpoints (`/simplified-markets`, `/book`).
