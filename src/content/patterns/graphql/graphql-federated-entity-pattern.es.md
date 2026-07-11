---
contentType: patterns
slug: graphql-federated-entity-pattern
title: "Patron GraphQL Federated Entity"
description: "Comparte tipos de entidad entre servicios GraphQL federados para que el gateway resuelva campos de multiples subgrafos de forma transparente."
metaDescription: "Patron GraphQL federated entity: comparte tipos entre subgrafos con @key, @external y @extends. Resuelve campos de entidad desde multiples servicios en Apollo Federation."
difficulty: advanced
topics:
  - graphql
  - design
tags:
  - graphql
  - federation
  - entity
  - patron
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
  metaDescription: "Patron GraphQL federated entity: comparte tipos entre subgrafos con @key, @external y @extends. Resuelve campos de entidad desde multiples servicios en Apollo Federation."
  keywords:
    - graphql federation entity
    - apollo federation
    - federated subgraph
    - graphql entity resolution
    - "@key directive graphql"
    - graphql microservices pattern
---

# Patron GraphQL Federated Entity

## Descripcion general

En Apollo Federation, una entidad es un object type compartido entre multiples subgrafos. Cada subgrafo contribuye diferentes campos a la misma entidad. El gateway los une para que los clientes consulten un tipo unificado sin saber que servicio gestiona cada campo.

Las entidades son los bloques de construccion de un grafo federado. Usan la directiva `@key` para declarar una primary key, `@extends` para anadir campos desde otro subgrafo, y `@external` para referenciar campos gestionados por otros servicios. El gateway resuelve entidades llamando al campo `_entities` de cada subgrafo con las keys apropiadas.

## Cuando usarlo

- Multiples servicios gestionan diferentes campos de la misma entidad de dominio (ej. User tiene perfil en un servicio, ordenes en otro)
- Estas construyendo una arquitectura de microservicios con GraphQL
- Necesitas un gateway API unificado sin acoplar servicios
- Schema stitching es insuficiente porque necesitas type merging a nivel de entidad
- Quieres dividir un esquema GraphQL monolitico en subgrafos por dominio

## Solucion

### Subgrafo A: Servicio de Usuarios (gestiona la entidad User)

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
      // Llamado por el gateway cuando otro subgrafo referencia esta entidad
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

### Subgrafo B: Servicio de Ordenes (extiende la entidad User)

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
      // El gateway proporciona user.id desde el subgrafo padre
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

### Subgrafo C: Servicio de Reviews (extiende User y Product)

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

### Configuracion del gateway

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

### Query de cliente (entre servicios)

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

## Explicacion

Federation funciona a traves de tres directivas:

- **`@key(fields: "id")`** — declara la primary key de una entidad. El gateway usa esta key para solicitar la entidad desde cualquier subgrafo que la gestione.
- **`@extends`** — marca un tipo como extension. El subgrafo no gestiona el tipo pero le anade campos.
- **`@external`** — marca un campo como gestionado por otro subgrafo. El resolver recibe el valor de este campo desde el gateway.

Cuando un cliente consulta `user(id: "123") { orders { total } }`, el gateway:

1. Envia la query al subgrafo de usuarios para resolver `user(id: "123")` y obtener `id`, `name`, `email`
2. Envia el `id` al subgrafo de ordenes via `_entities` para resolver `User.orders`
3. Fusiona los resultados y devuelve un unico objeto `User` al cliente

El resolver `__resolveReference` se llama cuando el gateway solicita una entidad por su key. Cada subgrafo que gestiona la entidad debe implementar este resolver para obtener los campos base.

## Variantes

| Enfoque | Directivas | Ideal para |
|---------|-----------|------------|
| Key unica | `@key(fields: "id")` | Entidades estandar con un ID |
| Key compuesta | `@key(fields: "orgId id")` | Entidades multi-tenant o particionadas |
| Multiples keys | `@key(fields: "id") @key(fields: "email")` | Lookup por diferentes identificadores |
| Entidad con campos calculados | `@requires` | Campos calculados desde otros subgrafos |
| Campos compartibles | `@shareable` | Campos resueltos por multiples subgrafos |

## Buenas practicas

- **Un servicio gestor por entidad** — solo un subgrafo debe definir el tipo base. Los demas usan `@extends`.
- **Usa `__resolveReference` eficientemente** — el gateway lo llama para cada referencia de entidad. Batchea llamadas a base de datos cuando se solicitan multiples entidades.
- **Mantén entidades pequenas** — solo declara campos que este subgrafo gestiona. Extender con demasiados campos crea un query plan pesado.
- **Usa `@requires` para campos calculados** — si un campo necesita datos de otro subgrafo, declaralo con `@requires` para que el gateway obtenga la dependencia primero.
- **Versiona entidades con cuidado** — cambiar campos `@key` rompe el gateway. Anade nuevas keys antes de eliminar las viejas.

## Errores comunes

- **`__resolveReference` faltante** — sin el, el gateway no puede resolver referencias de entidad desde otros subgrafos. La query falla con un error en runtime.
- **Declarar `@extends` sin `@external`** — los tipos extendidos deben marcar campos heredados como `@external`. Olvidarlo causa errores de validacion del esquema.
- **Multiples subgrafos gestionando la misma entidad** — solo un subgrafo debe definir el tipo base. Los demas deben usar `@extends`.
- **Referencias circulares de entidad** — Subgrafo A extiende User con ordenes, Subgrafo B extiende Order con user. El gateway lo maneja, pero queries circulares profundas crean query plans costosos.
- **No testear el query plan** — usa el query plan viewer de Apollo Studio para verificar que el gateway obtiene campos del subgrafo correcto en el orden correcto.

## Preguntas frecuentes

### En que se diferencia federation de schema stitching?

Federation es una especificacion: los subgrafos implementan `@key`, `@extends` y `_entities`. El gateway usa esto para construir un query plan. Schema stitching fusiona esquemas manualmente con logica de delegacion personalizada. Federation es mas estructurado; stitching es mas flexible.

### Puede un subgrafo extender una entidad que no gestiona?

Si. Ese es el nucleo de federation. El subgrafo usa `@extends` y `@external` para anadir campos. El gateway enruta peticiones de campos al subgrafo gestor para campos base y al subgrafo extensor para los nuevos campos.

### Para que sirve `@requires`?

`@requires` permite a un subgrafo calcular un campo usando datos de otro subgrafo. Por ejemplo, el subgrafo de envios puede definir `User.shippingCost` con `@requires(fields: "address")` donde `address` es gestionado por el subgrafo de usuarios. El gateway obtiene `address` primero, luego lo pasa al subgrafo de envios.

### Puedo usar federation con servicios REST?

No directamente. Los subgrafos deben ser servicios GraphQL que implementan la especificacion de federation. Para integrar REST, crea un wrapper GraphQL que llame a la API REST y exponlo como subgrafo.


## Temas Avanzados

### Escenario: Federation para Microservicios GraphQL

```graphql
# Subgraph A: Users service
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
  # @external: resuelto por otro subgraph
  orders: [Order!] @requires(fields: "id")
}

# Subgraph B: Orders service
type Order @key(fields: "id") {
  id: ID!
  userId: ID!
  total: Float!
  # @provides: este subgraph resuelve el campo
  user: User @provides(fields: "name")
}

# Query: el gateway une ambos subgraphs
query {
  user(id: "123") {
    name        # resuelto por Users service
    orders {    # resuelto por Orders service
      id
      total
    }
  }
}
```

```typescript
// Apollo Federation: resolver entity reference
const resolvers = {
  User: {
    // __resolveReference: llamado cuando otro subgraph referencia User
    __resolveReference(user, ctx) {
      return ctx.dataSources.userAPI.getUserById(user.id);
    },
    orders(user, _, ctx) {
      return ctx.dataSources.orderAPI.getOrdersByUserId(user.id);
    },
  },
  Order: {
    __resolveReference(order, ctx) {
      return ctx.dataSources.orderAPI.getOrderById(order.id);
    },
    user(order, _, ctx) {
      return { __typename: "User", id: order.userId };
    },
  },
};

// Gateway: une los subgraphs
const gateway = new ApolloGateway({
  serviceList: [
    { name: "users", url: "http://users-service:4001/graphql" },
    { name: "orders", url: "http://orders-service:4002/graphql" },
  ],
});

const server = new ApolloServer({ gateway });
```

Lecciones:
  - Federation: multiples subgraphs exponen un schema unificado
  - @key: define el campo que identifica la entidad entre subgraphs
  - __resolveReference: resuelve la entidad cuando otro subgraph la referencia
  - El gateway enruta la query a los subgraphs correspondientes
  - Cada servicio es independiente: deploy, scaling, equipo separado
  - @extends: anadir campos a un tipo definido en otro subgraph
```

### Federation vs Schema Stitching: cual uso?

Federation es el estandar moderno de Apollo: cada subgraph usa directivas (@key, @provides, @requires) y el gateway resuelve automaticamente. Schema Stitching es manual: el gateway define resolvers que llaman a cada servicio. Federation es declarativo: el gateway infiere el plan de ejecucion. Stitching es imperativo: tu escribes los resolvers del gateway. Para nuevos proyectos, Federation. Para integrar APIs existentes no-Apollo, Stitching.
