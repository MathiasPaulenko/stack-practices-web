---
contentType: docs
slug: deployment-rollback-runbook
templateType: runbook
title: "Runbook de Rollback de Despliegues"
description: "Runbook para revertir despliegues fallidos de forma segura: rollback triggers, Kubernetes rollback, blue-green deployment rollback, canary rollback, database migration rollback, verification steps y post-rollback procedures con ejemplos de codigo para kubectl, Helm y ArgoCD."
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

Este runbook cubre procedimientos para revertir despliegues fallidos. Cubre rollback triggers, Kubernetes deployment rollback, Helm rollback, blue-green deployment rollback, canary rollback, database migration rollback, verification y post-rollback procedures. Usa este runbook cuando un despliegue causa errors, performance degradation o service disruption.

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
1. Es error rate > 5% o health checks failing?
   ├── YES → Rollback immediately (skip investigation)
   └── NO → Continue a step 2

2. Es P99 latency > 2x baseline?
   ├── YES → Esta trending up?
   │   ├── YES → Rollback
   │   └── NO → Monitora por 10 min, luego decide
   └── NO → Continue a step 3

3. Hay OOM kills o resource issues?
   ├── YES → Puedes scalear up resources?
   │   ├── YES → Scalea up, monitora
   │   └── NO → Rollback
   └── NO → Continue a step 4

4. Hay customer complaints?
   ├── YES → > 10 complaints en 15 min?
   │   ├── YES → Rollback
   │   └── NO → Investiga, prepara rollback
   └── NO → Monitora, no rollback needed
```

---

## 2. Kubernetes Deployment Rollback

### 2.1 kubectl Rollback

```bash
# Checkea rollout history
kubectl rollout history deployment/my-app -n production

# Checkea details de specific revision
kubectl rollout history deployment/my-app -n production --revision=3

# Rollback a previous revision
kubectl rollout undo deployment/my-app -n production

# Rollback a specific revision
kubectl rollout undo deployment/my-app -n production --to-revision=3

# Checkea rollout status
kubectl rollout status deployment/my-app -n production

# Pausa rollout (si canary y necesitas parar)
kubectl rollout pause deployment/my-app -n production

# Resume rollout
kubectl rollout resume deployment/my-app -n production
```

### 2.2 Verifica Rollback

```bash
# Checkea current image version
kubectl get deployment my-app -n production -o jsonpath='{.spec.template.spec.containers[*].image}'

# Checkea pod status
kubectl get pods -n production -l app=my-app -o wide

# Checkea pod logs para errors
kubectl logs deployment/my-app -n production --tail=50

# Checkea events para deployment issues
kubectl get events -n production --field-selector involvedObject.name=my-app --sort-by='.lastTimestamp'

# Corre health check
kubectl exec -it deployment/my-app -n production -- curl -s http://localhost:8080/health
```

---

## 3. Helm Rollback

### 3.1 Helm Rollback Commands

```bash
# Lista Helm releases
helm list -n production

# Checkea release history
helm history my-app -n production

# Rollback a previous revision
helm rollback my-app -n production

# Rollback a specific revision
helm rollback my-app 5 -n production

# Rollback con timeout
helm rollback my-app 5 -n production --timeout 5m

# Verifica rollback
helm status my-app -n production
kubectl get pods -n production -l app.kubernetes.io/instance=my-app
```

### 3.2 Helm Rollback con Cleanup

```bash
# Si rollback failea, checkea stuck resources
kubectl get all -n production -l app.kubernetes.io/instance=my-app

# Force delete stuck pods
kubectl delete pod <pod-name> -n production --force --grace-period=0

# Checkea pending PVCs
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

# Checkea sync history
argocd app history production/my-app

# Rollback a previous sync
argocd app rollback production/my-app

# Rollback a specific revision
argocd app rollback production/my-app 5

# Disablea auto-sync antes de rollback (si enabled)
argocd app set production/my-app --sync-policy none

# Performa rollback
argocd app rollback production/my-app 5

# Re-enablea auto-sync despues de rollback
argocd app set production/my-app --sync-policy automated --auto-heal
```

### 4.2 ArgoCD Git-based Rollback

```bash
# Git-based rollback — revertea el commit y pushea
git revert <bad-commit-sha>
git push origin main

# ArgoCD detecta el change y syncea automaticamente (si auto-sync enabled)
# Si auto-sync disabled, manualmente sync:
argocd app sync production/my-app

# Force sync si needed
argocd app sync production/my-app --force
```

---

## 5. Blue-Green Deployment Rollback

### 5.1 Blue-Green Switch

```bash
# Current state: blue esta active, green es el new deployment
# Para rollback: switchea traffic back a blue

# Kubernetes service selector switch
kubectl patch service my-app -n production -p \
  '{"spec":{"selector":{"version":"blue"}}}'

# Verifica traffic switched
kubectl get svc my-app -n production -o yaml | grep selector -A 3

# Checkea que pods estan receiving traffic
kubectl get pods -n production -l version=blue -o wide

# Scalea down green deployment (despues de confirmar blue healthy)
kubectl scale deployment my-app-green -n production --replicas=0
```

### 5.2 Istio VirtualService Rollback

```yaml
# Rollback: routea 100% traffic back a blue
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
# Applyea el rollback VirtualService
kubectl apply -f virtualservice-rollback.yaml -n production

# Verifica traffic routing
istioctl experimental descriptor virtualservice my-app -n production
```

---

## 6. Canary Rollback

### 6.1 Argo Rollouts Canary Rollback

```bash
# Checkea rollout status
kubectl argo rollouts get rollout my-app -n production --watch

# Aborta canary y rollback a stable
kubectl argo rollouts abort my-app -n production

# Promotea canary a stable (si canary es good)
kubectl argo rollouts promote my-app -n production

# Retry rollout despues de abort
kubectl argo rollouts retry my-app -n production
```

### 6.2 Manual Canary Rollback

```bash
# Current state: 20% traffic en new version, 80% en stable
# Para rollback: scalea new version a 0, restorea stable a 100%

# Scalea down canary deployment
kubectl scale deployment my-app-canary -n production --replicas=0

# Scalea up stable deployment
kubectl scale deployment my-app-stable -n production --replicas=10

# Updatea service para point solo a stable
kubectl patch service my-app -n production -p \
  '{"spec":{"selector":{"track":"stable"}}}'

# Verifica
kubectl get endpoints my-app -n production
kubectl get pods -n production -l track=stable
```

---

## 7. Database Migration Rollback

### 7.1 Migration Rollback Strategy

```text
Migration type        | Rollback strategy
──────────────────────┼──────────────────────────────────────────
Forward-only          | No rollback — escribe fix-forward migration
Reversible            | Corre down migration (reverse de up)
Expand-contract       | Reverte contract phase, keep expand changes
Snapshot restore      | Restorea desde backup (last resort, data loss)
```

### 7.2 Flyway Rollback

```bash
# Checkea migration status
flyway -url=jdbc:postgresql://db:5432/mydb info

# Undo last migration (Flyway Teams only)
flyway -url=jdbc:postgresql://db:5432/mydb undo

# Para community edition — escribe fix-forward migration
# Crea V20260704_2__rollback_add_column.sql
```

```sql
-- Fix-forward migration para undo un bad change
-- V20260704_1__add_status_column.sql addeo un column que breakeo el app
-- V20260704_2__remove_status_column.sql lo revertea

ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

### 7.3 Liquibase Rollback

```bash
# Checkea migration status
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

Phase 2 — Migrate (dual-write a both columns)
  -- Application escribe a both status y status_new
  -- Backfill: UPDATE orders SET status_new = status WHERE status_new IS NULL;

Phase 3 — Contract (switch reads a new column, remove old)
  -- Application lee desde status_new
  ALTER TABLE orders DROP COLUMN status;
  ALTER TABLE orders RENAME COLUMN status_new TO status;

Rollback:
  - Despues de Phase 1: DROP COLUMN status_new (no data loss)
  - Despues de Phase 2: DROP COLUMN status_new (old column still intact)
  - Despues de Phase 3: No se puede rollback — must re-add column y backfill
```

### 7.5 Snapshot Restore (Last Resort)

```bash
# Restorea desde pre-deployment snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier myapp-db-rolled-back \
  --db-snapshot-identifier pre-deploy-snapshot-2026-07-04

# O usa point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myapp-db \
  --target-db-instance-identifier myapp-db-rolled-back \
  --restore-time 2026-07-04T09:00:00Z
```

---

## 8. Post-Rollback Procedures

### 8.1 Verification Checklist

```text
- [ ] Application health check pasa
- [ ] Error rate vuelve a baseline (< 0.1%)
- [ ] P99 latency vuelve a baseline
- [ ] All pods running y ready
- [ ] Database connections healthy
- [ ] No new OOM kills
- [ ] Monitoring dashboards muestran normal patterns
- [ ] Customer complaints paran o decrease
- [ ] Logs muestran no new errors
- [ ] Alerting vuelve a normal state
```

### 8.2 Post-Rollback Actions

```text
1. Verifica rollback usando el checklist above
2. Notifica stakeholders (Slack, email, status page)
3. Crea incident ticket si no ya creado
4. Captura timeline de events (deploy time, detection, rollback)
5. Preservea logs y metrics para post-mortem
6. NO re-deployees el same version sin un fix
7. Identifica root cause del failure
8. Escribe fix y testea en staging
9. Schedulea post-mortem meeting dentro de 48 hours
10. Updatea deployment runbook con lessons learned
```

### 8.3 Communication Template

```text
[RESOLVED] Production deployment rollback — my-app

Timeline:
  - 14:00 UTC: Deployment v2.3.1 starteo
  - 14:05 UTC: Error rate increased a 8%
  - 14:07 UTC: Rollback initiated
  - 14:10 UTC: Rollback complete, error rate back a 0.1%

Impact:
  - Users experimentaron 500 errors por approximately 10 minutes
  - ~5% de requests failearon durante el incident
  - No data loss o corruption

Root cause (preliminary):
  - Database connection pool misconfiguration en v2.3.1

Action items:
  - Fix connection pool configuration
  - Add pre-deployment database connection test
  - Update CI pipeline para catchear este configuration error

Current status:
  - Production esta running v2.3.0 (previous stable version)
  - All services estan healthy
  - Next deployment scheduled despues de fix verified en staging
```

## Preguntas Frecuentes

### ¿Qué tan rapido deberia hacer rollback?

Haz rollback immediately cuando error rate excede 5% o health checks estan failing. No esperes para investigar — rollback first, investiga despues. El goal es minimizar customer impact. Un rollback toma 2-5 minutes en most Kubernetes environments. Investigation puede tomar hours. Haz rollback, verifica que el service esta healthy, luego investiga el root cause con el failed version en staging. Si esperas para investigar mientras customers estan experimentando errors, estas extendiendo el incident unnecessarily.

### ¿Qué pasa si el rollback tambien failea?

Si `kubectl rollout undo` failea, checkea stuck pods y force-deletealos: `kubectl delete pod <name> --force --grace-period=0`. Si el previous revision tambien esta broken, identifica el last known-good revision desde el rollout history y rollback a ese specific revision. Si no previous revision funciona, deployea el last known-good image directamente: `kubectl set image deployment/my-app container=myorg/my-app:v2.3.0`. Si el issue es infrastructure (node failure, network), addressa eso first. Si el database es el problem, rollback el database migration antes de rollbackear el application.

### ¿Puedo hacer rollback de un database migration?

Depende del migration type. Reversible migrations (con down/undo scripts) pueden ser rolled back — corre el reverse migration. Forward-only migrations no pueden ser rolled back — escribe un fix-forward migration que corrija el issue. Expand-contract migrations pueden ser rolled back durante el expand y migrate phases, pero no despues del contract phase (old column se gone). Para data-loss migrations (DROP TABLE, DELETE), el unico rollback es restorear desde un backup — esto deberia ser last resort. Siempre testea migration rollbacks en staging antes de correrlos en production. Usa el expand-contract pattern para high-risk schema changes.

### ¿Deberia usar blue-green o canary deployments?

Blue-green es simpler — two full environments, instant switch, instant rollback. Usalo para services que pueden correr two full copies sin resource concerns. Canary es mas complex pero safer — gradual traffic shifting, automatic rollback on error metrics, smaller blast radius. Usa canary para high-traffic services donde quieres automated rollback y gradual exposure. Blue-green requiree double de resources durante deployment. Canary requiree traffic splitting (Istio, Argo Rollouts). Para most production services, canary con automated rollback es el best choice. Para small services o internal tools, blue-green es sufficient.

### ¿Cómo prevengo bad deployments de llegar a production?

Implementa multiple gates: automated tests (unit, integration, E2E) en CI, security scanning (SAST, dependency check), canary deployment con automated rollback (Argo Rollouts con error rate y latency analysis), pre-deployment health checks y manual approval para production deployments. Usa feature flags para decouple deployment de release — deployea el new version pero keep features disabled hasta ready. Corre chaos engineering tests en staging para verificar resilience. Implementa deployment freezes durante high-traffic periods. Requiree code review por al menos two engineers para production changes. Monitora deployment metrics y setea up alerts para deployment failures.
