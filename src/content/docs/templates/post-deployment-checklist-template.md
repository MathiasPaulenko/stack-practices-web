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
  - post-deployment
  - verification
  - checklist
  - smoke-test
  - deployment
  - template
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

Use this checklist before declaring a deployment successful.

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

## Timing Guidelines

| Check Type | When | Duration |
|-----------|------|----------|
| Health checks | Immediately after deploy | 2 minutes |
| Smoke tests | 5 minutes post-deploy | 10 minutes |
| Metric validation | 15 minutes post-deploy | 10 minutes |
| Full validation | 1 hour post-deploy | Ongoing monitoring |

## Best Practices

- **Automate the checklist** — CI should fail the deploy if health checks do not pass
- **Test rollback before you need it** — a rollback that has never been tested is a gamble
- **Keep the previous version warm** — blue-green deployments let you switch back instantly
- **Use synthetic monitoring** — external probes catch issues your internal checks miss
- **Document actual vs expected** — deviations become your incident response data

## Common Mistakes

- Skipping verification because "the tests passed" — production traffic is the real test
- Not checking error rates after deploy — a deploy that increases errors by 0.1% is a failed deploy
- Assuming rollback is trivial — test your rollback procedure quarterly
- Deploying without on-call coverage — if verification fails, someone must be available to respond

## Frequently Asked Questions

### How long should I monitor after deployment?

At minimum: health checks immediately, smoke tests at 5 minutes, metrics at 15 minutes, and business metrics at 1 hour. For high-risk changes, extend to 24 hours with a follow-up review.

### What if smoke tests fail but metrics look fine?

Investigate immediately. Smoke tests cover critical user paths; metric dashboards may not catch functional regressions. Do not declare success until smoke tests pass.

### Should I automate or manual the checklist?

Automate health checks and smoke tests in CI. Manual verification is for business-critical judgment calls ("does the checkout flow feel right?"). The goal is automated gates with human oversight.
