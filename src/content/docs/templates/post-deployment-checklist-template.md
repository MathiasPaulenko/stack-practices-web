---
contentType: docs
slug: post-deployment-checklist-template
templateType: post-deployment-checklist
title: "Post-Deployment Verification Checklist Template"
description: "A checklist template for verifying deployments: health checks, smoke tests, metric validation, and rollback readiness before declaring all-clear."
metaDescription: "Post-deployment verification checklist: health checks, smoke tests, metric validation, and rollback readiness before declaring a deployment successful."
difficulty: beginner
topics:
  - devops
tags:
  - deployment
  - devops
  - template
  - ci-cd
  - automation
relatedResources:
  - /docs/templates/release-notes-template
  - /guides/devops/cicd-pipeline-guide
  - /guides/devops/monitoring-alerting-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Post-deployment verification checklist: health checks, smoke tests, metric validation, and rollback readiness before declaring a deployment successful."
  keywords:
    - post deployment checklist template
    - deployment verification checklist
    - smoke test template
    - deploy validation checklist
    - release verification steps
---

# Post-Deployment Verification Checklist Template

Use this checklist before declaring a deployment successful. Pair it with [Release Notes Template](/docs/templates/release-notes-template) for communication and [CI/CD Pipeline Guide](/guides/devops/cicd-pipeline-guide) for automation.

## Overview

A deployment is not complete when the code reaches production — it is complete when you have verified that production behaves as expected. Post-deployment verification catches issues that CI tests miss: configuration mismatches, missing environment variables, broken integrations, and performance regressions under real traffic.

This template covers:

1. **Health checks** — application, database, and dependency connectivity
2. **Smoke tests** — critical user paths under real conditions
3. **Metrics validation** — error rates, latency, resource usage
4. **Rollback readiness** — can you revert quickly if something goes wrong?
5. **Sign-off** — who approved the deployment and when

## When to Use

- **Every production deployment** — no exceptions, even for small changes
- **Staging deployments** — verify before promoting to production
- **Infrastructure changes** — config updates, scaling events, DNS changes
- **Database migrations** — verify schema changes did not break queries
- **Rollback verification** — confirm the rollback restored expected behavior
- **After hotfixes** — even urgent fixes need verification before sign-off

## Template

```markdown
# Post-Deployment Verification: [Service] v[X.Y.Z]

## Deployment Info
| Field | Value |
|-------|-------|
| **Deployer** | [name] |
| **Timestamp** | [YYYY-MM-DD HH:MM UTC] |
| **Environment** | [staging / production] |
| **Rollback commit** | [SHA] |

## Health Checks

- [ ] Application starts without errors
- [ ] Health endpoint returns 200: `GET /health`
- [ ] Readiness probe passes
- [ ] Liveness probe passes
- [ ] Database connectivity confirmed
- [ ] External dependency connectivity confirmed

## Smoke Tests

- [ ] Core user flow: [login → action → logout]
- [ ] API returns expected status codes
- [ ] Critical path payment flow
- [ ] Admin dashboard loads

## Metrics Validation

| Metric | Pre-Deploy | Post-Deploy | Delta | Alert? |
|--------|-----------|-------------|-------|--------|
| Error rate | 0.05% | ___ | ___ | ___ |
| Latency p95 | 120ms | ___ | ___ | ___ |
| CPU usage | 45% | ___ | ___ | ___ |

## Rollback Readiness

- [ ] Rollback script tested in last 30 days
- [ ] Previous version artifacts available
- [ ] Database migration is backward-compatible
- [ ] Feature flags can disable new code instantly

## Sign-Off

| Role | Name | Time |
|------|------|------|
| Deployer | | |
| On-call | | |
```

## Lifecycle

### Pre-deploy preparation

Before deploying, fill out the deployment info section. Confirm rollback readiness. Ensure on-call coverage. Set up metric baselines for comparison.

### Deploy and immediate verification

Run health checks immediately after deploy. If any check fails, stop and investigate. Do not proceed to smoke tests until health checks pass.

### Post-deploy monitoring

Run smoke tests at 5 minutes, metric validation at 15 minutes. Continue monitoring for 1 hour minimum. For high-risk changes, extend to 24 hours.

### Sign-off and archival

Once all checks pass, collect sign-offs from deployer and on-call. Archive the checklist in the deployment log. Link it to the release notes and any related ADRs.

## Filled Example

```markdown
# Post-Deployment Verification: payments-api v3.2.1

## Deployment Info
| Field | Value |
|-------|-------|
| **Deployer** | Jane Doe |
| **Timestamp** | 2026-07-15 14:30 UTC |
| **Environment** | production |
| **Rollback commit** | a1b2c3d4e5f6 |

## Health Checks

- [x] Application starts without errors
- [x] Health endpoint returns 200: `GET /health`
- [x] Readiness probe passes
- [x] Liveness probe passes
- [x] Database connectivity confirmed
- [x] External dependency connectivity confirmed (Stripe, PayPal)

## Smoke Tests

- [x] Core user flow: login → create order → checkout → logout
- [x] API returns expected status codes (200, 201, 400, 401, 500)
- [x] Critical path: credit card payment flow
- [x] Admin dashboard loads with new metrics

## Metrics Validation

| Metric | Pre-Deploy | Post-Deploy | Delta | Alert? |
|--------|-----------|-------------|-------|--------|
| Error rate | 0.05% | 0.04% | -0.01% | No |
| Latency p95 | 120ms | 118ms | -2ms | No |
| CPU usage | 45% | 48% | +3% | No |
| Memory | 512MB | 520MB | +8MB | No |
| Throughput | 850 req/s | 860 req/s | +10 | No |

## Rollback Readiness

- [x] Rollback script tested in last 30 days
- [x] Previous version artifacts available (v3.2.0)
- [x] Database migration is backward-compatible
- [x] Feature flags can disable new code instantly

## Sign-Off

| Role | Name | Time |
|------|------|------|
| Deployer | Jane Doe | 14:35 UTC |
| On-call | Bob Smith | 14:40 UTC |
```

## Timing Guidelines

| Check Type | When | Duration |
|-----------|------|----------|
| Health checks | Immediately after deploy | 2 minutes |
| Smoke tests | 5 minutes post-deploy | 10 minutes |
| Metric validation | 15 minutes post-deploy | 10 minutes |
| Full validation | 1 hour post-deploy | Ongoing monitoring |

## What Works

- **Automate the checklist** — CI should fail the deploy if health checks do not pass. See [CI/CD Pipeline Guide](/guides/devops/cicd-pipeline-guide) for integration.
- **Test rollback before you need it** — a rollback that has never been tested is a gamble. See [Disaster Recovery Plan Template](/docs/templates/disaster-recovery-plan-template) for broader planning.
- **Keep the previous version warm** — blue-green deployments let you switch back instantly. See [Deployment Strategies Guide](/guides/devops/deployment-strategies-guide) for patterns.
- **Use synthetic monitoring** — external probes catch issues your internal checks miss
- **Document actual vs expected** — deviations become your incident response data
- **Set alert thresholds before deploying** — know what "normal" looks like for the new version
- **Have a rollback decision timer** — if metrics degrade within 15 minutes, roll back automatically

## Common Mistakes

- Skipping verification because "the tests passed" — production traffic is the real test
- Not checking error rates after deploy — a deploy that increases errors by 0.1% is a failed deploy
- Assuming rollback is trivial — test your rollback procedure quarterly. For disaster planning, see [Disaster Recovery Plan Template](/docs/templates/disaster-recovery-plan-template).
- Deploying without on-call coverage — if verification fails, someone must be available to respond
- Checking too few metrics — CPU and error rate are not enough; check business metrics too
- No rollback decision criteria — define what triggers an automatic rollback before deploying

## Variants

### Canary deployment verification

For canary deployments, compare metrics between the canary group and the stable group. Monitor error rate delta, latency delta, and user feedback. Roll back the canary if any metric degrades beyond threshold. Scale gradually: 1% → 5% → 25% → 50% → 100%.

### Blue-green deployment verification

For blue-green deployments, run the new version (green) alongside the old (blue). Route a portion of traffic to green, verify, then switch the router. Keep blue running for instant rollback if green shows issues.

### Database migration verification

For deployments with schema changes, verify: migration completed, backward compatibility, query performance, and index usage. Have a rollback migration script tested in staging. See [Database Schema Documentation Template](/docs/templates/database-schema-documentation-template) for schema tracking.

## Automation

### CI/CD integration

```yaml
post-deploy-verification:
  stage: post-deploy
  script:
    - curl -f https://api.example.com/health || exit 1
    - npm run smoke-tests -- --env=production
    - npm run check-metrics -- --threshold=baseline.json
  after_script:
    - npm run notify-team -- --status=$CI_JOB_STATUS
  only:
    - main
```

### Automated health probes

Set up synthetic monitoring that hits your health endpoints every 60 seconds. Configure alerts for any non-200 response. Use tools like Pingdom, UptimeRobot, or AWS CloudWatch Synthetics.

### Metric-based auto-rollback

Configure your deployment system to auto-rollback when error rate exceeds a threshold within the first 15 minutes. Kubernetes canaries with Argo Rollouts or AWS CodeDeploy support this natively.

## Frequently Asked Questions

### How long should I monitor after deployment?

At minimum: health checks immediately, smoke tests at 5 minutes, metrics at 15 minutes, and business metrics at 1 hour. For high-risk changes, extend to 24 hours with a follow-up review.

### What if smoke tests fail but metrics look fine?

Investigate immediately. Smoke tests cover critical user paths; metric dashboards may not catch functional regressions. Do not declare success until smoke tests pass.

### Should I automate or manual the checklist?

Automate health checks and smoke tests in CI. See [Monitoring and Alerting Guide](/guides/devops/monitoring-alerting-guide) for probes. Manual verification is for business-critical judgment calls ("does the checkout flow feel right?"). The goal is automated gates with human oversight.

### What metrics should I track post-deployment?

Track four categories: infrastructure (CPU, memory, disk), application (error rate, latency, throughput), business (conversion rate, revenue, active users), and external (third-party API response time, webhook delivery rate). Compare each against pre-deploy baselines.

### When should I roll back vs fix forward?

Roll back when: error rate increases significantly, critical user flows break, or security is compromised. Fix forward when: the issue is cosmetic, a minor bug with a quick fix available, or rollback would cause data loss. When in doubt, roll back — it is safer and faster.

### How do I handle deployments with breaking database changes?

Use the expand-contract pattern: deploy the new code that supports both old and new schema, migrate the data, then deploy code that uses only the new schema. Never deploy breaking schema changes and code changes in the same release. See [Database Schema Documentation Template](/docs/templates/database-schema-documentation-template) for migration tracking.

### Who should fill out the checklist?

The deployer fills out the deployment info and runs health checks. The on-call engineer verifies metrics and signs off. For high-risk changes, a third person (release manager or tech lead) should review the completed checklist before declaring success.

### What if I do not have a rollback script?

Create one before your next deployment. A rollback script should: stop the new version, restore the previous artifact, revert database migrations if needed, and restart the service. Test it in staging first. Without a tested rollback, you are deploying without a safety net.

### How do I verify external dependencies post-deploy?

Call each external dependency directly: hit the payment gateway health endpoint, verify the email service responds, check the CDN serves assets. Do not assume external services are healthy because your app started — they may be degraded in ways that only surface under specific operations.

### Should I notify stakeholders after deployment?

Yes. Send a brief message to the team channel: what was deployed, where, when, and whether verification passed. For user-facing changes, notify customer support. For infrastructure changes, notify the on-call team. Keep it short — a paragraph, not a report.

### How do I handle multi-region deployments?

Deploy to one region first. Run the full checklist there. Once verified, deploy to the next region. Monitor cross-region replication lag. Have a region-level rollback plan. If one region fails, route traffic to healthy regions while investigating.

### What if the deployment succeeds but performance degrades?

Check if the degradation is within acceptable thresholds. If latency p95 increased by less than 10% and error rate is unchanged, monitor closely. If latency increased by more than 20% or error rate spiked, roll back immediately. Performance degradation often indicates a missing index, N+1 query, or resource contention.

### Should I run the checklist for staging deployments?

Yes. Staging verification catches issues before production. Run a condensed version: health checks and smoke tests are sufficient. Skip the full metric validation unless staging mirrors production traffic. Staging checks give you confidence before the production deploy.
