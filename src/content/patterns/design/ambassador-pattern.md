---
contentType: patterns
slug: ambassador-pattern
title: "Ambassador Pattern"
description: "Deploy a client-side proxy that handles cross-cutting concerns for outbound service calls. A microservices pattern for smart client-side networking."
metaDescription: "Learn the Ambassador Pattern in Python, Java, and JavaScript. Microservices pattern for client-side proxy with retries, circuit breaking, and service discovery."
difficulty: intermediate
topics:
  - design
tags:
  - ambassador
  - design-pattern
  - java
  - javascript
  - microservices
  - pattern
  - python
relatedResources:
  - /patterns/design/sidecar-pattern
  - /patterns/design/proxy-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Ambassador Pattern in Python, Java, and JavaScript. Microservices pattern for client-side proxy with retries, circuit breaking, and service discovery."
  keywords:
    - ambassador pattern
    - design pattern
    - microservices pattern
    - client side proxy
    - service discovery
    - python ambassador
    - java ambassador
    - javascript ambassador
---

# Ambassador Pattern

## Overview

The Ambassador Pattern deploys a client-side [proxy](/patterns/design/proxy-pattern) alongside an application to handle cross-cutting concerns for outbound service calls. The ambassador manages retries, circuit breaking, load balancing, service discovery, and TLS termination — freeing the main application from networking complexity.

## When to Use

Use the Ambassador Pattern when:
- The main application should not contain networking logic (retries, timeouts, TLS)
- Multiple services share the same outbound concerns, and you want to centralize them
- You need language-agnostic networking features across polyglot services
- You want to upgrade networking logic without changing the main application
- Examples: service mesh sidecars (Envoy/Istio), API gateway clients, smart proxies

## Solution

### Python

```python
import time
import random
from typing import Callable, Any

class AmbassadorProxy:
    def __init__(self, target_host: str, max_retries: int = 3, timeout: float = 2.0):
        self.target = target_host
        self.max_retries = max_retries
        self.timeout = timeout

    def call(self, fn: Callable, *args, **kwargs) -> Any:
        for attempt in range(1, self.max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retries:
                    raise
                wait = 2 ** attempt
                print(f"[Ambassador] Retry {attempt} after {wait}s: {e}")
                time.sleep(wait)
        return None

# Main app — no networking logic
class PaymentService:
    def __init__(self):
        self.ambassador = AmbassadorProxy("payment-api.example.com")

    def charge(self, amount: float):
        return self.ambassador.call(self._do_charge, amount)

    def _do_charge(self, amount: float):
        if random.random() < 0.6:
            raise ConnectionError("Payment API unreachable")
        return {"status": "charged", "amount": amount}

# Usage
service = PaymentService()
try:
    result = service.charge(99.99)
    print(result)
except ConnectionError as e:
    print(f"All retries failed: {e}")
```

### JavaScript

```javascript
class AmbassadorProxy {
  constructor(targetHost, { maxRetries = 3, timeoutMs = 2000 } = {}) {
    this.target = targetHost;
    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
  }

  async call(fn, ...args) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (e) {
        if (attempt === this.maxRetries) throw e;
        const wait = 2 ** attempt * 1000;
        console.log(`[Ambassador] Retry ${attempt} after ${wait}ms: ${e.message}`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
}

// Main app
class PaymentService {
  constructor() {
    this.ambassador = new AmbassadorProxy("payment-api.example.com");
  }

  async charge(amount) {
    return this.ambassador.call(this._doCharge.bind(this), amount);
  }

  async _doCharge(amount) {
    if (Math.random() < 0.6) throw new Error("Payment API unreachable");
    return { status: "charged", amount };
  }
}

// Usage
const service = new PaymentService();
service.charge(99.99)
  .then(console.log)
  .catch(e => console.log("All retries failed:", e.message));
```

### Java

```java
import java.util.function.Function;

public class AmbassadorProxy {
    private final String target;
    private final int maxRetries;
    private final long timeoutMs;

    public AmbassadorProxy(String target, int maxRetries, long timeoutMs) {
        this.target = target;
        this.maxRetries = maxRetries;
        this.timeoutMs = timeoutMs;
    }

    public <T> T call(Function<Void, T> fn) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return fn.apply(null);
            } catch (Exception e) {
                if (attempt == maxRetries) throw new RuntimeException("All retries failed", e);
                long wait = (long) Math.pow(2, attempt) * 1000;
                System.out.println("[Ambassador] Retry " + attempt + " after " + wait + "ms");
                try {
                    Thread.sleep(wait);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during retry", ie);
                }
            }
        }
        throw new IllegalStateException("Unreachable");
    }
}

// Main app
class PaymentService {
    private final AmbassadorProxy ambassador;

    PaymentService() {
        this.ambassador = new AmbassadorProxy("payment-api.example.com", 3, 2000);
    }

    String charge(double amount) {
        return ambassador.call(v -> {
            if (Math.random() < 0.6) throw new RuntimeException("Payment API unreachable");
            return "charged: " + amount;
        });
    }
}

// Usage
PaymentService service = new PaymentService();
try {
    System.out.println(service.charge(99.99));
} catch (Exception e) {
    System.out.println("All retries failed: " + e.getMessage());
}
```

## Explanation

The Ambassador Pattern acts as a **smart client-side proxy**:

- **Proxy**: Intercepts outbound calls from the main application
- **Retries**: Automatically retries failed transient requests
- **Circuit Breaking**: Stops sending requests to failing services
- **Load Balancing**: Distributes requests across service instances
- **Service Discovery**: Resolves service names to actual endpoints
- **TLS/Auth**: Handles encryption and authentication transparently

The main application makes simple calls; the ambassador handles all networking resilience.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Sidecar Ambassador** | Runs as a co-located container (Envoy) | Kubernetes, service mesh |
| **Library Ambassador** | Embedded client library (Resilience4j) | When sidecars aren't available |
| **Reverse Ambassador** | Server-side proxy for incoming calls | API gateway, ingress controller |
| **Multi-Tenant Ambassador** | Routes per-tenant to different backends | SaaS applications |

## Best Practices

- **Keep the main application networking-naive** — it should just call methods
- **Configure retries with exponential backoff and jitter** to avoid thundering herd
- **Include [circuit breaker](/patterns/design/circuit-breaker-pattern) logic** in the ambassador, not the main app
- **Log and metrics all outbound calls** from the ambassador for observability
- **Keep ambassador logic stateless** so it can be reused across services

## Common Mistakes

- Embedding retry/circuit breaker logic directly in the main application
- Making the ambassador too complex, becoming a single point of failure
- Not configuring timeouts, allowing calls to hang indefinitely
- Using ambassador for simple single-service apps where direct calls suffice
- Not monitoring ambassador health independently from the main app

## Frequently Asked Questions

**Q: What is the difference between Ambassador and API Gateway?**
A: Ambassador is a client-side proxy (per-service). [API Gateway](/recipes/serverless/serverless-api-gateway) is a server-side proxy (per-cluster/ingress). Both handle cross-cutting concerns but at different layers.

**Q: Should I use a service mesh sidecar or an embedded library?**
A: [Service mesh](/guides/architecture/microservices-architecture-guide) sidecars (Envoy) give you language-agnostic, infrastructure-level features with no code changes. Embedded libraries (Resilience4j, Polly) have lower latency but require per-language implementation.
