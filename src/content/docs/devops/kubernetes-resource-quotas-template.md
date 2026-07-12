---


contentType: docs
slug: kubernetes-resource-quotas-template
templateType: guideline
title: "Kubernetes Resource Quotas Template"
description: "Template for defining Kubernetes resource quotas per namespace: CPU and memory limits, object count quotas, storage quotas, LimitRanges for default requests, priority class integration, and monitoring with examples for multi-tenant clusters."
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
  - /docs/docker-image-hardening-checklist
  - /docs/deployment-rollback-runbook
  - /docs/terraform-module-versioning-policy
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

This template defines Kubernetes resource quotas for namespaces in a multi-tenant cluster. It covers CPU and memory limits, object count quotas, storage quotas, LimitRanges for default requests, priority class integration, and monitoring. Use this template when setting up new namespaces or enforcing resource governance across teams.

---

## 1. Resource Quota Basics

### 1.1 Quota Types

```text
Quota type          | What it limits                    | Example
────────────────────┼───────────────────────────────────┼──────────────────────────
Compute             | CPU and memory requests/limits    | requests.cpu, limits.cpu
Storage             | Persistent volume claims          | requests.storage
Object count        | Number of k8s objects             | count/pods, count/services
Extended resources  | GPUs, custom resources            | requests.nvidia.com/gpu
Network             | Ingress, egress (with CNI)        | Not native — use CNI quotas
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

### 2.1 Why LimitRange?

```text
Without LimitRange:
  - Pods can be created without resource requests
  - Pods can request all available namespace quota
  - No default values for containers that omit resources

With LimitRange:
  - Default requests/limits applied to containers without them
  - Min and max bounds enforced per container
  - Prevents resource starvation from misconfigured pods
  - Ensures fair distribution across workloads
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

## 3. Quota Tiers by Team Size

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
# Standard — default for most workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: standard
value: 10000
globalDefault: true
description: "Standard workloads"

---
# Low — batch jobs, can be preempted
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

    # Quota scoped to priority class
    # Only high-priority pods can use up to 15 CPUs
    - scopeName: PriorityClass
      values: ["high-priority"]
      hard:
        requests.cpu: "15"
        requests.memory: 30Gi

    # Low-priority pods limited to 5 CPUs
    - scopeName: PriorityClass
      values: ["low-priority"]
      hard:
        requests.cpu: "5"
        requests.memory: 10Gi
```

---

## 5. Multi-Tenant Namespace Setup

### 5.1 Namespace with Quota and Network Policy

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
# Check quota usage for a namespace
kubectl get resourcequota -n team-payments -o yaml

# Check limit ranges
kubectl get limitrange -n team-payments

# Check pod resource usage
kubectl top pods -n team-payments --sort-by=cpu

# Check namespace resource consumption
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

## FAQ

### What happens when a namespace hits its resource quota?

When a namespace reaches its quota, Kubernetes prevents creation of new resources that would exceed the quota. Pods that request more CPU or memory than the remaining quota are stuck in Pending state with a `FailedScheduling` message. New PVCs that exceed storage quota are rejected. New ConfigMaps, Secrets, or Services that exceed object count quotas are rejected. Existing pods continue running — the quota only blocks new resource creation. To fix this, either increase the namespace quota or reduce resource usage by scaling down or removing unused resources.

### How do I choose the right quota size for a team?

Start with the standard tier (10 CPU, 20Gi memory, 50 pods) for most teams. Monitor usage for 2-4 weeks using `kubectl top` and Prometheus. If the team consistently uses more than 80% of their quota, upgrade to the next tier. If they use less than 30%, downgrade. Factor in peak usage, not just average — batch jobs and deployments create temporary spikes. Consider the team's roadmap — if they plan to add new services, provision ahead. Always leave 20% headroom for deployments and rolling updates.

### Should I set CPU limits on containers?

CPU limits can cause throttling — when a container hits its CPU limit, it is throttled (not killed, but slowed down). This can cause latency spikes and timeouts in latency-sensitive applications. A common approach is to set CPU requests (for scheduling) but not CPU limits (allowing burst usage). However, without limits, a container can consume all CPU on the node, starving other containers. The best practice depends on your workload: set limits for batch jobs and CPU-bound services, omit limits for latency-sensitive services with predictable CPU patterns. Always set memory limits — memory is not compressible and exceeding it kills the container (OOMKilled).

### How do LimitRange defaults interact with pod resource requests?

If a container in a pod does not specify resource requests, the LimitRange defaultRequest values are applied. If a container does not specify resource limits, the LimitRange default values are applied. If a container specifies requests but not limits (or vice versa), only the missing values are filled from the LimitRange. The LimitRange max and min constraints are enforced — if a container requests more than max or less than min, the pod is rejected. The maxLimitRequestRatio prevents containers from having a limit-to-request ratio higher than specified (e.g., limit 4x the request).

### How do I implement quotas across multiple namespaces efficiently?

Use a GitOps approach — define all quotas as YAML in a Git repository and apply them with a tool like ArgoCD or Flux. Create Kustomize overlays for each namespace with the appropriate tier. Use a namespace template that includes ResourceQuota, LimitRange, NetworkPolicy, and default ServiceAccount. Automate namespace provisioning with a self-service portal or CLI tool that creates the namespace and applies the standard resources. Monitor quota usage centrally with Prometheus and alert when teams approach their limits. Review quotas quarterly and adjust based on actual usage patterns.

## See Also

- [Complete Guide to GitOps with ArgoCD](/guides/complete-guide-gitops-argocd/)
- [Kubernetes Config Management Guide](/guides/complete-guide-kubernetes-config-management/)
- [Complete Guide to Kubernetes Networking](/guides/complete-guide-kubernetes-networking/)
- [Kubernetes Basics for Application Developers](/guides/kubernetes-basics-guide/)
- [Deploy Applications to Kubernetes with Helm Charts](/recipes/helm-chart-deployment/)

