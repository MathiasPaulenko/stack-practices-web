---
contentType: recipes
slug: nodejs-sentry-error-tracking
title: "Error Tracking con Sentry en Express"
description: "Cómo integrar Sentry para error tracking en aplicaciones Node.js Express, incluyendo error handlers, performance monitoring, release tracking y source maps."
metaDescription: "Integra Sentry error tracking en apps Node.js Express. Captura errores, monitorea performance, trackea releases y sube source maps para stack traces."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - nodejs
  - sentry
  - error-tracking
  - express
  - recipe
relatedResources:
  - /recipes/observability/nodejs-pino-fast-logging
  - /recipes/observability/nodejs-winston-daily-rotate
  - /recipes/observability/python-structured-logging-json
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Integra Sentry error tracking en apps Node.js Express. Captura errores, monitorea performance, trackea releases y sube source maps para stack traces."
  keywords:
    - observability
    - nodejs
    - sentry
    - error-tracking
    - express
    - recipe
---

## Overview

Sentry captura errores no manejados en tu aplicación, los agrupa por similitud y envía alerts. Muestra el stack trace, context del request, info del usuario y breadcrumbs (eventos que llevaron al error). En Express, el middleware de Sentry envuelve el pipeline de requests para que cualquier error thrown o unhandled rejection se capture automáticamente.

## When to Use

- Aplicaciones en producción donde necesitas alerts de error en tiempo real
- Trackear error rates y detección de regresión a través de releases
- Capturar bugs reportados por usuarios con stack traces completos y context del request
- Monitorear performance (transaction tracing) junto con error tracking
- Triage de bugs por severidad, frecuencia y usuarios afectados

## When NOT to Use

- Desarrollo local — usa el debugger y output de consola
- Aplicaciones sin error handling — arregla tus try/catch blocks primero
- Herramientas internas de bajo tráfico — el free tier de Sentry tiene límites de eventos
- Observability solo con logging — Sentry es para errores, no para shipping general de logs

## Solution

### Setup

```bash
npm install @sentry/node
```

### Integración básica con Express

```javascript
const express = require("express");
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://your-dsn@sentry.io/123",
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
});

const app = express();

// El request handler de Sentry debe ser el primer middleware
app.use(Sentry.Handlers.requestHandler());

app.get("/api/users/:id", (req, res) => {
  if (req.params.id === "0") {
    throw new Error("Invalid user ID");
  }
  res.json({ id: req.params.id, name: "Alice" });
});

// El error handler de Sentry debe ir después de todas las rutas
app.use(Sentry.Handlers.errorHandler());

app.listen(3000);
```

### Captura manual de errores

```javascript
Sentry.captureException(new Error("Something went wrong"));

Sentry.captureMessage("Rate limit approaching", "warning");

try {
  JSON.parse("{invalid}");
} catch (err) {
  Sentry.captureException(err);
}
```

### Agregar context a errores

```javascript
// Setear user context
Sentry.setUser({
  id: 42,
  email: "alice@example.com",
  username: "alice",
});

// Setear tags (filtrables en el UI de Sentry)
Sentry.setTag("page_locale", "en-US");
Sentry.setTag("feature_flag", "new_checkout");

// Setear extra context (searchable pero no filterable)
Sentry.setExtra("order_id", "ord-123");
Sentry.setExtra("cart_items", 3);

// Limpiar user después de logout
Sentry.setUser(null);
```

### Breadcrumbs para debugging

```javascript
Sentry.addBreadcrumb({
  category: "auth",
  message: "User authenticated",
  level: "info",
  data: { method: "oauth", provider: "google" },
});

Sentry.addBreadcrumb({
  category: "http",
  message: "GET /api/users/42",
  level: "info",
  data: { status_code: 200, duration_ms: 45 },
});

// Si un error ocurre después, Sentry muestra estos breadcrumbs
```

### Transaction personalizada para performance monitoring

```javascript
const transaction = Sentry.startTransaction({
  name: "process_order",
  op: "function",
});

try {
  const span = transaction.startChild({ op: "validate_payment" });
  // ... validar pago ...
  span.finish();

  const dbSpan = transaction.startChild({ op: "save_order" });
  // ... guardar en DB ...
  dbSpan.finish();
} catch (err) {
  Sentry.captureException(err);
} finally {
  transaction.finish();
}
```

### Release tracking

```javascript
Sentry.init({
  dsn: "https://your-dsn@sentry.io/123",
  release: process.env.SENTRY_RELEASE || "1.0.0",
  environment: process.env.NODE_ENV,
});

// Sentry ahora agrupa errores por release y muestra detección de regresión
```

### Source maps para stack traces legibles

```bash
npm install @sentry/cli --save-dev
```

```javascript
// sentry.config.js
module.exports = {
  org: "your-org",
  project: "your-project",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: process.env.SENTRY_RELEASE,
};
```

Sube source maps durante el build:

```bash
sentry-cli sourcemaps upload --release 1.0.0 ./dist
```

### Integración con Winston

```javascript
const winston = require("winston");
const Sentry = require("@sentry/node");

const logTransport = new winston.transports.Console();

const sentryTransport = {
  log(info) {
    if (info.level === "error") {
      Sentry.captureException(new Error(info.message));
    }
    return true;
  },
};

const logger = winston.createLogger({
  transports: [logTransport, sentryTransport],
});

logger.error("Database connection failed");
// Envía tanto a console como a Sentry
```

### Filtrado y sampling

```javascript
Sentry.init({
  dsn: "https://your-dsn@sentry.io/123",
  tracesSampleRate: 0.1, // 10% de transactions
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
  denyUrls: [
    /extensions\//i,
    /safari-extension/i,
  ],
  beforeSend(event) {
    if (event.request.url.includes("/health")) {
      return null; // No enviar errores de health check
    }
    return event;
  },
});
```

## Variants

### Usar Sentry con Fastify

```javascript
const Fastify = require("fastify");
const Sentry = require("@sentry/node");

Sentry.init({ dsn: "https://your-dsn@sentry.io/123" });

const fastify = Fastify();

fastify.addHook("onRequest", async (request, reply) => {
  request.sentry = Sentry.getCurrentHub();
});

fastify.addHook("onError", async (request, reply, error) => {
  Sentry.captureException(error);
});

fastify.get("/api/error", async () => {
  throw new Error("Fastify error");
});
```

### Usar Sentry con TypeScript

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 0.1,
});

interface UserContext {
  id: string;
  email: string;
}

function setSentryUser(user: UserContext): void {
  Sentry.setUser(user);
}
```

## Best Practices

- Coloca `Sentry.Handlers.requestHandler()` antes de todo otro middleware — necesita envolver el request completo
- Coloca `Sentry.Handlers.errorHandler()` después de todas las rutas — atrapa errores que se escapan
- Setea `release` a tu git commit SHA o version tag — habilita detección de regresión
- Sube source maps en CI — los stack traces minificados son inútiles sin ellos
- Usa `beforeSend` para filtrar ruido (health checks, 404s de assets, errores de extensiones de navegador)
- Setea `tracesSampleRate` a 0.1 en producción — 1.0 abruma tu quota de Sentry
- Usa `setUser()` para identificar quién experimentó el error — invaluable para tickets de soporte
- Agrega breadcrumbs para acciones clave (auth, API calls, state changes) para trazar el path del error

## Common Mistakes

- **No usar el middleware de error handler**: sin `Sentry.Handlers.errorHandler()`, el error handler default de Express atrapa errores antes que Sentry.
- **Setear DSN en código**: usa una environment variable. Commitear el DSN lo expone.
- **No subir source maps**: el código minificado produce stack traces ilegibles. Siempre súbelos en CI.
- **Enviar demasiados eventos**: sin sampling o filtrado, Sentry envía cada error. Filtra ruido con `ignoreErrors` y `denyUrls`.
- **No limpiar user context en logout**: los errores después de logout se atribuyen al usuario anterior.

## FAQ

### ¿Cómo testeo que Sentry funciona?

Crea una ruta de test:

```javascript
app.get("/debug-sentry", () => {
  throw new Error("Sentry test error");
});
```

Visita la ruta y revisa tu dashboard de Sentry para el error.

### ¿Cuál es la diferencia entre `captureException` y `captureMessage`?

`captureException` toma un Error object e incluye el stack trace. `captureMessage` toma un string y crea un evento a nivel de breadcrumb. Usa `captureException` para errores y `captureMessage` para warnings o info.

### ¿Cómo manejo errores async?

El middleware de Sentry para Express atrapa errores async automáticamente en Express 5+. Para Express 4, envuelve los async handlers:

```javascript
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/async", asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```

### ¿Puedo usar Sentry para errores frontend también?

Sí. Instala `@sentry/react` o `@sentry/vue` para frontend. Usa la misma organización y proyecto — Sentry separa errores frontend y backend por plataforma.

### ¿Cómo reduzco costos de Sentry?

- Baja `tracesSampleRate` (0.01 para apps de alto tráfico)
- Usa `ignoreErrors` para filtrar ruido conocido
- Usa `beforeSend` para dropear eventos de health checks y assets estáticos
- Setea `maxBreadcrumbs` a 20 en lugar del default 100
