---


contentType: recipes
slug: nodejs-pino-fast-logging
title: "Logging de Alta Performance con pino"
description: "Cómo usar pino para logging estructurado JSON rápido en Node.js, incluyendo niveles de log, child loggers, transports e integración con Express y Fastify."
metaDescription: "Usa pino para logging estructurado JSON rápido en Node.js. Configura niveles, child loggers, transports e integra con Express y Fastify apps."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - nodejs
  - logging
  - pino
  - json
  - recipe
relatedResources:
  - /recipes/python-structured-logging-json
  - /recipes/nodejs-sentry-error-tracking
  - /recipes/nodejs-winston-daily-rotate
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa pino para logging estructurado JSON rápido en Node.js. Configura niveles, child loggers, transports e integra con Express y Fastify apps."
  keywords:
    - observability
    - nodejs
    - logging
    - pino
    - json
    - recipe


---

## Overview

pino es el logger más rápido de Node.js — escribe JSON a stdout sincrónicamente con overhead mínimo. A diferencia de Winston o Bunyan, pino evita I/O async en el hot path difiriendo el formatting a un worker thread via transports. Esto lo hace 3-10x más rápido que las alternativas en benchmarks.

## When to Use

- APIs de alto throughput donde el overhead de logging importa (miles de requests por segundo)
- Microservicios que envían logs JSON a un log aggregator (ELK, Loki, Datadog)
- Apps Express o Fastify que necesitan middleware de request logging
- Reemplazar `console.log` con output estructurado y filtrable

## When NOT to Use

- CLI tools que necesitan output human-readable coloreado — usa `winston` con `Console` transport
- Scripts donde `console.log` es suficiente — pino añade una dependencia
- Aplicaciones que necesitan routing de logs complejo (múltiples archivos, alertas por email) — Winston es más flexible

## Solution

### Setup

```bash
npm install pino
```

### Logging básico

```javascript
const pino = require("pino");

const logger = pino({
  level: "info",
});

logger.info("server_started", { port: 3000 });
logger.warn("cache_miss", { key: "user:42" });
logger.error("database_error", { error: "Connection refused" });
```

Output (JSON a stdout):

```json
{"level":30,"time":1719900000000,"pid":1,"hostname":"api-01","msg":"server_started","port":3000}
```

### Child loggers para context de request

```javascript
const logger = pino();

const requestLogger = logger.child({ request_id: "req-abc-123", user_id: 42 });

requestLogger.info("processing_order", { order_id: "ord_456" });
requestLogger.info("order_validated", { items: 3 });
requestLogger.warn("inventory_low", { sku: "widget-001", stock: 2 });
```

Cada línea de log de `requestLogger` incluye `request_id` y `user_id`.

### Pretty printing en desarrollo

```javascript
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
});

logger.info("server_started", { port: 3000 });
```

Instala `pino-pretty` separado: `npm install -D pino-pretty`.

### Niveles de log

```javascript
const logger = pino({ level: "debug" });

logger.trace("very_detailed");   // level 10
logger.debug("debug_info");      // level 20
logger.info("general_info");     // level 30
logger.warn("warning");          // level 40
logger.error("error_occurred");  // level 50
logger.fatal("crash");           // level 60
```

### Integración con Express

```javascript
const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");

const logger = pino({ level: "info" });
const app = express();

app.use(pinoHttp({ logger }));

app.get("/api/users/:id", (req, res) => {
  req.log.info({ user_id: req.params.id }, "fetching_user");
  res.json({ id: req.params.id, name: "Alice" });
});

app.listen(3000);
```

Instala `pino-http`: `npm install pino-http`.

### Integración con Fastify

```javascript
const fastify = require("fastify")({
  logger: {
    level: "info",
    transport: process.env.NODE_ENV === "development"
      ? { target: "pino-pretty" }
      : undefined,
  },
});

fastify.get("/api/users/:id", async (request, reply) => {
  request.log.info({ user_id: request.params.id }, "fetching_user");
  return { id: request.params.id, name: "Alice" };
});

fastify.listen({ port: 3000 });
```

Fastify tiene pino built in — sin setup extra.

### Serializers personalizados

```javascript
const logger = pino({
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        headers: { "user-agent": req.headers["user-agent"] },
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
    err(err) {
      return { type: err.constructor.name, message: err.message, stack: err.stack };
    },
  },
});

logger.info({ req: { method: "GET", url: "/api/users", headers: { "user-agent": "curl/8.0" } } }, "request_received");
```

### File transport con rotación

```javascript
const logger = pino({
  transport: {
    targets: [
      {
        target: "pino/file",
        options: { destination: "./logs/app.log", mkdir: true },
        level: "info",
      },
      {
        target: "pino/file",
        options: { destination: "./logs/errors.log", mkdir: true },
        level: "error",
      },
    ],
  },
});

logger.info("goes_to_app_log");
logger.error("goes_to_both_logs");
```

Para rotación, usa `pino-roll`:

```javascript
const logger = pino({
  transport: {
    target: "pino-roll",
    options: {
      file: "./logs/app",
      frequency: "daily",
      mkdir: true,
    },
  },
});
```

### Redacción de campos sensibles

```javascript
const logger = pino({
  redact: {
    paths: ["password", "api_key", "token", "headers.authorization", "*.credit_card"],
    censor: "[REDACTED]",
  },
});

logger.info({ user: { email: "alice@example.com", password: "secret123" } }, "user_login");
// Output: {"user": {"email": "alice@example.com", "password": "[REDACTED]"}, ...}
```

### Logging de errores con stack traces

```javascript
const logger = pino();

try {
  JSON.parse("{invalid}");
} catch (err) {
  logger.error({ err }, "json_parse_failed");
}
```

pino serializa automáticamente la key `err` con type, message y stack.

## Variants

### Usar pino con TypeScript

```typescript
import pino from "pino";

const logger = pino({
  level: "info",
  base: { service: "user-api", version: "1.0.0" },
});

interface UserLogData {
  user_id: number;
  action: string;
}

function logUserAction(data: UserLogData): void {
  logger.info(data, "user_action");
}
```

### Usar pino con OpenTelemetry

```javascript
const { trace, context } = require("@opentelemetry/api");
const logger = pino();

function logWithTrace(msg, data = {}) {
  const span = trace.getSpan(context.active());
  const traceId = span?.spanContext().traceId;
  const spanId = span?.spanContext().spanId;
  logger.info({ ...data, trace_id: traceId, span_id: spanId }, msg);
}
```

## Best Practices


- For a deeper guide, see [Rotate Logs Daily with Winston](/es/recipes/nodejs-winston-daily-rotate/).

- Usa `pino-pretty` solo en desarrollo — añade overhead en producción
- Usa child loggers para context scoped al request en lugar de repetir campos en cada llamada
- Setea `level` via environment variable: `level: process.env.LOG_LEVEL || "info"`
- Usa paths de `redact` para strippear campos sensibles — no confíes en que los desarrolladores recuerden
- Usa serializers para objetos complejos (req, res, err) para controlar qué se loguea
- Envía JSON a stdout en producción — deja que un log collector maneje la escritura a archivo y rotación
- Usa `pino-http` para Express o logging built-in de Fastify para logs automáticos de request/response

## Common Mistakes

- **Usar pino-pretty en producción**: es sincrónico y bloquea el event loop. Solo úsalo en desarrollo.
- **No usar child loggers**: repetir `request_id` en cada `logger.info()` es error-prone. Bindea una vez con `child()`.
- **Loguear objetos grandes**: pino serializa sincrónicamente. Loguear un objeto de 10MB bloquea el event loop. Usa serializers para trimar.
- **No setear `level`**: el default es `info`. Si necesitas `debug` en staging, setealo via env var.
- **Usar `console.log` junto a pino**: `console.log` escribe texto no estructurado a stdout, mezclándolo con el JSON de pino. Elimina todos los `console.log`.

## FAQ

### ¿Qué tan rápido es pino comparado con Winston?

En benchmarks, pino es 3-10x más rápido que Winston para logging JSON sincrónico. La diferencia viene de la escritura sincrónica de pino con formatting diferido vs la cadena async de Winston.

### ¿Cómo envío logs de pino a Elasticsearch?

Pipea stdout a un log collector (Filebeat, Fluent Bit, Logstash). El formato JSON ya está estructurado — sin reglas de parsing:

```bash
node app.js | filebeat --config=filebeat.yml
```

### ¿Puedo usar pino con async/await?

Sí. pino mismo es sincrónico (sin I/O async en el hot path). Puedes llamar `logger.info()` dentro de funciones async sin issues.

### ¿Cómo agrego un middleware de request ID con pino?

```javascript
const { randomUUID } = require("crypto");

app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  req.log = logger.child({ request_id: req.id });
  next();
});
```

### ¿Cuál es la diferencia entre pino transports y pino destinations?

Destinations son writable streams (rápidos, sincrónicos). Transports corren en un worker thread (async, soporta múltiples outputs). Usa destinations para velocidad pura, transports para rutear a archivos o servicios externos.

### ¿Cómo redacto campos sensibles en logs de pino?

Usa la opción `redact` en la configuración de pino. Especifica paths a remover o censurar: `redact: { paths: ['req.headers.authorization', 'password', '*.token'], remove: false }`. Con `remove: false` reemplaza el valor con `[Redacted]`. Con `remove: true` elimina la key completamente del output del log.
