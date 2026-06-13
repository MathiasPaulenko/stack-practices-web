---
contentType: recipes
slug: github-actions
title: "GitHub Actions CI/CD"
description: "Cómo construir y desplegar con GitHub Actions usando workflows, matrices, caching y secrets."
metaDescription: "Ejemplos prácticos de GitHub Actions para CI/CD. Aprende sintaxis de workflows, matrices de build, caching, secrets y workflows reutilizables."
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
author: "StackPractices"
seo:
  metaDescription: "Ejemplos prácticos de GitHub Actions para CI/CD. Aprende sintaxis de workflows, matrices de build, caching, secrets y workflows reutilizables."
  keywords:
    - github actions
    - ci-cd
    - workflow
    - yaml
    - automatización
    - build matrix
    - caching
    - secrets
---

## Visión general

GitHub Actions es una plataforma de CI/CD integrada en GitHub. Automatiza workflows de software desde testing hasta deployment usando pipelines definidos en YAML, activados por eventos de Git (push, PR, release).

Antes de que CI/CD se volviera mainstream, los equipos dependían de pasos manuales para verificar el código: ejecutar tests localmente, construir artefactos en la máquina de un desarrollador y desplegar vía scripts SSH. Esto era propenso a errores, inconsistente e imposible de escalar. GitHub Actions resuelve esto convirtiendo cada evento de Git en un workflow automatizado y reproducible que se ejecuta en entornos aislados.

Al definir tu pipeline como código dentro de tu repositorio, obtienes control de versiones, revisión por pares y auditabilidad para todo tu proceso de entrega. Una marca verde en un pull request se convierte en una señal de confianza de que el código compila, los tests pasan y las guías de estilo se cumplen antes de que alguien haga merge.

## Cuándo usarlo

Usa esta recipe cuando:

- Ejecutas tests en cada pull request para detectar regresiones antes de que lleguen a producción
- Construyes y pusheas imágenes Docker en tags de release para despliegues inmutables
- Despliegas a ambientes de staging o producción con aprobaciones controladas
- Haces chequeos de linting y formateo antes del merge para mantener un estilo de código consistente
- Ejecutas tareas programadas (workflows basados en cron) como auditorías de dependencias o backups nocturnos
- Generas y publicas documentación automáticamente cuando cambian los archivos fuente
- Escaneas vulnerabilidades de seguridad en dependencias en cada commit

## Solución

### Workflow básico (Node.js CI)

Este workflow se ejecuta en cada push y pull request dirigido a `main`. Descarga el código, configura Node.js, instala dependencias y ejecuta el pipeline completo de validación.

```yaml
# .github/workflows/ci.yml
name: CI

# Trigger: ejecutar en push y PR a la rama main
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Descarga el código del repositorio
      - uses: actions/checkout@v4

      # Configura Node.js con cache de npm integrado
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Instala dependencias usando el lock file para reproducibilidad
      - run: npm ci

      # Ejecuta linting para detectar problemas de estilo temprano
      - run: npm run lint

      # Ejecuta la suite de tests
      - run: npm run test

      # Construye el artefacto de producción
      - run: npm run build
```

### Build Matrix

Una estrategia de matriz ejecuta el mismo job a través de múltiples combinaciones de SO y versiones del runtime. Esto detecta bugs específicos de plataforma y garantiza compatibilidad sin duplicar código del workflow.

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

### Deploy con Secrets

Este job solo se ejecuta después de que el job `test` tenga éxito y solo en la rama `main`. Los secrets se inyectan en runtime desde la configuración del repositorio y nunca se exponen en los logs.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test              # espera a que el job test pase
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying with token"
          curl -X POST https://api.deploy.com/release \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}"
```

### Caching de dependencias

El cache almacena dependencias descargadas entre ejecuciones del workflow. La clave del cache incluye el SO y un hash del lock file, por lo que se invalida automáticamente cuando cambian las dependencias.

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

### Workflow reutilizable

Cuando múltiples repositorios necesitan la misma lógica de pipeline, extráela a un workflow reutilizable. Los callers pasan inputs y reciben outputs, manteniendo la lógica compartida en un solo lugar.

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

Llámalo desde otro repositorio:

```yaml
jobs:
  call-lint:
    uses: org/shared-workflows/.github/workflows/reusable-lint.yml@main
    with:
      node-version: '20'
```

## Mejores prácticas

- **Fija versiones de actions** usando full commit SHAs para seguridad de supply chain. Aunque tags como `v4` son convenientes, un maintainer comprometido podría repuntar el tag a código malicioso. Fijar a un SHA garantiza que se ejecuta exactamente el mismo código siempre.
- **Usa `npm ci`** en lugar de `npm install` en CI para builds reproducibles. `npm ci` respeta estrictamente `package-lock.json`, eliminando la deriva entre entornos local y CI.
- **Separa jobs**: Test, build y deploy como jobs separados con dependencias explícitas (`needs`). Esto hace que los fallos estén aislados, permite ejecución paralela y produce logs más claros.
- **Usa concurrency groups** para cancelar runs obsoletos cuando se hacen nuevos pushes. Esto ahorra minutos de CI y evita que despliegues antiguos sobrescriban otros más nuevos.
- **Almacena secrets en GitHub Secrets**, nunca hardcodees tokens en archivos de workflow. Los secrets están encriptados en reposo y enmascarados en logs. Incluso repositorios privados pueden filtrarse a través de PRs de forks.
- **Usa reusable workflows** para lógica compartida entre múltiples repositorios. Extrae pasos comunes a un repositorio central para que las correcciones se propaguen automáticamente a todos los consumidores.
- **Falla rápido con permisos estrictos**: establece `permissions: read-all` a nivel de workflow y otorga write solo donde sea necesario. Esto limita el radio de explosión si una action es comprometida.
- **Monitorea tu factura de Actions**: establece límites de gasto y revisa el uso mensualmente. Los builds de matriz a través de 3 SOs y 3 versiones de Node crean 9 jobs por commit.

## Errores comunes

- **Usar `actions/checkout` sin especificar un ref**, causando issues de detached HEAD o descargando el commit equivocado cuando se dispara por un tag. Usa siempre `ref: ${{ github.ref }}` explícitamente cuando sea necesario.
- **Ejecutar deployment en cada push** en lugar de filtrar por branch o tag. Esto despliega ramas de características sin terminar a producción y evade tu proceso de release por completo.
- **No cachear dependencias**, causando builds que descargan internet en cada ejecución. Un cache bien afinado puede reducir los tiempos de build de minutos a segundos.
- **Usar `ubuntu-latest` cuando necesitas un OS específico** para compilación nativa. La etiqueta `latest` migra con el tiempo; fija a una versión específica como `ubuntu-22.04` para reproducibilidad.
- **Olvidar setear `if: failure()`** para steps de notificación en error. Sin esta condición, las alertas de Slack o email solo se disparan en éxito, que es exactamente lo opuesto a lo que quieres.
- **Hardcodear valores de entorno** en archivos de workflow en lugar de usar variables de repositorio. Esto te obliga a editar YAML cada vez que cambia una URL o versión, creando commits innecesarios.
- **Otorgar permisos excesivamente amplios** como `permissions: write-all`. Si una action de terceros es comprometida, podría reescribir tu código, crear releases o modificar secrets. Usa el principio de menor privilegio.

## Preguntas frecuentes

**P: ¿Cómo ejecuto un workflow manualmente?**
R: Agrega `workflow_dispatch:` al bloque `on:`. Puedes activarlo desde la pestaña Actions, opcionalmente proporcionando parámetros de entrada que tu workflow puede consumir.

**P: ¿Puedo reusar workflows entre repositorios?**
R: Sí. Crea un workflow con `on: workflow_call` en un repositorio central, luego referéncialo desde otros usando `uses: org/shared-workflows/.github/workflows/reusable.yml@main`. Esto mantiene la lógica compartida actualizada en un solo lugar.

**P: ¿Cómo debuggeo un workflow que falla?**
R: Usa la action `tmate` para spawnear una sesión SSH interactiva dentro del runner, o agrega `set -x` en steps de shell para output verbose. También puedes habilitar el debugging de steps estableciendo el secret `ACTIONS_STEP_DEBUG` a `true`.

**P: ¿Cómo evito que workflows se ejecuten desde forks?**
R: Usa `if: github.event.pull_request.head.repo.full_name == github.repository` para saltear workflows disparados por forks externos. Para workflows sensibles, desactiva los triggers de PR de forks por completo y requiere aprobación manual en su lugar.

**P: ¿Cuál es la diferencia entre `workflow_dispatch` y `repository_dispatch`?**
R: `workflow_dispatch` se dispara manualmente desde la UI de GitHub o la API. `repository_dispatch` se dispara externamente vía la API de GitHub, útil para integrar con servicios de terceros que necesitan disparar builds fuera de eventos de Git.
