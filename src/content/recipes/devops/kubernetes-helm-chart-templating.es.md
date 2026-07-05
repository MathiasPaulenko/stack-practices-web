---
contentType: recipes
slug: kubernetes-helm-chart-templating
title: "Empaquetar Manifests de Kubernetes con Helm Charts"
description: "Cómo crear, templetar y desplegar aplicaciones de Kubernetes usando Helm charts, cubriendo values, conditionals, ranges, hooks, subcharts y library charts."
metaDescription: "Empaqueta manifests de Kubernetes con Helm charts. Templetea con values, conditionals, ranges, hooks, subcharts y library charts para deployments K8s reusables."
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
  - /recipes/devops/kubernetes-configmap-secret-mounting
  - /recipes/devops/docker-multi-stage-build-distroless
  - /recipes/devops/terraform-remote-state-s3-backend
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Empaqueta manifests de Kubernetes con Helm charts. Templetea con values, conditionals, ranges, hooks, subcharts y library charts para deployments K8s reusables."
  keywords:
    - devops
    - kubernetes
    - helm
    - templating
    - packaging
    - recipe
---

## Overview

Helm es el package manager para Kubernetes. Un Helm chart es una colección de manifests de Kubernetes templetados que pueden ser customizados con un archivo `values.yaml`. En lugar de escribir archivos YAML separados para cada entorno, escribís un chart y overrideás values por entorno. Helm renderiza los templates, los aplica al cluster, y trackea releases para upgrades y rollbacks.

## When to Use

- Desplegar la misma app a múltiples entornos (dev, staging, production)
- Compartir deployments de Kubernetes reusables a través de equipos
- Manejar el lifecycle de la aplicación (install, upgrade, rollback)
- Cuando necesitás manifests parametrizados (different replicas, images, resources por env)
- Instalar herramientas de terceros (Prometheus, Grafana, ingress controllers)

## When NOT to Use

- Entorno único con manifests estáticos — plain `kubectl apply` es más simple
- Cuando necesitás GitOps — usá ArgoCD o Flux (pueden consumir Helm charts)
- Cuando los manifests cambian raramente y no necesitan parametrización
- Cuando el templating de Helm es muy limitado — Kustomize puede ser mejor para overlays

## Solution

### Estructura del chart

```text
my-chart/
├── Chart.yaml          # Metadata del chart
├── values.yaml         # Values default
├── values/
│   ├── staging.yaml    # Overrides por entorno
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
version: 1.0.0          # Versión del chart
appVersion: "2.5.0"     # Versión de la app
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

### Template de Deployment

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

### Range sobre values

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

### Values específicos por entorno

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

### Instalar y upgradear

```bash
# Instalar con values default
helm install my-app ./my-chart

# Instalar con values custom
helm install my-app ./my-chart -f values/production.yaml

# Instalar con overrides inline
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

### Usar subcharts

```yaml
# Chart.yaml
dependencies:
  - name: redis
    version: 17.x.x
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

```yaml
# values.yaml — configurar subchart
redis:
  enabled: true
  auth:
    password: "my-redis-password"
  architecture: standalone
```

### Library chart (bloques reusables)

```yaml
# Chart.yaml
apiVersion: v2
name: common
type: library          # Library chart — no deployable
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
# En el template de otro chart
{{- include "common.container" (dict "name" "api" "image" "my-api:1.0" "port" 8080 "resources" .Values.resources) | nindent 8 }}
```

### Helm con sealed secrets

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

- Usá `include` sobre `template` — `include` permite chaining con `nindent`
- Siempre usá `nindent` no `indent` — maneja el leading newline correctamente
- Seteá resource requests y limits — previene resource starvation en el cluster
- Usá `{{ .Values.xxx | quote }}` para string values — previene YAML parsing issues
- Mantené `values.yaml` minimal — poné values específicos por entorno en archivos separados
- Usá `helm lint` antes de deployar — atrapa template errors temprano
- Usá `helm template` para dry runs — renderiza manifests sin aplicar
- Pinea versiones de subchart — evita cambios inesperados de charts upstream

## Common Mistakes

- **Olvidar `nindent` vs `indent`**: `indent` no agrega leading newline. `nindent` sí. La mayoría de las veces querés `nindent`.
- **No quotear values**: YAML interpreta `yes`/`no`/`on`/`off` como booleans. Usá `quote` para forzar strings.
- **Hardcodear values en templates**: derrota el propósito de Helm. Mové todo a `values.yaml`.
- **No usar `helm lint`**: los template errors solo se muestran al install. Lint los atrapa temprano.
- **Sobrescribir todos los values con `--set`**: difícil de debuggear. Usá `-f values/production.yaml` para overrides complejos.

## FAQ

### ¿Qué es un Helm chart?

Una colección de manifests de Kubernetes templetados empaquetados juntos. Los customizás con un archivo `values.yaml` y deployás con `helm install`. Helm trackea releases para upgrades y rollbacks.

### ¿En qué se diferencia Helm de Kustomize?

Helm usa Go templates para parametrización. Kustomize usa overlays (base + patches) sin templating. Helm es mejor para compartir charts reusables; Kustomize es mejor para overlays específicos por entorno.

### ¿Qué es un Helm hook?

Una forma de correr jobs en puntos específicos del lifecycle del release (pre-install, post-install, pre-upgrade, etc.). Anotados con `helm.sh/hook` en la metadata del manifest.

### ¿Puedo usar Helm con ArgoCD o Flux?

Sí. Ambas herramientas GitOps soportan Helm charts. ArgoCD puede deployar Helm charts directamente; Flux tiene un HelmRelease CRD.

### ¿Cómo debuggeo un template?

Usá `helm template my-app ./my-chart -f values.yaml` para renderizar manifests localmente. Usá `helm install --dry-run --debug` para ver qué se aplicaría sin instalar realmente.
