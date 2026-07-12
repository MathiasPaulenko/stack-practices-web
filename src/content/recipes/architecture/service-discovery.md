---


contentType: recipes
slug: service-discovery
title: "Service Discovery"
description: "Implement service discovery with health checks, DNS-based resolution, and service registries for live microservices environments."
metaDescription: "Service discovery patterns: Consul, etcd, Eureka, DNS-based resolution, health checks, and dynamic service registration for microservices."
difficulty: intermediate
topics:
  - architecture
tags:
  - service-discovery
  - architecture
  - microservices
  - design
  - patterns
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/monolith-to-microservices-migration-guide
  - /guides/software-architecture-guide
  - /recipes/microservices-communication
  - /docs/adr-template
  - /recipes/api-gateway
  - /recipes/circuit-breaker-pattern-recipe
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

Service discovery is the mechanism by which [microservices](/guides/architecture/microservices-architecture-guide) locate and communicate with each other in live environments where IP addresses change constantly. Instead of hard-coding endpoints, services register themselves in a registry and clients query it to find healthy instances. Combined with [health checks](/recipes/devops/health-check-endpoint), it enables self-healing systems that route around failures automatically.

## When to Use

Use this resource when:
- Running microservices on Kubernetes, ECS, or auto-scaling groups where IPs are ephemeral
- You need automatic failover when service instances crash or become unhealthy
- Load balancing across multiple instances without manual configuration updates
- Implementing [blue-green deployments](/recipes/devops/blue-green-deployment) or canary releases that require live traffic routing

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

| Tool | Model | Language | Notable capabilities |
|------|-------|----------|------------------|
| Consul | Client + server | Any | Multi-datacenter; KV store; ACLs |
| Eureka | Client-side | Java | Netflix OSS; Spring integration |
| etcd | Server-side | Any | Kubernetes default; Raft consensus |
| Zookeeper | Server-side | Any | Mature; strong consistency |
| AWS Cloud Map | Server-side | Any | AWS-native; ECS integration |

## What Works

- **Heartbeat with TTL**: Services must renew registration or be auto-deregistered
- **Cache with fallback**: Clients should cache instance lists and use stale data briefly if registry is unreachable
- **Zone-aware routing**: Prefer instances in the same AZ to reduce latency and data transfer costs
- **Metadata for routing**: Tag instances with versions to enable canary and A/B testing
- **Secure with mTLS**: Encrypt service-to-service communication; authenticate registered services. See [API security checklist](/guides/security/api-security-checklist-guide).

## Common Mistakes

1. **No health checks**: Unregistered dead instances still receive traffic
2. **Thundering herd**: All clients querying the registry simultaneously under load
3. **Ignoring deregistration**: Crashed services remain in the pool until TTL expires
4. **Hard-coding fallback IPs**: Defeats the purpose of live discovery
5. **Skipping retries**: One failed instance should trigger a retry on another, not fail the request. Use [retry with exponential backoff](/recipes/architecture/retry-backoff) for resilient clients.

## Frequently Asked Questions

**Q: Should I use client-side or server-side discovery?**
A: Client-side is faster (no extra hop) but requires smart clients. Server-side is simpler but adds latency. DNS-based is the simplest for Kubernetes.

**Q: How does service discovery work with serverless?**
A: AWS Cloud Map, GCP Service Directory, or API Gateway service registries integrate with Lambda and Cloud Run. Learn more in [serverless architecture](/guides/architecture/event-driven-architecture-guide).

**Q: What's the difference between service discovery and load balancing?**
A: Discovery finds available instances; [load balancing](/recipes/architecture/load-balancing) distributes traffic among them. They often work together.

### Client-Side Discovery with Consul (Python)

```python
import consul
import random
import requests
from typing import List

class ConsulServiceDiscovery:
    def __init__(self, consul_host: str = 'localhost', consul_port: int = 8500):
        self.client = consul.Consul(host=consul_host, port=consul_port)

    def get_instances(self, service_name: str) -> List[dict]:
        _, services = self.client.catalog.service(service_name)
        healthy = []
        for service in services:
            # Check health
            _, checks = self.client.health.checks(service_name)
            passing = [c for c in checks if c['Status'] == 'passing']
            if passing:
                healthy.append({
                    'id': service['ServiceID'],
                    'address': service['ServiceAddress'] or service['Address'],
                    'port': service['ServicePort'],
                })
        return healthy

    def get_instance(self, service_name: str) -> dict:
        instances = self.get_instances(service_name)
        if not instances:
            raise RuntimeError(f'No healthy instances for {service_name}')
        # Random load balancing
        return random.choice(instances)

    def call_service(self, service_name: str, path: str, method: str = 'GET') -> dict:
        instance = self.get_instance(service_name)
        url = f'http://{instance["address"]}:{instance["port"]}{path}'
        response = requests.request(method, url, timeout=5)
        response.raise_for_status()
        return response.json()

# Usage
discovery = ConsulServiceDiscovery(consul_host='consul-server')
result = discovery.call_service('payment-service', '/payments/123')
```

### Service Mesh with Istio (Kubernetes)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
            subset: v1
            weight: 90
        - destination:
            host: payment-service
            subset: v2
            weight: 10
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure
      timeout: 5s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

### Health Check Endpoint with Liveness and Readiness (Go)

```go
package main

import (
    "net/http"
    "sync/atomic"
    "time"
)

type HealthChecker struct {
    ready    atomic.Bool
    lastCheck atomic.Int64
}

func (h *HealthChecker) LivenessHandler(w http.ResponseWriter, r *http.Request) {
    // Liveness: is the process alive?
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"alive"}`))
}

func (h *HealthChecker) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
    // Readiness: can we handle requests?
    last := h.lastCheck.Load()
    if time.Now().UnixMilli()-last > 10000 {
        // No recent health check — not ready
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte(`{"status":"not ready"}`))
        return
    }
    if !h.ready.Load() {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte(`{"status":"starting"}`))
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ready"}`))
}

func (h *HealthChecker) StartHealthCheckLoop() {
    ticker := time.NewTicker(5 * time.Second)
    go func() {
        for range ticker.C {
            ok := checkDatabaseConnection()
            h.ready.Store(ok)
            h.lastCheck.Store(time.Now().UnixMilli())
        }
    }()
}
```

## Additional Best Practices

1. **Use graceful deregistration on shutdown.** When a service instance stops, deregister from the registry before exiting so clients stop sending traffic:

```python
import signal
import sys

class GracefulShutdown:
    def __init__(self, discovery: ConsulServiceDiscovery, service_id: str):
        self.discovery = discovery
        self.service_id = service_id

    def register_handlers(self):
        signal.signal(signal.SIGTERM, self._shutdown)
        signal.signal(signal.SIGINT, self._shutdown)

    def _shutdown(self, signum, frame):
        # Deregister from service registry
        self.discovery.client.agent.service.deregister(self.service_id)
        # Wait for in-flight requests to complete
        time.sleep(5)
        sys.exit(0)
```

2. **Cache registry responses with TTL.** Avoid querying the registry on every call — cache instance lists for a short period and refresh on cache expiry or connection failure:

```typescript
class CachedServiceLocator {
  private cache: Map<string, { instances: string[]; expiresAt: number }> = new Map();
  private ttlMs: number = 10000; // 10 seconds

  async getInstances(serviceName: string): Promise<string[]> {
    const cached = this.cache.get(serviceName);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.instances;
    }
    const instances = await this.queryRegistry(serviceName);
    this.cache.set(serviceName, {
      instances,
      expiresAt: Date.now() + this.ttlMs,
    });
    return instances;
  }

  async refreshOnFailure(serviceName: string): Promise<string[]> {
    this.cache.delete(serviceName);
    return this.getInstances(serviceName);
  }
}
```

3. **Tag instances with metadata for smart routing.** Register instances with version, zone, and weight metadata to enable canary deployments and zone-aware routing:

```go
registration := &api.AgentServiceRegistration{
    ID:      serviceID,
    Name:    "payment-service",
    Address: host,
    Port:    port,
    Tags:    []string{"v2", "us-east-1a", "canary"},
    Meta: map[string]string{
        "version": "v2",
        "zone":    "us-east-1a",
        "weight":  "10",
    },
}
```

## Additional Common Mistakes

1. **Registry as single point of failure.** If the registry goes down, all service discovery fails. Run registries in clusters (Consul: 3-5 nodes, Eureka: peer-to-peer) and cache instance lists client-side.

2. **No connection pooling with discovered endpoints.** Creating a new HTTP connection per request to a discovered instance is expensive. Pool connections per instance and recycle them:

```python
import requests
from requests.adapters import HTTPAdapter

class PooledServiceClient:
    def __init__(self):
        self.sessions: dict[str, requests.Session] = {}

    def get_session(self, instance_url: str) -> requests.Session:
        if instance_url not in self.sessions:
            session = requests.Session()
            adapter = HTTPAdapter(pool_connections=10, pool_maxsize=100)
            session.mount('http://', adapter)
            self.sessions[instance_url] = session
        return self.sessions[instance_url]
```

3. **Ignoring startup race conditions.** A service that registers before it's ready to accept traffic will receive requests it can't handle. Register only after passing startup checks, and use readiness probes in Kubernetes to gate traffic.

## Additional FAQ

### How do I handle service discovery across multiple datacenters?

Consul supports multi-datacenter federation out of the box — services in DC1 can discover services in DC2 via WAN gossip. For Kubernetes, use a global load balancer (Envoy, Gloo) that routes across clusters. For cloud-native setups, AWS Cloud Map supports cross-region discovery with VPC peering.

### Is this solution production-ready?

Yes. Consul service registration with health checks is used in production by HashiCorp customers. The Istio VirtualService with canary routing and outlier detection is standard in service mesh deployments. The client-side discovery pattern with caching is how Netflix Eureka clients work. The Go health check endpoint with liveness and readiness separation follows Kubernetes best practices.

### What are the performance characteristics?

Consul queries add 1-5ms for local agent lookups; cached responses are sub-millisecond. DNS-based discovery in Kubernetes adds 1-2ms per resolution (cached by kube-dns). Eureka client-side discovery with caching adds <1ms per call. Istio sidecar proxies add 1-3ms per hop. Health check polling at 10s intervals has negligible CPU overhead. Registry cluster consensus (Raft) adds latency only on writes (registration/deregistration), not reads.

### How do I debug issues with this approach?

Use `consul members` to verify cluster health, `consul catalog services` to list registered services, and `consul health checks <service>` to see health status. For Kubernetes, use `kubectl get endpoints <service>` to verify discovered instances. For Istio, use `istioctl analyze` to detect configuration issues. Log instance selection (address, port, source) on each call. Monitor registry query latency and cache hit rate. Set up alerts on unhealthy instances, deregistration events, and registry cluster size.
