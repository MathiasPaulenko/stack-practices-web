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
relatedResources:
  - /recipes/performance/brotli-nginx-compression
  - /recipes/devops/terraform-aws-vpc
  - /guides/api-design-guide
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
- SSL/TLS termination should happen at the edge, not in application code. See [Security Guide](/guides/security/security-best-practices-guide) for TLS best practices.
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

## Common Mistakes

- Not preserving `Host` and `X-Forwarded-*` headers, breaking backend routing
- Using `ip_hash` load balancing without considering NATed clients
- Forgetting to increase `worker_connections` for high-traffic deployments

## FAQ

**Q: Should I use Nginx or an API gateway like Kong or Traefik?**
A: Nginx is sufficient for routing, SSL, and rate limiting. Use Kong or Traefik when you need plugins, service discovery, or Kubernetes-native features.

**Q: How do I handle WebSocket connections through Nginx?**
A: Add `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` to the location block.

**Q: Can Nginx cache API responses?**
A: Yes. Use `proxy_cache` with cache keys based on URL and authorization headers. Be cautious with authenticated endpoints.
