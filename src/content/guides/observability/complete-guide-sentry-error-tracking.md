---
contentType: guides
slug: complete-guide-sentry-error-tracking
title: "Complete Guide to Sentry: Error Tracking, Triage, and Resolution"
description: "Master Sentry for production error tracking. Covers SDK integration in Python, Node.js, Java, release tracking, source maps, performance monitoring, and alerting."
metaDescription: "Master Sentry for production error tracking: SDK integration in Python, Node.js, Java, release tracking, source maps, performance monitoring, and alerting rules."
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

Sentry is an error tracking and performance monitoring platform that captures exceptions, crashes, and performance issues in real-time. When an error occurs in production, Sentry captures the stack trace, request context, user information, and breadcrumbs leading up to the error. This guide covers Sentry SDK integration in Python, Node.js, and Java, release tracking with source maps, performance monitoring, alerting rules, and production workflows for triaging and resolving errors.

## How Sentry Works

```
1. Error occurs in your application
2. Sentry SDK captures the exception with:
   - Stack trace (with source maps for minified code)
   - Request context (URL, headers, body)
   - User context (ID, email, IP)
   - Breadcrumbs (events leading to the error)
   - Environment and release tags
3. SDK sends the event to Sentry server
4. Sentry deduplicates and groups similar errors into issues
5. Sentry notifies your team via Slack, email, or PagerDuty
6. Developer triages the issue, identifies root cause, and deploys a fix
7. Sentry marks the issue as resolved when the fix is deployed
```

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

```
1. Receive alert (Slack/email/PagerDuty)
2. Open the issue in Sentry
3. Review:
   - Stack trace → identify the failing code
   - Breadcrumbs → understand what led to the error
   - User context → who was affected
   - Request context → what was the input
   - Release tag → which version introduced the bug
   - Tags → filter by environment, service, error type
4. Assign the issue to a developer
5. Link to a Jira/GitHub issue
6. Write a fix and deploy
7. Sentry detects the fix in the new release
8. Issue is auto-resolved if no new events in 72 hours
```

## Best Practices

- Set `release` tag on every deployment — Sentry auto-resolves issues when a fix is deployed
- Upload source maps for minified JavaScript — get readable stack traces
- Use `before_send` to redact PII — passwords, tokens, credit card numbers
- Set user context early in the request lifecycle — identify who was affected
- Add breadcrumbs for key operations — database queries, API calls, state changes
- Use tags for filtering — `service`, `endpoint`, `feature_flag`, `user_tier`
- Sample transactions wisely — 10% for high-traffic, 100% for low-traffic
- Group similar errors — Sentry's default grouping is good, but custom fingerprinting helps
- Set up alerting on new errors — catch regressions before users report them
- Configure environment filtering — don't send development errors to production project

## Common Mistakes

- **No release tracking**: can't tell which version introduced the bug. Always set `release`.
- **No source maps**: minified stack traces are useless. Upload source maps in CI.
- **Sending too much data**: high sample rates create noise. Use 10% for transactions.
- **Not redacting PII**: passwords and tokens leak to Sentry. Use `before_send` hook.
- **Ignoring breadcrumbs**: they show the path to the error. Add them for key operations.
- **One project for everything**: separate projects per service for cleaner triage.

## FAQ

### What is Sentry?

An error tracking and performance monitoring platform that captures exceptions, crashes, and performance issues in real-time. It provides stack traces, breadcrumbs, user context, and release tracking to help developers identify and fix production errors.

### How does Sentry differ from logging?

Logging captures all events to a log aggregation system. Sentry specifically captures errors and performance issues with rich context (stack traces, breadcrumbs, user info). Use both — logs for audit trails, Sentry for error triage.

### What are breadcrumbs?

A trail of events leading up to an error. They include HTTP requests, database queries, UI clicks, and log messages. Breadcrumbs help you understand the sequence of actions that caused the error.

### How does Sentry resolve issues?

When you deploy a fix with a new release tag, Sentry checks if the error still occurs. If no new events are seen for 72 hours (configurable), the issue is auto-resolved. You can also manually resolve issues.

### What is Sentry's pricing model?

Sentry offers a free tier (5,000 errors/month), a Team tier ($26/month, 50,000 errors), and Business/Enterprise tiers. Pricing scales with the number of events. You can self-host Sentry using the open-source version.
