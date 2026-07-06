---
contentType: docs
slug: ci-cd-pipeline-design-template
title: "CI/CD Pipeline Design Template"
description: "A template for documenting CI/CD pipeline stages, gates, environments, deployment strategies, rollback procedures, and security scanning."
metaDescription: "Use this CI/CD pipeline design template to define stages, quality gates, environments, deployment strategies, rollback procedures, and security."
difficulty: intermediate
topics:
  - testing
tags:
  - devops
  - ci-cd
  - pipeline
  - deployment
  - template
  - automation
  - infrastructure
relatedResources:
  - /docs/devops/helm-chart-review-checklist
  - /docs/devops/kubernetes-pod-disruption-budget-template
  - /docs/devops/terraform-state-management-policy
  - /docs/observability/incident-postmortem-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this CI/CD pipeline design template to define stages, quality gates, environments, deployment strategies, rollback procedures, and security."
  keywords:
    - ci cd pipeline
    - pipeline design
    - deployment strategy
    - devops
    - template
    - continuous integration
    - continuous deployment
---

## Overview

A CI/CD pipeline design document specifies how code moves from commit to production. It defines pipeline stages, quality gates, environments, deployment strategies, and rollback procedures. Without a design document, pipelines grow organically with inconsistent gates and unclear promotion criteria.

## When to Use

- Designing a new CI/CD pipeline
- Standardizing pipelines across teams
- Adding new environments or deployment stages
- Implementing deployment strategy changes (blue-green, canary)
- Compliance documentation for deployment procedures

## Solution

```markdown
# CI/CD Pipeline Design — `<Project Name>`

## Pipeline Overview

| Field | Value |
|-------|-------|
| Project | Example Web Application |
| Pipeline ID | CI-APP-001 |
| Version | 4.1.0 |
| Owner | DevOps Team |
| Last Updated | 2026-07-05 |
| CI Platform | GitHub Actions |
| CD Platform | ArgoCD (GitOps) |
| Container Registry | ghcr.io/example/app |
| Deployment Strategy | Blue-green (prod), Rolling (staging) |
| Pipeline Trigger | Push to main, PR creation |
| Average Pipeline Duration | 12 minutes |

## 1. Pipeline Stages

### Stage Flow

```
Commit → Build → Test → Security Scan → Package → Deploy Staging → Integration Tests → Deploy Prod → Verify
```

### Stage Details

| Stage | Duration | Gate | Failure Action | Parallel |
|-------|----------|------|----------------|----------|
| Build | 2 min | Compilation success | Stop pipeline | No |
| Unit Tests | 3 min | 100% pass, > 80% coverage | Stop pipeline | Yes (with lint) |
| Lint | 1 min | 0 errors | Stop pipeline | Yes (with unit tests) |
| Security Scan | 2 min | 0 critical vulnerabilities | Stop pipeline | Yes (with SAST) |
| SAST | 2 min | 0 critical findings | Stop pipeline | Yes (with security scan) |
| Package | 1 min | Image build success | Stop pipeline | No |
| Deploy Staging | 1 min | Health check pass | Stop pipeline | No |
| Integration Tests | 2 min | 100% pass | Stop pipeline | No |
| Deploy Prod | 1 min | Manual approval + health check | Stop pipeline | No |
| Verify | 1 min | Smoke tests pass | Auto-rollback | No |

## 2. Quality Gates

### Build Gate

| Check | Threshold | Tool | Action on Failure |
|-------|-----------|------|-------------------|
| Compilation | 0 errors | TypeScript compiler | Stop pipeline |
| Type errors | 0 errors | tsc --noEmit | Stop pipeline |
| Dependency resolution | Success | npm ci | Stop pipeline |
| Lockfile consistency | No drift | npm ci --frozen-lockfile | Stop pipeline |

### Test Gate

| Check | Threshold | Tool | Action on Failure |
|-------|-----------|------|-------------------|
| Unit test pass rate | 100% | Vitest | Stop pipeline |
| Code coverage | > 80% overall | Vitest + c8 | Stop pipeline |
| Coverage per file | > 60% | Vitest + c8 | Warning |
| Mutation testing | > 70% | Stryker (weekly) | Warning |
| Test duration | < 5 min | Vitest | Warning |

### Security Gate

| Check | Threshold | Tool | Action on Failure |
|-------|-----------|------|-------------------|
| Dependency vulnerabilities (critical) | 0 | npm audit + Snyk | Stop pipeline |
| Dependency vulnerabilities (high) | 0 | npm audit + Snyk | Stop pipeline |
| Dependency vulnerabilities (medium) | < 5 | npm audit + Snyk | Warning |
| SAST findings (critical) | 0 | SonarQube | Stop pipeline |
| SAST findings (high) | 0 | SonarQube | Stop pipeline |
| Container image scan | 0 critical | Trivy | Stop pipeline |
| Secret scanning | 0 secrets | GitLeaks | Stop pipeline |
| License compliance | No GPL-3.0 | license-checker | Stop pipeline |

### Deployment Gate

| Check | Threshold | Tool | Action on Failure |
|-------|-----------|------|-------------------|
| Staging health check | 200 OK | Kubernetes probe | Stop pipeline |
| Integration tests | 100% pass | Playwright | Stop pipeline |
| Performance regression | < 10% slower | Lighthouse CI | Warning |
| Manual approval | Approved | GitHub Environment | Stop pipeline |
| Production health check | 200 OK | Kubernetes probe | Auto-rollback |
| Smoke tests | 100% pass | Custom script | Auto-rollback |

## 3. Environments

### Environment Matrix

| Environment | Purpose | Access | Data | Refresh Cycle | Approval |
|-------------|---------|--------|------|---------------|----------|
| Local | Development | Developer | Mock data | On demand | None |
| CI | Automated testing | CI system | Fixtures | Per run | None |
| Staging | Pre-production testing | Dev + QA | Anonymized prod copy | Weekly | Auto-deploy on main merge |
| Production | Live user traffic | Restricted | Real data | N/A | Manual approval |

### Environment Configuration

| Variable | Local | CI | Staging | Production |
|----------|-------|-----|---------|------------|
| NODE_ENV | development | test | staging | production |
| LOG_LEVEL | debug | info | info | warn |
| DATABASE_URL | localhost:5432 | ci-postgres:5432 | staging-db.internal | prod-db.internal |
| REDIS_URL | localhost:6379 | ci-redis:6379 | staging-redis.internal | prod-redis.internal |
| API_RATE_LIMIT | unlimited | unlimited | 1000/min | 100/min |
| FEATURE_FLAGS | all on | all on | staging config | production config |
| SENTRY_DSN | — | — | staging DSN | production DSN |
| CORS_ORIGINS | localhost | ci.example.com | staging.example.com | example.com |

## 4. Deployment Strategies

### Staging: Rolling Update

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max unavailable | 0 | No downtime during staging deploy |
| Max surge | 1 | One extra pod during update |
| Progress deadline | 5 min | Fail if rollout stalls |

### Production: Blue-Green Deployment

| Step | Action | Duration | Verification |
|------|--------|----------|--------------|
| 1 | Deploy new version to green environment | 2 min | Green health check |
| 2 | Run smoke tests on green | 1 min | 100% pass |
| 3 | Switch traffic from blue to green | 30 sec | Router update |
| 4 | Monitor green for 5 minutes | 5 min | Error rate < 1% |
| 5 | Keep blue as rollback target | — | Blue stays running |
| 6 | Decommission blue after 24 hours | — | No rollback needed |

### Production: Canary (Alternative)

| Step | Action | Traffic | Duration | Rollback Condition |
|------|--------|---------|----------|-------------------|
| 1 | Deploy canary pods | 0% | 2 min | Health check fails |
| 2 | Route 5% traffic to canary | 5% | 10 min | Error rate > 2% |
| 3 | Route 25% traffic to canary | 25% | 10 min | Error rate > 1% |
| 4 | Route 50% traffic to canary | 50% | 10 min | Error rate > 0.5% |
| 5 | Route 100% traffic to canary | 100% | 5 min | Error rate > 0.1% |
| 6 | Decommission old pods | 0% old | 2 min | — |

## 5. GitHub Actions Pipeline

### Workflow Configuration

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --frozen-lockfile
      - run: npm run build
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=ref,event=branch
            type=ref,event=pr
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  test:
    name: Unit Tests + Coverage
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --frozen-lockfile
      - run: npm run test:unit -- --coverage --reporter=json
      - name: Check coverage
        run: |
          COVERAGE=$(node -e "const c=require('./coverage/coverage-summary.json'); console.log(c.total.lines.pct)")
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "FAIL: Coverage $COVERAGE% is below 80%"
            exit 1
          fi
          echo "OK: Coverage $COVERAGE%"

  lint:
    name: Lint
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --frozen-lockfile
      - run: npm run lint
      - run: npm run format:check

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --frozen-lockfile
      - run: npm audit --audit-level=high
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [test, lint, security]
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }} \
            --namespace staging
          kubectl rollout status deployment/app --namespace staging --timeout=5m

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --frozen-lockfile
      - run: npx playwright test --project=integration
        env:
          BASE_URL: https://staging.example.com

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4
      - name: Blue-green deploy
        run: |
          # Deploy to green
          kubectl set image deployment/app-green \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }} \
            --namespace production
          kubectl rollout status deployment/app-green --namespace production --timeout=5m

          # Run smoke tests
          npm run test:smoke -- --base-url=https://green.example.com

          # Switch traffic
          kubectl patch service/app --namespace production \
            -p '{"spec":{"selector":{"version":"green"}}}'

          # Verify
          sleep 60
          npm run test:smoke -- --base-url=https://example.com
```

## 6. Rollback Procedures

### Automated Rollback

| Trigger | Detection | Action | Duration |
|---------|-----------|--------|----------|
| Health check failure | Kubernetes liveness probe fails 3x | Auto-rollback to previous version | 30 sec |
| Error rate spike | Error rate > 5% for 2 min | Auto-rollback | 2 min |
| Latency spike | p99 latency > 5s for 5 min | Auto-rollback | 5 min |
| Smoke test failure | Post-deploy smoke tests fail | Auto-rollback | 1 min |

### Manual Rollback

```bash
# Blue-green rollback: switch back to blue
kubectl patch service/app --namespace production \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Rolling deployment rollback
kubectl rollout undo deployment/app --namespace production

# Rollback to specific revision
kubectl rollout undo deployment/app --namespace production --to-revision=3

# Check rollout status
kubectl rollout status deployment/app --namespace production
```

### Rollback Verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Version | `kubectl get deployment app -o jsonpath='{.spec.template.spec.containers[0].image}'` | Previous image tag |
| Health | `kubectl get pods -l app=app --field-selector=status.phase=Running` | All pods running |
| Traffic | `curl -s https://example.com/health` | 200 OK |
| Error rate | Check Grafana dashboard | < 1% |
| Logs | `kubectl logs -l app=app --tail=50` | No errors |
```

## Explanation

A CI/CD pipeline design document serves three audiences: developers who trigger pipelines, DevOps engineers who maintain them, and auditors who verify compliance. Developers need to know what gates exist and what causes failures. DevOps engineers need the full pipeline configuration and rollback procedures. Auditors need evidence of security scanning and approval processes.

The pipeline stages define the flow from commit to production. Each stage has a gate: a condition that must be met to proceed. Gates prevent bad code from reaching production. The key gates are build (compilation), test (unit + coverage), security (vulnerabilities + SAST), and deployment (health checks + smoke tests).

Quality gates define specific thresholds. "100% unit test pass" is non-negotiable. "80% coverage" ensures new code is tested. "0 critical vulnerabilities" prevents known security issues from shipping. These gates should be automated — manual gates are inconsistent and slow.

Environments provide isolated testing spaces. CI runs tests in an ephemeral environment. Staging mirrors production with anonymized data. Production is the real thing. Each environment has its own configuration, and secrets are managed via environment-specific secret stores.

Deployment strategies control how new code reaches production. Rolling updates replace pods gradually with no downtime. Blue-green deployments maintain two identical environments and switch traffic instantly. Canary deployments route a small percentage of traffic to the new version and increase it gradually. The choice depends on risk tolerance and infrastructure complexity.

Rollback procedures define how to reverse a deployment. Automated rollback triggers on health check failures, error rate spikes, or smoke test failures. Manual rollback is available for cases where automated detection doesn't catch the issue. The rollback procedure should be tested regularly — an untested rollback is a hope, not a procedure.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Microservices | Pipeline per service, shared base | Each service has its own pipeline |
| Monorepo | Pipeline with path-based triggers | Only build changed packages |
| Mobile app | Add app store deployment stage | TestFlight, Play Store rollout |
| Infrastructure | Use Terraform pipeline | Plan → apply → verify |
| Compliance-heavy | Add manual approval at every stage | SOC 2, HIPAA requirements |
| Feature flags | Decouple deploy from release | Deploy dark, enable gradually |

## What Works

1. Automate all gates — manual gates are bottlenecks and inconsistent
2. Fail fast — put the cheapest checks first (lint before integration tests)
3. Run independent stages in parallel — reduces pipeline duration
4. Cache dependencies and Docker layers — saves minutes per run
5. Test the rollback procedure — untested rollbacks fail when needed
6. Use GitOps for deployment — ArgoCD/Flux sync cluster state to Git
7. Monitor post-deploy — catch issues that gates don't detect

## Common Mistakes

1. No quality gates — anything can reach production
2. Gates too strict — pipeline fails constantly, developers bypass it
3. Gates too loose — bad code reaches production
4. No staging environment — testing in production
5. No rollback plan — manual rollback takes hours during an incident
6. Long pipeline duration — developers lose context waiting for feedback
7. No security scanning — vulnerabilities ship to production undetected

## Frequently Asked Questions

### How long should a CI/CD pipeline take?

Under 15 minutes for the full pipeline (commit to production deploy). Build + test should be under 5 minutes for developer feedback. Security scanning adds 2-3 minutes. Deployment and verification add 3-5 minutes. If the pipeline takes longer, parallelize stages, cache dependencies, and split into multiple pipelines (fast feedback vs. thorough validation).

### Should we use manual approval for production deployment?

It depends on the team and risk tolerance. For high-stakes deployments (financial, healthcare), manual approval adds a checkpoint. For continuous deployment at scale, manual approval is a bottleneck. A compromise: auto-deploy during business hours with monitoring, require approval for off-hours deployments.

### What is the difference between continuous delivery and continuous deployment?

Continuous delivery (CD) automatically prepares every change for release, but deployment to production requires manual approval. Continuous deployment (CD) automatically deploys every change that passes all gates to production. The difference is the manual approval step. Most teams start with continuous delivery and move to continuous deployment as confidence grows.

### How do we handle database migrations in CI/CD?

Run migrations as a separate pipeline stage before the application deployment. Use backward-compatible migrations (add columns, don't remove them). Deploy the new application version that uses the new columns. In a later release, run a cleanup migration to remove unused columns. Never run a migration that breaks the previous application version — you need it for rollback.

### How do we handle feature flags in CI/CD?

Deploy code with feature flags disabled. Enable flags gradually (internal users → beta → all users). This decouples deployment from release: you can deploy code that isn't active, reducing deployment risk. If a feature causes issues, disable the flag without rolling back the deployment. Use a feature flag platform (LaunchDarkly, Unleash) for management.
