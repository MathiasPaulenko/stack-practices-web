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

[OWASP](/guides/security/security-best-practices-guide) maintains a dedicated cheat sheet for security headers because they are effective, easy to implement, and frequently forgotten during deployments. A server missing these headers is not immediately vulnerable, but it is significantly less resilient against common web attacks.

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

## Best Practices

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

