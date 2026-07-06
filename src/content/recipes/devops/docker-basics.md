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
  - devops
  - docker
  - container
  - ci-cd
  - automation
relatedResources:
  - /recipes/git-workflow
  - /recipes/call-rest-api
  - /recipes/environment-variables
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
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

Here is how to the essential Dockerfile instructions, image layering, and a practical Docker Compose example for a web application with a database.

## When to Use

Use this recipe when:

- You want to eliminate "works on my machine" problems. See [Environment Variables](/recipes/devops/environment-variables) for managing container configuration.
- Setting up a local development environment that mirrors production. See [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) for multi-service setups.
- Preparing an application for deployment to Kubernetes, AWS ECS, or similar platforms. See [Serverless Functions](/recipes/messaging/event-driven-microservices) for function-as-a-service deployments.
- Running integration tests that depend on databases, caches, or message brokers. See [Integration Testing](/recipes/testing/integration-testing) for test isolation strategies.

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

## What Works

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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### .dockerignore File

Prevent unnecessary files from entering the build context:

```text
# .dockerignore
node_modules
dist
.git
.gitignore
.env
.env.local
*.log
coverage
.vscode
.idea
Dockerfile
docker-compose*.yml
README.md
```

### Dockerfile for a Java Spring Boot App

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew build.gradle settings.gradle ./
RUN ./gradlew dependencies --no-daemon
COPY src/ src/
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
USER 1000:1000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### Dockerfile with Health Check

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

### Essential Docker Commands

```bash
# Build an image
$ docker build -t myapp:latest .

# Build with a specific platform
$ docker build --platform linux/amd64 -t myapp:latest .

# Run a container
$ docker run -d --name web -p 3000:3000 myapp:latest

# Run with environment variables
$ docker run -d --name web -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@db:5432/mydb \
  -e NODE_ENV=production \
  myapp:latest

# Run with a volume mount
$ docker run -d --name web -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  myapp:latest

# List running containers
$ docker ps

# List all containers (including stopped)
$ docker ps -a

# View container logs
$ docker logs -f web

# Execute a command inside a running container
$ docker exec -it web sh

# Stop and remove a container
$ docker stop web
$ docker rm web

# Remove an image
$ docker rmi myapp:latest

# Prune unused images, containers, and networks
$ docker system prune -a

# Show disk usage
$ docker system df
```

### Docker Networking

```bash
# Create a custom network
$ docker network create mynet

# Run containers on the same network
$ docker run -d --name db --network mynet postgres:16-alpine
$ docker run -d --name app --network mynet -p 3000:3000 myapp:latest

# Containers can reach each other by name
# app can connect to db via: postgres://user:pass@db:5432/mydb
```

```yaml
# docker-compose.yml with custom network
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    networks:
      - frontend
      - backend

  db:
    image: postgres:16-alpine
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

### Docker Volumes for Persistent Data

```bash
# Create a named volume
$ docker volume create pgdata

# Inspect a volume
$ docker volume inspect pgdata

# Remove unused volumes
$ docker volume prune
```

```yaml
# docker-compose.yml with volumes
version: "3.9"
services:
  app:
    build: .
    volumes:
      - ./src:/app/src          # Bind mount for dev
      - app-data:/app/data      # Named volume for persistent data

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
  app-data:
```

### Debugging Containers

```bash
# Inspect a container's configuration
$ docker inspect web

# View resource usage
$ docker stats web

# View processes inside a container
$ docker top web

# Copy files from a container to host
$ docker cp web:/app/logs ./logs

# Export a container's filesystem
$ docker export web | gzip > web.tar.gz

# View container filesystem changes
$ docker diff web

# Commit a container's changes to a new image
$ docker commit web myapp:debugged
```

### Multi-Stage Build with Distroless

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["dist/main.js"]
```

Distroless images have no shell, package manager, or unnecessary tools — reducing attack surface and image size.

### Docker BuildKit Secrets

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app

# Mount npm token as a secret, not persisted in the image
RUN --mount=type=secret,id=npm_token \
  NPM_TOKEN=$(cat /run/secrets/npm_token) \
  npm ci
```

```bash
# Build with secrets
$ docker build --secret id=npm_token,src=$HOME/.npmrc -t myapp:latest .
```

## Additional Best Practices

6. **Label your images.** Add metadata for traceability:

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.version="1.2.0"
LABEL org.opencontainers.image.revision="${GIT_SHA}"
```

7. **Use `dumb-init` or `tini` for signal handling.** PID 1 in containers doesn't handle signals properly by default:

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

8. **Pin dependency versions.** In `requirements.txt` or `package.json`, pin exact versions for reproducible builds:

```text
# requirements.txt
fastapi==0.111.0
uvicorn==0.30.1
pydantic==2.7.4
```

9. **Use `docker compose profiles`.** Run different service sets for dev vs test:

```yaml
version: "3.9"
services:
  app:
    build: .
    profiles: ["dev", "test"]

  db:
    image: postgres:16-alpine
    profiles: ["dev", "prod"]

  test-runner:
    build: ./test
    profiles: ["test"]
```

```bash
$ docker compose --profile dev up
$ docker compose --profile test up
```

## Additional Common Mistakes

6. **Storing data in the container's writable layer.** The writable layer is lost when the container is removed. Use volumes for anything that needs to persist.

7. **Not setting `restart` policies.** Containers crash and stay down without a restart policy:

```yaml
services:
  app:
    build: .
    restart: unless-stopped  # or: always, on-failure:3
```

8. **Building images as root without `USER` instruction.** Many base images default to root. Always switch:

```dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
```

9. **Using `latest` tag in production.** `latest` is mutable — the image you pull today may differ from yesterday. Pin to specific versions: `myapp:1.2.0`.

10. **Not cleaning up Docker resources.** Old images and volumes accumulate:

```bash
# Clean up everything not currently in use
$ docker system prune -a --volumes
```

## Additional FAQ

### How do I pass build arguments to a Dockerfile?

Use `ARG` and `--build-arg`:

```dockerfile
FROM node:20-alpine
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
```

```bash
$ docker build --build-arg NODE_ENV=staging -t myapp:staging .
```

### How do I use Docker in CI/CD?

Use Docker layer caching to speed up builds. In GitHub Actions:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: myorg/myapp:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### What is the difference between `CMD` and `ENTRYPOINT`?

`CMD` sets the default command, which can be overridden by `docker run`. `ENTRYPOINT` sets the executable that always runs; `CMD` becomes arguments to it. Use both for flexible containers:

```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]
# docker run myapp → node server.js
# docker run myapp worker.js → node worker.js
```

## Performance Tips

1. **Use BuildKit for faster builds.** Enable it with `DOCKER_BUILDKIT=1` or `docker buildx`:

```bash
$ DOCKER_BUILDKIT=1 docker build -t myapp:latest .
```

2. **Order Dockerfile layers from least to most changing.** Dependencies change rarely; source code changes often:

```dockerfile
# Good: deps first, code last
COPY package*.json ./
RUN npm ci
COPY . .
```

3. **Use `--target` for partial builds.** Build only the stage you need:

```bash
$ docker build --target builder -t myapp:builder .
```

4. **Use `docker compose up --build` in dev.** Rebuilds only changed layers:

```bash
$ docker compose up --build --watch  # Rebuild on file changes (Compose v2.22+)
```

5. **Use `docker save` and `docker load` for offline transfer.** Move images between machines without a registry:

```bash
$ docker save myapp:latest | gzip > myapp.tar.gz
$ docker load < myapp.tar.gz
```
