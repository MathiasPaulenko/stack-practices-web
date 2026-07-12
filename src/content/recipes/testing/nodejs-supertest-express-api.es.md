---


contentType: recipes
slug: nodejs-supertest-express-api
title: "Testear APIs Express con supertest"
description: "Cómo testear endpoints REST de Express.js end-to-end usando supertest, incluyendo códigos de estado, bodies JSON, headers, autenticación y manejo de errores."
metaDescription: "Testea endpoints REST de Express.js end-to-end con supertest. Verifica códigos de estado, bodies JSON, headers, auth y respuestas de error en tests Node.js."
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
  - /recipes/javascript-vitest-snapshot-testing
  - /recipes/javascript-msw-mock-service-worker
  - /recipes/integration-testing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Testea endpoints REST de Express.js end-to-end con supertest. Verifica códigos de estado, bodies JSON, headers, auth y respuestas de error en tests Node.js."
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

Supertest es una librería de Node.js para testear servidores HTTP. Envuelve el cliente HTTP `superagent` y te permite hacer peticiones contra tu app Express sin arrancar un servidor real. Las peticiones pasan por el stack de routing, middleware y handlers de Express — haciendo un test end-to-end de tu capa de API.

## When to Use

- Testear route handlers, middleware y error handlers de Express juntos
- Verificar códigos de estado HTTP, bodies de respuesta y headers de endpoints de API
- Testear flujos de autenticación y autorización (JWT, session, API keys)
- Validar request validation (body, params, query) y formato de respuesta de error
- Testear rate limiting y content negotiation de la API

## When NOT to Use

- Unit testing de funciones individuales — usa `vitest` o `jest` directamente
- Testear componentes frontend — usa `@testing-library/react` o `@testing-library/vue`
- Load testing — usa `k6` o `artillery` en su lugar
- Testear APIs externas — usa `nock` o `msw` para mockearlas

## Solution

### Setup

```bash
npm install -D supertest vitest
```

### Test básico de API

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

### Testear POST con JSON body

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

### Testear autenticación

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

### Testear query parameters y paginación

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

### Testear middleware de manejo de errores

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

### Testear con cookies y sesiones

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

### Usar `supertest` con Fastify

```typescript
import Fastify from "fastify";

const fastify = Fastify();
fastify.get("/api/health", async () => ({ status: "healthy" }));

await fastify.ready();
const response = await request(fastify.server).get("/api/health");
```

### Testear file uploads

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


- For a deeper guide, see [Java Testcontainers Integration Tests](/es/recipes/java-testcontainers-integration/).

- Exporta el objeto `app` de Express desde tu archivo de servidor — impórtalo en tests sin arrancar el servidor
- Usa `request.agent(app)` para persistir cookies a través de múltiples peticiones en un test
- Testea tanto paths de éxito como de error — 400, 401, 403, 404, 409, 500
- Setea `Content-Type` explícitamente cuando envíes bodies JSON
- Usa `.expect(status)` como shorthand en lugar de aserciones manuales
- Resetea el estado de la base de datos entre tests — usa una transacción o truncate en `beforeEach`

## Common Mistakes

- **Arrancar un servidor real**: `app.listen()` en el archivo de test causa conflictos de puertos. Importa el objeto `app` directamente.
- **No setear el middleware `express.json()`**: los bodies POST llegan como objetos vacíos sin el parser JSON.
- **Olvidar `await` en la petición**: supertest retorna una promesa. Sin `await`, el test termina antes de que llegue la respuesta.
- **Testear con una base de datos real**: usa mocks o una base de datos de test. Datos de producción causan tests flaky.
- **No testear respuestas de error**: testear solo el happy path misses bugs de validación y error handling.

## FAQ

### ¿Cómo testeo endpoints WebSocket con supertest?

Supertest solo soporta HTTP. Para testing de WebSocket, usa `ws` con un test client o `socket.io-client` en tus tests.

### ¿Puedo usar supertest con TypeScript?

Sí. Instala `@types/supertest` para definiciones de tipos. La API es idéntica.

### ¿Cómo testeo rate limiting?

Haz múltiples peticiones rápidas y verifica cuándo la API retorna 429:

```typescript
it("returns 429 after rate limit", async () => {
  for (let i = 0; i < 100; i++) {
    const response = await request(app).get("/api/limited");
    if (i >= 50) expect(response.status).toBe(429);
  }
});
```

### ¿Debería mockear la base de datos en tests de supertest?

Depende. Para tests de API a nivel unit, mockea la capa de datos. Para tests de integración, usa una base de datos de test real (SQLite in-memory, Testcontainers, o un schema de test dedicado).

### ¿Cómo testeo headers CORS?

```typescript
const response = await request(app)
  .options("/api/data")
  .set("Origin", "https://example.com");

expect(response.headers["access-control-allow-origin"]).toBe("https://example.com");
```
