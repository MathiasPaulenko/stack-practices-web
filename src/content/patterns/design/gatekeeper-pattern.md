---
contentType: patterns
slug: gatekeeper-pattern
title: "Gatekeeper Pattern"
description: "Place a validation and security boundary at the edge of a system to inspect, sanitize, and authenticate all incoming requests before they reach internal services."
metaDescription: "Learn the Gatekeeper Pattern for edge validation. Examples in Python, Java, and JavaScript with API gateways, WAF, JWT verification, and sanitization."
difficulty: intermediate
topics:
  - design
  - architecture
  - security
tags:
  - gatekeeper
  - pattern
  - design-pattern
  - security
  - edge
  - validation
  - api-gateway
  - waf
relatedResources:
  - /patterns/design/throttling-pattern
  - /patterns/design/content-delivery-network-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Gatekeeper Pattern for edge validation. Examples in Python, Java, and JavaScript with API gateways, WAF, JWT verification, and sanitization."
  keywords:
    - gatekeeper
    - design pattern
    - security
    - edge
    - validation
    - api gateway
    - waf
---

# Gatekeeper Pattern

## Overview

The Gatekeeper Pattern places a dedicated validation and security boundary at the edge of a system to inspect, sanitize, authenticate, and authorize all incoming requests before they reach internal services. Rather than embedding security checks in every service, a centralized gatekeeper handles cross-cutting concerns — token validation, rate limiting, input sanitization, TLS termination, and DDoS protection — at a single chokepoint.

The gatekeeper acts as a reverse proxy with intelligence. It rejects malformed requests, blocks unauthorized traffic, strips sensitive headers, and forwards only clean, validated requests to backend services. This reduces the attack surface of internal services and centralizes security policy enforcement.

Common implementations include API gateways (Kong, AWS API Gateway), reverse proxies with WAF (Nginx + ModSecurity, Cloudflare), service mesh ingress (Istio Gateway), and application-level middleware.

## When to Use

Use the Gatekeeper Pattern when:
- Multiple backend services share common security and validation requirements
- You need centralized authentication, rate limiting, or DDoS protection
- Internal services should not be exposed directly to the internet
- Compliance requires unified logging and audit of all external requests

## When to Avoid

- The application is a single service where edge validation adds no value
- Latency at the edge is unacceptable (ultra-low-latency applications)
- The gatekeeper becomes a bottleneck or single point of failure
- Service-specific validation logic is too complex to generalize at the edge

## Solution

### Python (FastAPI + Custom Gatekeeper Middleware)

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import re
import time
from typing import Dict, Set
import jwt

app = FastAPI()

class GatekeeperMiddleware(BaseHTTPMiddleware):
    """Validates, sanitizes, and authenticates requests at the edge"""

    # Blocked patterns
    BLOCKED_PATHS = {"/admin", "/internal", "/debug"}
    SQL_INJECTION_PATTERNS = [
        r"(\b(union|select|insert|update|delete|drop)\b)",
        r"(--|;|--\s|/\*|\*/)",
        r"(\b(or|and)\b\s+\d+\s*=\s*\d+)"
    ]

    # Rate limiting state
    request_counts: Dict[str, list] = {}
    RATE_LIMIT = 100  # requests per window
    RATE_WINDOW = 60  # seconds

    # JWT secret
    JWT_SECRET = "your-secret-key"
    JWT_ALGORITHM = "HS256"

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host

        # 1. Path validation
        if self._is_blocked_path(request.url.path):
            return JSONResponse(
                status_code=403,
                content={"error": "Access denied", "code": "BLOCKED_PATH"}
            )

        # 2. Rate limiting
        if self._is_rate_limited(client_ip):
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "code": "RATE_LIMITED"}
            )

        # 3. Input sanitization
        if self._contains_injection(request):
            return JSONResponse(
                status_code=400,
                content={"error": "Malformed request", "code": "INJECTION_DETECTED"}
            )

        # 4. Authentication
        auth_result = self._authenticate(request)
        if not auth_result["valid"]:
            return JSONResponse(
                status_code=401,
                content={"error": auth_result["error"], "code": "AUTH_FAILED"}
            )

        # Attach authenticated user info to request state
        request.state.user = auth_result.get("user")
        request.state.request_id = f"req-{int(time.time() * 1000)}"

        # Forward to backend service
        response = await call_next(request)

        # 5. Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Request-ID"] = request.state.request_id

        return response

    def _is_blocked_path(self, path: str) -> bool:
        return any(path.startswith(blocked) for blocked in self.BLOCKED_PATHS)

    def _is_rate_limited(self, client_ip: str) -> bool:
        now = time.time()
        window_start = now - self.RATE_WINDOW

        # Clean old entries and count current window
        self.request_counts[client_ip] = [
            t for t in self.request_counts.get(client_ip, [])
            if t > window_start
        ]

        if len(self.request_counts[client_ip]) >= self.RATE_LIMIT:
            return True

        self.request_counts[client_ip].append(now)
        return False

    def _contains_injection(self, request: Request) -> bool:
        # Check query params and path for SQL injection patterns
        target = f"{request.url.path}?{request.url.query}"
        return any(re.search(pattern, target, re.IGNORECASE)
                  for pattern in self.SQL_INJECTION_PATTERNS)

    def _authenticate(self, request: Request) -> dict:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return {"valid": False, "error": "Missing or invalid authorization header"}

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, self.JWT_SECRET, algorithms=[self.JWT_ALGORITHM])
            return {"valid": True, "user": payload}
        except jwt.ExpiredSignatureError:
            return {"valid": False, "error": "Token expired"}
        except jwt.InvalidTokenError:
            return {"valid": False, "error": "Invalid token"}


# Register middleware
app.add_middleware(GatekeeperMiddleware)

# Backend routes (protected by gatekeeper)
@app.get("/api/users/me")
async def get_current_user(request: Request):
    user = request.state.user
    return {"user_id": user["sub"], "email": user["email"]}

@app.get("/api/products")
async def list_products():
    return {"products": [{"id": 1, "name": "Widget"}]}
```

### Java (Spring Cloud Gateway with Filters)

```java
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import java.util.List;

@Component
class GatekeeperFilter extends AbstractGatewayFilterFactory<GatekeeperFilter.Config> {

    private final JwtValidator jwtValidator;
    private final RateLimiter rateLimiter;

    public GatekeeperFilter(JwtValidator jwtValidator, RateLimiter rateLimiter) {
        super(Config.class);
        this.jwtValidator = jwtValidator;
        this.rateLimiter = rateLimiter;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 1. Block internal paths
            String path = request.getPath().value();
            if (isBlockedPath(path)) {
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }

            // 2. Rate limiting
            String clientIp = request.getRemoteAddress().getAddress().getHostAddress();
            if (!rateLimiter.allowRequest(clientIp)) {
                exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                return exchange.getResponse().setComplete();
            }

            // 3. Authentication
            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            String token = authHeader.substring(7);
            if (!jwtValidator.isValid(token)) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            // 4. Add security headers and forward
            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-Request-ID", generateRequestId())
                .header("X-Authenticated", "true")
                .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        };
    }

    private boolean isBlockedPath(String path) {
        return path.startsWith("/admin") || path.startsWith("/internal");
    }

    private String generateRequestId() {
        return java.util.UUID.randomUUID().toString();
    }

    public static class Config {
        // Configuration properties
    }
}
```

### JavaScript (Express.js Edge Middleware)

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const app = express();

// 1. Security headers (Helmet)
app.use(helmet());

// 2. Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // requests per window
  message: { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 3. Path blocking middleware
const blockedPaths = ['/admin', '/internal', '/debug', '/.env', '/wp-admin'];
app.use((req, res, next) => {
  if (blockedPaths.some(path => req.path.startsWith(path))) {
    return res.status(403).json({ error: 'Access denied', code: 'BLOCKED_PATH' });
  }
  next();
});

// 4. Input sanitization
const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop)\b|--|;)/i;
app.use((req, res, next) => {
  const target = `${req.path}?${new URLSearchParams(req.query).toString()}`;
  if (sqlInjectionPattern.test(target)) {
    return res.status(400).json({ error: 'Malformed request', code: 'INJECTION_DETECTED' });
  }
  next();
});

// 5. JWT Authentication
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
app.use('/api/protected', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_FAILED' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    req.requestId = `req-${Date.now()}`;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', code: 'AUTH_FAILED' });
  }
});

// Backend routes
app.get('/api/protected/users/me', (req, res) => {
  res.json({ userId: req.user.sub, requestId: req.requestId });
});

app.get('/api/public/products', (req, res) => {
  res.json({ products: [{ id: 1, name: 'Widget' }] });
});

app.listen(3000, () => console.log('Gatekeeper running on port 3000'));
```

## Explanation

The Gatekeeper operates as a **defensive perimeter** with layers:

1. **Network layer**: TLS termination, DDoS mitigation, IP allowlisting
2. **Request layer**: Path blocking, method validation, size limits
3. **Security layer**: Authentication, authorization, token validation
4. **Application layer**: Input sanitization, schema validation, rate limiting
5. **Observability layer**: Request ID propagation, logging, metrics

Each request must pass all layers before reaching internal services. Rejected requests are logged for security monitoring and never consume backend resources.

## Variants

| Variant | Technology | Use Case |
|---------|-----------|----------|
| **API Gateway** | Kong, AWS API Gateway, Azure APIM | Full-featured edge with plugins/policies |
| **Reverse Proxy + WAF** | Nginx + ModSecurity, Cloudflare | Network-level protection with rulesets |
| **Service Mesh Ingress** | Istio Gateway, Linkerd | Kubernetes-native, mTLS between services |
| **CDN Edge** | Cloudflare Workers, Lambda@Edge | Compute at the edge for live validation |
| **Application Middleware** | Express, FastAPI, Spring | Code-level control, no additional infrastructure |

## What Works

- **Fail closed.** If the gatekeeper cannot validate a request, reject it rather than forwarding uncertain traffic.
- **Use defense in depth.** Gatekeeper + service-level auth + database permissions.
- **Log and monitor rejected requests.** Patterns in rejections reveal attack attempts.
- **Keep gatekeeper rules versioned.** Track rule changes in Git, deploy via CI/CD.
- **Test bypass scenarios.** Ensure internal services are not directly accessible if the gatekeeper fails.

## Common Mistakes

- **Trusting internal network traffic.** Internal services should still validate requests — the "zero trust" model.
- **Overloading the gatekeeper.** Complex business logic belongs in services, not the edge.
- **No circuit breaker for the gatekeeper.** If the gatekeeper fails, traffic should not pass through uninspected.
- **Hardcoded secrets in rules.** JWT secrets, API keys, and certificates should be injected securely.
- **Ignoring false positives.** Overly aggressive WAF rules block legitimate users; tune with production traffic.

## Real-World Examples

### Cloudflare

Cloudflare sits in front of millions of websites as a gatekeeper: DDoS protection, WAF rules, bot detection, and TLS termination all happen at the edge before traffic reaches origin servers.

### AWS API Gateway

API Gateway acts as a gatekeeper for Lambda and EC2 backends. It handles throttling, API key validation, JWT verification, request transformation, and CloudWatch logging — all before the business logic executes.

### GitHub

GitHub's edge infrastructure uses HAProxy with custom Lua modules for request routing, abuse detection, and rate limiting. Only validated, non-abusive requests reach the Rails application servers.

## Frequently Asked Questions

**Q: What is the difference between Gatekeeper and API Gateway?**
A: An API Gateway is a type of gatekeeper with additional capabilities (request routing, protocol translation, caching). A gatekeeper focuses specifically on validation and security.

**Q: Should the gatekeeper handle authentication or just pass tokens to services?**
A: The gatekeeper should validate tokens (signature, expiry) to reject invalid requests early. Authorization decisions ("can this user access this resource?") can be at the gatekeeper or service level depending on complexity.

**Q: How does Gatekeeper relate to Service Mesh?**
A: A service mesh (Istio, Linkerd) adds gatekeeping between services (east-west traffic), while the traditional gatekeeper handles external traffic (north-south). Together they provide defense in depth.

**Q: What happens if the gatekeeper becomes a bottleneck?**
A: Scale horizontally with load balancers, use stateless design for easy replication, and offload compute-heavy tasks (bot detection) to specialized services or edge computing.
