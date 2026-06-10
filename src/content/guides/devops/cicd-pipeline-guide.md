---
contentType: guides
slug: cicd-pipeline-guide
title: "CI/CD Pipeline Guide"
description: "A practical guide to building CI/CD pipelines with GitHub Actions, testing, deployment strategies, and rollback procedures."
metaDescription: "Learn how to build robust CI/CD pipelines: GitHub Actions workflows, automated testing, deployment strategies, and production rollbacks."
difficulty: intermediate
topics:
  - devops
  - testing
tags:
  - cicd
  - github-actions
  - devops
  - deployment
  - automation
  - pipeline
  - testing
relatedResources:
  - /recipes/devops/github-actions
  - /guides/testing/testing-strategy-guide
  - /docs/templates/runbook-template
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Learn how to build robust CI/CD pipelines: GitHub Actions workflows, automated testing, deployment strategies, and production rollbacks."
  keywords:
    - cicd pipeline
    - github actions
    - continuous integration
    - continuous deployment
    - devops pipeline
    - automated testing
---

## Overview

CI/CD (Continuous Integration / Continuous Deployment) is the backbone of modern software delivery. This guide covers building pipelines that test, build, and deploy code reliably.

## When to Use

- You deploy code more than once per week
- Multiple developers work on the same codebase
- You need confidence that changes won't break production
- You want to reduce manual deployment errors

## Core Concepts

### Continuous Integration (CI)

Automatically build and test code on every commit.

### Continuous Deployment (CD)

Automatically deploy validated code to production.

### Pipeline Stages

| Stage | Purpose | Typical Tools |
| ----- | ------- | ------------- |
| Lint | Code quality | ESLint, Prettier, Black, SonarQube |
| Test | Verify behavior | Jest, pytest, JUnit, Vitest |
| Build | Create artifacts | Docker, Vite, Webpack, Maven |
| Security | Scan vulnerabilities | Trivy, Snyk, OWASP ZAP |
| Deploy | Release to environment | GitHub Actions, ArgoCD, Terraform |

## Solution: A Production-Ready GitHub Actions Pipeline

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
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh production
```

## Deployment Strategies

### 1. Rolling Deployment

Gradually replace old instances with new ones.

**Pros**: Zero downtime, simple.
**Cons**: Rollback takes time, version coexistence issues.

### 2. Blue-Green Deployment

Maintain two identical environments; switch traffic instantly.

**Pros**: Instant rollback, zero downtime.
**Cons**: Double infrastructure cost.

### 3. Canary Deployment

Release to a small subset of users first.

**Pros**: Risk mitigation, real-user monitoring.
**Cons**: Complex routing, longer deployment time.

## Rollback Procedures

### Automatic Rollback Triggers

- Error rate exceeds threshold (e.g., >1%)
- Latency p99 exceeds threshold (e.g., >500ms)
- Critical health check fails
- Manual approval not received within timeout

### Rollback Commands

```bash
# Kubernetes rollback
kubectl rollout undo deployment/my-app

# Git revert
git revert HEAD
```

## Best Practices

- **Fail fast**: Run fastest checks (lint, unit tests) first
- **Parallelize**: Run independent jobs in parallel
- **Use environments**: Require approvals for production
- **Cache aggressively**: Cache dependencies and build artifacts
- **Store artifacts**: Keep build outputs for traceability
- **Notify on failure**: Alert the team immediately on pipeline failures

## Anti-Patterns

- Deploying without tests
- Using the same pipeline for all environments
- Manual steps in the deployment process
- No rollback plan
- Ignoring pipeline failures

## FAQ

**Q: How long should a CI pipeline take?**
A: Target under 10 minutes for feedback. Under 5 minutes is ideal.

**Q: Should I deploy on every commit?**
A: Yes, if your tests and monitoring are robust. Otherwise, deploy on merge to main.

**Q: What's the difference between Continuous Delivery and Continuous Deployment?**
A: Continuous Delivery means code is always deployable; a human approves the release. Continuous Deployment means every validated change goes to production automatically.
