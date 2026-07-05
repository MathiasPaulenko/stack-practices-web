---
contentType: patterns
slug: graceful-shutdown-pattern
title: "Graceful Shutdown Pattern: Drain In-Flight Requests Before Exit"
description: "How to drain in-flight requests before process exit. Covers signal handling, health check removal, connection draining, timeout enforcement, and cleanup hooks."
metaDescription: "Drain in-flight requests before process exit. Learn signal handling, health check removal from load balancer, connection draining, timeout enforcement, and cleanup hooks."
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
  metaDescription: "Drain in-flight requests before process exit. Learn signal handling, health check removal from load balancer, connection draining, timeout enforcement, and cleanup hooks."
  keywords:
    - architecture
    - resilience
    - shutdown
    - kubernetes
    - pattern
---

## Overview

The graceful shutdown pattern ensures a process completes in-flight requests before exiting. When a process receives a shutdown signal (SIGTERM), it stops accepting new requests, lets ongoing requests finish, closes database connections, flushes buffers, and then exits. Without graceful shutdown, in-flight requests are abruptly terminated, causing 502 errors for users and partial data updates in databases. In Kubernetes, pods receive a SIGTERM with a grace period (default 30 seconds). The application must drain within that window or it gets SIGKILL'd.

## When to Use

- Any long-running server (HTTP, gRPC, WebSocket)
- Kubernetes deployments where pods are regularly terminated
- Applications with background workers processing jobs
- Services with open database connections or file handles
- Message consumers that need to finish processing current messages

## When NOT to Use

- CLI tools and scripts that exit after completion
- Serverless functions where the platform handles lifecycle
- Batch jobs that are designed to be killed and restarted

## Solution

### Python graceful shutdown with signal handling

```python
# shutdown/graceful.py — Graceful shutdown for Python HTTP servers
import signal
import threading
import time
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

class GracefulHTTPServer(HTTPServer):
    """HTTP server with graceful shutdown support."""

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
        """Stop accepting new requests, wait for active ones to finish."""
        print("Starting graceful shutdown...")
        self._shutting_down = True

        # Stop accepting new connections
        self.socket.close()

        # Wait for active requests to complete
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
        """Close database connections, flush buffers, etc."""
        print("Cleaning up resources...")
        # Close database connections
        # Flush log buffers
        # Close file handles
        print("Cleanup complete")


class GracefulRequestHandler(BaseHTTPRequestHandler):
    """Request handler that tracks active requests for graceful shutdown."""

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
// shutdown/graceful.js — Graceful shutdown for Node.js Express
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

let isShuttingDown = false;
let activeRequests = 0;

// Track active requests
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

    // Stop accepting new connections
    server.close(() => {
        console.log("HTTP server closed");
    });

    // Wait for active requests
    const checkInterval = setInterval(() => {
        if (activeRequests === 0) {
            clearInterval(checkInterval);
            console.log("All requests completed, exiting");
            cleanup();
        }
    }, 100);

    // Force exit after timeout
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

### Java graceful shutdown with Spring

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
        // Spring will wait for active requests to complete
    }
}

// application.properties
// server.shutdown=graceful
// spring.lifecycle.timeout-per-shutdown-phase=30s

// Custom shutdown hook for resource cleanup
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
        // Run cleanup early in shutdown sequence
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
# k8s-graceful-shutdown.yaml — Kubernetes pod with graceful shutdown
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
      terminationGracePeriodSeconds: 45  # Give app 45s to drain
      containers:
        - name: api
          image: shop/api-server:latest
          ports:
            - containerPort: 8080
          lifecycle:
            preStop:
              exec:
                # Sleep to let load balancer remove this pod
                # before SIGTERM is sent
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
# Service with proper health check removal
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
# shutdown/worker.py — Graceful shutdown for background workers
import signal
import threading
import time
import queue

class GracefulWorker:
    """Background worker that finishes current job before exiting."""

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
        """Stop accepting new jobs, finish active ones."""
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

### Load balancer deregistration before shutdown

```python
# shutdown/deregister.py — Deregister from load balancer before draining
import requests
import time
import signal
import sys

class GracefulService:
    """Deregisters from load balancer, then drains requests."""

    def __init__(self, lb_registry_url, health_port=8080):
        self.lb_url = lb_registry_url
        self.health_port = health_port
        self._healthy = True
        self._active_requests = 0

    def deregister(self):
        """Tell the load balancer to stop sending traffic."""
        try:
            resp = requests.post(
                f"{self.lb_url}/deregister",
                json={"port": self.health_port},
                timeout=5
            )
            print(f"Deregistered from load balancer: {resp.status_code}")
        except Exception as e:
            print(f"Deregistration failed: {e}")

        # Wait for LB to propagate
        time.sleep(5)

    def health_check(self):
        """Return 200 if healthy, 503 if shutting down."""
        if not self._healthy:
            return 503
        return 200

    def shutdown(self, timeout=30):
        # Step 1: Mark as unhealthy (LB stops sending new traffic)
        self._healthy = False
        print("Marked as unhealthy")

        # Step 2: Deregister from load balancer
        self.deregister()

        # Step 3: Wait for active requests
        start = time.time()
        while self._active_requests > 0:
            if time.time() - start > timeout:
                print(f"Timeout with {self._active_requests} requests active")
                break
            time.sleep(0.5)

        # Step 4: Cleanup and exit
        print("Shutting down")
        sys.exit(0)
```

## Variants

### Phased shutdown

```python
# shutdown/phased.py — Multi-phase shutdown with ordered cleanup
class PhasedShutdown:
    """Shuts down in phases: stop accepting, drain, cleanup, exit.
    Each phase has its own timeout."""

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
// shutdown/websocket.js — Graceful shutdown for WebSocket server
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

    // Close all connections with "going away" code
    wss.clients.forEach((ws) => {
        ws.close(1001, "Server shutting down");
    });

    // Close server after all clients disconnect
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

- Deregister from load balancer first — give it time to propagate before stopping
- Set health check to 503 immediately — load balancers stop routing to unhealthy instances
- Use a preStop hook in Kubernetes — sleep 5-10 seconds to let the LB catch up
- Set terminationGracePeriodSeconds higher than your drain timeout — default 30s may be too short
- Track active requests — know when it's safe to exit
- Set a hard timeout — don't wait forever for stuck requests
- Close resources in order — database, message queue, file handles, log buffers
- Test shutdown behavior — verify no 502s during rolling deployments

## Common Mistakes

- **No graceful shutdown at all**: process exits immediately, all in-flight requests get 502s.
- **No preStop hook**: Kubernetes sends SIGTERM, but the LB still routes traffic for a few seconds.
- **Waiting forever for stuck requests**: a long-running request blocks shutdown indefinitely. Set a timeout.
- **Not closing database connections**: connections leak, eventually exhausting the pool.
- **No health check change**: LB keeps routing to the shutting-down instance.

## FAQ

### What is graceful shutdown?

A shutdown process where the server stops accepting new requests, lets in-flight requests complete, closes resources, and then exits. This prevents 502 errors and data corruption from abrupt termination.

### How long should graceful shutdown take?

Typically 15-30 seconds. Set the timeout based on your longest expected request. In Kubernetes, set `terminationGracePeriodSeconds` to at least 5 seconds more than your drain timeout.

### What is a preStop hook in Kubernetes?

A command that runs before the SIGTERM signal is sent. Commonly used to sleep for 5-10 seconds, giving the load balancer time to remove the pod from rotation before the app starts draining.

### Should I return 503 during shutdown?

Yes. Once you start shutting down, return 503 on health checks so the load balancer stops routing traffic. Continue serving in-flight requests normally until they complete.

### What happens if graceful shutdown exceeds the Kubernetes grace period?

Kubernetes sends SIGKILL after `terminationGracePeriodSeconds` (default 30s). The process is killed immediately. Increase the grace period if your requests take longer than 30 seconds.
