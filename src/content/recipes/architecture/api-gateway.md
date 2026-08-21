---
contentType: recipes
slug: api-gateway
title: "Design a Scalable API Gateway for Microservices"
description: "Build an API gateway that routes requests, handles authentication, rate limiting, caching, and protocol translation between clients and backend microservices."
metaDescription: "Learn API gateway design for microservices. Route requests, handle auth, rate limiting, caching, and protocol translation between clients and backend services."
difficulty: intermediate
topics:
  - architecture
  - api
tags:
  - architecture
  - api
  - api-gateway
  - microservices
  - authentication
  - rate-limiting
  - caching
  - routing
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/rate-limiting
  - /recipes/jwt-authentication
  - /recipes/circuit-breaker-pattern-recipe
  - /recipes/service-mesh
lastUpdated: "2026-08-19"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Learn API gateway design for microservices. Route requests, handle auth, rate limiting, caching, and protocol translation between clients and backend services."
  keywords:
    - api gateway
    - microservices gateway
    - request routing
    - gateway pattern
    - api gateway caching
    - rate limiting
    - jwt
---

## Overview

In a microservices architecture, clients must interact with many individual services, each with
its own endpoint, protocol, and authentication requirements. Exposing these directly creates a
fragile coupling: clients must know every service location, handle retries, and manage distinct
tokens. When services are added, removed, or relocated, every client must update.

An API gateway solves this by acting as a single entry point. Clients talk to one URL. The
gateway routes requests to the right backend, handles cross-cutting concerns like
authentication, [rate limiting](/recipes/rate-limiting/), SSL termination, and request/response
transformation. It shields clients from internal topology.

## When to Use

- Operating 5+ backend services that clients access directly.
- Needing centralized authentication, rate limiting, or logging across all APIs.
- Supporting several client types (web, mobile, IoT) with different API requirements.
- Migrating from a monolith to microservices while keeping a stable external contract.
- Requiring protocol translation between GraphQL clients and REST backends.

## When NOT to Use

- You’ve got only one or two services — a simple reverse proxy or load balancer is enough.
- You aren’t ready to manage gateway failure modes and high availability.
- Business logic keeps creeping into the gateway instead of staying in domain services.
- The project is small and the extra operational overhead isn’t justified.

## Solution

### Kong Gateway (declarative)

```yaml
# kong.yml
_format_version: "3.0"
services:
  - name: user-service
    url: http://users.internal:8080
    routes:
      - name: user-routes
        paths:
          - /api/v1/users
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
      - name: jwt
        config:
          claims_to_verify:
            - exp
      - name: proxy-cache
        config:
          response_code:
            - 200
          request_method:
            - GET
          cache_ttl: 300
          strategy: memory

  - name: order-service
    url: http://orders.internal:8080
    routes:
      - name: order-routes
        paths:
          - /api/v1/orders
```

### Custom Node.js gateway

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
});
app.use('/api/', limiter);

app.use('/api/', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const services = {
  '/api/v1/users': 'http://users.internal:8080',
  '/api/v1/orders': 'http://orders.internal:8080',
};

Object.entries(services).forEach(([path, target]) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-User-Id', req.user.sub);
    },
  }));
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('Gateway running on port 3000'));
```

### Traefik with Docker labels

```yaml
# docker-compose.yml
services:
  user-service:
    image: myregistry/user-service:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.user-service.rule=PathPrefix(`/api/v1/users`)"
      - "traefik.http.routers.user-service.entrypoints=websecure"
      - "traefik.http.services.user-service.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.user-ratelimit.ratelimit.average=100"
      - "traefik.http.routers.user-service.middlewares=user-ratelimit"
```

### Apollo Router for GraphQL

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  path: /
  introspection: true

telemetry:
  exporters:
    tracing:
      otlp:
        endpoint: http://otel-collector:4317
```

## Explanation

- **Request routing**: the gateway maps incoming paths to backend services. `/api/v1/users` goes
to the user service. Backends can move without client updates.
- **Cross-cutting concerns**: auth, rate limiting, and caching are implemented once at the edge
instead of duplicated in every service.
- **Protocol translation**: a GraphQL gateway fans out several REST requests to microservices
and assembles a single typed response for clients.
- **SSL termination**: the gateway handles TLS so internal services can use plain HTTP inside a
trusted network.

## Variants

|Type|Management|Best for|Trade-off|
|----|----------|--------|---------|
|Self-hosted (Kong, Traefik)|Full control|On-prem, compliance|Operational overhead|
|Managed (AWS, Azure, GCP)|Serverless|Cloud-native, scaling|Vendor lock-in, cost|
|Custom built|Maximum flexibility|Unique requirements|Development cost|
|Service mesh (Istio ingress)|Kubernetes-native|K8s clusters|Complexity|

## Best Practices

- Implement [circuit breakers](/recipes/circuit-breaker-pattern-recipe/) at the gateway to stop
  forwarding requests to failing backends.
- Use path versioning (`/api/v1/users`) instead of headers. It makes routing explicit and
  simplifies cache keys.
- Centralize observability: inject trace IDs at the edge and propagate them downstream.
- Offload authentication: validate JWTs or API keys at the gateway and forward user context
  headers to backends.
- Cache read-heavy endpoints at the edge, such as product catalogs and configuration data.

## Common Mistakes

- **Putting business logic in the gateway**. Keep routing, auth, and rate limiting at the edge;
  business rules belong in domain services.
- **No timeout or retry strategy**. Set per-route timeouts and retry only idempotent operations.
- **Single point of failure**. Run several gateway instances behind a [load
  balancer](/recipes/load-balancing/) with health checks.
- **Ignoring client-specific needs**. Mobile apps need smaller payloads than web apps. Consider
  backend-for-frontend (BFF) gateways.

## FAQ

### Should I use an API gateway or a service mesh?

Use a gateway for north-south traffic (external clients to the cluster). Use a [service
mesh](/recipes/service-mesh/) for east-west traffic (service-to-service inside the cluster). They
are complementary.

### How do I handle GraphQL in a gateway?

Use a GraphQL gateway such as Apollo Router or Hasura. Each microservice exposes a subgraph, and
the gateway stitches them into a supergraph.

### Does a gateway add latency?

Yes, but typically 1-5 ms for a well-tuned gateway. The benefits — caching, connection pooling,
and centralized auth — usually reduce end-to-end latency.

### How do I secure service-to-service calls behind a gateway?

The gateway validates external tokens. For internal calls, use mTLS or signed internal tokens.
Never trust user-facing auth headers for internal service communication.
