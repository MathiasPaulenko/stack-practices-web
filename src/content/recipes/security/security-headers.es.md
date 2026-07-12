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
  metaDescription: "HTTP security headers para aplicaciones web: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e implementación de headers de seguridad."
  keywords:
    - security-headers
    - csp
    - hsts
    - web-security


---
## Visión General

Los HTTP security headers son la primera línea de defensa para [aplicaciones web](/guides/security/security-best-practices-guide). Instruyen a los navegadores sobre cómo comportarse al renderizar tu sitio — bloqueando XSS, previniendo clickjacking, forzando HTTPS y controlando qué recursos externos pueden cargarse. Configurados correctamente, pueden detener clases enteras de ataques sin cambiar una línea de código de aplicación.

## Cuándo Usar

Usa este recurso cuando:
- Fortaleces aplicaciones web en producción contra ataques comunes basados en navegador
- Te preparas para [auditorías de seguridad](/guides/security/security-best-practices-guide) que verifican headers seguros de OWASP
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

## Lo que funciona

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
R: Parcialmente. CORS, HSTS y CSP importan para clientes de browser. Para APIs machine-to-machine, enfócate en [autenticación](/recipes/authentication/jwt-authentication) y TLS.

**P: ¿CSP romperá mi analytics?**
R: Solo si olvidas whitelistear tu dominio de analytics. Agrégalo a `script-src` y `connect-src`.

**P: ¿Cuál es la diferencia entre X-Frame-Options y CSP frame-ancestors?**
R: CSP `frame-ancestors` es el estándar moderno. X-Frame-Options está deprecado pero útil para browsers antiguos.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### CSP report-only con reporte de violaciones

Despliega CSP en modo report-only primero para capturar violaciones sin romper nada:

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// CSP report-only: logea violaciones pero no bloquea
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

// Endpoint para recibir reportes de violaciones CSP
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body['csp-report'];
  console.warn('Violación CSP:', {
    'document-uri': report['document-uri'],
    'violated-directive': report['violated-directive'],
    'blocked-uri': report['blocked-uri'],
    'line-number': report['line-number'],
    'source-file': report['source-file'],
  });
  res.status(204).end();
});

// Después de recolectar reportes por 1-2 semanas, cambiar a CSP enforceante
// removiendo reportOnly: true y manteniendo la directiva report-uri
```

### Django security headers middleware

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # ... otro middleware
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
            .csrf(csrf -> csrf.disable()); // Deshabilitar CSRF para apps API-only

        return http.build();
    }
}
```

### Headers de aislamiento cross-origin (COEP, COOP, CORP)

Para aplicaciones que necesitan SharedArrayBuffer u otras APIs avanzadas, configura headers de aislamiento cross-origin:

```nginx
# Nginx: habilitar aislamiento cross-origin
server {
    # Cross-Origin Embedder Policy: requiere CORS para recursos cross-origin
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    # Cross-Origin Opener Policy: aislar grupo de contexto de navegación
    add_header Cross-Origin-Opener-Policy "same-origin" always;

    # Cross-Origin Resource Policy: restringir quién puede embeber este recurso
    add_header Cross-Origin-Resource-Policy "same-origin" always;

    # Headers de seguridad estándar
    add_header Content-Security-Policy "default-src 'self'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=()" always;
}
```

### Auditoría automatizada de security headers (Python)

```python
import requests
from typing import dict

REQUIRED_HEADERS = {
    'content-security-policy': 'Bloquea XSS e inyección de recursos',
    'strict-transport-security': 'Fuerza HTTPS',
    'x-content-type-options': 'Previene MIME sniffing',
    'x-frame-options': 'Previene clickjacking',
    'referrer-policy': 'Controla filtración de referrer',
    'permissions-policy': 'Restringe APIs del navegador',
}

def audit_security_headers(url: str) -> dict:
    """Auditar una URL para headers de seguridad faltantes."""
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
            # Verificar configuraciones débiles
            if header == 'content-security-policy' and "'unsafe-inline'" in value:
                results['warnings'].append(
                    f"CSP contiene 'unsafe-inline' — considera usar nonces"
                )
            if header == 'strict-transport-security' and 'max-age=0' in value:
                results['warnings'].append(
                    "HSTS max-age es 0 — HSTS está efectivamente deshabilitado"
                )
        else:
            results['missing'][header] = purpose

    return results

# Uso
audit = audit_security_headers('https://example.com')
print(f"Presentes: {len(audit['present'])}/{len(REQUIRED_HEADERS)}")
if audit['missing']:
    print("Headers faltantes:")
    for h, p in audit['missing'].items():
        print(f"  - {h}: {p}")
if audit['warnings']:
    print("Advertencias:")
    for w in audit['warnings']:
        print(f"  - {w}")
```

## Mejores Prácticas Adicionales

1. **Configura headers también en páginas de error.** Los navegadores siguen procesando headers en respuestas 404 y 500. Asegura que tu web server o framework aplique security headers universalmente:

```javascript
// Express: aplicar helmet antes de los route handlers para que cubra errores
app.use(helmet());

// Error handler sigue recibiendo security headers
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Error interno del servidor' });
  // Los headers de helmet ya están seteados en la respuesta
});
```

2. **Usa `Permissions-Policy` para deshabilitar APIs no usadas.** Restringe acceso a features del navegador que tu app no necesita:

```http
Permissions-Policy: accelerometer=(), autoplay=(), camera=(), encrypted-media=(),
  fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(),
  midi=(), payment=(), picture-in-picture=(), sync-xhr=(), usb=()
```

## Errores Comunes Adicionales

1. **Configurar HSTS en respuestas HTTP.** HSTS solo funciona sobre HTTPS. Configurarlo en respuestas HTTP no tiene efecto y puede confundir el debugging:

```nginx
# INCORRECTO: HSTS en HTTP
server {
    listen 80;
    add_header Strict-Transport-Security "max-age=31536000" always;
    return 301 https://$host$request_uri;
}

# CORRECTO: redirigir HTTP a HTTPS, setear HSTS solo en HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

2. **Usar `X-Frame-Options: ALLOW-FROM` que está deprecado.** Los navegadores modernos ignoran `ALLOW-FROM`. Usa CSP `frame-ancestors` en su lugar:

```http
# INCORRECTO: deprecado e ignorado por navegadores modernos
X-Frame-Options: ALLOW-FROM https://trusted-site.com

# CORRECTO: usar CSP frame-ancestors
Content-Security-Policy: frame-ancestors https://trusted-site.com
```

## Preguntas Frecuentes Adicionales

### ¿Cómo pruebo CSP sin romper mi sitio?

Usa el header `Content-Security-Policy-Report-Only`. Logea violaciones a un endpoint de reporte sin bloquear nada. Despliega en modo report-only por 1-2 semanas, revisa los reportes, arregla cualquier violación legítima, luego cambia a modo enforceante.

### ¿Qué headers debo configurar para respuestas API-only?

Para APIs JSON consumidas por navegadores, configura como mínimo: `Content-Type: application/json`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Cache-Control: no-store` (para datos sensibles), y `Access-Control-Allow-Origin` (si es cross-origin). CSP es menos relevante para respuestas API pero no duele.

### ¿Cómo manejo CSP con scripts cargados dinámicamente?

Usa nonces o hashes para scripts cargados dinámicamente. Genera un nonce por-request e inclúyelo tanto en el header CSP como en el script tag:

```javascript
// Server: generar nonce por request
const nonce = crypto.randomUUID();
res.setHeader('Content-Security-Policy',
  `script-src 'self' 'nonce-${nonce}'`
);

// Client: incluir nonce al inyectar scripts
const script = document.createElement('script');
script.nonce = nonce; // Nonce del meta tag renderizado por server
script.src = '/dynamic-loader.js';
document.head.appendChild(script);
```
