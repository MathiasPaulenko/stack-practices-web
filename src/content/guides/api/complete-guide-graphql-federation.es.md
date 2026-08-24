---
contentType: guides
slug: complete-guide-graphql-federation
title: "Guía Completa de GraphQL Federation"
description: "Construye APIs GraphQL unificadas con Apollo Federation. Cubre subgraphs, supergraph, resolución de entidades y despliegue de gateway."
metaDescription: "Guía completa de GraphQL Federation. Construye APIs unificadas con Apollo Federation, subgraphs, composición de supergraph, entidades y gateway."
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
  metaDescription: "Guía completa de GraphQL Federation. Construye APIs unificadas con Apollo Federation, subgraphs, composición de supergraph, entidades y gateway."
  keywords:
    - graphql federation
    - apollo federation
    - supergraph
    - subgraph
    - graphql gateway
    - entity resolution
    - graphql microservices
---

## Introducción

Construir un único schema GraphQL para toda la empresa se convierte rápidamente
en un cuello de botella. Los equipos se bloquean mutuamente con cambios de
schema, los despliegues quedan acoplados y el grafo monolítico se vuelve
frágil. GraphQL Federation resuelve esto dividiendo el schema en subgraphs que
cada equipo posee y componiéndolos de vuelta en un supergraph. Esta guía muestra
cómo configurar subgraphs, componer el supergraph, resolver entidades y
desplegar un gateway con Apollo Federation.

## Arquitectura de Federation

```text
Client → Gateway (Supergraph) → Subgraph A (Users)
                              → Subgraph B (Orders)
                              → Subgraph C (Products)
```

Un **subgraph** es un servicio GraphQL poseído por un equipo que define parte
del schema. El **supergraph** es el schema compuesto a partir de todos los
subgraphs. El **gateway** es el punto de entrada que enruta cada parte de una
query al subgraph correspondiente. Una **entidad** es un type compartido con un
key field que múltiples subgraphs pueden referenciar y extender.

## Configuración de Subgraphs

### Subgraph de Users (Node.js)

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

### Subgraph de Orders (Node.js)

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

## Configuración del Gateway

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

## Composición del Supergraph

Usá el Rover CLI para componer el schema del supergraph a partir de los
subgraphs en ejecución:

```bash
# Instalar Rover
brew install apollo-tooling/tap/rover

# Componer supergraph desde los schemas de los subgraphs
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

## Resolución de Entidades

Las entidades son el núcleo de federation. Permiten que un subgraph referencie
un type poseído por otro subgraph sin duplicar su definición.

### `@key` — definir una entidad

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}
```

### `@extends` — extender una entidad de otro subgraph

```graphql
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

### `@requires` — computar fields basados en campos externos

```graphql
extend type Product @key(fields: "id") {
  id: ID! @external
  price: Float! @external
  discountedPrice: Float! @requires(fields: "price")
}
```

### `@provides` — indicar que un subgraph puede proveer campos de otro type

```graphql
extend type Order @key(fields: "id") {
  id: ID! @external
  user: User! @provides(fields: "name")
}
```

### `@shareable` — permitir que un campo sea resuelto por múltiples subgraphs

```graphql
type Product @key(fields: "id") {
  id: ID! @shareable
  name: String! @shareable
}
```

## Consultando el Grafo Federado

Esta query abarca los tres subgraphs. El gateway envía la parte de usuario al
subgraph de Users, usa el `id` para traer las órdenes del subgraph de Orders y
resuelve cada producto del subgraph de Products.

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

## Mejores Prácticas

Mantené un subgraph por equipo, así los límites de ownership coinciden con los
límites del equipo. Usá `@key` en cualquier type que más de un subgraph necesite
referenciar. Cada subgraph debería ser lo suficientemente autocontenido como para
ejecutarse y probarse solo.

Marcá los campos foráneos con `@external` en lugar de redefinirlos. Evitá
extensiones circulares donde dos subgraphs se referencien mutuamente. Componé el
supergraph con Rover antes de desplegar, así los conflictos de schema aparecen
en CI, no en producción.

Cacheá la resolución de entidades en el gateway, porque `__resolveReference` se
ejecuta con frecuencia. Monitoreá los query plans para entender cómo una query
del cliente se convierte en múltiples llamadas a subgraphs. Si usás Apollo
Studio, la federación administrada ayuda a rastrear cambios de schema y errores
de composición entre entornos.

Versioná los subgraphs de forma independiente; el gateway se encarga de la
composición. Cuando un subgraph falla, diseñá el gateway para devolver datos
parciales y extensiones de error en lugar de fallar toda la request. Configurá
timeouts en cada llamada a subgraph, así un servicio lento no bloquea toda la
query.

## Errores Comunes

Definir el mismo campo en múltiples subgraphs sin `@shareable` hace fallar la
composición. Olvidar implementar `__resolve_reference` deja las búsquedas de
entidades retornando null. Acoplar demasiado los subgraphs anula el propósito de
federation, porque los equipos vuelven a depender de los internos de cada uno.

No manejar el downtime de un subgraph hace que el gateway devuelva un error en
lugar de datos parciales. Usar `@requires` sobre un campo que no está marcado
como `@external` falla la validación. Saltearse los tests locales de composición
deja que los conflictos de schema lleguen a producción.

Abusar de `@shareable` difumina los límites de ownership. Ignorar el rendimiento
de los query plans puede convertir una query en una secuencia N+1 de resoluciones
de entidades. Exponer IDs internos a través de los límites de los subgraphs filtra
detalles de implementación. Por último, no usar DataLoader para el batching de
entidades puede hacer que una sola query del cliente dispare cientos de llamadas
a subgraphs.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre schema stitching y federation?

Schema stitching combina schemas manualmente con resolvers custom. Federation
usa un protocolo estandarizado — `@key`, `@extends` y `__resolveReference` — así
que los subgraphs declaran sus relaciones de forma declarativa. Para proyectos
nuevos, federation es la mejor opción porque es más mantenible y tiene mejor
tooling.

### ¿Cómo maneja el gateway una query que abarca múltiples subgraphs?

El gateway construye un query plan. Para una query que trae un usuario y sus
órdenes, primero llama al subgraph de Users, luego usa el `id` del usuario como
entity key para llamar al subgraph de Orders. Une los resultados y retorna una
sola response al cliente.

### ¿Puedo usar federation sin Apollo?

Sí. Federation es una especificación abierta. Podés usar Apollo Gateway
(Node.js), Apollo Router (Rust) o un gateway custom. El protocolo de subgraph es
language-agnostic, así que podés construir subgraphs en Python (Ariadne,
Strawberry), Java (DGS), Go (gqlgen) y Ruby (graphql-ruby).

### ¿Cuándo prefiero una API GraphQL monolítica sobre federation?

Federation vale la pena cuando múltiples equipos poseen distintas partes del
schema y necesitan desplegar de forma independiente. Si tu API es chica, tiene
un único dueño y pocos puntos de acoplamiento, un schema monolítico es más
simple y tiene menos overhead.
