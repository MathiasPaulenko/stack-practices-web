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

### Helm Subcharts y Dependencias

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
version: 1.2.0
dependencies:
  - name: postgresql
    version: 12.12.x
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: 17.11.x
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

```yaml
# values.yaml
postgresql:
  enabled: true
  auth:
    postgresPassword: "secretpass"
  primary:
    persistence:
      size: 20Gi

redis:
  enabled: true
  architecture: standalone
  auth:
    password: "redispass"
```

```bash
# Actualizar dependencias
helm dependency update

# Buildar dependencias en el chart
helm dependency build

# Desplegar con subcharts
helm upgrade --install my-app ./my-app -f values.yaml
```

### Pipeline CI/CD con Helm

```yaml
# .github/workflows/helm-deploy.yml
name: Helm Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure Helm
        uses: azure/setup-helm@v3

      - name: Login to cluster
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Lint chart
        run: helm lint ./charts/my-app

      - name: Template y diff
        run: |
          helm template my-app ./charts/my-app -f values-prod.yaml > new.yaml
          helm get manifest my-app > current.yaml
          diff current.yaml new.yaml || true

      - name: Deploy
        run: |
          helm upgrade --install my-app ./charts/my-app \
            -f values-prod.yaml \
            --atomic \
            --timeout 5m \
            --wait

      - name: Verify
        run: helm test my-app
```

### Helm Secrets con SOPS

```bash
# Instalar plugin helm-secrets
helm plugin install https://github.com/jkroepke/helm-secrets

# Encriptar archivo de values
sops --encrypt --in-place secrets.yaml

# Desplegar con secrets encriptados
helm secrets upgrade my-app ./my-app -f secrets.yaml

# El plugin desencripta on-the-fly y nunca escribe plaintext a disk
```

```yaml
# secrets.yaml (encriptado con SOPS)
database:
  password: ENC[AES256_GCM,data:abc123==,iv:...]
adminToken: ENC[AES256_GCM,data:def456==,iv:...]
```

### Helm Hooks

```yaml
# templates/hooks/pre-install-hook.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-db-migrate
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command: ["./migrate", "up"]
```

```yaml
# templates/hooks/post-install-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: {{ .Release.Name }}-test
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: test
      image: curlimages/curl
      command: ["curl", "-f", "http://{{ .Release.Name }}-service/health"]
```

### Estrategia de Rollback

```bash
# Ver historial de releases
helm history my-app

# Rollback a revisión anterior
helm rollback my-app 3

# Rollback con cleanup
helm rollback my-app 3 --cleanup-on-fail

# Ver values de una revisión específica
helm get values my-app --revision 3

# Comparar actual vs anterior
diff <(helm get values my-app --revision 2 -o yaml) \
     <(helm get values my-app --revision 3 -o yaml)
```

## Mejores Prácticas Adicionales

1. **Usa `--atomic` en producción.** Rollback automático en fallo:

```bash
helm upgrade --install my-app ./my-app \
  --atomic \
  --timeout 5m \
  --wait
```

1. **Templatea antes de desplegar.** Atrapa errores de YAML temprano:

```bash
helm template my-app ./my-app -f values.yaml | kubectl apply --dry-run=client -f -
```

1. **Usa `helm diff` para previsualizar cambios.** Ve exactamente qué cambia antes de aplicar:

```bash
helm plugin install https://github.com/databus23/helm-diff
helm diff upgrade my-app ./my-app -f values.yaml
```

## Errores Comunes Adicionales

1. **No usar flag `--wait`.** Helm reporta éxito antes de que los pods estén listos:

```bash
# Sin --wait: Helm retorna inmediatamente
helm upgrade my-app ./my-app

# Con --wait: Helm espera que todos los recursos estén listos
helm upgrade my-app ./my-app --wait --timeout 5m
```

1. **Sobreescribir valores de subchart incorrectamente.** Usa el nombre del subchart como prefijo:

```yaml
# Mal
password: "secretpass"

# Bien
postgresql:
  auth:
    postgresPassword: "secretpass"
```

1. **No limpiar releases fallidos.** Releases fallidos consumen recursos:

```bash
# Listar todos los releases incluyendo fallidos
helm list --all

# Desinstalar release fallido
helm uninstall my-app --keep-history  # Mantener historial para auditoría
```

## FAQ Adicional

### ¿Cómo empaqueto y distribuyo un Helm chart?

```bash
# Empaquetar chart
helm package ./my-app --version 1.2.0

# Push a OCI registry
helm push my-app-1.2.0.tgz oci://registry.example.com/charts

# Pull desde OCI registry
helm pull oci://registry.example.com/charts/my-app --version 1.2.0
```

### ¿Cómo gestiono múltiples entornos?

Usa archivos de values separados por entorno:

```bash
helm upgrade --install my-app ./my-app -f values.yaml -f values-dev.yaml
helm upgrade --install my-app ./my-app -f values.yaml -f values-staging.yaml
helm upgrade --install my-app ./my-app -f values.yaml -f values-prod.yaml
```

### ¿Debo usar Helm o Kustomize?

Usa Helm cuando necesites: templating, packaging, gestión de dependencias y distribución. Usa Kustomize cuando necesites: overlays simples sin templating, y tu equipo prefiere YAML plano.

## Tips de Rendimiento

1. **Usa `helm template` para validación.** Más rápido que un deploy completo:

```bash
helm template my-app ./my-app -f values.yaml > manifest.yaml
kubectl apply --dry-run=client -f manifest.yaml
```

1. **Cachéa dependencias de charts.** Evita re-descargar subcharts:

```bash
# Las dependencias se cachéan en el directorio charts/
helm dependency build  # Descarga una vez
helm dependency update  # Solo actualiza deps cambiadas
```

1. **Usa `--reuse-values` para updates menores.** Evita re-especificar todos los values:

```bash
# Solo sobreescribir values específicos, mantener el resto
helm upgrade my-app ./my-app --reuse-values --set image.tag=v2.0.1
```

1. **Paraleliza tests con `helm test`.** Corre múltiples pods de test:

```yaml
# templates/tests/
# test-1.yaml, test-2.yaml, test-3.yaml
# Todos corren en paralelo al ejecutar: helm test my-app
```
