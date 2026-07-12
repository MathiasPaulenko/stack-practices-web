---






contentType: guides
slug: complete-guide-graphql-testing
title: "Referencia Detallada de Testing GraphQL"
description: "Testear APIs GraphQL en cada capa: unit tests para resolvers, integration tests para esquemas, E2E para operaciones. Cubre mocking, fixtures, snapshot testing y performance testing."
metaDescription: "Testear GraphQL en cada capa: unit tests para resolvers, integration tests para esquema, E2E para operaciones. Cubre mocking, fixtures, snapshots y performance testing."
difficulty: advanced
topics:
  - graphql
  - testing
  - api
tags:
  - graphql
  - testing
  - guia
  - unit-testing
  - integration-testing
  - e2e-testing
  - resolver-testing
  - snapshot-testing
relatedResources:
  - /guides/complete-guide-graphql-schema-design
  - /guides/complete-guide-graphql-security
  - /guides/complete-guide-graphql-caching
  - /guides/complete-guide-junit5-modern-testing
  - /recipes/graphql-mocking-apollo-server
  - /guides/complete-guide-graphql-federation-production
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Testear GraphQL en cada capa: unit tests para resolvers, integration tests para esquema, E2E para operaciones. Cubre mocking, fixtures, snapshots y performance testing."
  keywords:
    - graphql testing
    - graphql resolver testing
    - graphql integration testing
    - graphql e2e testing
    - graphql mocking
    - graphql snapshot testing
    - graphql performance testing






---

## Introducción

Testear APIs GraphQL requiere un enfoque diferente a testear APIs REST. GraphQL tiene un solo endpoint, queries arbitrarias, y funciones resolver que pueden testearse en aislamiento. Aqui se presenta una guia sobre la piramide de testing para GraphQL: unit tests para resolvers, integration tests para el esquema, y end-to-end tests para operaciones. Cada capa captura diferentes bugs a diferentes costos.

## Pirámide de Testing para GraphQL

```text
        E2E Tests (pocos)
       Integration Tests (algunos)
      Unit Tests (muchos)
```

- **Unit tests**: Testean funciones resolver individuales en aislamiento. Rapidos, baratos, capturan bugs de logica.
- **Integration tests**: Testean el esquema con data sources reales o mockeados. Velocidad media, capturan bugs de wiring.
- **E2E tests**: Testean el stack completo de cliente a base de datos. Lentos, caros, capturan bugs de integracion.

## Unit Testing de Resolvers

Los resolvers son funciones puras: `(parent, args, context, info) => result`. Esto los hace faciles de unit testear. Provees inputs y afirmas outputs.

### Test Básico de Resolver

```javascript
import { describe, it, expect, vi } from "vitest";

const resolvers = {
  Query: {
    user: async (_parent, { id }, ctx) => {
      return ctx.db.users.findById(id);
    },
  },
  User: {
    fullName: (user) => `${user.firstName} ${user.lastName}`,
    age: (user) => {
      const born = new Date(user.birthDate);
      const now = new Date();
      return Math.floor((now - born) / (365.25 * 24 * 60 * 60 * 1000));
    },
  },
};

describe("User resolvers", () => {
  describe("Query.user", () => {
    it("returns user by id", async () => {
      const mockDb = {
        users: { findById: vi.fn().mockResolvedValue({ id: "1", firstName: "Alice", lastName: "Smith" }) },
      };
      const result = await resolvers.Query.user(null, { id: "1" }, { db: mockDb });
      expect(result).toEqual({ id: "1", firstName: "Alice", lastName: "Smith" });
      expect(mockDb.users.findById).toHaveBeenCalledWith("1");
    });

    it("returns null when user not found", async () => {
      const mockDb = {
        users: { findById: vi.fn().mockResolvedValue(null) },
      };
      const result = await resolvers.Query.user(null, { id: "999" }, { db: mockDb });
      expect(result).toBeNull();
    });
  });

  describe("User.fullName", () => {
    it("concatenates first and last name", () => {
      const result = resolvers.User.fullName({ firstName: "Alice", lastName: "Smith" });
      expect(result).toBe("Alice Smith");
    });
  });

  describe("User.age", () => {
    it("calculates age from birth date", () => {
      const user = { birthDate: "1990-01-01" };
      const result = resolvers.User.age(user);
      expect(result).toBeGreaterThan(30);
      expect(result).toBeLessThan(40);
    });
  });
});
```

### Testear Mutaciones

```javascript
describe("Mutation.createUser", () => {
  it("creates a user and returns it", async () => {
    const mockDb = {
      users: {
        create: vi.fn().mockResolvedValue({ id: "1", name: "Alice", email: "alice@example.com" }),
      },
    };
    const ctx = { db: mockDb, user: { id: "admin", role: "ADMIN" } };
    const result = await resolvers.Mutation.createUser(null, { input: { name: "Alice", email: "alice@example.com" } }, ctx);
    expect(result.user).toEqual({ id: "1", name: "Alice", email: "alice@example.com" });
    expect(result.errors).toEqual([]);
  });

  it("returns error when email already exists", async () => {
    const mockDb = {
      users: {
        findUnique: vi.fn().mockResolvedValue({ id: "2", email: "alice@example.com" }),
      },
    };
    const ctx = { db: mockDb, user: { id: "admin", role: "ADMIN" } };
    const result = await resolvers.Mutation.createUser(null, { input: { name: "Alice", email: "alice@example.com" } }, ctx);
    expect(result.user).toBeNull();
    expect(result.errors[0].field).toBe("email");
    expect(result.errors[0].code).toBe("CONFLICT");
  });

  it("throws when not authenticated", async () => {
    const ctx = { db: {}, user: null };
    await expect(
      resolvers.Mutation.createUser(null, { input: { name: "Alice", email: "alice@example.com" } }, ctx)
    ).rejects.toThrow("Not authenticated");
  });
});
```

### Testear con DataLoader

```javascript
import DataLoader from "dataloader";

describe("Product.category resolver with DataLoader", () => {
  it("batches category loads", async () => {
    const batchFn = vi.fn().mockResolvedValue([{ id: "1", name: "Electronics" }]);
    const categoryLoader = new DataLoader(batchFn);
    const ctx = { loaders: { categoryLoader } };

    const products = [{ categoryId: "1" }, { categoryId: "1" }, { categoryId: "1" }];
    const results = await Promise.all(
      products.map((p) => resolvers.Product.category(p, null, ctx))
    );

    expect(results).toHaveLength(3);
    expect(batchFn).toHaveBeenCalledTimes(1); // Batcheado en una llamada
  });
});
```

## Integration Testing del Esquema

Los integration tests ejecutan operaciones GraphQL reales contra el esquema con bases de datos mockeadas o de test. Esto captura bugs de wiring que los unit tests no capturan.

### Usando Apollo Server con Base de Datos de Test

```javascript
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestContext } from "./test-context";

const typeDefs = `
  type User { id: ID! name: String! email: String! }
  type Query { user(id: ID!): User users: [User!]! }
  type Mutation { createUser(input: CreateUserInput!): CreateUserPayload! }
  input CreateUserInput { name: String! email: String! }
  type CreateUserPayload { user: User errors: [String!]! }
`;

const resolvers = { /* ... */ };

let server, url;

beforeAll(async () => {
  server = new ApolloServer({ typeDefs, resolvers });
  const { url: serverUrl } = await startStandaloneServer(server, {
    context: async () => createTestContext(),
  });
  url = serverUrl;
});

afterAll(async () => {
  await server.stop();
});

async function execute(query, variables = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

describe("GraphQL integration", () => {
  it("creates and retrieves a user", async () => {
    const createResult = await execute(`
      mutation {
        createUser(input: { name: "Alice", email: "alice@example.com" }) {
          user { id name email }
          errors
        }
      }
    `);
    expect(createResult.data.createUser.user.name).toBe("Alice");
    expect(createResult.data.createUser.errors).toEqual([]);

    const userId = createResult.data.createUser.user.id;
    const getResult = await execute(`
      query GetUser($id: ID!) {
        user(id: $id) { id name email }
      }
    `, { id: userId });
    expect(getResult.data.user.name).toBe("Alice");
  });

  it("returns errors for invalid input", async () => {
    const result = await execute(`
      mutation {
        createUser(input: { name: "", email: "invalid" }) {
          user { id }
          errors
        }
      }
    `);
    expect(result.data.createUser.user).toBeNull();
    expect(result.data.createUser.errors).toHaveLength(2);
  });
});
```

### Usar graphql-tools para Testing de Esquema

```javascript
import { makeExecutableSchema } from "@graphql-tools/schema";
import { graphql } from "graphql";
import { describe, it, expect } from "vitest";

const schema = makeExecutableSchema({ typeDefs, resolvers });

describe("Schema execution", () => {
  it("resolves user query", async () => {
    const result = await graphql({
      schema,
      source: `query { user(id: "1") { id name email } }`,
      contextValue: createMockContext(),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data.user.id).toBe("1");
  });

  it("returns error for missing field", async () => {
    const result = await graphql({
      schema,
      source: `query { nonexistentField }`,
      contextValue: createMockContext(),
    });
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain("Cannot query field");
  });
});
```

## Snapshot Testing

Los snapshot tests capturan la forma de una respuesta GraphQL y fallan cuando cambia. Util para detectar cambios de esquema no intencionales.

```javascript
import { graphql } from "graphql";
import { describe, it, expect } from "vitest";

describe("Snapshot tests", () => {
  it("user query shape matches snapshot", async () => {
    const result = await graphql({
      schema,
      source: `query { user(id: "1") { id name email posts { id title } } }`,
      contextValue: createMockContext(),
    });
    expect(result.data).toMatchInlineSnapshot(`
      {
        "user": {
          "email": "alice@example.com",
          "id": "1",
          "name": "Alice",
          "posts": [
            {
              "id": "101",
              "title": "First Post"
            }
          ]
        }
      }
    `);
  });
});
```

### Snapshot de Esquema

Snapshotea la query de introspection para detectar cambios de esquema en CI.

```javascript
import { introspectionFromSchema } from "graphql";

it("schema matches snapshot", () => {
  const introspection = introspectionFromSchema(schema);
  expect(introspection).toMatchSnapshot();
});
```

## E2E Testing

Los E2E tests hittean el servidor real con una base de datos real. Verifican que el stack completo funciona end-to-end.

```javascript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupDatabase, teardownDatabase } from "./test-db";

const API_URL = "http://localhost:4000/graphql";

describe("GraphQL E2E", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  it("full user lifecycle: create, read, update, delete", async () => {
    // Create
    const createRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation($input: CreateUserInput!) {
          createUser(input: $input) { user { id name email } errors }
        }`,
        variables: { input: { name: "Bob", email: "bob@example.com" } },
      }),
    });
    const created = await createRes.json();
    const userId = created.data.createUser.user.id;
    expect(created.data.createUser.errors).toEqual([]);

    // Read
    const readRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($id: ID!) { user(id: $id) { id name email } }`,
        variables: { id: userId },
      }),
    });
    const read = await readRes.json();
    expect(read.data.user.name).toBe("Bob");

    // Update
    const updateRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation($input: UpdateUserInput!) {
          updateUser(input: $input) { user { id name } errors }
        }`,
        variables: { input: { id: userId, name: "Robert" } },
      }),
    });
    const updated = await updateRes.json();
    expect(updated.data.updateUser.user.name).toBe("Robert");

    // Delete
    const deleteRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation($input: DeleteUserInput!) {
          deleteUser(input: $input) { user { id } errors }
        }`,
        variables: { input: { id: userId } },
      }),
    });
    const deleted = await deleteRes.json();
    expect(deleted.data.deleteUser.errors).toEqual([]);
  });
});
```

## Estrategias de Mocking

### Mockear Data Sources

```javascript
function createMockContext() {
  return {
    db: {
      users: {
        findById: vi.fn().mockResolvedValue({ id: "1", name: "Alice", email: "alice@example.com" }),
        findMany: vi.fn().mockResolvedValue([
          { id: "1", name: "Alice", email: "alice@example.com" },
          { id: "2", name: "Bob", email: "bob@example.com" },
        ]),
        create: vi.fn().mockResolvedValue({ id: "3", name: "Charlie", email: "charlie@example.com" }),
      },
      posts: {
        findMany: vi.fn().mockResolvedValue([
          { id: "101", title: "First Post", authorId: "1" },
        ]),
      },
    },
    user: { id: "1", role: "ADMIN" },
    loaders: {
      postsLoader: new DataLoader(async (userIds) => {
        return userIds.map(() => [{ id: "101", title: "First Post", authorId: "1" }]);
      }),
    },
  };
}
```

### Mockear APIs Externas

```javascript
import { vi } from "vitest";

function createContextWithMockedApi() {
  return {
    api: {
      getWeather: vi.fn().mockResolvedValue({ temp: 22, condition: "sunny" }),
      getStockPrice: vi.fn().mockResolvedValue({ symbol: "AAPL", price: 150.50 }),
    },
  };
}

describe("Weather resolver", () => {
  it("fetches weather from external API", async () => {
    const ctx = createContextWithMockedApi();
    const result = await resolvers.Query.weather(null, { city: "Madrid" }, ctx);
    expect(result.temp).toBe(22);
    expect(ctx.api.getWeather).toHaveBeenCalledWith("Madrid");
  });
});
```

## Performance Testing

### Testing de Complejidad de Query

Testea que las queries costosas sean rechazadas por el analisis de costo.

```javascript
import costAnalysis from "graphql-cost-analysis";

describe("Cost analysis", () => {
  it("rejects expensive queries", async () => {
    const expensiveQuery = `
      query {
        users(first: 1000) {
          posts(first: 100) {
            comments(first: 100) {
              author { posts(first: 100) { title } }
            }
          }
        }
      }
    `;
    const result = await graphql({
      schema,
      source: expensiveQuery,
      contextValue: createMockContext(),
      validationRules: [costAnalysis({ maximumCost: 1000, variables: {} })],
    });
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain("exceeds maximum");
  });

  it("allows reasonable queries", async () => {
    const reasonableQuery = `
      query {
        users(first: 10) { id name }
      }
    `;
    const result = await graphql({
      schema,
      source: reasonableQuery,
      contextValue: createMockContext(),
      validationRules: [costAnalysis({ maximumCost: 1000, variables: {} })],
    });
    expect(result.errors).toBeUndefined();
  });
});
```

### Testing de Depth Limit

```javascript
import depthLimit from "graphql-depth-limit";

describe("Depth limiting", () => {
  it("rejects deeply nested queries", async () => {
    const deepQuery = `
      query {
        user(id: "1") {
          posts { author { posts { author { posts { author { name } } } } } }
        }
      }
    `;
    const result = await graphql({
      schema,
      source: deepQuery,
      contextValue: createMockContext(),
      validationRules: [depthLimit(5)],
    });
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain("depth");
  });
});
```

## Organización de Tests

### Estructura de Archivos

```text
tests/
├── unit/
│   ├── resolvers/
│   │   ├── user.resolver.test.ts
│   │   ├── post.resolver.test.ts
│   │   └── mutation.resolver.test.ts
│   └── loaders/
│       └── posts.loader.test.ts
├── integration/
│   ├── schema.test.ts
│   └── queries.test.ts
├── e2e/
│   └── lifecycle.test.ts
└── helpers/
    ├── mock-context.ts
    └── test-db.ts
```

### Ejecutar Tests

```json
{
  "scripts": {
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Checklist de Producción

- [ ] Unit tests para todos los resolvers (queries, mutaciones, field resolvers)
- [ ] Integration tests para ejecucion de esquema
- [ ] E2E tests para flujos criticos de usuario
- [ ] Mock data sources en unit e integration tests
- [ ] Base de datos de test para E2E tests (no base de datos de produccion)
- [ ] Snapshot tests para introspection de esquema
- [ ] Tests de cost analysis (queries costosas rechazadas)
- [ ] Tests de depth limit (queries profundamente anidadas rechazadas)
- [ ] Tests de auth (usuarios no autenticados rechazados)
- [ ] Tests de manejo de errores (errores esperados en payload, errores inesperados en array errors)
- [ ] Pipeline CI ejecuta todos los suites de tests
- [ ] Cobertura de tests medida y reportada

## Preguntas Frecuentes

### ¿Debería testear resolvers o el esquema completo?

Ambos. Los unit tests para resolvers son rapidos y capturan bugs de logica. Los integration tests del esquema capturan bugs de wiring (nombre de campo equivocado, resolver faltante). Los E2E tests capturan bugs de integracion. Usa las tres capas.

### ¿Cómo testeo autenticación en resolvers?

Pasa un usuario mock en el context. Para tests autenticados, pasa `{ user: { id: "1", role: "ADMIN" } }`. Para tests no autenticados, pasa `{ user: null }`. Afirma que las requests no autenticadas lanzan o retornan errores.

### ¿Debería usar una base de datos real para integration tests?

Usa una base de datos de test (separada de produccion) para integration tests. Para unit tests, mockea la base de datos. Usar una base de datos real para integration tests captura bugs de ORM y queries que el mocking no captura.

### ¿Cómo testeo el batching de DataLoader?

Llama al resolver multiples veces con la misma key en el mismo tick. Afirma que la batch function fue llamada una vez. DataLoader batchea llamadas dentro de un solo event loop tick.

### ¿Qué debería snapshoteear?

Snapshotea el resultado de la query de introspection para detectar cambios de esquema. Snapshotea respuestas de queries especificas para detectar cambios en la forma de la respuesta. No snapshotees respuestas grandes: se vuelven dificiles de revisar y mantener.

### ¿Cómo testeo suscripciones GraphQL?

Usa un cliente WebSocket en tu test. Conectate al endpoint de suscripcion, envia la query de suscripcion, triggera el evento que deberia publicar la suscripcion, y afirma que el cliente recibe el mensaje.

```javascript
import { WebSocket } from "ws";
import { SubscriptionClient } from "subscriptions-transport-ws";

it("receives subscription updates", (done) => {
  const client = new SubscriptionClient("ws://localhost:4000/graphql", {
    reconnect: true,
  }, WebSocket);

  client.request({
    query: `subscription { onNewPost { id title } }`,
  }).subscribe({
    next: (data) => {
      expect(data.data.onNewPost.title).toBeDefined();
      client.close();
      done();
    },
  });

  // Triggerar un nuevo post via mutacion
  createPostViaMutation();
});
```

## See Also

- [Mock GraphQL Resolvers for Frontend Development](/es/recipes/graphql-mocking-apollo-server/)
- [GraphQL Federation in Production](/es/guides/complete-guide-graphql-federation-production/)
- [Complete Guide to GraphQL Federation](/es/guides/complete-guide-graphql-federation/)
- [Complete Guide to GraphQL Schema Design](/es/guides/complete-guide-graphql-schema-design/)
- [Complete Guide to GraphQL Security](/es/guides/complete-guide-graphql-security/)

