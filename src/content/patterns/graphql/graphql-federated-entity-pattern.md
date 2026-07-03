---
contentType: patterns
slug: graphql-federated-entity-pattern
title: "GraphQL Federated Entity Pattern"
description: "Share entity types across federated GraphQL services so the gateway can resolve fields from multiple subgraphs transparently."
metaDescription: "GraphQL federated entity pattern: share types across subgraphs with @key, @external, and @extends. Resolve entity fields from multiple services in Apollo Federation."
difficulty: advanced
topics:
  - graphql
  - design
tags:
  - graphql
  - federation
  - entity
  - pattern
  - apollo-federation
  - subgraph
  - microservices
  - typescript
  - schema-design
relatedResources:
  - /patterns/graphql/graphql-schema-stitching-pattern
  - /patterns/graphql/graphql-connection-pagination-pattern
  - /recipes/graphql/graphql-federation-gateway-setup
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "GraphQL federated entity pattern: share types across subgraphs with @key, @external, and @extends. Resolve entity fields from multiple services in Apollo Federation."
  keywords:
    - graphql federation entity
    - apollo federation
    - federated subgraph
    - graphql entity resolution
    - "@key directive graphql"
    - graphql microservices pattern
---

# GraphQL Federated Entity Pattern

## Overview

In Apollo Federation, an entity is an object type shared across multiple subgraphs. Each subgraph contributes different fields to the same entity. The gateway stitches them together so clients query a single unified type without knowing which service owns which field.

Entities are the building blocks of a federated graph. They use the `@key` directive to declare a primary key, `@extends` to add fields from another subgraph, and `@external` to reference fields owned by other services. The gateway resolves entities by calling each subgraph's `_entities` field with the appropriate keys.

## When to Use

- Multiple services own different fields of the same domain entity (e.g. User has profile in one service, orders in another)
- You are building a microservices architecture with GraphQL
- You need a unified API gateway without coupling services
- Schema stitching is insufficient because you need type merging at the entity level
- You want to split a monolithic GraphQL schema into domain-owned subgraphs

## Solution

### Subgraph A: User Service (owns User entity)

```typescript
import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloServer } from '@apollo/server';

const typeDefs = `
  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
    profile: Profile
  }

  type Profile {
    bio: String
    avatarUrl: String
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const resolvers = {
  User: {
    __resolveReference: (user, context) => {
      // Called by the gateway when another subgraph references this entity
      return context.dataSources.userApi.getById(user.id);
    },
  },
  Query: {
    user: (_, { id }, context) => context.dataSources.userApi.getById(id),
    users: (_, __, context) => context.dataSources.userApi.getAll(),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});
```

### Subgraph B: Order Service (extends User entity)

```typescript
const typeDefs = `
  type User @key(fields: "id") @extends {
    id: ID! @external
    orders: [Order!]!
  }

  type Order @key(fields: "id") {
    id: ID!
    userId: ID!
    total: Float!
    items: [OrderItem!]!
  }

  type OrderItem {
    productId: ID!
    quantity: Int!
    price: Float!
  }

  type Query {
    order(id: ID!): Order
    ordersByUser(userId: ID!): [Order!]!
  }
`;

const resolvers = {
  User: {
    orders: (user, _, context) => {
      // Gateway provides user.id from the parent subgraph
      return context.dataSources.orderApi.getByUserId(user.id);
    },
  },
  Query: {
    order: (_, { id }, context) => context.dataSources.orderApi.getById(id),
    ordersByUser: (_, { userId }, context) => context.dataSources.orderApi.getByUserId(userId),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});
```

### Subgraph C: Review Service (extends both User and Product)

```typescript
const typeDefs = `
  type User @key(fields: "id") @extends {
    id: ID! @external
    reviews: [Review!]!
  }

  type Product @key(fields: "id") @extends {
    id: ID! @external
    reviews: [Review!]!
  }

  type Review @key(fields: "id") {
    id: ID!
    userId: ID!
    productId: ID!
    rating: Int!
    comment: String
  }

  type Query {
    reviewsByProduct(productId: ID!): [Review!]!
  }
`;

const resolvers = {
  User: {
    reviews: (user, _, context) =>
      context.dataSources.reviewApi.getByUserId(user.id),
  },
  Product: {
    reviews: (product, _, context) =>
      context.dataSources.reviewApi.getByProductId(product.id),
  },
};
```

### Gateway Setup

```typescript
import { ApolloGateway } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'users', url: 'http://localhost:4001/graphql' },
    { name: 'orders', url: 'http://localhost:4002/graphql' },
    { name: 'reviews', url: 'http://localhost:4003/graphql' },
  ],
});

const server = new ApolloServer({ gateway });
startStandaloneServer(server, { listen: { port: 4000 } });
```

### Client Query (Cross-Service)

```graphql
query GetUserWithOrdersAndReviews {
  user(id: "123") {
    id
    name
    email
    orders {
      id
      total
      items {
        productId
        quantity
      }
    }
    reviews {
      id
      rating
      comment
    }
  }
}
```

## Explanation

Federation works through three directives:

- **`@key(fields: "id")`** — declares the primary key of an entity. The gateway uses this key to request the entity from any subgraph that owns it.
- **`@extends`** — marks a type as an extension. The subgraph does not own the type but adds fields to it.
- **`@external`** — marks a field as owned by another subgraph. The resolver receives this field's value from the gateway.

When a client queries `user(id: "123") { orders { total } }`, the gateway:

1. Sends the query to the users subgraph to resolve `user(id: "123")` and fetch `id`, `name`, `email`
2. Sends the `id` to the orders subgraph via `_entities` to resolve `User.orders`
3. Merges the results and returns a single `User` object to the client

The `__resolveReference` resolver is called when the gateway requests an entity by its key. Each subgraph that owns the entity must implement this resolver to fetch the base fields.

## Variants

| Approach | Directives | Best For |
|----------|-----------|----------|
| Single key | `@key(fields: "id")` | Standard entities with one ID |
| Composite key | `@key(fields: "orgId id")` | Multi-tenant or partitioned entities |
| Multiple keys | `@key(fields: "id") @key(fields: "email")` | Lookup by different identifiers |
| Entity with computed fields | `@requires` | Fields computed from other subgraph fields |
| Shareable fields | `@shareable` | Fields resolved by multiple subgraphs |

## Best Practices

- **One owning service per entity** — only one subgraph should own the base type definition. Others use `@extends`.
- **Use `__resolveReference` efficiently** — the gateway calls it for every entity reference. Batch database calls when multiple entities are requested.
- **Keep entities small** — only declare fields that this subgraph owns. Extending with too many fields creates a heavy gateway query plan.
- **Use `@requires` for computed fields** — if a field needs data from another subgraph, declare it with `@requires` so the gateway fetches the dependency first.
- **Version entities carefully** — changing `@key` fields breaks the gateway. Add new keys before removing old ones.

## Common Mistakes

- **Missing `__resolveReference`** — without it, the gateway cannot resolve entity references from other subgraphs. The query fails with a runtime error.
- **Declaring `@extends` without `@external`** — extended types must mark inherited fields as `@external`. Forgetting this causes schema validation errors.
- **Multiple subgraphs owning the same entity** — only one subgraph should define the base type. Others must use `@extends`.
- **Circular entity references** — Subgraph A extends User with orders, Subgraph B extends Order with user. The gateway handles this, but deep circular queries create expensive query plans.
- **Not testing the query plan** — use Apollo Studio's query plan viewer to verify the gateway fetches fields from the right subgraphs in the right order.

## Frequently Asked Questions

### How does federation differ from schema stitching?

Federation is a specification: subgraphs implement `@key`, `@extends`, and `_entities`. The gateway uses these to build a query plan. Schema stitching manually merges schemas with custom delegation logic. Federation is more structured; stitching is more flexible.

### Can a subgraph extend an entity it does not own?

Yes. That is the core of federation. The subgraph uses `@extends` and `@external` to add fields. The gateway routes field requests to the owning subgraph for base fields and to the extending subgraph for the new fields.

### What is `@requires` for?

`@requires` lets a subgraph compute a field using data from another subgraph. For example, the shipping subgraph can define `User.shippingCost` with `@requires(fields: "address")` where `address` is owned by the users subgraph. The gateway fetches `address` first, then passes it to the shipping subgraph.

### Can I use federation with REST services?

Not directly. Subgraphs must be GraphQL services that implement the federation spec. To integrate REST, create a GraphQL wrapper that calls the REST API and expose it as a subgraph.
