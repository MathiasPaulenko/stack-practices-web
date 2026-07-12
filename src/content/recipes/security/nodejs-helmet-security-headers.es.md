---



contentType: recipes
slug: nodejs-helmet-security-headers
title: "Configura headers de seguridad HTTP con Helmet en Node.js"
description: "Establece headers de seguridad HTTP en apps Express con Helmet — CSP, HSTS, X-Frame-Options, X-Content-Type-Options y CORS para seguridad web compliant con OWASP"
metaDescription: "Configura headers de seguridad HTTP con Helmet en Node.js Express. Establece CSP, HSTS, X-Frame-Options, CORS y previene clickjacking, XSS y MIME sniffing."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - nodejs
  - helmet
  - security headers
  - express
  - owasp
relatedResources:
  - /recipes/python-jwt-refresh-token-rotation
  - /recipes/python-sql-injection-sqlalchemy
  - /recipes/python-llm-streaming-responses
  - /guides/complete-guide-content-security-policy
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura headers de seguridad HTTP con Helmet en Node.js Express. Establece CSP, HSTS, X-Frame-Options, CORS y previene clickjacking, XSS y MIME sniffing."
  keywords:
    - helmet nodejs
    - security headers
    - express security
    - csp header
    - hsts header



---

# Configura headers de seguridad HTTP con Helmet en Node.js

Los headers de seguridad HTTP protegen tu web app de clickjacking, XSS, MIME sniffing y man-in-the-middle. Helmet es un middleware de Express que los establece automaticamente. A continuacion: configurar Helmet con Content Security Policy (CSP), HSTS, CORS y headers personalizados para cumplimiento OWASP.

## Cuando Usar Esto


- For alternatives, see [API Security Checklist — Authentication to Encryption](/es/guides/api-security-checklist-guide/).

- Cualquier aplicacion web o API en Express.js
- Despliegues de produccion que requieren cumplimiento de headers de seguridad OWASP
- Apps que sirven HTML a navegadores (CSP es critico para prevencion de XSS)

## Requisitos Previos

- Node.js 18+
- Proyecto Express.js (`npm install express`)
- Helmet (`npm install helmet`)

## Solucion

### 1. Instalar dependencias

```bash
npm install express helmet cors
```

### 2. Configuracion basica de Helmet

```javascript
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const app = express();

// Habilitar Helmet con headers de seguridad por defecto
app.use(helmet());

// Habilitar CORS con origenes especificos
app.use(cors({
  origin: ["https://example.com", "https://app.example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // Cache preflight: 24 horas
}));

app.get("/", (req, res) => {
  res.json({ message: "Secure API" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

### 3. Content Security Policy (CSP) personalizado

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://www.googletagmanager.com",
      ],
      styleSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "'unsafe-inline'", // Requerido para muchos frameworks CSS
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
      ],
      connectSrc: [
        "'self'",
        "https://api.example.com",
        "https://www.google-analytics.com",
      ],
      frameAncestors: ["'none'"], // Prevenir clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
```

### 4. HSTS (HTTP Strict Transport Security)

```javascript
app.use(helmet({
  strictTransportSecurity: {
    maxAge: 31536000, // 1 ano en segundos
    includeSubDomains: true,
    preload: true,
  },
}));
```

### 5. Control fino de headers

```javascript
app.use(helmet({
  // Prevenir clickjacking
  frameguard: { action: "deny" },

  // Prevenir MIME sniffing
  noSniff: true,

  // Ocultar header X-Powered-By
  hidePoweredBy: true,

  // X-Content-Type-Options
  contentTypeOptions: true,

  // Referrer policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },

  // X-Download-Options (IE8)
  ieNoOpen: true,

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: { policy: "require-corp" },

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "same-origin" },

  // Origin Agent Cluster
  originAgentCluster: true,
}));
```

### 6. Configuracion de headers por ruta

```javascript
// Rutas API — headers mas estrictos, sin CSP
const apiHelmet = helmet({
  contentSecurityPolicy: false,
  frameguard: { action: "deny" },
});

app.use("/api", apiHelmet);

// Rutas web — CSP completo
const webHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
});

app.use("/web", webHelmet);
```

### 7. Middleware de headers personalizados

```javascript
// Headers de seguridad personalizados no cubiertos por Helmet
app.use((req, res, next) => {
  // Permissions Policy (sucesor de Feature Policy)
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // X-Robots-Tag (prevenir indexacion de endpoints API)
  if (req.path.startsWith("/api")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }

  // Cache-Control para endpoints sensibles
  if (req.path.includes("/auth") || req.path.includes("/user")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  }

  next();
});
```

### 8. Verificar headers con test

```javascript
const request = require("supertest");

describe("Security Headers", () => {
  it("should set X-Content-Type-Options", async () => {
    const response = await request(app).get("/");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should set X-Frame-Options", async () => {
    const response = await request(app).get("/");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("should set Strict-Transport-Security", async () => {
    const response = await request(app).get("/");
    expect(response.headers["strict-transport-security"]).toContain("max-age=31536000");
  });

  it("should set Content-Security-Policy", async () => {
    const response = await request(app).get("/");
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
  });

  it("should remove X-Powered-By", async () => {
    const response = await request(app).get("/");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
```

## Como Funciona

1. **Content-Security-Policy (CSP)** — el header mas importante. Define que fuentes estan permitidas para cargar scripts, estilos, imagenes, etc. Esto previene XSS bloqueando scripts inline y recursos externos no autorizados.
2. **Strict-Transport-Security (HSTS)** — fuerza al navegador a usar HTTPS para todas las peticiones futuras a este dominio. `includeSubDomains` extiende esto a todos los subdominios. `preload` permite el envio a la lista de preload de HSTS.
3. **X-Frame-Options** — previene que tu pagina sea embebida en un iframe, bloqueando ataques de clickjacking. `DENY` bloquea todo framing; `SAMEORIGIN` permite framing del mismo sitio.
4. **X-Content-Type-Options: nosniff** — previene que los navegadores hagan MIME-sniffing de respuestas, lo que puede llevar a XSS interpretando archivos no-script como scripts.
5. **Referrer-Policy** — controla cuanta informacion de referrer se envia con las peticiones. `strict-origin-when-cross-origin` envia la URL completa para peticiones same-origin pero solo el origin para cross-origin.

## Variantes

### CSP basado en nonce para scripts inline

```javascript
const crypto = require("crypto");

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
    },
  },
}));

// Usar nonce en templates
app.get("/", (req, res) => {
  res.send(`
    <script nonce="${res.locals.nonce}">
      console.log("This inline script is allowed");
    </script>
  `);
});
```

### CSP report-only (testing)

```javascript
// Reportar violaciones sin bloquear — para testear CSP antes de aplicar
app.use(helmet({
  contentSecurityPolicy: {
    reportOnly: true,
    directives: {
      defaultSrc: ["'self'"],
      reportUri: ["/api/csp-report"],
    },
  },
}));

app.post("/api/csp-report", express.json({ type: "application/csp-report" }), (req, res) => {
  console.log("CSP Violation:", req.body);
  res.status(204).end();
});
```

### Produccion vs desarrollo

```javascript
const isProduction = process.env.NODE_ENV === "production";

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  } : false, // Deshabilitar CSP en dev para hot reload

  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false, // Deshabilitar HSTS en dev (HTTP)
}));
```

## Mejores Practicas

- **Empieza con CSP report-only** — usa `reportOnly: true` para encontrar violaciones antes de aplicar
- **Usa nonces para scripts inline** — evita `'unsafe-inline'` en scriptSrc; usa nonces por peticion
- **Establece HSTS solo sobre HTTPS** — HSTS sobre HTTP es ignorado por los navegadores
- **Testea con securityheaders.com** — escanea tu sitio para verificar la configuracion de headers

## Errores Comunes

- **Usar `'unsafe-inline'` en scriptSrc** — anula la proteccion XSS; usa nonces en su lugar
- **Olvidar deshabilitar HSTS en desarrollo** — los navegadores cachean HSTS y no permiten HTTP
- **No establecer `frameAncestors` en CSP** — X-Frame-Options esta deprecado; CSP `frameAncestors` es el equivalente moderno
- **CORS demasiado permisivo** — `origin: "*"` con `credentials: true` es invalido e inseguro

## FAQ

**Q: Helmet hace mi app segura?**
A: Helmet establece headers de seguridad pero no es una solucion de seguridad completa. Todavia necesitas validacion de input, autenticacion y practicas de codigo seguro.

**Q: Debo usar Helmet para backends solo API?**
A: Si. Incluso las APIs se benefician de `noSniff`, `hidePoweredBy` y HSTS. Deshabilita CSP para rutas API ya que no sirven HTML.

**Q: Como depuro violaciones de CSP?**
A: Usa `reportOnly: true` y loguea las violaciones. DevTools del navegador tambien muestra errores de CSP en la consola.

**Q: Puedo usar Helmet con Next.js?**
A: Next.js tiene su propia config de headers. Usa `next.config.js` `headers()` en lugar de Helmet para apps Next.js.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
