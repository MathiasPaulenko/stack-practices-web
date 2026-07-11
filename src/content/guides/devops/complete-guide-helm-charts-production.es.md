---
contentType: guides
slug: complete-guide-helm-charts-production
title: "Guía Completa de Helm Charts: Estructura, Templating, Dependencias, Registry"
description: "Dominá Helm charts para Kubernetes: estructura de charts, templating, values, dependencias, hooks, library charts, registry management y patrones de producción."
metaDescription: "Dominá Helm charts para Kubernetes: estructura, templating, values, dependencias, hooks, library charts, registry y patrones de despliegue en producción."
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
  metaDescription: "Dominá Helm charts para Kubernetes: estructura, templating, values, dependencias, hooks, library charts, registry y patrones de despliegue en producción."
  keywords:
    - helm charts
    - kubernetes
    - chart structure
    - helm templating
    - helm dependencies
    - helm hooks
    - helm registry
---

## Introducción

Helm es el package manager para Kubernetes. Definís applications como charts — collections de templated Kubernetes manifests con configurable values. Helm renderéa templates, maneja releases y handlea upgrades y rollbacks. A continuación: chart structure, templating, values, dependencies, hooks, library charts, registry management y production patterns.

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
│   ├── configmap.yaml      # ConfigMap para app config
│   ├── secret.yaml         # Secret (encoded values)
│   ├── hpa.yaml            # HorizontalPodAutoscaler
│   ├── pdb.yaml            # PodDisruptionBudget
│   ├── serviceaccount.yaml # ServiceAccount + RBAC
│   └── NOTES.txt           # Post-install instructions
├── templates/tests/
│   └── test-connection.yaml # Helm test pod
└── .helmignore             # Files para excluir del chart package
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
# Update dependencies (downloads a charts/)
helm dependency update my-app/

# Build dependencies (fails si lock file está stale)
helm dependency build my-app/

# List dependencies
helm dependency list my-app/
```

### Conditional dependencies

```yaml
# En values.yaml — controlá cuáles dependencies están enabled
postgresql:
  enabled: true   # Incluí PostgreSQL subchart

redis:
  enabled: false   # Skipéa Redis subchart
```

### Cross-chart value overrides

```yaml
# Overrideá subchart values desde parent
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
# templates/hooks/post-install-job.yaml — Runéa después de install
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
pre-install:    Antes de que cualquier resource sea created
post-install:   Después de que all resources sean created
pre-delete:     Antes de que cualquier resource sea deleted
post-delete:    Después de que all resources sean deleted
pre-upgrade:    Antes de que cualquier resource sea updated
post-upgrade:   Después de que all resources sean updated
pre-rollback:   Antes de que cualquier resource sea rolled back
post-rollback:  Después de que all resources sean rolled back
test:           Cuando helm test runnea
```

## Helm Commands

```bash
# Installéa un chart
helm install my-release my-app/ -f values-prod.yaml -n production

# Upgradeéa un release
helm upgrade my-release my-app/ -f values-prod.yaml -n production

# Upgradeéa con atomic rollback on failure
helm upgrade my-release my-app/ -f values-prod.yaml -n production --atomic --timeout 5m

# Dry run (renderéa templates sin applying)
helm install my-release my-app/ -f values-prod.yaml --dry-run --debug

# Template rendering only
helm template my-release my-app/ -f values-prod.yaml > rendered.yaml

# Listéa releases
helm list -n production
helm list -A  # All namespaces

# Rollbackéa a previous version
helm rollback my-release 3 -n production

# Uninstalléa
helm uninstall my-release -n production

# Packageéa un chart
helm package my-app/ --version 1.2.3 --destination ./dist/

# Linteá un chart
helm lint my-app/

# Runéa tests
helm test my-release -n production

# Pulléa from registry
helm pull oci://registry.io/charts/my-app --version 1.2.3

# Pusheá a registry
helm push my-app-1.2.3.tgz oci://registry.io/charts/
```

## Library Charts

```yaml
# Chart.yaml para library chart
apiVersion: v2
name: common
type: library        # Library chart — not deployable
version: 1.0.0
description: Shared templates para application charts
```

```yaml
# templates/_deployment.tpl — Definí reusable deployment template
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
# En application chart — usá library
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

# Deployéa a cada environment
helm upgrade --install my-app my-app/ \
    -f values.yaml \
    -f values-prod.yaml \
    --namespace production \
    --create-namespace \
    --atomic \
    --timeout 10m
```

### Secret management con external secrets

```yaml
# templates/externalsecret.yaml — Usá External Secrets Operator
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

### CI/CD con Helm

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

- Usá `include` over `template` para named templates — `include` es flexible y composable
- Usá `nindent` over `indent` — handlea leading newlines correctamente en YAML
- Seteá resource requests y limits en every container — preventí resource starvation
- Usá `--atomic` flag en production deploys — auto-rollback on failure
- Usá `--wait` flag — Helm waitéa que all resources estén ready antes de marking success
- Versioná tus charts con SemVer — `chartVersion` y `appVersion` son separate
- Usá library charts para shared templates — DRY across application charts
- Usá External Secrets Operator para sensitive values — no storees secrets en values files
- Linteá charts en CI — `helm lint` catchea common issues antes de deployment
- Usá `helm template` para debugging — renderéa templates locally sin applying
- Seteá pod disruption budgets — ensureá minimum availability durante node drains
- Usá `helm.sh/hook-delete-policy: hook-succeeded` — cleanupéa completed hook jobs

## Common Mistakes

- **Storear secrets en values.yaml**: secrets son base64-encoded en templates, no encrypted. Usá External Secrets o Sealed Secrets.
- **No usar `--atomic` en production**: un failed upgrade deja partial resources. `--atomic` rolléa back automáticamente.
- **Hardcoding image tags**: usá `{{ .Values.image.tag }}` para que CI pueda setear el tag per deployment.
- **No resource limits**: containers sin limits pueden consume all node resources, causando evictions.
- **No pinning dependency versions**: `12.x.x` permite minor updates que pueden break. Pinneá a exact versions para production.
- **Missing `helm lint` en CI**: template errors e invalid YAML son caught solo a deploy time.

## FAQ

### ¿Qué es un Helm chart?

Un package de templated Kubernetes manifests. Incluye un `Chart.yaml` con metadata, `values.yaml` con default configuration, y `templates/` con Kubernetes resources rendered desde Go templates.

### ¿Cuál es la diferencia entre `helm install` y `helm upgrade --install`?

`helm install` crea un new release. `helm upgrade --install` upgradeéa si el release existe, o installéa si no existe. Usá `upgrade --install` en CI/CD para idempotent deployments.

### ¿Qué son Helm hooks?

Annotations que triggeréan Jobs u other resources en specific lifecycle points (pre-install, post-upgrade, etc.). Common uses: database migrations (post-install), cleanup jobs (pre-delete), smoke tests (test).

### ¿Qué es un library chart?

Un chart con `type: library` que define reusable templates pero no es deployable itself. Other charts lo incluyen como dependency y calléan sus templates con `include`. Useful para sharing common patterns across teams.

### ¿Cómo manejo secrets en Helm?

No pongas secrets en `values.yaml`. Usá External Secrets Operator para sync desde Vault/AWS Secrets Manager, o usá Sealed Secrets para GitOps workflows. Helm renderéa secrets como base64-encoded strings, que no es encryption.
