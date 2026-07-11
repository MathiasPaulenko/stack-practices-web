---
contentType: patterns
slug: structured-logging-pattern
title: "Structured Logging: Emit JSON Logs with Consistent Fields"
description: "How to emit structured JSON logs with consistent fields for searchability. Covers Python structlog, Winston, Serilog, log levels, and log aggregation."
metaDescription: "Emit structured JSON logs with consistent fields for searchability. Learn structlog, Winston, Serilog, log levels, and integration with ELK and Datadog."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - structured-logging
  - json-logs
  - log-aggregation
  - elk
  - pattern
category: architectural
relatedResources:
  - /patterns/correlation-id-pattern
  - /patterns/metrics-aggregation-pattern
  - /patterns/distributed-tracing-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Emit structured JSON logs with consistent fields for searchability. Learn structlog, Winston, Serilog, log levels, and integration with ELK and Datadog."
  keywords:
    - observability
    - structured-logging
    - json-logs
    - log-aggregation
    - elk
    - pattern
---

## Overview

Structured logging emits log entries as JSON objects with consistent fields rather than free-form text. This makes logs machine-parseable, searchable in log aggregation tools (ELK, Datadog, Splunk), and filterable by any field. A structured log entry includes a timestamp, level, message, and contextual fields like correlation ID, user ID, service name, and duration. The pattern replaces `print(f"User {user_id} did {action}")` with `logger.info("user_action", user_id=user_id, action=action)` — producing `{"timestamp": "...", "level": "INFO", "message": "user_action", "user_id": 42, "action": "login"}`.

## When to Use

- Any production application that produces logs consumed by aggregation tools
- Microservices where logs from multiple services need to be correlated
- Applications where you need to search and filter logs by structured fields
- Compliance requirements that demand specific log fields
- Debugging production issues where grep on text logs is insufficient

## When NOT to Use

- CLI tools or scripts where human-readable output is preferred
- Development debugging where `print()` is faster
- Applications with very low log volume where text logs suffice
- Embedded systems with strict memory constraints

## Solution

### Python with structlog

```python
# Python — structlog for structured logging
import structlog
import logging

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Usage
logger.info("user_login", user_id=42, ip_address="192.168.1.1", method="oauth")
logger.error("payment_failed", order_id=123, reason="insufficient_funds", amount=99.99)
logger.warning("rate_limit_approaching", endpoint="/api/orders", current_rate=95, limit=100)

# Output:
# {"event": "user_login", "user_id": 42, "ip_address": "192.168.1.1",
#  "method": "oauth", "level": "info", "timestamp": "2026-01-15T10:00:00Z"}
```

### Python with standard logging + JSON formatter

```python
# Python — standard logging with JSON formatter
import logging
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ("name", "msg", "args", "levelname", "levelno",
                          "pathname", "filename", "module", "exc_info",
                          "exc_text", "stack_info", "lineno", "funcName",
                          "created", "msecs", "relativeCreated", "thread",
                          "threadName", "processName", "process", "message"):
                log_entry[key] = value

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)

# Setup
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger("myapp")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage
logger.info("Order created", extra={"order_id": 123, "customer_id": 456, "total": 99.99})
logger.error("Database connection failed", extra={"host": "db.example.com", "port": 5432})
```

### JavaScript with Winston

```javascript
// JavaScript — Winston structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'order-service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Usage
logger.info('order_created', {
  orderId: 123,
  customerId: 456,
  total: 99.99,
  items: 3,
});

logger.error('payment_failed', {
  orderId: 123,
  reason: 'insufficient_funds',
  amount: 99.99,
  paymentMethod: 'credit_card',
});

logger.warn('rate_limit_warning', {
  endpoint: '/api/orders',
  currentRate: 95,
  limit: 100,
  windowMs: 60000,
});
```

### JavaScript with pino

```javascript
// JavaScript — pino for high-performance structured logging
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'order-service',
    version: '1.0.0',
  },
});

// Usage
logger.info({ orderId: 123, customerId: 456, total: 99.99 }, 'order_created');
logger.error({ orderId: 123, reason: 'insufficient_funds' }, 'payment_failed');

// Child loggers with persistent context
const requestLogger = logger.child({ requestId: 'abc-123', userId: 42 });
requestLogger.info('processing request');
requestLogger.info('request completed', { durationMs: 150 });
```

### Java with SLF4J + Logstash encoder

```java
// Java — Logback with Logstash JSON encoder
// pom.xml: net.logstash.logback:logstash-logback-encoder

// logback.xml
/*
<configuration>
  <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
      <customFields>{"service":"order-service","version":"1.0.0"}</customFields>
    </encoder>
  </appender>
  <root level="INFO">
    <appender-ref ref="JSON" />
  </root>
</configuration>
*/

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    public void createOrder(OrderRequest request) {
        MDC.put("orderId", String.valueOf(request.getOrderId()));
        MDC.put("customerId", String.valueOf(request.getCustomerId()));

        logger.info("order_created total={} items={}",
            request.getTotal(), request.getItems().size());

        try {
            processPayment(request);
            logger.info("payment_successful amount={}", request.getTotal());
        } catch (PaymentException e) {
            logger.error("payment_failed reason={} amount={}",
                e.getReason(), request.getTotal(), e);
        } finally {
            MDC.clear();
        }
    }
}
```

### .NET with Serilog

```csharp
// C# — Serilog structured logging
using Serilog;
using Serilog.Formatting.Json;

Log.Logger = new LoggerConfiguration()
    .Enrich.WithProperty("Service", "order-service")
    .Enrich.WithProperty("Version", "1.0.0")
    .Enrich.FromLogContext()
    .WriteTo.Console(new JsonFormatter())
    .Writeto.File(new JsonFormatter(), "logs/app.log")
    .CreateLogger();

// Usage with structured properties
Log.Information("Order {OrderId} created for customer {CustomerId} with total {Total}",
    order.Id, order.CustomerId, order.Total);

Log.Error("Payment failed for order {OrderId}: {Reason}",
    order.Id, ex.Message);

// Using LogContext for scoped properties
using (LogContext.PushProperty("CorrelationId", correlationId))
{
    Log.Information("Processing order {OrderId}", order.Id);
    // All logs within this scope include CorrelationId
}
```

### Log levels and when to use them

```python
# Python — log level guidelines
import structlog
logger = structlog.get_logger()

# DEBUG — detailed diagnostic info, disabled in production
logger.debug("cache_hit", key="user:42", ttl=300)

# INFO — general operational events (request processed, order created)
logger.info("order_created", order_id=123, total=99.99)

# WARNING — something unexpected but not fatal (rate limit approaching, retry needed)
logger.warning("retry_attempt", attempt=2, max_attempts=3, delay_ms=500)

# ERROR — a failure that should be investigated (payment failed, db error)
logger.error("payment_failed", order_id=123, reason="insufficient_funds")

# CRITICAL — system-wide failure requiring immediate action
logger.critical("database_unreachable", host="db.example.com", port=5432)
```

### Contextual logging with bound fields

```python
# Python — bind context to logger
import structlog
logger = structlog.get_logger()

# Bind persistent context
request_logger = logger.bind(
    correlation_id="abc-123",
    user_id=42,
    endpoint="/api/orders",
)

# All subsequent logs include bound fields
request_logger.info("request_started")
request_logger.info("db_query_executed", query="SELECT * FROM orders", duration_ms=15)
request_logger.info("request_completed", status_code=200, duration_ms=150)

# Output:
# {"correlation_id": "abc-123", "user_id": 42, "endpoint": "/api/orders",
#  "event": "request_started", "level": "info", "timestamp": "..."}
```

### ELK integration

```yaml
# Logstash pipeline configuration for structured logs
input {
  file {
    path => "/var/log/myapp/*.log"
    codec => json
    start_position => "beginning"
  }
}

filter {
  # Ensure timestamp is parsed correctly
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }

  # Add service field if missing
  if ![service] {
    mutate { add_field => { "service" => "unknown" } }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "myapp-logs-%{+YYYY.MM.dd}"
  }
}
```

### Datadog integration

```yaml
# datadog.yaml — collect structured logs
logs:
  - type: file
    path: "/var/log/myapp/*.log"
    service: "order-service"
    source: "python"
    sourcecategory: "sourcecode"
    log_processing_rules:
      - type: multi_line
        name: "json_logs"
        pattern: '^\{'
```

## Variants

### Async logging for high throughput

```python
# Python — async logging with queue handler
import logging
import logging.handlers
import queue

log_queue = queue.Queue(-1)  # Unlimited size

# Queue handler — non-blocking
queue_handler = logging.handlers.QueueHandler(log_queue)

# Queue listener — processes logs in a separate thread
file_handler = logging.FileHandler("app.log")
file_handler.setFormatter(JsonFormatter())

listener = logging.handlers.QueueListener(log_queue, file_handler)
listener.start()

logger = logging.getLogger("myapp")
logger.addHandler(queue_handler)
logger.setLevel(logging.INFO)

# Logs are enqueued without blocking the main thread
logger.info("high_throughput_log", extra={"count": 1000000})
```

### Sampling for high-volume logs

```javascript
// JavaScript — pino with sampling for high-volume logs
const pino = require('pino');

const logger = pino({
  level: 'debug',
  // Log only 10% of debug logs in production
  levelVal: process.env.NODE_ENV === 'production' ? 20 : 10,
});

// Or use a custom sampling strategy
const sampledLogger = pino({
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: 'api' },
}, pino.destination({ sync: false }));

// Sample 1 in every 100 requests at debug level
let requestCount = 0;
function logRequest(req) {
  requestCount++;
  if (requestCount % 100 === 0 || req.path !== '/health') {
    sampledLogger.info({ path: req.path, method: req.method }, 'request_received');
  }
}
```

### Redacting sensitive fields

```python
# Python — redact sensitive fields in logs
import structlog
import re

def redact_sensitive(processor, logger, event_dict):
    sensitive_keys = {"password", "token", "api_key", "credit_card", "ssn"}
    for key in list(event_dict.keys()):
        if key.lower() in sensitive_keys:
            event_dict[key] = "[REDACTED]"
        elif isinstance(event_dict[key], str):
            # Redact credit card numbers in any string field
            event_dict[key] = re.sub(
                r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
                '[REDACTED]',
                event_dict[key],
            )
    return event_dict

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        redact_sensitive,
        structlog.processors.JSONRenderer(),
    ],
)
```

## Best Practices

- Use JSON format in production — machine-parseable, searchable in aggregation tools
- Include context, not just messages — `logger.info("order_created", order_id=123)` not `logger.info("Order 123 created")`
- Use consistent field names — `user_id` everywhere, not `userId` in one service and `user_id` in another
- Include a timestamp in ISO 8601 — `2026-01-15T10:00:00.123Z`
- Use appropriate log levels — DEBUG for dev, INFO for operations, ERROR for failures
- Bind request context — correlation ID, user ID, endpoint should be in every log entry for a request
- Redact sensitive data — passwords, tokens, credit card numbers should never appear in logs
- Use async logging for high throughput — don't let logging block request processing
- Log at boundaries — service entry/exit, external calls, state transitions
- Include duration for operations — `duration_ms` field for any timed operation

## Common Mistakes

- **String interpolation instead of structured fields**: `logger.info(f"User {user_id} logged in")` instead of `logger.info("user_login", user_id=user_id)`. The structured version is searchable by `user_id`.
- **Inconsistent field names**: `user_id` in one service, `userId` in another. Standardize across all services.
- **Logging sensitive data**: passwords, tokens, PII in logs. Redact or omit these fields.
- **Too many log levels**: using all 6 levels inconsistently. Stick to DEBUG, INFO, WARN, ERROR.
- **Not including timestamps**: relying on the log shipper to add timestamps. Include them in the log entry itself.
- **Logging in hot loops**: logging inside tight loops generates enormous volume. Sample or aggregate.

## FAQ

### What is structured logging?

Emitting log entries as JSON objects with consistent fields rather than free-form text. Each entry has a timestamp, level, message, and contextual fields that can be searched and filtered.

### Why JSON logs instead of text?

JSON logs are machine-parseable. Log aggregation tools (ELK, Datadog, Splunk) can index individual fields, enabling queries like `level:error AND service:order-service AND order_id:123`.

### Which log levels should I use?

DEBUG for development diagnostics, INFO for operational events (request processed, order created), WARN for unexpected but non-fatal events, ERROR for failures. Skip CRITICAL unless you have a specific need.

### How do I handle sensitive data in logs?

Redact sensitive fields before logging. Maintain a list of sensitive keys (password, token, api_key) and replace their values with `[REDACTED]`. Use a custom log processor or middleware.

### Should I use async logging?

For high-throughput applications (thousands of log entries per second), yes. Async logging uses a queue to prevent logging from blocking request processing. For low-volume applications, sync logging is fine.
