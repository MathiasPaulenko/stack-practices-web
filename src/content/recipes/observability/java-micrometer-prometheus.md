---


contentType: recipes
slug: java-micrometer-prometheus
title: "Expose Metrics with Micrometer and Prometheus"
description: "How to expose custom application metrics using Micrometer and Prometheus in Spring Boot, including counters, gauges, timers, and histograms."
metaDescription: "Expose custom application metrics in Spring Boot with Micrometer and Prometheus. Track counters, gauges, timers, and histograms for observability."
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
  - /recipes/python-prometheus-custom-metrics
  - /recipes/java-actuator-health-checks
  - /recipes/python-opentelemetry-tracing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Expose custom application metrics in Spring Boot with Micrometer and Prometheus. Track counters, gauges, timers, and histograms for observability."
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

Micrometer is a metrics facade for Spring Boot applications. It provides a vendor-neutral API for defining counters, gauges, timers, and histograms. The Prometheus exporter exposes these metrics in a text format that a Prometheus server can scrape. Together, they give you real-time insight into application performance and behavior.

## When to Use

- Tracking business metrics (orders placed, payments processed, active users)
- Measuring operation latency (database queries, API calls, cache lookups)
- Monitoring resource pools (connection pool size, queue depth, thread count)
- Setting up alerts in Prometheus/Grafana based on application metrics
- Building dashboards for SLO tracking (error rate, latency percentiles)

## When NOT to Use

- Simple scripts or CLI tools — metrics add overhead and complexity
- Logging-only observability — if you don't have a Prometheus server, metrics are useless
- High-cardinality data (per-user metrics) — Prometheus handles low-cardinality labels well, but thousands of label values cause cardinality explosions

## Solution

### Setup with Spring Boot

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

### Enable Prometheus endpoint

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

Access metrics at `http://localhost:8080/actuator/prometheus`.

### Counter — count events

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
            // ... create order ...
            ordersCreated.increment();
        } catch (Exception e) {
            ordersFailed.increment();
            throw e;
        }
    }
}
```

### Gauge — track current value

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

### Timer — measure operation duration

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
            // ... process payment ...
            return new PaymentResult("success");
        });
    }
}
```

### Timer with manual start/stop

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

### Distribution summary — track distribution of values

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

### Using `@Counted` and `@Timed` annotations

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
        // ... search logic ...
        return results;
    }
}
```

Enable annotation support:

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

### Multi-dimensional labels

```java
Counter.builder("api.requests")
    .tag("method", "GET")
    .tag("endpoint", "/api/users")
    .tag("status", "200")
    .register(registry)
    .increment();
```

### Custom metrics with `MeterBinder`

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

### Using Micrometer without Spring Boot

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

        // Start Prometheus HTTP endpoint
        new HTTPServer(9090);

        counter.increment();
    }
}
```

### Using Micrometer with Kotlin

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


- For a deeper guide, see [Custom Health Checks with Spring Boot Actuator](/recipes/java-actuator-health-checks/).

- Use tags for dimensions (method, status, endpoint) — don't create separate metric names per combination
- Keep cardinality low — avoid tagging with user IDs, request IDs, or other high-cardinality values
- Use `publishPercentiles(0.5, 0.95, 0.99)` on timers to track latency distributions
- Name metrics with dots: `orders.created`, not `orders_created` — Micrometer normalizes to the registry's convention
- Register metrics at construction time, not in hot paths — avoid creating new meters per request
- Use `@Timed` and `@Counted` for simple cases — manual timers for fine-grained control
- Set `management.metrics.tags.application` globally to identify your service in multi-service dashboards

## Common Mistakes

- **High-cardinality labels**: tagging with `user_id` or `request_id` creates a new time series per value. Prometheus memory explodes.
- **Creating meters in hot paths**: `Counter.builder().register(registry)` inside a request handler creates a new meter lookup each time. Register once in the constructor.
- **Not setting percentiles on timers**: without `publishPercentiles`, you only get count and total time. P95 and P99 are the most useful latency metrics.
- **Mixing units**: some metrics in seconds, others in milliseconds. Use `Timer` (nanoseconds) or `Duration` consistently.
- **Not exposing the endpoint**: forgetting `management.endpoints.web.exposure.include: prometheus` means Prometheus can't scrape.

## FAQ

### How do I scrape metrics with Prometheus?

Add a scrape config in `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "user-service"
    metrics_path: "/actuator/prometheus"
    static_configs:
      - targets: ["localhost:8080"]
```

### What is the difference between a Counter and a Gauge?

A Counter only increases (or resets on restart) — use it for total events. A Gauge can go up or down — use it for current state (queue depth, active connections, memory usage).

### How do I reset metrics between tests?

Call `registry.clear()` in `@BeforeEach` or use a `SimpleMeterRegistry` for unit tests.

### Can I use Micrometer with non-Spring applications?

Yes. Use `PrometheusMeterRegistry` directly and start an `HTTPServer` to expose the endpoint. The API is the same.

### How do I track error rate as a metric?

Use two counters — `requests_total` and `requests_failed` — and compute the ratio in Grafana with PromQL:

```promql
rate(requests_failed_total[5m]) / rate(requests_total[5m])
```
