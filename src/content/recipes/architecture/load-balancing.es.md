---

contentType: recipes
slug: load-balancing
title: "Distribuir Tráfico con Algoritmos de Load Balancing"
description: "Cómo distribuir requests entrantes entre múltiples servidores usando round-robin, least-connections, weighted y consistent hashing con health checks y failover."
metaDescription: "Aprende algoritmos de load balancing para distribuir tráfico. Usa round-robin, least-connections, weighted y consistent hashing con health checks y failover."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - design
  - pattern
  - scalability
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/api-gateway
  - /recipes/cdn-edge-caching
  - /recipes/connection-pooling
  - /recipes/service-mesh
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende algoritmos de load balancing para distribuir tráfico. Usa round-robin, least-connections, weighted y consistent hashing con health checks y failover."
  keywords:
    - load balancing
    - algoritmo round robin
    - least connections
    - consistent hashing
    - distribucion trafico

---

## Visión general

Un servidor único manejando todo el tráfico tiene una capacidad máxima definida por su CPU, memoria, red e I/O de disco. Cuando la demanda excede esa capacidad, los tiempos de respuesta se degradan y los requests empiezan a fallar. El load balancing resuelve esto distribuyendo tráfico entrante entre múltiples servidores backend — un pool que escala horizontalmente. Pero la distribución no es tan simple como enviar cada request al siguiente servidor en una lista. Diferentes algoritmos optimizan para diferentes objetivos: equidad, minimización de latencia, persistencia de sesión, o localidad de cache.

El load balancer se sienta entre clientes y servidores, actuando como reverse proxy. Monitorea la salud de backends, remueve instancias fallidas de rotación, y las reintroduce cuando se recuperan. Puede operar en múltiples capas: DNS (geográfico), transporte (TCP/UDP), o aplicación (HTTP con persistencia basada en cookies). La solucion a continuacion cubre los algoritmos más comunes, sus trade-offs, e implementación usando Nginx y HAProxy.

## Cuándo usarlo

Usa esta receta cuando:

- Ejecutando múltiples instancias de una aplicación detrás de un único dominio
- Experimentando tráfico que excede la capacidad de un solo servidor
- Requiriendo alta disponibilidad con [failover](/recipes/circuit-breaker-pattern/) automático entre data centers
- Necesitando persistencia de sesión para que usuarios golpeen el mismo backend a través de requests
- Implementando despliegues canary o blue/green que enruten porcentajes de tráfico

## Solución

### Load Balancing con Nginx

```nginx
upstream backend {
    least_conn;

    server 10.0.0.1:8080 weight=5;
    server 10.0.0.2:8080 weight=3;
    server 10.0.0.3:8080 backup;

    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### HAProxy con Health Checks

```haproxy
global
    maxconn 4096

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httpchk GET /health

frontend http_front
    bind *:80
    default_backend api_servers

backend api_servers
    balance roundrobin
    cookie SERVERID insert indirect nocache

    server api1 10.0.0.1:8080 check cookie s1
    server api2 10.0.0.2:8080 check cookie s2
    server api3 10.0.0.3:8080 check cookie s3
```

### Consistent Hashing (Python)

```python
import hashlib

class ConsistentHashRing:
    def __init__(self, replicas=150):
        self.replicas = replicas
        self.ring = {}
        self.sorted_keys = []

    def add_node(self, node):
        for i in range(self.replicas):
            key = self._hash(f"{node}:{i}")
            self.ring[key] = node
            self.sorted_keys.append(key)
        self.sorted_keys.sort()

    def remove_node(self, node):
        for i in range(self.replicas):
            key = self._hash(f"{node}:{i}")
            del self.ring[key]
            self.sorted_keys.remove(key)

    def get_node(self, key):
        if not self.ring:
            return None
        hash_key = self._hash(key)
        for ring_key in self.sorted_keys:
            if hash_key <= ring_key:
                return self.ring[ring_key]
        return self.ring[self.sorted_keys[0]]

    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

ring = ConsistentHashRing()
ring.add_node("server-a")
ring.add_node("server-b")
ring.add_node("server-c")

user_server = ring.get_node("user-123")
```

## Explicación

- **Round-robin**: distribuye requests secuencialmente entre todos los backends saludables.   El servidor 1 recibe el request 1, el servidor 2 el request 2, y así sucesivamente.   Es simple, equitativo y stateless.   Mejor cuando todos los servidores tienen capacidad igual y los requests son uniformes.
- **Least connections**: envía cada request al servidor con menos conexiones activas.   Esto considera variabilidad de duración de requests — un servidor manejando dos uploads de larga duración debería recibir menos nuevos requests que un servidor inactivo.   Mejor para cargas de trabajo mixtas.
- **Algoritmos weighted**: asigna pesos a servidores basado en capacidad.   Un servidor con 32GB RAM recibe peso 4; uno con 8GB recibe peso 1.   Weighted round-robin y weighted least-connections distribuyen proporcionalmente.
- **Consistent hashing**: hashea un atributo de request (user ID, session ID, URL) y lo mapea a un servidor.   Ideal para caching — el mismo usuario siempre golpea el mismo servidor de cache, maximizando hit rates.

## Variantes

| Algoritmo | Complejidad | Equidad | Persistencia de sesión | Localidad de cache | Mejor para |
|-----------|-------------|---------|------------------------|--------------------|------------|
| Round-robin | O(1) | Alta | Ninguna | Ninguna | Requests cortos uniformes |
| Least connections | O(n) | Media | Ninguna | Ninguna | Requests de duración variable |
| Weighted | O(1) | Configurable | Ninguna | Ninguna | Hardware heterogéneo |
| IP hash | O(1) | Media | Fuerte | Media | Persistencia de sesión |
| Consistent hash | O(log n) | Media | Fuerte | Fuerte | Caches distribuidos |

## Lo que funciona

- **Implementa health checks activos**: el monitoreo pasivo (detectar fallos de conexión) es demasiado lento.   Un servidor retornando 500s debería ser removido de rotación antes de degradar la experiencia de usuario.
- **Usa [connection pooling](/recipes/connection-pooling/)**: crear una nueva conexión TCP para cada request agrega latencia y overhead de CPU.
- **Termina SSL en el load balancer**: Esto reduce gestión de certificados y carga de CPU en servidores de aplicación.
- **Expone IPs reales de clientes**: los backends detrás de un load balancer ven la IP del balancer, no la del cliente.   Reenvía headers `X-Forwarded-For` y `X-Real-IP`.
- **Planifica para persistencia de sesión**: si tu aplicación almacena estado de sesión en memoria, usa sesiones pegajosas (basadas en cookies o hash de IP) para que usuarios golpeen consistentemente el mismo backend.

## Errores comunes

- **Sin health checks con round-robin**: un servidor fallido aún recibe 1/N del tráfico, causando errores visibles para usuarios.   Siempre combina load balancing con health checks activos que remuevan nodos no saludables.
- **Ignorar el thundering herd**: cuando un servidor fallido se recupera, enviarle tráfico completo inmediatamente puede abrumarlo.
- **IP hash para usuarios mobile**: los clientes mobile cambian direcciones IP frecuentemente (cambiando entre WiFi y celular).   IP hash causa pérdida de sesión.
- **Olvidar la capacidad del load balancer**: el load balancer mismo puede convertirse en cuello de botella.   Escala horizontalmente con DNS round-robin o Anycast cuando un solo balancer es insuficiente.

## Preguntas frecuentes

**P: ¿Debería usar load balancing de Capa 4 o Capa 7?**
R: Capa 4 (TCP/UDP) es más rápido pero no puede inspeccionar headers HTTP o enrutar basado en URL. Capa 7 (HTTP) habilita enrutamiento basado en path, stickiness de cookies y reescritura de requests. Usa Capa 7 para aplicaciones web; Capa 4 para bases de datos, servidores de juegos o protocolos no-HTTP.

**P: ¿Cómo manejan los load balancers [WebSockets](/recipes/websocket-server/)?**
R: Las conexiones WebSocket son de larga duración. El balancer debe soportar proxying de upgrade HTTP y mantener la conexión. Nginx y HAProxy manejan esto nativamente. Asegura que el timeout del backend exceda la duración esperada del WebSocket.

**P: ¿Cuál es la diferencia entre un load balancer y un [reverse proxy](/recipes/nginx-reverse-proxy/)?**
R: Un reverse proxy enruta requests a backends y puede modificarlos. Un load balancer agrega algoritmos de distribución, health checks y failover. En la práctica, herramientas modernas (Nginx, HAProxy, Traefik) son ambos. Los términos se usan frecuentemente de forma intercambiable.

**P: ¿Puedo hacer load balancing entre regiones?**
R: Sí — usa load balancing basado en DNS (Route 53, Cloudflare) con enrutamiento geolocalizado o basado en latencia. El resolver DNS retorna la IP de la región saludable más cercana. Esto opera en Capa 3, por encima de balancers a nivel de aplicación.


### Weighted Random con Smooth Weighted Round-Robin (Go)

```go
package main

import (
    "math/rand"
    "sync"
    "sync/atomic"
)

type SmoothWeightedRR struct {
    mu      sync.Mutex
    servers []*WeightedServer
}

type WeightedServer struct {
    Name          string
    Weight        int64
    CurrentWeight int64
}

func NewSmoothWeightedRR(servers map[string]int) *SmoothWeightedRR {
    var ws []*WeightedServer
    for name, weight := range servers {
        ws = append(ws, &WeightedServer{
            Name:          name,
            Weight:        int64(weight),
            CurrentWeight: 0,
        })
    }
    return &SmoothWeightedRR{servers: ws}
}

// Next selecciona un servidor usando smooth weighted round-robin (algoritmo de Nginx)
func (s *SmoothWeightedRR) Next() string {
    s.mu.Lock()
    defer s.mu.Unlock()

    var total int64
    var best *WeightedServer

    for _, server := range s.servers {
        atomic.AddInt64(&server.CurrentWeight, server.Weight)
        total += server.Weight
        if best == nil || server.CurrentWeight > best.CurrentWeight {
            best = server
        }
    }

    if best != nil {
        atomic.AddInt64(&best.CurrentWeight, -total)
        return best.Name
    }
    return ""
}

// Weighted random para comparación
func WeightedRandom(servers map[string]int) string {
    total := 0
    for _, w := range servers {
        total += w
    }
    r := rand.Intn(total)
    for name, w := range servers {
        r -= w
        if r < 0 {
            return name
        }
    }
    return ""
}
```

### Least Response Time (TypeScript)

```typescript
interface BackendServer {
  url: string;
  activeConnections: number;
  avgResponseTime: number;
  lastResponseAt: number;
  healthy: boolean;
}

class LeastResponseTimeBalancer {
  private servers: BackendServer[] = [];
  private responseTimes: Map<string, number[]> = new Map();

  addServer(url: string): void {
    this.servers.push({
      url,
      activeConnections: 0,
      avgResponseTime: 0,
      lastResponseAt: Date.now(),
      healthy: true,
    });
    this.responseTimes.set(url, []);
  }

  selectServer(): BackendServer | null {
    const healthy = this.servers.filter(s => s.healthy);
    if (healthy.length === 0) return null;

    // Elegir servidor con menor avg response time + penalización por conexiones activas
    let best = healthy[0];
    let bestScore = this.calculateScore(best);

    for (const server of healthy) {
      const score = this.calculateScore(server);
      if (score < bestScore) {
        bestScore = score;
        best = server;
      }
    }
    best.activeConnections++;
    return best;
  }

  private calculateScore(server: BackendServer): number {
    // Score = avg response time * (1 + conexiones activas / 10)
    return server.avgResponseTime * (1 + server.activeConnections / 10);
  }

  recordResponse(url: string, responseTimeMs: number): void {
    const times = this.responseTimes.get(url) || [];
    times.push(responseTimeMs);
    if (times.length > 100) times.shift();

    const server = this.servers.find(s => s.url === url);
    if (server) {
      server.avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
      server.activeConnections = Math.max(0, server.activeConnections - 1);
      server.lastResponseAt = Date.now();
    }
    this.responseTimes.set(url, times);
  }

  markUnhealthy(url: string): void {
    const server = this.servers.find(s => s.url === url);
    if (server) server.healthy = false;
  }
}
```

### Global DNS Load Balancing con Route 53 (Terraform)

```hcl
resource "aws_route53_record" "api_global" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.stackpractices.com"
  type    = "A"

  latency_routing_policy {
    set_id = "us-east"
    records = [aws_eip.us_east.public_ip]
  }

  health_check_id = aws_route53_health_check.us_east.id
}

resource "aws_route53_record" "api_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.stackpractices.com"
  type    = "A"

  latency_routing_policy {
    set_id = "eu-west"
    records = [aws_eip.eu_west.public_ip]
  }

  health_check_id = aws_route53_health_check.eu_west.id
}

resource "aws_route53_health_check" "us_east" {
  fqdn              = "api-us.stackpractices.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10
}
```



