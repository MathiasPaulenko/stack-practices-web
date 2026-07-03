---
contentType: patterns
slug: graphql-schema-stitching-pattern
title: "Patron de Schema Stitching en GraphQL"
description: "Combina multiples esquemas GraphQL independientes en un unico esquema unificado que los clientes pueden consultar como un solo grafo."
metaDescription: "Combina multiples esquemas GraphQL en un solo grafo unificado con schema stitching. Fusiona tipos, delega resolvers y expone un unico endpoint."
difficulty: advanced
category: architectural
topics:
  - graphql
  - architecture
  - api
tags:
  - schema-stitching
  - pattern
  - graphql-federation
  - api-gateway
  - schema-merging
relatedResources:
  - /patterns/federated-identity-pattern
  - /patterns/graphql-batched-resolver-pattern
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Combina multiples esquemas GraphQL en un solo grafo unificado con schema stitching. Fusiona tipos, delega resolvers y expone un unico endpoint."
  keywords:
    - schema-stitching
    - pattern
    - graphql-federation
    - api-gateway
    - schema-merging
---

## Descripcion general

Schema stitching fusiona multiples esquemas GraphQL independientes en un unico esquema unificado. Cada subesquema es propietario de sus tipos y resolvers. El gateway stitcheado delega la resolucion de campos al servicio de origen. Los clientes consultan un endpoint y ven un solo grafo, mientras internamente el trabajo se distribuye a multiples servicios.

Esto difiere de federation: stitching trabaja a nivel de esquema (fusionando definiciones de tipos), mientras que federation trabaja a nivel de servicio (cada servicio contribuye con porciones de un grafo compartido). Stitching es mas ligero pero requiere configuracion manual de merge.

## Cuando Usar

- Multiples equipos poseen APIs GraphQL separadas que necesitan un punto de entrada unificado
- Migracion gradual de un esquema GraphQL monolitico a servicios distribuidos
- Agregacion de APIs GraphQL de terceros detras de un unico gateway
- Cuando federation no es factible (servidores no-Apollo, esquemas legacy)

## Cuando No Usar

- Proyectos greenfield donde federation esta disponible desde el inicio
- Esquemas con conflictos de tipos pesados que requieren reglas de merge complejas
- Equipos que necesitan aislamiento estricto en tiempo de ejecucion entre servicios

## Solucion

### 1. Definir Subesquemas

Cada servicio expone su propio esquema de forma independiente.

**Servicio de Usuarios (`users-api`)**

```graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}
```

**Servicio de Posts (`posts-api`)**

```graphql
type Post {
  id: ID!
  title: String!
  body: String!
  authorId: ID!
}

type Query {
  post(id: ID!): Post
  posts: [Post!]!
}
```

### 2. Stitch con `@graphql-tools/stitch`

```typescript
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { createExecutor } from '@graphql-tools/executor-apollo-link';
import { ApolloLink, HttpLink } from '@apollo/client/core';

// Crear executors para cada subesquema
const usersExecutor = createExecutor(
  new ApolloLink(new HttpLink({ uri: 'http://localhost:4001/graphql' }))
);

const postsExecutor = createExecutor(
  new ApolloLink(new HttpLink({ uri: 'http://localhost:4002/graphql' }))
);

// Definir configs de subesquema
const usersSubschema = {
  schema: makeExecutableSchema({
    typeDefs: usersTypeDefs,
    resolvers: usersResolvers,
  }),
  executor: usersExecutor,
};

const postsSubschema = {
  schema: makeExecutableSchema({
    typeDefs: postsTypeDefs,
    resolvers: postsResolvers,
  }),
  executor: postsExecutor,
};
```

### 3. Agregar Tipos Fusionados con Delegacion de Campos

El gateway extiende `User` para incluir `posts` y `Post` para incluir `author`. Los resolvers de campos delegan al subesquema propietario.

```typescript
const linkTypeDefs = `
  extend type User {
    posts: [Post!]!
  }

  extend type Post {
    author: User!
  }
`;

const gatewaySchema = stitchSchemas({
  subschemas: [usersSubschema, postsSubschema],
  typeDefs: linkTypeDefs,
  resolvers: {
    User: {
      posts: {
        selectionSet: '{ id }',
        resolve: (user, _args, context, info) => {
          return info.mergeInfo.delegateToSchema({
            schema: postsSubschema,
            operation: 'query',
            fieldName: 'posts',
            args: { authorId: user.id },
            context,
            info,
          });
        },
      },
    },
    Post: {
      author: {
        selectionSet: '{ authorId }',
        resolve: (post, _args, context, info) => {
          return info.mergeInfo.delegateToSchema({
            schema: usersSubschema,
            operation: 'query',
            fieldName: 'user',
            args: { id: post.authorId },
            context,
            info,
          });
        },
      },
    },
  },
});
```

### 4. Iniciar el Gateway

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer({ schema: gatewaySchema });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Gateway listo en ${url}`);
```

### 5. Consultar el Grafo Unificado

Los clientes consultan ambos servicios a traves de una sola peticion:

```graphql
query {
  user(id: "1") {
    name
    email
    posts {
      title
      body
    }
  }
}
```

El gateway resuelve `name` y `email` desde el servicio de usuarios, luego delega `posts` al servicio de posts usando el campo `id` del usuario.

## Explicacion

- **Subesquemas**: Cada servicio funciona independientemente con su propio esquema y resolvers
- **Executor**: Envia operaciones al endpoint del subesquema remoto via HTTP
- **Tipos de enlace**: Extensiones de tipo (`extend type User { posts: [Post!]! }`) crean relaciones entre servicios
- **Delegacion**: `delegateToSchema` reenvia una resolucion de campo al subesquema propietario, pasando los campos del objeto padre como argumentos
- **Selection set**: Le dice al stitcher que campos del objeto padre se necesitan para la delegacion (`{ id }` para `User.posts`, `{ authorId }` para `Post.author`)

## Variantes

### Delegacion Batch

En lugar de resolver `posts` por usuario, agrupa la busqueda:

```typescript
User: {
  posts: {
    selectionSet: '{ id }',
    resolve: async (user, _args, context, info) => {
      const result = await info.mergeInfo.delegateToSchema({
        schema: postsSubschema,
        operation: 'query',
        fieldName: 'postsByAuthorIds',
        args: { authorIds: [user.id] },
        context,
        info,
      });
      return result;
    },
  },
},
```

Para listas de usuarios, usa un resolver batch que recolecta todos los valores de `authorId` y hace una sola peticion.

### Campos Calculados

Agrega campos que no existen en ningun subesquema pero se calculan en el gateway:

```typescript
const gatewaySchema = stitchSchemas({
  subschemas: [usersSubschema, postsSubschema],
  resolvers: {
    User: {
      postCount: {
        selectionSet: '{ id }',
        resolve: async (user, _args, context, info) => {
          const posts = await info.mergeInfo.delegateToSchema({
            schema: postsSubschema,
            operation: 'query',
            fieldName: 'posts',
            args: { authorId: user.id },
            context,
            info,
          });
          return posts.length;
        },
      },
    },
  },
});
```

### Type Merging

Para esquemas que comparten un tipo (ej. ambos servicios definen `User`), configura reglas de merge:

```typescript
const usersSubschema = {
  schema: usersSchema,
  executor: usersExecutor,
  merge: {
    User: {
      selectionSet: '{ id }',
      fieldName: 'user',
      args: (originalResult) => ({ id: originalResult.id }),
    },
  },
};
```

## Mejores Practicas

- Mantener los subesquemas pequenos y enfocados en un dominio
- Usar `selectionSet` en cada campo fusionado para evitar over-fetching
- Batchear delegaciones al resolver campos de lista para evitar llamadas N+1
- Cachear resultados del executor cuando sea posible para reducir latencia del gateway
- Documentar que servicio posee que tipo para evitar conflictos de merge
- Monitorear latencia de delegacion — el gateway anade un hop de red por delegacion

## Errores Comunes

- **Falta `selectionSet`**: Sin el, el stitcher puede no tener los campos necesarios para la delegacion, causando resultados null
- **Dependencias circulares**: Servicio A extiende el tipo de Servicio B, Servicio B extiende el tipo de Servicio A — funciona pero crea bucles infinitos de resolucion si no se tiene cuidado
- **Campos de query raiz superpuestos**: Dos subesquemas que definen `Query.user(id: ID!)` — configurar reglas de merge o renombrar uno
- **No batchear delegaciones de lista**: Resolver `posts` para 50 usuarios uno por uno causa 50 peticiones al servicio de posts
- **Ignorar propagacion de errores**: Los errores de los subesquemas necesitan mapeo adecuado a nivel de gateway

## FAQ

**Schema stitching vs federation — cual usar?**

Federation (Apollo Federation) es el estandar moderno para GraphQL distribuido. Usa stitching cuando tienes servidores no-Apollo, esquemas legacy, o necesitas merging mas ligero sin el runtime de federation.

**Puedo stitcheear APIs REST?**

Si. Envuelve endpoints REST como subesquemas GraphQL usando `@graphql-tools/wrap` y un executor personalizado que traduce operaciones GraphQL a llamadas HTTP.

**Como maneja stitching la autenticacion?**

El gateway extrae tokens de auth de las peticiones entrantes y los reenvia a los subesquemas via el `context` del executor. Cada subesquema aplica sus propias reglas de autorizacion.

**Que hay del rendimiento?**

Cada delegacion anade un round-trip de red. Usa batching, caching y DataLoader a nivel de gateway para minimizar llamadas. Para escenarios de alto trafico, considera federation con su query planning.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
