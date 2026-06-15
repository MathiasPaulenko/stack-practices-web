---
contentType: recipes
slug: api-gateway
title: "Design a Scalable API Gateway for Microservices"
description: "How to build an API gateway that routes requests, handles authentication, rate limiting, caching, and protocol translation between clients and backend microservices."
metaDescription: "Learn API gateway design for microservices. Route requests, handle auth, rate limiting, caching, and protocol translation between clients and backend services."
difficulty: intermediate
topics:
  - architecture
tags:
  - api-gateway
  - microservices
  - routing
  - rate-limiting
  - caching
  - authentication
  - protocol-translation
  - load-balancing
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/rate-limiting
  - /recipes/jwt-authentication
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn API gateway design for microservices. Route requests, handle auth, rate limiting, caching, and protocol translation between clients and backend services."
  keywords:
    - api gateway
    - microservices gateway
    - request routing
    - gateway pattern
    - api gateway caching
---

## Overview

In a microservices architecture, clients must interact with dozens of individual services — each with its own endpoint, protocol, and authentication requirements. Exposing these directly creates a fragile coupling: a mobile app must know the location of every service, handle retries across multiple connections, and manage distinct auth tokens. When services are added, removed, or relocated, every client must update.

An API gateway solves this by acting as a single entry point. Clients talk to one URL. The gateway routes requests to the appropriate backend service, handles cross-cutting concerns like authentication, rate limiting, SSL termination, and request/response transformation. It shields clients from the complexity of the internal topology. This recipe covers gateway patterns, routing strategies, and implementation examples using Kong, AWS API Gateway, and a custom Node.js gateway.

## When to use it

Use this recipe when:

- Operating 5+ backend services that clients must access directly
- Needing centralized authentication, rate limiting, or logging across all APIs
- Supporting multiple client types (web, mobile, IoT) with different API requirements
- Migrating from a monolith to microservices while maintaining a stable external contract
- Requiring protocol translation between GraphQL clients and REST backends

## Solution

### Kong Gateway Configuration (Declarative)

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
          uri_param_names: []
          cookie_names: []
          key_claim_name: iss
          secret_is_base64: false
          claims_to_verify:
            - exp
      - name: proxy-cache
        config:
          response_code:
            - 200
          request_method:
            - GET
          content_type:
            - application/json
          cache_ttl: 300
          strategy: memory

  - name: order-service
    url: http://orders.internal:8080
    routes:
      - name: order-routes
        paths:
          - /api/v1/orders
    plugins:
      - name: rate-limiting
        config:
          minute: 60
      - name: request-transformer
        config:
          add:
            headers:
              - X-Request-Source:gateway
```

### AWS API Gateway with Lambda Authorizer (Terraform)

```hcl
resource "aws_api_gateway_rest_api" "api" {
  name = "microservices-gateway"
}

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_method" "users_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.lambda_auth.id
}

resource "aws_api_gateway_authorizer" "lambda_auth" {
  name                   = "jwt-validator"
  rest_api_id            = aws_api_gateway_rest_api.api.id
  authorizer_uri         = aws_lambda_function.authorizer.invoke_arn
  identity_source        = "method.request.header.Authorization"
  type                   = "TOKEN"
}

resource "aws_api_gateway_integration" "users_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.users_get.http_method
  type        = "HTTP_PROXY"
  uri         = "http://users.internal:8080/users"
  integration_http_method = "GET"
}
```

### Custom Node.js Gateway

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Authentication middleware
app.use('/api/', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Service routing
const services = {
  '/api/v1/users': 'http://users.internal:8080',
  '/api/v1/orders': 'http://orders.internal:8080',
  '/api/v1/inventory': 'http://inventory.internal:8080',
};

Object.entries(services).forEach(([path, target]) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-User-Id', req.user.sub);
      proxyReq.setHeader('X-User-Roles', req.user.roles.join(','));
    },
  }));
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3000, () => console.log('Gateway running on port 3000'));
```

## Explanation

- **Request routing**: the gateway maps incoming URL paths to backend services. `/api/v1/users` routes to the user service, `/api/v1/orders` to the order service. This decouples clients from service locations — backends can move without client updates.
- **Cross-cutting concerns**: auth, rate limiting, logging, and caching are implemented once at the gateway layer rather than duplicated in every service. This reduces code repetition and ensures consistent policy enforcement.
- **Protocol translation**: a GraphQL gateway can aggregate REST backends into a unified schema. The gateway receives a GraphQL query, fans out multiple REST requests to microservices, and assembles the response. Clients get a single typed API while backends remain simple REST.
- **SSL termination**: the gateway handles TLS encryption/decryption. Internal service-to-service communication can use plain HTTP inside a trusted VPC, reducing computational overhead and certificate management complexity.

## Variants

| Type | Management | Best for | Trade-off |
|------|------------|----------|-----------|
| Self-hosted (Kong, Traefik) | Full control | On-prem, compliance | Operational overhead |
| Managed (AWS, Azure, GCP) | Serverless | Cloud-native, scaling | Vendor lock-in, cost |
| Custom built | Maximum flexibility | Unique requirements | Development cost |
| Service mesh (Istio ingress) | Kubernetes-native | K8s clusters | Complexity |

## Best practices

- **Implement circuit breakers at the gateway**: if a backend service is failing, the gateway should stop forwarding requests and return a cached response or 503. This prevents cascading failures and gives struggling services time to recover.
- **Use path versioning**: include API version in the path (`/api/v1/users`) rather than headers. This makes routing explicit, supports multiple versions simultaneously, and simplifies cache key generation.
- **Centralize observability**: the gateway is the ideal place for distributed tracing, metrics, and logging. Inject trace IDs at the edge and propagate them to all downstream services. Every request flows through the gateway — use that visibility.
- **Offload authentication**: validate JWTs or API keys at the gateway. Forward only authenticated requests with user context headers to backends. Services should not need to validate tokens themselves, but they must still enforce authorization.
- **Cache aggressively at the edge**: read-heavy endpoints like product catalogs, user profiles, and configuration data should be cached at the gateway with short TTLs. This reduces backend load and improves response times dramatically.

## Common mistakes

- **Putting business logic in the gateway**: the gateway should route, authenticate, and rate limit — not calculate prices, apply discounts, or validate business rules. Business logic belongs in domain services. A bloated gateway becomes a new monolith.
- **No timeout or retry strategy**: forwarding requests without timeout budgets causes threads to block indefinitely when a backend is slow. Set per-route timeouts and implement retries with backoff only for idempotent operations.
- **Single point of failure**: a single gateway instance is a bottleneck. Deploy multiple instances behind a load balancer with health checks. Use blue/green or canary deployments for gateway updates to prevent downtime.
- **Ignoring client-specific needs**: mobile apps need smaller payloads and fewer round trips than web apps. Implement backend-for-frontend (BFF) gateways — one optimized for mobile, one for web — rather than forcing all clients through a generic API.

## FAQ

**Q: Should I use an API gateway or a service mesh?**
A: Use a gateway for north-south traffic (external clients to cluster). Use a service mesh for east-west traffic (service-to-service inside the cluster). They are complementary. The gateway handles ingress; the mesh handles internal routing, mTLS, and observability.

**Q: How do I handle GraphQL in a gateway?**
A: Use a GraphQL gateway (Apollo Router, Hasura) that composes subgraphs from multiple services. Each microservice exposes a GraphQL subgraph. The gateway stitches them into a supergraph and routes queries to the appropriate service.

**Q: Does a gateway add latency?**
A: Yes, but typically 1-5ms for well-tuned gateways. The benefits — caching, connection pooling, centralized auth — usually reduce overall latency. A request that hits a gateway cache avoids a 50ms database call entirely.

**Q: How do I secure service-to-service calls behind a gateway?**
A: The gateway validates external tokens. For internal calls, use mTLS (service mesh) or signed internal tokens. Never trust user-facing auth headers for internal service communication — an attacker who compromises one service could forge them.

