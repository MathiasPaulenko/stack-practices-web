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
  - devops
  - onboarding
  - template
  - ci-cd
  - automation
relatedResources:
  - /docs/onboarding-guide-template
  - /docs/runbook-template
  - /guides/docker-for-developers-guide
  - /docs/bug-report-template
  - /docs/disaster-recovery-plan-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
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

## Overview

Environment setup documentation is the first thing a new developer reads. If it is outdated, incomplete, or only works on one machine, you lose hours of productivity before the first line of code gets written. A good setup guide gets a developer from fresh clone to running application in under 15 minutes.

This template covers:

1. **Prerequisites** — tools, versions, and install commands
2. **Quick start** — step-by-step commands from clone to running app
3. **Environment variables** — required and optional configuration
4. **Verification** — how to confirm the setup worked
5. **Troubleshooting** — common issues and fixes

## When to Use

- **New project setup** — document environment requirements from day one
- **Team onboarding** — give new hires a single document to get running
- **CI pipeline setup** — use the same steps in CI as local development
- **Environment migration** — moving from one cloud provider to another
- **Disaster recovery** — rebuilding a development environment from scratch

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

## Lifecycle

### Initial setup

When a project starts, document the environment setup from day one. Include every tool, version, and configuration step. This becomes the foundation for onboarding and CI.

### Onboarding

New developers follow the guide to get running. Track how long it takes and collect feedback. If a developer gets stuck, update the guide to prevent the same issue for the next person.

### Maintenance

Review the setup guide monthly. Check for outdated versions, broken links, and missing steps. Test the guide on a clean environment quarterly to catch drift.

### Migration

When moving to new tools or cloud providers, update the guide first, then migrate. The guide becomes the migration plan.

## Filled Example

```markdown
# Environment Setup: StackPractices Web

## Prerequisites

| Tool | Version | Install Command |
|------|---------|----------------|
| Node.js | 20.x | `nvm install 20` |
| Docker | 24.x | [Docker Desktop](https://docker.com) |
| Git | 2.40+ | `brew install git` |
| Astro CLI | 5.x | `npm install -g @astrojs/cli` |

## Quick Start

```bash
# 1. Clone repository
git clone git@github.com:org/stackpractices-web.git
cd stackpractices-web

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Start services (database, cache)
docker compose up -d

# 5. Run database migrations
npm run db:migrate

# 6. Seed test data
npm run db:seed

# 7. Start development server
npm run dev
```

Open http://localhost:4321 in your browser.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Cache connection |
| `API_KEY` | Yes | — | External service key |
| `GA_MEASUREMENT_ID` | No | — | Google Analytics 4 ID |
| `PUBLIC_SITE_URL` | Yes | `http://localhost:4321` | Base URL for SEO |

## Verification

```bash
# Health check
curl http://localhost:4321/health

# Expected response
{"status":"ok","version":"2.4.1"}

# Run tests
npm test

# Build check
npm run build
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Port 4321 in use | Another process | `lsof -ti:4321 | xargs kill -9` |
| Migration fails | Schema drift | `npm run db:reset` |
| Docker won't start | Docker Desktop not running | Start Docker Desktop |
| `npm install` fails | Node version mismatch | `nvm use 20` |
| Build fails | Missing env vars | Check `.env` against `.env.example` |
```

## What works

- **Use `.env.example`** — never commit secrets; commit a template with dummy values
- **Automate with `make` or scripts** — one command should get a new developer running. Link to the [Onboarding Guide Template](/docs/templates/onboarding-guide-template) for a full checklist.
- **Test setup monthly** — stale setup docs are worse than no docs
- **Pin dependency versions** — "latest" causes "works on my machine"
- **Document OS differences** — macOS, Linux, and Windows paths vary
- **Provide a verification step** — developers need to know the setup succeeded
- **Keep a troubleshooting table** — every recurring issue should be documented

## Common Mistakes

- Setup instructions that only work on the author's machine
- Missing `.env.example` — new developers guess at required variables. Pair with the [Runbook Template](/docs/templates/runbook-template) for troubleshooting steps.
- No verification step — developers do not know if setup succeeded
- Hardcoded local paths — `/Users/alice/project` does not work for Bob
- Not testing on a clean environment — stale caches hide setup bugs
- Mixing global and local tool installation — document which approach to use

## Variants

### Monorepo setup

For monorepos, document workspace-level setup first, then per-package setup. Use `pnpm` or `turbo` for workspace management. Include instructions for running individual packages and the full monorepo.

### Container-only development

For projects that run entirely in Docker, document `docker compose up` as the single command. Include instructions for rebuilding containers, viewing logs, and attaching debuggers. No local Node.js or Python installation needed.

### Remote development (Codespaces, Gitpod)

For cloud-based development, document how to start a workspace, port forwarding, and environment variable injection. Include the devcontainer.json configuration and any required extensions.

## Automation

### Makefile approach

```makefile
.PHONY: setup dev test clean

setup:
	nvm install
	npm ci
	cp .env.example .env
	npm run db:migrate
	npm run db:seed

dev:
	npm run dev

test:
	npm run test:unit
	npm run test:integration

clean:
	rm -rf node_modules dist .astro
```

### Devcontainer

For VS Code users, a `.devcontainer/devcontainer.json` standardizes the environment:

```json
{
  "name": "Project Dev Environment",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "postCreateCommand": "npm ci && npm run db:migrate",
  "forwardPorts": [4321, 5432, 6379]
}
```

### CI parity

Use the same setup commands in CI as in the guide. This ensures the guide stays accurate — if CI breaks, the guide needs updating too.

## Frequently Asked Questions

### Should I use Docker for local development?

Yes, if your project has more than two dependencies (database, cache, queue). See [Docker for Developers Guide](/guides/devops/docker-for-developers-guide) for setup guidelines. A `docker-compose.yml` ensures every developer runs the same versions. For simple projects, local package managers suffice.

### How do I handle secrets in local setup?

Use a shared secret manager (1Password, Vault) or encrypted `.env` files. Never commit secrets to Git. Document which secrets are needed and where to get them.

### What if setup takes more than 30 minutes?

Automate more. If a new hire spends an entire day on setup, your automation is broken. Target: fresh laptop to running code in under 15 minutes.

### Should I use nvm, fnm, or volta for Node.js version management?

Any of them works. Pick one and document it. `nvm` is the most widely used. `fnm` is faster. `volta` pins versions per-project automatically. The key is consistency — everyone on the team should use the same tool.

### How do I handle platform-specific setup (macOS vs Windows vs Linux)?

Document each platform separately if paths or commands differ. Use cross-platform tools where possible (Docker, Node.js). For platform-specific tools, provide alternative commands in a table. Consider a `Makefile` that abstracts platform differences.

### Should I include IDE configuration in the setup guide?

Yes, if the project requires specific extensions or settings. Include a `.vscode/extensions.json` with recommended extensions. Document any required linters, formatters, or language servers. Keep it optional — not everyone uses the same IDE.

### How often should I update the setup guide?

Review monthly. Check for outdated versions, broken links, and missing steps. Test the guide on a clean environment quarterly. Assign a rotating owner to keep the guide current.

### What if a developer is on a different OS than the team?

Document platform-specific steps in separate sections or tables. Use cross-platform tools (Docker, Node.js) where possible. For platform-specific tools, provide alternative commands. Consider a devcontainer for VS Code users to standardize the environment.

### Should I include database seeding in the setup guide?

Yes, if the application requires seed data to function. Include a `npm run db:seed` command and document what data it creates. For large datasets, provide a subset or synthetic data generator. See [Database Schema Documentation Template](/docs/templates/database-schema-documentation-template) for schema context.
