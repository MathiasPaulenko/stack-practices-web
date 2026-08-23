---
contentType: guides
slug: complete-guide-sentry-error-tracking
title: "Sentry: Error Tracking, Triage, and Resolution"
description: "Master Sentry for production error tracking. Covers SDK integration in Python, Node.js, Java, release tracking, source maps, performance monitoring, and alerting."
metaDescription: "Master Sentry for production error tracking: SDK integration in Python, Node.js, Java, release tracking, source maps, performance monitoring, and alerting rules."
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
  metaDescription: "Master Sentry for production error tracking: SDK integration in Python, Node.js, Java, release tracking, source maps, performance monitoring, and alerting rules."
  keywords:
    - sentry
    - error tracking
    - sentry sdk
    - source maps
    - release tracking
    - performance monitoring
    - observability
---

## Introduction

Sentry is the tool you reach for when exceptions start slipping through to production. It captures the stack trace, request
context, user info, and breadcrumbs that led to the failure, then surfaces it all in one place. This guide walks through
SDK setup for Python, Node.js, and Java, release tracking with source maps, performance monitoring, alerting rules,
and a
practical workflow for triaging and fixing errors.

If you've already shipped Sentry, jump straight to
[release tracking and source maps](#release-tracking-and-source-maps) or [alerting rules](#alerting-rules).

## How Sentry Works

When an error bubbles up in your application, the Sentry SDK intercepts it. It records the stack trace, request context,
user context, breadcrumbs, and environment and release tags, then ships the event to Sentry's servers. From there, Sentry
deduplicates and groups similar errors into issues and pings your team in Slack, email, or PagerDuty. A developer opens
the issue, traces the root cause, deploys a fix, and Sentry resolves the issue once the new release stops reporting it.

Source maps matter here. They turn minified stack traces into readable file names and line numbers; without them, debugging
bundled frontend or Node.js code is mostly guesswork.

## SDK Integration

### Python: Flask/Django

```python
# sentry_config.py — Sentry SDK for Python
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
        # Sample 100% of errors, 10% of transactions for performance
        traces_sample_rate=0.1,
        sample_rate=1.0,
        integrations=[
            FlaskIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
        ],
        # Send PII (email, IP) — enable with caution
        send_default_pii=True,
        # Before send hook to filter sensitive data
        before_send=filter_sensitive_data,
    )

def filter_sensitive_data(event, hint):
    """Remove sensitive data before sending to Sentry."""
    if "request" in event:
        headers = event["request"].get("headers", {})
        # Remove authorization headers
        for key in list(headers.keys()):
            if key.lower() in ("authorization", "cookie", "x-api-key"):
                headers[key] = "[REDACTED]"
        # Remove sensitive body fields
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
        # Set user context
        set_user({"id": str(user_id), "email": "user@example.com"})

        # Add breadcrumbs for debugging
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
            # Capture with extra context
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
// sentry.ts — Sentry SDK for Node.js
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
      // Redact sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      // Redact sensitive body fields
      if (event.request?.data && typeof event.request.data === "object") {
        delete event.request.data.password;
        delete event.request.data.creditCard;
      }
      return event;
    },
  });
}

// Express middleware — must be before routes
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
// SentryConfig.java — Sentry SDK for Spring Boot
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
                // Redact sensitive data
                if (event.getRequest() != null) {
                    event.getRequest().getHeaders().remove("Authorization");
                    event.getRequest().getHeaders().remove("Cookie");
                }
                return event;
            });
        };
    }
}

// Service code with manual capture
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

## Release Tracking and Source Maps

### Release tracking

```bash
# Create a Sentry release
sentry-cli releases new "order-service@1.2.3"

# Associate commits with the release
sentry-cli releases set-commits "order-service@1.2.3" \
    --auto

# Finalize the release
sentry-cli releases finalize "order-service@1.2.3"

# Mark deployment
sentry-cli releases deploys "order-service@1.2.3" new \
    --env production \
    --url "https://order-service.example.com"
```

### Source maps for JavaScript

```javascript
// webpack.config.js — Upload source maps to Sentry
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
      // Strip server-side code paths
      urlPrefix: "~/static/js",
    }),
  ],
};
```

### CI/CD integration

```yaml
# .github/workflows/deploy.yml — Sentry release in CI
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
# Python: Custom transactions and spans
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
# Sentry alert rules (configured in Sentry UI or via API)
# Example: Alert on high error rate
rules:
  - name: "High error rate"
    conditions:
      - event_level: error
      - threshold: 10  # errors in 1 hour
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

Once the alert hits Slack, email, or PagerDuty, open the issue in Sentry and read the data: the stack trace tells you where
the code broke, breadcrumbs replay what led to the crash, user context shows who was affected, request context shows the
input, the release tag tells you which version introduced the bug, and tags let you filter by environment, service, or
error type. Assign the issue, link it to a Jira or GitHub ticket, write the fix, and deploy. Sentry notices the new release
and closes the issue automatically if no events arrive for 72 hours.

## Best Practices

Always set the `release` tag; Sentry uses it to auto-resolve issues once the fix is in production. Upload source maps for
minified JavaScript and TypeScript so stack traces point to the actual source. Use `before_send` to scrub PII like
passwords, tokens, and credit card numbers before the event leaves your server.

Set user context as soon as the request starts so you can see who was affected. Add breadcrumbs around operations like
database queries, API calls, and state changes. Use tags like `service`, `endpoint`, `feature_flag`, and `user_tier` to
slice the data. If Grafana is also part of your observability stack, see the
[Complete Guide to Observability with the Grafana Stack](/guides/complete-guide-observability-grafana-stack/).

For transaction sampling, use 10% in high-volume services and 100% in low-traffic or critical paths. When the default
grouping misses, use custom fingerprinting. Set up alerts for new errors so regressions don't wait for a user report, and
filter by environment so development noise stays out of the production project.

## Common Mistakes

Without release tracking, you can't tell which version introduced a bug. Set `release` every time you initialize the SDK.

Without source maps, minified stack traces are nearly useless. Upload them in your CI pipeline, not by hand after the fact.

Cranking the sample rate to 100% everywhere just creates noise. Use 10% trace sampling for high-traffic services and raise
it to 100% only for low-traffic or critical paths.

Failing to redact PII sends passwords, tokens, and personal information to Sentry. Use the `before_send` hook to strip
sensitive fields before the event leaves your server.

It's tempting to skip breadcrumbs, but they show the path to the error. Add them for the operations that matter, and keep
their messages short enough to scan.

Resist the urge to pile every service into one Sentry project; that just mixes unrelated errors. Split projects by service
or team so triage stays focused.

## FAQ

### What is Sentry?

Sentry tracks errors and monitors performance in production apps. It captures exceptions, crashes, and performance issues
with stack traces, breadcrumbs, user context, and release tracking.

### How does Sentry differ from logging?

Logging writes events to an aggregation system you can use for audit trails and debugging. Sentry grabs errors and
performance problems with enough context to triage them quickly. Use both.

### What are breadcrumbs?

Breadcrumbs are the trail of events that led to an error — HTTP requests, database queries, UI clicks, and log messages.
They help you understand the sequence of actions that caused the issue.

### How does Sentry resolve issues?

Sentry marks an issue resolved when you deploy a new release and no new events show up for a set period, usually 72 hours.
You can resolve issues manually too.

### What is Sentry's pricing model?

Sentry has a free tier, paid Team and Business tiers, and Enterprise plans. Pricing scales with the number of events you
send, and you can self-host the open-source version if you need full control.
