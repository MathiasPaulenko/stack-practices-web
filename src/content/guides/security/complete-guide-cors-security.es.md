---
contentType: guides
slug: complete-guide-cors-security
title: "Guía Completa de CORS Security: Origins, Headers, Preflight, Credentials"
description: "Dominá CORS security: same-origin policy, CORS headers, preflight requests, credential handling, common misconfigurations y patrones de seguridad para web APIs."
metaDescription: "Dominá CORS security: same-origin policy, CORS headers, preflight, credential handling, misconfigurations y patrones de seguridad para web APIs en producción."
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
  - /guides/security/complete-guide-oauth2-oidc-production
  - /guides/security/complete-guide-content-security-policy
  - /recipes/security/csrf-protection
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 18
seo:
  metaDescription: "Dominá CORS security: same-origin policy, CORS headers, preflight, credential handling, misconfigurations y patrones de seguridad para web APIs en producción."
  keywords:
    - cors
    - cross-origin resource sharing
    - preflight requests
    - cors headers
    - credential handling
    - same-origin policy
    - cors security
---

## Introducción

CORS (Cross-Origin Resource Sharing) es un browser mechanism que controla cuándo JavaScript en un origin puede hacer requests a un different origin. Sin CORS, el same-origin policy blockea all cross-origin requests. CORS headers le dicen al browser cuáles origins, methods y headers son permitted. A continuación: same-origin policy, CORS headers, preflight requests, credential handling, common misconfigurations y production patterns.

## Same-Origin Policy

Un origin se define por la combinación de scheme, host y port:

```
https://app.example.com:443/page
  │      │       │      │
 scheme   host   port   path

Same origin:     https://app.example.com/other-page
Different origin: http://app.example.com  (different scheme)
Different origin: https://api.example.com  (different host)
Different origin: https://app.example.com:8080  (different port)
```

El same-origin policy prevente que `https://app.example.com` lea responses desde `https://api.example.com` vía JavaScript. CORS relaxa esto selectivamente.

## CORS Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Access-Control-Allow-Origin` | Response | Cuáles origins pueden acceder al resource |
| `Access-Control-Allow-Methods` | Response | Cuáles HTTP methods son permitted |
| `Access-Control-Allow-Headers` | Response | Cuáles request headers son permitted |
| `Access-Control-Expose-Headers` | Response | Cuáles response headers JS puede leer |
| `Access-Control-Allow-Credentials` | Response | Si cookies/auth pueden ser enviadas |
| `Access-Control-Max-Age` | Response | Cuánto cachear preflight results |
| `Origin` | Request | El origin que hace el request |

## Simple Requests

Simple requests no triggerean un preflight. Deben meetear all conditions:
- Method: GET, HEAD, o POST
- Headers: solo CORS-safelisted headers (Accept, Accept-Language, Content-Language, Content-Type)
- Content-Type: text/plain, multipart/form-data, o application/x-www-form-urlencoded

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

Non-simple requests triggerean un preflight OPTIONS request. El browser lo envía antes del actual request para checkear si el server lo permite.

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

// Actual request (enviado después de successful preflight)
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
// middleware/cors.ts — CORS middleware para Express
import cors from 'cors';

const allowedOrigins = [
  'https://app.example.com',
  'https://admin.example.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allowéa requests sin origin (curl, server-to-server)
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
  maxAge: 86400, // Cacheá preflight por 24 hours
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
    res.setHeader('Vary', 'Origin'); // Critical para caching
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

    # Handleá preflight
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

Cuando `credentials: true` (o `credentials: 'include'` en fetch), el browser envía cookies y Authorization headers. El server debe responder con `Access-Control-Allow-Credentials: true`.

```typescript
// Client: enviá credentials
fetch('https://api.example.com/users', {
  credentials: 'include', // Enviá cookies
  headers: { 'Content-Type': 'application/json' },
});

// Server: allowéa credentials
app.use(cors({
  origin: 'https://app.example.com', // Must be specific origin, NO wildcard
  credentials: true,
}));
```

**Critical**: Cuando `credentials: true`, `Access-Control-Allow-Origin` no puede ser `*`. Debe ser un specific origin.

## Common Misconfigurations

### 1. Wildcard origin con credentials

```http
// DANGEROUS: allowéa any origin con credentials
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

// Browsers rejectean esta combinación.
// Pero algunos servers reflectean el Origin header en vez:
Access-Control-Allow-Origin: https://evil.example.com
Access-Control-Allow-Credentials: true
// Esto es worse — allowéa que any site haga authenticated requests.
```

### 2. Origin reflection

```typescript
// DANGEROUS: reflectea any origin
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
// Cualquier website puede hacer authenticated cross-origin requests.
```

### 3. Null origin

```http
// DANGEROUS: null origin es usado por sandboxed iframes y data: URIs
Access-Control-Allow-Origin: null
// Attackers pueden usar <iframe sandbox="allow-scripts"> para enviar requests desde null origin.
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

  // Allowéa any *.example.com subdomain
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
// Strict CORS para sensitive endpoints, relaxed para public API
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

- Nunca uses `Access-Control-Allow-Origin: *` con credentials — browsers lo blockean, y el workaround (reflection) es una vulnerability
- Usá un allowlist de specific origins — no reflectees el Origin header blindly
- Seteá `Vary: Origin` — prevente cache poisoning cuando origin-based responses se cachean
- Cacheá preflight con `Access-Control-Max-Age` — reduce OPTIONS requests (86400 seconds es common)
- Solo allowéa necessary methods — no blanket-allowéas all HTTP methods
- Solo allowéa necessary headers — no allowéas all request headers
- Exponé solo needed response headers — no expongas internal headers
- Handleá preflight OPTIONS explícitamente — returnéa 204 con correct headers
- No allowéas `null` origin — sandboxed iframes lo usan y pueden ser exploited
- Testeá con browser DevTools — checkeá Network tab para preflight y CORS errors

## Common Mistakes

- **Reflectear Origin header sin validation**: allowéa que cualquier website haga cross-origin requests. Siempre validá contra un allowlist.
- **Missing `Vary: Origin` header**: CDN cachea un response para un origin y lo sirve a otro. Causa CORS errors o security issues.
- **Wildcard con credentials**: `*` + `credentials: true` es invalid. Browsers lo rejectean.
- **No handlear OPTIONS**: preflight requests necesitan un 204 response con CORS headers. Returnear 405 blockea all non-simple requests.
- **Allowear all headers**: `Access-Control-Allow-Headers: *` es overly permissive. Especificá solo lo que necesitás.
- **Forgetting Content-Type triggerea preflight**: `application/json` no es un safelisted Content-Type. POST con JSON siempre triggerea un preflight.

## FAQ

### ¿Qué es CORS?

Cross-Origin Resource Sharing. Un browser mechanism que deja a una web page en un origin hacer requests a un different origin. El server responde con CORS headers que le dicen al browser si allowear el request.

### ¿Qué es un preflight request?

Un OPTIONS request enviado por el browser antes del actual request. Checkea si el server permite el method, headers y origin. Triggered por non-simple requests (POST con JSON, PUT, DELETE, custom headers).

### ¿Cuál es la diferencia entre simple y preflighted requests?

Simple requests (GET, HEAD, POST con safelisted Content-Types) se envían directamente. El browser checkea CORS headers en el response. Preflighted requests envían un OPTIONS check first, luego el actual request si el preflight pasa.

### ¿CORS puede prevenir CSRF?

No. CORS controla browser-side cross-origin reads. CSRF attacks usan form submissions o image tags que bypass CORS. Usá CSRF tokens para CSRF protection.

### ¿Por qué getteo un CORS error en production pero no en development?

Development a menudo usa `localhost` para both frontend y API (same origin). Production usa different domains (app.example.com vs api.example.com), triggeréando CORS. Configurá CORS headers en el API server.
