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
  - microservices
  - circuit-breaker
  - retries
  - bulkhead
  - saga-pattern
  - distributed-systems
  - resilience
  - fault-tolerance
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

Resilience patterns protect the system from these failure modes. A circuit breaker stops sending requests to a failing service, giving it time to recover. A bulkhead isolates failures so they do not consume all resources. Retries with exponential backoff handle transient failures without overwhelming struggling services. The saga pattern replaces distributed transactions with sequences of local transactions coordinated via events. This recipe covers implementation of these core patterns across multiple languages and frameworks.

## When to use it

Use this recipe when:

- Migrating from a monolith to a distributed architecture with 5+ services
- Experiencing cascading failures where one slow service degrades the entire system
- Implementing payment workflows, inventory management, or order processing across services
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

## Best practices

- **Set appropriate timeout budgets**: every outgoing call should have a timeout shorter than the caller's own timeout. If your API has a 2-second SLA, downstream calls should timeout at 500ms to leave room for retries and fallbacks.
- **Implement graceful degradation**: when a service is unavailable, return cached data, default values, or reduced functionality rather than failing entirely. A product page without recommendations is better than a 500 error.
- **Monitor circuit breaker state**: expose breaker states (closed/open/half-open) as metrics. Alert when breakers open frequently — this indicates systemic problems, not just transient failures.
- **Idempotency for retries**: retries can cause duplicate operations. Ensure all mutation endpoints are idempotent (accept client-generated request IDs, deduplicate on the server). Without idempotency, retries create inconsistent data.
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

**Q: Can I combine circuit breakers and retries?**
A: Yes — this is the standard pattern. Retry handles transient failures. If retries exhaust, the circuit breaker opens. This layers defense: retries fix small issues, circuit breakers prevent collapse during major outages.

**Q: What is the difference between a saga and two-phase commit?**
A: Two-phase commit (2PC) locks resources across services, blocking until all participants confirm. Sagas do not lock — they execute steps sequentially and compensate on failure. Sagas trade immediate consistency for availability and partition tolerance (BASE vs ACID).

