---
contentType: recipes
slug: github-actions-reusable-workflows
title: "Compartir Lógica de Workflows con GitHub Actions Reusable Workflows"
description: "Cómo crear y consumir reusable workflows en GitHub Actions, cubriendo inputs, secrets, jobs condicionales, matrix strategy y sharing a nivel organización."
metaDescription: "Crea y consume reusable workflows de GitHub Actions. Pasa inputs y secrets, usa jobs condicionales, matrix strategy y comparte a nivel organización."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - github-actions
  - ci-cd
  - reusable-workflows
  - automation
  - recipe
relatedResources:
  - /recipes/devops/github-actions-matrix-strategy
  - /recipes/devops/docker-multi-stage-build-distroless
  - /recipes/devops/terraform-remote-state-s3-backend
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Crea y consume reusable workflows de GitHub Actions. Pasa inputs y secrets, usa jobs condicionales, matrix strategy y comparte a nivel organización."
  keywords:
    - devops
    - github-actions
    - ci-cd
    - reusable-workflows
    - automation
    - recipe
---

## Overview

Los reusable workflows te permiten definir un workflow de GitHub Actions una vez y llamarlo desde otros workflows. Esto elimina la duplicación a través de repositorios — define tu pipeline de build, test o deploy una vez, luego referéncialo desde cualquier repo de tu organización. El workflow caller pasa inputs y secrets; el workflow llamado se ejecuta como si estuviera definido inline. Esto es el principio DRY aplicado a CI/CD.

## When to Use

- Múltiples repos comparten el mismo pipeline de build/test/deploy
- Quieres estandarizar CI/CD a través de una organización
- Un workflow crece demasiado — splitearlo en componentes reusables
- Seguridad: el workflow llamado se ejecuta con sus propios permisos, no con el token del caller
- Necesitas enforcear steps de compliance (e.g., security scans obligatorios)

## When NOT to Use

- Repo único con un pipeline simple — un workflow regular es más simple
- Cuando necesitas generación dinámica de workflows — los reusable workflows son YAML estático
- Cuando el caller necesita overridear steps individuales — los reusable workflows son all-or-nothing
- Composite actions son mejores para secuencias de steps pequeñas y reusables

## Solution

### Reusable workflow básico

```yaml
# .github/workflows/reusable-build.yml
name: Reusable Build

on:
  workflow_call:  # Esto lo hace callable desde otros workflows
    inputs:
      node-version:
        type: string
        required: false
        default: "20"
      run-tests:
        type: boolean
        required: false
        default: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm

      - run: npm ci

      - run: npm run build

      - name: Run tests
        if: ${{ inputs.run-tests }}
        run: npm test
```

### Llamar a un reusable workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    uses: ./.github/workflows/reusable-build.yml
    with:
      node-version: "22"
      run-tests: true
```

### Pasar secrets a un reusable workflow

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        type: string
        required: true
        description: "Deployment environment (staging or production)"
    secrets:
      deploy-token:
        required: true
      registry-password:
        required: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        run: |
          echo "Deploying to ${{ inputs.environment }}"
          ./deploy.sh --token ${{ secrets.deploy-token }}
```

### Caller pasando secrets

```yaml
jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
    secrets:
      deploy-token: ${{ secrets.STAGING_DEPLOY_TOKEN }}
      registry-password: ${{ secrets.REGISTRY_PASSWORD }}

  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
    secrets:
      deploy-token: ${{ secrets.PROD_DEPLOY_TOKEN }}
      registry-password: ${{ secrets.REGISTRY_PASSWORD }}
```

### Reusable workflow con matrix strategy

```yaml
# .github/workflows/reusable-test-matrix.yml
name: Reusable Test Matrix

on:
  workflow_call:
    inputs:
      node-versions:
        type: string
        required: false
        default: '["18", "20", "22"]'

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: ${{ fromJSON(inputs.node-versions) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

### Llamar con matrix custom

```yaml
jobs:
  test:
    uses: ./.github/workflows/reusable-test-matrix.yml
    with:
      node-versions: '["20", "22"]'
```

### Reusable workflow a nivel organización

```yaml
# En el workflow de cualquier repo, referenciar un workflow de otro repo
jobs:
  security-scan:
    uses: my-org/.github/.github/workflows/security-scan.yml@main
    with:
      severity: high
    secrets:
      scan-token: ${{ secrets.SCAN_TOKEN }}
```

### Setear workflows a nivel organización

```text
# Estructura del repo: my-org/.github
# File: .github/workflows/reusable-security-scan.yml
# Este workflow está disponible para todos los repos en la org
```

```yaml
# .github/workflows/reusable-security-scan.yml
name: Security Scan

on:
  workflow_call:
    inputs:
      severity:
        type: string
        required: false
        default: "medium"
    secrets:
      scan-token:
        required: true

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security scan
        run: |
          npm install -g @security/scanner
          scanner scan --severity ${{ inputs.severity }} --token ${{ secrets.scan-token }}
```

### Jobs condicionales en reusable workflow

```yaml
# .github/workflows/reusable-ci.yml
name: Reusable CI

on:
  workflow_call:
    inputs:
      skip-lint:
        type: boolean
        required: false
        default: false
      deploy:
        type: boolean
        required: false
        default: false

jobs:
  lint:
    if: ${{ !inputs.skip-lint }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  deploy:
    if: ${{ inputs.deploy }}
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

### Nested reusable workflows

```yaml
# .github/workflows/reusable-quality.yml
name: Reusable Quality Checks

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: "20"

jobs:
  lint:
    uses: ./.github/workflows/reusable-lint.yml
    with:
      node-version: ${{ inputs.node-version }}

  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: ${{ inputs.node-version }}
```

### Outputs de reusable workflows

```yaml
# .github/workflows/reusable-build-with-output.yml
name: Reusable Build with Output

on:
  workflow_call:
    inputs:
      app-name:
        type: string
        required: true
    outputs:
      artifact-url:
        description: "URL of the built artifact"
        value: ${{ jobs.build.outputs.artifact-url }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact-url: ${{ steps.upload.outputs.artifact-url }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - name: Upload artifact
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: ${{ inputs.app-name }}-dist
          path: dist/
      - name: Set output
        run: echo "artifact-url=https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}" >> $GITHUB_OUTPUT
```

### Consumir outputs

```yaml
jobs:
  build:
    uses: ./.github/workflows/reusable-build-with-output.yml
    with:
      app-name: my-app

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Use output
        run: echo "Artifact at ${{ needs.build.outputs.artifact-url }}"
```

## Variants

### Reusable workflow con Docker build

```yaml
# .github/workflows/reusable-docker-build.yml
name: Reusable Docker Build

on:
  workflow_call:
    inputs:
      image-name:
        type: string
        required: true
      registry:
        type: string
        default: "ghcr.io"
      tag:
        type: string
        default: "latest"
    secrets:
      registry-token:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ inputs.registry }}
          username: ${{ github.actor }}
          password: ${{ secrets.registry-token }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ inputs.registry }}/${{ github.repository }}/${{ inputs.image-name }}:${{ inputs.tag }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Reusable workflow con environment protection

```yaml
# .github/workflows/reusable-deploy-protected.yml
name: Reusable Deploy (Protected)

on:
  workflow_call:
    inputs:
      environment:
        type: string
        required: true
    secrets:
      deploy-token:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.environment }}
      url: https://${{ inputs.environment }}.myapp.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh --env ${{ inputs.environment }} --token ${{ secrets.deploy-token }}
```

## Best Practices

- Guarda shared workflows en el repo `.github` — disponibles para todos los repos en la org
- Pinea a un ref específico (`@v1`, `@main`) — evita breaking changes del upstream
- Usa `workflow_call` como único trigger — no mezcles con `push`/`pull_request`
- Documenta inputs y secrets con campos `description` — ayuda a los consumers
- Mantén los reusable workflows enfocados — un concern por workflow (build, test, deploy)
- Usa `secrets: inherit` para pasar todos los secrets del caller — conveniente pero menos seguro
- Setea `permissions` explícitamente — los reusable workflows deben seguir least-privilege
- Usa outputs para pasar data de vuelta al caller — evita coupling entre caller y callee

## Common Mistakes

- **No usar el trigger `workflow_call`**: el workflow no puede ser llamado sin él. Agrega `on: workflow_call:` a la lista de triggers.
- **Mezclar `workflow_call` con otros triggers**: causa runs inesperados. Mantén los reusable workflows triggered solo por `workflow_call`.
- **Olvidar pasar secrets**: los secrets no se heredan por default. Pásalos explícitamente en el caller con el block `secrets:`.
- **Usar `needs` con reusable workflows**: `needs` funciona entre jobs en el caller, no dentro del workflow llamado. El workflow llamado maneja sus propias dependencias de jobs.
- **No pinnear a un ref**: usar `@main` puede romper callers cuando el workflow cambia. Pinea a un tag o branch.

## FAQ

### ¿Qué es un reusable workflow?

Un workflow de GitHub Actions que puede ser llamado desde otro workflow usando el keyword `uses`. El workflow llamado se define con `on: workflow_call` y acepta inputs y secrets del caller.

### ¿En qué se diferencia un reusable workflow de un composite action?

Los composite actions reusan steps individuales. Los reusable workflows reusan workflows enteros (múltiples jobs). Usa composite actions para secuencias de steps pequeñas, reusable workflows para pipelines completos.

### ¿Puedo pasar todos los secrets a la vez?

Sí. Usa `secrets: inherit` en el caller:

```yaml
jobs:
  build:
    uses: ./.github/workflows/reusable-build.yml
    secrets: inherit
```

### ¿Un reusable workflow puede llamar a otro reusable workflow?

Sí, hasta 4 niveles de nesting. Esto te permite componer workflows jerárquicamente (e.g., quality checks que llaman a workflows de lint + test).

### ¿Cómo comparto reusable workflows a través de repositorios?

Guárdalos en un repositorio `.github` a nivel organización. Referéncialos con `uses: my-org/.github/.github/workflows/workflow.yml@main`.
