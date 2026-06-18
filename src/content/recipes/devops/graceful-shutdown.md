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
relatedResources:
  - /guides/deployment-strategies-guide
  - /docs/post-deployment-checklist-template
  - /guides/cicd-pipeline-guide
  - /guides/docker-for-developers-guide
  - /guides/kubernetes-basics-guide
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

A graceful shutdown ensures your application finishes in-flight requests, flushes buffers, closes database connections, and releases locks before exiting. Without it, deployments and scaling events cause dropped requests, data corruption, and cascading failures. This recipe implements SIGTERM handling, connection draining, and zero-downtime deployment patterns for web servers, workers, and containers.

## When to Use

Use this resource when:
- You deploy frequently in Kubernetes, Docker, or auto-scaling groups
- You run long-polling, WebSocket, or background job workers
- You need to flush metrics, logs, or database writes before termination
- You want zero-downtime deployments with rolling updates or blue/green releases

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
2. **Draining**: Set a health-check flag to `shutting-down` (returning HTTP 503) so the load balancer stops sending new traffic. Finish in-flight requests within a timeout window.
3. **Cleanup**: Close database pools, flush logs/metrics, release locks, and exit.

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

## Best Practices

1. Always implement a `/health` endpoint that returns 503 during shutdown so load balancers route away
2. Set `terminationGracePeriodSeconds` (K8s) or `stop-timeout` (Docker) to match your drain timeout
3. Use structured logging to emit a `shutdown_initiated` event for observability and alerting
4. Handle `SIGTERM`, `SIGINT`, and platform-specific signals (Windows `CTRL_CLOSE_EVENT`)
5. Test graceful shutdown in CI: send SIGTERM during a load test and verify zero failed requests

## Common Mistakes

1. **Exiting immediately on SIGTERM** — kills in-flight requests; always drain first
2. **No health-check readiness change** — the load balancer keeps routing to a dying pod
3. **Blocking the shutdown hook** — shutdown hooks run in parallel; use a latch or single-threaded executor to sequence cleanup
4. **Database connection pool not closed** — leaked connections cause the next startup to fail with "too many connections"
5. **Ignoring the preStop hook** — Kubernetes may send SIGTERM before the pod is removed from the service endpoints; a `sleep 5` preStop hook prevents this race

## Frequently Asked Questions

### What is the difference between SIGTERM and SIGKILL?

`SIGTERM` asks politely. Your application can catch it, drain connections, and exit cleanly. `SIGKILL` cannot be caught; the OS forcefully terminates the process. Kubernetes sends SIGKILL after `terminationGracePeriodSeconds` expires.

### How long should my grace period be?

At least as long as your slowest endpoint or job timeout. For HTTP APIs, 10–30 seconds is typical. For batch workers, minutes may be necessary. Always add a small buffer.

### Can I achieve zero-downtime without Kubernetes?

Yes. Use a reverse proxy (Nginx, HAProxy) or service mesh (Envoy) with health checks. Deploy new instances, warm them, then drain and remove old instances. Blue/green and rolling deployments are possible with any load balancer.
