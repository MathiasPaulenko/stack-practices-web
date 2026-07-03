---
contentType: recipes
slug: docker-health-check-configuration
title: "Configuración de Docker Health Check para Confiabilidad de Contenedores"
description: "Añade health checks proper a contenedores Docker con HEALTHCHECK"
metaDescription: "Configura instrucciones Docker HEALTHCHECK con curl, wget y scripts custom. Aprende interval, timeout, retries y start-period para contenedores confiables."
difficulty: beginner
topics:
  - devops
tags:
  - docker
  - health-check
  - container
  - reliability
  - dockerfile
  - monitoring
relatedResources:
  - /recipes/docker-multi-stage-build-optimization
  - /recipes/docker-compose-dev-prod-split
  - /guides/terraform-best-practices-guide
  - /patterns/claim-check-pattern
  - /docs/deployment-checklist-template
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Configura instrucciones Docker HEALTHCHECK con curl, wget y scripts custom. Aprende interval, timeout, retries y start-period para contenedores confiables."
  keywords:
    - docker healthcheck
    - docker container health check
    - healthcheck dockerfile
    - docker health check interval
    - container reliability docker
    - docker healthcheck curl wget
---

## Visión General

La instrucción `HEALTHCHECK` de Docker le dice a Docker cómo verificar si un contenedor está sano. Sin ella, Docker solo sabe si un contenedor está corriendo, no si la aplicación dentro está realmente sirviendo peticiones. Los health checks habilitan a los orquestadores para reiniciar contenedores no sanos automáticamente.

## Cuándo Usar

- Ejecutas contenedores en producción y necesitas reinicio automático ante fallos
- Usas Docker Swarm o Kubernetes y necesitas estado de salud para scheduling
- Quieres que `docker ps` muestre el estado de salud (healthy/unhealthy)
- Tu app puede estar corriendo pero no respondiendo (deadlocks, agotamiento de memoria, conexiones atascadas)

## Solución

### HEALTHCHECK básico con curl

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY . .
RUN npm ci --omit=dev

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
```

### HEALTHCHECK con wget (imágenes Alpine sin curl)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci --omit=dev

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

### HEALTHCHECK con script personalizado

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

COPY healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
    CMD /healthcheck.sh

EXPOSE 8000
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

```bash
#!/bin/bash
# healthcheck.sh
set -e

# Verificar si el endpoint HTTP responde
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)

if [ "$response" = "200" ]; then
    exit 0
else
    echo "Health check falló: HTTP $response"
    exit 1
fi
```

### HEALTHCHECK para PostgreSQL

```dockerfile
FROM postgres:16-alpine

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD pg_isready -U postgres -d mydb || exit 1
```

### HEALTHCHECK para Redis

```dockerfile
FROM redis:7-alpine

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD redis-cli ping | grep PONG || exit 1
```

### Healthcheck en Docker Compose con depends_on

```yaml
# docker-compose.yml
services:
    api:
        build: .
        ports:
            - "3000:3000"
        healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
            interval: 30s
            timeout: 5s
            retries: 3
            start_period: 10s

    worker:
        build: ./worker
        depends_on:
            api:
                condition: service_healthy
            redis:
                condition: service_healthy

    redis:
        image: redis:7-alpine
        healthcheck:
            test: ["CMD", "redis-cli", "ping"]
            interval: 10s
            timeout: 3s
            retries: 3
```

### Endpoint de health en Node.js

```javascript
const http = require("http");

const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy" }));
        return;
    }
    // ... otras rutas
});

server.listen(3000);
```

### Endpoint de health en Python (FastAPI)

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

## Explicación

La instrucción `HEALTHCHECK` toma cuatro opciones:

- **`--interval`**: Tiempo entre verificaciones (por defecto 30s). Usa intervalos más cortos para servicios críticos.
- **`--timeout`**: Tiempo máximo de espera antes de marcar como fallido (por defecto 30s).
- **`--retries`**: Fallos consecutivos antes de marcar unhealthy (por defecto 3).
- **`--start-period`**: Período de gracia antes de contar fallos (por defecto 0s). Da tiempo a la app para arrancar.

El comando debe devolver exit code 0 (sano) o 1 (no sano). Docker ejecuta el comando dentro del contenedor.

Estados de salud:
- **starting**: Estado inicial durante `start-period`. No se cuenta como fallo.
- **healthy**: La última verificación devolvió exit 0.
- **unhealthy**: `retries` verificaciones consecutivas fallaron.

En Docker Compose, `depends_on` con `condition: service_healthy` espera a que una dependencia pase su health check antes de arrancar. Esto resuelve problemas de orden de inicio.

## Variantes

| Método de Check | Requisito de Imagen | Usar Cuando |
|-------------|-------------------|----------|
| curl -f | curl instalado | Check HTTP estándar |
| wget --spider | wget instalado | Alpine sin curl |
| Script personalizado | bash + herramientas | Checks multi-paso |
| pg_isready | Imagen PostgreSQL | Readiness de base de datos |
| redis-cli ping | Imagen Redis | Readiness de caché |
| node -e | Imagen Node.js | Check basado en JS |

## Pautas

- Siempre agregar un `HEALTHCHECK` a Dockerfiles de producción.
- Configurar `--start-period` al tiempo de arranque de tu app (10-30s para la mayoría).
- Usar `--interval=30s` para servicios generales, `10s` para infraestructura crítica.
- Mantener `--timeout` corto (3-10s). Un health check lento es peor que ninguno.
- Crear un endpoint `/health` dedicado que devuelva 200 sin efectos secundarios.
- Verificar la aplicación real, no solo el puerto. Un check TCP abierto no es suficiente.
- Usar `depends_on` con `condition: service_healthy` en Compose para orden de inicio.
- Para bases de datos, usar herramientas integradas (`pg_isready`, `redis-cli ping`) en lugar de HTTP.

## Errores Comunes

- No configurar `--start-period`. Apps de arranque lento se marcan unhealthy antes de terminar de bootear.
- Usar un health check que golpea la base de datos. Esto añade carga y puede causar fallos en cascada.
- Configurar `--interval` muy bajo (1-5s). Esto gasta CPU y puede sobrecargar la app con peticiones de health.
- No crear un endpoint de health dedicado. Verificar `/` puede devolver 200 incluso si la API está rota.
- Olvidar instalar curl o wget en la imagen. El health check falla silenciosamente.
- Devolver HTTP 200 para páginas de error. Algunos frameworks devuelven 200 para todo, rompiendo el check.
- No usar `depends_on` con `condition: service_healthy`. Los contenedores arrancan antes de que las dependencias estén listas.

## Preguntas Frecuentes

### ¿Qué pasa cuando un contenedor se marca unhealthy?

Docker reporta el estado en `docker ps`. Docker Swarm reinicia automáticamente contenedores unhealthy. En Kubernetes, los health checks mapean a liveness/readiness probes y disparan reinicios de pods.

### ¿Debo usar el mismo endpoint para liveness y readiness?

No. Liveness verifica si la app está viva (debe ser barato, sin dependencias). Readiness verifica si la app puede servir peticiones (puede verificar conectividad a base de datos). Usa `/health` para liveness y `/ready` para readiness.

### ¿Puedo deshabilitar un health check de la imagen base?

Sí. Usa `HEALTHCHECK NONE` en tu Dockerfile para deshabilitar health checks heredados.

### ¿Cómo verifico la salud del contenedor desde la CLI?

```bash
docker inspect --format='{{.State.Health.Status}}' <container-name>
```

Esto devuelve `healthy`, `unhealthy`, o `starting`.
