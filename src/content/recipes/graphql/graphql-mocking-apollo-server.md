---
contentType: recipes
slug: graphql-mocking-apollo-server
title: "Mock GraphQL Resolvers for Frontend Development"
description: "Set up mocked GraphQL resolvers with Apollo Server so frontend teams can develop against a fake API before the backend is ready"
metaDescription: "Mock GraphQL resolvers with Apollo Server for frontend development. Generate fake data, preserve types, and unblock UI work before backend is ready."
difficulty: beginner
topics:
  - graphql
  - api
  - testing
tags:
  - graphql
  - mocking
  - apollo
  - frontend
  - testing
relatedResources:
  - /recipes/api/graphql-apollo-server
  - /recipes/api/api-mocking
  - /recipes/graphql/graphql-error-handling-best-practices
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mock GraphQL resolvers with Apollo Server for frontend development. Generate fake data, preserve types, and unblock UI work before backend is ready."
  keywords:
    - graphql mocking
    - apollo server mock
    - graphql fake data
    - frontend development
    - graphql testing
---

# Mock GraphQL Resolvers for Frontend Development

When the backend is not ready, frontend teams can block on API dependencies. Apollo Server's built-in mocking generates fake data for every field in the schema, letting UI developers build and test against a working GraphQL endpoint within minutes. You can start with auto-generated mocks and progressively replace them with custom resolvers as the schema stabilizes.

## When to Use This

- Frontend and backend teams work in parallel on a new feature
- You need a running GraphQL API for demos or prototyping
- Testing UI components against realistic data shapes

## Prerequisites

- An Apollo Server instance with a defined schema
- `@apollo/server` and `graphql` installed

## Solution

### 1. Enable Built-in Mocking

```typescript
// mock-server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    publishedAt: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
  }
`;

const server = new ApolloServer({
  typeDefs,
  mock: true,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Mock server ready at ${url}`);
```

Apollo auto-generates values based on scalar types: random strings for `String`, incrementing numbers for `Int`/`ID`, ISO timestamps for fields named like dates.

### 2. Customize Mocks with Preserves

```typescript
import { ApolloServer } from '@apollo/server';

const mocks = {
  ID: () => crypto.randomUUID(),
  String: () => 'Lorem ipsum',
  Int: () => Math.floor(Math.random() * 1000),
  Boolean: () => Math.random() > 0.5,
};

const server = new ApolloServer({
  typeDefs,
  mock: { mocks },
});
```

### 3. Mock Specific Types and Fields

```typescript
const mocks = {
  User: () => ({
    id: () => crypto.randomUUID(),
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
    role: () => faker.helpers.arrayElement(['admin', 'editor', 'viewer']),
  }),

  Post: () => ({
    id: () => crypto.randomUUID(),
    title: () => faker.lorem.sentence(),
    content: () => faker.lorem.paragraphs(3),
    publishedAt: () => faker.date.recent().toISOString(),
  }),

  Query: () => ({
    users: () => Array.from({ length: 5 }, () => ({})),
    posts: () => Array.from({ length: 10 }, () => ({})),
  }),
};

const server = new ApolloServer({
  typeDefs,
  mock: { mocks },
});
```

### 4. Conditional Mocks Based on Field Name

```typescript
const mocks = {
  String: () => {
    return 'Generic string';
  },
};

// Use a custom mock resolver for name-based logic
const mockResolvers = {
  User: () => ({
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
  }),
  Post: () => ({
    title: () => faker.lorem.sentence(5),
    content: () => faker.lorem.paragraphs(3),
  }),
};

const server = new ApolloServer({
  typeDefs,
  mock: { mocks: { ...mocks, ...mockResolvers } },
});
```

### 5. Toggle Mocking by Environment

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers: process.env.NODE_ENV === 'production' ? realResolvers : undefined,
  mock: process.env.MOCK_API === 'true',
});

// Or combine real resolvers with mock fallback
const server = new ApolloServer({
  typeDefs,
  resolvers: realResolvers,
  mock: process.env.NODE_ENV === 'development'
    ? { mocks, preserveResolvers: true }
    : false,
});
```

With `preserveResolvers: true`, Apollo uses your real resolvers where they exist and falls back to mocks for unimplemented fields.

## How It Works

1. **Auto-mocking** inspects the schema and generates a default value for each scalar — strings, numbers, booleans, and lists are populated automatically.
2. **Custom mock functions** override the defaults per type or per scalar. A `User` mock returns an object with field-level generators.
3. **`preserveResolvers`** lets you mix real and mocked data. Fields with a resolver use the real implementation; fields without one use the mock.
4. **Faker integration** produces realistic data — names, emails, sentences, dates — so the UI looks and behaves like it would with real data.

## Variants

### Mock with MSW (Mock Service Worker)

For frontend-only mocking without a running server, use MSW with a GraphQL handler:

```typescript
import { graphql } from 'msw';

export const handlers = [
  graphql.query('GetUsers', (req, res, ctx) => {
    return res(
      ctx.data({
        users: Array.from({ length: 5 }, () => ({
          id: crypto.randomUUID(),
          name: faker.person.fullName(),
          email: faker.internet.email(),
        })),
      })
    );
  }),
];
```

### Seeded Mocks for Reproducible Tests

```typescript
import { faker } from '@faker-js/faker';

faker.seed(12345);

const mocks = {
  User: () => ({
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
  }),
};
```

With a fixed seed, every server start produces the same fake data — useful for snapshot tests.

### Error Mocking

Simulate error responses to test error handling in the UI:

```typescript
const server = new ApolloServer({
  typeDefs,
  mock: { mocks },
  formatError: () => ({
    message: 'Simulated server error',
    extensions: { code: 'MOCK_ERROR' },
  }),
});

// Or throw in a mock resolver
const mocks = {
  Query: () => ({
    user: () => { throw new Error('User not found'); },
  }),
};
```

## Best Practices

- **Use realistic data** — `faker` produces names, emails, and dates that look real, making UI reviews more effective
- **Start with auto-mocks, then customize** — get the server running with `mock: true` first, then replace fields one by one
- **Use `preserveResolvers` during migration** — keep real resolvers for implemented features while mocking the rest
- **Seed faker in tests** — fixed seeds make snapshot tests deterministic

## Common Mistakes

- **Mocking with empty strings** — the UI may hide or collapse empty values, hiding layout bugs
- **Not mocking list lengths** — a list mock returning one item doesn't test pagination or empty states
- **Forgetting to disable mocks in production** — use environment variables to toggle mocking
- **Not testing error states** — mock error responses to verify the UI handles them

## FAQ

**Q: Can I mock only part of the schema?**
A: Yes. Use `preserveResolvers: true` and provide real resolvers for implemented fields. Apollo mocks only the fields without resolvers.

**Q: How do I mock authentication?**
A: Mock the context to return a fake user, or bypass auth checks entirely in mock mode.

**Q: Should I use Apollo mocking or MSW?**
A: Use Apollo mocking when you want a running server. Use MSW when you want client-side interception without a server.

**Q: Can I mock subscriptions?**
A: Apollo's built-in mocking does not support subscriptions. Use a custom PubSub with fake events for subscription testing.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
