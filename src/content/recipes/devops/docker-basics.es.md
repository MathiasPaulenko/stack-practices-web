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
  - docker
  - container
  - devops
  - deployment
  - compose
relatedResources:
  - /recipes/git-workflow
  - /recipes/call-rest-api
  - /recipes/environment-variables
lastUpdated: "2026-06-10"
author: "StackPractices"
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

Esta receta cubre las instrucciones esenciales del Dockerfile, el layering de imágenes y un ejemplo práctico de Docker Compose para una aplicación web con base de datos.

## When to Use

Usa esta receta cuando:

- Quieras eliminar problemas de "funciona en mi máquina"
- Configures un entorno de desarrollo local que refleje producción
- Prepares una aplicación para deployment en Kubernetes, AWS ECS o plataformas similares
- Ejecutes pruebas de integración que dependan de bases de datos, caches o brokers de mensajes

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

## Best Practices

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

## Frequently Asked Questions

**Q: ¿Cuál es la diferencia entre una imagen Docker y un contenedor?**
A: Una imagen es una plantilla de solo lectura con tu código y dependencias. Un contenedor es una instancia en ejecución de esa imagen. Puedes ejecutar muchos contenedores de la misma imagen.

**Q: ¿Debería usar Docker Compose en producción?**
A: Docker Compose es excelente para deployments de producción de un solo host y desarrollo local. Para cargas de producción multi-host y alta disponibilidad, usa Kubernetes o un servicio de contenedores gestionado.

**Q: ¿Cómo reduzco el tamaño de mi imagen Docker?**
A: Usa builds multi-etapa, imágenes base alpine o distroless, y asegúrate de que tu `.dockerignore` excluya artefactos de build y caches de dependencias.
