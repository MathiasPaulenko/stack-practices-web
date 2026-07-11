---
contentType: guides
slug: complete-guide-structured-logging
title: "Guía Completa de Structured Logging: JSON Logs, Correlation IDs, Aggregation"
description: "Dominá structured logging con JSON format, correlation IDs, log levels y aggregation. Cubre Python structlog, Node.js pino, Java SLF4J, stacks ELK y Loki."
metaDescription: "Dominá structured logging: JSON logs, correlation IDs, log levels y aggregation. Cubre Python structlog, Node.js pino, Java SLF4J, stacks ELK y Loki."
difficulty: intermediate
topics:
  - observability
tags:
  - guide
  - structured-logging
  - json-logs
  - correlation-ids
  - elk
  - loki
  - observability
relatedResources:
  - /guides/observability/complete-guide-distributed-tracing
  - /guides/observability/complete-guide-prometheus-grafana
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Dominá structured logging: JSON logs, correlation IDs, log levels y aggregation. Cubre Python structlog, Node.js pino, Java SLF4J, stacks ELK y Loki."
  keywords:
    - structured logging
    - json logs
    - correlation ids
    - elk stack
    - grafana loki
    - structlog
    - pino logger
---

## Introducción

Structured logging reemplaza los log messages de free-text con JSON documents machine-parseable. En vez de grepear strings en log files, queryeás structured fields: `level=error AND service=order-service AND user_id=12345`. Esto habilita a log aggregation systems como ELK (Elasticsearch, Logstash, Kibana) y Grafana Loki a indexar, filtrar y alertar sobre log data. A continuación: structured logging en Python, Node.js y Java, correlation IDs para request tracing, log levels y setup de aggregation stack.

## ¿Por qué Structured Logging?

```
Unstructured (difícil de parsear):
  [2026-07-05 10:30:45] ERROR Order failed for user 12345, product 67890, amount $99.99

Structured (machine-parseable):
  {"timestamp":"2026-07-05T10:30:45Z","level":"error","service":"order-service",
   "message":"Order failed","user_id":12345,"product_id":67890,"amount":99.99,
   "trace_id":"abc123","span_id":"def456"}

Benefits:
  - Queryable: filtrá por cualquier field sin regex
  - Alertable: triggeréa alerts en structured conditions
  - Correlatable: linkéa logs a traces y metrics
  - Aggregatable: contá errors por service, user, o endpoint
```

## Python: structlog

### Setup

```python
# logging_config.py — structlog configuration
import structlog
import logging
import sys

def configure_logging(service_name: str = "order-service", env: str = "production"):
    """Configurá structured logging con structlog."""
    structlog.configure(
        processors=[
            # Agregá timestamp
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            # Agregá service name
            structlog.processors.CallsiteParameterAdder(
                parameters=[
                    structlog.processors.CallsiteParameter.MODULE,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                    structlog.processors.CallsiteParameter.LINENO,
                ]
            ),
            # Agregá correlation IDs
            structlog.contextvars.merge_contextvars,
            # Renderéa como JSON
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configurá stdlib logging para también output JSON
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            processor=structlog.processors.JSONRenderer(),
        )
    )
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
```

### Usando el logger

```python
# order_service.py — Structured logging en práctica
import structlog

logger = structlog.get_logger()

class OrderService:
    def create_order(self, user_id: int, items: list[dict]) -> dict:
        logger.info("order_creation_started",
            user_id=user_id,
            items_count=len(items),
            total_amount=sum(i["price"] * i["quantity"] for i in items),
        )

        try:
            user = self.auth_client.get_user(user_id)
            logger.debug("user_validated", user_id=user_id, user_email=user["email"])

            payment = self.payment_client.charge(
                user_id=user_id,
                amount=sum(i["price"] * i["quantity"] for i in items),
            )
            logger.info("payment_processed",
                user_id=user_id,
                payment_id=payment["id"],
                amount=payment["amount"],
            )

            order = self.order_repo.create(user_id=user_id, items=items, payment_id=payment["id"])
            logger.info("order_created",
                order_id=order["id"],
                user_id=user_id,
                total_amount=order["total"],
            )
            return order

        except PaymentError as e:
            logger.error("payment_failed",
                user_id=user_id,
                error_type="payment_error",
                error_message=str(e),
                amount=sum(i["price"] * i["quantity"] for i in items),
            )
            raise
        except Exception as e:
            logger.exception("order_creation_failed",
                user_id=user_id,
                error_type=type(e).__name__,
            )
            raise
```

### Correlation IDs con contextvars

```python
# middleware.py — Correlation ID middleware
import structlog
import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Get or generate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_var.set(request_id)

        # Extraé user ID del auth token si está presente
        user_id = extract_user_id(request.headers.get("Authorization"))
        if user_id:
            user_id_var.set(str(user_id))

        # Bindéa context variables a structlog
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            user_id=user_id_var.get(),
            service="order-service",
        )

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# Ahora cada log line automáticamente incluye request_id y user_id
# {"timestamp":"...","level":"info","request_id":"abc-123","user_id":"456","message":"order_created",...}
```

## Node.js: pino

### Setup

```typescript
// logger.ts — pino structured logging
import pino from "pino";
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";

// AsyncLocalStorage para correlation IDs
const asyncLocalStorage = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  traceId?: string;
}>();

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  mixin: () => {
    // Automáticamente merge correlation IDs de AsyncLocalStorage
    const store = asyncLocalStorage.getStore();
    return store ? { ...store } : {};
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ["password", "token", "authorization", "*.password"],
    censor: "[REDACTED]",
  },
});

export { asyncLocalStorage };
```

### Middleware para correlation IDs

```typescript
// middleware.ts — Correlation ID middleware para Express
import { asyncLocalStorage, logger } from "./logger";
import { randomUUID } from "crypto";

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers["x-request-id"] as string || randomUUID();
  const userId = req.user?.id;

  res.setHeader("X-Request-ID", requestId);

  asyncLocalStorage.run({ requestId, userId }, () => {
    logger.info("request_started", {
      method: req.method,
      url: req.url,
      ip: req.ip,
    });

    const startTime = Date.now();
    res.on("finish", () => {
      logger.info("request_completed", {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration_ms: Date.now() - startTime,
      });
    });

    next();
  });
}

// Usage en route handler
app.post("/api/orders", correlationIdMiddleware, async (req, res) => {
  // Todos los logs dentro de este handler automáticamente incluyen requestId y userId
  logger.info("order_creation_started", { items: req.body.items });

  const order = await orderService.create(req.user.id, req.body.items);

  logger.info("order_created", { orderId: order.id, total: order.total });
  res.json(order);
});
```

### Child loggers

```typescript
// service.ts — Child loggers con bound context
import { logger } from "./logger";

class OrderService {
  private logger = logger.child({ service: "order-service" });

  async createOrder(userId: string, items: OrderItem[]) {
    this.logger.info("create_order_start", { userId, itemCount: items.length });

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    this.logger.debug("total_calculated", { userId, total });

    try {
      const payment = await this.paymentService.charge(userId, total);
      this.logger.info("payment_processed", { paymentId: payment.id, amount: payment.amount });

      const order = await this.orderRepo.create({ userId, items, paymentId: payment.id });
      this.logger.info("order_created", { orderId: order.id, userId, total });
      return order;
    } catch (error) {
      this.logger.error({ error, userId, total }, "order_creation_failed");
      throw error;
    }
  }
}
```

## Java: SLF4J con structured logging

### Setup con Logback

```xml
<!-- logback.xml — JSON structured logging para Java -->
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <fieldNames>
                <timestamp>@timestamp</timestamp>
                <level>level</level>
                <logger>logger</logger>
                <message>message</message>
                <thread>thread</thread>
            </fieldNames>
            <customFields>{"service":"order-service","env":"production"}</customFields>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="STDOUT" />
    </root>
</configuration>
```

### MDC para correlation IDs

```java
// CorrelationIdFilter.java — MDC-based correlation IDs
import org.slf4j.MDC;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.util.UUID;

@Component
public class CorrelationIdFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String requestId = httpRequest.getHeader("X-Request-ID");
        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
        }

        String userId = extractUserId(httpRequest);

        // Pone correlation IDs en MDC
        MDC.put("request_id", requestId);
        MDC.put("user_id", userId);
        MDC.put("service", "order-service");

        httpResponse.setHeader("X-Request-ID", requestId);

        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}

// Usage en service code — MDC fields son automáticamente incluidos en JSON output
@Service
public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    public Order createOrder(Long userId, List<OrderItem> items) {
        logger.info("order_creation_started user_id={} items_count={}", userId, items.size());

        try {
            Payment payment = paymentService.charge(userId, calculateTotal(items));
            logger.info("payment_processed payment_id={} amount={}", payment.getId(), payment.getAmount());

            Order order = orderRepository.save(new Order(userId, items, payment.getId()));
            logger.info("order_created order_id={} user_id={} total={}",
                order.getId(), userId, order.getTotal());
            return order;
        } catch (PaymentException e) {
            logger.error("payment_failed user_id={} error={}", userId, e.getMessage());
            throw e;
        }
    }
}
```

## Log Levels

```
TRACE   — Finest granularity (function entry/exit, variable values)
DEBUG   — Debugging information (SQL queries, cache hits/misses)
INFO    — Normal operations (order created, user logged in)
WARN    — Unexpected pero recoverable (deprecated API used, retry triggered)
ERROR   — Failures que requieren attention (payment failed, database error)
FATAL   — System-level failures (cannot start, out of memory)

Guidelines:
  - Production: INFO y arriba
  - Staging: DEBUG y arriba
  - Development: TRACE y arriba
  - Nunca loguees a ERROR para expected conditions (user not found → WARN o INFO)
```

## Log Aggregation Stacks

### ELK Stack (Elasticsearch, Logstash, Kibana)

```yaml
# docker-compose.yml — ELK stack
version: "3.8"
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.13.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.13.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  es-data:
```

```
# logstash.conf — Parseá JSON logs
input {
  beats {
    port => 5044
  }
}

filter {
  json {
    source => "message"
  }
  date {
    match => ["timestamp", "ISO8601"]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "app-logs-%{+YYYY.MM.dd}"
  }
}
```

### Grafana Loki

```yaml
# docker-compose.yml — Loki + Grafana + Promtail
version: "3.8"
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:10.4.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

```yaml
# promtail-config.yml — Scrapeá app logs y parseá JSON
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          service: order-service
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            message: message
            request_id: request_id
      - labels:
          level:
          service:
          request_id:
```

## Querying Logs

### Kibana (KQL)

```
# Encontrá errors para un user específico
level:error AND user_id:12345

# Encontrá logs para un request a través de services
request_id:"abc-123-def"

# Encontrá slow database queries
message:"database_query" AND duration_ms:>1000

# Encontrá errors en la última hour
level:error AND @timestamp:[now-1h TO now]
```

### Grafana Loki (LogQL)

```
# Contá errors por service
{job="app"} |= "error" | json | level="error" | __error__="" | line_format "{{.service}}: {{.message}}"

# Encontrá logs para un specific request ID
{job="app"} | json | request_id="abc-123"

# Rate de errors over time
sum(rate({job="app"} | json | level="error" [5m])) by (service)
```

## Best Practices

- Logueá en JSON format — cada log line es un parseable JSON document
- Siempre incluí un timestamp en ISO 8601 format — no dependas del log collection time
- Usá correlation IDs — linkéa logs del mismo request a través de services
- Usá consistent field names — `user_id` no `userId`, `user.id`, o `uid`
- Logueá en el right level — INFO para normal operations, ERROR para failures
- Incluí context en error logs — user ID, request ID, input parameters
- No logueés sensitive data — redactéa passwords, tokens, PII
- Usá structured fields, no string interpolation — `logger.info("order_created", order_id=123)` no `logger.info(f"Order 123 created")`
- Incluí duration para operations — `duration_ms` field para database queries, API calls
- Usá async logging en production — evitá blockear el request thread en I/O

## Common Mistakes

- **Loguear plain text**: `print(f"Order {order_id} created")` en vez de structured JSON. Usá un structured logger.
- **Missing correlation IDs**: no podés linkéa logs del mismo request. Agregá request ID middleware.
- **Loguear en wrong level**: `logger.error("User not found")` para una expected condition. Usá WARN o INFO.
- **Loguear sensitive data**: passwords y tokens en plain text. Usá redaction paths.
- **Excessive logging**: loguear cada function call a INFO level. Usá DEBUG para fine-grained logging.
- **No log rotation**: log files crecen unbounded. Configurá rotation o shipeá a aggregation system.

## FAQ

### ¿Qué es structured logging?

Loguear en un format machine-parseable (típicamente JSON) donde cada log entry contiene named fields en vez de free-text messages. Esto habilita querying, filtering y alerting sobre log data.

### ¿Qué es un correlation ID?

Un unique identifier attached a cada request y propagated a través de todos los service calls. Permite encontrar todos los log entries de un solo request a través de múltiples services.

### ELK vs. Loki — ¿cuál debería usar?

ELK (Elasticsearch) es full-text search con indexing — queries poderosas pero high resource usage. Loki indexa solo labels (no full text) — más barato y simple, pero menos powerful search. Elegí Loki para cost efficiency, ELK para complex search needs.

### ¿Cómo redactéa sensitive data en logs?

En pino, usá `redact.paths` para especificar fields a censor. En structlog, usá un custom processor. En Logback, usá un layout pattern que maskea sensitive fields. Nunca logueés raw passwords o tokens.

### ¿Qué log level debería usar en production?

INFO para normal operations, WARN para unexpected pero recoverable conditions, ERROR para failures. Seteá DEBUG y TRACE para staging/development only. Usá environment variables para controlar log levels.
