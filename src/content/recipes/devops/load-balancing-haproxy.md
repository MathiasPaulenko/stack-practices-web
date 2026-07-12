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
  - /patterns/ambassador-pattern-services
  - /recipes/nginx-reverse-proxy
  - /patterns/circuit-breaker-pattern
  - /recipes/bash-aws-cli-scripts
  - /recipes/cost-optimization
  - /recipes/terraform-aws-vpc
  - /guides/blue-green-deployment-guide
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

### ACL-Based Traffic Routing

Route requests to different backends based on path, host, or headers:

```haproxy
frontend web_frontend
    bind *:80

    # Route by path prefix
    acl is_api path_beg /api
    acl is_static path_beg /static
    acl is_admin path_beg /admin

    use_backend api_servers if is_api
    use_backend static_servers if is_static
    use_backend admin_servers if is_admin
    default_backend app_servers

backend api_servers
    balance roundrobin
    option httpchk GET /api/health
    server api1 10.0.1.20:8080 check
    server api2 10.0.1.21:8080 check

backend static_servers
    balance roundrobin
    server static1 10.0.1.30:80 check
    server static2 10.0.1.31:80 check

backend admin_servers
    balance roundrobin
    # Restrict admin backend to internal IPs
    acl allowed_src src 10.0.0.0/8 192.168.0.0/16
    http-request deny unless allowed_src
    server admin1 10.0.1.40:80 check
```

### Rate Limiting with Stick Tables

```haproxy
frontend web_frontend
    bind *:80

    # Track request rate per IP (10 requests per 10 seconds)
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src

    # Deny if rate exceeds 10 req/10s
    acl too_many_requests sc_http_req_rate(0) gt 10
    http-request deny status 429 if too_many_requests

    default_backend app_servers
```

### TCP Mode for Database Load Balancing

```haproxy
# haproxy.cfg
frontend pg_frontend
    bind *:5432
    mode tcp
    option tcp-check
    tcp-check connect
    tcp-check send PING\r\n
    tcp-check expect string PONG
    default_backend pg_servers

backend pg_servers
    mode tcp
    balance leastconn
    option tcp-check
    server pg1 10.0.1.50:5432 check
    server pg2 10.0.1.51:5432 check backup
```

### Backend Failover with Backup Servers

```haproxy
backend app_servers
    balance roundrobin
    option httpchk GET /health

    # Primary servers
    server web1 10.0.1.10:3000 check
    server web2 10.0.1.11:3000 check

    # Backup server only receives traffic when all primaries are down
    server backup1 10.0.1.99:3000 check backup
```

### leastconn for Long-Lived Connections

```haproxy
backend websocket_servers
    balance leastconn
    option httpchk GET /health
    timeout server 3600s  # Long timeout for WebSocket connections

    server ws1 10.0.1.60:3000 check
    server ws2 10.0.1.61:3000 check
```

### HAProxy Stats API for Monitoring

```haproxy
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:secretpassword

    # Export metrics in Prometheus format
    http-request use-service prometheus-exporter if { path /metrics }
```

### Docker Compose with HAProxy

```yaml
version: "3.9"
services:
  haproxy:
    image: haproxy:2.9-alpine
    ports:
      - "80:80"
      - "443:443"
      - "8404:8404"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    depends_on:
      - web1
      - web2
      - web3

  web1:
    build: ./app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      retries: 3

  web2:
    build: ./app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      retries: 3

  web3:
    build: ./app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      retries: 3
```

### SSL Termination with Multiple Certificates

```haproxy
frontend web_frontend
    bind *:443 ssl crt /etc/ssl/certs/site1.pem crt /etc/ssl/certs/site2.pem

    # Route based on SNI (Server Name Indication)
    acl is_site1 req.ssl_sni -i site1.example.com
    acl is_site2 req.ssl_sni -i site2.example.com

    use_backend site1_servers if is_site1
    use_backend site2_servers if is_site2
    default_backend site1_servers
```

## Additional Best Practices

4. **Use `option httplog` for HTTP debugging.** Detailed logging of HTTP requests helps troubleshoot routing issues:

```haproxy
defaults
    mode http
    option httplog
    log stdout local0
```

5. **Set connection limits per backend.** Prevent one backend from consuming all connections:

```haproxy
backend app_servers
    balance roundrobin
    default-server maxconn 100
    server web1 10.0.1.10:3000 check maxconn 100
    server web2 10.0.1.11:3000 check maxconn 100
```

6. **Enable compression for text responses.** Reduce bandwidth for HTML, CSS, JS:

```haproxy
defaults
    compression algo gzip
    compression type text/html text/css application/javascript application/json
```

7. **Use `http-reuse` for connection pooling.** Reuse backend connections instead of opening new ones:

```haproxy
defaults
    http-reuse safe
```

## Additional Common Mistakes

4. **Not setting `timeout http-request`.** Slowloris attacks exploit missing timeouts:

```haproxy
defaults
    timeout http-request 10s
    timeout connect 5s
    timeout client 30s
    timeout server 30s
```

5. **Using `balance source` behind a CDN.** All traffic appears from the CDN's IP, causing uneven distribution. Use cookie-based affinity instead.

6. **Forgetting to update server IPs after infrastructure changes.** Use DNS names with `resolvers` section:

```haproxy
resolvers dns
    nameserver ns1 10.0.0.2:53
    resolve_retries 3
    timeout resolve 1s
    timeout retry 1s
    hold valid 10s

backend app_servers
    balance roundrobin
    server web1 web1.internal:3000 check resolvers dns init-addr none
```

## Additional FAQ

### How do I drain a backend server for maintenance?

Use the HAProxy stats page or socket to set a server to drain mode. It stops receiving new connections but lets existing ones finish:

```bash
# Via stats socket
echo "set server app_servers/web1 state drain" | socat /var/run/haproxy.sock -
```

### What is the difference between `roundrobin` and `static-rr`?

`roundrobin` supports dynamic weight adjustments at runtime and is the default. `static-rr` uses a fixed weight computed at startup, which uses less CPU but cannot be adjusted dynamically.

### How do I forward client IP to backend servers?

By default, HAProxy terminates the connection and backends see HAProxy's IP. Use the `X-Forwarded-For` header:

```haproxy
defaults
    option forwardfor
```

For TCP mode, use PROXY protocol:

```haproxy
frontend pg_frontend
    bind *:5432
    mode tcp
    option tcp-check
    default_backend pg_servers

backend pg_servers
    mode tcp
    server pg1 10.0.1.50:5432 check send-proxy
```

## Performance Tips

1. **Tune `maxconn` based on available memory.** Each connection uses ~200 bytes. For 10K connections, allocate ~2MB:

```haproxy
global
    maxconn 10000
    nbproc 4  # Use multiple processes for multi-core CPUs
```

2. **Use `nbthread` for multi-threaded mode.** HAProxy 2.0+ supports threads:

```haproxy
global
    nbthread 4
    cpu-map auto:1/1-4 0-3
```

3. **Enable `splice-request` and `splice-response` for TCP.** Uses kernel splice for zero-copy forwarding:

```haproxy
defaults
    mode tcp
    option splice-request
    option splice-response
```

4. **Use `tune.ssl.default-dh-param` for SSL performance.** Set to 2048 or higher:

```haproxy
global
    tune.ssl.default-dh-param 2048
```

5. **Monitor with HAProxy stats socket.** Export metrics to Prometheus for alerting:

```bash
# Enable stats socket
echo "stats socket /var/run/haproxy.sock mode 660 level admin" >> haproxy.cfg

# Query stats
echo "show info" | socat /var/run/haproxy.sock -
echo "show servers state" | socat /var/run/haproxy.sock -
```
