---
contentType: recipes
slug: github-actions-matrix-strategy
title: "Testear a Través de Múltiples OS y Versiones con GitHub Actions Matrix"
description: "Cómo usar GitHub Actions matrix strategy para testear a través de múltiples sistemas operativos, versiones de lenguajes y configuraciones con include, exclude y matrices dinámicas."
metaDescription: "Testea a través de múltiples OS y versiones con GitHub Actions matrix strategy. Usa include, exclude, matrices dinámicas y fail-fast para CI comprehensivo."
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
  metaDescription: "Testea a través de múltiples OS y versiones con GitHub Actions matrix strategy. Usa include, exclude, matrices dinámicas y fail-fast para CI comprehensivo."
  keywords:
    - devops
    - github-actions
    - ci-cd
    - matrix
    - testing
    - recipe
---

## Overview

La matrix strategy en GitHub Actions corre un job múltiples veces en paralelo — una por cada combinación de valores que especifiques. Esto te permite testear tu código a través de múltiples sistemas operativos (Ubuntu, Windows, macOS), versiones de lenguajes (Node 18, 20, 22), y cualquier otra variable — todo en una sola definición de workflow. Cada combinación corre como un job separado con sus propios logs y status.

## When to Use

- Testing cross-platform (Linux, Windows, macOS)
- Testing multi-versión (Node 18/20/22, Python 3.10/3.11/3.12)
- Testing contra múltiples databases (PostgreSQL, MySQL, SQLite)
- Testing múltiples configuraciones (debug/release, con/sin optional features)
- Cualquier escenario donde necesitás verificar el mismo código bajo diferentes condiciones

## When NOT to Use

- Plataforma/versión única — un job regular es más simple
- Cuando las combinaciones de matrix exceden los límites de GitHub (256 jobs por matrix)
- Cuando la mayoría de las combinaciones son redundantes — usá `include` para agregar solo específicas
- Cuando el build time importa más que la coverage — la matrix multiplica CI minutes

## Solution

### Matrix básica

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

### Múltiples dimensiones de matrix

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

### Excluir combinaciones específicas

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
        exclude:
          # No testear Node 18 en macOS
          - os: macos-latest
            node-version: 18
          # No testear Node 22 en Windows
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

### Incluir combinaciones adicionales

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [20, 22]
        include:
          # Agregar una combinación específica con config extra
          - os: macos-latest
            node-version: 22
            experimental: true
          # Agregar env vars extra a una combinación existente
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

### Fail-fast y max-parallel

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # No cancelar otros jobs en failure
      max-parallel: 4   # Correr máximo 4 jobs en paralelo
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

### Matrix con services

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

### Matrix dinámica desde JSON

```yaml
jobs:
  # Job 1: Generar la lista de versiones
  prepare:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - id: set-matrix
        run: |
          # Leer versiones soportadas desde un archivo
          VERSIONS=$(cat .github/supported-versions.json)
          echo "matrix=$VERSIONS" >> $GITHUB_OUTPUT

  # Job 2: Usar la matrix dinámica
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

### Matrix dinámica desde package.json

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
          # Extraer nombres de packages desde workspaces
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

### Matrix con continue-on-error para experimental

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

### Matrix con build artifacts

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

### Matrix para proyectos Python

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

### Matrix para proyectos Java

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

### Matrix para Docker multi-arch builds

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

- Usá `fail-fast: false` para testing cross-platform — un failure de OS no debería cancelar otros
- Usá `max-parallel` para limitar jobs concurrentes — evita hittear GitHub Actions usage limits
- Usá `include` para excepciones — agrega combinaciones específicas sin expandir la full matrix
- Usá `exclude` para skippear combinaciones known-broken — ahorra CI minutes
- Usá `continue-on-error` para versiones experimentales — las marca como non-blocking
- Mantené el tamaño de matrix razonable — cada combinación cuesta CI minutes
- Usá matrices dinámicas para monorepos — generá la lista de packages a testear
- Nombrá jobs con context de matrix — `name: Test (Node ${{ matrix.node-version }} on ${{ matrix.os }})`

## Common Mistakes

- **Olvidar `fail-fast: false`**: un job que falla cancela todos los demás. Perdés visibilidad de qué combinaciones pasan o fallan.
- **Demasiadas combinaciones**: 3 OS x 3 versiones x 2 databases = 18 jobs. Cada uno cuesta CI minutes. Recortá combinaciones innecesarias con `exclude`.
- **No usar `include` para extras**: agregar una dimensión solo para una combinación crea muchos jobs innecesarios. Usá `include` en su lugar.
- **Sin `max-parallel` limit**: GitHub puede throttle o queuear todos los jobs a la vez. Seteá `max-parallel` a un número razonable.
- **Hardcodear versiones en el workflow**: usá matrices dinámicas desde un config file para mantenibilidad.

## FAQ

### ¿Qué es una matrix strategy en GitHub Actions?

Una forma de correr el mismo job múltiples veces con diferentes valores. Cada combinación de valores de matrix crea un job separado que corre en paralelo. Definila bajo `strategy.matrix` en el job.

### ¿Cuántos jobs puede crear una matrix?

Hasta 256 jobs por matrix. Si excedés esto, spliteá en múltiples jobs o usá matrices dinámicas con subsets más chicos.

### ¿Cómo agrego una combinación extra única?

Usá `include`:

```yaml
strategy:
  matrix:
    node-version: [20, 22]
    include:
      - node-version: 23
        experimental: true
```

### ¿Cómo skippeo una combinación específica?

Usá `exclude`:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node-version: [18, 20, 22]
    exclude:
      - os: windows-latest
        node-version: 18
```

### ¿Puedo generar una matrix dinámicamente?

Sí. Creá un job que outputee un JSON array, luego usá `fromJSON()` en la definición de matrix del job downstream. Esto es útil para monorepos donde la lista de packages cambia frecuentemente.
