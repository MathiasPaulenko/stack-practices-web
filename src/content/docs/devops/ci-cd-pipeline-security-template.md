---
contentType: docs
slug: ci-cd-pipeline-security-template
title: "CI/CD Pipeline Security Template"
description: "A template for securing build and deployment pipelines against credential leaks, tampering, supply chain attacks, and unauthorized deployments."
metaDescription: "Secure CI/CD pipelines with this template. Covers secrets, runner hardening, artifact signing, branch protection, and deployment gates."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - ci-cd-security
  - supply-chain
  - pipeline-hardening
  - secrets-management
  - devsecops
relatedResources:
  - /docs/devops/container-security-baseline-template
  - /docs/devops/rbac-policy-template
  - /docs/devops/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Secure CI/CD pipelines with this template. Covers secrets, runner hardening, artifact signing, branch protection, and deployment gates."
  keywords:
    - CI/CD pipeline security
    - supply chain security
    - pipeline hardening
    - secure deployment pipeline
    - DevSecOps template
---

## Overview

CI/CD pipelines are a high-value target for attackers because they have access to source code, build secrets, and production deployment paths. A compromised pipeline can introduce malware, exfiltrate data, or deploy unauthorized changes. This template defines controls to protect code integrity, runner security, secrets, and deployment approvals.

## When to Use

- Setting up a new CI/CD platform.
- Reviewing or improving an existing pipeline.
- Preparing for a supply chain security audit.
- After a build system compromise or unauthorized deployment.
- Integrating DevSecOps controls into engineering workflows.

## Prerequisites

- A version control system with branch protection and audit logging.
- A CI/CD platform such as GitHub Actions, GitLab CI, Azure DevOps, or Jenkins.
- A secret management solution for pipeline credentials.
- A process for code review and approval before merging.
- Ownership from platform engineering, security, and release management.

## Solution

### Template

#### 1. Source Control Security

| Control | Requirement | Verification |
|---------|-------------|--------------|
| Branch protection | Required reviews before merge to main | Repository settings |
| Signed commits | Require verified commits for privileged accounts | Git configuration |
| Access control | Least-privilege access to repositories | RBAC review |
| Audit logging | All pushes, merges, and permission changes logged | Platform logs |
| Dependency pinning | Lockfiles and pinned versions for reproducible builds | Repository files |
| Secret scanning | Automated detection of secrets in commits | Pre-commit hooks + CI |

#### 2. Pipeline Configuration

| Control | Requirement | Verification |
|---------|-------------|--------------|
| Immutable pipeline definitions | Pipelines stored as code and reviewed | Repository files |
| No secrets in code | Secrets loaded from vault, CI variables, or OIDC | Secret scanning |
| Input validation | Pipeline parameters validated and sanitized | Code review |
| Self-hosted runner isolation | Production runners isolated from dev runners | Runner configuration |
| Ephemeral runners | Fresh runner per build to reduce persistence | Runner settings |
| Pipeline provenance | SLSA provenance generated for artifacts | Attestation tool |

#### 3. Secrets Management

| Secret Type | Storage | Rotation | Scope |
|-------------|---------|----------|-------|
| Cloud credentials | External vault or OIDC | 90 days | Per environment |
| Container registry tokens | Vault or short-lived CI tokens | 90 days | Per pipeline |
| Signing keys | Hardware-backed or KMS | 180 days | Limited service accounts |
| API keys | Vault or secret manager | 90 days | Minimum required permissions |
| Database passwords | Vault dynamic secrets | 24 hours | Per pipeline run |

#### 4. Build Security

| Control | Requirement | Verification |
|---------|-------------|--------------|
| Dependency scanning | All dependencies scanned for known CVEs | Scanner in CI |
| Static analysis | SAST run on every pull request | CI job |
| Container image scanning | Base image and layers scanned before push | Registry scan |
| Reproducible builds | Same source produces same artifact | Build verification |
| Artifact signing | All artifacts signed with build identity | Signature verification |
| SBOM generation | Bill of materials generated per build | CI output |

#### 5. Deployment Security

| Control | Requirement | Verification |
|---------|-------------|--------------|
| Deployment gates | Manual or automated approval before production | Pipeline rules |
| Environment separation | Production credentials not available in dev | Secret scoping |
| Rollback plan | Automated rollback trigger on failure | Pipeline definition |
| Immutable deployments | Artifacts deployed by reference, not rebuilt | Deployment logs |
| Drift detection | Unauthorized production changes detected | Monitoring tool |
| Audit trail | Who deployed what, when, and why | Deployment logs |

#### 6. Incident Response

| Scenario | Response | Owner |
|----------|----------|-------|
| Secret leaked | Rotate secret, revoke tokens, audit usage | Security team |
| Malicious commit | Revert, investigate, revoke credentials | Platform team |
| Compromised runner | Terminate runner, rebuild, review logs | Platform team |
| Unauthorized deployment | Rollback, freeze pipeline, audit | Release manager |
| Tampered artifact | Block deployment, trace provenance | Security team |

## Explanation

Pipeline security is a subset of supply chain security. By protecting the source, the build process, and the deployment path, the organization reduces the risk of malicious code reaching production. The template maps each control to a verification method, making it suitable for audits and continuous improvement.

## Variants

- **GitHub Actions security checklist**: Focuses on actions pinning, workflow permissions, and reusable workflows.
- **GitLab CI security template**: Includes CI/CD job token scopes, protected runners, and compliance pipelines.
- **Jenkins hardening template**: Covers plugin management, agent isolation, and Groovy sandboxing.
- **Container-native pipeline**: Emphasizes image signing, registry scanning, and Kubernetes admission.
- **High-compliance pipeline**: Adds SLSA Level 3, dual approval, and signed SBOMs for regulated environments.

## What works

- Store pipeline definitions as code and review them like application code.
- Use short-lived credentials and OIDC instead of long-lived secrets.
- Scan dependencies before merging and before deploying.
- Sign artifacts and verify signatures before deployment.
- Separate build and production environments physically or logically.
- Require human approval for production deployments.
- Generate and retain SBOMs for every release.
- Monitor pipeline activity for unusual behavior.

## Common Mistakes

- Storing secrets in environment variables or pipeline files.
- Using third-party actions without pinning or reviewing them.
- Allowing any branch to deploy to production.
- Running production and dev workloads on the same runner.
- Skipping security scans for hotfix deployments.
- Not rotating pipeline credentials after a compromise.
- Trusting artifacts without signature verification.

## FAQs

### What is the biggest risk in CI/CD?

The most common high-impact risk is credential theft from a runner or pipeline file, which allows attackers to access production or tamper with builds.

### How do we balance security with fast deployments?

Automate security checks, use fast scanners, and require approval only for production. Shift-left scanning gives fast feedback without blocking the pipeline.

### What is SLSA provenance?

SLSA is a framework for supply chain security. Provenance records how an artifact was built, including source repository, build command, and dependencies, making it easier to detect tampering.
