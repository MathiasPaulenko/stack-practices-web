---
contentType: recipes
slug: health-check-endpoint
title: "Endpoint de Health Check"
description: "Cómo implementar un endpoint de health check listo para producción para monitoreo y load balancers."
metaDescription: "Aprende a construir un endpoint de health check en Python, JavaScript y Java. Incluye liveness, readiness y verificación de dependencias para Kubernetes y load balancers."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - health-check
  - java
  - javascript
  - kubernetes
  - liveness
  - monitoring
  - python
  - readiness
relatedResources:
  - /recipes/environment-variables
  - /recipes/cron-jobs
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a construir un endpoint de health check en Python, JavaScript y Java. Incluye liveness, readiness y verificación de dependencias para Kubernetes y load balancers."
  keywords:
    - health check endpoint
    - kubernetes liveness probe
    - readiness probe python
    - spring boot actuator health
    - monitoring endpoint
---
## Visión General

Un endpoint de health check informa a load balancers, orquestadores (Kubernetes) y herramientas de monitoreo si tu aplicación está viva y lista para recibir tráfico. Un simple `return 200` no es suficiente — los health checks de producción deben verificar el estado de dependencias críticas (base de datos, caché, cola de mensajes) para evitar servir requests cuando la app no puede cumplirlos.

## Cuándo Usar

Usa este recurso cuando:
- Desplegues en Kubernetes (livenessProbe / readinessProbe)
- Ejecutes detrás de un load balancer o reverse proxy
- configures monitoreo y alertas (Prometheus, Datadog)
- Necesites degradación graceful o lógica de circuit breaker

## Solución

### Python (FastAPI)

```python
from fastapi import FastAPI, HTTPException
import psycopg2
import redis

app = FastAPI()

def check_database():
    try:
        conn = psycopg2.connect("dbname=test user=postgres")
        conn.cursor().execute("SELECT 1")
        conn.close()
        return True
    except Exception:
        return False

def check_cache():
    try:
        r = redis.Redis(host="localhost", port=6379)
        r.ping()
        return True
    except Exception:
        return False

@app.get("/health/live")
def liveness():
    return {"status": "alive"}

@app.get("/health/ready")
def readiness():
    db_ok = check_database()
    cache_ok = check_cache()
    if db_ok and cache_ok:
        return {"status": "ready", "checks": {"db": True, "cache": True}}
    raise HTTPException(status_code=503, detail="Not ready")
```

### JavaScript (Express.js)

```javascript
const express = require("express");
const { Pool } = require("pg");

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive" });
});

app.get("/health/ready", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.status(200).json({ status: "ready", checks: { db: true } });
  } catch (err) {
    res.status(503).json({ status: "not ready", checks: { db: false } });
  }
});
```

### Java (Spring Boot Actuator)

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (Connection conn = dataSource.getConnection()) {
            if (conn.isValid(1)) {
                return Health.up().withDetail("database", "reachable").build();
            }
        } catch (Exception e) {
            return Health.down().withException(e).build();
        }
        return Health.down().withDetail("database", "timeout").build();
    }
}
```

## Explicación

Los health checks siguen el **modelo de dos probes** popularizado por Kubernetes:

- **Liveness probe** (`/health/live`): Responde "El proceso está corriendo?". Si falla, el orquestador reinicia el contenedor.
- **Readiness probe** (`/health/ready`): Responde "La app puede servir tráfico?". Si falla, el orquestador remueve el pod del load balancer del servicio.

La diferencia clave: un **liveness probe fallido dispara un reinicio**, mientras que un **readiness probe fallido solo detiene el enrutamiento de tráfico**. Nunca pongas verificaciones pesadas de dependencias en el liveness probe, o un parpadeo transitorio de la base de datos causará un loop de reinicios.

## Variantes

| Tipo de Probe | Endpoint | Verifica | Acción al Fallar |
|---------------|----------|----------|------------------|
| Liveness | `/health/live` | Proceso está corriendo | Reiniciar contenedor |
| Readiness | `/health/ready` | DB, caché, cola alcanzables | Remover del load balancer |
| Startup | `/health/startup` | App terminó inicialización | Esperar antes de otros probes |
| Deep | `/health/deep` | Test end-to-end completo | Alertar, page on-call |

## Mejores Prácticas

- **Separa liveness y readiness**: Tienen propósitos diferentes y no deben compartir el mismo endpoint.
- **Mantén liveness ligero**: Solo verifica que el proceso no se haya bloqueado (deadlock).
- **Timeout en verificaciones de dependencias**: Una base de datos lenta no debe colgar tu health check indefinidamente.
- **Retorna JSON estructurado**: Incluye estado por check para que operadores diagnostiquen rápido.
- **Loguea fallos de health check**: Pero a un nivel de log bajo para evitar ruido.

## Errores Comunes

- **Un solo endpoint para todo**: Causa reinicios innecesarios cuando una dependencia está temporalmente no disponible.
- **Sin timeout en checks de BD**: El health check se convierte en un vector de denegación de servicio.
- **Cachear resultados de health por mucho tiempo**: Un cache de 60 segundos anula el propósito del monitoreo en tiempo real.
- **Retornar 500 para readiness**: Algunos load balancers solo verifican 200; usa 503 para indisponibilidad intencional.
- **Ignorar startup probes**: Apps con inicialización larga son eliminadas por el liveness probe antes de terminar de iniciar.

## Preguntas Frecuentes

### Qué código HTTP debería retornar un readiness probe fallido?

Retorna **503 Service Unavailable**. Esto señala a load balancers y orquestadores que la instancia no debe recibir tráfico, sin disparar alertas de error.

### Debería verificar APIs externas en mi health check?

Solo si esas APIs son **críticas** para servir requests. Para dependencias no críticas, considera un estado "degraded" en lugar de "down". Nunca verifiques más de 3-4 dependencias para mantener el endpoint rápido.

### Con qué frecuencia debería Kubernetes sondear mi health endpoint?

El default es cada 10 segundos, pero ajusta según tu SLA. Para liveness, 10s es típico. Para readiness, 5s si necesitas failover rápido. Siempre configura `failureThreshold` (3) y `timeoutSeconds` (1-3) para evitar flapping.
