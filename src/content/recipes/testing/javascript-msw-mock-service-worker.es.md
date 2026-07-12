---


contentType: recipes
slug: javascript-msw-mock-service-worker
title: "Mockear Peticiones de Red con MSW"
description: "Cómo usar Mock Service Worker (MSW) para interceptar peticiones de red en tests y desarrollo de JavaScript, incluyendo mocking de REST y GraphQL."
metaDescription: "Intercepta peticiones de red en tests de JavaScript con MSW. Mockea APIs REST y GraphQL para desarrollo, unit tests e integration tests sin cambiar código."
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
  metaDescription: "Intercepta peticiones de red en tests de JavaScript con MSW. Mockea APIs REST y GraphQL para desarrollo, unit tests e integration tests sin cambiar código."
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

Mock Service Worker (MSW) intercepta peticiones de red a nivel Service Worker en navegadores y a nivel `fetch`/`http` en Node.js. En lugar de patchear módulos o arrancar un mock server, MSW declara request handlers que devuelven respuestas mock. Los mismos handlers funcionan en desarrollo, tests y Storybook.

## When to Use

- Mockear respuestas de API durante desarrollo frontend sin un backend
- Testear componentes que fetchean datos con `fetch`, `axios` o `@tanstack/react-query`
- Testear queries y mutations de GraphQL sin un servidor GraphQL corriendo
- Compartir mocks entre Storybook, unit tests e integration tests
- Desarrollar features frontend antes de que la API del backend esté lista

## When NOT to Use

- Testear tu propia API backend — usa `supertest` o `WebTestClient`
- Testear comportamiento de red real — MSW intercepta antes de la capa de red
- Load testing — MSW añade overhead de intercepción
- Testear conexiones WebSocket — MSW 2.x lo soporta, pero es menos maduro que HTTP mocking

## Solution

### Setup

```bash
npm install -D msw
```

### Handlers REST básicos

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

### Usar MSW en tests de Node.js (Vitest)

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

### Handlers de GraphQL

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

### Simular errores

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

### Simular errores de red

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

### Override de handlers por test

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

### Usar MSW en el navegador (desarrollo)

```typescript
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const worker = setupWorker(...handlers);

await worker.start({
  onUnhandledRequest: "bypass",
});

console.log("MSW worker started");
```

Genera el archivo service worker:

```bash
npx msw init public/ --save
```

### Verificar peticiones

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

// En test
it("sends correct order payload", async () => {
  await submitOrder({ productId: 10, quantity: 3 });
  expect(lastRequestBody).toEqual({ productId: 10, quantity: 3 });
});
```

## Variants

### Usar MSW con React Testing Library

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

### Usar MSW con Storybook

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


- For a deeper guide, see [Stub External HTTP Services with WireMock](/es/recipes/java-wiremock-stub-external/).

- Comparte handlers entre tests, Storybook y desarrollo — una fuente de verdad para mock data
- Usa `server.resetHandlers()` en `afterEach` para limpiar overrides por test
- Setea `onUnhandledRequest: "error"` en tests para atrapar peticiones sin mockear
- Usa `delay()` para testear loading states y timeout handling
- Guarda handlers en un archivo `handlers.ts` separado para reusabilidad
- Usa `server.use()` para overrides one-off en lugar de modificar handlers compartidos

## Common Mistakes

- **No llamar `server.listen()` en `beforeAll`**: MSW no intercepta peticiones hasta que el servidor arranca.
- **No resetear handlers**: los overrides por test filtran a tests subsecuentes. Siempre llama `resetHandlers()`.
- **Mockear URLs relativas en tests de Node.js**: usa URLs absolutas o configura una base URL. MSW en Node.js necesita URLs completas.
- **Olvidar `await` en handlers async**: `HttpResponse.json()` es sincrónico, pero leer el request body con `request.json()` es async.
- **No cerrar el servidor**: llama `server.close()` en `afterAll` para evitar que el proceso se cuelgue.

## FAQ

### ¿Cómo mockeo file uploads?

```typescript
http.post("/api/upload", ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  return HttpResponse.json({ filename: file.name, size: file.size });
});
```

### ¿Puedo usar MSW con axios?

Sí. MSW intercepta a nivel `fetch` y `http`, que axios usa por debajo. Sin configuración adicional.

### ¿Cómo mockeo respuestas paginadas?

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

### ¿MSW funciona con WebSocket?

MSW 2.x soporta mocking de WebSocket via handler `ws`:

```typescript
import { ws } from "msw";

const chat = ws.link("wss://api.example.com/chat");

export const handlers = [
  chat.addEventListener("connection", ({ client }) => {
    client.send("Welcome!");
  }),
];
```

### ¿Cómo debuggeo peticiones sin mockear?

Setea `onUnhandledRequest: "warn"` para ver warnings en consola, o `"error"` para fallar tests en peticiones sin mockear. Revisa el output de consola para la URL completa y método.
