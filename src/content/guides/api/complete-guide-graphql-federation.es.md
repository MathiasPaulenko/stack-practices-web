---






contentType: guides
slug: complete-guide-graphql-federation
title: "Referencia Detallada de GraphQL Federation"
description: "Construye APIs GraphQL unificadas across múltiples servicios con Apollo Federation. Cubre subgraphs, supergraph composition, entity resolution y gateway deployment."
metaDescription: "Referencia Detallada de GraphQL Federation. Construye APIs unificadas con Apollo Federation, subgraphs, supergraph composition, entities y gateway deployment."
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
  metaDescription: "Referencia Detallada de GraphQL Federation. Construye APIs unificadas con Apollo Federation, subgraphs, supergraph composition, entities y gateway deployment."
  keywords:
    - graphql federation
    - apollo federation
    - supergraph
    - subgraph
    - graphql gateway
    - entity resolution
    - graphql microservices






---

# Referencia Detallada de GraphQL Federation

## Introducción

GraphQL Federation te permite splitir una API GraphQL grande across múltiples servicios (subgraphs) mientras expones una API unificada a través de un gateway. Cada equipo posee su subgraph, define sus types, y la capa de federation los compone en un supergraph. A continuación: setup de subgraph, supergraph composition, entity resolution y gateway deployment usando Apollo Federation.

## Arquitectura de Federation

```text
Client → Gateway (Supergraph) → Subgraph A (Users)
                              → Subgraph B (Orders)
                              → Subgraph C (Products)
```

- **Subgraph**: Un servicio GraphQL poseído por un equipo, que define parte del schema
- **Supergraph**: El schema compuesto de todos los subgraphs
- **Gateway**: El entry point que rutear queries a los subgraphs apropiados
- **Entity**: Un type compartido con un key field que múltiples subgraphs pueden referenciar y extender

## Setup de Subgraph

### Subgraph de Users (Node.js)

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

### Subgraph de Orders (Node.js)

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

### Subgraph de Products (Python)

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

## Setup de Gateway

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
# Instalar Rover CLI
curl -sSL https://rover.apollo.dev/nix/latest | sh

# Componer supergraph desde schemas de subgraphs
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

Las entities son el core de federation. Permiten a los subgraphs referenciar types poseídos por otros subgraphs.

### `@key` — definir una entity

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}
```

### `@extends` — extender una entity de otro subgraph

```graphql
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

### `@requires` — computar fields basados en fields externos

```graphql
extend type Product @key(fields: "id") {
  id: ID! @external
  price: Float! @external
  discountedPrice: Float! @requires(fields: "price")
}
```

### `@provides` — indicar que un subgraph puede proveer fields de otro type

```graphql
extend type Order @key(fields: "id") {
  id: ID! @external
  user: User! @provides(fields: "name")
}
```

### `@shareable` — permitir que un field sea resuelto por múltiples subgraphs

```graphql
type Product @key(fields: "id") {
  id: ID! @shareable
  name: String! @shareable
}
```

## Querying el Federated Graph

```graphql
# Esta query spanea los tres subgraphs:
# 1. Gateway envía user query al subgraph de Users
# 2. Gateway envía orders query al subgraph de Orders (usando user.id como entity key)
# 3. Gateway envía product query al subgraph de Products (usando orderItem.productId como entity key)

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

## Pautas

- **Un subgraph por equipo** — los boundaries de ownership matchean los boundaries de equipo
- **Usar entities para types compartidos** — `@key` en types referenciados across subgraphs
- **Mantener subgraphs independientes** — cada subgraph debería funcionar standalone
- **Usar `@external` para fields externos** — nunca duplicar definiciones de fields
- **Evitar dependencias circulares** — subgraph A extiende User, subgraph B extiende Order, no ambos extendiéndose mutuamente
- **Usar Rover para composition** — validar cambios de schema antes de deployar
- **Cachear entity resolution** — el gateway llama `__resolveReference` frecuentemente
- **Monitorear query plans** — entender cómo el gateway split queries across subgraphs
- **Usar managed federation (Apollo Studio)** — trackear cambios de schema y errores de composition
- **Versionar subgraphs independientemente** — el gateway maneja composition, no subgraphs individuales
- **Manejar fallos de subgraph gracefulmente** — usar partial results y error extensions
- **Setear timeouts en calls a subgraphs** — un subgraph lento no debería bloquear toda la query

## Errores Comunes

- Definir el mismo field en múltiples subgraphs sin `@shareable` — composition falla
- No implementar `__resolveReference` — entity lookups retornan null
- Crear acoplamiento tight entre subgraphs — derrota el propósito de federation
- No manejar downtime de subgraph — el gateway errorea en lugar de retornar partial data
- Usar `@requires` con fields no externos — la validación de composition falla
- No testear composition localmente — conflictos de schema aparecen solo en producción
- Overusar `@shareable` — derrota boundaries de ownership
- No monitorear performance de query plans — N+1 entity resolution mata latencia
- Exponer IDs internos across boundaries de subgraph — leakea detalles de implementación
- No usar DataLoader para batching de entities — una query triggera cientos de calls a subgraphs

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre schema stitching y federation?

Schema stitching combina schemas manualmente con custom resolvers. Federation usa un protocolo estandarizado (`@key`, `@extends`, `__resolveReference`) para que los subgraphs declaren sus relaciones declarativamente. Federation es el enfoque recomendado para proyectos nuevos — es más mantenible y tiene mejor tooling.

### ¿Cómo maneja el gateway una query que spanea múltiples subgraphs?

El gateway construye un query plan. Para una query que fetchea un user y sus orders, primero llama al subgraph de Users para el user, luego usa el `id` del user como entity key para llamar al subgraph de Orders. El gateway joinea los resultados y retorna una sola response al client.

### ¿Puedo usar federation sin Apollo?

Sí. Federation es una spec abierta. Las alternativas incluyen Apollo Gateway (Node.js), Apollo Router (Rust) y gateways custom. El protocolo de subgraph es language-agnostic — puedes construir subgraphs en Python (Ariadne, Strawberry), Java (DGS), Go (gqlgen) y Ruby (graphql-ruby).

## See Also

- [GraphQL Federation in Production](/es/guides/complete-guide-graphql-federation-production/)
- [Set Up a GraphQL Federation Gateway with Apollo](/es/recipes/graphql-federation-gateway-setup/)
- [Complete Guide to GraphQL Schema Design](/es/guides/complete-guide-graphql-schema-design/)
- [GraphQL vs REST — When to Choose and How to Migrate](/es/guides/graphql-vs-rest-guide/)
- [GraphQL Error Extension Pattern](/es/patterns/graphql-error-extension-pattern/)

