---
contentType: docs
slug: regression-test-checklist
title: "Checklist de Pruebas de Regresión"
description: "Un checklist para verificar funcionalidad existente después de cambios: pre-deploy checks, post-deploy smoke tests y verificación de rollback."
metaDescription: "Usá este checklist de regresión para verificar funcionalidad existente después de cambios con pre-deploy checks, smoke tests post-deploy y procedimientos de rollback."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - regression
  - checklist
  - deployment
  - smoke-tests
  - rollback
relatedResources:
  - /docs/testing/test-strategy-document-template
  - /docs/testing/test-case-template
  - /docs/testing/test-coverage-report-template
  - /docs/testing/bug-reproduction-steps-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá este checklist de regresión para verificar funcionalidad existente después de cambios con pre-deploy checks, smoke tests post-deploy y procedimientos de rollback."
  keywords:
    - regression testing
    - test checklist
    - smoke tests
    - deployment verification
    - rollback
    - pre-deploy checks
    - post-deploy checks
---

## Overview

Regression testing verifica que new changes no breakean existing functionality. Every deployment carries risk: un new feature puede breakear un unrelated feature, un dependency upgrade puede cambiar behavior, un database migration puede corromper data. Este checklist asegura consistent regression coverage across releases.

## When to Use

- Antes de deployear a production
- Después de mergeear un large PR a main
- Después de upgradear dependencies
- Después de database migrations
- Después de infrastructure changes
- Antes de un major release
- Después de roll backear un failed deployment

## Solution

```markdown
# Regression Test Checklist — `<Release Version>`

## Release Information

| Field | Value |
|-------|-------|
| Release Version | v2.5.0 |
| Release Date | 2026-07-05 |
| Release Manager | <Name> |
| Changes Summary | New payment refund flow, upgrade Node.js 18→20, database schema migration |
| Risk Level | Medium (schema migration + dependency upgrade) |
| Rollback Plan | Revert a v2.4.1, correr migration rollback script |

## 1. Pre-Deploy Checks

### 1.1. Build and CI

- [ ] All CI checks passan (lint, type-check, unit tests, integration tests)
- [ ] Test coverage meets threshold (>= 80% line, >= 70% branch)
- [ ] No new flaky tests introducidos
- [ ] Build success sin warnings
- [ ] Bundle size within budget (current: 2.3 MB, limit: 3 MB)
- [ ] Docker image buildea successfully
- [ ] Security scan pasa (no new vulnerabilities)

### 1.2. Code Quality

- [ ] All PRs reviewed y approved
- [ ] No TODO/FIXME comments en changed files
- [ ] Breaking changes documentados en CHANGELOG
- [ ] API contract tests pasan (no breaking changes detected)
- [ ] Database migration testeada en staging
- [ ] Migration rollback script testeado

### 1.3. Environment Readiness

- [ ] Staging environment matchea production configuration
- [ ] Database backup taken antes de migration
- [ ] Feature flags configurados para new features
- [ ] Environment variables updated en production
- [ ] CDN cache invalidated para static assets
- [ ] Monitoring dashboards active
- [ ] Alert thresholds adjusted para new metrics

### 1.4. Communication

- [ ] Release notes preparados
- [ ] Downstream teams notificados de API changes
- [ ] On-call engineer briefeado de changes
- [ ] Maintenance window scheduleado (si needed)
- [ ] Stakeholders notificados de deployment time

## 2. Deployment Checks

### 2.1. Database Migration

- [ ] Migration corre successfully en staging
- [ ] Migration performance acceptable (< 5 minutes)
- [ ] No data loss detectada (row counts before/after matchean)
- [ ] Migration rollback script testeado
- [ ] Database backup verified

### 2.2. Application Deployment

- [ ] Blue/green deployment switchea successfully
- [ ] Health check endpoint returnea 200
- [ ] No new error spikes en logs
- [ ] Response times within normal range
- [ ] Database connection pool stable
- [ ] Cache warmed (si applicable)

## 3. Post-Deploy Smoke Tests

### 3.1. Critical User Journeys

| Journey | Steps | Expected | Status |
|---------|-------|----------|--------|
| User login | Ingresá valid credentials, clickeá login | Redirecteado a dashboard | [ ] |
| User registration | Filléa form, submiteá, verify email | Account created, email sent | [ ] |
| Browse products | Navegá a product list | Products displayeados con images | [ ] |
| Add to cart | Clickeá "Add to Cart" en product | Cart count increments | [ ] |
| Checkout | Completá checkout flow | Order created, payment processed | [ ] |
| Order tracking | Vieweá order status | Status displayeado correctamente | [ ] |
| Password reset | Requesteá reset, clickeá email link | Password updated successfully | [ ] |
| Search | Ingresá search query, submiteá | Results displayeados | [ ] |

### 3.2. API Health

| Endpoint | Method | Expected Status | Response Time | Status |
|----------|--------|-----------------|---------------|--------|
| /health | GET | 200 | < 50ms | [ ] |
| /api/v1/users | GET | 200 | < 200ms | [ ] |
| /api/v1/products | GET | 200 | < 300ms | [ ] |
| /api/v1/orders | GET | 200 | < 300ms | [ ] |
| /api/v1/payments | POST | 201 | < 500ms | [ ] |
| /api/v1/payments/{id}/refund | POST | 201 | < 500ms | [ ] |

### 3.3. Infrastructure

| Check | Expected | Status |
|-------|----------|--------|
| Database connections | < 80% del pool | [ ] |
| Redis memory | < 80% del limit | [ ] |
| CPU usage | < 70% average | [ ] |
| Memory usage | < 80% del limit | [ ] |
| Disk space | > 20% free | [ ] |
| Error rate | < 0.1% de requests | [ ] |
| p95 latency | < 500ms | [ ] |

### 3.4. Monitoring and Alerts

- [ ] No critical alerts triggereados post-deploy
- [ ] Error rate within normal range (compará a pre-deploy baseline)
- [ ] Latency within normal range
- [ ] No new error patterns en logs
- [ ] Synthetic monitoring pasando
- [ ] Uptime monitoring green

## 4. Feature-Specific Regression Tests

### 4.1. Payment Refund Flow (New Feature)

- [ ] Admin puede initiear refund desde order detail page
- [ ] Partial refund funciona (refund 50% del order total)
- [ ] Full refund funciona (refund 100% del order total)
- [ ] Refund triggerea email notification al user
- [ ] Refund aparece en order history
- [ ] Refund updatea financial reporting dashboard
- [ ] Refund fails gracefully si payment provider está down
- [ ] Refund audit log entry created con admin ID y timestamp

### 4.2. Node.js 20 Upgrade

- [ ] All API endpoints responden correctamente
- [ ] Background jobs procesan sin errors
- [ ] WebSocket connections stable
- [ ] File uploads funcionan (multipart form data)
- [ ] PDF generation funciona (puppeteer)
- [ ] No deprecation warnings en logs

### 4.3. Database Schema Migration

- [ ] Existing orders displayean correctamente (added `refund_status` column)
- [ ] New orders incluyen `refund_status` field
- [ ] Order queries performan within baseline (< 200ms)
- [ ] Indexes en new column son effective
- [ ] No orphaned records desde migration

## 5. Rollback Verification

### 5.1. Rollback Triggers

| Condition | Action |
|-----------|--------|
| Error rate > 1% por 5 minutes | Roll back inmediatamente |
| p95 latency > 2s por 5 minutes | Roll back inmediatamente |
| Critical alert triggereado | Evaluá, roll back si related al deploy |
| Health check failing por 2 minutes | Roll back inmediatamente |
| Data corruption detected | Roll back, restoreá desde backup |

### 5.2. Rollback Steps

- [ ] Roll back application a previous version (v2.4.1)
- [ ] Corré database migration rollback script
- [ ] Verificá health check returnea 200
- [ ] Verificá critical user journeys funcionan
- [ ] Verificá no data loss desde rollback
- [ ] Notificá stakeholders del rollback
- [ ] Creá postmortem para failed deployment

### 5.3. Rollback Test (Pre-Release)

- [ ] Rollback testeado en staging
- [ ] Rollback time measured (< 10 minutes target)
- [ ] Data consistency verified después de rollback
- [ ] Application funciona correctamente después de rollback

## 6. Sign-Off

| Role | Name | Approval | Date |
|------|------|----------|------|
| Release Manager | | [ ] Approved | |
| Tech Lead | | [ ] Approved | |
| QA Lead | | [ ] Approved | |
| SRE / On-Call | | [ ] Approved | |
| Product Manager | | [ ] Approved | |
```

## Explanation

Regression testing es sobre risk management. Every change tiene el potential de breakear algo. El checklist approach asegura que nada se missea, even cuando el team está under time pressure para deployear.

La pre-deploy section catchea issues antes de que lleguen a production. CI checks, code quality gates y environment readiness se verifican antes de que nadie toque production. Los post-deploy smoke tests verifican que el deployment itself succedeó y critical functionality funciona.

Feature-specific regression tests targetean las areas most likely de ser affected por los changes. Un database migration necesita specific checks para data integrity. Un dependency upgrade necesita checks para deprecated APIs. Un new feature necesita checks para su impact en existing features.

La rollback section es el safety net. Si el deployment fail, el team necesita saber exactamente qué triggerea un rollback, cómo ejecutarlo y cómo verificar que funcionó. Testear el rollback antes de deployear es critical — un rollback que no funciona es worse que no rollback.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Hotfix | Abbreviated checklist: smoke tests only | Speed over completeness |
| Major release | Full checklist + extended regression suite | Corré all E2E tests |
| Canary deployment | Addeá canary metrics checks | Monitoreá 1% traffic antes de full rollout |
| Blue/green | Addeá switch verification steps | Verificá ambos environments antes de switch |
| Microservices | Per-service checklist + integration checks | Contract tests entre services |

## What Works

1. Corré el checklist para every deployment — consistency previene missed steps
2. Testeá el rollback antes de deployear — un broken rollback es un disaster
3. Focus smoke tests en critical user journeys — no testees everything, testeeá qué matters
4. Incluí feature-specific checks — generic checks missean change-specific regressions
5. Seteá objective rollback triggers — remové subjective judgment del decision
6. Requerí sign-off de key roles — shared accountability previene rash deployments
7. Mantené el checklist en version control — trackeá changes al process itself

## Common Mistakes

1. Skipear el checklist porque "it's a small change" — small changes causan big regressions
2. No testear el rollback — asumiendo que rollback va a funcionar cuando se needed
3. Smoke testear too many things — focus en critical paths, no exhaustive coverage
4. No objective rollback criteria — "it looks bad" no es un rollback trigger
5. No incluir feature-specific checks — generic checks missean change-specific issues
6. Apurar sign-off — approvals sin review son rubber stamps
7. No updatear el checklist después de incidents — cada incident debería addear un new check

## Frequently Asked Questions

### ¿Cuánto debería tomar regression testing?

Para un routine deployment: 30-60 minutes (automated smoke tests + manual verification). Para un major release: 2-4 hours (full regression suite + manual exploration). Si regression testing toma más, invertí en automation para reducir manual steps.

### ¿Debería correr el full test suite o solo smoke tests?

Para routine deployments, smoke tests (critical paths only) son sufficient. Para major releases, corré el full suite. El test strategy document debería definir qué "routine" vs "major" means para tu team. Usá risk assessment: un schema migration es always major.

### ¿Qué si un smoke test fail después de deployment?

Si un critical smoke test fail, roll back inmediatamente. No trates de fixear el issue en production. Roll back, diagnose en staging, fix y redeploy. El rollback trigger criteria deberían ser defined antes de deployment, no debatidos durante un incident.

### ¿Cómo automatizo este checklist?

Usá un deployment pipeline tool (GitHub Actions, GitLab CI, Argo CD) con automated gates para CI checks, smoke tests y health checks. Manual checks (sign-off, feature-specific verification) pueden usar un tool como Honeybadger o un shared spreadsheet. El goal es automatizar everything que pueda ser automated.

### ¿Cuál es la difference entre regression testing y smoke testing?

Smoke testing es un subset de regression testing. Smoke tests verifican que critical functionality funciona (¿pueden users loguear? ¿pueden placear orders?). Regression testing es broader: verifica que all existing functionality sigue funcionando, incluyendo edge cases y non-critical features. Smoke tests corren después de every deploy; full regression corre antes de major releases.
