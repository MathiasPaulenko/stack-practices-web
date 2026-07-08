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
  - patterns
  - scalability
  - systems
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/api-gateway
  - /recipes/cdn-edge-caching
  - /recipes/connection-pooling
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
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
- Requiriendo alta disponibilidad con [failover](/recipes/circuit-breaker-pattern-recipe) automático entre data centers
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

- **Round-robin**: distribuye requests secuencialmente entre todos los backends saludables. El servidor 1 recibe el request 1, el servidor 2 el request 2, y así sucesivamente. Es simple, equitativo y stateless. Mejor cuando todos los servidores tienen capacidad igual y los requests son uniformes.
- **Least connections**: envía cada request al servidor con menos conexiones activas. Esto considera variabilidad de duración de requests — un servidor manejando dos uploads de larga duración debería recibir menos nuevos requests que un servidor inactivo. Mejor para cargas de trabajo mixtas.
- **Algoritmos weighted**: asigna pesos a servidores basado en capacidad. Un servidor con 32GB RAM recibe peso 4; uno con 8GB recibe peso 1. Weighted round-robin y weighted least-connections distribuyen proporcionalmente.
- **Consistent hashing**: hashea un atributo de request (user ID, session ID, URL) y lo mapea a un servidor. Agregar o remover servidores solo afecta una pequeña fracción de mapeos. Ideal para caching — el mismo usuario siempre golpea el mismo servidor de cache, maximizando hit rates.

## Variantes

| Algoritmo | Complejidad | Equidad | Persistencia de sesión | Localidad de cache | Mejor para |
|-----------|-------------|---------|------------------------|--------------------|------------|
| Round-robin | O(1) | Alta | Ninguna | Ninguna | Requests cortos uniformes |
| Least connections | O(n) | Media | Ninguna | Ninguna | Requests de duración variable |
| Weighted | O(1) | Configurable | Ninguna | Ninguna | Hardware heterogéneo |
| IP hash | O(1) | Media | Fuerte | Media | Persistencia de sesión |
| Consistent hash | O(log n) | Media | Fuerte | Fuerte | Caches distribuidos |

## Lo que funciona

- **Implementa health checks activos**: el monitoreo pasivo (detectar fallos de conexión) es demasiado lento. Configura health checks HTTP que golpean `/health` cada 5 segundos. Un servidor retornando 500s debería ser removido de rotación antes de degradar la experiencia de usuario.
- **Usa [connection pooling](/recipes/performance/connection-pooling)**: crear una nueva conexión TCP para cada request agrega latencia y overhead de CPU. Configura conexiones `keepalive` entre el load balancer y los backends para que las conexiones se reutilicen entre requests.
- **Termina SSL en el load balancer**: maneja el handshake TLS en el edge, reenviando HTTP plano a backends dentro de una red segura. Esto reduce gestión de certificados y carga de CPU en servidores de aplicación.
- **Expone IPs reales de clientes**: los backends detrás de un load balancer ven la IP del balancer, no la del cliente. Reenvía headers `X-Forwarded-For` y `X-Real-IP`. Asegura que los backends solo confíen en la IP del load balancer para prevenir spoofing de IP.
- **Planifica para persistencia de sesión**: si tu aplicación almacena estado de sesión en memoria, usa sesiones pegajosas (basadas en cookies o hash de IP) para que usuarios golpeen consistentemente el mismo backend. Mejor aún, almacena sesiones en [Redis](/recipes/api/real-time-notifications) y haz todos los requests stateless.

## Errores comunes

- **Sin health checks con round-robin**: un servidor fallido aún recibe 1/N del tráfico, causando errores visibles para usuarios. Siempre combina load balancing con health checks activos que remuevan nodos no saludables.
- **Ignorar el thundering herd**: cuando un servidor fallido se recupera, enviarle tráfico completo inmediatamente puede abrumarlo. Usa slow-start — incrementa gradualmente el peso de servidores recuperándose durante 30-60 segundos.
- **IP hash para usuarios mobile**: los clientes mobile cambian direcciones IP frecuentemente (cambiando entre WiFi y celular). IP hash causa pérdida de sesión. Usa stickiness basado en cookies en su lugar.
- **Olvidar la capacidad del load balancer**: el load balancer mismo puede convertirse en cuello de botella. Monitorea su CPU, conexiones y throughput. Escala horizontalmente con DNS round-robin o Anycast cuando un solo balancer es insuficiente.

## Preguntas frecuentes

**P: ¿Debería usar load balancing de Capa 4 o Capa 7?**
R: Capa 4 (TCP/UDP) es más rápido pero no puede inspeccionar headers HTTP o enrutar basado en URL. Capa 7 (HTTP) habilita enrutamiento basado en path, stickiness de cookies y reescritura de requests. Usa Capa 7 para aplicaciones web; Capa 4 para bases de datos, servidores de juegos o protocolos no-HTTP.

**P: ¿Cómo manejan los load balancers [WebSockets](/recipes/api/websocket-server)?**
R: Las conexiones WebSocket son de larga duración. El balancer debe soportar proxying de upgrade HTTP y mantener la conexión. Nginx y HAProxy manejan esto nativamente. Asegura que el timeout del backend exceda la duración esperada del WebSocket.

**P: ¿Cuál es la diferencia entre un load balancer y un [reverse proxy](/recipes/api/nginx-reverse-proxy)?**
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

## Mejores Prácticas Adicionales

1. **Usa slow-start para servidores recuperados.** Cuando un servidor vuelve después de estar caído, enviarle tráfico completo inmediatamente puede abrumarlo. Nginx y HAProxy soportan slow-start para rampar tráfico gradualmente:

```haproxy
backend api_servers
    balance roundrobin
    server api1 10.0.0.1:8080 check slowstart 30s
    server api2 10.0.0.2:8080 check slowstart 30s
    server api3 10.0.0.3:8080 check slowstart 30s
```

2. **Configura límites de conexiones por backend.** Protege backends de ser abrumados limitando conexiones concurrentes que el balancer enviará a cada uno:

```nginx
upstream backend {
    least_conn;
    server 10.0.0.1:8080 max_conns=200;
    server 10.0.0.2:8080 max_conns=200;
    server 10.0.0.3:8080 max_conns=200;
    queue 50 timeout=5s;
}
```

3. **Habilita HTTP/2 y keep-alive hacia backends.** La multiplexación de HTTP/2 reduce overhead de conexiones. Keep-alive reutiliza conexiones TCP entre requests:

```nginx
upstream backend {
    server 10.0.0.1:8080;
    keepalive 64;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

server {
    listen 443 ssl http2;
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

## Errores Comunes Adicionales

1. **No manejar graceful shutdown.** Al desplegar, las instancias antiguas no reciben nuevas conexiones pero las existentes se cortan. Usa graceful shutdown para que el balancer drene conexiones antes de remover la instancia:

```typescript
import { createServer } from 'http';

const server = createServer(app);

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, draining connections');
  server.close(() => {
    console.log('All connections closed, exiting');
    process.exit(0);
  });

  // Forzar exit después de 30s si las conexiones no drenan
  setTimeout(() => {
    console.error('Forcing exit after timeout');
    process.exit(1);
  }, 30000);
});
```

2. **Endpoint de health check demasiado costoso.** Un health check que consulta la base de datos o hace llamadas externas ralentizará el balancer y creará falsos negativos. Mantén los health checks ligeros:

```python
# Mal: health check consulta la base de datos
@app.get("/health")
def health():
    db.execute("SELECT 1")  # añade latencia, falla si DB es lento
    return {"status": "ok"}

# Bien: health check solo verifica que el proceso está vivo
@app.get("/health")
def health():
    return {"status": "ok"}

# Check de readiness separado para dependencias
@app.get("/ready")
def ready():
    try:
        db.execute("SELECT 1")
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}, 503
```

3. **Sin retry en backend diferente.** Retray el mismo request en el mismo backend fallido no tiene sentido. Configura el balancer para retray en un backend diferente:

```haproxy
backend api_servers
    balance roundrobin
    option retry-on
    retries 3
    retry-on 503 504
    server api1 10.0.0.1:8080 check
    server api2 10.0.0.2:8080 check
```

## FAQ Adicional

### ¿Cómo testeo la configuración de load balancer?

Usa `nginx -t` para validar la sintaxis de config de Nginx. Usa `haproxy -c -f /etc/haproxy/haproxy.cfg` para validar la config de HAProxy. Para testing de tráfico, usa `wrk` o `hey` para generar carga y verificar la distribución entre backends. Para testing de failover, detén un backend y verifica que el balancer lo remueve de rotación dentro del intervalo de health check. Para sesiones sticky, haz múltiples requests con la misma cookie y verifica que golpean el mismo backend. Para distribución weighted, envía 1000 requests y cuenta hits por backend — el ratio debería coincidir con los pesos configurados.

### ¿Esta solución está lista para producción?

Sí. Nginx se usa en producción por Netflix, Dropbox y Airbnb para load balancing. HAProxy se usa en producción por Reddit, Stack Overflow y GitHub. AWS Route 53 latency-based routing se usa en miles de workloads productivos de AWS. El algoritmo smooth weighted round-robin es el mismo que usa Nginx internamente. Consistent hashing es usado por Memcached, Redis Cluster y Amazon DynamoDB para distribución de datos.

### ¿Cuáles son las características de rendimiento?

Nginx maneja 50K-100K requests por segundo en hardware commodity con HTTP load balancing. HAProxy maneja 100K-200K conexiones por segundo con Layer 4 load balancing. Layer 7 añade 0.5-2ms de overhead por request para inspección de headers y enrutamiento. Consistent hashing con 150 nodos virtuales por servidor tiene O(log n) tiempo de lookup — menos de 1 microsegundo para 100 servidores. Health checks añaden 1 request por backend por intervalo — intervalos de 5 segundos con 3 backends son 0.6 checks por segundo. Slow-start no añade overhead — solo ajusta el ramp de peso. Conexiones keep-alive reducen latencia por request en 1-5ms al evitar el TCP handshake.

### ¿Cómo depuro problemas con este enfoque?

Para Nginx, usa `nginx -T` para imprimir la config resuelta completa. Revisa `error_log` para timeouts de upstream y errores de connection refused. Para HAProxy, usa la stats UI (`stats enable`) para ver estado de servidores, conteo de conexiones y tiempos de respuesta. Para distribución desigual, verifica si los pesos están configurados correctamente y si los health checks están marcando servidores como down. Para issues de sesiones sticky, verifica que el nombre y path de la cookie coincidan entre requests. Para errores 502/504, verifica si los backends están aceptando conexiones y si los timeouts son muy agresivos. Usa `tcpdump` o `wireshark` para inspeccionar tráfico entre balancer y backends.
