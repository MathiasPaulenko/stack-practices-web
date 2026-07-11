---
contentType: patterns
slug: correlation-id-pattern
title: "Patrón Correlation ID"
description: "Cómo propagar correlation IDs a través de service boundaries para end-to-end request tracing. Cubre HTTP headers, message queues, e integración con logging."
metaDescription: "Tracea requests across microservices con correlation IDs. Aprende HTTP header propagation, message queue tracing, e integración con structured logging."
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
  metaDescription: "Tracea requests across microservices con correlation IDs. Aprende HTTP header propagation, message queue tracing, e integración con structured logging."
  keywords:
    - observability
    - correlation-id
    - distributed-tracing
    - microservices
    - logging
    - pattern
---

## Overview

Un correlation ID es un unique identifier adjuntado a un request cuando entra al sistema y propagado through cada service que toca. Cuando un usuario clickea "place order," ese request puede fluir through un API gateway, order service, payment service, inventory service, y notification service — cada uno generando sus propios logs. Sin un correlation ID, tracear el full journey desde logs es casi imposible. Con uno, buscás un solo valor y ves cada log line, metric, y trace span relacionado con ese request.

## When to Use

- Arquitecturas de microservices donde los requests span múltiples services
- Cualquier sistema donde necesitás tracear un single user request end-to-end
- Pipelines de procesamiento asincrónico con message queues
- Debuggear production incidents donde necesitás seguir un request across boundaries
- Compliance requirements que demandan audit trails para transacciones individuales

## When NOT to Use

- Aplicaciones monolíticas — un single request thread ya tiene un natural trace
- Batch jobs sin necesidad de per-item tracking
- Sistemas donde distributed tracing (OpenTelemetry) ya provee trace context
- Scripts simples o CLI tools sin inter-service communication

## Solution

### Generar y propagar via HTTP headers

```python
# Python — FastAPI middleware para correlation ID
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

CORRELATION_ID_HEADER = "X-Correlation-ID"

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Usar incoming correlation ID o generar uno nuevo
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or str(uuid.uuid4())

        # Adjuntar a request state para downstream handlers
        request.state.correlation_id = correlation_id

        # Procesar request
        response = await call_next(request)

        # Agregar correlation ID a response headers
        response.headers[CORRELATION_ID_HEADER] = correlation_id

        return response

# Registrar middleware
app.add_middleware(CorrelationIdMiddleware)
```

### Propagar a downstream HTTP calls

```python
# Python — propagar correlation ID a downstream services
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

### Structured logging con correlation ID

```python
# Python — structured logging con correlation ID
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

# En un request context
def get_correlation_id():
    return getattr(request, 'state', None) and request.state.correlation_id

logger.addFilter(CorrelationIdFilter(get_correlation_id))
logger.info("Processing order for customer 12345")

# Output: {"timestamp": "2026-01-15...", "level": "INFO",
#          "correlation_id": "a1b2c3d4-...", "message": "Processing order..."}
```

### Express.js middleware (JavaScript)

```javascript
// JavaScript — Express middleware para correlation ID
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const CORRELATION_ID_HEADER = 'x-correlation-id';

function correlationIdMiddleware(req, res, next) {
  // Usar incoming header o generar uno nuevo
  const correlationId = req.headers[CORRELATION_ID_HEADER] || uuidv4();

  // Adjuntar a request object
  req.correlationId = correlationId;

  // Agregar a response headers
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

app.use(correlationIdMiddleware);

// Propagar a downstream calls
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

### Winston logger con correlation ID

```javascript
// JavaScript — Winston logger con correlation ID
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

// Enhanced middleware con AsyncLocalStorage
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  asyncLocalStorage.run({ correlationId }, () => next());
}

// Usage en cualquier parte del request chain
function logInfo(message) {
  const store = asyncLocalStorage.getStore();
  logger.info({
    message,
    correlationId: store?.correlationId,
  });
}

// En cualquier handler — no need de pasar req around
app.post('/api/orders', (req, res) => {
  logInfo('Creating order');  // correlation ID automáticamente incluido
  // ...
});
```

### Message queue propagation

```python
# Python — propagar correlation ID through message queues
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
// JavaScript — consumir messages con correlation ID
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

    // Propagar a cualquier downstream calls
    processNotification(correlationId, body.data);
  });
}
```

### Java Spring Boot filter

```java
// Java — Spring Boot filter para correlation ID
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

        // Store en MDC para logging
        MDC.put(CORRELATION_ID_KEY, correlationId);

        // Agregar a response
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

// Propagar a downstream calls con RestTemplate
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

// Logback configuration para structured logging
// logback.xml:
// <pattern>{"timestamp": "%d", "level": "%p", "correlationId": "%X{correlationId}", "message": "%m"}%n</pattern>
```

### Database query tagging

```python
# Python — taggear database queries con correlation ID
import psycopg2
from contextvars import ContextVar

correlation_id_var: ContextVar[str] = ContextVar('correlation_id', default='unknown')

def get_db_connection():
    conn = psycopg2.connect("postgresql://localhost/myapp")
    # Set application_name para incluir correlation ID en query logs
    corr_id = correlation_id_var.get()
    conn.set_session(f'application_name=myapp-{corr_id[:8]}')
    return conn

# En request handler
async def create_order(request: Request):
    correlation_id_var.set(request.state.correlation_id)
    conn = get_db_connection()
    # Ahora todas las DB queries muestran correlation ID en pg_stat_activity
```

## Variants

### Short correlation IDs

```python
# Python — usar IDs más cortos para readability (8 chars)
import hashlib

def short_correlation_id(full_id: str) -> str:
    return hashlib.sha256(full_id.encode()).hexdigest()[:8]

# Log format: [a1b2c3d4] Processing order
# Full UUID stored en un separate field para exact matching
```

### W3C Trace Context standard

```javascript
// JavaScript — usar W3C traceparent header (OpenTelemetry standard)
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

### Correlation ID en gRPC metadata

```python
# Python — gRPC interceptors para correlation ID
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

- Generá en el edge — creá el correlation ID en el entry point (API gateway, load balancer)
- Siempre propagá — nunca dropeés el correlation ID cuando llamás a downstream services
- Usá UUID v4 — standard, universally unique, no coordination needed
- Incluí en logs — cada log line debería tener el correlation ID field
- Incluí en error responses — retorná el correlation ID al client para support lookups
- Usá consistent header name — `X-Correlation-ID` es la convención más común
- Limpiá en finally blocks — remové de MDC/AsyncLocalStorage para prevenir leaks
- No lo confundas con trace ID — correlation ID es request-level, trace ID es distributed-tracing-level

## Common Mistakes

- **No propagar downstream**: generar un correlation ID pero no forwardearlo a otros services. Cada service gets un new ID, rompiendo el chain.
- **Usar thread-local sin cleanup**: en thread-based servers, olvidar limpiar el correlation ID lo leakea al siguiente request en el mismo thread.
- **Diferentes header names**: un service usa `X-Correlation-ID`, otro usa `X-Request-ID`, otro usa `correlation-id`. Estandarizá across todos los services.
- **No incluir en error logs**: las exceptions se loggean sin el correlation ID, haciendo imposible tracear el failing request.
- **Generar new IDs mid-request**: crear un nuevo correlation ID a mitad del request flow en vez de usar el del incoming request.

## FAQ

### ¿Qué es un correlation ID?

Un unique identifier adjuntado a un request cuando entra al sistema y propagado through cada service que toca. Te permite buscar logs, metrics, y traces para un single request across todos los services.

### ¿En qué se diferencia un correlation ID de un trace ID?

Un correlation ID es un simple request identifier. Un trace ID (de OpenTelemetry) es parte de un distributed tracing system que también incluye span IDs, parent-child relationships, y timing data. Los correlation IDs son más simples y se pueden usar sin un full tracing system.

### ¿Qué header debería usar?

`X-Correlation-ID` es la convención más widely used. Algunos sistemas usan `X-Request-ID`. La key es consistencia — elegí uno y usalo en todos lados.

### ¿Debería generar el ID en el client o en el server?

Generá en el edge — el primer server que recibe el request (API gateway, load balancer). Si el client manda uno, usalo; si no, generá uno nuevo. Esto asegura que cada request tenga un ID desde el start.

### ¿Cómo propago through message queues?

Incluí el correlation ID en el message metadata (headers o properties) y en el message body. Cuando consumas, extraelo y setealo en el local context antes de procesar.
