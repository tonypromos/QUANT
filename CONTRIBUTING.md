# Contributing

This repo is open for experimentation and improvements, but it is not on an active product roadmap. Keep changes practical and easy to review.

## Before you start

- Read [README.md](/Users/tonylaughton/AI-Coding/QUANT/README.md) for setup
- Read [docs/HANDOVER.md](/Users/tonylaughton/AI-Coding/QUANT/docs/HANDOVER.md) for architecture and known limitations
- Use [.env.example](/Users/tonylaughton/AI-Coding/QUANT/.env.example) as the starting point for local config

## Recommended workflow

1. Create a branch for your work.
2. Keep changes focused on one problem or improvement.
3. Run the relevant checks before opening a PR:

```bash
npm test
npm run build
```

4. Explain the user-visible behavior change in the PR description.

## Good contribution areas

- bug fixes in the worker, API, or dashboard
- better documentation and onboarding
- safer defaults for local development
- strategy and signal improvements
- operational visibility and troubleshooting improvements

## Scope expectations

- Prefer small, reviewable pull requests over large rewrites
- Avoid adding unnecessary dependencies
- Preserve the existing local-first development flow unless there is a strong reason to change it
- Treat anything related to live trading, credentials, or execution safety as high-risk code

## Security and secrets

- Never commit real credentials, API keys, or wallet references
- Keep `.env` local
- Replace any example secrets with obvious placeholders
- Read [SECURITY.md](/Users/tonylaughton/AI-Coding/QUANT/SECURITY.md) before reporting vulnerabilities

## If you are unsure

Open an issue or PR with the simplest version of the change and describe the tradeoffs clearly.
