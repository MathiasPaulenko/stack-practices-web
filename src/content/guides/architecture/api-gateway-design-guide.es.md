---
contentType: guides
slug: api-gateway-design-guide
title: "Diseño de API Gateway: Resiliencia, Enrutamiento y Seguridad"
description: "Guía práctica para diseñar API gateways: patrones de enrutamiento, rate limiting, autenticación, circuit breakers y observabilidad para APIs resilientes."
metaDescription: "Aprende a diseñar API gateways resilientes con enrutamiento, rate limiting, autenticación, circuit breakers y observabilidad. Guía completa para equipos de ingeniería."
difficulty: advanced
topics:
  - architecture
  - api
tags:
  - api-gateway
  - architecture
  - routing
  - rate-limiting
  - security
  - resilience
  - observability
  - microservices
  - guide
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/monolith-to-microservices-migration-guide
  - /guides/api-security-checklist-guide
  - /guides/rest-api-design-guide
  - /docs/microservice-contract-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Aprende a diseñar API gateways resilientes con enrutamiento, rate limiting, autenticación, circuit breakers y observabilidad. Guía completa para equipos de ingeniería."
  keywords:
    - api gateway
    - arquitectura
    - enrutamiento
    - rate limiting
    - seguridad
    - resiliencia
    - observabilidad
    - microservicios
    - guia
---
## Visión General

Toda arquitectura de microservicios eventualmente necesita una puerta de entrada. El API gateway es esa puerta — y si lo diseñas mal, se convierte en un punto único de fallo, un cuello de botella de rendimiento o una brecha de seguridad. Un gateway bien diseñado maneja enrutamiento, rate limiting, autenticación, circuit breakers y observabilidad para que los servicios individuales se enfoquen en la lógica de negocio. Esta guía cubre los patrones principales, trade-offs y estrategias de implementación para construir API gateways resilientes.

## Cuándo Usar

Usa esta guía cuando:
- Estás migrando de un monolito a microservicios y necesitas un punto de entrada unificado
- Tus aplicaciones cliente se comunican directamente con servicios backend y necesitas consolidar preocupaciones transversales
- Estás experimentando fallos en cascada, inconsistencias de autenticación o puntos ciegos de observabilidad entre servicios

## Solución

### Responsabilidades Principales del Gateway

| Preocupación | Enfoque de Implementación | Tecnología Clave |
|--------------|--------------------------|------------------|
| **Enrutamiento de Requests** | Enrutamiento basado en path, header o host hacia servicios upstream | Nginx, Kong, Envoy, AWS API Gateway |
| **Rate Limiting** | Token bucket o leaky bucket por cliente, IP o API key | Redis + Lua, Envoy, Kong |
| **Autenticación** | Validar JWT, API keys o tokens OAuth2 en el edge | Keycloak, Auth0, middleware personalizado |
| **Circuit Breaker** | Rastrear tasas de fallo y fallar rápido cuando los upstreams no están saludables | Resilience4j, Envoy, Hystrix (legacy) |
| **Balanceo de Carga** | Round-robin, least connections o consistent hashing | Envoy, Nginx, service mesh |
| **Observabilidad** | Trazabilidad distribuida, métricas y logs de acceso | OpenTelemetry, Prometheus, ELK |
| **Terminación SSL** | Descargar TLS en el gateway para reducir carga CPU en servicios | Nginx, HAProxy, balanceadores cloud |
| **Transformación de Request/Response** | Inyección de headers, reescritura de payloads, traducción de protocolo | Plugins de Kong, filtros de Envoy |

### Ejemplo de Arquitectura de Enrutamiento

```yaml
# Fragmento de configuración de Envoy
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/api/users" }
                          route: { cluster: user_service, prefix_rewrite: "/" }
                        - match: { prefix: "/api/orders" }
                          route: { cluster: order_service, prefix_rewrite: "/" }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
    - name: user_service
      connect_timeout: 0.25s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: user_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: user-service, port_value: 8080 }
    - name: order_service
      connect_timeout: 0.25s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: order_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: order-service, port_value: 8080 }
```

### Implementación de Rate Limiting

```python
# Rate limiter tipo token bucket con Redis
import time
import redis

class TokenBucketRateLimiter:
    def __init__(self, redis_client, key_prefix, capacity, refill_rate):
        self.redis = redis_client
        self.key_prefix = key_prefix
        self.capacity = capacity
        self.refill_rate = refill_rate

    def is_allowed(self, client_id):
        key = f"{self.key_prefix}:{client_id}"
        pipeline = self.redis.pipeline()
        now = time.time()
        pipeline.hmget(key, ["tokens", "last_refill"])
        result = pipeline.execute()
        tokens = float(result[0][0] or self.capacity)
        last_refill = float(result[0][1] or now)

        elapsed = now - last_refill
        tokens = min(self.capacity, tokens + elapsed * self.refill_rate)

        if tokens >= 1:
            tokens -= 1
            self.redis.hmset(key, {"tokens": tokens, "last_refill": now})
            self.redis.expire(key, 60)
            return True
        else:
            self.redis.hmset(key, {"tokens": tokens, "last_refill": last_refill})
            return False
```

### Patrón Circuit Breaker

```java
// Configuración de circuit breaker con Resilience4j
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)
    .slowCallRateThreshold(80)
    .slowCallDurationThreshold(Duration.ofSeconds(2))
    .permittedNumberOfCallsInHalfOpenState(10)
    .slidingWindowSize(100)
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .build();

CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(config);
CircuitBreaker userServiceCB = registry.circuitBreaker("userService");

Supplier<String> decorated = CircuitBreaker
    .decorateSupplier(userServiceCB, () -> userClient.getUser(userId));
```

## Explicación

El API gateway es un **proxy inverso con inteligencia**. Se sitúa entre clientes y servicios backend, centralizando preocupaciones transversales que de otro modo se duplicarían en cada servicio. La idea clave es que no toda preocupación pertenece al gateway: la lógica de negocio debe permanecer en los servicios, pero la autenticación, rate limiting y enrutamiento son responsabilidades del gateway.

Las decisiones de enrutamiento deben ser **stateless y determinísticas** para que cualquier instancia del gateway pueda manejar cualquier request. La afinidad de sesión (sticky sessions) debe evitarse; si la necesitas, prefiere consistent hashing sobre sticky basado en IP. El rate limiting debe ser **distribuido** en un despliegue multi-instancia; los contadores en memoria locales son insuficientes porque un cliente puede round-robin entre instancias y evadir los límites.

Los circuit breakers previenen fallos en cascada. Cuando un servicio está luchando, el gateway debe fallar rápido en lugar de encolar requests que van a timeout. Esto protege tanto al servicio en dificultades como al llamador. El estado half-open permite recuperación gradual: después de un enfriamiento, se permite un número limitado de requests para probar si el servicio se ha recuperado.

## Variantes

| Tipo de Gateway | Mejor Para | Trade-off |
|-----------------|------------|-----------|
| **Nginx / OpenResty** | Alto throughput, enrutamiento simple | Scripting Lua para lógica personalizada; plataforma de plugins limitada |
| **Kong** | Rico en plugins, capacidades enterprise | Mayor latencia que Nginx; opción administrada disponible |
| **Envoy** | Cloud-native, integración con service mesh | Curva de aprendizaje pronunciada; verbosidad de configuración YAML |
| **AWS API Gateway** | Serverless, ecosistema AWS | Vendor lock-in; latencia de cold start para v2 |
| **Spring Cloud Gateway** | Ecosistemas Java/Spring | Huella de memoria JVM; acoplamiento fuerte con Spring |
| **Traefik** | Descubrimiento dinámico Docker/K8s | Más simple que Envoy; menos gestión avanzada de tráfico |

## Lo que funciona

1. Mantén el gateway **stateless**; almacena datos de sesión en Redis o tokens del lado del cliente
2. Usa **I/O asíncrono** en el gateway para evitar agotamiento de thread pools bajo carga
3. Implementa **health checks** para cada upstream y elimina instancias no saludables rápidamente
4. Registra **request IDs** y propágalos vía headers para trazabilidad distribuida
5. Cachea **resultados de autenticación** en el gateway para evitar validar el mismo token en cada request

## Errores Comunes

1. Poner **lógica de negocio** en el gateway; se convierte en un monolito distribuido
2. Usar el gateway como **pool de conexiones a base de datos compartido**; los servicios deben manejar sus propias conexiones
3. Implementar **rate limiting por instancia** en lugar de distribuido; los clientes evaden límites alcanzando diferentes instancias
4. No configurar **timeouts** en llamadas upstream; un servicio lento puede agotar los threads del gateway
5. Ignorar la **salud del gateway** en monitoreo; el gateway es infraestructura, no plomería invisible

## Preguntas Frecuentes

### ¿Debo usar un gateway o múltiples?

Un gateway es más simple pero se convierte en cuello de botella y punto único de fallo. La mayoría de organizaciones eventualmente dividen por preocupación: un gateway público para clientes externos, un gateway interno para comunicación servicio-a-servicio, y posiblemente un gateway B2B para APIs de socios. La regla general: divide cuando tu configuración de gateway excede 1,000 líneas o cuando diferentes clientes necesitan esquemas de autenticación fundamentalmente diferentes.

### ¿Cómo manejo conexiones WebSocket a través de un gateway?

Los WebSockets requieren **enrutamiento consciente de conexión**. El gateway debe mantener la conexión TCP y enrutar frames subsecuentes a la misma instancia upstream. No todos los gateways soportan esto nativamente. Envoy y Nginx sí; AWS API Gateway v2 soporta WebSockets con Lambda o integraciones HTTP. Para cargas WebSocket de alta escala, considera un gateway WebSocket dedicado separado de tu gateway HTTP API.

### ¿Cuál es el impacto en rendimiento de agregar un gateway?

Un gateway bien afinado agrega **0.5–2ms de latencia** por hop para enrutamiento simple. La terminación SSL puede mejorar la latencia total porque los servicios ya no hacen handshakes TLS. El mayor riesgo es mala configuración: enrutamiento con regex excesivamente complejo, I/O bloqueante síncrona, o transformación excesiva de request/response. Haz benchmark de tu gateway independientemente usando herramientas como k6 o vegeta antes de desplegar a producción.
