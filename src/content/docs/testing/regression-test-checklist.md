---


contentType: docs
slug: regression-test-checklist
title: "Regression Test Checklist"
description: "A checklist for verifying existing functionality after changes: pre-deploy checks, post-deploy smoke tests, and rollback verification."
metaDescription: "Use this regression test checklist to verify existing functionality after changes with pre-deploy checks, post-deploy smoke tests, and rollback procedures."
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
  - /docs/test-strategy-document-template
  - /docs/test-case-template
  - /docs/test-coverage-report-template
  - /docs/bug-reproduction-steps-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this regression test checklist to verify existing functionality after changes with pre-deploy checks, post-deploy smoke tests, and rollback procedures."
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

Regression testing verifies that new changes don't break existing functionality. Every deployment carries risk: a new feature can break an unrelated feature, a dependency upgrade can change behavior, a database migration can corrupt data. This checklist ensures consistent regression coverage across releases.

## When to Use


- For alternatives, see [CI/CD Pipeline Guide](/guides/cicd-pipeline-guide/).

- Before deploying to production
- After merging a large PR to main
- After upgrading dependencies
- After database migrations
- After infrastructure changes
- Before a major release
- After rolling back a failed deployment

## Solution

```markdown
# Regression Test Checklist — `<Release Version>`

## Release Information

| Field | Value |
|-------|-------|
| Release Version | v2.5.0 |
| Release Date | 2026-07-05 |
| Release Manager | <Name> |
| Changes Summary | New payment refund flow, upgraded Node.js 18→20, database schema migration |
| Risk Level | Medium (schema migration + dependency upgrade) |
| Rollback Plan | Revert to v2.4.1, run migration rollback script |

## 1. Pre-Deploy Checks

### 1.1. Build and CI

- [ ] All CI checks pass (lint, type-check, unit tests, integration tests)
- [ ] Test coverage meets threshold (>= 80% line, >= 70% branch)
- [ ] No new flaky tests introduced
- [ ] Build succeeds without warnings
- [ ] Bundle size within budget (current: 2.3 MB, limit: 3 MB)
- [ ] Docker image builds successfully
- [ ] Security scan passes (no new vulnerabilities)

### 1.2. Code Quality

- [ ] All PRs reviewed and approved
- [ ] No TODO/FIXME comments in changed files
- [ ] Breaking changes documented in CHANGELOG
- [ ] API contract tests pass (no breaking changes detected)
- [ ] Database migration tested on staging
- [ ] Migration rollback script tested

### 1.3. Environment Readiness

- [ ] Staging environment matches production configuration
- [ ] Database backup taken before migration
- [ ] Feature flags configured for new features
- [ ] Environment variables updated in production
- [ ] CDN cache invalidated for static assets
- [ ] Monitoring dashboards active
- [ ] Alert thresholds adjusted for new metrics

### 1.4. Communication

- [ ] Release notes prepared
- [ ] Downstream teams notified of API changes
- [ ] On-call engineer briefed on changes
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders notified of deployment time

## 2. Deployment Checks

### 2.1. Database Migration

- [ ] Migration runs successfully on staging
- [ ] Migration performance acceptable (< 5 minutes)
- [ ] No data loss detected (row counts before/after match)
- [ ] Migration rollback script tested
- [ ] Database backup verified

### 2.2. Application Deployment

- [ ] Blue/green deployment switches successfully
- [ ] Health check endpoint returns 200
- [ ] No new error spikes in logs
- [ ] Response times within normal range
- [ ] Database connection pool stable
- [ ] Cache warmed (if applicable)

## 3. Post-Deploy Smoke Tests

### 3.1. Critical User Journeys

| Journey | Steps | Expected | Status |
|---------|-------|----------|--------|
| User login | Enter valid credentials, click login | Redirected to dashboard | [ ] |
| User registration | Fill form, submit, verify email | Account created, email sent | [ ] |
| Browse products | Navigate to product list | Products displayed with images | [ ] |
| Add to cart | Click "Add to Cart" on product | Cart count increments | [ ] |
| Checkout | Complete checkout flow | Order created, payment processed | [ ] |
| Order tracking | View order status | Status displayed correctly | [ ] |
| Password reset | Request reset, click email link | Password updated successfully | [ ] |
| Search | Enter search query, submit | Results displayed | [ ] |

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
| Database connections | < 80% of pool | [ ] |
| Redis memory | < 80% of limit | [ ] |
| CPU usage | < 70% average | [ ] |
| Memory usage | < 80% of limit | [ ] |
| Disk space | > 20% free | [ ] |
| Error rate | < 0.1% of requests | [ ] |
| p95 latency | < 500ms | [ ] |

### 3.4. Monitoring and Alerts

- [ ] No critical alerts triggered post-deploy
- [ ] Error rate within normal range (compare to pre-deploy baseline)
- [ ] Latency within normal range
- [ ] No new error patterns in logs
- [ ] Synthetic monitoring passing
- [ ] Uptime monitoring green

## 4. Feature-Specific Regression Tests

### 4.1. Payment Refund Flow (New Feature)

- [ ] Admin can initiate refund from order detail page
- [ ] Partial refund works (refund 50% of order total)
- [ ] Full refund works (refund 100% of order total)
- [ ] Refund triggers email notification to user
- [ ] Refund appears in order history
- [ ] Refund updates financial reporting dashboard
- [ ] Refund fails gracefully if payment provider is down
- [ ] Refund audit log entry created with admin ID and timestamp

### 4.2. Node.js 20 Upgrade

- [ ] All API endpoints respond correctly
- [ ] Background jobs process without errors
- [ ] WebSocket connections stable
- [ ] File uploads work (multipart form data)
- [ ] PDF generation works (puppeteer)
- [ ] No deprecation warnings in logs

### 4.3. Database Schema Migration

- [ ] Existing orders display correctly (added `refund_status` column)
- [ ] New orders include `refund_status` field
- [ ] Order queries perform within baseline (< 200ms)
- [ ] Indexes on new column are effective
- [ ] No orphaned records from migration

## 5. Rollback Verification

### 5.1. Rollback Triggers

| Condition | Action |
|-----------|--------|
| Error rate > 1% for 5 minutes | Roll back immediately |
| p95 latency > 2s for 5 minutes | Roll back immediately |
| Critical alert triggered | Evaluate, roll back if related to deploy |
| Health check failing for 2 minutes | Roll back immediately |
| Data corruption detected | Roll back, restore from backup |

### 5.2. Rollback Steps

- [ ] Rollback application to previous version (v2.4.1)
- [ ] Run database migration rollback script
- [ ] Verify health check returns 200
- [ ] Verify critical user journeys work
- [ ] Verify no data loss from rollback
- [ ] Notify stakeholders of rollback
- [ ] Create postmortem for failed deployment

### 5.3. Rollback Test (Pre-Release)

- [ ] Rollback tested on staging
- [ ] Rollback time measured (< 10 minutes target)
- [ ] Data consistency verified after rollback
- [ ] Application functions correctly after rollback

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

Regression testing is about risk management. Every change has the potential to break something. The checklist approach ensures nothing is missed, even when the team is under time pressure to deploy.

The pre-deploy section catches issues before they reach production. CI checks, code quality gates, and environment readiness are verified before anyone touches production. The post-deploy smoke tests verify that the deployment itself succeeded and critical functionality works.

Feature-specific regression tests target the areas most likely to be affected by the changes. A database migration needs specific checks for data integrity. A dependency upgrade needs checks for deprecated APIs. A new feature needs checks for its impact on existing features.

The rollback section is the safety net. If the deployment fails, the team needs to know exactly what triggers a rollback, how to execute it, and how to verify it worked. Testing the rollback before deploying is critical — a rollback that doesn't work is worse than no rollback.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Hotfix | Abbreviated checklist: smoke tests only | Speed over completeness |
| Major release | Full checklist + extended regression suite | Run all E2E tests |
| Canary deployment | Add canary metrics checks | Monitor 1% traffic before full rollout |
| Blue/green | Add switch verification steps | Verify both environments before switch |
| Microservices | Per-service checklist + integration checks | Contract tests between services |

## What Works

1. Run the checklist for every deployment — consistency prevents missed steps
2. Test the rollback before deploying — a broken rollback is a disaster
3. Focus smoke tests on critical user journeys — don't test everything, test what matters
4. Include feature-specific checks — generic checks miss change-specific regressions
5. Set objective rollback triggers — remove subjective judgment from the decision
6. Require sign-off from key roles — shared accountability prevents rash deployments
7. Keep the checklist in version control — track changes to the process itself

## Common Mistakes

1. Skipping the checklist because "it's a small change" — small changes cause big regressions
2. Not testing the rollback — assuming rollback will work when needed
3. Smoke testing too many things — focus on critical paths, not exhaustive coverage
4. No objective rollback criteria — "it looks bad" is not a rollback trigger
5. Not including feature-specific checks — generic checks miss change-specific issues
6. Rushing sign-off — approvals without review are rubber stamps
7. Not updating the checklist after incidents — each incident should add a new check

## Frequently Asked Questions

### How long should regression testing take?

For a routine deployment: 30-60 minutes (automated smoke tests + manual verification). For a major release: 2-4 hours (full regression suite + manual exploration). If regression testing takes longer, invest in automation to reduce manual steps.

### Should I run the full test suite or just smoke tests?

For routine deployments, smoke tests (critical paths only) are sufficient. For major releases, run the full suite. The test strategy document should define what "routine" vs "major" means for your team. Use risk assessment: a schema migration is always major.

### What if a smoke test fails after deployment?

If a critical smoke test fails, roll back immediately. Do not try to fix the issue in production. Roll back, diagnose in staging, fix, and redeploy. The rollback trigger criteria should be defined before deployment, not debated during an incident.

### How do I automate this checklist?

Use a deployment pipeline tool (GitHub Actions, GitLab CI, Argo CD) with automated gates for CI checks, smoke tests, and health checks. Manual checks (sign-off, feature-specific verification) can use a tool like Honeybadger or a shared spreadsheet. The goal is to automate everything that can be automated.

### What is the difference between regression testing and smoke testing?

Smoke testing is a subset of regression testing. Smoke tests verify that critical functionality works (can users log in? can they place orders?). Regression testing is broader: it verifies that all existing functionality still works, including edge cases and non-critical features. Smoke tests run after every deploy; full regression runs before major releases.
