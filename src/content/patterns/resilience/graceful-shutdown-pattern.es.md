---

contentType: patterns
slug: graceful-shutdown-pattern
title: "Patrón Graceful Shutdown"
description: "Cómo drenear in-flight requests antes de process exit. Cubre signal handling, health check removal, connection draining, timeout enforcement, y cleanup hooks."
metaDescription: "Dreneá in-flight requests antes de exit. Aprende signal handling, health check removal, connection draining, timeout enforcement, y cleanup hooks."
difficulty: intermediate
topics:
  - architecture
  - infrastructure
tags:
  - architecture
  - resilience
  - shutdown
  - kubernetes
  - pattern
category: behavioral
relatedResources:
  - /patterns/circuit-breaker-half-open-pattern
  - /patterns/bulkhead-pattern
  - /patterns/fallover-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Dreneá in-flight requests antes de exit. Aprende signal handling, health check removal, connection draining, timeout enforcement, y cleanup hooks."
  keywords:
    - architecture
    - resilience
    - shutdown
    - kubernetes
    - pattern

---

## Overview

El graceful shutdown pattern ensureéa que un process complete in-flight requests antes de exit. Cuando un process receiveéa un shutdown signal (SIGTERM), pará de acceptear new requests, deja ongoing requests finish, cierra database connections, flushea buffers, y luego exit. Sin graceful shutdown, in-flight requests son abruptly terminated, causando 502 errors para users y partial data updates en databases. En Kubernetes, pods receiveéan un SIGTERM con un grace period (default 30 seconds). El application debe drenear dentro de ese window o recibe SIGKILL.

## When to Use

- Cualquier long-running server (HTTP, gRPC, WebSocket)
- Kubernetes deployments donde pods son regularmente terminated
- Applications con background workers processeando jobs
- Services con open database connections o file handles
- Message consumers que necesitan finishar de processar current messages

## When NOT to Use

- CLI tools y scripts que exiteán después de completion
- Serverless functions donde el platform handleéa lifecycle
- Batch jobs que son designed para ser killed y restarted

## Solution

### Python graceful shutdown con signal handling

```python
# shutdown/graceful.py — Graceful shutdown para Python HTTP servers
import signal
import threading
import time
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

class GracefulHTTPServer(HTTPServer):
    """HTTP server con graceful shutdown support."""

    def __init__(self, addr, handler):
        super().__init__(addr, handler)
        self._shutting_down = False
        self._active_requests = 0
        self._lock = threading.Lock()
        self._shutdown_event = threading.Event()

    @property
    def is_shutting_down(self):
        return self._shutting_down

    def request_started(self):
        with self._lock:
            self._active_requests += 1

    def request_finished(self):
        with self._lock:
            self._active_requests -= 1
            if self._shutting_down and self._active_requests == 0:
                self._shutdown_event.set()

    def graceful_shutdown(self, timeout=30):
        """Pará de acceptear new requests, waitéa que active ones finish."""
        print("Starting graceful shutdown...")
        self._shutting_down = True

        # Pará de acceptear new connections
        self.socket.close()

        # Waitéa que active requests complete
        with self._lock:
            if self._active_requests == 0:
                print("No active requests, shutting down immediately")
                return

            print(f"Waiting for {self._active_requests} active requests...")

        if self._shutdown_event.wait(timeout=timeout):
            print("All requests completed, shutting down")
        else:
            print(f"Timeout after {timeout}s, forcing shutdown with "
                  f"{self._active_requests} requests still active")

        # Cleanup resources
        self._cleanup()

    def _cleanup(self):
        """Cerrá database connections, flushea buffers, etc."""
        print("Cleaning up resources...")
        # Close database connections
        # Flush log buffers
        # Close file handles
        print("Cleanup complete")


class GracefulRequestHandler(BaseHTTPRequestHandler):
    """Request handler que trackéa active requests para graceful shutdown."""

    def handle_one_request(self):
        self.server.request_started()
        try:
            super().handle_one_request()
        finally:
            self.server.request_finished()

    def do_GET(self):
        if self.server.is_shutting_down:
            self.send_response(503)
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(b'{"error": "Server shutting down"}')
            return

        # Simulate work
        time.sleep(0.5)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"status": "ok"}')


# Setup signal handlers
server = GracefulHTTPServer(("0.0.0.0", 8080), GracefulRequestHandler)

def signal_handler(signum, frame):
    server.graceful_shutdown(timeout=30)
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

print("Server running on port 8080")
server.serve_forever()
```

### Node.js graceful shutdown

```javascript
// shutdown/graceful.js — Graceful shutdown para Node.js Express
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

let isShuttingDown = false;
let activeRequests = 0;

// Trackéa active requests
app.use((req, res, next) => {
    if (isShuttingDown) {
        res.setHeader("Connection", "close");
        return res.status(503).json({ error: "Server shutting down" });
    }
    activeRequests++;
    res.on("finish", () => activeRequests--);
    next();
});

app.get("/health", (req, res) => {
    if (isShuttingDown) {
        return res.status(503).json({ status: "shutting_down" });
    }
    res.json({ status: "healthy" });
});

app.get("/api/data", (req, res) => {
    setTimeout(() => {
        res.json({ data: "response", activeRequests });
    }, 500);
});

// Graceful shutdown
function gracefulShutdown(signal) {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    isShuttingDown = true;

    // Pará de acceptear new connections
    server.close(() => {
        console.log("HTTP server closed");
    });

    // Waitéa que active requests
    const checkInterval = setInterval(() => {
        if (activeRequests === 0) {
            clearInterval(checkInterval);
            console.log("All requests completed, exiting");
            cleanup();
        }
    }, 100);

    // Force exit después de timeout
    setTimeout(() => {
        console.log(`Timeout: ${activeRequests} requests still active, forcing exit`);
        cleanup();
    }, 30000);
}

function cleanup() {
    // Close database connections
    // Flush log buffers
    // Close message queue connections
    console.log("Cleanup complete, exiting");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(8080, () => console.log("Server running on port 8080"));
```

### Java graceful shutdown con Spring

```java
// ShutdownConfig.java — Spring Boot graceful shutdown
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.web.server.Shutdown;

@Configuration
public class GracefulShutdownConfig
    implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.setShutdown(Shutdown.GRACEFUL);
        // Spring waitéa que active requests complete
    }
}

// application.properties
// server.shutdown=graceful
// spring.lifecycle.timeout-per-shutdown-phase=30s

// Custom shutdown hook para resource cleanup
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

@Component
public class ResourceCleanupHook implements SmartLifecycle {

    private volatile boolean running = false;

    @Override
    public void start() {
        running = true;
    }

    @Override
    public void stop() {
        running = false;
        // Close database connections
        closeDatabaseConnections();
        // Flush log buffers
        flushLogBuffers();
        // Close message consumer connections
        closeMessageConsumers();
        System.out.println("Resource cleanup complete");
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public int getPhase() {
        // Run cleanup early en shutdown sequence
        return Integer.MIN_VALUE + 100;
    }

    private void closeDatabaseConnections() {
        System.out.println("Closing database connections...");
    }

    private void flushLogBuffers() {
        System.out.println("Flushing log buffers...");
    }

    private void closeMessageConsumers() {
        System.out.println("Closing message consumers...");
    }
}
```

### Kubernetes graceful shutdown

```yaml
# k8s-graceful-shutdown.yaml — Kubernetes pod con graceful shutdown
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      terminationGracePeriodSeconds: 45  # Dale app 45s para drenear
      containers:
        - name: api
          image: shop/api-server:latest
          ports:
            - containerPort: 8080
          lifecycle:
            preStop:
              exec:
                # Sleep para dejar load balancer remove este pod
                # antes de SIGTERM
                command: ["sh", "-c", "sleep 5"]
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          env:
            - name: SHUTDOWN_TIMEOUT
              value: "30"
---
# Service con proper health check removal
apiVersion: v1
kind: Service
metadata:
  name: api-server
spec:
  selector:
    app: api-server
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### Python background worker graceful shutdown

```python
# shutdown/worker.py — Graceful shutdown para background workers
import signal
import threading
import time
import queue

class GracefulWorker:
    """Background worker que finishéa current job antes de exit."""

    def __init__(self, job_queue, max_workers=4):
        self._queue = job_queue
        self._max_workers = max_workers
        self._workers = []
        self._active_jobs = 0
        self._lock = threading.Lock()
        self._shutdown = threading.Event()
        self._jobs_done = threading.Event()

    def start(self):
        for i in range(self._max_workers):
            t = threading.Thread(target=self._worker_loop, args=(i,), daemon=True)
            t.start()
            self._workers.append(t)

    def _worker_loop(self, worker_id):
        while not self._shutdown.is_set():
            try:
                job = self._queue.get(timeout=1)
            except queue.Empty:
                continue

            with self._lock:
                self._active_jobs += 1

            try:
                self._process_job(job, worker_id)
            except Exception as e:
                print(f"Worker {worker_id} job failed: {e}")
            finally:
                with self._lock:
                    self._active_jobs -= 1
                    if self._shutdown.is_set() and self._active_jobs == 0:
                        self._jobs_done.set()
                self._queue.task_done()

    def _process_job(self, job, worker_id):
        print(f"Worker {worker_id} processing job {job['id']}")
        time.sleep(2)  # Simulate work
        print(f"Worker {worker_id} completed job {job['id']}")

    def shutdown(self, timeout=30):
        """Pará de acceptear new jobs, finishéa active ones."""
        print("Worker shutdown initiated...")
        self._shutdown.set()

        with self._lock:
            if self._active_jobs == 0:
                print("No active jobs, exiting immediately")
                return

        if self._jobs_done.wait(timeout=timeout):
            print("All jobs completed, exiting")
        else:
            print(f"Timeout: {self._active_jobs} jobs still active")

# Usage
job_queue = queue.Queue()
worker = GracefulWorker(job_queue, max_workers=4)
worker.start()

# Add jobs
for i in range(10):
    job_queue.put({"id": i, "data": f"job-{i}"})

# Handle shutdown
def handle_signal(signum, frame):
    worker.shutdown(timeout=30)

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)
```

### Load balancer deregistration antes de shutdown

```python
# shutdown/deregister.py — Deregistrá del load balancer antes de drenear
import requests
import time
import signal
import sys

class GracefulService:
    """Deregistrá del load balancer, luego dreneéa requests."""

    def __init__(self, lb_registry_url, health_port=8080):
        self.lb_url = lb_registry_url
        self.health_port = health_port
        self._healthy = True
        self._active_requests = 0

    def deregister(self):
        """Decí al load balancer que paré de sendear traffic."""
        try:
            resp = requests.post(
                f"{self.lb_url}/deregister",
                json={"port": self.health_port},
                timeout=5
            )
            print(f"Deregistered from load balancer: {resp.status_code}")
        except Exception as e:
            print(f"Deregistration failed: {e}")

        # Waitéa que LB propague
        time.sleep(5)

    def health_check(self):
        """Returnéa 200 si healthy, 503 si shutting down."""
        if not self._healthy:
            return 503
        return 200

    def shutdown(self, timeout=30):
        # Step 1: Markéa como unhealthy (LB pará de sendear new traffic)
        self._healthy = False
        print("Marked as unhealthy")

        # Step 2: Deregistrá del load balancer
        self.deregister()

        # Step 3: Waitéa que active requests
        start = time.time()
        while self._active_requests > 0:
            if time.time() - start > timeout:
                print(f"Timeout with {self._active_requests} requests active")
                break
            time.sleep(0.5)

        # Step 4: Cleanup y exit
        print("Shutting down")
        sys.exit(0)
```

## Variants

### Phased shutdown

```python
# shutdown/phased.py — Multi-phase shutdown con ordered cleanup
class PhasedShutdown:
    """Shutdowea en phases: stop accepting, drain, cleanup, exit.
    Cada phase tiene su propio timeout."""

    def __init__(self):
        self._phases = [
            ("stop_accepting", self._stop_accepting, 5),
            ("drain_requests", self._drain_requests, 20),
            ("close_connections", self._close_connections, 5),
            ("flush_buffers", self._flush_buffers, 3),
            ("cleanup", self._cleanup, 2),
        ]

    def _stop_accepting(self):
        print("Phase 1: Stop accepting new requests")

    def _drain_requests(self):
        print("Phase 2: Drain active requests")

    def _close_connections(self):
        print("Phase 3: Close database and MQ connections")

    def _flush_buffers(self):
        print("Phase 4: Flush log and metric buffers")

    def _cleanup(self):
        print("Phase 5: Final cleanup")

    def execute(self):
        for name, handler, timeout in self._phases:
            print(f"Starting phase: {name} (timeout: {timeout}s)")
            handler()
        print("All phases complete, exiting")
```

### WebSocket graceful shutdown

```javascript
// shutdown/websocket.js — Graceful shutdown para WebSocket server
const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 8080 });
let isShuttingDown = false;

wss.on("connection", (ws) => {
    if (isShuttingDown) {
        ws.close(1001, "Server shutting down");
        return;
    }

    ws.on("message", (data) => {
        ws.send(`Echo: ${data}`);
    });
});

function gracefulShutdown() {
    console.log("WebSocket graceful shutdown...");
    isShuttingDown = true;

    // Closeá todas las connections con "going away" code
    wss.clients.forEach((ws) => {
        ws.close(1001, "Server shutting down");
    });

    // Closeá server después de que todos los clients disconnect
    setTimeout(() => {
        wss.close(() => {
            console.log("WebSocket server closed");
            process.exit(0);
        });
    }, 5000);
}

process.on("SIGTERM", gracefulShutdown);
```

## Best Practices


- For a deeper guide, see [Sidecar Pattern: Extend Services with Companion Containers](/es/patterns/sidecar-pattern/).

- Deregistrá del load balancer first — dale time para propagatear antes de parar
- Seteá health check a 503 immediately — load balancers parán de routear a unhealthy instances
- Usá un preStop hook en Kubernetes — sleep 5-10 seconds para dejar el LB catch up
- Seteá terminationGracePeriodSeconds más alto que tu drain timeout — default 30s puede ser too short
- Trackéa active requests — sabé cuando es safe de exit
- Seteá un hard timeout — no waiteéees forever para stuck requests
- Cerrá resources en order — database, message queue, file handles, log buffers
- Testeá shutdown behavior — verificá no 502s durante rolling deployments

## Common Mistakes

- **No graceful shutdown at all**: process exitea immediately, todos los in-flight requests obtienen 502s.
- **No preStop hook**: Kubernetes sendéa SIGTERM, pero el LB todavía routeéa traffic por unos seconds.
- **Waiting forever para stuck requests**: un long-running request blockéa shutdown indefinitely. Seteá un timeout.
- **Not closing database connections**: connections leakean, eventually exhausting el pool.
- **No health check change**: LB sigue routeando a la shutting-down instance.

## FAQ

### ¿Qué es graceful shutdown?

Un shutdown process donde el server pará de acceptear new requests, deja in-flight requests complete, cierra resources, y luego exit. Esto previene 502 errors y data corruption desde abrupt termination.

### ¿Cuánto debería tomar graceful shutdown?

Típicamente 15-30 seconds. Seteá el timeout basado en tu longest expected request. En Kubernetes, seteá `terminationGracePeriodSeconds` a al menos 5 seconds más que tu drain timeout.

### ¿Qué es un preStop hook en Kubernetes?

Un command que corre antes de que el SIGTERM signal sea sent. Commonly used para sleep por 5-10 seconds, dándole al load balancer time para remove el pod de rotation antes de que el app empiece a drenear.

### ¿Debería returnear 503 durante shutdown?

Sí. Una vez que empezás a shutdowear, returneá 503 en health checks para que el load balancer paré de routear traffic. Continuá sirviendo in-flight requests normally hasta que complete.

### ¿Qué pasa si graceful shutdown excede el Kubernetes grace period?

Kubernetes sendéa SIGKILL después de `terminationGracePeriodSeconds` (default 30s). El process es killed immediately. Aumentá el grace period si tus requests toman más de 30 seconds.
