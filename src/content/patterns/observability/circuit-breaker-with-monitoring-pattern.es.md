---
contentType: patterns
slug: circuit-breaker-with-monitoring-pattern
title: "Circuit Breaker con Monitoring"
description: "Cómo exponer circuit breaker state como métricas para observability. Cubre Prometheus integration, reglas de alerting, dashboards y state transitions."
metaDescription: "Expón el estado de circuit breakers como métricas para observability. Aprende integración Prometheus, alerting, dashboards y tracking de transiciones."
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
  - /patterns/circuit-breaker-pattern
  - /patterns/health-check-pattern
  - /patterns/metrics-aggregation-pattern
  - /patterns/structured-logging-pattern
  - /guides/complete-guide-observability-grafana-stack
  - /guides/complete-guide-prometheus-grafana
lastUpdated: "2026-08-19"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Expón el estado de circuit breakers como métricas para observability. Aprende integración Prometheus, alerting, dashboards y tracking de transiciones."
  keywords:
    - observability
    - circuit-breaker
    - resilience
    - prometheus
    - alerting
    - pattern
---

## Visión General

Un circuit breaker detiene llamadas a un servicio que está fallando para prevenir
fallas en cascada. Sin monitoring, no podés ver qué breakers están abiertos,
cuánto tiempo se quedan abiertos ni qué tan seguido se disparan.

El patrón Circuit Breaker con Monitoring expone el estado del breaker (closed,
open, half-open), los conteos de fallas y los eventos de transición como métricas
de Prometheus. Esto te permite construir dashboards con estados en tiempo real,
alertar cuando un breaker permanece abierto demasiado tiempo y analizar patrones
de recuperación.

## Cuándo Usar

- Cualquier sistema que use circuit breakers y necesite visibilidad operativa.
- Microservicios con múltiples dependencias downstream protegidas por breakers.
- Entornos de producción donde necesitás alertar sobre breakers abiertos.
- Capacity planning y seguimiento de cuánto tiempo se mantienen los breakers
  abiertos.
- Respuesta a incidentes para identificar rápidamente una dependencia fallante.

### Cuándo evitarlo

- Aplicaciones que no usan circuit breakers — no hay estado para monitorear.
- Entornos de desarrollo donde podés observar el comportamiento directamente.
- Aplicaciones simples con una única dependencia downstream.
- Cuando la librería de circuit breaker ya exporta métricas.

## Solución

### Python circuit breaker con métricas de Prometheus

```python
import time
from enum import Enum
from prometheus_client import Gauge, Counter, Histogram, start_http_server

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

CIRCUIT_STATE = Gauge(
    "circuit_breaker_state",
    "Circuit breaker state (0=closed, 1=open, 2=half_open)",
    ["service", "endpoint"],
)

CIRCUIT_FAILURES = Counter(
    "circuit_breaker_failures_total",
    "Total failures that contributed to circuit breaker tripping",
    ["service", "endpoint"],
)

CIRCUIT_SUCCESSES = Counter(
    "circuit_breaker_successes_total",
    "Total successful calls through circuit breaker",
    ["service", "endpoint"],
)

CIRCUIT_REJECTED = Counter(
    "circuit_breaker_rejected_total",
    "Total calls rejected because circuit was open",
    ["service", "endpoint"],
)

CIRCUIT_STATE_TRANSITIONS = Counter(
    "circuit_breaker_state_transitions_total",
    "Circuit breaker state transitions",
    ["service", "endpoint", "from_state", "to_state"],
)

CIRCUIT_OPEN_DURATION = Histogram(
    "circuit_breaker_open_duration_seconds",
    "How long the circuit breaker stayed open",
    ["service", "endpoint"],
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

start_http_server(9090)

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
const CircuitBreaker = require("opossum");
const promClient = require("prom-client");

const register = new promClient.Registry();

const circuitState = new promClient.Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 1=open, 2=half_open)",
  labelNames: ["service", "endpoint"],
  registers: [register],
});

const circuitFailures = new promClient.Counter({
  name: "circuit_breaker_failures_total",
  help: "Total failures that contributed to circuit breaker tripping",
  labelNames: ["service", "endpoint"],
  registers: [register],
});

const circuitRejected = new promClient.Counter({
  name: "circuit_breaker_rejected_total",
  help: "Total calls rejected because circuit was open",
  labelNames: ["service", "endpoint"],
  registers: [register],
});

const circuitTransitions = new promClient.Counter({
  name: "circuit_breaker_state_transitions_total",
  help: "Circuit breaker state transitions",
  labelNames: ["service", "endpoint", "from_state", "to_state"],
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
  const stateMap = { closed: 0, opened: 1, halfOpen: 2 };

  breaker.on("state", (from, to) => {
    circuitState.labels(labels).set(stateMap[to] ?? 0);
    circuitTransitions.labels({
      ...labels,
      from_state: from,
      to_state: to,
    }).inc();
  });

  breaker.on("failure", () => {
    circuitFailures.labels(labels).inc();
  });

  breaker.on("reject", () => {
    circuitRejected.labels(labels).inc();
  });

  circuitState.labels(labels).set(0);

  return breaker;
}

const paymentBreaker = createMonitoredBreaker(
  "payment-service",
  "/api/charge",
  async (order) => {
    const response = await fetch("https://payment-service/api/charge", {
      method: "POST",
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error(`Payment failed: ${response.status}`);
    return response.json();
  },
  { timeout: 5000, errorThreshold: 50, resetTimeout: 30000 }
);

const express = require("express");
const app = express();

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

### Java con Resilience4j y Micrometer

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.micrometer.tagged.TaggedCircuitBreakerMetrics;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.prometheus.PrometheusConfig;
import io.micrometer.prometheus.PrometheusMeterRegistry;
import java.time.Duration;

MeterRegistry meterRegistry = new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
CircuitBreakerRegistry registry = CircuitBreakerRegistry.ofDefaults();

TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(registry)
    .bindTo(meterRegistry);

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

CircuitBreaker.decorateSupplier(paymentBreaker, () -> {
    return paymentClient.charge(order);
}).get();

// Métricas expuestas automáticamente:
// resilience4j_circuitbreaker_state{name="payment-service",state="closed"} 1
// resilience4j_circuitbreaker_calls_total{name="payment-service",kind="successful"} 42
// resilience4j_circuitbreaker_calls_total{name="payment-service",kind="failed"} 3
// resilience4j_circuitbreaker_calls_total{name="payment-service",kind="not_permitted"} 0
```

### Reglas de alerting de Prometheus

```yaml
groups:
  - name: circuit-breakers
    rules:
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker open for {{ $labels.service }}/{{ $labels.endpoint }}"
          description: "The circuit breaker has been open for more than 1 minute."

      - alert: CircuitBreakerHighRejectionRate
        expr: rate(circuit_breaker_rejected_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High rejection rate for {{ $labels.service }}"
          description: "Circuit breaker is rejecting more than 10 calls per second."

      - alert: CircuitBreakerFlapping
        expr: increase(circuit_breaker_state_transitions_total[10m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker flapping for {{ $labels.service }}"
          description: "More than 10 state transitions in 10 minutes."

      - alert: CircuitBreakerTripped
        expr: increase(circuit_breaker_state_transitions_total{to_state="open"}[1m]) > 0
        labels:
          severity: info
        annotations:
          summary: "Circuit breaker tripped for {{ $labels.service }}/{{ $labels.endpoint }}"
```

### Queries de dashboard de Grafana

```text
# Estado actual de todos los circuit breakers
circuit_breaker_state

# Failure rate por servicio
sum(rate(circuit_breaker_failures_total[5m])) by (service)

# Rejection rate por servicio
sum(rate(circuit_breaker_rejected_total[5m])) by (service)

# Cuánto tiempo se mantuvieron abiertos (percentil 95)
histogram_quantile(0.95,
  rate(circuit_breaker_open_duration_seconds_bucket[1h]))

# Transiciones de estado a lo largo del tiempo
sum(rate(circuit_breaker_state_transitions_total[1h])) by (service, from_state, to_state)

# Success rate a través de los breakers
sum(rate(circuit_breaker_successes_total[5m])) by (service)
  /
  (sum(rate(circuit_breaker_successes_total[5m])) by (service)
   + sum(rate(circuit_breaker_failures_total[5m])) by (service))
```

### Logging estructurado para transiciones

```python
import structlog

logger = structlog.get_logger()

class MonitoredCircuitBreaker:
    # ... código anterior ...

    def _transition(self, new_state):
        old_state = self._state
        if old_state == new_state:
            return

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

        # Actualizar métricas como antes
        CIRCUIT_STATE_TRANSITIONS.labels(
            service=self.service,
            endpoint=self.endpoint,
            from_state=old_state.value,
            to_state=new_state.value,
        ).inc()
```

## Variantes

### Bulkhead monitoring junto a circuit breakers

```javascript
const { Bulkhead } = require("opossum");

const bulkheadActiveCalls = new promClient.Gauge({
  name: "bulkhead_active_calls",
  help: "Currently active calls in bulkhead",
  labelNames: ["service"],
  registers: [register],
});

const bulkheadRejected = new promClient.Counter({
  name: "bulkhead_rejected_total",
  help: "Calls rejected by bulkhead",
  labelNames: ["service"],
  registers: [register],
});

function createMonitoredBulkhead(service, fn, maxConcurrent) {
  const bulkhead = new Bulkhead(fn, { maxConcurrent });

  bulkhead.on("execute", () => {
    bulkheadActiveCalls.labels({ service }).inc();
  });

  bulkhead.on("reject", () => {
    bulkheadRejected.labels({ service }).inc();
  });

  bulkhead.on("success", () => {
    bulkheadActiveCalls.labels({ service }).dec();
  });

  bulkhead.on("failure", () => {
    bulkheadActiveCalls.labels({ service }).dec();
  });

  return bulkhead;
}
```

### Dashboard de múltiples dependencias

```python
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
        return {
            key: breaker._state.value
            for key, breaker in self.breakers.items()
        }

monitor = DependencyMonitor()
monitor.register("payment-service", "/api/charge")
monitor.register("inventory-service", "/api/stock")
monitor.register("notification-service", "/api/email")
monitor.register("user-service", "/api/users")
```

## Explicación

Monitorear un circuit breaker significa emitir métricas para:

- **Estado**: un gauge mapeado a 0 (closed), 1 (open) o 2 (half-open).
- **Fallos y éxitos**: contadores para calcular tasas de error.
- **Llamadas rechazadas**: contador para detectar cuándo se descarta tráfico.
- **Transiciones de estado**: contador para detectar flapping.
- **Duración abierta**: histograma para medir cuánto tarda la recuperación.

Los logs complementan las métricas registrando por qué un breaker cambió de
estado. Usá labels determinísticos como `service` y `endpoint` en métricas, logs y
trazas. Esto facilita correlacionar una alerta de Grafana con los logs
asociados.

## Mejores Prácticas

- Exponer el estado como gauge con valores numéricos para cada estado.
- Trackear las transiciones de estado por separado para detectar flapping.
- Alertar cuando un breaker permanece abierto más de un minuto.
- Loguear las transiciones con conteos de fallas y thresholds.
- Medir la duración abierta con un histograma para identificar problemas crónicos
  vs. transientes.
- Monitorear la tasa de rechazo, porque una alta tasa significa degradación
  aunque el servicio no esté caído.
- Usar labels consistentes `service` y `endpoint` en métricas, logs y trazas.
- Configurar detección de flapping: más de diez transiciones en diez minutos suele
  indicar una dependencia inestable.

## Errores Comunes

- Trackear solo el gauge de estado e ignorar fallas, rechazos y duración.
- No alertar cuando un breaker está abierto, dejándolo abierto por horas.
- No loguear las transiciones, dificultando entender por qué se abrió.
- Ignorar el estado half-open, clave para entender los intentos de recuperación.
- No detectar flapping, perdiendo una dependencia inestable.
- Depender solo de deduplicación sin que la operación sea naturalmente
  idempotente.

## FAQ

### ¿Por qué exponer el estado del circuit breaker como métricas?

Las métricas te permiten construir dashboards y alertas. Sin ellas, no podés
responder "¿qué breakers están abiertos ahora?" ni "¿qué tan seguido se dispara
el breaker de pagos?" sin revisar manualmente cada servicio.

### ¿En qué debería alertar?

- Cualquier breaker abierto por más de 1 minuto: crítico.
- Tasa de rechazo mayor a 10 por segundo: advertencia.
- Más de 10 transiciones de estado en 10 minutos: flapping, advertencia.

### ¿En qué se diferencia de los health checks?

Los health checks reportan si tu servicio está vivo. Las métricas de circuit
breaker reportan si tus dependencias están saludables. Un servicio puede estar
vivo pero degradado porque un breaker downstream está abierto.

### ¿Debería usar una librería o construir mi propio breaker?

Usá una librería (opossum, Resilience4j, pybreaker) para la lógica del breaker y
agregá el monitoring. La mayoría expone hooks para métricas. Construir un breaker
desde cero es propenso a errores.

### ¿Qué es el flapping y por qué importa?

El flapping ocurre cuando un breaker abre y cierra rápidamente. Indica una
dependencia inestable que falla intermitentemente. Suele ser más difícil de
diagnosticar que un breaker consistentemente abierto.

### ¿Puedo usar esto con trazas?

Sí. Agregá las labels `service` y `endpoint` como tags de traza. Cuando una alerta
se dispare, podés saltar de la métrica a la traza para ver la llamada fallante.
