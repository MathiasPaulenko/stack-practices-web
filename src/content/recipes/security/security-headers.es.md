---
contentType: recipes
slug: security-headers
title: "Security Headers"
description: "Fortalece aplicaciones web con HTTP security headers: CSP, HSTS, X-Frame-Options y una lista de verificación completa de headers de seguridad."
metaDescription: "HTTP security headers para aplicaciones web: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e implementación de headers de seguridad."
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
  metaDescription: "HTTP security headers para aplicaciones web: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e implementación de headers de seguridad."
  keywords:
    - security-headers
    - csp
    - hsts
    - web-security
---
## Visión General

Los HTTP security headers son la primera línea de defensa para [aplicaciones web](/guides/web-application-security-guide). Instruyen a los navegadores sobre cómo comportarse al renderizar tu sitio — bloqueando XSS, previniendo clickjacking, forzando HTTPS y controlando qué recursos externos pueden cargarse. Configurados correctamente, pueden detener clases enteras de ataques sin cambiar una línea de código de aplicación.

## Cuándo Usar

Usa este recurso cuando:
- Fortaleces aplicaciones web en producción contra ataques comunes basados en navegador
- Te preparas para [auditorías de seguridad](/docs/penetration-test-template) que verifican headers seguros de OWASP
- Sirves contenido generado por usuarios que podría contener scripts maliciosos
- Embebes tu aplicación en sitios de terceros vía iframes

## Solución

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

## Explicación

**Headers esenciales**:

| Header | Propósito | Riesgo si Falta |
|--------|-----------|-----------------|
| Content-Security-Policy (CSP) | Controla scripts/styles cargados | XSS vía tags `<script>` inyectados |
| Strict-Transport-Security (HSTS) | Fuerza HTTPS | Ataques de SSL stripping |
| X-Content-Type-Options | Previene MIME sniffing | Drive-by downloads vía content types falsos |
| X-Frame-Options | Bloquea clickjacking | Ataques de UI redressing |
| Referrer-Policy | Controla filtración de referrer | URLs sensibles expuestas a terceros |
| Permissions-Policy | Restringe APIs del navegador | Acceso no autorizado a cámara, micrófono, geolocalización |

## Variantes

| Framework | Librería | Facilidad |
|-----------|----------|----------|
| Express | Helmet | Una línea |
| Fastify | @fastify/helmet | Plugin |
| Django | django-csp | Middleware |
| Spring | Spring Security | Configuración |
| Rails | secure_headers | Gem |
| Nginx | Nativo | Manual |

## Mejores Prácticas

- **Empieza con CSP report-only**: `Content-Security-Policy-Report-Only` logea violaciones sin bloquear
- **Usa nonce para scripts inline**: `<script nonce="random-value">` en lugar de `'unsafe-inline'`
- **Testea antes de enforcear**: CSP puede romper widgets de terceros, formas de pago y analytics
- **Envía a lista de preload HSTS**: Incluye tu dominio en listas de preload de browsers para HTTPS automático
- **Configura frame ancestors apropiadamente**: Usa CSP `frame-ancestors` en lugar del legacy `X-Frame-Options`

## Errores Comunes

1. **CSP demasiado permisivo**: `default-src *` permite cualquier dominio ejecutar scripts
2. **Faltando en responses de API**: Los browsers ignoran headers en páginas 404/500, pero los atacantes las usan
3. **Olvidando endpoints de API**: Las APIs JSON deberían enviar CORS y CSP headers
4. **Violaciones sin reporte**: Sin `report-uri`, no sabrás cuando contenido legítimo está bloqueado
5. **Headers inconsistentes**: Proxy Nginx sobreescribiendo headers de aplicación crea gaps

## Preguntas Frecuentes

**P: ¿Los security headers protegen APIs?**
R: Parcialmente. CORS, HSTS y CSP importan para clientes de browser. Para APIs machine-to-machine, enfócate en [autenticación](/recipes/jwt-authentication) y TLS.

**P: ¿CSP romperá mi analytics?**
R: Solo si olvidas whitelistear tu dominio de analytics. Agrégalo a `script-src` y `connect-src`.

**P: ¿Cuál es la diferencia entre X-Frame-Options y CSP frame-ancestors?**
R: CSP `frame-ancestors` es el estándar moderno. X-Frame-Options está deprecado pero útil para browsers antiguos.
