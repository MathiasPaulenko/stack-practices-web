---



contentType: guides
slug: complete-guide-cors-security
title: "CORS Security: Origins, Headers, Preflight, Credentials"
description: "Master CORS security: same-origin policy, CORS headers, preflight requests, credential handling, common misconfigurations, and production security patterns for web APIs."
metaDescription: "Master CORS security: same-origin policy, CORS headers, preflight requests, credential handling, common misconfigurations, and production security patterns for web APIs."
difficulty: intermediate
topics:
  - security
  - frontend
tags:
  - guide
  - cors
  - security
  - headers
  - preflight
  - cross-origin
  - api
relatedResources:
  - /guides/complete-guide-oauth2-oidc-production
  - /guides/complete-guide-content-security-policy
  - /recipes/csrf-protection
  - /guides/complete-guide-web-security-headers
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 18
seo:
  metaDescription: "Master CORS security: same-origin policy, CORS headers, preflight requests, credential handling, common misconfigurations, and production security patterns for web APIs."
  keywords:
    - cors
    - cross-origin resource sharing
    - preflight requests
    - cors headers
    - credential handling
    - same-origin policy
    - cors security



---

## Introduction

CORS (Cross-Origin Resource Sharing) is a browser mechanism that controls when JavaScript on one origin can make requests to a different origin. Without CORS, the same-origin policy blocks all cross-origin requests. CORS headers tell the browser which origins, methods, and headers are permitted. The following guide covers same-origin policy, CORS headers, preflight requests, credential handling, common misconfigurations, and production patterns.

## Same-Origin Policy

An origin is defined by the combination of scheme, host, and port:

```
https://app.example.com:443/page
  │      │       │      │
 scheme   host   port   path

Same origin:     https://app.example.com/other-page
Different origin: http://app.example.com  (different scheme)
Different origin: https://api.example.com  (different host)
Different origin: https://app.example.com:8080  (different port)
```

The same-origin policy prevents `https://app.example.com` from reading responses from `https://api.example.com` via JavaScript. CORS relaxes this selectively.

## CORS Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Access-Control-Allow-Origin` | Response | Which origins may access the resource |
| `Access-Control-Allow-Methods` | Response | Which HTTP methods are permitted |
| `Access-Control-Allow-Headers` | Response | Which request headers are permitted |
| `Access-Control-Expose-Headers` | Response | Which response headers JS can read |
| `Access-Control-Allow-Credentials` | Response | Whether cookies/auth can be sent |
| `Access-Control-Max-Age` | Response | How long to cache preflight results |
| `Origin` | Request | The origin making the request |

## Simple Requests

Simple requests don't trigger a preflight. They must meet all conditions:
- Method: GET, HEAD, or POST
- Headers: only CORS-safelisted headers (Accept, Accept-Language, Content-Language, Content-Type)
- Content-Type: text/plain, multipart/form-data, or application/x-www-form-urlencoded

```http
// Simple GET request — no preflight
GET /api/users HTTP/1.1
Host: api.example.com
Origin: https://app.example.com

// Response
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.example.com
Content-Type: application/json

[{"id": 1, "name": "Alice"}]
```

## Preflight Requests

Non-simple requests trigger a preflight OPTIONS request. The browser sends it before the actual request to check if the server allows it.

```http
// Preflight request
OPTIONS /api/users HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization

// Preflight response
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400

// Actual request (sent after successful preflight)
POST /api/users HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGci...

{"name": "Bob", "email": "bob@example.com"}

// Actual response
HTTP/1.1 201 Created
Access-Control-Allow-Origin: https://app.example.com
```

## Server Configuration

### Express.js

```typescript
// middleware/cors.ts — CORS middleware for Express
import cors from 'cors';

const allowedOrigins = [
  'https://app.example.com',
  'https://admin.example.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
}));
```

### Manual CORS headers

```typescript
// middleware/corsManual.ts — Manual CORS header injection
function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://app.example.com', 'https://admin.example.com'];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // Critical for caching
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  next();
}
```

### NGINX

```nginx
# nginx.conf — CORS configuration
server {
    listen 80;

    # CORS headers
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Vary "Origin" always;

    # Map allowed origins
    map $http_origin $cors_origin {
        default "";
        "https://app.example.com" "https://app.example.com";
        "https://admin.example.com" "https://admin.example.com";
    }

    # Handle preflight
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin $cors_origin;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        add_header Access-Control-Max-Age 86400;
        add_header Content-Length 0;
        return 204;
    }
}
```

## Credential Handling

When `credentials: true` (or `credentials: 'include'` in fetch), the browser sends cookies and Authorization headers. The server must respond with `Access-Control-Allow-Credentials: true`.

```typescript
// Client: send credentials
fetch('https://api.example.com/users', {
  credentials: 'include', // Send cookies
  headers: { 'Content-Type': 'application/json' },
});

// Server: allow credentials
app.use(cors({
  origin: 'https://app.example.com', // Must be specific origin, NOT wildcard
  credentials: true,
}));
```

**Critical**: When `credentials: true`, `Access-Control-Allow-Origin` cannot be `*`. It must be a specific origin.

## Common Misconfigurations

### 1. Wildcard origin with credentials

```http
// DANGEROUS: allows any origin with credentials
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

// Browsers reject this combination.
// But some servers reflect the Origin header instead:
Access-Control-Allow-Origin: https://evil.example.com
Access-Control-Allow-Credentials: true
// This is worse — it allows any site to make authenticated requests.
```

### 2. Origin reflection

```typescript
// DANGEROUS: reflects any origin
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
// Any website can make authenticated cross-origin requests.
```

### 3. Null origin

```http
// DANGEROUS: null origin is used by sandboxed iframes and data: URIs
Access-Control-Allow-Origin: null
// Attackers can use <iframe sandbox="allow-scripts"> to send requests from null origin.
```

## Production Patterns

### Dynamic origin validation

```typescript
// middleware/corsSecure.ts — Secure dynamic origin validation
const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
  'https://staging.example.com',
]);

// Wildcard subdomain matching
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;

  // Allow any *.example.com subdomain
  const url = new URL(origin);
  if (url.hostname.endsWith('.example.com')) return true;

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Server-to-server
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
```

### Per-route CORS

```typescript
// Strict CORS for sensitive endpoints, relaxed for public API
app.get('/api/public/health', cors({ origin: '*' }), healthCheck);

app.post('/api/users', cors({
  origin: 'https://app.example.com',
  credentials: true,
}), createUser);

app.delete('/api/users/:id', cors({
  origin: 'https://admin.example.com',
  credentials: true,
}), deleteUser);
```

## Best Practices


- For a deeper guide, see [Content Security Policy: CSP Headers, Nonces, Hashes](/guides/complete-guide-content-security-policy/).

- Never use `Access-Control-Allow-Origin: *` with credentials — browsers block it, and the workaround (reflection) is a vulnerability
- Use an allowlist of specific origins — don't reflect the Origin header blindly
- Set `Vary: Origin` — prevents cache poisoning when origin-based responses are cached
- Cache preflight with `Access-Control-Max-Age` — reduces OPTIONS requests (86400 seconds is common)
- Only allow necessary methods — don't blanket-allow all HTTP methods
- Only allow necessary headers — don't allow all request headers
- Expose only needed response headers — don't expose internal headers
- Handle preflight OPTIONS explicitly — return 204 with correct headers
- Don't allow `null` origin — sandboxed iframes use it and can be exploited
- Test with browser DevTools — check Network tab for preflight and CORS errors

## Common Mistakes

- **Reflecting Origin header without validation**: allows any website to make cross-origin requests. Always validate against an allowlist.
- **Missing `Vary: Origin` header**: CDN caches a response for one origin and serves it to another. Causes CORS errors or security issues.
- **Wildcard with credentials**: `*` + `credentials: true` is invalid. Browsers reject it.
- **Not handling OPTIONS**: preflight requests need a 204 response with CORS headers. Returning 405 blocks all non-simple requests.
- **Allowing all headers**: `Access-Control-Allow-Headers: *` is overly permissive. Specify only what you need.
- **Forgetting Content-Type triggers preflight**: `application/json` is not a safelisted Content-Type. POST with JSON always triggers a preflight.

## FAQ

### What is CORS?

Cross-Origin Resource Sharing. A browser mechanism that lets a web page on one origin make requests to a different origin. The server responds with CORS headers that tell the browser whether to allow the request.

### What is a preflight request?

An OPTIONS request sent by the browser before the actual request. It checks whether the server allows the method, headers, and origin. Triggered by non-simple requests (POST with JSON, PUT, DELETE, custom headers).

### What is the difference between simple and preflighted requests?

Simple requests (GET, HEAD, POST with safelisted Content-Types) are sent directly. The browser checks CORS headers on the response. Preflighted requests send an OPTIONS check first, then the actual request if the preflight passes.

### Can CORS prevent CSRF?

No. CORS controls browser-side cross-origin reads. CSRF attacks use form submissions or image tags that bypass CORS. Use CSRF tokens for CSRF protection.

### Why do I get a CORS error in production but not in development?

Development often uses `localhost` for both frontend and API (same origin). Production uses different domains (app.example.com vs api.example.com), triggering CORS. Configure CORS headers on the API server.
