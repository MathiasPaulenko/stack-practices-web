---
contentType: guides
slug: complete-guide-graphql-federation
title: "Complete Guide to GraphQL Federation"
description: "Build unified GraphQL APIs across multiple services with Apollo Federation. Covers subgraphs, supergraph composition, entity resolution, and gateway deployment."
metaDescription: "Complete guide to GraphQL Federation. Build unified APIs across services with Apollo Federation, subgraphs, supergraph composition, entities and gateway."
difficulty: advanced
topics:
  - graphql
  - api
  - architecture
tags:
  - graphql
  - federation
  - apollo
  - supergraph
  - subgraph
  - microservices
  - guide
  - api
relatedResources:
  - /guides/graphql-vs-rest-guide
  - /guides/complete-guide-api-versioning-strategies
  - /guides/complete-guide-microservices-communication
  - /patterns/graphql-federated-entity-pattern
  - /guides/complete-guide-graphql-federation-production
  - /guides/complete-guide-graphql-testing
lastUpdated: "2026-08-24"
publishedAt: "2026-07-02"
author: Mathias Paulenko
seo:
  metaDescription: "Complete guide to GraphQL Federation. Build unified APIs across services with Apollo Federation, subgraphs, supergraph composition, entities and gateway."
  keywords:
    - graphql federation
    - apollo federation
    - supergraph
    - subgraph
    - graphql gateway
    - entity resolution
    - graphql microservices
---

## Introduction

Building a single GraphQL schema for a whole company quickly becomes a
bottleneck. Teams block each other on schema changes, deployments get coupled,
and the monolithic graph becomes fragile. GraphQL Federation solves this by
splitting the schema into subgraphs that each team owns and composing them back
into one supergraph. This guide shows how to set up subgraphs, compose the
supergraph, resolve entities, and deploy a gateway with Apollo Federation.

## Federation Architecture

```text
Client → Gateway (Supergraph) → Subgraph A (Users)
                              → Subgraph B (Orders)
                              → Subgraph C (Products)
```

A **subgraph** is a GraphQL service owned by a team that defines part of the
schema. The **supergraph** is the composed schema built from all subgraphs. The
**gateway** is the entry point that routes each part of a query to the right
subgraph. An **entity** is a shared type with a key field that several
subgraphs can reference and extend.

## Subgraph Setup

### Users subgraph (Node.js)

```javascript
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql, ApolloServer } = require("apollo-server");

const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
    orders: [Order!]!
  }

  extend type Order @key(fields: "id") {
    id: ID! @external
    user: User! @provides(fields: "name")
  }

  extend type Product @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const resolvers = {
  User: {
    orders(user) {
      return fetch(`http://orders-service/orders?userId=${user.id}`)
        .then((res) => res.json());
    },
  },
  Query: {
    user: (_, { id }) => fetch(`http://users-service/users/${id}`).then((res) => res.json()),
    users: () => fetch("http://users-service/users").then((res) => res.json()),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`Users subgraph ready at ${url}`);
});
```

### Orders subgraph (Node.js)

```javascript
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql, ApolloServer } = require("apollo-server");

const typeDefs = gql`
  type Order @key(fields: "id") {
    id: ID!
    total: Float!
    status: String!
    userId: ID!
    user: User!
    items: [OrderItem!]!
  }

  type OrderItem {
    productId: ID!
    quantity: Int!
    price: Float!
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    orders: [Order!]! @external
  }

  extend type Product @key(fields: "id") {
    id: ID! @external
    orders: [OrderItem!]!
  }

  type Query {
    order(id: ID!): Order
    orders: [Order!]!
  }

  type Mutation {
    createOrder(userId: ID!, items: [OrderItemInput!]!): Order!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }
`;

const resolvers = {
  Order: {
    user(order) {
      return { __typename: "User", id: order.userId };
    },
    items(order) {
      return order.items;
    },
  },
  Product: {
    orders(product) {
      return fetch(`http://orders-service/orders/items?productId=${product.id}`)
        .then((res) => res.json());
    },
  },
  Query: {
    order: (_, { id }) => fetch(`http://orders-service/orders/${id}`).then((res) => res.json()),
    orders: () => fetch("http://orders-service/orders").then((res) => res.json()),
  },
  Mutation: {
    createOrder: (_, { userId, items }) => {
      return fetch("http://orders-service/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, items }),
      }).then((res) => res.json());
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

server.listen({ port: 4002 }).then(({ url }) => {
  console.log(`Orders subgraph ready at ${url}`);
});
```

### Products subgraph (Python)

```python
from ariadne import QueryType, make_federated_schema, ObjectType
from ariadne.asgi import GraphQL
import httpx

type_defs = """
    type Product @key(fields: "id") {
        id: ID!
        name: String!
        price: Float!
        description: String
    }

    type Query {
        product(id: ID!): Product
        products: [Product!]!
    }
"""

query = QueryType()
product_obj = ObjectType("Product")

@query.field("product")
async def resolve_product(_, info, id):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://products-service/products/{id}")
        return resp.json()

@query.field("products")
async def resolve_products(_, info):
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://products-service/products")
        return resp.json()

@product_obj.field("__resolve_reference")
async def resolve_product_reference(reference, info):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://products-service/products/{reference['id']}")
        return resp.json()

schema = make_federated_schema(type_defs, [query, product_obj])
app = GraphQL(schema, debug=True)
```

## Gateway Setup

```javascript
const { ApolloGateway } = require("@apollo/gateway");
const { ApolloServer } = require("apollo-server");

const gateway = new ApolloGateway({
  serviceList: [
    { name: "users", url: "http://localhost:4001/graphql" },
    { name: "orders", url: "http://localhost:4002/graphql" },
    { name: "products", url: "http://localhost:4003/graphql" },
  ],
  debug: true,
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`Gateway ready at ${url}`);
});
```

## Supergraph Composition

Use the Rover CLI to compose the supergraph schema from the running subgraphs:

```bash
# Install Rover
brew install apollo-tooling/tap/rover

# Compose supergraph from subgraph schemas
rover supergraph compose --config supergraph.yaml > supergraph.graphql
```

```yaml
# supergraph.yaml
federation_version: =2.8.0
subgraphs:
  users:
    routing_url: http://localhost:4001/graphql
    schema:
      subgraph_url: http://localhost:4001/graphql
  orders:
    routing_url: http://localhost:4002/graphql
    schema:
      subgraph_url: http://localhost:4002/graphql
  products:
    routing_url: http://localhost:4003/graphql
    schema:
      subgraph_url: http://localhost:4003/graphql
```

## Entity Resolution

Entities are the core of federation. They let one subgraph reference a type
owned by another subgraph without duplicating its definition.

### `@key`: define an entity

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}
```

### `@extends`: extend an entity from another subgraph

```graphql
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

### `@requires`: compute fields based on external fields

```graphql
extend type Product @key(fields: "id") {
  id: ID! @external
  price: Float! @external
  discountedPrice: Float! @requires(fields: "price")
}
```

### `@provides`: indicate a subgraph can provide fields of another type

```graphql
extend type Order @key(fields: "id") {
  id: ID! @external
  user: User! @provides(fields: "name")
}
```

### `@shareable`: allow a field to be resolved by several subgraphs

```graphql
type Product @key(fields: "id") {
  id: ID! @shareable
  name: String! @shareable
}
```

## Querying the Federated Graph

This query spans all three subgraphs. The gateway sends the user portion to the
Users subgraph, uses the `id` to fetch orders from the Orders subgraph, and
resolves each product from the Products subgraph.

```graphql
query GetUserWithOrders {
  user(id: "1") {
    id
    name
    email
    orders {
      id
      total
      status
      items {
        quantity
        product {
          name
          price
        }
      }
    }
  }
}
```

## Best Practices

Keep one subgraph per team so ownership boundaries match organizational
boundaries. Use `@key` on any type that more than one subgraph needs to
reference. Keep each subgraph self-contained enough to run and test on its own.

Mark foreign fields with `@external` instead of redefining them. Avoid circular
extensions where two subgraphs keep referencing each other. Compose the
supergraph with Rover before deploying so schema conflicts surface in CI, not in
production.

Cache entity resolution in the gateway, because `__resolveReference` runs
frequently. Monitor query plans to understand how a single client query turns
into several subgraph calls. If you use Apollo Studio, managed federation helps
track schema changes and composition errors across environments.

Version subgraphs independently; the gateway handles composition. When a
subgraph fails, design the gateway to return partial data and error extensions
instead of failing the whole request. Set timeouts on every subgraph call so one
slow service doesn't block the entire query.

## Common Mistakes

Defining the same field in several subgraphs without `@shareable` will fail
composition. Forgetting to implement `__resolveReference` leaves entity lookups
returning null. Tight coupling between subgraphs defeats the purpose of
federation, because teams start depending on each other's internals again.

Not handling subgraph downtime means the gateway returns an error instead of
partial data. Using `@requires` on a field that isn't marked `@external` fails
validation. Skipping local composition testing lets schema conflicts reach
production.

Overusing `@shareable` blurs ownership boundaries. Ignoring query plan
performance can turn one query into an N+1 sequence of entity resolutions.
Exposing internal IDs across subgraph boundaries leaks implementation details.
Finally, not using DataLoader for entity batching can make a single client query
trigger hundreds of subgraph calls.

## FAQ

### What is the difference between schema stitching and federation?

Schema stitching manually combines schemas with custom resolvers. Federation
uses a standardized protocol (`@key`, `@extends`, and `__resolveReference`) so
subgraphs declare their relationships declaratively. For new projects, federation
is the better choice because it's more maintainable and has better tooling.

### How does the gateway handle a query that spans multiple subgraphs?

The gateway builds a query plan. For a query fetching a user and their orders,
it first calls the Users subgraph, then uses the user's `id` as an entity key to
call the Orders subgraph. It joins the results and returns one response to the
client.

### Can I use federation without Apollo?

Yes. Federation is an open specification. You can use Apollo Gateway (Node.js),
Apollo Router (Rust), or a custom gateway. The subgraph protocol is
language-agnostic, so subgraphs can be built in Python (Ariadne, Strawberry),
Java (DGS), Go (gqlgen), and Ruby (graphql-ruby).

### When should I prefer a monolithic GraphQL API over federation?

Federation pays off when several teams own different parts of the schema and
need to deploy independently. If your API is small, has one owner, and few
coupling points, a monolithic schema is simpler and has less overhead.
