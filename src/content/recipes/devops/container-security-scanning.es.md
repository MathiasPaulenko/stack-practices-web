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
  - /recipes/devops/docker-multi-stage-build-optimization
  - /recipes/security/sql-injection-prevention
  - /guides/devops/docker-for-developers-guide
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
