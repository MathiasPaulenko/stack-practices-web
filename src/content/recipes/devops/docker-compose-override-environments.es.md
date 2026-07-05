---
contentType: recipes
slug: docker-compose-override-environments
title: "Override Configs de Docker Compose por Entorno"
description: "Cómo usar Docker Compose override files para configuraciones específicas por entorno, cubriendo dev, test, staging, production, profiles y secrets management."
metaDescription: "Usa Docker Compose override files para configs específicas por entorno. Maneja dev, test, staging, production con profiles, secrets y multi-file composition."
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
  - /recipes/devops/docker-multi-stage-build-distroless
  - /recipes/devops/github-actions-reusable-workflows
  - /recipes/devops/kubernetes-configmap-secret-mounting
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa Docker Compose override files para configs específicas por entorno. Maneja dev, test, staging, production con profiles, secrets y multi-file composition."
  keywords:
    - devops
    - docker
    - docker-compose
    - environments
    - configuration
    - recipe
---

## Overview

Docker Compose soporta múltiples archivos que se mergean juntos. El `docker-compose.yml` base define la estructura de servicios. Los override files lo customizan por entorno — diferentes ports, volumes, environment variables, resource limits, o incluso servicios adicionales. Compose mergea los archivos en orden: los archivos posteriores overridean o extienden los anteriores. Esto te permite mantener una config base y customizarla para dev, test, staging y production sin duplicación.

## When to Use

- Desarrollo local con hot reload y debug tools
- Correr tests en aislamiento con configs específicas de test
- Staging/production con settings production-like (resource limits, sin debug)
- Cuando necesitás diferentes servicios por entorno (e.g., Mailhog en dev, SES en prod)
- Manejar aplicaciones multi-servicio a través de entornos

## When NOT to Use

- Entorno único — un solo `docker-compose.yml` es suficiente
- Deployments de producción — usá Kubernetes o ECS, no Docker Compose
- Cuando las configs difieren drásticamente — archivos separados son más claros que overrides
- Cuando necesitás orquestación compleja — Compose es para dev/test, no producción

## Solution

### Compose file base

```yaml
# docker-compose.yml — Configuración base
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

### Override de desarrollo

```yaml
# docker-compose.override.yml — Usado por default con `docker compose up`
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
      - /app/node_modules  # Prevenir host overwrite
    command: npm run dev  # Override entrypoint

  db:
    ports:
      - "5432:5432"  # Exponer para tools locales
    environment:
      POSTGRES_PASSWORD: devpassword

  # Servicios solo de dev
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

### Override de producción

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

### Override de test

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
    # Sin volume — database ephemeral para tests
    volumes: []

  # Remover redis para tests
  redis:
    profiles:
      - donotstart
```

### Correr con diferentes overrides

```bash
# Desarrollo (default — usa docker-compose.yml + docker-compose.override.yml)
docker compose up

# Producción
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Test
docker compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit

# Build production images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Correr servicio específico
docker compose -f docker-compose.yml -f docker-compose.prod.yml up app

# Ver config mergeada
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

### Usar COMPOSE_FILE environment variable

```bash
# .env
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml

# Ahora `docker compose up` usa ambos archivos
docker compose up -d
```

### Compose profiles

```yaml
# docker-compose.yml
services:
  app:
    # Siempre iniciado
    image: my-app

  db:
    # Siempre iniciado
    image: postgres:16

  debug-tools:
    # Solo iniciado con --profile debug
    profiles:
      - debug
    image: nicolaka/netshoot
    network_mode: "service:app"

  load-test:
    # Solo iniciado con --profile loadtest
    profiles:
      - loadtest
    image: grafana/k6
    volumes:
      - ./tests:/scripts
```

```bash
# Start sin profiles
docker compose up -d  # Solo app y db

# Start con debug profile
docker compose --profile debug up -d

# Start con load test profile
docker compose --profile loadtest up

# Start con múltiples profiles
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

### Environment variables desde .env

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
    # Ports se mergean (no se reemplazan)
    ports:
      - "9229:9229"  # Agregado a 3000:3000
    # Environment se mergea
    environment:
      - NODE_ENV=development  # Overridea production
      - DEBUG=true             # Agregado
```

## Variants

### Usar extends para reusar definiciones de servicios

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
    ports: []  # Sin ports para worker
```

### Docker Compose con healthcheck dependencies

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

### Watch mode para desarrollo

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
docker compose watch  # Auto-sync changes y rebuild
```

## Best Practices

- Mantené `docker-compose.yml` como base — no pongas config específica de entorno en él
- Usá `docker-compose.override.yml` para dev — Compose lo pikea automáticamente
- Usá flags `-f` explícitos para entornos non-dev — previene accidental dev overrides
- Usá `.env` para secrets — no hardcodees passwords en YAML
- Usá `profiles` para servicios opcionales — evita iniciar todo cuando no lo necesitás
- Usá `depends_on` con `condition` — asegura que los servicios inicien en el orden correcto
- Usá `healthcheck` para databases — previene que la app conecte antes de que DB esté listo
- Corré `docker compose config` para verificar el output mergeado — atrapa merge issues

## Common Mistakes

- **Olvidar que override.yml es automático**: `docker compose up` siempre mergea `docker-compose.override.yml` si existe. Usá `-f` para ser explícito.
- **Hardcodear secrets en YAML**: las passwords en `docker-compose.yml` terminan en git. Usá `.env` o Docker secrets.
- **No usar healthchecks**: la app inicia antes de que DB esté listo, causando connection errors. Agregá healthchecks a servicios dependientes.
- **Usar Compose para producción**: Compose está diseñado para dev/test. Usá Kubernetes, ECS o Docker Swarm para orquestación de producción.
- **No limpiar volumes**: `docker compose down` mantiene los volumes. Usá `docker compose down -v` para remover data.

## FAQ

### ¿Cómo mergea Docker Compose los archivos?

Hace deep-merge: listas (ports, volumes) se concatenan, maps (environment, labels) se mergean con valores posteriores overrideando los anteriores, y escalares (image, command) se reemplazan.

### ¿Cuál es el override file default?

`docker-compose.override.yml`. Si existe en el mismo directorio, Compose lo mergea automáticamente con `docker-compose.yml` cuando corrés `docker compose up`.

### ¿Puedo usar múltiples override files?

Sí. Usá múltiples flags `-f`: `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.secrets.yml up`.

### ¿Qué son los Compose profiles?

Una forma de marcar servicios como opcionales. Los servicios con una lista `profiles` solo inician cuando pasás `--profile <name>`. Esto te permite mantener debug/test tools en el mismo archivo sin siempre iniciarlos.

### ¿Cómo paso environment variables?

Usá un archivo `.env` en el mismo directorio. Compose lo lee automáticamente. Referenciá variables con `${VAR_NAME}` en el YAML.
