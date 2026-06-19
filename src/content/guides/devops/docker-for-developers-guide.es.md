---
contentType: guides
slug: docker-for-developers-guide
title: "Docker para Desarrolladores — Guía Completa"
description: "Aprende Docker desde cero: imágenes, contenedores, Dockerfiles, redes, volúmenes y Docker Compose para desarrollo local."
metaDescription: "Guía completa de Docker para desarrolladores. Aprende imágenes, contenedores, Dockerfiles, redes, volúmenes y Docker Compose para flujos de desarrollo local."
difficulty: beginner
topics:
  - devops
tags:
  - contenedores
  - desarrollo
  - devops
  - docker
  - guia
relatedResources:
  - /guides/devops/cicd-pipeline-guide
  - /guides/devops/kubernetes-basics-guide
  - /recipes/devops/generate-sitemaps
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía completa de Docker para desarrolladores. Aprende imágenes, contenedores, Dockerfiles, redes, volúmenes y Docker Compose para flujos de desarrollo local."
  keywords:
    - docker para desarrolladores
    - contenedores docker
    - tutorial dockerfile
    - docker compose
    - redes docker
    - volúmenes docker
---

# Docker para Desarrolladores

## Introducción

Docker es una plataforma para desarrollar, enviar y ejecutar aplicaciones en contenedores. Los contenedores son ligeros, portátiles y consistentes entre entornos, resolviendo el problema clásico de "en mi máquina funciona".

## Conceptos Clave

### Imágenes

Una imagen Docker es una plantilla de solo lectura que contiene el código de la aplicación, el runtime, las bibliotecas y las dependencias. Las imágenes se construyen a partir de un `Dockerfile`.

### Contenedores

Un contenedor es una instancia ejecutable de una imagen. Está aislado del sistema host y de otros contenedores, pero puede compartir el kernel del SO.

### Dockerfile

Un archivo de texto con instrucciones para construir una imagen. Cada instrucción crea una capa en la imagen.

## Buenas Prácticas de Dockerfile

```dockerfile
# Usa una versión específica, no 'latest'
FROM node:20-alpine

# Crea un usuario no root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

# Copia primero los archivos de dependencias para aprovechar el cacheo de capas
COPY package*.json ./
RUN npm ci --only=production

# Copia el código de la aplicación
COPY . .

# Cambia la propiedad
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

### Buenas Prácticas

- **Usa etiquetas de imagen específicas** — `node:20-alpine` en lugar de `node:latest`
- **Ejecuta como usuario no root** — práctica de seguridad
- **Ordena las instrucciones por frecuencia de cambio** — pon `COPY package.json` antes de `COPY .` para cachear dependencias
- **Combina comandos RUN** cuando sea posible para reducir capas
- **Usa `.dockerignore`** para evitar enviar archivos innecesarios al contexto de build

## Comandos Esenciales

```bash
# Construir una imagen
docker build -t myapp:1.0 .

# Ejecutar un contenedor
docker run -d -p 3000:3000 --name myapp myapp:1.0

# Listar contenedores en ejecución
docker ps

# Detener y eliminar un contenedor
docker stop myapp && docker rm myapp

# Ejecutar un comando dentro de un contenedor en ejecución
docker exec -it myapp sh

# Ver logs
docker logs -f myapp

# Eliminar imágenes y volúmenes no utilizados
docker system prune -a --volumes
```

## Redes

Docker proporciona varios drivers de red:

| Driver | Caso de Uso |
|--------|-------------|
| **bridge** | Por defecto. Red aislada para contenedores en un solo host |
| **host** | Comparte la pila de red del host (sin aislamiento) |
| **none** | Desactiva toda la red |
| **overlay** | Conecta contenedores entre múltiples hosts Docker (Swarm) |

```bash
# Crear una red bridge personalizada
docker network create my-network

# Ejecutar contenedores en la misma red
docker run -d --name db --network my-network postgres:15
docker run -d --name api --network my-network myapp:1.0
```

## Volúmenes

Los volúmenes persisten datos fuera del sistema de archivos del contenedor:

```bash
# Volumen nombrado
docker volume create my-data
docker run -v my-data:/data myapp:1.0

# Bind mount (desarrollo)
docker run -v $(pwd):/app -v /app/node_modules myapp:1.0
```

| Tipo | Caso de Uso |
|------|-------------|
| **Volumen nombrado** | Datos persistentes (bases de datos, uploads) |
| **Bind mount** | Recarga de código en vivo durante desarrollo |
| **tmpfs** | Datos efímeros en memoria |

## Docker Compose

`docker-compose.yml` define y ejecuta aplicaciones multi-contenedor:

```yaml
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=db
    depends_on:
      - db
    volumes:
      - ./api:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Reconstruir después de cambios en Dockerfile
docker-compose up -d --build

# Detener y eliminar todo
docker-compose down -v
```

## Builds Multi-Etapa

Reduce el tamaño de la imagen final separando las etapas de build y runtime:

```dockerfile
# Etapa de build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa de runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

## Errores Comunes

- Ejecutar contenedores como root innecesariamente
- Almacenar secretos en variables de entorno o capas de imagen. Consulta [seguridad de contenedores](/recipes/container-security).
- No manejar señales adecuadamente (problema PID 1) — usa `tini` o `dumb-init`
- Construir imágenes de producción con devDependencies incluidas. Consulta [infraestructura inmutable](/recipes/immutable-infrastructure).
- Ignorar `.dockerignore`, hinchando el contexto de build
- Hardcodear configuración en imágenes en lugar de usar variables de entorno

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre una VM y un contenedor?**
R: Las VMs virtualizan hardware e incluyen un SO completo. Los contenedores virtualizan el kernel del SO y lo comparten con el host, siendo mucho más ligeros y rápidos de iniciar.

**P: ¿Cómo depuro un contenedor que falla?**
R: Usa `docker logs <contenedor>` para stdout/stderr, `docker exec -it <contenedor> sh` para inspeccionar el filesystem, y `docker inspect <contenedor>` para configuración detallada.

**P: ¿Debo usar Docker Swarm o Kubernetes?**
R: Para la mayoría de proyectos nuevos, usa Kubernetes (o un servicio gestionado como EKS, GKE, AKS). Consulta [orquestación](/recipes/serverless-orchestration). Docker Swarm es más simple pero tiene soporte de ecosistema limitado y ya no se desarrolla activamente.
