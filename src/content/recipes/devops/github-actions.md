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

- Running tests on every pull request to catch regressions before they reach production
- Building and pushing Docker images on release tags for immutable deployments
- Deploying to staging or production environments with gated approvals
- Linting and formatting checks before merge to maintain consistent code style
- Running scheduled tasks (cron-based workflows) such as dependency audits or nightly backups
- Generating and publishing documentation automatically when source files change
- Scanning for security vulnerabilities in dependencies on every commit

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

## Best Practices

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
