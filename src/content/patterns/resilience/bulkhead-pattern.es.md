---





contentType: patterns
slug: bulkhead-pattern
title: "Patrón Bulkhead: Isolá Resources para Limitar Blast Radius"
description: "Cómo isolatar resources per service para limitar blast radius. Cubre thread pool isolation, connection pool partitioning, semaphore-based bulkheads, y resource quotas."
metaDescription: "Isolá resources per service para limitar blast radius. Aprende thread pool isolation, connection pool partitioning, semaphore-based bulkheads, y resource quotas."
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
  metaDescription: "Isolá resources per service para limitar blast radius. Aprende thread pool isolation, connection pool partitioning, semaphore-based bulkheads, y resource quotas."
  keywords:
    - architecture
    - resilience
    - bulkhead
    - isolation
    - pattern





---

## Overview

El bulkhead pattern isolata resources para que un failure en una parte del system no cascade a otras. Como watertight compartments en un ship, si uno floodea, el ship stays afloat. En software, esto significa assignear separate thread pools, connection pools, o memory limits a diferentes services u operations. Si el service A exhauste su thread pool, el service B todavía tiene threads available. Sin bulkheads, un single slow downstream service puede consumir todos los threads en un shared pool, starveando todas las other operations.

## When to Use

- Múltiples downstream services shareando un common resource pool (threads, connections)
- Preveniendo que un slow service starvee otras operations
- Microservices donde diferentes endpoints tienen different SLA requirements
- Database connection isolation entre critical y non-critical paths
- Rate-limitando resource consumption per tenant o per service

## When NOT to Use

- Single-service applications sin downstream dependencies
- Cuando el resource overhead de separate pools outweighéa el isolation benefit
- Low-traffic systems donde contention es unlikely
- Cuando el downstream service es extremely reliable y fast

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
    """Manageéa separate thread pools para diferentes services.
    Cada service obtiene su propio pool — un service no puede exhaust otro's threads."""

    def __init__(self):
        self._pools = {}
        self._configs = {}
        self._active = defaultdict(int)

    def configure(self, service_name, max_workers, queue_capacity=100):
        """Configurá un bulkhead para un specific service."""
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
        """Submiteá un task a un service's bulkhead.
        Raiseéa BulkheadFullError si el pool y queue están exhausted."""
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
    """Raiseado cuando un bulkhead's thread pool y queue están full."""
    pass


# Usage
bulkhead = BulkheadManager()
bulkhead.configure("payment", max_workers=10, queue_capacity=20)
bulkhead.configure("inventory", max_workers=5, queue_capacity=10)
bulkhead.configure("notifications", max_workers=3, queue_capacity=5)

def call_payment_api(amount):
    time.sleep(0.5)
    return {"status": "charged", "amount": amount}

# Payment obtiene su propio pool — inventory issues no lo affectéan
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
    """Limiteéa concurrent calls usando un semaphore.
    Más lighter que thread pool — funciona con cualquier execution model."""

    def __init__(self, max_concurrent, timeout=30):
        self._semaphore = threading.Semaphore(max_concurrent)
        self._max = max_concurrent
        self._timeout = timeout
        self._active = 0
        self._lock = threading.Lock()

    @contextmanager
    def acquire(self):
        """Context manager que acquireéa un permit."""
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
        """Decorator que wrapea un function con bulkhead protection."""
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


# Usage — protectéa database access
db_bulkhead = SemaphoreBulkhead(max_concurrent=20)

@db_bulkhead
def query_database(sql):
    time.sleep(0.1)
    return {"rows": 42}

# Usage — protectéa external API calls
api_bulkhead = SemaphoreBulkhead(max_concurrent=5, timeout=10)

def call_external_api(endpoint):
    with api_bulkhead.acquire():
        time.sleep(0.5)
        return {"data": "response"}
```

### Java bulkhead con Spring

```java
// BulkheadConfig.java — Java bulkhead usando resilience4j
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadConfig;
import io.github.resilience4j.bulkhead.ThreadPoolBulkhead;
import io.github.resilience4j.bulkhead.ThreadPoolBulkheadConfig;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

public class ServiceBulkheads {

    // Semaphore-based bulkhead para synchronous calls
    private final Bulkhead paymentBulkhead;
    private final Bulkhead inventoryBulkhead;

    // Thread pool bulkhead para async calls
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
    """Maintainéa separate database connection pools per service.
    Critical services no pueden ser starved por non-critical ones."""

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


# Usage — critical y non-critical services obtienen separate pools
pools = IsolatedConnectionPools()

# Payment: critical, obtiene más connections
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
# k8s-bulkhead.yaml — Resource limits as bulkheads en Kubernetes
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
# Deployment con resource limits — este pod no puede consumir más que su limit
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
# bulkhead/per_tenant.py — Isolatéa resources per tenant
import threading
from collections import defaultdict

class PerTenantBulkhead:
    """Cada tenant obtiene su propio concurrency limit.
    Un tenant no puede exhaust resources para todos los others."""

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
# bulkhead/hybrid.py — Bulkhead con circuit breaker
import time
import threading

class BulkheadWithCircuitBreaker:
    """Combina bulkhead (concurrency limit) con circuit breaker (failure limit).
    Bulkhead previene resource exhaustion; circuit breaker previene llamar
    a un failing service."""

    def __init__(self, max_concurrent, failure_threshold=5, recovery_timeout=30):
        self._semaphore = threading.Semaphore(max_concurrent)
        self._failure_count = 0
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout
        self._circuit_open = False
        self._last_failure = 0
        self._lock = threading.Lock()

    def call(self, fn, *args, **kwargs):
        # Checkeá circuit breaker
        with self._lock:
            if self._circuit_open:
                if time.time() - self._last_failure > self._recovery_timeout:
                    self._circuit_open = False
                    self._failure_count = 0
                else:
                    raise CircuitBreakerOpenError("Circuit is open")

        # Acquireéa bulkhead permit
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


- For a deeper guide, see [Leader Election Pattern](/es/patterns/leader-election-pattern/).

- Sizeéa bulkheads basado en SLA — critical services obtienen más resources, non-critical obtienen less
- Monitoreá bulkhead utilization — alerteá cuando usage excede 80%
- Usá separate pools para critical vs non-critical paths — nunca shareées
- Seteá queue capacity deliberadamente — unbounded queues hideéan backpressure
- Combiná con circuit breakers — bulkheads limiteán concurrency, circuit breakers detienen calling a failing services
- Usá timeouts dentro de bulkheads — un thread stuck en un slow call todavía ocupa un slot
- Testeá bulkhead behavior — injecteá latency y verificá que isolation funciona

## Common Mistakes

- **Shared thread pool para todos los services**: defeatéa el purpose. Un slow service starveéa a todos los others.
- **No queue capacity limit**: tasks pile up en un unbounded queue, consumiendo memory.
- **Bulkhead too large**: si el pool es tan large como el total, no hay isolation.
- **No timeout en bulkhead acquisition**: callers blockéan indefinitely esperando un permit.
- **No monitoring de bulkhead rejections**: silent failures cuando bulkhead está full. Alertéa en rejection rate.

## FAQ

### ¿Qué es el bulkhead pattern?

Un resilience pattern que isolata resources (thread pools, connection pools, memory) per service u operation. Si un service exhaust sus resources, otros services todavía tienen sus propios separate resources available. Nombrado después de watertight compartments en ships.

### ¿En qué se diferencia bulkhead de rate limiting?

Rate limiting controla request rate (requests per second). Bulkheads controlan concurrent usage (active requests at a time). Un bulkhead previene resource exhaustion; rate limiting previene overload desde traffic spikes.

### ¿Cómo sizeéo un bulkhead?

Basalo en el downstream service's capacity y tu SLA. Si el payment API handleéa 50 concurrent requests, seteá el payment bulkhead a 10-20 (dejando headroom para retries). Para non-critical services, usá smaller bulkheads (3-5).

### ¿Debería usar thread pool o semaphore bulkheads?

Thread pool bulkheads isolateán execution threads — good para blocking I/O. Semaphore bulkheads limiteán concurrency sin separate threads — good para async/non-blocking code. Usá thread pools para blocking calls, semaphores para async frameworks.

### ¿Puedo combinar bulkhead con retry?

Sí, pero el retry debería respect el bulkhead. Si el bulkhead está full, no retryéees — fail fast. Retryando en un full bulkhead solo delayéa el inevitable failure y wasteéa caller resources.
