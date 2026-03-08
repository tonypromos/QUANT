# Origin

## What this repo started as

`QUANT` began as an AI-assisted prototype for a Polymarket operator console rather than as a long-running product with a formal research process behind it.

The original intent was to stand up a single repo that combined:

- a Next.js operator dashboard
- a background worker for market ingestion and signal generation
- role-based access for an operator and a read-only analyst
- paper-trading and live-trading control paths
- audit and kill-switch controls around live behavior

The repo still reflects that origin. It is closer to a working scaffold and experiment bed than to a finished trading platform.

## About the "original prompt"

The exact original prompt text is not preserved in this repository.

What is preserved is the shape of the original brief through the code and docs:

- a compliance-scoped operator console
- NZ operator control over live settings and secrets
- analyst access kept read-only
- preflight checks before enabling live mode
- immutable audit events for critical actions
- a worker that ingests markets, scores them, and creates opportunities

If the exact prompt is recovered later, it can be added here. Until then, this document is the best honest summary of the repo's starting intent.

## Reconstructed brief

The project can be reasonably described as:

> Build an operator console for autonomous Polymarket trading with a dashboard, role-based auth, paper/live mode controls, preflight safety checks, persistence, and a worker that ingests market data and produces ranked opportunities.

That is a reconstruction from the implementation, not a verbatim quote from a saved prompt.

## What changed after the initial scaffold

As the repo evolved, some parts moved beyond the initial scaffold:

- the worker gained real-feed support in addition to mock data
- opportunity ranking and market filtering were iterated on
- name backfill and market-tag heuristics were added
- paper-trading routines became more autonomous
- the UI expanded into opportunities, market detail, portfolio, trades, and settings

At the same time, parts of the system still show prototype-stage decisions:

- heuristics instead of calibrated models
- partial real-feed integration
- limited operational hardening around live execution
- architecture optimized for local experimentation more than production deployment

## How to read the repo

The best mental model is:

- product idea: operator-facing Polymarket control console
- implementation style: pragmatic prototype
- research maturity: low
- contributor opportunity: high, especially around signal quality, execution safety, and observability

For the current scoring logic, read [SIGNAL_MODEL.md](/Users/tonylaughton/AI-Coding/QUANT/docs/SIGNAL_MODEL.md).
