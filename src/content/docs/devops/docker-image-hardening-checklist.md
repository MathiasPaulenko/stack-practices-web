---
contentType: docs
slug: docker-image-hardening-checklist
templateType: guideline
title: "Docker Image Hardening Checklist"
description: "Checklist for hardening Docker container images for production: base image selection, user permissions, file system restrictions, network isolation, resource limits, secret management, vulnerability scanning, and CI/CD integration with Dockerfile examples."
metaDescription: "Docker image hardening checklist: base images, user permissions, filesystem, network, resource limits, secrets, vulnerability scanning, CI/CD, Dockerfile examples."
difficulty: intermediate
topics:
  - devops
tags:
  - docker
  - container-security
  - hardening
  - devops
  - containerization
  - ci-cd
relatedResources:
  - /docs/devops/kubernetes-resource-quotas-template
  - /docs/devops/deployment-rollback-runbook
  - /docs/security/owasp-top-10-remediation-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Docker image hardening checklist: base images, user permissions, filesystem, network, resource limits, secrets, vulnerability scanning, CI/CD, Dockerfile examples."
  keywords:
    - docker hardening
    - container security
    - dockerfile best practices
    - image scanning
    - container hardening
    - docker security
    - production containers
---

## Overview

This checklist covers hardening Docker container images for production use. Each section provides actionable steps, code examples, and verification commands. Use this checklist when building production Docker images to reduce attack surface, enforce least privilege, and pass security audits.

---

## 1. Base Image Selection

### 1.1 Checklist

```text
- [ ] Use official images from Docker Hub or trusted registries
- [ ] Use minimal base images (alpine, distroless, scratch)
- [ ] Pin base image version with digest (not just tag)
- [ ] Avoid :latest tag — use specific version
- [ ] Verify base image is actively maintained
- [ ] Check base image for known vulnerabilities before use
- [ ] Use multi-arch images if deploying to multiple architectures
- [ ] Document base image rationale in Dockerfile comments
```

### 1.2 Dockerfile — Pinned Base Image

```dockerfile
# BAD: unpinned, latest tag
FROM node:latest

# BETTER: version pinned
FROM node:20.11.0-alpine

# BEST: version + digest pinned
FROM node:20.11.0-alpine@sha256:2ba3a542cf5c0b6e3c1b53a7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7

# Distroless — smallest attack surface
FROM gcr.io/distroless/nodejs20-debian12@sha256:abc123...:latest
```

### 1.3 Base Image Comparison

```text
Base image              | Size    | Shell | Package manager | Attack surface
────────────────────────┼─────────┼───────┼─────────────────┼──────────────────
ubuntu:22.04            | 77 MB   | Yes   | apt             | High
debian:12-slim          | 74 MB   | Yes   | apt             | Medium
alpine:3.19             | 7 MB    | Yes   | apk             | Low
distroless/nodejs20     | 125 MB  | No    | None            | Very low
scratch                 | 0 MB    | No    | None            | Minimal
```

---

## 2. User Permissions

### 2.1 Checklist

```text
- [ ] Container runs as non-root user
- [ ] USER directive in Dockerfile specifies non-root UID
- [ ] File ownership set to non-root user
- [ ] No sudo available in the image
- [ ] UID is numeric (not named — avoids lookup issues)
- [ ] User has minimal filesystem permissions
- [ ] Read-only access to application files
- [ ] No write access to system directories
```

### 2.2 Dockerfile — Non-Root User

```dockerfile
# Create non-root user with specific UID
RUN groupadd -r appuser -g 1001 && \
    useradd -r -g appuser -u 1001 -m -d /home/appuser appuser

# Set ownership
COPY --chown=1001:1001 . /app
RUN chown -R 1001:1001 /app && chmod -R 550 /app

# Switch to non-root user
USER 1001:1001

# Application runs as non-root
CMD ["node", "server.js"]
```

### 2.3 Docker Compose — Runtime User

```yaml
services:
  api:
    image: myapp:latest
    user: "1001:1001"
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp
      - /app/cache
```

---

## 3. Filesystem Restrictions

### 3.1 Checklist

```text
- [ ] Read-only root filesystem enabled
- [ ] Writable paths mounted as tmpfs
- [ ] No sensitive files copied into image
- [ ] .dockerignore excludes secrets, .git, node_modules
- [ ] No build artifacts left in final image
- [ ] /tmp, /var/tmp mounted as tmpfs
- [ ] No SSH keys or credentials in image layers
- [ ] Clean package manager caches in same layer
```

### 3.2 .dockerignore

```text
.git
.gitignore
.env
.env.*
*.pem
*.key
node_modules
npm-debug.log
Dockerfile
docker-compose.yml
coverage
test
*.md
.vscode
.idea
```

### 3.3 Dockerfile — Clean Layers

```dockerfile
# Multi-stage build — only final artifacts in production image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

# Final stage — minimal image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Clean apk cache in same layer
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

USER 1001:1001
CMD ["node", "dist/server.js"]
```

---

## 4. Network and Port Restrictions

### 4.1 Checklist

```text
- [ ] Only necessary ports exposed (EXPOSE directive)
- [ ] No host network mode (--network=host)
- [ ] Container connected to specific Docker network
- [ ] No ports bound to 0.0.0.0 unless public-facing
- [ ] Internal services bound to Docker network only
- [ ] Docker network has IP range restriction
- [ ] No privileged port mapping (< 1024) without justification
- [ ] Egress traffic filtered if possible
```

### 4.2 Docker Compose — Network Isolation

```yaml
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  backend:
    driver: bridge
    internal: true  # No external access
    ipam:
      config:
        - subnet: 172.21.0.0/16

services:
  api:
    networks:
      - frontend
      - backend
    ports:
      - "127.0.0.1:8080:8080"  # Bind to localhost only

  database:
    networks:
      - backend  # Internal only — no port exposure
    ports: []  # No ports published
```

---

## 5. Resource Limits

### 5.1 Checklist

```text
- [ ] Memory limit set (--memory)
- [ ] CPU limit set (--cpus)
- [ ] Memory reservation set (--memory-reservation)
- [ ] PIDs limit set (--pids-limit)
- [ ] OOM killer preference set (--oom-kill-disable only with limits)
- [ ] Restart policy configured
- [ ] Health check configured
- [ ] Logging driver configured with size limits
```

### 5.2 Docker Compose — Resource Limits

```yaml
services:
  api:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 512M
          pids: 100
        reservations:
          cpus: "0.5"
          memory: 256M
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 6. Secret Management

### 6.1 Checklist

```text
- [ ] No secrets in environment variables in Dockerfile
- [ ] No secrets in ARG or ENV directives
- [ ] Secrets loaded from Docker secrets or external vault
- [ ] No secrets in image labels
- [ ] No secrets in build args (visible in image history)
- [ ] Use BuildKit secret mounting for build-time secrets
- [ ] Runtime secrets via Docker secrets or mounted volumes
- [ ] Secret rotation does not require image rebuild
```

### 6.2 BuildKit Secret Mounting

```dockerfile
# syntax=docker/dockerfile:1.6

# Build-time secret — not stored in image layers
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --production

# Runtime — use Docker secrets
# docker secret create npmrc /path/to/.npmrc
```

### 6.3 Docker Compose — Secrets

```yaml
services:
  api:
    image: myapp:latest
    secrets:
      - db-password
      - api-key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db-password
      API_KEY_FILE: /run/secrets/api-key

secrets:
  db-password:
    file: ./secrets/db-password.txt
  api-key:
    external: true
    name: production-api-key
```

---

## 7. Vulnerability Scanning

### 7.1 Checklist

```text
- [ ] Trivy scan in CI pipeline (blocks on HIGH/CRITICAL)
- [ ] Grype or Snyk Container scan as secondary check
- [ ] Base image scanned before use
- [ ] Scan runs on every image build in CI
- [ ] Scan runs nightly on production images
- [ ] CVE findings tracked and remediated
- [ ] SBOM (Software Bill of Materials) generated
- [ ] Image signed with Cosign or Notation
```

### 7.2 CI Pipeline — Trivy Scan

```yaml
# GitHub Actions
name: Container Security
on:
  push:
    branches: [main]
  pull_request:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: json
          output: trivy-report.json
          exit-code: 1
          severity: HIGH,CRITICAL
          ignore-unfixed: true

      - name: Generate SBOM
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: cyclonedx
          output: sbom.json

      - name: Sign image with Cosign
        run: |
          cosign sign --key ${{ secrets.COSIGN_KEY }} myapp:${{ github.sha }}
```

### 7.3 Trivy Scan Commands

```bash
# Scan image for vulnerabilities
trivy image myapp:latest --severity HIGH,CRITICAL --exit-code 1

# Scan and ignore unfixed vulnerabilities
trivy image myapp:latest --ignore-unfixed --severity HIGH,CRITICAL

# Generate SBOM
trivy image --format cyclonedx --output sbom.json myapp:latest

# Scan Dockerfile for misconfigurations
trivy config Dockerfile --severity HIGH,CRITICAL
```

---

## 8. Capability and Privilege Restrictions

### 8.1 Checklist

```text
- [ ] All Linux capabilities dropped (--cap-drop=ALL)
- [ ] Only required capabilities added back (--cap-add)
- [ ] No privileged mode (--privileged)
- [ ] no-new-privileges flag set
- [ ] No host PID namespace (--pid=host)
- [ ] No host IPC namespace (--ipc=host)
- [ ] No host UTS namespace (--uts=host)
- [ ] Seccomp profile applied (default or custom)
- [ ] AppArmor profile applied
- [ ] SELinux labels applied if available
```

### 8.2 Docker Run — Hardened

```bash
docker run \
  --user 1001:1001 \
  --read-only \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt=no-new-privileges:true \
  --security-opt=seccomp=seccomp-profile.json \
  --memory=512m \
  --cpus=2.0 \
  --pids-limit=100 \
  --tmpfs /tmp:rw,size=10m \
  --tmpfs /app/cache:rw,size=50m \
  --network=backend \
  --restart=unless-stopped \
  myapp:latest
```

## FAQ

### What is the difference between Alpine and Distroless base images?

Alpine is a minimal Linux distribution (7 MB) with a shell (sh), package manager (apk), and busybox utilities. It is easy to debug but has a larger attack surface than distroless. Distroless images contain only your application runtime and its dependencies — no shell, no package manager, no utilities. They are harder to debug (no shell access) but have the smallest attack surface. Use Alpine for development and staging where debuggability matters. Use Distroless for production where security is paramount. If you need a shell for debugging in production, use distroless with a debug variant (e.g., `gcr.io/distroless/nodejs20-debian12:debug`).

### How do I debug a container with a read-only filesystem?

Mount tmpfs for writable paths that your application needs: `--tmpfs /tmp --tmpfs /app/cache`. For debugging, you can temporarily disable read-only mode: `docker run --rm -it myapp:latest sh` (if the image has a shell). For distroless images, use `docker run --rm -it --entrypoint=sh myapp:latest` with a debug variant. Alternatively, use `docker exec` to get a shell in a running container (if it has one). For distroless containers without a shell, use `kubectl debug` or `docker cp` to copy debugging tools into the container.

### Should I use Docker Scout, Trivy, or Grype for vulnerability scanning?

All three are effective. Trivy is the most popular open-source scanner with broad CVE coverage and fast scans. Grype (from Anchore) is also open-source and integrates well with CI. Docker Scout is Docker's built-in tool with good integration into Docker Desktop and Hub. Use Trivy if you want a free, widely-adopted tool with good CI integration. Use Grype if you already use Anchore tools. Use Docker Scout if you are in the Docker ecosystem. Run at least one scanner in CI and one nightly. Running two different scanners provides better coverage since they use different vulnerability databases.

### How do I reduce Docker image size?

Use multi-stage builds to copy only production artifacts into the final image. Use minimal base images (Alpine or Distroless). Clean package manager caches in the same RUN layer: `RUN apk add --no-cache curl && rm -rf /var/cache/apk/*`. Use `.dockerignore` to exclude test files, documentation, and build artifacts. Combine RUN commands to reduce layers. Use `npm ci --production` instead of `npm install` to skip dev dependencies. Use BuildKit for better caching and parallel builds. Scan with `dive` tool to inspect layer sizes and identify waste.

### What is image signing and why do I need it?

Image signing verifies that an image was built by a trusted source and has not been tampered with. Tools like Cosign (Sigstore) or Notation (Notary v2) sign images with cryptographic keys. When a host pulls a signed image, it can verify the signature before running the container. This prevents running malicious images that may have been substituted in the registry. In a supply chain attack, an attacker could push a malicious image to your registry — image signing detects this. Use Cosign with OIDC (keyless signing) in CI for automatic signing. Enforce signature verification in your deployment platform (Kubernetes with Sigstore policy controller, or Docker Content Trust).
