---
contentType: patterns
slug: ambassador-pattern
title: "Patrón Ambassador: Offloadeá Cross-Cutting Concerns a un"
description: "Cómo offloadar cross-cutting concerns a un proxy ambassador. Cubre connection pooling, retry logic, circuit breaking, monitoring, y TLS termination para client services."
metaDescription: "Offloadá cross-cutting concerns a un proxy ambassador. Aprende connection pooling, retry logic, circuit breaking, monitoring, y TLS termination para client services."
difficulty: intermediate
topics:
  - architecture
  - infrastructure
tags:
  - architecture
  - ambassador
  - proxy
  - networking
  - pattern
category: architectural
relatedResources:
  - /patterns/sidecar-pattern
  - /patterns/modular-monolith-pattern
  - /patterns/anti-corruption-layer-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Offloadá cross-cutting concerns a un proxy ambassador. Aprende connection pooling, retry logic, circuit breaking, monitoring, y TLS termination para client services."
  keywords:
    - architecture
    - ambassador
    - proxy
    - networking
    - pattern
---

## Overview

El ambassador pattern coloca un proxy service entre un client application y external services. El ambassador handlea cross-cutting concerns: connection pooling, retry logic, circuit breaking, monitoring, TLS termination, y request logging. El client application le habla al ambassador como si fuera el external service. El ambassador forwardea requests, agrega resilience policies, y collectéa metrics. A diferencia del sidecar pattern (que corre en el mismo pod), el ambassador puede correr como un separate process o container. Este pattern es useful cuando múltiples client instances necesitan sharear connection pools o cuando el client es un legacy system que no puede ser modified.

## When to Use

- Offloadando connection pooling para database o HTTP clients
- Agregando retry y circuit breaking a legacy clients que no pueden ser modified
- Centralizando TLS termination para internal services
- Monitoreando y logeando outbound traffic desde un service
- Rate-limitando outbound calls a external APIs

## When NOT to Use

- Cuando el client library ya handlea estos concerns (e.g., Hystrix, resilience4j)
- Cuando el proxy agrega unacceptable latency para real-time systems
- Cuando hay solo un client y el concern es suficientemente simple de handlear inline
- Cuando el external service ya provee connection pooling y retry

## Solution

### Ambassador como reverse proxy (Envoy)

```yaml
# envoy-ambassador.yaml — Envoy ambassador para outbound traffic
static_resources:
  listeners:
    - address:
        socket_address:
          address: 0.0.0.0
          port_value: 18080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: outbound
                route_config:
                  virtual_hosts:
                    - name: external-api
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route:
                            cluster: external-api
                            retry_policy:
                              retry_on: "5xx,connect-failure,refused-stream"
                              num_retries: 3
                              per_try_timeout: 5s
                            timeout: 30s
                http_filters:
                  - name: envoy.filters.http.router
  clusters:
    - name: external-api
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      circuit_breakers:
        thresholds:
          - max_connections: 100
            max_pending_requests: 50
            max_requests: 100
            max_retries: 3
      load_assignment:
        cluster_name: external-api
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: api.external.com
                      port_value: 443
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
          sni: api.external.com
```

### Python ambassador proxy

```python
# ambassador_proxy.py — Python ambassador para outbound API calls
import requests
import time
import logging
from functools import wraps
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AmbassadorProxy:
    """Proxy que agrega retry, circuit breaking, y monitoring
    a outbound calls sin modificar el client."""

    def __init__(self, target_url):
        self.target_url = target_url
        self.failure_count = 0
        self.failure_threshold = 5
        self.recovery_timeout = 30
        self.last_failure_time = None
        self.circuit_open = False
        self.request_stats = defaultdict(lambda: {"count": 0, "errors": 0, "latency_ms": []})

    def _check_circuit(self):
        if self.circuit_open:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                logger.info("Circuit breaker recovery attempt")
                self.circuit_open = False
                self.failure_count = 0
            else:
                raise CircuitBreakerOpenError("Circuit breaker is open")

    def _record_success(self, endpoint, latency_ms):
        self.failure_count = 0
        self.circuit_open = False
        stats = self.request_stats[endpoint]
        stats["count"] += 1
        stats["latency_ms"].append(latency_ms)

    def _record_failure(self, endpoint, latency_ms):
        self.failure_count += 1
        self.last_failure_time = time.time()
        stats = self.request_stats[endpoint]
        stats["count"] += 1
        stats["errors"] += 1
        stats["latency_ms"].append(latency_ms)

        if self.failure_count >= self.failure_threshold:
            self.circuit_open = True
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")

    def request(self, method, path, max_retries=3, **kwargs):
        endpoint = f"{method} {path}"
        self._check_circuit()

        last_error = None
        for attempt in range(max_retries):
            start = time.time()
            try:
                url = f"{self.target_url}{path}"
                resp = requests.request(method, url, timeout=10, **kwargs)
                latency_ms = (time.time() - start) * 1000

                if resp.status_code < 500:
                    self._record_success(endpoint, latency_ms)
                    return resp
                else:
                    last_error = f"HTTP {resp.status_code}"
                    logger.warning(f"Attempt {attempt+1} failed: {last_error}")

            except requests.RequestException as e:
                latency_ms = (time.time() - start) * 1000
                last_error = str(e)
                logger.warning(f"Attempt {attempt+1} failed: {e}")

            if attempt < max_retries - 1:
                backoff = 2 ** attempt
                time.sleep(backoff)

        self._record_failure(endpoint, 0)
        raise AmbassadorError(f"All retries exhausted: {last_error}")

    def get_stats(self):
        return {
            endpoint: {
                "count": s["count"],
                "errors": s["errors"],
                "avg_latency_ms": sum(s["latency_ms"]) / len(s["latency_ms"]) if s["latency_ms"] else 0,
                "circuit_open": self.circuit_open
            }
            for endpoint, s in self.request_stats.items()
        }


class CircuitBreakerOpenError(Exception):
    pass

class AmbassadorError(Exception):
    pass
```

### Client usando el ambassador

```python
# client_with_ambassador.py — client le habla al ambassador, no al external service
from ambassador_proxy import AmbassadorProxy

# Client pointéa a ambassador, no al real API
ambassador = AmbassadorProxy("https://api.external.com")

# Client code no sabe sobre retry, circuit breaking, o monitoring
def get_user_profile(user_id):
    resp = ambassador.request("GET", f"/users/{user_id}")
    return resp.json()

def create_order(order_data):
    resp = ambassador.request(
        "POST", "/orders",
        json=order_data,
        headers={"Content-Type": "application/json"}
    )
    return resp.json()

# Checkeá ambassador stats
stats = ambassador.get_stats()
for endpoint, s in stats.items():
    print(f"{endpoint}: {s['count']} requests, {s['errors']} errors, avg {s['avg_latency_ms']:.0f}ms")
```

### Nginx ambassador para database connection pooling

```nginx
# nginx-db-ambassador.conf — Nginx como database ambassador
upstream database_pool {
    server db-primary:5432 max_conns=100;
    server db-replica:5432 max_conns=50 backup;
    keepalive 32;
}

server {
    listen 5432;
    proxy_pass database_pool;
    proxy_connect_timeout 5s;
    proxy_timeout 30s;

    # Connection pooling
    proxy_buffer_size 16k;
    proxy_buffers 8 16k;
}
```

### Java ambassador con retry y metrics

```java
// AmbassadorClient.java — Java ambassador para outbound calls
import java.net.http.*;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class AmbassadorClient {

    private final HttpClient client;
    private final String targetUrl;
    private final ConcurrentHashMap<String, RequestStats> stats = new ConcurrentHashMap<>();
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final int failureThreshold = 5;
    private volatile boolean circuitOpen = false;
    private volatile long lastFailureTime = 0;
    private final long recoveryTimeoutMs = 30000;

    public AmbassadorClient(String targetUrl) {
        this.targetUrl = targetUrl;
        this.client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    public HttpResponse<String> request(String method, String path,
                                        String body, int maxRetries) throws Exception {
        checkCircuit();

        Exception lastError = null;
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            long start = System.currentTimeMillis();
            try {
                var builder = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl + path))
                    .timeout(Duration.ofSeconds(10));

                switch (method) {
                    case "GET" -> builder.GET();
                    case "POST" -> builder.POST(HttpRequest.BodyPublishers.ofString(body));
                    case "PUT" -> builder.PUT(HttpRequest.BodyPublishers.ofString(body));
                    case "DELETE" -> builder.DELETE();
                }

                var response = client.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString());

                long latency = System.currentTimeMillis() - start;
                recordSuccess(method + " " + path, latency);

                if (response.statusCode() < 500) {
                    return response;
                }

                lastError = new RuntimeException("HTTP " + response.statusCode());
            } catch (Exception e) {
                long latency = System.currentTimeMillis() - start;
                lastError = e;
                recordFailure(method + " " + path, latency);
            }

            if (attempt < maxRetries - 1) {
                Thread.sleep((long) Math.pow(2, attempt) * 1000);
            }
        }

        failureCount.incrementAndGet();
        lastFailureTime = System.currentTimeMillis();
        if (failureCount.get() >= failureThreshold) {
            circuitOpen = true;
        }

        throw new RuntimeException("All retries exhausted", lastError);
    }

    private void checkCircuit() throws Exception {
        if (circuitOpen) {
            if (System.currentTimeMillis() - lastFailureTime > recoveryTimeoutMs) {
                circuitOpen = false;
                failureCount.set(0);
            } else {
                throw new RuntimeException("Circuit breaker is open");
            }
        }
    }

    private void recordSuccess(String endpoint, long latencyMs) {
        failureCount.set(0);
        circuitOpen = false;
        stats.computeIfAbsent(endpoint, k -> new RequestStats())
             .record(latencyMs, true);
    }

    private void recordFailure(String endpoint, long latencyMs) {
        stats.computeIfAbsent(endpoint, k -> new RequestStats())
             .record(latencyMs, false);
    }

    static class RequestStats {
        final AtomicLong count = new AtomicLong(0);
        final AtomicLong errors = new AtomicLong(0);
        final AtomicLong totalLatency = new AtomicLong(0);

        void record(long latencyMs, boolean success) {
            count.incrementAndGet();
            totalLatency.addAndGet(latencyMs);
            if (!success) errors.incrementAndGet();
        }
    }
}
```

## Variants

### Ambassador como sidecar (in-process)

```python
# in_process_ambassador.py — ambassador logic embedded en el client
class InProcessAmbassador:
    """Ambassador logic embedded directamente en el client process.
    No separate container needed — solo una wrapper class."""

    def __init__(self, target_url, max_retries=3, timeout=10):
        self.target_url = target_url
        self.max_retries = max_retries
        self.timeout = timeout
        self._pool = requests.Session()
        # Configurá connection pooling
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,
            pool_maxsize=100,
            max_retries=0  # Handleamos retries nosotros
        )
        self._pool.mount("https://", adapter)
        self._pool.mount("http://", adapter)

    def get(self, path, **kwargs):
        return self._request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self._request("POST", path, **kwargs)

    def _request(self, method, path, **kwargs):
        for attempt in range(self.max_retries):
            try:
                resp = self._pool.request(
                    method,
                    f"{self.target_url}{path}",
                    timeout=self.timeout,
                    **kwargs
                )
                if resp.status_code < 500:
                    return resp
            except requests.RequestException:
                pass
            if attempt < self.max_retries - 1:
                time.sleep(2 ** attempt)
        raise AmbassadorError(f"Failed after {self.max_retries} retries")
```

### Ambassador para múltiples external services

```python
# multi_ambassador.py — un ambassador routeando a múltiples external services
class MultiServiceAmbassador:
    """Single ambassador que routeéa a múltiples external services."""

    def __init__(self):
        self.services = {}

    def register(self, name, url, config):
        self.services[name] = AmbassadorProxy(url)
        self.services[name].failure_threshold = config.get("failure_threshold", 5)

    def call(self, service, method, path, **kwargs):
        if service not in self.services:
            raise ValueError(f"Unknown service: {service}")
        return self.services[service].request(method, path, **kwargs)

    def all_stats(self):
        return {
            name: proxy.get_stats()
            for name, proxy in self.services.items()
        }

# Usage
ambassador = MultiServiceAmbassador()
ambassador.register("payment", "https://api.payment.com", {"failure_threshold": 3})
ambassador.register("shipping", "https://api.shipping.com", {"failure_threshold": 5})
ambassador.register("inventory", "https://api.inventory.com", {"failure_threshold": 10})

resp = ambassador.call("payment", "POST", "/charge", json={"amount": 99.99})
```

## Best Practices

- Usá connection pooling — el ambassador maintainéa persistent connections a external services
- Seteá appropriate timeouts — both per-request y overall, para prevent hanging
- Implementá circuit breaking — pará de llamar a un failing service para dejarlo recover
- Collectéa metrics — trackeá request count, error rate, latency per endpoint
- Usá exponential backoff para retries — 1s, 2s, 4s, no fixed intervals
- Mantené el ambassador stateless — no storeéas session data; es un proxy, no un cache
- Monitoreá el ambassador mismo — si falla, todos los clients fallan
- Usá standard proxies cuando sea possible — Envoy, Nginx, HAProxy en vez de custom code

## Common Mistakes

- **No circuit breaking**: el ambassador sigue sendeando requests a un failing service, haciendo things worse.
- **Retrying non-idempotent operations**: retryar POST requests puede crear duplicates. Solo retryá GET, PUT, DELETE.
- **No timeout en retries**: retries sin backoff crean un thundering herd. Usá exponential backoff.
- **Ambassador se vuelve un bottleneck**: single ambassador instance para todos los clients. Scaleéalo horizontalmente.
- **No monitoring en el ambassador**: no sabés cuando está failing. Monitoreá su health y metrics.

## FAQ

### ¿Qué es el ambassador pattern?

Un proxy service colocado entre un client y external services. El ambassador handlea cross-cutting concerns: connection pooling, retry, circuit breaking, monitoring, TLS. El client le habla al ambassador como si fuera el external service.

### ¿En qué se diferencia ambassador de sidecar?

Un sidecar corre en el mismo pod que el client. Un ambassador puede correr como un separate process o container, potencialmente shared por múltiples clients. Los sidecars son co-located; los ambassadors pueden ser remote.

### ¿Cuándo debería usar un ambassador en vez de un client library?

Cuando el client no puede ser modified (legacy system), cuando múltiples clients necesitan sharear connection pools, o cuando querés centralizar cross-cutting concerns across múltiples languages. Si el client es modern y soporta libraries, usá una library en su lugar.

### ¿Puede el ambassador ser un single point of failure?

Sí, si hay solo un instance. Corré múltiples ambassador instances detrás de un load balancer, o usá el sidecar variant donde cada pod tiene su propio ambassador.

### ¿Qué protocols soporta el ambassador?

Cualquier protocol que el proxy soporta. Envoy y Nginx soportan HTTP, gRPC, TCP, y TLS. Para database-specific protocols (PostgreSQL, MySQL), usá specialized proxies como PgBouncer o ProxySQL.
