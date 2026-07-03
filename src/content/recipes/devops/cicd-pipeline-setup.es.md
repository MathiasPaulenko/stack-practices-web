---
contentType: recipes
slug: cicd-pipeline-setup
title: "Configuración de Pipelines CI/CD"
description: "Configura pipelines CI/CD automatizados para testing, building y deployment de aplicaciones con GitHub Actions y lo que funciona."
metaDescription: "Configuración de pipelines CI/CD con GitHub Actions: testing automatizado, building, deployment, gestión de ambientes y lo que funciona de seguridad."
difficulty: beginner
topics:
  - devops
tags:
  - ci-cd
  - devops
  - github-actions
  - automation
  - deployment
relatedResources:
  - /guides/cicd-pipeline-guide
  - /recipes/github-actions
  - /recipes/bash-scripting-automation
  - /recipes/cron-jobs
  - /docs/api-status-page-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Configuración de pipelines CI/CD con GitHub Actions: testing automatizado, building, deployment, gestión de ambientes y lo que funciona de seguridad."
  keywords:
    - ci-cd
    - devops
    - github-actions
    - automation
---
## Visión General

Continuous Integration y Continuous Deployment (CI/CD) automatizan el viaje desde el commit de código hasta el deploy en producción. Un pipeline bien configurado ejecuta tests, construye artifacts, escanea vulnerabilidades y despliega a staging o producción sin intervención manual. Esto elimina errores humanos, acelera releases y provee feedback rápido a los desarrolladores.

## Cuándo Usar

Usa este recurso cuando:
- configures un nuevo proyecto y quieras testing automatizado desde el día uno. Consulta [Unit Testing](/recipes/testing/unit-testing) para fundamentos de testing.
- Migres de deploys manuales a releases automatizados. Consulta [GitHub Actions](/recipes/devops/github-actions) para automatización de workflows.
- Agregues scanning de seguridad, linting o gates de calidad de código a tu workflow. Consulta [Container Security Scanning](/recipes/devops/container-security-scanning) para gates de seguridad en CI.
- Construyas una estrategia de deploy multi-ambiente (dev → staging → prod). Consulta [Blue-Green Deployment](/recipes/devops/blue-green-deployment) para releases sin downtime.

## Solución

### Workflow de GitHub Actions

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
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          npm run build
          npm run deploy:staging
```

### Configuración de GitLab CI

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run test:ci

deploy_prod:
  stage: deploy
  script:
    - npm run deploy:production
  only:
    - main
  environment:
    name: production
    url: https://api.example.com
```

## Explicación

Un pipeline de CI/CD de producción típicamente incluye:

1. **Trigger**: Push, pull request o job programado por cron
2. **Build**: Compila, bundlea y crea artifacts
3. **Test**: Tests unitarios, tests de integración, linting, type checking
4. **Seguridad**: Auditoría de dependencias, SAST, escaneo de secretos
5. **Deploy**: Push a staging, smoke tests, promoción a producción
6. **Notificación**: Slack, email o sistema de incident management

**Estrategias de deploy**:
- **Básico**: Deploy directo a producción
- **Blue-Green**: Dos ambientes idénticos; switch de tráfico instantáneo
- **Canary**: Rutea 1% de tráfico a nueva versión; incrementa gradualmente
- **Rolling**: Reemplaza instancias una a una con zero downtime

## Variantes

| Plataforma | Ideal Para | Notas |
|------------|------------|-------|
| GitHub Actions | Open source, repos GitHub | Gratis para repos públicos; marketplace de actions |
| GitLab CI | Proyectos GitLab-hosted | Built-in; excelente para monorepos |
| CircleCI | Testing paralelo rápido | Excelente soporte de Docker |
| Jenkins | On-premise, plugins custom | Self-hosted; alto mantenimiento |
| ArgoCD | Kubernetes GitOps | Declarativo; sincroniza cluster con estado Git |

## Lo que funciona

- **Fail fast**: Ejecuta linting y tests unitarios rápidos antes de tests de integración costosos
- **Paraleliza jobs**: Divide tests por archivo o módulo para reducir tiempo wall-clock
- **Cachea dependencias**: Cachea node_modules, pip cache y capas Docker entre ejecuciones
- **Usa secrets management**: Nunca commitees API keys; usa secrets de GitHub/GitLab o Vault
- **Requiere reviews para prod**: Usa branch protection y CODEOWNERS

## Errores Comunes

1. **Sin promoción de artifacts**: Reconstruir en cada stage introduce no-determinismo
2. **Testear solo en CI**: Los desarrolladores hacen push de código roto y esperan feedback de CI
3. **Secrets en variables de entorno**: Visibles en logs de jobs; usa secrets enmascarados
4. **Sin plan de rollback**: Deploys fallidos necesitan revert instantáneo vía blue-green o imagen anterior
5. **Ignorar tests flaky**: Fallos aleatorios erosionan la confianza en el pipeline

## Preguntas Frecuentes

**P: ¿Debería deployar en cada commit a main?**
R: Sí para staging. Para producción, usa un gate manual o deploy en releases taggeados.

**P: ¿Cómo manejo migraciones de base de datos en CI/CD?**
R: Ejecuta migraciones en un job separado antes del deploy. Usa migraciones backward-compatible para evitar downtime.

**P: ¿Puedo usar el mismo pipeline para microservicios?**
R: Sí, pero usa triggers basados en paths para que solo los servicios afectados se construyan y desplieguen. Herramientas de monorepo (Nx, Turborepo) ayudan.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
