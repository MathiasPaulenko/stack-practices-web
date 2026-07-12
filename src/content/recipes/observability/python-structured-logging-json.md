---





contentType: recipes
slug: python-structured-logging-json
title: "Structured JSON Logging with structlog"
description: "How to emit structured JSON logs in Python using structlog, including context binding, log levels, processors, and integration with standard logging."
metaDescription: "Emit structured JSON logs in Python with structlog. Bind context, configure processors, integrate with standard logging, and ship logs to ELK or Loki."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - python
  - logging
  - structlog
  - json
  - recipe
relatedResources:
  - /recipes/nodejs-pino-fast-logging
  - /recipes/python-prometheus-custom-metrics
  - /recipes/python-opentelemetry-tracing
  - /recipes/java-actuator-health-checks
  - /recipes/nodejs-sentry-error-tracking
  - /recipes/nodejs-winston-daily-rotate
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Emit structured JSON logs in Python with structlog. Bind context, configure processors, integrate with standard logging, and ship logs to ELK or Loki."
  keywords:
    - observability
    - python
    - logging
    - structlog
    - json
    - recipe





---

## Overview

structlog produces structured logs — each log entry is a dictionary with keys for timestamp, level, event, and any context you bind. Unlike plain `print()` or `logging.getLogger()`, structlog outputs JSON that log aggregators (ELK, Loki, Datadog) can parse without regex. You bind request-scoped context (user ID, trace ID) once, and every subsequent log line includes it automatically.

## When to Use

- Applications that ship logs to a log aggregator (ELK, Loki, Splunk, Datadog)
- Microservices where you need to trace a request across multiple services via correlation IDs
- APIs where you want to log request method, path, status code, and duration in every line
- Replacing `print()` debugging with structured, filterable log output

## When NOT to Use

- Simple scripts where `print()` is sufficient — structlog adds a dependency and config
- CLI tools that output human-readable text — use `rich.logging` or `click.echo` instead
- High-throughput hot paths where logging itself is the bottleneck — sample or batch instead

## Solution

### Setup

```bash
pip install structlog
```

### Basic structured logging

```python
import structlog

logger = structlog.get_logger()

logger.info("user_logged_in", user_id=42, method="oauth")
logger.warning("rate_limit_approaching", user_id=42, remaining=5)
logger.error("payment_failed", order_id="ord_123", reason="card_declined")
```

Output (JSON):

```json
{"event": "user_logged_in", "user_id": 42, "method": "oauth", "level": "info", "timestamp": "2026-07-05T10:30:00Z"}
```

### Configuration with processors

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)
```

### Context binding

```python
logger = structlog.get_logger()

# Bind context that persists across all log calls
request_logger = logger.bind(request_id="req-abc-123", user_id=42)

request_logger.info("processing_order", order_id="ord_456")
request_logger.info("order_validated", items=3)
request_logger.warning("inventory_low", sku="widget-001", stock=2)
```

Every log line includes `request_id` and `user_id` automatically.

### Using contextvars for async context

```python
import structlog
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="")

def set_request_context(request_id: str, user_id: int):
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        user_id=user_id,
    )

def clear_request_context():
    structlog.contextvars.clear_contextvars()

# In an ASGI middleware
async def logging_middleware(request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    set_request_context(request_id, user_id=extract_user_id(request))
    try:
        response = await call_next(request)
        logger.info("request_completed", status=response.status_code, path=request.url.path)
        return response
    finally:
        clear_request_context()
```

### Integration with standard logging

```python
import logging
import structlog

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)

# Configure standard logging to route through structlog
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

# Third-party libraries using standard logging will also output JSON
logging.getLogger("urllib3").info("Connection pool created")
```

### Log levels and filtering

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.WARNING),
)

logger = structlog.get_logger()
logger.info("this_is_filtered")  # Not emitted (below WARNING)
logger.warning("this_shows_up", key="value")  # Emitted
```

### Exception logging with traceback

```python
logger = structlog.get_logger()

try:
    result = 1 / 0
except ZeroDivisionError:
    logger.exception("division_failed", operation="calculate_ratio")
```

Output includes the full traceback in the `exception` field.

### Custom processor for sensitive data redaction

```python
def redact_sensitive_data(logger, method_name, event_dict):
    sensitive_keys = {"password", "api_key", "token", "credit_card"}
    for key in list(event_dict.keys()):
        if key.lower() in sensitive_keys:
            event_dict[key] = "[REDACTED]"
    return event_dict

structlog.configure(
    processors=[
        redact_sensitive_data,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)

logger = structlog.get_logger()
logger.info("user_login", email="alice@example.com", password="secret123")
# Output: {"event": "user_login", "email": "alice@example.com", "password": "[REDACTED]", ...}
```

### Performance timing processor

```python
import time

def add_timing(logger, method_name, event_dict):
    if "start_time" in event_dict:
        event_dict["duration_ms"] = round((time.time() - event_dict.pop("start_time")) * 1000, 2)
    return event_dict

structlog.configure(
    processors=[
        add_timing,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)

logger = structlog.get_logger()
start = time.time()
# ... do work ...
logger.info("database_query", start_time=start, query="SELECT * FROM users")
```

## Variants

### Using structlog with FastAPI

```python
from fastapi import FastAPI, Request
import structlog
import uuid

app = FastAPI()
logger = structlog.get_logger()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )
    response = await call_next(request)
    logger.info("request_completed", status_code=response.status_code)
    structlog.contextvars.clear_contextvars()
    return response
```

### Using structlog with Celery

```python
from celery import Celery
import structlog

app = Celery("tasks", broker="redis://localhost:6379")
logger = structlog.get_logger()

@app.task
def process_order(order_id: str):
    logger.bind(task_id=app.current_task.request.id, order_id=order_id)
    logger.info("processing_started")
    # ... process ...
    logger.info("processing_completed")
```

## Best Practices


- For a deeper guide, see [High-Performance Logging with pino](/recipes/nodejs-pino-fast-logging/).

- Use `contextvars` for request-scoped context in async frameworks — it propagates correctly across `await` boundaries
- Always include a `timestamp` processor — log aggregators need it for ordering
- Add a `request_id` or `trace_id` to every log line for distributed tracing correlation
- Use `logger.exception()` (not `logger.error()`) in exception handlers — it includes the traceback
- Configure structlog once at application startup, not per module
- Use `cache_logger_on_first_use=True` for performance in hot paths
- Redact sensitive fields (passwords, tokens, PII) with a custom processor

## Common Mistakes

- **Binding context on the root logger**: `logger.bind()` returns a new logger — it doesn't mutate the root. Store the bound logger in a variable.
- **Not clearing contextvars**: in async frameworks, context leaks between requests. Always clear in a `finally` block.
- **Using string interpolation instead of kwargs**: `logger.info(f"User {user_id} logged in")` loses structure. Use `logger.info("user_logged_in", user_id=user_id)`.
- **Not configuring standard logging**: third-party libraries (urllib3, boto3) use `logging`. Without integration, their output is unstructured.
- **Logging at INFO level in hot loops**: a loop running 10,000 times with an INFO log produces 10,000 log lines. Use DEBUG or sample.

## FAQ

### How do I output human-readable logs in development?

Use `structlog.dev.ConsoleRenderer()` instead of `JSONRenderer()`:

```python
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
)
```

This prints colored, formatted output for local development.

### Can I use structlog with Django?

Yes. Add a logging configuration in `settings.py`:

```python
LOGGING = {
    "version": 1,
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
```

Then configure structlog with `structlog.stdlib.LoggerFactory()` to route through Django's logging.

### How do I add a correlation ID across microservices?

Generate a UUID at the entry point, add it to outgoing HTTP headers, and bind it in the receiving service:

```python
# Sender
logger = logger.bind(correlation_id=corr_id)
requests.post(url, headers={"X-Correlation-ID": corr_id})

# Receiver
corr_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
structlog.contextvars.bind_contextvars(correlation_id=corr_id)
```

### What is the performance overhead of structlog?

structlog is lightweight — the JSON rendering happens only if the log level passes the filter. With `make_filtering_bound_logger`, below-threshold logs are no-ops. In production, expect <1ms per log call.

### How do I ship structlog output to Loki or ELK?

Write JSON to stdout and let a log collector (Fluent Bit, Filebeat, Promtail) pick it up. The JSON format is already structured — no parsing rules needed.
