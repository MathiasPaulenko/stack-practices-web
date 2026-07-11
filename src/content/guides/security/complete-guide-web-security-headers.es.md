---
contentType: guides
slug: complete-guide-web-security-headers
title: "Guía Completa de Web Security Headers"
description: "Implementa CSP, HSTS, X-Frame-Options y headers seguros. Cubre content security policy, CORS, referrer policy, permissions policy y testing con security scanners."
metaDescription: "Guía completa de web security headers. Implementa CSP, HSTS, X-Frame-Options, CORS, referrer policy, permissions policy y testing con security scanners."
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
  metaDescription: "Guía completa de web security headers. Implementa CSP, HSTS, X-Frame-Options, CORS, referrer policy, permissions policy y testing con security scanners."
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

# Guía Completa de Web Security Headers

## Introducción

Los HTTP security headers le dicen al browser cómo comportarse al manejar el contenido de tu sitio. Previene clickjacking, XSS, MIME-type sniffing, downgrade attacks e information leakage. A continuación: cada security header principal, cómo configurarlos y cómo testear que funcionen.

## Content-Security-Policy (CSP)

CSP es el security header más poderoso. Restringe qué recursos el browser puede cargar — scripts, styles, images, fonts, frames y connections.

### CSP básico

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
```

### CSP con CDN e inline scripts

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'nonce-abc123'; style-src 'self' https://fonts.googleapis.com 'unsafe-hashes' 'sha256-abc123'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

### CSP con nonces (recomendado para contenido dinámico)

```html
<!-- El server genera un nonce único por request -->
<script nonce="abc123">
  console.log("This inline script is allowed");
</script>
```

```http
Content-Security-Policy: script-src 'self' 'nonce-abc123'
```

### CSP con hashes (para inline scripts estáticos)

```bash
# Generar SHA256 hash del contenido del script
echo -n "console.log('hello');" | openssl dgst -sha256 -binary | openssl base64 -A
```

```http
Content-Security-Policy: script-src 'self' 'sha256-abc123='
```

### Report-only mode (testing antes de enforcear)

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

### Referencia de directivas CSP

| Directiva | Controla |
|-----------|----------|
| `default-src` | Fallback para todos los resource types |
| `script-src` | Sources de JavaScript |
| `style-src` | Sources de CSS |
| `img-src` | Sources de images |
| `font-src` | Sources de fonts |
| `connect-src` | XHR, fetch, WebSocket, EventSource |
| `frame-src` | Sources de iframe |
| `frame-ancestors` | Quién puede embeber esta page (anti-clickjacking) |
| `object-src` | Flash, Java, PDF embeds |
| `media-src` | Sources de audio y video |
| `manifest-src` | Web app manifest |
| `worker-src` | Web Workers |
| `base-uri` | Restricción del elemento `<base>` |
| `form-action` | Targets de form submission |
| `upgrade-insecure-requests` | Auto-upgrade HTTP a HTTPS |

## Strict-Transport-Security (HSTS)

Fuerza al browser a usar HTTPS para todos los futuros requests a este dominio.

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `max-age=31536000` — 1 año en segundos
- `includeSubDomains` — aplica a todos los subdominios
- `preload` — opt-in a las HSTS preload lists de los browsers

### HSTS preload list

Submitir tu dominio en [hstspreload.org](https://hstspreload.org) para ser incluido en la preload list bundled de Chrome. Requisitos:

- Certificado HTTPS válido
- Redirect HTTP a HTTPS en el mismo dominio
- HSTS header con `max-age >= 31536000`, `includeSubDomains` y `preload`
- Todos los subdominios sirven HTTPS

## X-Frame-Options

Previene clickjacking controlando quién puede embeber tu page en un iframe.

```http
X-Frame-Options: DENY
```

```http
X-Frame-Options: SAMEORIGIN
```

**Nota:** `frame-ancestors` en CSP reemplaza este header. Usar CSP `frame-ancestors` para browsers modernos, pero mantener `X-Frame-Options` para soporte legacy.

## X-Content-Type-Options

Previene MIME-type sniffing — el browser respeta el Content-Type declarado.

```http
X-Content-Type-Options: nosniff
```

## Referrer-Policy

Controla cuánta referrer information se envía con los requests.

```http
Referrer-Policy: strict-origin-when-cross-origin
```

| Valor | Referrer enviado |
|-------|---------------|
| `no-referrer` | Ninguno |
| `no-referrer-when-downgrade` | Full URL en HTTPS→HTTPS, nada en HTTPS→HTTP |
| `same-origin` | Full URL solo para same-origin requests |
| `origin` | Solo origin (sin path) |
| `strict-origin` | Solo origin, nada en downgrade |
| `origin-when-cross-origin` | Full URL same-origin, solo origin cross-origin |
| `strict-origin-when-cross-origin` | Full URL same-origin, solo origin cross-origin, nada en downgrade |
| `unsafe-url` | Full URL siempre (no recomendado) |

## Permissions-Policy

Controla qué features y APIs del browser la page puede usar (anteriormente Feature-Policy).

```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://trusted.com"), usb=()
```

### Features comunes

```http
Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=()
```

## Cross-Origin Resource Sharing (CORS)

CORS no es un solo header sino un set de headers que controlan cross-origin requests.

### CORS simple

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### CORS con credentials

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Nota:** No puedes usar `Access-Control-Allow-Origin: *` con `Access-Control-Allow-Credentials: true`. Debes especificar el origin exacto.

### Preflight requests

```http
# El browser envía OPTIONS request primero
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

## Cross-Origin Opener Policy (COOP)

Aísla tu page de otros origins para prevenir Spectre-style attacks.

```http
Cross-Origin-Opener-Policy: same-origin
```

## Cross-Origin Embedder Policy (COEP)

Controla qué cross-origin resources pueden ser cargados.

```http
Cross-Origin-Embedder-Policy: require-corp
```

## Cross-Origin Resource Policy (CORP)

Restringe quién puede embeber un resource.

```http
Cross-Origin-Resource-Policy: same-origin
```

## Configuración de Server

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

### Scanners online

- [securityheaders.com](https://securityheaders.com) — califica de A+ a F
- [observatory.mozilla.org](https://observatory.mozilla.org) — scanner de Mozilla
- [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com) — evaluador de CSP

### Browser DevTools

```text
# Chrome DevTools → Security tab
# Muestra: TLS connection, security headers, insecure content warnings

# Chrome DevTools → Network tab → Response Headers
# Inspeccionar cada header en cualquier response
```

### CSP violation reporting

```javascript
// Server endpoint para recibir CSP violation reports
app.post("/csp-report", express.json({ type: "application/csp-report" }), (req, res) => {
  console.log("CSP violation:", req.body);
  res.status(204).end();
});
```

## Pautas

- **Empezar con CSP report-only** — identificar violations antes de enforcear
- **Usar nonces sobre hashes para contenido dinámico** — hashes rompen cuando el contenido cambia
- **Setear `frame-ancestors 'none'`** — protección más fuerte contra clickjacking
- **Siempre incluir `upgrade-insecure-requests`** — auto-upgrade HTTP resources
- **Usar `strict-origin-when-cross-origin` referrer policy** — buen default de privacy
- **Preload HSTS** — proteger contra downgrade attacks en primera visita
- **Testear con securityheaders.com** — apuntar a rating A+
- **Setear headers en todas las responses** — usar `always` en Nginx/Apache para incluir error responses
- **Restringir Permissions-Policy agresivamente** — deshabilitar features que no usas
- **Usar Helmet para Node.js** — defaults sensatos con customización fácil
- **Reviewar CSP mensualmente** — nuevos third-party scripts pueden romper bajo strict CSP
- **Separar CORS por ruta** — no setear global `Access-Control-Allow-Origin: *`

## Errores Comunes

- Usar `unsafe-inline` en CSP — derrota la protección XSS enteramente
- Setear `Access-Control-Allow-Origin: *` con credentials — los browsers rechazan esto
- No incluir `always` en Nginx `add_header` — las error pages pierden security headers
- Usar HSTS preload sin testear — no se puede deshacer fácilmente (toma meses)
- Setear `X-Frame-Options: ALLOW-FROM` — deprecado, usar CSP `frame-ancestors` en su lugar
- No testear CSP antes de enforcear — rompe pages de producción silenciosamente
- Olvidar `object-src 'none'` — permite Flash/Java embeds
- No setear headers en API responses — las APIs necesitan security headers también
- Usar `unsafe-eval` en CSP — requerido por algunos frameworks pero debilita security
- No monitorear CSP reports — las violations pasan desapercibidas en producción

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre CSP `frame-ancestors` y `X-Frame-Options`?

`frame-ancestors` en CSP es el reemplazo moderno de `X-Frame-Options`. Soporta múltiples origins y wildcards, mientras que `X-Frame-Options` solo soporta `DENY` o `SAMEORIGIN`. Mantener ambos para soporte legacy, pero usar CSP como control primario.

### ¿Cómo debuggeo CSP violations?

Chequear la console del browser — las CSP violations se loguean con la URL bloqueada y la directiva que la bloqueó. Usar `Content-Security-Policy-Report-Only` para colectar violations sin romper la page. Setear un reporting endpoint para agregar violations en producción.

### ¿Debo usar `strict-dynamic` en CSP?

`strict-dynamic` permite que scripts cargados por scripts de confianza (nonces o hashes) carguen otros scripts. Esto reduce la necesidad de mantener una whitelist de script URLs. Es recomendado para aplicaciones con dynamic script loading, pero requiere soporte de CSP Level 3 (Chrome 52+, Firefox 52+, Safari 15.4+).
