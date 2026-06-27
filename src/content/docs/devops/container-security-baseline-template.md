---
contentType: docs
slug: container-security-baseline-template
title: "Container Security Baseline Template"
description: "A baseline template for hardening container images, runtimes, and orchestration configurations across environments."
metaDescription: "Harden container images and runtimes with this baseline template. Covers image scanning, runtime policies, RBAC, networking, and secrets."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - container-security
  - docker
  - kubernetes
  - hardening
  - compliance
relatedResources:
  - /docs/devops/network-segmentation-policy-template
  - /docs/devops/ci-cd-pipeline-security-template
  - /docs/devops/rbac-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Harden container images and runtimes with this baseline template. Covers image scanning, runtime policies, RBAC, networking, and secrets."
  keywords:
    - container security
    - container hardening
    - docker security
    - kubernetes security baseline
    - image scanning
---

## Overview

A Container Security Baseline defines the minimum security configuration required for every container image, runtime, and orchestration environment. It covers image provenance, vulnerability scanning, runtime restrictions, access control, and network policies. This baseline helps teams ship containers that meet security and compliance requirements without blocking delivery.

## When to Use

- Setting up a new container platform or Kubernetes cluster.
- Onboarding a new service or development team.
- Preparing for a security audit or compliance review.
- Responding to a container escape or image compromise.
- Standardizing security controls across CI/CD and production.

## Prerequisites

- A container registry with access control and audit logging.
- A vulnerability scanner integrated with CI/CD or registry.
- A Kubernetes cluster with NetworkPolicy and RBAC enabled.
- Ownership from platform, security, and development teams.

## Solution

### Template

#### 1. Image Build Requirements

| Requirement | Baseline | Verification |
|-------------|----------|--------------|
| Base image | Use minimal, vendor-supported, or distroless images | Scan registry tags |
| Image size | Remove dev tools and package managers | Build inspect |
| Vulnerabilities | No critical or high CVEs in production images | Scanner gate in CI |
| Secrets | No credentials embedded in image layers | Secret scanning |
| Provenance | Build signed with SBOM attached | Sigstore / cosign |
| Updates | Images rebuilt at least monthly | CI cron job |

#### 2. Runtime Security Baseline

| Control | Baseline | Enforcement |
|---------|----------|-------------|
| Non-root user | Containers run as user with UID > 10000 | Pod security policy |
| Read-only root filesystem | Root filesystem is read-only | Security context |
| No privileged mode | Privileged flag is not allowed | Admission controller |
| Resource limits | CPU and memory limits set per pod | ResourceQuota / LimitRange |
| Seccomp profile | Runtime default or custom profile | Security context |
| AppArmor / SELinux | Enforcing profile applied | Node configuration |
| Capabilities | Only required capabilities added; default set dropped | Security context |

#### 3. Orchestration Baseline

| Area | Baseline | Tool / Resource |
|------|----------|-----------------|
| RBAC | Least-privilege roles per namespace | Kubernetes RBAC |
| Network policy | Default-deny and explicitly allow flows | NetworkPolicy |
| Admission control | Policy engine rejects non-compliant pods | OPA / Kyverno |
| Secrets | Secrets stored in external vault or KMS | Vault / External Secrets |
| Audit logging | API server and container audit logs enabled | Kubernetes audit |
| Node isolation | Sensitive workloads on dedicated node pools | Taints / tolerations |

#### 4. Deployment Checklist

- [ ] Image scanned with no critical or high vulnerabilities.
- [ ] SBOM generated and signed at build time.
- [ ] Container runs as non-root with read-only root filesystem.
- [ ] Privileged mode and host namespaces are disabled.
- [ ] CPU and memory limits configured.
- [ ] Security context with dropped capabilities and seccomp profile.
- [ ] Network policy restricts ingress and egress.
- [ ] Secrets are mounted from external vault, not environment variables.
- [ ] RBAC role is least-privilege and scoped to namespace.
- [ ] Pod security admission policy enforced.

#### 5. Exception and Risk Acceptance

| Exception ID | Description | Risk | Approved By | Expiration | Compensating Control |
|--------------|-------------|------|-------------|------------|----------------------|
| CS-001 | Legacy image needs package manager | Medium | Platform lead | 2026-09-30 | Scanner runs weekly |
| CS-002 | Sidecar requires privileged mode | High | CISO | 2026-08-15 | Dedicated node pool |

## Explanation

Containers share the host kernel, so a misconfigured container can compromise the entire node. The baseline layers controls: image security prevents shipping vulnerable code, runtime hardening limits what a container can do, and orchestration policies enforce these rules at scale. Together they reduce attack surface and simplify compliance.

## Variants

- **Docker-only baseline**: Simpler template for teams running Docker without Kubernetes.
- **Kubernetes hardening checklist**: Focused on pod security, admission, and RBAC.
- **Serverless container baseline**: For platforms like AWS Fargate or Google Cloud Run.
- **High-compliance baseline**: Adds requirements for FIPS, FedRAMP, or PCI-DSS environments.
- **Developer laptop baseline**: Hardening for Docker Desktop and local container builds.

## Best Practices

- Make the baseline mandatory via CI/CD gates and admission controllers.
- Use distroless or scratch-based images when possible.
- Scan images continuously, not just at build time.
- Rotate registry credentials and signing keys regularly.
- Monitor runtime behavior with container security tools.
- Keep admission policies version-controlled and reviewed.
- Document exceptions and require expiration dates.

## Common Mistakes

- Running containers as root by default.
- Embedding secrets in Docker layers or environment variables.
- Pulling images from unverified public registries.
- Skipping vulnerability scanning for transitive dependencies.
- Allowing all egress traffic from pods.
- Not isolating production and staging workloads.
- Relying only on image scanning without runtime controls.

## FAQs

### What is the difference between an image scanner and a runtime security tool?

An image scanner finds known vulnerabilities in static image layers. A runtime security tool detects suspicious behavior while the container runs, such as unexpected process execution or network connections.

### Should we use a privileged init container?

Avoid privileged containers. If a one-time setup task requires elevated privileges, use a dedicated job with restricted RBAC, audit logging, and approval from the security team.

### How do we enforce the baseline automatically?

Use CI/CD gates for image scanning and admission controllers like Kyverno or OPA Gatekeeper in Kubernetes. Pod Security Admission can also enforce common security contexts.
