---




contentType: recipes
slug: docker-basics
title: "Fundamentos de Docker"
description: "Cómo containerizar una aplicación, escribir un Dockerfile y ejecutar contenedores con Docker Compose."
metaDescription: "Aprende fundamentos de Docker: escribe Dockerfiles, construye imágenes, ejecuta contenedores y orquesta servicios con Docker Compose."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - docker
  - containers
  - ci-cd
  - automation
relatedResources:
  - /recipes/docker-network-isolation
  - /recipes/immutable-infrastructure
  - /recipes/environment-variables
  - /recipes/github-actions
  - /recipes/ansible-playbook
  - /recipes/setup-ssl-certificates
lastUpdated: "2026-09-03"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende fundamentos de Docker: escribe Dockerfiles, construye imágenes, ejecuta contenedores y orquesta servicios con Docker Compose."
  keywords:
    - docker
    - contenedor
    - dockerfile
    - docker compose
    - devops




---

## Overview

Docker empaqueta tu aplicación y sus dependencias en un contenedor ligero y portable que se ejecuta consistentemente en desarrollo, staging y producción. Un Dockerfile es una receta para construir esa imagen de contenedor, y Docker Compose te permite ejecutar configuraciones multi-contenedor con un solo comando.

Lo siguiente cubre las instrucciones esenciales del Dockerfile, el layering de imágenes y un ejemplo práctico de Docker Compose para una aplicación web con base de datos.

## When to Use

Usa esta receta cuando:

- Quieras eliminar problemas de "funciona en mi máquina". Consulta [Environment Variables](/recipes/environment-variables/) para gestionar configuración de contenedores.
- Configures un entorno de desarrollo local que refleje producción. Consulta [Docker Compose Local Dev](/recipes/docker-compose-local-dev/) para entornos multi-servicio.
- Prepares una aplicación para deployment en Kubernetes, AWS ECS o plataformas similares. Consulta [Serverless Functions](/recipes/event-driven-microservices/) para despliegues function-as-a-service.
- Ejecutes pruebas de integración que dependan de bases de datos, caches o brokers de mensajes. Consulta [Integration Testing](/recipes/integration-testing/) para estrategias de aislamiento de tests.

## Solution

### Dockerfile para una App Node.js

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

### Dockerfile para una App Python

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

### Docker Compose (Web + Base de Datos)

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

Ejecutar: `docker compose up --build`

## Explanation

- **Builds multi-etapa** (`AS builder`, `AS runner`) mantienen las imágenes de producción pequeñas al excluir herramientas de build, source maps y dependencias de desarrollo.
- **Caché de capas**: Docker cachea cada capa de instrucciones. Coloca `COPY package*.json` y `RUN npm ci` antes de `COPY . .` para que la instalación de dependencias se cachee a menos que los archivos de paquete cambien.
- **Usuario no-root**: `USER node` (o un usuario personalizado) reduce la superficie de ataque si el contenedor es comprometido.
- **`.dockerignore`**: créalo para excluir `node_modules`, `.git` y archivos de entorno local — inflan el contexto de build y pueden filtrar secretos.

## Variants

| Objetivo | Enfoque |
|----------|---------|
| Imagen más pequeña | Usar imágenes base `alpine` o `distroless` |
| Build más rápido | Ordenar instrucciones del Dockerfile de menos a más frecuentemente cambiadas |
| Inyección de secretos | Usar secretos de BuildKit (`--secret`) o variables de entorno en runtime, nunca `COPY` de secretos |
| Health checks | Agregar instrucción `HEALTHCHECK` o bloque `healthcheck` de Docker Compose |

## Lo que funciona

- **Fija tags de imágenes base**: `node:20-alpine` es mejor que `node:latest` para evitar cambios breaking inesperados.
- **Un proceso por contenedor**: deja que Docker gestione el ciclo de vida del proceso; usa Compose u un orquestador para setups multi-proceso.
- **Usa mounts de volumen para desarrollo**: monta el código fuente en el contenedor para hot-reload durante desarrollo.
- **Escanea imágenes**: ejecuta `docker scan` o Trivy para detectar vulnerabilidades del SO y dependencias en tus imágenes.
- **Apagado graceful**: maneja `SIGTERM` en tu aplicación para que Docker pueda detener contenedores limpiamente.

## Common Mistakes

- **Imágenes gigantes**: copiar archivos innecesarios (logs, datos de prueba, `.git`) infla el tamaño de imagen y tiempo de build.
- **Ejecutar como root**: los usuarios por defecto en imágenes base suelen ser root. Crea y cambia a un usuario no-root.
- **Secretos hardcodeados**: incrustar contraseñas de base de datos en la imagen las hace visibles para cualquiera que la descargue.
- **Ignorar `.dockerignore`**: sin él, `COPY . .` envía todo tu repo — incluyendo archivos sensibles — al daemon de Docker.
- **No manejar señales**: aplicaciones que ignoran `SIGTERM` son matadas con `SIGKILL` después de un timeout, arriesgando corrupción de datos.

## FAQ

**Q: ¿Cuál es la diferencia entre una imagen Docker y un contenedor?**
A: Una imagen es una plantilla de solo lectura con tu código y dependencias. Un contenedor es una instancia en ejecución de esa imagen. Puedes ejecutar muchos contenedores de la misma imagen.

**Q: ¿Debería usar Docker Compose en producción?**
A: Docker Compose es excelente para deployments de producción de un solo host y desarrollo local. Para cargas de producción multi-host y alta disponibilidad, usa Kubernetes o un servicio de contenedores gestionado.

**Q: ¿Cómo reduzco el tamaño de mi imagen Docker?**
A: Usa builds multi-etapa, imágenes base alpine o distroless, y asegúrate de que tu `.dockerignore` excluya artefactos de build y caches de dependencias.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Archivo .dockerignore

Evita que archivos innecesarios entren al contexto de build:

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

### Dockerfile para una App Java Spring Boot

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

### Dockerfile con Health Check

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

### Comandos Esenciales de Docker

```bash
# Construir una imagen
$ docker build -t myapp:latest .

# Construir con una plataforma específica
$ docker build --platform linux/amd64 -t myapp:latest .

# Ejecutar un contenedor
$ docker run -d --name web -p 3000:3000 myapp:latest

# Ejecutar con variables de entorno
$ docker run -d --name web -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@db:5432/mydb \
  -e NODE_ENV=production \
  myapp:latest

# Ejecutar con un volume mount
$ docker run -d --name web -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  myapp:latest

# Listar contenedores en ejecución
$ docker ps

# Listar todos los contenedores (incluyendo detenidos)
$ docker ps -a

# Ver logs de un contenedor
$ docker logs -f web

# Ejecutar un comando dentro de un contenedor en ejecución
$ docker exec -it web sh

# Detener y remover un contenedor
$ docker stop web
$ docker rm web

# Remover una imagen
$ docker rmi myapp:latest

# Limpiar imágenes, contenedores y networks no usados
$ docker system prune -a

# Mostrar uso de disco
$ docker system df
```

### Networking de Docker

```bash
# Crear una red personalizada
$ docker network create mynet

# Ejecutar contenedores en la misma red
$ docker run -d --name db --network mynet postgres:16-alpine
$ docker run -d --name app --network mynet -p 3000:3000 myapp:latest

# Los contenedores pueden alcanzarse por nombre
# app puede conectar a db via: postgres://user:pass@db:5432/mydb
```

```yaml
# docker-compose.yml con red personalizada
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
    internal: true  # Sin acceso externo
```

### Volúmenes de Docker para Datos Persistentes

```bash
# Crear un volumen nombrado
$ docker volume create pgdata

# Inspeccionar un volumen
$ docker volume inspect pgdata

# Remover volúmenes no usados
$ docker volume prune
```

```yaml
# docker-compose.yml con volúmenes
version: "3.9"
services:
  app:
    build: .
    volumes:
      - ./src:/app/src          # Bind mount para dev
      - app-data:/app/data      # Volumen nombrado para datos persistentes

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
  app-data:
```

### Debugging de Contenedores

```bash
# Inspeccionar la configuración de un contenedor
$ docker inspect web

# Ver uso de recursos
$ docker stats web

# Ver procesos dentro de un contenedor
$ docker top web

# Copiar archivos de un contenedor al host
$ docker cp web:/app/logs ./logs

# Exportar el filesystem de un contenedor
$ docker export web | gzip > web.tar.gz

# Ver cambios del filesystem del contenedor
$ docker diff web

# Commitear cambios de un contenedor a una nueva imagen
$ docker commit web myapp:debugged
```

### Build Multi-Etapa con Distroless

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

Las imágenes distroless no tienen shell, package manager ni herramientas innecesarias — reduciendo superficie de ataque y tamaño de imagen.

### Secretos de Docker BuildKit

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app

# Montar npm token como secreto, no persistido en la imagen
RUN --mount=type=secret,id=npm_token \
  NPM_TOKEN=$(cat /run/secrets/npm_token) \
  npm ci
```

```bash
# Construir con secretos
$ docker build --secret id=npm_token,src=$HOME/.npmrc -t myapp:latest .
```




## Tips de Rendimiento

1. **Usa BuildKit para builds más rápidos.** Habilítalo con `DOCKER_BUILDKIT=1` o `docker buildx`:

```bash
$ DOCKER_BUILDKIT=1 docker build -t myapp:latest .
```

2. **Ordena las capas del Dockerfile de menos a más cambiante.** Las dependencias cambian raramente; el código fuente cambia seguido:

```dockerfile
# Bien: deps primero, código al final
COPY package*.json ./
RUN npm ci
COPY . .
```

3. **Usa `--target` para builds parciales.** Construye solo la etapa que necesitas:

```bash
$ docker build --target builder -t myapp:builder .
```

4. **Usa `docker compose up --build` en dev.** Reconstruye solo las capas cambiadas:

```bash
$ docker compose up --build --watch  # Rebuild on file changes (Compose v2.22+)
```

5. **Usa `docker save` y `docker load` para transferencia offline.** Mueve imágenes entre máquinas sin registry:

```bash
$ docker save myapp:latest | gzip > myapp.tar.gz
$ docker load < myapp.tar.gz
```
