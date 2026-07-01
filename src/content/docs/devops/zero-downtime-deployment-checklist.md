---
contentType: docs
slug: zero-downtime-deployment-checklist
title: "Zero-Downtime Deployment Checklist"
description: "A checklist to ensure production deployments complete without service interruptions using safe rollout patterns."
metaDescription: "Deploy production changes without downtime using this checklist. Covers health checks, canary rollouts, database migrations, and rollback procedures."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - deployment
  - zero-downtime
  - canary
  - rollback
  - production
relatedResources:
  - /docs/devops/deployment-checklist-template
  - /docs/runbook-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Deploy production changes without downtime using this checklist. Covers health checks, canary rollouts, database migrations, and rollback procedures."
  keywords:
    - zero downtime deployment checklist
    - canary deployment checklist
    - production deployment checklist
    - blue green deployment
    - rollback checklist
---

## Overview

Zero-downtime deployments update production services without interrupting users. This checklist helps teams verify that health checks, traffic routing, database migrations, and rollback plans are in place before and during a release.

## When to Use

- Releasing a new version of a user-facing service.
- Deploying schema or data migrations that affect multiple instances.
- Changing infrastructure that could impact availability.
- Introducing a new rollout strategy like canary or blue-green.
- Preparing for a high-traffic event where stability matters most.

## Prerequisites

- A deployment pipeline with automated build, test, and publish stages.
- Health check endpoints that represent real application readiness.
- Load balancer, ingress, or traffic controller that supports gradual rollout.
- Database migration strategy that is backward compatible.
- Rollback plan with known good artifact and data state.
- Monitoring and alerting for error rate, latency, and business metrics.
- A communication plan for stakeholders and customers.

## Solution

### Checklist

#### 1. Pre-Deployment Readiness

- [ ] Deployment change is approved and documented.
- [ ] Code is merged and artifact is built and tagged.
- [ ] Automated unit, integration, and contract tests pass.
- [ ] Database migrations are reviewed for backward compatibility.
- [ ] Feature flags are configured for safe enablement.
- [ ] Capacity and scaling limits are sufficient for expected traffic.
- [ ] Monitoring dashboards and alerts are active.
- [ ] On-call rotation is aware of the deployment window.
- [ ] Rollback steps are documented and tested in a non-production environment.
- [ ] Customer-facing communication is prepared if needed.

#### 2. Health Check Configuration

| Check | Endpoint | Success Criteria | Failure Action |
|-------|----------|------------------|----------------|
| Liveness | `/health/live` | HTTP 200 | Restart container |
| Readiness | `/health/ready` | HTTP 200 and dependencies up | Stop traffic routing |
| Startup | `/health/startup` | HTTP 200 | Delay rollout |
| Dependency | `/health/deps` | Database, cache, queue reachable | Alert and halt |
| Business | `/health/business` | Critical flow returns expected value | Page on-call |

#### 3. Rollout Strategy Selection

| Strategy | Use Case | Risk Level | Rollback Speed |
|----------|----------|------------|----------------|
| Rolling update | Stateless services, low risk | Low | Medium (terminate new pods) |
| Blue-green | Stateful sessions, predictable releases | Medium | Fast (switch traffic back) |
| Canary | High risk, measurable metrics | Medium | Fast (drain canary) |
| Feature flag | Gradual user exposure | Low | Instant (toggle off) |
| A/B deployment | Validate user behavior | Medium | Fast (re-route traffic) |

#### 4. Deployment Execution Steps

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Deploy to staging and run smoke tests | Staging tests pass |
| 2 | Deploy canary or small subset | Health checks pass, error rate stable |
| 3 | Monitor key metrics for canary duration | Latency, error rate, business metrics within baseline |
| 4 | Increase traffic percentage gradually | Each stage passes health and metric checks |
| 5 | Complete rollout to 100% | All instances healthy and serving traffic |
| 6 | Validate production endpoints | Smoke tests and critical user flows pass |
| 7 | Keep old version available for rollback | Retain for defined rollback window |
| 8 | Confirm rollback window has passed | Remove old version or update artifact baseline |

#### 5. Database Migration Safety

- [ ] Migrations are additive and backward compatible with the previous version.
- [ ] Old code can read new schema without errors.
- [ ] New code can read old schema if a rollback is needed.
- [ ] Indexes are created concurrently where supported.
- [ ] Large migrations are split into smaller batches.
- [ ] Data backfill or migration jobs are idempotent.
- [ ] Rollback script or compensating operation is available.
- [ ] Database changes are tested in staging with production-like data.

#### 6. Rollback Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Error rate spike | > 0.5% for 2 minutes | Pause rollout and investigate |
| Latency increase | p99 > baseline + 30% for 5 minutes | Roll back traffic |
| Business metric drop | Conversion rate drops > 5% | Roll back immediately |
| Health check failure | > 10% failing | Roll back immediately |
| Critical alert | Any P1 incident | Roll back and page on-call |
| Canary timeout | Canary stage exceeds duration without passing | Roll back canary |

#### 7. Post-Deployment Validation

- [ ] Application logs show no unexpected errors.
- [ ] Error rate and latency are within baseline.
- [ ] Business metrics are stable or improving.
- [ ] All feature flags are in the intended state.
- [ ] Old resources are cleaned up after the rollback window.
- [ ] Deployment summary is shared with the team.
- [ ] Any issues are logged in the issue tracker with owners.

## Explanation

Zero-downtime deployments rely on three things: safe rollout mechanics, reliable health signals, and fast rollback. A checklist ensures that each release considers traffic routing, data compatibility, and observability before any user is exposed. Combining this discipline with automation reduces the risk of production incidents and improves release confidence.

## Variants

- Kubernetes rolling update checklist: Focus on readiness probes, max surge, max unavailable, and pod disruption budgets.
- Blue-green deployment checklist: Focus on traffic switch, database compatibility, and version retention.
- Canary deployment checklist: Focus on metric thresholds, progressive traffic weights, and automated rollback gates.
- Serverless deployment checklist: Focus on function versioning, alias routing, and API Gateway stage management.
- Database-heavy deployment checklist: Focus on schema compatibility, migration order, and rollback scripts.
- Mobile or client deployment checklist: Focus on staged rollout, forced update handling, and API compatibility.

## What Works

- Keep deployments small and frequent to reduce risk.
- Make database changes backward compatible with both old and new code.
- Use health checks that verify real dependencies, not just process liveness.
- Automate rollback based on metrics, not just manual decision gates.
- Monitor business metrics, not just technical metrics.
- Maintain a known-good baseline artifact for fast rollback.
- Practice rollbacks in staging or during game days.
- Document deployment decisions and outcomes for future reviews.

## Common Mistakes

- Skipping health checks or using trivial HTTP 200 checks.
- Deploying database changes that are not backward compatible.
- Rolling out 100% traffic before validating metrics.
- Not having a rollback plan before starting the deployment.
- Ignoring increased latency in favor of error rate alone.
- Cleaning up old versions too early.
- Deploying during peak traffic without traffic capacity planning.

## FAQs

### What is the difference between rolling and canary deployment?

A rolling update replaces old instances one at a time across the whole fleet. A canary deploys a small subset first, validates metrics, and then gradually increases traffic to the new version.

### How do we make database changes safe for zero downtime?

Use additive changes first (add columns, tables, indexes), deploy code that reads both old and new schema, then remove old schema in a later release. This is often called the expand-contract pattern.

### When should we roll back immediately?

Roll back when health checks fail broadly, error rate spikes, critical business metrics drop, or a P1 alert fires. Faster rollback saves user trust and revenue.
