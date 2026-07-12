---





contentType: recipes
slug: python-structured-logging-json
title: "Logging Estructurado JSON con structlog"
description: "Cómo emitir logs estructurados JSON en Python usando structlog, incluyendo context binding, niveles de log, processors e integración con standard logging."
metaDescription: "Emite logs estructurados JSON en Python con structlog. Bind context, configura processors, integra con standard logging y envía logs a ELK o Loki."
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
  metaDescription: "Emite logs estructurados JSON en Python con structlog. Bind context, configura processors, integra con standard logging y envía logs a ELK o Loki."
  keywords:
    - observability
    - python
    - logging
    - structlog
    - json
    - recipe





---

## Overview

structlog produce logs estructurados — cada entrada de log es un diccionario con keys para timestamp, level, event y cualquier contexto que bindes. A diferencia de `print()` o `logging.getLogger()`, structlog outputa JSON que los log aggregators (ELK, Loki, Datadog) pueden parsear sin regex. Bindeas context scoped al request (user ID, trace ID) una vez, y cada línea de log subsecuente lo incluye automáticamente.

## When to Use

- Aplicaciones que envían logs a un log aggregator (ELK, Loki, Splunk, Datadog)
- Microservicios donde necesitas trazar un request a través de múltiples servicios via correlation IDs
- APIs donde quieres loguear método, path, status code y duración en cada línea
- Reemplazar debugging con `print()` por output de log estructurado y filtrable

## When NOT to Use

- Scripts simples donde `print()` es suficiente — structlog añade una dependencia y config
- CLI tools que outputan texto human-readable — usa `rich.logging` o `click.echo` en su lugar
- Hot paths de alto throughput donde el logging mismo es el bottleneck — samplea o batchea en su lugar

## Solution

### Setup

```bash
pip install structlog
```

### Logging estructurado básico

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

### Configuración con processors

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

# Bindear context que persiste a través de todas las llamadas de log
request_logger = logger.bind(request_id="req-abc-123", user_id=42)

request_logger.info("processing_order", order_id="ord_456")
request_logger.info("order_validated", items=3)
request_logger.warning("inventory_low", sku="widget-001", stock=2)
```

Cada línea de log incluye `request_id` y `user_id` automáticamente.

### Usar contextvars para context async

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

# En un ASGI middleware
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

### Integración con standard logging

```python
import logging
import structlog

# Configurar structlog
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)

# Configurar standard logging para rutear a través de structlog
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

# Librerías de terceros que usan standard logging también outputarán JSON
logging.getLogger("urllib3").info("Connection pool created")
```

### Niveles de log y filtrado

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
logger.info("this_is_filtered")  # No emitido (por debajo de WARNING)
logger.warning("this_shows_up", key="value")  # Emitido
```

### Logging de excepciones con traceback

```python
logger = structlog.get_logger()

try:
    result = 1 / 0
except ZeroDivisionError:
    logger.exception("division_failed", operation="calculate_ratio")
```

El output incluye el traceback completo en el campo `exception`.

### Processor personalizado para redacción de datos sensibles

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

### Processor de timing de performance

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
# ... hacer trabajo ...
logger.info("database_query", start_time=start, query="SELECT * FROM users")
```

## Variants

### Usar structlog con FastAPI

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

### Usar structlog con Celery

```python
from celery import Celery
import structlog

app = Celery("tasks", broker="redis://localhost:6379")
logger = structlog.get_logger()

@app.task
def process_order(order_id: str):
    logger.bind(task_id=app.current_task.request.id, order_id=order_id)
    logger.info("processing_started")
    # ... procesar ...
    logger.info("processing_completed")
```

## Best Practices


- For a deeper guide, see [High-Performance Logging with pino](/es/recipes/nodejs-pino-fast-logging/).

- Usa `contextvars` para context scoped al request en frameworks async — se propaga correctamente a través de boundaries `await`
- Siempre incluye un processor `timestamp` — los log aggregators lo necesitan para ordering
- Agrega un `request_id` o `trace_id` a cada línea de log para correlación de distributed tracing
- Usa `logger.exception()` (no `logger.error()`) en exception handlers — incluye el traceback
- Configura structlog una vez al startup de la aplicación, no por módulo
- Usa `cache_logger_on_first_use=True` para performance en hot paths
- Redacta campos sensibles (passwords, tokens, PII) con un processor personalizado

## Common Mistakes

- **Bindear context en el logger root**: `logger.bind()` retorna un nuevo logger — no muta el root. Guarda el logger bound en una variable.
- **No limpiar contextvars**: en frameworks async, el context filtra entre requests. Siempre limpia en un bloque `finally`.
- **Usar string interpolation en lugar de kwargs**: `logger.info(f"User {user_id} logged in")` pierde estructura. Usa `logger.info("user_logged_in", user_id=user_id)`.
- **No configurar standard logging**: librerías de terceros (urllib3, boto3) usan `logging`. Sin integración, su output es no estructurado.
- **Loguear a nivel INFO en hot loops**: un loop que corre 10,000 veces con un log INFO produce 10,000 líneas. Usa DEBUG o samplea.

## FAQ

### ¿Cómo outputo logs human-readable en desarrollo?

Usa `structlog.dev.ConsoleRenderer()` en lugar de `JSONRenderer()`:

```python
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
)
```

Esto imprime output coloreado y formateado para desarrollo local.

### ¿Puedo usar structlog con Django?

Sí. Agrega una configuración de logging en `settings.py`:

```python
LOGGING = {
    "version": 1,
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
```

Luego configura structlog con `structlog.stdlib.LoggerFactory()` para rutear a través del logging de Django.

### ¿Cómo agrego un correlation ID a través de microservicios?

Genera un UUID en el entry point, agrégalo a los headers HTTP salientes, y bínalo en el servicio receptor:

```python
# Sender
logger = logger.bind(correlation_id=corr_id)
requests.post(url, headers={"X-Correlation-ID": corr_id})

# Receiver
corr_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
structlog.contextvars.bind_contextvars(correlation_id=corr_id)
```

### ¿Cuál es el overhead de performance de structlog?

structlog es ligero — el rendering JSON solo ocurre si el nivel de log pasa el filtro. Con `make_filtering_bound_logger`, los logs por debajo del umbral son no-ops. En producción, espera <1ms por llamada de log.

### ¿Cómo envío el output de structlog a Loki o ELK?

Escribe JSON a stdout y deja que un log collector (Fluent Bit, Filebeat, Promtail) lo recoja. El formato JSON ya está estructurado — sin reglas de parsing necesarias.
