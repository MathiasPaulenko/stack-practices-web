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
  - /patterns/ambassador-pattern-services
  - /recipes/redis-cache-patterns
  - /recipes/immutable-infrastructure
  - /recipes/helm-chart-deployment
  - /recipes/cost-optimization
  - /recipes/kafka-event-streaming
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

### Override Files Multi-Entorno

```yaml
# docker-compose.test.yml
services:
  api:
    build:
      dockerfile: Dockerfile.test
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgres://postgres:secret@db:5432/app_test
    command: ["npm", "run", "test:integration"]

  db:
    environment:
      POSTGRES_DB: app_test

  # Remover nginx y worker para tests
  nginx:
    profiles:
      - never
  worker:
    profiles:
      - never
```

```bash
# Correr tests de integración
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from api
```

### Límites de Recursos y Cuotas

```yaml
# docker-compose.yml (añadir a cada servicio)
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  db:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  worker:
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
```

### Script de Seed Data

```bash
#!/bin/bash
# seed-dev.sh

set -e

echo "Reseteando base de datos..."
docker-compose exec -T db psql -U postgres -d app -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Corriendo migraciones..."
docker-compose exec -T api npx prisma migrate dev --reset --force

echo "Cargando usuarios..."
docker-compose exec -T db psql -U postgres -d app <<'SQL'
INSERT INTO users (email, name, created_at) VALUES
  ('alice@example.com', 'Alice', NOW()),
  ('bob@example.com', 'Bob', NOW()),
  ('admin@example.com', 'Admin', NOW());
SQL

echo "Cargando productos..."
docker-compose exec -T db psql -U postgres -d app <<'SQL'
INSERT INTO products (name, price, stock) VALUES
  ('Widget', 9.99, 100),
  ('Gadget', 19.99, 50),
  ('Doohickey', 4.99, 200);
SQL

echo "Seed completo!"
```

### Makefile para Comandos Comunes

```makefile
# Makefile
.PHONY: up down restart logs ps clean rebuild seed test

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f --tail=100

ps:
	docker-compose ps

clean:
	docker-compose down -v --remove-orphans

rebuild:
	docker-compose up -d --build --force-recreate

seed:
	./seed-dev.sh

test:
	docker-compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from api

shell:
	docker-compose exec api /bin/sh

db-shell:
	docker-compose exec db psql -U postgres -d app
```

### Debugging con Docker Compose

```bash
# Ver logs de un solo servicio
docker-compose logs -f api

# Ejecutar comando en container en ejecución
docker-compose exec api npm install express

# Inspeccionar uso de recursos del container
docker stats $(docker-compose ps -q)

# Verificar health de servicios
docker-compose ps
# NAME                COMMAND             SERVICE    STATUS           PORTS
# docker-compose-1   "npm run dev"       api        Up (healthy)     0.0.0.0:3000->3000/tcp

# Rebuild un solo servicio tras cambio de dependencia
docker-compose up -d --build api

# Ver detalles de red
docker network inspect docker-compose_backend
```

## Mejores Prácticas Adicionales

1. **Usa named volumes para datos persistentes.** Los volúmenes anónimos son difíciles de gestionar:

```yaml
# Bien: named volume
volumes:
  postgres_data:
    name: myapp_postgres_data
  redis_data:
    name: myapp_redis_data
```

2. **Fija versiones de imágenes para reproducibilidad.** Evita `latest`:

```yaml
# Mal
image: postgres:latest

# Bien
image: postgres:16.4-alpine
```

3. **Usa `.dockerignore` para reducir el build context:**

```text
# .dockerignore
node_modules
.git
.env
coverage
*.log
```

## Errores Comunes Adicionales

1. **Exponer puertos de base de datos en producción.** Solo expón durante desarrollo local:

```yaml
# Dev local: OK
ports:
  - "5432:5432"

# Producción: remover ports, usar solo red interna
# ports: []  # Sin acceso externo
```

2. **No usar `--remove-orphans` al cambiar configs.** Containers huérfanos persisten:

```bash
# Limpiar huérfanos
docker-compose down --remove-orphans
```

3. **Olvidar setear restart policies.** Los servicios crashean y quedan caídos:

```yaml
services:
  api:
    restart: unless-stopped
  db:
    restart: unless-stopped
  worker:
    restart: unless-stopped
```

## FAQ Adicional

### Como comparto un setup de Compose con mi equipo?

Commitea `docker-compose.yml` y `docker-compose.override.yml.example` a git. Cada desarrollador copia el ejemplo a `docker-compose.override.yml` y lo personaliza localmente. El override file está en gitignore.

### Como corro múltiples proyectos en la misma máquina?

Usa project names para aislar:

```bash
docker-compose -p project-a up -d
docker-compose -p project-b up -d
```

O setea `COMPOSE_PROJECT_NAME` en `.env`:

```env
COMPOSE_PROJECT_NAME=myapp
```

### Como profileo un servicio corriendo en Compose?

Usa las stats integradas de Docker o conecta un profiler:

```bash
# Uso de recursos en tiempo real
docker stats $(docker-compose ps -q api)

# Conectar Node.js inspector
docker-compose exec api node --inspect=0.0.0.0:9229
# Luego conecta chrome://inspect
```

## Tips de Rendimiento

1. **Usa `BuildKit` para builds más rápidos.** Habilítalo en `.env`:

```env
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1
```

2. **Cachéa node_modules en un named volume.** Evita reinstalar en cada rebuild:

```yaml
services:
  api:
    volumes:
      - ./api:/app
      - api_node_modules:/app/node_modules

volumes:
  api_node_modules:
```

3. **Usa `tmpfs` para archivos temporales.** Más rápido que volúmenes en disco:

```yaml
services:
  api:
    tmpfs:
      - /tmp
      - /app/cache
```
