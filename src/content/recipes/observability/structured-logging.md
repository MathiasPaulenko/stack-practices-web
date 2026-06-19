---
contentType: recipes
slug: structured-logging
title: "Structured Logging"
description: "Implement structured logging with JSON output, correlation IDs, and log aggregation for production observability."
metaDescription: "Structured logging best practices: JSON format, correlation IDs, log levels, aggregation with ELK/Loki, and distributed tracing integration."
difficulty: intermediate
topics:
  - observability
tags:
  - logging
  - observability
  - elk
  - devops
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Structured logging best practices: JSON format, correlation IDs, log levels, aggregation with ELK/Loki, and distributed tracing integration."
  keywords:
    - logging
    - observability
    - elk
    - devops
---
## Overview

Structured logging replaces free-text log messages with machine-readable JSON objects. This enables powerful filtering, aggregation, and correlation across distributed services. Instead of parsing regex from strings like "User 123 logged in at 10:00", structured logs emit { "event": "login", "user_id": 123, "timestamp": "..." } — making log analysis trivial in ELK, Loki, or cloud platforms.

## When to Use

Use this resource when:
- Running more than one service that needs centralized log aggregation
- Debugging issues that span multiple microservices or async jobs
- Building dashboards and alerts based on log events
- Migrating from plain text logs to a modern observability stack

## Solution

### JSON Logger (Node.js with Pino)

```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'user-api', version: '1.2.3' }
});

// Contextual logging with correlation IDs
function handleRequest(req, res) {
  const child = logger.child({
    request_id: req.headers['x-request-id'] || crypto.randomUUID(),
    user_id: req.user?.id,
    route: req.route?.path
  });

  child.info({ event: 'request_start', method: req.method });
  
  try {
    const result = processOrder(req.body);
    child.info({ event: 'order_processed', order_id: result.id });
  } catch (err) {
    child.error({ event: 'order_failed', error: err.message, stack: err.stack });
  }
}
```

### Python with structlog

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

def transfer_funds(from_account, to_account, amount):
    logger.info(
        "transfer_initiated",
        from_account=from_account,
        to_account=to_account,
        amount_cents=amount,
        request_id=get_current_request_id()
    )
```

### Correlation ID Middleware (Go)

```go
func CorrelationIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = uuid.New().String()
        }
        ctx := context.WithValue(r.Context(), "request_id", id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Explanation

**Key fields for every log entry**:
- **timestamp**: ISO 8601 with timezone
- **level**: debug, info, warn, error, fatal
- **service**: Application or component name
- **request_id**: Correlates all logs for a single user request across services
- **event**: Machine-readable action name (snake_case)
- **message**: Human-readable description (optional in pure structured logging)

**Why structured over text?**
- Query logs without brittle regex: { event: "payment_failed", amount: { $gt: 1000 } }
- Automatic aggregation by any field in Elasticsearch/Loki
- Easy integration with tracing (OpenTelemetry) and metrics

## Variants

| Stack | Components | Best For |
|-------|------------|----------|
| ELK | Elasticsearch, Logstash, Kibana | Full-text search; complex dashboards |
| PLG | Promtail, Loki, Grafana | Kubernetes-native; label-based queries |
| CloudWatch | AWS native | AWS infrastructure; minimal setup |
| Datadog | SaaS | APM + logs + traces unified |
| Splunk | Enterprise | Compliance; advanced analytics |

## Best Practices

- **Always include request_id**: Trace a single user journey across 10+ services
- **Use log levels consistently**: debug for dev; info for normal operations; error for actionable issues
- **Never log sensitive data**: Mask PII, tokens, and passwords before serialization
- **Log at service boundaries**: Entry/exit of every HTTP handler, queue consumer, and background job
- **Emit metrics from logs**: Use log-derived metrics for dashboards instead of custom instrumentation

## Common Mistakes

1. **String concatenation in logs**: `log.info("User " + id + " failed")` — prevents indexing
2. **Missing context**: Logs say "Payment failed" without user_id, amount, or error code
3. **Logging at wrong level**: info for every line of code; error for handled exceptions
4. **Ignoring log volume**: Debug logs in production can cost thousands in ingestion fees
5. **Inconsistent field names**: userId vs user_id vs userID breaks aggregation

## Frequently Asked Questions

**Q: Should I use a logging library or console.log?**
A: Always use a library (Pino, Winston, structlog, Zap). They handle buffering, serialization, and log levels correctly.

**Q: How do I correlate logs across microservices?**
A: Propagate a correlation ID in HTTP headers (X-Request-ID) and include it in every log entry. Use a tracing library (OpenTelemetry) for full distributed tracing.

**Q: What is the difference between logs and traces?**
A: Logs are discrete events with timestamps. Traces connect related operations (spans) across services. Use both: structured logs for events, traces for request flow.
