---





contentType: guides
slug: complete-guide-docker-compose-local-dev
title: "Docker Compose: Multi-Service Local Development"
description: "Dominá Docker Compose para desarrollo local: entornos multi-service, networking, volumes, profiles, overrides, hot reload, debugging y setups production-like."
metaDescription: "Dominá Docker Compose para desarrollo local: entornos multi-service, networking, volumes, profiles, overrides, hot reload, debugging y setups production-like."
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
  metaDescription: "Dominá Docker Compose para desarrollo local: entornos multi-service, networking, volumes, profiles, overrides, hot reload, debugging y setups production-like."
  keywords:
    - docker compose
    - local development
    - multi-service
    - docker networking
    - docker volumes
    - docker profiles
    - dev environment





---

## Introducción

Docker Compose define y runnea multi-container applications localmente. Describís services, networks y volumes en un YAML file, luego starteás todo con un command. A continuación: service definitions, networking, volumes, profiles, override files, hot reload setups, debugging y production-like local environments.

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
# Default network: all services join un default network named after el project
# Services se reachéan entre sí by service name as hostname

services:
  app:
    # app reachéa db at: postgresql://db:5432
    # app reachéa redis at: redis://redis:6379
    networks:
      - default

  db:
    networks:
      - default

  # Custom networks para isolation
  frontend:
    image: nginx:alpine
    networks:
      - frontend-net

  backend:
    image: my-backend
    networks:
      - frontend-net  # Puede reach frontend
      - backend-net   # Puede reach db

  db:
    image: postgres:16
    networks:
      - backend-net   # Solo backend puede reach db

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

      # Anonymous volume: prevente host override de specific path
      - /app/node_modules

      # Named volume: persistent data managed by Docker
      - app-cache:/app/.cache

  db:
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
      # init-scripts runnean en first start only (cuando db-data está empty)

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
# Docker Compose automáticamente mergea: docker-compose.yml + docker-compose.override.yml
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
    volumes: []  # Remové bind mounts
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
# Profiles te dejan startéar specific groups de services
# docker compose --profile debug up
# docker compose --profile monitoring up

version: "3.9"
services:
  app:
    # No profile — siempre startea
    build: .

  db:
    # No profile — siempre startea
    image: postgres:16

  mailhog:
    # Solo startea con --profile debug
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

### Node.js con nodemon

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

### Python con uvicorn auto-reload

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

### Java con Spring Boot DevTools

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

### Python debugging con debugpy

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
# Starteá all services (foreground)
docker compose up

# Starteá en background (detached)
docker compose up -d

# Starteá specific services
docker compose up app db

# Starteá con profiles
docker compose --profile monitoring up

# Rebuildéa y starteá
docker compose up --build

# Viewéa logs
docker compose logs -f
docker compose logs -f app
docker compose logs --tail=100 app

# Stopéa y remové containers
docker compose down

# Stopéa y remové containers + volumes
docker compose down -v

# Stopéa y remové containers + volumes + images
docker compose down -v --rmi all

# Runnéa un one-off command
docker compose exec app npm run migrate
docker compose run --rm app npm run test

# Restarteá un single service
docker compose restart app

# Viewéa running services
docker compose ps

# Viewéa resource usage
docker compose stats
```

## Best Practices


- For a deeper guide, see [Complete Guide to Docker in Production](/es/guides/complete-guide-docker-production/).

- Usá bind mounts para source code en dev — habilita hot reload sin rebuilds
- Usá anonymous volumes para `node_modules`, `.venv` — prevente host OS de overriding container packages
- Usá `depends_on` con `condition: service_healthy` — ensureá que DB esté ready antes de que app start
- Usá override files para environment-specific config — base file + override auto-merged
- Usá profiles para optional services — monitoring, mail catcher, debug tools
- Seteá `restart: unless-stopped` para dev databases — survive machine reboots
- Usá `.dockerignore` — preventí copying `node_modules`, `.git`, build artifacts into images
- Pinneá image versions — `postgres:16-alpine` no `postgres:latest`
- Usá healthchecks en databases — app waitéa readiness en vez de failing on connection
- Usá named volumes para persistent data — survive `docker compose down` (usá `-v` para remove)
- Mantené `docker-compose.yml` en version control — reproducible environments para todo el team

## Common Mistakes

- **No anonymous volume para `node_modules`**: bind mount overwritea container-installed packages con host's (o empty) directory.
- **Usar `depends_on` sin healthcheck**: app startea antes de que DB esté ready, connection fails on boot.
- **No `.dockerignore`**: build context incluye `node_modules`, `.git`, large files — slow builds y bloated images.
- **Usar `latest` tag**: images cambian unexpectedly entre pulls. Pinneá a specific versions.
- **No volume para database data**: `docker compose down` destroyéa all data. Usá named volumes.
- **Exponer all ports a host**: solo exponé ports que necesitás accessar desde el host. Internal services communicatean via Docker network.

## FAQ

### ¿Cuál es la diferencia entre bind mounts y named volumes?

Bind mounts mapean un host directory a un container path. Habilitan hot reload pero tiean el container al host filesystem. Named volumes son managed by Docker y persisten independientemente del container. Usá bind mounts para source code, named volumes para database data.

### ¿Cómo funciona docker-compose.override.yml?

Docker Compose automáticamente mergea `docker-compose.yml` con `docker-compose.override.yml` si existe. El override file agrega o reemplaza settings del base file. Usalo para local dev settings. Para production, usá explicit `-f` flags: `docker compose -f docker-compose.yml -f docker-compose.prod.yml`.

### ¿Qué son Docker Compose profiles?

Labels que groupéan services. Services sin profile siempre startean. Services con profile solo startean cuando pasás `--profile <name>`. Useful para optional services como monitoring, debug tools, o mail catchers.

### ¿Cómo runneo database migrations?

Usá `docker compose exec` para runnear un one-off command en un running container: `docker compose exec app npm run migrate`. O usá `docker compose run` para un new container: `docker compose run --rm app npm run migrate`.

### ¿Cómo reseteo mi local environment?

`docker compose down -v` stopea y removeéa containers y volumes. Esto wipeéa all data. Para keep data, usá `docker compose down` sin `-v`. Para rebuild from scratch: `docker compose build --no-cache && docker compose up`.
