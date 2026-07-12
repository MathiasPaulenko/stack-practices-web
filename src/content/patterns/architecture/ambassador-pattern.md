---



contentType: patterns
slug: ambassador-pattern
title: "Ambassador: Offload Cross-Cutting Concerns to a Proxy"
description: "How to offload cross-cutting concerns to a proxy ambassador. Covers connection pooling, retry logic, circuit breaking, monitoring, and TLS termination for client services."
metaDescription: "Offload cross-cutting concerns to a proxy ambassador. Learn connection pooling, retry logic, circuit breaking, monitoring, and TLS termination for client services."
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
  - /patterns/health-endpoint-monitoring-pattern
  - /patterns/backends-for-frontends-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Offload cross-cutting concerns to a proxy ambassador. Learn connection pooling, retry logic, circuit breaking, monitoring, and TLS termination for client services."
  keywords:
    - architecture
    - ambassador
    - proxy
    - networking
    - pattern



---

## Overview

The ambassador pattern places a proxy service between a client application and external services. The ambassador handles cross-cutting concerns: connection pooling, retry logic, circuit breaking, monitoring, TLS termination, and request logging. The client application talks to the ambassador as if it were the external service. The ambassador forwards requests, adds resilience policies, and collects metrics. Unlike the sidecar pattern (which runs in the same pod), the ambassador can run as a separate process or container. This pattern is useful when multiple client instances need to share connection pools or when the client is a legacy system that can't be modified.

## When to Use

- Offloading connection pooling for database or HTTP clients
- Adding retry and circuit breaking to legacy clients that can't be modified
- Centralizing TLS termination for internal services
- Monitoring and logging outbound traffic from a service
- Rate-limiting outbound calls to external APIs

## When NOT to Use

- When the client library already handles these concerns (e.g., Hystrix, resilience4j)
- When the proxy adds unacceptable latency for real-time systems
- When there's only one client and the concern is simple enough to handle inline
- When the external service already provides connection pooling and retry

## Solution

### Ambassador as a reverse proxy (Envoy)

```yaml
# envoy-ambassador.yaml — Envoy ambassador for outbound traffic
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
# ambassador_proxy.py — Python ambassador for outbound API calls
import requests
import time
import logging
from functools import wraps
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AmbassadorProxy:
    """Proxy that adds retry, circuit breaking, and monitoring
    to outbound calls without modifying the client."""

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

### Client using the ambassador

```python
# client_with_ambassador.py — client talks to ambassador, not external service
from ambassador_proxy import AmbassadorProxy

# Client points to ambassador, not the real API
ambassador = AmbassadorProxy("https://api.external.com")

# Client code doesn't know about retry, circuit breaking, or monitoring
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

# Check ambassador stats
stats = ambassador.get_stats()
for endpoint, s in stats.items():
    print(f"{endpoint}: {s['count']} requests, {s['errors']} errors, avg {s['avg_latency_ms']:.0f}ms")
```

### Nginx ambassador for database connection pooling

```nginx
# nginx-db-ambassador.conf — Nginx as database ambassador
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

### Java ambassador with retry and metrics

```java
// AmbassadorClient.java — Java ambassador for outbound calls
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

### Ambassador as a sidecar (in-process)

```python
# in_process_ambassador.py — ambassador logic embedded in the client
class InProcessAmbassador:
    """Ambassador logic embedded directly in the client process.
    No separate container needed — just a wrapper class."""

    def __init__(self, target_url, max_retries=3, timeout=10):
        self.target_url = target_url
        self.max_retries = max_retries
        self.timeout = timeout
        self._pool = requests.Session()
        # Configure connection pooling
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,
            pool_maxsize=100,
            max_retries=0  # We handle retries ourselves
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

### Ambassador for multiple external services

```python
# multi_ambassador.py — one ambassador routing to multiple external services
class MultiServiceAmbassador:
    """Single ambassador that routes to multiple external services."""

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


- For a deeper guide, see [Compute Resource Consolidation Pattern](/patterns/compute-resource-consolidation-pattern/).

- Use connection pooling — the ambassador maintains persistent connections to external services
- Set appropriate timeouts — both per-request and overall, to prevent hanging
- Implement circuit breaking — stop calling a failing service to let it recover
- Collect metrics — track request count, error rate, latency per endpoint
- Use exponential backoff for retries — 1s, 2s, 4s, not fixed intervals
- Keep the ambassador stateless — don't store session data; it's a proxy, not a cache
- Monitor the ambassador itself — if it fails, all clients fail
- Use standard proxies when possible — Envoy, Nginx, HAProxy instead of custom code

## Common Mistakes

- **No circuit breaking**: the ambassador keeps sending requests to a failing service, making things worse.
- **Retrying non-idempotent operations**: retrying POST requests can create duplicates. Only retry GET, PUT, DELETE.
- **No timeout on retries**: retries without backoff create a thundering herd. Use exponential backoff.
- **Ambassador becomes a bottleneck**: single ambassador instance for all clients. Scale it horizontally.
- **No monitoring on the ambassador**: you don't know when it's failing. Monitor its health and metrics.

## FAQ

### What is the ambassador pattern?

A proxy service placed between a client and external services. The ambassador handles cross-cutting concerns: connection pooling, retry, circuit breaking, monitoring, TLS. The client talks to the ambassador as if it were the external service.

### How is ambassador different from sidecar?

A sidecar runs in the same pod as the client. An ambassador can run as a separate process or container, potentially shared by multiple clients. Sidecars are co-located; ambassadors can be remote.

### When should I use an ambassador instead of a client library?

When the client can't be modified (legacy system), when multiple clients need to share connection pools, or when you want to centralize cross-cutting concerns across multiple languages. If the client is modern and supports libraries, use a library instead.

### Can the ambassador be a single point of failure?

Yes, if there's only one instance. Run multiple ambassador instances behind a load balancer, or use the sidecar variant where each pod has its own ambassador.

### What protocols does the ambassador support?

Any protocol the proxy supports. Envoy and Nginx support HTTP, gRPC, TCP, and TLS. For database-specific protocols (PostgreSQL, MySQL), use specialized proxies like PgBouncer or ProxySQL.
