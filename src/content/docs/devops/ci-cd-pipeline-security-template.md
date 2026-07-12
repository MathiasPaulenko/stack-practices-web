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
  - /docs/container-security-baseline-template
  - /docs/rbac-policy-template
  - /docs/secret-rotation-schedule-template
  - /docs/dependency-vulnerability-report-template
  - /docs/encryption-key-lifecycle-template
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


- For alternatives, see [CI/CD Security: Harden Your Pipelines and Prevent Supply](/guides/ci-cd-security-guide/).

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

## GitHub Actions Security Configuration

```yaml
name: Secure CI Pipeline
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/ci-role
          aws-region: us-east-1
          # No static keys - OIDC only

      - name: Build and sign
        uses: sigstore/cosign-installer@v3
      - run: |
          cosign sign-blob --yes artifact.tar.gz

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Scan dependencies
        uses: github/codeql-action/init@v3
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/analyze@v3
```

## SLSA Provenance Example

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    {
      "name": "artifact.tar.gz",
      "digest": { "sha256": "abc123..." }
    }
  ],
  "predicateType": "https://slsa.dev/provenance/v1",
  "predicate": {
    "builder": { "id": "github-actions" },
    "buildType": "https://github.com/actions/runner",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/org/repo",
        "digest": { "sha1": "commit-hash" }
      }
    },
    "materials": [
      { "uri": "git+https://github.com/org/repo", "digest": { "sha1": "commit-hash" } }
    ]
  }
}
```

## Pipeline Security Audit Checklist

| Control | Verified | Notes |
|---------|----------|-------|
| No long-lived secrets in CI | | |
| OIDC for cloud auth | | |
| Actions pinned to SHA | | |
| Minimal permissions per job | | |
| Branch protection on main | | |
| Signed artifacts verified | | |
| SBOM generated per build | | |
| Dependency scan in pipeline | | |
| Runners isolated per env | | |
| Audit log retention > 90 days | | |


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


### How do we secure secrets in CI/CD pipelines?

Use a dedicated secrets manager (HashiCorp Vault, AWS Secrets Manager, GitHub Actions secrets). Never hardcode secrets in pipeline files or environment variables. Use OIDC for cloud authentication instead of static keys. Rotate secrets quarterly and after any suspected compromise. For self-hosted runners, ensure secrets are scrubbed from logs and the runner is ephemeral.

### What is the difference between SAST, DAST, and SCA?

SAST (Static Application Security Testing) analyzes source code for vulnerabilities without running it. DAST (Dynamic Application Security Testing) tests a running application from the outside. SCA (Software Composition Analysis) scans dependencies for known vulnerabilities. All three should run in your pipeline: SAST on every PR, SCA on every merge, DAST on staging deployments.

### Should we use self-hosted or cloud-managed runners?

Cloud-managed runners (GitHub-hosted, GitLab SaaS) are ephemeral and isolated by default, reducing attack surface. Self-hosted runners are necessary for private network access or specialized hardware, but require hardening: ephemeral instances, no shared state between jobs, and network segmentation between build and production environments. Never run production deployments on the same runner as untrusted PR builds.

### How do we implement dual approval for production deployments?

Configure your pipeline to require manual approval from two different team members before deploying to production. Use environment protection rules in GitHub Actions or GitLab protected environments. The approvers should not be the same person who triggered the pipeline. Log all approvals with timestamp, user, and reason for audit compliance.

### What is an SBOM and why do we need it?

An SBOM (Software Bill of Materials) is a machine-readable inventory of all components in a software artifact, including transitive dependencies, versions, and licenses. It enables vulnerability scanning, license compliance, and supply chain transparency. Generate an SBOM for every build using tools like syft, trivy, or GitHub's dependency graph. Store SBOMs alongside artifacts and retain for the lifetime of the deployed software.


### What is cosign and how does it work?

Cosign is a tool from the Sigstore project for signing and verifying container images and blobs. It uses keyless signing with OIDC tokens from your CI provider, eliminating the need to manage signing keys. The signature is stored in a transparency log (Rekor), making it publicly verifiable. Integrate cosign in your pipeline to sign artifacts after build and verify signatures before deployment.

### How do we handle secrets for self-hosted runners?

Use ephemeral runners that are destroyed after each job. Inject secrets at runtime from a secrets manager (Vault, AWS Secrets Manager). Never store secrets on the runner disk. Scrub secret values from pipeline logs using masking. Rotate runner credentials frequently and audit runner access logs. For sensitive environments, use dedicated runner pools per environment with network isolation.

### What is the SLSA framework?

SLSA (Supply-chain Levels for Software Artifacts) is a security framework with four levels of assurance. Level 1 requires provenance generation. Level 2 adds hosted build platform and non-falsifiable provenance. Level 3 requires isolated builds and signed provenance. Level 4 adds two-party review and reproducible builds. Most organizations should target SLSA Level 3 for production-critical software.

### Should we scan Docker images in the pipeline?

Yes. Scan images at two stages: after build (for fast feedback on known CVEs) and before deployment (to catch newly disclosed vulnerabilities). Use Trivy, Grype, or Snyk Container. Configure the scan to fail on critical vulnerabilities but allow overrides for accepted risks with documented justification. Store scan results as pipeline artifacts for audit trails.

### How do we handle third-party action security?

Pin all third-party GitHub Actions to a specific commit SHA, not a version tag. Review the action source code before first use. Use Dependabot to monitor for security advisories in pinned actions. Run untrusted actions in isolated runners with minimal permissions. For critical pipelines, maintain a fork of approved actions and review updates before merging.

### What is a reproducible build and why does it matter?

A reproducible build produces identical output given the same source code and build environment. This means anyone can verify that a binary was built from the claimed source by rebuilding it and comparing checksums. Reproducible builds are a SLSA Level 4 requirement. Achieve reproducibility by fixing timestamps, sorting file lists, and removing non-deterministic inputs like random seeds or network calls during build.