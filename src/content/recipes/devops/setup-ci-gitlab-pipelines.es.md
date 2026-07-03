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
