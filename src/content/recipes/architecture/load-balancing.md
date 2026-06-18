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
  - consistent-hashing
  - failover
  - haproxy
  - health-checks
  - least-connections
  - load-balancing
  - nginx
  - round-robin
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

The load balancer sits between clients and servers, acting as a reverse proxy. It monitors backend health, removes failed instances from rotation, and reintroduces them when recovered. It can operate at multiple layers: DNS (geographic), transport (TCP/UDP), or application (HTTP with cookie-based persistence). This recipe covers the most common algorithms, their trade-offs, and implementation using Nginx and HAProxy.

## When to use it

Use this recipe when:

- Running multiple instances of an application behind a single domain
- Experiencing traffic that exceeds the capacity of a single server
- Requiring high availability with automatic failover between data centers
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

## Best practices

- **Implement active health checks**: passive monitoring (detecting connection failures) is too slow. Configure HTTP health checks that hit `/health` every 5 seconds. A server returning 500s should be removed from rotation before it degrades user experience.
- **Use connection pooling**: creating a new TCP connection for every request adds latency and CPU overhead. Configure `keepalive` connections between the load balancer and backends so connections are reused across requests.
- **Terminate SSL at the load balancer**: handle TLS handshake at the edge, forwarding plain HTTP to backends inside a secure network. This reduces certificate management and CPU load on application servers.
- **Expose real client IPs**: backends behind a load balancer see the balancer's IP, not the client's. Forward `X-Forwarded-For` and `X-Real-IP` headers. Ensure backends trust only the load balancer's IP to prevent IP spoofing.
- **Plan for session persistence**: if your application stores session state in memory, use sticky sessions (cookie-based or IP hash) so users consistently hit the same backend. Better yet, store sessions in Redis and make all requests stateless.

## Common mistakes

- **No health checks with round-robin**: a failed server still receives 1/N of traffic, causing user-facing errors. Always combine load balancing with active health checks that remove unhealthy nodes.
- **Ignoring the thundering herd**: when a failed server recovers, sending it full traffic immediately can overwhelm it. Use slow-start — gradually increase the weight of recovering servers over 30-60 seconds.
- **IP hash for mobile users**: mobile clients change IP addresses frequently (switching between WiFi and cellular). IP hash causes session loss. Use cookie-based stickiness instead.
- **Forgetting about load balancer capacity**: the load balancer itself can become a bottleneck. Monitor its CPU, connections, and throughput. Scale horizontally with DNS round-robin or Anycast when a single balancer is insufficient.

## FAQ

**Q: Should I use Layer 4 or Layer 7 load balancing?**
A: Layer 4 (TCP/UDP) is faster but cannot inspect HTTP headers or route based on URL. Layer 7 (HTTP) enables path-based routing, cookie stickiness, and request rewriting. Use Layer 7 for web applications; Layer 4 for databases, game servers, or non-HTTP protocols.

**Q: How do load balancers handle WebSockets?**
A: WebSocket connections are long-lived. The balancer must support HTTP upgrade proxying and maintain the connection. Nginx and HAProxy handle this natively. Ensure the backend timeout exceeds the expected WebSocket duration.

**Q: What is the difference between a load balancer and a reverse proxy?**
A: A reverse proxy routes requests to backends and can modify them. A load balancer adds distribution algorithms, health checks, and failover. In practice, modern tools (Nginx, HAProxy, Traefik) are both. The terms are often used interchangeably.

**Q: Can I load balance across regions?**
A: Yes — use DNS-based load balancing (Route 53, Cloudflare) with geolocation routing or latency-based routing. The DNS resolver returns the IP of the nearest healthy region. This operates at Layer 3, above application-level balancers.

