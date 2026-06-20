---
contentType: recipes
slug: graphql-apollo-server
title: "Construye una API GraphQL con Apollo Server y TypeScript"
description: "Como construir una API GraphQL lista para produccion usando Apollo Server, TypeScript y DataLoader para resolver el problema de consultas N+1"
metaDescription: "Construye una API GraphQL con Apollo Server y TypeScript. Usa DataLoader para consultas N+1, implementa autenticacion y estructura resolvers limpiamente."
difficulty: intermediate
topics:
  - api
tags:
  - graphql
  - api
  - typescript
  - nodejs
relatedResources:
  - /patterns/design/adapter-pattern-api
  - /recipes/api/call-rest-api
  - /guides/api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye una API GraphQL con Apollo Server y TypeScript. Usa DataLoader para consultas N+1, implementa autenticacion y estructura resolvers limpiamente."
  keywords:
    - graphql
    - apollo server
    - typescript
    - dataloader
    - api design
---

# Construye una API GraphQL con Apollo Server y TypeScript

GraphQL permite a los clientes solicitar exactamente los datos que necesitan en una sola consulta. Apollo Server proporciona un framework listo para produccion para construir APIs GraphQL con desarrollo schema-first, soporte integrado de suscripciones y un rico ecosistema de plugins.

## Cuando Usar Esto

- Los clientes necesitan consultas flexibles sobre un modelo de dominio complejo
- Quieres reducir over-fetching y under-fetching comunes en [APIs REST](/recipes/api/call-rest-api)
- Las actualizaciones en tiempo real via suscripciones son un requerimiento

## Requisitos Previos

- Node.js 18+
- Comprension basica de sintaxis de schemas GraphQL

## Solucion

### 1. Instalar Dependencias

```bash
npm install @apollo/server graphql graphql-tag
npm install -D @types/node typescript
```

### 2. Definir el Schema

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    users(limit: Int = 10): [User!]!
    posts: [Post!]!
  }

  type Mutation {
    createPost(title: String!, content: String!, authorId: ID!): Post!
  }
`;
```

### 3. Implementar Resolvers con DataLoader

```typescript
// resolvers.ts
import DataLoader from 'dataloader';

// Carga batch de usuarios por ID para resolver N+1
const createUserLoader = (db: DbConnection) =>
  new DataLoader(async (userIds: readonly string[]) => {
    const users = await db.users.findMany({ where: { id: { in: [...userIds] } } });
    return userIds.map(id => users.find(u => u.id === id));
  });

export const createResolvers = (db: DbConnection) => {
  const userLoader = createUserLoader(db);

  return {
    Query: {
      user: (_: unknown, { id }: { id: string }) => db.users.findById(id),
      users: (_: unknown, { limit }: { limit: number }) =>
        db.users.findMany({ take: limit }),
      posts: () => db.posts.findMany(),
    },

    Mutation: {
      createPost: (_: unknown, args: { title: string; content: string; authorId: string }) =>
        db.posts.create(args),
    },

    Post: {
      author: (post: Post) => userLoader.load(post.authorId),
    },

    User: {
      posts: (user: User) => db.posts.findMany({ where: { authorId: user.id } }),
    },
  };
};
```

### 4. Crear el Servidor

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { createResolvers } from './resolvers';
import { db } from './db';

const server = new ApolloServer({
  typeDefs,
  resolvers: createResolvers(db),
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;
    return { user, db };
  },
});

console.log(`Servidor listo en ${url}`);
```

### 5. Middleware de [Autenticación](/guides/security/api-security-checklist-guide)

```typescript
// auth.ts
export const authDirective = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
      if (authDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = (source, args, context, info) => {
          if (!context.user) throw new Error('No autorizado');
          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
```

## Como Funciona

1. **Definicion de Schema** sirve como contrato entre cliente y servidor
2. **Resolvers** obtienen datos para cada campo, componibles y testeables independientemente
3. **DataLoader** agrupa peticiones en un solo tick del event loop
4. **Context** transporta autenticacion y conexiones a base de datos por peticion

## Consideraciones de Produccion

- Usa **Apollo Federation** para componer multiples servicios GraphQL en un gateway unificado
- Habilita **cacheo de respuestas** con directivas `@cacheControl` para consultas GET
- Implementa [rate limiting](/recipes/api/api-rate-limiting-redis) por complejidad de operacion, no solo conteo de peticiones
- Agrega **safelisting de operaciones** para prevenir consultas arbitrarias costosas en produccion

## FAQ

**P: Debo usar Apollo Server o GraphQL Yoga?**
R: Apollo Server tiene el ecosistema mas grande. Yoga es mas ligero y rapido para casos simples. Ambos son aptos para produccion.

**P: Como manejo uploads de archivos en GraphQL?**
R: Usa `graphql-upload-minimal` con peticiones multipart, o prefiere un endpoint REST separado para archivos grandes.

**P: Cuando deberia evitar GraphQL?**
R: Para CRUD simple con pocas relaciones, [REST](/recipes/api/call-rest-api) es usualmente mas simple. GraphQL brilla cuando los clientes necesitan consultas flexibles sobre grafos complejos.
