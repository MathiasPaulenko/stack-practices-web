---
contentType: docs
slug: helm-chart-review-checklist
title: "Checklist de Revisión de Helm Charts"
description: "Un checklist para revisar Helm charts cubriendo values, templates, security, resource limits, probes, RBAC y best practices."
metaDescription: "Usá este checklist de revisión de Helm charts para verificar values, templates, security, resource limits, probes, RBAC y best practices."
difficulty: intermediate
topics:
  - testing
tags:
  - devops
  - helm
  - kubernetes
  - review
  - checklist
  - deployment
  - infrastructure
relatedResources:
  - /docs/devops/ci-cd-pipeline-design-template
  - /docs/devops/kubernetes-pod-disruption-budget-template
  - /docs/devops/terraform-state-management-policy
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá este checklist de revisión de Helm charts para verificar values, templates, security, resource limits, probes, RBAC y best practices."
  keywords:
    - helm chart
    - chart review
    - kubernetes
    - helm
    - checklist
    - best practices
    - deployment
---

## Overview

Un Helm chart review checklist ensure que charts son secure, maintainable y follow Kubernetes best practices. Coverea values schema, template correctness, security contexts, resource limits, health probes, RBAC y chart metadata. Sin un checklist, chart reviews son inconsistent y missean common issues.

## When to Use

- Reviewéando un new Helm chart antes de publish
- Auditando existing charts para security o compliance
- Onboardéando third-party charts a un cluster
- Upgradeando Helm charts a new Kubernetes versions
- Estandarizando chart quality across teams

## Solution

```markdown
# Helm Chart Review — `<Chart Name>`

## Review Overview

| Field | Value |
|-------|-------|
| Chart Name | example-app |
| Chart Version | 1.3.0 |
| App Version | 2.1.0 |
| Reviewer | DevOps Team |
| Review Date | 2026-07-05 |
| Kubernetes Version | 1.29+ |
| Helm Version | 3.14+ |

## 1. Chart Structure

| Check | Status | Notes |
|-------|--------|-------|
| Chart.yaml present y valid | ✅ | apiVersion: v2 |
| values.yaml present | ✅ | All defaults documented |
| templates/ directory exists | ✅ | 12 template files |
| _helpers.tpl present | ✅ | Named templates defined |
| .helmignore present | ✅ | Excludes .git, .vscode |
| README.md present | ✅ | Installation y configuration docs |
| values.schema.json present | ✅ | Type validation para all values |
| LICENSE present | ✅ | Apache 2.0 |
| charts/ directory (if dependencies) | ✅ | No subchart dependencies |
| NOTES.txt present | ✅ | Post-install instructions |

### Chart.yaml Validation

| Field | Value | Check |
|-------|-------|-------|
| apiVersion | v2 | ✅ Helm 3 format |
| name | example-app | ✅ Lowercase, no spaces |
| version | 1.3.0 | ✅ Semantic versioning |
| appVersion | 2.1.0 | ✅ Application version |
| description | Example web application | ✅ Descriptive |
| type | application | ✅ Application chart |
| keywords | [web, app, frontend] | ✅ Searchable |
| maintainers | [{name: devops-team, email: devops@example.com}] | ✅ Contact info |
| icon | https://example.com/icon.png | ✅ Chart icon |

## 2. Values Schema

### values.yaml Review

| Check | Status | Notes |
|-------|--------|-------|
| No secrets en values.yaml | ✅ | Secrets via --set o external secret store |
| All values tienen comments | ✅ | Every key documented |
| Sensible defaults | ✅ | Chart funciona con no overrides |
| No hardcoded environment values | ✅ | Environment-specific values overridden |
| Image tag usa appVersion | ✅ | `{{ .Chart.AppVersion }}` |
| Replica count defaults a > 1 | ✅ | Default: 3 |
| Resources tienen defaults | ✅ | requests y limits set |
| Service type es configurable | ✅ | Default: ClusterIP |

### values.schema.json Review

| Check | Status | Notes |
|-------|--------|-------|
| All values tienen type definitions | ✅ | String, integer, boolean, object |
| Required fields marked | ✅ | image.repository required |
| Enum values para restricted fields | ✅ | serviceType: [ClusterIP, NodePort, LoadBalancer] |
| Minimum/maximum para numeric fields | ✅ | replicas: min 1, max 100 |
| Pattern para string fields | ✅ | image.repository: non-empty string |
| Additional properties disabled | ✅ | additionalProperties: false |

### Values Structure

```yaml
# values.yaml
replicaCount: 3

image:
  repository: ghcr.io/example/app
  pullPolicy: IfNotPresent
  tag: ""  # Overrides .Chart.AppVersion

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  automount: true
  annotations: {}
  name: ""

podAnnotations: {}
podLabels: {}

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
  fsGroup: 10001
  seccompProfile:
    type: RuntimeDefault

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls: []

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

autoscaling:
  enabled: false
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

volumes: []
volumeMounts: []

nodeSelector: {}
tolerations: []
affinity: {}

podDisruptionBudget:
  enabled: false
  minAvailable: 1
```

## 3. Template Review

### Template Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded namespaces | ✅ | Usa .Release.Namespace |
| Labels follow conventions | ✅ | app.kubernetes.io/* labels |
| Selectors matchean labels | ✅ | Consistent across deployments y services |
| Named templates para repeated blocks | ✅ | _helpers.tpl para labels, names |
| No trailing whitespace | ✅ | {{- }} y {{- -}} used |
| Include comments para complex logic | ✅ | Conditional blocks documented |
| No template errors en empty values | ✅ | Defaults via | default |
| Helm hooks used correctly | ✅ | post-install, pre-delete hooks |

### Labels Checklist

| Label | Present | Value |
|-------|---------|-------|
| app.kubernetes.io/name | ✅ | {{ include "chart.name" . }} |
| app.kubernetes.io/instance | ✅ | {{ .Release.Name }} |
| app.kubernetes.io/version | ✅ | {{ .Chart.AppVersion \| quote }} |
| app.kubernetes.io/managed-by | ✅ | {{ .Release.Service }} |
| app.kubernetes.io/component | ✅ | frontend |
| app.kubernetes.io/part-of | ✅ | example-app |

### Template Files

| File | Check | Status |
|------|-------|--------|
| deployment.yaml | Correct API version (apps/v1) | ✅ |
| deployment.yaml | Strategy configurable | ✅ |
| deployment.yaml | Image pull policy configurable | ✅ |
| service.yaml | Correct API version (v1) | ✅ |
| service.yaml | Port configurable | ✅ |
| service.yaml | Selector matchea deployment labels | ✅ |
| ingress.yaml | Correct API version (networking.k8s.io/v1) | ✅ |
| ingress.yaml | Path type specified | ✅ |
| ingress.yaml | TLS configurable | ✅ |
| serviceaccount.yaml | Correct API version (v1) | ✅ |
| serviceaccount.yaml | Conditional creation | ✅ |
| configmap.yaml | Correct API version (v1) | ✅ |
| configmap.yaml | Data desde values | ✅ |
| hpa.yaml | Correct API version (autoscaling/v2) | ✅ |
| hpa.yaml | Conditional en autoscaling.enabled | ✅ |
| pdb.yaml | Correct API version (policy/v1) | ✅ |
| pdb.yaml | Conditional en podDisruptionBudget.enabled | ✅ |
| NOTES.txt | Post-install instructions | ✅ |

## 4. Security Review

### Pod Security Context

| Check | Status | Notes |
|-------|--------|-------|
| runAsNonRoot: true | ✅ | Pod corre como non-root |
| runAsUser: non-zero UID | ✅ | UID 10001 |
| runAsGroup: non-zero GID | ✅ | GID 10001 |
| fsGroup: non-zero | ✅ | GID 10001 |
| seccompProfile: RuntimeDefault | ✅ | Seccomp enabled |

### Container Security Context

| Check | Status | Notes |
|-------|--------|-------|
| allowPrivilegeEscalation: false | ✅ | No privilege escalation |
| readOnlyRootFilesystem: true | ✅ | Read-only filesystem |
| capabilities.drop: [ALL] | ✅ | All Linux capabilities dropped |
| runAsNonRoot: true (container-level) | ✅ | Redundant con pod-level |
| privileged: false | ✅ | Not running privileged |

### RBAC

| Check | Status | Notes |
|-------|--------|-------|
| Service account conditional | ✅ | serviceAccount.create flag |
| RBAC least privilege | ✅ | Only required resources |
| No cluster-admin role | ✅ | No cluster-wide permissions |
| Role binding a service account | ✅ | Namespace-scoped |
| Automount token configurable | ✅ | serviceAccount.automount flag |

### Image Security

| Check | Status | Notes |
|-------|--------|-------|
| Image digest pinned | ⚠️ | Usa tag, no digest |
| No :latest tag | ✅ | Usa appVersion |
| Pull policy: IfNotPresent | ✅ | Default pull policy |
| Private registry support | ✅ | imagePullSecrets configurable |
| Image scanned en CI | ✅ | Trivy scan en pipeline |

## 5. Resource Management

### Resource Limits

| Check | Status | Notes |
|-------|--------|-------|
| CPU request set | ✅ | 100m |
| CPU limit set | ✅ | 500m |
| Memory request set | ✅ | 128Mi |
| Memory limit set | ✅ | 512Mi |
| Memory request < limit | ✅ | 128Mi < 512Mi |
| CPU request < limit | ✅ | 100m < 500m |
| Resources configurable via values | ✅ | resources en values.yaml |
| QoS class: Burstable | ✅ | Requests < limits |

### Horizontal Pod Autoscaler

| Check | Status | Notes |
|-------|--------|-------|
| HPA conditional | ✅ | autoscaling.enabled flag |
| Min replicas >= 2 | ✅ | minReplicas: 3 |
| Max replicas reasonable | ✅ | maxReplicas: 10 |
| CPU target < 90% | ✅ | 80% |
| Memory target < 90% | ✅ | 80% |
| HPA API version: autoscaling/v2 | ✅ | Current API |

### Pod Disruption Budget

| Check | Status | Notes |
|-------|--------|-------|
| PDB conditional | ✅ | podDisruptionBudget.enabled flag |
| minAvailable o maxUnavailable set | ✅ | minAvailable: 1 |
| PDB API version: policy/v1 | ✅ | Current API |

## 6. Health Probes

### Liveness Probe

| Check | Status | Notes |
|-------|--------|-------|
| Liveness probe defined | ✅ | HTTP GET /health |
| initialDelaySeconds set | ✅ | 30 seconds |
| periodSeconds reasonable | ✅ | 10 seconds |
| timeoutSeconds set | ✅ | 5 seconds |
| failureThreshold reasonable | ✅ | 3 failures |
| Probe configurable via values | ✅ | livenessProbe en values |

### Readiness Probe

| Check | Status | Notes |
|-------|--------|-------|
| Readiness probe defined | ✅ | HTTP GET /ready |
| initialDelaySeconds set | ✅ | 5 seconds |
| periodSeconds reasonable | ✅ | 5 seconds |
| timeoutSeconds set | ✅ | 3 seconds |
| failureThreshold reasonable | ✅ | 3 failures |
| Probe configurable via values | ✅ | readinessProbe en values |

### Startup Probe (if applicable)

| Check | Status | Notes |
|-------|--------|-------|
| Startup probe defined | ✅ | Para slow-starting apps |
| failureThreshold high enough | ✅ | 30 failures |
| periodSeconds: 10 | ✅ | 5 min startup window |

## 7. Deployment Strategy

| Check | Status | Notes |
|-------|--------|-------|
| Strategy configurable | ✅ | RollingUpdate default |
| Max unavailable set | ✅ | 25% |
| Max surge set | ✅ | 25% |
| Revision history limit | ✅ | 10 |
| Progress deadline seconds | ✅ | 600 |

## 8. Testing

### Helm Tests

| Check | Status | Notes |
|-------|--------|-------|
| tests/ directory present | ✅ | Helm test templates |
| Test connects a service | ✅ | curl a service endpoint |
| Test verifies health | ✅ | HTTP 200 desde /health |
| Test corre via helm test | ✅ | Test pod usa helm.sh/hook: test |

### Linting

| Check | Status | Notes |
|-------|--------|-------|
| helm lint passes | ✅ | No warnings |
| kubeval passes | ✅ | Schema validation |
| kube-score passes | ✅ | Best practices check |
| yamllint passes | ✅ | YAML formatting |
```

## Explanation

Un Helm chart review checklist ensure que charts son production-ready. El review coverea eight areas: structure, values, templates, security, resources, probes, deployment strategy y testing. Cada area tiene specific checks que catchean common issues antes de que lleguen a production.

Chart structure verify que all required files existen y follow conventions. Chart.yaml debe usar apiVersion v2 (Helm 3), values.yaml debe tener sensible defaults y values.schema.json debe validate types. Missing files o invalid structure causan Helm commands a fail.

Values review checkea que defaults son safe y no secrets están hardcoded. Secrets en values.yaml son un common security issue — terminan en version control. El chart debería usar external secret stores o --set para secrets. All values deberían tener comments explainando su purpose.

Template review checkea Kubernetes API versions, label consistency y conditional rendering. Labels deben follow el app.kubernetes.io/* convention para discoverability. Selectors deben matchear labels across deployments y services. Trailing whitespace en templates causa rendering issues.

Security review es el most critical section. Pods deben correr como non-root con read-only filesystems y no privilege escalation. All Linux capabilities se deberían drop. RBAC debería follow least privilege — no cluster-admin roles. Images no deberían usar :latest tags y deberían scanneearse para vulnerabilities.

Resource management ensure que pods tienen CPU y memory requests y limits. Sin limits, un single pod puede consume all cluster resources. El HPA debería ser configurable con sensible defaults. El PDB ensure availability durante voluntary disruptions.

Health probes le dicen a Kubernetes cuándo un pod está alive y ready. Liveness probes detectan deadlocks y triggerean restarts. Readiness probes controlan traffic routing. Sin probes, Kubernetes no puede distinguish un healthy pod de un broken one.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Library chart | Focus en named templates | No resources rendered |
| Operator chart | Addeá CRD review | Custom resource definitions |
| StatefulSet chart | Addeá PVC y ordering checks | VolumeClaimTemplates, podManagementPolicy |
| Job/CronJob chart | Addeá restartPolicy y concurrency checks | BackoffLimit, concurrencyRule |
| Multi-tenant | Addeá namespace isolation checks | NetworkPolicies, PSPs |
| Air-gapped | Verify no external dependencies | All images en private registry |

## What Works

1. Usá values.schema.json — catchea type errors antes de deployment
2. Pineá image digests, no solo tags — tags pueden mutarse
3. Dropé all capabilities, add back solo las needed — least privilege
4. Seteá resource requests y limits — prevení resource starvation
5. Definí both liveness y readiness probes — Kubernetes necesita both
6. Usá helm lint y kube-score en CI — automatizá el checklist
7. Documentá every value en values.yaml — users necesitan saber qué hace cada uno

## Common Mistakes

1. Secrets en values.yaml — committed a version control
2. No resource limits — pods consumen all cluster resources
3. No probes — Kubernetes no puede detectar unhealthy pods
4. Running como root — unnecessary privilege
5. No PDB — voluntary disruptions causan downtime
6. Usando :latest tag — unpredictable deployments
7. No values.schema.json — type errors no se catchean hasta deployment

## Frequently Asked Questions

### ¿Deberíamos pinear image digests en vez de tags?

Sí, para production charts. Tags son mutable — el same tag puede pointear a different images over time. Digests son immutable — el same digest siempre pointea a la same image. Pinear digests ensure reproducible deployments. El trade-off es que updatear el image require updatear el chart, pero esto es desirable para production.

### ¿Cómo handleamos secrets en Helm charts?

Nunca pongas secrets en values.yaml. Usá uno de estos approaches: (1) --set para individual secrets at deploy time, (2) External secret stores como HashiCorp Vault o AWS Secrets Manager con External Secrets Operator, (3) Sealed Secrets para encrypt secrets en Git. Los tres keep secrets out de version control.

### ¿Cuál es la difference entre helm lint y kube-score?

helm lint checkea chart structure y template syntax — catchea Helm-specific issues como invalid Chart.yaml o template errors. kube-score checkea los rendered Kubernetes manifests against best practices — catchea Kubernetes-specific issues como missing probes o resource limits. Usá both: helm lint para chart quality, kube-score para manifest quality.

### ¿Deberíamos usar Helm hooks para database migrations?

Depende. Helm hooks como post-install y post-upgrade pueden correr migrations automáticamente. Esto es convenient pero risky: si el migration faila, el release está en un inconsistent state. Para critical databases, corré migrations fuera de Helm como un separate step en el CI/CD pipeline. Para simple migrations, Helm hooks son acceptable.

### ¿Cómo testeamos Helm charts?

Three levels: (1) helm lint para syntax y structure, (2) helm template + kubeval para manifest validation, (3) helm test para runtime tests contra un deployed chart. Para CI, corré helm lint y helm template en every PR. Para staging, deployeá el chart y corré helm test. Para production, usá helm upgrade --dry-run para preview changes.
