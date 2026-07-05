---
contentType: recipes
slug: nodejs-winston-daily-rotate
title: "Rotar Logs Diariamente con Winston"
description: "Cómo configurar rotación diaria de logs en Node.js usando winston y winston-daily-rotate-file, incluyendo límites de tamaño, retención, compresión y combinación de transports."
metaDescription: "Configura rotación diaria de logs en Node.js con winston y winston-daily-rotate-file. Setea límites de tamaño, retención, compresión y combina transports."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - nodejs
  - winston
  - logging
  - rotation
  - recipe
relatedResources:
  - /recipes/observability/nodejs-pino-fast-logging
  - /recipes/observability/nodejs-sentry-error-tracking
  - /recipes/observability/python-structured-logging-json
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura rotación diaria de logs en Node.js con winston y winston-daily-rotate-file. Setea límites de tamaño, retención, compresión y combina transports."
  keywords:
    - observability
    - nodejs
    - winston
    - logging
    - rotation
    - recipe
---

## Overview

Winston es un logger versátil de Node.js. El transport `winston-daily-rotate-file` escribe logs a un archivo que rota diariamente (o cuando alcanza un límite de tamaño). Los archivos viejos se nombran con un date stamp y opcionalmente se comprimen y eliminan después de un período de retención. Esto previene que los archivos de log crezcan indefinidamente y consuman todo el disk space.

## When to Use

- Aplicaciones que escriben logs a archivos (no solo stdout) y necesitan rotación
- Entornos donde un log collector (Fluent Bit, Filebeat) no está disponible
- Servicios long-running donde el crecimiento no bounded de logs llenaría el disk
- Requisitos de compliance que mandan mantener logs por N días y luego eliminarlos

## When NOT to Use

- Aplicaciones containerizadas — escribe JSON a stdout y deja que el orchestrator maneje la rotación
- Logging de alto throughput — pino con stdout es más rápido que Winston con file transports
- Scripts simples — `console.log` o un solo archivo de log es suficiente

## Solution

### Setup

```bash
npm install winston winston-daily-rotate-file
```

### Rotación diaria básica

```javascript
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

logger.info("server_started", { port: 3000 });
logger.warn("cache_miss", { key: "user:42" });
logger.error("database_error", { error: "Connection refused" });
```

Esto crea archivos como `logs/application-2026-07-05.log`, rota diariamente, capea cada archivo a 20MB, y mantiene 14 días de logs.

### Archivo de log de errores separado

```javascript
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    }),
  ],
});

logger.info("goes_to_application_log");
logger.error("goes_to_both_logs");
```

### Agregar output de consola en desarrollo

```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}
```

### Rotación con archivo comprimido

```javascript
const transport = new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "30d",
  zippedArchive: true,
  auditFile: "logs/audit.json",
});

const logger = winston.createLogger({
  transports: [transport],
});
```

Los archivos de log viejos se comprimen con gzip. El audit file trackea qué archivos existen y sus tamaños.

### Formato de log personalizado

```javascript
const logFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
});

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    logFormat,
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

logger.error("something_failed", { error: new Error("boom") });
// Output: {"timestamp":"2026-07-05T10:30:00Z","level":"error","message":"something_failed","error":{"stack":"..."}}
```

### Manejar eventos de rotación

```javascript
const transport = new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
});

transport.on("rotate", (oldFilename, newFilename) => {
  console.log(`Log rotated from ${oldFilename} to ${newFilename}`);
});

transport.on("archive", (zipFilename) => {
  console.log(`Log archived to ${zipFilename}`);
});

transport.on("logRemoved", (removedFilename) => {
  console.log(`Old log removed: ${removedFilename}`);
});

const logger = winston.createLogger({ transports: [transport] });
```

### Rotación por tamaño sin fecha

```javascript
const transport = new DailyRotateFile({
  filename: "logs/application.log",
  maxSize: "10m",
  maxFiles: 5,
  datePattern: "YYYY-MM-DD-HH",
});

const logger = winston.createLogger({ transports: [transport] });
```

Esto rota cuando el archivo alcanza 10MB, mantiene 5 archivos, y usa date patterns horarios.

### Integración con Express

```javascript
const express = require("express");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const morgan = require("morgan");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/access-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    }),
  ],
});

const app = express();

const stream = { write: (msg) => logger.info(msg.trim()) };
app.use(morgan("combined", { stream }));

app.get("/api/users/:id", (req, res) => {
  logger.info("user_fetched", { user_id: req.params.id });
  res.json({ id: req.params.id, name: "Alice" });
});

app.listen(3000);
```

## Variants

### Usar Winston con TypeScript

```typescript
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

interface LogMetadata {
  user_id?: number;
  request_id?: string;
  duration_ms?: number;
}

function logInfo(message: string, meta: LogMetadata = {}): void {
  logger.info(message, meta);
}
```

### Combinar con transport de Sentry

```javascript
const Sentry = require("@sentry/node");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

Sentry.init({ dsn: process.env.SENTRY_DSN });

const sentryTransport = new winston.transports.Stream({
  stream: {
    write: (message) => {
      const logEntry = JSON.parse(message);
      if (logEntry.level === "error") {
        Sentry.captureException(new Error(logEntry.message));
      }
    },
  },
});

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
    sentryTransport,
  ],
});
```

## Best Practices

- Usa `zippedArchive: true` para comprimir logs viejos — ahorra disk space
- Setea `maxFiles` con un sufijo de duración (`14d`, `30d`) para retención basada en tiempo
- Setea `maxSize` para prevenir que un solo día de log crezca demasiado
- Usa transports separados para logs de error e info — los errores necesitan mayor retención
- Agrega un transport de consola solo en desarrollo — el I/O de archivos frena la iteración
- Usa `winston.format.json()` para logs estructurados — más fácil de parsear para log aggregators
- Setea `auditFile` para trackear el estado de rotación — ayuda a debuggear issues de rotación

## Common Mistakes

- **No setear `maxFiles`**: sin retención, los archivos de log viejos se acumulan para siempre y llenan el disk.
- **Setear `maxSize` demasiado pequeño**: la rotación frecuente crea muchos archivos pequeños. 20MB es un default razonable.
- **No usar `zippedArchive`**: los logs sin comprimir consumen 5-10x más disk space.
- **Usar Winston en containers**: los logs de containers deberían ir a stdout, no a archivos. El orchestrator maneja la rotación.
- **No manejar eventos `rotate`**: si necesitas notificar a sistemas externos de la rotación, escucha el evento.

## FAQ

### ¿Cuál es la diferencia entre `maxFiles` como número vs string?

Un número (`maxFiles: 5`) mantiene exactamente 5 archivos. Un string con duración (`maxFiles: "14d"`) mantiene archivos de los últimos 14 días. Usa strings de duración para retención basada en tiempo.

### ¿Cómo cambio el timezone de la fecha en el filename?

Setea el `datePattern` con un formato timezone-aware:

```javascript
new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  // Winston usa el timezone del sistema por defecto
});
```

Para UTC, setea `TZ=UTC` en tu environment.

### ¿Puedo rotar por hora en lugar de día?

Sí. Cambia `datePattern`:

```javascript
new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD-HH",
  maxSize: "100m",
  maxFiles: "7d",
});
```

### ¿Cómo envío archivos rotados a S3?

Usa el evento `archive` para disparar un upload:

```javascript
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const fs = require("fs");

transport.on("archive", async (zipFilename) => {
  const data = fs.readFileSync(zipFilename);
  await s3.upload({
    Bucket: "my-logs",
    Key: `logs/${path.basename(zipFilename)}`,
    Body: data,
  }).promise();
});
```

### ¿Debería usar Winston o pino para logging a archivos?

Usa pino si la performance es crítica (pino es 3-10x más rápido). Usa Winston si necesitas múltiples transports con diferentes formatos y niveles — el sistema de transports de Winston es más flexible.
