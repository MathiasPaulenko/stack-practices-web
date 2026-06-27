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
relatedResources:
  - /patterns/design/circuit-breaker-pattern
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
