---




contentType: recipes
slug: github-actions-reusable-workflows
title: "Share Workflow Logic with GitHub Actions Reusable Workflows"
description: "How to create and consume reusable workflows in GitHub Actions, covering inputs, secrets, conditional jobs, matrix strategy, and organization-wide sharing."
metaDescription: "Create and consume reusable GitHub Actions workflows. Pass inputs and secrets, use conditional jobs, matrix strategy, and share across an organization."
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
  - /recipes/github-actions-matrix-strategy
  - /recipes/docker-multi-stage-build-distroless
  - /recipes/terraform-remote-state-s3-backend
  - /recipes/docker-compose-override-environments
  - /recipes/terraform-workspace-environment-isolation
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Create and consume reusable GitHub Actions workflows. Pass inputs and secrets, use conditional jobs, matrix strategy, and share across an organization."
  keywords:
    - devops
    - github-actions
    - ci-cd
    - reusable-workflows
    - automation
    - recipe




---

## Overview

Reusable workflows let you define a GitHub Actions workflow once and call it from other workflows. This eliminates duplication across repositories — define your build, test, or deploy pipeline once, then reference it from any repo in your organization. The caller workflow passes inputs and secrets; the called workflow runs as if it were defined inline. This is the DRY principle applied to CI/CD.

## When to Use

- Multiple repos share the same build/test/deploy pipeline
- You want to standardize CI/CD across an organization
- A workflow grows too large — split it into reusable components
- Security: the called workflow runs with its own permissions, not the caller's token
- You need to enforce compliance steps (e.g., mandatory security scans)

## When NOT to Use

- Single repo with a simple pipeline — a regular workflow is simpler
- When you need dynamic workflow generation — reusable workflows are static YAML
- When the caller needs to override individual steps — reusable workflows are all-or-nothing
- Composite actions are better for small, reusable step sequences

## Solution

### Basic reusable workflow

```yaml
# .github/workflows/reusable-build.yml
name: Reusable Build

on:
  workflow_call:  # This makes it callable from other workflows
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

### Calling a reusable workflow

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

### Passing secrets to a reusable workflow

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

### Caller passing secrets

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

### Reusable workflow with matrix strategy

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

### Calling with custom matrix

```yaml
jobs:
  test:
    uses: ./.github/workflows/reusable-test-matrix.yml
    with:
      node-versions: '["20", "22"]'
```

### Organization-wide reusable workflow

```yaml
# In any repo's workflow, reference a workflow from another repo
jobs:
  security-scan:
    uses: my-org/.github/.github/workflows/security-scan.yml@main
    with:
      severity: high
    secrets:
      scan-token: ${{ secrets.SCAN_TOKEN }}
```

### Setting up organization-level workflows

```text
# Repository structure: my-org/.github
# File: .github/workflows/reusable-security-scan.yml
# This workflow is available to all repos in the org
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

### Conditional jobs in reusable workflow

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

### Outputs from reusable workflows

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

### Consuming outputs

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

### Reusable workflow with Docker build

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

### Reusable workflow with environment protection

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


- For a deeper guide, see [Complete Guide to CI/CD with GitHub Actions](/guides/complete-guide-ci-cd-github-actions/).

- Store shared workflows in `.github` repo — available to all repos in the org
- Pin to a specific ref (`@v1`, `@main`) — avoid breaking changes from upstream
- Use `workflow_call` as the only trigger — don't mix with `push`/`pull_request`
- Document inputs and secrets with `description` fields — helps consumers
- Keep reusable workflows focused — one concern per workflow (build, test, deploy)
- Use `secrets: inherit` to pass all caller secrets — convenient but less secure
- Set `permissions` explicitly — reusable workflows should follow least-privilege
- Use outputs to pass data back to caller — avoids coupling between caller and callee

## Common Mistakes

- **Not using `workflow_call` trigger**: the workflow can't be called without it. Add `on: workflow_call:` to the trigger list.
- **Mixing `workflow_call` with other triggers**: causes unexpected runs. Keep reusable workflows triggered only by `workflow_call`.
- **Forgetting to pass secrets**: secrets are not inherited by default. Pass them explicitly in the caller with `secrets:` block.
- **Using `needs` with reusable workflows**: `needs` works between jobs in the caller, not inside the called workflow. The called workflow manages its own job dependencies.
- **Not pinning to a ref**: using `@main` can break callers when the workflow changes. Pin to a tag or branch.

## FAQ

### What is a reusable workflow?

A GitHub Actions workflow that can be called from another workflow using the `uses` keyword. The called workflow is defined with `on: workflow_call` and accepts inputs and secrets from the caller.

### How is a reusable workflow different from a composite action?

Composite actions reuse individual steps. Reusable workflows reuse entire workflows (multiple jobs). Use composite actions for small step sequences, reusable workflows for full pipelines.

### Can I pass all secrets at once?

Yes. Use `secrets: inherit` in the caller:

```yaml
jobs:
  build:
    uses: ./.github/workflows/reusable-build.yml
    secrets: inherit
```

### Can a reusable workflow call another reusable workflow?

Yes, up to 4 levels of nesting. This lets you compose workflows hierarchically (e.g., quality checks that call lint + test workflows).

### How do I share reusable workflows across repositories?

Store them in a `.github` repository at the organization level. Reference them with `uses: my-org/.github/.github/workflows/workflow.yml@main`.
