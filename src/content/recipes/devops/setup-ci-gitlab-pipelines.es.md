---
contentType: recipes
slug: setup-ci-gitlab-pipelines
title: "Configurar CI con GitLab Pipelines"
description: "Cómo configurar pipelines de GitLab CI/CD para testing, building y deployment usando .gitlab-ci.yml con stages, jobs, caching y runners."
metaDescription: "Configura pipelines de GitLab CI/CD para testing, building y deploying con .gitlab-ci.yml, stages, caching y runners propios."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - gitlab
  - ci-cd
  - yaml
  - automation
  - runner
relatedResources:
  - /recipes/github-actions
  - /recipes/docker-basics
  - /recipes/environment-variables
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Configura pipelines de GitLab CI/CD para testing, building y deploying con .gitlab-ci.yml, stages, caching y runners propios."
  keywords:
    - gitlab
    - ci-cd
    - pipeline
    - runner
    - yaml
    - automation
    - devops
    - recipe
---

## Descripción General

GitLab CI/CD es una plataforma de integración y despliegue continuo integrada que utiliza un archivo `.gitlab-ci.yml` para definir pipelines. Los jobs se ejecutan en contenedores Docker aislados en runners compartidos o auto-hospedados, facilitando la automatización de testing, building y releases.

Antes de los pipelines de CI/CD, los equipos ejecutaban tests y deployments manualmente desde máquinas locales. Esto generaba bugs de "funciona en mi laptop", entornos inconsistentes y ninguna traza de auditoría sobre qué se desplegó y cuándo. GitLab CI/CD resuelve esto codificando cada paso del proceso de entrega en YAML versionado.

## Cuándo Usar

Usa esta receta cuando:

- Configuras testing automatizado para un proyecto hospedado en GitLab en cada push o merge request.
- Construyes y publicas imágenes Docker a un registry como parte del proceso de release.
- Despliegas a staging o producción con variables de entorno y aprobaciones manuales.
- Ejecutas pipelines programadas para backups nocturnos, auditorías de dependencias o tareas de limpieza.
- Usas runners auto-hospedados para infraestructura privada o entornos de build especializados.

## Implementación Paso a Paso

### Pipeline Básica (Node.js)

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run lint
    - npm run test
  cache:
    paths:
      - node_modules/
    key: ${CI_COMMIT_REF_SLUG}

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

deploy:
  stage: deploy
  image: alpine
  script:
    - echo "Deploying to production"
  environment:
    name: production
    url: https://app.example.com
  only:
    - main
```

### Docker Build y Push

```yaml
stages:
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

build-docker:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $DOCKER_IMAGE .
    - docker push $DOCKER_IMAGE
  only:
    - main

deploy-staging:
  stage: deploy
  image: alpine/k8s:1.30.2
  script:
    - kubectl set image deployment/app app=$DOCKER_IMAGE -n staging
  environment:
    name: staging
  only:
    - main
```

### Runner Auto-Hospedado

```bash
# Registrar un runner en tu propio servidor
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "YOUR_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --description "self-hosted-runner"

# .gitlab-ci.yml apuntando a runner específico
build:
  stage: build
  tags:
    - self-hosted-runner
  script:
    - make build
```

### Jobs en Matriz (Testing Paralelo)

```yaml
stages:
  - test

test:
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm test
```

## Lo que funciona

- **Usa `npm ci` en lugar de `npm install`** en CI para builds reproducibles que respeten estrictamente `package-lock.json`.
- **Cachea dependencias** entre jobs usando la keyword `cache` para reducir drásticamente los tiempos de build.
- **Fija versiones de imágenes Docker** en lugar de usar tags `latest` para garantizar builds reproducibles.
- **Usa `artifacts` para pasar archivos** entre stages (ej., bundles compilados de build a deploy).
- **Configura `only` o `rules` con cuidado** para evitar ejecutar jobs costosos de deploy en branches de feature.
- **Usa bloques `environment`** para jobs de deployment para trackear qué está desplegado y habilitar rollbacks.

## Errores Comunes

- **No cachear `node_modules`** hace que cada job reinstale dependencias desde cero, desperdiciando minutos por ejecución.
- **Usar `only` en lugar de `rules`** — `rules` es la forma moderna y más flexible de controlar la ejecución de jobs.
- **Ejecutar DIND sin TLS** puede exponer el socket Docker a otros jobs en el mismo runner.
- **Almacenar secrets en `.gitlab-ci.yml`** — siempre usa variables de CI/CD desde la configuración del proyecto.
- **Olvidar `tags` para runners propios** hace que los jobs se encolen indefinidamente en runners compartidos.

## Preguntas Frecuentes

**Q: ¿Qué es un GitLab Runner?**
A: Un GitLab Runner es el agente que ejecuta los jobs de un pipeline. Puede ser compartido, específico de grupo o de proyecto, y corre en Linux, Windows, macOS o Kubernetes.

**Q: ¿Cómo cacheo dependencias en GitLab CI?**
A: Usa la palabra clave `cache` para persistir directorios como `node_modules`, `.m2` o `.pip` entre pipelines. Usa `key` para delimitar cachés por rama o lockfile.

**Q: ¿Cuál es la diferencia entre stages y jobs?**
A: Los stages definen fases de ejecución (build, test, deploy) que corren secuencialmente. Los jobs son las tareas individuales dentro de un stage, que pueden correr en paralelo si comparten stage.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Ejecución de Jobs Basada en Rules

```yaml
# Sintaxis moderna de rules (reemplaza only/except)
test:
  stage: test
  image: node:20
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - src/**/*
        - package.json
      when: on_success
    - if: $CI_COMMIT_BRANCH == "main"
      when: on_success
    - when: never  # Saltar para todos los demás casos
  script:
    - npm ci
    - npm test

deploy_prod:
  stage: deploy
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual  # Requiere click manual
      allow_failure: false
  script:
    - npm run deploy:production
  environment:
    name: production
```

### Aprobaciones Manuales con Environments

```yaml
stages:
  - build
  - test
  - staging
  - production

deploy_staging:
  stage: staging
  image: alpine/k8s:1.30.2
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - kubectl apply -f k8s/staging/
  environment:
    name: staging
    url: https://staging.example.com
    on_stop: stop_staging

stop_staging:
  stage: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
  script:
    - kubectl delete -f k8s/staging/
  environment:
    name: staging
    action: stop

deploy_production:
  stage: production
  image: alpine/k8s:1.30.2
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
  script:
    - kubectl apply -f k8s/production/
  environment:
    name: production
    url: https://example.com
  allow_failure: false
```

### Pipelines Programados

```yaml
# .gitlab-ci.yml
stages:
  - maintenance

nightly_backup:
  stage: maintenance
  image: postgres:16
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - pg_dump $DATABASE_URL > backup.sql
    - aws s3 cp backup.sql s3://backups/$(date +%Y%m%d).sql
  variables:
    DATABASE_URL: $PROD_DATABASE_URL

dependency_audit:
  stage: maintenance
  image: node:20
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - npm audit --audit-level=high
    - npx depcheck
  allow_failure: true
```

```yaml
# Configurar schedule en GitLab UI o vía API:
# Settings > CI/CD > Scheduled Pipelines
# O vía API:
# curl --request POST --header "PRIVATE-TOKEN: $TOKEN" \
#   "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipeline_schedules" \
#   --data "description=Nightly" --data "ref=main" \
#   --data "cron=0 2 * * *" --data "cron_timezone=UTC"
```

### Services (Contenedores de Test)

```yaml
test:
  stage: test
  image: node:20
  services:
    - name: postgres:16
      alias: postgres
      variables:
        POSTGRES_DB: testdb
        POSTGRES_USER: testuser
        POSTGRES_PASSWORD: testpass
    - name: redis:7-alpine
      alias: redis
  variables:
    DATABASE_URL: postgres://testuser:testpass@postgres:5432/testdb
    REDIS_URL: redis://redis:6379
  script:
    - npm ci
    - npx prisma migrate deploy
    - npm test
```

### Pasar Artefactos Entre Jobs

```yaml
build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
      - node_modules/
    expire_in: 1 hour
    reports:
      junit: test-results.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

deploy:
  stage: deploy
  image: alpine:latest
  needs:
    - job: build
      artifacts: true
  script:
    - ls dist/  # Artefactos de build disponibles
    - tar czf app.tar.gz dist/
    - scp app.tar.gz deploy@server:/app/
```

### Pipeline de Merge Request con Code Quality

```yaml
code_quality:
  stage: test
  image: docker:24
  services:
    - docker:24-dind
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  variables:
    DOCKER_DRIVER: overlay2
  script:
    - docker run --env CODE_QUALITY_IMAGE="$CODE_QUALITY_IMAGE"
      --volume "$PWD:/code" --volume "/var/run/docker.sock:/var/run/docker.sock"
      "$CODE_QUALITY_IMAGE" /code
  artifacts:
    reports:
      codequality: gl-code-quality-report.json

sast:
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  include:
    - template: Security/SAST.gitlab-ci.yml
```

### Includes Condicionales

```yaml
# .gitlab-ci.yml
include:
  - local: '/.gitlab/ci/test.yml'
  - local: '/.gitlab/ci/build.yml'
  - local: '/.gitlab/ci/deploy.yml'
    rules:
      - if: $CI_COMMIT_BRANCH == "main"

# .gitlab/ci/test.yml
test:
  stage: test
  script:
    - npm test
```

## Mejores Prácticas Adicionales

7. **Usa `needs` para pipelines DAG.** Jobs con `needs` pueden iniciar inmediatamente sin esperar todo el stage:

```yaml
lint:
  stage: test
  script: npm run lint

typecheck:
  stage: test
  script: npm run typecheck

unit_test:
  stage: test
  needs: [lint, typecheck]  # Inicia después de que lint y typecheck pasen
  script: npm test
```

8. **Usa `retry` para operaciones flaky.** Reintenta jobs dependientes de red:

```yaml
deploy:
  stage: deploy
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure
  script:
    - kubectl apply -f k8s/
```

9. **Usa `interruptible` para pipelines de MR.** Cancela pipelines viejos cuando se pushean nuevos commits:

```yaml
test:
  stage: test
  interruptible: true
  script:
    - npm test
```

## Errores Comunes Adicionales

6. **Usar `only/except` en vez de `rules`.** La sintaxis `only/except` está deprecada. Usa `rules` para pipelines modernos:

```yaml
# Viejo (deprecado)
deploy:
  only:
    - main

# Nuevo (recomendado)
deploy:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

7. **No usar el keyword `needs`.** Sin `needs`, los jobs esperan a que todos los jobs del stage anterior terminen:

```yaml
# Lento: espera a todos los jobs de test
deploy:
  stage: deploy

# Rápido: inicia tan pronto como build termine
deploy:
  needs: [build]
```

## FAQ Adicional

### ¿Cómo ejecuto jobs solo en releases taggeados?

```yaml
release:
  rules:
    - if: $CI_COMMIT_TAG
  script:
    - npm publish
```

### ¿Cómo comparto variables entre jobs?

Usa `variables` a nivel top o usa un template:

```yaml
variables:
  NODE_VERSION: "20"
  DOCKER_REGISTRY: registry.example.com

.template: &build_template
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build

build_app:
  <<: *build_template
  stage: build

build_worker:
  <<: *build_template
  stage: build
  script:
    - npm ci
    - npm run build:worker
```

### ¿Cómo disparo pipelines downstream?

```yaml
trigger_downstream:
  trigger:
    project: org/other-project
    branch: main
    strategy: depend  # Esperar a que downstream termine
```

## Tips de Rendimiento

1. **Usa `needs` para ejecución DAG.** Reduce el wall-clock time iniciando jobs tan pronto como sus dependencias terminen:

```yaml
test:
  needs: [build]  # Inicia inmediatamente después de build
```

2. **Cachea por rama.** Evita colisiones de caché entre ramas:

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
```

3. **Usa `interruptible: true` para jobs de MR.** Ahorra tiempo de runner cancelando pipelines reemplazados:

```yaml
test:
  interruptible: true
```

4. **Usa imágenes pequeñas.** Reduce el tiempo de pull:

```yaml
# Mal: imagen grande
image: node:20

# Bien: imagen slim
image: node:20-slim

# Mejor: alpine si es compatible
image: node:20-alpine
```

5. **Usa `before_script` y `after_script` con cuidado.** Se ejecutan para cada job en el archivo:

```yaml
default:
  before_script:
    - npm ci --silent
  after_script:
    - echo "Job completado con exit code $?"
```
