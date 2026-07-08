---
contentType: recipes
slug: microservices-patterns
title: "Design Resilient Microservices with Circuit Breakers, Retries, and Timeouts"
description: "How to build fault-tolerant distributed systems using microservices patterns including circuit breakers, bulkheads, retries with backoff, and sagas for transaction management."
metaDescription: "Learn microservices patterns for resilient distributed systems. Implement circuit breakers, bulkheads, retries with backoff, and sagas for fault-tolerant architectures."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - bulkhead
  - circuit-breaker
  - design
  - patterns
relatedResources:
  - /recipes/api-gateway
  - /recipes/event-driven-functions
  - /recipes/load-balancing
  - /recipes/service-mesh
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn microservices patterns for resilient distributed systems. Implement circuit breakers, bulkheads, retries with backoff, and sagas for fault-tolerant architectures."
  keywords:
    - microservices patterns
    - circuit breaker
    - distributed systems
    - saga pattern
    - resilient architecture
---

## Overview

Microservices architectures decompose applications into independently deployable services, each owning a bounded context and communicating via network calls. This decomposition enables team autonomy, technology diversity, and independent scaling. But it introduces a fundamental problem: the network is unreliable. Every inter-service call is a potential point of failure — latency spikes, cascading outages, partial failures, and inconsistency during distributed transactions.

Resilience patterns protect the system from these failure modes. A circuit breaker stops sending requests to a failing service, giving it time to recover. A bulkhead isolates failures so they do not consume all resources. Retries with exponential backoff handle transient failures without overwhelming struggling services. The saga pattern replaces distributed transactions with sequences of local transactions coordinated via events. This approach handles implementation of these core patterns across multiple languages and frameworks.

## When to use it

Use this recipe when:

- Migrating from a monolith to a distributed architecture with 5+ services. See [Monolith to Microservices Guide](/guides/architecture/monolith-to-microservices-migration-guide) for migration strategies.
- Experiencing cascading failures where one slow service degrades the entire system
- Implementing payment workflows, inventory management, or order processing across services. See [Saga Pattern](/recipes/saga-pattern-recipe) for distributed transactions.
- Operating services with different reliability SLAs on shared infrastructure
- Building platforms where individual services must fail without impacting the whole

## Solution

### Circuit Breaker (Python / PyResilience)

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject fast
    HALF_OPEN = "half_open"  # Testing recovery

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30, half_open_max_calls=3):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise Exception("Circuit breaker is OPEN")

        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls >= self.half_open_max_calls:
                raise Exception("Circuit breaker is HALF_OPEN (max calls reached)")
            self.half_open_calls += 1

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.half_open_calls = 0

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage
breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=10)

def get_user_profile(user_id):
    # HTTP call to user service
    pass

try:
    profile = breaker.call(get_user_profile, user_id=123)
except Exception as e:
    profile = get_cached_profile(123)  # Fallback
```

### Retry with Exponential Backoff (JavaScript / p-retry)

```javascript
const pRetry = require('p-retry');
const fetch = require('node-fetch');

async function callPaymentService(orderId) {
  const response = await fetch(`https://payments.internal/api/charge/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Payment service returned ${response.status}`);
  }

  return response.json();
}

const chargeWithRetry = async (orderId) => {
  return pRetry(() => callPaymentService(orderId), {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 30000,
    randomize: true,
    onFailedAttempt: (error) => {
      console.log(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries remaining.`);
    },
    retryIf: (error) => {
      // Only retry on 5xx or network errors, not 4xx
      return error.message.includes('5') || error.code === 'ECONNREFUSED';
    },
  });
};
```

### Saga Pattern for Distributed Transactions (TypeScript)

```typescript
interface SagaStep {
  execute(): Promise<void>;
  compensate(): Promise<void>;
}

class OrderSaga {
  private steps: SagaStep[] = [];
  private completedSteps: SagaStep[] = [];

  addStep(step: SagaStep) {
    this.steps.push(step);
    return this;
  }

  async execute() {
    for (const step of this.steps) {
      try {
        await step.execute();
        this.completedSteps.push(step);
      } catch (error) {
        // Compensate all completed steps in reverse order
        for (const completed of this.completedSteps.reverse()) {
          await completed.compensate();
        }
        throw new Error(`Saga failed: ${error}`);
      }
    }
  }
}

// Usage
const orderSaga = new OrderSaga()
  .addStep({
    execute: () => inventoryService.reserve(order.items),
    compensate: () => inventoryService.release(order.items),
  })
  .addStep({
    execute: () => paymentService.charge(order.total),
    compensate: () => paymentService.refund(order.total),
  })
  .addStep({
    execute: () => shippingService.createShipment(order),
    compensate: () => shippingService.cancelShipment(order),
  });

await orderSaga.execute();
```

## Explanation

- **Circuit breaker**: prevents cascading failures by stopping requests to a failing service. When failures exceed a threshold, the breaker opens and returns errors immediately. After a timeout, it enters half-open state, allowing limited test requests. If those succeed, it closes again. This gives overloaded services time to recover.
- **Exponential backoff**: retries immediately after a failure often hit the same struggling service. Backoff increases the delay between retries exponentially (1s, 2s, 4s, 8s...), spreading load and allowing recovery. Adding jitter prevents synchronized retry storms.
- **Bulkhead pattern**: isolates failures by limiting resources (threads, connections, memory) allocated to each service dependency. If the payment service is slow, the bulkhead ensures that only payment-related threads block, leaving inventory and catalog threads unaffected.
- **Saga pattern**: distributed ACID transactions are impractical across microservices. Sagas break a business transaction into local transactions, each with a compensating rollback. If step 3 fails, steps 2 and 1 are undone, maintaining eventual consistency.

## Variants

| Pattern | Failure handling | Consistency | Complexity | Best for |
|---------|-----------------|-------------|------------|----------|
| Circuit breaker | Fast fail | N/A | Low | Protecting against overload |
| Retry + backoff | Transient recovery | N/A | Low | Network hiccups |
| Bulkhead | Resource isolation | N/A | Medium | Mixed criticality services |
| Saga (choreography) | Event-driven rollback | Eventual | High | Loosely coupled services |
| Saga (orchestration) | Central coordinator | Eventual | High | Complex workflows |

## What Works

- **Set appropriate timeout budgets**: every outgoing call should have a timeout shorter than the caller's own timeout. If your API has a 2-second SLA, downstream calls should timeout at 500ms to leave room for retries and fallbacks.
- **Implement graceful degradation**: when a service is unavailable, return cached data, default values, or reduced functionality rather than failing entirely. A product page without recommendations is better than a 500 error.
- **Monitor circuit breaker state**: expose breaker states (closed/open/half-open) as metrics. Alert when breakers open frequently — this indicates systemic problems, not just transient failures.
- **Idempotency for retries**: retries can cause duplicate operations. Ensure all mutation endpoints are idempotent. See [Idempotent Endpoints](/recipes/api/idempotent-api-endpoints) for deduplication patterns. Without idempotency, retries create inconsistent data.
- **Test failure injection**: use tools like Chaos Monkey, Gremlin, or Toxiproxy to randomly introduce latency, errors, and partition failures in staging. If your resilience patterns only work in theory, they will fail in production.

## Common mistakes

- **Retrying on all errors**: a 404 Not Found or 401 Unauthorized will not succeed on retry. Only retry idempotent operations that fail with 5xx, timeouts, or network errors. Retrying 400 Bad Request wastes resources and logs noise.
- **Infinite retry loops**: without a maximum retry count or timeout, a failing dependency can create an infinite loop of retries, consuming threads and memory. Always cap retries at 3-5 attempts with a total budget under 30 seconds.
- **Ignoring thread pools**: blocking retries consume threads. In async runtimes (Node.js, Go), this starves the event loop. Use async retry libraries and bounded thread pools to prevent resource exhaustion.
- **Missing compensations in sagas**: a saga without compensation is just a sequence of hopeful requests. If step 3 fails but steps 1-2 have no rollback, the system is left in an inconsistent state. Every saga step must have a tested compensation.

## FAQ

**Q: Should I use choreography or orchestration for sagas?**
A: Choreography (event-driven) scales better for loosely coupled services but is harder to trace. Orchestration (central coordinator) is easier to debug and monitor but creates a single point of complexity. Start with orchestration for clarity, migrate to choreography for scale.

**Q: How do I prevent retry storms after an outage?**
A: Use exponential backoff with jitter, circuit breakers, and rate limiters. When a service recovers, stagger retries across the client population so the recovering service is not overwhelmed by synchronized requests.

**Q: Can I combine [circuit breakers](/recipes/circuit-breaker-pattern-recipe) and [retries](/recipes/architecture/retry-backoff)?**
A: Yes — this is the standard pattern. Retry handles transient failures. If retries exhaust, the circuit breaker opens. This layers defense: retries fix small issues, circuit breakers prevent collapse during major outages.

**Q: What is the difference between a [saga](/recipes/saga-pattern-recipe) and two-phase commit?**
A: Two-phase commit (2PC) locks resources across services, blocking until all participants confirm. Sagas do not lock — they execute steps sequentially and compensate on failure. Sagas trade immediate consistency for availability and partition tolerance (BASE vs ACID). See [Event-Driven Architecture](/recipes/architecture/event-driven-architecture) for event-based coordination.


### Bulkhead Pattern (Go / errgroup with semaphore)

```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
)

type Bulkhead struct {
	sem chan struct{}
}

func NewBulkhead(maxConcurrent int) *Bulkhead {
	return &Bulkhead{sem: make(chan struct{}, maxConcurrent)}
}

func (b *Bulkhead) Execute(ctx context.Context, fn func() error) error {
	select {
	case b.sem <- struct{}{}:
		defer func() { <-b.sem }()
		return fn()
	case <-ctx.Done():
		return ctx.Err()
	}
}

type ResilientClient struct {
	paymentBulkhead    *Bulkhead
	inventoryBulkhead  *Bulkhead
	shippingBulkhead   *Bulkhead
}

func NewResilientClient() *ResilientClient {
	return &ResilientClient{
		paymentBulkhead:   NewBulkhead(10),
		inventoryBulkhead: NewBulkhead(20),
		shippingBulkhead:  NewBulkhead(5),
	}
}

func (c *ResilientClient) ProcessOrder(ctx context.Context, order Order) error {
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		return c.paymentBulkhead.Execute(ctx, func() error {
			return c.callPaymentService(ctx, order)
		})
	})

	g.Go(func() error {
		return c.inventoryBulkhead.Execute(ctx, func() error {
			return c.callInventoryService(ctx, order)
		})
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("order processing failed: %w", err)
	}

	return c.shippingBulkhead.Execute(ctx, func() error {
		return c.callShippingService(ctx, order)
	})
}

func (c *ResilientClient) callPaymentService(ctx context.Context, order Order) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	// HTTP call to payment service
	return nil
}

func (c *ResilientClient) callInventoryService(ctx context.Context, order Order) error {
	ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	// HTTP call to inventory service
	return nil
}

func (c *ResilientClient) callShippingService(ctx context.Context, order Order) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	// HTTP call to shipping service
	return nil
}
```

### Combined Resilience with Java Resilience4j

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadConfig;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.vavr.control.Try;

import java.time.Duration;
import java.util.concurrent.*;

public class ResilientPaymentClient {

    private final CircuitBreaker circuitBreaker;
    private final Retry retry;
    private final Bulkhead bulkhead;
    private final TimeLimiter timeLimiter;
    private final ExecutorService executor;

    public ResilientPaymentClient() {
        // Circuit breaker: open after 50% failure rate with min 10 calls
        CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .slowCallRateThreshold(50)
            .slowCallDurationThreshold(Duration.ofSeconds(2))
            .minimumNumberOfCalls(10)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .permittedNumberOfCallsInHalfOpenState(3)
            .build();
        this.circuitBreaker = CircuitBreaker.of("payment", cbConfig);

        // Retry: 3 attempts with exponential backoff
        RetryConfig retryConfig = RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofMillis(500))
            .intervalFunction(attempt -> Math.pow(2, attempt) * 500)
            .retryOnException(e -> e instanceof TimeoutException || e instanceof ConnectionException)
            .build();
        this.retry = Retry.of("payment", retryConfig);

        // Bulkhead: max 10 concurrent calls
        BulkheadConfig bulkheadConfig = BulkheadConfig.custom()
            .maxConcurrentCalls(10)
            .maxWaitDuration(Duration.ofMillis(500))
            .build();
        this.bulkhead = Bulkhead.of("payment", bulkheadConfig);

        // Time limiter: 3 seconds max
        this.timeLimiter = TimeLimiter.of(Duration.ofSeconds(3));
        this.executor = Executors.newCachedThreadPool();
    }

    public PaymentResult charge(String orderId, double amount) {
        Supplier<PaymentResult> supplier = () -> callPaymentService(orderId, amount);

        Supplier<PaymentResult> decorated = Decorators.ofSupplier(supplier)
            .withCircuitBreaker(circuitBreaker)
            .withRetry(retry)
            .withBulkhead(bulkhead)
            .decorate();

        return Try.ofSupplier(decorated)
            .recover(throwable -> {
                // Fallback: return cached or default result
                return PaymentResult.degraded(orderId, "Payment unavailable, using fallback");
            })
            .get();
    }

    private PaymentResult callPaymentService(String orderId, double amount) {
        // Actual HTTP call to payment service
        // Throws on failure
        return new PaymentResult(orderId, "SUCCESS");
    }
}
```

### Kubernetes Health Probes for Resilience

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:latest
          ports:
            - containerPort: 8080
          # Liveness probe: restart container if unhealthy
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          # Readiness probe: remove from service if not ready
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 2
          # Startup probe: wait for app to boot
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 30
          resources:
            limits:
              cpu: "500m"
              memory: "512Mi"
            requests:
              cpu: "250m"
              memory: "256Mi"
```

```typescript
// Health check endpoints for Kubernetes probes
import express from 'express';

const app = express();

// Liveness: is the process running?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness: can we handle traffic?
app.get('/health/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    checkDatabaseConnection(),
    checkRedisConnection(),
    checkDownstreamServices(),
  ]);

  const allHealthy = checks.every(c => c.status === 'fulfilled');
  if (allHealthy) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({
      status: 'not ready',
      failures: checks
        .filter(c => c.status === 'rejected')
        .map(c => c.reason.message),
    });
  }
});

// Startup: has the app finished initializing?
app.get('/health/startup', (req, res) => {
  if (app.locals.initialized) {
    res.status(200).json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});
```

## Additional Best Practices

1. **Use a resilience library instead of building from scratch.** Production-grade libraries handle edge cases that hand-rolled implementations miss — thread safety, metric collection, configuration hot-reload, and composition of multiple patterns:

```java
// Resilience4j decorator composition
Supplier<String> decorated = Decorators.ofSupplier(this::callService)
    .withCircuitBreaker(circuitBreaker)
    .withRetry(retry)
    .withBulkhead(bulkhead)
    .withTimeLimiter(timeLimiter)
    .withFallback(List.of(TimeoutException.class), e -> "fallback")
    .decorate();
```

2. **Distribute timeout budgets across call chains.** If an API endpoint has a 5-second SLA and calls 3 services, each service gets a fraction of the budget. The gateway gets 5s, service A gets 3s (leaving 2s for B and C), service B gets 1.5s, service C gets 500ms. This prevents downstream timeouts from exceeding the upstream budget:

```go
func handleRequest(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    // Service A: 3s budget
    ctxA, cancelA := context.WithTimeout(ctx, 3*time.Second)
    defer cancelA()
    resultA := callServiceA(ctxA)

    // Service B: 1.5s budget (remaining from A)
    ctxB, cancelB := context.WithTimeout(ctx, 1500*time.Millisecond)
    defer cancelB()
    resultB := callServiceB(ctxB)
}
```

3. **Implement request hedging for critical reads.** For read operations where latency matters more than cost, send the same request to two replicas and use the first response. This masks slow replicas and reduces tail latency:

```python
import asyncio
import aiohttp

async def hedged_request(session, url, timeout=2.0):
    tasks = [
        asyncio.create_task(session.get(url, timeout=timeout)),
        asyncio.create_task(asyncio.sleep(0.1) or session.get(url, timeout=timeout)),
    ]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for p in pending:
        p.cancel()
    return next(iter(done)).result()
```

## Additional Common Mistakes

1. **Using the same circuit breaker for all downstream services.** Each downstream service should have its own circuit breaker with thresholds tuned to that service's reliability profile. A single shared breaker would open when any service fails, blocking calls to healthy services:

```typescript
// Wrong: shared breaker
const sharedBreaker = new CircuitBreaker({ threshold: 5 });

// Correct: per-service breakers
const breakers = {
  payment: new CircuitBreaker({ threshold: 5, timeout: 30 }),
  inventory: new CircuitBreaker({ threshold: 10, timeout: 15 }),
  shipping: new CircuitBreaker({ threshold: 3, timeout: 60 }),
};
```

2. **Not propagating trace context through retries and circuit breakers.** When a retry or circuit breaker intercepts a call, the trace context (W3C traceparent, B3 headers) must be propagated to the downstream service. Without this, distributed tracing breaks and debugging becomes impossible:

```java
// Resilience4j with context propagation
Supplier<Response> decorated = Decorators.ofSupplier(() -> {
    String traceId = MDC.get("traceId");
    Request request = Request.builder()
        .url(url)
        .header("traceparent", traceId)
        .build();
    return httpClient.execute(request);
}).withCircuitBreaker(circuitBreaker).withRetry(retry).decorate();
```

3. **Configuring circuit breakers without monitoring.** A circuit breaker that opens silently is worse than no circuit breaker — requests fail with no indication why. Export breaker state changes to Prometheus and set alerts:

```yaml
# Prometheus alert rules
groups:
  - name: circuit_breaker
    rules:
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{state="open"} == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker {{ $labels.circuit_name }} is open"
          description: "Circuit breaker has been open for more than 1 minute"

      - alert: CircuitBreakerHighFailureRate
        expr: |
          rate(circuit_breaker_failures_total[5m]) /
          rate(circuit_breaker_calls_total[5m]) > 0.3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High failure rate on {{ $labels.circuit_name }}"
```

## Additional FAQ

### How do I test microservices resilience configuration?

Use chaos engineering to inject failures in staging. Kill random pods with `kubectl delete pod` to test that Kubernetes reschedules and the service stays available. Use Toxiproxy to inject network latency, packet loss, and partitions between services. Use Chaos Mesh to inject CPU stress, memory pressure, and disk IO latency. Verify that circuit breakers open when expected and that fallbacks return appropriate degraded responses. Test that retries do not cause duplicate charges by verifying idempotency keys. Test that sagas compensate correctly when a downstream service is unavailable. For load testing, use k6 or Gatling to generate traffic while injecting failures — the system should maintain acceptable error rates even with 20% of services failing.

### Is this solution production-ready?

Yes. Resilience4j is used in production by Spring Boot applications at scale, including at Boeing and Deutsche Telekom. The gobreaker library is used in Go microservices at Uber and Twitch. Kubernetes health probes are a standard pattern used by every major Kubernetes user. The circuit breaker pattern was popularized by Michael Nygard in Release It! and is documented in the Microsoft Azure Architecture Center. Chaos engineering is practiced by Netflix (Chaos Monkey), Amazon (GameDays), and Google (DiRT exercises).

### What are the performance characteristics?

A circuit breaker adds 0.01-0.1ms overhead per call for state checking. Retry with exponential backoff adds the retry delay plus 0.01ms per attempt for decision logic. A bulkhead semaphore adds 0.001ms per call for acquire/release. Combined Resilience4j decorators add 0.1-0.5ms per call for all patterns. Request hedging doubles the request cost but reduces P99 latency by 30-50%. Kubernetes liveness probes add 1-5ms every 10 seconds for the health check HTTP call. The overhead is negligible compared to the 1-50ms typical service call latency. The main performance risk is retry storms — 1000 clients retrying simultaneously can overwhelm a recovering service. Circuit breakers and jitter mitigate this.

### How do I debug issues with this approach?

Check circuit breaker state via the metrics endpoint (`/actuator/circuitbreakers` in Spring Boot, `/metrics` in custom implementations). Look for breakers stuck in OPEN state — this indicates a downstream service that has not recovered. Check retry metrics for high retry counts — this indicates persistent failures rather than transient ones. Use distributed tracing (Jaeger, Zipkin) to see which service calls are slow or failing. Check bulkhead metrics for rejected calls — if the bulkhead is full, increase the concurrency limit or fix the slow downstream. Check Kubernetes events for pod restarts (`kubectl get events --sort-by='.lastTimestamp'`). For saga failures, query the saga state table for COMPENSATING status. For retry storms, check if jitter is enabled and if circuit breakers are configured to open before retries exhaust.
