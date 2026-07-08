---
contentType: recipes
slug: load-balancing
title: "Distribute Traffic with Load Balancing Algorithms"
description: "How to distribute incoming requests across multiple servers using round-robin, least-connections, weighted, and consistent hashing algorithms with health checks and failover."
metaDescription: "Learn load balancing algorithms for distributing traffic. Use round-robin, least-connections, weighted, and consistent hashing with health checks and failover."
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
  metaDescription: "Learn load balancing algorithms for distributing traffic. Use round-robin, least-connections, weighted, and consistent hashing with health checks and failover."
  keywords:
    - load balancing
    - round robin algorithm
    - least connections
    - consistent hashing
    - traffic distribution
---

## Overview

A single server handling all traffic has a maximum capacity defined by its CPU, memory, network, and disk I/O. When demand exceeds that capacity, response times degrade and requests start failing. Load balancing solves this by distributing incoming traffic across multiple backend servers — a pool that scales horizontally. But distribution is not as simple as sending each request to the next server in a list. Different algorithms optimize for different goals: fairness, latency minimization, session stickiness, or cache locality.

The load balancer sits between clients and servers, acting as a reverse proxy. It monitors backend health, removes failed instances from rotation, and reintroduces them when recovered. It can operate at multiple layers: DNS (geographic), transport (TCP/UDP), or application (HTTP with cookie-based persistence). The following demonstrates how to the most common algorithms, their trade-offs, and implementation using Nginx and HAProxy.

## When to use it

Use this recipe when:

- Running multiple instances of an application behind a single domain
- Experiencing traffic that exceeds the capacity of a single server
- Requiring high availability with automatic [failover](/recipes/circuit-breaker-pattern-recipe) between data centers
- Needing session persistence so users hit the same backend across requests
- Implementing canary or blue/green deployments that route percentages of traffic

## Solution

### Nginx Load Balancing

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

### HAProxy with Health Checks

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

### Consistent Hashing (Python Implementation)

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

# Usage
ring = ConsistentHashRing()
ring.add_node("server-a")
ring.add_node("server-b")
ring.add_node("server-c")

# Same user always hits same server
user_server = ring.get_node("user-123")
```

## Explanation

- **Round-robin**: distributes requests sequentially across all healthy backends. Server 1 gets request 1, server 2 gets request 2, and so on. It is simple, fair, and stateless. Best when all servers have equal capacity and requests are uniform.
- **Least connections**: sends each request to the server with the fewest active connections. This accounts for request duration variability — a server handling two long-running uploads should receive fewer new requests than an idle server. Best for mixed workloads.
- **Weighted algorithms**: assign weights to servers based on capacity. A server with 32GB RAM gets weight 4; a server with 8GB gets weight 1. Weighted round-robin and weighted least-connections distribute proportionally.
- **Consistent hashing**: hashes a request attribute (user ID, session ID, URL) and maps it to a server. Adding or removing servers only affects a small fraction of mappings. Ideal for caching — the same user always hits the same cache server, maximizing hit rates.

## Variants

| Algorithm | Complexity | Fairness | Session stickiness | Cache locality | Best for |
|-----------|------------|----------|-------------------|----------------|----------|
| Round-robin | O(1) | High | None | None | Uniform short requests |
| Least connections | O(n) | Medium | None | None | Variable-duration requests |
| Weighted | O(1) | Configurable | None | None | Heterogeneous hardware |
| IP hash | O(1) | Medium | Strong | Medium | Session persistence |
| Consistent hash | O(log n) | Medium | Strong | Strong | Distributed caches |

## What Works

- **Implement active health checks**: passive monitoring (detecting connection failures) is too slow. Configure HTTP health checks that hit `/health` every 5 seconds. A server returning 500s should be removed from rotation before it degrades user experience.
- **Use [connection pooling](/recipes/performance/connection-pooling)**: creating a new TCP connection for every request adds latency and CPU overhead. Configure `keepalive` connections between the load balancer and backends so connections are reused across requests.
- **Terminate SSL at the load balancer**: handle TLS handshake at the edge, forwarding plain HTTP to backends inside a secure network. This reduces certificate management and CPU load on application servers.
- **Expose real client IPs**: backends behind a load balancer see the balancer's IP, not the client's. Forward `X-Forwarded-For` and `X-Real-IP` headers. Ensure backends trust only the load balancer's IP to prevent IP spoofing.
- **Plan for session persistence**: if your application stores session state in memory, use sticky sessions (cookie-based or IP hash) so users consistently hit the same backend. Better yet, store sessions in [Redis](/recipes/api/real-time-notifications) and make all requests stateless.

## Common mistakes

- **No health checks with round-robin**: a failed server still receives 1/N of traffic, causing user-facing errors. Always combine load balancing with active health checks that remove unhealthy nodes.
- **Ignoring the thundering herd**: when a failed server recovers, sending it full traffic immediately can overwhelm it. Use slow-start — gradually increase the weight of recovering servers over 30-60 seconds.
- **IP hash for mobile users**: mobile clients change IP addresses frequently (switching between WiFi and cellular). IP hash causes session loss. Use cookie-based stickiness instead.
- **Forgetting about load balancer capacity**: the load balancer itself can become a bottleneck. Monitor its CPU, connections, and throughput. Scale horizontally with DNS round-robin or Anycast when a single balancer is insufficient.

## FAQ

**Q: Should I use Layer 4 or Layer 7 load balancing?**
A: Layer 4 (TCP/UDP) is faster but cannot inspect HTTP headers or route based on URL. Layer 7 (HTTP) enables path-based routing, cookie stickiness, and request rewriting. Use Layer 7 for web applications; Layer 4 for databases, game servers, or non-HTTP protocols.

**Q: How do load balancers handle [WebSockets](/recipes/api/websocket-server)?**
A: WebSocket connections are long-lived. The balancer must support HTTP upgrade proxying and maintain the connection. Nginx and HAProxy handle this natively. Ensure the backend timeout exceeds the expected WebSocket duration.

**Q: What is the difference between a load balancer and a [reverse proxy](/recipes/api/nginx-reverse-proxy)?**
A: A reverse proxy routes requests to backends and can modify them. A load balancer adds distribution algorithms, health checks, and failover. In practice, modern tools (Nginx, HAProxy, Traefik) are both. The terms are often used interchangeably.

**Q: Can I load balance across regions?**
A: Yes — use DNS-based load balancing (Route 53, Cloudflare) with geolocation routing or latency-based routing. The DNS resolver returns the IP of the nearest healthy region. This operates at Layer 3, above application-level balancers.


### Weighted Random with Smooth Weighted Round-Robin (Go)

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

// Next selects a server using smooth weighted round-robin (Nginx algorithm)
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

// Weighted random for comparison
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

    // Pick server with lowest avg response time + active connections penalty
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
    // Score = avg response time * (1 + active connections / 10)
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

### Global DNS Load Balancing with Route 53 (Terraform)

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

## Additional Best Practices

1. **Use slow-start for recovered servers.** When a server comes back after being down, immediately sending full traffic can overwhelm it. Nginx and HAProxy support slow-start to gradually ramp up traffic:

```haproxy
backend api_servers
    balance roundrobin
    server api1 10.0.0.1:8080 check slowstart 30s
    server api2 10.0.0.2:8080 check slowstart 30s
    server api3 10.0.0.3:8080 check slowstart 30s
```

2. **Configure connection limits per backend.** Protect backends from being overwhelmed by limiting concurrent connections the balancer will send to each:

```nginx
upstream backend {
    least_conn;
    server 10.0.0.1:8080 max_conns=200;
    server 10.0.0.2:8080 max_conns=200;
    server 10.0.0.3:8080 max_conns=200;
    queue 50 timeout=5s;
}
```

3. **Enable HTTP/2 and keep-alive to backends.** HTTP/2 multiplexing reduces connection overhead. Keep-alive reuses TCP connections across requests:

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

## Additional Common Mistakes

1. **Not handling graceful shutdown.** When deploying, old instances receive no new connections but existing ones are cut off. Use graceful shutdown so the balancer drains connections before removing the instance:

```typescript
import { createServer } from 'http';

const server = createServer(app);

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, draining connections');
  server.close(() => {
    console.log('All connections closed, exiting');
    process.exit(0);
  });

  // Force exit after 30s if connections don't drain
  setTimeout(() => {
    console.error('Forcing exit after timeout');
    process.exit(1);
  }, 30000);
});
```

2. **Health check endpoint too expensive.** A health check that queries the database or makes external calls will slow down the balancer and create false negatives. Keep health checks lightweight:

```python
# Bad: health check queries database
@app.get("/health")
def health():
    db.execute("SELECT 1")  # adds latency, fails if DB is slow
    return {"status": "ok"}

# Good: health check only verifies process is alive
@app.get("/health")
def health():
    return {"status": "ok"}

# Separate readiness check for dependencies
@app.get("/ready")
def ready():
    try:
        db.execute("SELECT 1")
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}, 503
```

3. **No retry on different backend.** Retrying the same request on the same failed backend is pointless. Configure the balancer to retry on a different backend:

```haproxy
backend api_servers
    balance roundrobin
    option retry-on
    retries 3
    retry-on 503 504
    server api1 10.0.0.1:8080 check
    server api2 10.0.0.2:8080 check
```

## Additional FAQ

### How do I test load balancer configuration?

Use `nginx -t` to validate Nginx config syntax. Use `haproxy -c -f /etc/haproxy/haproxy.cfg` to validate HAProxy config. For traffic testing, use `wrk` or `hey` to generate load and verify distribution across backends. For failover testing, stop one backend and verify the balancer removes it from rotation within the health check interval. For sticky sessions, make multiple requests with the same cookie and verify they hit the same backend. For weighted distribution, send 1000 requests and count hits per backend — the ratio should match the configured weights.

### Is this solution production-ready?

Yes. Nginx is used in production by Netflix, Dropbox, and Airbnb for load balancing. HAProxy is used in production by Reddit, Stack Overflow, and GitHub. AWS Route 53 latency-based routing is used across thousands of AWS production workloads. The smooth weighted round-robin algorithm is the same one used by Nginx internally. Consistent hashing is used by Memcached, Redis Cluster, and Amazon DynamoDB for data distribution.

### What are the performance characteristics?

Nginx handles 50K-100K requests per second on commodity hardware with HTTP load balancing. HAProxy handles 100K-200K connections per second with Layer 4 load balancing. Layer 7 adds 0.5-2ms overhead per request for header inspection and routing. Consistent hashing with 150 virtual nodes per server has O(log n) lookup time — under 1 microsecond for 100 servers. Health checks add 1 request per backend per interval — 5-second intervals with 3 backends is 0.6 checks per second. Slow-start adds no overhead — it only adjusts the weight ramp. Keep-alive connections reduce per-request latency by 1-5ms by avoiding TCP handshake.

### How do I debug issues with this approach?

For Nginx, use `nginx -T` to print the full resolved config. Check `error_log` for upstream timeouts and connection refused errors. For HAProxy, use the stats UI (`stats enable`) to see server status, connection counts, and response times. For uneven distribution, check if weights are configured correctly and if health checks are marking servers down. For sticky session issues, verify the cookie name and path match across requests. For 502/504 errors, check if backends are accepting connections and if timeouts are too aggressive. Use `tcpdump` or `wireshark` to inspect traffic between balancer and backends.
