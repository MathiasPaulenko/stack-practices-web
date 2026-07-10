---
contentType: recipes
slug: nodejs-pino-fast-logging
title: "High-Performance Logging with pino"
description: "How to use pino for fast structured JSON logging in Node.js, including log levels, child loggers, transports, and integration with Express and Fastify."
metaDescription: "Use pino for fast structured JSON logging in Node.js. Configure log levels, child loggers, transports, and integrate with Express and Fastify apps."
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
  - /recipes/observability/python-structured-logging-json
  - /recipes/observability/nodejs-sentry-error-tracking
  - /recipes/observability/nodejs-winston-daily-rotate
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use pino for fast structured JSON logging in Node.js. Configure log levels, child loggers, transports, and integrate with Express and Fastify apps."
  keywords:
    - observability
    - nodejs
    - logging
    - pino
    - json
    - recipe
---

## Overview

pino is the fastest Node.js logger — it writes JSON to stdout synchronously with minimal overhead. Unlike Winston or Bunyan, pino avoids async I/O in the hot path by deferring formatting to a worker thread via transports. This makes it 3-10x faster than alternatives in benchmarks.

## When to Use

- High-throughput APIs where logging overhead matters (thousands of requests per second)
- Microservices that ship JSON logs to a log aggregator (ELK, Loki, Datadog)
- Express or Fastify apps that need request logging middleware
- Replacing `console.log` with structured, filterable output

## When NOT to Use

- CLI tools that need colored human-readable output — use `winston` with `Console` transport
- Scripts where `console.log` is sufficient — pino adds a dependency
- Applications that need complex log routing (multiple files, email alerts) — Winston is more flexible

## Solution

### Setup

```bash
npm install pino
```

### Basic logging

```javascript
const pino = require("pino");

const logger = pino({
  level: "info",
});

logger.info("server_started", { port: 3000 });
logger.warn("cache_miss", { key: "user:42" });
logger.error("database_error", { error: "Connection refused" });
```

Output (JSON to stdout):

```json
{"level":30,"time":1719900000000,"pid":1,"hostname":"api-01","msg":"server_started","port":3000}
```

### Child loggers for request context

```javascript
const logger = pino();

const requestLogger = logger.child({ request_id: "req-abc-123", user_id: 42 });

requestLogger.info("processing_order", { order_id: "ord_456" });
requestLogger.info("order_validated", { items: 3 });
requestLogger.warn("inventory_low", { sku: "widget-001", stock: 2 });
```

Every log line from `requestLogger` includes `request_id` and `user_id`.

### Pretty printing in development

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

Install `pino-pretty` separately: `npm install -D pino-pretty`.

### Log levels

```javascript
const logger = pino({ level: "debug" });

logger.trace("very_detailed");   // level 10
logger.debug("debug_info");      // level 20
logger.info("general_info");     // level 30
logger.warn("warning");          // level 40
logger.error("error_occurred");  // level 50
logger.fatal("crash");           // level 60
```

### Integration with Express

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

Install `pino-http`: `npm install pino-http`.

### Integration with Fastify

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

Fastify has pino built in — no extra setup needed.

### Custom serializers

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

### File transport with rotation

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

For rotation, use `pino-roll`:

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

### Redacting sensitive fields

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

### Error logging with stack traces

```javascript
const logger = pino();

try {
  JSON.parse("{invalid}");
} catch (err) {
  logger.error({ err }, "json_parse_failed");
}
```

pino automatically serializes the `err` key with type, message, and stack.

## Variants

### Using pino with TypeScript

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

### Using pino with OpenTelemetry

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

- Use `pino-pretty` only in development — it adds overhead in production
- Use child loggers for request-scoped context instead of repeating fields in every call
- Set `level` via environment variable: `level: process.env.LOG_LEVEL || "info"`
- Use `redact` paths to strip sensitive fields — don't rely on developers to remember
- Use serializers for complex objects (req, res, err) to control what gets logged
- Ship JSON to stdout in production — let a log collector handle file writing and rotation
- Use `pino-http` for Express or built-in Fastify logging for automatic request/response logs

## Common Mistakes

- **Using pino-pretty in production**: it's synchronous and blocks the event loop. Only use in development.
- **Not using child loggers**: repeating `request_id` in every `logger.info()` call is error-prone. Bind once with `child()`.
- **Logging large objects**: pino serializes synchronously. Logging a 10MB object blocks the event loop. Use serializers to trim.
- **Not setting `level`**: default is `info`. If you need `debug` in staging, set it via env var.
- **Using `console.log` alongside pino**: `console.log` writes unstructured text to stdout, mixing with pino's JSON. Remove all `console.log` calls.

## FAQ

### How fast is pino compared to Winston?

In benchmarks, pino is 3-10x faster than Winston for synchronous JSON logging. The difference comes from pino's synchronous write with deferred formatting vs Winston's async chain.

### How do I send pino logs to Elasticsearch?

Pipe stdout to a log collector (Filebeat, Fluent Bit, Logstash). The JSON format is already structured — no parsing rules needed:

```bash
node app.js | filebeat --config=filebeat.yml
```

### Can I use pino with async/await?

Yes. pino itself is synchronous (no async I/O in the hot path). You can call `logger.info()` inside async functions without issues.

### How do I add a request ID middleware with pino?

```javascript
const { randomUUID } = require("crypto");

app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  req.log = logger.child({ request_id: req.id });
  next();
});
```

### What is the difference between pino transports and pino destinations?

Destinations are writable streams (fast, synchronous). Transports run in a worker thread (async, supports multiple outputs). Use destinations for raw speed, transports for routing to files or external services.

### How do I redact sensitive fields in pino logs?

Use the `redact` option in pino configuration. Specify paths to remove or censor: `redact: { paths: ['req.headers.authorization', 'password', '*.token'], remove: false }`. Setting `remove: false` replaces the value with `[Redacted]`. Setting `remove: true` removes the key entirely from the log output.
