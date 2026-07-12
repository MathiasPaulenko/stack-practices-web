---


contentType: docs
slug: kubernetes-pod-disruption-budget-template
title: "Kubernetes Pod Disruption Budget Template"
description: "A template for defining Pod Disruption Budgets to control voluntary disruptions during node drains, upgrades, and maintenance windows."
metaDescription: "Use this Kubernetes Pod Disruption Budget template to control voluntary disruptions during node drains, cluster upgrades, and maintenance windows."
difficulty: intermediate
topics:
  - testing
tags:
  - devops
  - kubernetes
  - pdb
  - availability
  - template
  - disruption
  - infrastructure
relatedResources:
  - /docs/ci-cd-pipeline-design-template
  - /docs/helm-chart-review-checklist
  - /docs/terraform-state-management-policy
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this Kubernetes Pod Disruption Budget template to control voluntary disruptions during node drains, cluster upgrades, and maintenance windows."
  keywords:
    - pod disruption budget
    - kubernetes
    - pdb
    - availability
    - node drain
    - template
    - maintenance


---

## Overview

A Pod Disruption Budget (PDB) defines the minimum number of pods that must remain available during voluntary disruptions. Voluntary disruptions include node drains, cluster upgrades, and maintenance. Without PDBs, a node drain can evict all pods of a service simultaneously, causing downtime.

## When to Use


- For alternatives, see [CI/CD Pipeline Design Template](/docs/ci-cd-pipeline-design-template/).

- Deploying stateless services to Kubernetes
- Running cluster upgrades that drain nodes
- Scheduling maintenance windows
- Multi-replica deployments that need availability guarantees
- Compliance requirements for service uptime

## Solution

```markdown
# Pod Disruption Budget — `<Service Name>`

## PDB Overview

| Field | Value |
|-------|-------|
| Service | example-app |
| Namespace | production |
| Deployment | example-app |
| Min Replicas | 3 |
| PDB Strategy | minAvailable |
| Min Available | 2 |
| Max Unavailable | — |
| API Version | policy/v1 |
| Last Updated | 2026-07-05 |
| Owner | DevOps Team |

## 1. PDB Definitions

### Standard PDB (minAvailable)

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: example-app-pdb
  namespace: production
  labels:
    app.kubernetes.io/name: example-app
    app.kubernetes.io/instance: example-app
    app.kubernetes.io/managed-by: helm
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: example-app
      app.kubernetes.io/instance: example-app
```

### PDB with maxUnavailable

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: example-app-pdb
  namespace: production
  labels:
    app.kubernetes.io/name: example-app
    app.kubernetes.io/instance: example-app
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: example-app
      app.kubernetes.io/instance: example-app
```

### PDB with Percentage

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: example-app-pdb
  namespace: production
spec:
  minAvailable: 50%
  selector:
    matchLabels:
      app.kubernetes.io/name: example-app
```

## 2. PDB Strategy Selection

| Strategy | Value | When to Use | Example |
|----------|-------|-------------|---------|
| minAvailable (absolute) | 2 | Fixed minimum replicas needed | 3 replicas, always need 2 |
| minAvailable (percentage) | 50% | Scales with replica count | 10 replicas, need 5 |
| maxUnavailable (absolute) | 1 | Control disruption rate | 5 replicas, allow 1 down |
| maxUnavailable (percentage) | 25% | Proportional disruption | 8 replicas, allow 2 down |

### Decision Matrix

| Replica Count | Recommended Strategy | Rationale |
|---------------|---------------------|-----------|
| 1 | No PDB (or minAvailable: 1) | Single replica, PDB blocks all drains |
| 2 | maxUnavailable: 1 | Allow 1 down, keep 1 running |
| 3 | minAvailable: 2 | Keep 2 running, allow 1 disruption |
| 5 | maxUnavailable: 1 | Allow 1 disruption at a time |
| 10+ | maxUnavailable: 25% | Proportional disruption control |

## 3. Service-Specific PDBs

### Web Frontend

| Field | Value |
|-------|-------|
| Deployment | web-frontend |
| Replicas | 6 |
| Strategy | maxUnavailable: 1 |
| Rationale | High traffic, can tolerate 1 pod down |
| HPA | Yes (min: 4, max: 12) |

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-frontend-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: web-frontend
```

### API Service

| Field | Value |
|-------|-------|
| Deployment | api-service |
| Replicas | 4 |
| Strategy | minAvailable: 3 |
| Rationale | Critical path, need 75% available |
| HPA | Yes (min: 3, max: 8) |

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: api-service
```

### Worker (Background Jobs)

| Field | Value |
|-------|-------|
| Deployment | background-worker |
| Replicas | 3 |
| Strategy | maxUnavailable: 1 |
| Rationale | Jobs are resumable, tolerate 1 down |
| HPA | No |

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: background-worker-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: background-worker
```

### Database (StatefulSet)

| Field | Value |
|-------|-------|
| StatefulSet | postgres-cluster |
| Replicas | 3 |
| Strategy | minAvailable: 2 |
| Rationale | Quorum-based, need majority |
| HPA | No |

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: postgres-cluster
```

### Redis Cache

| Field | Value |
|-------|-------|
| Deployment | redis-cache |
| Replicas | 1 |
| Strategy | No PDB |
| Rationale | Single replica, PDB would block all drains |

### Scheduled Job (CronJob)

| Field | Value |
|-------|-------|
| CronJob | data-export |
| Strategy | No PDB |
| Rationale | Jobs are ephemeral, rescheduled by CronJob controller |

## 4. PDB and Node Drain Interaction

### How PDB Affects Node Drains

| Scenario | Pod Count | PDB | Drain Behavior |
|----------|-----------|-----|----------------|
| 3 pods, minAvailable: 2 | 3 | 2 | Evict 1 at a time, wait for new pod before next |
| 3 pods, minAvailable: 3 | 3 | 3 | Drain blocked — cannot evict any pod |
| 5 pods, maxUnavailable: 1 | 5 | 1 | Evict 1 at a time |
| 2 pods, maxUnavailable: 1 | 2 | 1 | Evict 1, wait for replacement |
| 1 pod, minAvailable: 1 | 1 | 1 | Drain blocked — cannot evict the only pod |

### Drain Commands

```bash
# Standard drain (respects PDBs)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Drain with timeout (PDB may block)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data --timeout=5m

# Force drain (bypasses PDB — use with caution)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data --force

# Check drain status
kubectl get pods -o wide --field-selector spec.nodeName=node-1

# Uncordon node after maintenance
kubectl uncordon node-1
```

### PDB Status Check

```bash
# Check PDB status
kubectl get pdb -n production

# Detailed PDB status
kubectl describe pdb example-app-pdb -n production

# Check which pods are protected
kubectl get pods -n production -l app.kubernetes.io/name=example-app
```

## 5. PDB in Helm Charts

### values.yaml

```yaml
podDisruptionBudget:
  enabled: true
  minAvailable: 2
  # maxUnavailable: 1  # Alternative to minAvailable
```

### Template

```yaml
{{- if .Values.podDisruptionBudget.enabled }}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  {{- if .Values.podDisruptionBudget.minAvailable }}
  minAvailable: {{ .Values.podDisruptionBudget.minAvailable }}
  {{- end }}
  {{- if .Values.podDisruptionBudget.maxUnavailable }}
  maxUnavailable: {{ .Values.podDisruptionBudget.maxUnavailable }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "chart.selectorLabels" . | nindent 6 }}
{{- end }}
```

## 6. Monitoring PDBs

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| PDB allowed disruptions | Number of pods that can be disrupted | < 0 (blocked) |
| PDB current healthy | Currently healthy pods | < minAvailable |
| PDB desired healthy | Target healthy pods | — |
| PDB expected pods | Total pods matching selector | — |
| Drain blocked duration | Time a drain is blocked by PDB | > 10 min |

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: pdb-alerts
    rules:
      - alert: PDBBlocked
        expr: kube_poddisruptionstatus_allowed_disruptions == 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PDB {{ $labels.pdb }} blocks all disruptions"
          description: "No pods can be disrupted for {{ $labels.namespace }}/{{ $labels.pdb }}"

      - alert: PDBBelowMinAvailable
        expr: kube_poddisruptionstatus_current_healthy < kube_poddisruptionstatus_desired_healthy
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "PDB {{ $labels.pdb }} below min available"
          description: "Only {{ $value }} healthy pods, need {{ $labels.desired_healthy }}"
```

## 7. PDB Troubleshooting

### Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Drain stuck | PDB blocks eviction (minAvailable = replicas) | Scale up deployment, then drain |
| Drain stuck | Not enough replicas to satisfy PDB | Scale up before draining |
| PDB not found | PDB not created or wrong namespace | Verify PDB exists: `kubectl get pdb -n <ns>` |
| PDB selector mismatch | Selector doesn't match pod labels | Verify labels: `kubectl get pods --show-labels` |
| Eviction timeout | Pod takes too long to terminate | Add terminationGracePeriodSeconds |

### Debugging Steps

```bash
# 1. Check PDB status
kubectl get pdb -n production
kubectl describe pdb example-app-pdb -n production

# 2. Check pod count vs PDB requirements
kubectl get pods -n production -l app.kubernetes.io/name=example-app --no-headers | wc -l

# 3. Check if pods are healthy
kubectl get pods -n production -l app.kubernetes.io/name=example-app

# 4. Check node drain status
kubectl get nodes -o wide
kubectl describe node node-1 | grep -A 10 "Conditions:"

# 5. Check eviction events
kubectl get events -n production --field-selector reason=Eviction
```
```

## Explanation

A Pod Disruption Budget tells Kubernetes the minimum availability requirement during voluntary disruptions. Voluntary disruptions are initiated by cluster administrators: node drains for upgrades, maintenance, or autoscaling. Involuntary disruptions (hardware failures, kernel panics) are not controlled by PDBs — the system handles those through replica controllers.

The two PDB strategies are minAvailable and maxUnavailable. minAvailable specifies the minimum number of pods that must stay running. maxUnavailable specifies the maximum number of pods that can be down. You can use absolute numbers (2) or percentages (50%). Choose minAvailable when you need a fixed floor. Choose maxUnavailable when you want to control the disruption rate.

For single-replica deployments, PDBs are problematic. A PDB with minAvailable: 1 blocks all node drains because evicting the only pod violates the budget. Options: scale to 2+ replicas before enabling PDB, or don't create a PDB and accept downtime during drains.

PDBs interact with node drains through the eviction API. When `kubectl drain` runs, it tries to evict pods one by one. The eviction controller checks PDBs before allowing each eviction. If the eviction would violate a PDB, the drain waits. If the PDB can never be satisfied (e.g., deployment is stuck), the drain blocks indefinitely.

Monitoring PDBs is important. A PDB that blocks all disruptions is a configuration error — it prevents cluster maintenance. Alert when allowed disruptions is 0 for more than 10 minutes. Alert when current healthy pods falls below desired healthy pods, indicating the service is already degraded.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Single replica | No PDB or minAvailable: 0 | Accept downtime during drains |
| StatefulSet | minAvailable for quorum | Databases need majority |
| DaemonSet | No PDB needed | DaemonSet pods run on every node |
| Job/CronJob | No PDB needed | Ephemeral pods, rescheduled |
| HPA-scaled | Use percentage PDB | Scales with replica count |
| Multi-az | One PDB per AZ | Prevents all-AZ disruption |

## What Works

1. Always set a PDB for multi-replica deployments — prevents simultaneous eviction
2. Use maxUnavailable for flexible disruption control — allows one disruption at a time
3. Use minAvailable for critical services — guarantees a floor
4. Scale up before draining — ensures PDB can be satisfied
5. Monitor PDB status — blocked PDBs prevent maintenance
6. Test PDBs during game days — verify they work under real conditions
7. Include PDBs in Helm charts — make them part of the deployment template

## Common Mistakes

1. PDB on single-replica deployment — blocks all drains
2. minAvailable equals replica count — no pod can ever be evicted
3. No PDB on critical services — drain can take down the service
4. PDB selector doesn't match pods — PDB has no effect
5. No monitoring on PDB status — blocked drains discovered during incidents
6. Forgetting PDB when scaling down — PDB may prevent scale-down
7. Using policy/v1beta1 (deprecated) — use policy/v1

## Frequently Asked Questions

### What happens if a PDB blocks a node drain?

The drain command waits. By default, it waits indefinitely. Use `--timeout` to limit the wait. If the PDB can never be satisfied (e.g., deployment has fewer replicas than minAvailable), the drain blocks until timeout. Resolution: scale up the deployment, fix the PDB, or use `--force` (bypasses PDB, causes downtime).

### Should I use minAvailable or maxUnavailable?

Use minAvailable when you need a guaranteed floor (e.g., "always have 2 pods running"). Use maxUnavailable when you want to control the disruption rate (e.g., "allow 1 pod down at a time"). For most services, maxUnavailable: 1 is a good default — it allows one disruption at a time without requiring a specific replica count.

### Do PDBs protect against hardware failures?

No. PDBs only apply to voluntary disruptions (drains, evictions). Involuntary disruptions (node failure, network partition) are handled by the replica controller (Deployment, StatefulSet), which creates replacement pods. PDBs don't help when a node dies unexpectedly.

### Can I have both minAvailable and maxUnavailable in one PDB?

No. A PDB can specify either minAvailable or maxUnavailable, not both. They are mutually exclusive. Choose one based on your availability requirements.

### How do PDBs interact with cluster autoscaler?

When the cluster autoscaler removes a node, it drains it first. The drain respects PDBs. If a PDB blocks the drain, the autoscaler waits (up to a configurable timeout) and may abort the scale-down. This prevents the autoscaler from causing service disruptions. Configure the autoscaler's `--max-graceful-termination-sec` to control how long it waits.
