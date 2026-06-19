---
contentType: recipes
slug: service-discovery
title: "Service Discovery"
description: "Implementa service discovery con health checks, resolución DNS-based y service registries para ambientes dinámicos de microservicios."
metaDescription: "Service discovery: Consul, etcd, Eureka, resolución DNS-based, health checks y registro dinámico de servicios para microservicios."
difficulty: intermediate
topics:
  - architecture
tags:
  - service-discovery
  - architecture
  - microservices
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/monolith-to-microservices-migration-guide
  - /guides/software-architecture-guide
  - /recipes/microservices-communication
  - /docs/adr-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Service discovery: Consul, etcd, Eureka, resolución DNS-based, health checks y registro dinámico de servicios para microservicios."
  keywords:
    - service-discovery
    - architecture
    - microservices
    - consul
---
## Visión General

El service discovery es el mecanismo por el cual los [microservicios](/guides/microservices-architecture-guide) se localizan y comunican entre sí en ambientes dinámicos donde las direcciones IP cambian constantemente. En lugar de hardcodear endpoints, los servicios se registran en un registro y los clientes lo consultan para encontrar instancias saludables. Combinado con [health checks](/recipes/health-check-endpoint), habilita sistemas auto-curativos que rutean alrededor de fallas automáticamente.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutas microservicios en Kubernetes, ECS o auto-scaling groups donde las IPs son efímeras
- Necesitas failover automático cuando instancias de servicio fallan o se vuelven unhealthy
- Balanceas carga entre múltiples instancias sin actualizaciones manuales de configuración
- Implementas [despliegues blue-green](/recipes/blue-green-deployment) o canary releases que requieren routing dinámico de tráfico

## Solución

### Registro de Servicio con Consul (Go)

```go
import "github.com/hashicorp/consul/api"

func registerService(consulAddr, serviceID, name, host string, port int) error {
    config := api.DefaultConfig()
    config.Address = consulAddr
    client, err := api.NewClient(config)
    if err != nil {
        return err
    }

    registration := &api.AgentServiceRegistration{
        ID:      serviceID,
        Name:    name,
        Address: host,
        Port:    port,
        Check: &api.AgentServiceCheck{
            HTTP:     fmt.Sprintf("http://%s:%d/health", host, port),
            Interval: "10s",
            Timeout:  "5s",
        },
    }

    return client.Agent().ServiceRegister(registration)
}
```

### DNS-Based Discovery (Kubernetes)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment
  ports:
    - port: 8080
      targetPort: 8080
```

```bash
# Los servicios se descubren vía DNS
PAYMENT_URL=http://payment-service:8080
```

### Client-Side Load Balancing con Eureka (Java/Spring)

```java
@SpringBootApplication
@EnableDiscoveryClient
public class OrderService {
    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}

@Service
public class OrderProcessor {
    @Autowired
    private WebClient.Builder webClientBuilder;

    public Mono<PaymentResult> processPayment(PaymentRequest request) {
        return webClientBuilder.build()
            .post()
            .uri("lb://payment-service/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResult.class);
    }
}
```

## Explicación

**Tres patrones de discovery**:

| Patrón | Mecanismo | Ideal Para |
|--------|-----------|------------|
| Client-side | Cliente consulta registry; elige instancia | Alto performance; language-native |
| Server-side | Load balancer consulta registry; cliente usa una URL | Clientes más simples; control central |
| DNS-based | Nombres de servicio resuelven a IPs vía DNS | Kubernetes; zero cambios en clientes |

**Integración de health checks**:
- Los servicios se registran con un endpoint de health
- El registry hace polling de health checks periódicamente
- Las instancias unhealthy se remueven del pool
- Los clientes cachean datos del registry y refrescan ante fallas

## Variantes

| Herramienta | Modelo | Lenguaje | Características Destacadas |
|-------------|--------|----------|----------------------------|
| Consul | Client + server | Cualquiera | Multi-datacenter; KV store; ACLs |
| Eureka | Client-side | Java | Netflix OSS; integración Spring |
| etcd | Server-side | Cualquiera | Default de Kubernetes; consenso Raft |
| Zookeeper | Server-side | Cualquiera | Maduro; consistencia fuerte |
| AWS Cloud Map | Server-side | Cualquiera | AWS-native; integración ECS |

## Mejores Prácticas

- **Heartbeat con TTL**: Los servicios deben renovar su registro o ser auto-deregistrados
- **Cache con fallback**: Los clientes deben cachear listas de instancias y usar datos stale brevemente si el registry no está disponible
- **Routing zone-aware**: Preferir instancias en la misma AZ para reducir latencia y costos de transferencia de datos
- **Metadata para routing**: Etiquetar instancias con versiones para habilitar canary y A/B testing
- **Seguridad con mTLS**: Encriptar comunicación service-to-service; autenticar servicios registrados. Consulta [API security checklist](/guides/api-security-checklist).

## Errores Comunes

1. **Sin health checks**: Instancias muertas no deregistradas siguen recibiendo tráfico
2. **Thundering herd**: Todos los clientes consultando el registry simultáneamente bajo carga
3. **Ignorar deregistration**: Servicios crashados permanecen en el pool hasta que expire el TTL
4. **Hard-codear fallback IPs**: Anula el propósito del discovery dinámico
5. **Omitir retries**: Una instancia fallida debería disparar un retry en otra, no fallar el request. Usa [retry con backoff exponencial](/recipes/retry-backoff) para clientes resilientes.

## Preguntas Frecuentes

**P: ¿Debo usar client-side o server-side discovery?**
R: Client-side es más rápido (sin hop extra) pero requiere clientes inteligentes. Server-side es más simple pero agrega latencia. DNS-based es el más simple para Kubernetes.

**P: ¿Cómo funciona el service discovery con serverless?**
R: AWS Cloud Map, GCP Service Directory o service registries de API Gateway se integran con Lambda y Cloud Run. Aprende más en [arquitectura serverless](/guides/serverless-architecture-guide).

**P: ¿Cuál es la diferencia entre service discovery y load balancing?**
R: El discovery encuentra instancias disponibles; [load balancing](/recipes/load-balancing) distribuye tráfico entre ellas. A menudo trabajan juntas.
