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
lastUpdated: "2026-06-10"
author: "StackPractices"
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

## When to Use

Use this recipe when:

- Running tests on every pull request
- Building and pushing Docker images on release
- Deploying to staging or production environments
- Linting and formatting checks before merge
- Running scheduled tasks (cron-based workflows)

## Solution

### Basic Workflow (Node.js CI)

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

### Deploy with Secrets

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

### Caching Dependencies

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

## Best Practices

- **Pin action versions** using full commit SHAs for supply-chain security
- **Use `npm ci`** instead of `npm install` in CI for reproducible builds
- **Split jobs**: Test, build, and deploy as separate jobs with explicit dependencies (`needs`)
- **Use concurrency groups** to cancel outdated runs when new commits are pushed
- **Store secrets in GitHub Secrets**, never hardcode tokens in workflow files
- **Use reusable workflows** for shared logic across multiple repositories

## Common Mistakes

- Using `actions/checkout` without specifying a ref, causing detached HEAD issues
- Running deployment on every push instead of filtering by branch or tag
- Not caching dependencies, causing slow builds
- Using `ubuntu-latest` when you actually need a specific OS for native compilation
- Forgetting to set `if: failure()` for notification steps on error

## Frequently Asked Questions

**Q: How do I run a workflow manually?**
A: Add `workflow_dispatch:` to the `on:` block. You can then trigger it from the Actions tab.

**Q: Can I reuse workflows across repositories?**
A: Yes. Create a workflow in a repository and call it from others using `uses: org/repo/.github/workflows/reusable.yml@main`.

**Q: How do I debug a failing workflow?**
A: Use `tmate` action for SSH debugging, or add `set -x` in shell steps for verbose output.
