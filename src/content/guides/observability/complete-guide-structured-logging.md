---





contentType: guides
slug: complete-guide-structured-logging
title: "Structured Logging: JSON Logs, Correlation IDs, Aggregation"
description: "Master structured logging with JSON format, correlation IDs, log levels, and aggregation. Covers Python structlog, Node.js pino, Java SLF4J, ELK and Loki stacks."
metaDescription: "Master structured logging: JSON logs, correlation IDs, log levels, and aggregation. Covers Python structlog, Node.js pino, Java SLF4J, ELK and Loki stacks."
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
  - /guides/complete-guide-distributed-tracing
  - /guides/complete-guide-prometheus-grafana
  - /recipes/docker-logging-fluentd
  - /recipes/python-prometheus-metrics-exporter
  - /guides/complete-guide-sentry-error-tracking
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master structured logging: JSON logs, correlation IDs, log levels, and aggregation. Covers Python structlog, Node.js pino, Java SLF4J, ELK and Loki stacks."
  keywords:
    - structured logging
    - json logs
    - correlation ids
    - elk stack
    - grafana loki
    - structlog
    - pino logger





---

## Introduction

Structured logging replaces free-text log messages with machine-parseable JSON documents. Instead of grepping for strings in log files, you query structured fields: `level=error AND service=order-service AND user_id=12345`. This enables log aggregation systems like ELK (Elasticsearch, Logstash, Kibana) and Grafana Loki to index, filter, and alert on log data. Here is a hands-on guide to structured logging in Python, Node.js, and Java, correlation IDs for request tracing, log levels, and aggregation stack setup.

## Why Structured Logging?

```
Unstructured (hard to parse):
  [2026-07-05 10:30:45] ERROR Order failed for user 12345, product 67890, amount $99.99

Structured (machine-parseable):
  {"timestamp":"2026-07-05T10:30:45Z","level":"error","service":"order-service",
   "message":"Order failed","user_id":12345,"product_id":67890,"amount":99.99,
   "trace_id":"abc123","span_id":"def456"}

Benefits:
  - Queryable: filter by any field without regex
  - Alertable: trigger alerts on structured conditions
  - Correlatable: link logs to traces and metrics
  - Aggregatable: count errors by service, user, or endpoint
```

## Python: structlog

### Setup

```python
# logging_config.py — structlog configuration
import structlog
import logging
import sys

def configure_logging(service_name: str = "order-service", env: str = "production"):
    """Configure structured logging with structlog."""
    structlog.configure(
        processors=[
            # Add timestamp
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            # Add service name
            structlog.processors.CallsiteParameterAdder(
                parameters=[
                    structlog.processors.CallsiteParameter.MODULE,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                    structlog.processors.CallsiteParameter.LINENO,
                ]
            ),
            # Add correlation IDs
            structlog.contextvars.merge_contextvars,
            # Render as JSON
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure stdlib logging to also output JSON
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

### Using the logger

```python
# order_service.py — Structured logging in practice
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

### Correlation IDs with contextvars

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

        # Extract user ID from auth token if present
        user_id = extract_user_id(request.headers.get("Authorization"))
        if user_id:
            user_id_var.set(str(user_id))

        # Bind context variables to structlog
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            user_id=user_id_var.get(),
            service="order-service",
        )

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# Now every log line automatically includes request_id and user_id
# {"timestamp":"...","level":"info","request_id":"abc-123","user_id":"456","message":"order_created",...}
```

## Node.js: pino

### Setup

```typescript
// logger.ts — pino structured logging
import pino from "pino";
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";

// AsyncLocalStorage for correlation IDs
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
    // Automatically merge correlation IDs from AsyncLocalStorage
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

### Middleware for correlation IDs

```typescript
// middleware.ts — Correlation ID middleware for Express
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

// Usage in route handler
app.post("/api/orders", correlationIdMiddleware, async (req, res) => {
  // All logs inside this handler automatically include requestId and userId
  logger.info("order_creation_started", { items: req.body.items });

  const order = await orderService.create(req.user.id, req.body.items);

  logger.info("order_created", { orderId: order.id, total: order.total });
  res.json(order);
});
```

### Child loggers

```typescript
// service.ts — Child loggers with bound context
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

## Java: SLF4J with structured logging

### Setup with Logback

```xml
<!-- logback.xml — JSON structured logging for Java -->
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

### MDC for correlation IDs

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

        // Put correlation IDs into MDC
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

// Usage in service code — MDC fields are automatically included in JSON output
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
WARN    — Unexpected but recoverable (deprecated API used, retry triggered)
ERROR   — Failures requiring attention (payment failed, database error)
FATAL   — System-level failures (cannot start, out of memory)

Guidelines:
  - Production: INFO and above
  - Staging: DEBUG and above
  - Development: TRACE and above
  - Never log at ERROR for expected conditions (user not found → WARN or INFO)
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
# logstash.conf — Parse JSON logs
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
# promtail-config.yml — Scrape app logs and parse JSON
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
# Find errors for a specific user
level:error AND user_id:12345

# Find logs for a request across services
request_id:"abc-123-def"

# Find slow database queries
message:"database_query" AND duration_ms:>1000

# Find errors in the last hour
level:error AND @timestamp:[now-1h TO now]
```

### Grafana Loki (LogQL)

```
# Count errors by service
{job="app"} |= "error" | json | level="error" | __error__="" | line_format "{{.service}}: {{.message}}"

# Find logs for a specific request ID
{job="app"} | json | request_id="abc-123"

# Rate of errors over time
sum(rate({job="app"} | json | level="error" [5m])) by (service)
```

## Best Practices


- For a deeper guide, see [Complete Guide to Observability with the Grafana Stack](/guides/complete-guide-observability-grafana-stack/).

- Log in JSON format — every log line is a parseable JSON document
- Always include a timestamp in ISO 8601 format — don't rely on log collection time
- Use correlation IDs — link logs from the same request across services
- Use consistent field names — `user_id` not `userId`, `user.id`, or `uid`
- Log at the right level — INFO for normal operations, ERROR for failures
- Include context in error logs — user ID, request ID, input parameters
- Don't log sensitive data — redact passwords, tokens, PII
- Use structured fields, not string interpolation — `logger.info("order_created", order_id=123)` not `logger.info(f"Order 123 created")`
- Include duration for operations — `duration_ms` field for database queries, API calls
- Use async logging in production — avoid blocking the request thread on I/O

## Common Mistakes

- **Logging plain text**: `print(f"Order {order_id} created")` instead of structured JSON. Use a structured logger.
- **Missing correlation IDs**: can't link logs from the same request. Add request ID middleware.
- **Logging at wrong level**: `logger.error("User not found")` for an expected condition. Use WARN or INFO.
- **Logging sensitive data**: passwords and tokens in plain text. Use redaction paths.
- **Excessive logging**: logging every function call at INFO level. Use DEBUG for fine-grained logging.
- **No log rotation**: log files grow unbounded. Configure rotation or ship to aggregation system.

## FAQ

### What is structured logging?

Logging in a machine-parseable format (typically JSON) where each log entry contains named fields instead of free-text messages. This enables querying, filtering, and alerting on log data.

### What is a correlation ID?

A unique identifier attached to each request and propagated across all service calls. It allows you to find all log entries from a single request across multiple services.

### ELK vs. Loki — which should I use?

ELK (Elasticsearch) is full-text search with indexing — capable queries but high resource usage. Loki indexes only labels (not full text) — cheaper and simpler, but less capable search. Choose Loki for cost efficiency, ELK for complex search needs.

### How do I redact sensitive data in logs?

In pino, use `redact.paths` to specify fields to censor. In structlog, use a custom processor. In Logback, use a layout pattern that masks sensitive fields. Never log raw passwords or tokens.

### What log level should I use in production?

INFO for normal operations, WARN for unexpected but recoverable conditions, ERROR for failures. Set DEBUG and TRACE for staging/development only. Use environment variables to control log levels.
