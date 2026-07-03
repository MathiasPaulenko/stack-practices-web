---
contentType: guides
slug: kubernetes-advanced-guide
title: "Kubernetes Advanced — Beyond the Basics"
description: "An advanced guide to Kubernetes: operators, custom resources, admission controllers, multi-cluster management, and production hardening for experienced users."
metaDescription: "Advanced Kubernetes guide: operators, CRDs, admission webhooks, multi-cluster, security hardening. Go beyond basic deployments with production patterns."
difficulty: advanced
topics:
  - devops
  - infrastructure
tags:
  - kubernetes
  - operators
  - crd
  - admission-controller
  - multi-cluster
  - security-hardening
  - helm
  - guide
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/observability-guide
  - /guides/aws-basics-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Advanced Kubernetes guide: operators, CRDs, admission webhooks, multi-cluster, security hardening. Go beyond basic deployments with production patterns."
  keywords:
    - kubernetes
    - operators
    - crd
    - admission-controller
    - multi-cluster
    - security-hardening
    - helm
    - guide
---

## Overview

Kubernetes has become the standard platform for container orchestration, but mastering its advanced capabilities requires understanding its extensibility model, security model, and operational patterns. This guide covers operators, custom resources, admission controllers, multi-cluster management, and hardening practices for production environments.

## When to Use

- You are running stateful workloads in Kubernetes
- You need to enforce organizational policies on cluster resources
- You manage multiple clusters across regions or clouds
- You want to automate complex operational tasks

## Operators and Custom Resources

### Custom Resource Definitions (CRDs)

CRDs extend the Kubernetes API with domain-specific resources.

```yaml
# crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.mycompany.com
spec:
  group: mycompany.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engine:
                  type: string
                  enum: ["postgres", "mysql"]
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 5
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
```

### Writing an Operator

Operators reconcile the desired state (CRD spec) with the actual state (running resources).

```go
// Simplified reconciliation loop
func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var db myv1.Database
    if err := r.Get(ctx, req.NamespacedName, &db); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Create StatefulSet if it does not exist
    var sts appsv1.StatefulSet
    if err := r.Get(ctx, req.NamespacedName, &sts); errors.IsNotFound(err) {
        sts = r.buildStatefulSet(db)
        if err := r.Create(ctx, &sts); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Update StatefulSet replicas if needed
    if *sts.Spec.Replicas != db.Spec.Replicas {
        sts.Spec.Replicas = &db.Spec.Replicas
        if err := r.Update(ctx, &sts); err != nil {
            return ctrl.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}
```

Popular frameworks: Operator SDK, kubebuilder, kopf (Python).

## Admission Controllers

### Validating Webhooks

Reject resources that violate policies before they are persisted.

```go
func (v *Validator) Handle(ctx context.Context, req admission.Request) admission.Response {
    pod := &corev1.Pod{}
    if err := v.Decoder.Decode(req, pod); err != nil {
        return admission.Errored(http.StatusBadRequest, err)
    }

    // Reject pods without resource limits
    for _, container := range pod.Spec.Containers {
        if container.Resources.Limits == nil {
            return admission.Denied("All containers must specify resource limits")
        }
    }

    return admission.Allowed("")
}
```

### Mutating Webhooks

Modify resources before they are persisted (e.g., inject sidecars).

```go
func (m *Mutator) Handle(ctx context.Context, req admission.Request) admission.Response {
    pod := &corev1.Pod{}
    if err := m.Decoder.Decode(req, pod); err != nil {
        return admission.Errored(http.StatusBadRequest, err)
    }

    // Inject Istio sidecar
    pod.Spec.Containers = append(pod.Spec.Containers, corev1.Container{
        Name:  "istio-proxy",
        Image: "istio/proxyv2:1.20.0",
    })

    return admission.PatchResponseFromRaw(req.Object.Raw, pod)
}
```

## Multi-Cluster Management

### Cluster Federation

Deploy workloads across multiple clusters for high availability and geographic distribution.

```yaml
# FederatedDeployment
apiVersion: types.kubefed.io/v1beta1
kind: FederatedDeployment
metadata:
  name: frontend
spec:
  template:
    spec:
      replicas: 3
      selector:
        matchLabels:
          app: frontend
      template:
        spec:
          containers:
            - name: frontend
              image: myapp/frontend:v1
  overrides:
    - clusterName: cluster-asia
      clusterOverrides:
        - path: "/spec/replicas"
          value: 5
```

### Service Mesh for Multi-Cluster

Istio and Linkerd provide cross-cluster service discovery and mTLS.

```
┌─────────────────────┐         ┌─────────────────────┐
│   Cluster US        │◀───────▶│   Cluster EU        │
│  ┌───────────────┐  │   mTLS  │  ┌───────────────┐  │
│  │   Service A   │  │────────▶│  │   Service B   │  │
│  └───────────────┘  │         │  └───────────────┘  │
│         ▲           │         │         ▲           │
│    Istio Gateway    │         │    Istio Gateway    │
└─────────────────────┘         └─────────────────────┘
```

## Security Hardening

### Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myapp:v1
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      resources:
        limits:
          memory: "256Mi"
          cpu: "500m"
        requests:
          memory: "128Mi"
          cpu: "250m"
```

### Network Policies

Restrict pod-to-pod traffic to the minimum required.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 8080
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

### RBAC Least Privilege

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-manager-binding
subjects:
  - kind: ServiceAccount
    name: ci-cd
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

## Helm Advanced Patterns

### Library Charts

Reusable Helm templates shared across multiple charts.

```yaml
# Chart.yaml (library chart)
apiVersion: v2
name: common
description: Common Helm templates
type: library
version: 1.0.0
```

### Post-Renderers

Modify generated manifests before application (e.g., inject Kustomize patches).

```bash
helm install myapp ./chart --post-renderer ./kustomize.sh
```

## Common Mistakes

- **Running everything as root** — always set `runAsNonRoot: true`
- **No resource limits** — causes noisy neighbor problems and OOM kills
- **Using `latest` tag** — impossible to rollback; pin to digests or semantic versions
- **Ignoring network policies** — pods can talk to everything by default
- **No PodDisruptionBudgets** — rolling updates drain nodes and cause downtime
- **Storing secrets in ConfigMaps** — use external secret operators or sealed secrets

## FAQ

**Should I use Helm or plain YAML?**
Helm for reusable, templated applications. Plain YAML (with Kustomize) for simpler, environment-specific overlays. Many teams use both: Helm for shared services, Kustomize for application manifests.

**How do I debug admission webhooks?**
Check webhook service connectivity, TLS certificates, and API server logs. Use `kubectl describe` on rejected resources and review webhook pod logs.

**When should I use an operator?**
When you need to automate complex lifecycle management: backups, failover, upgrades, or scaling for stateful applications. For simple stateless apps, standard controllers are sufficient.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
