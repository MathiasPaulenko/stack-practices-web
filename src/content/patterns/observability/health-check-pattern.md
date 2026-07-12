---


contentType: patterns
slug: health-check-pattern
title: "Health Check Pattern: Expose Liveness and Readiness Probes"
description: "How to implement liveness and readiness probes for container orchestration. Covers Kubernetes probes, dependency checks, graceful degradation, and probe endpoints."
metaDescription: "Implement liveness and readiness probes for orchestration. Learn Kubernetes probe configuration, dependency health checks, and graceful degradation strategies."
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
  - /patterns/circuit-breaker-with-monitoring-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement liveness and readiness probes for orchestration. Learn Kubernetes probe configuration, dependency health checks, and graceful degradation strategies."
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

Health checks expose endpoints that tell the orchestrator whether an application is running and ready to serve traffic. Kubernetes, ECS, and other orchestrators use two distinct probe types: liveness (is the process alive?) and readiness (can the process handle requests?). Liveness probes determine if a container should be restarted. Readiness probes determine if a container should receive traffic. Confusing the two leads to unnecessary restarts or traffic sent to unready instances.

## When to Use

- Any application running in a container orchestrator (Kubernetes, ECS, Nomad)
- Services with dependencies that take time to initialize (database connections, cache warmup)
- Applications that can become unresponsive without crashing (deadlocks, thread exhaustion)
- Services that need to drain connections before shutting down
- Load balancer health checks for traffic routing

## When NOT to Use

- Simple scripts or batch jobs — no long-running process to probe
- Applications without external dependencies — a simple process check suffices
- When the orchestrator doesn't support probes — use a process manager instead
- For internal health monitoring — use metrics and alerting, not probes

## Solution

### Basic health endpoint (Python/FastAPI)

```python
# Python — basic health check endpoint
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/health")
async def health():
    """Basic liveness check — process is alive."""
    return {"status": "healthy"}

@app.get("/health/live")
async def liveness():
    """Liveness probe — is the process running?"""
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness():
    """Readiness probe — can we serve traffic?"""
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

### Dependency checks with timeouts

```python
# Python — dependency checks with timeouts
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
        # Check if we can connect to RabbitMQ
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
# Kubernetes deployment with liveness and readiness probes
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

// Liveness — process is alive
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', uptime: process.uptime() });
});

// Readiness — can serve traffic
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

// application.yml — configure health endpoints
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

### Graceful shutdown with health checks

```python
# Python — graceful shutdown with readiness probe
import signal
import asyncio
from fastapi import FastAPI

app = FastAPI()
shutting_down = False

@app.on_event("shutdown")
async def shutdown_event():
    global shutting_down
    shutting_down = True
    # Drain in-flight requests
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
    """Wait for in-flight requests to complete."""
    deadline = asyncio.get_event_loop().time() + timeout
    while active_requests > 0:
        if asyncio.get_event_loop().time() > deadline:
            break
        await asyncio.sleep(0.5)
```

### Startup probe for slow initializers

```python
# Python — startup probe for applications with slow initialization
import time
from fastapi import FastAPI

app = FastAPI()
startup_time = time.time()
ready_since = None

@app.get("/health/startup")
async def startup_probe():
    """Startup probe — is the app still initializing?"""
    if ready_since is None:
        return JSONResponse(status_code=503, content={"status": "starting"})
    return {"status": "started", "ready_since": ready_since}

@app.get("/health/ready")
async def readiness():
    global ready_since
    if ready_since is None:
        # Check if initialization is complete
        if await is_initialization_complete():
            ready_since = time.time()
        else:
            return JSONResponse(status_code=503, content={"status": "initializing"})
    # Normal readiness check
    return {"status": "ready"}
```

### Composite health check with circuit breakers

```javascript
// JavaScript — composite health with circuit breaker states
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

### Health check with dependency graph

```python
# Python — health check with dependency graph
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
            # Check dependencies first
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
# Kubernetes — TCP socket probe for non-HTTP services
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
# Python — command-based probe for worker processes
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

        # Worker is healthy if it's processing jobs or queue is empty
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


- For a deeper guide, see [Health Endpoint Monitoring Pattern](/patterns/health-endpoint-monitoring-pattern/).

- Separate liveness and readiness — liveness checks if the process is alive, readiness checks if it can serve traffic
- Keep liveness simple — don't check dependencies in liveness, only the process itself
- Use startup probes for slow initializers — prevents premature restarts during boot
- Set reasonable timeouts — 2-3 seconds for HTTP probes, longer for startup
- Return 503 when not ready — orchestrators use HTTP status codes, not response body
- Include dependency details in readiness — helps debug why a service isn't ready
- Implement graceful shutdown — return 503 from readiness during shutdown to stop traffic
- Don't over-check — checking every second is excessive; every 5-10 seconds is sufficient
- Use circuit breakers in health checks — don't let a slow dependency make your health check timeout

## Common Mistakes

- **Same endpoint for liveness and readiness**: if readiness fails (database down), liveness also fails, causing unnecessary restarts. Use separate endpoints.
- **Checking dependencies in liveness**: liveness should only verify the process is running. Dependency checks belong in readiness.
- **No startup probe**: slow-starting applications get killed before they finish initializing. Use startup probes with a high failureThreshold.
- **Probe too aggressive**: checking every 1 second with a 1-second timeout causes false failures under load. Use 5-10 second intervals.
- **Not handling graceful shutdown**: during shutdown, the process is alive but can't serve traffic. Readiness should return 503 immediately.

## FAQ

### What is the difference between liveness and readiness probes?

Liveness checks if the process is alive and should be restarted if not. Readiness checks if the process can serve traffic and should be removed from the load balancer if not. A process can be alive but not ready (e.g., warming up cache).

### When should I use a startup probe?

When your application takes more than 30 seconds to initialize (loading large models, warming caches, establishing many connections). Startup probes give the app time to boot without liveness probe restarts.

### Should health checks check all dependencies?

Readiness should check dependencies that affect request handling (database, cache). Liveness should not — a dead database doesn't mean your process needs a restart.

### What HTTP status code should health checks return?

200 for healthy/ready, 503 for unhealthy/not ready. Orchestrators use HTTP status codes, not the response body, to determine health.

### How do I handle graceful shutdown?

When receiving SIGTERM, immediately return 503 from readiness to stop new traffic. Wait for in-flight requests to complete, then exit. Kubernetes gives 30 seconds by default before sending SIGKILL.
