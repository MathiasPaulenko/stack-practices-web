---
contentType: patterns
slug: graphql-federated-entity-pattern
title: "GraphQL Federated Entity Pattern"
description: "Share an entity across Apollo Federation subgraphs. Use @key, @external, and @shareable so each service owns the fields it knows best."
metaDescription: "Share a GraphQL entity across Apollo Federation subgraphs. Learn how @key, @external, and @shareable let each service own the fields it knows best."
difficulty: advanced
topics:
  - graphql
  - design
  - architecture
tags:
  - graphql
  - federation
  - apollo
  - entity
  - subgraph
  - microservices
  - schema-design
  - pattern
relatedResources:
  - /patterns/graphql-schema-stitching-pattern
  - /patterns/graphql-connection-pagination-pattern
  - /recipes/graphql-federation-gateway-setup
  - /patterns/graphql-mutation-validation-pattern
  - /docs/graphql-federation-onboarding-template
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-08-22"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Share a GraphQL entity across Apollo Federation subgraphs. Learn how @key, @external, and @shareable let each service own the fields it knows best."
  keywords:
    - graphql federation
    - federated entity pattern
    - apollo federation
    - subgraph
    - entity
---

In Apollo Federation, an entity is an object type that several subgraphs can contribute to at the
same time. One service owns the base fields, others add their own, and the gateway merges everything
into a single GraphQL type.

The pattern keeps each subgraph focused on the data it already manages. A users service owns
`User.name`, an orders service adds `User.orders`, and a reviews service adds `User.reviews`.
Clients query one schema, but the gateway routes each field to the right service.

## When to Use

- Different microservices own different fields of the same domain object.
- You want a unified GraphQL API without building a monolithic schema.
- Schema stitching feels too manual or error-prone for type merging.
- Teams need to deploy and own their part of the graph independently.

## When NOT to Use

- The entity is only ever read or written by a single service. A regular GraphQL schema is simpler.
- Subgraphs are tightly coupled and share the same database. Federation adds complexity you don't
    need.
- You're still on a GraphQL server that doesn't support the Apollo Federation spec.

## Solution

### Subgraph A: User Service (owns the entity)

The base subgraph declares the entity with `@key` and adds `__resolveReference` so the gateway
can fetch it by its key.

```typescript
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = `#graphql
  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }
`;

const resolvers = {
  User: {
    __resolveReference(user: { id: string }) {
      return userService.getById(user.id);
    },
  },
  Query: {
    user(_: unknown, { id }: { id: string }) {
      return userService.getById(id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4001 },
});
console.log(`Users service ready at ${url}`);
```

### Subgraph B: Order Service (extends the entity)

The order subgraph doesn't own `User`, but it adds `User.orders`. The `id` field is marked
`@external` because another service owns it. `resolvable: false` tells the gateway that this
subgraph can't fetch a `User` by key on its own.

```typescript
const typeDefs = `#graphql
  type Order @key(fields: "id") {
    id: ID!
    userId: ID!
    total: Float!
  }

  type User @key(fields: "id", resolvable: false) {
    id: ID! @external
    orders: [Order!]!
  }
`;

const resolvers = {
  User: {
    orders(user: { id: string }) {
      return orderService.getByUserId(user.id);
    },
  },
  Query: {
    order(_: unknown, { id }: { id: string }) {
      return orderService.getById(id);
    },
  },
};
```

### Subgraph C: Review Service (extends the entity again)

Another subgraph can also extend `User`. Each subgraph only declares the fields it knows.

```typescript
const typeDefs = `#graphql
  type Review @key(fields: "id") {
    id: ID!
    productId: ID!
    rating: Int!
    comment: String
  }

  type User @key(fields: "id", resolvable: false) {
    id: ID! @external
    reviews: [Review!]!
  }
`;

const resolvers = {
  User: {
    reviews(user: { id: string }) {
      return reviewService.getByUserId(user.id);
    },
  },
};
```

### Gateway

The gateway asks each subgraph for its schema, builds a supergraph, and routes fields automatically.

```typescript
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'users', url: 'http://localhost:4001/graphql' },
      { name: 'orders', url: 'http://localhost:4002/graphql' },
      { name: 'reviews', url: 'http://localhost:4003/graphql' },
    ],
  }),
});

const server = new ApolloServer({ gateway });
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});
console.log(`Gateway ready at ${url}`);
```

### Client Query

The client sees a single `User` type, even though the fields come from three services.

```graphql
query GetUserWithOrdersAndReviews {
  user(id: "123") {
    id
    name
    email
    orders {
      id
      total
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

Federation resolves that query in three steps:

1. The gateway asks the **users** subgraph for `user(id: "123")` and the base fields `id`, `name`,
    `email`.
2. It sends the `id` to the **orders** and **reviews** subgraphs through the `_entities` query,
    asking for `orders` and `reviews`.
3. It merges the results into one `User` object and returns it to the client.

The key pieces are:

- **`@key(fields: "id")`** — tells the gateway how to identify the entity across subgraphs.
- **`@external`** — marks a field that this subgraph uses but doesn't own.
- **`resolvable: false`** — tells the gateway the subgraph can't resolve the entity by key on its
    own.
- **`__resolveReference`** — the resolver the gateway calls when it needs to fetch an entity by its
    key.

## Variants

| Variant | Directive | Use Case |
| --- | --- | --- |
| Single key | `@key(fields: "id")` | Most entities with a primary ID |
| Composite key | `@key(fields: "tenantId id")` | Multi-tenant or partitioned entities |
| Several lookup keys | `@key(fields: "id") @key(fields: "email")` | Lookup by more than one identifier |
| Computed field | `@requires(fields: "address")` | A field that needs data from another subgraph first |
| Shared field | `@shareable` | A field resolved by more than one subgraph |

### Composite key example

```graphql
type User @key(fields: "tenantId id") {
  tenantId: ID!
  id: ID!
  name: String!
}
```

### `@requires` example

The shipping subgraph computes `shippingCost` from the user's `address`, which the users subgraph
owns.

```graphql
type User @key(fields: "id", resolvable: false) {
  id: ID! @external
  address: String! @external
  shippingCost: Float! @requires(fields: "address")
}
```

The gateway fetches `address` first, then passes it to the shipping resolver.

## Best Practices

- Keep one base definition per entity. Other subgraphs add fields, but only one service owns the
    core type.
- Batch calls in `__resolveReference`. The gateway calls it for every entity reference, so one query
    per entity isn't enough at scale.
- Mark key fields as `@external` when the subgraph doesn't own them. Forgetting this causes a
    schema validation error.
- Add new keys before removing old ones. Changing a key breaks existing query plans.
- Use Apollo Studio or the gateway's query plan viewer to verify that fields route through the right
    subgraphs.

## Common Mistakes

- Missing `__resolveReference` on the owning subgraph. The gateway can't fetch the entity without
    it.
- Forgetting `@external` on the `id` field in an extension. The gateway will reject the schema.
- Declaring the base `User` type in two subgraphs. Only one subgraph should own the base definition.
- Returning extra fields in `__resolveReference`. Only return what the resolver is asked for; the
    gateway fetches the rest.
- Deep circular references without query limits. `User.orders.user.orders` can create expensive
    plans.

## FAQ

### How is federation different from schema stitching?

Federation uses directives and the `_entities` protocol to merge schemas declaratively. Schema
stitching writes custom resolver logic in the gateway to delegate fields manually. Federation is
cleaner for Apollo services; stitching is more flexible for integrating external APIs.

### Can a subgraph extend an entity it doesn't own?

Yes. It declares the entity with `@key` and marks the key field as `@external`. The gateway routes
base fields to the owning subgraph and the new fields to the extending subgraph.

### What does `@requires` do?

It tells the gateway to fetch one or more fields from another subgraph before resolving the
annotated field. Use it when a field is computed from data owned elsewhere.

### Can I federate REST services?

Not directly. Each subgraph must expose a GraphQL schema that follows the Apollo Federation spec.
You can wrap a REST API in a thin GraphQL subgraph if needed.

### Should every field be `@shareable`?

No. Only use `@shareable` when the same field can be resolved by more than one subgraph. For most
extensions, `@key` and `@external` are enough.
