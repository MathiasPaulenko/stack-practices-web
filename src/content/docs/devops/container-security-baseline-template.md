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
  - /docs/network-segmentation-policy-template
  - /docs/ci-cd-pipeline-security-template
  - /docs/rbac-policy-template
  - /docs/endpoint-security-checklist-template
  - /docs/pen-test-scope-template
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

## What Works

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

## Advanced Solutions

### Kyverno cluster policies for automated enforcement

Deploy Kyverno policies to enforce the container security baseline at admission time:

```yaml
# kyverno-enforce-non-root.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root-user
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-runAsNonRoot
      match:
        resources:
          kinds:
            - Pod
      validate:
        message: "Containers must run as non-root user (UID > 10000)"
        pattern:
          spec:
            containers:
              - securityContext:
                  runAsNonRoot: true
                  runAsUser: ">10000"

---
# kyverno-disallow-privileged.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
spec:
  validationFailureAction: Enforce
  rules:
    - name: reject-privileged
      match:
        resources:
          kinds:
            - Pod
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: "false"

---
# kyverno-require-resource-limits.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-resource-limits
      match:
        resources:
          kinds:
            - Pod
      validate:
        message: "CPU and memory limits are required"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

### Image signing and verification with cosign

Sign container images at build time and verify them at deployment:

```bash
#!/bin/bash
set -euo pipefail

# Generate signing key
cosign generate-key-pair

# Sign image in CI pipeline
IMAGE="registry.example.com/myapp:v1.2.3"
cosign sign --key cosign.key "$IMAGE"

# Attach SBOM as attestation
syft "$IMAGE" -o cyclonedx-json > sbom.json
cosign attest --key cosign.key \
  --predicate sbom.json \
  --type cyclonedx \
  "$IMAGE"

# Verify signature before deployment
cosign verify --key cosign.pub "$IMAGE"

# Verify SBOM attestation
cosign verify-attestation --key cosign.pub \
  --type cyclonedx \
  "$IMAGE" | jq -r '.payload' | base64 -d | jq .
```

### Network policy templates for default-deny

Implement default-deny networking with explicit allow rules:

```yaml
# default-deny-all.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# allow-frontend-to-backend.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080

---
# allow-dns-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Additional Best Practices


- For a deeper guide, see [CI/CD Security: Harden Your Pipelines and Prevent Supply](/guides/ci-cd-security-guide/).

1. **Use Kubernetes Pod Security Admission standards.** The `restricted` profile enforces non-root, no privileged, dropped capabilities, and seccomp. Apply it at the namespace level:

```yaml
# namespace-pod-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
```

2. **Implement image pull secrets with external secret management.** Avoid long-lived registry credentials. Use External Secrets Operator to sync short-lived tokens:

```yaml
# external-secret-registry.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: registry-pull-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    template:
      type: kubernetes.io/dockerconfigjson
      data:
        .dockerconfigjson: "{{ .dockerconfig | toString }}"
  data:
    - secretKey: dockerconfig
      remoteRef:
        key: registry/credentials
        property: dockerconfigjson
```

## Additional Common Mistakes

1. **Not scanning base images for transitive OS package vulnerabilities.** A distroless image reduces surface area, but if you use a base like `python:3.12-slim`, you still inherit Debian packages. Scan the base image independently:

```bash
# Scan base image separately
trivy image --scanners vuln python:3.12-slim --format json > base-scan.json

# Compare with your app image scan
trivy image --scanners vuln myapp:v1.2.3 --format json > app-scan.json

# Find vulnerabilities introduced by your layers only
jq -r '.Results[] | select(.Target | contains("app")) | .Vulnerabilities[]?' app-scan.json
```

2. **Allowing egress to the internet without restriction.** Pods that can reach any external endpoint can exfiltrate data or download malware. Use an egress proxy or firewall:

```yaml
# egress-proxy-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress-internet
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: production
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

## Additional Frequently Asked Questions

### How often should we rebuild and rescan container images?

Rebuild at least monthly to pick up OS patches. For critical services, set up a weekly rebuild pipeline. Use a scheduled CI job that bumps the base image tag, rebuilds, scans, and deploys if the scan passes:

```yaml
# GitHub Actions weekly rebuild
name: Weekly Image Rebuild
on:
  schedule:
    - cron: "0 2 * * 1"
jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and scan
        run: |
          docker build -t myapp:latest .
          trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest
```

### What is the difference between Pod Security Standards and Kyverno policies?

Pod Security Standards are built-in Kubernetes admission checks with three profiles (`privileged`, `baseline`, `restricted`). They cover common security contexts but are limited. Kyverno is a policy engine that can enforce the same rules plus custom policies for images, resources, labels, and network. Use Pod Security Standards for baseline enforcement and Kyverno for organization-specific rules.
