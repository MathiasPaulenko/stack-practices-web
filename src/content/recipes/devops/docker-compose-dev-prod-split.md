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
