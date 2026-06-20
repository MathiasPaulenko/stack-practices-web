---
contentType: recipes
slug: helm-chart-deployment
title: "Deploy Applications to Kubernetes with Helm Charts"
description: "Package, version, and deploy Kubernetes applications using Helm charts with value overrides, template functions, and release management for reproducible infrastructure"
metaDescription: "Deploy applications to Kubernetes with Helm charts. Package, version, and manage releases with value overrides, template functions, and reproducible infrastructure."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - kubernetes
  - devops
  - infrastructure
relatedResources:
  - /recipes/devops/docker-compose-local-dev
  - /patterns/design/ambassador-pattern-services
  - /guides/devops/kubernetes-basics-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Deploy applications to Kubernetes with Helm charts. Package, version, and manage releases with value overrides, template functions, and reproducible infrastructure."
  keywords:
    - helm charts
    - kubernetes deployment
    - package management
    - infrastructure as code
    - release management
---

# Deploy Applications to Kubernetes with Helm Charts

Package and deploy applications to Kubernetes using Helm, the package manager for K8s. This recipe covers chart structure, templating with values, release upgrades and rollbacks, and dependency management for production-grade deployments.

## When to Use This

- You deploy the same application to multiple environments with different configurations. See [Environment Variables](/recipes/devops/environment-variables) for per-environment config.
- Kubernetes manifests become repetitive and hard to maintain across teams. See [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) for local multi-service templates.
- You need versioned releases with easy rollback capabilities. See [Blue-Green Deployment](/recipes/devops/blue-green-deployment) for instant rollback.

## Solution

### 1. Chart Structure

```
myapp/
  Chart.yaml          # Chart metadata
  values.yaml         # Default configuration values
  values.prod.yaml    # Production overrides
  templates/
    _helpers.tpl      # Named template helpers
    deployment.yaml
    service.yaml
    ingress.yaml
    configmap.yaml
  charts/             # Subchart dependencies
```

### 2. Chart Metadata

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
description: A Helm chart for MyApp
type: application
version: 1.2.0
appVersion: "2.5.1"
dependencies:
  - name: postgresql
    version: 12.x.x
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```

### 3. Template with Values

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          env:
            - name: DATABASE_URL
              value: {{ .Values.database.url | quote }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

### 4. Default and Override Values

```yaml
# values.yaml
replicaCount: 2

image:
  repository: myregistry/myapp
  tag: ""
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: false

database:
  url: "postgres://localhost:5432/myapp"

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

```yaml
# values.prod.yaml
replicaCount: 5

ingress:
  enabled: true
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
```

### 5. Install and Upgrade

```bash
# Install with default values
helm install myapp ./myapp

# Install with production overrides
helm install myapp ./myapp -f values.prod.yaml

# Upgrade existing release
helm upgrade myapp ./myapp -f values.prod.yaml

# Rollback to previous revision
helm rollback myapp 2

# List release history
helm history myapp
```

### 6. Named Template Helpers

```yaml
# templates/_helpers.tpl
{{/* Expand the name of the chart */}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Create a default fully qualified app name */}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}
```

## How It Works

- **Charts** package Kubernetes manifests into versioned, configurable units
- **Templates** use Go templating to inject values into YAML resources
- **Values** files provide environment-specific configuration overrides
- **Releases** track deployed chart versions for easy rollback

## Production Considerations

- Store charts in a registry (Harbor, OCI registry) rather than local files
- Use `helm lint` and `helm template` to validate before deploying
- Pin dependency versions explicitly to prevent unexpected upgrades

## Common Mistakes

- Hardcoding environment values in templates instead of values files
- Forgetting to update `Chart.version` when making changes
- Not testing `helm upgrade` before applying to production

## FAQ

**Q: How is this different from Kustomize?**
A: Helm uses templating and packaging for reusable charts. Kustomize uses overlays and patches without templating. Helm is better for distributing complex applications; Kustomize is simpler for internal overlays.

**Q: Can I use Helm with CI/CD?**
A: Yes. Use `helm upgrade --install` for idempotent deployments in pipelines. Combine with `helm diff` to preview changes before applying.
