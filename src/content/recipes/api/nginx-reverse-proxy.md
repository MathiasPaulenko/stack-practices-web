---
contentType: recipes
slug: nginx-reverse-proxy
title: "Configure Nginx as a Reverse Proxy and API Gateway"
description: "How to use Nginx as a reverse proxy for backend services, implement load balancing, SSL termination, and rate limiting for production API gateways"
metaDescription: "Nginx reverse proxy and API gateway. Configure load balancing, SSL termination, rate limiting, and path-based routing for backend services in production."
difficulty: intermediate
topics:
  - api
  - infrastructure
tags:
  - nginx
  - api-gateway
  - load-balancer
  - api
  - rest
relatedResources:
  - /recipes/performance/brotli-nginx-compression
  - /recipes/devops/terraform-aws-vpc
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Nginx reverse proxy and API gateway. Configure load balancing, SSL termination, rate limiting, and path-based routing for backend services in production."
  keywords:
    - nginx reverse proxy
    - api gateway
    - load balancing
    - ssl termination
    - rate limiting
---

# Configure Nginx as a Reverse Proxy and API Gateway

Nginx is a high-performance web server that excels as a reverse proxy and API gateway. It handles SSL termination, load balancing across multiple backends, path-based routing, and rate limiting — all with minimal memory overhead and predictable performance under high concurrency.

## When to Use This

- You need to expose multiple backend services through a single entry point
- SSL/TLS termination should happen at the edge, not in application code. See [Security Guide](/guides/security/security-best-practices-guide) for what works for TLS.
- You want to add [rate limiting](/recipes/api/api-rate-limiting-redis), caching, or request rewriting without modifying backends

## Prerequisites

- Nginx 1.18+ installed
- Backend services running on known ports or hostnames

## Solution

### 1. Basic Reverse Proxy

```nginx
# /etc/nginx/sites-available/api
server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 2. Path-Based Routing to Multiple Services

```nginx
# /etc/nginx/sites-available/gateway
server {
  listen 80;
  server_name gateway.example.com;

  # User service
  location /api/users/ {
    proxy_pass http://user-service:8080/;
    proxy_set_header Host $host;
  }

  # Order service
  location /api/orders/ {
    proxy_pass http://order-service:8081/;
    proxy_set_header Host $host;
  }

  # Payment service
  location /api/payments/ {
    proxy_pass http://payment-service:8082/;
    proxy_set_header Host $host;
  }

  # Static assets from CDN
  location /assets/ {
    proxy_pass https://cdn.example.com/;
    proxy_cache_valid 200 1h;
  }
}
```

### 3. Load Balancing with Health Checks

```nginx
# /etc/nginx/conf.d/upstreams.conf
upstream user_service {
  least_conn;

  server 10.0.1.10:8080 weight=5;
  server 10.0.1.11:8080 weight=5;
  server 10.0.1.12:8080 backup;

  keepalive 32;
}

server {
  location /api/users/ {
    proxy_pass http://user_service/;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
  }
}
```

### 4. Rate Limiting

```nginx
# /etc/nginx/conf.d/rate-limit.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
  location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_conn addr 10;
    limit_req_status 429;

    proxy_pass http://backend/;
  }
}
```

### 5. SSL Termination with Let's Encrypt

```nginx
# /etc/nginx/sites-available/api-ssl
server {
  listen 80;
  server_name api.example.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.example.com;

  ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
  ssl_prefer_server_ciphers on;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

### 6. Response Caching

```nginx
# /etc/nginx/conf.d/cache.conf
proxy_cache_path /var/cache/nginx/api
  levels=1:2
  keys_zone=api_cache:10m
  max_size=1g
  inactive=60m
  use_temp_path=off;

server {
  location /api/public/ {
    proxy_cache api_cache;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    proxy_cache_valid 200 10m;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating;
    add_header X-Cache-Status $upstream_cache_status;

    proxy_pass http://backend/;
  }

  # Do not cache authenticated endpoints
  location /api/private/ {
    proxy_pass http://backend/;
    proxy_set_header Cache-Control "no-store";
  }
}
```

### 7. WebSocket Proxy

```nginx
# /etc/nginx/sites-available/ws
server {
  listen 80;
  server_name ws.example.com;

  location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
  }
}
```

### 8. Weighted Load Balancing with Fallback

```nginx
upstream api_backend {
  # Primary: 3 instances with equal weight
  server 10.0.1.10:8080 weight=3;
  server 10.0.1.11:8080 weight=3;
  server 10.0.1.12:8080 weight=3;

  # Secondary: 2 instances with lower weight for canary
  server 10.0.1.20:8080 weight=1;
  server 10.0.1.21:8080 weight=1;

  # Backup: only used when all primaries fail
  server 10.0.2.10:8080 backup;

  keepalive 64;
  keepalive_timeout 60s;
}

server {
  location /api/ {
    proxy_pass http://api_backend/;
    proxy_next_upstream error timeout http_502 http_503 http_504;
    proxy_next_upstream_tries 3;
    proxy_next_upstream_timeout 10s;
  }
}
```

### 9. Compression with Brotli

```nginx
# Requires ngx_brotli module
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript
  text/xml application/xml application/xml+rss text/javascript;

server {
  location /api/ {
    proxy_pass http://backend/;
    brotli on;
    brotli_min_length 1024;
  }
}
```

## Variants

| Feature | Nginx OSS | Nginx Plus | Traefik | Kong |
|---------|-----------|------------|---------|------|
| Load balancing | Round-robin, least_conn, ip_hash | + Active health checks, slow start | Round-robin, weighted | Round-robin, consistent hashing |
| SSL termination | Yes | Yes + cert rotation | Yes (ACME) | Yes |
| Rate limiting | `limit_req` module | Yes | Yes (middleware) | Yes (plugins) |
| Service discovery | Static upstreams | DNS + etcd | Docker, K8s, Consul | K8s, Consul |
| Dashboard | No | Yes (live dashboard) | Yes (web UI) | Yes (admin API) |
| API key auth | Custom Lua / auth_request | Yes | Yes (middleware) | Yes (plugins) |

## How It Works

1. **Reverse Proxy** forwards client requests to backend services
2. **Path Routing** maps URL prefixes to different upstream services
3. **Load Balancing** distributes traffic across healthy backend instances
4. **Rate Limiting** prevents abuse using token bucket algorithms
5. **SSL Termination** decrypts HTTPS traffic at the edge for backend efficiency

## Production Considerations

- Enable **HTTP/2** on the frontend for multiplexed connections
- Use **keepalive** connections to backends to reduce TCP overhead
- Implement **sticky sessions** only when necessary; prefer stateless design
- Monitor **upstream health** with active checks or passive failure detection. See [API Logging and Audit](/recipes/api/api-logging-audit) for health check logging.
- Set **access logs** with custom format to capture upstream response time: `log_format upstream '$remote_addr - $request_time $upstream_response_time $status';`
- Use **open file cache** for static assets: `open_file_cache max=1000 inactive=20s; open_file_cache_valid 30s;`
- Configure **client body limits**: `client_max_body_size 10m;` for APIs that accept file uploads
- Enable **gzip** for text responses: `gzip on; gzip_types application/json text/css;`
- Set **server tokens off** to hide Nginx version from response headers

## Common Mistakes

- Not preserving `Host` and `X-Forwarded-*` headers, breaking backend routing
- Using `ip_hash` load balancing without considering NATed clients
- Forgetting to increase `worker_connections` for high-traffic deployments
- Setting `proxy_read_timeout` too low for long-polling or streaming endpoints
- Not configuring `proxy_buffering off` for Server-Sent Events (SSE) — buffering breaks real-time streaming
- Using `proxy_pass` with inconsistent trailing slashes across location blocks, causing path duplication or truncation
- Not setting `client_max_body_size` for file upload endpoints, causing 413 errors
- Forgetting to reload Nginx after config changes with `nginx -s reload`

## FAQ

**Q: Should I use Nginx or an API gateway like Kong or Traefik?**
A: Nginx is sufficient for routing, SSL, and rate limiting. Use Kong or Traefik when you need plugins, service discovery, or Kubernetes-native capabilities.

**Q: How do I handle WebSocket connections through Nginx?**
A: Add `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` to the location block.

**Q: Can Nginx cache API responses?**
A: Yes. Use `proxy_cache` with cache keys based on URL and authorization headers. Be cautious with authenticated endpoints.

**Q: How do I tune Nginx worker processes for high traffic?**
A: Set `worker_processes auto;` to match CPU cores. Increase `worker_connections` (e.g., 10240) for high-traffic deployments. Use `worker_rlimit_nofile` to match. Enable `multi_accept on` for burst traffic. Monitor with `nginx -T` and adjust based on connection metrics.

**Q: What is the difference between `proxy_pass` with and without a trailing slash?**
A: With a trailing slash (`proxy_pass http://backend/;`), Nginx strips the matched location prefix before forwarding. Without it (`proxy_pass http://backend;`), the full URI is forwarded. This is a common source of routing bugs — test carefully.

**Q: How do I implement blue-green deployments with Nginx?**
A: Use two upstream blocks (blue and green) and switch the `proxy_pass` target. Or use weighted load balancing to gradually shift traffic: start with `weight=10` for blue and `weight=0` for green, then increment green and decrement blue. Use `proxy_next_upstream` to handle failures during the switch.

**Q: How do I block specific IPs or user agents?**
A: Use `deny` and `allow` directives for IP blocking. For user agents, use `if` with `$http_user_agent` or map-based blocking. Example: `deny 192.168.1.100;` inside a location block. For大规模 blocking, use a map with an IP list file and `include` it.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
