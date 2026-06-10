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
  - logging
  - observability
  - structured-logging
  - python
  - javascript
  - java
  - loguru
  - winston
  - slf4j
relatedResources:
  - /recipes/handle-errors
  - /recipes/middleware
  - /recipes/environment-variables
lastUpdated: "2026-06-10"
author: "StackPractices"
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

## Frequently Asked Questions

**Q: Should I log every API request?**
A: Yes, at INFO level with method, path, status code, and duration. Use middleware for automatic request logging.

**Q: What is structured logging and why use it?**
A: Structured logging outputs JSON or key-value pairs instead of plain text. It enables filtering, aggregation, and alerting in log management systems.

**Q: How do I correlate logs across microservices?**
A: Generate a `trace_id` at the entry point and propagate it through HTTP headers or message metadata. Include it in every log statement.
