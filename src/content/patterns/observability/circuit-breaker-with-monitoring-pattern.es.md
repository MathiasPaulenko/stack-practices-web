---



contentType: patterns
slug: circuit-breaker-with-monitoring-pattern
title: "Circuit Breaker con Monitoring"
description: "Cómo exponer circuit breaker state como metrics para observability. Cubre Prometheus integration, alerting rules, dashboards, y state transitions."
metaDescription: "Expón circuit breaker state como metrics para observability. Aprende Prometheus integration, alerting en open breakers, dashboards, y state transition tracking."
difficulty: advanced
topics:
  - observability
tags:
  - observability
  - circuit-breaker
  - resilience
  - prometheus
  - alerting
  - pattern
category: architectural
relatedResources:
  - /patterns/health-check-pattern
  - /patterns/metrics-aggregation-pattern
  - /patterns/structured-logging-pattern
  - /guides/complete-guide-observability-grafana-stack
  - /guides/complete-guide-prometheus-grafana
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Expón circuit breaker state como metrics para observability. Aprende Prometheus integration, alerting en open breakers, dashboards, y state transition tracking."
  keywords:
    - observability
    - circuit-breaker
    - resilience
    - prometheus
    - alerting
    - pattern



---

## Overview

Un circuit breaker para los calls a un failing service para prevenir cascading failures. Pero sin monitoring, estás volando a ciegas — no sabés qué breakers están open, qué tan seguido tripean, o cuánto tiempo se quedan open. El patrón circuit breaker with monitoring expone breaker state (closed, open, half-open), failure counts, y transition events como Prometheus metrics. Esto te permite construir dashboards mostrando real-time breaker states, alertar cuando breakers se quedan open demasiado tiempo, y trackear recovery patterns over time.

## When to Use

- Cualquier sistema que usa circuit breakers que necesita operational visibility
- Microservices donde múltiples downstream dependencies tienen breakers
- Production environments donde necesitás alertar en open breakers
- Capacity planning — trackear qué tan seguido y cuánto tiempo los breakers tripean
- Incident response — identificar rápidamente qué dependency está fallando

## When NOT to Use

- Aplicaciones sin circuit breakers — no hay state para monitorear
- Development environments donde podés observar behavior directamente
- Aplicaciones simples con un single downstream dependency
- Cuando tu circuit breaker library ya exporta metrics (algunas lo hacen)

## Solution

### Python circuit breaker con Prometheus metrics

```python
# Python — circuit breaker con Prometheus metrics
import time
from enum import Enum
from prometheus_client import Gauge, Counter, Histogram, start_http_server

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

# Metrics
CIRCUIT_STATE = Gauge(
    'circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=open, 2=half_open)',
    ['service', 'endpoint'],
)

CIRCUIT_FAILURES = Counter(
    'circuit_breaker_failures_total',
    'Total failures that contributed to circuit breaker tripping',
    ['service', 'endpoint'],
)

CIRCUIT_SUCCESSES = Counter(
    'circuit_breaker_successes_total',
    'Total successful calls through circuit breaker',
    ['service', 'endpoint'],
)

CIRCUIT_REJECTED = Counter(
    'circuit_breaker_rejected_total',
    'Total calls rejected because circuit was open',
    ['service', 'endpoint'],
)

CIRCUIT_STATE_TRANSITIONS = Counter(
    'circuit_breaker_state_transitions_total',
    'Circuit breaker state transitions',
    ['service', 'endpoint', 'from_state', 'to_state'],
)

CIRCUIT_OPEN_DURATION = Histogram(
    'circuit_breaker_open_duration_seconds',
    'How long the circuit breaker stayed open',
    ['service', 'endpoint'],
    buckets=[1, 5, 10, 30, 60, 120, 300, 600],
)

class MonitoredCircuitBreaker:
    def __init__(
        self,
        service_name,
        endpoint,
        failure_threshold=5,
        recovery_timeout=60,
        half_open_max_calls=3,
    ):
        self.service = service_name
        self.endpoint = endpoint
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0
        self._last_failure_time = None
        self._opened_at = None

        self._update_state_metric()

    def _update_state_metric(self):
        state_map = {
            CircuitState.CLOSED: 0,
            CircuitState.OPEN: 1,
            CircuitState.HALF_OPEN: 2,
        }
        CIRCUIT_STATE.labels(
            service=self.service,
            endpoint=self.endpoint,
        ).set(state_map[self._state])

    def _transition(self, new_state):
        old_state = self._state
        if old_state == new_state:
            return

        CIRCUIT_STATE_TRANSITIONS.labels(
            service=self.service,
            endpoint=self.endpoint,
            from_state=old_state.value,
            to_state=new_state.value,
        ).inc()

        if old_state == CircuitState.OPEN and new_state == CircuitState.CLOSED:
            if self._opened_at:
                duration = time.time() - self._opened_at
                CIRCUIT_OPEN_DURATION.labels(
                    service=self.service,
                    endpoint=self.endpoint,
                ).observe(duration)

        self._state = new_state
        self._update_state_metric()

        if new_state == CircuitState.OPEN:
            self._opened_at = time.time()
        elif new_state == CircuitState.CLOSED:
            self._opened_at = None
            self._failure_count = 0
            self._success_count = 0

    def call(self, func, *args, **kwargs):
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time > self.recovery_timeout:
                self._transition(CircuitState.HALF_OPEN)
                self._half_open_calls = 0
            else:
                CIRCUIT_REJECTED.labels(
                    service=self.service,
                    endpoint=self.endpoint,
                ).inc()
                raise CircuitBreakerOpenError(
                    f"Circuit breaker open for {self.service}/{self.endpoint}"
                )

        if self._state == CircuitState.HALF_OPEN:
            if self._half_open_calls >= self.half_open_max_calls:
                CIRCUIT_REJECTED.labels(
                    service=self.service,
                    endpoint=self.endpoint,
                ).inc()
                raise CircuitBreakerOpenError("Half-open call limit reached")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        CIRCUIT_SUCCESSES.labels(
            service=self.service,
            endpoint=self.endpoint,
        ).inc()

        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            self._half_open_calls += 1
            if self._success_count >= self.half_open_max_calls:
                self._transition(CircuitState.CLOSED)
        elif self._state == CircuitState.CLOSED:
            self._failure_count = 0

    def _on_failure(self):
        CIRCUIT_FAILURES.labels(
            service=self.service,
            endpoint=self.endpoint,
        ).inc()

        self._last_failure_time = time.time()

        if self._state == CircuitState.HALF_OPEN:
            self._transition(CircuitState.OPEN)
        elif self._state == CircuitState.CLOSED:
            self._failure_count += 1
            if self._failure_count >= self.failure_threshold:
                self._transition(CircuitState.OPEN)

class CircuitBreakerOpenError(Exception):
    pass

# Start metrics server
start_http_server(9090)

# Usage
payment_breaker = MonitoredCircuitBreaker(
    service="payment-service",
    endpoint="/api/charge",
    failure_threshold=5,
    recovery_timeout=60,
)

def charge_payment(order):
    return payment_breaker.call(payment_gateway.charge, order)
```

### Node.js con opossum y Prometheus

```javascript
// JavaScript — opossum circuit breaker con Prometheus metrics
const CircuitBreaker = require('opossum');
const promClient = require('prom-client');

const register = new promClient.Registry();

const circuitState = new promClient.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half_open)',
  labelNames: ['service', 'endpoint'],
  registers: [register],
});

const circuitFailures = new promClient.Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total failures that contributed to circuit breaker tripping',
  labelNames: ['service', 'endpoint'],
  registers: [register],
});

const circuitRejected = new promClient.Counter({
  name: 'circuit_breaker_rejected_total',
  help: 'Total calls rejected because circuit was open',
  labelNames: ['service', 'endpoint'],
  registers: [register],
});

const circuitTransitions = new promClient.Counter({
  name: 'circuit_breaker_state_transitions_total',
  help: 'Circuit breaker state transitions',
  labelNames: ['service', 'endpoint', 'from_state', 'to_state'],
  registers: [register],
});

function createMonitoredBreaker(name, endpoint, fn, options = {}) {
  const breaker = new CircuitBreaker(fn, {
    timeout: options.timeout || 5000,
    errorThresholdPercentage: options.errorThreshold || 50,
    resetTimeout: options.resetTimeout || 30000,
    rollingCountTimeout: 60000,
    rollingCountBuckets: 10,
    name: `${name}/${endpoint}`,
  });

  const labels = { service: name, endpoint };

  // Map opossum states a numeric values
  const stateMap = { closed: 0, opened: 1, halfOpen: 2 };

  // Update state gauge en cada state change
  breaker.on('state', (from, to) => {
    circuitState.labels(labels).set(stateMap[to] ?? 0);
    circuitTransitions.labels({
      ...labels,
      from_state: from,
      to_state: to,
    }).inc();
  });

  breaker.on('failure', () => {
    circuitFailures.labels(labels).inc();
  });

  breaker.on('reject', () => {
    circuitRejected.labels(labels).inc();
  });

  // Set initial state
  circuitState.labels(labels).set(0);

  return breaker;
}

// Usage
const paymentBreaker = createMonitoredBreaker(
  'payment-service',
  '/api/charge',
  async (order) => {
    const response = await fetch('https://payment-service/api/charge', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error(`Payment failed: ${response.status}`);
    return response.json();
  },
  { timeout: 5000, errorThreshold: 50, resetTimeout: 30000 }
);

// Metrics endpoint
const express = require('express');
const app = express();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Java con Resilience4j y Micrometer

```java
// Java — Resilience4j circuit breaker con Micrometer metrics
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.micrometer.tagged.TaggedCircuitBreakerMetrics;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.prometheus.PrometheusMeterRegistry;

// Setup
MeterRegistry meterRegistry = new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
CircuitBreakerRegistry registry = CircuitBreakerRegistry.ofDefaults();

// Register Micrometer metrics para todos los circuit breakers
TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(registry)
    .bindTo(meterRegistry);

// Create un circuit breaker
CircuitBreaker paymentBreaker = CircuitBreaker.of(
    "payment-service",
    CircuitBreakerConfig.custom()
        .failureRateThreshold(50)
        .waitDurationInOpenState(Duration.ofSeconds(30))
        .slidingWindowSize(10)
        .minimumNumberOfCalls(5)
        .build()
);

registry.addCircuitBreaker(paymentBreaker);

// Usage con automatic metrics
CircuitBreaker.decorateSupplier(paymentBreaker, () -> {
    return paymentClient.charge(order);
}).get();

// Metrics automáticamente expuestos:
// resilience4j_circuitbreaker_state{name="payment-service",state="closed"} 1
// resilience4j_circuitbreaker_calls_total{name="payment-service",kind="successful"} 42
// resilience4j_circuitbreaker_calls_total{name="payment-service",kind="failed"} 3
// resilience4j_circuitbreaker_calls_total{name="payment-service",kind="not_permitted"} 0
```

### Alerting rules para circuit breakers

```yaml
# Prometheus alerting rules para circuit breakers
groups:
  - name: circuit-breakers
    rules:
      # Critical: cualquier circuit breaker está open
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker open for {{ $labels.service }}/{{ $labels.endpoint }}"
          description: "The circuit breaker has been open for more than 1 minute."

      # Warning: high rejection rate
      - alert: CircuitBreakerHighRejectionRate
        expr: |
          rate(circuit_breaker_rejected_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High rejection rate for {{ $labels.service }}"
          description: "Circuit breaker is rejecting more than 10 calls/sec."

      # Warning: frequent state transitions (flapping)
      - alert: CircuitBreakerFlapping
        expr: |
          increase(circuit_breaker_state_transitions_total[10m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker flapping for {{ $labels.service }}"
          description: "More than 10 state transitions in 10 minutes."

      # Info: breaker recently opened
      - alert: CircuitBreakerTripped
        expr: |
          increase(circuit_breaker_state_transitions_total{to_state="open"}[1m]) > 0
        labels:
          severity: info
        annotations:
          summary: "Circuit breaker tripped for {{ $labels.service }}/{{ $labels.endpoint }}"
```

### Grafana dashboard queries

```promql
# Current state de todos los circuit breakers
circuit_breaker_state

# Failure rate by service
sum(rate(circuit_breaker_failures_total[5m])) by (service)

# Rejection rate by service
sum(rate(circuit_breaker_rejected_total[5m])) by (service)

# Cuánto tiempo los breakers se quedaron open (95th percentile)
histogram_quantile(0.95,
  rate(circuit_breaker_open_duration_seconds_bucket[1h]))

# State transitions over time
sum(rate(circuit_breaker_state_transitions_total[1h])) by (service, from_state, to_state)

# Success rate through breakers
sum(rate(circuit_breaker_successes_total[5m])) by (service)
  /
  (sum(rate(circuit_breaker_successes_total[5m])) by (service)
   + sum(rate(circuit_breaker_failures_total[5m])) by (service))
```

### Structured logging para state transitions

```python
# Python — loggear circuit breaker state transitions
import structlog
logger = structlog.get_logger()

class MonitoredCircuitBreaker:
    # ... (previous code)

    def _transition(self, new_state):
        old_state = self._state
        if old_state == new_state:
            return

        # Loggear el transition
        logger.warning(
            "circuit_breaker_state_transition",
            service=self.service,
            endpoint=self.endpoint,
            from_state=old_state.value,
            to_state=new_state.value,
            failure_count=self._failure_count,
        )

        if new_state == CircuitState.OPEN:
            logger.error(
                "circuit_breaker_opened",
                service=self.service,
                endpoint=self.endpoint,
                failure_count=self._failure_count,
                threshold=self.failure_threshold,
                recovery_timeout=self.recovery_timeout,
            )
        elif new_state == CircuitState.CLOSED:
            logger.info(
                "circuit_breaker_closed",
                service=self.service,
                endpoint=self.endpoint,
                open_duration=time.time() - self._opened_at if self._opened_at else 0,
            )

        # Update metrics (as before)
        CIRCUIT_STATE_TRANSITIONS.labels(
            service=self.service,
            endpoint=self.endpoint,
            from_state=old_state.value,
            to_state=new_state.value,
        ).inc()
        # ... rest of transition logic
```

## Variants

### Bulkhead monitoring alongside circuit breakers

```javascript
// JavaScript — monitorear bulkhead (concurrent call limiter) con circuit breaker
const { Bulkhead } = require('opossum');

const bulkheadActiveCalls = new promClient.Gauge({
  name: 'bulkhead_active_calls',
  help: 'Currently active calls in bulkhead',
  labelNames: ['service'],
  registers: [register],
});

const bulkheadRejected = new promClient.Counter({
  name: 'bulkhead_rejected_total',
  help: 'Calls rejected by bulkhead',
  labelNames: ['service'],
  registers: [register],
});

function createMonitoredBulkhead(service, fn, maxConcurrent) {
  const bulkhead = new Bulkhead(fn, { maxConcurrent });

  bulkhead.on('execute', () => {
    bulkheadActiveCalls.labels({ service }).inc();
  });

  bulkhead.on('reject', () => {
    bulkheadRejected.labels({ service }).inc();
  });

  bulkhead.on('success', () => {
    bulkheadActiveCalls.labels({ service }).dec();
  });

  bulkhead.on('failure', () => {
    bulkheadActiveCalls.labels({ service }).dec();
  });

  return bulkhead;
}
```

### Multi-dependency dashboard

```python
# Python — trackear múltiples downstream dependencies
class DependencyMonitor:
    def __init__(self):
        self.breakers = {}

    def register(self, service, endpoint, failure_threshold=5, recovery_timeout=60):
        breaker = MonitoredCircuitBreaker(
            service_name=service,
            endpoint=endpoint,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
        )
        self.breakers[f"{service}/{endpoint}"] = breaker
        return breaker

    def health_summary(self):
        """Return un summary de todos los breaker states para health endpoint."""
        return {
            key: breaker._state.value
            for key, breaker in self.breakers.items()
        }

# Usage
monitor = DependencyMonitor()
monitor.register("payment-service", "/api/charge")
monitor.register("inventory-service", "/api/stock")
monitor.register("notification-service", "/api/email")
monitor.register("user-service", "/api/users")
```

## Best Practices


- For a deeper guide, see [Complete Guide to Observability with the Grafana Stack](/es/guides/complete-guide-observability-grafana-stack/).

- Exponé state como un gauge — 0 (closed), 1 (open), 2 (half-open). Esto permite alerting en specific states.
- Trackeá transitions separadamente — contá state changes para detect flapping breakers.
- Alertá en open breakers — un breaker que se queda open por más de 1 minuto es usualmente un problem.
- Loggeá state transitions — las metrics muestran el what, los logs muestran el why. Incluí failure counts y thresholds.
- Trackeá open duration — histogram de cuánto tiempo los breakers se quedan open ayuda a identificar chronic vs. transient issues.
- Monitoreá rejection rate — high rejection rate significa que tu service está degraded incluso si no está fully down.
- Usá consistent labels — service y endpoint labels deberían matchear across metrics, logs, y traces.
- Seteá flapping detection — más de 10 transitions en 10 minutos indica un unstable dependency.

## Common Mistakes

- **Solo trackear state**: saber que el breaker está open no alcanza. Trackeá failures, rejections, y open duration también.
- **No alerting en open state**: un breaker puede estar open por horas sin que nadie lo note si no hay alert.
- **No loggear transitions**: las metrics te dicen que el breaker opened, los logs te dicen por qué (failure count, threshold, error).
- **Ignorar half-open state**: half-open es un transient state, pero es importante para entender recovery attempts.
- **No flapping detection**: un breaker que abre y cierra rápidamente indica un unstable dependency que necesita investigation.

## FAQ

### ¿Por qué exponer circuit breaker state como metrics?

Las metrics te permiten construir dashboards y alerts. Sin metrics, no podés responder "qué breakers están open right now?" o "qué tan seguido tripea el payment breaker?" sin checkear manualmente cada service.

### ¿En qué debería alertar?

Alertá cuando cualquier breaker está open por más de 1 minuto (critical), cuando rejection rate excede 10/sec (warning), y cuando un breaker tiene más de 10 state transitions en 10 minutos (flapping, warning).

### ¿En qué se diferencia de health checks?

Los health checks te dicen si tu service está vivo. Las circuit breaker metrics te dicen si tus dependencies están healthy. Un service puede estar vivo pero degraded porque un downstream breaker está open.

### ¿Debería usar una library o buildar mi propio?

Usá una library (opossum, Resilience4j, pybreaker) para el breaker logic, después agregá monitoring. La mayoría de las libraries tienen hooks para metrics. Buildar un breaker from scratch es error-prone.

### ¿Qué es flapping y por qué importa?

Flapping es cuando un breaker abre y cierra rápidamente. Indica un unstable dependency que está intermittently fallando. Esto es a menudo peor que un consistently open breaker porque es más difícil de diagnosticar.
