---




contentType: recipes
slug: setup-ci-gitlab-pipelines
title: "Setup CI with GitLab Pipelines"
description: "How to configure GitLab CI/CD pipelines for testing, building, and deploying applications using .gitlab-ci.yml with stages, jobs, caching, and runners."
metaDescription: "Configure GitLab CI/CD pipelines for testing, building, and deploying with .gitlab-ci.yml, stages, caching, and self-hosted runners."
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
  - /recipes/aws-ecs-fargate
  - /recipes/background-jobs
  - /guides/complete-guide-ci-cd-github-actions
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Configure GitLab CI/CD pipelines for testing, building, and deploying with .gitlab-ci.yml, stages, caching, and self-hosted runners."
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

## Overview

GitLab CI/CD is a built-in continuous integration and deployment platform that uses a `.gitlab-ci.yml` file to define pipelines. Jobs run in isolated Docker containers on shared or self-hosted runners, making it easy to automate testing, building, and releasing software.

Before CI/CD pipelines, teams ran tests and deployments manually from local machines. This led to "works on my laptop" bugs, inconsistent environments, and no audit trail of what was deployed when. GitLab CI/CD solves this by codifying every step of the delivery process in version-controlled YAML.

## When to Use

Use this recipe when:

- Setting up automated testing for a GitLab-hosted project on every push or merge request.
- Building and pushing Docker images to a registry as part of the release process.
- Deploying to staging or production with environment-specific variables and manual approvals.
- Running scheduled pipelines for nightly backups, dependency audits, or periodic cleanup tasks.
- Using self-hosted runners for private infrastructure or specialized build environments.

## Step-by-Step Implementation

### Basic Pipeline (Node.js)

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

### Docker Build and Push

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

### Self-Hosted Runner

```yaml
# Register a runner on your own server
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "YOUR_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --description "self-hosted-runner"

# .gitlab-ci.yml targeting specific runner
build:
  stage: build
  tags:
    - self-hosted-runner
  script:
    - make build
```

### Matrix Jobs (Parallel Testing)

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

## What Works

- **Use `npm ci` instead of `npm install`** in CI for reproducible builds that strictly respect `package-lock.json`.
- **Cache dependencies** between jobs using the `cache` keyword to dramatically reduce build times.
- **Pin Docker image versions** instead of using `latest` tags to ensure reproducible builds.
- **Use `artifacts` to pass files** between stages (e.g., compiled bundles from build to deploy).
- **Set `only` or `rules` carefully** to avoid running expensive deploy jobs on feature branches.
- **Use `environment` blocks** for deployment jobs to track what is deployed and enable rollbacks.

## Common Mistakes

- **Not caching `node_modules`** causes every job to reinstall dependencies from scratch, wasting minutes per run.
- **Using `only` instead of `rules`** — `rules` is the modern, more flexible way to control job execution.
- **Running DIND without TLS** can expose the Docker socket to other jobs on the same runner.
- **Storing secrets in `.gitlab-ci.yml`** — always use CI/CD variables from the project settings.
- **Forgetting `tags` for self-hosted runners** causes jobs to queue indefinitely on shared runners.

## Frequently Asked Questions

**Q: What is a GitLab Runner?**
A: A GitLab Runner is the agent that executes pipeline jobs. It can be shared, group-specific, or project-specific, and runs on Linux, Windows, macOS, or Kubernetes.

**Q: How do I cache dependencies in GitLab CI?**
A: Use the `cache` keyword to persist directories like `node_modules`, `.m2`, or `.pip` between pipelines. Use `key` to scope caches per branch or lockfile.

**Q: What is the difference between stages and jobs?**
A: Stages define execution phases (build, test, deploy) that run sequentially. Jobs are the individual tasks within a stage, which can run in parallel if they share a stage.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Rules-Based Job Execution

```yaml
# Modern rules syntax (replaces only/except)
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
    - when: never  # Skip for all other cases
  script:
    - npm ci
    - npm test

deploy_prod:
  stage: deploy
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual  # Require manual click
      allow_failure: false
  script:
    - npm run deploy:production
  environment:
    name: production
```

### Manual Approvals with Environments

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

### Scheduled Pipelines

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
# Configure schedule in GitLab UI or via API:
# Settings > CI/CD > Scheduled Pipelines
# Or via API:
# curl --request POST --header "PRIVATE-TOKEN: $TOKEN" \
#   "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipeline_schedules" \
#   --data "description=Nightly" --data "ref=main" \
#   --data "cron=0 2 * * *" --data "cron_timezone=UTC"
```

### Services (Test Containers)

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

### Passing Artifacts Between Jobs

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
    - ls dist/  # Artifacts from build are available
    - tar czf app.tar.gz dist/
    - scp app.tar.gz deploy@server:/app/
```

### Merge Request Pipeline with Code Quality

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

### Conditional Includes

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

## Additional Best Practices


- For a deeper guide, see [Complete Guide to CI/CD with GitHub Actions](/guides/complete-guide-ci-cd-github-actions/).

7. **Use `needs` for DAG pipelines.** Jobs with `needs` can start immediately without waiting for the entire stage:

```yaml
lint:
  stage: test
  script: npm run lint

typecheck:
  stage: test
  script: npm run typecheck

unit_test:
  stage: test
  needs: [lint, typecheck]  # Starts after lint and typecheck pass
  script: npm test
```

8. **Use `retry` for flaky operations.** Retry network-dependent jobs:

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

9. **Use `interruptible` for MR pipelines.** Cancel old pipelines when new commits are pushed:

```yaml
test:
  stage: test
  interruptible: true
  script:
    - npm test
```

## Additional Common Mistakes

6. **Using `only/except` instead of `rules`.** The `only/except` syntax is deprecated. Use `rules` for modern pipelines:

```yaml
# Old (deprecated)
deploy:
  only:
    - main

# New (recommended)
deploy:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

7. **Not using `needs` keyword.** Without `needs`, jobs wait for all jobs in the previous stage to complete:

```yaml
# Slow: waits for all test jobs
deploy:
  stage: deploy

# Fast: starts as soon as build finishes
deploy:
  needs: [build]
```

## Additional FAQ

### How do I run jobs only on tagged releases?

```yaml
release:
  rules:
    - if: $CI_COMMIT_TAG
  script:
    - npm publish
```

### How do I share variables across jobs?

Use `variables` at the top level or use a template:

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

### How do I trigger downstream pipelines?

```yaml
trigger_downstream:
  trigger:
    project: org/other-project
    branch: main
    strategy: depend  # Wait for downstream to complete
```

## Performance Tips

1. **Use `needs` for DAG execution.** Reduce wall-clock time by starting jobs as soon as their dependencies finish:

```yaml
test:
  needs: [build]  # Starts immediately after build
```

2. **Cache per-branch.** Avoid cache collisions between branches:

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
```

3. **Use `interruptible: true` for MR jobs.** Save runner time by canceling superseded pipelines:

```yaml
test:
  interruptible: true
```

4. **Use small images.** Reduce pull time:

```yaml
# Bad: large image
image: node:20

# Good: slim image
image: node:20-slim

# Best: alpine if compatible
image: node:20-alpine
```

5. **Use `before_script` and `after_script` wisely.** They run for every job in the file:

```yaml
default:
  before_script:
    - npm ci --silent
  after_script:
    - echo "Job completed with exit code $?"
```
