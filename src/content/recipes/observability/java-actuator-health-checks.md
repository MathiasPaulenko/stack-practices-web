---
contentType: recipes
slug: java-actuator-health-checks
title: "Custom Health Checks with Spring Boot Actuator"
description: "How to implement custom health indicators with Spring Boot Actuator, including database, Redis, external API checks, and Kubernetes readiness probes."
metaDescription: "Implement custom health indicators with Spring Boot Actuator. Check database, Redis, external APIs, and configure Kubernetes liveness and readiness probes."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - java
  - spring-boot
  - actuator
  - health-check
  - kubernetes
  - recipe
relatedResources:
  - /recipes/observability/java-micrometer-prometheus
  - /recipes/observability/python-prometheus-custom-metrics
  - /recipes/observability/python-structured-logging-json
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement custom health indicators with Spring Boot Actuator. Check database, Redis, external APIs, and configure Kubernetes liveness and readiness probes."
  keywords:
    - observability
    - java
    - spring-boot
    - actuator
    - health-check
    - kubernetes
    - recipe
---

## Overview

Spring Boot Actuator provides a `/actuator/health` endpoint that reports the application's health status. By default, it checks built-in indicators (database, disk space, ping). You can add custom `HealthIndicator` beans to check anything — external API availability, cache connectivity, queue depth, or feature flags. Kubernetes reads these endpoints to decide whether to route traffic to your pod.

## When to Use

- Kubernetes liveness and readiness probes — tell the orchestrator when to restart or route traffic
- Monitoring external dependencies (payment gateway, SMS provider, third-party API)
- Checking resource availability (cache, message queue, file storage)
- Building a status page that aggregates multiple service health checks
- Detecting degraded states before they become full outages

## When NOT to Use

- Simple scripts or CLI tools — health checks are for long-running services
- Applications without an orchestrator — if nothing reads the endpoint, the check is wasted CPU
- Replacing metrics — health checks are binary (UP/DOWN), use Micrometer for gradual degradation

## Solution

### Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### Enable health endpoint

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: always
      show-components: always
```

Access at `http://localhost:8080/actuator/health`.

### Basic custom health indicator

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentGatewayClient client;

    public PaymentGatewayHealthIndicator(PaymentGatewayClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            PaymentGatewayStatus status = client.ping();
            if (status.isAvailable()) {
                return Health.up()
                    .withDetail("provider", "stripe")
                    .withDetail("latency_ms", status.getLatencyMs())
                    .withDetail("version", status.getVersion())
                    .build();
            } else {
                return Health.down()
                    .withDetail("reason", "Gateway returned unavailable")
                    .withDetail("status_code", status.getStatusCode())
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### Database health indicator with custom query

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseHealthIndicator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Health health() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            int activeConnections = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'",
                Integer.class
            );

            return Health.up()
                .withDetail("database", "postgresql")
                .withDetail("active_connections", activeConnections)
                .withDetail("max_connections", 100)
                .build();
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("database", "postgresql")
                .withDetail("error", "Connection failed")
                .build();
        }
    }
}
```

### Redis health indicator

```java
@Component
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisTemplate<String, String> redisTemplate;

    public RedisHealthIndicator(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Health health() {
        try {
            String pong = redisTemplate.getConnectionFactory().getConnection().ping();
            long latency = measureLatency();

            return Health.up()
                .withDetail("redis", "connected")
                .withDetail("ping", pong)
                .withDetail("latency_ms", latency)
                .build();
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("redis", "disconnected")
                .build();
        }
    }

    private long measureLatency() {
        long start = System.currentTimeMillis();
        redisTemplate.opsForValue().get("health-check-key");
        return System.currentTimeMillis() - start;
    }
}
```

### External API health indicator with timeout

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    private final HttpClient httpClient;

    public ExternalApiHealthIndicator() {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    }

    @Override
    public Health health() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.example.com/health"))
                .timeout(Duration.ofSeconds(3))
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 200) {
                return Health.up()
                    .withDetail("url", "https://api.example.com/health")
                    .withDetail("status_code", response.statusCode())
                    .build();
            } else {
                return Health.down()
                    .withDetail("url", "https://api.example.com/health")
                    .withDetail("status_code", response.statusCode())
                    .withDetail("reason", "Non-200 response")
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("url", "https://api.example.com/health")
                .withDetail("error", "Connection timeout or failure")
                .build();
            }
    }
}
```

### Queue depth health indicator

```java
@Component
public class QueueDepthHealthIndicator implements HealthIndicator {

    private final MessageQueueService queueService;

    public QueueDepthHealthIndicator(MessageQueueService queueService) {
        this.queueService = queueService;
    }

    @Override
    public Health health() {
        int depth = queueService.getQueueDepth("order-processing");
        int threshold = 1000;

        Map<String, Object> details = new HashMap<>();
        details.put("queue", "order-processing");
        details.put("depth", depth);
        details.put("threshold", threshold);

        if (depth < threshold * 0.8) {
            return Health.up().withDetails(details).build();
        } else if (depth < threshold) {
            return Health.up().withDetails(details)
                .withDetail("warning", "Queue depth approaching threshold").build();
        } else {
            return Health.down().withDetails(details)
                .withDetail("error", "Queue depth exceeded threshold").build();
        }
    }
}
```

### Custom health groups

```java
@Component
@HealthGroup("infrastructure")
public class DatabaseHealthIndicator implements HealthIndicator {
    // ...
}

@Component
@HealthGroup("infrastructure")
public class RedisHealthIndicator implements HealthIndicator {
    // ...
}

@Component
@HealthGroup("external")
public class PaymentGatewayHealthIndicator implements HealthIndicator {
    // ...
}
```

```yaml
management:
  endpoint:
    health:
      group:
        infrastructure:
          include: databaseHealthIndicator,redisHealthIndicator
        external:
          include: paymentGatewayHealthIndicator,externalApiHealthIndicator
```

Access at `/actuator/health/infrastructure` and `/actuator/health/external`.

### Kubernetes liveness and readiness probes

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
      liveness-state:
        enabled: true
      readiness-state:
        enabled: true
```

```yaml
# kubernetes deployment
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

### Using `ApplicationAvailability`

```java
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.AvailabilityChangeEvent;
import org.springframework.boot.availability.LivenessState;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.context.event.EventListener;

@Service
public class AvailabilityService {

    private final ApplicationAvailability availability;

    public AvailabilityService(ApplicationAvailability availability) {
        this.availability = availability;
    }

    @EventListener
    public void onLivenessChange(AvailabilityChangeEvent<LivenessState> event) {
        System.out.println("Liveness state changed to: " + event.getState());
    }

    @EventListener
    public void onReadinessChange(AvailabilityChangeEvent<ReadinessState> event) {
        System.out.println("Readiness state changed to: " + event.getState());
    }

    public void markUnready() {
        AvailabilityChangeEvent.publish(
            applicationContext, ReadinessState.REFUSING_TRAFFIC
        );
    }
}
```

## Variants

### Using `@HealthIndicator` with reactive Spring WebFlux

```java
import reactor.core.publisher.Mono;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.ReactiveHealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class ReactiveApiHealthIndicator implements ReactiveHealthIndicator {

    @Override
    public Mono<Health> health() {
        return checkExternalApi()
            .map(status -> Health.up().withDetail("status", status).build())
            .onErrorResume(e -> Mono.just(
                Health.down(e).withDetail("error", e.getMessage()).build()
            ));
    }

    private Mono<String> checkExternalApi() {
        return WebClient.create("https://api.example.com")
            .get().uri("/health")
            .retrieve().bodyToMono(String.class);
    }
}
```

### Disabling specific built-in indicators

```yaml
management:
  health:
    db:
      enabled: false
    redis:
      enabled: false
    disk:
      enabled: false
```

## Best Practices

- Set timeouts on external checks — a hanging health check blocks the endpoint and causes Kubernetes to kill the pod
- Use health groups to separate infrastructure checks from external API checks
- Return `DOWN` only when the service can't function — degraded performance should be a warning, not DOWN
- Include useful details (latency, connection count, queue depth) — operators need context to diagnose
- Enable Kubernetes probes separately from the general health endpoint — liveness should be cheap
- Cache health check results for a few seconds — calling external APIs on every probe request is wasteful
- Use `show-details: when_authorized` in production — full details leak infrastructure info to unauthenticated users

## Common Mistakes

- **No timeout on external checks**: a slow external API causes the health endpoint to hang, Kubernetes times out and kills the pod.
- **Returning DOWN for non-critical dependencies**: if an analytics service is down but the core app works, return UP with a warning detail.
- **Checking too many things in one indicator**: each indicator should check one dependency. Use health groups to organize.
- **Not caching results**: Kubernetes calls the probe every 5-10 seconds. External API checks should be cached for 5-10 seconds.
- **Exposing full details publicly**: `show-details: always` leaks database URLs, connection counts, and internal architecture. Use `when_authorized`.

## FAQ

### What is the difference between liveness and readiness probes?

Liveness tells Kubernetes whether to restart the pod. Readiness tells Kubernetes whether to route traffic to the pod. A pod can be live (running) but not ready (can't handle requests yet, e.g., warming up cache).

### How do I disable all health checks except ping?

```yaml
management:
  health:
    defaults:
      enabled: false
    ping:
      enabled: true
```

### Can I return a custom HTTP status code?

Yes. Configure status mapping:

```yaml
management:
  endpoint:
    health:
      status:
        http-mapping:
          down: 503
          out-of-service: 503
          warning: 200
```

### How do I add a custom status level?

```java
@HealthIndicator
public class CustomStatusIndicator implements HealthIndicator {
    @Override
    public Health health() {
        if (isDegraded()) {
            return Health.status(new Status("DEGRADED", "Performance is degraded")).build();
        }
        return Health.up().build();
    }
}
```

### Should I check the database in liveness or readiness?

Readiness. If the database is temporarily unavailable, the pod shouldn't restart — it should just stop receiving traffic. Liveness should only fail if the application itself is stuck (deadlock, infinite loop).
