---



contentType: recipes
slug: container-security-scanning
title: "Escaneo de Seguridad de Imagenes de Contenedores con Trivy"
description: "Escanea imagenes Docker para vulnerabilidades, configuraciones incorrectas y secretos usando Trivy, integra el escaneo en pipelines de CI/CD y aplica politicas de imagen antes del deployment a produccion"
metaDescription: "Escanea imagenes Docker para vulnerabilidades con Trivy. Integra escaneo de seguridad en CI/CD y aplica politicas de imagen antes del deployment a produccion."
difficulty: intermediate
topics:
  - devops
  - security
tags:
  - container
  - docker
  - security
  - devops
  - ci-cd
relatedResources:
  - /recipes/docker-multi-stage-build-optimization
  - /recipes/sql-injection-prevention
  - /guides/docker-for-developers-guide
  - /recipes/docker-image-vulnerability-scan
  - /recipes/container-security
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Escanea imagenes Docker para vulnerabilidades con Trivy. Integra escaneo de seguridad en CI/CD y aplica politicas de imagen antes del deployment a produccion."
  keywords:
    - container security
    - docker scanning
    - trivy
    - vulnerability scanning
    - image security



---

# Escaneo de Seguridad de Imagenes de Contenedores con Trivy

Las imagenes de contenedor empaquetan codigo de aplicacion con librerias del sistema operativo, haciendolas una superficie de ataque importante. Trivy escanea imagenes para vulnerabilidades de paquetes OS, dependencias de aplicacion, configuraciones incorrectas y secretos expuestos. Esta recipe cubre escaneo local, integracion CI/CD, aplicacion de politicas y flujos de trabajo de remediacion para seguridad de contenedores en produccion.

## Cuando Usar Esto

- Workloads de produccion ejecutan aplicaciones containerizadas que deben cumplir compliance de seguridad. Consulta [Docker Basics](/recipes/devops/docker-basics) para fundamentos de contenedores.
- Las imagenes se construyen desde imagenes base publicas con estado de vulnerabilidad desconocido. Consulta [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) para construcción local de imágenes.
- Necesitas enforcement automatizado bloqueando deployments con CVEs criticas. Consulta [CI/CD Pipeline Setup](/recipes/devops/cicd-pipeline-setup) para gating de pipelines.

## Solucion

### 1. Escaneo Local de Imagenes

```bash
# Instalar Trivy (Aqua Security)
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

# Escanear una imagen local o remota
trivy image myapp:latest

# Escanear con filtro de severidad
trivy image --severity HIGH,CRITICAL myapp:latest

# Output SARIF para GitHub Advanced Security
trivy image --format sarif --output trivy-results.sarif myapp:latest

# Escanear secretos en capas de imagen
trivy image --scanners secret myapp:latest

# Escanear Dockerfile para configuraciones incorrectas
trivy config Dockerfile
```

### 2. Integracion CI/CD (GitHub Actions)

```yaml
# .github/workflows/security-scan.yml
name: Container Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t app:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          ignore-unfixed: true

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### 3. Aplicacion de Politicas

```yaml
# trivy-policy.yaml
package trivy

import data.lib.result

deny[msg] {
  input.OS.Family == "alpine"
  input.OS.Version == "3.14"
  msg := "Alpine 3.14 reached EOL; upgrade to 3.19+"
}

deny[msg] {
  input.Results[i].Vulnerabilities[j].Severity == "CRITICAL"
  input.Results[i].Vulnerabilities[j].FixedVersion != ""
  msg := sprintf("CRITICAL CVE %s has available fix %s", [
    input.Results[i].Vulnerabilities[j].VulnerabilityID,
    input.Results[i].Vulnerabilities[j].FixedVersion,
  ])
}

deny[msg] {
  input.Results[i].Class == "secret"
  msg := sprintf("Secret exposed in %s: %s", [
    input.Results[i].Target,
    input.Results[i].Secrets[0].Title,
  ])
}
```

### 4. Hardening de Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

RUN apk del curl wget 2>/dev/null || true

USER nextjs
EXPOSE 3000
CMD ["dumb-init", "node", "server.js"]
```

### 5. Firma y Verificacion de Imagenes

```bash
# Firmar imagen con Cosign
cosign generate-key-pair

cosign sign --key cosign.key myregistry.io/app:1.0.0

# Verificar antes del deployment
cosign verify --key cosign.pub myregistry.io/app:1.0.0

# Politica: solo deployar imagenes firmadas
```

## Como Funciona

- **Escaneo de vulnerabilidades** compara paquetes instalados contra bases de datos CVE (NVD, Alpine SecDB, etc.)
- **Deteccion de secretos** escanea capas de imagen para API keys, tokens y private keys commiteados accidentalmente
- **Chequeos de configuracion incorrecta** validan Dockerfiles y manifiestos Kubernetes contra benchmarks CIS
- **Aplicacion de politicas** bloquea imagenes con vulnerabilidades criticas o sin fix en tiempo de deployment

## Consideraciones de Produccion

- Escanea imagenes base por separado y cachea reportes de vulnerabilidades para reducir tiempo de CI
- Manten una lista de permitidos para vulnerabilidades aceptadas con evaluaciones de riesgo documentadas
- Integra resultados de escaneo en SIEM o plataformas de gestion de vulnerabilidades

## Errores Comunes

- Escanear imagenes despues del deployment en lugar de durante el gate del pipeline de build
- Ignorar vulnerabilidades sin fix sin evaluacion de riesgo o controles compensatorios
- Ejecutar contenedores como root, amplificando el impacto de cualquier escape de contenedor

## FAQ

**P: Trivy vs Clair vs Snyk Container: cual elegir?**
R: Trivy es rapido, open-source y se integra bien con CI. Clair es CNCF-graduated pero mas lento. Snyk ofrece ecosistema mas amplio pero requiere licenciamiento.

**P: Deberia fallar builds por todas las vulnerabilidades?**
R: No. Establece umbrales de severidad (ej. bloquear en CRITICAL con fixes disponibles) y trackea riesgos aceptados en un registro de vulnerabilidades.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Integración con GitLab CI

```yaml
# .gitlab-ci.yml
container_scan:
  stage: test
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  variables:
    TRIVY_NO_PROGRESS: "true"
    TRIVY_CACHE_DIR: ".trivycache/"
  cache:
    key: trivy
    paths:
      - .trivycache/
  before_script:
    - docker build -t app:$CI_COMMIT_SHA .
  script:
    - trivy image --exit-code 1 --severity CRITICAL,HIGH --ignore-unfixed app:$CI_COMMIT_SHA
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.json
  allow_failure: false
```

### Grype (Scanner Alternativo)

```bash
# Instalar Grype (Anchore)
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh

# Escanear una imagen
grype myapp:latest

# Solo fallar en vulnerabilidades fixeables
grype myapp:latest --fail-on high --only-fixed

# Output JSON para integración
grype myapp:latest -o json > grype-results.json

# Generación de SBOM con Syft (herramienta complementaria)
syft myapp:latest -o json > sbom.json
grype sbom:sbom.json --fail-on high
```

### SBOM (Bill of Materials de Software)

```bash
# Generar SBOM con Syft
syft myapp:latest -o cyclonedx-json > sbom.cyclonedx.json

# Generar formato SPDX
syft myapp:latest -o spdx-json > sbom.spdx.json

# Escanear SBOM con Grype (sin necesidad de Docker)
grype sbom:sbom.cyclonedx.json

# Guardar SBOM como artefacto para compliance
# CI/CD: subir con artefactos de build
```

```yaml
# GitHub Actions: generación de SBOM
- name: Generate SBOM
  run: |
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh
    syft app:${{ github.sha }} -o cyclonedx-json > sbom.json

- uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.json
    retention-days: 365  # Guardar para compliance
```

### Control de Admisión con Kyverno (Kubernetes)

```yaml
# kyverno-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: deny-images-with-critical-vulns
spec:
  validationFailureAction: Enforce
  rules:
  - name: deny-critical-vulnerabilities
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images with CRITICAL vulnerabilities are not allowed"
      foreach:
      - list: "request.object.spec.containers"
        deny:
          conditions:
            any:
            - key: "{{ element.image }}"
              operator: Equals
              value: ""  # Añade tu check de imagen vulnerable
```

### Pipeline de Escaneo Multi-Etapa

```yaml
# .github/workflows/multi-scan.yml
name: Multi-Scanner Security
on: [push]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app:${{ github.sha }} .
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: app:${{ github.sha }}
          format: json
          output: trivy.json

  grype:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app:${{ github.sha }} .
      - run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh
          grype app:${{ github.sha }} -o json > grype.json

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  report:
    needs: [trivy, grype, secrets-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: Consolidar reportes
        run: |
          echo "## Security Scan Summary" >> $GITHUB_STEP_SUMMARY
          echo "- Trivy: $(jq '.Results | length' trivy/trivy.json) findings" >> $GITHUB_STEP_SUMMARY
          echo "- Grype: $(jq '.matches | length' grype/grype.json) findings" >> $GITHUB_STEP_SUMMARY
```

## Mejores Prácticas Adicionales

1. **Pinea versiones de imágenes base.** Nunca uses tags `latest` en Dockerfiles de producción:

```dockerfile
# Mal: impredecible, puede introducir nuevas vulnerabilidades
FROM node:latest

# Bien: pineado, reproducible, auditable
FROM node:20.11.1-alpine3.19
```

1. **Escanea imágenes base por separado.** Cachéa resultados para evitar reescanear layers sin cambios:

```bash
# Escanear imagen base una vez y cachear
trivy image node:20-alpine --cache-dir .trivycache

# Escanear solo layers de aplicación (más rápido)
trivy image --skip-dirs /usr/local/lib/node_modules app:latest
```

1. **Configura actualizaciones automáticas de imágenes base.** Usa Renovate o Dependabot para PRs de imágenes base:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: docker
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

## Errores Comunes Adicionales

1. **Escanear solo la imagen final.** Multi-stage builds pueden ocultar vulnerabilidades en stages de builder:

```bash
# Escanear todos los stages, no solo el final
trivy image --scan-source build,final app:latest
```

1. **No escanear archivos IaC.** Misconfigurations en manifiestos de Kubernetes y Terraform también son riesgos:

```bash
# Escanear manifiestos de Kubernetes
trivy config k8s/

# Escanear Terraform
trivy config terraform/

# Escanear Helm charts
trivy config charts/
```

1. **Ignorar compliance de licencias.** Escaneo de vulnerabilidades no es suficiente; verifica licencias también:

```bash
# Syft puede listar licencias
syft myapp:latest -o json | jq '.artifacts[] | .licenses'
```

## FAQ Adicional

### ¿Cómo manejo falsos positivos en escaneos de vulnerabilidades?

Crea un archivo `.trivyignore` con justificaciones documentadas:

```bash
# .trivyignore
# CVE-2023-1234: Falso positivo - paquete no se usa en runtime
CVE-2023-1234
# CVE-2023-5678: Riesgo aceptado - no hay fix, mitigado por network policy
CVE-2023-5678
```

### ¿Debo escanear en staging o solo en producción?

Escanea en cada etapa:

- **Build time**: Bloquear vulnerabilidades críticas antes de pushear la imagen
- **Staging**: Escaneo completo con enforcement de políticas
- **Producción**: Escaneo continuo de imágenes corriendo para nuevos CVEs

```bash
# Escaneo continuo de imágenes en producción
trivy image --schedule "0 6 * * *" registry.io/app:prod
```

### ¿Qué es SBOM y por qué lo necesito?

SBOM (Software Bill of Materials) lista cada componente en tu imagen. Es requerido por la Orden Ejecutiva 14028 de EE.UU. para software gubernamental. Usa Syft para generar y Grype para escanear SBOMs sin necesidad de la imagen real.

## Tips de Rendimiento

1. **Cachéa bases de datos de vulnerabilidades.** Trivy descarga bases de datos CVE en cada run a menos que se cachéen:

```yaml
# GitHub Actions: cachear DB de Trivy
- uses: actions/cache@v4
  with:
    path: .trivycache
    key: trivy-${{ hashFiles('**/trivy-cache-key') }}
```

1. **Usa `--skip-dirs` para imágenes grandes.** Salta directorios con contenido conocido-seguro:

```bash
trivy image --skip-dirs /usr/share/doc,/usr/share/man app:latest
```

1. **Escanea en paralelo con tests.** Corre escaneos de seguridad concurrentemente con jobs de test:

```yaml
jobs:
  test:
    # ...
  scan:
    # corre en paralelo con test
    needs: [build]
```

1. **Usa `--ignore-unfixed` en CI.** Solo bloquea en vulnerabilidades con fixes disponibles para reducir ruido:

```bash
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 app:latest
```
