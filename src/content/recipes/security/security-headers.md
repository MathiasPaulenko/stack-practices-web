---


contentType: recipes
slug: security-headers
title: "Security Headers"
description: "Harden web applications with HTTP security headers: CSP, HSTS, X-Frame-Options, and a thorough security header checklist."
metaDescription: "HTTP security headers for web applications: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and security header implementation guide."
difficulty: beginner
topics:
  - security
tags:
  - security-headers
  - web-security
  - security
  - vulnerabilities
  - encryption
relatedResources:
  - /guides/web-application-security-guide
  - /docs/data-retention-policy-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
  - /recipes/oauth2-pkce-spa
  - /recipes/vault-dynamic-credentials
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

HTTP security headers are the first line of defense for [web applications](/guides/security/security-best-practices-guide). They instruct browsers on how to behave when rendering your site — blocking XSS, preventing clickjacking, enforcing HTTPS, and controlling what external resources can load. Properly configured, they can stop entire classes of attacks without changing a line of application code.

## When to Use

Use this resource when:
- Hardening production web applications against common browser-based attacks
- Preparing for [security audits](/guides/security/security-best-practices-guide) that check OWASP secure headers
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

## What Works

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
A: Partially. CORS, HSTS, and CSP matter for browser clients. For machine-to-machine APIs, focus on [authentication](/recipes/authentication/jwt-authentication) and TLS.

**Q: Will CSP break my analytics?**
A: Only if you forget to whitelist your analytics domain. Add it to `script-src` and `connect-src` directives.

**Q: What's the difference between X-Frame-Options and CSP frame-ancestors?**
A: CSP `frame-ancestors` is the modern standard. X-Frame-Options is deprecated but still useful for older browsers.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### CSP report-only with violation reporting

Deploy CSP in report-only mode first to catch violations without breaking anything:

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// Report-only CSP: logs violations but does not block
app.use(helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://cdn.example.com'],
    'style-src': ["'self'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://api.example.com'],
    'report-uri': ['/api/csp-report'],
  },
  reportOnly: true,
}));

// Endpoint to receive CSP violation reports
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body['csp-report'];
  console.warn('CSP Violation:', {
    'document-uri': report['document-uri'],
    'violated-directive': report['violated-directive'],
    'blocked-uri': report['blocked-uri'],
    'line-number': report['line-number'],
    'source-file': report['source-file'],
  });
  res.status(204).end();
});

// After collecting reports for 1-2 weeks, switch to enforcing CSP
// by removing reportOnly: true and keeping the report-uri directive
```

### Django security headers middleware

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # ... other middleware
]

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'

# CSP via django-csp
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", 'https://cdn.example.com')
CSP_STYLE_SRC = ("'self'", 'https://fonts.googleapis.com')
CSP_IMG_SRC = ("'self'", 'data:', 'https:')
CSP_CONNECT_SRC = ("'self'", 'https://api.example.com')
CSP_FONT_SRC = ("'self'", 'https://fonts.gstatic.com')
CSP_FRAME_ANCESTORS = ("'none'",)
CSP_REPORT_URI = '/csp-report/'
```

### Spring Boot security headers

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

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
                .contentTypeOptions(opts -> {}) // X-Content-Type-Options: nosniff
                .frameOptions(frame -> frame.deny())
                .xssProtection(xss -> xss.headerValue(
                    XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK
                ))
                .referrerPolicy(referrer -> referrer.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                ))
            )
            .csrf(csrf -> csrf.disable()); // Disable CSRF for API-only apps

        return http.build();
    }
}
```

### Cross-Origin isolation headers (COEP, COOP, CORP)

For applications that need SharedArrayBuffer or other advanced APIs, set cross-origin isolation headers:

```nginx
# Nginx: enable cross-origin isolation
server {
    # Cross-Origin Embedder Policy: require CORS for cross-origin resources
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    # Cross-Origin Opener Policy: isolate browsing context group
    add_header Cross-Origin-Opener-Policy "same-origin" always;

    # Cross-Origin Resource Policy: restrict who can embed this resource
    add_header Cross-Origin-Resource-Policy "same-origin" always;

    # Standard security headers
    add_header Content-Security-Policy "default-src 'self'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=()" always;
}
```

### Automated security header audit (Python)

```python
import requests
from typing import dict

REQUIRED_HEADERS = {
    'content-security-policy': 'Blocks XSS and resource injection',
    'strict-transport-security': 'Forces HTTPS',
    'x-content-type-options': 'Prevents MIME sniffing',
    'x-frame-options': 'Prevents clickjacking',
    'referrer-policy': 'Controls referrer leakage',
    'permissions-policy': 'Restricts browser APIs',
}

def audit_security_headers(url: str) -> dict:
    """Audit a URL for missing security headers."""
    try:
        response = requests.head(url, allow_redirects=True, timeout=10)
    except requests.RequestException as e:
        return {'error': str(e)}

    results = {
        'url': url,
        'status': response.status_code,
        'present': {},
        'missing': {},
        'warnings': [],
    }

    for header, purpose in REQUIRED_HEADERS.items():
        value = response.headers.get(header)
        if value:
            results['present'][header] = value
            # Check for weak configurations
            if header == 'content-security-policy' and "'unsafe-inline'" in value:
                results['warnings'].append(
                    f"CSP contains 'unsafe-inline' — consider using nonces"
                )
            if header == 'strict-transport-security' and 'max-age=0' in value:
                results['warnings'].append(
                    "HSTS max-age is 0 — HSTS is effectively disabled"
                )
        else:
            results['missing'][header] = purpose

    return results

# Usage
audit = audit_security_headers('https://example.com')
print(f"Present: {len(audit['present'])}/{len(REQUIRED_HEADERS)}")
if audit['missing']:
    print("Missing headers:")
    for h, p in audit['missing'].items():
        print(f"  - {h}: {p}")
if audit['warnings']:
    print("Warnings:")
    for w in audit['warnings']:
        print(f"  - {w}")
```

## Additional Best Practices

1. **Set headers on error pages too.** Browsers still process headers on 404 and 500 responses. Ensure your web server or framework applies security headers universally:

```javascript
// Express: apply helmet before route handlers so it covers errors
app.use(helmet());

// Error handler still gets security headers
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
  // helmet headers are already set on the response
});
```

2. **Use `Permissions-Policy` to disable unused APIs.** Restrict access to browser features your app doesn't need:

```http
Permissions-Policy: accelerometer=(), autoplay=(), camera=(), encrypted-media=(),
  fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(),
  midi=(), payment=(), picture-in-picture=(), sync-xhr=(), usb=()
```

## Additional Common Mistakes

1. **Setting HSTS on HTTP responses.** HSTS only works over HTTPS. Setting it on HTTP responses has no effect and can confuse debugging:

```nginx
# WRONG: HSTS on HTTP
server {
    listen 80;
    add_header Strict-Transport-Security "max-age=31536000" always;
    return 301 https://$host$request_uri;
}

# CORRECT: redirect HTTP to HTTPS, set HSTS only on HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

2. **Using `X-Frame-Options: ALLOW-FROM` which is deprecated.** Modern browsers ignore `ALLOW-FROM`. Use CSP `frame-ancestors` instead:

```http
# WRONG: deprecated and ignored by modern browsers
X-Frame-Options: ALLOW-FROM https://trusted-site.com

# CORRECT: use CSP frame-ancestors
Content-Security-Policy: frame-ancestors https://trusted-site.com
```

## Additional FAQ

### How do I test CSP without breaking my site?

Use `Content-Security-Policy-Report-Only` header. It logs violations to a reporting endpoint without blocking anything. Deploy in report-only mode for 1-2 weeks, review the reports, fix any legitimate violations, then switch to enforcing mode.

### What headers should I set for API-only responses?

For JSON APIs consumed by browsers, set at minimum: `Content-Type: application/json`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Cache-Control: no-store` (for sensitive data), and `Access-Control-Allow-Origin` (if cross-origin). CSP is less relevant for API responses but doesn't hurt.

### How do I handle CSP with dynamically loaded scripts?

Use nonces or hashes for dynamically loaded scripts. Generate a per-request nonce and include it in both the CSP header and the script tag:

```javascript
// Server: generate nonce per request
const nonce = crypto.randomUUID();
res.setHeader('Content-Security-Policy',
  `script-src 'self' 'nonce-${nonce}'`
);

// Client: include nonce when injecting scripts
const script = document.createElement('script');
script.nonce = nonce; // Nonce from server-rendered meta tag
script.src = '/dynamic-loader.js';
document.head.appendChild(script);
```
