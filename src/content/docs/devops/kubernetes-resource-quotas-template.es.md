---
contentType: docs
slug: kubernetes-resource-quotas-template
templateType: guideline
title: "Plantilla de Kubernetes Resource Quotas"
description: "Plantilla para definir Kubernetes resource quotas por namespace: CPU y memory limits, object count quotas, storage quotas, LimitRanges para default requests, priority class integration y monitoring con ejemplos para multi-tenant clusters."
metaDescription: "Kubernetes resource quotas template: CPU, memory, object count, storage quotas, LimitRanges, priority classes, multi-tenant clusters, monitoring examples."
difficulty: intermediate
topics:
  - devops
tags:
  - kubernetes
  - resource-quotas
  - k8s
  - devops
  - cluster-management
  - multi-tenant
relatedResources:
  - /docs/devops/docker-image-hardening-checklist
  - /docs/devops/deployment-rollback-runbook
  - /docs/devops/terraform-module-versioning-policy
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Kubernetes resource quotas template: CPU, memory, object count, storage quotas, LimitRanges, priority classes, multi-tenant clusters, monitoring examples."
  keywords:
    - kubernetes quotas
    - resource limits
    - limitrange
    - k8s namespace
    - cluster resource management
    - multi-tenant kubernetes
    - cpu memory quotas
---

## Overview

Esta plantilla define Kubernetes resource quotas para namespaces en un multi-tenant cluster. Cubre CPU y memory limits, object count quotas, storage quotas, LimitRanges para default requests, priority class integration y monitoring. Usa esta plantilla cuando setees up new namespaces o enforcees resource governance across teams.

---

## 1. Resource Quota Basics

### 1.1 Quota Types

```text
Quota type          | Que limita                       | Example
────────────────────┼───────────────────────────────────┼──────────────────────────
Compute             | CPU y memory requests/limits     | requests.cpu, limits.cpu
Storage             | Persistent volume claims         | requests.storage
Object count        | Numero de k8s objects            | count/pods, count/services
Extended resources  | GPUs, custom resources           | requests.nvidia.com/gpu
Network             | Ingress, egress (con CNI)        | Not native — usa CNI quotas
```

### 1.2 Namespace Quota Template

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-payments-quota
  namespace: team-payments
  labels:
    app.kubernetes.io/managed-by: platform-team
    quota-tier: standard
spec:
  hard:
    # Compute resources — requests
    requests.cpu: "10"
    requests.memory: 20Gi

    # Compute resources — limits
    limits.cpu: "20"
    limits.memory: 40Gi

    # Storage
    requests.storage: 100Gi
    persistentvolumeclaims: "10"

    # Object counts
    count/pods: "50"
    count/services: "10"
    count/configmaps: "20"
    count/secrets: "20"
    count/deployments.apps: "10"
    count/statefulsets.apps: "5"
    count/jobs.batch: "20"
    count/cronjobs.batch: "10"
    count/ingresses.networking.k8s.io: "5"

    # Extended resources
    # requests.nvidia.com/gpu: "2"
```

---

## 2. LimitRange — Default Requests and Limits

### 2.1 Por qué LimitRange?

```text
Sin LimitRange:
  - Pods pueden ser created sin resource requests
  - Pods pueden requestear all available namespace quota
  - No default values para containers que omiten resources

Con LimitRange:
  - Default requests/limits applied a containers sin ellos
  - Min y max bounds enforced per container
  - Previene resource starvation de misconfigured pods
  - Ensurea fair distribution across workloads
```

### 2.2 LimitRange Template

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: team-payments-limits
  namespace: team-payments
spec:
  limits:
    # Container defaults
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: 2000m
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi
      maxLimitRequestRatio:
        cpu: 4
        memory: 2

    # Pod-level limits
    - type: Pod
      max:
        cpu: 4000m
        memory: 8Gi
      min:
        cpu: 100m
        memory: 128Mi

    # Persistent volume claim limits
    - type: PersistentVolumeClaim
      max:
        storage: 50Gi
      min:
        storage: 1Gi
```

---

## 3. Quota Tiers por Team Size

### 3.1 Tier Definitions

```text
Tier        | CPU req | Mem req  | CPU lim | Mem lim | Storage | Pods
────────────┼─────────┼──────────┼─────────┼─────────┼─────────┼─────
small       | 4       | 8Gi      | 8       | 16Gi    | 50Gi    | 20
standard    | 10      | 20Gi     | 20      | 40Gi    | 100Gi   | 50
large       | 25      | 50Gi     | 50      | 100Gi   | 250Gi   | 100
xlarge      | 50      | 100Gi    | 100     | 200Gi   | 500Gi   | 200
```

### 3.2 Small Team Quota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: small-team-quota
  namespace: team-small
  labels:
    quota-tier: small
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    requests.storage: 50Gi
    persistentvolumeclaims: "5"
    count/pods: "20"
    count/services: "5"
    count/deployments.apps: "5"
```

### 3.3 Large Team Quota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: large-team-quota
  namespace: team-large
  labels:
    quota-tier: large
spec:
  hard:
    requests.cpu: "25"
    requests.memory: 50Gi
    limits.cpu: "50"
    limits.memory: 100Gi
    requests.storage: 250Gi
    persistentvolumeclaims: "20"
    count/pods: "100"
    count/services: "20"
    count/deployments.apps: "20"
    count/statefulsets.apps: "10"
```

---

## 4. Priority Classes

### 4.1 Priority Class Definitions

```yaml
# Critical — system services, never evicted
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical
value: 1000000
globalDefault: false
description: "Critical workloads — never preempted"
preemptionPolicy: PreemptLowerPriority

---
# High — production services
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 100000
globalDefault: false
description: "Production services"
preemptionPolicy: PreemptLowerPriority

---
# Standard — default para most workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: standard
value: 10000
globalDefault: true
description: "Standard workloads"

---
# Low — batch jobs, pueden ser preempted
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 1000
globalDefault: false
description: "Batch jobs — can be preempted"
preemptionPolicy: Never
```

### 4.2 Quota by Priority Class

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: priority-quota
  namespace: team-payments
spec:
  hard:
    # Total namespace quota
    requests.cpu: "20"
    requests.memory: 40Gi

    # Quota scoped a priority class
    # Solo high-priority pods pueden usar hasta 15 CPUs
    - scopeName: PriorityClass
      values: ["high-priority"]
      hard:
        requests.cpu: "15"
        requests.memory: 30Gi

    # Low-priority pods limited a 5 CPUs
    - scopeName: PriorityClass
      values: ["low-priority"]
      hard:
        requests.cpu: "5"
        requests.memory: 10Gi
```

---

## 5. Multi-Tenant Namespace Setup

### 5.1 Namespace con Quota y Network Policy

```yaml
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: team-payments
  labels:
    team: payments
    environment: production
    quota-tier: standard

---
# Resource quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-payments
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi

---
# Limit range
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-payments
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: 2000m
        memory: 4Gi

---
# Network policy — deny all ingress by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: team-payments
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress: []
```

---

## 6. Monitoring and Alerting

### 6.1 Quota Usage Check

```bash
# Checkea quota usage para un namespace
kubectl get resourcequota -n team-payments -o yaml

# Checkea limit ranges
kubectl get limitrange -n team-payments

# Checkea pod resource usage
kubectl top pods -n team-payments --sort-by=cpu

# Checkea namespace resource consumption
kubectl describe resourcequota compute-quota -n team-payments
```

### 6.2 Prometheus Alerts

```yaml
# Alert: namespace approaching CPU quota limit
- alert: NamespaceCPUQuotaNearLimit
  expr: |
    sum(kube_pod_container_resource_requests{resource="cpu", namespace="team-payments"})
    /
    sum(kube_resourcequota{resource="requests.cpu", namespace="team-payments", type="hard"})
    > 0.85
  for: 10m
  labels:
    severity: warning
    team: payments
  annotations:
    summary: "Namespace {{ $labels.namespace }} CPU quota near limit"
    description: "CPU requests at {{ $value | humanizePercentage }} of quota"

# Alert: namespace exceeding memory limit
- alert: NamespaceMemoryQuotaExceeded
  expr: |
    sum(kube_pod_container_resource_limits{resource="memory", namespace="team-payments"})
    >
    sum(kube_resourcequota{resource="limits.memory", namespace="team-payments", type="hard"})
  for: 5m
  labels:
    severity: critical
    team: payments
  annotations:
    summary: "Namespace {{ $labels.namespace }} memory quota exceeded"
```

### 6.3 Grafana Dashboard Query

```promql
# CPU quota usage by namespace
sum(kube_pod_container_resource_requests{resource="cpu", namespace=~"team-.*"})
by (namespace)
/
sum(kube_resourcequota{resource="requests.cpu", namespace=~"team-.*", type="hard"})
by (namespace)

# Memory quota usage by namespace
sum(kube_pod_container_resource_requests{resource="memory", namespace=~"team-.*"})
by (namespace)
/
sum(kube_resourcequota{resource="requests.memory", namespace=~"team-.*", type="hard"})
by (namespace)

# Pod count vs quota
count(kube_pod_info{namespace=~"team-.*"}) by (namespace)
/
sum(kube_resourcequota{resource="count/pods", namespace=~"team-.*", type="hard"}) by (namespace)
```

## Preguntas Frecuentes

### ¿Qué pasa cuando un namespace hittea su resource quota?

Cuando un namespace reachea su quota, Kubernetes previene creation de new resources que excederian el quota. Pods que requestean mas CPU o memory que el remaining quota se quedan stuck en Pending state con un `FailedScheduling` message. New PVCs que exceden storage quota se rejected. New ConfigMaps, Secrets o Services que exceden object count quotas se rejected. Existing pods siguen running — el quota solo blockea new resource creation. Para fixear esto, either increasea el namespace quota o reduce resource usage scaleando down o removeendo unused resources.

### ¿Cómo elijo el right quota size para un team?

Empieza con el standard tier (10 CPU, 20Gi memory, 50 pods) para most teams. Monitora usage por 2-4 weeks usando `kubectl top` y Prometheus. Si el team consistentemente usa mas de 80% de su quota, upgradear al next tier. Si usa menos de 30%, downgradear. Factora en peak usage, no solo average — batch jobs y deployments crean temporary spikes. Considera el team's roadmap — si planean addar new services, provisionea ahead. Siempre deja 20% headroom para deployments y rolling updates.

### ¿Deberia setear CPU limits en containers?

CPU limits pueden causar throttling — cuando un container hittea su CPU limit, se throttled (no killed, pero slowed down). Esto puede causar latency spikes y timeouts en latency-sensitive applications. Un common approach es setear CPU requests (para scheduling) pero no CPU limits (alloweando burst usage). Sin embargo, sin limits, un container puede consumir all CPU en el node, starveando otros containers. El best practice depende de tu workload: setea limits para batch jobs y CPU-bound services, omite limits para latency-sensitive services con predictable CPU patterns. Siempre setea memory limits — memory no es compressible y excederla killea el container (OOMKilled).

### ¿Cómo interactuan LimitRange defaults con pod resource requests?

Si un container en un pod no specificea resource requests, los LimitRange defaultRequest values se applied. Si un container no specificea resource limits, los LimitRange default values se applied. Si un container specificea requests pero no limits (o vice versa), solo los missing values se filled desde el LimitRange. Los LimitRange max y min constraints se enforced — si un container requestea mas que max o menos que min, el pod se rejected. El maxLimitRequestRatio previene containers de tener un limit-to-request ratio higher que specified (e.g., limit 4x el request).

### ¿Cómo implemento quotas across multiple namespaces efficiently?

Usa un GitOps approach — define all quotas como YAML en un Git repository y applyealos con un tool como ArgoCD o Flux. Crea Kustomize overlays para cada namespace con el appropriate tier. Usa un namespace template que incluya ResourceQuota, LimitRange, NetworkPolicy y default ServiceAccount. Automatiza namespace provisioning con un self-service portal o CLI tool que cree el namespace y applyee los standard resources. Monitora quota usage centrally con Prometheus y alerta cuando teams se acercan a sus limits. Reviewa quotas quarterly y adjusta basado en actual usage patterns.
