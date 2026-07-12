---




contentType: patterns
slug: ambassador-pattern-services
title: "Ambassador Pattern for Resilient Remote Service Access"
description: "Add a local ambassador that handles retries, circuit breaking, and monitoring when calling remote services, keeping the client simple and the service logic pure"
metaDescription: "Ambassador pattern for resilient service calls. Use a local proxy to handle retries, circuit breaking, and monitoring when accessing remote microservices."
difficulty: intermediate
topics:
  - design
  - infrastructure
tags:
  - ambassador
  - structural-patterns
  - microservices
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/circuit-breaker-pattern
  - /patterns/abstract-factory-cross-platform
  - /recipes/docker-compose-local-dev
  - /recipes/helm-chart-deployment
  - /recipes/load-balancing-haproxy
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ambassador pattern for resilient service calls. Use a local proxy to handle retries, circuit breaking, and monitoring when accessing remote microservices."
  keywords:
    - ambassador pattern
    - service mesh
    - remote service proxy
    - structural patterns
    - resilience




---

# Ambassador Pattern for Resilient Remote Service Access

The Ambassador pattern creates a local helper instance that acts on behalf of a remote service. It handles network concerns like retries, timeouts, circuit breaking, and logging, keeping the client code clean and the remote service interface simple. This pattern is common in [microservices](/guides/architecture/microservices-architecture-guide) and containerized deployments.

## When to Use This

- A client calls a remote service and needs retries, caching, or monitoring
- You want to keep the service interface simple without cross-cutting concerns
- Language or framework constraints prevent using a sidecar proxy

## Problem

Every service that calls a remote API duplicates retry logic, timeout handling, and metrics collection. This bloats clients and makes resilience policies inconsistent.

## Solution

```typescript
// ambassador/ServiceClient.ts
interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// Remote service implementation
class RemoteUserService implements UserService {
  async getUser(id: string): Promise<{ id: string; name: string }> {
    const response = await fetch(`https://api.example.com/users/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

// Ambassador with resilience logic
class UserServiceAmbassador implements UserService {
  private circuitOpen = false;
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly retryCount = 3;
  private readonly timeoutMs = 2000;

  constructor(private remote: UserService) {}

  async getUser(id: string): Promise<{ id: string; name: string }> {
    if (this.circuitOpen) {
      throw new Error('Circuit breaker is open');
    }

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const result = await this.callWithTimeout(id);
        this.onSuccess();
        return result;
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error);
        if (attempt === this.retryCount) {
          this.onFailure();
          throw error;
        }
        await this.delay(1000 * attempt); // Exponential backoff
      }
    }

    throw new Error('Unreachable');
  }

  private async callWithTimeout(id: string): Promise<{ id: string; name: string }> {
    return Promise.race([
      this.remote.getUser(id),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
      ),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpen = true;
      setTimeout(() => {
        this.circuitOpen = false;
        this.failureCount = 0;
      }, 30000);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Client uses the ambassador transparently
class OrderService {
  constructor(private users: UserService) {}

  async getOrderWithUser(orderId: string): Promise<unknown> {
    const order = { id: orderId, userId: 'user-123' };
    const user = await this.users.getUser(order.userId);
    return { ...order, user };
  }
}

// Usage
const remote = new RemoteUserService();
const ambassador = new UserServiceAmbassador(remote);
const orders = new OrderService(ambassador);
```

## Variation: Monitoring Ambassador

```typescript
// ambassador/Monitoring.ts
class MonitoringAmbassador implements UserService {
  private requestCount = 0;
  private errorCount = 0;
  private totalLatency = 0;

  constructor(private remote: UserService) {}

  async getUser(id: string): Promise<{ id: string; name: string }> {
    const start = Date.now();
    this.requestCount++;

    try {
      const result = await this.remote.getUser(id);
      this.totalLatency += Date.now() - start;
      return result;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  getMetrics(): { requests: number; errors: number; avgLatency: number } {
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      avgLatency: this.requestCount > 0 ? this.totalLatency / this.requestCount : 0,
    };
  }
}
```

## How It Works

1. **Remote Service** provides the core business logic
2. **Ambassador** wraps the remote service with resilience and observability
3. **Client** calls the ambassador as if it were the real service
4. **Policies** (retries, circuit breaking) are centralized in the ambassador

## Production Considerations

- Combine with a [service mesh](/guides/architecture/microservices-architecture-guide) (Istio, Linkerd) for cluster-wide policy enforcement
- Use connection pooling in the ambassador to reduce TCP overhead
- Keep the ambassador stateless so it can be recreated on failure

## Common Mistakes

- Putting business logic in the ambassador instead of resilience logic
- Not distinguishing between retryable and non-retryable errors
- Failing to propagate cancellation signals through the ambassador

## FAQ

**Q: How is this different from Proxy?**
A: [Proxy](/patterns/design/proxy-pattern) controls access to a single object. Ambassador specifically handles remote service resilience and is usually deployed as a local process or library.

**Q: Can I use this with gRPC?**
A: Yes. gRPC interceptors are a form of ambassador pattern for adding retries, deadlines, and auth to service calls.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Ambassador for Legacy Service

```text
System: Modern microservice needs to call legacy SOAP service
Pattern: Ambassador as intermediary

Architecture:
  Modern Service -> Ambassador -> Legacy SOAP Service

  Ambassador responsibilities:
    1. Translate REST/JSON to SOAP/XML
    2. Retries with exponential backoff
    3. Circuit breaker
    4. Metrics and logging
    5. Rate limiting
    6. Response caching

```typescript
// Ambassador: wraps the legacy service
class LegacyAmbassador {
  private circuitBreaker: CircuitBreaker;
  private cache = new Map<string, { data: unknown; expiry: number }>();
  private retryConfig = { maxRetries: 3, backoffMs: 1000 };

  constructor(private legacyEndpoint: string) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
    });
  }

  async callLegacy(method: string, params: unknown): Promise<unknown> {
    // 1. Circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      throw new Error("Circuit open: legacy service unavailable");
    }

    // 2. Cache check
    const cacheKey = `${method}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // 3. Retry with backoff
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.callSOAP(method, params);
        this.circuitBreaker.recordSuccess();
        this.cache.set(cacheKey, { data: result, expiry: Date.now() + 60000 });
        return result;
      } catch (err) {
        this.circuitBreaker.recordFailure();
        if (attempt < this.retryConfig.maxRetries - 1) {
          await new Promise(r => setTimeout(r, this.retryConfig.backoffMs * Math.pow(2, attempt)));
        }
      }
    }
    throw new Error("Legacy service failed after retries");
  }

  private async callSOAP(method: string, params: unknown): Promise<unknown> {
    // Translate JSON to XML SOAP envelope
    const soapEnvelope = this.jsonToSOAP(method, params);
    const response = await fetch(this.legacyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: soapEnvelope,
    });
    const xml = await response.text();
    return this.soapToJSON(xml);
  }

  private jsonToSOAP(method: string, params: unknown): string {
    return `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method}>${JSON.stringify(params)}</${method}>
  </soap:Body>
</soap:Envelope>`;
  }

  private soapToJSON(xml: string): unknown {
    // Parse XML response to JSON
    return JSON.parse(xml.match(/<return>(.*)<\/return>/s)?.[1] || "{}");
  }
}
```

Lessons:
  - Ambassador isolates complexity of the legacy service
  - The modern service does not know it is talking to SOAP
  - Circuit breaker protects against cascading failures
  - Cache reduces calls to the legacy service
  - Ambassador metrics are visible for monitoring
```

### Ambassador vs Sidecar: which do I use?

Use Ambassador when you need an intermediary that wraps an external service (legacy, third-party). The ambassador lives on the client side and translates/protects calls. Use Sidecar when you need complementary functionality that lives alongside the service (logging, monitoring, proxy). Ambassador is client-side, Sidecar is server-side. Both can be containers in K8s.
