# QUANT

Experimental Polymarket operator console built with Next.js, TypeScript, Prisma, and a background worker.

This repo is being left open for other people to explore and extend. It is usable as a local scaffold for paper-trading experiments, but it should not be treated as a production-ready trading system.

## Project status

- Low-maintenance personal project
- Open to forks, experiments, and community improvements
- Best suited for local development and paper-trading workflows
- Live trading paths exist, but they still need independent review before any real-money use

## What it includes

- Next.js dashboard for opportunities, portfolio, risk, trades, and settings
- Cookie-based role login for operator and analyst views
- Prisma-backed persistence layer
- Background worker for market ingestion, signal scoring, and autonomous execution loops
- Paper-trading flow for testing strategy behavior without live execution
- Kill switch and preflight checks around live mode

## Quick start

1. Copy the sample environment file:

```bash
cp .env.example .env
```

2. Update `.env` with your own credentials and secrets.

3. Install dependencies:

```bash
npm install
```

4. Prepare the database:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

5. Start the app and worker in separate terminals:

```bash
npm run dev
npm run worker:dev
```

6. Open `http://localhost:3000/login` and sign in with the credentials you set in `.env`.

## Default local workflow

If you just want to explore the project safely:

- keep `POLYMARKET_FEED_MODE=mock` while getting familiar with the codebase
- leave live mode disabled
- use the paper-trading flow first

If you want real market data, switch `POLYMARKET_FEED_MODE=real` and provide the relevant Polymarket credentials in `.env`.

## Environment variables

The full list is in [.env.example](/Users/tonylaughton/AI-Coding/QUANT/.env.example).

The most important groups are:

- Database and session: `DATABASE_URL`, `SESSION_COOKIE_NAME`, `SESSION_TTL_HOURS`
- Login credentials: `OPERATOR_USERNAME`, `OPERATOR_PASSWORD`, `ANALYST_USERNAME`, `ANALYST_PASSWORD`
- Bot safety: `KILL_SWITCH_SHARED_SECRET`, `LIVE_WALLET_KEY_REF`
- Polymarket access: `POLYMARKET_FEED_MODE`, `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE`, `POLYMARKET_PROFILE_KEY`

## Useful commands

```bash
npm run dev
npm run worker:dev
npm test
npm run build
```

## Project map

- [src/app](/Users/tonylaughton/AI-Coding/QUANT/src/app): UI routes and API route handlers
- [src/lib](/Users/tonylaughton/AI-Coding/QUANT/src/lib): auth, services, execution logic, feed client, risk controls
- [worker/src/index.ts](/Users/tonylaughton/AI-Coding/QUANT/worker/src/index.ts): background worker loop
- [prisma/schema.prisma](/Users/tonylaughton/AI-Coding/QUANT/prisma/schema.prisma): data model
- [docs/HANDOVER.md](/Users/tonylaughton/AI-Coding/QUANT/docs/HANDOVER.md): architecture and current limitations
- [docs/RUNBOOK.md](/Users/tonylaughton/AI-Coding/QUANT/docs/RUNBOOK.md): operational notes and troubleshooting

## Good places to extend the project

- Improve market classification and tagging quality
- Improve liquidity and order book modelling
- Separate paper-trading cadence from live-trading cadence
- Add better telemetry around skipped trades, fills, and outcomes
- Harden the live execution path and upstream API error handling

## Contributing

See [CONTRIBUTING.md](/Users/tonylaughton/AI-Coding/QUANT/CONTRIBUTING.md).

Small cleanup PRs, bug fixes, and strategy experiments are all reasonable contributions.

## License

[MIT](/Users/tonylaughton/AI-Coding/QUANT/LICENSE)
