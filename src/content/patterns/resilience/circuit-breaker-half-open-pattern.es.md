---
contentType: patterns
slug: circuit-breaker-half-open-pattern
title: "Patrón Circuit Breaker Half-Open"
description: "Cómo testear service recovery con half-open circuit breaker state transitions. Cubre closed, open, half-open states, trial requests, y gradual recovery."
metaDescription: "Testeá service recovery con half-open circuit breaker state transitions. Aprende closed, open, half-open states, trial requests, y gradual recovery patterns."
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
  metaDescription: "Testeá service recovery con half-open circuit breaker state transitions. Aprende closed, open, half-open states, trial requests, y gradual recovery patterns."
  keywords:
    - architecture
    - resilience
    - circuit-breaker
    - fault-tolerance
    - pattern
---

## Overview

El circuit breaker half-open pattern extiende el basic circuit breaker con un half-open state para testear recovery. Un circuit breaker tiene tres states: closed (requests flowean normally), open (requests son rejected immediately), y half-open (un limited number de trial requests son allowed). Cuando el circuit transitionéa de open a half-open, sendéa un small number de test requests. Si succeeden, el circuit se cierra y full traffic resume. Si fallan, el circuit se reopen. Esto previene floodear un recovering service con full traffic, lo cual podría causar que falle again. El half-open state es el critical bridge entre failure detection y full recovery.

## When to Use

- Protecteando services de cascading failures durante outages
- Llamando downstream services que pueden volverse temporarily unavailable
- Microservices donde un service failure no debería cascadear a todos los callers
- Database connection management con automatic recovery
- External API calls que pueden experimentar transient outages

## When NOT to Use

- In-process function calls (usá try/catch)
- Operations donde el failure es permanent (validation errors, 404s)
- Real-time systems donde el open-state rejection latency es unacceptable
- Cuando necesitás que cada request llegue al service (no fail-fast behavior)

## Solution

### Three-state circuit breaker (Python)

```python
# circuit_breaker/three_state.py — Circuit breaker con half-open state
import time
import threading
from enum import Enum
from collections import defaultdict

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """Circuit breaker con closed, open, y half-open states.

    Closed: requests flowean normally. Failures incrementan el counter.
    Open: requests son rejected immediately. Después de timeout, transitionéa a half-open.
    Half-open: limited trial requests. Success cierra, failure reopen.
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
        """Checkeá si el circuit debería transitionear de open a half-open."""
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
                self._success_count = 0
                print(f"Circuit transitioned: OPEN -> HALF_OPEN")

    def call(self, fn, *args, **kwargs):
        """Ejecutá fn a través del circuit breaker."""
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

        # Ejecutá el function fuera del lock
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
    """Raiseado cuando el circuit está open y requests son rejected."""
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
# circuit_breaker/registry.py — Manageéa circuit breakers per service
import threading
from circuit_breaker.three_state import CircuitBreaker, CircuitState

class CircuitBreakerRegistry:
    """Maintainéa un circuit breaker per service name.
    Cada service tiene independent state y thresholds."""

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

# Monitoreá todos los circuits
for name, state in registry.get_all_states().items():
    print(f"{name}: {state['state']}")
```

### Java circuit breaker con resilience4j

```java
// CircuitBreakerConfig.java — Java circuit breaker con resilience4j
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.time.Duration;

public class ServiceCircuitBreakers {

    private final CircuitBreakerRegistry registry;

    public ServiceCircuitBreakers() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)           // 50% failure rate abre circuit
            .slowCallRateThreshold(80)          // 80% slow calls abre circuit
            .slowCallDurationThreshold(Duration.ofSeconds(5))
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .slidingWindowSize(10)              // Last 10 calls
            .minimumNumberOfCalls(5)            // Need 5 calls antes de evaluar
            .permittedNumberOfCallsInHalfOpenState(3)  // Trial calls en half-open
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

### Circuit breaker con metrics (Python)

```python
# circuit_breaker/with_metrics.py — Circuit breaker con Prometheus metrics
import time
import threading
from prometheus_client import Counter, Gauge, Histogram
from circuit_breaker.three_state import CircuitBreaker, CircuitState

class InstrumentedCircuitBreaker(CircuitBreaker):
    """Circuit breaker que exportéa metrics a Prometheus."""

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
// circuit_breaker/index.js — Circuit breaker para Node.js
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
# circuit_breaker/gradual.py — Gradualmente aumentá traffic en half-open
class GradualCircuitBreaker(CircuitBreaker):
    """En vez de binary closed/half-open, gradualmente aumentá allowed traffic.
    Half-open phase 1: 10% de requests
    Half-open phase 2: 50% de requests
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

### Circuit breaker con fallback

```python
# circuit_breaker/with_fallback.py — Returneá fallback cuando circuit está open
class CircuitBreakerWithFallback:
    """Cuando el circuit está open, returneá un fallback response
    en vez de raiseear un error."""

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

- Seteá appropriate thresholds — too low causa false opens; too high allowéa cascading failures
- Usá sliding window para failure counting — no un simple counter que never resetéa
- Monitoreá circuit state transitions — alertéa en frequent open/close oscillation
- Usá el half-open state — previene floodear un recovering service
- Seteá un success threshold en half-open — requireé N consecutive successes antes de cerrar
- Combiná con fallbacks — returneá cached/default data cuando el circuit está open
- Exportéa metrics — trackeá state, failure rate, rejection count per circuit
- Testeá el circuit breaker — injectéa failures y verificá state transitions

## Common Mistakes

- **No half-open state**: circuit oscillate entre open y closed, floodeando el recovering service.
- **Failure threshold too low**: circuit abre en un single failure, rejecteando valid traffic.
- **No success threshold**: first half-open success cierra el circuit, pero el service puede no estar fully recovered.
- **Not resetting failure count en success**: una vez que failures accumulate, el circuit never se cierra.
- **No monitoring**: no sabés que los circuits están abriendo hasta que users se quejan.

## FAQ

### ¿Qué es el half-open state en un circuit breaker?

Un transitional state entre open y closed. El circuit allowéa un limited number de trial requests. Si succeeden, el circuit se cierra y full traffic resume. Si fallan, el circuit se reopen. Esto previene floodear un recovering service con full traffic.

### ¿Cuántos trial requests debería allowear en half-open?

Típicamente 3-5. Too few y un single failed trial reopenéa el circuit. Too many y riskéas overwhelming el recovering service. Requireé 2-3 consecutive successes antes de cerrar el circuit.

### ¿Cuál es la diferencia entre failure rate y failure count thresholds?

Failure count: circuit abre después de N failures sin importar total calls. Failure rate: circuit abre cuando X% de los last N calls fallearon. Rate-based es más adaptive — 5 failures out of 100 calls está fine; 5 out of 5 no.

### ¿Debería el circuit breaker timeout ser fixed o exponential?

Arrancá con un fixed timeout (30-60 seconds). Si el service recoveréa quick, el circuit abre unnecessarily. Si recoveréa slow, trial requests fallan y reopenéan el circuit. Para services con unpredictable recovery, usá exponential backoff en el timeout.

### ¿Puedo usar circuit breaker con async/await?

Sí. El circuit breaker logic (state checks, transitions) es synchronous. El actual function call puede ser async. En JavaScript, wrapeá el async call en `breaker.call(asyncFn)`. En Python, llamá `breaker.call(asyncio.run, async_fn)`.
