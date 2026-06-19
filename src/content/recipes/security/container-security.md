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
relatedResources:
  - /recipes/container-security-scanning
  - /docs/data-retention-policy-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
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

Container security scanning identifies vulnerabilities in Docker images before they reach production. A single outdated base image can expose hundreds of CVEs. Tools like Trivy, Clair, and Snyk analyze OS packages, language dependencies, and even secrets embedded in layers. Integrating scanning into CI/CD creates a security gate that prevents vulnerable images from deploying.

## When to Use

Use this resource when:
- Docker images are built from public base images that may contain known CVEs
- You need to comply with security frameworks (SOC 2, PCI-DSS, FedRAMP)
- Developers add dependencies without reviewing their security posture
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

## Best Practices

- **Scan on every build**: Vulnerabilities are discovered daily; yesterday's clean image is today's risk
- **Use distroless or minimal bases**: `distroless`, `alpine`, or `scratch` reduce attack surface
- **Pin base image digests**: `FROM node:20-alpine@sha256:abc...` prevents tag tampering
- **Multi-stage builds**: Don't ship build tools (gcc, git) in production images
- **Sign images with Cosign**: Verify image integrity and provenance before deploy

## Common Mistakes

1. **Scanning only the base image**: Application dependencies often have more CVEs than the OS
2. **Using `:latest` tag**: Non-reproducible builds make vulnerability attribution impossible
3. **No severity threshold**: Scanning but ignoring all results creates false confidence
4. **Secrets in ENV**: `ENV AWS_SECRET_ACCESS_KEY=...` is visible to anyone who pulls the image
5. **Forgetting runtime scanning**: Image is clean at build time; runtime vulnerabilities (mounted volumes, sidecars) need monitoring too

## Frequently Asked Questions

**Q: Should I block deployment on medium-severity CVEs?**
A: Start with critical/high only. As your security posture matures, tighten to medium. Balance speed vs. security.

**Q: How often should I rescan existing images?**
A: Daily. New CVEs are published continuously. Yesterday's clean image may have today's critical vulnerability.

**Q: What's the difference between SAST and container scanning?**
A: SAST analyzes source code for bugs. Container scanning analyzes the built artifact (packages, configs, secrets).
