---
contentType: recipes
slug: docker-health-check-configuration
title: "Configuración de Docker Health Check para Confiabilidad"
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

### Endpoint de Health en Java (Spring Boot)

```java
// src/main/java/com/example/HealthController.java
package com.example;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@RestController
public class HealthController {

    @GetMapping("/health")
    public String health() {
        return "{\"status\":\"healthy\"}";
    }
}

@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        // Verificar conectividad a base de datos
        try {
            // Ejecutar query simple
            return Health.up().withDetail("database", "reachable").build();
        } catch (Exception e) {
            return Health.down().withDetail("error", e.getMessage()).build();
        }
    }
}
```

```yaml
# application.yml — Habilitar endpoints de health de actuator
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when_authorized
```

### Script de Health Check Multi-Paso

```bash
#!/bin/bash
# healthcheck-advanced.sh — Verificación de health multi-paso
set -e

FAIL=0

# Paso 1: Verificar endpoint HTTP
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "FAIL: Endpoint HTTP devolvió $HTTP_CODE"
    FAIL=1
fi

# Paso 2: Verificar espacio en disco
DISK_USAGE=$(df / | awk 'NR==2 {print int($5)}')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "FAIL: Uso de disco al ${DISK_USAGE}%"
    FAIL=1
fi

# Paso 3: Verificar si el proceso crítico está corriendo
if ! pgrep -x "gunicorn" > /dev/null; then
    echo "FAIL: proceso gunicorn no encontrado"
    FAIL=1
fi

# Paso 4: Verificar uso de memoria
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 95 ]; then
    echo "FAIL: Uso de memoria al ${MEM_USAGE}%"
    FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
    exit 0
else
    exit 1
fi
```

### Health Check con Logging

```bash
#!/bin/bash
# healthcheck-logged.sh — Health check con log de auditoría
LOG_FILE="/var/log/healthcheck.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "$TIMESTAMP OK HTTP=$HTTP_CODE" >> "$LOG_FILE"
    exit 0
else
    echo "$TIMESTAMP FAIL HTTP=$HTTP_CODE" >> "$LOG_FILE"
    exit 1
fi
```

### Override de Docker Compose para Tuning de Health Check

```yaml
# docker-compose.prod.yml — Override de health check para producción
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 15s
      timeout: 3s
      retries: 5
      start_period: 30s

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d mydb && psql -U postgres -d mydb -c 'SELECT 1'"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 60s
```

```bash
# Aplicar overrides de health check de producción
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Health Check para Worker de Message Queue

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci --omit=dev

# Health check para un worker que procesa mensajes de queue
HEALTHCHECK --interval=60s --timeout=10s --retries=3 --start-period=30s \
    CMD node -e " \
        const fs = require('fs'); \
        const stats = fs.statSync('/tmp/worker.heartbeat'); \
        const age = (Date.now() - stats.mtimeMs) / 1000; \
        if (age > 120) { console.error('Heartbeat stale: ' + age + 's'); process.exit(1); } \
        console.log('Heartbeat OK: ' + age + 's'); \
    "

CMD ["node", "worker.js"]
```

```javascript
// worker.js — Escribir archivo de heartbeat periódicamente
const fs = require("fs");

setInterval(() => {
    fs.writeFileSync("/tmp/worker.heartbeat", new Date().toISOString());
}, 30000);
```

## Mejores Prácticas Adicionales

1. **Usa `CMD-SHELL` para checks complejos.** Permite features de shell como pipes y condicionales:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD-SHELL "curl -f http://localhost:3000/health || exit 1"
```

2. **Diferencia endpoints de liveness vs readiness.** Liveness debe ser barato y sin dependencias:

```javascript
// Liveness: solo verificar que el proceso está vivo
app.get("/health", (req, res) => res.json({ status: "alive" }));

// Readiness: verificar dependencias
app.get("/ready", async (req, res) => {
    try {
        await db.ping();
        await redis.ping();
        res.json({ status: "ready" });
    } catch (err) {
        res.status(503).json({ status: "not ready", error: err.message });
    }
});
```

3. **Setea `start_period` según el tipo de app.** Diferentes apps necesitan diferentes períodos de gracia:

| Tipo de App | start_period | interval | timeout |
|----------|-------------|----------|---------|
| Node.js API | 10s | 30s | 5s |
| Python ML | 60s | 30s | 10s |
| Java Spring | 30s | 15s | 5s |
| Base de datos | 60s | 10s | 5s |
| Worker | 30s | 60s | 10s |

## Errores Comunes Adicionales

1. **Health check depende de servicios externos.** Si tu health check llama a una API externa, una respuesta lenta marca el contenedor unhealthy:

```dockerfile
# Mal: depende de servicio externo
HEALTHCHECK CMD curl -f https://api.external.com/health

# Bien: check solo endpoint local
HEALTHCHECK CMD curl -f http://localhost:3000/health
```

2. **Usar `CMD-SHELL` cuando `CMD` funciona.** Shell form spawnea un proceso shell, añadiendo overhead:

```dockerfile
# Ligeramente más lento (spawnea /bin/sh)
HEALTHCHECK CMD-SHELL "curl -f http://localhost:3000/health"

# Más rápido (exec directo)
HEALTHCHECK CMD ["curl", "-f", "http://localhost:3000/health"]
```

3. **No monitorear fallos de health check.** Setea alertas para contenedores que cambian entre healthy y unhealthy:

```bash
# Alertar sobre contenedores unhealthy
docker ps --filter "health=unhealthy" --format "{{.Names}}"
```

## FAQ Adicional

### Como veo el historial de health checks?

```bash
# Mostrar últimos 5 resultados de health check
docker inspect --format='{{range .State.Health.Log}}{{.ExitCode}} {{.End}}: {{.Output}}{{end}}' <container>

# Pretty print último health check
docker inspect <container> | jq '.[0].State.Health.Log[-1]'
```

### Como ejecuto un health check manualmente?

```bash
# Trigger un health check inmediatamente
docker exec <container> curl -f http://localhost:3000/health

# O ejecutar el comando de health check directamente
docker inspect --format='{{.Config.Healthcheck.Test}}' <container>
```

### Debo agregar health checks a Dockerfiles de desarrollo?

Para desarrollo, los health checks aportan valor en Compose para ordering de `depends_on`. Usa intervalos más largos para evitar overhead:

```dockerfile
# Dev: menos agresivo
HEALTHCHECK --interval=60s --timeout=10s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:3000/health || exit 1
```

## Tips de Rendimiento

1. **Mantén los comandos de health check rápidos.** Apunta a menos de 1 segundo de ejecución:

```bash
# Rápido: check HTTP simple
curl -sf -m 2 http://localhost:3000/health

# Lento: query a base de datos
psql -c "SELECT count(*) FROM large_table"  # No hacer esto
```

2. **Usa `--start-period` para evitar falsos negativos durante el boot.** Setealo al tiempo típico de arranque de tu app más 50 por ciento de margen:

```dockerfile
# App tarda ~20s en bootear, setear start-period a 30s
HEALTHCHECK --start-period=30s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3000/health
```

3. **Evita health checks que escriben a disco.** Cada check corre frecuentemente y puede llenar el disco con logs:

```bash
# Mal: escribe a disco cada 30s
HEALTHCHECK CMD curl -f http://localhost:3000/health >> /var/log/health.log

# Bien: sin escrituras a disco
HEALTHCHECK CMD curl -sf http://localhost:3000/health
```
