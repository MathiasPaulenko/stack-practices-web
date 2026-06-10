---
contentType: recipes
slug: docker-basics
title: "Docker Basics"
description: "How to containerize an application, write a Dockerfile, and run containers with Docker Compose."
metaDescription: "Learn Docker fundamentals: write Dockerfiles, build images, run containers, and orchestrate services with Docker Compose."
difficulty: beginner
topics:
  - devops
tags:
  - docker
  - container
  - devops
  - deployment
  - compose
relatedResources:
  - /recipes/git-workflow
  - /recipes/call-rest-api
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Learn Docker fundamentals: write Dockerfiles, build images, run containers, and orchestrate services with Docker Compose."
  keywords:
    - docker
    - container
    - dockerfile
    - docker compose
    - devops
---

## Overview

Docker packages your application and its dependencies into a lightweight, portable container that runs consistently across development, staging, and production. A Dockerfile is a recipe for building that container image, and Docker Compose lets you run multi-container setups with a single command.

This recipe covers the essential Dockerfile instructions, image layering, and a practical Docker Compose example for a web application with a database.

## When to Use

Use this recipe when:

- You want to eliminate "works on my machine" problems
- Setting up a local development environment that mirrors production
- Preparing an application for deployment to Kubernetes, AWS ECS, or similar platforms
- Running integration tests that depend on databases, caches, or message brokers

## Solution

### Dockerfile for a Node.js App

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

### Dockerfile for a Python App

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose (Web + Database)

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

Run: `docker compose up --build`

## Explanation

- **Multi-stage builds** (`AS builder`, `AS runner`) keep production images small by excluding build tools, source maps, and dev dependencies.
- **Layer caching**: Docker caches each instruction layer. Put `COPY package*.json` and `RUN npm ci` before `COPY . .` so that dependency installation is cached unless package files change.
- **Non-root user**: `USER node` (or a custom user) reduces the attack surface if the container is compromised.
- **`.dockerignore`**: create one to exclude `node_modules`, `.git`, and local env files — they bloat the build context and can leak secrets.

## Variants

| Goal | Approach |
|------|----------|
| Smallest image | Use `alpine` or `distroless` base images |
| Fastest build | Order Dockerfile instructions from least to most frequently changed |
| Secret injection | Use BuildKit secrets (`--secret`) or runtime env vars, never `COPY` secrets |
| Health checks | Add `HEALTHCHECK` instruction or Docker Compose `healthcheck` block |

## Best Practices

- **Pin base image tags**: `node:20-alpine` is better than `node:latest` to avoid surprise breaking changes.
- **One process per container**: let Docker manage process lifecycle; use Compose or an orchestrator for multi-process setups.
- **Use volume mounts for dev**: mount source code into the container for hot-reload during development.
- **Scan images**: run `docker scan` or Trivy to detect OS and dependency vulnerabilities in your images.
- **Graceful shutdown**: handle `SIGTERM` in your application so Docker can stop containers cleanly.

## Common Mistakes

- **Giant images**: copying unnecessary files (logs, test data, `.git`) inflates image size and build time.
- **Running as root**: default users in base images are often root. Create and switch to a non-root user.
- **Hardcoding secrets**: baking database passwords into the image makes them visible to anyone who pulls it.
- **Ignoring `.dockerignore`**: without it, `COPY . .` sends your entire repo — including sensitive files — to the Docker daemon.
- **Not handling signals**: apps that ignore `SIGTERM` get killed with `SIGKILL` after a timeout, risking data corruption.

## Frequently Asked Questions

**Q: What is the difference between a Docker image and a container?**
A: An image is a read-only template with your code and dependencies. A container is a running instance of that image. You can run many containers from the same image.

**Q: Should I use Docker Compose in production?**
A: Docker Compose is great for single-host production deployments and local dev. For multi-host, high-availability production workloads, use Kubernetes or a managed container service.

**Q: How do I reduce my Docker image size?**
A: Use multi-stage builds, alpine or distroless base images, and ensure your `.dockerignore` excludes build artifacts and dependency caches.
