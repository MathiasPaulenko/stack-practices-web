---
contentType: recipes
slug: graphql-mocking-apollo-server
title: "Mock GraphQL Resolvers for Frontend Development"
description: "Set up mocked GraphQL resolvers with Apollo Server so frontend teams can develop against a fake API before the backend is ready."
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
  - resolvers
relatedResources:
  - /recipes/graphql-apollo-server
  - /recipes/api-mocking
  - /recipes/graphql-error-handling-best-practices
  - /guides/complete-guide-graphql-testing
  - /guides/complete-guide-graphql-federation-production
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-08-22"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Mock GraphQL resolvers with Apollo Server for frontend development. Generate fake data, preserve types, and unblock UI work before backend is ready."
  keywords:
    - graphql mocking
    - apollo server mock
    - graphql fake data
    - frontend development
    - graphql testing
---

When the backend isn't ready, frontend teams can end up blocked waiting for API contracts. Apollo
Server's built-in mocking fills that gap by generating fake data for every field in the schema. UI
developers get a working GraphQL endpoint in minutes, can build against it, and gradually replace
auto-mocks with custom resolvers as the schema stabilizes.

## When to Use

Reach for Apollo mocking when frontend and backend are being built in parallel, when you need a
running GraphQL endpoint for a demo or prototype, or when you want to test UI components against
realistic data shapes. It's also useful for simulating error states before the real service is
available.

## When NOT to Use

Don't use it when the backend is already available and you need real end-to-end contract validation;
that calls for [Integration Testing](/recipes/integration-testing/). If you want to mock HTTP at the
browser level without a server, [MSW](/recipes/api-mocking/) is a better fit. And if the schema is
still changing rapidly, mocks can hide breaking schema changes.

## Solution

### Enable built-in mocking

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
  mocks: true,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Mock server ready at ${url}`);
```

Apollo auto-generates values based on scalar types: random strings for `String`, incrementing
numbers for `Int` and `ID`, and ISO timestamps for fields named like dates.

### Customize mocks with scalars

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
  mocks,
});
```

### Mock specific types and fields

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
  mocks,
});
```

### Toggle mocking by environment

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers: process.env.NODE_ENV === 'production' ? realResolvers : undefined,
  mocks: process.env.MOCK_API === 'true',
});

// Or combine real resolvers with mock fallback
const server = new ApolloServer({
  typeDefs,
  resolvers: realResolvers,
  mocks: process.env.NODE_ENV === 'development'
    ? { mocks, preserveResolvers: true }
    : false,
});
```

With `preserveResolvers: true`, Apollo uses your real resolvers where they exist and falls back to
mocks for unimplemented fields.

## Explanation

Apollo's auto-mocking inspects the schema and generates a default value for each scalar, so strings,
numbers, booleans, and lists are populated automatically. You can override those defaults with
custom
mock functions per type or per scalar. A `User` mock returns an object with field-level generators
for each field you care about.

The `preserveResolvers` option lets you mix real and mocked data. Fields that have a resolver keep
their real implementation; fields without one fall back to the mock. That makes it possible to build
a backend incrementally without breaking the frontend.

Faker integration produces realistic names, emails, sentences, and dates, so the UI looks and
behaves
as if it were connected to real data.

## Variants

### Custom scalars and enums

When your schema uses custom scalars or enums, provide mock functions for them explicitly:

```typescript
import { ApolloServer } from '@apollo/server';

const typeDefs = gql`
  enum Role {
    ADMIN
    EDITOR
    VIEWER
  }

  scalar Date

  type User {
    id: ID!
    name: String!
    role: Role!
    createdAt: Date!
  }
`;

const mocks = {
  Date: () => new Date().toISOString(),
  Role: () => faker.helpers.arrayElement(['ADMIN', 'EDITOR', 'VIEWER']),
  User: () => ({
    name: () => faker.person.fullName(),
    role: () => faker.helpers.arrayElement(['ADMIN', 'EDITOR', 'VIEWER']),
    createdAt: () => faker.date.past().toISOString(),
  }),
};

const server = new ApolloServer({
  typeDefs,
  mocks,
});
```

Without custom scalar mocks, Apollo returns `null` for those fields, which can break the frontend if
it expects a valid value.

### Pagination with Relay connections

For schemas using Relay-style cursor pagination, mock the connection structure:

```typescript
const mocks = {
  Query: () => ({
    users: () => {
      const edges = Array.from({ length: 10 }, (_, i) => ({
        node: {
          id: `user-${i}`,
          name: faker.person.fullName(),
          email: faker.internet.email(),
        },
        cursor: `cursor-${i}`,
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor-0',
          endCursor: 'cursor-9',
        },
        totalCount: 100,
      };
    },
  }),
};
```

This lets the frontend test infinite scroll, load-more buttons, and cursor-based navigation without
a real backend.

### Mock with MSW

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

### Seeded mocks for reproducible tests

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

### Error mocking

Simulate error responses to test error handling in the UI:

```typescript
const mocks = {
  Query: () => ({
    user: () => { throw new Error('User not found'); },
  }),
};

const server = new ApolloServer({
  typeDefs,
  mocks,
});
```

## Best Practices

- Use realistic data from `faker` so UI reviews catch layout and behavior issues.
- Start with auto-mocks, then customize fields one by one as the schema stabilizes.
- Use `preserveResolvers` during migration to keep real resolvers for the parts already built while
  mocking the rest.
- Seed `faker` in tests so snapshot output stays deterministic.
- Mock list lengths that match real-world cases — one item isn't enough to test pagination or empty
  states.

## Common Mistakes

- **Mocking with empty strings**. The UI may hide or collapse empty values, hiding layout bugs.
- **Not mocking list lengths**. A list mock returning one item doesn't test pagination or empty
    states.
- **Forgetting to disable mocks in production**. Use environment variables to toggle mocking.
- **Not testing error states**. Mock error responses to verify the UI handles them.
- **Letting mocks drift from real resolvers**. Keep mock shapes aligned with the production schema.

## FAQ

### Can I mock only part of the schema?

Yes. Use `preserveResolvers: true` and provide real resolvers for implemented fields. Apollo mocks
only the fields without resolvers.

### How do I mock authentication?

Mock the context to return a fake user, or bypass auth checks entirely in mock mode.

### Should I use Apollo mocking or MSW?

Use Apollo mocking when you want a running server. Use MSW when you want client-side interception
without a server.

### Can I mock subscriptions?

Apollo's built-in mocking doesn't support subscriptions. Use a custom PubSub with fake events for
subscription testing.

### How do I mock custom scalars and enums?

Provide mock functions for each custom scalar and enum in the `mocks` object. For example,
`Date: () => new Date().toISOString()` and `Role: () => faker.helpers.arrayElement(['ADMIN',
'EDITOR', 'VIEWER'])`. Without these, Apollo returns `null` for custom scalar fields.

### How do I share mocks between tests and the dev server?

Export the `mocks` object from a shared module and import it in both your test setup and your dev
server configuration. That keeps fake data consistent across environments. Use `faker.seed()` in
tests for deterministic output.
