---
contentType: recipes
slug: health-check-endpoint
title: "Health Check Endpoint"
description: "How to implement a production-ready health check endpoint for monitoring and load balancers."
metaDescription: "Learn to build a health check endpoint in Python, JavaScript, and Java. Includes liveness, readiness, and dependency checks for Kubernetes and load balancers."
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
  metaDescription: "Learn to build a health check endpoint in Python, JavaScript, and Java. Includes liveness, readiness, and dependency checks for Kubernetes and load balancers."
  keywords:
    - health-check
    - monitoring
    - kubernetes
    - liveness
    - readiness
    - python
    - javascript
    - java
---
## Overview

A health check endpoint tells load balancers, orchestrators (Kubernetes), and monitoring tools whether your application is alive and ready to serve traffic. A naive `return 200` is not enough — production health checks must verify the state of critical dependencies (database, cache, message queue) to prevent serving requests when the app cannot fulfill them.

## When to Use

Use this resource when:
- Deploying on Kubernetes (livenessProbe / readinessProbe). See [Docker Basics](/recipes/devops/docker-basics) for container fundamentals.
- Running behind a load balancer or reverse proxy. See [Rate Limiting](/recipes/api/rate-limiting) for API protection.
- Setting up monitoring and alerting (Prometheus, Datadog). See [Prometheus API Monitoring](/recipes/observability/prometheus-api-monitoring) for metrics collection.
- You need graceful degradation or circuit breaker logic. See [Circuit Breaker](/patterns/design/circuit-breaker-pattern) for failure isolation.

## Solution

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

## Explanation

Health checks follow the **two-probe model** popularized by Kubernetes:

- **Liveness probe** (`/health/live`): Answers "Is the process running?" If it fails, the orchestrator restarts the container.
- **Readiness probe** (`/health/ready`): Answers "Can the app serve traffic?" If it fails, the orchestrator removes the pod from the service load balancer.

The key difference: a **failing liveness probe triggers a restart**, while a **failing readiness probe only stops traffic routing**. Never put heavy dependency checks in the liveness probe, or a transient database blip will cause a container restart loop.

## Variants

| Probe Type | Endpoint | Checks | Failure Action |
|------------|----------|--------|----------------|
| Liveness | `/health/live` | Process is running | Restart container |
| Readiness | `/health/ready` | DB, cache, queue reachable | Remove from load balancer |
| Startup | `/health/startup` | App finished initialization | Wait before other probes |
| Deep | `/health/deep` | Full end-to-end test | Alert, page on-call |

## What Works

- **Separate liveness and readiness**: They serve different purposes and should not share the same endpoint.
- **Keep liveness lightweight**: Only check that the process has not deadlocked.
- **Timeout dependency checks**: A slow database should not hang your health check indefinitely.
- **Return structured JSON**: Include per-check status so operators can diagnose quickly.
- **Log health check failures**: But at a lower log level to avoid noise.

## Common Mistakes

- **Single endpoint for everything**: Causes unnecessary restarts when a dependency is temporarily unavailable.
- **No timeout on DB checks**: The health check itself becomes a denial-of-service vector.
- **Caching health results too long**: A 60-second cache defeats the purpose of real-time monitoring.
- **Returning 500 for readiness**: Some load balancers only check for 200; use 503 for intentional unavailability.
- **Ignoring startup probes**: Apps with long initialization get killed by the liveness probe before they finish starting.

## Frequently Asked Questions

### What HTTP status code should a failing readiness probe return?

Return **503 Service Unavailable**. This signals to load balancers and orchestrators that the instance should not receive traffic, without triggering error alerts.

### Should I check external APIs in my health check?

Only if those APIs are **critical** to serving requests. For non-critical dependencies, consider a "degraded" status rather than "down". Never check more than 3-4 dependencies to keep the endpoint fast.

### How often should Kubernetes probe my health endpoint?

Default is every 10 seconds, but tune based on your SLA. For liveness, 10s is typical. For readiness, 5s if you need fast failover. Always set `failureThreshold` (3) and `timeoutSeconds` (1-3) to avoid flapping.

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

### Kubernetes Probe Configuration

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

        # Liveness: restart if process deadlocks
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 2
          failureThreshold: 3

        # Readiness: stop traffic if dependencies fail
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

        # Startup: wait for app initialization
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 30  # Allow up to 150s for startup
```

### Composite Health Check with Circuit Breaker

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

# Usage in health check
db_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=30)

def check_database_with_breaker():
    return db_breaker.call(check_database)
```

### Health Check with Timeout and Caching

```javascript
const express = require("express");
const { Pool } = require("pg");

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Cache readiness result for 5 seconds to avoid hammering dependencies
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

### Docker Compose Health Check Integration

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

## Additional Best Practices

6. **Use startup probes for slow-initializing apps.** Java Spring Boot or Python ML models may need 60+ seconds to start. Without a startup probe, the liveness probe kills the container before it finishes initializing:

```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  failureThreshold: 30
  periodSeconds: 5  # 150s max startup time
```

7. **Differentiate between critical and non-critical dependencies.** Not every dependency failure should make the app "not ready":

```python
def readiness():
    critical_ok = check_database()  # Critical: blocks readiness
    non_critical_ok = check_cache()  # Non-critical: degraded but functional

    if not critical_ok:
        return {"status": "not ready", "checks": {"db": False, "cache": non_critical_ok}}, 503
    return {"status": "ready" if non_critical_ok else "degraded", "checks": {"db": True, "cache": non_critical_ok}}, 200
```

8. **Set appropriate Content-Type headers.** Always return `application/json` so monitoring tools can parse the response:

```python
@app.get("/health/ready")
def readiness():
    response = jsonify({"status": "ready"})
    response.headers["Content-Type"] = "application/json"
    return response
```

## Additional Common Mistakes

6. **Health check endpoint requires authentication.** Load balancers and Kubernetes probes don't send auth tokens. Keep health endpoints public:

```python
# Exclude health endpoints from auth middleware
app.middleware("http")(auth_middleware, exclude_paths=["/health/live", "/health/ready"])
```

7. **Using health checks for metrics collection.** Health checks should be fast and lightweight. Use `/metrics` (Prometheus format) for metrics, not `/health`.

8. **Not testing health check behavior during failures.** Simulate dependency failures in staging to verify your health check responds correctly:

```bash
# Simulate DB failure
$ docker stop db
$ curl http://localhost:3000/health/ready
{"status":"not ready","checks":{"db":false}}
$ docker start db
$ curl http://localhost:3000/health/ready
{"status":"ready","checks":{"db":true}}
```

## Additional FAQ

### Should I include CPU and memory in health checks?

No. CPU and memory are infrastructure metrics, not application health indicators. Use monitoring tools (Prometheus, Datadog) for resource metrics. Health checks should only verify application-level readiness.

### What is the difference between `/health` and `/healthz`?

The `/healthz` convention comes from Kubernetes (the `z` suffix is a Kubernetes convention for "status" endpoints). Both work equally well. Pick one and be consistent across your services.

### How do I implement a graceful shutdown with health checks?

When receiving a shutdown signal (SIGTERM), immediately start returning 503 from the readiness probe. This tells the load balancer to stop sending new requests. Then wait for in-flight requests to complete before exiting:

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
  // Normal readiness check...
});
```

## Performance Tips

1. **Keep liveness probes under 1ms.** The liveness probe should only check process state — no I/O, no network calls:

```python
@app.get("/health/live")
def liveness():
    return {"status": "alive"}  # Instant response
```

2. **Cache readiness results for 5-10 seconds.** Avoid hitting dependencies on every probe check:

```python
from functools import lru_cache
import time

_readiness_cache = {"result": None, "ts": 0}

@app.get("/health/ready")
def readiness():
    now = time.time()
    if _readiness_cache["result"] and now - _readiness_cache["ts"] < 5:
        return _readiness_cache["result"]
    # Perform checks...
```

3. **Use connection pooling for DB checks.** Opening a new connection on every health check is expensive:

```python
# Reuse the app's connection pool
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

4. **Parallelize dependency checks.** Check multiple dependencies concurrently:

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

5. **Use TCP probes for very lightweight checks.** If HTTP parsing overhead matters, use a TCP socket probe:

```yaml
livenessProbe:
  tcpSocket:
    port: 8080
  periodSeconds: 10
```
