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
  - health-check
  - monitoring
  - kubernetes
  - liveness
  - readiness
  - python
  - javascript
  - java
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
- Deploying on Kubernetes (livenessProbe / readinessProbe)
- Running behind a load balancer or reverse proxy
- Setting up monitoring and alerting (Prometheus, Datadog)
- You need graceful degradation or circuit breaker logic

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

## Best Practices

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
