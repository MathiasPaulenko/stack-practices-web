---
contentType: patterns
slug: gateway-routing-pattern
title: "Gateway Routing Pattern"
description: "Route requests to multiple backend services through a single entry point that handles cross-cutting concerns."
metaDescription: "Route client requests to multiple services with the Gateway Routing Pattern. Centralize SSL, authentication, rate limiting, and load balancing."
difficulty: intermediate
category: architectural
topics:
  - architecture
  - infrastructure
  - api
tags:
  - gateway-routing
  - pattern
  - api-gateway
  - architecture
  - microservices
relatedResources:
  - /guides/api-gateway-design-guide
  - /patterns/anti-corruption-layer-pattern
  - /patterns/backend-for-frontend-pattern
  - /patterns/strangler-fig-pattern
  - /guides/rest-api-design-guide
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Route client requests to multiple services with the Gateway Routing Pattern. Centralize SSL, authentication, rate limiting, and load balancing."
  keywords:
    - gateway-routing
    - pattern
    - api-gateway
    - architecture
    - microservices
---
## Overview

The Gateway Routing Pattern places a single entry point in front of multiple backend services. Instead of exposing every service directly to clients, the gateway receives requests and routes them to the appropriate upstream based on path, method, headers, or other rules. It also centralizes cross-cutting concerns such as TLS termination, authentication, rate limiting, and logging.

This pattern is essential for microservices and modular architectures where you want a clean external contract while allowing internal services to evolve independently.

## When to Use

Use this pattern when:
- You have multiple backend services that clients must reach through a single address
- You need to enforce TLS, authentication, or rate limiting in one place
- You want to route traffic by URL path, host, or API version without changing clients
- You are migrating from a monolith to microservices and need to hide internal changes
- You need to compose responses from several services or apply protocol translation

## Solution

```typescript
// Simplified gateway route configuration (Express-style)
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use('/users', createProxyMiddleware({
  target: 'http://users-service:3001',
  changeOrigin: true,
}));

app.use('/orders', createProxyMiddleware({
  target: 'http://orders-service:3002',
  changeOrigin: true,
}));

app.use('/inventory', createProxyMiddleware({
  target: 'http://inventory-service:3003',
  changeOrigin: true,
}));

app.listen(3000, () => console.log('Gateway listening on port 3000'));
```

```yaml
# Example NGINX location-based routing
server {
  listen 443 ssl;
  server_name api.example.com;

  location /users {
    proxy_pass http://users-service;
  }

  location /orders {
    proxy_pass http://orders-service;
  }

  location /inventory {
    proxy_pass http://inventory-service;
  }
}
```

## Explanation

The Gateway Routing Pattern works by inserting a reverse proxy or dedicated gateway between clients and services. The gateway maintains a routing table that maps incoming request characteristics to upstream destinations. When a request arrives, the gateway matches it against the table, applies any middleware, and forwards the request. Responses travel back through the gateway, which can transform headers or cache results.

Key responsibilities of the gateway include:
- **Routing**: match requests to services based on path, host, headers, or version
- **Load balancing**: distribute requests across healthy upstream instances
- **Security**: terminate TLS, validate tokens, and enforce rate limits
- **Observability**: collect metrics and logs for all traffic

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **API Gateway** | Expose public APIs to external clients | Centralized but can become a bottleneck |
| **Backend for Frontend** | Tailor APIs for web, mobile, or partner clients | Adds a service per client type |
| **Edge Gateway** | Handle TLS, DDoS, and caching at the network edge | Simplifies origins but adds vendor dependency |
| **Internal Gateway** | Route traffic inside a cluster with mTLS | Keeps traffic private and secure |

## What Works

- Keep the gateway **stateless** so it can scale horizontally
- Store routing rules in **configuration** rather than hard-coding them
- Use **health checks** to avoid routing to failed upstream services
- **Offload TLS** at the gateway to reduce certificate complexity in services
- Limit gateway logic to **cross-cutting concerns**; avoid business logic
- Log request IDs and **correlation IDs** for distributed tracing

## Common Mistakes

- Putting **business logic** in the gateway, making it hard to maintain
- Routing every microservice through a single gateway without **scaling** it
- Ignoring **timeout and retry** settings, causing cascading failures
- Forgetting to **validate TLS certificates** on upstream connections
- Routing based on fragile rules such as query strings that change frequently

## Frequently Asked Questions

**Q: What is the difference between Gateway Routing and an API Gateway?**
A: Gateway Routing is the routing capability. An API Gateway usually adds authentication, rate limiting, transformation, and developer portal capabilities on top of routing.

**Q: Should the gateway handle retries?**
A: The gateway may retry safe, idempotent requests, but be careful with retries on POST or other state-changing operations to avoid duplicate work.

**Q: Can I use this pattern with serverless functions?**
A: Yes. Functions can be registered as upstream targets and routed by path or HTTP method, just like container services.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
