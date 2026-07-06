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
lastUpdated: "2026-06-11"
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
