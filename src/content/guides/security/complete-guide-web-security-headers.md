---
contentType: guides
slug: complete-guide-web-security-headers
title: "Complete Guide to Web Security Headers"
description: "Implement CSP, HSTS, X-Frame-Options, and secure headers. Covers content security policy, CORS, referrer policy, permissions policy, and testing with security scanners."
metaDescription: "Complete guide to web security headers. Implement CSP, HSTS, X-Frame-Options, CORS, referrer policy, permissions policy and test with security scanners."
difficulty: intermediate
topics:
  - security
  - frontend
tags:
  - security-headers
  - csp
  - hsts
  - cors
  - x-frame-options
  - https
  - guide
  - security
relatedResources:
  - /guides/security/owasp-top-10-guide
  - /guides/frontend/web-components-guide
  - /guides/security/secrets-management-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to web security headers. Implement CSP, HSTS, X-Frame-Options, CORS, referrer policy, permissions policy and test with security scanners."
  keywords:
    - web security headers
    - content security policy
    - csp
    - hsts
    - x-frame-options
    - cors
    - referrer policy
    - permissions policy
---

# Complete Guide to Web Security Headers

## Introduction

HTTP security headers tell the browser how to behave when handling your site's content. They prevent clickjacking, XSS, MIME-type sniffing, downgrade attacks, and information leakage. Here is a hands-on guide to every major security header, how to configure them, and how to test that they work.

## Content-Security-Policy (CSP)

CSP is the most capable security header. It restricts which resources the browser is allowed to load — scripts, styles, images, fonts, frames, and connections.

### Basic CSP

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
```

### CSP with CDN and inline scripts

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'nonce-abc123'; style-src 'self' https://fonts.googleapis.com 'unsafe-hashes' 'sha256-abc123'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

### CSP with nonces (recommended for dynamic content)

```html
<!-- Server generates a unique nonce per request -->
<script nonce="abc123">
  console.log("This inline script is allowed");
</script>
```

```http
Content-Security-Policy: script-src 'self' 'nonce-abc123'
```

### CSP with hashes (for static inline scripts)

```bash
# Generate SHA256 hash of the script content
echo -n "console.log('hello');" | openssl dgst -sha256 -binary | openssl base64 -A
```

```http
Content-Security-Policy: script-src 'self' 'sha256-abc123='
```

### Report-only mode (testing before enforcing)

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

### CSP directives reference

| Directive | Controls |
|-----------|----------|
| `default-src` | Fallback for all resource types |
| `script-src` | JavaScript sources |
| `style-src` | CSS sources |
| `img-src` | Image sources |
| `font-src` | Font sources |
| `connect-src` | XHR, fetch, WebSocket, EventSource |
| `frame-src` | iframe sources |
| `frame-ancestors` | Who can embed this page (anti-clickjacking) |
| `object-src` | Flash, Java, PDF embeds |
| `media-src` | Audio and video sources |
| `manifest-src` | Web app manifest |
| `worker-src` | Web Workers |
| `base-uri` | `<base>` element restriction |
| `form-action` | Form submission targets |
| `upgrade-insecure-requests` | Auto-upgrade HTTP to HTTPS |

## Strict-Transport-Security (HSTS)

Forces the browser to use HTTPS for all future requests to this domain.

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `max-age=31536000` — 1 year in seconds
- `includeSubDomains` — applies to all subdomains
- `preload` — opt-in to browser HSTS preload lists

### HSTS preload list

Submit your domain at [hstspreload.org](https://hstspreload.org) to be included in Chrome's bundled preload list. Requirements:

- Valid HTTPS certificate
- Redirect HTTP to HTTPS on the same domain
- HSTS header with `max-age >= 31536000`, `includeSubDomains`, and `preload`
- All subdomains serve HTTPS

## X-Frame-Options

Prevents clickjacking by controlling who can embed your page in an iframe.

```http
X-Frame-Options: DENY
```

```http
X-Frame-Options: SAMEORIGIN
```

**Note:** `frame-ancestors` in CSP supersedes this header. Use CSP `frame-ancestors` for modern browsers, but keep `X-Frame-Options` for legacy support.

## X-Content-Type-Options

Prevents MIME-type sniffing — the browser respects the declared Content-Type.

```http
X-Content-Type-Options: nosniff
```

## Referrer-Policy

Controls how much referrer information is sent with requests.

```http
Referrer-Policy: strict-origin-when-cross-origin
```

| Value | Referrer sent |
|-------|---------------|
| `no-referrer` | None |
| `no-referrer-when-downgrade` | Full URL on HTTPS→HTTPS, nothing on HTTPS→HTTP |
| `same-origin` | Full URL only for same-origin requests |
| `origin` | Origin only (no path) |
| `strict-origin` | Origin only, nothing on downgrade |
| `origin-when-cross-origin` | Full URL same-origin, origin only cross-origin |
| `strict-origin-when-cross-origin` | Full URL same-origin, origin only cross-origin, nothing on downgrade |
| `unsafe-url` | Full URL always (not recommended) |

## Permissions-Policy

Controls which browser features and APIs the page can use (formerly Feature-Policy).

```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://trusted.com"), usb=()
```

### Common features

```http
Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=()
```

## Cross-Origin Resource Sharing (CORS)

CORS is not a single header but a set of headers that control cross-origin requests.

### Simple CORS

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### CORS with credentials

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Note:** You cannot use `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`. You must specify the exact origin.

### Preflight requests

```http
# Browser sends OPTIONS request first
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

## Cross-Origin Opener Policy (COOP)

Isolates your page from other origins to prevent Spectre-style attacks.

```http
Cross-Origin-Opener-Policy: same-origin
```

## Cross-Origin Embedder Policy (COEP)

Controls which cross-origin resources can be loaded.

```http
Cross-Origin-Embedder-Policy: require-corp
```

## Cross-Origin Resource Policy (CORP)

Restricts who can embed a resource.

```http
Cross-Origin-Resource-Policy: same-origin
```

## Server Configuration

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
}
```

### Apache

```apache
<IfModule mod_headers.c>
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
</IfModule>
```

### Express.js

```javascript
const helmet = require("helmet");

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

## Testing

### Online scanners

- [securityheaders.com](https://securityheaders.com) — grades A+ to F
- [observatory.mozilla.org](https://observatory.mozilla.org) — Mozilla's security header scanner
- [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com) — CSP policy evaluator

### Browser DevTools

```text
# Chrome DevTools → Security tab
# Shows: TLS connection, security headers, insecure content warnings

# Chrome DevTools → Network tab → Response Headers
# Inspect each header on any response
```

### CSP violation reporting

```javascript
// Server endpoint to receive CSP violation reports
app.post("/csp-report", express.json({ type: "application/csp-report" }), (req, res) => {
  console.log("CSP violation:", req.body);
  res.status(204).end();
});
```

## Best Practices

- **Start with CSP report-only** — identify violations before enforcing
- **Use nonces over hashes for dynamic content** — hashes break when content changes
- **Set `frame-ancestors 'none'`** — strongest clickjacking protection
- **Always include `upgrade-insecure-requests`** — auto-upgrade HTTP resources
- **Use `strict-origin-when-cross-origin` referrer policy** — good privacy default
- **Preload HSTS** — protect against first-visit downgrade attacks
- **Test with securityheaders.com** — aim for A+ rating
- **Set headers on all responses** — use `always` in Nginx/Apache to include error responses
- **Restrict Permissions-Policy aggressively** — disable features you do not use
- **Use Helmet for Node.js** — sensible defaults with easy customization
- **Review CSP monthly** — new third-party scripts may break under strict CSP
- **Separate CORS per route** — do not set global `Access-Control-Allow-Origin: *`

## Common Mistakes

- Using `unsafe-inline` in CSP — defeats XSS protection entirely
- Setting `Access-Control-Allow-Origin: *` with credentials — browsers reject this
- Not including `always` in Nginx `add_header` — error pages miss security headers
- Using HSTS preload without testing — cannot be easily undone (takes months)
- Setting `X-Frame-Options: ALLOW-FROM` — deprecated, use CSP `frame-ancestors` instead
- Not testing CSP before enforcing — breaks production pages silently
- Forgetting `object-src 'none'` — allows Flash/Java embeds
- Not setting headers on API responses — APIs need security headers too
- Using `unsafe-eval` in CSP — required by some frameworks but weakens security
- Not monitoring CSP reports — violations go unnoticed in production

## Frequently Asked Questions

### What is the difference between CSP `frame-ancestors` and `X-Frame-Options`?

`frame-ancestors` in CSP is the modern replacement for `X-Frame-Options`. It supports multiple origins and wildcards, while `X-Frame-Options` only supports `DENY` or `SAMEORIGIN`. Keep both for legacy browser support, but use CSP as the primary control.

### How do I debug CSP violations?

Check the browser console — CSP violations are logged with the blocked URL and the directive that blocked it. Use `Content-Security-Policy-Report-Only` to collect violations without breaking the page. Set up a reporting endpoint to aggregate violations in production.

### Should I use `strict-dynamic` in CSP?

`strict-dynamic` allows scripts loaded by trusted scripts (nonces or hashes) to load other scripts. This reduces the need to maintain a whitelist of script URLs. It is recommended for applications with dynamic script loading, but requires CSP Level 3 support (Chrome 52+, Firefox 52+, Safari 15.4+).
