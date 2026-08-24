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
lastUpdated: "2026-08-22"
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

In a microservices architecture, clients often end up talking to a dozen different services, each with
its own endpoint, protocol, and auth rules. Exposing that directly gets messy fast: every client has
to track service locations, handle retries, and juggle separate tokens. When a service moves or a new
one appears, every client needs an update.

An API gateway sits in front and becomes the single entry point. Clients call one URL, then the
gateway forwards the request to the right backend. It also handles cross-cutting concerns —
authentication, [rate limiting](/recipes/rate-limiting/), SSL termination, and request/response
transformation — so internal services don't have to.

## When to Use

An API gateway starts to pay off once several backend services are exposed to clients, auth and rate
limiting need to be centralized, or different client types like web, mobile, and IoT need different
API shapes. It's also useful during a monolith-to-microservices migration because you can keep the
external contract stable while the internal topology changes. And if you want a single GraphQL API
backed by REST microservices, the gateway is the natural place for that layer.

## When NOT to Use

A gateway is overkill for one or two services; a reverse proxy or load balancer handles that fine.
Skip it if the team isn't ready to operate it as critical infrastructure with HA and monitoring, if
business logic keeps leaking into the gateway, or if the project is small and the operational
overhead isn't justified.

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

At its core, the gateway is a router. It maps an incoming path to the right backend: a request to
`/api/v1/users` goes to the user service, which can move or scale without the client knowing.

Cross-cutting concerns such as auth, rate limiting, and caching belong at the edge. Handle them once
there and you avoid repeating the same logic in every service.

A GraphQL gateway can fan out several REST requests to microservices and assemble a single typed
response for clients. That's protocol translation in practice.

The gateway also terminates SSL, so internal services can talk over plain HTTP inside the trusted
network.

## Variants

| Type | Management | Best for | Trade-off |
| --- | --- | --- | --- |
| Self-hosted (Kong, Traefik) | Full control | On-prem, compliance | Operational overhead |
| Managed (AWS, Azure, GCP) | Serverless | Cloud-native, scaling | Vendor lock-in, cost |
| Custom built | Maximum flexibility | Unique requirements | Development cost |
| Service mesh (Istio ingress) | Kubernetes-native | K8s clusters | Complexity |

## Best Practices

- Put [circuit breakers](/recipes/circuit-breaker-pattern/) at the gateway to stop forwarding
    traffic to failing backends.
- Use path versioning such as `/api/v1/users` instead of header versioning. It keeps routing
    explicit and cache keys simple.
- Centralize observability: inject trace IDs at the edge and propagate them downstream.
- Offload authentication by validating JWTs or API keys at the gateway, then pass user context
    headers to the backends.
- Cache read-heavy endpoints such as product catalogs and configuration data at the edge.

## Common Mistakes

- Treating the gateway as a service and putting business logic there. Keep routing, auth, and rate
    limiting at the edge; business rules belong in domain services.
- Shipping without per-route timeouts or retry rules. Define timeouts and retry only idempotent
    operations.
- Operating one gateway instance. Use at least two instances behind a [load
    balancer](/recipes/load-balancing/) with health checks.
- Ignoring client-specific needs. Mobile clients often need smaller payloads than web apps, so a
    backend-for-frontend (BFF) gateway can be a better fit.

## FAQ

### Should I use an API gateway or a service mesh?

Use a gateway for north-south traffic — external clients into the cluster. Use a [service
mesh](/recipes/service-mesh/) for east-west traffic — services talking to each other inside the
cluster. They complement each other.

### How do I handle GraphQL in a gateway?

Use a dedicated GraphQL gateway like Apollo Router or Hasura. Each microservice owns a subgraph, and
the gateway stitches them into a supergraph.

### Does a gateway add latency?

It does, but a well-tuned gateway adds only about 1–5 ms. The benefits — caching, connection pooling,
and centralized auth — typically reduce end-to-end latency overall.

### How do I secure service-to-service calls behind a gateway?

The gateway checks external tokens at the edge. For service-to-service calls behind it, use mTLS or
signed internal tokens. Don't trust user-facing auth headers for internal communication.
