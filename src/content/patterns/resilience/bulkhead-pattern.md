---





contentType: patterns
slug: bulkhead-pattern
title: "Bulkhead Pattern: Isolate Resources to Limit Blast Radius"
description: "How to isolate resources per service to limit blast radius. Covers thread pool isolation, connection pool partitioning, semaphore-based bulkheads, and resource quotas."
metaDescription: "Isolate resources per service to limit blast radius. Learn thread pool isolation, connection pool partitioning, semaphore-based bulkheads, and resource quotas."
difficulty: intermediate
topics:
  - architecture
  - concurrency
tags:
  - architecture
  - resilience
  - bulkhead
  - isolation
  - pattern
category: behavioral
relatedResources:
  - /patterns/circuit-breaker-half-open-pattern
  - /patterns/retry-with-jitter-pattern
  - /patterns/graceful-shutdown-pattern
  - /patterns/graceful-degradation-pattern
  - /patterns/fallover-pattern
  - /patterns/rate-limiter-token-bucket-pattern
  - /guides/complete-guide-java-concurrency
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Isolate resources per service to limit blast radius. Learn thread pool isolation, connection pool partitioning, semaphore-based bulkheads, and resource quotas."
  keywords:
    - architecture
    - resilience
    - bulkhead
    - isolation
    - pattern





---

## Overview

The bulkhead pattern isolates resources so that failure in one part of the system doesn't cascade to others. Like watertight compartments in a ship, if one floods, the ship stays afloat. In software, this means assigning separate thread pools, connection pools, or memory limits to different services or operations. If service A exhausts its thread pool, service B still has threads available. Without bulkheads, a single slow downstream service can consume all threads in a shared pool, starving all other operations.

## When to Use

- Multiple downstream services sharing a common resource pool (threads, connections)
- Preventing one slow service from starving other operations
- Microservices where different endpoints have different SLA requirements
- Database connection isolation between critical and non-critical paths
- Rate-limiting resource consumption per tenant or per service

## When NOT to Use

- Single-service applications with no downstream dependencies
- When resource overhead of separate pools outweighs the isolation benefit
- Low-traffic systems where contention is unlikely
- When the downstream service is extremely reliable and fast

## Solution

### Thread pool bulkhead (Python)

```python
# bulkhead/thread_pool.py — Thread pool isolation per service
import concurrent.futures
from functools import wraps
from collections import defaultdict
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BulkheadManager:
    """Manages separate thread pools for different services.
    Each service gets its own pool — one service can't exhaust another's threads."""

    def __init__(self):
        self._pools = {}
        self._configs = {}
        self._active = defaultdict(int)

    def configure(self, service_name, max_workers, queue_capacity=100):
        """Configure a bulkhead for a specific service."""
        self._pools[service_name] = concurrent.futures.ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix=f"bulkhead-{service_name}"
        )
        self._configs[service_name] = {
            "max_workers": max_workers,
            "queue_capacity": queue_capacity
        }
        logger.info(f"Bulkhead configured for {service_name}: "
                    f"max_workers={max_workers}, queue={queue_capacity}")

    def submit(self, service_name, fn, *args, **kwargs):
        """Submit a task to a service's bulkhead.
        Raises BulkheadFullError if the pool and queue are exhausted."""
        if service_name not in self._pools:
            raise ValueError(f"No bulkhead configured for {service_name}")

        config = self._configs[service_name]
        if self._active[service_name] >= config["max_workers"] + config["queue_capacity"]:
            raise BulkheadFullError(
                f"Bulkhead '{service_name}' is full: "
                f"{self._active[service_name]} active tasks"
            )

        self._active[service_name] += 1

        def wrapped_fn(*a, **kw):
            try:
                return fn(*a, **kw)
            finally:
                self._active[service_name] -= 1

        return self._pools[service_name].submit(wrapped_fn, *args, **kwargs)

    def get_stats(self):
        return {
            service: {
                "active": self._active[service],
                "max_workers": self._configs[service]["max_workers"],
                "queue_capacity": self._configs[service]["queue_capacity"],
                "utilization": self._active[service] / self._configs[service]["max_workers"]
            }
            for service in self._pools
        }

    def shutdown(self):
        for pool in self._pools.values():
            pool.shutdown(wait=True)


class BulkheadFullError(Exception):
    """Raised when a bulkhead's thread pool and queue are full."""
    pass


# Usage
bulkhead = BulkheadManager()
bulkhead.configure("payment", max_workers=10, queue_capacity=20)
bulkhead.configure("inventory", max_workers=5, queue_capacity=10)
bulkhead.configure("notifications", max_workers=3, queue_capacity=5)

def call_payment_api(amount):
    time.sleep(0.5)
    return {"status": "charged", "amount": amount}

# Payment gets its own pool — inventory issues don't affect it
future = bulkhead.submit("payment", call_payment_api, 99.99)
result = future.result(timeout=5)
```

### Semaphore bulkhead (Python)

```python
# bulkhead/semaphore.py — Semaphore-based concurrency limiting
import threading
import time
from contextlib import contextmanager
from functools import wraps

class SemaphoreBulkhead:
    """Limits concurrent calls using a semaphore.
    Lighter than thread pool — works with any execution model."""

    def __init__(self, max_concurrent, timeout=30):
        self._semaphore = threading.Semaphore(max_concurrent)
        self._max = max_concurrent
        self._timeout = timeout
        self._active = 0
        self._lock = threading.Lock()

    @contextmanager
    def acquire(self):
        """Context manager that acquires a permit."""
        acquired = self._semaphore.acquire(timeout=self._timeout)
        if not acquired:
            raise BulkheadFullError(
                f"Could not acquire permit within {self._timeout}s"
            )
        with self._lock:
            self._active += 1
        try:
            yield
        finally:
            with self._lock:
                self._active -= 1
            self._semaphore.release()

    def __call__(self, fn):
        """Decorator that wraps a function with bulkhead protection."""
        @wraps(fn)
        def wrapper(*args, **kwargs):
            with self.acquire():
                return fn(*args, **kwargs)
        return wrapper

    @property
    def active(self):
        return self._active

    @property
    def available(self):
        return self._max - self._active


# Usage — protect database access
db_bulkhead = SemaphoreBulkhead(max_concurrent=20)

@db_bulkhead
def query_database(sql):
    time.sleep(0.1)
    return {"rows": 42}

# Usage — protect external API calls
api_bulkhead = SemaphoreBulkhead(max_concurrent=5, timeout=10)

def call_external_api(endpoint):
    with api_bulkhead.acquire():
        time.sleep(0.5)
        return {"data": "response"}
```

### Java bulkhead with Spring

```java
// BulkheadConfig.java — Java bulkhead using resilience4j
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadConfig;
import io.github.resilience4j.bulkhead.ThreadPoolBulkhead;
import io.github.resilience4j.bulkhead.ThreadPoolBulkheadConfig;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

public class ServiceBulkheads {

    // Semaphore-based bulkhead for synchronous calls
    private final Bulkhead paymentBulkhead;
    private final Bulkhead inventoryBulkhead;

    // Thread pool bulkhead for async calls
    private final ThreadPoolBulkhead asyncPaymentBulkhead;

    public ServiceBulkheads() {
        // Payment: max 10 concurrent, 30s wait
        BulkheadConfig paymentConfig = BulkheadConfig.custom()
            .maxConcurrentCalls(10)
            .maxWaitDuration(Duration.ofSeconds(30))
            .build();
        this.paymentBulkhead = Bulkhead.of("payment", paymentConfig);

        // Inventory: max 5 concurrent, 10s wait
        BulkheadConfig inventoryConfig = BulkheadConfig.custom()
            .maxConcurrentCalls(5)
            .maxWaitDuration(Duration.ofSeconds(10))
            .build();
        this.inventoryBulkhead = Bulkhead.of("inventory", inventoryConfig);

        // Async payment: separate thread pool
        ThreadPoolBulkheadConfig asyncConfig = ThreadPoolBulkheadConfig.custom()
            .maxThreadPoolSize(10)
            .coreThreadPoolSize(5)
            .queueCapacity(20)
            .build();
        this.asyncPaymentBulkhead = ThreadPoolBulkhead.of("asyncPayment", asyncConfig);
    }

    public String callPayment(String orderId) {
        return Bulkhead.decorateSupplier(paymentBulkhead, () -> {
            // Payment API call
            return paymentClient.charge(orderId);
        }).get();
    }

    public String callInventory(String productId) {
        return Bulkhead.decorateSupplier(inventoryBulkhead, () -> {
            // Inventory API call
            return inventoryClient.checkStock(productId);
        }).get();
    }

    public CompletableFuture<String> callPaymentAsync(String orderId) {
        return asyncPaymentBulkhead.executeSupplier(() ->
            paymentClient.charge(orderId)
        );
    }
}
```

### Connection pool isolation (Python)

```python
# bulkhead/connection_pools.py — Separate connection pools per service
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
import time

class IsolatedConnectionPools:
    """Maintains separate database connection pools per service.
    Critical services can't be starved by non-critical ones."""

    def __init__(self):
        self._pools = {}

    def configure(self, service_name, db_url, min_conn, max_conn):
        self._pools[service_name] = pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            dsn=db_url
        )

    @contextmanager
    def get_connection(self, service_name):
        if service_name not in self._pools:
            raise ValueError(f"No pool for {service_name}")

        conn = self._pools[service_name].getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pools[service_name].putconn(conn)

    def close_all(self):
        for p in self._pools.values():
            p.closeall()


# Usage — critical and non-critical services get separate pools
pools = IsolatedConnectionPools()

# Payment: critical, gets more connections
pools.configure("payment", "postgresql://db:5432/shop", min_conn=5, max_conn=20)

# Analytics: non-critical, fewer connections
pools.configure("analytics", "postgresql://db:5432/shop", min_conn=2, max_conn=5)

def process_payment(order_id):
    with pools.get_connection("payment") as conn:
        cur = conn.cursor()
        cur.execute("UPDATE orders SET status='paid' WHERE id=%s", (order_id,))
        return cur.rowcount

def log_analytics(event):
    with pools.get_connection("analytics") as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO analytics_events (event) VALUES (%s)", (event,))
```

### Kubernetes resource quotas as bulkheads

```yaml
# k8s-bulkhead.yaml — Resource limits as bulkheads in Kubernetes
apiVersion: v1
kind: ResourceQuota
metadata:
  name: critical-services-quota
  namespace: production
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: batch-jobs-quota
  namespace: batch
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "10"
---
# Deployment with resource limits — this pod can't consume more than its limit
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
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
      containers:
        - name: api
          image: shop/api-server:latest
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
```

## Variants

### Per-tenant bulkhead

```python
# bulkhead/per_tenant.py — Isolate resources per tenant
import threading
from collections import defaultdict

class PerTenantBulkhead:
    """Each tenant gets its own concurrency limit.
    One tenant can't exhaust resources for all others."""

    def __init__(self, max_per_tenant=10):
        self._max_per_tenant = max_per_tenant
        self._semaphores = defaultdict(lambda: threading.Semaphore(max_per_tenant))
        self._active = defaultdict(int)
        self._lock = threading.Lock()

    @contextmanager
    def acquire(self, tenant_id):
        sem = self._semaphores[tenant_id]
        if not sem.acquire(timeout=5):
            raise BulkheadFullError(
                f"Tenant {tenant_id} exceeded {self._max_per_tenant} concurrent requests"
            )
        with self._lock:
            self._active[tenant_id] += 1
        try:
            yield
        finally:
            with self._lock:
                self._active[tenant_id] -= 1
            sem.release()

    def get_stats(self):
        return dict(self._active)
```

### Hybrid bulkhead + circuit breaker

```python
# bulkhead/hybrid.py — Bulkhead with circuit breaker
import time
import threading

class BulkheadWithCircuitBreaker:
    """Combines bulkhead (concurrency limit) with circuit breaker (failure limit).
    Bulkhead prevents resource exhaustion; circuit breaker prevents calling
    a failing service."""

    def __init__(self, max_concurrent, failure_threshold=5, recovery_timeout=30):
        self._semaphore = threading.Semaphore(max_concurrent)
        self._failure_count = 0
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout
        self._circuit_open = False
        self._last_failure = 0
        self._lock = threading.Lock()

    def call(self, fn, *args, **kwargs):
        # Check circuit breaker
        with self._lock:
            if self._circuit_open:
                if time.time() - self._last_failure > self._recovery_timeout:
                    self._circuit_open = False
                    self._failure_count = 0
                else:
                    raise CircuitBreakerOpenError("Circuit is open")

        # Acquire bulkhead permit
        if not self._semaphore.acquire(timeout=10):
            raise BulkheadFullError("Bulkhead is full")

        try:
            result = fn(*args, **kwargs)
            with self._lock:
                self._failure_count = 0
                self._circuit_open = False
            return result
        except Exception as e:
            with self._lock:
                self._failure_count += 1
                self._last_failure = time.time()
                if self._failure_count >= self._failure_threshold:
                    self._circuit_open = True
            raise
        finally:
            self._semaphore.release()


class CircuitBreakerOpenError(Exception):
    pass
```

## Best Practices


- For a deeper guide, see [Leader Election Pattern](/patterns/leader-election-pattern/).

- Size bulkheads based on SLA — critical services get more resources, non-critical get less
- Monitor bulkhead utilization — alert when usage exceeds 80%
- Use separate pools for critical vs non-critical paths — never share
- Set queue capacity deliberately — unbounded queues hide backpressure
- Combine with circuit breakers — bulkheads limit concurrency, circuit breakers stop calling failing services
- Use timeouts inside bulkheads — a thread stuck on a slow call still occupies a slot
- Test bulkhead behavior — inject latency and verify isolation works

## Common Mistakes

- **Shared thread pool for all services**: defeats the purpose. One slow service starves all others.
- **No queue capacity limit**: tasks pile up in an unbounded queue, consuming memory.
- **Bulkhead too large**: if the pool is as large as the total, there's no isolation.
- **No timeout on bulkhead acquisition**: callers block indefinitely waiting for a permit.
- **Not monitoring bulkhead rejections**: silent failures when bulkhead is full. Alert on rejection rate.

## FAQ

### What is the bulkhead pattern?

A resilience pattern that isolates resources (thread pools, connection pools, memory) per service or operation. If one service exhausts its resources, other services still have their own separate resources available. Named after watertight compartments in ships.

### How is bulkhead different from rate limiting?

Rate limiting controls request rate (requests per second). Bulkheads control concurrent usage (active requests at a time). A bulkhead prevents resource exhaustion; rate limiting prevents overload from traffic spikes.

### How do I size a bulkhead?

Base it on the downstream service's capacity and your SLA. If the payment API handles 50 concurrent requests, set the payment bulkhead to 10-20 (leaving headroom for retries). For non-critical services, use smaller bulkheads (3-5).

### Should I use thread pool or semaphore bulkheads?

Thread pool bulkheads isolate execution threads — good for blocking I/O. Semaphore bulkheads limit concurrency without separate threads — good for async/non-blocking code. Use thread pools for blocking calls, semaphores for async frameworks.

### Can I combine bulkhead with retry?

Yes, but the retry should respect the bulkhead. If the bulkhead is full, don't retry — fail fast. Retrying into a full bulkhead just delays the inevitable failure and wastes caller resources.
