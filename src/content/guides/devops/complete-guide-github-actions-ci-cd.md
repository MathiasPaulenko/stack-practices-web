---



contentType: guides
slug: complete-guide-github-actions-ci-cd
title: "GitHub Actions CI/CD: Workflows, Runners, Secrets"
description: "Master GitHub Actions for CI/CD: workflows, reusable workflows, composite actions, secrets management, runners, matrix builds, caching, and deployment patterns."
metaDescription: "Master GitHub Actions for CI/CD: workflows, reusable workflows, composite actions, secrets, runners, matrix builds, caching, and deployment patterns for production."
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
  - /guides/complete-guide-helm-charts-production
  - /guides/complete-guide-docker-compose-local-dev
  - /guides/complete-guide-kubernetes-config-management
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master GitHub Actions for CI/CD: workflows, reusable workflows, composite actions, secrets, runners, matrix builds, caching, and deployment patterns for production."
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

## Introduction

GitHub Actions automates CI/CD pipelines directly in GitHub repositories. You define workflows in YAML that trigger on events (push, pull request, schedule), run jobs on runners, and chain steps together. Below is a practical guide to workflow syntax, reusable workflows, composite actions, secrets management, self-hosted runners, matrix builds, caching, and deployment patterns.

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
          fetch-depth: 0  # Full history for changelog generation

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
      fail-fast: false  # Don't cancel other jobs on failure
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: ['18', '20', '22']
        exclude:
          - os: macos-latest
            node-version: '18'  # Skip macOS + Node 18
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

### Define a reusable workflow

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

### Call a reusable workflow

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

### Create a composite action

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

### Use a composite action

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
    environment: production  # Requires approval for prod secrets
    steps:
      - uses: actions/checkout@v4

      # Access secrets
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          DB_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npm run deploy -- --env production

      # Use OIDC for cloud auth (no long-lived secrets)
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions
          aws-region: us-east-1

      # Reference secrets in Kubernetes
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
    # Environment 'production' in GitHub settings has:
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
          cache: 'npm'  # Caches ~/.npm based on package-lock.json

      # Java/Maven cache
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'  # Caches ~/.m2/repository

      # Python cache
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'  # Caches ~/.cache/pip based on requirements.txt

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
    runs-on: self-hosted  # Any self-hosted runner
    # runs-on: [self-hosted, linux, x64]  # Specific labels
    # runs-on: [self-hosted, gpu]  # GPU runner
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

### Runner groups with labels

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

### Build and push Docker image

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

      # Only on main branch
      - if: github.ref == 'refs/heads/main'
        run: npm run test:e2e

      # Only on PRs
      - if: github.event_name == 'pull_request'
        run: npm run test:affected

      # Only on tags
      - if: startsWith(github.ref, 'refs/tags/v')
        run: npm run test:release

      # Skip on docs-only changes
      - if: |
          !contains(github.event.head_commit.message, '[skip ci]') &&
          !contains(toJSON(github.event.commits.*.modified), 'docs/')
        run: npm test

      # Based on changed files
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


- For a deeper guide, see [Complete Guide to CI/CD with GitHub Actions](/guides/complete-guide-ci-cd-github-actions/).

- Use reusable workflows for shared CI logic — DRY across repositories
- Use composite actions for multi-step sequences — cleaner than inline steps
- Use OIDC for cloud authentication — no long-lived secrets to rotate
- Set `permissions` at workflow and job level — least privilege
- Use `environment` for deployment protection — required reviewers and branch restrictions
- Cache dependencies and build output — use `cache` input in setup actions
- Use `concurrency` to cancel obsolete runs — save runner minutes

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- Pin action versions to major or full SHA — avoid supply chain attacks
- Use `timeout-minutes` on jobs — prevent hung jobs from consuming runner minutes
- Use path filters — skip workflows when only docs change
- Store large artifacts externally — GitHub artifact storage has limits

## Common Mistakes

- **No `permissions` block**: workflows get broad default permissions. Always specify least privilege.
- **Hardcoding secrets in env**: use GitHub Secrets or OIDC. Never commit credentials.
- **Not using `concurrency`**: multiple pushes create overlapping runs that waste minutes and cause race conditions.
- **No `timeout-minutes`**: a hung job runs until the 6-hour default limit. Set reasonable timeouts.
- **Pinning to `@main` or `@latest`**: breaking changes in actions can break your workflows. Pin to `@v4` or full SHA.
- **No path filters**: every push triggers full CI even for README-only changes. Use `paths` filters.

## FAQ

### What is the difference between a workflow and an action?

A workflow is a YAML file in `.github/workflows/` that defines automated processes. An action is a reusable unit of code that performs a specific task. Workflows call actions as steps.

### What are reusable workflows?

Workflows that can be called from other workflows using `workflow_call` trigger. They accept inputs and secrets, enabling DRY CI/CD across multiple repositories. Call them with `uses: ./.github/workflows/reusable.yml`.

### What is OIDC in GitHub Actions?

OpenID Connect lets GitHub Actions authenticate to cloud providers (AWS, GCP, Azure) without storing long-lived secrets. GitHub issues short-lived tokens that your cloud trusts. No secrets to rotate or leak.

### What are environment protection rules?

GitHub environments can require manual approval before jobs run, enforce branch restrictions, and set wait timers. Use them for production deployments to prevent accidental or unauthorized deploys.

### How do I cache in GitHub Actions?

Use the `cache` input in setup actions (`setup-node`, `setup-java`, `setup-python`) for dependency caching. Use `actions/cache@v4` for custom caching. Cache keys should include file hashes to invalidate when dependencies change.
