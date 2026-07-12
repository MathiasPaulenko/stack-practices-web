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
  - architecture
  - api-gateway
  - authentication
  - design
  - patterns
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/rate-limiting
  - /recipes/jwt-authentication
  - /recipes/multi-tenancy
  - /recipes/service-discovery
  - /recipes/circuit-breaker-pattern-recipe
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

An API gateway solves this by acting as a single entry point. Clients talk to one URL. The gateway routes requests to the appropriate backend service, handles cross-cutting concerns like authentication, rate limiting, SSL termination, and request/response transformation. It shields clients from the complexity of the internal topology. The solution below covers gateway patterns, routing strategies, and implementation examples using Kong, AWS API Gateway, and a custom Node.js gateway.

## When to use it

Use this recipe when:

- Operating 5+ backend services that clients must access directly
- Needing centralized [authentication](/recipes/authentication/jwt-authentication), [rate limiting](/recipes/api/api-rate-limiting-redis), or logging across all APIs
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

## What Works

- **Implement [circuit breakers](/recipes/circuit-breaker-pattern-recipe) at the gateway**: if a backend service is failing, the gateway should stop forwarding requests and return a cached response or 503. This prevents cascading failures and gives struggling services time to recover.
- **Use path versioning**: include API version in the path (`/api/v1/users`) rather than headers. This makes routing explicit, supports multiple versions simultaneously, and simplifies cache key generation.
- **Centralize observability**: the gateway is the ideal place for distributed tracing, metrics, and logging. Inject trace IDs at the edge and propagate them to all downstream services. Every request flows through the gateway — use that visibility.
- **Offload authentication**: [validate JWTs](/recipes/authentication/jwt-authentication) or API keys at the gateway. Forward only authenticated requests with user context headers to backends. Services should not need to validate tokens themselves, but they must still enforce authorization.
- **Cache aggressively at the edge**: read-heavy endpoints like product catalogs, user profiles, and configuration data should be cached at the gateway with short TTLs. This reduces backend load and improves response times dramatically.

## Common mistakes

- **Putting business logic in the gateway**: the gateway should route, authenticate, and rate limit — not calculate prices, apply discounts, or validate business rules. Business logic belongs in domain services. A bloated gateway becomes a new monolith.
- **No timeout or retry strategy**: forwarding requests without timeout budgets causes threads to block indefinitely when a backend is slow. See [Retry Logic](/recipes/architecture/retry-backoff) for backoff strategies. Set per-route timeouts and implement retries with backoff only for idempotent operations.
- **Single point of failure**: a single gateway instance is a bottleneck. Deploy multiple instances behind a [load balancer](/recipes/api/nginx-reverse-proxy) with health checks. Use blue/green or canary deployments for gateway updates to prevent downtime.
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


### GraphQL Gateway with Apollo Router

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  path: /
  introspection: true

sandbox:
  enabled: true

homepage:
  enabled: false

health_check:
  listen: 0.0.0.0:8088

telemetry:
  instrumentation:
    spans:
      mode: spec_compliant
  exporters:
    tracing:
      propagation: tracecontext
      otlp:
        endpoint: http://otel-collector:4317
        protocol: grpc
```

```typescript
// Subgraph: user-service GraphQL schema
const userTypeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    role: String!
  }

  type Query {
    user(id: ID!): User
    users(limit: Int = 20, offset: Int = 0): [User!]!
  }

  type Mutation {
    createUser(email: String!, name: String!): User!
  }
`;
```

```typescript
// Subgraph: order-service GraphQL schema with User reference
const orderTypeDefs = gql`
  type Order {
    id: ID!
    userId: ID!
    total: Float!
    status: OrderStatus!
    user: User @provides(fields: "name")
  }

  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    DELIVERED
    CANCELLED
  }

  type Query {
    orders(userId: ID!): [Order!]!
    order(id: ID!): Order
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    name: String @external
    orders: [Order!]!
  }
`;
```

### Request Aggregation Pattern (Node.js)

```typescript
import express from 'express';
import axios from 'axios';

const app = express();

interface ProductDetails {
  product: any;
  reviews: any[];
  inventory: any;
}

// Aggregate multiple backend calls into a single response
app.get('/api/v1/products/:id/details', async (req, res) => {
  const productId = req.params.id;

  try {
    const [productRes, reviewsRes, inventoryRes] = await Promise.all([
      axios.get(`http://products.internal:8080/products/${productId}`, {
        timeout: 2000,
        headers: { 'X-User-Id': req.user.sub },
      }),
      axios.get(`http://reviews.internal:8080/products/${productId}/reviews`, {
        timeout: 2000,
        headers: { 'X-User-Id': req.user.sub },
      }),
      axios.get(`http://inventory.internal:8080/products/${productId}/stock`, {
        timeout: 2000,
        headers: { 'X-User-Id': req.user.sub },
      }),
    ]);

    const details: ProductDetails = {
      product: productRes.data,
      reviews: reviewsRes.data,
      inventory: inventoryRes.data,
    };

    res.json(details);
  } catch (error) {
    // Partial degradation: return what we have
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // If one service fails, return partial data
    const partial: any = {};
    try {
      partial.product = (await axios.get(
        `http://products.internal:8080/products/${productId}`,
        { timeout: 2000 }
      )).data;
    } catch {}
    try {
      partial.reviews = (await axios.get(
        `http://reviews.internal:8080/products/${productId}/reviews`,
        { timeout: 2000 }
      )).data;
    } catch { partial.reviews = []; }
    try {
      partial.inventory = (await axios.get(
        `http://inventory.internal:8080/products/${productId}/stock`,
        { timeout: 2000 }
      )).data;
    } catch { partial.inventory = { inStock: false, quantity: 0 }; }

    res.json({ ...partial, _degraded: true });
  }
});
```

### Traefik Gateway Configuration

```yaml
# traefik.yml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@stackpractices.com
      storage: /acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: gateway

api:
  dashboard: true
  insecure: false

metrics:
  prometheus:
    addEntryPointsLabels: true
    addServicesLabels: true
    entryPoint: metrics
```

```yaml
# docker-compose service labels for Traefik routing
services:
  user-service:
    image: myregistry/user-service:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.user-service.rule=PathPrefix(`/api/v1/users`)"
      - "traefik.http.routers.user-service.entrypoints=websecure"
      - "traefik.http.routers.user-service.tls.certresolver=letsencrypt"
      - "traefik.http.services.user-service.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.user-ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.user-ratelimit.ratelimit.burst=50"
      - "traefik.http.routers.user-service.middlewares=user-ratelimit"
```

## Additional Best Practices

1. **Implement request/response transformation.** Different clients may need different response formats. Use the gateway to transform responses — strip fields for mobile, add computed fields, or convert XML to JSON:

```yaml
# Kong request-transformer plugin
plugins:
  - name: response-transformer
    config:
      add:
        json:
          - _source: gateway
          - _timestamp:$(time.utc())
      remove:
        json:
          - internal_id
          - debug_info
```

2. **Use weighted routing for canary deployments.** Route a percentage of traffic to a new version of a service for testing before full rollout:

```yaml
# Kong weighted routing
services:
  - name: user-service-v1
    url: http://users-v1.internal:8080
    routes:
      - name: user-canary
        paths:
          - /api/v1/users
        hosts:
          - api.stackpractices.com
  - name: user-service-v2
    url: http://users-v2.internal:8080
    routes:
      - name: user-canary-v2
        paths:
          - /api/v1/users
        hosts:
          - api.stackpractices.com
        # 10% traffic to v2 via upstream
```

3. **Add distributed tracing headers at the edge.** Generate a trace ID for every incoming request and propagate it to all downstream services:

```javascript
const { trace, context } = require('@opentelemetry/api');
const tracer = trace.getTracer('api-gateway');

app.use('/api/', (req, res, next) => {
  const traceId = req.headers['traceparent'] || generateTraceId();
  const span = tracer.startSpan(`gateway:${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'trace.id': traceId,
    },
  });

  // Inject trace context for downstream
  req.traceId = traceId;
  req.span = span;

  // Propagate to proxy requests
  app.use((req, res, next) => {
    if (req.span) {
      req.proxyHeaders = {
        'traceparent': req.traceId,
        'x-trace-id': req.traceId,
      };
    }
    next();
  });

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
  });

  next();
});
```

## Additional Common Mistakes

1. **Not setting per-route timeout budgets.** Different endpoints have different latency profiles. A product search may need 5 seconds, while a health check needs 100ms. Set per-route timeouts:

```javascript
const routeTimeouts = {
  '/api/v1/users/search': 5000,
  '/api/v1/users/:id': 500,
  '/api/v1/orders': 2000,
  '/api/v1/inventory/stock': 1000,
  '/health': 100,
};

app.use('/api/', (req, res, next) => {
  const timeout = matchRoute(req.path, routeTimeouts) || 3000;
  req.setTimeout(timeout, () => {
    res.status(504).json({ error: 'Gateway timeout' });
  });
  next();
});
```

2. **Exposing internal error details.** Backend services may return stack traces, internal IPs, or database errors. The gateway should sanitize error responses before returning to clients:

```javascript
app.use((err, req, res, next) => {
  // Log full error internally
  logger.error('Gateway error', { error: err, path: req.path });

  // Return sanitized error to client
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({ error: 'Service unavailable' });
  }
  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({ error: 'Gateway timeout' });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

3. **Not implementing API versioning strategy.** Without versioning, breaking changes affect all clients. Use path-based versioning and support multiple versions simultaneously:

```javascript
const versions = {
  v1: {
    '/users': 'http://users-v1.internal:8080',
    '/orders': 'http://orders-v1.internal:8080',
  },
  v2: {
    '/users': 'http://users-v2.internal:8080',
    '/orders': 'http://orders-v2.internal:8080',
  },
};

function resolveBackend(path) {
  const match = path.match(/^\/api\/(v\d+)(\/.*)$/);
  if (!match) return null;
  const [, version, route] = match;
  const backend = versions[version]?.[route.split('/')[1]];
  return backend ? { backend, path: route } : null;
}
```

## Additional FAQ

### How do I test API gateway configuration?

Use contract testing to verify the gateway routes correctly. Write integration tests that send requests through the gateway and verify the response. For Kong, use `kong config parse kong.yml` to validate configuration. For Traefik, use `traefik check` to validate rules. For canary testing, use feature flags or weighted routing to test new versions with a small percentage of traffic. For load testing, use `wrk` or `k6` to generate traffic through the gateway and measure latency, throughput, and error rates. For failover testing, stop a backend service and verify the gateway returns appropriate error codes or cached responses.

### Is this solution production-ready?

Yes. Kong is used in production by Yahoo, T-Mobile, and SoulCycle for API management. AWS API Gateway is used by thousands of AWS customers including Airbnb and Samsung. Traefik is used in production by Docker, Containous, and VMware. Apollo Router is used by Netflix, Wayfair, and Expedia for GraphQL federation. The API gateway pattern is documented in the Microsoft Azure Architecture Center, NGINX documentation, and the book Building Microservices by Sam Newman.

### What are the performance characteristics?

Kong adds 1-3ms latency per request on commodity hardware. AWS API Gateway adds 5-20ms latency depending on region and integration type. Traefik adds 0.5-2ms latency for Layer 7 routing. A custom Node.js gateway adds 2-5ms for auth, rate limiting, and proxying. Request aggregation with `Promise.all` adds the latency of the slowest backend call. Caching at the gateway reduces latency to under 1ms for cache hits. SSL termination adds 0.5-1ms for TLS handshake (amortized with session resumption). GraphQL federation adds 5-15ms for query planning and subgraph fan-out. The gateway itself should handle 10K-50K requests per second with proper tuning.

### How do I debug issues with this approach?

For Kong, use the admin API (`:8001`) to inspect routes, services, and plugins. Check Kong logs for plugin errors and upstream timeouts. For AWS API Gateway, use CloudWatch Logs and X-Ray for request tracing. For Traefik, use the dashboard (`:8080`) to view routers, services, and middlewares. For custom gateways, log every request with trace ID, route, backend, latency, and status code. Use distributed tracing (Jaeger, Zipkin, Honeycomb) to see the full request path through the gateway to backends. For routing issues, verify path matching rules and host conditions. For auth failures, check token expiration and key rotation. For 502/504 errors, verify backend health and timeout configuration.
