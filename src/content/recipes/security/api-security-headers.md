---
contentType: recipes
slug: api-security-headers
title: "Secure APIs with HTTP Security Headers"
description: "How to configure essential security headers like HSTS, CSP, and X-Frame-Options to protect APIs and web applications from common attacks."
metaDescription: "Learn API security headers. Configure HSTS, CSP, X-Frame-Options, and CORS policies to protect web apps from clickjacking, XSS, and downgrade attacks."
difficulty: beginner
topics:
  - security
tags:
  - security
  - api-security
  - cors
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/xss-prevention
  - /recipes/sql-injection-prevention
  - /recipes/handle-cors
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn API security headers. Configure HSTS, CSP, X-Frame-Options, and CORS policies to protect web apps from clickjacking, XSS, and downgrade attacks."
  keywords:
    - security headers
    - hsts
    - content security policy
    - x frame options
    - api security
    - cors headers
    - owasp headers
---

## Overview

HTTP security headers are a lightweight, server-side defense layer that instructs browsers how to handle your content. They require no changes to application code and protect against entire classes of attacks: clickjacking via `X-Frame-Options`, [cross-site scripting](/recipes/security/xss-prevention) via `Content-Security-Policy`, protocol downgrade attacks via `Strict-Transport-Security`, and MIME-type sniffing via `X-Content-Type-Options`.

[OWASP](/guides/security/security-best-practices-guide) maintains a dedicated cheat sheet for security headers because they are useful, easy to implement, and frequently forgotten during deployments. A server missing these headers is not immediately vulnerable, but it is considerably less resilient against common web attacks.

## When to Use

Use this recipe when:

- Launching a new web application or API to production
- Conducting security audits or penetration tests
- Hardening existing applications after a security review
- Configuring reverse proxies (Nginx, Apache, CloudFront, Cloudflare)
- Building middleware for Express, FastAPI, or Spring Boot applications

## Solution

### Express.js Middleware

```javascript
const helmet = require('helmet');
const express = require('express');
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=()" always;
}
```

### FastAPI (Python)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app = FastAPI()
app.add_middleware(SecurityHeadersMiddleware)
```

## Explanation

- **Strict-Transport-Security (HSTS)**: Tells browsers to always use HTTPS for your domain. Prevents SSL stripping attacks where a man-in-the-downgrades the connection to HTTP.
- **Content-Security-Policy (CSP)**: Restricts where scripts, styles, images, and other resources can load from. A strict CSP blocks inline scripts and unauthorized external domains, neutralizing XSS even if an attacker injects markup.
- **X-Frame-Options**: Prevents your site from being embedded in an `<iframe>` on another domain. This blocks clickjacking attacks where attackers overlay invisible frames to trick users into clicking malicious elements.
- **X-Content-Type-Options**: Setting `nosniff` prevents browsers from interpreting files as a different MIME type than declared. This mitigates attacks where a user-uploaded `.txt` file is executed as JavaScript.

## Variants

| Header | Attack Prevented | Required? | Browser Support |
|--------|------------------|-----------|-----------------|
| HSTS | SSL stripping | Yes | Universal |
| CSP | XSS, data injection | Yes | Universal |
| X-Frame-Options | Clickjacking | Yes | Universal |
| X-Content-Type-Options | MIME sniffing | Yes | Universal |
| Referrer-Policy | Information leakage | Recommended | Universal |
| Permissions-Policy | Feature abuse | Recommended | Modern |

## What works

- **Use Helmet as a baseline**: the Helmet middleware for Express sets sensible defaults for all major headers with a single line of code.
- **Start with a restrictive CSP and relax gradually**: begin with `default-src 'self'` and add domains only when functionality breaks. A too-permissive CSP is almost worthless.
- **Submit to HSTS preload lists**: after running HSTS for a few weeks without issues, submit your domain to Chrome's preload list so browsers enforce HTTPS before the first visit.
- **Include headers on all responses**: error pages (404, 500) and API responses should include the same headers as HTML pages. Attackers target error pages too.
- **Test with securityheader.io or Mozilla Observatory**: these tools scan your site and grade your header configuration with specific remediation steps.

## Common Mistakes

- **Using `ALLOW-FROM` in X-Frame-Options**: modern browsers do not support this value. Use `SAMEORIGIN` or `DENY` instead.
- **Enabling `unsafe-inline` for scripts in CSP**: this disables CSP's XSS protection. Use nonces or hashes if inline scripts are unavoidable.
- **Forgetting API endpoints**: security headers are often configured for HTML routes but omitted from JSON API responses. Apply them globally.
- **Setting HSTS without HTTPS ready**: if your site still serves HTTP traffic, HSTS will break it for users who have visited the HTTPS version before.

## Frequently Asked Questions

**Q: Do security headers protect APIs consumed by mobile apps?**
A: Most security headers are browser-specific. Mobile native apps using HTTP clients are not affected by CSP or X-Frame-Options. Focus on authentication, input validation, and TLS for API-to-app communication.

**Q: Can I set security headers in a CDN like Cloudflare?**
A: Yes. Cloudflare Transform Rules and AWS CloudFront Functions can inject headers at the edge without touching origin code. This is useful for static sites or legacy systems.

**Q: What is the difference between CSP and CORS?**
A: CSP controls what resources a browser can load when rendering your page. [CORS](/recipes/api/handle-cors) controls whether other origins can make requests *to* your API. They are complementary, not substitutes.

**Q: Should I use `report-uri` in CSP?**
A: Yes, during rollout. The `report-uri` directive sends violation reports to an endpoint without blocking content. This helps you identify legitimate sources you forgot to whitelist before enforcing the policy.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Spring Boot security headers configuration

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityHeadersConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; " +
                    "script-src 'self' https://cdn.example.com; " +
                    "style-src 'self' https://fonts.googleapis.com; " +
                    "img-src 'self' data: https:; " +
                    "connect-src 'self' https://api.example.com; " +
                    "frame-ancestors 'none'; " +
                    "base-uri 'self'; " +
                    "object-src 'none'"
                ))
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true)
                    .preload(true)
                )
                .contentTypeOptions(opts -> {})
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(referrer -> referrer.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                ))
                .permissionsPolicy(permissions -> permissions.policy(
                    "geolocation=(), microphone=(), camera=(), payment=()"
                ))
            );

        return http.build();
    }
}
```

### Cloudflare Workers header injection

Inject security headers at the edge without touching origin infrastructure:

```javascript
export default {
  async fetch(request, env) {
    const response = await fetch(request);

    // Clone the response so we can modify headers
    const newResponse = new Response(response.body, response);

    // Security headers
    newResponse.headers.set('Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload');
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newResponse.headers.set('Permissions-Policy',
      'geolocation=(), microphone=(), camera=()');

    // Only set CSP for HTML responses
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      newResponse.headers.set('Content-Security-Policy',
        "default-src 'self'; script-src 'self' https://cdn.example.com; " +
        "style-src 'self' https://fonts.googleapis.com; " +
        "img-src 'self' data: https:; connect-src 'self' https://api.example.com");
    }

    return newResponse;
  },
};
```

### CORS preflight with security headers

Combine CORS and security headers for cross-origin APIs:

```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// Security headers first
app.use(helmet());

// CORS with specific origin allowlist
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.example.com',
      'https://admin.example.com',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// Explicit preflight handler
app.options('*', cors(corsOptions));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

### Automated header testing with curl

```bash
#!/bin/bash
# audit-headers.sh — Check security headers on a URL

URL="${1:-https://example.com}"
REQUIRED_HEADERS=(
  "strict-transport-security"
  "content-security-policy"
  "x-content-type-options"
  "x-frame-options"
  "referrer-policy"
)

echo "Auditing: $URL"
echo "-----------------------------------"

HEADERS=$(curl -sI "$URL")

for header in "${REQUIRED_HEADERS[@]}"; do
  VALUE=$(echo "$HEADERS" | grep -i "^$header:" | sed 's/^[^:]*: *//')
  if [ -z "$VALUE" ]; then
    echo "MISSING: $header"
  else
    echo "OK: $header = $VALUE"
  fi
done

# Check for weak CSP
CSP=$(echo "$HEADERS" | grep -i "^content-security-policy:" | sed 's/^[^:]*: *//')
if echo "$CSP" | grep -q "unsafe-inline"; then
  echo "WARNING: CSP contains 'unsafe-inline'"
fi
if echo "$CSP" | grep -q "unsafe-eval"; then
  echo "WARNING: CSP contains 'unsafe-eval'"
fi

# Check HSTS max-age
HSTS=$(echo "$HEADERS" | grep -i "^strict-transport-security:" | sed 's/^[^:]*: *//')
if echo "$HSTS" | grep -q "max-age=0"; then
  echo "WARNING: HSTS max-age is 0 (disabled)"
fi
```

## Additional Best Practices

1. **Use `Cross-Origin-Opener-Policy` for SPA isolation.** Prevents other origins from getting a reference to your window object:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

2. **Set `Cache-Control` on API responses with sensitive data.** Prevent caching of authenticated responses:

```http
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

## Additional Common Mistakes

1. **Setting CSP on API responses but not HTML pages.** CSP is most important on HTML pages where scripts execute. API responses returning JSON should still have headers like `X-Content-Type-Options`, but CSP is less critical for them.

2. **Using wildcard `*` in CORS with credentials.** When `credentials: true` is set in CORS, the `Access-Control-Allow-Origin` header cannot be `*`. You must specify exact origins:

```javascript
// WRONG: wildcard with credentials
app.use(cors({ origin: '*', credentials: true }));

// CORRECT: explicit origins
app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,
}));
```

## Additional FAQ

### How do I verify my security headers are working?

Use `curl -I https://your-domain.com` to inspect response headers. For a more thorough audit, use online tools like securityheaders.com, Mozilla Observatory, or the `audit-headers.sh` script above. These tools grade your configuration and provide specific remediation steps.

### Should I set security headers on static assets?

Yes. Static assets served from your domain should have at minimum `X-Content-Type-Options: nosniff` and `Cache-Control` headers. CSP is less relevant for static assets but doesn't hurt. If using a CDN, configure headers at the CDN level.

### What headers does OWASP recommend for APIs?

OWASP recommends: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (for HTML responses), `Cache-Control: no-store` (for sensitive data), `Access-Control-Allow-Origin` (with explicit origins, not wildcards), and `Content-Security-Policy` (for HTML responses).
