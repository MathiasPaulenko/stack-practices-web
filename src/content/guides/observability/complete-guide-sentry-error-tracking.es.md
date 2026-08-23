---
contentType: guides
slug: complete-guide-sentry-error-tracking
title: "Sentry: Triage y Resolución de Errores"
description: "Dominá Sentry para el seguimiento de errores en producción. Cubre integración del SDK en Python, Node.js y Java, release tracking, source maps, performance monitoring y alertas."
metaDescription: "Dominá Sentry para el seguimiento de errores en producción: integración del SDK en Python, Node.js y Java, releases, source maps, performance y alertas."
difficulty: intermediate
topics:
  - observability
tags:
  - sentry
  - error-tracking
  - monitoring
  - alerting
  - debugging
  - release-tracking
  - source-maps
relatedResources:
  - /guides/complete-guide-structured-logging
  - /guides/complete-guide-distributed-tracing
  - /recipes/real-user-monitoring
  - /guides/complete-guide-monitoring-and-alerting
  - /guides/complete-guide-observability-grafana-stack
  - /guides/complete-guide-prometheus-grafana
lastUpdated: "2026-08-23"
publishedAt: "2026-07-06"
author: Mathias Paulenko
estimatedReadTime: 18
seo:
  metaDescription: "Dominá Sentry para el seguimiento de errores en producción: integración del SDK en Python, Node.js y Java, releases, source maps, performance y alertas."
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

Sentry captura excepciones, crashes y problemas de performance en producción. Cuando ocurre un error, recolecta el stack
trace, el contexto del request, la información del usuario y los breadcrumbs que lo precedieron. Esta guía cubre la
integración del SDK en Python, Node.js y Java, el seguimiento de releases con source maps, el monitoreo de performance,
reglas de alerta y un flujo de trabajo práctico para triagear y resolver issues.

Si ya conocés Sentry, podés ir directo a [seguimiento de releases y source maps](#release-tracking-y-source-maps)
o a [reglas de alerta](#reglas-de-alerta).

## Cómo Funciona Sentry

1. Un error ocurre en tu aplicación.
2. El SDK de Sentry captura la excepción junto con el stack trace, el contexto del request, el usuario, breadcrumbs y
   tags de entorno y release.
3. El SDK envía el evento al servidor de Sentry.
4. Sentry deduplica y agrupa errores similares en issues.
5. Sentry notifica a tu equipo por Slack, email o PagerDuty.
6. Un developer triagea el issue, identifica la causa raíz y deployea un fix.
7. Sentry marca el issue como resuelto cuando el nuevo release deja de reportar el error.

Los source maps convierten stack traces minificados en nombres de archivo y números de línea legibles. Sin ellos,
debuggear errores de frontend o Node.js empaquetado se vuelve un juego de adivinanzas.

## Integración del SDK

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

## Monitoreo de Performance

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

## Reglas de Alerta

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

## Flujo de Triage

1. Recibí una alerta por Slack, email o PagerDuty.
2. Abrí el issue en Sentry.
3. Revisá los datos clave:
   - Stack trace para identificar el código que falla.
   - Breadcrumbs para entender qué llevó al error.
   - Contexto de usuario para saber quién se vio afectado.
   - Contexto del request para ver el input que lo disparó.
   - Release tag para detectar qué versión introdujo el bug.
   - Tags para filtrar por entorno, servicio y tipo de error.
4. Asigná el issue a un developer.
5. Vinculalo a un ticket de Jira o GitHub.
6. Escribí el fix y hacé el deploy.
7. Sentry detecta el fix en el nuevo release y cierra el issue si no llegan eventos en 72 horas.

## Buenas Prácticas

Seteá el tag `release` en cada deployment. Sentry lo usa para auto-resolver issues una vez que el fix está en producción.
Subí source maps para JavaScript y TypeScript minificados de forma que los stack traces apunten al código fuente real. Usá
`before_send` para redactar PII como contraseñas, tokens y números de tarjetas.

Seteá el contexto del usuario temprano en el ciclo del request para saber quién se vio afectado. Agregá breadcrumbs para
operaciones clave como consultas a base de datos, llamadas a APIs y cambios de estado. Usá tags como `service`,
`endpoint`, `feature_flag` y `user_tier` para filtrar. Si también usás el stack de Grafana para dashboards, consultá la
[guía completa de Observability con Grafana](/es/guides/complete-guide-observability-grafana-stack/).

Sampleá transacciones con criterio: 10% para servicios de alto tráfico y 100% para los de bajo tráfico. Agrupá errores
similares con fingerprinting custom cuando el agrupamiento default no alcanza. Configurá alertas sobre nuevos errores para
atrapar regresiones antes de que los usuarios las reporten, y filtrá por entorno para que los errores de desarrollo no
lleguen al proyecto de producción.

## Errores Comunes

No hacer seguimiento de releases imposibilita saber qué versión introdujo un bug. Siempre seteá `release` cuando
inicializás el SDK.

Sin source maps, los stack traces minificados son casi inútiles. Subí source maps como parte de tu pipeline de CI, no
manualmente después del deploy.

Enviar demasiada data con sample rates altos genera ruido. Usá 10% de trace sampling para servicios de alto tráfico y
subilo a 100% solo para paths críticos o de bajo volumen.

No redactar PII filtra contraseñas, tokens e información personal a Sentry. Usá el hook `before_send` para borrar campos
sensibles antes de que el evento salga de tu servidor.

Ignorar los breadcrumbs borra el camino hacia el error. Agregalos en operaciones importantes y mantené los mensajes lo
suficientemente cortos como para escanearlos rápido.

Usar un solo proyecto de Sentry para todo mezcla errores de codebases distintos. Creá proyectos separados por servicio o
equipo para que el triage sea enfocado.

## Preguntas Frecuentes

### ¿Qué es Sentry?

Sentry es una plataforma de seguimiento de errores y monitoreo de performance. Captura excepciones, crashes y
problemas de performance con stack traces, breadcrumbs, contexto de usuario y seguimiento de releases.

### ¿En qué se diferencia Sentry del logging?

El logging registra eventos en un sistema de agregación para auditoría y debugging. Sentry captura errores y problemas de
performance con contexto enriquecido, así que podés triagear más rápido. Usá ambos.

### ¿Qué son los breadcrumbs?

Los breadcrumbs son una traza de eventos que preceden a un error. Incluyen requests HTTP, consultas a base de datos, clics
de UI y mensajes de log que ayudan a entender la secuencia de acciones que causó el issue.

### ¿Cómo resuelve Sentry los issues?

Sentry resuelve un issue cuando se deployea un nuevo release y no llegan eventos nuevos durante un período configurado,
habitualmente 72 horas. También podés resolverlos manualmente.

### ¿Cuál es el modelo de precios de Sentry?

Sentry ofrece un tier gratuito, tiers pagos Team y Business, y planes Enterprise. Los precios escalan según la cantidad
de eventos que enviés, y podés self-hostear la versión open-source si necesitás control total.
