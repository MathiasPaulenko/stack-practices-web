---





contentType: guides
slug: complete-guide-docker-compose-local-dev
title: "Docker Compose: Multi-Service Local Development"
description: "Master Docker Compose for local development: multi-service environments, networking, volumes, profiles, overrides, hot reload, debugging, and production-like setups."
metaDescription: "Master Docker Compose for local development: multi-service environments, networking, volumes, profiles, overrides, hot reload, debugging, and production-like setups."
difficulty: intermediate
topics:
  - devops
tags:
  - guide
  - docker
  - docker-compose
  - local-development
  - containers
  - dev-environment
relatedResources:
  - /guides/complete-guide-github-actions-ci-cd
  - /guides/complete-guide-helm-charts-production
  - /guides/complete-guide-docker-production
  - /guides/docker-for-developers-guide
  - /guides/kubernetes-basics-guide
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master Docker Compose for local development: multi-service environments, networking, volumes, profiles, overrides, hot reload, debugging, and production-like setups."
  keywords:
    - docker compose
    - local development
    - multi-service
    - docker networking
    - docker volumes
    - docker profiles
    - dev environment





---

## Introduction

Docker Compose defines and runs multi-container applications locally. You describe services, networks, and volumes in a YAML file, then start everything with one command. This guide walks through service definitions, networking, volumes, profiles, override files, hot reload setups, debugging, and production-like local environments.

## Basic docker-compose.yml

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules  # Anonymous volume prevents host override
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  db-data:
  redis-data:
```

## Networking

```yaml
# Default network: all services join a default network named after the project
# Services reach each other by service name as hostname

services:
  app:
    # app reaches db at: postgresql://db:5432
    # app reaches redis at: redis://redis:6379
    networks:
      - default

  db:
    networks:
      - default

  # Custom networks for isolation
  frontend:
    image: nginx:alpine
    networks:
      - frontend-net

  backend:
    image: my-backend
    networks:
      - frontend-net  # Can reach frontend
      - backend-net   # Can reach db

  db:
    image: postgres:16
    networks:
      - backend-net   # Only backend can reach db

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
    internal: true  # No external access (isolated)
```

## Volumes

```yaml
services:
  app:
    volumes:
      # Bind mount: host directory → container (hot reload)
      - .:/app
      - ./config:/app/config:ro  # Read-only mount

      # Anonymous volume: prevents host override of specific path
      - /app/node_modules

      # Named volume: persistent data managed by Docker
      - app-cache:/app/.cache

  db:
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
      # init-scripts run on first start only (when db-data is empty)

volumes:
  db-data:
    driver: local
  app-cache:
```

## Override Files

```yaml
# docker-compose.yml — Base configuration (shared across environments)
version: "3.9"
services:
  app:
    build: .
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
```

```yaml
# docker-compose.override.yml — Local dev overrides (auto-loaded)
# Docker Compose automatically merges: docker-compose.yml + docker-compose.override.yml
version: "3.9"
services:
  app:
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    environment:
      - NODE_ENV=development
      - DEBUG=app:*
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debugger
```

```yaml
# docker-compose.prod.yml — Production-like config (explicit -f flag)
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up
version: "3.9"
services:
  app:
    volumes: []  # Remove bind mounts
    command: node server.js
    environment:
      - NODE_ENV=production
    ports:
      - "80:3000"
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

## Profiles

```yaml
# Profiles let you start specific groups of services
# docker compose --profile debug up
# docker compose --profile monitoring up

version: "3.9"
services:
  app:
    # No profile — always starts
    build: .

  db:
    # No profile — always starts
    image: postgres:16

  mailhog:
    # Only starts with --profile debug
    image: mailhog/mailhog
    profiles: [debug]
    ports:
      - "1025:1025"
      - "8025:8025"

  prometheus:
    image: prom/prometheus
    profiles: [monitoring]
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    profiles: [monitoring]
    ports:
      - "3001:3000"
```

## Hot Reload Setup

### Node.js with nodemon

```yaml
services:
  app:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
    command: npx nodemon --watch src --ext ts,json --exec "node --import tsx src/index.ts"
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
```

### Python with uvicorn auto-reload

```yaml
services:
  api:
    build: .
    volumes:
      - .:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/src
    environment:
      - PYTHONUNBUFFERED=1
    ports:
      - "8000:8000"
```

### Java with Spring Boot DevTools

```yaml
services:
  app:
    build: .
    volumes:
      - ./target:/app/target
    command: java -jar -Dspring.devtools.restart.enabled=true target/app.jar
    environment:
      - SPRING_DEVTOOLS_RESTART_TRIGGER_FILE=/app/target/.trigger
    ports:
      - "8080:8080"
```

## Multi-Service Full Stack Application

```yaml
version: "3.9"
services:
  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev -- --host 0.0.0.0
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000/api
    depends_on:
      - backend

  backend:
    build: ./backend
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  worker:
    build: ./backend
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run worker
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./db-init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
    depends_on:
      - frontend
      - backend

volumes:
  db-data:
  redis-data:
```

## Debugging

### Node.js debugging

```yaml
services:
  app:
    command: node --inspect=0.0.0.0:9229 src/index.js
    ports:
      - "3000:3000"
      - "9229:9229"  # Debugger port
```

### Python debugging with debugpy

```yaml
services:
  api:
    command: python -m debugpy --listen 0.0.0.0:5678 --wait-for-client src/main.py
    ports:
      - "8000:8000"
      - "5678:5678"
```

### Java remote debugging

```yaml
services:
  app:
    command: java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 -jar app.jar
    ports:
      - "8080:8080"
      - "5005:5005"
```

## Useful Commands

```bash
# Start all services (foreground)
docker compose up

# Start in background (detached)
docker compose up -d

# Start specific services
docker compose up app db

# Start with profiles
docker compose --profile monitoring up

# Rebuild and start
docker compose up --build

# View logs
docker compose logs -f
docker compose logs -f app
docker compose logs --tail=100 app

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes
docker compose down -v

# Stop and remove containers + volumes + images
docker compose down -v --rmi all

# Run a one-off command
docker compose exec app npm run migrate
docker compose run --rm app npm run test

# Restart a single service
docker compose restart app

# View running services
docker compose ps

# View resource usage
docker compose stats
```

## Best Practices


- For a deeper guide, see [Complete Guide to Docker in Production](/guides/complete-guide-docker-production/).

- Use bind mounts for source code in dev — enables hot reload without rebuilds
- Use anonymous volumes for `node_modules`, `.venv` — prevents host OS from overriding container packages
- Use `depends_on` with `condition: service_healthy` — ensures DB is ready before app starts
- Use override files for environment-specific config — base file + override auto-merged
- Use profiles for optional services — monitoring, mail catcher, debug tools
- Set `restart: unless-stopped` for dev databases — survives machine reboots
- Use `.dockerignore` — prevents copying `node_modules`, `.git`, build artifacts into images
- Pin image versions — `postgres:16-alpine` not `postgres:latest`
- Use healthchecks on databases — app waits for readiness instead of failing on connection
- Use named volumes for persistent data — survives `docker compose down` (use `-v` to remove)
- Keep `docker-compose.yml` in version control — reproducible environments for the whole team

## Common Mistakes

- **No anonymous volume for `node_modules`**: bind mount overwrites container-installed packages with host's (or empty) directory.
- **Using `depends_on` without healthcheck**: app starts before DB is ready, connection fails on boot.
- **No `.dockerignore`**: build context includes `node_modules`, `.git`, large files — slow builds and bloated images.
- **Using `latest` tag**: images change unexpectedly between pulls. Pin to specific versions.
- **No volume for database data**: `docker compose down` destroys all data. Use named volumes.
- **Exposing all ports to host**: only expose ports you need to access from the host. Internal services communicate via Docker network.

## FAQ

### What is the difference between bind mounts and named volumes?

Bind mounts map a host directory to a container path. They enable hot reload but tie the container to the host filesystem. Named volumes are managed by Docker and persist independently of the container. Use bind mounts for source code, named volumes for database data.

### How does docker-compose.override.yml work?

Docker Compose automatically merges `docker-compose.yml` with `docker-compose.override.yml` if it exists. The override file adds or replaces settings from the base file. Use it for local dev settings. For production, use explicit `-f` flags: `docker compose -f docker-compose.yml -f docker-compose.prod.yml`.

### What are Docker Compose profiles?

Labels that group services. Services without a profile always start. Services with a profile only start when you pass `--profile <name>`. Useful for optional services like monitoring, debug tools, or mail catchers.

### How do I run database migrations?

Use `docker compose exec` to run a one-off command in a running container: `docker compose exec app npm run migrate`. Or use `docker compose run` for a new container: `docker compose run --rm app npm run migrate`.

### How do I reset my local environment?

`docker compose down -v` stops and removes containers and volumes. This wipes all data. To keep data, use `docker compose down` without `-v`. To rebuild from scratch: `docker compose build --no-cache && docker compose up`.
