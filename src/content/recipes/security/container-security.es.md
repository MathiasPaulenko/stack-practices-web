---
contentType: recipes
slug: container-security
title: "Escaneo de Seguridad de Containers"
description: "Escanea imágenes de container para vulnerabilidades, misconfiguraciones y secrets con Trivy, Clair y Snyk antes de desplegar a producción."
metaDescription: "Escaneo de seguridad de containers: detección de vulnerabilidades con Trivy, Clair, Snyk, hardening de imágenes, detección de secrets y gates de seguridad en CI."
difficulty: intermediate
topics:
  - security
tags:
  - container-security
  - security
  - docker
  - devops
  - vulnerabilities
relatedResources:
  - /recipes/container-security-scanning
  - /docs/data-retention-policy-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Escaneo de seguridad de containers: detección de vulnerabilidades con Trivy, Clair, Snyk, hardening de imágenes, detección de secrets y gates de seguridad en CI."
  keywords:
    - container-security
    - security
    - docker
    - devops
---
## Visión General

El escaneo de seguridad de containers identifica vulnerabilidades en imágenes Docker antes de que lleguen a producción. Una única imagen base desactualizada puede exponer cientos de CVEs. Herramientas como Trivy, Clair y Snyk analizan paquetes de OS, dependencias de lenguajes e incluso secrets embebidos en capas. Integrar el escaneo en [CI/CD](/guides/devops/cicd-pipeline-guide) crea una puerta de seguridad que previene imágenes vulnerables de desplegarse.

## Cuándo Usar

Usa este recurso cuando:
- Las imágenes Docker se construyen de imágenes base públicas que pueden contener CVEs conocidos
- Necesitas cumplir con [frameworks de seguridad](/guides/security/security-best-practices-guide) (SOC 2, PCI-DSS, FedRAMP)
- Los developers agregan [dependencias](/guides/security/security-best-practices-guide) sin revisar su postura de seguridad
- Incidentes de producción han sido rastreados a librerías de sistema vulnerables

## Solución

### Trivy Scan en CI/CD (GitHub Actions)

```yaml
name: Container Security Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
```

### Dockerfile Security Hardening

```dockerfile
# Usar imagen base mínima
FROM gcr.io/distroless/nodejs20-debian12

# Ejecutar como non-root
USER 65532:65532

# Read-only root filesystem
COPY --chown=65532:65532 . /app
WORKDIR /app

# Sin shell access; sin package manager
EXPOSE 3000
CMD ["server.js"]
```

### Secret Detection (TruffleHog)

```bash
# Escanear capas de imagen para secrets embebidos
trufflehog docker --image=myapp:latest

# Escanear filesystem antes del build
trufflehog filesystem --directory=.
```

## Explicación

**Qué detectan los scanners**:

| Capa | Issues Detectados | Ejemplo |
|------|-------------------|---------|
| Paquetes OS | CVEs en paquetes apt/yum | Vulnerabilidad OpenSSL |
| Paquetes de lenguaje | CVEs en npm/pip/gems | log4j, lodash prototype pollution |
| Configuración | Misconfiguraciones | Ejecutar como root, sin read-only filesystem |
| Secrets | API keys, tokens | Credenciales AWS en ENV |
| Licencias | Riesgo de compliance | GPL en software propietario |

**Respuesta por severidad**:
- **Critical**: Bloquear deploy; arreglar inmediatamente
- **High**: Bloquear deploy; arreglar dentro de 24 horas
- **Medium**: Advertencia; arreglar dentro del sprint
- **Low**: Trackear; arreglar oportunísticamente

## Variantes

| Scanner | Velocidad | Profundidad | Ideal Para |
|---------|-----------|-------------|------------|
| Trivy | Rápido | OS + lenguaje | Integración CI; setup simple |
| Snyk | Medio | OS + lenguaje + SCA | Enterprise; compliance de licencias |
| Clair | Medio | Paquetes OS | Integración Harbor registry |
| Grype | Rápido | OS + lenguaje | Integración Syft SBOM |
| Twistlock | Medio | Full stack | Enterprise runtime protection |

## Lo que funciona

- **Scannea en cada build**: Las vulnerabilidades se descubren diariamente; la imagen limpia de ayer es el riesgo de hoy
- **Usa bases distroless o mínimas**: `distroless`, `alpine` o `scratch` reducen superficie de ataque
- **Pinea digests de imagen base**: `FROM node:20-alpine@sha256:abc...` previene tampering de tags
- **Multi-stage builds**: No envíes build tools (gcc, git) en imágenes de producción. Consulta [infraestructura inmutable](/guides/devops/infrastructure-as-code-guide).
- **Firma imágenes con Cosign**: Verifica integridad de imagen y provenance antes del deploy

## Errores Comunes

1. **Scanneando solo la imagen base**: Las dependencias de aplicación a menudo tienen más CVEs que el OS
2. **Usando tag `:latest`**: Builds no reproducibles hacen la atribución de vulnerabilidades imposible
3. **Sin threshold de severidad**: Scannear pero ignorar todos los resultados crea falsa confianza
4. **Secrets en ENV**: `ENV AWS_SECRET_ACCESS_KEY=...` es visible para cualquiera que haga pull de la imagen. Sigue [secrets management](/guides/security/security-best-practices-guide).
5. **Olvidando escaneo en runtime**: La imagen está limpia en build time; las vulnerabilidades en runtime (volúmenes montados, sidecars) necesitan monitoreo

## Preguntas Frecuentes

**P: ¿Debería bloquear el deploy en CVEs de severidad media?**
R: Empieza con critical/high solo. A medida que madure tu postura de seguridad, ajusta a medium. Balancea velocidad vs. seguridad.

**P: ¿Con qué frecuencia debería rescanear imágenes existentes?**
R: Diariamente. Los CVEs nuevos se publican continuamente. La imagen limpia de ayer puede tener la vulnerabilidad crítica de hoy.

**P: ¿Cuál es la diferencia entre SAST y container scanning?**
R: SAST analiza código fuente para bugs. Container scanning analiza el artifact construido (paquetes, configs, secrets).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Dockerfile hardened multi-stage

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias con audit
COPY package*.json ./
RUN npm ci --audit --omit=dev

# Stage 2: Producción
FROM gcr.io/distroless/nodejs20-debian12 AS production

# Copiar solo artifacts construidos
COPY --from=builder --chown=65532:65532 /app/node_modules /app/node_modules
COPY --from=builder --chown=65532:65532 /app/package.json /app/package.json
COPY --chown=65532:65532 . /app

# Seguridad: usuario non-root, read-only filesystem, no new privileges
USER 65532:65532
WORKDIR /app

# Dropear todas las capabilities de Linux
# Setear via docker run: --cap-drop ALL --security-opt no-new-privileges
# Setear via Kubernetes: securityContext.runAsNonRoot, readOnlyRootFilesystem

EXPOSE 3000
CMD ["server.js"]
```

### Generación de SBOM con Syft

Genera un Software Bill of Materials (SBOM) para trazabilidad y compliance:

```bash
# Generar SBOM en formato SPDX
syft myapp:latest -o spdx-json > sbom.spdx.json

# Generar SBOM en formato CycloneDX
syft myapp:latest -o cyclonedx-json > sbom.cyclonedx.json

# Escanear SBOM para vulnerabilidades con Grype
grype sbom:sbom.cyclonedx.json --fail-on high

# Adjuntar SBOM a imagen como artifact OCI
cosign attach sbom --sbom sbom.spdx.json myapp:latest
```

### Firma y verificación de imágenes con Cosign

```bash
# Generar par de keys para firma
cosign generate-key-pair

# Firmar la imagen
export COSIGN_PASSWORD="tu-password"
cosign sign --key cosign.key myapp:latest

# Verificar la firma antes del deploy
cosign verify --key cosign.pub myapp:latest

# Firmar con OIDC (keyless signing en CI)
cosign sign --identity-token $OIDC_TOKEN myapp:latest

# Verificar con identidad de certificado
cosign verify \
  --certificate-identity "https://github.com/myorg/myrepo/.github/workflows/deploy.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  myapp:latest
```

### Kubernetes security context

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
        runAsGroup: 65532
        fsGroup: 65532
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: myapp
          image: myapp:latest@sha256:abc123...
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            limits:
              memory: "256Mi"
              cpu: "500m"
            requests:
              memory: "128Mi"
              cpu: "100m"
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

### Cache y políticas de ignore de Trivy

```yaml
# .trivyignore — falsos positivos conocidos o riesgos aceptados
CVE-2023-1234  # Falso positivo: nuestro código no usa la función vulnerable
CVE-2023-5678  # Riesgo aceptado: mitigado por network policy

# trivy.yaml — configuración de Trivy
scan:
  severity: [CRITICAL, HIGH]
  ignore-unfixed: true
  ignore-policy: .trivyignore
  skip-dirs:
    - /tests
    - /docs

# GitHub Actions con caching
name: Container Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cache Trivy DB
        uses: actions/cache@v4
        with:
          path: ~/.cache/trivy
          key: trivy-db-${{ github.run_id }}
          restore-keys: trivy-db-

      - name: Build and scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          ignore-unfixed: true
          exit-code: '1'

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
```

## Mejores Prácticas Adicionales

1. **Usa `docker scan` o `trivy` localmente antes de pushear.** Captura vulnerabilidades temprano en desarrollo:

```bash
# Añadir a Makefile o scripts de package.json
scan:
    trivy fs --severity CRITICAL,HIGH .
    trivy build --severity CRITICAL,HIGH .

# Pre-commit hook
#!/bin/bash
trivy fs --severity CRITICAL,HIGH --exit-code 1 .
```

2. **Actualiza imágenes base regularmente.** Suscríbete a advisories de seguridad para tus imágenes base y configura PRs automatizados:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

## Errores Comunes Adicionales

1. **Ejecutar containers como root.** Muchas imágenes base usan root por defecto. Siempre especifica un usuario non-root:

```dockerfile
# INCORRECTO: ejecuta como root por defecto
FROM node:20
COPY . /app
CMD ["node", "server.js"]

# CORRECTO: usuario non-root explícito
FROM node:20
RUN groupadd -r app && useradd -r -g app app
USER app
COPY --chown=app:app . /app
CMD ["node", "server.js"]
```

2. **No configurar límites de recursos.** Un container comprometido puede consumir todos los recursos del host. Siempre setea límites en Kubernetes o Docker:

```bash
# Docker: setear límites de memoria y CPU
docker run --memory=256m --cpus=0.5 myapp:latest

# Docker Compose
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo falsos positivos en escaneos de vulnerabilidades?

Crea un archivo `.trivyignore` listando los IDs de CVE que has revisado y determinado que son falsos positivos. Documenta la justificación de cada CVE ignorado y revisa la lista trimestralmente. Alternativamente, usa el flag `--ignore-policy` de Trivy con una política OPA Rego personalizada para filtrado más complejo.

### ¿Cuál es la diferencia entre image scanning y runtime security?

Image scanning ocurre en build time y verifica los contenidos estáticos de la imagen (paquetes, configs, secrets). Runtime security monitorea el container mientras se ejecuta — detectando ejecución de procesos anómalos, acceso a archivos, conexiones de red y escalada de privilegios. Usa ambos: scanning previene que vulnerabilidades conocidas se desplieguen, runtime security captura amenazas desconocidas y zero-days.

### ¿Debo usar imágenes base distroless o Alpine?

Ambas reducen la superficie de ataque pero difieren en compatibilidad. Las imágenes distroless no tienen shell, package manager ni binarios extra — menor superficie de ataque pero más difíciles de debuggear. Alpine usa musl libc en lugar de glibc, lo que puede causar problemas de compatibilidad con algunas librerías. Elige distroless para producción, Alpine para imágenes más pequeñas donde necesitas un shell para debugging.
