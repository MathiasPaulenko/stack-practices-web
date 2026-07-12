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
  - /recipes/docker-compose-dev-prod-split
  - /recipes/docker-health-check-configuration
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


- For alternatives, see [Rollout Communication Template](/docs/rollout-communication-template/).

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
- [ ] Customer support briefed on new capabilities or changes
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

## Canary Deployment Script

```bash
#!/bin/bash
# Canary deployment with health checks
set -euo pipefail

SERVICE="api"
NAMESPACE="production"
CANARY_PERCENT=10

echo "=== Canary Deployment: $SERVICE ==="

# Step 1: Deploy canary
echo "[1/5] Deploying canary pod..."
kubectl set image deployment/$service-canary $service=registry.example.com/$service:$BUILD_TAG -n $NAMESPACE
kubectl rollout status deployment/$service-canary -n $NAMESPACE --timeout=120s

# Step 2: Route 10% traffic to canary
echo "[2/5] Routing $CANARY_PERCENT% traffic to canary..."
kubectl patch virtualservice $service -n $NAMESPACE --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$service'","subset":"stable"},"weight":90},{"destination":{"host":"'$service'","subset":"canary"},"weight":'$CANARY_PERCENT'}]}]}}'

# Step 3: Monitor for 10 minutes
echo "[3/5] Monitoring canary for 10 minutes..."
sleep 600

ERROR_RATE=$(kubectl exec -n $NAMESPACE deployment/$service-canary -- curl -s http://localhost:8080/metrics | grep error_rate | awk '{print $2}')
echo "  Error rate: $ERROR_RATE"

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "  ERROR: Error rate too high, rolling back canary"
  kubectl patch virtualservice $service -n $NAMESPACE --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$service'","subset":"stable"},"weight":100}]}]}}'
  kubectl delete deployment $service-canary -n $NAMESPACE
  exit 1
fi

# Step 4: Promote to full rollout
echo "[4/5] Promoting canary to full rollout..."
kubectl set image deployment/$service $service=registry.example.com/$service:$BUILD_TAG -n $NAMESPACE
kubectl rollout status deployment/$service -n $NAMESPACE --timeout=300s

# Step 5: Clean up canary
echo "[5/5] Cleaning up canary resources..."
kubectl patch virtualservice $service -n $NAMESPACE --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$service'","subset":"stable"},"weight":100}]}]}}'
kubectl delete deployment $service-canary -n $NAMESPACE

echo "=== Canary Deployment Complete ==="
```

## Deployment Communication Template

```text
=== Deployment Communication ===

Channel: #deployments
Deployer: alice@example.com
Date: 2026-07-11 14:00 UTC

Starting deployment: API v2.3.1
  Risk level: MEDIUM
  Changes: Bug fixes + performance improvements
  Rollback: git revert + redeploy (est. 5 min)

14:00 - Deploying to staging... DONE
14:05 - Smoke tests in staging... PASS
14:10 - Deploying canary (10% traffic)...
14:20 - Canary metrics look good (error rate: 0.02%)
14:25 - Promoting to full rollout...
14:30 - Rollout complete. Monitoring for 30 min.
15:00 - Deployment confirmed stable. Status: OPERATIONAL.

If issues detected: contact #on-call, reference CHG-2026-07-11-001
Rollback command: ./scripts/rollback.sh API v2.3.0
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Hotfix | Abbreviated checklist | Skip non-critical steps, focus on tests and rollback |
| Scheduled maintenance | Extended communication section | Include maintenance window, customer notifications |
| Database-only change | Database section emphasized | Require DBA sign-off, longer soak period |

## What Works

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

The on-call engineer or release lead owns the checklist for a specific deployment. The platform or SRE team owns the template and updates it based on incident lessons.

### How do I handle emergency hotfixes?

Use an abbreviated checklist: verify the fix in staging, build the artifact, deploy with a canary, run smoke tests, monitor for 15 minutes. Document the emergency deploy in a post-incident review to determine if process gaps caused the urgency.


### How do we handle database migrations during deployment?

Run database migrations before the application deployment. Use expand-and-contract pattern: first add new columns/tables (expand), deploy the application that uses both old and new schema, then remove old columns (contract) in a later deployment. Never run destructive migrations (drop column, rename table) in the same deployment as the application change. Test migrations on a copy of production data. Have a rollback migration ready. Document the migration in the deployment checklist with expected duration.

### What is blue-green deployment and when should we use it?

Blue-green deployment maintains two identical environments: blue (current) and green (new). Deploy the new version to green, run tests, then switch traffic from blue to green. Use it for: zero-downtime requirements, instant rollback (switch back to blue), and when you can afford the infrastructure cost of two environments. Avoid it for: database-heavy changes (both environments share the database), cost-sensitive workloads, or when infrastructure is too complex to duplicate.

### How do we manage deployment during peak traffic?

Avoid deployments during peak traffic hours. Define low-traffic windows (typically 10am-2pm UTC on weekdays for global services, or early morning local time for regional services). If a deployment is urgent during peak, use canary deployment with very small initial percentage (1-5%) and longer monitoring windows. Have extra on-call staff available. Communicate to stakeholders that a peak-time deployment is happening and why. Document the decision to deploy during peak in the post-deployment review.

### What is feature flag deployment and how does it differ from canary?

Feature flags decouple deployment from release. You deploy the new code to all instances but keep the feature disabled. Then enable it gradually (0%, 1%, 10%, 50%, 100%) without a new deployment. Canary deployment routes a percentage of traffic to new instances. Feature flags are better for: gradual feature rollout, A/B testing, and instant disable without rollback. Canary is better for: testing infrastructure changes, catching runtime issues, and validating performance under real load.

### How do we automate the deployment checklist?

Convert the checklist into a CI/CD pipeline with gates: automated tests, security scans, staging deployment, smoke tests, canary deployment, health checks, and production rollout. Use tools like Argo Rollouts, Flagger, or Spinnaker for progressive delivery. Store the checklist as code (YAML or JSON) so it can be versioned and reviewed. Manual steps (stakeholder notification, business sign-off) remain as approval gates in the pipeline. Generate a deployment report automatically after each rollout.


### How do we handle rollbacks for database migrations?

Database migration rollbacks are risky. For additive migrations (add column, add table), rollback by dropping the new objects. For destructive migrations (drop column, rename table), rollback requires restoring from backup or writing a forward migration that recreates the data. Always test the rollback migration in staging on a copy of production data. Document the rollback procedure with exact commands. Set a time limit: if rollback cannot complete within 15 minutes, escalate to restoring from backup. Never attempt a complex rollback under pressure without a tested procedure.

### What is a deployment runbook and why do we need one?

A deployment runbook is a step-by-step guide that complements the checklist. It includes: exact commands to run, expected output for each step, screenshots of dashboards to check, contact information for dependencies, and decision trees for common issues. The runbook should be executable by any team member, not just the person who wrote it. Store the runbook in version control alongside the application code. Update it after every deployment that revealed a gap. Test the runbook by having a new team member follow it for a staging deployment.

### How do we manage deployment dependencies between services?

Document service dependencies in a service catalog. Before deploying a service, check if downstream services depend on the current API contract. If the deployment includes breaking changes, notify and coordinate with dependent teams. Use feature flags to decouple deployment from release for breaking changes. Deploy in dependency order: infrastructure first, then databases, then backend services, then frontend. For microservices, use contract testing (Pact) to verify compatibility before deployment.

### What is progressive delivery and how does it improve deployments?

Progressive delivery is an approach where deployments are gradually rolled out with automated evaluation at each stage. It includes canary deployments, blue-green deployments, and feature flag rollouts. Tools like Argo Rollouts, Flagger, and LaunchDarkly automate the progression. At each stage, the system evaluates health metrics (error rate, latency, saturation) and automatically promotes, pauses, or rolls back. This reduces blast radius, catches issues early, and removes human error from the go/no-go decision. Start with manual canary, then automate progressively.


Review and update the deployment checklist after every incident that involved a deployment. Remove steps that add no value, add steps that would have caught the issue, and refine automation gates. Keep the checklist concise enough to complete in 15 minutes for routine deployments.









End of document. Review and update quarterly.