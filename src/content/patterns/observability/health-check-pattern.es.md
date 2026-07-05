---
contentType: patterns
slug: health-check-pattern
title: "Patrón Health Check: Exponer Liveness y Readiness Probes"
description: "Cómo implementar liveness y readiness probes para container orchestration. Cubre Kubernetes probes, dependency checks, graceful degradation, y probe endpoints."
metaDescription: "Implementa liveness y readiness probes para orchestration. Aprende Kubernetes probe configuration, dependency health checks, y graceful degradation strategies."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - health-check
  - kubernetes
  - liveness
  - readiness
  - probes
  - pattern
category: architectural
relatedResources:
  - /patterns/correlation-id-pattern
  - /patterns/structured-logging-pattern
  - /patterns/metrics-aggregation-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa liveness y readiness probes para orchestration. Aprende Kubernetes probe configuration, dependency health checks, y graceful degradation strategies."
  keywords:
    - observability
    - health-check
    - kubernetes
    - liveness
    - readiness
    - probes
    - pattern
---

## Overview

Los health checks exponen endpoints que le dicen al orchestrator si una aplicación está corriendo y lista para servir tráfico. Kubernetes, ECS, y otros orchestrators usan dos tipos de probes distintos: liveness (¿el proceso está vivo?) y readiness (¿puede el proceso manejar requests?). Los liveness probes determinan si un container debería ser restarteado. Los readiness probes determinan si un container debería recibir tráfico. Confundir los dos lleva a restarts innecesarios o tráfico enviado a instancias que no están listas.

## When to Use

- Cualquier aplicación corriendo en un container orchestrator (Kubernetes, ECS, Nomad)
- Servicios con dependencias que toman tiempo para inicializar (database connections, cache warmup)
- Aplicaciones que pueden volverse unresponsive sin crashear (deadlocks, thread exhaustion)
- Servicios que necesitan drenar connections antes de shuttear down
- Load balancer health checks para traffic routing

## When NOT to Use

- Scripts simples o batch jobs — no hay long-running process para probeear
- Aplicaciones sin external dependencies — un simple process check alcanza
- Cuando el orchestrator no soporta probes — usá un process manager en su lugar
- Para internal health monitoring — usá metrics y alerting, no probes

## Solution

### Health endpoint básico (Python/FastAPI)

```python
# Python — basic health check endpoint
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/health")
async def health():
    """Basic liveness check — el proceso está vivo."""
    return {"status": "healthy"}

@app.get("/health/live")
async def liveness():
    """Liveness probe — está corriendo el proceso?"""
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness():
    """Readiness probe — podemos servir tráfico?"""
    checks = await run_dependency_checks()
    all_healthy = all(checks.values())

    if not all_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not ready", "checks": checks},
        )

    return {"status": "ready", "checks": checks}

async def run_dependency_checks():
    return {
        "database": await check_database(),
        "redis": await check_redis(),
        "message_queue": await check_message_queue(),
    }
```

### Dependency checks con timeouts

```python
# Python — dependency checks con timeouts
import asyncio
import asyncpg
import redis.asyncio as aioredis

async def check_database(timeout: float = 2.0) -> bool:
    try:
        async with asyncpg.create_pool("postgresql://localhost/myapp") as pool:
            async with pool.acquire() as conn:
                await asyncio.wait_for(
                    conn.execute("SELECT 1"),
                    timeout=timeout,
                )
        return True
    except (asyncio.TimeoutError, Exception):
        return False

async def check_redis(timeout: float = 1.0) -> bool:
    try:
        client = aioredis.from_url("redis://localhost:6379")
        return await asyncio.wait_for(client.ping(), timeout=timeout)
    except (asyncio.TimeoutError, Exception):
        return False

async def check_message_queue(timeout: float = 2.0) -> bool:
    try:
        # Check si podemos conectar a RabbitMQ
        connection = await asyncio.wait_for(
            aio_pika.connect_robust("amqp://localhost"),
            timeout=timeout,
        )
        await connection.close()
        return True
    except (asyncio.TimeoutError, Exception):
        return False
```

### Kubernetes probe configuration

```yaml
# Kubernetes deployment con liveness y readiness probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: order-service:1.0.0
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
          startupProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 30
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

### Express.js health checks

```javascript
// JavaScript — Express health check endpoints
const express = require('express');
const app = express();

// Liveness — el proceso está vivo
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', uptime: process.uptime() });
});

// Readiness — puede servir tráfico
app.get('/health/ready', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    queue: await checkQueue(),
  };

  const allHealthy = Object.values(checks).every(v => v === true);

  if (allHealthy) {
    res.json({ status: 'ready', checks });
  } else {
    res.status(503).json({ status: 'not ready', checks });
  }
});

// Comprehensive health endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    queue: await checkQueue(),
    diskSpace: checkDiskSpace(),
    memoryUsage: checkMemoryUsage(),
  };

  const status = Object.values(checks).every(v => v === true)
    ? 'healthy'
    : 'degraded';

  res.json({
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

async function checkDatabase() {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function checkRedis() {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

function checkMemoryUsage() {
  const used = process.memoryUsage().rss;
  const max = 512 * 1024 * 1024; // 512MB limit
  return used < max;
}
```

### Java Spring Boot health checks

```java
// Java — Spring Boot Actuator health indicators
import org.springframework.boot.actuate.health.*;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHealthIndicator extends AbstractHealthIndicator {

    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    protected void doHealthCheck(Health.Builder builder) {
        try (Connection conn = dataSource.getConnection()) {
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("SELECT 1");
            }
            builder.up().withDetail("database", "PostgreSQL").withDetail("status", "connected");
        } catch (SQLException e) {
            builder.down().withDetail("error", e.getMessage());
        }
    }
}

@Component
public class RedisHealthIndicator extends AbstractHealthIndicator {

    private final RedisTemplate<String, String> redisTemplate;

    public RedisHealthIndicator(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected void doHealthCheck(Health.Builder builder) {
        try {
            String response = redisTemplate.getConnectionFactory()
                .getConnection().ping();
            builder.up().withDetail("redis", response);
        } catch (Exception e) {
            builder.down().withDetail("error", e.getMessage());
        }
    }
}

// application.yml — configurar health endpoints
// management:
//   endpoints:
//     web:
//       exposure:
//         include: health,info,metrics
//   endpoint:
//     health:
//       probes:
//         enabled: true
//       show-details: always
//   health:
//     livenessstate:
//       enabled: true
//     readinessstate:
//       enabled: true
```

### Graceful shutdown con health checks

```python
# Python — graceful shutdown con readiness probe
import signal
import asyncio
from fastapi import FastAPI

app = FastAPI()
shutting_down = False

@app.on_event("shutdown")
async def shutdown_event():
    global shutting_down
    shutting_down = True
    # Drenar in-flight requests
    await drain_connections(timeout=30)

@app.get("/health/ready")
async def readiness():
    if shutting_down:
        return JSONResponse(
            status_code=503,
            content={"status": "shutting down"},
        )
    # Normal readiness check
    checks = await run_dependency_checks()
    if not all(checks.values()):
        return JSONResponse(status_code=503, content={"status": "not ready", "checks": checks})
    return {"status": "ready", "checks": checks}

async def drain_connections(timeout: int = 30):
    """Esperar que in-flight requests completen."""
    deadline = asyncio.get_event_loop().time() + timeout
    while active_requests > 0:
        if asyncio.get_event_loop().time() > deadline:
            break
        await asyncio.sleep(0.5)
```

### Startup probe para slow initializers

```python
# Python — startup probe para aplicaciones con slow initialization
import time
from fastapi import FastAPI

app = FastAPI()
startup_time = time.time()
ready_since = None

@app.get("/health/startup")
async def startup_probe():
    """Startup probe — está la app todavía inicializándose?"""
    if ready_since is None:
        return JSONResponse(status_code=503, content={"status": "starting"})
    return {"status": "started", "ready_since": ready_since}

@app.get("/health/ready")
async def readiness():
    global ready_since
    if ready_since is None:
        # Check si la inicialización está completa
        if await is_initialization_complete():
            ready_since = time.time()
        else:
            return JSONResponse(status_code=503, content={"status": "initializing"})
    # Normal readiness check
    return {"status": "ready"}
```

### Composite health check con circuit breakers

```javascript
// JavaScript — composite health con circuit breaker states
const CircuitBreaker = require('opossum');

const dbBreaker = new CircuitBreaker(queryDatabase, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

app.get('/health/ready', async (req, res) => {
  const checks = {};

  // Database check via circuit breaker
  try {
    await dbBreaker.fire('SELECT 1');
    checks.database = {
      status: dbBreaker.opened ? 'degraded' : 'healthy',
      circuitState: dbBreaker.status,
    };
  } catch {
    checks.database = {
      status: 'unhealthy',
      circuitState: dbBreaker.status,
    };
  }

  const allHealthy = Object.values(checks)
    .every(c => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
  });
});
```

## Variants

### Health check con dependency graph

```python
# Python — health check con dependency graph
class HealthChecker:
    def __init__(self):
        self.dependencies = {}

    def register(self, name, check_fn, dependencies=None):
        self.dependencies[name] = {
            "check": check_fn,
            "deps": dependencies or [],
        }

    async def check_all(self):
        results = {}
        for name, config in self.dependencies.items():
            # Check dependencies primero
            dep_results = {dep: results.get(dep, False) for dep in config["deps"]}
            if not all(dep_results.values()):
                results[name] = {
                    "status": "skipped",
                    "reason": f"Dependencies unhealthy: {[d for d, v in dep_results.items() if not v]}",
                }
                continue

            try:
                healthy = await config["check"]()
                results[name] = {"status": "healthy" if healthy else "unhealthy"}
            except Exception as e:
                results[name] = {"status": "unhealthy", "error": str(e)}

        return results

# Usage
checker = HealthChecker()
checker.register("database", check_database)
checker.register("redis", check_redis)
checker.register("cache", check_cache, dependencies=["redis"])
checker.register("api", check_api, dependencies=["database", "cache"])
```

### TCP-based health check

```yaml
# Kubernetes — TCP socket probe para non-HTTP services
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: tcp-service
      image: tcp-service:1.0
      livenessProbe:
        tcpSocket:
          port: 5432
        initialDelaySeconds: 15
        periodSeconds: 10
      readinessProbe:
        tcpSocket:
          port: 5432
        initialDelaySeconds: 5
        periodSeconds: 5
```

### Command-based health check

```python
# Python — command-based probe para worker processes
# probe_script.py
import sys
import psycopg2

def check_worker_health():
    try:
        conn = psycopg2.connect("postgresql://localhost/myapp")
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM jobs WHERE status = 'processing'")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()

        # Worker está healthy si está processing jobs o la queue está empty
        return True
    except Exception:
        return False

if __name__ == "__main__":
    if check_worker_health():
        print("healthy")
        sys.exit(0)
    else:
        print("unhealthy")
        sys.exit(1)
```

```yaml
# Kubernetes — command-based probe
spec:
  containers:
    - name: worker
      image: worker:1.0
      livenessProbe:
        exec:
          command:
            - python
            - /app/probe_script.py
        initialDelaySeconds: 30
        periodSeconds: 60
```

## Best Practices

- Separá liveness y readiness — liveness checks si el proceso está vivo, readiness checks si puede servir tráfico
- Mantené liveness simple — no checkees dependencies en liveness, solo el proceso mismo
- Usá startup probes para slow initializers — previene restarts prematuros durante boot
- Seteá timeouts razonables — 2-3 segundos para HTTP probes, más largo para startup
- Retorná 503 cuando no está ready — los orchestrators usan HTTP status codes, no response body
- Incluí dependency details en readiness — ayuda a debuggear por qué un service no está ready
- Implementá graceful shutdown — retorná 503 de readiness durante shutdown para parar tráfico
- No over-checkees — checkear cada segundo es excesivo; cada 5-10 segundos es suficiente
- Usá circuit breakers en health checks — no dejes que un slow dependency haga timeout tu health check

## Common Mistakes

- **Mismo endpoint para liveness y readiness**: si readiness falla (database down), liveness también falla, causando restarts innecesarios. Usá endpoints separados.
- **Checkear dependencies en liveness**: liveness debería solo verificar que el proceso está corriendo. Dependency checks pertenecen a readiness.
- **No startup probe**: aplicaciones slow-starting se matan antes de terminar de inicializar. Usá startup probes con high failureThreshold.
- **Probe demasiado aggressive**: checkear cada 1 segundo con 1-second timeout causa false failures under load. Usá 5-10 second intervals.
- **No manejar graceful shutdown**: durante shutdown, el proceso está vivo pero no puede servir tráfico. Readiness debería retornar 503 inmediatamente.

## FAQ

### ¿Cuál es la diferencia entre liveness y readiness probes?

Liveness checks si el proceso está vivo y debería ser restarteado si no. Readiness checks si el proceso puede servir tráfico y debería ser removido del load balancer si no. Un proceso puede estar vivo pero no ready (e.g., warming up cache).

### ¿Cuándo debería usar un startup probe?

Cuando tu aplicación toma más de 30 segundos para inicializar (loading large models, warming caches, estableciendo muchas connections). Los startup probes le dan a la app tiempo para bootear sin liveness probe restarts.

### ¿Deberían los health checks checkear todas las dependencies?

Readiness debería checkear dependencies que afectan el request handling (database, cache). Liveness no debería — una database dead no significa que tu proceso necesita un restart.

### ¿Qué HTTP status code deberían retornar los health checks?

200 para healthy/ready, 503 para unhealthy/not ready. Los orchestrators usan HTTP status codes, no el response body, para determinar health.

### ¿Cómo manejo graceful shutdown?

Al recibir SIGTERM, inmediatamente retorná 503 de readiness para parar new traffic. Esperá que in-flight requests completen, después salí. Kubernetes da 30 segundos por default antes de mandar SIGKILL.
