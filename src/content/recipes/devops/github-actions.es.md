---
contentType: recipes
slug: github-actions
title: "GitHub Actions CI/CD"
description: "Cómo construir y desplegar con GitHub Actions usando workflows, matrices, caching y secrets."
metaDescription: "Ejemplos prácticos de GitHub Actions para CI/CD. Aprende sintaxis de workflows, matrices de build, caching, secrets y workflows reutilizables."
difficulty: intermediate
topics:
  - devops
tags:
  - github-actions
  - ci-cd
  - devops
  - automation
  - yaml
  - testing
relatedResources:
  - /recipes/unit-testing
  - /recipes/docker-basics
  - /recipes/environment-variables
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Ejemplos prácticos de GitHub Actions para CI/CD. Aprende sintaxis de workflows, matrices de build, caching, secrets y workflows reutilizables."
  keywords:
    - github actions
    - ci-cd
    - workflow
    - yaml
    - automatización
    - build matrix
    - caching
    - secrets
---

## Visión general

GitHub Actions es una plataforma de CI/CD integrada en GitHub. Automatiza workflows de software desde testing hasta deployment usando pipelines definidos en YAML, activados por eventos de Git (push, PR, release).

## Cuándo usarlo

Usa esta recipe cuando:

- Ejecutas tests en cada pull request
- Construyes y pusheas imágenes Docker en release
- Despliegas a ambientes de staging o producción
- Haces chequeos de linting y formateo antes del merge
- Ejecutas tareas programadas (workflows basados en cron)

## Solución

### Workflow básico (Node.js CI)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### Build Matrix

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

### Deploy con Secrets

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying with token"
          curl -X POST https://api.deploy.com/release \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}"
```

### Caching de dependencias

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/cache@v4
    with:
      path: |
        ~/.npm
        node_modules
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
  - run: npm ci
```

## Mejores prácticas

- **Fija versiones de actions** usando full commit SHAs para seguridad de supply chain
- **Usa `npm ci`** en lugar de `npm install` en CI para builds reproducibles
- **Separa jobs**: Test, build y deploy como jobs separados con dependencias explícitas (`needs`)
- **Usa concurrency groups** para cancelar runs obsoletos cuando se hacen nuevos pushes
- **Almacena secrets en GitHub Secrets**, nunca hardcodees tokens en archivos de workflow
- **Usa reusable workflows** para lógica compartida entre múltiples repositorios

## Errores comunes

- Usar `actions/checkout` sin especificar un ref, causando issues de detached HEAD
- Ejecutar deployment en cada push en lugar de filtrar por branch o tag
- No cachear dependencias, causando builds lentos
- Usar `ubuntu-latest` cuando necesitas un OS específico para compilación nativa
- Olvidar setear `if: failure()` para steps de notificación en error

## Preguntas frecuentes

**P: ¿Cómo ejecuto un workflow manualmente?**
R: Agrega `workflow_dispatch:` al bloque `on:`. Puedes activarlo desde la pestaña Actions.

**P: ¿Puedo reusar workflows entre repositorios?**
R: Sí. Crea un workflow en un repositorio y llámalo desde otros usando `uses: org/repo/.github/workflows/reusable.yml@main`.

**P: ¿Cómo debuggeo un workflow que falla?**
R: Usa la action `tmate` para debugging SSH, o agrega `set -x` en steps de shell para output verbose.
