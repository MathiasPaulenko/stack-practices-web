---
contentType: guides
slug: complete-guide-graphql-testing
title: "Complete Guide to GraphQL Testing"
description: "Test GraphQL APIs at every layer: unit tests for resolvers, integration tests for schema, E2E tests for operations. Covers mocking, fixtures, snapshot testing, and performance testing."
metaDescription: "Test GraphQL at every layer: unit tests for resolvers, integration tests for schema, E2E for operations. Covers mocking, fixtures, snapshots, and performance testing."
difficulty: advanced
topics:
  - graphql
  - testing
  - api
tags:
  - graphql
  - testing
  - guide
  - unit-testing
  - integration-testing
  - e2e-testing
  - resolver-testing
  - snapshot-testing
relatedResources:
  - /guides/api/complete-guide-graphql-schema-design
  - /guides/api/complete-guide-graphql-security
  - /guides/api/complete-guide-graphql-caching
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Test GraphQL at every layer: unit tests for resolvers, integration tests for schema, E2E for operations. Covers mocking, fixtures, snapshots, and performance testing."
  keywords:
    - graphql testing
    - graphql resolver testing
    - graphql integration testing
    - graphql e2e testing
    - graphql mocking
    - graphql snapshot testing
    - graphql performance testing
---

## Introduction

Testing GraphQL APIs requires a different approach than testing REST APIs. GraphQL has a single endpoint, arbitrary queries, and resolver functions that can be tested in isolation. This guide covers the testing pyramid for GraphQL: unit tests for resolvers, integration tests for the schema, and end-to-end tests for operations. Each layer catches different bugs at different costs.

## Testing Pyramid for GraphQL

```text
        E2E Tests (few)
       Integration Tests (some)
      Unit Tests (many)
```

- **Unit tests**: Test individual resolver functions in isolation. Fast, cheap, catch logic bugs.
- **Integration tests**: Test the schema with real or mocked data sources. Medium speed, catch wiring bugs.
- **E2E tests**: Test the full stack from client to database. Slow, expensive, catch integration bugs.

## Unit Testing Resolvers

Resolvers are pure functions: `(parent, args, context, info) => result`. This makes them easy to unit test. You provide inputs and assert outputs.

### Basic Resolver Test

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

### Testing Mutations

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

### Testing with DataLoader

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
    expect(batchFn).toHaveBeenCalledTimes(1); // Batched into one call
  });
});
```

## Integration Testing the Schema

Integration tests execute real GraphQL operations against the schema with mocked or test databases. This catches wiring bugs that unit tests miss.

### Using Apollo Server with Test Database

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

### Using graphql-tools for Schema Testing

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

Snapshot tests capture the shape of a GraphQL response and fail when it changes. Useful for detecting unintended schema changes.

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

### Schema Snapshot

Snapshot the introspection query to detect schema changes in CI.

```javascript
import { introspectionFromSchema } from "graphql";

it("schema matches snapshot", () => {
  const introspection = introspectionFromSchema(schema);
  expect(introspection).toMatchSnapshot();
});
```

## E2E Testing

E2E tests hit the real server with a real database. They verify the full stack works end-to-end.

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

## Mocking Strategies

### Mocking Data Sources

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

### Mocking External APIs

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

### Query Complexity Testing

Test that expensive queries are rejected by cost analysis.

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

### Depth Limit Testing

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

## Test Organization

### File Structure

```
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

### Running Tests

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

## Production Checklist

- [ ] Unit tests for all resolvers (queries, mutations, field resolvers)
- [ ] Integration tests for schema execution
- [ ] E2E tests for critical user flows
- [ ] Mock data sources in unit and integration tests
- [ ] Test database for E2E tests (not production database)
- [ ] Snapshot tests for schema introspection
- [ ] Cost analysis tests (expensive queries rejected)
- [ ] Depth limit tests (deeply nested queries rejected)
- [ ] Auth tests (unauthenticated users rejected)
- [ ] Error handling tests (expected errors in payload, unexpected errors in errors array)
- [ ] CI pipeline runs all test suites
- [ ] Test coverage measured and reported

## FAQ

### Should I test resolvers or test the full schema?

Both. Unit tests for resolvers are fast and catch logic bugs. Integration tests for the schema catch wiring bugs (wrong field name, missing resolver). E2E tests catch integration bugs. Use all three layers.

### How do I test authentication in resolvers?

Pass a mock user in the context. For authenticated tests, pass `{ user: { id: "1", role: "ADMIN" } }`. For unauthenticated tests, pass `{ user: null }`. Assert that unauthenticated requests throw or return errors.

### Should I use a real database for integration tests?

Use a test database (separate from production) for integration tests. For unit tests, mock the database. Using a real database for integration tests catches ORM and query bugs that mocking misses.

### How do I test DataLoader batching?

Call the resolver multiple times with the same key in the same tick. Assert that the batch function was called once. DataLoader batches calls within a single event loop tick.

### What should I snapshot?

Snapshot the introspection query result to detect schema changes. Snapshot specific query responses to detect response shape changes. Do not snapshot large responses: they become hard to review and maintain.

### How do I test GraphQL subscriptions?

Use a WebSocket client in your test. Connect to the subscription endpoint, send the subscription query, trigger the event that should publish the subscription, and assert the client receives the message.

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

  // Trigger a new post via mutation
  createPostViaMutation();
});
```
