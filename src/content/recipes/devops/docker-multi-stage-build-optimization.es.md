---
contentType: recipes
slug: docker-multi-stage-build-optimization
title: "Optimización de Docker Multi-Stage Build para Imágenes"
description: "Reduce el tamaño de imágenes Docker con multi-stage builds y layering correcto"
metaDescription: "Optimiza imágenes Docker con multi-stage builds, layer caching, bases distroless y .dockerignore. Reduce el tamaño hasta un 90 por ciento."
difficulty: intermediate
topics:
  - devops
tags:
  - docker
  - multi-stage-build
  - image-optimization
  - container
  - dockerfile
  - devops
relatedResources:
  - /recipes/docker-health-check-configuration
  - /recipes/docker-compose-dev-prod-split
  - /guides/terraform-best-practices-guide
  - /docs/deployment-checklist-template
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Optimiza imágenes Docker con multi-stage builds, layer caching, bases distroless y .dockerignore. Reduce el tamaño hasta un 90 por ciento."
  keywords:
    - docker multi stage build
    - docker image size optimization
    - dockerfile layer caching
    - distroless docker images
    - docker build optimization
    - docker multi stage dockerfile
---

## Visión General

Los multi-stage builds permiten usar múltiples sentencias FROM en un solo Dockerfile. Cada stage empieza desde cero, y copias solo los artefactos necesarios de stages anteriores. Esto elimina herramientas de build, dependencias de dev y archivos intermedios de la imagen final, reduciendo el tamaño hasta un 90 por ciento.

## Cuándo Usar

- Tu imagen Docker es demasiado grande (más de 500MB para una app simple)
- Envías herramientas de build (compiladores, SDKs, node_modules) en imágenes de producción
- Quieres una superficie de ataque menor excluyendo binarios innecesarios
- Necesitas diferentes imágenes base para build vs runtime (ej., Go build con golang, run con scratch)

## Solución

### Multi-stage build para Node.js

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Producción
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Multi-stage con distroless para Python

```dockerfile
# Stage 1: Build dependencias
FROM python:3.12-slim AS builder

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM gcr.io/distroless/python3-debian12 AS runtime

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY . .

ENV PATH="/opt/venv/bin:$PATH"

USER nonroot:nonroot

EXPOSE 8000

CMD ["-m", "gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

### Multi-stage con scratch para Go

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# Stage 2: Runtime (scratch = imagen vacía)
FROM scratch AS runtime

COPY --from=builder /build/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080

ENTRYPOINT ["/server"]
```

### Multi-stage con Gradle para Java

```dockerfile
# Stage 1: Build
FROM gradle:8.7-jdk21-alpine AS builder

WORKDIR /build

COPY build.gradle settings.gradle ./
COPY src ./src

RUN gradle bootJar --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

COPY --from=builder /build/build/libs/*.jar app.jar

USER temurin

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
```

### .dockerignore para contexto más pequeño

```text
# .dockerignore
node_modules
dist
.git
.gitignore
.env
.env.local
*.md
.vscode
.idea
coverage
.nyc_output
Dockerfile
docker-compose*.yml
```

### Optimización de layer caching

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias primero (cacheado a menos que package.json cambie)
COPY package*.json ./
RUN npm ci

# Copiar fuente (invalida cache solo cuando el código cambia)
COPY . .

RUN npm run build
```

## Explicación

Cada instrucción `FROM` inicia un nuevo stage. Docker construye todos los stages pero solo el stage final se convierte en la imagen de salida. Usa `COPY --from=builder` para traer artefactos de stages anteriores.

Conceptos clave:

- **Naming de stages**: Usa `AS builder`, `AS runtime` para nombrar stages. Referéncialos con `COPY --from=builder`.
- **Imágenes distroless**: Las imágenes distroless de Google no tienen shell, package manager ni binarios extra. Reducen tamaño y superficie de ataque considerablemente.
- **Imágenes scratch**: La base más pequeña posible (0 bytes). Solo funciona para binarios compilados estáticamente como Go.
- **Layer caching**: Docker cachea cada capa. Pon instrucciones que cambian raramente (instalación de dependencias) antes de las que cambian frecuentemente (copia de código fuente). Así, cambiar el código fuente reutiliza la capa de dependencias cacheada.
- **`.dockerignore`**: Reduce el contexto de build enviado al daemon de Docker. Excluye `node_modules`, `.git`, artefactos de build y archivos de IDE.
- **`npm ci --omit=dev`**: Instala solo dependencias de producción. Combinado con multi-stage, la imagen final no tiene devDependencies.
- **Usuario non-root**: Ejecuta el contenedor como usuario non-root (`USER node`, `USER nonroot`) por seguridad.

## Variantes

| Imagen Base | Tamaño | Shell | Usar Cuando |
|------------|------|-------|----------|
| scratch | ~0 MB | Ninguna | Binarios estáticos (Go, Rust) |
| distroless | ~20-50 MB | Ninguna | Superficie de ataque mínima |
| alpine | ~5-10 MB | Sí | Propósito general, pequeño |
| slim | ~20-80 MB | Sí | Basado en Debian, compatibilidad |
| full | ~300-900 MB | Sí | Desarrollo, debugging |

## Pautas

- Usar multi-stage builds para cualquier aplicación no trivial.
- Elegir la imagen base más pequeña que funcione (scratch > distroless > alpine > slim > full).
- Copiar archivos de dependencias antes del código fuente para maximizar hits de cache de capas.
- Usar `npm ci` en lugar de `npm install` para builds reproducibles.
- Excluir dependencias de dev con `--omit=dev` (npm) o `--no-dev` (pip).
- Agregar un archivo `.dockerignore` para reducir el contexto de build.
- Ejecutar contenedores como usuarios non-root.
- Strippear símbolos de debug de binarios compilados (`-ldflags="-s -w"` para Go).
- Limpiar caches de paquetes (`npm cache clean --force`, `pip cache purge`).
- Taguear imágenes con versiones específicas, no `latest`.

## Errores Comunes

- Copiar todo el contexto de build sin `.dockerignore`. Esto envía `node_modules` y `.git` al daemon, ralentizando builds.
- Poner `COPY . .` antes de instalar dependencias. Cada cambio de fuente invalida el cache de dependencias.
- Usar `npm install` en lugar de `npm ci`. `npm install` puede modificar `package-lock.json` y producir builds no reproducibles.
- Enviar el SDK completo en la imagen de runtime. Usar multi-stage para copiar solo el output compilado.
- Ejecutar como root. Los contenedores deben ejecutarse como non-root por seguridad.
- No strippear símbolos de debug en binarios de Go. `-s -w` elimina símbolos e info de debug, ahorrando megabytes.
- Olvidar limpiar caches de paquetes. `apt-get`, `pip` y `npm` todos cachean archivos que inflan la imagen.

## Preguntas Frecuentes

### ¿Cuánto pueden reducir los multi-stage builds el tamaño de imagen?

Una app Node.js típica con devDependencies puede pasar de 900MB a 150MB (83 por ciento de reducción). Un binario de Go puede pasar de 1.2GB (base golang) a 15MB (base scratch), un 98 por ciento de reducción.

### ¿Puedo saltar stages durante el build?

Sí. Usa `docker build --target builder` para construir solo hasta un stage específico. Útil para testear el stage de build sin crear la imagen de producción.

### ¿Cómo depuro una imagen distroless?

Las imágenes distroless no tienen shell. Usa `docker cp` para copiar un debugger, o usa una variante debug como `gcr.io/distroless/python3-debian12:debug` que incluye un shell busybox.

### ¿Debo usar Alpine o slim?

Alpine usa musl libc en lugar de glibc, lo que puede causar problemas con módulos nativos (extensiones C de Python, addons nativos de Node.js). Si tienes problemas de compatibilidad, cambia a slim (basado en Debian).

### Multi-Stage Build para Rust

```dockerfile
# Stage 1: Build
FROM rust:1.78 AS builder

WORKDIR /build

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/myapp /usr/local/bin/myapp

USER nobody

EXPOSE 8080

CMD ["myapp"]
```

### BuildKit Cache Mounts

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Montar cache de npm como volumen (persiste entre builds)
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN --mount=type=cache,target=/root/.npm npm run build
```

```dockerfile
# Cache mount para pip
FROM python:3.12-slim AS builder

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
```

```dockerfile
# Cache mount para módulos de Go
FROM golang:1.22-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o server .
```

### Stage de Test para CI

```dockerfile
# Stage 1: Dependencias
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Test
FROM deps AS test
COPY . .
RUN npm run lint
RUN npm run test:unit

# Stage 3: Build
FROM deps AS builder
COPY . .
RUN npm run build

# Stage 4: Producción
FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Correr solo tests
docker build --target test .

# Build imagen de producción (salta stage de test si está cacheado)
docker build --target production -t myapp:latest .
```

### Análisis de Tamaño de Imagen

```bash
# Verificar tamaño de imagen
docker images myapp:latest
# REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
# myapp        latest    abc123         2 minutes ago   148MB

# Analizar tamaños de capas
docker history myapp:latest --no-trunc --format "{{.Size}}\t{{.CreatedBy}}"

# Comparar antes/después
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | grep myapp
```

```bash
# Usar dive para análisis detallado de capas
dive myapp:latest
# Muestra cada capa, qué se añadió/removió, y potencial waste
```

### Builds Multi-Arquitectura

```dockerfile
# Dockerfile (igual para todas las plataformas)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM --platform=$TARGETPLATFORM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build para múltiples arquitecturas
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myapp:latest \
  --push .
```

## Mejores Prácticas Adicionales

1. **Usa `COPY --link` para builds más rápidos.** Copia archivos como capa separada sin invalidar cache:

```dockerfile
COPY --link package*.json ./
```

2. **Usa `HEALTHCHECK` en imágenes de producción.** Ayuda a los orquestadores a detectar contenedores no saludables:

```dockerfile
FROM node:20-alpine AS production
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --spider http://localhost:3000/health || exit 1
```

3. **Fija imágenes base por digest para reproducibilidad.** Los tags pueden actualizarse, los digests son inmutables:

```dockerfile
# Fijar por digest (más reproducible)
FROM node:20-alpine@sha256:abc123... AS builder
```

## Errores Comunes Adicionales

1. **No limpiar cache de apt-get en imágenes basadas en Debian.** Los lists inflan la imagen:

```dockerfile
# Mal
RUN apt-get update && apt-get install -y curl

# Bien
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

2. **Usar `ADD` en lugar de `COPY` para archivos locales.** `ADD` tiene features extra (fetch de URL, extracción de tar) que pueden causar comportamiento inesperado:

```dockerfile
# Mal (impredecible con archivos tar)
ADD ./app.tar.gz /app/

# Bien (explícito)
COPY ./app/ /app/
```

3. **No usar `--no-install-recommends` con apt-get.** Instala paquetes innecesarios:

```dockerfile
# Instala 200+ paquetes extra
RUN apt-get install -y curl

# Instala solo paquetes requeridos
RUN apt-get install -y --no-install-recommends curl
```

## FAQ Adicional

### Como uso BuildKit para builds más rápidos?

Habilita BuildKit via variable de entorno o settings de Docker Desktop:

```bash
# Por build
DOCKER_BUILDKIT=1 docker build -t myapp .

# O setear globalmente en daemon.json
{
  "features": { "buildkit": true }
}
```

BuildKit paraleliza stages independientes y soporta cache mounts.

### Como reduzco el tiempo de pull de imagen en CI?

Usa un registry local o cache-from/cache-to:

```bash
# Cachear desde registry
docker build \
  --cache-from type=registry,ref=myapp:cache \
  --cache-to type=registry,ref=myapp:cache,mode=max \
  -t myapp:latest .
```

### Puedo usar multi-stage builds con Docker Compose?

Sí. Referencia el Dockerfile y usa build args:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
  test:
    build:
      context: .
      dockerfile: Dockerfile
      target: test
```

## Tips de Rendimiento

1. **Usa `--mount=type=cache` para package managers.** Persiste cache entre builds sin inflar la imagen:

```dockerfile
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y curl
```

2. **Combina comandos RUN para reducir capas.** Cada RUN crea una capa:

```dockerfile
# Mal: 3 capas
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# Bien: 1 capa
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

3. **Usa `.dockerignore` agresivamente.** Contexto más pequeño significa builds más rápidos:

```text
# .dockerignore
# Excluir todo por defecto
*
# Incluir solo lo necesario
!package.json
!package-lock.json
!src/
!public/
!tsconfig.json
```
