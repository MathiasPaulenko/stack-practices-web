---
contentType: recipes
slug: java-micrometer-prometheus
title: "Exponer Métricas con Micrometer y Prometheus"
description: "Cómo exponer métricas personalizadas de aplicación usando Micrometer y Prometheus en Spring Boot, incluyendo counters, gauges, timers e histograms."
metaDescription: "Expon métricas personalizadas en Spring Boot con Micrometer y Prometheus. Trackea counters, gauges, timers e histograms para observabilidad."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - java
  - micrometer
  - prometheus
  - metrics
  - spring-boot
  - recipe
relatedResources:
  - /recipes/observability/python-prometheus-custom-metrics
  - /recipes/observability/java-actuator-health-checks
  - /recipes/observability/python-opentelemetry-tracing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Expon métricas personalizadas en Spring Boot con Micrometer y Prometheus. Trackea counters, gauges, timers e histograms para observabilidad."
  keywords:
    - observability
    - java
    - micrometer
    - prometheus
    - metrics
    - spring-boot
    - recipe
---

## Overview

Micrometer es una fachada de métricas para aplicaciones Spring Boot. Proporciona una API vendor-neutral para definir counters, gauges, timers e histograms. El exporter de Prometheus expone estas métricas en un formato de texto que un servidor Prometheus puede scrapear. Juntos, te dan visibilidad en tiempo real del performance y comportamiento de la aplicación.

## When to Use

- Trackear métricas de negocio (órdenes creadas, pagos procesados, usuarios activos)
- Medir latencia de operaciones (queries de DB, llamadas API, cache lookups)
- Monitorear pools de recursos (tamaño de connection pool, queue depth, thread count)
- Setear alerts en Prometheus/Grafana basadas en métricas de aplicación
- Construir dashboards para SLO tracking (error rate, latency percentiles)

## When NOT to Use

- Scripts simples o CLI tools — las métricas añaden overhead y complejidad
- Observability solo con logging — si no tienes un servidor Prometheus, las métricas son inútiles
- Datos de cardinalidad alta (métricas por usuario) — Prometheus maneja bien labels de baja cardinalidad, pero miles de valores de label causan explosión de cardinalidad

## Solution

### Setup con Spring Boot

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### Habilitar endpoint de Prometheus

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
  metrics:
    tags:
      application: user-service
      environment: ${spring.profiles.active:default}
```

Accede a las métricas en `http://localhost:8080/actuator/prometheus`.

### Counter — contar eventos

```java
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final Counter ordersCreated;
    private final Counter ordersFailed;

    public OrderService(MeterRegistry registry) {
        this.ordersCreated = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("type", "standard")
            .register(registry);

        this.ordersFailed = Counter.builder("orders.failed")
            .description("Total orders that failed processing")
            .tag("type", "standard")
            .register(registry);
    }

    public void createOrder(OrderRequest request) {
        try {
            // ... crear orden ...
            ordersCreated.increment();
        } catch (Exception e) {
            ordersFailed.increment();
            throw e;
        }
    }
}
```

### Gauge — trackear valor actual

```java
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class ConnectionPoolMonitor {

    private final AtomicInteger activeConnections = new AtomicInteger(0);

    public ConnectionPoolMonitor(MeterRegistry registry) {
        Gauge.builder("connection.pool.active", activeConnections, AtomicInteger::doubleValue)
            .description("Current active database connections")
            .tag("pool", "primary")
            .register(registry);
    }

    public void acquireConnection() {
        activeConnections.incrementAndGet();
    }

    public void releaseConnection() {
        activeConnections.decrementAndGet();
    }
}
```

### Timer — medir duración de operación

```java
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private final Timer paymentProcessingTimer;

    public PaymentService(MeterRegistry registry) {
        this.paymentProcessingTimer = Timer.builder("payment.processing.duration")
            .description("Time spent processing payments")
            .tag("provider", "stripe")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
    }

    public PaymentResult processPayment(PaymentRequest request) {
        return paymentProcessingTimer.record(() -> {
            // ... procesar pago ...
            return new PaymentResult("success");
        });
    }
}
```

### Timer con start/stop manual

```java
import io.micrometer.core.instrument.Timer.Sample;
import io.micrometer.core.instrument.MeterRegistry;

public class DatabaseQueryExecutor {

    private final MeterRegistry registry;

    public DatabaseQueryExecutor(MeterRegistry registry) {
        this.registry = registry;
    }

    public List<User> findUsers(String query) {
        Timer.Sample sample = Timer.start(registry);

        try {
            List<User> users = jdbcTemplate.query(query, userRowMapper);
            return users;
        } finally {
            sample.stop(Timer.builder("db.query.duration")
                .tag("operation", "find_users")
                .tag("status", "success")
                .register(registry));
        }
    }
}
```

### Distribution summary — trackear distribución de valores

```java
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;

@Service
public class OrderSizeTracker {

    private final DistributionSummary orderItemCounts;

    public OrderSizeTracker(MeterRegistry registry) {
        this.orderItemCounts = DistributionSummary.builder("order.item.count")
            .description("Number of items per order")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
    }

    public void recordOrder(int itemCount) {
        orderItemCounts.record(itemCount);
    }
}
```

### Usar anotaciones `@Counted` y `@Timed`

```java
import io.micrometer.core.annotation.Counted;
import io.micrometer.core.annotation.Timed;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Counted(value = "users.searched", description = "Total user searches")
    @Timed(value = "users.search.duration", description = "User search time",
           percentiles = {0.5, 0.95, 0.99})
    public List<User> searchUsers(String query) {
        // ... lógica de búsqueda ...
        return results;
    }
}
```

Habilita soporte de anotaciones:

```java
@Configuration
public class MetricsConfig {
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    @Bean
    public CountedAspect countedAspect(MeterRegistry registry) {
        return new CountedAspect(registry);
    }
}
```

### Labels multi-dimensionales

```java
Counter.builder("api.requests")
    .tag("method", "GET")
    .tag("endpoint", "/api/users")
    .tag("status", "200")
    .register(registry)
    .increment();
```

### Métricas personalizadas con `MeterBinder`

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CustomMetrics implements MeterBinder {

    @Override
    public void bindTo(MeterRegistry registry) {
        Gauge.builder("queue.depth", this, self -> getQueueDepth())
            .description("Current queue depth")
            .tag("queue", "order-processing")
            .register(registry);

        Gauge.builder("cache.size", this, self -> getCacheSize())
            .description("Current cache entry count")
            .tag("cache", "user-cache")
            .register(registry);
    }

    private int getQueueDepth() {
        return orderQueue.size();
    }

    private int getCacheSize() {
        return userCache.size();
    }
}
```

## Variants

### Usar Micrometer sin Spring Boot

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.micrometer.prometheus.PrometheusMeterRegistry;
import io.prometheus.client.exporter.HTTPServer;

public class StandaloneApp {
    public static void main(String[] args) throws Exception {
        PrometheusMeterRegistry registry = new PrometheusMeterRegistry(key -> null);

        Counter counter = Counter.builder("app.requests")
            .tag("endpoint", "/api")
            .register(registry);

        // Arrancar endpoint HTTP de Prometheus
        new HTTPServer(9090);

        counter.increment();
    }
}
```

### Usar Micrometer con Kotlin

```kotlin
@Service
class OrderService(registry: MeterRegistry) {

    private val ordersCreated = Counter.builder("orders.created")
        .description("Total orders created")
        .register(registry)

    fun createOrder(request: OrderRequest) {
        ordersCreated.increment()
    }
}
```

## Best Practices

- Usa tags para dimensiones (method, status, endpoint) — no crees nombres de métrica separados por combinación
- Mantén la cardinalidad baja — evita taggear con user IDs, request IDs u otros valores de alta cardinalidad
- Usa `publishPercentiles(0.5, 0.95, 0.99)` en timers para trackear distribuciones de latencia
- Nombra métricas con dots: `orders.created`, no `orders_created` — Micrometer normaliza a la convención del registry
- Registra métricas al tiempo de construcción, no en hot paths — evita crear nuevos meters por request
- Usa `@Timed` y `@Counted` para casos simples — timers manuales para control fino
- Setea `management.metrics.tags.application` globalmente para identificar tu servicio en dashboards multi-servicio

## Common Mistakes

- **Labels de alta cardinalidad**: taggear con `user_id` o `request_id` crea una nueva time series por valor. La memoria de Prometheus explota.
- **Crear meters en hot paths**: `Counter.builder().register(registry)` dentro de un request handler crea un nuevo meter lookup cada vez. Registra una vez en el constructor.
- **No setear percentiles en timers**: sin `publishPercentiles`, solo obtienes count y total time. P95 y P99 son las métricas de latencia más útiles.
- **Mezclar unidades**: algunas métricas en segundos, otras en milisegundos. Usa `Timer` (nanosegundos) o `Duration` consistentemente.
- **No exponer el endpoint**: olvidar `management.endpoints.web.exposure.include: prometheus` significa que Prometheus no puede scrapear.

## FAQ

### ¿Cómo scrapeo métricas con Prometheus?

Agrega una config de scrape en `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "user-service"
    metrics_path: "/actuator/prometheus"
    static_configs:
      - targets: ["localhost:8080"]
```

### ¿Cuál es la diferencia entre un Counter y un Gauge?

Un Counter solo aumenta (o resetea al reiniciar) — úsalo para eventos totales. Un Gauge puede subir o bajar — úsalo para estado actual (queue depth, conexiones activas, uso de memoria).

### ¿Cómo reseteo métricas entre tests?

Llama `registry.clear()` en `@BeforeEach` o usa `SimpleMeterRegistry` para unit tests.

### ¿Puedo usar Micrometer con aplicaciones non-Spring?

Sí. Usa `PrometheusMeterRegistry` directamente y arranca un `HTTPServer` para exponer el endpoint. La API es la misma.

### ¿Cómo trackeo error rate como métrica?

Usa dos counters — `requests_total` y `requests_failed` — y computa el ratio en Grafana con PromQL:

```promql
rate(requests_failed_total[5m]) / rate(requests_total[5m])
```
