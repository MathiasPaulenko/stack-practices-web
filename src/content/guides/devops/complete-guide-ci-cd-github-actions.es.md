---
contentType: guides
slug: complete-guide-ci-cd-github-actions
title: "Guía Completa de CI/CD con GitHub Actions"
description: "Construye pipelines CI/CD desde cero con GitHub Actions. Cubre workflows, runners, matrix builds, caching, secrets, environments, deployment strategies y reusable workflows."
metaDescription: "Guía completa de CI/CD con GitHub Actions. Construye pipelines desde cero. Master workflows, runners, matrix builds, caching, secrets, environments y deployments."
difficulty: intermediate
topics:
  - devops
  - testing
tags:
  - github-actions
  - ci-cd
  - continuous-integration
  - continuous-deployment
  - pipelines
  - automation
  - guide
  - devops
relatedResources:
  - /guides/devops/deployment-strategies-guide
  - /guides/devops/complete-guide-gitops-argocd
  - /guides/testing/contributing-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía completa de CI/CD con GitHub Actions. Construye pipelines desde cero. Master workflows, runners, matrix builds, caching, secrets, environments y deployments."
  keywords:
    - github actions
    - ci cd
    - continuous integration
    - continuous deployment
    - github workflows
    - pipeline automation
    - reusable workflows
---

# Guía Completa de CI/CD con GitHub Actions

## Introducción

GitHub Actions es la plataforma CI/CD built-in de GitHub. Te permite automatizar build, test y deployment directamente desde tu repositorio. Esta guía cubre sintaxis de workflows, runners, matrix builds, caching, secrets, environments, deployment strategies y reusable workflows.

## Básicos de Workflows

### Workflow de CI simple

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

### Triggers

```yaml
on:
  push:
    branches: [main]
    paths:
      - "src/**"
      - "tests/**"
      - ".github/workflows/**"
  pull_request:
    types: [opened, synchronize, reopened]
  schedule:
    - cron: "0 2 * * *"  # Daily at 2 AM UTC
  workflow_dispatch:       # Manual trigger
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: staging
        type: choice
        options:
          - staging
          - production
  release:
    types: [published]
```

## Runners

### GitHub-hosted runners

```yaml
jobs:
  test:
    runs-on: ubuntu-latest    # 4 CPU, 16GB RAM, 14GB SSD
  build:
    runs-on: ubuntu-22.04     # Pin a versión específica
  macos:
    runs-on: macos-latest     # macOS para iOS builds
  windows:
    runs-on: windows-latest   # Windows para .NET builds
```

### Larger runners (GitHub Enterprise)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest-large  # 16 CPU, 64GB RAM
```

### Self-hosted runners

```yaml
jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh
```

## Matrix Builds

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, macos-latest, windows-latest]
        exclude:
          - os: macos-latest
            node-version: 18
        include:
          - node-version: 20
            os: ubuntu-latest
            experimental: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### Fail-fast vs continue-on-error

```yaml
strategy:
  fail-fast: false          # No cancelar otros matrix jobs en failure
  max-parallel: 4           # Limitar jobs concurrentes
```

## Caching

### npm cache (built-in)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm              # Automáticamente cachea ~/.npm
```

### Custom cache

```yaml
- name: Cache build output
  uses: actions/cache@v4
  with:
    path: |
      dist/
      .cache/
    key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-build-
```

### Docker layer caching

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and cache
  uses: docker/build-push-action@v5
  with:
    context: .
    push: false
    tags: myapp:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Secrets y Variables

### Repository secrets

```yaml
steps:
  - name: Deploy to production
    env:
      API_KEY: ${{ secrets.API_KEY }}
      DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    run: ./deploy.sh
```

### Environment secrets

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production    # Requiere approval
    steps:
      - name: Deploy
        env:
          PROD_TOKEN: ${{ secrets.PROD_TOKEN }}
        run: ./deploy.sh
```

### Variables (non-secret)

```yaml
steps:
  - name: Use variable
    env:
      API_URL: ${{ vars.API_URL }}
    run: echo "Deploying to $API_URL"
```

### Masked outputs

```yaml
- name: Generate token
  id: token
  run: echo "value=$(openssl rand -hex 32)" >> $GITHUB_OUTPUT

- name: Use token
  env:
    TOKEN: ${{ steps.token.outputs.value }}
  run: |
    echo "::add-mask::$TOKEN"
    curl -H "Authorization: Bearer $TOKEN" https://api.example.com
```

## Environments y Deployments

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh production
```

### Required reviewers

Configurar en GitHub: Settings → Environments → production → Required reviewers. El workflow pausa hasta el approval.

## Job Dependencies

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  test:
    needs: lint              # Esperar que lint pase
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  build:
    needs: [lint, test]      # Esperar ambos
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'  # Solo en main
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

## Reusable Workflows

### Definir un reusable workflow

```yaml
# .github/workflows/test-suite.yml
name: Test Suite

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: number
        default: 20
    secrets:
      API_KEY:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
        env:
          API_KEY: ${{ secrets.API_KEY }}
```

### Llamar un reusable workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]

jobs:
  test:
    uses: ./.github/workflows/test-suite.yml
    with:
      node-version: 22
    secrets:
      API_KEY: ${{ secrets.API_KEY }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

## Conditional Execution

```yaml
steps:
  - name: Only on main
    if: github.ref == 'refs/heads/main'
    run: ./deploy.sh

  - name: Only on PRs
    if: github.event_name == 'pull_request'
    run: npm run test:e2e

  - name: Skip on docs change
    if: !contains(github.event.head_commit.message, '[skip ci]')
    run: npm test

  - name: On failure
    if: failure()
    run: ./notify-slack.sh

  - name: Always run (cleanup)
    if: always()
    run: ./cleanup.sh
```

## Docker Build y Push

```yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Pautas

- **Pinear versions de actions** — usar `@v4` no `@main` para evitar supply chain attacks
- **Usar `npm ci` no `npm install`** — installs determinísticos desde lockfile
- **Cachear dependencies** — ahorra 30-60s por job
- **Usar environments para deployments** — approvals requeridos para producción
- **Setear `concurrency` groups** — cancelar runs outdated en la misma branch
- **Usar reusable workflows** — DRY tu pipeline across repositorios
- **Minimizar scope de secrets** — usar environment secrets sobre repository secrets
- **Usar `permissions` key** — restringir GITHUB_TOKEN al mínimo necesario
- **Correr tests en paralelo** — splitir test suites across matrix jobs
- **Usar `if: always()` para cleanup** — asegurar que los resources se limpien
- **Taggear Docker images con SHA** — tracear deployments a commits
- **Usar path filters** — skipar workflows cuando solo cambian docs

## Errores Comunes

- No pinear versions de actions — `@main` puede introducir breaking changes o código malicioso
- Usar `npm install` en lugar de `npm ci` — builds no determinísticos
- No setear `concurrency` — múltiples runs desperdician minutes y race en deployments
- Overusar `secrets.GITHUB_TOKEN` — tiene permissions broad por default
- No usar `environment` para production deploys — sin approval gate
- Hardcodear secrets en workflow files — son visibles en la UI
- No cachear dependencies — builds lentos desperdician Actions minutes
- Correr todo en cada push — usar path filters para skipar workflows irrelevantes
- No usar `if: failure()` para notifications — failures pasan desapercibidos
- No testear workflows localmente — usar `act` para correr workflows antes de pushear

## Preguntas Frecuentes

### ¿Cómo corro GitHub Actions localmente?

Usar [act](https://github.com/nektos/act) — corre workflows en Docker containers localmente:

```bash
# Instalar act
brew install act

# Correr un workflow específico
act -W .github/workflows/ci.yml

# Correr con secrets
act -W .github/workflows/ci.yml --secret-file .secrets
```

### ¿Cómo comparto workflows across repositorios?

Crear un reusable workflow en un repositorio central, luego llamarlo con `uses: org/repo/.github/workflows/ci.yml@main`. Esto te permite mantener una definición de workflow usada por todos los repositorios en tu organización.

### ¿Cómo debuggeo un workflow que falla?

1. Habilitar step debug logging: setear `ACTIONS_STEP_DEBUG=true` como repository secret
2. Habilitar runner diagnostic logging: setear `ACTIONS_RUNNER_DEBUG=true`
3. Usar `tmate` session para debugging interactivo:

```yaml
- name: Debug
  uses: mxschmitt/action-tmate@v3
  if: failure()
  timeout-minutes: 30
```
