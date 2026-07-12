---
contentType: guides
slug: docker-for-developers-guide
title: "Docker for Developers — A Complete Guide"
description: "Learn Docker from the ground up: images, containers, Dockerfiles, networks, volumes, and Docker Compose for local development."
metaDescription: "Complete Docker guide for developers. Learn images, containers, Dockerfiles, networking, volumes, and Docker Compose for local dev workflows."
difficulty: beginner
topics:
  - devops
tags:
  - containers
  - devops
  - docker
  - guide
  - ci-cd
relatedResources:
  - /guides/devops/cicd-pipeline-guide
  - /guides/devops/kubernetes-basics-guide
  - /recipes/devops/generate-sitemaps
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Complete Docker guide for developers. Learn images, containers, Dockerfiles, networking, volumes, and Docker Compose for local dev workflows."
  keywords:
    - docker for developers
    - docker containers
    - dockerfile tutorial
    - docker compose
    - docker networking
    - docker volumes
---

# Docker for Developers

## Introduction

Docker is a platform for developing, shipping, and running applications in containers. Containers are lightweight, portable, and consistent across environments, solving the "it works on my machine" problem.

## Key Concepts

### Images

A Docker image is a read-only template containing the application code, runtime, libraries, and dependencies. Images are built from a `Dockerfile`.

### Containers

A container is a runnable instance of an image. It is isolated from the host system and other containers, but can share the OS kernel.

### Dockerfile

A text file with instructions to build an image. Each instruction creates a layer in the image.

## Dockerfile — What Works

```dockerfile
# Use a specific version, not 'latest'
FROM node:20-alpine

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

# Copy dependency files first for layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Change ownership
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

### What Works

- **Use specific image tags** — `node:20-alpine` instead of `node:latest`
- **Run as non-root user** — security best practice
- **Order instructions by change frequency** — put `COPY package.json` before `COPY .` to cache dependencies
- **Combine RUN commands** where possible to reduce layers
- **Use `.dockerignore`** to avoid sending unnecessary files to the build context

## Essential Commands

```bash
# Build an image
docker build -t myapp:1.0 .

# Run a container
docker run -d -p 3000:3000 --name myapp myapp:1.0

# List running containers
docker ps

# Stop and remove a container
docker stop myapp && docker rm myapp

# Execute a command inside a running container
docker exec -it myapp sh

# View logs
docker logs -f myapp

# Remove unused images and volumes
docker system prune -a --volumes
```

## Networking

Docker provides several network drivers:

| Driver | Use Case |
|--------|----------|
| **bridge** | Default. Isolated network for containers on a single host |
| **host** | Shares the host's network stack (no isolation) |
| **none** | Disables all networking |
| **overlay** | Connects containers across multiple Docker hosts (Swarm) |

```bash
# Create a custom bridge network
docker network create my-network

# Run containers on the same network
docker run -d --name db --network my-network postgres:15
docker run -d --name api --network my-network myapp:1.0
```

## Volumes

Volumes persist data outside the container filesystem:

```bash
# Named volume
docker volume create my-data
docker run -v my-data:/data myapp:1.0

# Bind mount (development)
docker run -v $(pwd):/app -v /app/node_modules myapp:1.0
```

| Type | Use Case |
|------|----------|
| **Named volume** | Persistent data (databases, uploads) |
| **Bind mount** | Live code reloading during development |
| **tmpfs** | Ephemeral, in-memory data |

## Docker Compose

`docker-compose.yml` defines and runs multi-container applications:

```yaml
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=db
    depends_on:
      - db
    volumes:
      - ./api:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Rebuild after Dockerfile changes
docker-compose up -d --build

# Stop and remove everything
docker-compose down -v
```

## Multi-Stage Builds

Reduce final image size by separating build and runtime stages:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

## Common Mistakes

- Running containers as root unnecessarily
- Storing secrets in environment variables or image layers. See [container security](/recipes/security/container-security).
- Not handling signals properly (PID 1 problem) — use `tini` or `dumb-init`
- Building production images with devDependencies included. See [immutable infrastructure](/recipes/devops/immutable-infrastructure).
- Ignoring `.dockerignore`, bloating the build context
- Hardcoding configuration in images instead of using env vars

## Frequently Asked Questions

**Q: What is the difference between a VM and a container?**
A: VMs virtualize hardware and include a full OS. Containers virtualize the OS kernel and share it with the host, making them much lighter and faster to start.

**Q: How do I debug a failing container?**
A: Use `docker logs <container>` for stdout/stderr, `docker exec -it <container> sh` to inspect the filesystem, and `docker inspect <container>` for detailed configuration.

**Q: Should I use Docker Swarm or Kubernetes?**
A: For most new projects, use Kubernetes (or a managed service like EKS, GKE, AKS). See [orchestration](/recipes/serverless/serverless-orchestration). Docker Swarm is simpler but has limited ecosystem support and is no longer actively developed by Docker Inc.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Optimized Dockerfile for Node.js

```dockerfile
# Multi-stage build: reduce final image from 900MB to 80MB
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
# Install dev deps only for build
RUN npm ci
COPY . .
RUN npm run build

# Final stage: only production files
FROM node:20-slim AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
# Non-root user for security
RUN groupadd -r app && useradd -r -g app appuser
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]

# docker-compose.yml for development
```yaml
version: "3.9"
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/app
      REDIS_URL: redis://cache:6379
    depends_on: [db, cache]
    volumes:
      - ./src:/app/src  # Hot reload in development
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  cache:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  pgdata:
```

Optimizations:
  | Technique | Before | After |
  |-----------|--------|-------|
  | Multi-stage | 900MB | 80MB |
  | Alpine/slim | 900MB | 180MB |
  | npm ci | 60s | 20s |
  | Layer cache (copy package first) | Reinstalls all | Cache hit |
  | Non-root user | Root | appuser |
  | Healthcheck | No check | Auto-restart |

Lessons:
  - Multi-stage build reduces size dramatically
  - Copy package.json before code uses layer cache
  - Non-root user is mandatory in production
  - Healthcheck enables auto-restart in orchestrators
  - docker-compose for dev, Dockerfile for prod
```

### How do I debug a container in production?

Use `docker exec -it <container> sh` to enter the container. If it has no shell (distroless), use `docker logs <container>` and `docker inspect`. For network debugging, use `docker run --rm --network container:<id> nicolaka/netshoot`. To see processes: `docker top <container>`. To see resource usage: `docker stats`.
