---
contentType: guides
slug: complete-guide-api-gateway-pattern
title: "Guía Completa de API Gateway Pattern: Routing, Auth, Rate Limiting"
description: "Dominá API gateway architecture: request routing, authentication, rate limiting, request shaping, response caching, protocol translation y patrones de producción."
metaDescription: "Dominá API gateway: routing, autenticación, rate limiting, request shaping, response caching, protocol translation y patrones de despliegue en producción."
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
  metaDescription: "Dominá API gateway: routing, autenticación, rate limiting, request shaping, response caching, protocol translation y patrones de despliegue en producción."
  keywords:
    - api gateway
    - request routing
    - authentication
    - rate limiting
    - request shaping
    - response caching
    - protocol translation
---

## Introducción

Un API gateway se sienta entre clients y backend services. Handlea cross-cutting concerns: routing, authentication, rate limiting, request shaping, response caching y protocol translation. Backend services se focusan en business logic en vez de infrastructure. Esta guía cubre routing, auth, rate limiting, request/response transformation, caching, protocol translation y production deployment patterns.

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

    # Default — 404 para unmatched routes
    location / {
        return 404;
    }
}
```

## Authentication

### JWT validation en gateway

```typescript
// gateway/middleware/auth.ts — Validá JWT antes de llegar al backend
import jwt from 'jsonwebtoken';

interface AuthConfig {
  jwtSecret: string;
  publicPaths: string[];  // Paths que no requieren auth
}

function authMiddleware(config: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skipeá auth para public paths
    if (config.publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;

      // Inyectá user context en headers para backend services
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
// gateway/middleware/apikey.ts — API key validation con rate limits per key
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

  // Checkeá rate limit para este key
  const allowed = await rateLimiter.check(`apikey:${keyData.id}`, keyData.rateLimit);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // Inyectá key context
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

    // Refilleá tokens basado en elapsed time
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

// Middleware con per-tier limits
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
// gateway/middleware/transform.ts — Transformá requests y responses
function requestTransformMiddleware(req: Request, res: Response, next: NextFunction) {
  // Agregá request ID para tracing
  req.headers['x-request-id'] = crypto.randomUUID();

  // Agregá timestamp
  req.headers['x-request-timestamp'] = new Date().toISOString();

  // Version routing: /api/v1/users → /api/users con version header
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
    // Wrapeá response en standard envelope
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
// gateway/middleware/cache.ts — Cacheá GET responses
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
    // Solo cacheá GET requests
    if (req.method !== 'GET') return next();

    const cacheKey = `${req.headers['x-user-id']}:${req.path}:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(cached.status).send(cached.body);
    }

    // Interceptá response para cachearlo
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

    // Mapeá REST a gRPC method
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

- Mantené el gateway stateless — usá Redis para rate limiting y caching, no in-memory
- Usá circuit breakers para backend calls — preventí cascading failures
- Seteá per-service timeouts — different services tienen different latency profiles
- Usá request IDs para tracing — inyectá en el gateway, propagá a all services
- Validá input en el gateway — rejecteá malformed requests antes de que lleguen a services
- Usá separate gateways para internal y external traffic — different auth y rate limits
- Monitoreá gateway metrics — request rate, error rate, latency, cache hit rate
- Versioná tu API en el gateway — routeéa `/v1/` y `/v2/` a different service versions
- Usá connection pooling a backends — reducí TCP handshake overhead
- Implementá graceful shutdown — draineá connections antes de terminating

## Common Mistakes

- **Business logic en el gateway**: el gateway debería handlear cross-cutting concerns only. Business rules belong en services.
- **No circuit breaker**: un slow service blockea gateway threads, affecting all services. Usá circuit breakers con timeouts.
- **In-memory rate limiting en multi-instance deployments**: cada instance tiene su own counter. Usá Redis o un shared store.
- **No request size limits**: large payloads pueden exhaust memory. Seteá max body size.
- **Single point of failure**: deployeá multiple gateway instances detrás de un load balancer.
- **No API versioning**: breaking changes affect all clients. Versioná APIs en el gateway level.

## FAQ

### ¿Qué es un API gateway?

Un server que se sienta entre clients y backend services. Handlea cross-cutting concerns como routing, authentication, rate limiting, caching y protocol translation. Backend services se focusan en business logic. Ejemplos: Kong, NGINX, AWS API Gateway, Envoy.

### ¿Necesito un API gateway para microservices?

No siempre. Small systems (2-3 services) pueden usar direct client-to-service calls. A medida que el number de services crece, un gateway reduce duplication de auth, rate limiting y routing logic across services.

### ¿Cuál es la diferencia entre un API gateway y un load balancer?

Un load balancer distribute traffic across instances del same service. Un API gateway rutéa a different services, handlea auth, rate limiting y transformation. Un gateway a menudo usa un load balancer internamente para cada backend service.

### ¿Debería el gateway handlear authorization?

El gateway handlea authentication (quién es el user). Authorization (qué puede hacer) es típicamente handled por backend services, ya que ellos poseen business rules. El gateway puede hacer coarse-grained authorization (admin vs user) basado en roles.

### ¿Cómo handleo WebSocket connections a través de un API gateway?

La mayoría de gateways soportan WebSocket proxying. Configurá el gateway para upgradear HTTP a WebSocket y mantener una persistent connection. Kong, NGINX y Envoy todos soportan WebSocket proxying con connection draining.
