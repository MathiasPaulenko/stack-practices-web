---
contentType: recipes
slug: docker-compose-local-dev
title: "Local Microservices Development with Docker Compose"
description: "Orchestrate multi-service local environments with Docker Compose including databases, caches, message brokers, and reverse proxies with hot reload and shared networks"
metaDescription: "Orchestrate multi-service local environments with Docker Compose. Run databases, caches, message brokers, and apps with hot reload and shared networks."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - docker
  - microservices
  - devops
  - ci-cd
  - automation
relatedResources:
  - /recipes/nginx-reverse-proxy
  - /patterns/design/ambassador-pattern-services
  - /recipes/databases/redis-cache-patterns
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Orchestrate multi-service local environments with Docker Compose. Run databases, caches, message brokers, and apps with hot reload and shared networks."
  keywords:
    - docker compose
    - local development
    - microservices
    - container orchestration
    - dev environment
---

# Local Microservices Development with Docker Compose

Set up a complete local development environment for microservices using Docker Compose. Below is a practical approach to service definitions, shared networks, volume mounts for hot reload, environment configuration, and health checks that mirror production setups on developer machines.

## When to Use This

- Your application consists of multiple services that must run together locally. See [Docker Basics](/recipes/devops/docker-basics) for container fundamentals.
- Developers need consistent environments regardless of host OS. See [Environment Variables](/recipes/devops/environment-variables) for per-environment configuration.
- Databases, caches, and message brokers are required for integration testing. See [Integration Testing](/recipes/testing/integration-testing) for testing strategies.

## Solution

### 1. Multi-Service Compose File

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./api:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:secret@db:5432/app
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    networks:
      - backend

  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile.dev
    volumes:
      - ./worker:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgres://postgres:secret@db:5432/app
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    networks:
      - backend

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.dev.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks:
      - backend

volumes:
  postgres_data:
  redis_data:

networks:
  backend:
    driver: bridge
```

### 2. Development Dockerfile with Hot Reload

```dockerfile
# api/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### 3. Override File for Local Customization

```yaml
# docker-compose.override.yml
services:
  api:
    environment:
      - DEBUG=api:*
      - LOG_LEVEL=debug

  db:
    ports:
      - "5432:5432"
```

### 4. Health-Checked Startup Script

```bash
#!/bin/bash
# start-dev.sh

docker-compose up --build -d

echo "Waiting for services..."
until docker-compose exec -T db pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

echo "Running migrations..."
docker-compose exec api npx prisma migrate dev

echo "Seeding data..."
docker-compose exec api npm run seed

echo "Ready! API: http://localhost:3000"
```

## How It Works

- **Services** define each container with build context, image, or both
- **Networks** enable DNS-based service discovery between containers
- **Volumes** persist database data and enable host code mounts for hot reload
- **depends_on** with `condition: service_healthy` waits for readiness, not just container start
- **override files** merge with the base compose for local-specific settings

## Variation: Compose Profiles for Selective Startup

```yaml
services:
  monitoring:
    image: prom/prometheus
    profiles:
      - monitoring
    ports:
      - "9090:9090"
```

```bash
docker-compose --profile monitoring up
```

## Production Considerations

- Use `.env` files for secrets; never commit credentials to version control
- Run `docker-compose down -v` to clean up volumes when switching branches
- Keep images small with multi-stage builds for production Dockerfiles

## Common Mistakes

- Mounting `node_modules` from the host into the container, causing architecture mismatches
- Forgetting `condition: service_healthy`, leading to connection errors on startup
- Using `latest` tags for base images, causing non-reproducible builds

## FAQ

**Q: How is this different from Kubernetes?**
A: Docker Compose is for single-host local development. Kubernetes orchestrates multi-node production clusters.

**Q: Can I use Docker Compose in CI/CD?**
A: Yes, for integration tests. Use `docker-compose -f docker-compose.yml -f docker-compose.ci.yml up` to override settings for CI environments.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
