---
contentType: recipes
slug: service-discovery
title: "Service Discovery"
description: "Implement service discovery with health checks, DNS-based resolution, and service registries for dynamic microservices environments."
metaDescription: "Service discovery patterns: Consul, etcd, Eureka, DNS-based resolution, health checks, and dynamic service registration for microservices."
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
  metaDescription: "Service discovery patterns: Consul, etcd, Eureka, DNS-based resolution, health checks, and dynamic service registration for microservices."
  keywords:
    - service-discovery
    - architecture
    - microservices
    - consul
---
## Overview

Service discovery is the mechanism by which [microservices](/guides/microservices-architecture-guide) locate and communicate with each other in dynamic environments where IP addresses change constantly. Instead of hard-coding endpoints, services register themselves in a registry and clients query it to find healthy instances. Combined with [health checks](/recipes/health-check-endpoint), it enables self-healing systems that route around failures automatically.

## When to Use

Use this resource when:
- Running microservices on Kubernetes, ECS, or auto-scaling groups where IPs are ephemeral
- You need automatic failover when service instances crash or become unhealthy
- Load balancing across multiple instances without manual configuration updates
- Implementing [blue-green deployments](/recipes/blue-green-deployment) or canary releases that require dynamic traffic routing

## Solution

### Consul Service Registration (Go)

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
# Services discover each other via DNS
PAYMENT_URL=http://payment-service:8080
```

### Client-Side Load Balancing with Eureka (Java/Spring)

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

## Explanation

**Three discovery patterns**:

| Pattern | Mechanism | Best For |
|---------|-----------|----------|
| Client-side | Client queries registry; picks instance | High performance; language-native |
| Server-side | Load balancer queries registry; client uses one URL | Simpler clients; central control |
| DNS-based | Service names resolve to IPs via DNS | Kubernetes; zero client changes |

**Health check integration**:
- Services register with a health endpoint
- Registry polls health checks periodically
- Unhealthy instances are removed from the pool
- Clients cache registry data and refresh on failure

## Variants

| Tool | Model | Language | Notable Features |
|------|-------|----------|------------------|
| Consul | Client + server | Any | Multi-datacenter; KV store; ACLs |
| Eureka | Client-side | Java | Netflix OSS; Spring integration |
| etcd | Server-side | Any | Kubernetes default; Raft consensus |
| Zookeeper | Server-side | Any | Mature; strong consistency |
| AWS Cloud Map | Server-side | Any | AWS-native; ECS integration |

## Best Practices

- **Heartbeat with TTL**: Services must renew registration or be auto-deregistered
- **Cache with fallback**: Clients should cache instance lists and use stale data briefly if registry is unreachable
- **Zone-aware routing**: Prefer instances in the same AZ to reduce latency and data transfer costs
- **Metadata for routing**: Tag instances with versions to enable canary and A/B testing
- **Secure with mTLS**: Encrypt service-to-service communication; authenticate registered services. See [API security checklist](/guides/api-security-checklist).

## Common Mistakes

1. **No health checks**: Unregistered dead instances still receive traffic
2. **Thundering herd**: All clients querying the registry simultaneously under load
3. **Ignoring deregistration**: Crashed services remain in the pool until TTL expires
4. **Hard-coding fallback IPs**: Defeats the purpose of dynamic discovery
5. **Skipping retries**: One failed instance should trigger a retry on another, not fail the request. Use [retry with exponential backoff](/recipes/retry-backoff) for resilient clients.

## Frequently Asked Questions

**Q: Should I use client-side or server-side discovery?**
A: Client-side is faster (no extra hop) but requires smart clients. Server-side is simpler but adds latency. DNS-based is the simplest for Kubernetes.

**Q: How does service discovery work with serverless?**
A: AWS Cloud Map, GCP Service Directory, or API Gateway service registries integrate with Lambda and Cloud Run. Learn more in [serverless architecture](/guides/serverless-architecture-guide).

**Q: What's the difference between service discovery and load balancing?**
A: Discovery finds available instances; [load balancing](/recipes/load-balancing) distributes traffic among them. They often work together.
