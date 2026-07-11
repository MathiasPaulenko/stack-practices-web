---
contentType: guides
slug: complete-guide-content-security-policy
title: "Content Security Policy: CSP Headers, Nonces, Hashes"
description: "Dominá Content Security Policy: CSP directives, nonces, hashes, reporting, strict-dynamic, nonce-based CSP, hash-based CSP y patrones de despliegue en producción."
metaDescription: "Dominá Content Security Policy: CSP directives, nonces, hashes, reporting, strict-dynamic y patrones de despliegue en producción."
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
  metaDescription: "Dominá Content Security Policy: CSP directives, nonces, hashes, reporting, strict-dynamic y patrones de despliegue en producción."
  keywords:
    - content security policy
    - csp
    - csp nonces
    - csp hashes
    - strict-dynamic
    - xss prevention
    - csp reporting
---

## Introducción

Content Security Policy (CSP) es un browser security mechanism que restringe qué resources una page puede loadear y execute. Es el primary defense contra XSS (Cross-Site Scripting) y data injection attacks. CSP le dice al browser cuáles sources son trusted para scripts, styles, images, fonts, connections y frames. A continuación: CSP directives, nonces, hashes, reporting, strict-dynamic y production deployment patterns.

## How CSP Works

```
Browser loadea page
       │
       ▼
Server envía CSP header
       │
       ▼
Browser enforcea policy
       │
       ├── Script de allowed source? → Execute
       ├── Script de blocked source? → Block + Report
       ├── Inline script con nonce?   → Execute
       ├── Inline script sin nonce?   → Block + Report
       └── eval() call?               → Block (salvo 'unsafe-eval')
```

## CSP Directives

| Directive | Controls |
|-----------|----------|
| `default-src` | Fallback para all resource types |
| `script-src` | JavaScript sources |
| `style-src` | CSS sources |
| `img-src` | Image sources |
| `font-src` | Font sources |
| `connect-src` | XHR, fetch, WebSocket, EventSource destinations |
| `frame-src` | iframe sources |
| `object-src` | plugin sources (Flash, Java) |
| `media-src` | audio y video sources |
| `manifest-src` | web manifest sources |
| `base-uri` | allowed `<base>` tag URIs |
| `form-action` | allowed form submission destinations |
| `frame-ancestors` | quién puede embeddear esta page en un iframe |
| `report-uri` | dónde enviar violation reports |
| `upgrade-insecure-requests` | auto-upgrade HTTP a HTTPS |

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

Nonces (numbers used once) allowéan specific inline scripts y styles. El server genera un unique nonce per request y lo incluye en el CSP header y en los script/style tags.

```typescript
// middleware/cspNonce.ts — Generá nonce y seteá CSP header
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
<!-- Usá nonce en inline scripts -->
<script nonce="<%= nonce %>">
  console.log('This inline script is allowed');
</script>

<!-- Usá nonce en inline styles -->
<style nonce="<%= nonce %>">
  body { margin: 0; }
</style>
```

## Hash-Based CSP

Hashes allowéan inline scripts matcheando su content hash. Usalo para static inline scripts que no cambian.

```bash
# Generá SHA-256 hash del script content
echo -n "console.log('hello');" | openssl dgst -sha256 -binary | openssl base64 -A
# Output: cSp8NJqrr8wKON2F7LDnMoOJyDDJwKu8s1w...
```

```http
Content-Security-Policy:
  script-src 'self' 'sha256-cSp8NJqrr8wKON2F7LDnMoOJyDDJwKu8s1w...';
```

```html
<!-- Este script's content debe matchear el hash exactamente -->
<script>console.log('hello');</script>
```

## Strict-Dynamic

`strict-dynamic` allowéa que scripts loaded por trusted scripts (nonced o hashed) loadeén additional scripts sin listarlos en el CSP. Esto simplifica CSP para applications con dynamic script loading.

```http
Content-Security-Policy:
  script-src 'nonce-abc123' 'strict-dynamic' 'self' https:;
```

Con `strict-dynamic`:
- Scripts con el nonce execute
- Scripts loaded por nonced scripts también execute (transitive trust)
- `'self'` y `https:` son ignored por browsers que soportan `strict-dynamic`
- Funciona con module scripts y dynamic imports

```html
<!-- Nonced loader script -->
<script nonce="abc123">
  // Esto puede loadear additional scripts dynamically
  const script = document.createElement('script');
  script.src = 'https://cdn.example.com/app.js';
  document.head.appendChild(script); // Allowed por strict-dynamic
</script>
```

## CSP Reporting

### Report-Only mode

Deployeá CSP en report-only mode first para encontrar violations sin romper la page:

```http
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'nonce-abc123';
  report-uri /api/csp-reports;
  report-to csp-endpoint;
```

### Report endpoint

```typescript
// routes/cspReports.ts — Recibí CSP violation reports
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

  // Storeéa para analysis
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

### Step 1: Auditá current page

```bash
# Usá Chrome DevTools para encontrar all resource sources
# Lighthouse > Best Practices > CSP
# O usá un CSP generator tool

# Collectéa all external domains desde los que tu page loadea:
# - Scripts: <script src="...">
# - Styles: <link rel="stylesheet" href="...">
# - Images: <img src="...">
# - Fonts: @font-face src
# - API calls: fetch() / XMLHttpRequest URLs
# - WebSocket connections
# - iframes
```

### Step 2: Deployeá Report-Only

```typescript
// Arrancá con report-only para encontrar violations
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

### Step 3: Fixeá violations

```
Common violations y fixes:

1. Inline script sin nonce
   → Agregá nonce al <script> tag o movelo a external file

2. Inline style sin nonce
   → Agregá nonce al <style> tag o movelo a external file

3. eval() usage
   → Remové eval() o agregá 'unsafe-eval' (last resort)

4. Script de unlisted domain
   → Agregá domain a script-src o remové el script

5. WebSocket a unlisted domain
   → Agregá ws:// o wss:// URL a connect-src

6. Image de data: URI
   → Agregá data: a img-src

7. Font de CDN
   → Agregá CDN URL a font-src
```

### Step 4: Enforceá CSP

```typescript
// Switcheá de Report-Only a enforcing
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

### Express con helmet

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

- Arrancá con Report-Only mode — encontrá violations antes de enforcing
- Usá nonces para inline scripts — más flexible que hashes para dynamic content
- Usá `strict-dynamic` — reduce la need de listar every script source
- Seteá `frame-ancestors: 'none'` — prevente clickjacking
- Seteá `base-uri: 'none'` — prevente `<base>` tag injection
- Seteá `object-src: 'none'` — blockeá Flash y other plugins
- Seteá `form-action: 'self'` — prevente form submission a external sites
- Habilitá `upgrade-insecure-requests` — auto-upgrade HTTP a HTTPS
- Monitoreá CSP reports — fixeá violations promptly
- No uses `'unsafe-inline'` para script-src — defeats el purpose de CSP
- Evitá `'unsafe-eval'` — needed para some frameworks pero weakens CSP
- Mantené CSP tan strict como sea possible — cada relaxation es un attack surface

## Common Mistakes

- **Usar `'unsafe-inline'` para script-src**: allowéa cualquier inline script, defeatéando CSP's XSS protection. Usá nonces o hashes en vez.
- **Deployear CSP en enforce mode first**: rompe la page para users. Siempre arrancá con Report-Only.
- **No monitorear CSP reports**: violations pass unnoticed. Seteá up logging y alerting.
- **Listear too many domains en script-src**: increase attack surface. Usá `strict-dynamic` con nonces en vez.
- **Forgetting connect-src**: fetch/XHR a APIs se blockea. Listeá all API endpoints.
- **No setear frame-ancestors**: la page puede ser embedded en iframes, habilitando clickjacking.

## FAQ

### ¿Qué es Content Security Policy?

Un browser security header que restringe qué resources una page puede loadear y execute. Previene XSS blockeando inline scripts sin nonces, scripts de untrusted domains y other injection attacks.

### ¿Qué es un CSP nonce?

Un random string generado per request, incluido en el CSP header y en `<script>` / `<style>` tags. Solo scripts con el correct nonce execute. Nonces preventen attackers de injectear scripts ya que no pueden predict el nonce.

### ¿Qué es strict-dynamic?

Un CSP keyword que allowéa que scripts loaded por trusted scripts (nonced o hashed) loadeén additional scripts. Esto significa que no necesitás listar every script source en el CSP. El trust propaga desde el nonced loader a sus dependencies.

### ¿Cuál es la diferencia entre nonce y hash?

Nonces son per-request random values — good para dynamic content. Hashes son content-based — good para static inline scripts que nunca cambian. Nonces requieren server-side generation per request. Hashes pueden ser computed en build time.

### ¿Cómo handleo third-party scripts con CSP?

Agregá su domain a `script-src`, o loadeálos vía un nonced loader script con `strict-dynamic`. Para analytics scripts que usan inline code, agregá el script's hash a `script-src` o loadeálo a través de un nonced wrapper.
