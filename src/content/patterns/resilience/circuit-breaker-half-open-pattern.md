---
contentType: patterns
slug: circuit-breaker-half-open-pattern
title: "Circuit Breaker Half-Open Pattern: Test Recovery with State Transitions"
description: "How to test service recovery with half-open circuit breaker state transitions. Covers closed, open, half-open states, trial requests, and gradual recovery."
metaDescription: "Test service recovery with half-open circuit breaker state transitions. Learn closed, open, half-open states, trial requests, and gradual recovery patterns."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - resilience
  - circuit-breaker
  - fault-tolerance
  - pattern
category: behavioral
relatedResources:
  - /patterns/bulkhead-pattern
  - /patterns/retry-with-jitter-pattern
  - /patterns/graceful-shutdown-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Test service recovery with half-open circuit breaker state transitions. Learn closed, open, half-open states, trial requests, and gradual recovery patterns."
  keywords:
    - architecture
    - resilience
    - circuit-breaker
    - fault-tolerance
    - pattern
---

## Overview

The circuit breaker half-open pattern extends the basic circuit breaker with a half-open state for testing recovery. A circuit breaker has three states: closed (requests flow normally), open (requests are rejected immediately), and half-open (a limited number of trial requests are allowed). When the circuit transitions from open to half-open, it sends a small number of test requests. If they succeed, the circuit closes and full traffic resumes. If they fail, the circuit reopens. This prevents flooding a recovering service with full traffic, which could cause it to fail again. The half-open state is the critical bridge between failure detection and full recovery.

## When to Use

- Protecting services from cascading failures during outages
- Calling downstream services that may become temporarily unavailable
- Microservices where one service failure shouldn't cascade to all callers
- Database connection management with automatic recovery
- External API calls that may experience transient outages

## When NOT to Use

- In-process function calls (use try/catch)
- Operations where failure is permanent (validation errors, 404s)
- Real-time systems where the open-state rejection latency is unacceptable
- When you need every request to reach the service (no fail-fast behavior)

## Solution

### Three-state circuit breaker (Python)

```python
# circuit_breaker/three_state.py — Circuit breaker with half-open state
import time
import threading
from enum import Enum
from collections import defaultdict

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """Circuit breaker with closed, open, and half-open states.

    Closed: requests flow normally. Failures increment the counter.
    Open: requests are rejected immediately. After timeout, transitions to half-open.
    Half-open: limited trial requests. Success closes, failure reopens.
    """

    def __init__(self, failure_threshold=5, recovery_timeout=30,
                 half_open_max_calls=3, success_threshold=2):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.success_threshold = success_threshold

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0
        self._last_failure_time = 0
        self._lock = threading.Lock()

    @property
    def state(self):
        with self._lock:
            self._check_state_transition()
            return self._state

    def _check_state_transition(self):
        """Check if the circuit should transition from open to half-open."""
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
                self._success_count = 0
                print(f"Circuit transitioned: OPEN -> HALF_OPEN")

    def call(self, fn, *args, **kwargs):
        """Execute fn through the circuit breaker."""
        with self._lock:
            self._check_state_transition()

            if self._state == CircuitState.OPEN:
                raise CircuitBreakerOpenError(
                    "Circuit is open — service unavailable"
                )

            if self._state == CircuitState.HALF_OPEN:
                if self._half_open_calls >= self.half_open_max_calls:
                    raise CircuitBreakerOpenError(
                        "Circuit is half-open — trial request limit reached"
                    )
                self._half_open_calls += 1

        # Execute the function outside the lock
        try:
            result = fn(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    print(f"Circuit transitioned: HALF_OPEN -> CLOSED")
            elif self._state == CircuitState.CLOSED:
                self._failure_count = 0

    def _on_failure(self):
        with self._lock:
            self._last_failure_time = time.time()

            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._failure_count = 0
                print(f"Circuit transitioned: HALF_OPEN -> OPEN")
            elif self._state == CircuitState.CLOSED:
                self._failure_count += 1
                if self._failure_count >= self.failure_threshold:
                    self._state = CircuitState.OPEN
                    print(f"Circuit transitioned: CLOSED -> OPEN "
                          f"(failures: {self._failure_count})")

    def get_state(self):
        with self._lock:
            self._check_state_transition()
            return {
                "state": self._state.value,
                "failure_count": self._failure_count,
                "success_count": self._success_count,
                "half_open_calls": self._half_open_calls
            }

    def reset(self):
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._half_open_calls = 0


class CircuitBreakerOpenError(Exception):
    """Raised when the circuit is open and requests are rejected."""
    pass


# Usage
breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=30,
    half_open_max_calls=3,
    success_threshold=2
)

def call_payment_service(order_id):
    return breaker.call(lambda: payment_api.charge(order_id))
```

### Per-service circuit breaker registry (Python)

```python
# circuit_breaker/registry.py — Manage circuit breakers per service
import threading
from circuit_breaker.three_state import CircuitBreaker, CircuitState

class CircuitBreakerRegistry:
    """Maintains a circuit breaker per service name.
    Each service has independent state and thresholds."""

    def __init__(self):
        self._breakers = {}
        self._lock = threading.Lock()

    def get_or_create(self, service_name, failure_threshold=5,
                      recovery_timeout=30, half_open_max_calls=3,
                      success_threshold=2):
        with self._lock:
            if service_name not in self._breakers:
                self._breakers[service_name] = CircuitBreaker(
                    failure_threshold=failure_threshold,
                    recovery_timeout=recovery_timeout,
                    half_open_max_calls=half_open_max_calls,
                    success_threshold=success_threshold
                )
            return self._breakers[service_name]

    def call(self, service_name, fn, *args, **kwargs):
        breaker = self.get_or_create(service_name)
        return breaker.call(fn, *args, **kwargs)

    def get_all_states(self):
        with self._lock:
            return {
                name: breaker.get_state()
                for name, breaker in self._breakers.items()
            }

    def reset_all(self):
        with self._lock:
            for breaker in self._breakers.values():
                breaker.reset()


# Usage
registry = CircuitBreakerRegistry()

def call_payment(order_id):
    return registry.call("payment", payment_api.charge, order_id)

def call_inventory(product_id):
    return registry.call("inventory", inventory_api.check, product_id)

# Monitor all circuits
for name, state in registry.get_all_states().items():
    print(f"{name}: {state['state']}")
```

### Java circuit breaker with resilience4j

```java
// CircuitBreakerConfig.java — Java circuit breaker with resilience4j
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.time.Duration;

public class ServiceCircuitBreakers {

    private final CircuitBreakerRegistry registry;

    public ServiceCircuitBreakers() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)           // 50% failure rate opens circuit
            .slowCallRateThreshold(80)          // 80% slow calls open circuit
            .slowCallDurationThreshold(Duration.ofSeconds(5))
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .slidingWindowSize(10)              // Last 10 calls
            .minimumNumberOfCalls(5)            // Need 5 calls before evaluating
            .permittedNumberOfCallsInHalfOpenState(3)  // Trial calls in half-open
            .waitDurationInHalfOpenState(Duration.ofSeconds(10))
            .automaticTransitionFromOpenToHalfOpenEnabled(true)
            .build();

        this.registry = CircuitBreakerRegistry.of(config);
    }

    public <T> T callWithBreaker(String serviceName, java.util.function.Supplier<T> supplier) {
        CircuitBreaker breaker = registry.circuitBreaker(serviceName);
        return breaker.executeSupplier(supplier);
    }

    public String callPayment(String orderId) {
        return callWithBreaker("payment", () -> paymentClient.charge(orderId));
    }

    public String callInventory(String productId) {
        return callWithBreaker("inventory", () -> inventoryClient.checkStock(productId));
    }

    public void printStates() {
        registry.getAllCircuitBreakers().forEach(breaker -> {
            var state = breaker.getState();
            var metrics = breaker.getMetrics();
            System.out.printf("%s: state=%s, failures=%d, success=%d%n",
                breaker.getName(),
                state,
                metrics.getNumberOfFailedCalls(),
                metrics.getNumberOfSuccessfulCalls());
        });
    }
}
```

### Circuit breaker with metrics (Python)

```python
# circuit_breaker/with_metrics.py — Circuit breaker with Prometheus metrics
import time
import threading
from prometheus_client import Counter, Gauge, Histogram
from circuit_breaker.three_state import CircuitBreaker, CircuitState

class InstrumentedCircuitBreaker(CircuitBreaker):
    """Circuit breaker that exports metrics to Prometheus."""

    _state_gauges = {}
    _call_counters = {}
    _call_latency = {}

    def __init__(self, name, **kwargs):
        super().__init__(**kwargs)
        self.name = name

        if name not in self._state_gauges:
            self._state_gauges[name] = Gauge(
                f"circuit_breaker_state_{name}",
                f"Circuit breaker state for {name} (0=closed, 1=open, 2=half_open)"
            )
            self._call_counters[name] = Counter(
                f"circuit_breaker_calls_{name}",
                f"Calls through circuit breaker {name}",
                ["result"]
            )
            self._call_latency[name] = Histogram(
                f"circuit_breaker_latency_{name}",
                f"Call latency through circuit breaker {name}"
            )

    def call(self, fn, *args, **kwargs):
        state_map = {
            CircuitState.CLOSED: 0,
            CircuitState.OPEN: 1,
            CircuitState.HALF_OPEN: 2
        }

        self._state_gauges[self.name].set(state_map.get(self.state, 0))

        try:
            start = time.time()
            result = super().call(fn, *args, **kwargs)
            latency = time.time() - start
            self._call_counters[self.name].labels(result="success").inc()
            self._call_latency[self.name].observe(latency)
            return result
        except CircuitBreakerOpenError:
            self._call_counters[self.name].labels(result="rejected").inc()
            raise
        except Exception as e:
            self._call_counters[self.name].labels(result="failure").inc()
            raise
```

### JavaScript circuit breaker

```javascript
// circuit_breaker/index.js — Circuit breaker for Node.js
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.recoveryTimeout = options.recoveryTimeout || 30000;
        this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
        this.successThreshold = options.successThreshold || 2;

        this.state = "closed";
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenCalls = 0;
        this.lastFailureTime = 0;
    }

    async call(fn, ...args) {
        this._checkStateTransition();

        if (this.state === "open") {
            throw new Error("Circuit is open — service unavailable");
        }

        if (this.state === "half-open") {
            if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
                throw new Error("Circuit is half-open — trial limit reached");
            }
            this.halfOpenCalls++;
        }

        try {
            const result = await fn(...args);
            this._onSuccess();
            return result;
        } catch (error) {
            this._onFailure();
            throw error;
        }
    }

    _checkStateTransition() {
        if (this.state === "open") {
            if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
                this.state = "half-open";
                this.halfOpenCalls = 0;
                this.successCount = 0;
                console.log("Circuit: OPEN -> HALF_OPEN");
            }
        }
    }

    _onSuccess() {
        if (this.state === "half-open") {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = "closed";
                this.failureCount = 0;
                console.log("Circuit: HALF_OPEN -> CLOSED");
            }
        } else if (this.state === "closed") {
            this.failureCount = 0;
        }
    }

    _onFailure() {
        this.lastFailureTime = Date.now();

        if (this.state === "half-open") {
            this.state = "open";
            console.log("Circuit: HALF_OPEN -> OPEN");
        } else if (this.state === "closed") {
            this.failureCount++;
            if (this.failureCount >= this.failureThreshold) {
                this.state = "open";
                console.log(`Circuit: CLOSED -> OPEN (${this.failureCount} failures)`);
            }
        }
    }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            halfOpenCalls: this.halfOpenCalls
        };
    }
}

// Usage
const breaker = new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeout: 30000,
    halfOpenMaxCalls: 3,
    successThreshold: 2
});

async function callApi(url) {
    return breaker.call(async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }, url);
}
```

## Variants

### Gradual recovery (ramped half-open)

```python
# circuit_breaker/gradual.py — Gradually increase traffic in half-open
class GradualCircuitBreaker(CircuitBreaker):
    """Instead of binary closed/half-open, gradually increases allowed traffic.
    Half-open phase 1: 10% of requests
    Half-open phase 2: 50% of requests
    Half-open phase 3: 100% (closed)"""

    PHASES = [
        {"name": "phase1", "ratio": 0.1, "success_needed": 5},
        {"name": "phase2", "ratio": 0.5, "success_needed": 10},
        {"name": "phase3", "ratio": 1.0, "success_needed": 20},
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._phase = 0
        self._phase_success = 0

    def call(self, fn, *args, **kwargs):
        import random

        if self.state == CircuitState.HALF_OPEN:
            phase = self.PHASES[self._phase]
            if random.random() > phase["ratio"]:
                raise CircuitBreakerOpenError(
                    f"Half-open {phase['name']}: only {phase['ratio']*100}% traffic"
                )

        try:
            result = super().call(fn, *args, **kwargs)
            if self.state == CircuitState.HALF_OPEN:
                self._phase_success += 1
                if self._phase_success >= phase["success_needed"]:
                    self._phase = min(self._phase + 1, len(self.PHASES) - 1)
                    if self._phase == len(self.PHASES) - 1:
                        self._state = CircuitState.CLOSED
            return result
        except Exception:
            self._phase = 0
            self._phase_success = 0
            raise
```

### Circuit breaker with fallback

```python
# circuit_breaker/with_fallback.py — Return fallback when circuit is open
class CircuitBreakerWithFallback:
    """When the circuit is open, return a fallback response
    instead of raising an error."""

    def __init__(self, breaker, fallback_fn):
        self._breaker = breaker
        self._fallback = fallback_fn

    def call(self, fn, *args, **kwargs):
        try:
            return self._breaker.call(fn, *args, **kwargs)
        except CircuitBreakerOpenError:
            return self._fallback(*args, **kwargs)

# Usage
breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)

def fallback_product(product_id):
    return {"id": product_id, "name": "Unavailable", "cached": True}

protected = CircuitBreakerWithFallback(
    breaker,
    fallback_fn=fallback_product
)

def get_product(product_id):
    return protected.call(inventory_api.get_product, product_id)
```

## Best Practices

- Set appropriate thresholds — too low causes false opens; too high allows cascading failures
- Use sliding window for failure counting — not a simple counter that never resets
- Monitor circuit state transitions — alert on frequent open/close oscillation
- Use the half-open state — it prevents flooding a recovering service
- Set a success threshold in half-open — require N consecutive successes before closing
- Combine with fallbacks — return cached/default data when the circuit is open
- Export metrics — track state, failure rate, rejection count per circuit
- Test the circuit breaker — inject failures and verify state transitions

## Common Mistakes

- **No half-open state**: circuit oscillates between open and closed, flooding the recovering service.
- **Failure threshold too low**: circuit opens on a single failure, rejecting valid traffic.
- **No success threshold**: first half-open success closes the circuit, but the service may not be fully recovered.
- **Not resetting failure count on success**: once failures accumulate, the circuit never closes.
- **No monitoring**: you don't know circuits are opening until users complain.

## FAQ

### What is the half-open state in a circuit breaker?

A transitional state between open and closed. The circuit allows a limited number of trial requests. If they succeed, the circuit closes and full traffic resumes. If they fail, the circuit reopens. This prevents flooding a recovering service with full traffic.

### How many trial requests should I allow in half-open?

Typically 3-5. Too few and a single failed trial reopens the circuit. Too many and you risk overwhelming the recovering service. Require 2-3 consecutive successes before closing the circuit.

### What's the difference between failure rate and failure count thresholds?

Failure count: circuit opens after N failures regardless of total calls. Failure rate: circuit opens when X% of the last N calls failed. Rate-based is more adaptive — 5 failures out of 100 calls is fine; 5 out of 5 is not.

### Should the circuit breaker timeout be fixed or exponential?

Start with a fixed timeout (30-60 seconds). If the service recovers quickly, the circuit opens unnecessarily. If it recovers slowly, trial requests fail and reopen the circuit. For services with unpredictable recovery, use exponential backoff on the timeout.

### Can I use circuit breaker with async/await?

Yes. The circuit breaker logic (state checks, transitions) is synchronous. The actual function call can be async. In JavaScript, wrap the async call in `breaker.call(asyncFn)`. In Python, call `breaker.call(asyncio.run, async_fn)`.
