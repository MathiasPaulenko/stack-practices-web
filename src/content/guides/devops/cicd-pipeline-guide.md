---
contentType: guides
slug: cicd-pipeline-guide
title: "CI/CD Pipeline Guide"
description: "A practical guide to building CI/CD pipelines with GitHub Actions, testing, deployment strategies, and rollback procedures."
metaDescription: "Learn how to build reliable CI/CD pipelines: GitHub Actions workflows, automated testing, deployment strategies, and production rollbacks."
difficulty: intermediate
topics:
  - devops
  - testing
tags:
  - automation
  - deployment
  - devops
  - github-actions
  - pipeline
  - testing
relatedResources:
  - /recipes/devops/github-actions
  - /guides/testing/testing-strategy-guide
  - /docs/templates/runbook-template
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn how to build reliable CI/CD pipelines: GitHub Actions workflows, automated testing, deployment strategies, and production rollbacks."
  keywords:
    - cicd pipeline
    - github actions
    - continuous integration
    - continuous deployment
    - devops pipeline
    - automated testing
---

## Overview

CI/CD (Continuous Integration / Continuous Deployment) is the backbone of modern software delivery. The following guide covers building pipelines that test, build, and deploy code reliably.

## When to Use

- You deploy code more than once per week
- Multiple developers work on the same codebase
- You need confidence that changes won't break production
- You want to reduce manual deployment errors

## Core Concepts

### Continuous Integration (CI)

Automatically build and test code on every commit.

### Continuous Deployment (CD)

Automatically deploy validated code to production.

### Pipeline Stages

| Stage | Purpose | Typical Tools |
| ----- | ------- | ------------- |
| Lint | Code quality | ESLint, Prettier, Black, SonarQube |
| Test | Verify behavior | Jest, pytest, JUnit, Vitest |
| Build | Create artifacts | Docker, Vite, Webpack, Maven |
| Security | Scan vulnerabilities | Trivy, Snyk, OWASP ZAP |
| Deploy | Release to environment | GitHub Actions, ArgoCD, Terraform |

## Solution: A Production-Ready GitHub Actions Pipeline

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh production
```

## Deployment Strategies

### 1. Rolling Deployment

Gradually replace old instances with new ones.

**Pros**: Zero downtime, simple.
**Cons**: Rollback takes time, version coexistence issues.

### 2. Blue-Green Deployment

Maintain two identical environments; switch traffic instantly.

**Pros**: Instant rollback, zero downtime.
**Cons**: Double infrastructure cost.

### 3. Canary Deployment

Release to a small subset of users first.

**Pros**: Risk mitigation, real-user monitoring.
**Cons**: Complex routing, longer deployment time.

## Rollback Procedures

### Automatic Rollback Triggers

- Error rate exceeds threshold (e.g., >1%)
- Latency p99 exceeds threshold (e.g., >500ms)
- Critical health check fails
- Manual approval not received within timeout

### Rollback Commands

```bash
# Kubernetes rollback
kubectl rollout undo deployment/my-app

# Git revert
git revert HEAD
```

## What Works

- **Fail fast**: Run fastest checks (lint, [unit tests](/recipes/testing/unit-testing)) first
- **Parallelize**: Run independent jobs in parallel
- **Use environments**: Require approvals for production
- **Cache aggressively**: Cache dependencies and build artifacts
- **Store artifacts**: Keep build outputs for traceability
- **Notify on failure**: Alert the team immediately on pipeline failures

## Anti-Patterns

- Deploying without [tests](/guides/testing/testing-strategy-guide)
- Using the same pipeline for all environments
- Manual steps in the deployment process
- No rollback plan
- Ignoring pipeline failures

## Environment Management

A well-structured pipeline treats environments as cattle, not pets. Each environment should be created from the same infrastructure code.

### Environment Matrix

| Environment | Purpose | Data | Access |
|-------------|---------|------|--------|
| **Local** | Developer iteration | Synthetic / seeded | Developer only |
| **CI** | Automated testing | Ephemeral test data | CI service account |
| **Staging** | Pre-production validation | Anonymized production snapshot | Team leads |
| **Production** | Live users | Real user data | On-call engineers |

### Configuration per Environment

Use environment-specific config files or variables rather than branching pipeline logic:

```bash
# .env.local
DATABASE_URL=postgres://localhost/dev_db
LOG_LEVEL=debug

# .env.staging
DATABASE_URL=postgres://staging.internal/staging_db
LOG_LEVEL=info

# .env.production
DATABASE_URL=postgres://prod.internal/prod_db
LOG_LEVEL=warn
```

**Never commit secrets to Git.** Use [secret managers](/guides/security/security-best-practices-guide) (AWS Secrets Manager, HashiCorp Vault, GitHub Secrets) and inject at runtime.

### Database Migrations in CI/CD

Run migrations as a separate pipeline job, not inside the application startup:

1. **Before deploy**: Run migrations against the target environment
2. **Verify**: Run a health check confirming schema version matches app expectation
3. **Deploy**: Only proceed if migration succeeds
4. **Rollback plan**: Have a downgrade script ready for the previous schema version

## Monitoring & Observability

A pipeline without observability is flying blind. Integrate these checks:

- **Synthetic tests** after production deploy (ping critical endpoints)
- **Error rate baseline**: Compare post-deploy error rate to pre-deploy baseline
- **Performance regression**: Alert if p95 latency increases > 20%
- **Smoke tests**: Run a minimal happy-path test immediately after deployment

## FAQ

**Q: How long should a CI pipeline take?**
A: Target under 10 minutes for feedback. Under 5 minutes is ideal.

**Q: Should I deploy on every commit?**
A: Yes, if your tests and monitoring are reliable. Otherwise, deploy on merge to main.

**Q: What's the difference between Continuous Delivery and Continuous Deployment?**
A: Continuous Delivery means code is always deployable; a human approves the release. Continuous Deployment means every validated change goes to production automatically.

**Q: How do I handle database schema changes in CI/CD?**
A: Run [migrations](/recipes/databases/schema-evolution) before deployment, make changes backward-compatible when possible, and have rollback scripts ready. Never drop columns in the same deploy that stops reading them.

**Q: What should I do when a production deployment fails?**
A: Follow this order: 1) Alert the on-call team, 2) Assess if rollback is needed, 3) Execute rollback or forward-fix, 4) Document the incident, 5) Run a post-mortem within 48 hours.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: CI/CD Pipeline for Node.js Microservice

```yaml
# .github/workflows/ci.yml
name: CI/CD
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

permissions:
  contents: read
  id-token: write  # OIDC for deploy

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  security:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: npx semgrep ci --config=p/owasp-top-ten
      - run: npm audit --audit-level=high
      - run: npx trivy fs --scanners vuln,secret .

  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { registry: ${{ env.REGISTRY }}, token: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          kubectl set image deployment/app \
            container=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/app --timeout=5m

  integration-test:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:integration -- --base-url=https://staging.example.com

  deploy-prod:
    runs-on: ubuntu-latest
    needs: integration-test
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Canary deploy
        run: |
          kubectl set image deployment/app \
            container=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/app --timeout=10m

Pipeline metrics:
  | Stage | Target duration |
  |-------|-----------------|
  | lint | < 1 min |
  | test | < 3 min |
  | security | < 2 min |
  | build | < 5 min |
  | deploy-staging | < 2 min |
  | integration-test | < 5 min |
  | deploy-prod | < 5 min |
  | Total | < 23 min |

Lessons:
  - Parallelize lint, test, and security to reduce time
  - Docker layer cache reduces build time 50%+
  - OIDC eliminates long-lived secrets
  - Integration tests against staging, not mocks
  - Prod deploy requires environment approval
```

### How do I set up automatic rollback?

Configure ArgoCD Rollout or Flagger with Prometheus analysis. If error rate > 1% or p99 latency > 2x baseline for 2 min, automatic rollback. Alternatively, use `kubectl rollout undo` manually. Document rollback criteria in the runbook. Rollback should take < 30 seconds.
