---
contentType: docs
slug: deployment-rollback-runbook
templateType: runbook
title: "Deployment Rollback Runbook"
description: "Runbook for rolling back failed deployments safely: rollback triggers, Kubernetes rollback, blue-green deployment rollback, canary rollback, database migration rollback, verification steps, and post-rollback procedures with code examples for kubectl, Helm, and ArgoCD."
metaDescription: "Deployment rollback runbook: triggers, Kubernetes rollback, blue-green, canary, database migration rollback, verification, kubectl, Helm, ArgoCD."
difficulty: intermediate
topics:
  - devops
tags:
  - deployment
  - rollback
  - kubernetes
  - devops
  - helm
  - argocd
  - incident-response
relatedResources:
  - /docs/devops/docker-image-hardening-checklist
  - /docs/devops/kubernetes-resource-quotas-template
  - /docs/devops/terraform-module-versioning-policy
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Deployment rollback runbook: triggers, Kubernetes rollback, blue-green, canary, database migration rollback, verification, kubectl, Helm, ArgoCD."
  keywords:
    - deployment rollback
    - kubernetes rollback
    - helm rollback
    - blue-green rollback
    - canary rollback
    - database rollback
    - deployment recovery
---

## Overview

This runbook covers procedures for rolling back failed deployments. It covers rollback triggers, Kubernetes deployment rollback, Helm rollback, blue-green deployment rollback, canary rollback, database migration rollback, verification, and post-rollback procedures. Use this runbook when a deployment causes errors, performance degradation, or service disruption.

---

## 1. Rollback Triggers

### 1.1 Trigger Criteria

```text
Trigger                    | Severity | Action              | Timeline
───────────────────────────┼──────────┼─────────────────────┼──────────
Error rate > 5%            | Critical | Rollback immediately | < 5 min
Error rate > 1%            | High     | Investigate, prepare | < 15 min
P99 latency > 2x baseline  | High     | Rollback if trending | < 15 min
P99 latency > 5x baseline  | Critical | Rollback immediately | < 5 min
Health check failures      | Critical | Rollback immediately | < 5 min
OOM kills increasing       | High     | Rollback if trending | < 10 min
Customer complaints > 10   | High     | Investigate, prepare | < 15 min
Deployment job timeout     | Medium   | Investigate          | < 30 min
Database connection errors | Critical | Rollback immediately | < 5 min
```

### 1.2 Rollback Decision Tree

```text
1. Is error rate > 5% or health checks failing?
   ├── YES → Rollback immediately (skip investigation)
   └── NO → Continue to step 2

2. Is P99 latency > 2x baseline?
   ├── YES → Is it trending up?
   │   ├── YES → Rollback
   │   └── NO → Monitor for 10 min, then decide
   └── NO → Continue to step 3

3. Are there OOM kills or resource issues?
   ├── YES → Can you scale up resources?
   │   ├── YES → Scale up, monitor
   │   └── NO → Rollback
   └── NO → Continue to step 4

4. Are there customer complaints?
   ├── YES → > 10 complaints in 15 min?
   │   ├── YES → Rollback
   │   └── NO → Investigate, prepare rollback
   └── NO → Monitor, no rollback needed
```

---

## 2. Kubernetes Deployment Rollback

### 2.1 kubectl Rollback

```bash
# Check rollout history
kubectl rollout history deployment/my-app -n production

# Check details of a specific revision
kubectl rollout history deployment/my-app -n production --revision=3

# Rollback to previous revision
kubectl rollout undo deployment/my-app -n production

# Rollback to specific revision
kubectl rollout undo deployment/my-app -n production --to-revision=3

# Check rollout status
kubectl rollout status deployment/my-app -n production

# Pause rollout (if canary and need to stop)
kubectl rollout pause deployment/my-app -n production

# Resume rollout
kubectl rollout resume deployment/my-app -n production
```

### 2.2 Verify Rollback

```bash
# Check current image version
kubectl get deployment my-app -n production -o jsonpath='{.spec.template.spec.containers[*].image}'

# Check pod status
kubectl get pods -n production -l app=my-app -o wide

# Check pod logs for errors
kubectl logs deployment/my-app -n production --tail=50

# Check events for deployment issues
kubectl get events -n production --field-selector involvedObject.name=my-app --sort-by='.lastTimestamp'

# Run health check
kubectl exec -it deployment/my-app -n production -- curl -s http://localhost:8080/health
```

---

## 3. Helm Rollback

### 3.1 Helm Rollback Commands

```bash
# List Helm releases
helm list -n production

# Check release history
helm history my-app -n production

# Rollback to previous revision
helm rollback my-app -n production

# Rollback to specific revision
helm rollback my-app 5 -n production

# Rollback with timeout
helm rollback my-app 5 -n production --timeout 5m

# Verify rollback
helm status my-app -n production
kubectl get pods -n production -l app.kubernetes.io/instance=my-app
```

### 3.2 Helm Rollback with Cleanup

```bash
# If rollback fails, check for stuck resources
kubectl get all -n production -l app.kubernetes.io/instance=my-app

# Force delete stuck pods
kubectl delete pod <pod-name> -n production --force --grace-period=0

# Check for pending PVCs
kubectl get pvc -n production -l app.kubernetes.io/instance=my-app

# Clean up failed Helm secrets
kubectl get secrets -n production -l owner=helm,name=my-app
kubectl delete secret sh.helm.release.v1.my-app.v6 -n production
```

---

## 4. ArgoCD Rollback

### 4.1 ArgoCD CLI Rollback

```bash
# Get application status
argocd app get production/my-app

# Check sync history
argocd app history production/my-app

# Rollback to previous sync
argocd app rollback production/my-app

# Rollback to specific revision
argocd app rollback production/my-app 5

# Disable auto-sync before rollback (if enabled)
argocd app set production/my-app --sync-policy none

# Perform rollback
argocd app rollback production/my-app 5

# Re-enable auto-sync after rollback
argocd app set production/my-app --sync-policy automated --auto-heal
```

### 4.2 ArgoCD Git-based Rollback

```bash
# Git-based rollback — revert the commit and push
git revert <bad-commit-sha>
git push origin main

# ArgoCD detects the change and syncs automatically (if auto-sync enabled)
# If auto-sync disabled, manually sync:
argocd app sync production/my-app

# Force sync if needed
argocd app sync production/my-app --force
```

---

## 5. Blue-Green Deployment Rollback

### 5.1 Blue-Green Switch

```bash
# Current state: blue is active, green is new deployment
# To rollback: switch traffic back to blue

# Kubernetes service selector switch
kubectl patch service my-app -n production -p \
  '{"spec":{"selector":{"version":"blue"}}}'

# Verify traffic switched
kubectl get svc my-app -n production -o yaml | grep selector -A 3

# Check that pods are receiving traffic
kubectl get pods -n production -l version=blue -o wide

# Scale down green deployment (after confirming blue is healthy)
kubectl scale deployment my-app-green -n production --replicas=0
```

### 5.2 Istio VirtualService Rollback

```yaml
# Rollback: route 100% traffic back to blue
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  http:
    - route:
        - destination:
            host: my-app-blue
            port:
              number: 8080
          weight: 100
```

```bash
# Apply the rollback VirtualService
kubectl apply -f virtualservice-rollback.yaml -n production

# Verify traffic routing
istioctl experimental descriptor virtualservice my-app -n production
```

---

## 6. Canary Rollback

### 6.1 Argo Rollouts Canary Rollback

```bash
# Check rollout status
kubectl argo rollouts get rollout my-app -n production --watch

# Abort canary and rollback to stable
kubectl argo rollouts abort my-app -n production

# Promote canary to stable (if canary is good)
kubectl argo rollouts promote my-app -n production

# Retry rollout after abort
kubectl argo rollouts retry my-app -n production
```

### 6.2 Manual Canary Rollback

```bash
# Current state: 20% traffic on new version, 80% on stable
# To rollback: scale new version to 0, restore stable to 100%

# Scale down canary deployment
kubectl scale deployment my-app-canary -n production --replicas=0

# Scale up stable deployment
kubectl scale deployment my-app-stable -n production --replicas=10

# Update service to point only to stable
kubectl patch service my-app -n production -p \
  '{"spec":{"selector":{"track":"stable"}}}'

# Verify
kubectl get endpoints my-app -n production
kubectl get pods -n production -l track=stable
```

---

## 7. Database Migration Rollback

### 7.1 Migration Rollback Strategy

```text
Migration type        | Rollback strategy
──────────────────────┼──────────────────────────────────────────
Forward-only          | No rollback — write fix-forward migration
Reversible            | Run down migration (reverse of up)
Expand-contract       | Revert contract phase, keep expand changes
Snapshot restore      | Restore from backup (last resort, data loss)
```

### 7.2 Flyway Rollback

```bash
# Check migration status
flyway -url=jdbc:postgresql://db:5432/mydb info

# Undo last migration (Flyway Teams only)
flyway -url=jdbc:postgresql://db:5432/mydb undo

# For community edition — write a fix-forward migration
# Create V20260704_2__rollback_add_column.sql
```

```sql
-- Fix-forward migration to undo a bad change
-- V20260704_1__add_status_column.sql added a column that broke the app
-- V20260704_2__remove_status_column.sql reverts it

ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

### 7.3 Liquibase Rollback

```bash
# Check migration status
liquibase --url=jdbc:postgresql://db:5432/mydb status

# Rollback by count (last N changesets)
liquibase --url=jdbc:postgresql://db:5432/mydb rollbackCount 1

# Rollback by tag
liquibase --url=jdbc:postgresql://db:5432/mydb rollback v2.3.0

# Rollback by date
liquibase --url=jdbc:postgresql://db:5432/mydb rollbackToDate 2026-07-04
```

### 7.4 Expand-Contract Pattern

```text
Phase 1 — Expand (add new column, keep old)
  ALTER TABLE orders ADD COLUMN status_new VARCHAR(20);

Phase 2 — Migrate (dual-write to both columns)
  -- Application writes to both status and status_new
  -- Backfill: UPDATE orders SET status_new = status WHERE status_new IS NULL;

Phase 3 — Contract (switch reads to new column, remove old)
  -- Application reads from status_new
  ALTER TABLE orders DROP COLUMN status;
  ALTER TABLE orders RENAME COLUMN status_new TO status;

Rollback:
  - After Phase 1: DROP COLUMN status_new (no data loss)
  - After Phase 2: DROP COLUMN status_new (old column still intact)
  - After Phase 3: Cannot rollback — must re-add column and backfill
```

### 7.5 Snapshot Restore (Last Resort)

```bash
# Restore from pre-deployment snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier myapp-db-rolled-back \
  --db-snapshot-identifier pre-deploy-snapshot-2026-07-04

# Or use point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myapp-db \
  --target-db-instance-identifier myapp-db-rolled-back \
  --restore-time 2026-07-04T09:00:00Z
```

---

## 8. Post-Rollback Procedures

### 8.1 Verification Checklist

```text
- [ ] Application health check passes
- [ ] Error rate returns to baseline (< 0.1%)
- [ ] P99 latency returns to baseline
- [ ] All pods running and ready
- [ ] Database connections healthy
- [ ] No new OOM kills
- [ ] Monitoring dashboards show normal patterns
- [ ] Customer complaints stop or decrease
- [ ] Logs show no new errors
- [ ] Alerting returns to normal state
```

### 8.2 Post-Rollback Actions

```text
1. Verify rollback using the checklist above
2. Notify stakeholders (Slack, email, status page)
3. Create incident ticket if not already created
4. Capture timeline of events (deploy time, detection, rollback)
5. Preserve logs and metrics for post-mortem
6. Do NOT re-deploy the same version without a fix
7. Identify root cause of the failure
8. Write fix and test in staging
9. Schedule post-mortem meeting within 48 hours
10. Update deployment runbook with lessons learned
```

### 8.3 Communication Template

```text
[RESOLVED] Production deployment rollback — my-app

Timeline:
  - 14:00 UTC: Deployment v2.3.1 started
  - 14:05 UTC: Error rate increased to 8%
  - 14:07 UTC: Rollback initiated
  - 14:10 UTC: Rollback complete, error rate back to 0.1%

Impact:
  - Users experienced 500 errors for approximately 10 minutes
  - ~5% of requests failed during the incident
  - No data loss or corruption

Root cause (preliminary):
  - Database connection pool misconfiguration in v2.3.1

Action items:
  - Fix connection pool configuration
  - Add pre-deployment database connection test
  - Update CI pipeline to catch this configuration error

Current status:
  - Production is running v2.3.0 (previous stable version)
  - All services are healthy
  - Next deployment scheduled after fix is verified in staging
```

## FAQ

### How fast should I rollback?

Rollback immediately when error rate exceeds 5% or health checks are failing. Do not wait to investigate — rollback first, investigate after. The goal is to minimize customer impact. A rollback takes 2-5 minutes in most Kubernetes environments. Investigation can take hours. Rollback, verify the service is healthy, then investigate the root cause with the failed version in staging. If you wait to investigate while customers are experiencing errors, you are extending the incident unnecessarily.

### What if the rollback itself fails?

If `kubectl rollout undo` fails, check for stuck pods and force-delete them: `kubectl delete pod <name> --force --grace-period=0`. If the previous revision is also broken, identify the last known-good revision from the rollout history and rollback to that specific revision. If no previous revision works, deploy the last known-good image directly: `kubectl set image deployment/my-app container=myorg/my-app:v2.3.0`. If the issue is infrastructure (node failure, network), address that first. If the database is the problem, rollback the database migration before rolling back the application.

### Can I rollback a database migration?

It depends on the migration type. Reversible migrations (with down/undo scripts) can be rolled back — run the reverse migration. Forward-only migrations cannot be rolled back — write a fix-forward migration that corrects the issue. Expand-contract migrations can be rolled back during the expand and migrate phases, but not after the contract phase (old column is gone). For data-loss migrations (DROP TABLE, DELETE), the only rollback is restoring from a backup — this should be a last resort. Always test migration rollbacks in staging before running them in production. Use the expand-contract pattern for high-risk schema changes.

### Should I use blue-green or canary deployments?

Blue-green is simpler — two full environments, instant switch, instant rollback. Use it for services that can run two full copies without resource concerns. Canary is more complex but safer — gradual traffic shifting, automatic rollback on error metrics, smaller blast radius. Use canary for high-traffic services where you want automated rollback and gradual exposure. Blue-green requires double the resources during deployment. Canary requires traffic splitting (Istio, Argo Rollouts). For most production services, canary with automated rollback is the best choice. For small services or internal tools, blue-green is sufficient.

### How do I prevent bad deployments from reaching production?

Implement multiple gates: automated tests (unit, integration, E2E) in CI, security scanning (SAST, dependency check), canary deployment with automated rollback (Argo Rollouts with error rate and latency analysis), pre-deployment health checks, and manual approval for production deployments. Use feature flags to decouple deployment from release — deploy the new version but keep features disabled until ready. Run chaos engineering tests in staging to verify resilience. Implement deployment freezes during high-traffic periods. Require code review by at least two engineers for production changes. Monitor deployment metrics and set up alerts for deployment failures.
