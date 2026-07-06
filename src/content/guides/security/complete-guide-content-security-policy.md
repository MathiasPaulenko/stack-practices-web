---
contentType: guides
slug: complete-guide-content-security-policy
title: "Complete Guide to Content Security Policy: CSP Headers, Nonces, Hashes"
description: "Master Content Security Policy: CSP directives, nonces, hashes, reporting, strict-dynamic, nonce-based CSP, hash-based CSP, and production deployment patterns for web security."
metaDescription: "Master Content Security Policy: CSP directives, nonces, hashes, reporting, strict-dynamic, and production deployment patterns for web security."
difficulty: advanced
topics:
  - security
  - frontend
tags:
  - guide
  - csp
  - content-security-policy
  - security
  - headers
  - xss
  - nonces
  - hashes
relatedResources:
  - /guides/security/complete-guide-cors-security
  - /guides/security/complete-guide-oauth2-oidc-production
  - /recipes/security/nodejs-helmet-security-headers
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master Content Security Policy: CSP directives, nonces, hashes, reporting, strict-dynamic, and production deployment patterns for web security."
  keywords:
    - content security policy
    - csp
    - csp nonces
    - csp hashes
    - strict-dynamic
    - xss prevention
    - csp reporting
---

## Introduction

Content Security Policy (CSP) is a browser security mechanism that restricts what resources a page can load and execute. It is the primary defense against XSS (Cross-Site Scripting) and data injection attacks. CSP tells the browser which sources are trusted for scripts, styles, images, fonts, connections, and frames. This guide covers CSP directives, nonces, hashes, reporting, strict-dynamic, and production deployment patterns.

## How CSP Works

```
Browser loads page
       │
       ▼
Server sends CSP header
       │
       ▼
Browser enforces policy
       │
       ├── Script from allowed source? → Execute
       ├── Script from blocked source? → Block + Report
       ├── Inline script with nonce?   → Execute
       ├── Inline script without nonce? → Block + Report
       └── eval() call?                → Block (unless 'unsafe-eval')
```

## CSP Directives

| Directive | Controls |
|-----------|----------|
| `default-src` | Fallback for all resource types |
| `script-src` | JavaScript sources |
| `style-src` | CSS sources |
| `img-src` | Image sources |
| `font-src` | Font sources |
| `connect-src` | XHR, fetch, WebSocket, EventSource destinations |
| `frame-src` | iframe sources |
| `object-src` | plugin sources (Flash, Java) |
| `media-src` | audio and video sources |
| `manifest-src` | web manifest sources |
| `base-uri` | allowed `<base>` tag URIs |
| `form-action` | allowed form submission destinations |
| `frame-ancestors` | who can embed this page in an iframe |
| `report-uri` | where to send violation reports |
| `upgrade-insecure-requests` | auto-upgrade HTTP to HTTPS |

## Basic CSP

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline' https://cdn.example.com;
  img-src 'self' data: https:;
  font-src 'self' https://cdn.example.com;
  connect-src 'self' https://api.example.com wss://ws.example.com;
  frame-ancestors 'none';
  base-uri 'none';
  form-action 'self';
  upgrade-insecure-requests;
```

## Nonce-Based CSP

Nonces (numbers used once) allow specific inline scripts and styles. The server generates a unique nonce per request and includes it in the CSP header and in the script/style tags.

```typescript
// middleware/cspNonce.ts — Generate nonce and set CSP header
import crypto from 'crypto';

function cspNonceMiddleware(req: Request, res: Response, next: NextFunction) {
  const nonce = crypto.randomBytes(16).toString('base64');

  res.locals.nonce = nonce;

  res.setHeader('Content-Security-Policy', [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://cdn.example.com`,
    `style-src 'self' 'nonce-${nonce}' https://cdn.example.com`,
    `img-src 'self' data: https:`,
    `font-src 'self' https://cdn.example.com`,
    `connect-src 'self' https://api.example.com`,
    `frame-ancestors 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; '));

  next();
}

app.use(cspNonceMiddleware);
```

```html
<!-- Use nonce in inline scripts -->
<script nonce="<%= nonce %>">
  console.log('This inline script is allowed');
</script>

<!-- Use nonce in inline styles -->
<style nonce="<%= nonce %>">
  body { margin: 0; }
</style>
```

## Hash-Based CSP

Hashes allow inline scripts by matching their content hash. Use this for static inline scripts that don't change.

```bash
# Generate SHA-256 hash of script content
echo -n "console.log('hello');" | openssl dgst -sha256 -binary | openssl base64 -A
# Output: cSp8NJqrr8wKON2F7LDnMoOJyDDJwKu8s1w...
```

```http
Content-Security-Policy:
  script-src 'self' 'sha256-cSp8NJqrr8wKON2F7LDnMoOJyDDJwKu8s1w...';
```

```html
<!-- This script's content must match the hash exactly -->
<script>console.log('hello');</script>
```

## Strict-Dynamic

`strict-dynamic` allows scripts loaded by trusted scripts (nonced or hashed) to load additional scripts without listing them in the CSP. This simplifies CSP for applications with dynamic script loading.

```http
Content-Security-Policy:
  script-src 'nonce-abc123' 'strict-dynamic' 'self' https:;
```

With `strict-dynamic`:
- Scripts with the nonce execute
- Scripts loaded by nonced scripts also execute (transitive trust)
- `'self'` and `https:` are ignored by browsers that support `strict-dynamic`
- Works with module scripts and dynamic imports

```html
<!-- Nonced loader script -->
<script nonce="abc123">
  // This can load additional scripts dynamically
  const script = document.createElement('script');
  script.src = 'https://cdn.example.com/app.js';
  document.head.appendChild(script); // Allowed by strict-dynamic
</script>
```

## CSP Reporting

### Report-Only mode

Deploy CSP in report-only mode first to find violations without breaking the page:

```http
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'nonce-abc123';
  report-uri /api/csp-reports;
  report-to csp-endpoint;
```

### Report endpoint

```typescript
// routes/cspReports.ts — Receive CSP violation reports
app.post('/api/csp-reports', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body['csp-report'];

  console.warn('CSP Violation:', {
    documentUri: report['document-uri'],
    violatedDirective: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    lineNumber: report['line-number'],
    sourceFile: report['source-file'],
    scriptSample: report['script-sample']?.substring(0, 100),
  });

  // Store for analysis
  cspViolationStore.save(report);

  res.status(204).end();
});
```

### Report-To header

```http
Report-To: {"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"https://example.com/api/csp-reports"}]}
Content-Security-Policy: ...; report-to csp-endpoint;
```

## Production Deployment

### Step 1: Audit current page

```bash
# Use Chrome DevTools to find all resource sources
# Lighthouse > Best Practices > CSP
# Or use a CSP generator tool

# Collect all external domains your page loads from:
# - Scripts: <script src="...">
# - Styles: <link rel="stylesheet" href="...">
# - Images: <img src="...">
# - Fonts: @font-face src
# - API calls: fetch() / XMLHttpRequest URLs
# - WebSocket connections
# - iframes
```

### Step 2: Deploy Report-Only

```typescript
// Start with report-only to find violations
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  res.setHeader('Content-Security-Policy-Report-Only', [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: https:`,
    `font-src 'self' https://cdn.example.com`,
    `connect-src 'self' https://api.example.com wss://ws.example.com`,
    `frame-ancestors 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `report-uri /api/csp-reports`,
  ].join('; '));

  next();
});
```

### Step 3: Fix violations

```
Common violations and fixes:

1. Inline script without nonce
   → Add nonce to <script> tag or move to external file

2. Inline style without nonce
   → Add nonce to <style> tag or move to external file

3. eval() usage
   → Remove eval() or add 'unsafe-eval' (last resort)

4. Script from unlisted domain
   → Add domain to script-src or remove the script

5. WebSocket to unlisted domain
   → Add ws:// or wss:// URL to connect-src

6. Image from data: URI
   → Add data: to img-src

7. Font from CDN
   → Add CDN URL to font-src
```

### Step 4: Enforce CSP

```typescript
// Switch from Report-Only to enforcing
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  res.setHeader('Content-Security-Policy', [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: https:`,
    `font-src 'self' https://cdn.example.com`,
    `connect-src 'self' https://api.example.com wss://ws.example.com`,
    `frame-ancestors 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; '));

  next();
});
```

## Framework Integration

### Next.js

```javascript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
  style-src 'self' 'nonce-${nonce}';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'none';
  form-action 'self';
`;

module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [{
        key: 'Content-Security-Policy',
        value: cspHeader.replace(/\s+/g, ' ').trim(),
      }],
    }];
  },
};
```

### Express with helmet

```typescript
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, "'strict-dynamic'"],
    styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https://cdn.example.com'],
    connectSrc: ["'self'", 'https://api.example.com', 'wss://ws.example.com'],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));
```

## Best Practices

- Start with Report-Only mode — find violations before enforcing
- Use nonces for inline scripts — more flexible than hashes for dynamic content
- Use `strict-dynamic` — reduces the need to list every script source
- Set `frame-ancestors: 'none'` — prevents clickjacking
- Set `base-uri: 'none'` — prevents `<base>` tag injection
- Set `object-src: 'none'` — blocks Flash and other plugins
- Set `form-action: 'self'` — prevents form submission to external sites
- Enable `upgrade-insecure-requests` — auto-upgrades HTTP to HTTPS
- Monitor CSP reports — fix violations promptly
- Don't use `'unsafe-inline'` for script-src — defeats the purpose of CSP
- Avoid `'unsafe-eval'` — needed for some frameworks but weakens CSP
- Keep CSP as strict as possible — every relaxation is an attack surface

## Common Mistakes

- **Using `'unsafe-inline'` for script-src**: allows any inline script, defeating CSP's XSS protection. Use nonces or hashes instead.
- **Deploying CSP in enforce mode first**: breaks the page for users. Always start with Report-Only.
- **Not monitoring CSP reports**: violations go unnoticed. Set up logging and alerting.
- **Listing too many domains in script-src**: increases attack surface. Use `strict-dynamic` with nonces instead.
- **Forgetting connect-src**: fetch/XHR to APIs gets blocked. List all API endpoints.
- **Not setting frame-ancestors**: page can be embedded in iframes, enabling clickjacking.

## FAQ

### What is Content Security Policy?

A browser security header that restricts what resources a page can load and execute. It prevents XSS by blocking inline scripts without nonces, scripts from untrusted domains, and other injection attacks.

### What is a CSP nonce?

A random string generated per request, included in the CSP header and in `<script>` / `<style>` tags. Only scripts with the correct nonce execute. Nonces prevent attackers from injecting scripts since they can't predict the nonce.

### What is strict-dynamic?

A CSP keyword that allows scripts loaded by trusted scripts (nonced or hashed) to load additional scripts. This means you don't need to list every script source in the CSP. The trust propagates from the nonced loader to its dependencies.

### What is the difference between nonce and hash?

Nonces are per-request random values — good for dynamic content. Hashes are content-based — good for static inline scripts that never change. Nonces require server-side generation per request. Hashes can be computed at build time.

### How do I handle third-party scripts with CSP?

Add their domain to `script-src`, or load them via a nonced loader script with `strict-dynamic`. For analytics scripts that use inline code, add the script's hash to `script-src` or load it through a nonced wrapper.
