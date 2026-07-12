---


contentType: recipes
slug: service-discovery
title: "Service Discovery"
description: "Implementa service discovery con health checks, resolución DNS-based y service registries para ambientes en vivo de microservicios."
metaDescription: "Service discovery: Consul, etcd, Eureka, resolución DNS-based, health checks y registro dinámico de servicios para microservicios."
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
  metaDescription: "Service discovery: Consul, etcd, Eureka, resolución DNS-based, health checks y registro dinámico de servicios para microservicios."
  keywords:
    - service-discovery
    - architecture
    - microservices
    - consul


---
## Visión General

El service discovery es el mecanismo por el cual los [microservicios](/guides/architecture/microservices-architecture-guide) se localizan y comunican entre sí en ambientes en vivo donde las direcciones IP cambian constantemente. En lugar de hardcodear endpoints, los servicios se registran en un registro y los clientes lo consultan para encontrar instancias saludables. Combinado con [health checks](/recipes/devops/health-check-endpoint), habilita sistemas auto-curativos que rutean alrededor de fallas automáticamente.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutas microservicios en Kubernetes, ECS o auto-scaling groups donde las IPs son efímeras
- Necesitas failover automático cuando instancias de servicio fallan o se vuelven unhealthy
- Balanceas carga entre múltiples instancias sin actualizaciones manuales de configuración
- Implementas [despliegues blue-green](/recipes/devops/blue-green-deployment) o canary releases que requieren routing en vivo de tráfico

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

| Herramienta | Modelo | Lenguaje | Capacidades Destacadas |
|-------------|--------|----------|----------------------------|
| Consul | Client + server | Cualquiera | Multi-datacenter; KV store; ACLs |
| Eureka | Client-side | Java | Netflix OSS; integración Spring |
| etcd | Server-side | Cualquiera | Default de Kubernetes; consenso Raft |
| Zookeeper | Server-side | Cualquiera | Maduro; consistencia fuerte |
| AWS Cloud Map | Server-side | Cualquiera | AWS-native; integración ECS |

## Lo que funciona

- **Heartbeat con TTL**: Los servicios deben renovar su registro o ser auto-deregistrados
- **Cache con fallback**: Los clientes deben cachear listas de instancias y usar datos stale brevemente si el registry no está disponible
- **Routing zone-aware**: Preferir instancias en la misma AZ para reducir latencia y costos de transferencia de datos
- **Metadata para routing**: Etiquetar instancias con versiones para habilitar canary y A/B testing
- **Seguridad con mTLS**: Encriptar comunicación service-to-service; autenticar servicios registrados. Consulta [API security checklist](/guides/security/api-security-checklist-guide).

## Errores Comunes

1. **Sin health checks**: Instancias muertas no deregistradas siguen recibiendo tráfico
2. **Thundering herd**: Todos los clientes consultando el registry simultáneamente bajo carga
3. **Ignorar deregistration**: Servicios crashados permanecen en el pool hasta que expire el TTL
4. **Hard-codear fallback IPs**: Anula el propósito del discovery en vivo
5. **Omitir retries**: Una instancia fallida debería disparar un retry en otra, no fallar el request. Usa [retry con backoff exponencial](/recipes/architecture/retry-backoff) para clientes resilientes.

## Preguntas Frecuentes

**P: ¿Debo usar client-side o server-side discovery?**
R: Client-side es más rápido (sin hop extra) pero requiere clientes inteligentes. Server-side es más simple pero agrega latencia. DNS-based es el más simple para Kubernetes.

**P: ¿Cómo funciona el service discovery con serverless?**
R: AWS Cloud Map, GCP Service Directory o service registries de API Gateway se integran con Lambda y Cloud Run. Aprende más en [arquitectura serverless](/guides/architecture/event-driven-architecture-guide).

**P: ¿Cuál es la diferencia entre service discovery y load balancing?**
R: El discovery encuentra instancias disponibles; [load balancing](/recipes/architecture/load-balancing) distribuye tráfico entre ellas. A menudo trabajan juntas.

### Client-Side Discovery con Consul (Python)

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
            # Verificar health
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

# Uso
discovery = ConsulServiceDiscovery(consul_host='consul-server')
result = discovery.call_service('payment-service', '/payments/123')
```

### Service Mesh con Istio (Kubernetes)

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

### Endpoint de Health Check con Liveness y Readiness (Go)

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
    // Liveness: ¿el proceso está vivo?
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"alive"}`))
}

func (h *HealthChecker) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
    // Readiness: ¿podemos manejar requests?
    last := h.lastCheck.Load()
    if time.Now().UnixMilli()-last > 10000 {
        // Sin health check reciente — no ready
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

## Mejores Prácticas Adicionales

1. **Usa deregistration graceful al apagar.** Cuando una instancia de servicio se detiene, deregistra del registry antes de salir para que los clientes dejen de enviar tráfico:

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
        # Deregistrar del service registry
        self.discovery.client.agent.service.deregister(self.service_id)
        # Esperar a que las requests in-flight terminen
        time.sleep(5)
        sys.exit(0)
```

2. **Cachea las respuestas del registry con TTL.** Evita consultar el registry en cada llamada — cachea las listas de instancias por un período corto y refresca al expirar el cache o ante fallos de conexión:

```typescript
class CachedServiceLocator {
  private cache: Map<string, { instances: string[]; expiresAt: number }> = new Map();
  private ttlMs: number = 10000; // 10 segundos

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

3. **Etiqueta instancias con metadata para smart routing.** Registra instancias con metadata de versión, zona y peso para habilitar despliegues canary y routing zone-aware:

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

## Errores Comunes Adicionales

1. **Registry como single point of failure.** Si el registry cae, todo el service discovery falla. Ejecuta registries en clusters (Consul: 3-5 nodos, Eureka: peer-to-peer) y cachea listas de instancias client-side.

2. **Sin connection pooling con endpoints descubiertos.** Crear una nueva conexión HTTP por request a una instancia descubierta es costoso. Pool conexiones por instancia y recíclalas:

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

3. **Ignorar race conditions de arranque.** Un servicio que se registra antes de estar listo para aceptar tráfico recibirá requests que no puede manejar. Registra solo después de pasar los checks de arranque, y usa readiness probes en Kubernetes para gatear el tráfico.

## FAQ Adicional

### ¿Cómo manejo service discovery a través de múltiples datacenters?

Consul soporta federación multi-datacenter out of the box — los servicios en DC1 pueden descubrir servicios en DC2 vía WAN gossip. Para Kubernetes, usa un global load balancer (Envoy, Gloo) que rutee entre clusters. Para setups cloud-native, AWS Cloud Map soporta discovery cross-region con VPC peering.

### ¿Esta solución está lista para producción?

Sí. El registro de servicios con Consul y health checks se usa en producción por clientes de HashiCorp. El VirtualService de Istio con canary routing y outlier detection es estándar en deployments de service mesh. El patrón de client-side discovery con caching es cómo funcionan los clientes de Netflix Eureka. El endpoint de health check en Go con separación de liveness y readiness sigue las mejores prácticas de Kubernetes.

### ¿Cuáles son las características de rendimiento?

Las queries a Consul añaden 1-5ms para lookups de agente local; las respuestas cacheadas son sub-milisegundo. El DNS-based discovery en Kubernetes añade 1-2ms por resolución (cacheado por kube-dns). El client-side discovery con Eureka y caching añade <1ms por llamada. Los sidecar proxies de Istio añaden 1-3ms por hop. El polling de health checks a intervalos de 10s tiene overhead de CPU despreciable. El consenso del cluster de registry (Raft) añade latencia solo en writes (registration/deregistration), no en reads.

### ¿Cómo depuro problemas con este enfoque?

Usa `consul members` para verificar la salud del cluster, `consul catalog services` para listar servicios registrados, y `consul health checks <service>` para ver el estado de health. Para Kubernetes, usa `kubectl get endpoints <service>` para verificar instancias descubiertas. Para Istio, usa `istioctl analyze` para detectar problemas de configuración. Loggea la selección de instancia (address, port, source) en cada llamada. Monitorea la latencia de queries al registry y el cache hit rate. Configura alertas en instancias unhealthy, eventos de deregistration y tamaño del cluster de registry.
