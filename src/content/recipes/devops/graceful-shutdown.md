---


contentType: recipes
slug: graceful-shutdown
title: "Implement Graceful Shutdown and Zero-Downtime Restarts"
description: "How to implement graceful shutdown and zero-downtime restarts for web servers, workers, and containers"
metaDescription: "Implement graceful shutdown and zero-downtime restarts for web servers and containers. Handle SIGTERM, drain connections, and reload safely."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - containers
  - deployment
  - ci-cd
  - automation
relatedResources:
  - /guides/deployment-strategies-guide
  - /docs/post-deployment-checklist-template
  - /guides/cicd-pipeline-guide
  - /guides/docker-for-developers-guide
  - /guides/kubernetes-basics-guide
  - /recipes/blue-green-deployment
  - /recipes/traffic-mirroring
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement graceful shutdown and zero-downtime restarts for web servers and containers. Handle SIGTERM, drain connections, and reload safely."
  keywords:
    - graceful-shutdown
    - zero-downtime
    - sigterm
    - containers
    - web-server
    - deployment


---
## Overview

A graceful shutdown ensures your application finishes in-flight requests, flushes buffers, closes database connections, and releases locks before exiting. Without it, deployments and scaling events cause dropped requests, data corruption, and cascading failures. This implementation provides SIGTERM handling, connection draining, and zero-downtime deployment patterns for web servers, workers, and containers.

## When to Use

Use this resource when:
- You deploy frequently in Kubernetes, Docker, or auto-scaling groups. See [Docker Basics](/recipes/devops/docker-basics) for container fundamentals.
- You run long-polling, WebSocket, or background job workers. See [WebSockets Real-Time](/recipes/frontend/websockets-realtime) for connection lifecycle management.
- You need to flush metrics, logs, or database writes before termination. See [Structured Logging](/recipes/observability/structured-logging) for log flushing patterns.
- You want zero-downtime deployments with rolling updates or blue/green releases. See [Blue-Green Deployment](/recipes/devops/blue-green-deployment) for traffic switching.

## Solution

### Python

```python
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from flask import Flask

app = Flask(__name__)
executor = ThreadPoolExecutor(max_workers=4)
shutting_down = False

@app.route("/health")
def health():
    if shutting_down:
        return {"status": "shutting-down"}, 503
    return {"status": "ok"}

@app.route("/")
def home():
    if shutting_down:
        return {"error": "server is shutting down"}, 503
    time.sleep(0.5)  # simulate work
    return {"message": "hello"}

def graceful_shutdown(signum, frame):
    global shutting_down
    print("Received SIGTERM, starting graceful shutdown...")
    shutting_down = True

    # Stop accepting new work
    executor.shutdown(wait=True)

    # Allow in-flight requests up to 15 seconds to finish
    time.sleep(15)
    print("Shutdown complete. Exiting.")
    sys.exit(0)

signal.signal(signal.SIGTERM, graceful_shutdown)
signal.signal(signal.SIGINT, graceful_shutdown)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, threaded=True)
```

### JavaScript

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(isShuttingDown ? 503 : 200);
    res.end(JSON.stringify({ status: isShuttingDown ? 'shutting-down' : 'ok' }));
    return;
  }

  // Simulate async work
  setTimeout(() => {
    res.writeHead(isShuttingDown ? 503 : 200);
    res.end(JSON.stringify({ message: 'hello' }));
  }, 500);
});

let isShuttingDown = false;
let connections = new Set();

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

function shutdown() {
  console.log('Received SIGTERM, starting graceful shutdown...');
  isShuttingDown = true;

  server.close(() => {
    console.log('HTTP server closed. Draining connections...');
  });

  // Force close remaining connections after timeout
  setTimeout(() => {
    connections.forEach((conn) => conn.destroy());
    console.log('Shutdown complete.');
    process.exit(0);
  }, 15000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(8080);
```

### Java

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

// Spring Boot handles graceful shutdown natively since 2.3
// application.properties:
// server.shutdown=graceful
// spring.lifecycle.timeout-per-shutdown-phase=15s
// management.endpoint.health.probes.enabled=true
// management.health.livenessState.enabled=true
// management.health.readinessState.enabled=true

@SpringBootApplication
public class App {
    public static void main(String[] args) {
        ConfigurableApplicationContext ctx = SpringApplication.run(App.class, args);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Shutdown hook triggered. Closing context...");
            ctx.close();
            System.out.println("Context closed gracefully.");
        }));
    }
}

// For non-Spring Java (plain Jetty/Netty):
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.Handler;

Server server = new Server(8080);
server.setHandler(handler);
server.start();

Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    try {
        server.stop();
        server.join();
    } catch (Exception e) {
        e.printStackTrace();
    }
}));
```

## Explanation

Graceful shutdown is a three-phase process:

1. **Signal reception**: The OS or container runtime sends `SIGTERM` (or `SIGINT` locally). Your application must trap this instead of exiting immediately.
1. **Draining**: Set a health-check flag to `shutting-down` (returning HTTP 503) so the load balancer stops sending new traffic. Finish in-flight requests within a timeout window.
1. **Cleanup**: Close database pools, flush logs/metrics, release locks, and exit.

**Zero-downtime deployments** rely on the orchestrator (Kubernetes, AWS ECS) running the old and new pods concurrently. The old pod receives `SIGTERM`, drains, and exits only after the new pod passes readiness checks.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Kubernetes | `terminationGracePeriodSeconds` + preStop hook | Default 30s; adjust based on max request time |
| Docker | `docker stop` sends SIGTERM, then SIGKILL after 10s | Use `--stop-timeout` to extend |
| systemd | `TimeoutStopSec` in service unit | Align with app drain timeout |
| Node.js | `server.close()` + connection tracking | Destroy lingering sockets after grace period |
| Spring Boot | `server.shutdown=graceful` + readiness probe | Built-in since 2.3; Kubernetes-native |
| Gunicorn | `graceful-timeout` config | Pre-fork workers exit after finishing requests |

## What Works

1. Always implement a `/health` endpoint that returns 503 during shutdown so load balancers route away
2. Set `terminationGracePeriodSeconds` (K8s) or `stop-timeout` (Docker) to match your drain timeout
3. Use structured logging to emit a `shutdown_initiated` event for observability and alerting
4. Handle `SIGTERM`, `SIGINT`, and platform-specific signals (Windows `CTRL_CLOSE_EVENT`)
5. Test graceful shutdown in CI: send SIGTERM during a load test and verify zero failed requests

## Common Mistakes

1. **Exiting immediately on SIGTERM** — kills in-flight requests; always drain first
1. **No health-check readiness change** — the load balancer keeps routing to a dying pod
1. **Blocking the shutdown hook** — shutdown hooks run in parallel; use a latch or single-threaded executor to sequence cleanup
1. **Database connection pool not closed** — leaked connections cause the next startup to fail with "too many connections"
1. **Ignoring the preStop hook** — Kubernetes may send SIGTERM before the pod is removed from the service endpoints; a `sleep 5` preStop hook prevents this race

## Frequently Asked Questions

### What is the difference between SIGTERM and SIGKILL?

`SIGTERM` asks politely. Your application can catch it, drain connections, and exit cleanly. `SIGKILL` cannot be caught; the OS forcefully terminates the process. Kubernetes sends SIGKILL after `terminationGracePeriodSeconds` expires.

### How long should my grace period be?

At least as long as your slowest endpoint or job timeout. For HTTP APIs, 10–30 seconds is typical. For batch workers, minutes may be necessary. Always add a small buffer.

### Can I achieve zero-downtime without Kubernetes?

Yes. Use a reverse proxy (Nginx, HAProxy) or service mesh (Envoy) with health checks. Deploy new instances, warm them, then drain and remove old instances. Blue/green and rolling deployments are possible with any load balancer.

### Go HTTP Server with Context Cancellation

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      http.HandlerFunc(handler),
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 30 * time.Second,
    }

    go func() {
        log.Println("Server starting on :8080")
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server failed: %v", err)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Println("Shutdown signal received, draining...")

    // Give outstanding requests 30 seconds to complete
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Printf("Server forced to shutdown: %v", err)
    }

    // Close database connections, flush buffers
    cleanupResources()

    log.Println("Server exited gracefully")
}

func cleanupResources() {
    // Close DB pools, flush log buffers, release locks
    log.Println("Cleaning up resources...")
}

func handler(w http.ResponseWriter, r *http.Request) {
    // Simulate work
    time.Sleep(100 * time.Millisecond)
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

### Kubernetes PreStop Hook Detail

```yaml
# deployment.yaml
spec:
  template:
    spec:
      containers:
        - name: app
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - |
                    # Mark as not ready
                    curl -X POST http://localhost:8080/admin/shutdown
                    # Wait for endpoint controller to remove pod from Service
                    sleep 10
      terminationGracePeriodSeconds: 45  # Must be > preStop + drain time
```

### Nginx Upstream Drain Configuration

```nginx
# nginx.conf
upstream backend {
    server 10.0.1.10:8080 max_fails=3 fail_timeout=10s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;

    # Slow start for new instances
    server 10.0.1.12:8080 slow_start=30s;
}

# Health check to detect draining instances
location /health {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_502 http_503;
    proxy_connect_timeout 2s;
    proxy_read_timeout 5s;
}
```

### Python (uvicorn) Graceful Shutdown

```python
import signal
import asyncio
from contextlib import asynccontextmanager

shutdown_event = asyncio.Event()

@asynccontextmanager
async def lifespan(app):
    # Startup
    print("Starting up...")
    yield
    # Shutdown
    print("Draining connections...")
    await asyncio.sleep(5)  # Let in-flight requests finish
    print("Closing resources...")
    await close_db_pool()
    print("Shutdown complete")

def handle_sigterm(signum, frame):
    print(f"Received signal {signum}, initiating shutdown...")
    shutdown_event.set()

signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)
```

## Additional Best Practices

1. **Log shutdown events with timestamps.** This helps diagnose slow shutdowns:

```python
import logging
import time

logger = logging.getLogger(__name__)

def on_shutdown():
    logger.info("shutdown_initiated", extra={
        "timestamp": time.time(),
        "in_flight_requests": get_active_request_count(),
    })
```

1. **Use a readiness probe separate from liveness.** During shutdown, fail readiness but keep liveness passing:

```yaml
# readiness fails first, removing pod from Service
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  failureThreshold: 1
  periodSeconds: 2

# liveness stays up so kubelet doesn't restart during drain
livenessProbe:
  httpGet:
    path: /alive
    port: 8080
  periodSeconds: 10
```

## Additional Common Mistakes

1. **Not setting `terminationGracePeriodSeconds` high enough.** If your drain takes 20s and the default is 30s, you only have 10s buffer:

```yaml
# Calculate: drain_time + preStop_sleep + buffer
terminationGracePeriodSeconds: 45  # 20s drain + 10s preStop + 15s buffer
```

1. **Forgetting to close message queue consumers.** Consumers keep pulling messages during shutdown:

```python
def graceful_shutdown(consumer):
    # Stop accepting new messages
    consumer.stop_consuming()
    # Process remaining in-flight messages
    consumer.wait_for_messages(timeout=10)
    # Close connection
    consumer.close()
```

## FAQ

### How do I test graceful shutdown in CI?

Use a load test with SIGTERM injection:

```bash
#!/bin/bash
# ci/test-graceful-shutdown.sh
start_server &
SERVER_PID=$!
sleep 2  # Wait for startup

# Start load test in background
vegeta attack -duration=30s -rate=100 | vegeta report &
LOAD_PID=$!

# Send SIGTERM after 10s
sleep 10
kill -TERM $SERVER_PID

# Wait for load test to finish
wait $LOAD_PID

# Check results: success rate should be 100%
vegeta attack -duration=30s -rate=100 | vegeta report | grep -q "100.00%"
```

### Should I drain connections or just stop accepting new ones?

Both. First stop accepting new connections (close listener), then wait for in-flight requests to complete. Set a hard timeout to force-kill long-running requests:

```javascript
server.close(() => {
    console.log("All connections closed");
});

// Force close after 30s
setTimeout(() => {
    console.error("Force closing remaining connections");
    process.exit(1);
}, 30000);
```

## Performance Tips

1. **Use connection draining, not abrupt close.** Abrupt close causes client-side errors and retries:

```nginx
# Nginx: drain for 30s before closing
worker_shutdown_timeout 30s;
```

1. **Parallelize cleanup tasks.** Close DB, cache, and MQ connections simultaneously:

```python
import concurrent.futures

def cleanup_all():
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(close_db_pool),
            executor.submit(close_redis),
            executor.submit(close_mq),
        ]
        concurrent.futures.wait(futures, timeout=10)
```

1. **Track in-flight requests.** Use a counter to know when drain is complete:

```go
var inFlight int32

func handler(w http.ResponseWriter, r *http.Request) {
    atomic.AddInt32(&inFlight, 1)
    defer atomic.AddInt32(&inFlight, -1)
    // ... handle request
}

func shutdown() {
    for atomic.LoadInt32(&inFlight) > 0 {
        time.Sleep(100 * time.Millisecond)
    }
}
```

1. **Use `SO_REUSEPORT` for zero-downtime restarts.** New and old processes share the port during handoff:

```python
# Python with SO_REUSEPORT
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
sock.bind(("0.0.0.0", 8080))
```
