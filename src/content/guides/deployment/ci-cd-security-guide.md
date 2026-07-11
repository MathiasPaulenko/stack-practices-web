---
contentType: guides
slug: ci-cd-security-guide
title: "CI/CD Security: Harden Your Pipelines and Prevent Supply Chain Attacks"
description: "A practical guide to securing CI/CD pipelines: secrets management, least-privilege runners, artifact signing, dependency scanning, and defending against supply chain attacks."
metaDescription: "Learn CI/CD security: secrets management, least-privilege runners, artifact signing, dependency scanning, and supply chain attack prevention."
difficulty: intermediate
topics:
  - devops
  - security
  - infrastructure
tags:
  - ci-cd
  - security
  - pipelines
  - secrets-management
  - supply-chain
  - dependency-scanning
  - hardening
  - guide
relatedResources:
  - /guides/security/zero-trust-architecture-guide
  - /guides/security/api-security-checklist-guide
  - /guides/devops/sre-practices-guide
  - /guides/devops/platform-engineering-guide
  - /guides/planning/disaster-recovery-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn CI/CD security: secrets management, least-privilege runners, artifact signing, dependency scanning, and supply chain attack prevention."
  keywords:
    - ci-cd
    - security
    - pipelines
    - secrets-management
    - supply-chain
    - dependency-scanning
    - hardening
    - guide
---

## Overview

CI/CD pipelines are high-value attack targets. They have access to source code, secrets, production environments, and deployment credentials. A compromised pipeline can lead to code injection, data breaches, and supply chain attacks that affect every downstream consumer.

Here is a hands-on guide to practical techniques to harden your CI/CD infrastructure from source to deployment.

## When to Use

- You manage CI/CD pipelines that deploy to production
- You want to reduce the blast radius of a compromised build system
- You need to comply with security standards (SOC 2, ISO 27001, FedRAMP)
- You have experienced or want to prevent supply chain attacks
- You are migrating from self-hosted runners to cloud-native CI/CD

## Core Concepts

| Concept | Description |
|---------|-------------|
| Supply Chain Attack | Injecting malicious code via compromised dependencies or build tools |
| Least Privilege Runner | Build agents with minimal access to secrets and infrastructure |
| Artifact Signing | Cryptographically verifying that built artifacts came from a trusted pipeline |
| Dependency Scanning | Automatically detecting known vulnerabilities in libraries |
| Pipeline as Code | Version-controlled CI/CD definitions that enforce security policies |
| SBOM (Software Bill of Materials) | Inventory of all components used in an application |

## Step-by-Step CI/CD Security Hardening

### 1. Secure Pipeline Configuration

Treat your pipeline definitions as production code:

```yaml
# Example: GitHub Actions security hardening
name: Secure Build
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Minimal permissions by default
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Pin actions to specific commit hashes
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      # Use OIDC for cloud authentication instead of long-lived secrets
      - name: Authenticate to AWS
        uses: aws-actions/configure-aws-credentials@e3dd6a429a4c6c8c8f55e0e0b9e8e8e8e8e8e8e8  # v4.0.2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/CICD-Build-Role
          aws-region: us-east-1

      # Verify dependencies before installing
      - name: Install dependencies
        run: |
          npm ci --ignore-scripts  # Skip post-install scripts
          npm audit --audit-level=moderate
```

**Security checklist for pipeline definitions:**
- Pin all third-party actions to commit SHA, not version tags
- Use `permissions:` blocks with minimal required scopes
- Never run CI on `pull_request_target` from untrusted forks
- Disable script execution during dependency installation (`--ignore-scripts`)
- Use branch protection rules to prevent direct pushes to main

### 2. Secrets Management

Secrets in CI/CD are a common attack vector:

```bash
# BAD: Hardcoded secrets in pipeline files
# AWS_SECRET_ACCESS_KEY=AKIA...  # NEVER DO THIS

# GOOD: Use native secret management
# GitHub Actions: secrets stored in repository settings
# GitLab CI: CI/CD variables with masked flag
# Azure DevOps: Variable groups with secret type

# BETTER: Use OIDC to eliminate long-lived secrets entirely
# AWS: configure-aws-credentials with role-to-assume
# GCP: workload identity federation
# Azure: managed identity + federated credentials
```

**Secrets: what works**
- Rotate secrets automatically (every 30-90 days)
- Use short-lived tokens (1-hour TTL) where possible
- Scope secrets to specific job stages, not global pipeline
- Audit secret access logs regularly
- Never log secrets (most CI systems mask them automatically)

### 3. Runner Hardening

Your build agents are as critical as production servers:

| Strategy | Description | Implementation |
|----------|-------------|----------------|
| Ephemeral runners | Fresh VM for every build | GitHub-hosted, GitLab SaaS runners |
| Network isolation | Restrict runner egress | VPC, private subnets, no internet |
| Least privilege | Minimal IAM roles | Separate roles per pipeline/project |
| Immutable images | Pre-hardened runner images | Packer, custom AMI/Golden Image |
| No secrets on disk | Memory-only credentials | tmpfs mounts, secret injection |

```bash
# Example: Self-hosted runner hardening checklist
# 1. Run in isolated VPC with no internet egress
# 2. Use separate runner pools per team/application
# 3. Disable sudo/root access for runner user
# 4. Mount /tmp as noexec, nodev, nosuid
# 5. Run container builds in rootless podman/docker
# 6. Clear workspace between jobs (do not reuse)
# 7. Scan runner images weekly for CVEs
```

### 4. Dependency and Artifact Security

Your dependencies are your weakest link:

```yaml
# Example: GitHub Actions dependency scanning pipeline
jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      # SAST (Static Application Security Testing)
      - name: Run CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript, python
      - uses: github/codeql-action/analyze@v3

      # Dependency vulnerability scanning
      - name: Run Dependabot (enabled in repo settings)
      # Or use Snyk/OWASP Dependency-Check

      # Container image scanning
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
```

**Artifact security practices:**
- Sign all artifacts (cosign, Notary, Sigstore)
- Generate and publish SBOMs for every release
- Scan container images before pushing to registry
- Verify artifact signatures before deployment
- Store artifacts in immutable registries with retention policies

### 5. Deployment Security

The final step must be as secure as the first:

```bash
# Example: Secure deployment script
#!/bin/bash
set -euo pipefail

# 1. Verify artifact signature
cosign verify \
  --key cosign.pub \
  --signature artifact.sig \
  myapp:${DEPLOY_VERSION}

# 2. Verify SBOM matches expected components
sbom-diff expected.sbom generated.sbom

# 3. Run smoke tests before traffic shift
./smoke-tests.sh --target staging

# 4. Deploy with automatic rollback on failure
./deploy.sh --version ${DEPLOY_VERSION} --rollback-on-failure

# 5. Verify deployment health
./health-check.sh --target production
```

**Deployment security rules:**
- Require manual approval for production deployments
- Implement automated rollback on health check failure
- Use blue-green or canary deployments to limit blast radius
- Log all deployment events to immutable audit trail
- Separate staging and production deployment credentials

## What Works

- Assume your pipeline will be compromised. Design for containment, not just prevention.
- Use ephemeral infrastructure. Fresh runners prevent persistent malware.
- Verify everything. Signatures, SBOMs, and checksums should be mandatory.
- Minimize pipeline permissions. If a job only needs read access, enforce it.
- Monitor pipeline behavior. Alert on unexpected outbound connections or credential usage.
- Practice incident response. Have a plan for rotating all secrets after a compromise.

## Common Mistakes

- Using long-lived secrets in CI. Rotate to OIDC or short-lived tokens.
- Running CI on self-hosted runners without hardening. They often have broader network access than production.
- Trusting `pull_request_target` workflows. These run with write tokens on untrusted code.
- Not scanning dependencies. Known CVEs in dependencies are the most common attack vector.
- Ignoring container base image CVEs. Start with minimal, hardened base images.

## Variants

- GitHub Actions security: Focus on `permissions`, `pull_request` vs `pull_request_target`, OIDC, Dependabot
- GitLab CI security: CI/CD variables, job permissions, runner tags, container scanning
- Jenkins security: Agent isolation, credential scopes, pipeline shared libraries
- Cloud-native: Use managed build services (AWS CodeBuild, Google Cloud Build) with IAM integration

## FAQ

### How do I migrate from long-lived secrets to OIDC?

Configure workload identity federation in your cloud provider, then update `configure-aws-credentials` (or equivalent) to use `role-to-assume` without access keys.

### Should I use self-hosted or cloud-hosted runners?

Cloud-hosted runners are ephemeral and isolated by default. Self-hosted runners require hardening but offer more control and faster builds with caching.

### How do I prevent dependency confusion attacks?

Use private registries with namespace reservation, verify package signatures, and pin exact versions with lock files.

### What is the minimum viable CI/CD security setup?

Enable Dependabot, use OIDC for cloud auth, pin action versions, enable branch protection, and scan containers before deployment.

## Conclusion

CI/CD security is a continuous process, not a one-time hardening task. Every component, from the runner image to the deployment script, is a potential attack surface. Apply defense in depth, verify every artifact, and assume compromise will happen.


## Advanced Topics

### Scenario: Secure CI/CD Pipeline for Microservices

```yaml
# GitHub Actions: build, scan, sign, deploy
name: Secure CI/CD
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write  # OIDC for AWS

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # for diff analysis

      - name: Build container
        id: build
        run: |
          docker build -t app:${{ github.sha }} .
          echo "image=app:${{ github.sha }}" >> $GITHUB_OUTPUT

      - name: Scan with Trivy
        run: |
          trivy image --exit-code 1 --severity HIGH,CRITICAL \
            app:${{ github.sha }}
          # Fails build on HIGH/CRITICAL vulnerabilities

      - name: Sign with cosign
        env:
          COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_KEY }}
        run: |
          cosign sign --key env://COSIGN_PRIVATE_KEY \
            registry.example.com/app:${{ github.sha }}

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SAST with Semgrep
        run: semgrep ci --config=p/owasp-top-ten

      - name: Dependency scan
        run: |
          npm audit --audit-level=high
          # Verifies lock file against advisory DB

      - name: Secret scanning
        run: trivy fs --scanners secret .

  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Auth AWS with OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123:role/github-actions
          aws-region: us-east-1
          # No long-lived AWS secrets: OIDC token exchange

      - name: Deploy with verification
        run: |
          cosign verify --key cosign.pub \
            registry.example.com/app:${{ github.sha }}
          kubectl set image deployment/app \
            container=registry.example.com/app:${{ github.sha }}
          kubectl rollout status deployment/app --timeout=5m

Security controls:
  | Control | Tool | Frequency |
  |---------|------|-----------|
  | SAST | Semgrep | Every push |
  | SCA | npm audit | Every push |
  | Container scan | Trivy | Every build |
  | Secret scan | Trivy secret | Every push |
  | Image signing | cosign | Every build |
  | OIDC auth | AWS IAM | Every deploy |
  | Branch protection | GitHub | Always |
  | CodeQL | GitHub Advanced | Weekly |

Lessons:
  - OIDC eliminates long-lived secrets in CI/CD
  - Image signing prevents supply chain attacks
  - Scan on every push, not just PRs
  - Branch protection is the first line of defense
  - Fail builds on HIGH/CRITICAL, not on LOW
```

### How do I handle secrets in CI/CD?

Use OIDC for cloud auth (no secrets). For other secrets, use the CI secret store (GitHub Secrets, GitLab CI Variables). Never hardcode secrets in YAML. Rotate secrets regularly. Use dynamic references when possible (e.g., AWS Secrets Manager at runtime, not build time).
