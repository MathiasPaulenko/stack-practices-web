---



contentType: recipes
slug: kubernetes-helm-chart-templating
title: "Package Kubernetes Manifests with Helm Charts"
description: "How to create, template, and deploy Kubernetes applications using Helm charts, covering values, conditionals, ranges, hooks, subcharts, and library charts."
metaDescription: "Package Kubernetes manifests with Helm charts. Template with values, conditionals, ranges, hooks, subcharts, and library charts for reusable K8s deployments."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - kubernetes
  - helm
  - templating
  - packaging
  - recipe
relatedResources:
  - /recipes/kubernetes-configmap-secret-mounting
  - /recipes/docker-multi-stage-build-distroless
  - /recipes/terraform-remote-state-s3-backend
  - /recipes/terraform-workspace-environment-isolation
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Package Kubernetes manifests with Helm charts. Template with values, conditionals, ranges, hooks, subcharts, and library charts for reusable K8s deployments."
  keywords:
    - devops
    - kubernetes
    - helm
    - templating
    - packaging
    - recipe



---

## Overview

Helm is the package manager for Kubernetes. A Helm chart is a collection of templated Kubernetes manifests that can be customized with a `values.yaml` file. Instead of writing separate YAML files for each environment, you write one chart and override values per environment. Helm renders the templates, applies them to the cluster, and tracks releases for upgrades and rollbacks.

## When to Use

- Deploying the same app to multiple environments (dev, staging, production)
- Sharing reusable Kubernetes deployments across teams
- Managing application lifecycle (install, upgrade, rollback)
- When you need parameterized manifests (different replicas, images, resources per env)
- Installing third-party tools (Prometheus, Grafana, ingress controllers)

## When NOT to Use

- Single environment with static manifests — plain `kubectl apply` is simpler
- When you need GitOps — use ArgoCD or Flux (they can consume Helm charts)
- When manifests change rarely and don't need parameterization
- When Helm's templating is too limited — Kustomize may be better for overlays

## Solution

### Chart structure

```text
my-chart/
├── Chart.yaml          # Chart metadata
├── values.yaml         # Default values
├── values/
│   ├── staging.yaml    # Environment overrides
│   └── production.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── ingress.yaml
│   ├── _helpers.tpl    # Named templates
│   └── NOTES.txt       # Post-install notes
└── charts/             # Subchart dependencies
```

### Chart.yaml

```yaml
apiVersion: v2
name: my-app
description: A Helm chart for my application
type: application
version: 1.0.0          # Chart version
appVersion: "2.5.0"     # App version
keywords:
  - web
  - api
maintainers:
  - name: Mathias Paulenko
    email: mathias@example.com
dependencies:
  - name: postgresql
    version: 12.x.x
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```

### values.yaml

```yaml
replicaCount: 2

image:
  repository: my-app
  tag: "2.5.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

ingress:
  enabled: false
  className: nginx
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix

config:
  LOG_LEVEL: info
  DATABASE_URL: ""

postgresql:
  enabled: false
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
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            - name: LOG_LEVEL
              value: {{ .Values.config.LOG_LEVEL | quote }}
            - name: DATABASE_URL
              value: {{ .Values.config.DATABASE_URL | quote }}
```

### Helper templates

```yaml
# templates/_helpers.tpl
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.fullname" -}}
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

{{- define "my-app.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{ include "my-app.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### Conditional blocks

```yaml
# templates/ingress.yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "my-app.fullname" . }}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- with .Values.ingress.tls }}
  tls:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "my-app.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

### Range over values

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "my-app.fullname" . }}
data:
  {{- range $key, $value := .Values.config }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
```

### Environment-specific values

```yaml
# values/production.yaml
replicaCount: 5

image:
  tag: "2.5.0-prod"

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: my-app.production.com
      paths:
        - path: /
          pathType: Prefix

config:
  LOG_LEVEL: warn
  DATABASE_URL: "postgres://prod-db:5432/myapp"
```

### Helm hooks

```yaml
# templates/post-install-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-post-install
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "1"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["./migrate", "up"]
          env:
            - name: DATABASE_URL
              value: {{ .Values.config.DATABASE_URL | quote }}
```

### Installing and upgrading

```bash
# Install with default values
helm install my-app ./my-chart

# Install with custom values
helm install my-app ./my-chart -f values/production.yaml

# Install with inline overrides
helm install my-app ./my-chart --set replicaCount=5 --set image.tag=2.5.0

# Upgrade
helm upgrade my-app ./my-chart -f values/production.yaml

# Rollback
helm rollback my-app 1

# Uninstall
helm uninstall my-app

# Template (dry-run, render manifests)
helm template my-app ./my-chart -f values/production.yaml > manifests.yaml

# Lint
helm lint ./my-chart
```

## Variants

### Using subcharts

```yaml
# Chart.yaml
dependencies:
  - name: redis
    version: 17.x.x
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

```yaml
# values.yaml — configure subchart
redis:
  enabled: true
  auth:
    password: "my-redis-password"
  architecture: standalone
```

### Library chart (reusable blocks)

```yaml
# Chart.yaml
apiVersion: v2
name: common
type: library          # Library chart — not deployable
version: 1.0.0
```

```yaml
# templates/_container.tpl
{{- define "common.container" -}}
- name: {{ .name }}
  image: {{ .image }}
  ports:
    - containerPort: {{ .port }}
  resources:
    {{- toYaml .resources | nindent 4 }}
{{- end }}
```

```yaml
# In another chart's template
{{- include "common.container" (dict "name" "api" "image" "my-api:1.0" "port" 8080 "resources" .Values.resources) | nindent 8 }}
```

### Helm with sealed secrets

```yaml
# templates/sealedsecret.yaml
{{- if .Values.sealedSecret.enabled }}
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: {{ include "my-app.fullname" . }}
spec:
  encryptedData:
    database-password: {{ .Values.sealedSecret.encryptedPassword | quote }}
  template:
    metadata:
      name: {{ include "my-app.fullname" . }}
    type: Opaque
{{- end }}
```

## Best Practices


- For a deeper guide, see [Helm Charts: Structure, Templating, Dependencies, Registry](/guides/complete-guide-helm-charts-production/).

- Use `include` over `template` — `include` allows chaining with `nindent`
- Always use `nindent` not `indent` — handles the leading newline correctly
- Set resource requests and limits — prevents resource starvation in the cluster
- Use `{{ .Values.xxx | quote }}` for string values — prevents YAML parsing issues
- Keep `values.yaml` minimal — put environment-specific values in separate files
- Use `helm lint` before deploying — catches template errors early
- Use `helm template` for dry runs — renders manifests without applying
- Pin subchart versions — avoid unexpected changes from upstream charts

## Common Mistakes

- **Forgetting `nindent` vs `indent`**: `indent` doesn't add a leading newline. `nindent` does. Most of the time you want `nindent`.
- **Not quoting values**: YAML interprets `yes`/`no`/`on`/`off` as booleans. Use `quote` to force strings.
- **Hardcoding values in templates**: defeats the purpose of Helm. Move everything to `values.yaml`.
- **Not using `helm lint`**: template errors only show at install time. Lint catches them early.
- **Overwriting all values with `--set`**: hard to debug. Use `-f values/production.yaml` for complex overrides.

## FAQ

### What is a Helm chart?

A collection of templated Kubernetes manifests packaged together. You customize them with a `values.yaml` file and deploy with `helm install`. Helm tracks releases for upgrades and rollbacks.

### How is Helm different from Kustomize?

Helm uses Go templates for parameterization. Kustomize uses overlays (base + patches) without templating. Helm is better for sharing reusable charts; Kustomize is better for environment-specific overlays.

### What is a Helm hook?

A way to run jobs at specific points in the release lifecycle (pre-install, post-install, pre-upgrade, etc.). Annotated with `helm.sh/hook` in the manifest metadata.

### Can I use Helm with ArgoCD or Flux?

Yes. Both GitOps tools support Helm charts. ArgoCD can deploy Helm charts directly; Flux has a HelmRelease CRD.

### How do I debug a template?

Use `helm template my-app ./my-chart -f values.yaml` to render manifests locally. Use `helm install --dry-run --debug` to see what would be applied without actually installing.
