---
contentType: recipes
slug: api-security-headers
title: "Asegurar APIs con HTTP Security Headers"
description: "Cómo configurar headers de seguridad esenciales como HSTS, CSP y X-Frame-Options para proteger APIs y aplicaciones web de ataques comunes."
metaDescription: "Aprende headers de seguridad para APIs. Configura HSTS, CSP, X-Frame-Options y políticas CORS para proteger aplicaciones web de clickjacking, XSS y downgrade attacks."
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
  metaDescription: "Aprende headers de seguridad para APIs. Configura HSTS, CSP, X-Frame-Options y políticas CORS para proteger aplicaciones web de clickjacking, XSS y downgrade attacks."
  keywords:
    - headers seguridad
    - hsts
    - content security policy
    - x frame options
    - api security
    - cors headers
    - owasp headers
---

## Visión general

Los HTTP security headers son una capa de defensa ligera del lado del servidor que instruye a los navegadores cómo manejar tu contenido. No requieren cambios en el código de aplicación y protegen contra clases enteras de ataques: clickjacking vía `X-Frame-Options`, [cross-site scripting](/recipes/security/xss-prevention) vía `Content-Security-Policy`, ataques de downgrade de protocolo vía `Strict-Transport-Security`, y sniffing de MIME-type vía `X-Content-Type-Options`.

[OWASP](/guides/security/security-best-practices-guide) mantiene un cheat sheet dedicado para security headers porque son útiles, fáciles de implementar, y frecuentemente olvidados durante deployments. Un servidor sin estos headers no es inmediatamente vulnerable, pero es considerablemente menos resiliente contra ataques web comunes.

## Cuándo usarlo

Usa esta receta cuando:

- Lanzas una nueva aplicación web o API a producción
- Realizas auditorías de seguridad o tests de penetración
- Endureces aplicaciones existentes después de una revisión de seguridad
- Configuras reverse proxies (Nginx, Apache, CloudFront, Cloudflare)
- Construyes middleware para aplicaciones Express, FastAPI o Spring Boot

## Solución

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

### Configuración Nginx

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

## Explicación

- **Strict-Transport-Security (HSTS)**: Indica a los navegadores que siempre usen HTTPS para tu dominio. Previene ataques de SSL stripping donde un man-in-the-middle downgradearía la conexión a HTTP.
- **Content-Security-Policy (CSP)**: Restringe dónde pueden cargarse scripts, estilos, imágenes y otros recursos. Un CSP estricto bloquea scripts inline y dominios externos no autorizados, neutralizando XSS incluso si un atacante inyecta markup.
- **X-Frame-Options**: Previene que tu sitio sea incrustado en un `<iframe>` en otro dominio. Esto bloquea ataques de clickjacking donde atacantes superponen iframes invisibles para engañar usuarios a hacer clic en elementos maliciosos.
- **X-Content-Type-Options**: Configurar `nosniff` previene que navegadores interpreten archivos como un tipo MIME diferente al declarado. Esto mitiga ataques donde un archivo `.txt` subido por un usuario se ejecuta como JavaScript.

## Variantes

| Header | Ataque prevenido | Requerido? | Soporte de navegador |
|--------|------------------|------------|---------------------|
| HSTS | SSL stripping | Sí | Universal |
| CSP | XSS, inyección de datos | Sí | Universal |
| X-Frame-Options | Clickjacking | Sí | Universal |
| X-Content-Type-Options | MIME sniffing | Sí | Universal |
| Referrer-Policy | Fuga de información | Recomendado | Universal |
| Permissions-Policy | Abuso de funcionalidades | Recomendado | Moderno |

## Lo que funciona

- **Usa Helmet como baseline**: el middleware Helmet para Express configura defaults sensatos para todos los headers principales con una sola línea de código.
- **Empieza con un CSP restrictivo y relaja gradualmente**: comienza con `default-src 'self'` y agrega dominios solo cuando la funcionalidad se rompe. Un CSP demasiado permisivo es casi inútil.
- **Envía a listas de preload de HSTS**: después de correr HSTS por algunas semanas sin problemas, envía tu dominio a la lista de preload de Chrome para que navegadores enforce HTTPS antes de la primera visita.
- **Incluye headers en todas las respuestas**: las páginas de error (404, 500) y respuestas de API deben incluir los mismos headers que las páginas HTML. Los atacantes también apuntan a páginas de error.
- **Testea con securityheader.io o Mozilla Observatory**: estas herramientas escanean tu sitio y califican tu configuración de headers con pasos específicos de remediación.

## Errores comunes

- **Usar `ALLOW-FROM` en X-Frame-Options**: los navegadores modernos no soportan este valor. Usa `SAMEORIGIN` o `DENY` en su lugar.
- **Habilitar `unsafe-inline` para scripts en CSP**: esto desactiva la protección XSS de CSP. Usa nonces o hashes si scripts inline son inevitables.
- **Olvidar endpoints de API**: los headers de seguridad a menudo se configuran para rutas HTML pero se omiten de respuestas JSON de API. Aplícalos globalmente.
- **Configurar HSTS sin HTTPS listo**: si tu sitio todavía sirve tráfico HTTP, HSTS lo romperá para usuarios que hayan visitado la versión HTTPS antes.

## Preguntas frecuentes

**P: ¿Los security headers protegen APIs consumidas por apps móviles?**
R: La mayoría de los security headers son específicos de navegadores. Las apps nativas móviles que usan clientes HTTP no se ven afectadas por CSP o X-Frame-Options. Enfócate en autenticación, validación de input y TLS para comunicación API-a-app.

**P: ¿Puedo configurar security headers en un CDN como Cloudflare?**
R: Sí. Cloudflare Transform Rules y AWS CloudFront Functions pueden inyectar headers en el edge sin tocar código de origen. Esto es útil para sitios estáticos o sistemas legacy.

**P: ¿Cuál es la diferencia entre CSP y CORS?**
R: CSP controla qué recursos puede cargar un navegador cuando renderiza tu página. [CORS](/recipes/api/handle-cors) controla si otros orígenes pueden hacer requests *a* tu API. Son complementarios, no sustitutos.

**P: ¿Debería usar `report-uri` en CSP?**
R: Sí, durante el rollout. La directiva `report-uri` envía reportes de violaciones a un endpoint sin bloquear contenido. Esto te ayuda a identificar fuentes legítimas que olvidaste incluir en la lista blanca antes de hacer la política estricta.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
