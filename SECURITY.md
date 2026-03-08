# Security Policy

## Scope

This repository contains prototype trading and operator-control code. Treat anything related to credentials, wallet references, live execution, or auth flows as security-sensitive.

## Reporting a vulnerability

Please do not open a public GitHub issue for security problems.

If you find a vulnerability, contact the repository owner privately through GitHub and include:

- a short summary of the issue
- affected files or routes
- reproduction steps
- impact assessment
- any suggested fix or mitigation

## Please do not include secrets

Never post:

- `.env` contents
- API keys
- wallet references
- tokens
- session cookies
- database connection strings

If you need to show configuration, replace secret values with obvious placeholders.

## High-risk areas in this repo

- auth and session handling
- kill-switch and live-mode controls
- worker execution logic
- environment variable handling
- anything that touches external trading credentials

## Response expectations

This is a low-maintenance public repo, so response times are not guaranteed. Clear and reproducible reports are much more likely to be actionable.
