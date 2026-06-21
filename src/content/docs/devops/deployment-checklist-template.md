---
contentType: docs
slug: deployment-checklist-template
title: "Deployment Checklist Template"
description: "A pre-release verification checklist for safe production deployments."
metaDescription: "Use this deployment checklist template to verify tests, rollbacks, monitoring, and communication before every production release."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - deployment
  - checklist
  - release
  - verification
  - template
relatedResources:
  - /docs/post-deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/contributing-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this deployment checklist template to verify tests, rollbacks, monitoring, and communication before every production release."
  keywords:
    - devops
    - deployment
    - checklist
    - release
    - verification
    - template
---
## Overview

Production deployments are high-risk moments. A single missed step can cause outages, data loss, or security exposures. This checklist template ensures that every release follows the same verification steps, from pre-merge testing through post-deployment validation.

## When to Use

Use this resource when:
- Preparing any deployment to production or staging
- Onboarding new team members to the release process
- Auditing the deployment process after an incident

## Solution

```markdown
# Deployment Checklist: `<Release Name>`

## Release Metadata

| Field | Value |
|-------|-------|
| Service | `name` |
| Version | `x.y.z` |
| Branch / Commit | `main@abc1234` |
| Deployer | `@username` |
| Date | `YYYY-MM-DD HH:MM UTC` |
| Ticket / PR | `PROJ-123` |

## 1. Pre-Deployment

### 1.1. Code & Tests

- [ ] All CI checks pass (lint, unit tests, integration tests)
- [ ] Code review approved by at least one senior engineer
- [ ] No unresolved security alerts (Snyk, Dependabot)
- [ ] Database migrations reviewed for backward compatibility
- [ ] Feature flags configured and defaulted to off

### 1.2. Infrastructure

- [ ] Staging environment deployed and validated
- [ ] Production capacity verified (CPU, memory, disk)
- [ ] Autoscaling rules reviewed (min / max replicas)
- [ ] Rollback artifact built and stored (Docker image, AMI)
- [ ] CDN cache invalidation plan documented (if applicable)

### 1.3. Communication

- [ ] Stakeholders notified of deployment window
- [ ] On-call engineer aware and available
- [ ] Status page updated to "Maintenance" (if downtime expected)
- [ ] Customer-facing teams briefed on changes

## 2. Deployment

### 2.1. Database (if applicable)

- [ ] Migration scripts tested against a copy of production data
- [ ] Migration run with `ALTER TABLE ... ADD COLUMN` (not destructive ops first)
- [ ] Migration duration estimated and approved by DBA
- [ ] Rollback script prepared for destructive changes

### 2.2. Application

- [ ] Deploy using blue/green or canary strategy
- [ ] Monitor error rate for 5 minutes after each canary increment
- [ ] Verify health checks return 200 OK
- [ ] Confirm new pods/containers are receiving traffic

### 2.3. Verification

- [ ] Smoke tests pass against production endpoints
- [ ] Critical user journeys tested (login, checkout, search)
- [ ] Logs show no unexpected errors or exceptions
- [ ] Metrics within baseline (latency p95, error rate, CPU)

## 3. Post-Deployment

### 3.1. Validation

- [ ] Feature flags enabled incrementally (5% → 25% → 100%)
- [ ] A/B test results monitored (if applicable)
- [ ] Customer support briefed on new features or changes
- [ ] Documentation updated (API docs, runbooks, wiki)

### 3.2. Monitoring

- [ ] Dashboards checked for anomalies (traffic, errors, latency)
- [ ] Alerts firing as expected (no false positives or muted alerts)
- [ ] Synthetic monitoring passes (Pingdom, Datadog Synthetics)
- [ ] Error tracking reviewed (Sentry, Rollbar) for new issues

### 3.3. Cleanup

- [ ] Old versions scaled down after stability confirmed (30 min)
- [ ] Feature branches deleted
- [ ] Deployment log archived for audit
- [ ] Status page updated to "Operational"
```

## Explanation

The checklist is ordered by **risk**: code quality first, then infrastructure readiness, then execution, then validation. The rollback artifact is a hard requirement because you cannot safely deploy what you cannot quickly undeploy. Canary increments with health checks catch issues before they affect all users. Post-deployment monitoring extends beyond the deploy moment because some issues (memory leaks, cache warming) only appear after sustained traffic.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Hotfix | Abbreviated checklist | Skip non-critical steps, focus on tests and rollback |
| Scheduled maintenance | Extended communication section | Include maintenance window, customer notifications |
| Database-only change | Database section emphasized | Require DBA sign-off, longer soak period |

## Best Practices

1. Automate every checkbox that can be automated (tests, smoke tests, health checks)
2. Run the checklist in a shared document or tool so multiple people can confirm steps
3. Never deploy on Friday afternoons or before holidays unless it is a critical fix
4. Keep the checklist short enough to complete in 15 minutes for routine deployments
5. Review and update the checklist after every incident that involved a deployment

## Common Mistakes

1. Skipping staging validation because "the change is small"
2. Deploying without a tested rollback plan
3. Not monitoring after the deploy is "complete"
4. Deploying multiple unrelated changes in the same release
5. Allowing deployers to work alone without a second pair of eyes

## Frequently Asked Questions

### Should every deployment use this full checklist?

No. For routine deployments with no infrastructure changes, a shortened checklist (tests, deploy, smoke tests, monitor) is sufficient. Use the full checklist for releases with database changes, new dependencies, or architectural modifications.

### Who should own the checklist?

The on-call engineer or release lead owns the checklist for a specific deployment. The platform or SRE team owns the template and updates it based on incident learnings.

### How do I handle emergency hotfixes?

Use an abbreviated checklist: verify the fix in staging, build the artifact, deploy with a canary, run smoke tests, monitor for 15 minutes. Document the emergency deploy in a post-incident review to determine if process gaps caused the urgency.
