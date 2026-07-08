---
contentType: recipes
slug: docker-compose-dev-prod-split
title: "Docker Compose Dev/Prod Split: Separate Environments"
description: "Separate development and production Docker Compose configs with overrides"
metaDescription: "Split Docker Compose configs for dev and prod using override files, profiles, and environment variables. Learn multi-environment container setup."
difficulty: intermediate
topics:
  - devops
tags:
  - docker
  - docker-compose
  - dev-prod-split
  - environment
  - configuration
  - devops
relatedResources:
  - /recipes/docker-multi-stage-build-optimization
  - /recipes/docker-health-check-configuration
  - /guides/terraform-best-practices-guide
  - /docs/deployment-checklist-template
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Split Docker Compose configs for dev and prod using override files, profiles, and environment variables. Learn multi-environment container setup."
  keywords:
    - docker compose dev prod
    - docker compose override
    - docker compose profiles
    - separate environments docker
    - docker compose multi environment
    - docker compose production config
---

## Overview

Docker Compose supports multiple files and override patterns to separate development and production configurations. The following demonstrates how to use a base file, a dev override, and a prod override so you can run the same app with different settings (hot reload, debug ports, TLS, resource limits) without duplicating service definitions.

## When to Use

- You need different configs for dev (hot reload, debug) and prod (TLS, resource limits)
- You want to avoid maintaining separate compose files with duplicated services
- You use Docker Compose in CI/CD and need environment-specific overrides
- You want sensible defaults with the ability to override per environment

## Solution

### Base compose file

```yaml
# docker-compose.yml (base — shared by dev and prod)
services:
    api:
        build:
            context: .
            dockerfile: Dockerfile
        environment:
            - NODE_ENV=${NODE_ENV:-development}
            - DATABASE_URL=postgres://app:app@db:5432/app
        depends_on:
            db:
                condition: service_healthy
        ports:
            - "${API_PORT:-3000}:3000"

    db:
        image: postgres:16-alpine
        environment:
            POSTGRES_USER: app
            POSTGRES_PASSWORD: app
            POSTGRES_DB: app
        volumes:
            - db-data:/var/lib/postgresql/data
        healthcheck:
            test: ["CMD", "pg_isready", "-U", "app"]
            interval: 10s
            timeout: 5s
            retries: 5

volumes:
    db-data:
```

### Dev override

```yaml
# docker-compose.dev.yml
services:
    api:
        build:
            target: builder
        environment:
            - NODE_ENV=development
            - DEBUG=app:*
        volumes:
            - .:/app
            - /app/node_modules
        command: npm run dev
        ports:
            - "3000:3000"
            - "9229:9229"  # Node.js debugger

    db:
        ports:
            - "5432:5432"
        volumes:
            - db-data-dev:/var/lib/postgresql/data

volumes:
    db-data-dev:
```

### Prod override

```yaml
# docker-compose.prod.yml
services:
    api:
        build:
            target: production
        environment:
            - NODE_ENV=production
        deploy:
            replicas: 3
            resources:
                limits:
                    cpus: "1.0"
                    memory: 512M
                reservations:
                    cpus: "0.5"
                    memory: 256M
            restart_policy:
                condition: on-failure
                max_attempts: 3
        ports:
            - "80:3000"
        healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
            interval: 30s
            timeout: 5s
            retries: 3
            start_period: 10s

    db:
        environment:
            POSTGRES_PASSWORD: ${DB_PASSWORD}
        volumes:
            - db-data:/var/lib/postgresql/data
        deploy:
            resources:
                limits:
                    cpus: "2.0"
                    memory: 1G
```

### Running dev and prod

```bash
# Development (hot reload + debugger)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production (optimized + resource limits)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Using COMPOSE_FILE env var (no -f flags needed)
export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
docker compose up
```

### Compose profiles for optional services

```yaml
# docker-compose.yml
services:
    api:
        build: .
        ports:
            - "3000:3000"

    db:
        image: postgres:16-alpine
        profiles: ["dev", "prod"]

    redis:
        image: redis:7-alpine
        profiles: ["prod"]

    mailhog:
        image: mailhog/mailhog
        profiles: ["dev"]
        ports:
            - "8025:8025"
```

```bash
# Start only api (no profile services)
docker compose up

# Start with dev profile (api + db + mailhog)
docker compose --profile dev up

# Start with prod profile (api + db + redis)
docker compose --profile prod up
```

### .env file for environment variables

```bash
# .env.dev
NODE_ENV=development
API_PORT=3000
DB_PASSWORD=devpassword

# .env.prod
NODE_ENV=production
API_PORT=80
DB_PASSWORD=strong_prod_password
```

```bash
# Use specific env file
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Explanation

Docker Compose merges multiple files in order. Later files override earlier ones. The base file defines shared services, and override files add or modify settings specific to each environment.

Merge rules:

- **Scalars**: Later values replace earlier ones (e.g., `NODE_ENV=production` overrides `NODE_ENV=development`).
- **Lists**: Later lists replace earlier lists entirely (no merging of list items).
- **Maps**: Merged key-by-key (e.g., adding a new environment variable keeps existing ones).
- **Volumes**: New volumes are added, not replaced.

The `-f` flag specifies files in merge order. `COMPOSE_FILE` env var does the same without flags. Use `--env-file` to load environment-specific variables.

Profiles let you include optional services only when needed. Services without a profile always start. Services with a profile only start when `--profile <name>` is passed.

## Variants

| Pattern | Files | Use When |
|---------|-------|----------|
| Base + override | 3 files (base, dev, prod) | Standard dev/prod split |
| Profiles | 1 file with profiles | Optional services per env |
| Multiple .env | env files per env | Secret management without compose changes |
| COMPOSE_FILE | env var | Avoid typing -f flags |

## Guidelines

- Keep shared service definitions in the base file. Only override what differs.
- Use `target` in the build section to select multi-stage build targets per environment.
- Mount source code as volumes in dev for hot reload. Never do this in prod.
- Set resource limits and restart policies only in prod.
- Expose debug ports (9229 for Node.js, 5005 for Java) only in dev.
- Use `--env-file` to separate secrets per environment.
- Use profiles for optional services (MailHog in dev, Redis in prod).
- Name override files clearly: `docker-compose.dev.yml`, `docker-compose.prod.yml`.
- Use `COMPOSE_FILE` env var in CI/CD to avoid long -f flags.

## Common Mistakes

- Duplicating all services in dev and prod files instead of overriding only differences.
- Mounting source code in prod. This couples the container to the host filesystem and breaks reproducibility.
- Not setting resource limits in prod. A single container can consume all host resources.
- Exposing debug ports in prod. This is a security risk.
- Using the same database password for dev and prod. Prod secrets must come from env files or secret managers.
- Forgetting that lists are replaced, not merged. Adding a port in the override removes all base ports.
- Not using `depends_on` with `condition: service_healthy` for startup ordering.

## Frequently Asked Questions

### How does Docker Compose merge multiple files?

Files are merged in the order they appear on the command line. For maps (environment, labels), keys are merged. For lists (ports, volumes), the later file's list replaces the earlier one entirely. Scalars are replaced.

### Can I use Docker Compose for production?

Yes, but only for small deployments. For production at scale, use Docker Swarm or Kubernetes. Compose is fine for single-host deployments, prototyping, and CI/CD.

### How do I view the merged configuration?

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

This outputs the final merged configuration, useful for debugging overrides.

### What is the difference between profiles and overrides?

Profiles control which services start. Overrides control how services are configured. Use profiles for optional services (Redis, MailHog) and overrides for environment-specific settings (resource limits, env vars).

### Staging Override

```yaml
# docker-compose.staging.yml
services:
  api:
    build:
      target: production
    environment:
      - NODE_ENV=staging
      - SENTRY_DSN=${SENTRY_DSN}
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
      restart_policy:
        condition: on-failure
        max_attempts: 3
    ports:
      - "8080:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  db:
    environment:
      POSTGRES_PASSWORD: ${STAGING_DB_PASSWORD}
    volumes:
      - db-data-staging:/var/lib/postgresql/data

volumes:
  db-data-staging:
```

```bash
# Run staging
docker compose --env-file .env.staging \
    -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### CI/CD Integration with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and deploy
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            ENV=prod
          else
            ENV=staging
          fi

          docker compose --env-file .env.${ENV} \
            -f docker-compose.yml -f docker-compose.${ENV}.yml \
            up -d --build

      - name: Verify health
        run: |
          sleep 15
          docker compose -f docker-compose.yml -f docker-compose.${ENV}.yml ps
          curl -f http://localhost:3000/health
```

### Makefile for Environment Management

```makefile
# Makefile — Simplify docker compose commands
.PHONY: dev prod staging down logs ps

dev:
	docker compose --env-file .env.dev \
		-f docker-compose.yml -f docker-compose.dev.yml up

prod:
	docker compose --env-file .env.prod \
		-f docker-compose.yml -f docker-compose.prod.yml up -d

staging:
	docker compose --env-file .env.staging \
		-f docker-compose.yml -f docker-compose.staging.yml up -d

down:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

logs:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

ps:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

```bash
# Usage
make dev       # Start dev environment
make prod      # Start prod environment
make staging   # Start staging environment
make down      # Stop all
make logs      # Tail logs
```

### Logging Configuration per Environment

```yaml
# docker-compose.prod.yml — Production logging
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,environment"

  db:
    logging:
      driver: syslog
      options:
        syslog-address: "tcp://192.168.1.100:514"
        tag: "db-prod"
```

```yaml
# docker-compose.dev.yml — Dev logging (console)
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"
```

### Secret Management with Docker Secrets

```yaml
# docker-compose.prod.yml — Using Docker secrets
services:
  db:
    secrets:
      - db-password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db-password

secrets:
  db-password:
    file: ./secrets/db_password.txt
```

```bash
# Create secret file (never commit to git)
echo "my_secure_password" > secrets/db_password.txt
echo "secrets/" >> .gitignore
```

## Additional Best Practices

1. **Use `docker compose config` to validate before deploying.** Catch merge issues early:

```bash
# Validate merged config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config > /dev/null

# Show full merged config for review
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

2. **Pin image versions in prod.** Use exact tags, not `latest`:

```yaml
# Bad: unpredictable
image: postgres:latest

# Good: reproducible
image: postgres:16.4-alpine
```

3. **Use `restart: unless-stopped` in prod.** Survives host reboots:

```yaml
services:
  api:
    restart: unless-stopped
```

## Additional Common Mistakes

1. **Using `extends` instead of override files.** `extends` is deprecated in Compose v3:

```yaml
# Deprecated: extends
services:
  api:
    extends:
      file: docker-compose-base.yml
      service: api

# Preferred: multiple -f files
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

2. **Not separating volumes per environment.** Dev and prod sharing the same volume causes data corruption:

```yaml
# Bad: same volume for dev and prod
volumes:
  - db-data:/var/lib/postgresql/data

# Good: separate volumes
# dev override
volumes:
  - db-data-dev:/var/lib/postgresql/data

# prod override
volumes:
  - db-data-prod:/var/lib/postgresql/data
```

3. **Not cleaning up stale containers.** Old containers from previous deploys linger:

```bash
# Remove orphaned containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

## Additional FAQ

### How do I share a compose config between multiple apps?

Use `COMPOSE_PROJECT_NAME` to isolate apps, or use separate directories:

```bash
# Different projects in same directory
COMPOSE_PROJECT_NAME=app1 docker compose -f docker-compose.app1.yml up -d
COMPOSE_PROJECT_NAME=app2 docker compose -f docker-compose.app2.yml up -d
```

### How do I override a command per environment?

```yaml
# docker-compose.dev.yml
services:
  api:
    command: npm run dev

# docker-compose.prod.yml
services:
  api:
    command: node server.js
```

The override file's `command` replaces the base file's `command` entirely.

### How do I scale services differently per environment?

```bash
# Dev: single instance
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Prod: 3 instances (requires Docker Swarm)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --scale api=3
```

Note: `--scale` works without Swarm but doesn't provide load balancing.

## Performance Tips

1. **Use `--build` only when needed.** Rebuilding on every `up` is slow:

```bash
# Fast: use cached images
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Slower: force rebuild
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

2. **Use named volumes for better I/O.** Named volumes are faster than bind mounts in production:

```yaml
# Slow: bind mount
volumes:
  - ./data:/var/lib/postgresql/data

# Fast: named volume
volumes:
  - db-data-prod:/var/lib/postgresql/data
```

3. **Limit container logging in prod.** Unbounded logs fill disk:

```yaml
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```
