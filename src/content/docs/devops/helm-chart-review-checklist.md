---
contentType: docs
slug: helm-chart-review-checklist
title: "Helm Chart Review Checklist"
description: "A checklist for reviewing Helm charts covering values, templates, security, resource limits, probes, RBAC, and best practices."
metaDescription: "Use this Helm chart review checklist to verify values, templates, security, resource limits, probes, RBAC, and chart best practices."
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
  metaDescription: "Use this Helm chart review checklist to verify values, templates, security, resource limits, probes, RBAC, and chart best practices."
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

A Helm chart review checklist ensures charts are secure, maintainable, and follow Kubernetes best practices. It covers values schema, template correctness, security contexts, resource limits, health probes, RBAC, and chart metadata. Without a checklist, chart reviews are inconsistent and miss common issues.

## When to Use

- Reviewing a new Helm chart before publishing
- Auditing existing charts for security or compliance
- Onboarding third-party charts to a cluster
- Upgrading Helm charts to new Kubernetes versions
- Standardizing chart quality across teams

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
| Chart.yaml present and valid | ✅ | apiVersion: v2 |
| values.yaml present | ✅ | All defaults documented |
| templates/ directory exists | ✅ | 12 template files |
| _helpers.tpl present | ✅ | Named templates defined |
| .helmignore present | ✅ | Excludes .git, .vscode |
| README.md present | ✅ | Installation and configuration docs |
| values.schema.json present | ✅ | Type validation for all values |
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
| No secrets in values.yaml | ✅ | Secrets via --set or external secret store |
| All values have comments | ✅ | Every key documented |
| Sensible defaults | ✅ | Chart works with no overrides |
| No hardcoded environment values | ✅ | Environment-specific values overridden |
| Image tag uses appVersion | ✅ | `{{ .Chart.AppVersion }}` |
| Replica count defaults to > 1 | ✅ | Default: 3 |
| Resources have defaults | ✅ | requests and limits set |
| Service type is configurable | ✅ | Default: ClusterIP |

### values.schema.json Review

| Check | Status | Notes |
|-------|--------|-------|
| All values have type definitions | ✅ | String, integer, boolean, object |
| Required fields marked | ✅ | image.repository required |
| Enum values for restricted fields | ✅ | serviceType: [ClusterIP, NodePort, LoadBalancer] |
| Minimum/maximum for numeric fields | ✅ | replicas: min 1, max 100 |
| Pattern for string fields | ✅ | image.repository: non-empty string |
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
| No hardcoded namespaces | ✅ | Uses .Release.Namespace |
| Labels follow conventions | ✅ | app.kubernetes.io/* labels |
| Selectors match labels | ✅ | Consistent across deployments and services |
| Named templates for repeated blocks | ✅ | _helpers.tpl for labels, names |
| No trailing whitespace | ✅ | {{- }} and {{- -}} used |
| Include comments for complex logic | ✅ | Conditional blocks documented |
| No template errors on empty values | ✅ | Defaults via | default |
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
| service.yaml | Selector matches deployment labels | ✅ |
| ingress.yaml | Correct API version (networking.k8s.io/v1) | ✅ |
| ingress.yaml | Path type specified | ✅ |
| ingress.yaml | TLS configurable | ✅ |
| serviceaccount.yaml | Correct API version (v1) | ✅ |
| serviceaccount.yaml | Conditional creation | ✅ |
| configmap.yaml | Correct API version (v1) | ✅ |
| configmap.yaml | Data from values | ✅ |
| hpa.yaml | Correct API version (autoscaling/v2) | ✅ |
| hpa.yaml | Conditional on autoscaling.enabled | ✅ |
| pdb.yaml | Correct API version (policy/v1) | ✅ |
| pdb.yaml | Conditional on podDisruptionBudget.enabled | ✅ |
| NOTES.txt | Post-install instructions | ✅ |

## 4. Security Review

### Pod Security Context

| Check | Status | Notes |
|-------|--------|-------|
| runAsNonRoot: true | ✅ | Pod runs as non-root |
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
| runAsNonRoot: true (container-level) | ✅ | Redundant with pod-level |
| privileged: false | ✅ | Not running privileged |

### RBAC

| Check | Status | Notes |
|-------|--------|-------|
| Service account conditional | ✅ | serviceAccount.create flag |
| RBAC least privilege | ✅ | Only required resources |
| No cluster-admin role | ✅ | No cluster-wide permissions |
| Role binding to service account | ✅ | Namespace-scoped |
| Automount token configurable | ✅ | serviceAccount.automount flag |

### Image Security

| Check | Status | Notes |
|-------|--------|-------|
| Image digest pinned | ⚠️ | Uses tag, not digest |
| No :latest tag | ✅ | Uses appVersion |
| Pull policy: IfNotPresent | ✅ | Default pull policy |
| Private registry support | ✅ | imagePullSecrets configurable |
| Image scanned in CI | ✅ | Trivy scan in pipeline |

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
| Resources configurable via values | ✅ | resources in values.yaml |
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
| minAvailable or maxUnavailable set | ✅ | minAvailable: 1 |
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
| Probe configurable via values | ✅ | livenessProbe in values |

### Readiness Probe

| Check | Status | Notes |
|-------|--------|-------|
| Readiness probe defined | ✅ | HTTP GET /ready |
| initialDelaySeconds set | ✅ | 5 seconds |
| periodSeconds reasonable | ✅ | 5 seconds |
| timeoutSeconds set | ✅ | 3 seconds |
| failureThreshold reasonable | ✅ | 3 failures |
| Probe configurable via values | ✅ | readinessProbe in values |

### Startup Probe (if applicable)

| Check | Status | Notes |
|-------|--------|-------|
| Startup probe defined | ✅ | For slow-starting apps |
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
| Test connects to service | ✅ | curl to service endpoint |
| Test verifies health | ✅ | HTTP 200 from /health |
| Test runs via helm test | ✅ | Test pod uses helm.sh/hook: test |

### Linting

| Check | Status | Notes |
|-------|--------|-------|
| helm lint passes | ✅ | No warnings |
| kubeval passes | ✅ | Schema validation |
| kube-score passes | ✅ | Best practices check |
| yamllint passes | ✅ | YAML formatting |
```

## Explanation

A Helm chart review checklist ensures charts are production-ready. The review covers eight areas: structure, values, templates, security, resources, probes, deployment strategy, and testing. Each area has specific checks that catch common issues before they reach production.

Chart structure verifies that all required files exist and follow conventions. Chart.yaml must use apiVersion v2 (Helm 3), values.yaml must have sensible defaults, and values.schema.json must validate types. Missing files or invalid structure cause Helm commands to fail.

Values review checks that defaults are safe and no secrets are hardcoded. Secrets in values.yaml are a common security issue — they end up in version control. The chart should use external secret stores or --set for secrets. All values should have comments explaining their purpose.

Template review checks Kubernetes API versions, label consistency, and conditional rendering. Labels must follow the app.kubernetes.io/* convention for discoverability. Selectors must match labels across deployments and services. Trailing whitespace in templates causes rendering issues.

Security review is the most critical section. Pods must run as non-root with read-only filesystems and no privilege escalation. All Linux capabilities should be dropped. RBAC should follow least privilege — no cluster-admin roles. Images should not use :latest tags and should be scanned for vulnerabilities.

Resource management ensures pods have CPU and memory requests and limits. Without limits, a single pod can consume all cluster resources. The HPA should be configurable with sensible defaults. The PDB ensures availability during voluntary disruptions.

Health probes tell Kubernetes when a pod is alive and ready. Liveness probes detect deadlocks and trigger restarts. Readiness probes control traffic routing. Without probes, Kubernetes can't distinguish a healthy pod from a broken one.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Library chart | Focus on named templates | No resources rendered |
| Operator chart | Add CRD review | Custom resource definitions |
| StatefulSet chart | Add PVC and ordering checks | VolumeClaimTemplates, podManagementPolicy |
| Job/CronJob chart | Add restartPolicy and concurrency checks | BackoffLimit, concurrencyRule |
| Multi-tenant | Add namespace isolation checks | NetworkPolicies, PSPs |
| Air-gapped | Verify no external dependencies | All images in private registry |

## What Works

1. Use values.schema.json — catches type errors before deployment
2. Pin image digests, not just tags — tags can be mutated
3. Drop all capabilities, add back only needed ones — least privilege
4. Set resource requests and limits — prevent resource starvation
5. Define both liveness and readiness probes — Kubernetes needs both
6. Use helm lint and kube-score in CI — automate the checklist
7. Document every value in values.yaml — users need to know what each does

## Common Mistakes

1. Secrets in values.yaml — committed to version control
2. No resource limits — pods consume all cluster resources
3. No probes — Kubernetes can't detect unhealthy pods
4. Running as root — unnecessary privilege
5. No PDB — voluntary disruptions cause downtime
6. Using :latest tag — unpredictable deployments
7. No values.schema.json — type errors not caught until deployment

## Frequently Asked Questions

### Should we pin image digests instead of tags?

Yes, for production charts. Tags are mutable — the same tag can point to different images over time. Digests are immutable — the same digest always points to the same image. Pinning digests ensures reproducible deployments. The trade-off is that updating the image requires updating the chart, but this is desirable for production.

### How do we handle secrets in Helm charts?

Never put secrets in values.yaml. Use one of these approaches: (1) --set for individual secrets at deploy time, (2) External secret stores like HashiCorp Vault or AWS Secrets Manager with the External Secrets Operator, (3) Sealed Secrets for encrypting secrets in Git. All three keep secrets out of version control.

### What is the difference between helm lint and kube-score?

helm lint checks chart structure and template syntax — it catches Helm-specific issues like invalid Chart.yaml or template errors. kube-score checks the rendered Kubernetes manifests against best practices — it catches Kubernetes-specific issues like missing probes or resource limits. Use both: helm lint for chart quality, kube-score for manifest quality.

### Should we use Helm hooks for database migrations?

It depends. Helm hooks like post-install and post-upgrade can run migrations automatically. This is convenient but risky: if the migration fails, the release is in an inconsistent state. For critical databases, run migrations outside Helm as a separate step in the CI/CD pipeline. For simple migrations, Helm hooks are acceptable.

### How do we test Helm charts?

Three levels: (1) helm lint for syntax and structure, (2) helm template + kubeval for manifest validation, (3) helm test for runtime tests against a deployed chart. For CI, run helm lint and helm template on every PR. For staging, deploy the chart and run helm test. For production, use helm upgrade --dry-run to preview changes.
