---


contentType: recipes
slug: java-actuator-health-checks
title: "Health Checks Personalizados con Spring Boot Actuator"
description: "Cómo implementar health indicators personalizados con Spring Boot Actuator, incluyendo checks de base de datos, Redis, APIs externas y Kubernetes readiness probes."
metaDescription: "Implementa health indicators personalizados con Spring Boot Actuator. Verifica DB, Redis, APIs externas y configura liveness y readiness probes de Kubernetes."
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
  - /recipes/java-micrometer-prometheus
  - /recipes/python-prometheus-custom-metrics
  - /recipes/python-structured-logging-json
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa health indicators personalizados con Spring Boot Actuator. Verifica DB, Redis, APIs externas y configura liveness y readiness probes de Kubernetes."
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

Spring Boot Actuator proporciona un endpoint `/actuator/health` que reporta el estado de salud de la aplicación. Por defecto, verifica indicators built-in (base de datos, disk space, ping). Puedes agregar beans `HealthIndicator` personalizados para verificar cualquier cosa — disponibilidad de API externa, conectividad de cache, queue depth o feature flags. Kubernetes lee estos endpoints para decidir si rutear tráfico a tu pod.

## When to Use

- Kubernetes liveness y readiness probes — dile al orchestrator cuándo reiniciar o rutear tráfico
- Monitorear dependencias externas (payment gateway, SMS provider, third-party API)
- Verificar disponibilidad de recursos (cache, message queue, file storage)
- Construir una status page que agregue múltiples service health checks
- Detectar estados degradados antes de que se conviertan en outages completos

## When NOT to Use

- Scripts simples o CLI tools — los health checks son para servicios long-running
- Aplicaciones sin un orchestrator — si nada lee el endpoint, el check desperdicia CPU
- Reemplazar métricas — los health checks son binarios (UP/DOWN), usa Micrometer para degradación gradual

## Solution

### Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### Habilitar health endpoint

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

Accede en `http://localhost:8080/actuator/health`.

### Health indicator personalizado básico

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

### Health indicator de base de datos con query personalizada

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

### Health indicator de Redis

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

### Health indicator de API externa con timeout

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

### Health indicator de queue depth

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

### Health groups personalizados

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

Accede en `/actuator/health/infrastructure` y `/actuator/health/external`.

### Kubernetes liveness y readiness probes

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

### Usar `ApplicationAvailability`

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

### Usar `@HealthIndicator` con reactive Spring WebFlux

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

### Deshabilitar indicators built-in específicos

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


- For a deeper guide, see [Expose Metrics with Micrometer and Prometheus](/es/recipes/java-micrometer-prometheus/).

- Setea timeouts en checks externos — un health check colgado bloquea el endpoint y causa que Kubernetes mate el pod
- Usa health groups para separar checks de infraestructura de checks de APIs externas
- Retorna `DOWN` solo cuando el servicio no puede funcionar — performance degradada debería ser un warning, no DOWN
- Incluye detalles útiles (latency, connection count, queue depth) — los operadores necesitan context para diagnosticar
- Habilita Kubernetes probes separadamente del health endpoint general — liveness debería ser barato
- Cachea resultados de health checks por unos segundos — llamar APIs externas en cada probe request es wasteful
- Usa `show-details: when_authorized` en producción — los detalles completos filtran info de infraestructura a usuarios no autenticados

## Common Mistakes

- **Sin timeout en checks externos**: una API externa lenta causa que el health endpoint se cuelgue, Kubernetes hace timeout y mata el pod.
- **Retornar DOWN para dependencias non-critical**: si un servicio de analytics está down pero la app core funciona, retorna UP con un warning detail.
- **Verificar demasiadas cosas en un indicator**: cada indicator debería verificar una dependencia. Usa health groups para organizar.
- **No cachear resultados**: Kubernetes llama el probe cada 5-10 segundos. Los checks de APIs externas deberían cachearse por 5-10 segundos.
- **Exponer detalles completos públicamente**: `show-details: always` filtra URLs de DB, connection counts y arquitectura interna. Usa `when_authorized`.

## FAQ

### ¿Cuál es la diferencia entre liveness y readiness probes?

Liveness le dice a Kubernetes si reiniciar el pod. Readiness le dice a Kubernetes si rutear tráfico al pod. Un pod puede estar live (corriendo) pero no ready (no puede manejar requests aún, e.g., calentando cache).

### ¿Cómo deshabilito todos los health checks excepto ping?

```yaml
management:
  health:
    defaults:
      enabled: false
    ping:
      enabled: true
```

### ¿Puedo retornar un HTTP status code personalizado?

Sí. Configura el status mapping:

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

### ¿Cómo agrego un status level personalizado?

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

### ¿Debería verificar la base de datos en liveness o readiness?

Readiness. Si la DB está temporalmente no disponible, el pod no debería reiniciarse — solo debería dejar de recibir tráfico. Liveness debería solo fallar si la aplicación misma está stuck (deadlock, infinite loop).
