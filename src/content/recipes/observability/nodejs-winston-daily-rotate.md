---
contentType: recipes
slug: nodejs-winston-daily-rotate
title: "Rotate Logs Daily with Winston"
description: "How to configure daily log rotation in Node.js using winston and winston-daily-rotate-file, including size limits, retention, compression, and transport combining."
metaDescription: "Configure daily log rotation in Node.js with winston and winston-daily-rotate-file. Set size limits, retention policies, compression, and combine transports."
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
  metaDescription: "Configure daily log rotation in Node.js with winston and winston-daily-rotate-file. Set size limits, retention policies, compression, and combine transports."
  keywords:
    - observability
    - nodejs
    - winston
    - logging
    - rotation
    - recipe
---

## Overview

Winston is a versatile Node.js logger. The `winston-daily-rotate-file` transport writes logs to a file that rotates daily (or when it reaches a size limit). Old files are named with a date stamp and optionally compressed and deleted after a retention period. This prevents log files from growing indefinitely and consuming all disk space.

## When to Use

- Applications that write logs to files (not just stdout) and need rotation
- Environments where a log collector (Fluent Bit, Filebeat) is not available
- Long-running services where unbounded log growth would fill the disk
- Compliance requirements that mandate keeping logs for N days then deleting them

## When NOT to Use

- Containerized applications — write JSON to stdout and let the orchestrator handle rotation
- High-throughput logging — pino with stdout is faster than Winston with file transports
- Simple scripts — `console.log` or a single log file is sufficient

## Solution

### Setup

```bash
npm install winston winston-daily-rotate-file
```

### Basic daily rotation

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

This creates files like `logs/application-2026-07-05.log`, rotates daily, caps each file at 20MB, and keeps 14 days of logs.

### Separate error log file

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

### Adding console output in development

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

### Zipped archive rotation

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

Old log files are compressed with gzip. The audit file tracks which files exist and their sizes.

### Custom log format

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

### Handling rotation events

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

### Size-based rotation without date

```javascript
const transport = new DailyRotateFile({
  filename: "logs/application.log",
  maxSize: "10m",
  maxFiles: 5,
  datePattern: "YYYY-MM-DD-HH",
});

const logger = winston.createLogger({ transports: [transport] });
```

This rotates when the file reaches 10MB, keeps 5 files, and uses hourly date patterns.

### Integration with Express

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

### Using Winston with TypeScript

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

### Combining with Sentry transport

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

- Use `zippedArchive: true` to compress old logs — saves disk space
- Set `maxFiles` with a duration suffix (`14d`, `30d`) for time-based retention
- Set `maxSize` to prevent a single day's log from growing too large
- Use separate transports for error and info logs — errors need longer retention
- Add a console transport in development only — file I/O slows down iteration
- Use `winston.format.json()` for structured logs — easier for log aggregators to parse
- Set `auditFile` to track rotation state — helps debug rotation issues

## Common Mistakes

- **Not setting `maxFiles`**: without retention, old log files accumulate forever and fill the disk.
- **Setting `maxSize` too small**: frequent rotation creates many small files. 20MB is a reasonable default.
- **Not using `zippedArchive`**: uncompressed logs consume 5-10x more disk space.
- **Using Winston in containers**: container logs should go to stdout, not files. The orchestrator handles rotation.
- **Not handling `rotate` events**: if you need to notify external systems of rotation, listen to the event.

## FAQ

### What is the difference between `maxFiles` as a number vs a string?

A number (`maxFiles: 5`) keeps exactly 5 files. A string with duration (`maxFiles: "14d"`) keeps files from the last 14 days. Use duration strings for time-based retention.

### How do I change the timezone of the date in the filename?

Set the `datePattern` with a timezone-aware format:

```javascript
new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  // Winston uses the system timezone by default
});
```

For UTC, set `TZ=UTC` in your environment.

### Can I rotate by hour instead of day?

Yes. Change `datePattern`:

```javascript
new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD-HH",
  maxSize: "100m",
  maxFiles: "7d",
});
```

### How do I ship rotated files to S3?

Use the `archive` event to trigger an upload:

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

### Should I use Winston or pino for file logging?

Use pino if performance is critical (pino is 3-10x faster). Use Winston if you need multiple transports with different formats and levels — Winston's transport system is more flexible.
