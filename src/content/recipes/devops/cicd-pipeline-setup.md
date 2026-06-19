---
contentType: recipes
slug: cicd-pipeline-setup
title: "CI/CD Pipeline Setup"
description: "Set up automated CI/CD pipelines for testing, building, and deploying applications with GitHub Actions and best practices."
metaDescription: "CI/CD pipeline setup with GitHub Actions: automated testing, building, deployment, environment management, and pipeline security best practices."
difficulty: beginner
topics:
  - devops
tags:
  - ci-cd
  - devops
  - github-actions
  - automation
relatedResources:
  - /guides/cicd-pipeline-guide
  - /recipes/github-actions
  - /recipes/bash-scripting-automation
  - /recipes/cron-jobs
  - /docs/api-status-page-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "CI/CD pipeline setup with GitHub Actions: automated testing, building, deployment, environment management, and pipeline security best practices."
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
- Setting up a new project and want automated testing from day one
- Migrating from manual deployments to automated releases
- Adding security scanning, linting, or code quality gates to your workflow
- Building a multi-environment deployment strategy (dev → staging → prod)

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

## Best Practices

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
