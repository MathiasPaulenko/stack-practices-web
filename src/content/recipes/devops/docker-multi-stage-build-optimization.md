---




contentType: recipes
slug: docker-multi-stage-build-optimization
title: "Docker Multi-Stage Build Optimization for Smaller Images"
description: "Reduce Docker image size with multi-stage builds and proper layering"
metaDescription: "Optimize Docker images with multi-stage builds, layer caching, distroless bases, and .dockerignore. Reduce image size by up to 90 percent."
difficulty: intermediate
topics:
  - devops
tags:
  - docker
  - multi-stage-build
  - image-optimization
  - container
  - dockerfile
  - devops
relatedResources:
  - /recipes/docker-health-check-configuration
  - /recipes/docker-compose-dev-prod-split
  - /guides/terraform-best-practices-guide
  - /docs/deployment-checklist-template
  - /recipes/container-security-scanning
  - /recipes/docker-image-vulnerability-scan
  - /recipes/docker-network-isolation
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Optimize Docker images with multi-stage builds, layer caching, distroless bases, and .dockerignore. Reduce image size by up to 90 percent."
  keywords:
    - docker multi stage build
    - docker image size optimization
    - dockerfile layer caching
    - distroless docker images
    - docker build optimization
    - docker multi stage dockerfile




---

## Overview

Multi-stage builds let you use multiple FROM statements in a single Dockerfile. Each stage starts fresh, and you copy only the artifacts you need from previous stages. This drops build tools, dev dependencies, and intermediate files from the final image, reducing size by up to 90 percent.

## When to Use

- Your Docker image is too large (over 500MB for a simple app)
- You ship build tools (compilers, SDKs, node_modules) in production images
- You want smaller attack surface by excluding unnecessary binaries
- You need different base images for build vs runtime (e.g., Go build with golang, run with scratch)

## Solution

### Node.js multi-stage build

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Python multi-stage with distroless

```dockerfile
# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM gcr.io/distroless/python3-debian12 AS runtime

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY . .

ENV PATH="/opt/venv/bin:$PATH"

USER nonroot:nonroot

EXPOSE 8000

CMD ["-m", "gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

### Go multi-stage with scratch

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# Stage 2: Runtime (scratch = empty image)
FROM scratch AS runtime

COPY --from=builder /build/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080

ENTRYPOINT ["/server"]
```

### Java multi-stage with Gradle

```dockerfile
# Stage 1: Build
FROM gradle:8.7-jdk21-alpine AS builder

WORKDIR /build

COPY build.gradle settings.gradle ./
COPY src ./src

RUN gradle bootJar --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

COPY --from=builder /build/build/libs/*.jar app.jar

USER temurin

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
```

### .dockerignore for smaller context

```text
# .dockerignore
node_modules
dist
.git
.gitignore
.env
.env.local
*.md
.vscode
.idea
coverage
.nyc_output
Dockerfile
docker-compose*.yml
```

### Layer caching optimization

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source (invalidates cache only when source changes)
COPY . .

RUN npm run build
```

## Explanation

Each `FROM` instruction starts a new stage. Docker builds all stages but only the final stage becomes the output image. Use `COPY --from=builder` to pull artifacts from earlier stages.

Key concepts:

- **Stage naming**: Use `AS builder`, `AS runtime` to name stages. Reference them with `COPY --from=builder`.
- **Distroless images**: Google's distroless images have no shell, package manager, or extra binaries. They reduce size and attack surface considerably.
- **Scratch images**: The smallest possible base (0 bytes). Only works for statically compiled binaries like Go.
- **Layer caching**: Docker caches each layer. Put rarely-changing instructions (dependency install) before frequently-changing ones (source code copy). This way, changing source code reuses the cached dependency layer.
- **`.dockerignore`**: Reduces the build context sent to the Docker daemon. Exclude `node_modules`, `.git`, build artifacts, and IDE files.
- **`npm ci --omit=dev`**: Installs only production dependencies. Combined with multi-stage, the final image has no devDependencies.
- **Non-root user**: Run the container as a non-root user (`USER node`, `USER nonroot`) for security.

## Variants

| Base Image | Size | Shell | Use When |
|------------|------|-------|----------|
| scratch | ~0 MB | None | Static binaries (Go, Rust) |
| distroless | ~20-50 MB | None | Minimal attack surface |
| alpine | ~5-10 MB | Yes | General purpose, small |
| slim | ~20-80 MB | Yes | Debian-based, compatibility |
| full | ~300-900 MB | Yes | Development, debugging |

## Guidelines

- Use multi-stage builds for any non-trivial application.
- Choose the smallest base image that works (scratch > distroless > alpine > slim > full).
- Copy dependency files before source code to maximize layer cache hits.
- Use `npm ci` instead of `npm install` for reproducible builds.
- Exclude dev dependencies with `--omit=dev` (npm) or `--no-dev` (pip).
- Add a `.dockerignore` file to reduce build context.
- Run containers as non-root users.
- Strip debug symbols from compiled binaries (`-ldflags="-s -w"` for Go).
- Clean package caches (`npm cache clean --force`, `pip cache purge`).
- Tag images with specific versions, not `latest`.

## Common Mistakes

- Copying the entire build context without `.dockerignore`. This sends `node_modules` and `.git` to the daemon, slowing builds.
- Putting `COPY . .` before dependency installation. Every source change invalidates the dependency cache.
- Using `npm install` instead of `npm ci`. `npm install` can modify `package-lock.json` and produce non-reproducible builds.
- Shipping the full SDK in the runtime image. Use multi-stage to copy only the compiled output.
- Running as root. Containers should run as non-root for security.
- Not stripping debug symbols in Go binaries. `-s -w` removes symbol and debug info, saving megabytes.
- Forgetting to clean package caches. `apt-get`, `pip`, and `npm` all cache files that bloat the image.

## Frequently Asked Questions

### How much can multi-stage builds reduce image size?

A typical Node.js app with devDependencies can go from 900MB to 150MB (83 percent reduction). A Go binary can go from 1.2GB (golang base) to 15MB (scratch base), a 98 percent reduction.

### Can I skip stages during build?

Yes. Use `docker build --target builder` to build only up to a specific stage. Useful for testing the build stage without creating the production image.

### How do I debug a distroless image?

Distroless images have no shell. Use `docker cp` to copy a debugger in, or use a debug variant like `gcr.io/distroless/python3-debian12:debug` which includes a busybox shell.

### Should I use Alpine or slim?

Alpine uses musl libc instead of glibc, which can cause issues with native modules (Python C extensions, Node.js native addons). If you hit compatibility problems, switch to slim (Debian-based).

### Rust Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM rust:1.78 AS builder

WORKDIR /build

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/myapp /usr/local/bin/myapp

USER nobody

EXPOSE 8080

CMD ["myapp"]
```

### BuildKit Cache Mounts

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Mount npm cache as a volume (persists across builds)
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN --mount=type=cache,target=/root/.npm npm run build
```

```dockerfile
# Python pip cache mount
FROM python:3.12-slim AS builder

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
```

```dockerfile
# Go module cache mount
FROM golang:1.22-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o server .
```

### Test Stage for CI

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Test
FROM deps AS test
COPY . .
RUN npm run lint
RUN npm run test:unit

# Stage 3: Build
FROM deps AS builder
COPY . .
RUN npm run build

# Stage 4: Production
FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Run tests only
docker build --target test .

# Build production image (skips test stage if already cached)
docker build --target production -t myapp:latest .
```

### Image Size Analysis

```bash
# Check image size
docker images myapp:latest
# REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
# myapp        latest    abc123         2 minutes ago   148MB

# Analyze layer sizes
docker history myapp:latest --no-trunc --format "{{.Size}}\t{{.CreatedBy}}"

# Compare before/after
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | grep myapp
```

```bash
# Use dive for detailed layer analysis
dive myapp:latest
# Shows each layer, what was added/removed, and potential waste
```

### Multi-Architecture Builds

```dockerfile
# Dockerfile (same for all platforms)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM --platform=$TARGETPLATFORM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myapp:latest \
  --push .
```

## Additional Best Practices


- For a deeper guide, see [Container Image Security Scanning with Trivy](/recipes/container-security-scanning/).

1. **Use `COPY --link` for faster builds.** Copies files as a separate layer without invalidating cache:

```dockerfile
COPY --link package*.json ./
```

2. **Use `HEALTHCHECK` in production images.** Helps orchestrators detect unhealthy containers:

```dockerfile
FROM node:20-alpine AS production
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --spider http://localhost:3000/health || exit 1
```

3. **Pin base image digests for reproducibility.** Tags can be updated, digests are immutable:

```dockerfile
# Pin by digest (most reproducible)
FROM node:20-alpine@sha256:abc123... AS builder
```

## Additional Common Mistakes

1. **Not cleaning apt-get cache in Debian-based images.** Lists files bloat the image:

```dockerfile
# Bad
RUN apt-get update && apt-get install -y curl

# Good
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

2. **Using `ADD` instead of `COPY` for local files.** `ADD` has extra features (URL fetch, tar extraction) that can cause unexpected behavior:

```dockerfile
# Bad (unpredictable with tar files)
ADD ./app.tar.gz /app/

# Good (explicit)
COPY ./app/ /app/
```

3. **Not using `--no-install-recommends` with apt-get.** Installs unnecessary packages:

```dockerfile
# Installs 200+ extra packages
RUN apt-get install -y curl

# Installs only required packages
RUN apt-get install -y --no-install-recommends curl
```

## Additional FAQ

### How do I use BuildKit for faster builds?

Enable BuildKit via environment variable or Docker Desktop settings:

```bash
# Per-build
DOCKER_BUILDKIT=1 docker build -t myapp .

# Or set globally in daemon.json
{
  "features": { "buildkit": true }
}
```

BuildKit parallelizes independent stages and supports cache mounts.

### How do I reduce image pull time in CI?

Use a local registry or cache-from/cache-to:

```bash
# Cache from registry
docker build \
  --cache-from type=registry,ref=myapp:cache \
  --cache-to type=registry,ref=myapp:cache,mode=max \
  -t myapp:latest .
```

### Can I use multi-stage builds with Docker Compose?

Yes. Reference the Dockerfile and use build args:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
  test:
    build:
      context: .
      dockerfile: Dockerfile
      target: test
```

## Performance Tips

1. **Use `--mount=type=cache` for package managers.** Persists cache across builds without bloating the image:

```dockerfile
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y curl
```

2. **Combine RUN commands to reduce layers.** Each RUN creates a layer:

```dockerfile
# Bad: 3 layers
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# Good: 1 layer
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

3. **Use `.dockerignore` aggressively.** Smaller context means faster builds:

```text
# .dockerignore
# Exclude everything by default
*
# Include only what's needed
!package.json
!package-lock.json
!src/
!public/
!tsconfig.json
```
