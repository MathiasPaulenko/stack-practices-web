---
contentType: docs
slug: kubernetes-pod-disruption-budget-template
title: "Plantilla de Pod Disruption Budget de Kubernetes"
description: "Una plantilla para definir Pod Disruption Budgets que controlan voluntary disruptions durante node drains, upgrades y maintenance windows."
metaDescription: "Usá esta plantilla de Kubernetes Pod Disruption Budget para controlar voluntary disruptions durante node drains, cluster upgrades y maintenance."
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
  - /docs/devops/ci-cd-pipeline-design-template
  - /docs/devops/helm-chart-review-checklist
  - /docs/devops/terraform-state-management-policy
  - /guides/devops/complete-guide-kubernetes-deployment
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de Kubernetes Pod Disruption Budget para controlar voluntary disruptions durante node drains, cluster upgrades y maintenance."
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

Un Pod Disruption Budget (PDB) define el minimum number de pods que deben remain available durante voluntary disruptions. Voluntary disruptions incluyen node drains, cluster upgrades y maintenance. Sin PDBs, un node drain puede evictar all pods de un service simultáneamente, causando downtime.

## When to Use

- Deployeando stateless services a Kubernetes
- Corriendo cluster upgrades que drenan nodes
- Agendando maintenance windows
- Multi-replica deployments que necesitan availability guarantees
- Compliance requirements para service uptime

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

### PDB con maxUnavailable

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

### PDB con Percentage

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
| minAvailable (percentage) | 50% | Scales con replica count | 10 replicas, need 5 |
| maxUnavailable (absolute) | 1 | Control disruption rate | 5 replicas, allow 1 down |
| maxUnavailable (percentage) | 25% | Proportional disruption | 8 replicas, allow 2 down |

### Decision Matrix

| Replica Count | Recommended Strategy | Rationale |
|---------------|---------------------|-----------|
| 1 | No PDB (o minAvailable: 1) | Single replica, PDB blockea all drains |
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
| Rationale | High traffic, puede tolerate 1 pod down |
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
| Rationale | Jobs son resumable, tolerate 1 down |
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
| Rationale | Single replica, PDB blockearía all drains |

### Scheduled Job (CronJob)

| Field | Value |
|-------|-------|
| CronJob | data-export |
| Strategy | No PDB |
| Rationale | Jobs son ephemeral, rescheduled por CronJob controller |

## 4. PDB and Node Drain Interaction

### How PDB Affects Node Drains

| Scenario | Pod Count | PDB | Drain Behavior |
|----------|-----------|-----|----------------|
| 3 pods, minAvailable: 2 | 3 | 2 | Evict 1 at a time, wait por new pod antes del next |
| 3 pods, minAvailable: 3 | 3 | 3 | Drain blocked — no puede evictar ningún pod |
| 5 pods, maxUnavailable: 1 | 5 | 1 | Evict 1 at a time |
| 2 pods, maxUnavailable: 1 | 2 | 1 | Evict 1, wait por replacement |
| 1 pod, minAvailable: 1 | 1 | 1 | Drain blocked — no puede evictar el only pod |

### Drain Commands

```bash
# Standard drain (respeta PDBs)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Drain con timeout (PDB puede blockear)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data --timeout=5m

# Force drain (bypasses PDB — usá con caution)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data --force

# Checkeá drain status
kubectl get pods -o wide --field-selector spec.nodeName=node-1

# Uncordon node después de maintenance
kubectl uncordon node-1
```

### PDB Status Check

```bash
# Checkeá PDB status
kubectl get pdb -n production

# Detailed PDB status
kubectl describe pdb example-app-pdb -n production

# Checkeá qué pods están protected
kubectl get pods -n production -l app.kubernetes.io/name=example-app
```

## 5. PDB in Helm Charts

### values.yaml

```yaml
podDisruptionBudget:
  enabled: true
  minAvailable: 2
  # maxUnavailable: 1  # Alternative a minAvailable
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
| PDB allowed disruptions | Number de pods que pueden disrupt | < 0 (blocked) |
| PDB current healthy | Currently healthy pods | < minAvailable |
| PDB desired healthy | Target healthy pods | — |
| PDB expected pods | Total pods matching selector | — |
| Drain blocked duration | Time que un drain está blocked por PDB | > 10 min |

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
| Drain stuck | PDB blockea eviction (minAvailable = replicas) | Scale up deployment, luego drain |
| Drain stuck | No enough replicas para satisfy PDB | Scale up antes de drain |
| PDB not found | PDB no created o wrong namespace | Verify PDB exists: `kubectl get pdb -n <ns>` |
| PDB selector mismatch | Selector no matchea pod labels | Verify labels: `kubectl get pods --show-labels` |
| Eviction timeout | Pod toma too long para terminate | Addeá terminationGracePeriodSeconds |

### Debugging Steps

```bash
# 1. Checkeá PDB status
kubectl get pdb -n production
kubectl describe pdb example-app-pdb -n production

# 2. Checkeá pod count vs. PDB requirements
kubectl get pods -n production -l app.kubernetes.io/name=example-app --no-headers | wc -l

# 3. Checkeá si pods son healthy
kubectl get pods -n production -l app.kubernetes.io/name=example-app

# 4. Checkeá node drain status
kubectl get nodes -o wide
kubectl describe node node-1 | grep -A 10 "Conditions:"

# 5. Checkeá eviction events
kubectl get events -n production --field-selector reason=Eviction
```
```

## Explanation

Un Pod Disruption Budget le dice a Kubernetes el minimum availability requirement durante voluntary disruptions. Voluntary disruptions son initiated por cluster administrators: node drains para upgrades, maintenance o autoscaling. Involuntary disruptions (hardware failures, kernel panics) no son controlled por PDBs — el system handlea esos through replica controllers.

Los two PDB strategies son minAvailable y maxUnavailable. minAvailable specifica el minimum number de pods que deben stay running. maxUnavailable specifica el maximum number de pods que pueden estar down. Podés usar absolute numbers (2) o percentages (50%). Choose minAvailable cuando necesitás un fixed floor. Choose maxUnavailable cuando querés controlar el disruption rate.

Para single-replica deployments, PDBs son problematic. Un PDB con minAvailable: 1 blockea all node drains porque evicting el only pod viola el budget. Options: scaleá a 2+ replicas antes de enable PDB, o no crees un PDB y acceptá downtime durante drains.

PDBs interactúan con node drains a través del eviction API. Cuando `kubectl drain` corre, intenta evictar pods one by one. El eviction controller checkea PDBs antes de allow cada eviction. Si el eviction violaría un PDB, el drain espera. Si el PDB nunca se puede satisfy (e.g., deployment está stuck), el drain blockea indefinitely.

Monitorear PDBs es important. Un PDB que blockea all disruptions es un configuration error — previene cluster maintenance. Alert cuando allowed disruptions es 0 por más de 10 minutes. Alert cuando current healthy pods cae below desired healthy pods, indicando que el service está degraded.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Single replica | No PDB o minAvailable: 0 | Acceptá downtime durante drains |
| StatefulSet | minAvailable para quorum | Databases need majority |
| DaemonSet | No PDB needed | DaemonSet pods corren en every node |
| Job/CronJob | No PDB needed | Ephemeral pods, rescheduled |
| HPA-scaled | Usá percentage PDB | Scales con replica count |
| Multi-az | Un PDB per AZ | Prevení all-AZ disruption |

## What Works

1. Siempre seteá un PDB para multi-replica deployments — previene simultaneous eviction
2. Usá maxUnavailable para flexible disruption control — allow una disruption at a time
3. Usá minAvailable para critical services — guarantee un floor
4. Scaleá up antes de drain — ensure que PDB se puede satisfy
5. Monitoreá PDB status — blocked PDBs prevent maintenance
6. Testeá PDBs durante game days — verify que funcionan under real conditions
7. Incluí PDBs en Helm charts — hacelos part del deployment template

## Common Mistakes

1. PDB en single-replica deployment — blockea all drains
2. minAvailable equals replica count — ningún pod puede ever ser evicted
3. No PDB en critical services — drain puede take down el service
4. PDB selector no matchea pods — PDB no tiene effect
5. No monitoring en PDB status — blocked drains se descubren durante incidents
6. Olvidar PDB cuando scaleás down — PDB puede prevenir scale-down
7. Usar policy/v1beta1 (deprecated) — usá policy/v1

## Frequently Asked Questions

### ¿Qué pasa si un PDB blockea un node drain?

El drain command espera. By default, espera indefinitely. Usá `--timeout` para limitar el wait. Si el PDB nunca se puede satisfy (e.g., deployment tiene fewer replicas que minAvailable), el drain blockea hasta timeout. Resolution: scaleá up el deployment, fixeá el PDB, o usá `--force` (bypasses PDB, causa downtime).

### ¿Debería usar minAvailable o maxUnavailable?

Usá minAvailable cuando necesitás un guaranteed floor (e.g., "always tené 2 pods running"). Usá maxUnavailable cuando querés controlar el disruption rate (e.g., "allow 1 pod down at a time"). Para most services, maxUnavailable: 1 es un good default — allow una disruption at a time sin require un specific replica count.

### ¿Los PDBs protegen contra hardware failures?

No. PDBs solo aplican a voluntary disruptions (drains, evictions). Involuntary disruptions (node failure, network partition) se handle por el replica controller (Deployment, StatefulSet), que crea replacement pods. PDBs no help cuando un node muere unexpectedly.

### ¿Puedo tener both minAvailable y maxUnavailable en un PDB?

No. Un PDB puede specificar either minAvailable o maxUnavailable, no both. Son mutually exclusive. Choose uno basado en tus availability requirements.

### ¿Cómo interactúan los PDBs con cluster autoscaler?

Cuando el cluster autoscaler remove un node, lo drena first. El drain respeta PDBs. Si un PDB blockea el drain, el autoscaler espera (up to un configurable timeout) y puede abort el scale-down. Esto previene el autoscaler de causar service disruptions. Configurá el autoscaler's `--max-graceful-termination-sec` para controlar cuánto espera.
