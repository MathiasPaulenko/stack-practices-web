---
contentType: guides
slug: kubernetes-advanced-guide
title: "Kubernetes Avanzado — Más Allá de lo Básico"
description: "Guía avanzada de Kubernetes: operators, custom resources, admission controllers, multi-cluster management y hardening productivo para usuarios experimentados."
metaDescription: "Guía avanzada de Kubernetes: operators, CRDs, admission webhooks, multi-cluster, security hardening. Ve más allá de deployments básicos con patrones productivos."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - kubernetes
tags:
  - kubernetes
  - operators
  - crd
  - admission-controller
  - multi-cluster
  - security-hardening
  - helm
  - guia
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/observability-guide
  - /guides/aws-basics-guide
  - /recipes/devops/deploy-to-kubernetes
  - /recipes/infrastructure/helm-chart-template
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Guía avanzada de Kubernetes: operators, CRDs, admission webhooks, multi-cluster, security hardening. Ve más allá de deployments básicos con patrones productivos."
  keywords:
    - kubernetes
    - operators
    - crd
    - admission-controller
    - multi-cluster
    - security-hardening
    - helm
    - guia
---

## Overview

Kubernetes se ha convertido en la plataforma estándar para orquestación de containers, pero dominar sus features avanzadas requiere entender su modelo de extensibilidad, modelo de seguridad y patrones operacionales. Esta guía cubre operators, custom resources, admission controllers, gestión multi-cluster y prácticas de hardening para ambientes productivos.

## When to Use

- Estás ejecutando workloads stateful en Kubernetes
- Necesitas hacer cumplir políticas organizacionales sobre recursos de cluster
- Gestionas múltiples clusters a través de regiones o clouds
- Quieres automatizar tareas operacionales complejas

## Operators y Custom Resources

### Custom Resource Definitions (CRDs)

Los CRDs extienden la API de Kubernetes con recursos específicos de dominio.

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

### Escribir un Operator

Los operators reconcilian el estado deseado (spec del CRD) con el estado actual (recursos en ejecución).

```go
func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var db myv1.Database
    if err := r.Get(ctx, req.NamespacedName, &db); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    var sts appsv1.StatefulSet
    if err := r.Get(ctx, req.NamespacedName, &sts); errors.IsNotFound(err) {
        sts = r.buildStatefulSet(db)
        if err := r.Create(ctx, &sts); err != nil {
            return ctrl.Result{}, err
        }
    }

    if *sts.Spec.Replicas != db.Spec.Replicas {
        sts.Spec.Replicas = &db.Spec.Replicas
        if err := r.Update(ctx, &sts); err != nil {
            return ctrl.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}
```

Frameworks populares: Operator SDK, kubebuilder, kopf (Python).

## Admission Controllers

### Validating Webhooks

Rechazan recursos que violan políticas antes de ser persistidos.

```go
func (v *Validator) Handle(ctx context.Context, req admission.Request) admission.Response {
    pod := &corev1.Pod{}
    if err := v.Decoder.Decode(req, pod); err != nil {
        return admission.Errored(http.StatusBadRequest, err)
    }

    for _, container := range pod.Spec.Containers {
        if container.Resources.Limits == nil {
            return admission.Denied("Todos los containers deben especificar resource limits")
        }
    }

    return admission.Allowed("")
}
```

### Mutating Webhooks

Modifican recursos antes de ser persistidos (ej. inyectar sidecars).

```go
func (m *Mutator) Handle(ctx context.Context, req admission.Request) admission.Response {
    pod := &corev1.Pod{}
    if err := m.Decoder.Decode(req, pod); err != nil {
        return admission.Errored(http.StatusBadRequest, err)
    }

    pod.Spec.Containers = append(pod.Spec.Containers, corev1.Container{
        Name:  "istio-proxy",
        Image: "istio/proxyv2:1.20.0",
    })

    return admission.PatchResponseFromRaw(req.Object.Raw, pod)
}
```

## Gestión Multi-Cluster

### Federación de Clusters

Despliega workloads a través de múltiples clusters para alta disponibilidad y distribución geográfica.

```yaml
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

### Service Mesh para Multi-Cluster

Istio y Linkerd proveen service discovery cross-cluster y mTLS.

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

Restringe tráfico pod-a-pod al mínimo requerido.

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

## Patrones Avanzados de Helm

### Library Charts

Templates de Helm reutilizables compartidos entre múltiples charts.

```yaml
# Chart.yaml (library chart)
apiVersion: v2
name: common
description: Common Helm templates
type: library
version: 1.0.0
```

### Post-Renderers

Modifica manifests generados antes de aplicación (ej. inyectar patches de Kustomize).

```bash
helm install myapp ./chart --post-renderer ./kustomize.sh
```

## Errores Comunes

- **Ejecutar todo como root** — siempre configura `runAsNonRoot: true`
- **Sin resource limits** — causa problemas de noisy neighbor y OOM kills
- **Usar tag `latest`** — imposible hacer rollback; pin a digests o versiones semánticas
- **Ignorar network policies** — los pods pueden hablar con todo por defecto
- **Sin PodDisruptionBudgets** — rolling updates drenan nodos y causan downtime
- **Guardar secrets en ConfigMaps** — usa external secret operators o sealed secrets

## FAQ

**¿Debería usar Helm o YAML plano?**
Helm para aplicaciones reusable y templated. YAML plano (con Kustomize) para overlays más simples y específicas de ambiente. Muchos equipos usan ambos: Helm para shared services, Kustomize para application manifests.

**¿Cómo debuggeo admission webhooks?**
Verifica conectividad del servicio webhook, certificados TLS y logs del API server. Usa `kubectl describe` en recursos rechazados y revisa logs del pod webhook.

**¿Cuándo debería usar un operator?**
Cuando necesitas automatizar gestión compleja del lifecycle: backups, failover, upgrades o scaling para aplicaciones stateful. Para apps stateless simples, controladores estándar son suficientes.
