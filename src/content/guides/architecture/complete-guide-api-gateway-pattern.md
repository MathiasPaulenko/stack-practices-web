---
contentType: guides
slug: complete-guide-api-gateway-pattern
title: "Complete Guide to API Gateway Pattern: Routing, Auth, Rate Limiting"
description: "Master API gateway architecture: request routing, authentication, rate limiting, request shaping, response caching, protocol translation, and production deployment patterns."
metaDescription: "Master API gateway architecture: request routing, authentication, rate limiting, request shaping, response caching, protocol translation, and production patterns."
difficulty: advanced
topics:
  - architecture
tags:
  - guide
  - api-gateway
  - routing
  - authentication
  - rate-limiting
  - microservices
  - architecture
relatedResources:
  - /guides/architecture/complete-guide-modular-monolith
  - /guides/architecture/complete-guide-strangler-fig-migration
  - /guides/architecture/complete-guide-api-gateway-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master API gateway architecture: request routing, authentication, rate limiting, request shaping, response caching, protocol translation, and production patterns."
  keywords:
    - api gateway
    - request routing
    - authentication
    - rate limiting
    - request shaping
    - response caching
    - protocol translation
---

## Introduction

An API gateway sits between clients and backend services. It handles cross-cutting concerns: routing, authentication, rate limiting, request shaping, response caching, and protocol translation. Backend services focus on business logic instead of infrastructure. This guide walks through routing, auth, rate limiting, request/response transformation, caching, protocol translation, and production deployment patterns.

## Core Responsibilities

```
Client
  │
  ▼
┌─────────────────────────────────┐
│         API Gateway             │
│                                 │
│  ┌─────────┐  ┌──────────────┐ │
│  │ Routing │  │ Authentication│ │
│  └─────────┘  └──────────────┘ │
│  ┌─────────┐  ┌──────────────┐ │
│  │ Rate    │  │ Request      │ │
│  │ Limiting│  │ Shaping      │ │
│  └─────────┘  └──────────────┘ │
│  ┌─────────┐  ┌──────────────┐ │
│  │ Caching │  │ Protocol     │ │
│  │         │  │ Translation  │ │
│  └─────────┘  └──────────────┘ │
│  ┌─────────┐  ┌──────────────┐ │
│  │ Logging │  │ Load         │ │
│  │ Metrics │  │ Balancing    │ │
│  └─────────┘  └──────────────┘ │
└─────────────────────────────────┘
  │           │           │
  ▼           ▼           ▼
┌──────┐  ┌──────┐  ┌──────┐
│Users │  │Orders│  │Billing│
│Svc   │  │Svc   │  │Svc   │
└──────┘  └──────┘  └──────┘
```

## Request Routing

### Path-based routing

```yaml
# Kong declarative config
_format_version: "3.0"
services:
  - name: user-service
    url: http://user-service:3000
    routes:
      - name: users
        paths:
          - /api/users
        strip_path: true
        methods: [GET, POST, PUT, DELETE]

  - name: order-service
    url: http://order-service:3000
    routes:
      - name: orders
        paths:
          - /api/orders
        strip_path: true
        methods: [GET, POST, PUT, DELETE]

  - name: billing-service
    url: http://billing-service:3000
    routes:
      - name: billing
        paths:
          - /api/billing
          - /api/invoices
        strip_path: true
```

### NGINX-based routing

```nginx
# nginx.conf
upstream user_service {
    server user-service:3000;
}

upstream order_service {
    server order-service:3000;
}

server {
    listen 80;

    location /api/users/ {
        proxy_pass http://user_service;
        proxy_set_header Host $host;
        proxy_set_header X-Request-ID $request_id;
    }

    location /api/orders/ {
        proxy_pass http://order_service;
        proxy_set_header Host $host;
        proxy_set_header X-Request-ID $request_id;
    }

    # Default — 404 for unmatched routes
    location / {
        return 404;
    }
}
```

## Authentication

### JWT validation at gateway

```typescript
// gateway/middleware/auth.ts — Validate JWT before reaching backend
import jwt from 'jsonwebtoken';

interface AuthConfig {
  jwtSecret: string;
  publicPaths: string[];  // Paths that don't require auth
}

function authMiddleware(config: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for public paths
    if (config.publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;

      // Inject user context into headers for backend services
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-roles'] = payload.roles.join(',');
      req.headers['x-user-scopes'] = payload.scopes.join(',');

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
```

### API key authentication

```typescript
// gateway/middleware/apikey.ts — API key validation with rate limits per key
async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const keyData = await keyStore.get(apiKey);
  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (keyData.expiresAt < new Date()) {
    return res.status(401).json({ error: 'API key expired' });
  }

  // Check rate limit for this key
  const allowed = await rateLimiter.check(`apikey:${keyData.id}`, keyData.rateLimit);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // Inject key context
  req.headers['x-api-key-id'] = keyData.id;
  req.headers['x-tenant-id'] = keyData.tenantId;

  next();
}
```

## Rate Limiting

### Token bucket rate limiter

```typescript
// gateway/middleware/rateLimit.ts — Token bucket implementation
class TokenBucketRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillRate: number,  // tokens per second
  ) {}

  async check(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }

    return { allowed: false, remaining: 0 };
  }
}

// Middleware with per-tier limits
const rateLimitTiers = {
  free: { capacity: 10, refillRate: 0.1 },      // 10 requests, refill 1 per 10s
  basic: { capacity: 100, refillRate: 1 },       // 100 requests, refill 1 per second
  premium: { capacity: 1000, refillRate: 10 },   // 1000 requests, refill 10 per second
};

function rateLimitMiddleware(limiter: TokenBucketRateLimiter) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tier = req.headers['x-tier'] as string || 'free';
    const config = rateLimitTiers[tier] || rateLimitTiers.free;

    const key = `${req.headers['x-user-id']}:${req.path}`;
    const result = await limiter.check(key);

    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Limit', config.capacity);

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil(1 / config.refillRate));
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    next();
  };
}
```

## Request Shaping

### Request/response transformation

```typescript
// gateway/middleware/transform.ts — Transform requests and responses
function requestTransformMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add request ID for tracing
  req.headers['x-request-id'] = crypto.randomUUID();

  // Add timestamp
  req.headers['x-request-timestamp'] = new Date().toISOString();

  // Version routing: /api/v1/users → /api/users with version header
  const versionMatch = req.path.match(/^\/api\/v(\d+)\//);
  if (versionMatch) {
    req.headers['x-api-version'] = versionMatch[1];
    req.url = req.url.replace(`/v${versionMatch[1]}`, '');
  }

  next();
}

function responseTransformMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function(data: any) {
    // Wrap response in standard envelope
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        const enveloped = {
          data: parsed,
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString(),
            version: req.headers['x-api-version'] || '1',
          },
        };
        return originalSend.call(this, JSON.stringify(enveloped));
      } catch {
        // Non-JSON response, pass through
      }
    }
    return originalSend.call(this, data);
  };

  next();
}
```

## Response Caching

```typescript
// gateway/middleware/cache.ts — Cache GET responses
class ResponseCache {
  private cache = new Map<string, { body: string; status: number; expiresAt: number }>();

  async get(key: string): Promise<CachedResponse | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return { body: entry.body, status: entry.status };
  }

  set(key: string, body: string, status: number, ttlSeconds: number): void {
    this.cache.set(key, {
      body,
      status,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

function cacheMiddleware(cache: ResponseCache, defaultTtl: number = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const cacheKey = `${req.headers['x-user-id']}:${req.path}:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(cached.status).send(cached.body);
    }

    // Intercept response to cache it
    const originalSend = res.send;
    res.send = function(data: any) {
      if (res.statusCode === 200) {
        const ttl = parseInt(res.getHeader('Cache-Control')?.toString().match(/max-age=(\d+)/)?.[1] || '') || defaultTtl;
        cache.set(cacheKey, data.toString(), res.statusCode, ttl);
        res.setHeader('X-Cache', 'MISS');
      }
      return originalSend.call(this, data);
    };

    next();
  };
}
```

## Protocol Translation

```typescript
// gateway/protocol/grpc-to-rest.ts — REST to gRPC translation
import { GrpcClient } from '@grpc/grpc-js';

class GrpcTranslationMiddleware {
  private clients = new Map<string, GrpcClient>();

  constructor(private serviceRegistry: ServiceRegistry) {}

  async handle(req: Request, res: Response): Promise<void> {
    const service = this.serviceRegistry.resolve(req.path);
    const client = this.getClient(service);

    // Map REST to gRPC method
    const grpcMethod = this.mapRestToGrpc(req.method, req.path, service);
    const grpcRequest = this.transformRequest(req);

    try {
      const grpcResponse = await client.call(grpcMethod, grpcRequest);
      const restResponse = this.transformResponse(grpcResponse);
      res.json(restResponse);
    } catch (error) {
      this.translateGrpcError(error, res);
    }
  }

  private mapRestToGrpc(method: string, path: string, service: GrpcService): string {
    // GET /api/users/123 → UserService.GetUser
    // POST /api/users → UserService.CreateUser
    const mapping = {
      'GET:/api/users/:id': 'GetUser',
      'GET:/api/users': 'ListUsers',
      'POST:/api/users': 'CreateUser',
      'PUT:/api/users/:id': 'UpdateUser',
      'DELETE:/api/users/:id': 'DeleteUser',
    };
    return mapping[`${method}:${service.pattern}`] || 'Unknown';
  }
}
```

## Production Deployment

### Kubernetes deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: gateway
          image: registry.io/api-gateway:latest
          ports:
            - containerPort: 8080
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: gateway-secrets
                  key: redis-url
          resources:
            limits:
              cpu: 1000m
              memory: 512Mi
            requests:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 8080
  selector:
    app: api-gateway
```

## Best Practices

- Keep the gateway stateless — use Redis for rate limiting and caching, not in-memory
- Use circuit breakers for backend calls — prevent cascading failures
- Set per-service timeouts — different services have different latency profiles
- Use request IDs for tracing — inject at the gateway, propagate to all services
- Validate input at the gateway — reject malformed requests before they reach services
- Use separate gateways for internal and external traffic — different auth and rate limits
- Monitor gateway metrics — request rate, error rate, latency, cache hit rate
- Version your API at the gateway — route `/v1/` and `/v2/` to different service versions
- Use connection pooling to backends — reduce TCP handshake overhead
- Implement graceful shutdown — drain connections before terminating

## Common Mistakes

- **Business logic in the gateway**: the gateway should handle cross-cutting concerns only. Business rules belong in services.
- **No circuit breaker**: one slow service blocks gateway threads, affecting all services. Use circuit breakers with timeouts.
- **In-memory rate limiting in multi-instance deployments**: each instance has its own counter. Use Redis or a shared store.
- **No request size limits**: large payloads can exhaust memory. Set max body size.
- **Single point of failure**: deploy multiple gateway instances behind a load balancer.
- **No API versioning**: breaking changes affect all clients. Version APIs at the gateway level.

## FAQ

### What is an API gateway?

A server that sits between clients and backend services. It handles cross-cutting concerns like routing, authentication, rate limiting, caching, and protocol translation. Backend services focus on business logic. Examples: Kong, NGINX, AWS API Gateway, Envoy.

### Do I need an API gateway for microservices?

Not always. Small systems (2-3 services) can use direct client-to-service calls. As the number of services grows, a gateway reduces duplication of auth, rate limiting, and routing logic across services.

### What is the difference between an API gateway and a load balancer?

A load balancer distributes traffic across instances of the same service. An API gateway routes to different services, handles auth, rate limiting, and transformation. A gateway often uses a load balancer internally for each backend service.

### Should the gateway handle authorization?

The gateway handles authentication (who is the user). Authorization (what can they do) is typically handled by backend services, since they own business rules. The gateway can do coarse-grained authorization (admin vs user) based on roles.

### How do I handle WebSocket connections through an API gateway?

Most gateways support WebSocket proxying. Configure the gateway to upgrade HTTP to WebSocket and maintain a persistent connection. Kong, NGINX, and Envoy all support WebSocket proxying with connection draining.
