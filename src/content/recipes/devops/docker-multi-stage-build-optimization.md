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
- **Distroless images**: Google's distroless images have no shell, package manager, or extra binaries. They reduce size and attack surface significantly.
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
