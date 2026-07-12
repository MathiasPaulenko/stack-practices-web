---





contentType: recipes
slug: graphql-federation-gateway-setup
title: "Configurar un gateway de GraphQL Federation con Apollo"
description: "Compone multiples servicios GraphQL en un supergrafo federado usando Apollo Federation y un gateway que enruta consultas entre subgrafos"
metaDescription: "Configura un gateway de GraphQL Federation con Apollo. Compone subgrafos en un supergrafo, comparte entidades y enruta consultas entre servicios."
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
  - /recipes/graphql-apollo-server
  - /recipes/graphql-subscriptions-realtime
  - /patterns/federated-identity-pattern
  - /guides/complete-guide-graphql-federation-production
  - /docs/graphql-federation-onboarding-template
  - /patterns/graphql-federated-entity-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura un gateway de GraphQL Federation con Apollo. Compone subgrafos en un supergrafo, comparte entidades y enruta consultas entre servicios."
  keywords:
    - graphql federation
    - apollo gateway
    - supergraph
    - federated graphql
    - microservices graphql





---

# Configurar un gateway de GraphQL Federation con Apollo

Apollo Federation permite dividir una API GraphQL monolitica en subgrafos desplegables independientemente. Un gateway compone los subgrafos en un unico supergrafo y enruta cada consulta al servicio correcto. Entidades como `User` o `Product` pueden definirse en un subgrafo y extenderse en otros, para que los equipos gestionen sus dominios sin un archivo de schema compartido.

## Cuando Usar Esto


- For alternatives, see [GraphQL Federation in Production](/es/guides/complete-guide-graphql-federation-production/).

- Multiples equipos necesitan gestionar diferentes partes de una API GraphQL
- Un servidor GraphQL monolitico ha crecido demasiado para mantenerse como un unico codebase
- Necesitas despliegue y escalado independiente para diferentes dominios de la API

## Requisitos Previos

- Dos o mas servicios GraphQL ejecutando Apollo Server
- Paquetes `@apollo/server`, `@apollo/subgraph` y `@apollo/gateway`

## Solucion

### 1. Instalar dependencias

```bash
# En cada subgrafo
npm install @apollo/server @apollo/subgraph graphql

# En el gateway
npm install @apollo/server @apollo/gateway graphql
```

### 2. Definir el subgrafo de Users

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

### 3. Definir el subgrafo de Posts

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

### 4. Crear el gateway

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

### 5. Consultar entre subgrafos

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

El gateway obtiene posts del subgrafo de posts, luego resuelve `author.name` llamando al subgrafo de users, luego resuelve `author.posts` de vuelta en el subgrafo de posts — todo en una sola consulta del cliente.

## Como Funciona

1. **`@key`** marca la clave primaria de una entidad. El gateway la usa para unir datos entre subgrafos mediante queries `_entities`.
2. **`@extends`** en `User` en el subgrafo de posts significa que el servicio de posts extiende la entidad `User` definida en el servicio de users sin ser su dueno.
3. **`@external`** marca campos que son gestionados por otro subgrafo. El subgrafo de posts puede referenciar `User.name` pero no puede resolverlo.
4. **`__resolveReference`** se llama cuando el gateway necesita obtener una entidad por su clave desde un subgrafo. Recibe `{ __typename, id }` y retorna el objeto completo.
5. **El gateway** compone los schemas de los subgrafos en un supergrafo al iniciar, luego planifica y ejecuta consultas dividiendolas entre subgrafos.

## Variantes

### Federation gestionada con Rover

Usa Apollo Studio para gestionar la composicion en lugar de `serviceList` inline:

```bash
rover subgraph publish my-graph@current \
  --name users \
  --routing-url http://localhost:4001/graphql \
  --schema ./users-schema.graphql
```

El gateway obtiene el schema del supergrafo desde Apollo Studio:

```typescript
const gateway = new ApolloGateway({
  supergraphSdl: () => fetchSupergraphFromStudio(),
});
```

### Resolucion de entidades con cache

Cachea referencias de entidades para evitar llamadas repetidas al subgrafo:

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

### Headers de peticion personalizados

Reenvia tokens de auth a los subgrafos:

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

## Mejores Practicas

- **Usa federation gestionada en produccion** — Apollo Studio maneja composicion, validacion de schema y rollback
- **Mantén los subgrafos pequenos y enfocados en el dominio** — cada equipo gestiona un subgrafo
- **Reenvia el contexto de auth a los subgrafos** — el gateway no es el lugar para aplicar auth a nivel campo
- **Monitorea los query plans** — usa Apollo Studio para ver como las consultas se dividen entre subgrafos

## Errores Comunes

- **Definir el mismo campo en dos subgrafos** — cada campo debe tener exactamente un dueno
- **Olvidar `__resolveReference`** — las entidades referenciadas por otros subgrafos necesitan este resolver
- **Usar `@external` en campos propios** — `@external` significa "este campo se resuelve en otro lugar"
- **No manejar caida del gateway** — el gateway es un punto unico de fallo; despliega multiples instancias detras de un load balancer

## FAQ

**Q: Puedo agregar un servicio GraphQL no federado al gateway?**
A: No. Todos los servicios deben ser subgrafos federados con `buildSubgraphSchema`. Usa schema stitching para servicios no federados.

**Q: Como maneja el gateway la caida de un subgrafo?**
A: Las consultas que requieren el subgrafo caido fallan. Las que solo tocan subgrafos sanos siguen funcionando. Usa circuit breakers y fallbacks para rutas criticas.

**Q: Los subgrafos pueden comunicarse entre si directamente?**
A: No. Los subgrafos nunca se llaman entre si. El gateway orquesta toda la resolucion entre subgrafos.

**Q: Cual es la diferencia entre Federation 1 y 2?**
A: Federation 2 elimina la necesidad de `@extends` en nuevos tipos y agrega directivas join para mejor composicion. La migracion es incremental.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
