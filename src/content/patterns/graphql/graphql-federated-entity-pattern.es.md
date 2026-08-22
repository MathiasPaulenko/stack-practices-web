---
contentType: patterns
slug: graphql-federated-entity-pattern
title: "Patrón de entidades federadas en GraphQL"
description: "Compartí una entidad entre subgraphs de Apollo Federation. Usá @key, @external y @shareable para que cada servicio maneje los campos que conoce."
metaDescription: "Compartí una entidad GraphQL entre subgraphs de Apollo Federation. Aprendé cómo @key, @external y @shareable permiten que cada servicio maneje sus campos."
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
  metaDescription: "Compartí una entidad GraphQL entre subgraphs de Apollo Federation. Aprendé cómo @key, @external y @shareable permiten que cada servicio maneje sus campos."
  keywords:
    - federacion graphql
    - entidades federadas
    - apollo federation
    - subgraph
    - entidad
---

En Apollo Federation, una entidad es un object type al que varios subgraphs pueden contribuir al
mismo tiempo. Un servicio posee los campos base, otros agregan los suyos y el gateway fusiona todo
en un único tipo GraphQL.

Este patrón mantiene cada subgraph enfocado en los datos que ya maneja. Un servicio de usuarios
posee `User.name`, un servicio de órdenes agrega `User.orders` y uno de reseñas agrega
`User.reviews`. El cliente consulta un único esquema, pero el gateway direcciona cada campo al
servicio correcto.

## Cuándo Usarlo

- Diferentes microservicios poseen distintos campos del mismo objeto de dominio.
- Querés una API GraphQL unificada sin construir un esquema monolítico.
- El schema stitching se siente demasiado manual o propenso a errores.
- Los equipos necesitan desplegar y ser dueños de su parte del grafo de forma independiente.

## Cuándo NO Usarlo

- La entidad solo se lee o escribe desde un único servicio. Un esquema GraphQL común es más simple.
- Los subgraphs están fuertemente acoplados y comparten la misma base de datos. Federation agrega
    complejidad innecesaria.
- Todavía estás en un servidor GraphQL que no soporta el spec de Apollo Federation.

## Solución

### Subgraph A: Servicio de Usuarios (posee la entidad)

El subgraph base declara la entidad con `@key` e implementa `__resolveReference` para que el gateway
pueda obtenerla por su clave.

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
console.log(`Servicio de usuarios listo en ${url}`);
```

### Subgraph B: Servicio de Órdenes (extiende la entidad)

El subgraph de órdenes no posee `User`, pero le agrega `User.orders`. El campo `id` se marca como
`@external` porque otro servicio lo posee. `resolvable: false` indica que este subgraph no puede
traer un `User` por clave por sí solo.

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

### Subgraph C: Servicio de Reseñas (extiende la entidad nuevamente)

Otro subgraph también puede extender `User`. Cada uno declara solo los campos que conoce.

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

El gateway consulta cada subgraph por su esquema, arma el supergraph y enruta campos
automáticamente.

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
console.log(`Gateway listo en ${url}`);
```

### Consulta del Cliente

El cliente ve un único tipo `User`, aunque los campos provengan de tres servicios.

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

## Explicación

Federation resuelve esa consulta en tres pasos:

1. El gateway pide al subgraph de **usuarios** `user(id: "123")` y los campos base `id`, `name`,
    `email`.
2. Envía el `id` a los subgraphs de **órdenes** y **reseñas** a través de la query `_entities`,
    pidiendo `orders` y `reviews`.
3. Fusiona los resultados en un único objeto `User` y lo devuelve al cliente.

Las piezas clave son:

- **`@key(fields: "id")`** — indica al gateway cómo identificar la entidad entre subgraphs.
- **`@external`** — marca un campo que este subgraph usa pero no posee.
- **`resolvable: false`** — avisa que el subgraph no puede resolver la entidad por clave por sí
    solo.
- **`__resolveReference`** — el resolver que el gateway llama cuando necesita obtener una entidad
    por su clave.

## Variantes

| Variante | Directiva | Caso de Uso |
| --- | --- | --- |
| Clave simple | `@key(fields: "id")` | La mayoría de entidades con un ID primario |
| Clave compuesta | `@key(fields: "tenantId id")` | Entidades multi-tenant o particionadas |
| Múltiples claves | `@key(fields: "id") @key(fields: "email")` | Búsqueda por más de un identificador |
| Campo calculado | `@requires(fields: "address")` | Un campo que necesita datos de otro subgraph primero |
| Campo compartido | `@shareable` | Un campo resoluble por más de un subgraph |

### Ejemplo de clave compuesta

```graphql
type User @key(fields: "tenantId id") {
  tenantId: ID!
  id: ID!
  name: String!
}
```

### Ejemplo de `@requires`

El subgraph de envío calcula `shippingCost` a partir del `address` del usuario, que pertenece al
subgraph de usuarios.

```graphql
type User @key(fields: "id", resolvable: false) {
  id: ID! @external
  address: String! @external
  shippingCost: Float! @requires(fields: "address")
}
```

El gateway obtiene `address` primero y luego lo pasa al resolver de envío.

## Buenas Prácticas

- Mantené una sola definición base por entidad. Los otros subgraphs agregan campos, pero solo un
    servicio posee el tipo core.
- Agrupá llamadas en `__resolveReference`. El gateway lo llama por cada referencia de entidad, así
    que una query por entidad no escala.
- Marcá los campos clave como `@external` cuando el subgraph no los posea. Olvidar esto genera un
    error de validación de esquema.
- Agregá nuevas claves antes de eliminar las viejas. Cambiar una clave rompe los query plans
    existentes.
- Usá Apollo Studio o el query plan viewer del gateway para verificar que los campos pasen por los
    subgraphs correctos.

## Errores Comunes

- Faltar `__resolveReference` en el subgraph propietario. El gateway no puede obtener la entidad sin
    él.
- Olvidar `@external` en el campo `id` de una extensión. El gateway rechazará el esquema.
- Declarar el tipo base `User` en dos subgraphs. Solo un subgraph debe poseer la definición base.
- Devolver campos extra en `__resolveReference`. Solo devolvé lo que el resolver pidió; el gateway
    obtiene el resto.
- Referencias circulares profundas sin límites. `User.orders.user.orders` puede crear planes de
    consulta muy costosos.

## Preguntas Frecuentes

### ¿En qué se diferencia federation de schema stitching?

Federation usa directivas y el protocolo `_entities` para fusionar esquemas de forma declarativa.
Schema stitching escribe resolvers personalizados en el gateway para delegar campos manualmente.
Federation es más limpio para servicios Apollo; stitching es más flexible para integrar APIs
externas.

### ¿Puede un subgraph extender una entidad que no posee?

Sí. La declara con `@key` y marca el campo clave como `@external`. El gateway enruta los campos base
al subgraph propietario y los nuevos al subgraph extensor.

### ¿Qué hace `@requires`?

Indica al gateway que debe obtener uno o más campos de otro subgraph antes de resolver el campo
anotado. Usalo cuando un campo se calcula a partir de datos que pertenecen a otro lugar.

### ¿Puedo federar servicios REST?

No directamente. Cada subgraph debe exponer un esquema GraphQL que cumpla el spec de Apollo
Federation. Si es necesario, podés envolver una API REST en un subgraph GraphQL liviano.

### ¿Debería marcar todos los campos como `@shareable`?

No. Usá `@shareable` solo cuando el mismo campo pueda resolverse por más de un subgraph. Para la
mayoría de las extensiones, `@key` y `@external` alcanzan.
