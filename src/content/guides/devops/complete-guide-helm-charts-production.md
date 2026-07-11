---
contentType: guides
slug: complete-guide-helm-charts-production
title: "Helm Charts: Structure, Templating, Dependencies, Registry"
description: "Master Helm charts for Kubernetes: chart structure, templating, values, dependencies, hooks, libraries, registry management, and production patterns for deployment."
metaDescription: "Master Helm charts for Kubernetes: chart structure, templating, values, dependencies, hooks, libraries, registry management, and production deployment patterns."
difficulty: advanced
topics:
  - devops
tags:
  - guide
  - helm
  - kubernetes
  - charts
  - templating
  - deployment
  - packaging
relatedResources:
  - /guides/devops/complete-guide-github-actions-ci-cd
  - /guides/devops/complete-guide-kubernetes-config-management
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master Helm charts for Kubernetes: chart structure, templating, values, dependencies, hooks, libraries, registry management, and production deployment patterns."
  keywords:
    - helm charts
    - kubernetes
    - chart structure
    - helm templating
    - helm dependencies
    - helm hooks
    - helm registry
---

## Introduction

Helm is the package manager for Kubernetes. You define applications as charts — collections of templated Kubernetes manifests with configurable values. Helm renders templates, manages releases, and handles upgrades and rollbacks. This guide walks through chart structure, templating, values, dependencies, hooks, library charts, registry management, and production patterns.

## Chart Structure

```
my-app/
├── Chart.yaml              # Chart metadata (name, version, dependencies)
├── values.yaml             # Default configuration values
├── values-prod.yaml        # Environment-specific overrides
├── charts/                 # Dependency charts (vendored)
├── templates/
│   ├── _helpers.tpl        # Named templates (reusable partials)
│   ├── deployment.yaml     # Kubernetes Deployment
│   ├── service.yaml        # Kubernetes Service
│   ├── ingress.yaml        # Kubernetes Ingress
│   ├── configmap.yaml      # ConfigMap for app config
│   ├── secret.yaml         # Secret (encoded values)
│   ├── hpa.yaml            # HorizontalPodAutoscaler
│   ├── pdb.yaml            # PodDisruptionBudget
│   ├── serviceaccount.yaml # ServiceAccount + RBAC
│   └── NOTES.txt           # Post-install instructions
├── templates/tests/
│   └── test-connection.yaml # Helm test pod
└── .helmignore             # Files to exclude from chart package
```

### Chart.yaml

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
description: A production web application chart
type: application
version: 1.2.3          # Chart version (SemVer)
appVersion: "2.1.0"     # Application version
icon: https://example.com/icon.png
home: https://github.com/example/my-app
sources:
  - https://github.com/example/my-app
maintainers:
  - name: DevOps Team
    email: devops@example.com
keywords:
  - web
  - api
  - microservice
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: "17.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

## Templating

### Helper templates

```yaml
# templates/_helpers.tpl — Reusable named templates
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "my-app.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{ include "my-app.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "my-app.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "my-app.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
```

### Deployment template

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "my-app.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
          {{- if .Values.probes.enabled }}
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          {{- end }}
          env:
            - name: APP_ENV
              value: {{ .Values.env | quote }}
            {{- range $key, $val := .Values.extraEnv }}
            - name: {{ $key }}
              value: {{ $val | quote }}
            {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.volumeMounts }}
          volumeMounts:
            {{- toYaml .Values.volumeMounts | nindent 12 }}
          {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

## Values

### Default values

```yaml
# values.yaml
replicaCount: 2

image:
  repository: registry.io/my-app
  tag: ""
  pullPolicy: IfNotPresent

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations: {}

podSecurityContext:
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1000

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

probes:
  enabled: true

env: production
extraEnv: {}

postgresql:
  enabled: true
  auth:
    postgresPassword: changeme
    database: myapp

redis:
  enabled: false
```

### Environment-specific overrides

```yaml
# values-prod.yaml
replicaCount: 3

image:
  tag: "2.1.0"
  pullPolicy: IfNotPresent

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  tls:
    - secretName: app-prod-tls
      hosts:
        - app.example.com

postgresql:
  primary:
    persistence:
      size: 50Gi
      storageClass: fast-ssd
```

## Dependencies

```bash
# Update dependencies (downloads to charts/)
helm dependency update my-app/

# Build dependencies (fails if lock file is stale)
helm dependency build my-app/

# List dependencies
helm dependency list my-app/
```

### Conditional dependencies

```yaml
# In values.yaml — control which dependencies are enabled
postgresql:
  enabled: true   # Include PostgreSQL subchart

redis:
  enabled: false   # Skip Redis subchart
```

### Cross-chart value overrides

```yaml
# Override subchart values from parent
postgresql:
  enabled: true
  auth:
    postgresPassword: "secure-password"
  primary:
    persistence:
      size: 20Gi
  image:
    tag: "15.4.0"
```

## Hooks

```yaml
# templates/hooks/post-install-job.yaml — Run after install
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-migrate
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "1"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    metadata:
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["npm", "run", "migrate"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "my-app.fullname" . }}-db
                  key: url
```

### Hook types

```
pre-install:    Before any resources are created
post-install:   After all resources are created
pre-delete:     Before any resources are deleted
post-delete:    After all resources are deleted
pre-upgrade:    Before any resources are updated
post-upgrade:   After all resources are updated
pre-rollback:   Before any resources are rolled back
post-rollback:  After all resources are rolled back
test:           When helm test is run
```

## Helm Commands

```bash
# Install a chart
helm install my-release my-app/ -f values-prod.yaml -n production

# Upgrade a release
helm upgrade my-release my-app/ -f values-prod.yaml -n production

# Upgrade with atomic rollback on failure
helm upgrade my-release my-app/ -f values-prod.yaml -n production --atomic --timeout 5m

# Dry run (render templates without applying)
helm install my-release my-app/ -f values-prod.yaml --dry-run --debug

# Template rendering only
helm template my-release my-app/ -f values-prod.yaml > rendered.yaml

# List releases
helm list -n production
helm list -A  # All namespaces

# Rollback to previous version
helm rollback my-release 3 -n production

# Uninstall
helm uninstall my-release -n production

# Package a chart
helm package my-app/ --version 1.2.3 --destination ./dist/

# Lint a chart
helm lint my-app/

# Run tests
helm test my-release -n production

# Pull from registry
helm pull oci://registry.io/charts/my-app --version 1.2.3

# Push to registry
helm push my-app-1.2.3.tgz oci://registry.io/charts/
```

## Library Charts

```yaml
# Chart.yaml for library chart
apiVersion: v2
name: common
type: library        # Library chart — not deployable
version: 1.0.0
description: Shared templates for application charts
```

```yaml
# templates/_deployment.tpl — Define reusable deployment template
{{- define "common.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}
  labels:
    app: {{ .Values.name }}
spec:
  replicas: {{ .Values.replicas | default 2 }}
  selector:
    matchLabels:
      app: {{ .Values.name }}
  template:
    metadata:
      labels:
        app: {{ .Values.name }}
    spec:
      containers:
        - name: {{ .Values.name }}
          image: {{ .Values.image }}
          ports:
            - containerPort: {{ .Values.port | default 8080 }}
{{- end -}}
```

```yaml
# In application chart — use library
# templates/deployment.yaml
{{ include "common.deployment" . }}
```

## Production Patterns

### Multi-environment values

```bash
# Directory structure
my-app/
├── values.yaml              # Base defaults
├── values-dev.yaml          # Dev overrides
├── values-staging.yaml      # Staging overrides
├── values-prod.yaml         # Production overrides

# Deploy to each environment
helm upgrade --install my-app my-app/ \
    -f values.yaml \
    -f values-prod.yaml \
    --namespace production \
    --create-namespace \
    --atomic \
    --timeout 10m
```

### Secret management with external secrets

```yaml
# templates/externalsecret.yaml — Use External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ include "my-app.fullname" . }}
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: {{ include "my-app.fullname" . }}-secret
    creationPolicy: Owner
  data:
    - secretKey: database-url
      remoteRef:
        key: production/database
        property: url
    - secretKey: api-key
      remoteRef:
        key: production/api
        property: key
```

### CI/CD with Helm

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: azure/setup-helm@v4

      - uses: azure/setup-kubectl@v4

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Helm dependency update
        run: helm dependency update my-app/

      - name: Helm upgrade
        run: |
          helm upgrade --install my-app my-app/ \
            -f my-app/values.yaml \
            -f my-app/values-prod.yaml \
            --namespace production \
            --create-namespace \
            --atomic \
            --timeout 10m \
            --set image.tag=${{ github.sha }}

      - name: Helm test
        run: helm test my-app -n production
```

## Best Practices

- Use `include` over `template` for named templates — `include` is flexible and composable
- Use `nindent` over `indent` — handles leading newlines correctly in YAML
- Set resource requests and limits on every container — prevents resource starvation
- Use `--atomic` flag on production deploys — auto-rollback on failure
- Use `--wait` flag — Helm waits for all resources to be ready before marking success
- Version your charts with SemVer — `chartVersion` and `appVersion` are separate
- Use library charts for shared templates — DRY across application charts
- Use External Secrets Operator for sensitive values — don't store secrets in values files
- Lint charts in CI — `helm lint` catches common issues before deployment
- Use `helm template` for debugging — render templates locally without applying
- Set pod disruption budgets — ensures minimum availability during node drains
- Use `helm.sh/hook-delete-policy: hook-succeeded` — clean up completed hook jobs

## Common Mistakes

- **Storing secrets in values.yaml**: secrets are base64-encoded in templates, not encrypted. Use External Secrets or Sealed Secrets.
- **Not using `--atomic` in production**: a failed upgrade leaves partial resources. `--atomic` rolls back automatically.
- **Hardcoding image tags**: use `{{ .Values.image.tag }}` so CI can set the tag per deployment.
- **No resource limits**: containers without limits can consume all node resources, causing evictions.
- **Not pinning dependency versions**: `12.x.x` allows minor updates which can break. Pin to exact versions for production.
- **Missing `helm lint` in CI**: template errors and invalid YAML are caught only at deploy time.

## FAQ

### What is a Helm chart?

A package of templated Kubernetes manifests. It includes a `Chart.yaml` with metadata, `values.yaml` with default configuration, and `templates/` with Kubernetes resources rendered from Go templates.

### What is the difference between `helm install` and `helm upgrade --install`?

`helm install` creates a new release. `helm upgrade --install` upgrades if the release exists, or installs if it doesn't. Use `upgrade --install` in CI/CD for idempotent deployments.

### What are Helm hooks?

Annotations that trigger Jobs or other resources at specific lifecycle points (pre-install, post-upgrade, etc.). Common uses: database migrations (post-install), cleanup jobs (pre-delete), smoke tests (test).

### What is a library chart?

A chart with `type: library` that defines reusable templates but is not deployable itself. Other charts include it as a dependency and call its templates with `include`. Useful for sharing common patterns across teams.

### How do I manage secrets in Helm?

Don't put secrets in `values.yaml`. Use External Secrets Operator to sync from Vault/AWS Secrets Manager, or use Sealed Secrets for GitOps workflows. Helm renders secrets as base64-encoded strings, which is not encryption.
