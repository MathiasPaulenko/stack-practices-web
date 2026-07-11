---
contentType: guides
slug: complete-guide-github-actions-ci-cd
title: "Guía Completa de GitHub Actions CI/CD: Workflows, Runners, Secrets"
description: "Dominá GitHub Actions para CI/CD: workflows, reusable workflows, composite actions, secrets management, runners, matrix builds, caching y deployment patterns."
metaDescription: "Dominá GitHub Actions para CI/CD: workflows, reusable workflows, composite actions, secrets, runners, matrix builds, caching y deployment patterns."
difficulty: intermediate
topics:
  - devops
tags:
  - guide
  - github-actions
  - ci-cd
  - workflows
  - automation
  - deployment
relatedResources:
  - /guides/devops/complete-guide-helm-charts-production
  - /guides/devops/complete-guide-docker-compose-local-dev
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Dominá GitHub Actions para CI/CD: workflows, reusable workflows, composite actions, secrets, runners, matrix builds, caching y deployment patterns."
  keywords:
    - github actions
    - ci cd
    - workflows
    - reusable workflows
    - composite actions
    - secrets management
    - runners
    - matrix builds
---

## Introducción

GitHub Actions automatiza CI/CD pipelines directamente en GitHub repositories. Definís workflows en YAML que triggeréan en events (push, pull request, schedule), runnéan jobs en runners, y chainéan steps together. A continuación: workflow syntax, reusable workflows, composite actions, secrets management, self-hosted runners, matrix builds, caching y deployment patterns.

## Workflow Basics

### Simple CI workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

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

      - run: npm run test:unit

      - run: npm run test:integration

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
```

### Workflow syntax reference

```yaml
name: Full CI Example

on:
  push:
    branches: [main]
    tags: ['v*']
    paths:
      - 'src/**'
      - 'tests/**'
      - '.github/workflows/**'
  pull_request:
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '0 2 * * 1'  # Weekly Monday 2 AM
  workflow_dispatch:       # Manual trigger
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options: ['staging', 'production']

env:
  NODE_VERSION: '20'
  JAVA_VERSION: '21'

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    if: github.event_name != 'pull_request' || github.event.pull_request.draft == false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history para changelog generation

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - run: npm ci
      - run: npm run build
```

## Matrix Builds

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # No cancelees other jobs on failure
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: ['18', '20', '22']
        exclude:
          - os: macos-latest
            node-version: '18'  # Skipá macOS + Node 18
        include:
          - os: ubuntu-latest
            node-version: '20'
            experimental: true

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

## Reusable Workflows

### Definí un reusable workflow

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '20'
      run-integration:
        required: false
        type: boolean
        default: false
    secrets:
      DB_PASSWORD:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
        if: ${{ inputs.run-integration }}
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

### Calléa un reusable workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20'
      run-integration: true
    secrets:
      DB_PASSWORD: ${{ secrets.DB_PASSWORD }}

  lint:
    uses: ./.github/workflows/reusable-lint.yml

  deploy:
    needs: [test, lint]
    if: github.ref == 'refs/heads/main'
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
    secrets: inherit
```

## Composite Actions

### Creá un composite action

```yaml
# .github/actions/setup-and-test/action.yml
name: 'Setup and Test'
description: 'Install deps and run tests'

inputs:
  node-version:
    required: false
    default: '20'
  test-command:
    required: false
    default: 'npm test'

runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}

    - name: Install dependencies
      shell: bash
      run: npm ci

    - name: Run tests
      shell: bash
      run: ${{ inputs.test-command }}

    - name: Upload results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: test-results
        path: test-results/
```

### Usá un composite action

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-and-test
        with:
          node-version: '20'
          test-command: 'npm run test:unit'
```

## Secrets Management

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requiere approval para prod secrets
    steps:
      - uses: actions/checkout@v4

      # Accedé secrets
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          DB_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npm run deploy -- --env production

      # Usá OIDC para cloud auth (no long-lived secrets)
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions
          aws-region: us-east-1

      # Referenceá secrets en Kubernetes
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v1
        with:
          manifests: |
            k8s/deployment.yml
          images: |
            registry.io/app:${{ github.sha }}
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
```

### Environment protection rules

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    # Environment 'production' en GitHub settings tiene:
    # - Required reviewers (manual approval)
    # - Wait timer (5 minutes)
    # - Branch restriction (main only)
    steps:
      - run: npm run deploy -- --env production
```

## Caching

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Node.js dependency cache (built into setup-node)
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # Cachea ~/.npm basado en package-lock.json

      # Java/Maven cache
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'  # Cachea ~/.m2/repository

      # Python cache
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'  # Cachea ~/.cache/pip basado en requirements.txt

      # Custom cache
      - name: Cache build output
        uses: actions/cache@v4
        with:
          path: |
            dist/
            .next/cache/
          key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}-
            ${{ runner.os }}-build-
```

## Self-Hosted Runners

```yaml
jobs:
  build:
    runs-on: self-hosted  # Cualquier self-hosted runner
    # runs-on: [self-hosted, linux, x64]  # Specific labels
    # runs-on: [self-hosted, gpu]  # GPU runner
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

### Runner groups con labels

```yaml
jobs:
  test:
    runs-on: [self-hosted, "${{ matrix.environment }}"]
    strategy:
      matrix:
        environment: [staging, production]
    steps:
      - run: echo "Running on ${{ matrix.environment }} runner"
```

## Deployment Patterns

### Blue-green deployment

```yaml
name: Blue-Green Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Determine active slot
        id: slot
        run: |
          ACTIVE=$(kubectl get service app -o jsonpath='{.spec.selector.slot}')
          if [ "$ACTIVE" = "blue" ]; then
            echo "target=green" >> $GITHUB_OUTPUT
          else
            echo "target=blue" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to inactive slot
        run: |
          kubectl set image deployment/app-${{ steps.slot.outputs.target }} \
            app=registry.io/app:${{ github.sha }}

      - name: Run smoke tests
        run: |
          URL=$(kubectl get service app-${{ steps.slot.outputs.target }} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
          curl -f http://$URL/health || exit 1

      - name: Switch traffic
        run: |
          kubectl patch service app -p '{"spec":{"selector":{"slot":"${{ steps.slot.outputs.target }}"}}}'

      - name: Rollback on failure
        if: failure()
        run: |
          kubectl patch service app -p '{"spec":{"selector":{"slot":"${{ steps.slot.outputs.active }}"}}}'
```

### Build y push Docker image

```yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VERSION=${{ github.sha }}
```

## Conditional Execution

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Solo en main branch
      - if: github.ref == 'refs/heads/main'
        run: npm run test:e2e

      # Solo en PRs
      - if: github.event_name == 'pull_request'
        run: npm run test:affected

      # Solo en tags
      - if: startsWith(github.ref, 'refs/tags/v')
        run: npm run test:release

      # Skipéa en docs-only changes
      - if: |
          !contains(github.event.head_commit.message, '[skip ci]') &&
          !contains(toJSON(github.event.commits.*.modified), 'docs/')
        run: npm test

      # Basado en changed files
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            backend:
              - 'src/api/**'
            frontend:
              - 'src/web/**'
      - if: steps.filter.outputs.backend == 'true'
        run: npm run test:backend
      - if: steps.filter.outputs.frontend == 'true'
        run: npm run test:frontend
```

## Best Practices

- Usá reusable workflows para shared CI logic — DRY across repositories
- Usá composite actions para multi-step sequences — cleaner que inline steps
- Usá OIDC para cloud authentication — no long-lived secrets para rotate
- Seteá `permissions` en workflow y job level — least privilege
- Usá `environment` para deployment protection — required reviewers y branch restrictions
- Cacheá dependencies y build output — usá `cache` input en setup actions
- Usá `concurrency` para canceléa obsolete runs — saveá runner minutes

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- Pinneá action versions a major o full SHA — evitá supply chain attacks
- Usá `timeout-minutes` en jobs — preventí hung jobs de consuming runner minutes
- Usá path filters — skipéa workflows cuando solo docs cambian
- Storeá large artifacts externally — GitHub artifact storage tiene limits

## Common Mistakes

- **No `permissions` block**: workflows get broad default permissions. Siempre specificá least privilege.
- **Hardcoding secrets en env**: usá GitHub Secrets o OIDC. Nunca commiteés credentials.
- **No usar `concurrency`**: multiple pushes crean overlapping runs que wastean minutes y causan race conditions.
- **No `timeout-minutes`**: un hung job runnea hasta el 6-hour default limit. Seteá reasonable timeouts.
- **Pinning a `@main` o `@latest`**: breaking changes en actions pueden break tus workflows. Pinneá a `@v4` o full SHA.
- **No path filters**: every push triggeréa full CI even para README-only changes. Usá `paths` filters.

## FAQ

### ¿Cuál es la diferencia entre un workflow y un action?

Un workflow es un YAML file en `.github/workflows/` que define automated processes. Un action es un reusable unit de code que performa un specific task. Workflows calléan actions como steps.

### ¿Qué son reusable workflows?

Workflows que pueden ser called desde other workflows usando `workflow_call` trigger. Aceptan inputs y secrets, habilitando DRY CI/CD across multiple repositories. Calléalos con `uses: ./.github/workflows/reusable.yml`.

### ¿Qué es OIDC en GitHub Actions?

OpenID Connect deja GitHub Actions authenticate a cloud providers (AWS, GCP, Azure) sin storing long-lived secrets. GitHub issuea short-lived tokens que tu cloud trusts. No secrets para rotate o leak.

### ¿Qué son environment protection rules?

GitHub environments pueden require manual approval antes de que jobs run, enforce branch restrictions, y setear wait timers. Usalos para production deployments para prevenir accidental o unauthorized deploys.

### ¿Cómo cacheo en GitHub Actions?

Usá el `cache` input en setup actions (`setup-node`, `setup-java`, `setup-python`) para dependency caching. Usá `actions/cache@v4` para custom caching. Cache keys deberían include file hashes para invalidate cuando dependencies cambian.
