---

contentType: recipes
slug: cicd-pipeline-setup
title: "CI/CD Pipeline Setup"
description: "Set up automated CI/CD pipelines for testing, building, and deploying applications with GitHub Actions and what works."
metaDescription: "CI/CD pipeline setup with GitHub Actions: automated testing, building, deployment, environment management, and pipeline security what works."
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
  - /recipes/bash-backup-rotation
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "CI/CD pipeline setup with GitHub Actions: automated testing, building, deployment, environment management, and pipeline security what works."
  keywords:
    - ci-cd
    - devops
    - github-actions
    - automation

---
## Overview

Continuous Integration and Continuous Deployment (CI/CD) pipelines automate the journey from code commit to production deployment. A well-configured pipeline runs tests, builds artifacts, scans for vulnerabilities, and deploys to staging or production with zero manual intervention. This eliminates human error, speeds up releases, and provides fast feedback to developers.

## When to Use

Use this resource when:
- Setting up a new project and want automated testing from day one. See [Unit Testing](/recipes/testing/unit-testing) for test fundamentals.
- Migrating from manual deployments to automated releases. See [GitHub Actions](/recipes/devops/github-actions) for workflow automation.
- Adding security scanning, linting, or code quality gates to your workflow. See [Container Security Scanning](/recipes/devops/container-security-scanning) for CI security gates.
- Building a multi-environment deployment strategy (dev → staging → prod). See [Blue-Green Deployment](/recipes/devops/blue-green-deployment) for zero-downtime releases.

## Solution

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
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

### GitLab CI Configuration

```yaml
# .gitlab-ci.yml
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
  coverage: '/All files[^|]\|[^|]\s+([\d.]+)/'

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

## Explanation

A production CI/CD pipeline typically includes:

1. **Trigger**: Push, pull request, or scheduled cron job
2. **Build**: Compile, bundle, and create artifacts
3. **Test**: Unit tests, integration tests, linting, type checking
4. **Security**: Dependency audit, SAST, secret scanning
5. **Deploy**: Push to staging, run smoke tests, promote to production
6. **Notify**: Slack, email, or incident management system

**Deployment strategies**:
- **Basic**: Direct deploy to production
- **Blue-Green**: Two identical environments; switch traffic instantly
- **Canary**: Route 1% traffic to new version; increase gradually
- **Rolling**: Replace instances one by one with zero downtime

## Variants

| Platform | Best For | Notes |
|----------|----------|-------|
| GitHub Actions | Open source, GitHub repos | Free for public repos; marketplace of actions |
| GitLab CI | GitLab-hosted projects | Built-in; great for monorepos |
| CircleCI | Fast parallel testing | Excellent Docker support |
| Jenkins | On-premise, custom plugins | Self-hosted; high maintenance |
| ArgoCD | Kubernetes GitOps | Declarative; syncs cluster to Git state |

## What Works

- **Fail fast**: Run linting and fast unit tests before expensive integration tests
- **Parallelize jobs**: Split tests by file or module to reduce wall-clock time
- **Cache dependencies**: Cache node_modules, pip cache, and Docker layers between runs
- **Use secrets management**: Never commit API keys; use GitHub/GitLab secrets or Vault
- **Require reviews for prod**: Use branch protection and CODEOWNERS

## Common Mistakes

1. **No artifact promotion**: Rebuilding in each stage introduces non-determinism
2. **Testing only in CI**: Developers push broken code and wait for CI feedback
3. **Secrets in environment variables**: Visible in job logs; use masked secrets instead
4. **No rollback plan**: Failed deployments need instant revert via blue-green or previous image
5. **Ignoring flaky tests**: Random failures erode trust in the pipeline

## Frequently Asked Questions

**Q: Should I deploy on every commit to main?**
A: Yes for staging. For production, use a manual gate or deploy on tagged releases.

**Q: How do I handle database migrations in CI/CD?**
A: Run migrations in a separate job before the deploy. Use backward-compatible migrations to avoid downtime.

**Q: Can I use the same pipeline for microservices?**
A: Yes, but use path-based triggers so only affected services build and deploy. Monorepo tools (Nx, Turborepo) help.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Multi-Environment Deployment with Gates

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
      - name: Deploy to staging
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
      - name: Deploy to production
        run: |
          aws s3 sync dist/ s3://prod-bucket --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.PROD_DIST_ID }} --paths "/*"
```

### Docker Build and Push in CI

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

### Blue-Green Deployment Script

```yaml
# .github/workflows/blue-green.yml
deploy:
  needs: [test, security]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4
    - name: Determine active environment
      id: active
      run: |
        ACTIVE=$(kubectl get service app -o jsonpath='{.spec.selector.color}')
        echo "active=$ACTIVE" >> $GITHUB_OUTPUT
        if [ "$ACTIVE" = "blue" ]; then
          echo "target=green" >> $GITHUB_OUTPUT
        else
          echo "target=blue" >> $GITHUB_OUTPUT
        fi
    - name: Deploy to inactive environment
      run: |
        kubectl set image deployment/app-${{ steps.active.outputs.target }} \
          app=ghcr.io/org/app:${{ github.sha }}
        kubectl rollout status deployment/app-${{ steps.active.outputs.target }}
    - name: Switch traffic
      run: |
        kubectl patch service app -p \
          '{"spec":{"selector":{"color":"${{ steps.active.outputs.target }}"}}}'
    - name: Run smoke tests
      run: |
        ./scripts/smoke-test.sh https://example.com/health
        if [ $? -ne 0 ]; then
          kubectl patch service app -p \
            '{"spec":{"selector":{"color":"${{ steps.active.outputs.active }}"}}}'
          exit 1
        fi
```

### Canary Deployment with Argo Rollouts

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

### Pipeline Caching Strategy

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

## Additional Best Practices

6. **Promote artifacts, not code.** Build once, deploy the same artifact to each environment:

```yaml
# Build once
build:
  outputs:
    image: ${{ steps.build.outputs.image }}
  steps:
    - run: docker build -t app:${{ github.sha }} .
    - run: docker push app:${{ github.sha }}

# Deploy same image to each env
deploy-staging:
  needs: build
  steps:
    - run: kubectl set image deployment/app app=app:${{ github.sha }}

deploy-prod:
  needs: [build, deploy-staging]
  steps:
    - run: kubectl set image deployment/app app=app:${{ github.sha }}
```

7. **Use environment protection rules.** Require manual approval for production:

```yaml
deploy-production:
  environment:
    name: production  # Requires approval in repo settings
```

8. **Run database migrations separately.** Migrate before deploying new code:

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

## Additional Common Mistakes

6. **Not testing deployments.** Add smoke tests after deploy:

```bash
#!/bin/bash
# smoke-test.sh
URL=$1
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/health")
if [ "$RESPONSE" != "200" ]; then
    echo "Smoke test failed: $URL returned $RESPONSE"
    exit 1
fi
echo "Smoke test passed"
```

7. **No pipeline for rollback.** Create a rollback workflow:

```yaml
# .github/workflows/rollback.yml
name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: kubectl set image deployment/app app=app:${{ inputs.version }}
      - run: kubectl rollout status deployment/app
```

## Additional FAQ

### How do I handle feature branch deployments?

Use preview environments that deploy on every PR:

```yaml
deploy-preview:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  steps:
    - run: |
        PREVIEW_URL="pr-${{ github.event.number }}.preview.example.com"
        ./scripts/deploy-preview.sh $PREVIEW_URL
```

### How do I parallelize test suites?

Split tests across multiple runners:

```yaml
test:
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - run: npm test -- --shard=${{ matrix.shard }}/4
```

## Performance Tips

1. **Cache aggressively.** Cache dependencies, Docker layers, and build outputs:

```yaml
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      .next/cache
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

2. **Use conditional jobs.** Skip unnecessary jobs based on changed files:

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

3. **Use reusable workflows.** DRY your pipeline definitions:

```yaml
# .github/workflows/test.yml (reusable)
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

4. **Set job timeouts.** Prevent stuck jobs from blocking the pipeline:

```yaml
test:
  timeout-minutes: 15
  runs-on: ubuntu-latest
```
