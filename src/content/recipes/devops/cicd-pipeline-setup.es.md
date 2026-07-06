---
contentType: recipes
slug: cicd-pipeline-setup
title: "Configuración de Pipelines CI/CD"
description: "Configura pipelines CI/CD automatizados para testing, building y deployment de aplicaciones con GitHub Actions y lo que funciona."
metaDescription: "Configuración de pipelines CI/CD con GitHub Actions: testing automatizado, building, deployment, gestión de ambientes y lo que funciona de seguridad."
difficulty: beginner
topics:
  - devops
tags:
  - ci-cd
  - devops
  - github-actions
  - automation
  - deployment
relatedResources:
  - /guides/cicd-pipeline-guide
  - /recipes/github-actions
  - /recipes/bash-scripting-automation
  - /recipes/cron-jobs
  - /docs/api-status-page-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Configuración de pipelines CI/CD con GitHub Actions: testing automatizado, building, deployment, gestión de ambientes y lo que funciona de seguridad."
  keywords:
    - ci-cd
    - devops
    - github-actions
    - automation
---
## Visión General

Continuous Integration y Continuous Deployment (CI/CD) automatizan el viaje desde el commit de código hasta el deploy en producción. Un pipeline bien configurado ejecuta tests, construye artifacts, escanea vulnerabilidades y despliega a staging o producción sin intervención manual. Esto elimina errores humanos, acelera releases y provee feedback rápido a los desarrolladores.

## Cuándo Usar

Usa este recurso cuando:
- configures un nuevo proyecto y quieras testing automatizado desde el día uno. Consulta [Unit Testing](/recipes/testing/unit-testing) para fundamentos de testing.
- Migres de deploys manuales a releases automatizados. Consulta [GitHub Actions](/recipes/devops/github-actions) para automatización de workflows.
- Agregues scanning de seguridad, linting o gates de calidad de código a tu workflow. Consulta [Container Security Scanning](/recipes/devops/container-security-scanning) para gates de seguridad en CI.
- Construyas una estrategia de deploy multi-ambiente (dev → staging → prod). Consulta [Blue-Green Deployment](/recipes/devops/blue-green-deployment) para releases sin downtime.

## Solución

### Workflow de GitHub Actions

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

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
      - run: npm run test:ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          npm run build
          npm run deploy:staging
```

### Configuración de GitLab CI

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run test:ci

deploy_prod:
  stage: deploy
  script:
    - npm run deploy:production
  only:
    - main
  environment:
    name: production
    url: https://api.example.com
```

## Explicación

Un pipeline de CI/CD de producción típicamente incluye:

1. **Trigger**: Push, pull request o job programado por cron
2. **Build**: Compila, bundlea y crea artifacts
3. **Test**: Tests unitarios, tests de integración, linting, type checking
4. **Seguridad**: Auditoría de dependencias, SAST, escaneo de secretos
5. **Deploy**: Push a staging, smoke tests, promoción a producción
6. **Notificación**: Slack, email o sistema de incident management

**Estrategias de deploy**:
- **Básico**: Deploy directo a producción
- **Blue-Green**: Dos ambientes idénticos; switch de tráfico instantáneo
- **Canary**: Rutea 1% de tráfico a nueva versión; incrementa gradualmente
- **Rolling**: Reemplaza instancias una a una con zero downtime

## Variantes

| Plataforma | Ideal Para | Notas |
|------------|------------|-------|
| GitHub Actions | Open source, repos GitHub | Gratis para repos públicos; marketplace de actions |
| GitLab CI | Proyectos GitLab-hosted | Built-in; excelente para monorepos |
| CircleCI | Testing paralelo rápido | Excelente soporte de Docker |
| Jenkins | On-premise, plugins custom | Self-hosted; alto mantenimiento |
| ArgoCD | Kubernetes GitOps | Declarativo; sincroniza cluster con estado Git |

## Lo que funciona

- **Fail fast**: Ejecuta linting y tests unitarios rápidos antes de tests de integración costosos
- **Paraleliza jobs**: Divide tests por archivo o módulo para reducir tiempo wall-clock
- **Cachea dependencias**: Cachea node_modules, pip cache y capas Docker entre ejecuciones
- **Usa secrets management**: Nunca commitees API keys; usa secrets de GitHub/GitLab o Vault
- **Requiere reviews para prod**: Usa branch protection y CODEOWNERS

## Errores Comunes

1. **Sin promoción de artifacts**: Reconstruir en cada stage introduce no-determinismo
2. **Testear solo en CI**: Los desarrolladores hacen push de código roto y esperan feedback de CI
3. **Secrets en variables de entorno**: Visibles en logs de jobs; usa secrets enmascarados
4. **Sin plan de rollback**: Deploys fallidos necesitan revert instantáneo vía blue-green o imagen anterior
5. **Ignorar tests flaky**: Fallos aleatorios erosionan la confianza en el pipeline

## Preguntas Frecuentes

**P: ¿Debería deployar en cada commit a main?**
R: Sí para staging. Para producción, usa un gate manual o deploy en releases taggeados.

**P: ¿Cómo manejo migraciones de base de datos en CI/CD?**
R: Ejecuta migraciones en un job separado antes del deploy. Usa migraciones backward-compatible para evitar downtime.

**P: ¿Puedo usar el mismo pipeline para microservicios?**
R: Sí, pero usa triggers basados en paths para que solo los servicios afectados se construyan y desplieguen. Herramientas de monorepo (Nx, Turborepo) ayudan.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Deploy Multi-Entorno con Gates

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

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
      - run: npm run test:ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate
      - name: Run SAST
        uses: github/codeql-action/init@v3
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3

  deploy-staging:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Deploy a staging
        run: |
          aws s3 sync dist/ s3://staging-bucket --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.STAGING_DIST_ID }} --paths "/*"

  deploy-production:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Deploy a producción
        run: |
          aws s3 sync dist/ s3://prod-bucket --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.PROD_DIST_ID }} --paths "/*"
```

### Docker Build y Push en CI

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    tags: ['v*']

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Deploy Blue-Green

```yaml
# .github/workflows/blue-green.yml
deploy:
  needs: [test, security]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4
    - name: Determinar entorno activo
      id: active
      run: |
        ACTIVE=$(kubectl get service app -o jsonpath='{.spec.selector.color}')
        echo "active=$ACTIVE" >> $GITHUB_OUTPUT
        if [ "$ACTIVE" = "blue" ]; then
          echo "target=green" >> $GITHUB_OUTPUT
        else
          echo "target=blue" >> $GITHUB_OUTPUT
        fi
    - name: Deploy al entorno inactivo
      run: |
        kubectl set image deployment/app-${{ steps.active.outputs.target }} \
          app=ghcr.io/org/app:${{ github.sha }}
        kubectl rollout status deployment/app-${{ steps.active.outputs.target }}
    - name: Cambiar tráfico
      run: |
        kubectl patch service app -p \
          '{"spec":{"selector":{"color":"${{ steps.active.outputs.target }}"}}}'
    - name: Ejecutar smoke tests
      run: |
        ./scripts/smoke-test.sh https://example.com/health
        if [ $? -ne 0 ]; then
          kubectl patch service app -p \
            '{"spec":{"selector":{"color":"${{ steps.active.outputs.active }}"}}}'
          exit 1
        fi
```

### Deploy Canary con Argo Rollouts

```yaml
# rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-server
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: { duration: 5m }
      - setWeight: 25
      - pause: { duration: 5m }
      - setWeight: 50
      - pause: { duration: 10m }
      - setWeight: 100
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: ghcr.io/org/api:v2.0.0
        ports:
        - containerPort: 8080
```

### Estrategia de Caching en Pipeline

```yaml
# .github/workflows/cached-build.yml
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
      - run: npm test

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max

  pip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: pytest
```

## Mejores Prácticas Adicionales

6. **Promueve artefactos, no código.** Construye una vez, despliega el mismo artefacto a cada entorno:

```yaml
# Construir una vez
build:
  outputs:
    image: ${{ steps.build.outputs.image }}
  steps:
    - run: docker build -t app:${{ github.sha }} .
    - run: docker push app:${{ github.sha }}

# Desplegar la misma imagen a cada entorno
deploy-staging:
  needs: build
  steps:
    - run: kubectl set image deployment/app app=app:${{ github.sha }}

deploy-prod:
  needs: [build, deploy-staging]
  steps:
    - run: kubectl set image deployment/app app=app:${{ github.sha }}
```

7. **Usa reglas de protección de entorno.** Requiere aprobación manual para producción:

```yaml
deploy-production:
  environment:
    name: production  # Requiere aprobación en settings del repo
```

8. **Ejecuta migraciones de base de datos separadamente.** Migra antes de desplegar código nuevo:

```yaml
migrate:
  needs: [test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: |
        flyway migrate -url=$DATABASE_URL \
          -user=$DB_USER -password=$DB_PASSWORD
```

## Errores Comunes Adicionales

6. **No testear deploys.** Añade smoke tests después del deploy:

```bash
#!/bin/bash
# smoke-test.sh
URL=$1
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/health")
if [ "$RESPONSE" != "200" ]; then
    echo "Smoke test falló: $URL retornó $RESPONSE"
    exit 1
fi
echo "Smoke test passed"
```

7. **No hay pipeline de rollback.** Crea un workflow de rollback:

```yaml
# .github/workflows/rollback.yml
name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Versión a la que rollbackear'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: kubectl set image deployment/app app=app:${{ inputs.version }}
      - run: kubectl rollout status deployment/app
```

## FAQ Adicional

### ¿Cómo manejo deploys de feature branches?

Usa entornos preview que despliegan en cada PR:

```yaml
deploy-preview:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  steps:
    - run: |
        PREVIEW_URL="pr-${{ github.event.number }}.preview.example.com"
        ./scripts/deploy-preview.sh $PREVIEW_URL
```

### ¿Cómo paralelizo suites de tests?

Divide tests entre múltiples runners:

```yaml
test:
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - run: npm test -- --shard=${{ matrix.shard }}/4
```

## Tips de Rendimiento

1. **Cachea agresivamente.** Cachea dependencias, Docker layers y outputs de build:

```yaml
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      .next/cache
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

2. **Usa jobs condicionales.** Salta jobs innecesarios según archivos cambiados:

```yaml
test:
  steps:
    - uses: dorny/paths-filter@v3
      id: changes
      with:
        filters: |
          src:
            - 'src/**'
          docs:
            - 'docs/**'
    - if: steps.changes.outputs.src == 'true'
      run: npm test
```

3. **Usa workflows reutilizables.** DRY tus definiciones de pipeline:

```yaml
# .github/workflows/test.yml (reutilizable)
on:
  workflow_call:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm test

# .github/workflows/main.yml
jobs:
  test:
    uses: ./.github/workflows/test.yml
```

4. **Setea timeouts de jobs.** Previene jobs colgados que bloqueen el pipeline:

```yaml
test:
  timeout-minutes: 15
  runs-on: ubuntu-latest
```
