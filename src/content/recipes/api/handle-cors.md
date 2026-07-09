---
contentType: recipes
slug: handle-cors
title: "Handle CORS Correctly"
description: "How to configure Cross-Origin Resource Sharing (CORS) headers correctly for APIs, SPAs, and serverless functions without opening security holes."
metaDescription: "Learn CORS configuration in Python, JavaScript, and Java. Covers preflight requests, credentials, allowed origins, and common CORS security mistakes."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - cors
  - http
  - rest
  - backend
relatedResources:
  - /recipes/call-rest-api
  - /recipes/api-versioning
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/input-validation
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn CORS configuration in Python, JavaScript, and Java. Covers preflight requests, credentials, allowed origins, and common CORS security mistakes."
  keywords:
    - cors
    - security
    - api
    - http
    - headers
    - python
    - javascript
    - java
---
## Overview

Cross-Origin Resource Sharing (CORS) is a browser security mechanism that controls which origins can access your API's resources. Misconfigured CORS is one of the most common sources of frontend-backend integration friction and security vulnerabilities. This approach handles implementing proper CORS middleware with allowlist validation, preflight handling, credentials support, and explicit header/method declarations in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Your frontend (SPA, mobile app, third-party widget) runs on a different origin than your [API](/recipes/api/call-rest-api)
- You need to support authenticated cross-origin requests with cookies or authorization headers
- You're building a public API consumed by multiple external domains
- Debugging mysterious "CORS policy" browser errors on API calls

## Solution

### Python (Flask)

```python
from flask import Flask, request, make_response
from urllib.parse import urlparse

app = Flask(__name__)

ALLOWED_ORIGINS = {
    "https://app.example.com",
    "https://admin.example.com",
    "http://localhost:3000",
}
ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"]
ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-Request-ID"]
ALLOW_CREDENTIALS = True

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")

    # Only reflect allowed origins; never use "*" with credentials
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"

    if ALLOW_CREDENTIALS:
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response

@app.route("/api/<path:path>", methods=["OPTIONS"])
def handle_preflight(path):
    origin = request.headers.get("Origin")
    if origin not in ALLOWED_ORIGINS:
        return make_response(("", 204))  # No CORS headers for disallowed origins

    response = make_response(("", 204))
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = ", ".join(ALLOWED_METHODS)
    response.headers["Access-Control-Allow-Headers"] = ", ".join(ALLOWED_HEADERS)
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response
```

### JavaScript (Express)

```javascript
import express from "express";

const app = express();

const ALLOWED_ORIGINS = new Set([
  "https://app.example.com",
  "https://admin.example.com",
  "http://localhost:3000",
]);

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Credentials", "true");

  // Preflight request
  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return res.sendStatus(204);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
    res.header("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }

  next();
}

app.use(corsMiddleware);
app.use(express.json());

// Alternative: using cors package with explicit allowlist
// import cors from "cors";
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || ALLOWED_ORIGINS.has(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//   allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
// }));
```

### Java (Spring Boot)

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

  private static final String[] ALLOWED_ORIGINS = {
    "https://app.example.com",
    "https://admin.example.com",
    "http://localhost:3000"
  };

  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
          .allowedOrigins(ALLOWED_ORIGINS)
          .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
          .allowedHeaders("Content-Type", "Authorization", "X-Request-ID")
          .allowCredentials(true)
          .maxAge(86400);
      }
    };
  }
}

// Spring Security integration (if using SecurityFilterChain)
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.cors(cors -> {})
        .csrf(csrf -> csrf.disable()) // only if API is stateless with tokens
        .authorizeHttpRequests(auth -> auth
          .requestMatchers("/api/**").authenticated()
          .anyRequest().permitAll()
        );
    // See [API Security Checklist](/guides/security/api-security-checklist-guide) for auth patterns.
    return http.build();
  }
}
```

## Explanation

- **Same-Origin Policy** browsers block requests from `origin-a.com` to `origin-b.com` by default. CORS is a controlled relaxation of this policy.
- **Preflight (OPTIONS)** browsers send a preflight request for non-simple methods (PUT, DELETE, PATCH) and custom headers. The server must respond with allowed origins, methods, and headers.
- **`Access-Control-Allow-Origin`** must be an exact match (`https://app.example.com`) or `*`. Never use `*` when `Access-Control-Allow-Credentials: true` is set — browsers reject this combination.
- **`Vary: Origin`** is critical when serving different CORS headers based on the request origin. Without it, CDNs may cache a response with one origin header and serve it to requests from different origins.
- **`Access-Control-Allow-Credentials`** enables cookies and authorization headers in cross-origin requests. Both client (`withCredentials: true` / `credentials: 'include'`) and server must opt in.

## Variants

| Approach | Configuration | Best For |
|----------|--------------|----------|
| Allowlist | Explicit origin list | Production APIs with known consumers |
| Regex pattern | `*.example.com` | Subdomain wildcards (validate carefully) |
| Live origin | Origin validated at runtime | Multi-tenant APIs with per-tenant origins |
| `*` wildcard | No origin restriction | Public read-only APIs without credentials |
| Proxy | Frontend proxy to API | Development, same-origin deployment |

## What Works

1. **Never use `*` with credentials** — browsers reject `Access-Control-Allow-Origin: *` when `Allow-Credentials: true`. Always reflect the requesting origin if it's in your allowlist.
2. **Validate origins explicitly** — maintain an allowlist of exact origins. Don't parse or regex-match origins without careful validation to avoid bypasses.
3. **Set `Vary: Origin`** — when CORS headers vary by origin, add `Vary: Origin` so caches don't serve cross-origin responses to the wrong domains.
4. **Keep preflight max-age reasonable** — `86400` (1 day) is typical. Too long delays propagation of CORS policy changes; too short wastes preflight requests.
5. **Restrict allowed methods and headers** — only declare the HTTP methods and headers your API actually supports. Over-permissive CORS expands the attack surface.

## Common Mistakes

1. Setting `Access-Control-Allow-Origin: *` and wondering why cookies don't work cross-origin.
2. Reflecting the request `Origin` header without validation, allowing any website to call your API.
3. Forgetting to handle the `OPTIONS` preflight, causing browser CORS errors on PUT/DELETE requests.
4. Not setting `Vary: Origin`, leading to CDN cache poisoning where one origin's response is served to another.
5. Enabling `allowCredentials` on public APIs without origin validation, exposing authenticated endpoints to malicious sites. See [API Security Checklist](/guides/security/api-security-checklist-guide) for origin validation.

## Frequently Asked Questions

### Why does my API work in Postman but fail in the browser?

Postman is not a browser — it doesn't enforce the Same-Origin Policy or CORS. Browsers block responses from cross-origin requests unless the server sends the appropriate `Access-Control-Allow-*` headers. Test CORS configuration with actual browser DevTools or tools like `curl` with the `Origin` header.

### Can I use a wildcard for subdomains like `*.example.com`?

Not directly in `Access-Control-Allow-Origin`. The header requires an exact origin match. You can validate origins live: check if the request origin ends with `.example.com` at runtime and reflect the exact origin back. Spring Boot's `allowedOriginPatterns` supports this; in Express/Flask, implement custom origin validation.

### Do I need CORS if I deploy my frontend and API on the same domain?

No. CORS only applies when the origin (scheme + host + port) of the frontend differs from the API. If both run on `https://example.com` (or the API is on a subdomain with proper configuration), no CORS headers are needed. Using a [reverse proxy](/recipes/api/nginx-reverse-proxy) (nginx) to route `/api` to your backend is a common same-origin deployment strategy.

### How do I debug CORS errors in the browser?

Open DevTools → Network tab. Look for failed requests with CORS errors in the console. Check the `Access-Control-Allow-Origin` header in the response — if it's missing or does not match the request `Origin`, the browser blocks the response. For preflight failures, check the `OPTIONS` response status and headers. Use `curl -H "Origin: https://yourapp.com" -X OPTIONS https://api.example.com/endpoint` to test preflight without a browser. Common causes: server not sending headers, origin not in allowlist, or `Vary: Origin` missing causing CDN cache issues.

### How do I handle CORS with cookies and credentials?

Set `Access-Control-Allow-Credentials: true` on the server. The client must send requests with `credentials: 'include'` (fetch) or `withCredentials: true` (axios). The `Access-Control-Allow-Origin` header must be an exact origin — not `*` — when credentials are involved. The browser rejects `Access-Control-Allow-Origin: *` with `Allow-Credentials: true`. Ensure `SameSite` cookie attribute is set to `None` with `Secure: true` for cross-site cookies. Without `SameSite=None`, browsers block cookies on cross-origin requests.

### How do I configure CORS in serverless functions (AWS Lambda, Vercel)?

Return CORS headers in the function response. For API Gateway + Lambda, configure CORS in the API Gateway method response or return headers from the Lambda function. For Vercel/Netlify functions, set headers in the response object: `res.setHeader('Access-Control-Allow-Origin', 'https://yourapp.com')`. Handle `OPTIONS` preflight by returning a 204 with the appropriate headers immediately. Do not rely on platform-level CORS configuration alone — verify headers are present in the actual response.

### How do I handle CORS with WebSockets?

WebSockets do not use CORS — the browser does not enforce the Same-Origin Policy for WebSocket connections. The server validates the `Origin` header during the WebSocket handshake. Reject connections with unexpected origins by checking the `Origin` header in the upgrade request. Do not rely on CORS for WebSocket security — implement authentication tokens in the connection URL or subprotocol.

### How do I test CORS configuration?

Use `curl` with the `Origin` header to verify server responses: `curl -H "Origin: https://example.com" -I https://api.example.com/endpoint`. Check that `Access-Control-Allow-Origin` matches the request origin. For preflight: `curl -X OPTIONS -H "Origin: https://example.com" -H "Access-Control-Request-Method: PUT" -I https://api.example.com/endpoint`. Use browser DevTools to verify the browser accepts the response. Automated tests with Playwright can verify CORS behavior end-to-end by making cross-origin requests from a real browser context.

### How do I handle CORS with service workers and Workbox?

Service workers can intercept and modify responses, including adding CORS headers. However, do not add CORS headers in a service worker — the browser enforces CORS before the service worker sees the response. Configure CORS on the origin server. For Workbox, set `cacheName` and `mode: 'cors'` in the strategy options. If caching cross-origin responses, ensure the server sends `Access-Control-Allow-Origin` and `Vary: Origin`. Opaque responses (mode: 'no-cors') cannot be read by JavaScript — use them only for caching assets that do not need to be read.

### How do I handle CORS for file uploads?

File uploads with `multipart/form-data` from a different origin require CORS. The server must allow the `POST` method and `Content-Type: multipart/form-data` in `Access-Control-Allow-Headers`. For presigned S3 uploads, configure the S3 bucket CORS policy: `<CORSRule><AllowedOrigin>https://yourapp.com</AllowedOrigin><AllowedMethod>POST</AllowedMethod><AllowedHeader>*</AllowedHeader></CORSRule>`. Do not use `Allow-Origin: *` with presigned uploads if you send credentials — specify exact origins.

### How do I handle CORS with OAuth callbacks?

OAuth redirect flows do not trigger CORS — the browser navigates to the provider's URL directly, not via AJAX. The callback redirect back to your app is also a full page navigation. CORS only applies to `fetch`/`XMLHttpRequest` calls. However, if your SPA uses `fetch` to exchange the authorization code for a token, the token endpoint must send CORS headers allowing your origin. Google and GitHub token endpoints allow all origins by default. For self-hosted OAuth providers, configure the token endpoint to return `Access-Control-Allow-Origin: https://yourapp.com`.

### How do I handle CORS in a microservices architecture with an API gateway?

Configure CORS at the API gateway level, not in each microservice. The gateway handles preflight `OPTIONS` requests and adds CORS headers to responses. Kong, Envoy, and AWS API Gateway all support CORS configuration. If a microservice is called directly (not through the gateway), it must handle CORS itself. For internal service-to-service calls, CORS is irrelevant — browsers are not involved. Use a shared CORS middleware library across services to keep configuration consistent.

### How do I handle CORS with Server-Sent Events (SSE)?

SSE connections (`EventSource`) are subject to CORS. The server must send `Access-Control-Allow-Origin` in the SSE response headers. Unlike `fetch`, `EventSource` does not support custom headers, so you cannot send `Authorization` headers with SSE. Use cookies for authentication with `withCredentials: true` on the `EventSource` constructor, or pass tokens as query parameters. The server must set `Access-Control-Allow-Credentials: true` and specify an exact origin (not `*`).

### How do I handle CORS with environment-specific origins?

Configure allowed origins per environment using environment variables. In development, allow `http://localhost:3000`, `http://localhost:4321`. In staging, allow `https://staging.yourapp.com`. In production, allow `https://yourapp.com`. Store the allowed origins list in a config file or environment variable: `ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com`. Parse the list at startup and validate each request `Origin` against it. Do not hardcode origins in source code — this makes environment promotion error-prone. Use a single `CORS_ORIGINS` env var with comma-separated values for all environments.

### How do I handle CORS with CDN caching?

Add `Vary: Origin` to all CORS responses so the CDN caches different responses per origin. Without `Vary: Origin`, the CDN may serve a response cached for origin A to a request from origin B, causing CORS failures. Configure the CDN to cache CORS responses separately by origin: in Cloudflare, use cache keys that include the `Origin` header. In CloudFront, create a cache behavior that includes `Origin` in the cache key. For APIs with dynamic origin validation, disable CDN caching for CORS responses entirely — set `Cache-Control: no-store` on preflight `OPTIONS` responses.
