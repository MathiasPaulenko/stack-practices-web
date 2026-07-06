---
contentType: recipes
slug: load-balancing-haproxy
title: "Load Balancing with HAProxy and Health Checks"
description: "Configure HAProxy as a high-performance load balancer with active health checks, sticky sessions, and SSL termination for resilient service distribution"
metaDescription: "Configure HAProxy as a load balancer with health checks, sticky sessions, and SSL termination for resilient distribution of traffic across backend services."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - networking
  - load-balancer
  - infrastructure
  - cloud
  - aws
relatedResources:
  - /patterns/design/ambassador-pattern-services
  - /recipes/nginx-reverse-proxy
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configure HAProxy as a load balancer with health checks, sticky sessions, and SSL termination for resilient distribution of traffic across backend services."
  keywords:
    - haproxy
    - load balancing
    - health checks
    - ssl termination
    - high availability
---

# Load Balancing with HAProxy and Health Checks

Distribute incoming traffic across multiple backend servers using HAProxy, a high-performance TCP/HTTP load balancer. The solution below covers round-robin distribution, active health checks, sticky sessions, and SSL termination for production-grade resilience.

## When to Use This

- You run multiple application instances and need to distribute traffic evenly. See [Health Check Endpoint](/recipes/devops/health-check-endpoint) for backend health probes.
- Services must be automatically removed from rotation when unhealthy. See [Circuit Breaker](/patterns/design/circuit-breaker-pattern) for failure isolation.
- SSL termination should happen at the edge, not on each application server. See [Nginx Reverse Proxy](/recipes/api/nginx-reverse-proxy) for edge proxy patterns.

## Solution

### 1. Basic HAProxy Configuration

```haproxy
# haproxy.cfg
global
    log stdout local0
    maxconn 4096

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httpchk GET /health

frontend web_frontend
    bind *:80
    default_backend app_servers

backend app_servers
    balance roundrobin
    server web1 10.0.1.10:3000 check
    server web2 10.0.1.11:3000 check
    server web3 10.0.1.12:3000 check
```

### 2. Active Health Checks

```haproxy
backend app_servers
    balance roundrobin
    option httpchk GET /health

    # Mark as down after 2 failed checks; up after 3 successes
    default-server inter 5s fall 2 rise 3

    server web1 10.0.1.10:3000 check
    server web2 10.0.1.11:3000 check
    server web3 10.0.1.12:3000 check
```

### 3. Sticky Sessions with Cookies

```haproxy
backend app_servers
    balance roundrobin
    cookie SERVERID insert indirect nocache

    server web1 10.0.1.10:3000 check cookie web1
    server web2 10.0.1.11:3000 check cookie web2
    server web3 10.0.1.12:3000 check cookie web3
```

### 4. SSL Termination

```haproxy
frontend web_frontend
    bind *:443 ssl crt /etc/ssl/certs/site.pem
    http-request redirect scheme https unless { ssl_fc }
    default_backend app_servers
```

### 5. Stats Dashboard

```haproxy
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
```

## How It Works

- **Frontend** listens on a port and receives client connections
- **Backend** defines the pool of servers and balancing algorithm
- **Health checks** send periodic requests; failing servers are removed
- **Cookie insertion** pins a user to a specific backend for session affinity

## Variation: Weighted Load Balancing

```haproxy
backend app_servers
    balance roundrobin
    server web1 10.0.1.10:3000 check weight 3
    server web2 10.0.1.11:3000 check weight 2
    server web3 10.0.1.12:3000 check weight 1
```

## Production Considerations

- Run HAProxy in active-passive with keepalived for failover
- Use `leastconn` for long-lived WebSocket connections
- Enable compression with `compression algo gzip`

## Common Mistakes

- Forgetting to expose a `/health` endpoint in applications
- Using source IP affinity behind NAT where all clients share one IP
- Not monitoring the stats page for backend degradation

## FAQ

**Q: How is this different from Nginx?**
A: HAProxy specializes in layer 4/7 load balancing with superior health check granularity. Nginx is a general-purpose web server that also proxies.

**Q: Can I use HAProxy with Docker?**
A: Yes. Use the official `haproxy` image and mount your `haproxy.cfg` as a volume.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
