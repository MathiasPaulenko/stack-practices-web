---
contentType: docs
slug: docker-image-hardening-checklist
templateType: guideline
title: "Checklist de Hardening de Docker Images"
description: "Checklist para hardening de Docker container images para production: base image selection, user permissions, filesystem restrictions, network isolation, resource limits, secret management, vulnerability scanning y CI/CD integration con Dockerfile examples."
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

Este checklist cubre hardening de Docker container images para production use. Cada section provee actionable steps, code examples y verification commands. Usa este checklist cuando buildeas production Docker images para reducir attack surface, enforcear least privilege y pasar security audits.

---

## 1. Base Image Selection

### 1.1 Checklist

```text
- [ ] Usa official images desde Docker Hub o trusted registries
- [ ] Usa minimal base images (alpine, distroless, scratch)
- [ ] Pinea base image version con digest (no solo tag)
- [ ] Avoida :latest tag — usa specific version
- [ ] Verifica que base image este actively maintained
- [ ] Checkea base image para known vulnerabilities antes de usar
- [ ] Usa multi-arch images si deployeas a multiple architectures
- [ ] Documenta base image rationale en Dockerfile comments
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
- [ ] Container corre como non-root user
- [ ] USER directive en Dockerfile specificea non-root UID
- [ ] File ownership seteado a non-root user
- [ ] No sudo available en el image
- [ ] UID es numeric (no named — avoids lookup issues)
- [ ] User tiene minimal filesystem permissions
- [ ] Read-only access a application files
- [ ] No write access a system directories
```

### 2.2 Dockerfile — Non-Root User

```dockerfile
# Crea non-root user con specific UID
RUN groupadd -r appuser -g 1001 && \
    useradd -r -g appuser -u 1001 -m -d /home/appuser appuser

# Setea ownership
COPY --chown=1001:1001 . /app
RUN chown -R 1001:1001 /app && chmod -R 550 /app

# Switchea a non-root user
USER 1001:1001

# Application corre como non-root
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
- [ ] Writable paths mounted como tmpfs
- [ ] No sensitive files copied en el image
- [ ] .dockerignore excluye secrets, .git, node_modules
- [ ] No build artifacts left en final image
- [ ] /tmp, /var/tmp mounted como tmpfs
- [ ] No SSH keys o credentials en image layers
- [ ] Clean package manager caches en same layer
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
# Multi-stage build — solo final artifacts en production image
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

# Clean apk cache en same layer
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

USER 1001:1001
CMD ["node", "dist/server.js"]
```

---

## 4. Network and Port Restrictions

### 4.1 Checklist

```text
- [ ] Solo necessary ports exposed (EXPOSE directive)
- [ ] No host network mode (--network=host)
- [ ] Container connected a specific Docker network
- [ ] No ports bound a 0.0.0.0 a menos que public-facing
- [ ] Internal services bound a Docker network only
- [ ] Docker network tiene IP range restriction
- [ ] No privileged port mapping (< 1024) sin justification
- [ ] Egress traffic filtered si possible
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
      - "127.0.0.1:8080:8080"  # Bind a localhost only

  database:
    networks:
      - backend  # Internal only — no port exposure
    ports: []  # No ports published
```

---

## 5. Resource Limits

### 5.1 Checklist

```text
- [ ] Memory limit seteado (--memory)
- [ ] CPU limit seteado (--cpus)
- [ ] Memory reservation seteado (--memory-reservation)
- [ ] PIDs limit seteado (--pids-limit)
- [ ] OOM killer preference seteado (--oom-kill-disable solo con limits)
- [ ] Restart policy configurado
- [ ] Health check configurado
- [ ] Logging driver configurado con size limits
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
- [ ] No secrets en environment variables en Dockerfile
- [ ] No secrets en ARG o ENV directives
- [ ] Secrets loadeados desde Docker secrets o external vault
- [ ] No secrets en image labels
- [ ] No secrets en build args (visibles en image history)
- [ ] Usa BuildKit secret mounting para build-time secrets
- [ ] Runtime secrets via Docker secrets o mounted volumes
- [ ] Secret rotation no require image rebuild
```

### 6.2 BuildKit Secret Mounting

```dockerfile
# syntax=docker/dockerfile:1.6

# Build-time secret — no storeado en image layers
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --production

# Runtime — usa Docker secrets
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
- [ ] Trivy scan en CI pipeline (blockea on HIGH/CRITICAL)
- [ ] Grype o Snyk Container scan como secondary check
- [ ] Base image scaneada antes de usar
- [ ] Scan corre en every image build en CI
- [ ] Scan corre nightly en production images
- [ ] CVE findings trackeados y remediated
- [ ] SBOM (Software Bill of Materials) generated
- [ ] Image signed con Cosign o Notation
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

      - name: Buildea image
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

      - name: Genera SBOM
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: cyclonedx
          output: sbom.json

      - name: Signea image con Cosign
        run: |
          cosign sign --key ${{ secrets.COSIGN_KEY }} myapp:${{ github.sha }}
```

### 7.3 Trivy Scan Commands

```bash
# Scanea image para vulnerabilities
trivy image myapp:latest --severity HIGH,CRITICAL --exit-code 1

# Scanea y ignora unfixed vulnerabilities
trivy image myapp:latest --ignore-unfixed --severity HIGH,CRITICAL

# Genera SBOM
trivy image --format cyclonedx --output sbom.json myapp:latest

# Scanea Dockerfile para misconfigurations
trivy config Dockerfile --severity HIGH,CRITICAL
```

---

## 8. Capability and Privilege Restrictions

### 8.1 Checklist

```text
- [ ] All Linux capabilities dropped (--cap-drop=ALL)
- [ ] Solo required capabilities added back (--cap-add)
- [ ] No privileged mode (--privileged)
- [ ] no-new-privileges flag seteado
- [ ] No host PID namespace (--pid=host)
- [ ] No host IPC namespace (--ipc=host)
- [ ] No host UTS namespace (--uts=host)
- [ ] Seccomp profile applied (default o custom)
- [ ] AppArmor profile applied
- [ ] SELinux labels applied si available
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

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre Alpine y Distroless base images?

Alpine es un minimal Linux distribution (7 MB) con shell (sh), package manager (apk) y busybox utilities. Es easy de debuggear pero tiene un larger attack surface que distroless. Distroless images contienen solo tu application runtime y sus dependencies — no shell, no package manager, no utilities. Son harder de debuggear (no shell access) pero tienen el smallest attack surface. Usa Alpine para development y staging donde debuggability importa. Usa Distroless para production donde security es paramount. Si necesitas un shell para debugging en production, usa distroless con un debug variant (e.g., `gcr.io/distroless/nodejs20-debian12:debug`).

### ¿Cómo debuggeo un container con read-only filesystem?

Mountea tmpfs para writable paths que tu application necesita: `--tmpfs /tmp --tmpfs /app/cache`. Para debugging, puedes temporalmente disablear read-only mode: `docker run --rm -it myapp:latest sh` (si el image tiene shell). Para distroless images, usa `docker run --rm -it --entrypoint=sh myapp:latest` con un debug variant. Alternativamente, usa `docker exec` para get un shell en un running container (si tiene uno). Para distroless containers sin shell, usa `kubectl debug` o `docker cp` para copy debugging tools en el container.

### ¿Deberia usar Docker Scout, Trivy o Grype para vulnerability scanning?

Los three son effective. Trivy es el most popular open-source scanner con broad CVE coverage y fast scans. Grype (de Anchore) es tambien open-source e integra bien con CI. Docker Scout es Docker's built-in tool con good integration en Docker Desktop y Hub. Usa Trivy si quieres un free, widely-adopted tool con good CI integration. Usa Grype si ya usas Anchore tools. Usa Docker Scout si estas en el Docker ecosystem. Corre al menos un scanner en CI y uno nightly. Correr dos different scanners provee better coverage ya que usan different vulnerability databases.

### ¿Cómo reduzco Docker image size?

Usa multi-stage builds para copyear solo production artifacts en el final image. Usa minimal base images (Alpine o Distroless). Clean package manager caches en el same RUN layer: `RUN apk add --no-cache curl && rm -rf /var/cache/apk/*`. Usa `.dockerignore` para excluir test files, documentation y build artifacts. Combine RUN commands para reducir layers. Usa `npm ci --production` en vez de `npm install` para skippear dev dependencies. Usa BuildKit para better caching y parallel builds. Scanea con `dive` tool para inspectar layer sizes e identificar waste.

### ¿Qué es image signing y por qué lo necesito?

Image signing verifica que un image fue built por un trusted source y no ha sido tampered with. Tools como Cosign (Sigstore) o Notation (Notary v2) signean images con cryptographic keys. Cuando un host pullea un signed image, puede verificar el signature antes de correr el container. Esto previene running malicious images que pueden haber sido substituted en el registry. En un supply chain attack, un attacker podria pushear un malicious image a tu registry — image signing detecta esto. Usa Cosign con OIDC (keyless signing) en CI para automatic signing. Enforcea signature verification en tu deployment platform (Kubernetes con Sigstore policy controller, o Docker Content Trust).
