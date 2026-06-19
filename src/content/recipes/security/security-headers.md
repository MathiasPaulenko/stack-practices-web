---
contentType: recipes
slug: security-headers
title: "Security Headers"
description: "Harden web applications with HTTP security headers: CSP, HSTS, X-Frame-Options, and a comprehensive security header checklist."
metaDescription: "HTTP security headers for web applications: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and security header implementation guide."
difficulty: beginner
topics:
  - security
tags:
  - security-headers
  - web-security
relatedResources:
  - /guides/web-application-security-guide
  - /docs/data-retention-policy-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "HTTP security headers for web applications: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and security header implementation guide."
  keywords:
    - security-headers
    - csp
    - hsts
    - web-security
---
## Overview

HTTP security headers are the first line of defense for [web applications](/guides/web-application-security-guide). They instruct browsers on how to behave when rendering your site — blocking XSS, preventing clickjacking, enforcing HTTPS, and controlling what external resources can load. Properly configured, they can stop entire classes of attacks without changing a line of application code.

## When to Use

Use this resource when:
- Hardening production web applications against common browser-based attacks
- Preparing for [security audits](/docs/penetration-test-template) that check OWASP secure headers
- Serving user-generated content that could contain malicious scripts
- Embedding your application in third-party sites via iframes

## Solution

### Express.js Security Headers Middleware

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://analytics.example.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://cdn.example.com"],
      connectSrc: ["'self'", "https://api.example.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

### Nginx Security Headers

```nginx
server {
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline';" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    location / {
        proxy_pass http://backend;
    }
}
```

### Security Header Audit Script (Bash)

```bash
#!/bin/bash
URL="https://example.com"

echo "Checking security headers for $URL..."
curl -sI "$URL" | grep -iE \
  "(content-security-policy|strict-transport-security|x-content-type-options|x-frame-options|referrer-policy|permissions-policy)"
```

## Explanation

**Essential headers**:

| Header | Purpose | Risk if Missing |
|--------|---------|-----------------|
| Content-Security-Policy (CSP) | Controls loaded scripts/styles | XSS via injected `<script>` tags |
| Strict-Transport-Security (HSTS) | Forces HTTPS | SSL stripping attacks |
| X-Content-Type-Options | Prevents MIME sniffing | Drive-by downloads via fake content types |
| X-Frame-Options | Blocks clickjacking | UI redressing attacks |
| Referrer-Policy | Controls referrer leakage | Sensitive URLs exposed to third parties |
| Permissions-Policy | Restricts browser APIs | Unauthorized camera, microphone, geolocation access |

## Variants

| Framework | Library | Ease |
|-----------|---------|------|
| Express | Helmet | One line |
| Fastify | @fastify/helmet | Plugin |
| Django | django-csp | Middleware |
| Spring | Spring Security | Configuration |
| Rails | secure_headers | Gem |
| Nginx | Native | Manual |

## Best Practices

- **Start with report-only CSP**: `Content-Security-Policy-Report-Only` logs violations without blocking
- **Use nonce for inline scripts**: `<script nonce="random-value">` instead of `'unsafe-inline'`
- **Test before enforcing**: CSP can break third-party widgets, payment forms, and analytics
- **Submit to HSTS preload list**: Include your domain in browser preload lists for automatic HTTPS
- **Set appropriate frame ancestors**: Use CSP `frame-ancestors` instead of legacy `X-Frame-Options`

## Common Mistakes

1. **Overly permissive CSP**: `default-src *` allows any domain to execute scripts
2. **Missing on API responses**: Browsers ignore headers on 404/500 pages, but attackers target them
3. **Forgetting API endpoints**: JSON APIs should still send CORS and CSP headers
4. **Unreported violations**: Without `report-uri`, you won't know when legitimate content is blocked
5. **Inconsistent headers**: Nginx proxy overriding application headers creates gaps

## Frequently Asked Questions

**Q: Do security headers protect APIs?**
A: Partially. CORS, HSTS, and CSP matter for browser clients. For machine-to-machine APIs, focus on [authentication](/recipes/jwt-authentication) and TLS.

**Q: Will CSP break my analytics?**
A: Only if you forget to whitelist your analytics domain. Add it to `script-src` and `connect-src` directives.

**Q: What's the difference between X-Frame-Options and CSP frame-ancestors?**
A: CSP `frame-ancestors` is the modern standard. X-Frame-Options is deprecated but still useful for older browsers.
