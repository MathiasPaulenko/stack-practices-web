---




contentType: recipes
slug: docker-multi-stage-build-distroless
title: "Imágenes de Producción Slim con Multi-Stage Docker"
description: "Cómo construir imágenes Docker de producción minimales usando multi-stage builds con distroless base images, cubriendo Go, Node.js, Python y Java con reducción de tamaño."
metaDescription: "Construye imágenes Docker de producción minimales con multi-stage builds y distroless bases. Reduce tamaño y attack surface para Go, Node.js, Python, Java."
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
  - /recipes/github-actions-reusable-workflows
  - /recipes/docker-compose-override-environments
  - /recipes/kubernetes-helm-chart-templating
  - /recipes/setup-ssl-certificates
  - /recipes/github-actions-matrix-strategy
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye imágenes Docker de producción minimales con multi-stage builds y distroless bases. Reduce tamaño y attack surface para Go, Node.js, Python, Java."
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

Los multi-stage builds te permiten usar múltiples statements `FROM` en un solo Dockerfile. Compilás y buildeás en un full builder stage, luego copiás solo los artifacts a un final stage minimal. Las distroless images llevan esto más lejos — contienen solo tu aplicación y sus runtime dependencies, sin shell, package manager ni OS utilities. El resultado: imágenes 10-100x más chicas, con attack surface minimal, y production-ready.

## When to Use

- Deployments de producción donde el tamaño de imagen importa (pulls más rápidos, menos storage)
- Entornos security-sensitive (distroless no tiene shell para atacantes)
- Pipelines CI/CD donde las build tools no deberían estar en la imagen final
- Cualquier container que corre en Kubernetes o serverless platforms
- Requisitos de compliance que mandatan base images minimales

## When NOT to Use

- Containers de desarrollo — necesitás shell, package manager y debugging tools
- Cuando necesitás hacer exec en containers corriendo para debugging — distroless no tiene shell
- Cuando el tamaño de imagen no importa (herramientas internas, scripts one-off)
- Cuando necesitás OS-level dependencies (glibc, librerías específicas)

## Solution

### Multi-stage build básico (Go)

```dockerfile
# Stage 1: Builder
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Cachear dependencias
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

### Multi-stage build para Node.js

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

### Multi-stage con distroless para Node.js

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

### Multi-stage build para Python

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

### Multi-stage build para Java (Gradle)

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

### Named stages para selective copying

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

### Usar .dockerignore

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

### Distroless con health checks

```dockerfile
FROM gcr.io/distroless/static-debian12

COPY --from=builder /app/server /server

# Distroless no tiene shell — usar binary health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/server", "--healthcheck"]

USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/server"]
```

### Build con BuildKit cache mounts

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

### Distroless con CA certificates

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot

# Si tu app necesita CA certs para HTTPS
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

ENTRYPOINT ["/server"]
```

### Usar Chainguard images

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

### Alpine-based minimal image (alternativa a distroless)

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
# Usar :debug tag para debugging — incluye busybox shell
FROM gcr.io/distroless/static-debian12:debug

COPY --from=builder /app/server /server

USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

## Best Practices


- For a deeper guide, see [Complete Guide to Docker in Production](/es/guides/complete-guide-docker-production/).

- Usa `CGO_ENABLED=0` para Go — produce static binaries que funcionan con distroless/static
- Strippa binaries con `-ldflags="-s -w"` — remueve debug info, reduce tamaño ~30%
- Corré como non-root user — agrega `USER nonroot:nonroot` o creá un user custom
- Usa `.dockerignore` — previene copiar node_modules, .git, etc. al build context
- Pinea versiones de base image — usa `:1.22-alpine` no `:latest`
- Usa BuildKit cache mounts — acelera builds cacheando dependencias
- Copiá dependencias antes que source code — aprovecha Docker layer caching
- Usa `--platform` para multi-arch builds — `docker buildx build --platform linux/amd64,linux/arm64`

## Common Mistakes

- **No usar multi-stage**: las build tools (compilers, npm, go) terminan en la imagen final, inflándola 10-100x.
- **Usar tags `:latest`**: las base images cambian inesperadamente. Pinea a versiones específicas.
- **Correr como root**: distroless soporta user `nonroot`. Siempre especificá `USER nonroot:nonroot`.
- **Copiar todo el build context**: sin `.dockerignore`, Docker envía todo al daemon.
- **No strippar Go binaries**: los flags `-s -w` remueven debug symbols, ahorrando ~30% del binary size.
- **Usar distroless para desarrollo**: no shell significa no `docker exec -it ... sh`. Usá el tag `:debug` para dev.

## FAQ

### ¿Qué es una distroless image?

Una Docker image que contiene solo tu aplicación y sus runtime dependencies. Sin shell, sin package manager, sin OS utilities. Ejemplos: `gcr.io/distroless/static-debian12`, `gcr.io/distroless/nodejs22-debian12`.

### ¿Cuánto más chicas son las multi-stage images?

Típicamente 10-100x más chicas. Una Go app buildeada con `golang:1.22` es ~800MB. Con multi-stage + distroless, es ~10-20MB. Una Node.js app pasa de ~1GB a ~150MB.

### ¿Puedo debuggear un distroless container?

Usá el tag `:debug` (e.g., `gcr.io/distroless/static-debian12:debug`). Incluye un busybox shell. Alternativamente, usá `docker cp` para copiar debugging tools a un container corriendo.

### ¿Cuál es la diferencia entre distroless y Alpine?

Alpine es una Linux distribution minimal (~5MB) con package manager (`apk`) y shell. Distroless no tiene shell ni package manager. Alpine es bueno para uso general; distroless es mejor para producción security-sensitive.

### ¿Cómo agrego CA certificates a distroless?

Usá `gcr.io/distroless/static-debian12:nonroot` que incluye CA certs. O copiálos desde el builder: `COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/`.
