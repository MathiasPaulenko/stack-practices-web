---




contentType: recipes
slug: github-actions
title: "GitHub Actions CI/CD"
description: "How to build and deploy with GitHub Actions using workflows, matrices, caching, and secrets."
metaDescription: "Practical GitHub Actions examples for CI/CD. Learn workflow syntax, build matrices, caching, secrets, and reusable workflows."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - github-actions
  - ci-cd
  - automation
  - deployment
relatedResources:
  - /recipes/unit-testing
  - /recipes/docker-basics
  - /recipes/environment-variables
  - /recipes/cicd-pipeline-setup
  - /recipes/git-workflow
  - /recipes/setup-ci-gitlab-pipelines
  - /docs/runbook-template
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical GitHub Actions examples for CI/CD. Learn workflow syntax, build matrices, caching, secrets, and reusable workflows."
  keywords:
    - github actions
    - ci-cd
    - workflow
    - yaml
    - automation
    - build matrix
    - caching
    - secrets




---

## Overview

GitHub Actions is a CI/CD platform built into GitHub. It automates software workflows from testing to deployment using YAML-defined pipelines triggered by Git events (push, PR, release).

Before CI/CD became mainstream, teams relied on manual steps to verify code: running tests locally, building artifacts on a developer machine, and deploying via SSH scripts. This was error-prone, inconsistent, and impossible to scale. GitHub Actions solves this by turning every Git event into an automated, reproducible workflow running in isolated environments.

By defining your pipeline as code inside your repository, you get version control, peer review, and auditability for your entire delivery process. A green checkmark on a pull request becomes a trust signal that the code compiles, tests pass, and style guidelines are met before anyone merges.

## When to Use

Use this recipe when:

- Running tests on every pull request to catch regressions before they reach production. See [Unit Testing](/recipes/testing/unit-testing) for test automation.
- Building and pushing Docker images on release tags for immutable deployments. See [Docker Basics](/recipes/devops/docker-basics) for image building.
- Deploying to staging or production environments with gated approvals. See [Environment Variables](/recipes/devops/environment-variables) for managing deployment config.
- Linting and formatting checks before merge to maintain consistent code style. See [Pre-Commit Hooks](/recipes/devops/pre-commit-hooks) for local code quality.
- Running scheduled tasks (cron-based workflows) such as dependency audits or nightly backups. See [Scheduled Jobs](/recipes/devops/background-jobs) for cron patterns.
- Generating and publishing documentation automatically when source files change
- Scanning for security vulnerabilities in dependencies on every commit. See [Secret Management](/recipes/devops/secret-management) for credential security.

## Solution

### Basic Workflow (Node.js CI)

This workflow runs on every push and pull request targeting `main`. It checks out the code, sets up Node.js, installs dependencies, and runs the full validation pipeline.

```yaml
# .github/workflows/ci.yml
name: CI

# Trigger: run on push and PR to main branch
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Check out the repository code
      - uses: actions/checkout@v4

      # Set up Node.js with built-in npm caching
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Install dependencies using lock file for reproducibility
      - run: npm ci

      # Run linting to catch style issues early
      - run: npm run lint

      # Execute the test suite
      - run: npm run test

      # Build the production artifact
      - run: npm run build
```

### Build Matrix

A matrix strategy runs the same job across multiple combinations of OS and runtime versions. This catches platform-specific bugs and ensures compatibility without duplicating workflow code.

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

### Deploy with Secrets

This job only runs after the `test` job succeeds and only on the `main` branch. Secrets are injected at runtime from the repository settings and are never exposed in logs.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test              # wait for test job to pass
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying with token"
          curl -X POST https://api.deploy.com/release \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}"
```

### Caching Dependencies

Caching stores downloaded dependencies between workflow runs. The cache key includes the OS and a hash of the lock file so it invalidates automatically when dependencies change.

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

### Reusable Workflow

When multiple repositories need the same pipeline logic, extract it into a reusable workflow. Callers pass inputs and receive outputs, keeping the shared logic in one place.

```yaml
# .github/workflows/reusable-lint.yml
name: Reusable Lint

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm run lint
```

Call it from another repository:

```yaml
jobs:
  call-lint:
    uses: org/shared-workflows/.github/workflows/reusable-lint.yml@main
    with:
      node-version: '20'
```

## What Works

- **Pin action versions** using full commit SHAs for supply-chain security. While tags like `v4` are convenient, a compromised action maintainer could repoint the tag to malicious code. Pinning to a SHA ensures the exact code runs every time.
- **Use `npm ci`** instead of `npm install` in CI for reproducible builds. `npm ci` strictly respects `package-lock.json`, eliminating drift between local and CI environments.
- **Split jobs**: Test, build, and deploy as separate jobs with explicit dependencies (`needs`). This makes failures isolated, allows parallel execution, and produces clearer logs.
- **Use concurrency groups** to cancel outdated runs when new commits are pushed. This saves CI minutes and prevents stale deployments from overwriting newer ones.
- **Store secrets in GitHub Secrets**, never hardcode tokens in workflow files. Secrets are encrypted at rest and masked in logs. Even private repositories can leak through fork PRs.
- **Use reusable workflows** for shared logic across multiple repositories. Extract common steps into a central repository so fixes propagate automatically to every consumer.
- **Fail fast with strict permissions**: set `permissions: read-all` at the workflow level and grant write only where needed. This limits the blast radius if an action is compromised.
- **Monitor your Actions bill**: set spending limits and review usage monthly. Matrix builds across 3 OSes and 3 Node versions create 9 jobs per commit.

## Common Mistakes

- **Using `actions/checkout` without specifying a ref**, causing detached HEAD issues or checking out the wrong commit when triggered by a tag. Always use `ref: ${{ github.ref }}` explicitly when needed.
- **Running deployment on every push** instead of filtering by branch or tag. This deploys unfinished feature branches to production and bypasses your release process entirely.
- **Not caching dependencies**, causing builds that download the internet on every run. A well-tuned cache can cut build times from minutes to seconds.
- **Using `ubuntu-latest` when you actually need a specific OS** for native compilation. The `latest` label migrates over time; pin to a specific version like `ubuntu-22.04` for reproducibility.
- **Forgetting to set `if: failure()`** for notification steps on error. Without this condition, Slack or email alerts only fire on success, which is the opposite of what you want.
- **Hardcoding environment values** in workflow files instead of using repository variables. This forces you to edit YAML every time a URL or version changes, creating unnecessary commits.
- **Granting overly broad permissions** like `permissions: write-all`. If a third-party action is compromised, it could rewrite your code, create releases, or modify secrets. Use the principle of least privilege.

## Frequently Asked Questions

**Q: How do I run a workflow manually?**
A: Add `workflow_dispatch:` to the `on:` block. You can then trigger it from the Actions tab, optionally providing input parameters that your workflow can consume.

**Q: Can I reuse workflows across repositories?**
A: Yes. Create a workflow with `on: workflow_call` in a central repository, then reference it from others using `uses: org/shared-workflows/.github/workflows/reusable.yml@main`. This keeps shared logic updated in one place.

**Q: How do I debug a failing workflow?**
A: Use the `tmate` action to spawn an interactive SSH session inside the runner, or add `set -x` in shell steps for verbose output. You can also enable step debugging by setting the secret `ACTIONS_STEP_DEBUG` to `true`.

**Q: How do I prevent workflow runs from forks?**
A: Use `if: github.event.pull_request.head.repo.full_name == github.repository` to skip workflows triggered by external forks. For sensitive workflows, disable fork pull request triggers entirely and require manual approval instead.

**Q: What is the difference between `workflow_dispatch` and `repository_dispatch`?**
A: `workflow_dispatch` is triggered manually from the GitHub UI or API. `repository_dispatch` is triggered externally via the GitHub API, useful for integrating with third-party services that need to trigger builds outside of Git events.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Reusable Workflow with Matrix Strategy

```yaml
# .github/workflows/test-matrix.yml
name: Test Matrix
on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: "20"

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # Don't cancel other jobs on failure
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
        exclude:
          - os: macos-latest
            node: 18  # Skip old Node on macOS
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4
        if: matrix.os == 'ubuntu-latest' && matrix.node == 20
```

### Environment Protection Rules

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.example.com
    # Required reviewers must approve before deployment
    # Configured in repo Settings > Environments
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying ${{ github.ref_name }} to production"
          ./deploy.sh --env prod --version ${{ github.ref_name }}
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### Composite Action

```yaml
# .github/actions/setup-project/action.yml
name: Setup Project
description: Install dependencies and cache them
inputs:
  node-version:
    required: false
    default: '20'

runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'
    - name: Install dependencies
      shell: bash
      run: npm ci
    - name: Build
      shell: bash
      run: npm run build
```

```yaml
# Usage in a workflow
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
        with:
          node-version: '22'
      - run: npm test
```

### Conditional Jobs and Steps

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  deploy:
    needs: [lint, test]
    if: github.ref == 'refs/heads/main' && success()
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying only on main after lint+test pass"
```

### Job Summary for PR Comments

```yaml
- name: Generate summary
  if: always()
  run: |
    echo "## Test Results" >> $GITHUB_STEP_SUMMARY
    echo "| Suite | Status | Duration |" >> $GITHUB_STEP_SUMMARY
    echo "|-------|--------|----------|" >> $GITHUB_STEP_SUMMARY
    echo "| Unit  | ${{ job.status }} | 30s |" >> $GITHUB_STEP_SUMMARY
    echo "| E2E   | ${{ job.status }} | 2m |" >> $GITHUB_STEP_SUMMARY
```

## Additional Best Practices

1. **Pin action versions to SHA.** Tags can be re-tagged; SHA pins are immutable:

```yaml
# Bad: tag can change
- uses: actions/checkout@v4

# Better: SHA is immutable
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4
```

1. **Use `concurrency` to cancel stale runs.** Don't waste minutes on outdated pushes:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

1. **Set job timeouts.** Prevent hung jobs from consuming minutes:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15  # Kill after 15 minutes
```

## Additional Common Mistakes

1. **Not using `concurrency` groups.** Without it, every push to a PR triggers a new run, wasting minutes:

```yaml
# Add this to cancel previous runs
concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

1. **Using `needs` without `if: always()`.** Downstream jobs skip by default if upstream fails:

```yaml
notify:
  needs: [test, lint, deploy]
  if: always()  # Run regardless of upstream status
  runs-on: ubuntu-latest
  steps:
    - run: ./notify.sh ${{ job.status }}
```

## FAQ

### How do I share secrets across environments?

Use repository-level secrets for non-sensitive values. Use environment-level secrets for production credentials. Reference them with `${{ secrets.SECRET_NAME }}`:

```yaml
steps:
  - run: deploy.sh
    env:
      API_KEY: ${{ secrets.PROD_API_KEY }}  # Environment secret
      LOG_LEVEL: ${{ vars.LOG_LEVEL }}       # Repository variable
```

### How do I run jobs sequentially vs in parallel?

By default, jobs run in parallel. Use `needs` to create dependencies:

```yaml
jobs:
  build:    # Runs first
    runs-on: ubuntu-latest
  test:     # Runs after build
    needs: build
    runs-on: ubuntu-latest
  deploy:   # Runs after test
    needs: test
    runs-on: ubuntu-latest
```

### How do I pass artifacts between jobs?

Use `actions/upload-artifact` and `actions/download-artifact`:

```yaml
build:
  runs-on: ubuntu-latest
  steps:
    - run: npm run build
    - uses: actions/upload-artifact@v4
      with:
        name: dist
        path: dist/

deploy:
  needs: build
  runs-on: ubuntu-latest
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    - run: ./deploy.sh dist/
```

## Performance Tips

1. **Cache dependencies aggressively.** Cache npm, pip, Maven, and Gradle:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

1. **Use self-hosted runners for heavy builds.** Skip the queue and use more CPU:

```yaml
runs-on: self-hosted  # Your own hardware
```

1. **Split test suites across runners.** Use matrix to parallelize:

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npm test -- --shard=${{ matrix.shard }}/4
```

1. **Use Docker layer caching.** Speed up image builds:

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```
