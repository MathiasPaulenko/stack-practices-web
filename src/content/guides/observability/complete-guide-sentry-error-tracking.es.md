---
contentType: guides
slug: complete-guide-sentry-error-tracking
title: "Guía Completa de Sentry: Error Tracking, Triage y Resolution"
description: "Dominá Sentry para error tracking en producción. Cubre SDK integration en Python, Node.js, Java, release tracking, source maps, performance monitoring y alerting."
metaDescription: "Dominá Sentry para error tracking en producción: SDK integration en Python, Node.js, Java, release tracking, source maps, performance monitoring y alerting rules."
difficulty: intermediate
topics:
  - observability
tags:
  - guide
  - sentry
  - error-tracking
  - monitoring
  - alerting
  - observability
  - debugging
relatedResources:
  - /guides/observability/complete-guide-structured-logging
  - /guides/observability/complete-guide-distributed-tracing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 18
seo:
  metaDescription: "Dominá Sentry para error tracking en producción: SDK integration en Python, Node.js, Java, release tracking, source maps, performance monitoring y alerting rules."
  keywords:
    - sentry
    - error tracking
    - sentry sdk
    - source maps
    - release tracking
    - performance monitoring
    - observability
---

## Introducción

Sentry es una platform de error tracking y performance monitoring que capturea exceptions, crashes y performance issues en real-time. Cuando un error ocurre en production, Sentry capturea el stack trace, request context, user information y breadcrumbs que llevaron al error. Esta guía cubre Sentry SDK integration en Python, Node.js y Java, release tracking con source maps, performance monitoring, alerting rules y workflows de production para triaging y resolving errors.

## Cómo Funciona Sentry

```
1. Error ocurre en tu application
2. Sentry SDK capturea la exception con:
   - Stack trace (con source maps para minified code)
   - Request context (URL, headers, body)
   - User context (ID, email, IP)
   - Breadcrumbs (events que llevaron al error)
   - Environment y release tags
3. SDK manda el event a Sentry server
4. Sentry deduplica y groupéa errors similares en issues
5. Sentry notifica a tu team via Slack, email o PagerDuty
6. Developer triagea el issue, identifica root cause y deployéa un fix
7. Sentry marca el issue como resolved cuando el fix se deployéa
```

## SDK Integration

### Python: Flask/Django

```python
# sentry_config.py — Sentry SDK para Python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

def init_sentry():
    sentry_sdk.init(
        dsn="https://your-dsn@sentry.io/123",
        environment="production",
        release="order-service@1.2.3",
        # Sampleá 100% de errors, 10% de transactions para performance
        traces_sample_rate=0.1,
        sample_rate=1.0,
        integrations=[
            FlaskIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
        ],
        # Mandá PII (email, IP) — habilitá con caution
        send_default_pii=True,
        # Before send hook para filtrar sensitive data
        before_send=filter_sensitive_data,
    )

def filter_sensitive_data(event, hint):
    """Remové sensitive data antes de mandar a Sentry."""
    if "request" in event:
        headers = event["request"].get("headers", {})
        # Remové authorization headers
        for key in list(headers.keys()):
            if key.lower() in ("authorization", "cookie", "x-api-key"):
                headers[key] = "[REDACTED]"
        # Remové sensitive body fields
        body = event["request"].get("data", {})
        if isinstance(body, dict):
            for key in ("password", "credit_card", "ssn"):
                if key in body:
                    body[key] = "[REDACTED]"
    return event

# Manual error capture
from sentry_sdk import capture_exception, capture_message, set_user, add_breadcrumb

class OrderService:
    def create_order(self, user_id: int, items: list[dict]) -> dict:
        # Seteá user context
        set_user({"id": str(user_id), "email": "user@example.com"})

        # Agregá breadcrumbs para debugging
        add_breadcrumb(
            category="order",
            message=f"Creating order for user {user_id} with {len(items)} items",
            level="info",
        )

        try:
            order = self._process_order(user_id, items)
            add_breadcrumb(category="order", message="Order created successfully", level="info")
            return order
        except PaymentError as e:
            # Captureá con extra context
            capture_exception(e, {
                "extra": {
                    "user_id": user_id,
                    "items_count": len(items),
                    "total_amount": sum(i["price"] * i["quantity"] for i in items),
                },
                "tags": {"error_type": "payment", "severity": "high"},
            })
            raise
        except Exception as e:
            capture_exception(e)
            raise
```

### Node.js: Express

```typescript
// sentry.ts — Sentry SDK para Node.js
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
  Sentry.init({
    dsn: "https://your-dsn@sentry.io/123",
    environment: process.env.NODE_ENV || "development",
    release: `api-gateway@${process.env.APP_VERSION || "1.0.0"}`,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
    beforeSend(event) {
      // Redactéa sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      // Redactéa sensitive body fields
      if (event.request?.data && typeof event.request.data === "object") {
        delete event.request.data.password;
        delete event.request.data.creditCard;
      }
      return event;
    },
  });
}

// Express middleware — debe ir antes de routes
import express from "express";
const app = express();

Sentry.setupExpressErrorHandler(app);

// Manual error capture
import { captureException, setUser, addBreadcrumb } from "@sentry/node";

class OrderService {
  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    Sentry.setUser({ id: userId, email: "user@example.com" });

    Sentry.addBreadcrumb({
      category: "order",
      message: `Creating order for user ${userId} with ${items.length} items`,
      level: "info",
    });

    try {
      const order = await this.processOrder(userId, items);
      Sentry.addBreadcrumb({
        category: "order",
        message: "Order created successfully",
        level: "info",
      });
      return order;
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          userId,
          itemCount: items.length,
          totalAmount: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        },
        tags: { errorType: "order_creation", severity: "high" },
      });
      throw error;
    }
  }
}

// Custom error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Sentry.captureException(err);
  res.status(500).json({ error: "Internal server error" });
});
```

### Java: Spring Boot

```java
// SentryConfig.java — Sentry SDK para Spring Boot
import io.sentry.Sentry;
import io.sentry.spring.tracing.SentryTracingConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SentryConfig {

    @Bean
    public Sentry.OptionsConfiguration sentryOptions() {
        return options -> {
            options.setDsn("https://your-dsn@sentry.io/123");
            options.setEnvironment("production");
            options.setRelease("order-service@1.2.3");
            options.setTracesSampleRate(0.1);
            options.setBeforeSend((event, hint) -> {
                // Redactéa sensitive data
                if (event.getRequest() != null) {
                    event.getRequest().getHeaders().remove("Authorization");
                    event.getRequest().getHeaders().remove("Cookie");
                }
                return event;
            });
        };
    }
}

// Service code con manual capture
@Service
public class OrderService {

    public Order createOrder(Long userId, List<OrderItem> items) {
        Sentry.setUser(new Sentry.User(
            String.valueOf(userId),
            "user@example.com",
            null,
            null
        ));

        Sentry.addBreadcrumb("Creating order for user " + userId, "order");

        try {
            Order order = processOrder(userId, items);
            Sentry.addBreadcrumb("Order created successfully", "order");
            return order;
        } catch (PaymentException e) {
            Sentry.captureException(e, Scope -> {
                Scope.setExtra("user_id", userId);
                Scope.setExtra("items_count", items.size());
                Scope.setTag("error_type", "payment");
            });
            throw e;
        }
    }
}
```

## Release Tracking y Source Maps

### Release tracking

```bash
# Creá un Sentry release
sentry-cli releases new "order-service@1.2.3"

# Asociá commits con el release
sentry-cli releases set-commits "order-service@1.2.3" \
    --auto

# Finalizá el release
sentry-cli releases finalize "order-service@1.2.3"

# Markéa deployment
sentry-cli releases deploys "order-service@1.2.3" new \
    --env production \
    --url "https://order-service.example.com"
```

### Source maps para JavaScript

```javascript
// webpack.config.js — Subí source maps a Sentry
const SentryWebpackPlugin = require("@sentry/webpack-plugin");

module.exports = {
  devtool: "source-map",
  plugins: [
    new SentryWebpackPlugin({
      org: "your-org",
      project: "api-gateway",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: "api-gateway@1.2.3",
      include: "./dist",
      ignore: ["node_modules", "webpack.config.js"],
      // Stripéa server-side code paths
      urlPrefix: "~/static/js",
    }),
  ],
};
```

### CI/CD integration

```yaml
# .github/workflows/deploy.yml — Sentry release en CI
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: Create Sentry release
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        run: |
          npm run build
          npx sentry-cli releases new "api-gateway@${{ github.sha }}"
          npx sentry-cli releases set-commits "api-gateway@${{ github.sha }}" --auto
          npx sentry-cli releases files "api-gateway@${{ github.sha }}" upload-sourcemaps ./dist
          npx sentry-cli releases finalize "api-gateway@${{ github.sha }}"

      - name: Deploy
        run: npm run deploy

      - name: Mark Sentry deploy
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        run: |
          npx sentry-cli releases deploys "api-gateway@${{ github.sha }}" new \
            --env production
```

## Performance Monitoring

```python
# Python: Custom transactions y spans
import sentry_sdk

@sentry_sdk.trace
def process_order(user_id: int, items: list[dict]) -> dict:
    with sentry_sdk.start_span(op="db", description="query_user") as span:
        user = db.query(User).get(user_id)
        span.set_data("user.id", user_id)

    with sentry_sdk.start_span(op="http.client", description="charge_payment") as span:
        payment = payment_client.charge(user_id, total)
        span.set_data("payment.amount", payment["amount"])

    with sentry_sdk.start_span(op="db", description="save_order") as span:
        order = order_repo.create(user_id, items, payment["id"])
        span.set_data("order.id", order["id"])

    return order
```

```typescript
// Node.js: Custom spans
import * as Sentry from "@sentry/node";

async function processOrder(userId: string, items: OrderItem[]): Promise<Order> {
  return Sentry.startSpan({ op: "function", name: "process_order" }, async () => {
    const user = await Sentry.startSpan(
      { op: "db", name: "query_user" },
      async () => await userRepo.findById(userId)
    );

    const payment = await Sentry.startSpan(
      { op: "http.client", name: "charge_payment" },
      async () => await paymentService.charge(userId, total)
    );

    const order = await Sentry.startSpan(
      { op: "db", name: "save_order" },
      async () => await orderRepo.create({ userId, items, paymentId: payment.id })
    );

    return order;
  });
}
```

## Alerting Rules

```yaml
# Sentry alert rules (configurado en Sentry UI o via API)
# Example: Alertéa en high error rate
rules:
  - name: "High error rate"
    conditions:
      - event_level: error
      - threshold: 10  # errors en 1 hour
    actions:
      - notify_slack: "#alerts"
      - notify_email: ["oncall@company.com"]

  - name: "New error in production"
    conditions:
      - event_level: error
      - environment: production
      - is_new: true
    actions:
      - notify_slack: "#engineering"
      - create_issue: true

  - name: "Performance regression"
    conditions:
      - metric: p95_duration
      - threshold: 2000  # ms
      - comparison: greater_than
    actions:
      - notify_slack: "#performance"
```

## Triage Workflow

```
1. Recibí alert (Slack/email/PagerDuty)
2. Abrí el issue en Sentry
3. Revisá:
   - Stack trace → identificá el failing code
   - Breadcrumbs → entendé qué llevó al error
   - User context → quién fue affected
   - Request context → cuál fue el input
   - Release tag → qué versión introdujo el bug
   - Tags → filtrá por environment, service, error type
4. Asigná el issue a un developer
5. Linkeá a un Jira/GitHub issue
6. Escribí un fix y deployéa
7. Sentry detecta el fix en el new release
8. Issue se auto-resuelve si no hay new events en 72 hours
```

## Best Practices

- Seteá `release` tag en cada deployment — Sentry auto-resuelve issues cuando un fix se deployéa
- Subí source maps para minified JavaScript — obtené readable stack traces
- Usá `before_send` para redactar PII — passwords, tokens, credit card numbers
- Seteá user context early en el request lifecycle — identificá quién fue affected
- Agregá breadcrumbs para key operations — database queries, API calls, state changes
- Usá tags para filtering — `service`, `endpoint`, `feature_flag`, `user_tier`
- Sampleá transactions sabiamente — 10% para high-traffic, 100% para low-traffic
- Groupéa errors similares — el default grouping de Sentry es bueno, pero custom fingerprinting ayuda
- Seteá alerting en new errors — capturá regressions antes de que users los reporten
- Configurá environment filtering — no mandes development errors al production project

## Common Mistakes

- **No release tracking**: no podés decir qué versión introdujo el bug. Siempre seteá `release`.
- **No source maps**: minified stack traces son useless. Subí source maps en CI.
- **Mandar demasiada data**: high sample rates crean noise. Usá 10% para transactions.
- **No redactar PII**: passwords y tokens leakean a Sentry. Usá `before_send` hook.
- **Ignorar breadcrumbs**: muestran el path al error. Agregalos para key operations.
- **Un project para todo**: separá projects por service para cleaner triage.

## FAQ

### ¿Qué es Sentry?

Una platform de error tracking y performance monitoring que capturea exceptions, crashes y performance issues en real-time. Provee stack traces, breadcrumbs, user context y release tracking para ayudar a developers a identificar y fixear production errors.

### ¿Cómo se diferencia Sentry de logging?

Logging capturea todos los events a un log aggregation system. Sentry específicamente capturea errors y performance issues con rich context (stack traces, breadcrumbs, user info). Usá ambos — logs para audit trails, Sentry para error triage.

### ¿Qué son breadcrumbs?

Un trail de events que llevan a un error. Incluyen HTTP requests, database queries, UI clicks y log messages. Breadcrumbs te ayudan a entender la secuencia de acciones que causó el error.

### ¿Cómo resuelve Sentry issues?

Cuando deployéas un fix con un new release tag, Sentry checkea si el error still ocurre. Si no hay new events por 72 hours (configurable), el issue se auto-resuelve. También podés manually resolve issues.

### ¿Cuál es el pricing model de Sentry?

Sentry ofrece un free tier (5,000 errors/month), un Team tier ($26/month, 50,000 errors) y Business/Enterprise tiers. Pricing escala con el número de events. Podés self-hostear Sentry usando la open-source version.
