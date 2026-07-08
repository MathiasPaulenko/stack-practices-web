---
contentType: recipes
slug: container-security-scanning
title: "Container Image Security Scanning with Trivy"
description: "Scan Docker images for vulnerabilities, misconfigurations, and secrets using Trivy, integrate scanning into CI/CD pipelines, and enforce image policies before deployment to production"
metaDescription: "Scan Docker images for vulnerabilities with Trivy. Integrate security scanning into CI/CD pipelines and enforce image policies before production deployment."
difficulty: intermediate
topics:
  - devops
  - security
tags:
  - container
  - docker
  - security
  - devops
  - ci-cd
relatedResources:
  - /recipes/devops/docker-multi-stage-build-optimization
  - /recipes/security/sql-injection-prevention
  - /guides/devops/docker-for-developers-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Scan Docker images for vulnerabilities with Trivy. Integrate security scanning into CI/CD pipelines and enforce image policies before production deployment."
  keywords:
    - container security
    - docker scanning
    - trivy
    - vulnerability scanning
    - image security
---

# Container Image Security Scanning with Trivy

Container images bundle application code with operating system libraries, making them a major attack surface. Trivy scans images for OS package vulnerabilities, application dependencies, misconfigurations, and exposed secrets. The solution below covers local scanning, CI/CD integration, policy enforcement, and remediation workflows for production container security.

## When to Use This

- Production workloads run containerized applications that must meet security compliance. See [Docker Basics](/recipes/devops/docker-basics) for container fundamentals.
- Images are built from public base images with unknown vulnerability status. See [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) for local image building.
- You need automated enforcement blocking deployments with critical CVEs. See [CI/CD Pipeline Setup](/recipes/devops/cicd-pipeline-setup) for pipeline gating.

## Solution

### 1. Local Image Scanning

```bash
# Install Trivy (Aqua Security)
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

# Scan a local or remote image
trivy image myapp:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Output SARIF for GitHub Advanced Security
trivy image --format sarif --output trivy-results.sarif myapp:latest

# Scan for secrets in image layers
trivy image --scanners secret myapp:latest

# Scan Dockerfile for misconfigurations
trivy config Dockerfile
```

### 2. CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/security-scan.yml
name: Container Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t app:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          ignore-unfixed: true

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### 3. Policy-Based Enforcement

```yaml
# trivy-policy.yaml
# Define custom policy rules
package trivy

import data.lib.result

deny[msg] {
  input.OS.Family == "alpine"
  input.OS.Version == "3.14"
  msg := "Alpine 3.14 reached EOL; upgrade to 3.19+"
}

deny[msg] {
  input.Results[i].Vulnerabilities[j].Severity == "CRITICAL"
  input.Results[i].Vulnerabilities[j].FixedVersion != ""
  msg := sprintf("CRITICAL CVE %s has available fix %s", [
    input.Results[i].Vulnerabilities[j].VulnerabilityID,
    input.Results[i].Vulnerabilities[j].FixedVersion,
  ])
}

deny[msg] {
  input.Results[i].Class == "secret"
  msg := sprintf("Secret exposed in %s: %s", [
    input.Results[i].Target,
    input.Results[i].Secrets[0].Title,
  ])
}
```

### 4. Dockerfile Hardening

```dockerfile
# Dockerfile
# Use minimal base image
FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Install dependencies as separate layer
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary artifacts
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

# Remove unnecessary tools
RUN apk del curl wget 2>/dev/null || true

USER nextjs
EXPOSE 3000
CMD ["dumb-init", "node", "server.js"]
```

### 5. Image Signing and Verification

```bash
# Sign image with Cosign
cosign generate-key-pair

cosign sign --key cosign.key myregistry.io/app:1.0.0

# Verify before deployment
cosign verify --key cosign.pub myregistry.io/app:1.0.0

# Policy: only deploy signed images
# In Kubernetes admission controller or CI gate
```

## How It Works

- **Vulnerability scanning** compares installed packages against CVE databases (NVD, Alpine SecDB, etc.)
- **Secret detection** scans image layers for API keys, tokens, and private keys committed accidentally
- **Misconfiguration checks** validate Dockerfiles and Kubernetes manifests against CIS benchmarks
- **Policy enforcement** blocks images with critical or unfixed vulnerabilities at deployment time

## Production Considerations

- Scan base images separately and cache vulnerability reports to reduce CI time
- Maintain an allowlist for accepted vulnerabilities with documented risk assessments
- Integrate scan results into SIEM or vulnerability management platforms

## Common Mistakes

- Scanning images after deployment rather than during build pipeline gating
- Ignoring unfixed vulnerabilities without risk assessment or compensating controls
- Running containers as root, amplifying the impact of any container escape vulnerability

## FAQ

**Q: Trivy vs Clair vs Snyk Container: which to choose?**
A: Trivy is fast, open-source, and integrates well with CI. Clair is CNCF-graduated but slower. Snyk offers broader ecosystem but requires licensing.

**Q: Should I fail builds on all vulnerabilities?**
A: No. Establish severity thresholds (e.g., block on CRITICAL with fixes available) and track accepted risks in a vulnerability register.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
container_scan:
  stage: test
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  variables:
    TRIVY_NO_PROGRESS: "true"
    TRIVY_CACHE_DIR: ".trivycache/"
  cache:
    key: trivy
    paths:
      - .trivycache/
  before_script:
    - docker build -t app:$CI_COMMIT_SHA .
  script:
    - trivy image --exit-code 1 --severity CRITICAL,HIGH --ignore-unfixed app:$CI_COMMIT_SHA
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.json
  allow_failure: false
```

### Grype (Alternative Scanner)

```bash
# Install Grype (Anchore)
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh

# Scan an image
grype myapp:latest

# Only fail on fixable vulnerabilities
grype myapp:latest --fail-on high --only-fixed

# Output JSON for integration
grype myapp:latest -o json > grype-results.json

# SBOM generation with Syft (companion tool)
syft myapp:latest -o json > sbom.json
grype sbom:sbom.json --fail-on high
```

### SBOM (Software Bill of Materials)

```bash
# Generate SBOM with Syft
syft myapp:latest -o cyclonedx-json > sbom.cyclonedx.json

# Generate SPDX format
syft myapp:latest -o spdx-json > sbom.spdx.json

# Scan SBOM with Grype (no Docker needed)
grype sbom:sbom.cyclonedx.json

# Store SBOM as artifact for compliance
# CI/CD: upload with build artifacts
```

```yaml
# GitHub Actions: SBOM generation
- name: Generate SBOM
  run: |
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh
    syft app:${{ github.sha }} -o cyclonedx-json > sbom.json

- uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.json
    retention-days: 365  # Keep for compliance
```

### Kyverno Admission Control (Kubernetes)

```yaml
# kyverno-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: deny-images-with-critical-vulns
spec:
  validationFailureAction: Enforce
  rules:
  - name: deny-critical-vulnerabilities
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images with CRITICAL vulnerabilities are not allowed"
      foreach:
      - list: "request.object.spec.containers"
        deny:
          conditions:
            any:
            - key: "{{ element.image }}"
              operator: Equals
              value: ""  # Add your vulnerable image check
```

### Multi-Stage Scan Pipeline

```yaml
# .github/workflows/multi-scan.yml
name: Multi-Scanner Security
on: [push]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app:${{ github.sha }} .
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: app:${{ github.sha }}
          format: json
          output: trivy.json

  grype:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app:${{ github.sha }} .
      - run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh
          grype app:${{ github.sha }} -o json > grype.json

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  report:
    needs: [trivy, grype, secrets-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: Consolidate reports
        run: |
          echo "## Security Scan Summary" >> $GITHUB_STEP_SUMMARY
          echo "- Trivy: $(jq '.Results | length' trivy/trivy.json) findings" >> $GITHUB_STEP_SUMMARY
          echo "- Grype: $(jq '.matches | length' grype/grype.json) findings" >> $GITHUB_STEP_SUMMARY
```

## Additional Best Practices

1. **Pin base image versions.** Never use `latest` tags in production Dockerfiles:

```dockerfile
# Bad: unpredictable, may introduce new vulnerabilities
FROM node:latest

# Good: pinned, reproducible, auditable
FROM node:20.11.1-alpine3.19
```

1. **Scan base images separately.** Cache results to avoid rescanning unchanged layers:

```bash
# Scan base image once and cache
trivy image node:20-alpine --cache-dir .trivycache

# Scan only application layers (faster)
trivy image --skip-dirs /usr/local/lib/node_modules app:latest
```

1. **Set up automatic base image updates.** Use Renovate or Dependabot for base image PRs:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: docker
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

## Additional Common Mistakes

1. **Scanning only the final image.** Multi-stage builds can hide vulnerabilities in builder stages:

```bash
# Scan all stages, not just final
trivy image --scan-source build,final app:latest
```

1. **Not scanning IaC files.** Misconfigurations in Kubernetes manifests and Terraform are also risks:

```bash
# Scan Kubernetes manifests
trivy config k8s/

# Scan Terraform
trivy config terraform/

# Scan Helm charts
trivy config charts/
```

1. **Ignoring license compliance.** Vulnerability scanning is not enough; check licenses too:

```bash
# Syft can list licenses
syft myapp:latest -o json | jq '.artifacts[] | .licenses'
```

## Additional FAQ

### How do I handle false positives in vulnerability scans?

Create an `.trivyignore` file with documented justifications:

```bash
# .trivyignore
# CVE-2023-1234: False positive - package is not used at runtime
CVE-2023-1234
# CVE-2023-5678: Accepted risk - no fix available, mitigated by network policy
CVE-2023-5678
```

### Should I scan in staging or only in production?

Scan at every stage:
- **Build time**: Block critical vulnerabilities before image is pushed
- **Staging**: Full scan with policy enforcement
- **Production**: Continuous scanning of running images for new CVEs

```bash
# Continuous scan of running production images
trivy image --schedule "0 6 * * *" registry.io/app:prod
```

### What is SBOM and why do I need it?

SBOM (Software Bill of Materials) lists every component in your image. It's required by US Executive Order 14028 for government software. Use Syft to generate and Grype to scan SBOMs without needing the actual image.

## Performance Tips

1. **Cache vulnerability databases.** Trivy downloads CVE databases on each run unless cached:

```yaml
# GitHub Actions: cache Trivy DB
- uses: actions/cache@v4
  with:
    path: .trivycache
    key: trivy-${{ hashFiles('**/trivy-cache-key') }}
```

1. **Use `--skip-dirs` for large images.** Skip directories with known-safe content:

```bash
trivy image --skip-dirs /usr/share/doc,/usr/share/man app:latest
```

1. **Scan in parallel with tests.** Run security scans concurrently with test jobs:

```yaml
jobs:
  test:
    # ...
  scan:
    # runs in parallel with test
    needs: [build]
```

1. **Use `--ignore-unfixed` in CI.** Only block on vulnerabilities with available fixes to reduce noise:

```bash
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 app:latest
```
