---


contentType: recipes
slug: javascript-msw-mock-service-worker
title: "Mock Network Requests with MSW"
description: "How to use Mock Service Worker (MSW) to intercept network requests in JavaScript tests and development, including REST and GraphQL mocking."
metaDescription: "Intercept network requests in JavaScript tests with MSW. Mock REST and GraphQL APIs for development, unit tests, and integration tests without code changes."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - javascript
  - msw
  - mocking
  - http
  - graphql
  - recipe
relatedResources:
  - /recipes/javascript-vitest-snapshot-testing
  - /recipes/nodejs-supertest-express-api
  - /recipes/api-mocking
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Intercept network requests in JavaScript tests with MSW. Mock REST and GraphQL APIs for development, unit tests, and integration tests without code changes."
  keywords:
    - testing
    - javascript
    - msw
    - mocking
    - http
    - graphql
    - recipe


---

## Overview

Mock Service Worker (MSW) intercepts network requests at the Service Worker level in browsers and at the `fetch`/`http` level in Node.js. Instead of patching modules or starting a mock server, MSW declares request handlers that return mock responses. The same handlers work in development, tests, and Storybook.

## When to Use

- Mocking API responses during frontend development without a backend
- Testing components that fetch data with `fetch`, `axios`, or `@tanstack/react-query`
- Testing GraphQL queries and mutations without a running GraphQL server
- Sharing mocks between Storybook, unit tests, and integration tests
- Developing frontend features before the backend API is ready

## When NOT to Use

- Testing your own backend API — use `supertest` or `WebTestClient`
- Testing real network behavior — MSW intercepts before the network layer
- Load testing — MSW adds interception overhead
- Testing WebSocket connections — MSW 2.x supports it, but it's less mature than HTTP mocking

## Solution

### Setup

```bash
npm install -D msw
```

### Basic REST handlers

```typescript
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://api.example.com/users/:id", ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      name: "Alice",
      email: "alice@example.com",
    });
  }),

  http.post("https://api.example.com/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: 42, ...body },
      { status: 201 },
    );
  }),

  http.get("https://api.example.com/users", ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "1";
    return HttpResponse.json({
      data: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }],
      page: Number(page),
      total: 2,
    });
  }),
];
```

### Using MSW in Node.js tests (Vitest)

```typescript
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, it, expect } from "vitest";
import { handlers } from "./handlers";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("User API", () => {
  it("fetches a user by ID", async () => {
    const response = await fetch("https://api.example.com/users/1");
    const user = await response.json();

    expect(user.id).toBe(1);
    expect(user.name).toBe("Alice");
  });

  it("creates a user", async () => {
    const response = await fetch("https://api.example.com/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Charlie", email: "charlie@example.com" }),
    });

    expect(response.status).toBe(201);
    const user = await response.json();
    expect(user.id).toBe(42);
    expect(user.name).toBe("Charlie");
  });
});
```

### GraphQL handlers

```typescript
import { graphql, HttpResponse } from "msw";

export const graphqlHandlers = [
  graphql.query("GetUser", ({ variables }) => {
    return HttpResponse.json({
      data: {
        user: {
          id: variables.id,
          name: "Alice",
          email: "alice@example.com",
        },
      },
    });
  }),

  graphql.mutation("CreateUser", ({ variables }) => {
    return HttpResponse.json({
      data: {
        createUser: {
          id: 99,
          ...variables.input,
        },
      },
    });
  }),
];
```

### Simulating errors

```typescript
http.get("https://api.example.com/users/1", () => {
  return HttpResponse.json(
    { error: "Not found" },
    { status: 404 },
  );
});

http.get("https://api.example.com/server-error", () => {
  return HttpResponse.json(
    { error: "Internal Server Error" },
    { status: 500 },
  );
});
```

### Simulating network errors

```typescript
import { http, HttpResponse, delay } from "msw";

http.get("https://api.example.com/slow", async () => {
  await delay(5000);
  return HttpResponse.json({ data: "delayed" });
});

http.get("https://api.example.com/network-error", () => {
  return HttpResponse.error();
});
```

### Overriding handlers per test

```typescript
it("handles 500 error", async () => {
  server.use(
    http.get("https://api.example.com/users/1", () => {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    }),
  );

  const response = await fetch("https://api.example.com/users/1");
  expect(response.status).toBe(500);
});
```

### Using MSW in the browser (development)

```typescript
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const worker = setupWorker(...handlers);

await worker.start({
  onUnhandledRequest: "bypass",
});

console.log("MSW worker started");
```

Generate the service worker file:

```bash
npx msw init public/ --save
```

### Verifying requests

```typescript
import { http, HttpResponse } from "msw";

let lastRequestBody: unknown;

export const captureHandler = http.post(
  "https://api.example.com/orders",
  async ({ request }) => {
    lastRequestBody = await request.json();
    return HttpResponse.json({ id: 1 }, { status: 201 });
  },
);

// In test
it("sends correct order payload", async () => {
  await submitOrder({ productId: 10, quantity: 3 });
  expect(lastRequestBody).toEqual({ productId: 10, quantity: 3 });
});
```

## Variants

### Using MSW with React Testing Library

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { UserProfile } from "./UserProfile";

it("displays user data from API", async () => {
  server.use(
    http.get("/api/users/1", () => {
      return HttpResponse.json({ name: "Alice", email: "alice@example.com" });
    }),
  );

  render(<UserProfile userId={1} />);

  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
```

### Using MSW with Storybook

```typescript
// .storybook/preview.tsx
import { setupWorker } from "msw/browser";
import { handlers } from "../src/mocks/handlers";

const worker = setupWorker(...handlers);
await worker.start();

export const parameters = {
  msw: { handlers },
};
```

## Best Practices


- For a deeper guide, see [Stub External HTTP Services with WireMock](/recipes/java-wiremock-stub-external/).

- Share handlers between tests, Storybook, and development — one source of truth for mock data
- Use `server.resetHandlers()` in `afterEach` to clear per-test overrides
- Set `onUnhandledRequest: "error"` in tests to catch unmocked requests
- Use `delay()` to test loading states and timeout handling
- Keep handlers in a separate `handlers.ts` file for reusability
- Use `server.use()` for one-off overrides instead of modifying shared handlers

## Common Mistakes

- **Not calling `server.listen()` in `beforeAll`**: MSW won't intercept requests until the server starts.
- **Not resetting handlers**: per-test overrides leak into subsequent tests. Always call `resetHandlers()`.
- **Mocking relative URLs in Node.js tests**: use absolute URLs or configure a base URL. MSW in Node.js needs full URLs.
- **Forgetting `await` in async handlers**: `HttpResponse.json()` is synchronous, but reading the request body with `request.json()` is async.
- **Not closing the server**: call `server.close()` in `afterAll` to prevent the process from hanging.

## FAQ

### How do I mock file uploads?

```typescript
http.post("/api/upload", ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  return HttpResponse.json({ filename: file.name, size: file.size });
});
```

### Can I use MSW with axios?

Yes. MSW intercepts at the `fetch` and `http` level, which axios uses internally. No configuration needed.

### How do I mock paginated responses?

```typescript
http.get("/api/users", ({ request }) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const allUsers = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
  const perPage = 10;
  const start = (page - 1) * perPage;

  return HttpResponse.json({
    data: allUsers.slice(start, start + perPage),
    page,
    total: 50,
  });
});
```

### Does MSW work with WebSocket?

MSW 2.x supports WebSocket mocking via `ws` handler:

```typescript
import { ws } from "msw";

const chat = ws.link("wss://api.example.com/chat");

export const handlers = [
  chat.addEventListener("connection", ({ client }) => {
    client.send("Welcome!");
  }),
];
```

### How do I debug unmocked requests?

Set `onUnhandledRequest: "warn"` to see warnings in the console, or `"error"` to fail tests on unmocked requests. Check the console output for the full URL and method.
