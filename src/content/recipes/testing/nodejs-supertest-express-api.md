---
contentType: recipes
slug: nodejs-supertest-express-api
title: "Test Express APIs with supertest"
description: "How to test Express.js REST API endpoints end-to-end using supertest, including status codes, JSON bodies, headers, authentication, and error handling."
metaDescription: "Test Express.js REST API endpoints end-to-end with supertest. Verify status codes, JSON bodies, headers, auth, and error responses in Node.js tests."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - nodejs
  - express
  - supertest
  - api
  - integration
  - recipe
relatedResources:
  - /recipes/testing/javascript-vitest-snapshot-testing
  - /recipes/testing/javascript-msw-mock-service-worker
  - /recipes/testing/integration-testing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Test Express.js REST API endpoints end-to-end with supertest. Verify status codes, JSON bodies, headers, auth, and error responses in Node.js tests."
  keywords:
    - testing
    - nodejs
    - express
    - supertest
    - api
    - integration
    - recipe
---

## Overview

Supertest is a Node.js library for testing HTTP servers. It wraps the `superagent` HTTP client and lets you make requests against your Express app without starting a real server. Requests go through the Express routing stack, middleware, and handlers — making it an end-to-end test for your API layer.

## When to Use

- Testing Express route handlers, middleware, and error handlers together
- Verifying HTTP status codes, response bodies, and headers from API endpoints
- Testing authentication and authorization flows (JWT, session, API keys)
- Validating request validation (body, params, query) and error response format
- Testing API rate limiting and content negotiation

## When NOT to Use

- Unit testing individual functions — use `vitest` or `jest` directly
- Testing frontend components — use `@testing-library/react` or `@testing-library/vue`
- Load testing — use `k6` or `artillery` instead
- Testing external APIs — use `nock` or `msw` to mock them

## Solution

### Setup

```bash
npm install -D supertest vitest
```

### Basic API test

```typescript
import request from "supertest";
import express from "express";
import { describe, it, expect } from "vitest";

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});

describe("GET /api/health", () => {
  it("returns 200 with healthy status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("healthy");
    expect(response.body.timestamp).toBeDefined();
  });
});
```

### Testing POST with JSON body

```typescript
app.post("/api/users", (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "email and name are required" });
  }
  res.status(201).json({ id: 1, email, name });
});

describe("POST /api/users", () => {
  it("creates a user with valid data", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(1);
    expect(response.body.email).toBe("alice@example.com");
  });

  it("returns 400 when email is missing", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ name: "Alice" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("email");
  });
});
```

### Testing authentication

```typescript
import jwt from "jsonwebtoken";

const SECRET = "test-secret";

app.get("/api/profile", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, SECRET);
    res.json({ userId: payload.userId, email: payload.email });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

describe("GET /api/profile with auth", () => {
  it("returns 401 without token", async () => {
    const response = await request(app).get("/api/profile");
    expect(response.status).toBe(401);
  });

  it("returns user data with valid token", async () => {
    const token = jwt.sign({ userId: 42, email: "alice@example.com" }, SECRET);
    const response = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe(42);
  });

  it("returns 401 with expired token", async () => {
    const token = jwt.sign({ userId: 42 }, SECRET, { expiresIn: "0s" });
    const response = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
```

### Testing query parameters and pagination

```typescript
const users = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

app.get("/api/users", (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const start = (page - 1) * limit;
  const end = start + limit;

  res.json({
    data: users.slice(start, end),
    total: users.length,
    page,
    limit,
  });
});

describe("GET /api/users with pagination", () => {
  it("returns first page by default", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.page).toBe(1);
    expect(response.body.total).toBe(25);
  });

  it("returns correct page when specified", async () => {
    const response = await request(app).get("/api/users?page=2&limit=5");

    expect(response.body.data).toHaveLength(5);
    expect(response.body.data[0].id).toBe(6);
  });
});
```

### Testing error handling middleware

```typescript
app.get("/api/error", () => {
  throw new Error("Something went wrong");
});

app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

describe("Error handling", () => {
  it("returns 500 with error message", async () => {
    const response = await request(app).get("/api/error");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Something went wrong");
  });
});
```

### Testing with cookies and sessions

```typescript
app.post("/api/login", (req, res) => {
  res.cookie("session", "abc-123", { httpOnly: true });
  res.json({ authenticated: true });
});

app.get("/api/dashboard", (req, res) => {
  if (!req.headers.cookie?.includes("session=abc-123")) {
    return res.status(401).json({ error: "No session" });
  }
  res.json({ data: "secret dashboard data" });
});

describe("Cookie-based sessions", () => {
  it("maintains cookies across requests", async () => {
    const agent = request.agent(app);

    await agent.post("/api/login").expect(200);

    const response = await agent.get("/api/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.data).toBe("secret dashboard data");
  });
});
```

## Variants

### Using `supertest` with Fastify

```typescript
import Fastify from "fastify";

const fastify = Fastify();
fastify.get("/api/health", async () => ({ status: "healthy" }));

await fastify.ready();
const response = await request(fastify.server).get("/api/health");
```

### Testing file uploads

```typescript
import fs from "fs";
import path from "path";

app.post("/api/upload", (req, res) => {
  res.json({ received: true });
});

it("uploads a file", async () => {
  const filePath = path.join(__dirname, "fixtures", "test.txt");
  fs.writeFileSync(filePath, "test content");

  const response = await request(app)
    .post("/api/upload")
    .attach("file", filePath);

  expect(response.status).toBe(200);
  expect(response.body.received).toBe(true);
});
```

## Best Practices

- Export the Express `app` object from your server file — import it in tests without starting the server
- Use `request.agent(app)` to persist cookies across multiple requests in a test
- Test both success and error paths — 400, 401, 403, 404, 409, 500
- Set `Content-Type` explicitly when sending JSON bodies
- Use `.expect(status)` as a shorthand instead of manual assertions
- Reset database state between tests — use a transaction or truncate in `beforeEach`

## Common Mistakes

- **Starting a real server**: `app.listen()` in the test file causes port conflicts. Import the `app` object directly.
- **Not setting `express.json()` middleware**: POST bodies arrive as empty objects without the JSON parser.
- **Forgetting to `await` the request**: supertest returns a promise. Without `await`, the test ends before the response arrives.
- **Testing with a real database**: use mocks or a test database. Production data causes flaky tests.
- **Not testing error responses**: only testing the happy path misses validation and error handling bugs.

## FAQ

### How do I test WebSocket endpoints with supertest?

Supertest only supports HTTP. For WebSocket testing, use `ws` with a test client or `socket.io-client` in your tests.

### Can I use supertest with TypeScript?

Yes. Install `@types/supertest` for type definitions. The API is identical.

### How do I test rate limiting?

Make multiple rapid requests and check when the API returns 429:

```typescript
it("returns 429 after rate limit", async () => {
  for (let i = 0; i < 100; i++) {
    const response = await request(app).get("/api/limited");
    if (i >= 50) expect(response.status).toBe(429);
  }
});
```

### Should I mock the database in supertest tests?

It depends. For unit-level API tests, mock the data layer. For integration tests, use a real test database (SQLite in-memory, Testcontainers, or a dedicated test schema).

### How do I test CORS headers?

```typescript
const response = await request(app)
  .options("/api/data")
  .set("Origin", "https://example.com");

expect(response.headers["access-control-allow-origin"]).toBe("https://example.com");
```
