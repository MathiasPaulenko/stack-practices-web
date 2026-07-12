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
  - /recipes/graphql-mocking-apollo-server
lastUpdated: "2026-07-02"
author: "StackPractices"
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

# Complete Guide to GraphQL Federation

## Introduction

GraphQL Federation lets you split a large GraphQL API across multiple services (subgraphs) while exposing a single unified API through a gateway. Each team owns their subgraph, defines their types, and the federation layer composes them into a supergraph. Here is a hands-on guide to subgraph setup, supergraph composition, entity resolution, and gateway deployment using Apollo Federation.

## Federation Architecture

```
Client → Gateway (Supergraph) → Subgraph A (Users)
                              → Subgraph B (Orders)
                              → Subgraph C (Products)
```

- **Subgraph**: A GraphQL service owned by a team, defining part of the schema
- **Supergraph**: The composed schema from all subgraphs
- **Gateway**: The entry point that routes queries to the appropriate subgraphs
- **Entity**: A shared type with a key field that multiple subgraphs can reference and extend

## Subgraph Setup

### Users subgraph (Node.js)

```javascript
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql, ApolloServer } = require("apollo-server-express");

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

    extend type OrderItem @key(fields: "productId") {
        productId: ID! @external
        product: Product
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
const { ApolloServer } = require("apollo-server-express");

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

```bash
# Install Rover CLI
curl -sSL https://rover.apollo.dev/nix/latest | sh

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

Entities are the core of federation. They let subgraphs reference types owned by other subgraphs.

### `@key` — define an entity

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}
```

### `@extends` — extend an entity from another subgraph

```graphql
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

### `@requires` — compute fields based on external fields

```graphql
extend type Product @key(fields: "id") {
  id: ID! @external
  price: Float! @external
  discountedPrice: Float! @requires(fields: "price")
}
```

### `@provides` — indicate a subgraph can provide fields of another type

```graphql
extend type Order @key(fields: "id") {
  id: ID! @external
  user: User! @provides(fields: "name")
}
```

### `@shareable` — allow a field to be resolved by multiple subgraphs

```graphql
type Product @key(fields: "id") {
  id: ID! @shareable
  name: String! @shareable
}
```

## Querying the Federated Graph

```graphql
# This query spans all three subgraphs:
# 1. Gateway sends user query to Users subgraph
# 2. Gateway sends orders query to Orders subgraph (using user.id as entity key)
# 3. Gateway sends product query to Products subgraph (using orderItem.productId as entity key)

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


- For a deeper guide, see [GraphQL Federation in Production](/guides/complete-guide-graphql-federation-production/).

- **One subgraph per team** — ownership boundaries match team boundaries
- **Use entities for shared types** — `@key` on types referenced across subgraphs
- **Keep subgraphs independent** — each subgraph should work standalone
- **Use `@external` for foreign fields** — never duplicate field definitions
- **Avoid circular dependencies** — subgraph A extends User, subgraph B extends Order, not both extending each other
- **Use Rover for composition** — validate schema changes before deploying
- **Cache entity resolution** — gateway calls `__resolveReference` frequently
- **Monitor query plans** — understand how the gateway splits queries across subgraphs
- **Use managed federation (Apollo Studio)** — track schema changes and composition errors
- **Version subgraphs independently** — the gateway handles composition, not individual subgraphs
- **Handle subgraph failures gracefully** — use partial results and error extensions
- **Set timeouts on subgraph calls** — one slow subgraph should not block the entire query

## Common Mistakes

- Defining the same field in multiple subgraphs without `@shareable` — composition fails
- Not implementing `__resolveReference` — entity lookups return null
- Creating tight coupling between subgraphs — defeats the purpose of federation
- Not handling subgraph downtime — gateway errors instead of returning partial data
- Using `@requires` with non-external fields — composition validation fails
- Not testing composition locally — schema conflicts surface only in production
- Overusing `@shareable` — defeats ownership boundaries
- Not monitoring query plan performance — N+1 entity resolution kills latency
- Exposing internal IDs across subgraph boundaries — leak implementation details
- Not using DataLoader for entity batching — one query triggers hundreds of subgraph calls

## Frequently Asked Questions

### What is the difference between schema stitching and federation?

Schema stitching manually combines schemas with custom resolvers. Federation uses a standardized protocol (`@key`, `@extends`, `__resolveReference`) so subgraphs declare their relationships declaratively. Federation is the recommended approach for new projects — it is more maintainable and has better tooling.

### How does the gateway handle a query that spans multiple subgraphs?

The gateway builds a query plan. For a query fetching a user and their orders, it first calls the Users subgraph for the user, then uses the user's `id` as an entity key to call the Orders subgraph. The gateway joins the results and returns a single response to the client.

### Can I use federation without Apollo?

Yes. Federation is an open specification. Alternatives include Apollo Gateway (Node.js), Apollo Router (Rust), and custom gateways. The subgraph protocol is language-agnostic — you can build subgraphs in Python (Ariadne, Strawberry), Java (DGS), Go (gqlgen), and Ruby (graphql-ruby).
