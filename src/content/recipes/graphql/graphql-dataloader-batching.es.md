---
contentType: recipes
slug: graphql-dataloader-batching
title: "Batch y cache de consultas con GraphQL DataLoader"
description: "Usa DataLoader para agrupar peticiones de carga individuales en llamadas batch a la base de datos, resolviendo el problema N+1 en resolvers GraphQL"
metaDescription: "Resuelve consultas N+1 en GraphQL con DataLoader. Agrupa llamadas a la base de datos entre resolvers y cachea resultados dentro del ciclo de vida de la peticion."
difficulty: intermediate
topics:
  - graphql
  - api
  - performance
tags:
  - graphql
  - dataloader
  - n+1
  - batching
  - performance
relatedResources:
  - /recipes/api/graphql-apollo-server
  - /recipes/graphql/graphql-pagination-relay-connections
  - /patterns/graphql/graphql-dataloader-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Resuelve consultas N+1 en GraphQL con DataLoader. Agrupa llamadas a la base de datos entre resolvers y cachea resultados dentro del ciclo de vida de la peticion."
  keywords:
    - graphql dataloader
    - n+1 query
    - batch loading
    - graphql performance
    - dataloader batching
---

# Batch y cache de consultas con GraphQL DataLoader

Cuando una consulta GraphQL resuelve relaciones anidadas — como obtener el autor de cada post en una lista — un resolver naive emite una consulta por item. Este es el problema N+1: una consulta para la lista, mas N consultas para los datos relacionados. DataLoader resuelve esto recolectando peticiones individuales dentro de un mismo tick del event loop y despachandolas como una sola consulta batch.

## Cuando Usar Esto

- Resolvers que obtienen datos relacionados por foreign key (post.author, user.posts, order.items)
- Cualquier schema GraphQL con relaciones de tipos anidadas
- APIs donde las consultas N+1 causan latencia o agotamiento de conexiones

## Requisitos Previos

- Node.js 18+ con un servidor GraphQL (Apollo Server, GraphQL Yoga)
- Un cliente de base de datos que soporte consultas `WHERE id IN (...)`

## Solucion

### 1. Instalar DataLoader

```bash
npm install dataloader
```

### 2. Crear una funcion de carga batch

```typescript
// loaders.ts
import DataLoader from 'dataloader';

type User = { id: string; name: string; email: string };
type Post = { id: string; title: string; authorId: string };

export function createUserLoader(db: { users: { findMany: (opts: any) => Promise<User[]> } }) {
  return new DataLoader<string, User>(async (userIds: readonly string[]) => {
    const users = await db.users.findMany({
      where: { id: { in: [...userIds] } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return userIds.map((id) => userMap.get(id) ?? new Error(`User ${id} not found`));
  });
}

export function createPostLoader(db: { posts: { findMany: (opts: any) => Promise<Post[]> } }) {
  return new DataLoader<string, Post[]>(async (authorIds: readonly string[]) => {
    const posts = await db.posts.findMany({
      where: { authorId: { in: [...authorIds] } },
    });

    return authorIds.map((authorId) =>
      posts.filter((p) => p.authorId === authorId)
    );
  });
}
```

### 3. Inyectar loaders por peticion

Crea una instancia nueva de DataLoader por peticion para que la cache solo viva durante esa peticion:

```typescript
// context.ts
import { createUserLoader, createPostLoader } from './loaders';

export type Context = {
  db: DbConnection;
  user: User | null;
  loaders: {
    user: DataLoader<string, User>;
    postsByAuthor: DataLoader<string, Post[]>;
  };
};

export function createContext(db: DbConnection): Context {
  return {
    db,
    user: null,
    loaders: {
      user: createUserLoader(db),
      postsByAuthor: createPostLoader(db),
    },
  };
}
```

### 4. Usar loaders en los resolvers

```typescript
// resolvers.ts
export const resolvers = {
  Query: {
    posts: (_: unknown, __: unknown, ctx: Context) =>
      ctx.db.posts.findMany({ take: 20 }),
  },

  Post: {
    author: (post: Post, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(post.authorId),
  },

  User: {
    posts: (user: User, _: unknown, ctx: Context) =>
      ctx.loaders.postsByAuthor.load(user.id),
  },
};
```

### 5. Conectar en Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { createContext } from './context';
import { db } from './db';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const ctx = createContext(db);
    const token = req.headers.authorization?.replace('Bearer ', '');
    ctx.user = token ? await verifyToken(token) : null;
    return ctx;
  },
});

console.log(`Server ready at ${url}`);
```

## Como Funciona

1. **Batching**: DataLoader recolecta todas las llamadas `.load(id)` dentro del mismo tick. Cuando `process.nextTick` se ejecuta, las despacha como una sola llamada batch con todos los IDs.
2. **Cache**: Tras retornar la funcion batch, los resultados se cachean por clave. Llamadas subsecuentes a `.load(id)` para la misma clave retornan el valor cacheado sin tocar la base de datos.
3. **Aislamiento por peticion**: Una nueva instancia de DataLoader se crea en el context factory para cada peticion. Esto evita fugas de cache entre peticiones.
4. **Manejo de errores**: Si la funcion batch retorna un `Error` para una clave especifica, ese error se lanza al llamar `.load(id)` para esa clave — las demas claves del batch no se ven afectadas.

## Variantes

### DataLoader con Redis

Para cache compartido entre peticiones, envuelve la funcion batch con una busqueda en Redis:

```typescript
export function createRedisUserLoader(redis: RedisClient, db: DbConnection) {
  return new DataLoader<string, User>(async (ids: readonly string[]) => {
    const cached = await redis.mget(ids.map((id) => `user:${id}`));
    const uncachedIds = ids.filter((_, i) => !cached[i]);

    const fresh = await db.users.findMany({ where: { id: { in: uncachedIds } } });
    await Promise.all(fresh.map((u) => redis.set(`user:${u.id}`, JSON.stringify(u), 'EX', 300)));

    const userMap = new Map(fresh.map((u) => [u.id, u]));
    return ids.map((id, i) => cached[i] ? JSON.parse(cached[i]!) : userMap.get(id)!);
  });
}
```

### Scheduler de batch personalizado

Para escenarios de alto rendimiento, usa un scheduler personalizado para controlar cuando se despachan los batches:

```typescript
const loader = new DataLoader(batchFn, {
  batchScheduleFn: (callback) => setTimeout(callback, 10),
});
```

## Mejores Practicas

- **Crea loaders por peticion** — nunca compartas instancias de DataLoader entre peticiones; la cache filtra datos entre usuarios
- **Ordena los resultados del batch para coincidir con el orden de entrada** — DataLoader espera que el array de retorno se alinee con el orden de las claves de entrada
- **Retorna errores por clave** — lanza `new Error()` para claves faltantes en lugar de rechazar todo el batch
- **Deshabilita el batching para cargas de un solo item** — usa `{ batch: false }` cuando sabes que un loader solo cargara una clave

## Errores Comunes

- **Compartir un DataLoader entre peticiones** — causa datos obsoletos y contaminacion de cache entre usuarios
- **No retornar resultados en el orden de entrada** — DataLoader mapea resultados por posicion, no por clave; arrays desalineados producen datos incorrectos
- **Usar `.load()` en un bucle sin await** — DataLoader agrupa automaticamente, pero debes seguir esperando cada llamada `.load()`
- **Cachear entre peticiones con la cache por defecto** — usa `{ cache: false }` o una cache por peticion si necesitas cache entre peticiones

## FAQ

**Q: DataLoader cachea entre peticiones?**
A: No. La cache por defecto es por instancia. Como creas una instancia nueva por peticion, la cache es por peticion. Para cache entre peticiones, usa Redis u otro almacen compartido.

**Q: Puedo usar DataLoader con codigo no-GraphQL?**
A: Si. DataLoader funciona donde necesites agrupar cargas asincronas individuales. No esta ligado a GraphQL.

**Q: Que pasa si una funcion batch lanza un error?**
A: El error se propaga a todas las llamadas `.load()` pendientes de ese batch. Maneja errores por clave retornando objetos `Error` en el array de resultados.

**Q: Debo usar DataLoader para relaciones uno-a-muchos?**
A: Si. Para uno-a-muchos (ej. user.posts), la funcion batch agrupa resultados por foreign key y retorna arrays por clave.
