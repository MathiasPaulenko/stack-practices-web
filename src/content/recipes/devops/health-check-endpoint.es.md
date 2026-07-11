---
contentType: recipes
slug: health-check-endpoint
title: "Endpoint de Health Check"
description: "Cómo implementar un endpoint de health check listo para producción para monitoreo y load balancers."
metaDescription: "Aprende a construir un endpoint de health check en Python, JavaScript y Java. Liveness, readiness y verificación de dependencias para Kubernetes y load balancers."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - health-check
  - java
  - ci-cd
  - automation
relatedResources:
  - /recipes/environment-variables
  - /recipes/cron-jobs
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a construir un endpoint de health check en Python, JavaScript y Java. Liveness, readiness y verificación de dependencias para Kubernetes y load balancers."
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
- Desplegues en Kubernetes (livenessProbe / readinessProbe). Consulta [Docker Basics](/recipes/devops/docker-basics) para fundamentos de contenedores.
- Ejecutes detrás de un load balancer o reverse proxy. Consulta [Rate Limiting](/recipes/api/rate-limiting) para protección de APIs.
- configures monitoreo y alertas (Prometheus, Datadog). Consulta [Prometheus API Monitoring](/recipes/observability/prometheus-api-monitoring) para colección de métricas.
- Necesites degradación graceful o lógica de circuit breaker. Consulta [Circuit Breaker](/patterns/design/circuit-breaker-pattern) para aislamiento de fallas.

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

## Lo que funciona

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

### Go (net/http) Health Check

```go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "net/http"
    "time"

    _ "github.com/lib/pq"
    "github.com/redis/go-redis/v9"
)

type HealthStatus struct {
    Status string                 `json:"status"`
    Checks map[string]bool        `json:"checks"`
}

var db *sql.DB
var rdb *redis.Client

func checkDB() bool {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    return db.PingContext(ctx) == nil
}

func checkRedis() bool {
    ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel()
    return rdb.Ping(ctx).Err() == nil
}

func livenessHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthStatus{Status: "alive", Checks: nil})
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    checks := map[string]bool{
        "db":    checkDB(),
        "redis": checkRedis(),
    }
    allOK := true
    for _, ok := range checks {
        if !ok {
            allOK = false
        }
    }
    w.Header().Set("Content-Type", "application/json")
    if allOK {
        w.WriteHeader(http.StatusOK)
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
    }
    json.NewEncoder(w).Encode(HealthStatus{Status: map[bool]string{true: "ready", false: "not ready"}[allOK], Checks: checks})
}

func main() {
    http.HandleFunc("/health/live", livenessHandler)
    http.HandleFunc("/health/ready", readinessHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Configuración de Probes en Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: myapp:v1.2.0
        ports:
        - containerPort: 8080

        # Liveness: reiniciar si el proceso se bloquea
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 2
          failureThreshold: 3

        # Readiness: detener tráfico si las dependencias fallan
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

        # Startup: esperar a que la app termine de inicializar
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 30  # Hasta 150s para startup
```

### Health Check Compuesto con Circuit Breaker

```python
import time
from dataclasses import dataclass, field
from enum import Enum

class State(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_timeout: int = 30
    state: State = State.CLOSED
    failure_count: int = 0
    last_failure_time: float = field(default=0)

    def call(self, check_func):
        if self.state == State.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = State.HALF_OPEN
            else:
                return False

        try:
            result = check_func()
            if result:
                self._on_success()
            else:
                self._on_failure()
            return result
        except Exception:
            self._on_failure()
            return False

    def _on_success(self):
        self.failure_count = 0
        self.state = State.CLOSED

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = State.OPEN

# Uso en health check
db_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=30)

def check_database_with_breaker():
    return db_breaker.call(check_database)
```

### Health Check con Timeout y Caching

```javascript
const express = require("express");
const { Pool } = require("pg");

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Cachear resultado de readiness por 5 segundos
let readinessCache = { result: null, timestamp: 0 };
const READINESS_CACHE_TTL = 5000;

async function checkDB() {
  const client = await db.connect();
  try {
    await Promise.race([
      client.query("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 2000)
      ),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    client.release();
  }
}

app.get("/health/ready", async (req, res) => {
  const now = Date.now();
  if (readinessCache.result !== null && now - readinessCache.timestamp < READINESS_CACHE_TTL) {
    const status = readinessCache.result ? 200 : 503;
    return res.status(status).json({
      status: readinessCache.result ? "ready" : "not ready",
      cached: true,
      checks: { db: readinessCache.result },
    });
  }

  const dbOk = await checkDB();
  readinessCache = { result: dbOk, timestamp: now };
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status: dbOk ? "ready" : "not ready",
    cached: false,
    checks: { db: dbOk },
  });
});
```

### Integración de Health Check en Docker Compose

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/ready"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 15s
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 2s
      retries: 5
```

## Mejores Prácticas Adicionales

6. **Usa startup probes para apps de inicialización lenta.** Java Spring Boot o modelos ML de Python pueden necesitar 60+ segundos para iniciar. Sin un startup probe, el liveness probe mata el contenedor antes de que termine de inicializar:

```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  failureThreshold: 30
  periodSeconds: 5  # 150s máximo para startup
```

7. **Diferencia entre dependencias críticas y no críticas.** No toda falla de dependencia debería hacer la app "not ready":

```python
def readiness():
    critical_ok = check_database()  # Crítico: bloquea readiness
    non_critical_ok = check_cache()  # No crítico: degradado pero funcional

    if not critical_ok:
        return {"status": "not ready", "checks": {"db": False, "cache": non_critical_ok}}, 503
    return {"status": "ready" if non_critical_ok else "degraded", "checks": {"db": True, "cache": non_critical_ok}}, 200
```

8. **Establece headers Content-Type apropiados.** Siempre retorna `application/json` para que las herramientas de monitoreo puedan parsear la respuesta:

```python
@app.get("/health/ready")
def readiness():
    response = jsonify({"status": "ready"})
    response.headers["Content-Type"] = "application/json"
    return response
```

## Errores Comunes Adicionales

6. **El endpoint de health check requiere autenticación.** Los load balancers y probes de Kubernetes no envían tokens de auth. Mantén los endpoints de health públicos:

```python
# Excluir endpoints de health del middleware de auth
app.middleware("http")(auth_middleware, exclude_paths=["/health/live", "/health/ready"])
```

7. **Usar health checks para recolección de métricas.** Los health checks deben ser rápidos y ligeros. Usa `/metrics` (formato Prometheus) para métricas, no `/health`.

8. **No testear el comportamiento del health check durante fallas.** Simula fallas de dependencias en staging para verificar que tu health check responde correctamente:

```bash
# Simular falla de DB
$ docker stop db
$ curl http://localhost:3000/health/ready
{"status":"not ready","checks":{"db":false}}
$ docker start db
$ curl http://localhost:3000/health/ready
{"status":"ready","checks":{"db":true}}
```

## FAQ Adicional

### ¿Debería incluir CPU y memoria en los health checks?

No. CPU y memoria son métricas de infraestructura, no indicadores de salud de la aplicación. Usa herramientas de monitoreo (Prometheus, Datadog) para métricas de recursos. Los health checks solo deberían verificar readiness a nivel de aplicación.

### ¿Cuál es la diferencia entre `/health` y `/healthz`?

La convención `/healthz` viene de Kubernetes (el sufijo `z` es una convención de Kubernetes para endpoints de "status"). Ambos funcionan igual de bien. Elige uno y sé consistente en todos tus servicios.

### ¿Cómo implemento un shutdown graceful con health checks?

Al recibir una señal de shutdown (SIGTERM), inmediatamente empieza a retornar 503 desde el readiness probe. Esto le dice al load balancer que deje de enviar nuevos requests. Luego espera a que los requests en vuelo terminen antes de salir:

```javascript
let isShuttingDown = false;

process.on("SIGTERM", () => {
  isShuttingDown = true;
  console.log("Shutting down gracefully...");
  setTimeout(() => process.exit(0), 10000);
});

app.get("/health/ready", (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: "shutting down" });
  }
  // Verificación normal de readiness...
});
```

## Tips de Rendimiento

1. **Mantén los liveness probes bajo 1ms.** El liveness probe solo debería verificar el estado del proceso — sin I/O, sin llamadas de red:

```python
@app.get("/health/live")
def liveness():
    return {"status": "alive"}  # Respuesta instantánea
```

2. **Cachea resultados de readiness por 5-10 segundos.** Evita golpear dependencias en cada verificación de probe:

```python
from functools import lru_cache
import time

_readiness_cache = {"result": None, "ts": 0}

@app.get("/health/ready")
def readiness():
    now = time.time()
    if _readiness_cache["result"] and now - _readiness_cache["ts"] < 5:
        return _readiness_cache["result"]
    # Realizar verificaciones...
```

3. **Usa connection pooling para verificaciones de DB.** Abrir una nueva conexión en cada health check es costoso:

```python
# Reutilizar el connection pool de la app
db_pool = psycopg2.pool.SimpleConnectionPool(1, 5, dsn=DATABASE_URL)

def check_database():
    conn = db_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        return True
    finally:
        db_pool.putconn(conn)
```

4. **Paraleliza verificaciones de dependencias.** Verifica múltiples dependencias concurrentemente:

```python
import concurrent.futures

def readiness():
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        db_future = executor.submit(check_database)
        cache_future = executor.submit(check_cache)
        queue_future = executor.submit(check_message_queue)

        checks = {
            "db": db_future.result(timeout=2),
            "cache": cache_future.result(timeout=2),
            "queue": queue_future.result(timeout=2),
        }
    return checks
```

5. **Usa TCP probes para verificaciones muy ligeras.** Si el overhead de parsing HTTP importa, usa un probe de TCP socket:

```yaml
livenessProbe:
  tcpSocket:
    port: 8080
  periodSeconds: 10
```
