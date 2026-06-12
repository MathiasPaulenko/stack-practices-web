---
contentType: docs
slug: environment-setup-guide-template
templateType: guideline
title: "Environment Setup Guide Template"
description: "A template for documenting how to set up local development, staging, and production environments consistently and reproducibly."
metaDescription: "Environment setup guide template: document local dev, staging, and production setup steps for consistent and reproducible onboarding."
difficulty: beginner
topics:
  - devops
tags:
  - environment-setup
  - onboarding
  - local-development
  - template
  - devcontainer
relatedResources:
  - /docs/templates/onboarding-guide-template
  - /docs/templates/runbook-template
  - /guides/devops/docker-for-developers-guide
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Environment setup guide template: document local dev, staging, and production setup steps for consistent and reproducible onboarding."
  keywords:
    - environment setup guide template
    - local development setup
    - dev environment documentation
    - onboarding dev setup
    - reproducible environment
---

# Environment Setup Guide Template

Use this template to document reproducible environment setup for new team members and CI pipelines.

## Template

```markdown
# Environment Setup: [Project Name]

## Prerequisites

| Tool | Version | Install Command |
|------|---------|----------------|
| Node.js | 20.x | `nvm install 20` |
| Docker | 24.x | [Docker Desktop](...) |
| Git | 2.40+ | `brew install git` |

## Quick Start

```bash
# 1. Clone repository
git clone git@github.com:org/project.git
cd project

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Start services
docker compose up -d

# 5. Run database migrations
npm run db:migrate

# 6. Seed test data
npm run db:seed

# 7. Start application
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Cache connection |
| `API_KEY` | Yes | — | External service key |

## Verification

```bash
# Health check
curl http://localhost:3000/health

# Expected response
{"status":"ok","version":"2.4.1"}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Port 3000 in use | Another process | `lsof -ti:3000 | xargs kill -9` |
| Migration fails | Schema drift | `npm run db:reset` |
| Docker won't start | Docker Desktop not running | Start Docker Desktop |
```

## Best Practices

- **Use `.env.example`** — never commit secrets; commit a template with dummy values
- **Automate with `make` or scripts** — one command should get a new developer running
- **Test setup monthly** — stale setup docs are worse than no docs
- **Pin dependency versions** — "latest" causes "works on my machine"
- **Document OS differences** — macOS, Linux, and Windows paths vary

## Common Mistakes

- Setup instructions that only work on the author's machine
- Missing `.env.example` — new developers guess at required variables
- No verification step — developers do not know if setup succeeded
- Hardcoded local paths — `/Users/alice/project` does not work for Bob

## Frequently Asked Questions

### Should I use Docker for local development?

Yes, if your project has more than two dependencies (database, cache, queue). A `docker-compose.yml` ensures every developer runs the same versions. For simple projects, local package managers suffice.

### How do I handle secrets in local setup?

Use a shared secret manager (1Password, Vault) or encrypted `.env` files. Never commit secrets to Git. Document which secrets are needed and where to get them.

### What if setup takes more than 30 minutes?

Automate more. If a new hire spends an entire day on setup, your automation is broken. Target: fresh laptop to running code in under 15 minutes.
