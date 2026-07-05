---
contentType: patterns
slug: correlation-id-pattern
title: "Correlation ID Pattern: Trace Requests Across Distributed Services"
description: "How to propagate correlation IDs across service boundaries for end-to-end request tracing. Covers HTTP headers, message queues, and logging integration."
metaDescription: "Trace requests across microservices with correlation IDs. Learn HTTP header propagation, message queue tracing, and structured logging integration."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - correlation-id
  - distributed-tracing
  - microservices
  - logging
  - pattern
category: architectural
relatedResources:
  - /patterns/structured-logging-pattern
  - /patterns/distributed-tracing-pattern
  - /patterns/health-check-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Trace requests across microservices with correlation IDs. Learn HTTP header propagation, message queue tracing, and structured logging integration."
  keywords:
    - observability
    - correlation-id
    - distributed-tracing
    - microservices
    - logging
    - pattern
---

## Overview

A correlation ID is a unique identifier attached to a request when it enters the system and propagated through every service it touches. When a user clicks "place order," that request might flow through an API gateway, order service, payment service, inventory service, and notification service — each generating its own logs. Without a correlation ID, tracing the full journey from logs is nearly impossible. With one, you search for a single value and see every log line, metric, and trace span related to that request.

## When to Use

- Microservice architectures where requests span multiple services
- Any system where you need to trace a single user request end-to-end
- Asynchronous processing pipelines with message queues
- Debugging production incidents where you need to follow a request across boundaries
- Compliance requirements that demand audit trails for individual transactions

## When NOT to Use

- Monolithic applications — a single request thread already has a natural trace
- Batch jobs with no per-item tracking need
- Systems where distributed tracing (OpenTelemetry) already provides trace context
- Simple scripts or CLI tools with no inter-service communication

## Solution

### Generate and propagate via HTTP headers

```python
# Python — FastAPI middleware for correlation ID
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

CORRELATION_ID_HEADER = "X-Correlation-ID"

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Use incoming correlation ID or generate a new one
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or str(uuid.uuid4())

        # Attach to request state for downstream handlers
        request.state.correlation_id = correlation_id

        # Process request
        response = await call_next(request)

        # Add correlation ID to response headers
        response.headers[CORRELATION_ID_HEADER] = correlation_id

        return response

# Register middleware
app.add_middleware(CorrelationIdMiddleware)
```

### Propagate to downstream HTTP calls

```python
# Python — propagate correlation ID to downstream services
import httpx
from fastapi import Request

async def call_payment_service(request: Request, order_data: dict):
    headers = {
        "X-Correlation-ID": request.state.correlation_id,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://payment-service/api/charge",
            json=order_data,
            headers=headers,
        )
        return response.json()
```

### Structured logging with correlation ID

```python
# Python — structured logging with correlation ID
import logging
import json
from fastapi import Request

class CorrelationIdFilter(logging.Filter):
    def __init__(self, correlation_id_getter):
        super().__init__()
        self.correlation_id_getter = correlation_id_getter

    def filter(self, record):
        record.correlation_id = self.correlation_id_getter() or "unknown"
        return True

# Setup
logger = logging.getLogger("myapp")
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter(
    '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
    '"correlation_id": "%(correlation_id)s", "message": "%(message)s"}'
))
logger.addHandler(handler)

# In a request context
def get_correlation_id():
    return getattr(request, 'state', None) and request.state.correlation_id

logger.addFilter(CorrelationIdFilter(get_correlation_id))
logger.info("Processing order for customer 12345")

# Output: {"timestamp": "2026-01-15...", "level": "INFO",
#          "correlation_id": "a1b2c3d4-...", "message": "Processing order..."}
```

### Express.js middleware (JavaScript)

```javascript
// JavaScript — Express middleware for correlation ID
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const CORRELATION_ID_HEADER = 'x-correlation-id';

function correlationIdMiddleware(req, res, next) {
  // Use incoming header or generate a new one
  const correlationId = req.headers[CORRELATION_ID_HEADER] || uuidv4();

  // Attach to request object
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

app.use(correlationIdMiddleware);

// Propagate to downstream calls
async function callInventoryService(req, productId) {
  const response = await fetch(
    `https://inventory-service/api/products/${productId}`,
    {
      headers: {
        [CORRELATION_ID_HEADER]: req.correlationId,
        'Accept': 'application/json',
      },
    }
  );
  return response.json();
}
```

### Winston logger with correlation ID

```javascript
// JavaScript — Winston logger with correlation ID
const winston = require('winston');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, correlationId }) => {
      return JSON.stringify({
        timestamp,
        level,
        correlationId: correlationId || 'unknown',
        message,
      });
    })
  ),
  transports: [new winston.transports.Console()],
});

// Enhanced middleware with AsyncLocalStorage
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  asyncLocalStorage.run({ correlationId }, () => next());
}

// Usage anywhere in the request chain
function logInfo(message) {
  const store = asyncLocalStorage.getStore();
  logger.info({
    message,
    correlationId: store?.correlationId,
  });
}

// In any handler — no need to pass req around
app.post('/api/orders', (req, res) => {
  logInfo('Creating order');  // correlation ID automatically included
  // ...
});
```

### Message queue propagation

```python
# Python — propagate correlation ID through message queues
import json
import pika
from fastapi import Request

def publish_order_created(request: Request, order_data: dict):
    correlation_id = request.state.correlation_id

    message = {
        "event": "order.created",
        "data": order_data,
        "metadata": {
            "correlation_id": correlation_id,
            "timestamp": "2026-01-15T10:00:00Z",
            "source": "order-service",
        },
    }

    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()
    channel.basic_publish(
        exchange='orders',
        routing_key='order.created',
        body=json.dumps(message),
        properties=pika.BasicProperties(
            headers={'X-Correlation-ID': correlation_id},
            correlation_id=correlation_id,
        ),
    )
    connection.close()
```

```javascript
// JavaScript — consume messages with correlation ID
const amqp = require('amqplib');

async function consumeOrderEvents() {
  const conn = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue('order-events');

  channel.consume('order-events', (msg) => {
    const correlationId = msg.properties.headers['X-Correlation-ID']
      || msg.properties.correlationId
      || 'unknown';

    const body = JSON.parse(msg.content.toString());
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      correlationId,
      message: `Processing event: ${body.event}`,
    }));

    // Propagate to any downstream calls
    processNotification(correlationId, body.data);
  });
}
```

### Java Spring Boot filter

```java
// Java — Spring Boot filter for correlation ID
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import javax.servlet.*;
import javax.servlet.http.*;
import java.util.UUID;

@Component
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String CORRELATION_ID_KEY = "correlationId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        }

        // Store in MDC for logging
        MDC.put(CORRELATION_ID_KEY, correlationId);

        // Add to response
        response.setHeader(CORRELATION_ID_HEADER, correlationId);

        try {
            filterChain.doFilter(
                new CorrelationIdRequestWrapper(request, correlationId),
                response
            );
        } finally {
            MDC.remove(CORRELATION_ID_KEY);
        }
    }
}

// Propagate to downstream calls with RestTemplate
@Bean
public RestTemplate restTemplate() {
    RestTemplate restTemplate = new RestTemplate();
    restTemplate.setInterceptors(List.of((request, body, execution) -> {
        String correlationId = MDC.get("correlationId");
        if (correlationId != null) {
            request.getHeaders().add("X-Correlation-ID", correlationId);
        }
        return execution.execute(request, body);
    }));
    return restTemplate;
}

// Logback configuration for structured logging
// logback.xml:
// <pattern>{"timestamp": "%d", "level": "%p", "correlationId": "%X{correlationId}", "message": "%m"}%n</pattern>
```

### Database query tagging

```python
# Python — tag database queries with correlation ID
import psycopg2
from contextvars import ContextVar

correlation_id_var: ContextVar[str] = ContextVar('correlation_id', default='unknown')

def get_db_connection():
    conn = psycopg2.connect("postgresql://localhost/myapp")
    # Set application_name to include correlation ID for query logs
    corr_id = correlation_id_var.get()
    conn.set_session(f'application_name=myapp-{corr_id[:8]}')
    return conn

# In request handler
async def create_order(request: Request):
    correlation_id_var.set(request.state.correlation_id)
    conn = get_db_connection()
    # Now all DB queries show correlation ID in pg_stat_activity
```

## Variants

### Short correlation IDs

```python
# Python — use shorter IDs for readability (8 chars)
import hashlib

def short_correlation_id(full_id: str) -> str:
    return hashlib.sha256(full_id.encode()).hexdigest()[:8]

# Log format: [a1b2c3d4] Processing order
# Full UUID stored in a separate field for exact matching
```

### W3C Trace Context standard

```javascript
// JavaScript — use W3C traceparent header (OpenTelemetry standard)
// traceparent: 00-<trace-id>-<span-id>-<trace-flags>
// Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01

function parseTraceparent(header) {
  const parts = header.split('-');
  if (parts.length !== 4 || parts[0] !== '00') return null;
  return {
    version: parts[0],
    traceId: parts[1],
    spanId: parts[2],
    flags: parts[3],
  };
}

function createTraceparent(traceId, spanId) {
  return `00-${traceId}-${spanId}-01`;
}
```

### Correlation ID in gRPC metadata

```python
# Python — gRPC interceptors for correlation ID
import grpc
import uuid

class CorrelationIdClientInterceptor(grpc.UnaryUnaryClientInterceptor):
    def intercept_unary_unary(self, continuation, client_call_details, request):
        correlation_id = correlation_id_var.get()
        metadata = list(client_call_details.metadata or [])
        metadata.append(('x-correlation-id', correlation_id))
        new_details = client_call_details._replace(metadata=metadata)
        return continuation(new_details, request)

class CorrelationIdServerInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        metadata = dict(handler_call_details.invocation_metadata)
        correlation_id = metadata.get('x-correlation-id', str(uuid.uuid4()))
        token = correlation_id_var.set(correlation_id)
        try:
            return continuation(handler_call_details)
        finally:
            correlation_id_var.reset(token)
```

## Best Practices

- Generate at the edge — create the correlation ID at the entry point (API gateway, load balancer)
- Always propagate — never drop the correlation ID when calling downstream services
- Use UUID v4 — standard, universally unique, no coordination needed
- Include in logs — every log line should have the correlation ID field
- Include in error responses — return the correlation ID to the client for support lookups
- Use consistent header name — `X-Correlation-ID` is the most common convention
- Clean up in finally blocks — remove from MDC/AsyncLocalStorage to prevent leaks
- Don't confuse with trace ID — correlation ID is request-level, trace ID is distributed-tracing-level

## Common Mistakes

- **Not propagating downstream**: generating a correlation ID but not forwarding it to other services. Each service gets a new ID, breaking the chain.
- **Using thread-local without cleanup**: in thread-based servers, forgetting to clear the correlation ID leaks it to the next request on the same thread.
- **Different header names**: one service uses `X-Correlation-ID`, another uses `X-Request-ID`, another uses `correlation-id`. Standardize across all services.
- **Not including in error logs**: exceptions are logged without the correlation ID, making it impossible to trace the failing request.
- **Generating new IDs mid-request**: creating a new correlation ID partway through the request flow instead of using the one from the incoming request.

## FAQ

### What is a correlation ID?

A unique identifier attached to a request when it enters the system and propagated through every service it touches. It lets you search logs, metrics, and traces for a single request across all services.

### How is a correlation ID different from a trace ID?

A correlation ID is a simple request identifier. A trace ID (from OpenTelemetry) is part of a distributed tracing system that also includes span IDs, parent-child relationships, and timing data. Correlation IDs are simpler and can be used without a full tracing system.

### What header should I use?

`X-Correlation-ID` is the most widely used convention. Some systems use `X-Request-ID`. The key is consistency — pick one and use it everywhere.

### Should I generate the ID at the client or the server?

Generate at the edge — the first server that receives the request (API gateway, load balancer). If the client sends one, use it; otherwise generate a new one. This ensures every request has an ID from the start.

### How do I propagate through message queues?

Include the correlation ID in the message metadata (headers or properties) and in the message body. When consuming, extract it and set it in the local context before processing.
