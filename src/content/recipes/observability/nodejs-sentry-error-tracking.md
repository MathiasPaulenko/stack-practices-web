---
contentType: recipes
slug: nodejs-sentry-error-tracking
title: "Error Tracking with Sentry in Express"
description: "How to integrate Sentry for error tracking in Node.js Express applications, including error handlers, performance monitoring, release tracking, and source maps."
metaDescription: "Integrate Sentry error tracking in Node.js Express apps. Capture errors, monitor performance, track releases, and upload source maps for stack traces."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - nodejs
  - sentry
  - error-tracking
  - express
  - recipe
relatedResources:
  - /recipes/observability/nodejs-pino-fast-logging
  - /recipes/observability/nodejs-winston-daily-rotate
  - /recipes/observability/python-structured-logging-json
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Integrate Sentry error tracking in Node.js Express apps. Capture errors, monitor performance, track releases, and upload source maps for stack traces."
  keywords:
    - observability
    - nodejs
    - sentry
    - error-tracking
    - express
    - recipe
---

## Overview

Sentry captures unhandled errors in your application, groups them by similarity, and sends alerts. It shows the stack trace, request context, user info, and breadcrumbs (events leading to the error). In Express, Sentry middleware wraps the request pipeline so any thrown error or unhandled rejection gets captured automatically.

## When to Use

- Production applications where you need real-time error alerts
- Tracking error rates and regression detection across releases
- Capturing user-reported bugs with full stack traces and request context
- Monitoring performance (transaction tracing) alongside error tracking
- Triaging bugs by severity, frequency, and affected users

## When NOT to Use

- Local development — use the debugger and console output
- Applications with no error handling — fix your try/catch blocks first
- Low-traffic internal tools — Sentry's free tier has event limits
- Logging-only observability — Sentry is for errors, not general log shipping

## Solution

### Setup

```bash
npm install @sentry/node
```

### Basic integration with Express

```javascript
const express = require("express");
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://your-dsn@sentry.io/123",
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
});

const app = express();

// Sentry request handler must be the first middleware
app.use(Sentry.Handlers.requestHandler());

app.get("/api/users/:id", (req, res) => {
  if (req.params.id === "0") {
    throw new Error("Invalid user ID");
  }
  res.json({ id: req.params.id, name: "Alice" });
});

// Sentry error handler must be after all routes
app.use(Sentry.Handlers.errorHandler());

app.listen(3000);
```

### Manual error capture

```javascript
Sentry.captureException(new Error("Something went wrong"));

Sentry.captureMessage("Rate limit approaching", "warning");

try {
  JSON.parse("{invalid}");
} catch (err) {
  Sentry.captureException(err);
}
```

### Adding context to errors

```javascript
// Set user context
Sentry.setUser({
  id: 42,
  email: "alice@example.com",
  username: "alice",
});

// Set tags (filterable in Sentry UI)
Sentry.setTag("page_locale", "en-US");
Sentry.setTag("feature_flag", "new_checkout");

// Set extra context (searchable but not filterable)
Sentry.setExtra("order_id", "ord-123");
Sentry.setExtra("cart_items", 3);

// Clear user after logout
Sentry.setUser(null);
```

### Breadcrumbs for debugging

```javascript
Sentry.addBreadcrumb({
  category: "auth",
  message: "User authenticated",
  level: "info",
  data: { method: "oauth", provider: "google" },
});

Sentry.addBreadcrumb({
  category: "http",
  message: "GET /api/users/42",
  level: "info",
  data: { status_code: 200, duration_ms: 45 },
});

// If an error happens later, Sentry shows these breadcrumbs
```

### Custom transaction for performance monitoring

```javascript
const transaction = Sentry.startTransaction({
  name: "process_order",
  op: "function",
});

try {
  const span = transaction.startChild({ op: "validate_payment" });
  // ... validate payment ...
  span.finish();

  const dbSpan = transaction.startChild({ op: "save_order" });
  // ... save to database ...
  dbSpan.finish();
} catch (err) {
  Sentry.captureException(err);
} finally {
  transaction.finish();
}
```

### Release tracking

```javascript
Sentry.init({
  dsn: "https://your-dsn@sentry.io/123",
  release: process.env.SENTRY_RELEASE || "1.0.0",
  environment: process.env.NODE_ENV,
});

// Sentry now groups errors by release and shows regression detection
```

### Source maps for readable stack traces

```bash
npm install @sentry/cli --save-dev
```

```javascript
// sentry.config.js
module.exports = {
  org: "your-org",
  project: "your-project",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: process.env.SENTRY_RELEASE,
};
```

Upload source maps during build:

```bash
sentry-cli sourcemaps upload --release 1.0.0 ./dist
```

Or configure in `sentry.properties`:

```properties
defaults.url=https://sentry.io
defaults.org=your-org
defaults.project=your-project
auth.token=your-auth-token
```

### Integrating with Winston

```javascript
const winston = require("winston");
const Sentry = require("@sentry/node");

const logTransport = new winston.transports.Console();

const sentryTransport = {
  log(info) {
    if (info.level === "error") {
      Sentry.captureException(new Error(info.message));
    }
    return true;
  },
};

const logger = winston.createLogger({
  transports: [logTransport, sentryTransport],
});

logger.error("Database connection failed");
// Sends to both console and Sentry
```

### Filtering and sampling

```javascript
Sentry.init({
  dsn: "https://your-dsn@sentry.io/123",
  tracesSampleRate: 0.1, // 10% of transactions
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
  denyUrls: [
    /extensions\//i,
    /safari-extension/i,
  ],
  beforeSend(event) {
    if (event.request.url.includes("/health")) {
      return null; // Don't send health check errors
    }
    return event;
  },
});
```

## Variants

### Using Sentry with Fastify

```javascript
const Fastify = require("fastify");
const Sentry = require("@sentry/node");

Sentry.init({ dsn: "https://your-dsn@sentry.io/123" });

const fastify = Fastify();

fastify.addHook("onRequest", async (request, reply) => {
  request.sentry = Sentry.getCurrentHub();
});

fastify.addHook("onError", async (request, reply, error) => {
  Sentry.captureException(error);
});

fastify.get("/api/error", async () => {
  throw new Error("Fastify error");
});
```

### Using Sentry with TypeScript

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 0.1,
});

interface UserContext {
  id: string;
  email: string;
}

function setSentryUser(user: UserContext): void {
  Sentry.setUser(user);
}
```

## Best Practices

- Place `Sentry.Handlers.requestHandler()` before all other middleware — it needs to wrap the full request
- Place `Sentry.Handlers.errorHandler()` after all routes — it catches errors that slip through
- Set `release` to your git commit SHA or version tag — enables regression detection
- Upload source maps in CI — minified stack traces are useless without them
- Use `beforeSend` to filter noise (health checks, static asset 404s, browser extension errors)
- Set `tracesSampleRate` to 0.1 in production — 1.0 overwhelms your Sentry quota
- Use `setUser()` to identify who experienced the error — invaluable for support tickets
- Add breadcrumbs for key actions (auth, API calls, state changes) to trace the error path

## Common Mistakes

- **Not using the error handler middleware**: without `Sentry.Handlers.errorHandler()`, Express's default error handler catches errors before Sentry.
- **Setting DSN in code**: use an environment variable. Committing the DSN exposes it.
- **Not uploading source maps**: minified code produces unreadable stack traces. Always upload in CI.
- **Sending too many events**: without sampling or filtering, Sentry sends every error. Filter noise with `ignoreErrors` and `denyUrls`.
- **Not clearing user context on logout**: errors after logout are attributed to the previous user.

## FAQ

### How do I test that Sentry is working?

Create a test route:

```javascript
app.get("/debug-sentry", () => {
  throw new Error("Sentry test error");
});
```

Visit the route and check your Sentry dashboard for the error.

### What is the difference between `captureException` and `captureMessage`?

`captureException` takes an Error object and includes the stack trace. `captureMessage` takes a string and creates a breadcrumb-level event. Use `captureException` for errors and `captureMessage` for warnings or info.

### How do I handle async errors?

Sentry's Express middleware catches async errors automatically in Express 5+. For Express 4, wrap async handlers:

```javascript
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/async", asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```

### Can I use Sentry for frontend errors too?

Yes. Install `@sentry/react` or `@sentry/vue` for frontend. Use the same organization and project — Sentry separates frontend and backend errors by platform.

### How do I reduce Sentry costs?

- Lower `tracesSampleRate` (0.01 for high-traffic apps)
- Use `ignoreErrors` to filter known noise
- Use `beforeSend` to drop events from health checks and static assets
- Set `maxBreadcrumbs` to 20 instead of the default 100
