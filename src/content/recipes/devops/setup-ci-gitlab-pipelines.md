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

## Best Practices

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
