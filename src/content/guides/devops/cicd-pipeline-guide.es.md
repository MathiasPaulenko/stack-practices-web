---
contentType: guides
slug: cicd-pipeline-guide
title: "Guía de Pipelines CI/CD"
description: "Una guía práctica para construir pipelines CI/CD con GitHub Actions, testing, estrategias de deployment y procedimientos de rollback."
metaDescription: "Aprende a construir pipelines CI/CD robustos: workflows de GitHub Actions, testing automatizado, estrategias de deployment y rollbacks en producción."
difficulty: intermediate
topics:
  - devops
  - testing
tags:
  - cicd
  - github-actions
  - devops
  - deployment
  - automation
  - pipeline
  - testing
relatedResources:
  - /recipes/devops/github-actions
  - /guides/testing/testing-strategy-guide
  - /docs/templates/runbook-template
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a construir pipelines CI/CD robustos: workflows de GitHub Actions, testing automatizado, estrategias de deployment y rollbacks en producción."
  keywords:
    - cicd pipeline
    - github actions
    - integración continua
    - deployment continuo
    - pipeline devops
    - testing automatizado
---

## Overview

CI/CD (Continuous Integration / Continuous Deployment) es la columna vertebral de la entrega de software moderna. Esta guía cubre la construcción de pipelines que testean, compilan y despliegan código de manera confiable.

## When to Use

- Despliegas código más de una vez por semana
- Múltiples desarrolladores trabajan en el mismo codebase
- Necesitas confianza de que los cambios no romperán producción
- Quieres reducir errores de deployment manual

## Core Concepts

### Continuous Integration (CI)

Compila y testea código automáticamente en cada commit.

### Continuous Deployment (CD)

Despliega automáticamente código validado a producción.

### Etapas del pipeline

| Etapa | Propósito | Herramientas típicas |
| ----- | --------- | -------------------- |
| Lint | Calidad de código | ESLint, Prettier, Black, SonarQube |
| Test | Verificar comportamiento | Jest, pytest, JUnit, Vitest |
| Build | Crear artefactos | Docker, Vite, Webpack, Maven |
| Security | Escanear vulnerabilidades | Trivy, Snyk, OWASP ZAP |
| Deploy | Liberar a ambiente | GitHub Actions, ArgoCD, Terraform |

## Solution: Un Pipeline GitHub Actions listo para producción

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh production
```

## Estrategias de deployment

### 1. Rolling Deployment

Reemplaza gradualmente instancias viejas con nuevas.

**Pros**: Cero downtime, simple.
**Contras**: El rollback toma tiempo, problemas de coexistencia de versiones.

### 2. Blue-Green Deployment

Mantiene dos ambientes idénticos; cambia el tráfico instantáneamente.

**Pros**: Rollback instantáneo, cero downtime.
**Contras**: Doble costo de infraestructura.

### 3. Canary Deployment

Libera primero a un pequeño subconjunto de usuarios.

**Pros**: Mitigación de riesgo, monitoreo con usuarios reales.
**Contras**: Enrutamiento complejo, deployment más largo.

## Procedimientos de rollback

### Triggers de rollback automático

- Tasa de error excede umbral (ej. >1%)
- Latencia p99 excede umbral (ej. >500ms)
- Health check crítico falla
- Aprobación manual no recibida dentro del timeout

### Comandos de rollback

```bash
# Rollback de Kubernetes
kubectl rollout undo deployment/my-app

# Git revert
git revert HEAD
```

## Best Practices

- **Fallar rápido**: Ejecuta los checks más rápidos (lint, unit tests) primero
- **Paralelizar**: Ejecuta jobs independientes en paralelo
- **Usa environments**: Requiere aprobaciones para producción
- **Cachea agresivamente**: Cachea dependencias y artefactos de build
- **Almacena artefactos**: Guarda outputs de build para trazabilidad
- **Notifica fallas**: Alerta al equipo inmediatamente cuando falle el pipeline

## Anti-Patterns

- Desplegar sin tests
- Usar el mismo pipeline para todos los ambientes
- Pasos manuales en el proceso de deployment
- Sin plan de rollback
- Ignorar fallas del pipeline

## Gestión de ambientes

Un pipeline bien estructurado trata los ambientes como ganado, no como mascotas. Cada ambiente debería crearse desde el mismo código de infraestructura.

### Matriz de ambientes

| Ambiente | Propósito | Datos | Acceso |
|----------|-----------|-------|--------|
| **Local** | Iteración del desarrollador | Sintéticos / sembrados | Solo desarrollador |
| **CI** | Testing automatizado | Datos de test efímeros | Cuenta de servicio CI |
| **Staging** | Validación pre-producción | Snapshot anonimizado de producción | Team leads |
| **Producción** | Usuarios reales | Datos reales de usuarios | Ingenieros on-call |

### Configuración por ambiente

Usa archivos de configuración específicos por ambiente o variables en lugar de lógica de pipeline ramificada:

```bash
# .env.local
DATABASE_URL=postgres://localhost/dev_db
LOG_LEVEL=debug

# .env.staging
DATABASE_URL=postgres://staging.internal/staging_db
LOG_LEVEL=info

# .env.production
DATABASE_URL=postgres://prod.internal/prod_db
LOG_LEVEL=warn
```

**Nunca commitees secretos a Git.** Usa gestores de secretos (AWS Secrets Manager, HashiCorp Vault, GitHub Secrets) e inyéctalos en runtime.

### Migraciones de base de datos en CI/CD

Ejecuta migraciones como un job separado del pipeline, no dentro del startup de la aplicación:

1. **Antes del deploy**: Ejecuta migraciones contra el ambiente objetivo
2. **Verifica**: Ejecuta un health check confirmando que la versión del schema coincide con la expectativa de la app
3. **Despliega**: Solo procede si la migración tiene éxito
4. **Plan de rollback**: Ten un script de downgrade listo para la versión anterior del schema

## Monitoreo y observabilidad

Un pipeline sin observabilidad es volar a ciegas. Integra estos checks:

- **Tests sintéticos** después del deploy a producción (ping a endpoints críticos)
- **Línea base de tasa de error**: Compara la tasa de error post-deploy contra la pre-deploy
- **Regresión de rendimiento**: Alerta si la latencia p95 aumenta > 20%
- **Smoke tests**: Ejecuta un test mínimo de happy-path inmediatamente después del deployment

## FAQ

**Q: ¿Cuánto debería tardar un pipeline de CI?**
A: Apunta a menos de 10 minutos para feedback. Menos de 5 minutos es ideal.

**Q: ¿Debería desplegar en cada commit?**
A: Sí, si tus tests y monitoreo son robustos. De lo contrario, despliega en merge a main.

**Q: ¿Cuál es la diferencia entre Continuous Delivery y Continuous Deployment?**
A: Continuous Delivery significa que el código siempre está desplegable; un humano aprueba el release. Continuous Deployment significa que cada cambio validado va a producción automáticamente.

**Q: ¿Cómo manejo cambios de schema de base de datos en CI/CD?**
A: Ejecuta migraciones antes del deployment, haz cambios retrocompatibles cuando sea posible, y ten scripts de rollback listos. Nunca elimines columnas en el mismo deploy que deja de leerlas.

**Q: ¿Qué debería hacer cuando un deployment a producción falla?**
A: Sigue este orden: 1) Alerta al equipo on-call, 2) Evalúa si se necesita rollback, 3) Ejecuta rollback o forward-fix, 4) Documenta el incidente, 5) Realiza un post-mortem en 48 horas.
