---
contentType: guides
slug: complete-guide-ci-cd-github-actions
title: "Complete Guide to CI/CD with GitHub Actions"
description: "Build CI/CD pipelines from scratch with GitHub Actions. Covers workflows, runners, matrix builds, caching, secrets, environments, deployment strategies, and reusable workflows."
metaDescription: "Complete guide to CI/CD with GitHub Actions. Build pipelines from scratch. Master workflows, runners, matrix builds, caching, secrets, environments and deployments."
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
  metaDescription: "Complete guide to CI/CD with GitHub Actions. Build pipelines from scratch. Master workflows, runners, matrix builds, caching, secrets, environments and deployments."
  keywords:
    - github actions
    - ci cd
    - continuous integration
    - continuous deployment
    - github workflows
    - pipeline automation
    - reusable workflows
---

# Complete Guide to CI/CD with GitHub Actions

## Introduction

GitHub Actions is GitHub's built-in CI/CD platform. It lets you automate build, test, and deployment directly from your repository. Here is a hands-on guide to workflow syntax, runners, matrix builds, caching, secrets, environments, deployment strategies, and reusable workflows.

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
    runs-on: ubuntu-22.04     # Pin to specific version
  macos:
    runs-on: macos-latest     # macOS for iOS builds
  windows:
    runs-on: windows-latest   # Windows for .NET builds
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
  fail-fast: false          # Don't cancel other matrix jobs on failure
  max-parallel: 4           # Limit concurrent jobs
```

## Caching

### npm cache (built-in)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm              # Automatically caches ~/.npm
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

## Secrets and Variables

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
    environment: production    # Requires approval
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

## Environments and Deployments

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

Configure in GitHub: Settings → Environments → production → Required reviewers. The workflow pauses until approval.

## Job Dependencies

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  test:
    needs: lint              # Wait for lint to pass
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  build:
    needs: [lint, test]      # Wait for both
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'  # Only on main
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

## Reusable Workflows

### Define a reusable workflow

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

### Call a reusable workflow

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

## Docker Build and Push

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

## Best Practices

- **Pin action versions** — use `@v4` not `@main` to avoid supply chain attacks
- **Use `npm ci` not `npm install`** — deterministic installs from lockfile
- **Cache dependencies** — saves 30-60s per job
- **Use environments for deployments** — required approvals for production
- **Set `concurrency` groups** — cancel outdated runs on the same branch
- **Use reusable workflows** — DRY your pipeline across repositories
- **Minimize secret scope** — use environment secrets over repository secrets
- **Use `permissions` key** — restrict GITHUB_TOKEN to minimum needed
- **Run tests in parallel** — split test suites across matrix jobs
- **Use `if: always()` for cleanup** — ensure resources are cleaned up
- **Tag Docker images with SHA** — trace deployments back to commits
- **Use path filters** — skip workflows when only docs change

## Common Mistakes

- Not pinning action versions — `@main` can introduce breaking changes or malicious code
- Using `npm install` instead of `npm ci` — non-deterministic builds
- Not setting `concurrency` — multiple runs waste minutes and race on deployments
- Overusing `secrets.GITHUB_TOKEN` — it has broad permissions by default
- Not using `environment` for production deploys — no approval gate
- Hardcoding secrets in workflow files — they are visible in the UI
- Not caching dependencies — slow builds waste Actions minutes
- Running everything on every push — use path filters to skip irrelevant workflows
- Not using `if: failure()` for notifications — failures go unnoticed
- Not testing workflows locally — use `act` to run workflows before pushing

## Frequently Asked Questions

### How do I run GitHub Actions locally?

Use [act](https://github.com/nektos/act) — it runs workflows in Docker containers locally:

```bash
# Install act
brew install act

# Run a specific workflow
act -W .github/workflows/ci.yml

# Run with secrets
act -W .github/workflows/ci.yml --secret-file .secrets
```

### How do I share workflows across repositories?

Create a reusable workflow in a central repository, then call it with `uses: org/repo/.github/workflows/ci.yml@main`. This lets you maintain one workflow definition used by all repositories in your organization.

### How do I debug a failing workflow?

1. Enable step debug logging: set `ACTIONS_STEP_DEBUG=true` as a repository secret
2. Enable runner diagnostic logging: set `ACTIONS_RUNNER_DEBUG=true`
3. Use `tmate` session for interactive debugging:

```yaml
- name: Debug
  uses: mxschmitt/action-tmate@v3
  if: failure()
  timeout-minutes: 30
```
