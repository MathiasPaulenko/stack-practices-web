---



contentType: docs
slug: ci-cd-pipeline-design-template
title: "Plantilla de Diseño de Pipeline CI/CD"
description: "Una plantilla para documentar stages, gates, environments, deployment strategies, rollback procedures y security scanning de pipelines CI/CD."
metaDescription: "Usá esta plantilla de diseño de pipeline CI/CD para definir stages, quality gates, environments, deployment strategies, rollback y security."
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
  - /docs/helm-chart-review-checklist
  - /docs/kubernetes-pod-disruption-budget-template
  - /docs/terraform-state-management-policy
  - /docs/incident-postmortem-template
  - /docs/vulnerability-management-process-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de diseño de pipeline CI/CD para definir stages, quality gates, environments, deployment strategies, rollback y security."
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

Un CI/CD pipeline design document specifica cómo code se mueve desde commit a production. Define pipeline stages, quality gates, environments, deployment strategies y rollback procedures. Sin un design document, pipelines crecen orgánicamente con inconsistent gates y unclear promotion criteria.

## When to Use


- For alternatives, see [CI/CD Pipeline Guide](/es/guides/cicd-pipeline-guide/).

- Diseñando un new CI/CD pipeline
- Estandarizando pipelines across teams
- Addeando new environments o deployment stages
- Implementando deployment strategy changes (blue-green, canary)
- Compliance documentation para deployment procedures

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
| Pipeline Trigger | Push a main, PR creation |
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
| Unit Tests | 3 min | 100% pass, > 80% coverage | Stop pipeline | Yes (con lint) |
| Lint | 1 min | 0 errors | Stop pipeline | Yes (con unit tests) |
| Security Scan | 2 min | 0 critical vulnerabilities | Stop pipeline | Yes (con SAST) |
| SAST | 2 min | 0 critical findings | Stop pipeline | Yes (con security scan) |
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
| Max unavailable | 0 | No downtime durante staging deploy |
| Max surge | 1 | One extra pod durante update |
| Progress deadline | 5 min | Fail si rollout stalls |

### Production: Blue-Green Deployment

| Step | Action | Duration | Verification |
|------|--------|----------|--------------|
| 1 | Deployeá new version a green environment | 2 min | Green health check |
| 2 | Corré smoke tests en green | 1 min | 100% pass |
| 3 | Switcheá traffic de blue a green | 30 sec | Router update |
| 4 | Monitoreá green por 5 minutes | 5 min | Error rate < 1% |
| 5 | Keepé blue como rollback target | — | Blue stays running |
| 6 | Decommissioneá blue después de 24 hours | — | No rollback needed |

### Production: Canary (Alternative)

| Step | Action | Traffic | Duration | Rollback Condition |
|------|--------|---------|----------|-------------------|
| 1 | Deployeá canary pods | 0% | 2 min | Health check faila |
| 2 | Routeá 5% traffic a canary | 5% | 10 min | Error rate > 2% |
| 3 | Routeá 25% traffic a canary | 25% | 10 min | Error rate > 1% |
| 4 | Routeá 50% traffic a canary | 50% | 10 min | Error rate > 0.5% |
| 5 | Routeá 100% traffic a canary | 100% | 5 min | Error rate > 0.1% |
| 6 | Decommissioneá old pods | 0% old | 2 min | — |

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
| Health check failure | Kubernetes liveness probe faila 3x | Auto-rollback a previous version | 30 sec |
| Error rate spike | Error rate > 5% por 2 min | Auto-rollback | 2 min |
| Latency spike | p99 latency > 5s por 5 min | Auto-rollback | 5 min |
| Smoke test failure | Post-deploy smoke tests failan | Auto-rollback | 1 min |

### Manual Rollback

```bash
# Blue-green rollback: switcheá back a blue
kubectl patch service/app --namespace production \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Rolling deployment rollback
kubectl rollout undo deployment/app --namespace production

# Rollback a specific revision
kubectl rollout undo deployment/app --namespace production --to-revision=3

# Checkeá rollout status
kubectl rollout status deployment/app --namespace production
```

### Rollback Verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Version | `kubectl get deployment app -o jsonpath='{.spec.template.spec.containers[0].image}'` | Previous image tag |
| Health | `kubectl get pods -l app=app --field-selector=status.phase=Running` | All pods running |
| Traffic | `curl -s https://example.com/health` | 200 OK |
| Error rate | Checkeá Grafana dashboard | < 1% |
| Logs | `kubectl logs -l app=app --tail=50` | No errors |
```

## Explanation

Un CI/CD pipeline design document sirve a three audiences: developers que triggerean pipelines, DevOps engineers que las maintain y auditors que verify compliance. Developers necesitan saber qué gates existen y qué causa failures. DevOps engineers necesitan el full pipeline configuration y rollback procedures. Auditors necesitan evidence de security scanning y approval processes.

Los pipeline stages definen el flow desde commit a production. Cada stage tiene un gate: un condition que se debe meet para proceed. Gates previenen bad code de llegar a production. Los key gates son build (compilation), test (unit + coverage), security (vulnerabilities + SAST) y deployment (health checks + smoke tests).

Quality gates definen specific thresholds. "100% unit test pass" es non-negotiable. "80% coverage" ensure que new code se testea. "0 critical vulnerabilities" previene known security issues de shippear. Estos gates deberían ser automated — manual gates son inconsistent y slow.

Environments proveen isolated testing spaces. CI corre tests en un ephemeral environment. Staging mirrora production con anonymized data. Production es el real thing. Cada environment tiene su own configuration y secrets se managean via environment-specific secret stores.

Deployment strategies controlan cómo new code llega a production. Rolling updates replace pods gradually con no downtime. Blue-green deployments maintain two identical environments y switchean traffic instantly. Canary deployments routean un small percentage de traffic a la new version y lo increase gradually. La choice depende de risk tolerance y infrastructure complexity.

Rollback procedures definen cómo reverse un deployment. Automated rollback triggerea en health check failures, error rate spikes o smoke test failures. Manual rollback está available para cases dónde automated detection no catchea el issue. El rollback procedure debería testearse regularly — un untested rollback es un hope, no un procedure.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Microservices | Pipeline per service, shared base | Cada service tiene su own pipeline |
| Monorepo | Pipeline con path-based triggers | Solo build changed packages |
| Mobile app | Addeá app store deployment stage | TestFlight, Play Store rollout |
| Infrastructure | Usá Terraform pipeline | Plan → apply → verify |
| Compliance-heavy | Addeá manual approval en every stage | SOC 2, HIPAA requirements |
| Feature flags | Decoupleá deploy de release | Deploy dark, enable gradually |

## What Works

1. Automatizá all gates — manual gates son bottlenecks y inconsistent
2. Failé fast — poné los cheapest checks first (lint antes de integration tests)
3. Corré independent stages en parallel — reduce pipeline duration
4. Cacheá dependencies y Docker layers — save minutes per run
5. Testeá el rollback procedure — untested rollbacks failan cuando needed
6. Usá GitOps para deployment — ArgoCD/Flux sync cluster state a Git
7. Monitoreá post-deploy — catcheá issues que gates no detectan

## Common Mistakes

1. No quality gates — anything puede llegar a production
2. Gates too strict — pipeline faila constantemente, developers bypass it
3. Gates too loose — bad code llega a production
4. No staging environment — testing en production
5. No rollback plan — manual rollback toma hours durante un incident
6. Long pipeline duration — developers pierden context esperando feedback
7. No security scanning — vulnerabilities shippean a production undetected

## Frequently Asked Questions

### ¿Cuánto debería tomar un CI/CD pipeline?

Under 15 minutes para el full pipeline (commit a production deploy). Build + test debería ser under 5 minutes para developer feedback. Security scanning addea 2-3 minutes. Deployment y verification addean 3-5 minutes. Si el pipeline toma longer, parallelize stages, cacheá dependencies y spliteá en multiple pipelines (fast feedback vs. thorough validation).

### ¿Deberíamos usar manual approval para production deployment?

Depende del team y risk tolerance. Para high-stakes deployments (financial, healthcare), manual approval addea un checkpoint. Para continuous deployment at scale, manual approval es un bottleneck. Un compromise: auto-deploy durante business hours con monitoring, require approval para off-hours deployments.

### ¿Cuál es la difference entre continuous delivery y continuous deployment?

Continuous delivery (CD) automáticamente prepara every change para release, pero deployment a production require manual approval. Continuous deployment (CD) automáticamente deployea every change que pasa all gates a production. La difference es el manual approval step. Most teams empezan con continuous delivery y mueven a continuous deployment a medida que confidence crece.

### ¿Cómo handleamos database migrations en CI/CD?

Corré migrations como un separate pipeline stage antes del application deployment. Usá backward-compatible migrations (add columns, no las removes). Deployeá la new application version que usa las new columns. En un later release, corré un cleanup migration para remove unused columns. Nunca corras un migration que breakea el previous application version — lo necesitás para rollback.

### ¿Cómo handleamos feature flags en CI/CD?

Deployeá code con feature flags disabled. Enable flags gradually (internal users → beta → all users). Esto decouple deployment de release: podés deployear code que no está active, reduce deployment risk. Si un feature causa issues, disable el flag sin rollback el deployment. Usá un feature flag platform (LaunchDarkly, Unleash) para management.
