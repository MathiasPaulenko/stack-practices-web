---
contentType: recipes
slug: logging
title: "Logging"
description: "How to implement structured, level-based logging across Python, JavaScript, and Java with best practices for production observability."
metaDescription: "Practical logging examples in Python, JavaScript, and Java. Learn structured logging, log levels, rotation, and production observability patterns."
difficulty: beginner
topics:
  - api
tags:
  - api
  - java
  - javascript
relatedResources:
  - /recipes/handle-errors
  - /recipes/middleware
  - /recipes/environment-variables
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical logging examples in Python, JavaScript, and Java. Learn structured logging, log levels, rotation, and production observability patterns."
  keywords:
    - logging
    - structured logging
    - log levels
    - python logging
    - winston
    - slf4j
    - loguru
    - observability
    - log rotation
    - production logging
---

## Overview

Logging is the practice of recording application events, errors, and state for debugging, monitoring, and auditing. Good logging is structured, level-based, and includes contextual metadata (timestamps, request IDs, user IDs) without exposing sensitive data.

In production, logs are your primary source of truth when things go wrong. Invest in logging early.

## When to Use

Use this recipe when:

- Debugging application behavior in production
- Monitoring errors, performance, and business events
- Auditing user actions for compliance or security
- Building dashboards and alerts from log data
- Tracing requests across distributed services

## Solution

### Python (Loguru)

```python
from loguru import logger
import sys

# Configure structured JSON logging for production
logger.remove()
logger.add(sys.stdout, format="{time} {level} {message}", level="INFO")
logger.add("app.log", rotation="10 MB", retention="7 days", level="DEBUG")

# Usage
logger.debug("Processing user {}", user_id)
logger.info("User {} logged in", user_id)
logger.warning("Rate limit approaching for API key {}", api_key[:4])
logger.error("Database connection failed: {}", exc_info=True)

# Structured logging
logger.bind(request_id="abc-123").info("Request completed", extra={"duration_ms": 45})
```

### JavaScript (Winston)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log', maxsize: 10_000_000, maxFiles: 5 }),
  ],
});

// Usage
logger.debug('Processing user %s', userId);
logger.info('User logged in', { userId });
logger.warn('Rate limit approaching', { apiKey: apiKey.slice(0, 4) });
logger.error('Database connection failed', { error });
```

### Java (SLF4J + Logback)

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    public void login(String userId) {
        logger.debug("Processing user {}", userId);
        logger.info("User {} logged in", userId);
        
        try {
            // ...
        } catch (Exception e) {
            logger.error("Database connection failed", e);
        }
    }
}
```

## Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| **DEBUG** | Detailed diagnostic info | Variable values, loop iterations |
| **INFO** | Normal application events | Requests processed, jobs completed |
| **WARN** | Recoverable issues | Deprecated API usage, rate limit close |
| **ERROR** | Failed operations | Database timeout, file not found |
| **FATAL/CRITICAL** | System unusable | Out of memory, disk full |

## Best Practices

- **Use structured JSON logs** in production for easy parsing by log aggregators (ELK, Datadog, CloudWatch)
- **Include correlation IDs**: Pass a `request_id` through all logs in a single request chain
- **Never log secrets**: Mask API keys, tokens, and PII before logging
- **Log at the right level**: Use DEBUG for dev, INFO for normal ops, WARN for anomalies, ERROR for failures
- **Enable log rotation**: Prevent disk exhaustion with size-based or time-based rotation
- **Log exceptions with stack traces**: Always include the exception object, not just the message

## Common Mistakes

- Logging too much at INFO level, drowning signal in noise
- Using `print` or `console.log` in production instead of a logging framework
- Including raw passwords, tokens, or PII in log output
- Not configuring log rotation, filling up server disks
- Swallowing exceptions without logging the full stack trace

## Log Aggregation & Monitoring

In production, raw log files are rarely read directly. Instead, logs are shipped to aggregation platforms:

| Platform | Best For | Shipping Method |
|----------|----------|-----------------|
| **ELK Stack** | Self-hosted, full control | Filebeat / Logstash |
| **Datadog** | SaaS, APM integration | Datadog Agent |
| **AWS CloudWatch** | AWS-native infrastructure | CloudWatch Agent |
| **Grafana Loki** | Kubernetes, Prometheus stack | Promtail |
| **Splunk** | Enterprise compliance | Universal Forwarder |

### Alerting Rules

Set up alerts based on log patterns:

- **ERROR rate > 1%** in 5-minute window → PagerDuty / Slack
- **FATAL log detected** → Immediate on-call alert
- **Disk usage from logs > 80%** → Infrastructure team notification
- **No logs from service for 10 minutes** → Health check alert (silent failure)

### Dashboards

Build dashboards that answer these questions:
- How many requests per minute? (rate)
- What is the 95th percentile response time? (latency)
- Which endpoints produce the most errors? (breakdown by route)
- What is the error trend over the last 24 hours?

## Frequently Asked Questions

**Q: Should I log every API request?**
A: Yes, at INFO level with method, path, status code, and duration. Use middleware for automatic request logging.

**Q: What is structured logging and why use it?**
A: Structured logging outputs JSON or key-value pairs instead of plain text. It enables filtering, aggregation, and alerting in log management systems.

**Q: How do I correlate logs across microservices?**
A: Generate a `trace_id` at the entry point and propagate it through HTTP headers or message metadata. Include it in every log statement.

**Q: How long should I retain production logs?**
A: Retain ERROR/FATAL logs for at least 90 days for debugging. INFO logs for 7-30 days depending on volume and cost. Archive to cold storage (S3 Glacier) for compliance if needed.

**Q: Should I log in development the same way as in production?**
A: Use the same logger configuration but change the output format: human-readable plain text for local dev, structured JSON for production. This prevents "works on my machine" surprises caused by different logging behavior.
