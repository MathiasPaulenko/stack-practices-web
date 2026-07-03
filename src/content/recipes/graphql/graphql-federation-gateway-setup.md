---
contentType: recipes
slug: graphql-federation-gateway-setup
title: "Set Up a GraphQL Federation Gateway with Apollo"
description: "Compose multiple GraphQL services into a single federated supergraph using Apollo Federation and a gateway that routes queries across subgraphs"
metaDescription: "Set up a GraphQL Federation gateway with Apollo. Compose multiple subgraphs into a supergraph, share entities, and route queries across services."
difficulty: advanced
topics:
  - graphql
  - api
  - architecture
tags:
  - graphql
  - federation
  - apollo
  - microservices
  - gateway
relatedResources:
  - /recipes/api/graphql-apollo-server
  - /recipes/graphql/graphql-subscriptions-realtime
  - /patterns/graphql/federated-identity-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Set up a GraphQL Federation gateway with Apollo. Compose multiple subgraphs into a supergraph, share entities, and route queries across services."
  keywords:
    - graphql federation
    - apollo gateway
    - supergraph
    - federated graphql
    - microservices graphql
---

# Set Up a GraphQL Federation Gateway with Apollo

Apollo Federation lets you split a monolithic GraphQL API into independently deployable subgraphs. A gateway composes the subgraphs into a single supergraph and routes each query to the right service. Entities like `User` or `Product` can be defined in one subgraph and extended in others, so teams own their domains without a shared schema file.

## When to Use This

- Multiple teams need to own different parts of a GraphQL API
- A monolithic GraphQL server has grown too large to maintain as one codebase
- You need independent deployment and scaling for different API domains

## Prerequisites

- Two or more GraphQL services running Apollo Server
- `@apollo/server`, `@apollo/subgraph`, and `@apollo/gateway` packages

## Solution

### 1. Install Dependencies

```bash
# In each subgraph
npm install @apollo/server @apollo/subgraph graphql

# In the gateway
npm install @apollo/server @apollo/gateway graphql
```

### 2. Define the Users Subgraph

```typescript
// users-service/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

const resolvers = {
  Query: {
    user: (_: unknown, { id }: { id: string }) =>
      users.find((u) => u.id === id),
    users: () => users,
  },

  User: {
    __resolveReference: (ref: { id: string }) =>
      users.find((u) => u.id === ref.id),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4001 } });
```

### 3. Define the Posts Subgraph

```typescript
// posts-service/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  type Post @key(fields: "id") {
    id: ID!
    title: String!
    content: String!
    authorId: ID!
    author: User @provides(fields: "name")
  }

  type User @key(fields: "id") @extends {
    id: ID! @external
    name: String! @external
    posts: [Post!]!
  }

  type Query {
    posts: [Post!]!
    post(id: ID!): Post
  }
`;

const posts = [
  { id: '101', title: 'Hello', content: 'World', authorId: '1' },
  { id: '102', title: 'Federation', content: 'Guide', authorId: '2' },
];

const resolvers = {
  Query: {
    posts: () => posts,
    post: (_: unknown, { id }: { id: string }) =>
      posts.find((p) => p.id === id),
  },

  Post: {
    author: (post: { authorId: string }) => ({ __typename: 'User', id: post.authorId }),
  },

  User: {
    posts: (user: { id: string }) =>
      posts.filter((p) => p.authorId === user.id),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4002 } });
```

### 4. Create the Gateway

```typescript
// gateway/index.ts
import { ApolloGateway } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'users', url: 'http://localhost:4001/graphql' },
    { name: 'posts', url: 'http://localhost:4002/graphql' },
  ],
  debug: false,
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;
    return { user };
  },
});

console.log(`Gateway ready at ${url}`);
```

### 5. Query Across Subgraphs

```graphql
query {
  posts {
    id
    title
    author {
      id
      name
      posts {
        id
        title
      }
    }
  }
}
```

The gateway fetches posts from the posts subgraph, then resolves `author.name` by calling the users subgraph, then resolves `author.posts` back in the posts subgraph — all in a single client query.

## How It Works

1. **`@key`** marks an entity's primary key. The gateway uses it to join data across subgraphs using `_entities` queries.
2. **`@extends`** on `User` in the posts subgraph means the posts service extends the `User` entity defined in the users service without owning it.
3. **`@external`** marks fields that are owned by another subgraph. The posts subgraph can reference `User.name` but cannot resolve it.
4. **`__resolveReference`** is called when the gateway needs to fetch an entity by its key from a subgraph. It receives `{ __typename, id }` and returns the full object.
5. **The gateway** composes the subgraph schemas into a supergraph at startup, then plans and executes queries by splitting them across subgraphs.

## Variants

### Managed Federation with Rover

Use Apollo Studio to manage composition instead of inline `serviceList`:

```bash
rover subgraph publish my-graph@current \
  --name users \
  --routing-url http://localhost:4001/graphql \
  --schema ./users-schema.graphql
```

The gateway fetches the supergraph schema from Apollo Studio:

```typescript
const gateway = new ApolloGateway({
  supergraphSdl: () => fetchSupergraphFromStudio(),
});
```

### Entity Resolution with Caching

Cache entity references to avoid repeated subgraph calls:

```typescript
const gateway = new ApolloGateway({
  serviceList: [...],
  buildService: ({ url }) => {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest: ({ request, context }) => {
        request.http?.headers.set('authorization', context.token);
      },
    });
  },
});
```

### Custom Request Headers

Forward auth tokens to subgraphs:

```typescript
const gateway = new ApolloGateway({
  serviceList: [...],
  buildService: ({ name, url }) => {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest: ({ request, context }) => {
        if (context.user) {
          request.http?.headers.set('x-user-id', context.user.id);
          request.http?.headers.set('x-user-role', context.user.role);
        }
      },
    });
  },
});
```

## Best Practices

- **Use managed federation in production** — Apollo Studio handles composition, schema validation, and rollback
- **Keep subgraphs small and domain-focused** — each team owns one subgraph
- **Forward auth context to subgraphs** — the gateway is not the place to enforce field-level auth
- **Monitor query plans** — use Apollo Studio to see how queries are split across subgraphs

## Common Mistakes

- **Defining the same field in two subgraphs** — each field must have exactly one owner
- **Forgetting `__resolveReference`** — entities referenced by other subgraphs need this resolver
- **Using `@external` on owned fields** — `@external` means "this field is resolved elsewhere"
- **Not handling gateway downtime** — the gateway is a single point of failure; deploy multiple instances behind a load balancer

## FAQ

**Q: Can I add a non-federated GraphQL service to the gateway?**
A: No. All services must be federated subgraphs with `buildSubgraphSchema`. Use schema stitching for non-federated services.

**Q: How does the gateway handle a subgraph outage?**
A: Queries that require the down subgraph fail. Queries that only touch healthy subgraphs still work. Use circuit breakers and fallbacks for critical paths.

**Q: Can subgraphs communicate with each other directly?**
A: No. Subgraphs never call each other. The gateway orchestrates all cross-subgraph resolution.

**Q: What is the difference between Federation 1 and 2?**
A: Federation 2 removes the need for `@extends` on new types and adds join directives for better composition. Migration is incremental.
