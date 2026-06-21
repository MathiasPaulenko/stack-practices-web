---
contentType: guides
slug: api-gateway-design-guide
title: "API Gateway Design — Resilience, Routing, and Security"
description: "A practical guide to designing API gateways: routing patterns, rate limiting, authentication, circuit breakers, and observability for resilient APIs."
metaDescription: "Learn how to design resilient API gateways with routing, rate limiting, authentication, circuit breakers, and observability. Complete guide for engineering teams."
difficulty: advanced
topics:
  - architecture
  - api
tags:
  - api-gateway
  - architecture
  - routing
  - rate-limiting
  - security
  - resilience
  - observability
  - microservices
  - guide
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/monolith-to-microservices-migration-guide
  - /guides/api-security-checklist-guide
  - /guides/rest-api-design-guide
  - /docs/microservice-contract-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Learn how to design resilient API gateways with routing, rate limiting, authentication, circuit breakers, and observability. Complete guide for engineering teams."
  keywords:
    - api-gateway
    - architecture
    - routing
    - rate-limiting
    - security
    - resilience
    - observability
    - microservices
    - guide
---
## Overview

Every microservices architecture eventually needs a front door. The API gateway is that door — and if you design it poorly, it becomes a single point of failure, a performance bottleneck, or a security gap. A well-designed gateway handles routing, rate limiting, authentication, circuit breaking, and observability so that individual services can focus on business logic. This guide covers the core patterns, trade-offs, and implementation strategies for building resilient API gateways.

## When to Use

Use this guide when:
- You are migrating from a monolith to microservices and need a unified entry point
- Your client applications talk directly to backend services and you need to consolidate cross-cutting concerns
- You are experiencing cascading failures, authentication inconsistencies, or observability blind spots across services

## Solution

### Core Gateway Responsibilities

| Concern | Implementation Approach | Key Technology |
|---------|------------------------|----------------|
| **Request Routing** | Path-based, header-based, or host-based routing to upstream services | Nginx, Kong, Envoy, AWS API Gateway |
| **Rate Limiting** | Token bucket or leaky bucket per client, IP, or API key | Redis + Lua, Envoy, Kong |
| **Authentication** | Validate JWT, API keys, or OAuth2 tokens at the edge | Keycloak, Auth0, custom middleware |
| **Circuit Breaker** | Track failure rates and fail fast when upstreams are unhealthy | Resilience4j, Envoy, Hystrix (legacy) |
| **Load Balancing** | Round-robin, least connections, or consistent hashing | Envoy, Nginx, service mesh |
| **Observability** | Distributed tracing, metrics, and access logs | OpenTelemetry, Prometheus, ELK |
| **SSL Termination** | Offload TLS at the gateway to reduce CPU load on services | Nginx, HAProxy, cloud load balancers |
| **Request/Response Transformation** | Header injection, payload rewriting, protocol translation | Kong plugins, Envoy filters |

### Routing Architecture Example

```yaml
# Envoy configuration snippet
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/api/users" }
                          route: { cluster: user_service, prefix_rewrite: "/" }
                        - match: { prefix: "/api/orders" }
                          route: { cluster: order_service, prefix_rewrite: "/" }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
    - name: user_service
      connect_timeout: 0.25s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: user_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: user-service, port_value: 8080 }
    - name: order_service
      connect_timeout: 0.25s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: order_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: order-service, port_value: 8080 }
```

### Rate Limiting Implementation

```python
# Token bucket rate limiter with Redis
import time
import redis

class TokenBucketRateLimiter:
    def __init__(self, redis_client, key_prefix, capacity, refill_rate):
        self.redis = redis_client
        self.key_prefix = key_prefix
        self.capacity = capacity
        self.refill_rate = refill_rate

    def is_allowed(self, client_id):
        key = f"{self.key_prefix}:{client_id}"
        pipeline = self.redis.pipeline()
        now = time.time()
        pipeline.hmget(key, ["tokens", "last_refill"])
        result = pipeline.execute()
        tokens = float(result[0][0] or self.capacity)
        last_refill = float(result[0][1] or now)

        elapsed = now - last_refill
        tokens = min(self.capacity, tokens + elapsed * self.refill_rate)

        if tokens >= 1:
            tokens -= 1
            self.redis.hmset(key, {"tokens": tokens, "last_refill": now})
            self.redis.expire(key, 60)
            return True
        else:
            self.redis.hmset(key, {"tokens": tokens, "last_refill": last_refill})
            return False
```

### Circuit Breaker Pattern

```java
// Resilience4j circuit breaker configuration
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)
    .slowCallRateThreshold(80)
    .slowCallDurationThreshold(Duration.ofSeconds(2))
    .permittedNumberOfCallsInHalfOpenState(10)
    .slidingWindowSize(100)
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .build();

CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(config);
CircuitBreaker userServiceCB = registry.circuitBreaker("userService");

Supplier<String> decorated = CircuitBreaker
    .decorateSupplier(userServiceCB, () -> userClient.getUser(userId));
```

## Explanation

The API gateway is a **reverse proxy with intelligence**. It sits between clients and backend services, centralizing cross-cutting concerns that would otherwise be duplicated in every service. The key insight is that not every concern belongs in the gateway: business logic should stay in services, but authentication, rate limiting, and routing are gateway responsibilities.

Routing decisions should be **stateless and deterministic** so that any gateway instance can handle any request. Session affinity (sticky sessions) should be avoided; if you need it, prefer consistent hashing over IP-based stickiness. Rate limiting must be **distributed** in a multi-instance gateway deployment; local in-memory counters are insufficient because a client can round-robin across instances and bypass limits.

Circuit breakers prevent cascading failures. When a service is struggling, the gateway should fail fast rather than queue requests that will timeout. This protects both the struggling service and the caller. The half-open state allows gradual recovery: after a cooldown, a limited number of requests are allowed through to test if the service has recovered.

## Variants

| Gateway Type | Best For | Trade-off |
|--------------|----------|-----------|
| **Nginx / OpenResty** | High throughput, simple routing | Lua scripting for custom logic; limited plugin ecosystem |
| **Kong** | Plugin-rich, enterprise features | Higher latency than Nginx; managed option available |
| **Envoy** | Cloud-native, service mesh integration | Steep learning curve; YAML configuration verbosity |
| **AWS API Gateway** | Serverless, AWS ecosystem | Vendor lock-in; cold start latency for v2 |
| **Spring Cloud Gateway** | Java/Spring ecosystems | JVM memory footprint; tight Spring coupling |
| **Traefik** | Dynamic Docker/K8s discovery | Simpler than Envoy; less advanced traffic management |

## Best Practices

1. Keep the gateway **stateless**; store session data in Redis or client-side tokens
2. Use **async I/O** in the gateway to avoid thread pool exhaustion under load
3. Implement **health checks** for every upstream and remove unhealthy instances promptly
4. Log **request IDs** and propagate them via headers for distributed tracing
5. Cache **authentication results** at the gateway to avoid validating the same token on every request

## Common Mistakes

1. Putting **business logic** in the gateway; it becomes a distributed monolith
2. Using the gateway as a **shared database connection pool**; services should manage their own connections
3. Implementing **rate limiting per instance** instead of distributed; clients bypass limits by hitting different instances
4. Not setting **timeouts** on upstream calls; a slow service can exhaust gateway threads
5. Ignoring **gateway health** in monitoring; the gateway is infrastructure, not invisible plumbing

## Frequently Asked Questions

### Should I use one gateway or multiple?

One gateway is simpler but becomes a bottleneck and a single point of failure. Most organizations eventually split by concern: a public gateway for external clients, an internal gateway for service-to-service communication, and possibly a B2B gateway for partner APIs. The rule of thumb: split when your gateway configuration exceeds 1,000 lines or when different clients need fundamentally different authentication schemes.

### How do I handle WebSocket connections through a gateway?

WebSockets require **connection-aware routing**. The gateway must maintain the TCP connection and route subsequent frames to the same upstream instance. Not all gateways support this natively. Envoy and Nginx do; AWS API Gateway v2 supports WebSockets with Lambda or HTTP integrations. For high-scale WebSocket workloads, consider a dedicated WebSocket gateway separate from your HTTP API gateway.

### What is the performance impact of adding a gateway?

A well-tuned gateway adds **0.5–2ms latency** per hop for simple routing. SSL termination can actually improve total latency because services no longer do TLS handshakes. The biggest risk is misconfiguration: overly complex regex routing, synchronous blocking I/O, or excessive request/response transformation. Benchmark your gateway independently using tools like k6 or vegeta before deploying to production.
