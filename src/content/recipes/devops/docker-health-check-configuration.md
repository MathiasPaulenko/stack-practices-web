---
contentType: recipes
slug: docker-health-check-configuration
title: "Docker Health Check Configuration for Container Reliability"
description: "Add proper health checks to Docker containers with HEALTHCHECK"
metaDescription: "Configure Docker HEALTHCHECK instructions with curl, wget, and custom scripts. Learn interval, timeout, retries, and start-period for reliable containers."
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
  metaDescription: "Configure Docker HEALTHCHECK instructions with curl, wget, and custom scripts. Learn interval, timeout, retries, and start-period for reliable containers."
  keywords:
    - docker healthcheck
    - docker container health check
    - healthcheck dockerfile
    - docker health check interval
    - container reliability docker
    - docker healthcheck curl wget
---

## Overview

The Docker `HEALTHCHECK` instruction tells Docker how to test whether a container is healthy. Without it, Docker only knows if a container is running, not if the application inside is actually serving requests. Health checks enable orchestrators to restart unhealthy containers automatically.

## When to Use

- You run containers in production and need automatic restart on failure
- You use Docker Swarm or Kubernetes and need health status for scheduling
- You want `docker ps` to show health status (healthy/unhealthy)
- Your app can be running but not responding (deadlocks, memory exhaustion, stuck connections)

## Solution

### Basic HEALTHCHECK with curl

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

### HEALTHCHECK with wget (Alpine images without curl)

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

### HEALTHCHECK with custom script

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

# Check if the HTTP endpoint responds
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)

if [ "$response" = "200" ]; then
    exit 0
else
    echo "Health check failed: HTTP $response"
    exit 1
fi
```

### HEALTHCHECK for PostgreSQL

```dockerfile
FROM postgres:16-alpine

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD pg_isready -U postgres -d mydb || exit 1
```

### HEALTHCHECK for Redis

```dockerfile
FROM redis:7-alpine

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD redis-cli ping | grep PONG || exit 1
```

### Docker Compose healthcheck with depends_on

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

### Health endpoint in Node.js

```javascript
const http = require("http");

const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy" }));
        return;
    }
    // ... other routes
});

server.listen(3000);
```

### Health endpoint in Python (FastAPI)

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

## Explanation

The `HEALTHCHECK` instruction takes four options:

- **`--interval`**: Time between checks (default 30s). Use shorter intervals for critical services.
- **`--timeout`**: Max time to wait for a response before marking as failed (default 30s).
- **`--retries`**: Consecutive failures before marking unhealthy (default 3).
- **`--start-period`**: Grace period before counting failures (default 0s). Gives the app time to boot.

The command must return exit code 0 (healthy) or 1 (unhealthy). Docker runs the command inside the container.

Health states:
- **starting**: Initial state during `start-period`. Not counted as failures.
- **healthy**: Last check returned exit 0.
- **unhealthy**: `retries` consecutive checks failed.

In Docker Compose, `depends_on` with `condition: service_healthy` waits for a dependency to pass its health check before starting. This solves startup ordering problems.

## Variants

| Check Method | Image Requirement | Use When |
|-------------|-------------------|----------|
| curl -f | curl installed | Standard HTTP check |
| wget --spider | wget installed | Alpine without curl |
| Custom script | bash + tools | Multi-step checks |
| pg_isready | PostgreSQL image | Database readiness |
| redis-cli ping | Redis image | Cache readiness |
| node -e | Node.js image | JS-based check |

## Guidelines

- Always add a `HEALTHCHECK` to production Dockerfiles.
- Set `--start-period` to match your app's startup time (10-30s for most apps).
- Use `--interval=30s` for general services, `10s` for critical infrastructure.
- Keep `--timeout` short (3-10s). A slow health check is worse than no check.
- Create a dedicated `/health` endpoint that returns 200 without side effects.
- Check the actual application, not just the port. A TCP open check is not enough.
- Use `depends_on` with `condition: service_healthy` in Compose for startup ordering.
- For databases, use built-in tools (`pg_isready`, `redis-cli ping`) instead of HTTP.

## Common Mistakes

- Not setting `--start-period`. Slow-starting apps get marked unhealthy before they finish booting.
- Using a health check that hits the database. This adds load and can cause cascading failures.
- Setting `--interval` too low (1-5s). This wastes CPU and can overload the app with health requests.
- Not creating a dedicated health endpoint. Checking `/` might return 200 even if the API is broken.
- Forgetting to install curl or wget in the image. The health check silently fails.
- Returning HTTP 200 for error pages. Some frameworks return 200 for all responses, breaking the check.
- Not using `depends_on` with `condition: service_healthy`. Containers start before dependencies are ready.

## Frequently Asked Questions

### What happens when a container is marked unhealthy?

Docker reports the status in `docker ps`. Docker Swarm automatically restarts unhealthy containers. In Kubernetes, health checks map to liveness/readiness probes and trigger pod restarts.

### Should I use the same endpoint for liveness and readiness?

No. Liveness checks if the app is alive (should be cheap, no dependencies). Readiness checks if the app can serve requests (may check database connectivity). Use `/health` for liveness and `/ready` for readiness.

### Can I disable a health check from the base image?

Yes. Use `HEALTHCHECK NONE` in your Dockerfile to disable inherited health checks.

### How do I check container health from the CLI?

```bash
docker inspect --format='{{.State.Health.Status}}' <container-name>
```

This returns `healthy`, `unhealthy`, or `starting`.

### Health Endpoint in Java (Spring Boot)

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
        // Check database connectivity
        try {
            // Perform a simple query
            return Health.up().withDetail("database", "reachable").build();
        } catch (Exception e) {
            return Health.down().withDetail("error", e.getMessage()).build();
        }
    }
}
```

```yaml
# application.yml — Enable actuator health endpoints
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when_authorized
```

### Multi-Step Health Check Script

```bash
#!/bin/bash
# healthcheck-advanced.sh — Multi-step health verification
set -e

FAIL=0

# Step 1: Check HTTP endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "FAIL: HTTP endpoint returned $HTTP_CODE"
    FAIL=1
fi

# Step 2: Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print int($5)}')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "FAIL: Disk usage at ${DISK_USAGE}%"
    FAIL=1
fi

# Step 3: Check if critical process is running
if ! pgrep -x "gunicorn" > /dev/null; then
    echo "FAIL: gunicorn process not found"
    FAIL=1
fi

# Step 4: Check memory usage
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 95 ]; then
    echo "FAIL: Memory usage at ${MEM_USAGE}%"
    FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
    exit 0
else
    exit 1
fi
```

### Health Check with Logging

```bash
#!/bin/bash
# healthcheck-logged.sh — Health check with audit log
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

### Docker Compose Override for Health Check Tuning

```yaml
# docker-compose.prod.yml — Override health check for production
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
# Apply production health check overrides
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Health Check for Message Queue Worker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci --omit=dev

# Health check for a worker that processes queue messages
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
// worker.js — Write heartbeat file periodically
const fs = require("fs");

setInterval(() => {
    fs.writeFileSync("/tmp/worker.heartbeat", new Date().toISOString());
}, 30000);
```

## Additional Best Practices

1. **Use `CMD-SHELL` for complex checks.** Allows shell features like pipes and conditionals:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD-SHELL "curl -f http://localhost:3000/health || exit 1"
```

2. **Differentiate liveness vs readiness endpoints.** Liveness should be cheap and dependency-free:

```javascript
// Liveness: just check the process is alive
app.get("/health", (req, res) => res.json({ status: "alive" }));

// Readiness: check dependencies
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

3. **Set `start_period` based on app type.** Different apps need different grace periods:

| App Type | start_period | interval | timeout |
|----------|-------------|----------|---------|
| Node.js API | 10s | 30s | 5s |
| Python ML | 60s | 30s | 10s |
| Java Spring | 30s | 15s | 5s |
| Database | 60s | 10s | 5s |
| Worker | 30s | 60s | 10s |

## Additional Common Mistakes

1. **Health check depends on external services.** If your health check calls an external API, a slow response marks the container unhealthy:

```dockerfile
# Bad: depends on external service
HEALTHCHECK CMD curl -f https://api.external.com/health

# Good: check local endpoint only
HEALTHCHECK CMD curl -f http://localhost:3000/health
```

2. **Using `CMD-SHELL` when `CMD` works.** Shell form spawns a shell process, adding overhead:

```dockerfile
# Slightly slower (spawns /bin/sh)
HEALTHCHECK CMD-SHELL "curl -f http://localhost:3000/health"

# Faster (direct exec)
HEALTHCHECK CMD ["curl", "-f", "http://localhost:3000/health"]
```

3. **Not monitoring health check failures.** Set up alerts for containers that flip between healthy and unhealthy:

```bash
# Alert on unhealthy containers
docker ps --filter "health=unhealthy" --format "{{.Names}}"
```

## Additional FAQ

### How do I view health check history?

```bash
# Show last 5 health check results
docker inspect --format='{{range .State.Health.Log}}{{.ExitCode}} {{.End}}: {{.Output}}{{end}}' <container>

# Pretty print last health check
docker inspect <container> | jq '.[0].State.Health.Log[-1]'
```

### How do I run a health check manually?

```bash
# Trigger a health check immediately
docker exec <container> curl -f http://localhost:3000/health

# Or run the health check command directly
docker inspect --format='{{.Config.Healthcheck.Test}}' <container>
```

### Should I add health checks to development Dockerfiles?

For development, health checks add value in Compose for `depends_on` ordering. Use longer intervals to avoid overhead:

```dockerfile
# Dev: less aggressive
HEALTHCHECK --interval=60s --timeout=10s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:3000/health || exit 1
```

## Performance Tips

1. **Keep health check commands fast.** Target under 1 second execution time:

```bash
# Fast: simple HTTP check
curl -sf -m 2 http://localhost:3000/health

# Slow: database query
psql -c "SELECT count(*) FROM large_table"  # Don't do this
```

2. **Use `--start-period` to avoid false negatives during boot.** Set it to your app's typical startup time plus 50 percent margin:

```dockerfile
# App takes ~20s to boot, set start-period to 30s
HEALTHCHECK --start-period=30s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3000/health
```

3. **Avoid health checks that write to disk.** Each check runs frequently and can fill disk with logs:

```bash
# Bad: writes to disk every 30s
HEALTHCHECK CMD curl -f http://localhost:3000/health >> /var/log/health.log

# Good: no disk writes
HEALTHCHECK CMD curl -sf http://localhost:3000/health
```
