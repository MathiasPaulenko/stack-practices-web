---
contentType: recipes
slug: docker-compose-local-dev
title: "Desarrollo Local de Microservicios con Docker Compose"
description: "Orquesta entornos locales multi-servicio con Docker Compose incluyendo bases de datos, caches, message brokers y reverse proxies con hot reload y redes compartidas"
metaDescription: "Orquesta entornos locales multi-servicio con Docker Compose. Corre bases de datos, caches, message brokers y apps con hot reload y redes compartidas."
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
  metaDescription: "Orquesta entornos locales multi-servicio con Docker Compose. Corre bases de datos, caches, message brokers y apps con hot reload y redes compartidas."
  keywords:
    - docker compose
    - local development
    - microservices
    - container orchestration
    - dev environment
---

# Desarrollo Local de Microservicios con Docker Compose

Configura un entorno de desarrollo local completo para microservicios usando Docker Compose. Esta recipe cubre definiciones de servicios, redes compartidas, montajes de volumen para hot reload, configuracion de entorno y health checks que replican setups de produccion en maquinas de desarrolladores.

## Cuando Usar Esto

- Tu aplicacion consiste en multiples servicios que deben correr juntos localmente. Consulta [Docker Basics](/recipes/devops/docker-basics) para fundamentos de contenedores.
- Los desarrolladores necesitan entornos consistentes independientemente del SO host. Consulta [Environment Variables](/recipes/devops/environment-variables) para configuración por entorno.
- Bases de datos, caches y message brokers son requeridos para testing de integracion. Consulta [Integration Testing](/recipes/testing/integration-testing) para estrategias de testing.

## Solucion

### 1. Compose File Multi-Servicio

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

### 2. Dockerfile de Desarrollo con Hot Reload

```dockerfile
# api/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### 3. Override File para Customizacion Local

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

### 4. Startup Script con Health Checks

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

## Como Funciona

- **Services** definen cada container con contexto de build, imagen, o ambos
- **Networks** habilitan DNS-based service discovery entre containers
- **Volumes** persisten datos de bases de datos y habilitan mounts de codigo host para hot reload
- **depends_on** con `condition: service_healthy` espera por readiness, no solo por inicio del container
- **override files** mergean con el compose base para settings local-specific

## Variacion: Compose Profiles para Startup Selectivo

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

## Consideraciones de Produccion

- Usa archivos `.env` para secrets; nunca commitees credenciales a version control
- Corre `docker-compose down -v` para limpiar volumenes al cambiar branches
- Manten imagenes pequenas con multi-stage builds para Dockerfiles de produccion

## Errores Comunes

- Montar `node_modules` del host dentro del container, causando mismatches de arquitectura
- Olvidar `condition: service_healthy`, llevando a errores de conexion en startup
- Usar tags `latest` para imagenes base, causando builds no reproducibles

## FAQ

**P: En que se diferencia de Kubernetes?**
R: Docker Compose es para desarrollo local single-host. Kubernetes orquesta clusters multi-nodo de produccion.

**P: Puedo usar Docker Compose en CI/CD?**
R: Si, para tests de integracion. Usa `docker-compose -f docker-compose.yml -f docker-compose.ci.yml up` para sobreescribir settings para ambientes de CI.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
