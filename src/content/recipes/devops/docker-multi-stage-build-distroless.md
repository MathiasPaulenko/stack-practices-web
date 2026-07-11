---
contentType: recipes
slug: docker-multi-stage-build-distroless
title: "Slim Production Images with Multi-Stage Docker Builds"
description: "How to build minimal production Docker images using multi-stage builds with distroless base images, covering Go, Node.js, Python, and Java examples with image size reduction."
metaDescription: "Build minimal production Docker images with multi-stage builds and distroless bases. Reduce image size and attack surface for Go, Node.js, Python, Java."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - docker
  - multi-stage
  - distroless
  - security
  - optimization
  - recipe
relatedResources:
  - /recipes/devops/github-actions-reusable-workflows
  - /recipes/devops/docker-compose-override-environments
  - /recipes/devops/kubernetes-helm-chart-templating
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build minimal production Docker images with multi-stage builds and distroless bases. Reduce image size and attack surface for Go, Node.js, Python, Java."
  keywords:
    - devops
    - docker
    - multi-stage
    - distroless
    - security
    - optimization
    - recipe
---

## Overview

Multi-stage builds let you use multiple `FROM` statements in a single Dockerfile. You compile and build in a full builder stage, then copy only the artifacts to a minimal final stage. Distroless images take this further — they contain only your application and its runtime dependencies, with no shell, package manager, or OS utilities. The result: images that are 10-100x smaller, have a minimal attack surface, and are production-ready.

## When to Use

- Production deployments where image size matters (faster pulls, less storage)
- Security-sensitive environments (distroless has no shell for attackers)
- CI/CD pipelines where build tools shouldn't be in the final image
- Any container that runs in Kubernetes or serverless platforms
- Compliance requirements that mandate minimal base images

## When NOT to Use

- Development containers — you need a shell, package manager, and debugging tools
- When you need to exec into running containers for debugging — distroless has no shell
- When the image size doesn't matter (internal tools, one-off scripts)
- When you need OS-level dependencies (glibc, specific libraries)

## Solution

### Basic multi-stage build (Go)

```dockerfile
# Stage 1: Builder
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# Stage 2: Distroless final
FROM gcr.io/distroless/static-debian12

COPY --from=builder /app/server /server

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/server"]
```

### Multi-stage build for Node.js

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Multi-stage with distroless for Node.js

```dockerfile
# Stage 1: Build
FROM node:22 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Distroless
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER nonroot:nonroot

EXPOSE 3000

CMD ["dist/index.js"]
```

### Multi-stage build for Python

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .
RUN uv run build

# Stage 2: Production
FROM python:3.12-slim AS production

WORKDIR /app

COPY --from=builder /app/.venv ./.venv
COPY --from=builder /app/dist ./dist

ENV PATH="/app/.venv/bin:$PATH"

RUN useradd -m appuser
USER appuser

EXPOSE 8000

CMD ["python", "-m", "myapp"]
```

### Multi-stage build for Java (Gradle)

```dockerfile
# Stage 1: Build
FROM gradle:8-jdk21 AS builder

WORKDIR /app

COPY settings.gradle build.gradle ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon

COPY src ./src
RUN gradle bootJar --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/build/libs/*.jar /app/app.jar

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### Named stages for selective copying

```dockerfile
# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Test
FROM node:22-alpine AS tester
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run test

# Stage 4: Production
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Using .dockerignore

```text
# .dockerignore
node_modules
dist
.git
*.md
.env*
coverage
.vscode
.idea
```

### Distroless with health checks

```dockerfile
FROM gcr.io/distroless/static-debian12

COPY --from=builder /app/server /server

# Distroless has no shell — use binary health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/server", "--healthcheck"]

USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/server"]
```

### Build with BuildKit cache mounts

```dockerfile
# syntax=docker/dockerfile:1.7

FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

## Variants

### Distroless with CA certificates

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot

# If your app needs CA certs for HTTPS
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

ENTRYPOINT ["/server"]
```

### Using Chainguard images

```dockerfile
# Chainguard — minimal, no shell, daily patched
FROM cgr.dev/chainguard/go:latest AS builder

WORKDIR /app
COPY . .
RUN go build -o /server ./cmd/server

FROM cgr.dev/chainguard/static:latest

COPY --from=builder /server /server
USER nonroot
ENTRYPOINT ["/server"]
```

### Alpine-based minimal image (alternative to distroless)

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.20

RUN apk --no-cache add ca-certificates && \
    adduser -D -h /app appuser

COPY --from=builder /server /app/server

USER appuser
WORKDIR /app
ENTRYPOINT ["/server"]
```

### Debug distroless image

```dockerfile
# Use :debug tag for debugging — includes busybox shell
FROM gcr.io/distroless/static-debian12:debug

COPY --from=builder /app/server /server

USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

## Best Practices

- Use `CGO_ENABLED=0` for Go — produces static binaries that work with distroless/static
- Strip binaries with `-ldflags="-s -w"` — removes debug info, reduces size by ~30%
- Run as non-root user — add `USER nonroot:nonroot` or create a custom user
- Use `.dockerignore` — prevents copying node_modules, .git, etc. into the build context
- Pin base image versions — use `:1.22-alpine` not `:latest`
- Use BuildKit cache mounts — speeds up builds by caching dependencies
- Copy dependencies before source code — takes advantage of Docker layer caching
- Use `--platform` for multi-arch builds — `docker buildx build --platform linux/amd64,linux/arm64`

## Common Mistakes

- **Not using multi-stage**: build tools (compilers, npm, go) end up in the final image, bloating it 10-100x.
- **Using `:latest` tags**: base images change unexpectedly. Pin to specific versions.
- **Running as root**: distroless supports `nonroot` user. Always specify `USER nonroot:nonroot`.
- **Copying entire build context**: without `.dockerignore`, Docker sends everything to the daemon.
- **Not stripping Go binaries**: `-s -w` flags remove debug symbols, saving ~30% of binary size.
- **Using distroless for development**: no shell means no `docker exec -it ... sh`. Use `:debug` tag for dev.

## FAQ

### What is a distroless image?

A Docker image that contains only your application and its runtime dependencies. No shell, no package manager, no OS utilities. Examples: `gcr.io/distroless/static-debian12`, `gcr.io/distroless/nodejs22-debian12`.

### How much smaller are multi-stage images?

Typically 10-100x smaller. A Go app built with `golang:1.22` is ~800MB. With multi-stage + distroless, it's ~10-20MB. A Node.js app goes from ~1GB to ~150MB.

### Can I debug a distroless container?

Use the `:debug` tag (e.g., `gcr.io/distroless/static-debian12:debug`). It includes a busybox shell. Alternatively, use `docker cp` to copy debugging tools into a running container.

### What is the difference between distroless and Alpine?

Alpine is a minimal Linux distribution (~5MB) with a package manager (`apk`) and shell. Distroless has no shell or package manager. Alpine is good for general use; distroless is best for security-sensitive production.

### How do I add CA certificates to distroless?

Use `gcr.io/distroless/static-debian12:nonroot` which includes CA certs. Or copy them from the builder: `COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/`.
