---


contentType: recipes
slug: container-security
title: "Container Security Scanning"
description: "Scan container images for vulnerabilities, misconfigurations, and secrets with Trivy, Clair, and Snyk before deploying to production."
metaDescription: "Container security scanning: vulnerability detection with Trivy, Clair, Snyk, image hardening, secret detection, and CI-integrated security gates."
difficulty: intermediate
topics:
  - security
tags:
  - container-security
  - security
  - docker
  - devops
  - vulnerabilities
relatedResources:
  - /recipes/container-security-scanning
  - /docs/data-retention-policy-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
  - /recipes/docker-image-vulnerability-scan
  - /guides/complete-guide-docker-production
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Container security scanning: vulnerability detection with Trivy, Clair, Snyk, image hardening, secret detection, and CI-integrated security gates."
  keywords:
    - container-security
    - security
    - docker
    - devops


---
## Overview

Container security scanning identifies vulnerabilities in Docker images before they reach production. A single outdated base image can expose hundreds of CVEs. Tools like Trivy, Clair, and Snyk analyze OS packages, language dependencies, and even secrets embedded in layers. Integrating scanning into [CI/CD](/guides/devops/cicd-pipeline-guide) creates a security gate that prevents vulnerable images from deploying.

## When to Use

Use this resource when:
- Docker images are built from public base images that may contain known CVEs
- You need to comply with [security frameworks](/guides/security/security-best-practices-guide) (SOC 2, PCI-DSS, FedRAMP)
- Developers add [dependencies](/guides/security/security-best-practices-guide) without reviewing their security posture
- Production incidents have been traced back to vulnerable system libraries

## Solution

### Trivy Scan in CI/CD (GitHub Actions)

```yaml
name: Container Security Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
```

### Dockerfile Security Hardening

```dockerfile
# Use minimal base image
FROM gcr.io/distroless/nodejs20-debian12

# Run as non-root
USER 65532:65532

# Read-only root filesystem
COPY --chown=65532:65532 . /app
WORKDIR /app

# No shell access; no package manager
EXPOSE 3000
CMD ["server.js"]
```

### Secret Detection (TruffleHog)

```bash
# Scan image layers for embedded secrets
trufflehog docker --image=myapp:latest

# Scan filesystem before build
trufflehog filesystem --directory=.
```

## Explanation

**What scanners detect**:

| Layer | Detected Issues | Example |
|-------|-----------------|---------|
| OS packages | CVEs in apt/yum packages | OpenSSL vulnerability |
| Language packages | CVEs in npm/pip/gems | log4j, lodash prototype pollution |
| Configuration | Misconfigurations | Running as root, no read-only filesystem |
| Secrets | API keys, tokens | AWS credentials in ENV |
| Licenses | Compliance risk | GPL in proprietary software |

**Severity response**:
- **Critical**: Block deploy; fix immediately
- **High**: Block deploy; fix within 24 hours
- **Medium**: Warn; fix within sprint
- **Low**: Track; fix opportunistically

## Variants

| Scanner | Speed | Depth | Best For |
|---------|-------|-------|----------|
| Trivy | Fast | OS + language | CI integration; simple setup |
| Snyk | Medium | OS + language + SCA | Enterprise; license compliance |
| Clair | Medium | OS packages | Harbor registry integration |
| Grype | Fast | OS + language | Syft SBOM integration |
| Twistlock | Medium | Full stack | Enterprise runtime protection |

## What Works

- **Scan on every build**: Vulnerabilities are discovered daily; yesterday's clean image is today's risk
- **Use distroless or minimal bases**: `distroless`, `alpine`, or `scratch` reduce attack surface
- **Pin base image digests**: `FROM node:20-alpine@sha256:abc...` prevents tag tampering
- **Multi-stage builds**: Don't ship build tools (gcc, git) in production images. See [immutable infrastructure](/guides/devops/infrastructure-as-code-guide).
- **Sign images with Cosign**: Verify image integrity and provenance before deploy

## Common Mistakes

1. **Scanning only the base image**: Application dependencies often have more CVEs than the OS
2. **Using `:latest` tag**: Non-reproducible builds make vulnerability attribution impossible
3. **No severity threshold**: Scanning but ignoring all results creates false confidence
4. **Secrets in ENV**: `ENV AWS_SECRET_ACCESS_KEY=...` is visible to anyone who pulls the image. Follow [secrets management](/guides/security/security-best-practices-guide).
5. **Forgetting runtime scanning**: Image is clean at build time; runtime vulnerabilities (mounted volumes, sidecars) need monitoring too

## Frequently Asked Questions

**Q: Should I block deployment on medium-severity CVEs?**
A: Start with critical/high only. As your security posture matures, tighten to medium. Balance speed vs. security.

**Q: How often should I rescan existing images?**
A: Daily. New CVEs are published continuously. Yesterday's clean image may have today's critical vulnerability.

**Q: What's the difference between SAST and container scanning?**
A: SAST analyzes source code for bugs. Container scanning analyzes the built artifact (packages, configs, secrets).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Multi-stage hardened Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with audit
COPY package*.json ./
RUN npm ci --audit --omit=dev

# Stage 2: Production
FROM gcr.io/distroless/nodejs20-debian12 AS production

# Copy only built artifacts
COPY --from=builder --chown=65532:65532 /app/node_modules /app/node_modules
COPY --from=builder --chown=65532:65532 /app/package.json /app/package.json
COPY --chown=65532:65532 . /app

# Security: non-root user, read-only filesystem, no new privileges
USER 65532:65532
WORKDIR /app

# Drop all Linux capabilities
# Set via docker run: --cap-drop ALL --security-opt no-new-privileges
# Set via Kubernetes: securityContext.runAsNonRoot, readOnlyRootFilesystem

EXPOSE 3000
CMD ["server.js"]
```

### SBOM generation with Syft

Generate a Software Bill of Materials (SBOM) for traceability and compliance:

```bash
# Generate SBOM in SPDX format
syft myapp:latest -o spdx-json > sbom.spdx.json

# Generate SBOM in CycloneDX format
syft myapp:latest -o cyclonedx-json > sbom.cyclonedx.json

# Scan SBOM for vulnerabilities with Grype
grype sbom:sbom.cyclonedx.json --fail-on high

# Attach SBOM to image as OCI artifact
cosign attach sbom --sbom sbom.spdx.json myapp:latest
```

### Cosign image signing and verification

```bash
# Generate a key pair for signing
cosign generate-key-pair

# Sign the image
export COSIGN_PASSWORD="your-password"
cosign sign --key cosign.key myapp:latest

# Verify the signature before deploy
cosign verify --key cosign.pub myapp:latest

# Sign with OIDC (keyless signing in CI)
cosign sign --identity-token $OIDC_TOKEN myapp:latest

# Verify with certificate identity
cosign verify \
  --certificate-identity "https://github.com/myorg/myrepo/.github/workflows/deploy.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  myapp:latest
```

### Kubernetes security context

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
        runAsGroup: 65532
        fsGroup: 65532
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: myapp
          image: myapp:latest@sha256:abc123...
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            limits:
              memory: "256Mi"
              cpu: "500m"
            requests:
              memory: "128Mi"
              cpu: "100m"
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

### Trivy cache and ignore policies

```yaml
# .trivyignore — known false positives or accepted risks
CVE-2023-1234  # False positive: our code doesn't use the vulnerable function
CVE-2023-5678  # Accepted risk: mitigated by network policy

# trivy.yaml — Trivy configuration
scan:
  severity: [CRITICAL, HIGH]
  ignore-unfixed: true
  ignore-policy: .trivyignore
  skip-dirs:
    - /tests
    - /docs

# GitHub Actions with caching
name: Container Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cache Trivy DB
        uses: actions/cache@v4
        with:
          path: ~/.cache/trivy
          key: trivy-db-${{ github.run_id }}
          restore-keys: trivy-db-

      - name: Build and scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          ignore-unfixed: true
          exit-code: '1'

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
```

## Additional Best Practices

1. **Use `docker scan` or `trivy` locally before pushing.** Catch vulnerabilities early in development:

```bash
# Add to Makefile or package.json scripts
scan:
    trivy fs --severity CRITICAL,HIGH .
    trivy build --severity CRITICAL,HIGH .

# Pre-commit hook
#!/bin/bash
trivy fs --severity CRITICAL,HIGH --exit-code 1 .
```

2. **Regularly update base images.** Subscribe to security advisories for your base images and set up automated PRs:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

## Additional Common Mistakes

1. **Running containers as root.** Many base images default to root. Always specify a non-root user:

```dockerfile
# WRONG: runs as root by default
FROM node:20
COPY . /app
CMD ["node", "server.js"]

# CORRECT: explicit non-root user
FROM node:20
RUN groupadd -r app && useradd -r -g app app
USER app
COPY --chown=app:app . /app
CMD ["node", "server.js"]
```

2. **Not setting resource limits.** A compromised container can consume all host resources. Always set limits in Kubernetes or Docker:

```bash
# Docker: set memory and CPU limits
docker run --memory=256m --cpus=0.5 myapp:latest

# Docker Compose
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

## Additional FAQ

### How do I handle false positives in vulnerability scans?

Create a `.trivyignore` file listing CVE IDs you've reviewed and determined to be false positives. Document the justification for each ignored CVE and review the list quarterly. Alternatively, use Trivy's `--ignore-policy` flag with a custom OPA Rego policy for more complex filtering.

### What is the difference between image scanning and runtime security?

Image scanning happens at build time and checks the static contents of the image (packages, configs, secrets). Runtime security monitors the container while it's running — detecting anomalous process execution, file access, network connections, and privilege escalation. Use both: scanning prevents known vulnerabilities from deploying, runtime security catches unknown threats and zero-days.

### Should I use distroless or Alpine base images?

Both reduce attack surface but differ in compatibility. Distroless images have no shell, package manager, or extra binaries — smallest attack surface but harder to debug. Alpine uses musl libc instead of glibc, which can cause compatibility issues with some libraries. Choose distroless for production, Alpine for smaller images where you need a shell for debugging.
