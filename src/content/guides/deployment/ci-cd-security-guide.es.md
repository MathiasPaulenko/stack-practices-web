---
contentType: guides
slug: ci-cd-security-guide
title: "Seguridad CI/CD: Fortalece tus Pipelines y Previene Ataques de Supply Chain"
description: "Guía práctica para asegurar pipelines CI/CD: gestión de secretos, runners de mínimo privilegio, firma de artefactos, escaneo de dependencias y defensa contra ataques de supply chain."
metaDescription: "Aprende seguridad CI/CD: gestión de secretos, runners de mínimo privilegio, firma de artefactos, escaneo de dependencias y prevención de supply chain."
difficulty: intermediate
topics:
  - devops
  - security
  - infrastructure
tags:
  - ci-cd
  - seguridad
  - pipelines
  - gestion-secretos
  - supply-chain
  - escaneo-dependencias
  - hardening
  - guia
relatedResources:
  - /guides/security/zero-trust-architecture-guide
  - /guides/security/api-security-checklist-guide
  - /guides/devops/sre-practices-guide
  - /guides/devops/platform-engineering-guide
  - /guides/planning/disaster-recovery-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende seguridad CI/CD: gestión de secretos, runners de mínimo privilegio, firma de artefactos, escaneo de dependencias y prevención de supply chain."
  keywords:
    - ci-cd
    - seguridad
    - pipelines
    - gestion-secretos
    - supply-chain
    - escaneo-dependencias
    - hardening
    - guia
---

## Overview

Los pipelines CI/CD son objetivos de alto valor para ataques. Tienen acceso a código fuente, secretos, entornos de producción y credenciales de despliegue. Un pipeline comprometido puede llevar a inyección de código, brechas de datos y ataques de supply chain que afectan a cada consumidor downstream.

A continuación: técnicas prácticas para fortalecer tu infraestructura CI/CD desde el origen hasta el despliegue.

## When to Use

- Manejas pipelines CI/CD que despliegan a producción
- Quieres reducir el radio de explosión de un sistema de build comprometido
- Necesitas cumplir con estándares de seguridad (SOC 2, ISO 27001, FedRAMP)
- Has experimentado o quieres prevenir ataques de supply chain
- Estás migrando de runners auto-hospedados a CI/CD cloud-native

## Core Concepts

| Concepto | Descripción |
|----------|-------------|
| Ataque de Supply Chain | Inyectar código malicioso vía dependencias o herramientas de build comprometidas |
| Runner de Mínimo Privilegio | Agentes de build con acceso mínimo a secretos e infraestructura |
| Firma de Artefactos | Verificar criptográficamente que artefactos construidos vinieron de un pipeline de confianza |
| Escaneo de Dependencias | Detectar automáticamente vulnerabilidades conocidas en librerías |
| Pipeline as Code | Definiciones de CI/CD versionadas que enforced políticas de seguridad |
| SBOM (Software Bill of Materials) | Inventario de todos los componentes usados en una aplicación |

## Step-by-Step CI/CD Security Hardening

### 1. Securizar Configuración de Pipeline

Trata tus definiciones de pipeline como código de producción:

```yaml
# Ejemplo: Hardening de GitHub Actions
name: Secure Build
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Permisos mínimos por defecto
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Fijar actions a hashes de commit específicos
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      # Usar OIDC para autenticación cloud en lugar de secretos de larga duración
      - name: Authenticate to AWS
        uses: aws-actions/configure-aws-credentials@e3dd6a429a4c6c8c8f55e0e0b9e8e8e8e8e8e8e8  # v4.0.2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/CICD-Build-Role
          aws-region: us-east-1

      # Verificar dependencias antes de instalar
      - name: Install dependencies
        run: |
          npm ci --ignore-scripts  # Omitir scripts post-instalación
          npm audit --audit-level=moderate
```

**Checklist de seguridad para definiciones de pipeline:**
- Fijar todas las actions de terceros a SHA de commit, no a tags de versión
- Usar bloques `permissions:` con scopes mínimos requeridos
- Nunca ejecutar CI en `pull_request_target` de forks no confiables
- Deshabilitar ejecución de scripts durante instalación de dependencias (`--ignore-scripts`)
- Usar reglas de protección de branch para prevenir pushes directos a main

### 2. Gestión de Secretos

Los secretos en CI/CD son un vector de ataque común:

```bash
# MALO: Secretos hardcodeados en archivos de pipeline
# AWS_SECRET_ACCESS_KEY=AKIA...  # NUNCA HAGAS ESTO

# BUENO: Usar gestión nativa de secretos
# GitHub Actions: secretos almacenados en settings del repositorio
# GitLab CI: variables CI/CD con flag masked
# Azure DevOps: Variable groups con tipo secret

# MEJOR: Usar OIDC para eliminar secretos de larga duración por completo
# AWS: configure-aws-credentials con role-to-assume
# GCP: workload identity federation
# Azure: managed identity + federated credentials
```

**Secretos: lo que funciona**
- Rotar secretos automáticamente (cada 30-90 días)
- Usar tokens de corta duración (TTL 1 hora) donde sea posible
- Scopear secretos a etapas específicas de job, no al pipeline global
- Auditar logs de acceso a secretos regularmente
- Nunca loggear secretos (la mayoría de CI systems los enmascaran automáticamente)

### 3. Hardening de Runners

Tus agentes de build son tan críticos como servidores de producción:

| Estrategia | Descripción | Implementación |
|------------|-------------|----------------|
| Runners efímeros | VM fresca para cada build | GitHub-hosted, GitLab SaaS runners |
| Aislamiento de red | Restringir egress de runner | VPC, subnets privadas, sin internet |
| Mínimo privilegio | Roles IAM mínimos | Roles separados por pipeline/proyecto |
| Imágenes inmutables | Imágenes de runner pre-hardened | Packer, custom AMI/Golden Image |
| Sin secretos en disco | Credenciales solo en memoria | Mounts tmpfs, inyección de secretos |

```bash
# Ejemplo: Checklist de hardening de runner auto-hospedado
# 1. Ejecutar en VPC aislado sin egress a internet
# 2. Usar pools de runner separados por equipo/aplicación
# 3. Deshabilitar acceso sudo/root para usuario runner
# 4. Montar /tmp como noexec, nodev, nosuid
# 5. Ejecutar builds de contenedor en podman/docker rootless
# 6. Limpiar workspace entre jobs (no reusar)
# 7. Escanear imágenes de runner semanalmente por CVEs
```

### 4. Seguridad de Dependencias y Artefactos

Tus dependencias son tu eslabón más débil:

```yaml
# Ejemplo: Pipeline de escaneo de dependencias en GitHub Actions
jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      # SAST (Static Application Security Testing)
      - name: Run CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript, python
      - uses: github/codeql-action/analyze@v3

      # Escaneo de vulnerabilidades en dependencias
      - name: Run Dependabot (habilitado en settings del repo)
      # O usar Snyk/OWASP Dependency-Check

      # Escanear imagen de contenedor
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
```

**Prácticas de seguridad de artefactos:**
- Firmar todos los artefactos (cosign, Notary, Sigstore)
- Generar y publicar SBOMs para cada release
- Escanear imágenes de contenedor antes de push al registry
- Verificar firmas de artefactos antes de despliegue
- Almacenar artefactos en registries inmutables con políticas de retención

### 5. Seguridad de Despliegue

El paso final debe ser tan seguro como el primero:

```bash
# Ejemplo: Script de despliegue seguro
#!/bin/bash
set -euo pipefail

# 1. Verificar firma de artefacto
cosign verify \
  --key cosign.pub \
  --signature artifact.sig \
  myapp:${DEPLOY_VERSION}

# 2. Verificar que SBOM coincide con componentes esperados
sbom-diff expected.sbom generated.sbom

# 3. Ejecutar smoke tests antes de shift de tráfico
./smoke-tests.sh --target staging

# 4. Desplegar con rollback automático en falla
./deploy.sh --version ${DEPLOY_VERSION} --rollback-on-failure

# 5. Verificar salud del despliegue
./health-check.sh --target production
```

**Reglas de seguridad de despliegue:**
- Requerir aprobación manual para despliegues a producción
- Implementar rollback automatizado en falla de health check
- Usar blue-green o canary deployments para limitar radio de explosión
- Loggear todos los eventos de despliegue a traza de auditoría inmutable
- Separar credenciales de despliegue de staging y producción

## Lo que funciona

- Asume que tu pipeline será comprometida. Diseña para contención, no solo prevención.
- Usa infraestructura efímera. Runners frescos previenen malware persistente.
- Verifica todo. Firmas, SBOMs y checksums deben ser mandatorios.
- Minimiza permisos de pipeline. Si un job solo necesita acceso de lectura, enforzalo.
- Monitorea comportamiento de pipeline. Alerta en conexiones outbound inesperadas o uso de credenciales.
- Practica respuesta a incidentes. Ten un plan para rotar todos los secretos después de un compromiso.

## Common Mistakes

- Usar secretos de larga duración en CI. Migrar a OIDC o tokens de corta duración.
- Ejecutar CI en runners auto-hospedados sin hardening. Frecuentemente tienen acceso de red más amplio que producción.
- Confiar en workflows `pull_request_target`. Estos ejecutan con tokens de escritura en código no confiable.
- No escanear dependencias. CVEs conocidas en dependencias son el vector de ataque más común.
- Ignorar CVEs en imágenes base de contenedor. Empieza con imágenes base mínimas y hardened.

## Variants

- Seguridad en GitHub Actions: Enfocarse en `permissions`, `pull_request` vs `pull_request_target`, OIDC, Dependabot
- Seguridad en GitLab CI: Variables CI/CD, permisos de jobs, tags de runner, escaneo de contenedores
- Seguridad en Jenkins: Aislamiento de agentes, scopes de credenciales, shared libraries de pipeline
- Cloud-native: Usar servicios de build administrados (AWS CodeBuild, Google Cloud Build) con integración IAM

## FAQ

### ¿Cómo migro de secretos de larga duración a OIDC?

Configura workload identity federation en tu proveedor cloud, luego actualiza `configure-aws-credentials` (o equivalente) para usar `role-to-assume` sin access keys.

### ¿Debería usar runners auto-hospedados o cloud-hosted?

Los runners cloud-hosted son efímeros y aislados por defecto. Los runners auto-hospedados requieren hardening pero ofrecen más control y builds más rápidos con caching.

### ¿Cómo prevengo ataques de dependency confusion?

Usa registries privadas con reserva de namespace, verifica firmas de paquetes, y fija versiones exactas con lock files.

### ¿Cuál es la configuración mínima viable de seguridad CI/CD?

Habilitar Dependabot, usar OIDC para auth cloud, fijar versiones de actions, habilitar protección de branch, y escanear contenedores antes de despliegue.

## Conclusion

La seguridad CI/CD es un proceso continuo, no una tarea de hardening de una sola vez. Cada componente, desde la imagen del runner hasta el script de despliegue, es una superficie de ataque potencial. Aplica defensa en profundidad, verifica cada artefacto, y asume que el compromiso ocurrirá.


## Temas Avanzados

### Escenario: Pipeline CI/CD Seguro para Microservicios

```yaml
# GitHub Actions: build, scan, sign, deploy
name: Secure CI/CD
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write  # OIDC para AWS

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # para analisis de diff

      - name: Build container
        id: build
        run: |
          docker build -t app:${{ github.sha }} .
          echo "image=app:${{ github.sha }}" >> $GITHUB_OUTPUT

      - name: Scan con Trivy
        run: |
          trivy image --exit-code 1 --severity HIGH,CRITICAL \
            app:${{ github.sha }}
          # Falla el build si hay vulnerabilidades HIGH/CRITICAL

      - name: Sign con cosign
        env:
          COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_KEY }}
        run: |
          cosign sign --key env://COSIGN_PRIVATE_KEY \
            registry.example.com/app:${{ github.sha }}

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SAST con Semgrep
        run: semgrep ci --config=p/owasp-top-ten

      - name: Dependency scan
        run: |
          npm audit --audit-level=high
          # Verifica lock file contra advisory DB

      - name: Secret scanning
        run: trivy fs --scanners secret .

  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Auth AWS con OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123:role/github-actions
          aws-region: us-east-1
          # Sin secrets de AWS: OIDC token exchange

      - name: Deploy con verificacion
        run: |
          # Verificar firma del container
          cosign verify --key cosign.pub \
            registry.example.com/app:${{ github.sha }}
          # Deploy solo si la firma es valida
          kubectl set image deployment/app \
            container=registry.example.com/app:${{ github.sha }}
          kubectl rollout status deployment/app --timeout=5m

Controles de seguridad:
  | Control | Herramienta | Frecuencia |
  |---------|------------|------------|
  | SAST | Semgrep | Cada push |
  | SCA | npm audit | Cada push |
  | Container scan | Trivy | Cada build |
  | Secret scan | Trivy secret | Cada push |
  | Image signing | cosign | Cada build |
  | OIDC auth | AWS IAM | Cada deploy |
  | Branch protection | GitHub | Siempre |
  | CodeQL | GitHub Advanced | Semanal |

Lecciones:
  - OIDC elimina secrets de larga duracion en CI/CD
  - Image signing previene supply chain attacks
  - Scan en cada push, no solo en PRs
  - Branch protection es la primera linea de defensa
  - Falla el build en HIGH/CRITICAL, no en LOW
```

### Como manejo secrets en CI/CD?

Usa OIDC para auth cloud (sin secrets). Para otros secrets, usa el secret store del CI (GitHub Secrets, GitLab CI Variables). Nunca hardcodees secrets en YAML. Rota secrets regularmente. Usa referencias dinamicas cuando sea posible (e.g., AWS Secrets Manager en runtime, no en build time).
