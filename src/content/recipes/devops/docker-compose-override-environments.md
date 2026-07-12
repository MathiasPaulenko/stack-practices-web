---



contentType: recipes
slug: docker-compose-override-environments
title: "Override Docker Compose Configs per Environment"
description: "How to use Docker Compose override files for environment-specific configurations, covering dev, test, staging, production, profiles, and secrets management."
metaDescription: "Use Docker Compose override files for environment-specific configs. Manage dev, test, staging, production with profiles, secrets, and multi-file composition."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - docker
  - docker-compose
  - environments
  - configuration
  - recipe
relatedResources:
  - /recipes/docker-multi-stage-build-distroless
  - /recipes/github-actions-reusable-workflows
  - /recipes/kubernetes-configmap-secret-mounting
  - /recipes/github-actions-matrix-strategy
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use Docker Compose override files for environment-specific configs. Manage dev, test, staging, production with profiles, secrets, and multi-file composition."
  keywords:
    - devops
    - docker
    - docker-compose
    - environments
    - configuration
    - recipe



---

## Overview

Docker Compose supports multiple files that merge together. The base `docker-compose.yml` defines the service structure. Override files customize it per environment — different ports, volumes, environment variables, resource limits, or even additional services. Compose merges files in order: later files override or extend earlier ones. This lets you maintain one base config and customize it for dev, test, staging, and production without duplication.

## When to Use

- Local development with hot reload and debug tools
- Running tests in isolation with test-specific configs
- Staging/production with production-like settings (resource limits, no debug)
- When you need different services per environment (e.g., Mailhog in dev, SES in prod)
- Managing multi-service applications across environments

## When NOT to Use

- Single environment — a single `docker-compose.yml` is enough
- Production deployments — use Kubernetes or ECS, not Docker Compose
- When configs differ drastically — separate files are clearer than overrides
- When you need complex orchestration — Compose is for dev/test, not production

## Solution

### Base compose file

```yaml
# docker-compose.yml — Base configuration
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  db-data:
```

### Development override

```yaml
# docker-compose.override.yml — Used by default with `docker compose up`
services:
  app:
    build:
      target: dev  # Multi-stage build dev target
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debugger
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    volumes:
      - .:/app           # Hot reload
      - /app/node_modules  # Prevent host overwrite
    command: npm run dev  # Override entrypoint

  db:
    ports:
      - "5432:5432"  # Expose for local tools
    environment:
      POSTGRES_PASSWORD: devpassword

  # Dev-only services
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    depends_on:
      - db
```

### Production override

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
      - DATABASE_URL=postgres://myapp:${DB_PASSWORD}@db:5432/myapp
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
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  db:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G

  redis:
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
```

### Test override

```yaml
# docker-compose.test.yml
services:
  app:
    build:
      target: test
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgres://myapp:testpass@db:5432/testdb
    command: npm test
    depends_on:
      db:
        condition: service_healthy

  db:
    environment:
      POSTGRES_DB: testdb
      POSTGRES_PASSWORD: testpass
    # No volume — ephemeral database for tests
    volumes: []

  # Remove redis for tests
  redis:
    profiles:
      - donotstart
```

### Running with different overrides

```bash
# Development (default — uses docker-compose.yml + docker-compose.override.yml)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Test
docker compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit

# Build production images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run specific service
docker compose -f docker-compose.yml -f docker-compose.prod.yml up app

# View merged config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

### Using COMPOSE_FILE environment variable

```bash
# .env
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml

# Now `docker compose up` uses both files
docker compose up -d
```

### Compose profiles

```yaml
# docker-compose.yml
services:
  app:
    # Always started
    image: my-app

  db:
    # Always started
    image: postgres:16

  debug-tools:
    # Only started with --profile debug
    profiles:
      - debug
    image: nicolaka/netshoot
    network_mode: "service:app"

  load-test:
    # Only started with --profile loadtest
    profiles:
      - loadtest
    image: grafana/k6
    volumes:
      - ./tests:/scripts
```

```bash
# Start without profiles
docker compose up -d  # Only app and db

# Start with debug profile
docker compose --profile debug up -d

# Start with load test profile
docker compose --profile loadtest up

# Start with multiple profiles
docker compose --profile debug --profile loadtest up
```

### Secrets management

```yaml
# docker-compose.prod.yml
services:
  app:
    secrets:
      - db-password
      - api-key
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db-password
      - API_KEY_FILE=/run/secrets/api-key

  db:
    secrets:
      - db-password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db-password

secrets:
  db-password:
    file: ./secrets/db-password.txt
  api-key:
    file: ./secrets/api-key.txt
```

### Environment variables from .env

```bash
# .env
DB_PASSWORD=supersecret
REDIS_URL=redis://redis:6379
JWT_SECRET=my-jwt-secret
```

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
```

### Multi-file merge behavior

```yaml
# docker-compose.yml (base)
services:
  app:
    image: my-app:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

```yaml
# docker-compose.override.yml
services:
  app:
    # Ports are merged (not replaced)
    ports:
      - "9229:9229"  # Added to 3000:3000
    # Environment is merged
    environment:
      - NODE_ENV=development  # Overrides production
      - DEBUG=true             # Added
```

## Variants

### Using extends to reuse service definitions

```yaml
# docker-compose.yml
services:
  web:
    extends:
      file: docker-compose.base.yml
      service: app
    environment:
      - APP_ROLE=web

  worker:
    extends:
      file: docker-compose.base.yml
      service: app
    environment:
      - APP_ROLE=worker
    ports: []  # No ports for worker
```

### Docker Compose with healthcheck dependencies

```yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s
```

### Watch mode for development

```yaml
# docker-compose.override.yml
services:
  app:
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
```

```bash
docker compose watch  # Auto-sync changes and rebuild
```

## Best Practices


- For a deeper guide, see [Docker Compose Dev/Prod Split: Separate Environments](/recipes/docker-compose-dev-prod-split/).

- Keep `docker-compose.yml` as the base — don't put environment-specific config in it
- Use `docker-compose.override.yml` for dev — Compose picks it up automatically
- Use explicit `-f` flags for non-dev environments — prevents accidental dev overrides
- Use `.env` for secrets — don't hardcode passwords in YAML
- Use `profiles` for optional services — avoids starting everything when you don't need it
- Use `depends_on` with `condition` — ensures services start in the right order
- Use `healthcheck` for databases — prevents app from connecting before DB is ready
- Run `docker compose config` to verify merged output — catches merge issues

## Common Mistakes

- **Forgetting override.yml is automatic**: `docker compose up` always merges `docker-compose.override.yml` if it exists. Use `-f` to be explicit.
- **Hardcoding secrets in YAML**: passwords in `docker-compose.yml` end up in git. Use `.env` or Docker secrets.
- **Not using healthchecks**: app starts before DB is ready, causing connection errors. Add healthchecks to dependent services.
- **Using Compose for production**: Compose is designed for dev/test. Use Kubernetes, ECS, or Docker Swarm for production orchestration.
- **Not cleaning up volumes**: `docker compose down` keeps volumes. Use `docker compose down -v` to remove data.

## FAQ

### How does Docker Compose merge files?

It deep-merges: lists (ports, volumes) are concatenated, maps (environment, labels) are merged with later values overriding earlier ones, and scalars (image, command) are replaced.

### What is the default override file?

`docker-compose.override.yml`. If it exists in the same directory, Compose merges it automatically with `docker-compose.yml` when you run `docker compose up`.

### Can I use multiple override files?

Yes. Use multiple `-f` flags: `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.secrets.yml up`.

### What are Compose profiles?

A way to mark services as optional. Services with a `profiles` list only start when you pass `--profile <name>`. This lets you keep debug/test tools in the same file without always starting them.

### How do I pass environment variables?

Use a `.env` file in the same directory. Compose reads it automatically. Reference variables with `${VAR_NAME}` in the YAML.
