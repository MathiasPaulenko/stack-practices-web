---
contentType: docs
slug: deployment-rollback-runbook
title: "Deployment Rollback Runbook"
description: "A runbook for safely rolling back failed deployments across Kubernetes, Docker, and VM-based infrastructure with minimal downtime."
metaDescription: "Safely roll back failed deployments with this runbook. Covers Kubernetes rollbacks, blue-green switches, database migrations, and verification steps."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - runbook
  - rollback
  - kubernetes
  - deployment
  - docker
  - ci-cd
relatedResources:
  - /docs/devops/zero-downtime-deployment-checklist
  - /docs/devops/runbook-database-failover
  - /docs/devops/incident-communication-template
  - /docs/devops/downtime-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Safely roll back failed deployments with this runbook. Covers Kubernetes rollbacks, blue-green switches, database migrations, and verification steps."
  keywords:
    - deployment rollback
    - kubernetes rollback
    - blue green deployment
    - deployment failure
    - revert deployment
---

## Overview

Failed deployments are the most common source of production incidents. A deployment that worked in staging fails in production due to environment differences, missing secrets, or incompatible database states. This runbook provides rollback procedures for Kubernetes, Docker, and VM-based deployments, including how to handle database schema rollbacks safely.

## When to Use

Use this runbook when:
- Error rates spike immediately after a deployment
- New features are not functioning as expected in production
- Performance degrades after a code change
- A critical bug is discovered post-deployment

## Prerequisites

Before starting:
- [ ] Identify the last known good deployment version (image tag, commit SHA)
- [ ] Confirm the failure is deployment-related, not infrastructure-related
- [ ] Notify team in incident channel
- [ ] Check if database migrations were part of the deployment

## Solution

```markdown
# Deployment Rollback Runbook: `<Service Name>`

## 1. Assess the Failure (2 minutes)

### Check Error Rate
```bash
# Application error rate
curl -s http://app.internal/metrics | grep error_rate

# Kubernetes pod status
kubectl get pods -l app=myapp
kubectl logs -l app=myapp --tail=100 | grep ERROR
```

| Check | Threshold | Action if Exceeded |
|-------|-----------|-------------------|
| Error rate | > 1% | Proceed to rollback |
| Latency p95 | > 2x baseline | Proceed to rollback |
| Pod restarts | > 3 in 5 min | Proceed to rollback |
| Failed readiness | > 50% pods | Proceed to rollback |

### Identify the Bad Version
```bash
# Kubernetes
git log --oneline -n 5
kubectl get deployment myapp -o jsonpath='{.spec.template.spec.containers[0].image}'

# Docker Swarm
docker service inspect myapp --format='{{.Spec.TaskTemplate.ContainerSpec.Image}}'
```

### Check for Database Migrations
```bash
# If flyway or liquibase was used
# Check migration table for the latest applied migration
kubectl logs deployment/myapp --container=init-migrate | tail -20
```

**Decision Gate:** If database migrations ran, proceed to database rollback section before application rollback.

## 2. Stop the Deployment (30 seconds)

```bash
# Kubernetes: pause rollout
kubectl rollout pause deployment/myapp

# Docker Swarm: scale to zero temporarily
docker service update --replicas=0 myapp

# VM: stop systemd service
sudo systemctl stop myapp
```

## 3. Roll Back Application (1-3 minutes)

### Kubernetes
```bash
# Rollback to previous revision
kubectl rollout undo deployment/myapp

# Or rollback to specific revision
kubectl rollout undo deployment/myapp --to-revision=3

# Verify
kubectl rollout status deployment/myapp
kubectl get pods -l app=myapp
```

### Docker / Docker Swarm
```bash
# Update service to previous image tag
docker service update \
  --image myapp:v1.2.3 \
  --update-delay 10s \
  myapp

# Or manually with docker-compose
docker-compose pull && docker-compose up -d
```

### VM / Systemd
```bash
# Restore previous binary/package
sudo dpkg -i myapp_1.2.3_amd64.deb
# or
cp /opt/myapp/backup/v1.2.3/myapp /usr/local/bin/myapp
sudo systemctl restart myapp
```

### Blue-Green Switch (if using blue-green)
```bash
# Switch load balancer to green environment
# No application restart needed
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:...:green-tg
```

## 4. Roll Back Database (if needed, 5-15 minutes)

### If Migration Was Reversible
```bash
# Flyway
flyway undo

# Django
python manage.py migrate app 0003_previous_migration

# Rails
rails db:rollback STEP=1
```

### If Migration Was Destructive
```bash
# Restore from pre-deployment snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier myapp-db-rolled-back \
  --db-snapshot-identifier pre-deploy-snapshot-2026-06-26

# Or use point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myapp-db \
  --target-db-instance-identifier myapp-db-rolled-back \
  --restore-time 2026-06-26T09:00:00Z
```

**WARNING:** Database rollbacks cause downtime. Coordinate with stakeholders before proceeding.

## 5. Verify Rollback Success (3 minutes)

```bash
# Health checks
curl -f http://app.internal/health

# Smoke tests
./scripts/smoke-test.sh

# Error rate back to baseline
curl -s http://app.internal/metrics | grep error_rate
```

| Verification | Status | Time |
|------------|--------|------|
| All pods healthy | [ ] | ___ |
| Health checks passing | [ ] | ___ |
| Error rate < baseline | [ ] | ___ |
| Latency p95 normal | [ ] | ___ |
| Critical user flows working | [ ] | ___ |

## 6. Post-Rollback Actions

- [ ] Tag the bad deployment in CI/CD as `DO_NOT_DEPLOY`
- [ ] Create incident timeline with deployment and rollback times
- [ ] Document root cause in incident channel
- [ ] Schedule postmortem within 24 hours
- [ ] Update deployment checklist to prevent recurrence
- [ ] Remove bad image from registry or mark as deprecated
```

## Explanation

The runbook orders operations by **risk**: assess first (don't roll back a non-deployment issue), stop the bleeding (pause deployment), restore service (rollback), then clean up (database, verification). The critical insight is that database rollbacks are more dangerous than application rollbacks — they can cause data loss and require snapshot restores. Always check if migrations ran before rolling back the application alone.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Kubernetes | `kubectl rollout undo` | Fastest, built-in revision history |
| Docker Swarm | `docker service update --image` | Requires previous image available |
| Blue-Green | Load balancer switch | Instant, but requires pre-built green environment |
| VMs with systemd | Binary replacement + restart | Slowest, requires package/binary management |

## Best Practices

1. **Always maintain N-1 version** in your container registry for instant rollback
2. **Snapshot databases before migrations** — restore is your only option for destructive changes
3. **Automate health checks** in CI/CD to catch failures before full rollout
4. **Use feature flags** for risky changes — disable without redeploying
5. **Practice rollbacks monthly** on staging with the same procedures

## Common Mistakes

1. **Rolling back the app without rolling back database migrations** — schema mismatch causes crashes
2. **Not pausing the rollout first** — rollback fights with an ongoing deployment
3. **Forgetting to verify after rollback** — assumes rollback worked without checking metrics
4. **Deleting the failed deployment too quickly** — lose logs needed for root cause analysis
5. **Rolling back without understanding the failure** — may re-introduce the issue in next deploy

## Frequently Asked Questions

### How do I know which revision to roll back to?

Check `kubectl rollout history deployment/myapp` for revision numbers. The last known good revision is usually N-1. Cross-reference with deployment timestamps in your CI/CD pipeline.

### Can I roll back a database migration that deleted data?

No. If a migration dropped columns, deleted rows, or altered data, `flyway undo` or `rails db:rollback` cannot recover it. You must restore from a pre-deployment snapshot or backup.

### What if the rollback also fails?

If `kubectl rollout undo` fails (e.g., missing image), manually set the deployment to the previous image tag: `kubectl set image deployment/myapp myapp=registry/app:v1.2.3`. If that fails too, scale the deployment to zero and investigate — you may need to rebuild the previous version from source.
