---
contentType: docs
slug: container-security-baseline-template
title: "Plantilla de Linea Base de Seguridad de Contenedores"
description: "Una plantilla de linea base para endurecer imagenes, tiempos de ejecucion y configuraciones de orquestacion de contenedores en todos los ambientes."
metaDescription: "Endurece imagenes y tiempos de ejecucion de contenedores con esta plantilla. Cubre escaneo de imagenes, politicas de runtime, RBAC, red y secretos."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - container-security
  - docker
  - kubernetes
  - hardening
  - compliance
relatedResources:
  - /docs/devops/network-segmentation-policy-template
  - /docs/devops/ci-cd-pipeline-security-template
  - /docs/devops/rbac-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Endurece imagenes y tiempos de ejecucion de contenedores con esta plantilla. Cubre escaneo de imagenes, politicas de runtime, RBAC, red y secretos."
  keywords:
    - seguridad de contenedores
    - endurecimiento de contenedores
    - seguridad docker
    - linea base kubernetes
    - escaneo de imagenes
---

## Descripcion General

Una Linea Base de Seguridad de Contenedores define la configuracion de seguridad minima requerida para cada imagen, runtime y entorno de orquestacion. Cubre la procedencia de imagenes, escaneo de vulnerabilidades, restricciones de runtime, control de acceso y politicas de red. Esta linea base ayuda a los equipos a entregar contenedores que cumplen con requisitos de seguridad y cumplimiento sin bloquear la entrega.

## Cuando Usar

- Configurar una nueva plataforma de contenedores o cluster Kubernetes.
- Incorporar un nuevo servicio o equipo de desarrollo.
- Prepararse para una auditoria de seguridad o revision de cumplimiento.
- Responder a un escape de contenedor o compromiso de imagen.
- Estandarizar controles de seguridad en CI/CD y produccion.

## Prerequisitos

- Un registro de contenedores con control de acceso y registro de auditoria.
- Un escaner de vulnerabilidades integrado con CI/CD o el registro.
- Un cluster Kubernetes con NetworkPolicy y RBAC habilitados.
- Propiedad de los equipos de plataforma, seguridad y desarrollo.

## Solucion

### Plantilla

#### 1. Requisitos de Construccion de Imagen

| Requisito | Linea Base | Verificacion |
|-----------|------------|--------------|
| Imagen base | Usar imagenes minimas, soportadas por el proveedor o distroless | Escanear tags del registro |
| Tamano de imagen | Eliminar herramientas de desarrollo y gestores de paquetes | Inspeccion de build |
| Vulnerabilidades | Sin CVE criticos ni altos en imagenes de produccion | Puerta del escaner en CI |
| Secretos | Sin credenciales incrustadas en capas de imagen | Escaneo de secretos |
| Procedencia | Build firmado con SBOM adjunto | Sigstore / cosign |
| Actualizaciones | Imagenes reconstruidas al menos mensualmente | Tarea programada de CI |

#### 2. Linea Base de Seguridad de Runtime

| Control | Linea Base | Aplicacion |
|---------|------------|------------|
| Usuario no root | Los contenedores ejecutan como usuario con UID > 10000 | Politica de seguridad de pods |
| Sistema de archivos de solo lectura | El sistema de archivos root es solo lectura | Contexto de seguridad |
| Sin modo privilegiado | El flag privilegiado no esta permitido | Controlador de admision |
| Limites de recursos | Limites de CPU y memoria establecidos por pod | ResourceQuota / LimitRange |
| Perfil seccomp | Perfil por defecto del runtime o personalizado | Contexto de seguridad |
| AppArmor / SELinux | Perfil aplicado en modo forzoso | Configuracion de nodos |
| Capacidades | Solo capacidades requeridas agregadas; set por defecto eliminado | Contexto de seguridad |

#### 3. Linea Base de Orquestacion

| Area | Linea Base | Herramienta / Recurso |
|------|------------|-----------------------|
| RBAC | Roles de minimo privilegio por namespace | RBAC de Kubernetes |
| Politica de red | Negacion por defecto y flujos explicitamente permitidos | NetworkPolicy |
| Control de admision | Motor de politicas rechaza pods no conformes | OPA / Kyverno |
| Secretos | Secretos almacenados en vault externo o KMS | Vault / External Secrets |
| Registro de auditoria | Logs de API server y contenedores habilitados | Auditoria de Kubernetes |
| Aislamiento de nodos | Cargas sensibles en pools de nodos dedicados | Taints / tolerations |

#### 4. Lista de Verificacion de Despliegue

- [ ] Imagen escaneada sin vulnerabilidades criticas ni altas.
- [ ] SBOM generado y firmado en tiempo de build.
- [ ] Contenedor ejecuta como no-root con sistema de archivos root solo lectura.
- [ ] Modo privilegiado y namespaces de host deshabilitados.
- [ ] Limites de CPU y memoria configurados.
- [ ] Contexto de seguridad con capacidades eliminadas y perfil seccomp.
- [ ] Politica de red restringe ingress y egress.
- [ ] Secretos montados desde vault externo, no variables de entorno.
- [ ] Rol RBAC de minimo privilegio y acotado a namespace.
- [ ] Politica de admision de seguridad de pods aplicada.

#### 5. Excepciones y Aceptacion de Riesgo

| ID Excepcion | Descripcion | Riesgo | Aprobado Por | Vencimiento | Control Compensatorio |
|--------------|-------------|--------|--------------|-------------|-----------------------|
| CS-001 | Imagen legacy necesita gestor de paquetes | Medio | Lider de plataforma | 2026-09-30 | Escaneo semanal |
| CS-002 | Sidecar requiere modo privilegiado | Alto | CISO | 2026-08-15 | Pool de nodos dedicado |

## Explicacion

Los contenedores comparten el kernel del host, asi que un contenedor mal configurado puede comprometer todo el nodo. La linea base superpone controles: la seguridad de imagen evita enviar codigo vulnerable, el endurecimiento de runtime limita lo que un contenedor puede hacer, y las politicas de orquestacion hacen cumplir estas reglas a escala. Juntos reducen la superficie de ataque y simplifican el cumplimiento.

## Variantes

- **Linea base solo Docker**: Plantilla mas simple para equipos que ejecutan Docker sin Kubernetes.
- **Lista de verificacion de endurecimiento Kubernetes**: Enfocada en seguridad de pods, admision y RBAC.
- **Linea base de contenedores serverless**: Para plataformas como AWS Fargate o Google Cloud Run.
- **Linea base de alta conformidad**: Agrega requisitos para FIPS, FedRAMP o ambientes PCI-DSS.
- **Linea base de laptop de desarrollador**: Endurecimiento para Docker Desktop y builds locales de contenedores.

## Lo que funciona

- Haz la linea base obligatoria mediante puertas de CI/CD y controladores de admision.
- Usa imagenes distroless o basadas en scratch cuando sea posible.
- Escanear imagenes continuamente, no solo en tiempo de build.
- Rota credenciales de registro y claves de firma regularmente.
- Monitorea el comportamiento de runtime con herramientas de seguridad de contenedores.
- Manten las politicas de admision versionadas y revisadas.
- Documenta excepciones y requiere fechas de vencimiento.

## Errores Comunes

- Ejecutar contenedores como root por defecto.
- Incrustar secretos en capas Docker o variables de entorno.
- Extraer imagenes desde registros publicos no verificados.
- Omitir el escaneo de vulnerabilidades de dependencias transitivas.
- Permitir todo el trafico egress desde los pods.
- No aislar cargas de produccion y staging.
- Depender solo del escaneo de imagenes sin controles de runtime.

## FAQs

### Cual es la diferencia entre un escaner de imagenes y una herramienta de seguridad de runtime?

Un escaner de imagenes encuentra vulnerabilidades conocidas en capas de imagen estaticas. Una herramienta de seguridad de runtime detecta comportamiento sospechoso mientras el contenedor ejecuta, como ejecucion de procesos o conexiones de red inesperadas.

### Deberiamos usar un init container privilegiado?

Evita los contenedores privilegiados. Si una tarea de configuracion inicial requiere privilegios elevados, usa un job dedicado con RBAC restringido, registro de auditoria y aprobacion del equipo de seguridad.

### Como hacemos cumplir la linea base automaticamente?

Usa puertas de CI/CD para el escaneo de imagenes y controladores de admision como Kyverno o OPA Gatekeeper en Kubernetes. Pod Security Admission tambien puede hacer cumplir contextos de seguridad comunes.

## Soluciones Avanzadas

### Politicas de cluster Kyverno para aplicacion automatizada

Despliega politicas Kyverno para hacer cumplir la linea base de seguridad de contenedores en tiempo de admision:

```yaml
# kyverno-enforce-non-root.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root-user
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-runAsNonRoot
      match:
        resources:
          kinds:
            - Pod
      validate:
        message: "Containers must run as non-root user (UID > 10000)"
        pattern:
          spec:
            containers:
              - securityContext:
                  runAsNonRoot: true
                  runAsUser: ">10000"

---
# kyverno-disallow-privileged.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
spec:
  validationFailureAction: Enforce
  rules:
    - name: reject-privileged
      match:
        resources:
          kinds:
            - Pod
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: "false"

---
# kyverno-require-resource-limits.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-resource-limits
      match:
        resources:
          kinds:
            - Pod
      validate:
        message: "CPU and memory limits are required"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

### Firma y verificacion de imagenes con cosign

Firma imagenes de contenedor en tiempo de build y verificalas antes del despliegue:

```bash
#!/bin/bash
set -euo pipefail

# Generate signing key
cosign generate-key-pair

# Sign image in CI pipeline
IMAGE="registry.example.com/myapp:v1.2.3"
cosign sign --key cosign.key "$IMAGE"

# Attach SBOM as attestation
syft "$IMAGE" -o cyclonedx-json > sbom.json
cosign attest --key cosign.key \
  --predicate sbom.json \
  --type cyclonedx \
  "$IMAGE"

# Verify signature before deployment
cosign verify --key cosign.pub "$IMAGE"

# Verify SBOM attestation
cosign verify-attestation --key cosign.pub \
  --type cyclonedx \
  "$IMAGE" | jq -r '.payload' | base64 -d | jq .
```

### Plantillas de politicas de red para negacion por defecto

Implementa redes con negacion por defecto y reglas de permiso explicitas:

```yaml
# default-deny-all.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# allow-frontend-to-backend.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080

---
# allow-dns-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Mejores Practicas Adicionales

1. **Usa los estandares de Pod Security Admission de Kubernetes.** El perfil `restricted` hace cumplir no-root, sin privilegiados, capacidades eliminadas y seccomp. Aplicalo a nivel de namespace:

```yaml
# namespace-pod-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
```

2. **Implementa image pull secrets con gestion de secretos externa.** Evita credenciales de registro de larga duracion. Usa External Secrets Operator para sincronizar tokens de corta duracion:

```yaml
# external-secret-registry.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: registry-pull-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    template:
      type: kubernetes.io/dockerconfigjson
      data:
        .dockerconfigjson: "{{ .dockerconfig | toString }}"
  data:
    - secretKey: dockerconfig
      remoteRef:
        key: registry/credentials
        property: dockerconfigjson
```

## Errores Comunes Adicionales

1. **No escanear imagenes base para vulnerabilidades transitivas de paquetes del SO.** Una imagen distroless reduce la superficie, pero si usas una base como `python:3.12-slim`, heredas paquetes de Debian. Escanea la imagen base de forma independiente:

```bash
# Scan base image separately
trivy image --scanners vuln python:3.12-slim --format json > base-scan.json

# Compare with your app image scan
trivy image --scanners vuln myapp:v1.2.3 --format json > app-scan.json

# Find vulnerabilities introduced by your layers only
jq -r '.Results[] | select(.Target | contains("app")) | .Vulnerabilities[]?' app-scan.json
```

2. **Permitir egress a internet sin restricciones.** Los pods que pueden alcanzar cualquier endpoint externo pueden exfiltrar datos o descargar malware. Usa un proxy de egress o firewall:

```yaml
# egress-proxy-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress-internet
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: production
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

## Preguntas Frecuentes Adicionales

### Con que frecuencia debemos reconstruir y reescanear imagenes de contenedor?

Reconstruye al menos mensualmente para obtener parches del SO. Para servicios criticos, configura un pipeline de reconstruccion semanal. Usa una tarea programada de CI que actualice el tag de la imagen base, reconstruya, escanee y despliegue si el escaneo pasa:

```yaml
# GitHub Actions weekly rebuild
name: Weekly Image Rebuild
on:
  schedule:
    - cron: "0 2 * * 1"
jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and scan
        run: |
          docker build -t myapp:latest .
          trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest
```

### Cual es la diferencia entre Pod Security Standards y politicas Kyverno?

Pod Security Standards son controles de admision integrados en Kubernetes con tres perfiles (`privileged`, `baseline`, `restricted`). Cubren contextos de seguridad comunes pero son limitados. Kyverno es un motor de politicas que puede hacer cumplir las mismas reglas mas politicas personalizadas para imagenes, recursos, labels y red. Usa Pod Security Standards para aplicacion de linea base y Kyverno para reglas especificas de la organizacion.
