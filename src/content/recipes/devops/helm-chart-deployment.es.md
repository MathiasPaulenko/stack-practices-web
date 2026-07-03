---
contentType: recipes
slug: helm-chart-deployment
title: "Despliegue de Aplicaciones en Kubernetes con Helm Charts"
description: "Empaqueta, versiona y despliega aplicaciones Kubernetes usando Helm charts con value overrides, funciones de template y release management para infraestructura reproducible"
metaDescription: "Despliega aplicaciones en Kubernetes con Helm charts. Empaqueta, versiona y maneja releases con value overrides, funciones de template e infraestructura reproducible."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - kubernetes
  - devops
  - infrastructure
  - ci-cd
  - automation
relatedResources:
  - /recipes/devops/docker-compose-local-dev
  - /patterns/design/ambassador-pattern-services
  - /guides/devops/kubernetes-basics-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Despliega aplicaciones en Kubernetes con Helm charts. Empaqueta, versiona y maneja releases con value overrides, funciones de template e infraestructura reproducible."
  keywords:
    - helm charts
    - kubernetes deployment
    - package management
    - infrastructure as code
    - release management
---

# Despliegue de Aplicaciones en Kubernetes con Helm Charts

Empaqueta y despliega aplicaciones en Kubernetes usando Helm, el package manager de K8s. Esta recipe cubre estructura de charts, templating con values, upgrades y rollbacks de releases, y manejo de dependencias para despliegues production-grade.

## Cuando Usar Esto

- Despliegas la misma aplicacion a multiples ambientes con configuraciones diferentes. Consulta [Environment Variables](/recipes/devops/environment-variables) para configuración por ambiente.
- Los manifiestos de Kubernetes se vuelven repetitivos y dificiles de mantener entre equipos. Consulta [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) para plantillas multi-servicio locales.
- Necesitas releases versionados con capacidades de rollback facil. Consulta [Blue-Green Deployment](/recipes/devops/blue-green-deployment) para rollback instantáneo.

## Solucion

### 1. Estructura de Chart

```
myapp/
  Chart.yaml          # Metadata del chart
  values.yaml         # Valores de configuracion default
  values.prod.yaml    # Overrides de produccion
  templates/
    _helpers.tpl      # Helpers de template nombrados
    deployment.yaml
    service.yaml
    ingress.yaml
    configmap.yaml
  charts/             # Dependencias de subcharts
```

### 2. Metadata del Chart

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

### 3. Template con Values

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

### 4. Valores Default y Overrides

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

### 5. Instalar y Actualizar

```bash
# Instalar con valores default
helm install myapp ./myapp

# Instalar con overrides de produccion
helm install myapp ./myapp -f values.prod.yaml

# Actualizar release existente
helm upgrade myapp ./myapp -f values.prod.yaml

# Rollback a revision anterior
helm rollback myapp 2

# Listar historial de releases
helm history myapp
```

### 6. Helpers de Template Nombrados

```yaml
# templates/_helpers.tpl
{{/* Expandir el nombre del chart */}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Crear un fully qualified app name default */}}
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

## Como Funciona

- **Charts** empaquetan manifiestos Kubernetes en unidades versionadas y configurables
- **Templates** usan Go templating para inyectar valores en recursos YAML
- **Values** files proveen overrides de configuracion especificos por ambiente
- **Releases** trackean versiones de charts desplegados para rollback facil

## Consideraciones de Produccion

- Almacena charts en un registry (Harbor, OCI registry) en lugar de archivos locales
- Usa `helm lint` y `helm template` para validar antes de desplegar
- Pinea versiones de dependencias explicitamente para prevenir upgrades inesperados

## Errores Comunes

- Hardcodear valores de ambiente en templates en lugar de values files
- Olvidar actualizar `Chart.version` al hacer cambios
- No testear `helm upgrade` antes de aplicar en produccion

## FAQ

**P: En que se diferencia de Kustomize?**
R: Helm usa templating y packaging para charts reusables. Kustomize usa overlays y patches sin templating. Helm es mejor para distribuir aplicaciones complejas; Kustomize es mas simple para overlays internos.

**P: Puedo usar Helm con CI/CD?**
R: Si. Usa `helm upgrade --install` para despliegues idempotentes en pipelines. Combina con `helm diff` para previsualizar cambios antes de aplicar.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
