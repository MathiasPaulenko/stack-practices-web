---
contentType: recipes
slug: github-actions-matrix-strategy
title: "Test Across Multiple OS and Language Versions with GitHub Actions Matrix"
description: "How to use GitHub Actions matrix strategy to test across multiple operating systems, language versions, and configurations with include, exclude, and dynamic matrices."
metaDescription: "Test across multiple OS and language versions with GitHub Actions matrix strategy. Use include, exclude, dynamic matrices, and fail-fast for comprehensive CI."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - github-actions
  - ci-cd
  - matrix
  - testing
  - recipe
relatedResources:
  - /recipes/devops/github-actions-reusable-workflows
  - /recipes/devops/docker-multi-stage-build-distroless
  - /recipes/devops/docker-compose-override-environments
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Test across multiple OS and language versions with GitHub Actions matrix strategy. Use include, exclude, dynamic matrices, and fail-fast for comprehensive CI."
  keywords:
    - devops
    - github-actions
    - ci-cd
    - matrix
    - testing
    - recipe
---

## Overview

The matrix strategy in GitHub Actions runs a job multiple times in parallel — once for each combination of values you specify. This lets you test your code across multiple operating systems (Ubuntu, Windows, macOS), language versions (Node 18, 20, 22), and any other variable — all in a single workflow definition. Each combination runs as a separate job with its own logs and status.

## When to Use

- Cross-platform testing (Linux, Windows, macOS)
- Multi-version testing (Node 18/20/22, Python 3.10/3.11/3.12)
- Testing against multiple databases (PostgreSQL, MySQL, SQLite)
- Testing multiple configurations (debug/release, with/without optional features)
- Any scenario where you need to verify the same code under different conditions

## When NOT to Use

- Single platform/version — a regular job is simpler
- When matrix combinations exceed GitHub's limits (256 jobs per matrix)
- When most combinations are redundant — use `include` to add only specific ones
- When build time matters more than coverage — matrix multiplies CI minutes

## Solution

### Basic matrix

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

### Multiple matrix dimensions

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

### Exclude specific combinations

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
        exclude:
          # Don't test Node 18 on macOS
          - os: macos-latest
            node-version: 18
          # Don't test Node 22 on Windows
          - os: windows-latest
            node-version: 22
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

### Include additional combinations

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [20, 22]
        include:
          # Add a specific combination with extra config
          - os: macos-latest
            node-version: 22
            experimental: true
          # Add extra env vars to an existing combination
          - os: ubuntu-latest
            node-version: 22
            coverage: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
      - name: Run coverage
        if: ${{ matrix.coverage }}
        run: npm run test:coverage
```

### Fail-fast and max-parallel

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # Don't cancel other jobs on failure
      max-parallel: 4   # Run at most 4 jobs in parallel
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

### Matrix with services

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        database: [postgres, mysql]
        include:
          - database: postgres
            db-image: postgres:16
            db-port: 5432
            db-env: |
              POSTGRES_USER: test
              POSTGRES_PASSWORD: test
              POSTGRES_DB: testdb
          - database: mysql
            db-image: mysql:8
            db-port: 3306
            db-env: |
              MYSQL_USER: test
              MYSQL_PASSWORD: test
              MYSQL_DATABASE: testdb
              MYSQL_ROOT_PASSWORD: root
    services:
      db:
        image: ${{ matrix.db-image }}
        env: ${{ matrix.db-env }}
        ports:
          - ${{ matrix.db-port }}
        options: >-
          --health-cmd "pg_isready || mysqladmin ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
        env:
          DB_TYPE: ${{ matrix.database }}
          DB_PORT: ${{ matrix.db-port }}
```

### Dynamic matrix from JSON

```yaml
jobs:
  # Job 1: Generate the list of versions
  prepare:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - id: set-matrix
        run: |
          # Read supported versions from a file
          VERSIONS=$(cat .github/supported-versions.json)
          echo "matrix=$VERSIONS" >> $GITHUB_OUTPUT

  # Job 2: Use the dynamic matrix
  test:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix:
        value: ${{ fromJSON(needs.prepare.outputs.matrix) }}
    steps:
      - uses: actions/checkout@v4
      - run: echo "Testing version ${{ matrix.value }}"
```

### Dynamic matrix from package.json

```yaml
jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.set-matrix.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
      - id: set-matrix
        run: |
          # Extract package names from workspaces
          PACKAGES=$(node -e "
            const pkg = require('./package.json');
            const names = pkg.workspaces.map(w => w.replace('packages/', ''));
            console.log(JSON.stringify(names));
          ")
          echo "packages=$PACKAGES" >> $GITHUB_OUTPUT

  test:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJSON(needs.prepare.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: cd packages/${{ matrix.package }} && npm test
```

### Matrix with continue-on-error for experimental

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [20, 22]
        include:
          - os: ubuntu-latest
            node-version: 23
            experimental: true
    continue-on-error: ${{ matrix.experimental == true }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

### Matrix with build artifacts

```yaml
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            artifact: linux-x64
          - os: windows-latest
            artifact: windows-x64
          - os: macos-latest
            artifact: macos-x64
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.artifact }}
          path: dist/

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: artifacts/
      - run: ls -la artifacts/
```

## Variants

### Matrix for Python projects

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        python-version: ["3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -e ".[dev]"
      - run: pytest --cov
```

### Matrix for Java projects

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java-version: [17, 21]
        gradle-version: [7, 8]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ matrix.java-version }}
          distribution: temurin
      - uses: gradle/actions/setup-gradle@v3
        with:
          gradle-version: ${{ matrix.gradle-version }}
      - run: gradle test
```

### Matrix for Docker multi-arch builds

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64, linux/arm/v7]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: .
          platforms: ${{ matrix.platform }}
          tags: my-app:latest-${{ matrix.platform }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          outputs: type=docker,dest=artifact-${{ matrix.platform }}.tar
      - uses: actions/upload-artifact@v4
        with:
          name: docker-${{ matrix.platform }}
          path: artifact-${{ matrix.platform }}.tar
```

## Best Practices

- Use `fail-fast: false` for cross-platform testing — one OS failure shouldn't cancel others
- Use `max-parallel` to limit concurrent jobs — avoids hitting GitHub Actions usage limits
- Use `include` for exceptions — adds specific combinations without expanding the full matrix
- Use `exclude` to skip known-broken combinations — saves CI minutes
- Use `continue-on-error` for experimental versions — marks them as non-blocking
- Keep matrix size reasonable — each combination costs CI minutes
- Use dynamic matrices for monorepos — generate the list of packages to test
- Name jobs with matrix context — `name: Test (Node ${{ matrix.node-version }} on ${{ matrix.os }})`

## Common Mistakes

- **Forgetting `fail-fast: false`**: one failing job cancels all others. You lose visibility into which combinations pass or fail.
- **Too many combinations**: 3 OS x 3 versions x 2 databases = 18 jobs. Each costs CI minutes. Trim unnecessary combinations with `exclude`.
- **Not using `include` for extras**: adding a dimension just for one combination creates many unnecessary jobs. Use `include` instead.
- **No `max-parallel` limit**: GitHub may throttle or queue all jobs at once. Set `max-parallel` to a reasonable number.
- **Hardcoding versions in workflow**: use dynamic matrices from a config file for maintainability.

## FAQ

### What is a matrix strategy in GitHub Actions?

A way to run the same job multiple times with different values. Each combination of matrix values creates a separate job that runs in parallel. Define it under `strategy.matrix` in the job.

### How many jobs can a matrix create?

Up to 256 jobs per matrix. If you exceed this, split into multiple jobs or use dynamic matrices with smaller subsets.

### How do I add a single extra combination?

Use `include`:

```yaml
strategy:
  matrix:
    node-version: [20, 22]
    include:
      - node-version: 23
        experimental: true
```

### How do I skip a specific combination?

Use `exclude`:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node-version: [18, 20, 22]
    exclude:
      - os: windows-latest
        node-version: 18
```

### Can I generate a matrix dynamically?

Yes. Create a job that outputs a JSON array, then use `fromJSON()` in the downstream job's matrix definition. This is useful for monorepos where the list of packages changes frequently.
