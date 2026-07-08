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
  - devops
  - github-actions
  - ci-cd
  - automation
  - deployment
relatedResources:
  - /recipes/unit-testing
  - /recipes/docker-basics
  - /recipes/environment-variables
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

- Ejecutas tests en cada pull request para detectar regresiones antes de que lleguen a producción. Consulta [Unit Testing](/recipes/testing/unit-testing) para automatización de tests.
- Construyes y pusheas imágenes Docker en tags de release para despliegues inmutables. Consulta [Docker Basics](/recipes/devops/docker-basics) para construcción de imágenes.
- Despliegas a ambientes de staging o producción con aprobaciones controladas. Consulta [Environment Variables](/recipes/devops/environment-variables) para gestionar configuración de deployment.
- Haces chequeos de linting y formateo antes del merge para mantener un estilo de código consistente. Consulta [Pre-Commit Hooks](/recipes/devops/pre-commit-hooks) para calidad de código local.
- Ejecutas tareas programadas (workflows basados en cron) como auditorías de dependencias o backups nocturnos. Consulta [Scheduled Jobs](/recipes/devops/background-jobs) para patrones cron.
- Generas y publicas documentación automáticamente cuando cambian los archivos fuente
- Escaneas vulnerabilidades de seguridad en dependencias en cada commit. Consulta [Secret Management](/recipes/devops/secret-management) para seguridad de credenciales.

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

## Lo que funciona

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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Reusable Workflow con Matrix Strategy

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
      fail-fast: false  # No cancelar otros jobs en fallo
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
        exclude:
          - os: macos-latest
            node: 18  # Saltar Node viejo en macOS
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
    # Revisores requeridos deben aprobar antes del deployment
    # Configurado en repo Settings > Environments
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
# Uso en un workflow
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

### Jobs y Steps Condicionales

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

### Job Summary para Comentarios de PR

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

## Mejores Prácticas Adicionales

1. **Pinea versiones de actions a SHA.** Los tags pueden ser re-tagueados; los SHA son inmutables:

```yaml
# Mal: el tag puede cambiar
- uses: actions/checkout@v4

# Mejor: SHA es inmutable
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4
```

1. **Usa `concurrency` para cancelar runs stale.** No gastes minutes en pushes desactualizados:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

1. **Setea timeouts en jobs.** Previene jobs colgados de consumir minutes:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15  # Matar después de 15 minutos
```

## Errores Comunes Adicionales

1. **No usar grupos de `concurrency`.** Sin esto, cada push a un PR dispara un run nuevo, gastando minutes:

```yaml
# Añade esto para cancelar runs previos
concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

1. **Usar `needs` sin `if: always()`.** Los jobs downstream se saltan por defecto si upstream falla:

```yaml
notify:
  needs: [test, lint, deploy]
  if: always()  # Correr independientemente del status upstream
  runs-on: ubuntu-latest
  steps:
    - run: ./notify.sh ${{ job.status }}
```

## FAQ

### ¿Cómo comparto secrets entre entornos?

Usa secrets a nivel de repositorio para valores no sensibles. Usa secrets a nivel de environment para credenciales de producción. Referéncialos con `${{ secrets.SECRET_NAME }}`:

```yaml
steps:
  - run: deploy.sh
    env:
      API_KEY: ${{ secrets.PROD_API_KEY }}  # Secret de environment
      LOG_LEVEL: ${{ vars.LOG_LEVEL }}       # Variable de repositorio
```

### ¿Cómo corro jobs secuencialmente vs en paralelo?

Por defecto, los jobs corren en paralelo. Usa `needs` para crear dependencias:

```yaml
jobs:
  build:    # Corre primero
    runs-on: ubuntu-latest
  test:     # Corre después de build
    needs: build
    runs-on: ubuntu-latest
  deploy:   # Corre después de test
    needs: test
    runs-on: ubuntu-latest
```

### ¿Cómo paso artefactos entre jobs?

Usa `actions/upload-artifact` y `actions/download-artifact`:

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

## Tips de Rendimiento

1. **Cachéa dependencias agresivamente.** Cachea npm, pip, Maven y Gradle:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

1. **Usa self-hosted runners para builds pesados.** Salta la cola y usa más CPU:

```yaml
runs-on: self-hosted  # Tu propio hardware
```

1. **Divide test suites entre runners.** Usa matrix para paralelizar:

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npm test -- --shard=${{ matrix.shard }}/4
```

1. **Usa Docker layer caching.** Acelera builds de imágenes:

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```
