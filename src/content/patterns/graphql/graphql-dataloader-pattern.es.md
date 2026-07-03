---
contentType: patterns
slug: graphql-dataloader-pattern
title: "Patron DataLoader en GraphQL"
description: "Consolida llamadas de carga individuales en llamadas batch con cache por peticion para prevenir queries N+1 y fetches redundantes."
metaDescription: "Consolida llamadas de carga individuales en llamadas batch con DataLoader. Cache por peticion, deduplicacion y batching automatico."
difficulty: intermediate
category: structural
topics:
  - graphql
  - performance
  - api
tags:
  - dataloader
  - pattern
  - batching
  - caching
  - n-plus-1
relatedResources:
  - /patterns/graphql-batched-resolver-pattern
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Consolida llamadas de carga individuales en llamadas batch con DataLoader. Cache por peticion, deduplicacion y batching automatico."
  keywords:
    - dataloader
    - pattern
    - batching
    - caching
    - n-plus-1
---

## Descripcion general

DataLoader es una utilidad generica que consolida llamadas individuales de `load()` en una sola peticion batch. Fue construido en Facebook para resolver el problema N+1 en servidores GraphQL. Dentro de un tick del event loop, todas las llamadas a `load(key)` se recolectan, se deduplican, y se pasan a una funcion batch que obtiene todas las claves a la vez. Los resultados se cachean por la vida util de la instancia del loader.

El patron no es especifico de GraphQL — funciona en cualquier lugar donde necesites batchear lookups async individuales. Pero brilla en GraphQL donde los resolvers anidados piden datos relacionados de forma independiente.

## Cuando Usar

- Resolvers GraphQL que obtienen entidades relacionadas por item padre
- Cualquier patron de lookup async donde llamadas individuales pueden batchearse (base de datos, REST, gRPC)
- Prevenir fetches duplicados cuando la misma clave se pide multiples veces en una operacion
- Capas de gateway o BFF que agregan datos de multiples servicios backend

## Cuando No Usar

- Lookups de un solo item sin oportunidad de batching (N=1)
- Acceso a datos sincrono (DataLoader es solo async)
- Caches de larga duracion (DataLoader cachea por peticion, no entre peticiones)
- Subscripciones en tiempo real donde el batching anade latencia

## Solucion

### 1. Configuracion Basica de DataLoader

```typescript
import DataLoader from 'dataloader';

type User = { id: string; name: string; email: string };

async function batchUsers(ids: readonly string[]): Promise<User[]> {
  // Una sola query para todos los IDs pedidos
  const rows = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
  const map = new Map(rows.map((r) => [r.id, r]));

  // Debe retornar en el mismo orden que los ids de entrada
  return ids.map((id) => map.get(id) ?? new Error(`User ${id} not found`));
}

const userLoader = new DataLoader(batchUsers);
```

### 2. Usar en Resolvers GraphQL

```typescript
const resolvers = {
  Query: {
    posts: (_parent, _args, { db }) => db.post.findMany({ take: 20 }),
  },
  Post: {
    author: (post, _args, { loaders }) => loaders.userLoader.load(post.authorId),
    comments: (post, _args, { loaders }) =>
      loaders.commentLoader.loadMany(post.commentIds),
  },
  Comment: {
    author: (comment, _args, { loaders }) => loaders.userLoader.load(comment.authorId),
  },
};
```

Cuando una query pide 20 posts con sus autores y comentarios con sus autores, DataLoader batchea:
- Una llamada a `batchUsers` con todos los IDs de autor unicos de posts y comentarios
- Una llamada a `batchComments` con todos los arrays de IDs de comentarios

### 3. Contexto por Peticion

Crear loaders frescos para cada operacion GraphQL:

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

function createLoaders(db) {
  return {
    userLoader: new DataLoader((ids) => batchUsers(ids, db)),
    commentLoader: new DataLoader((ids) => batchComments(ids, db)),
    productLoader: new DataLoader((ids) => batchProducts(ids, db)),
  };
}

const server = new ApolloServer({ typeDefs, resolvers });

startStandaloneServer(server, {
  context: async ({ req }) => {
    const db = getDb();
    return {
      db,
      loaders: createLoaders(db),
      user: parseAuth(req.headers.authorization),
    };
  },
  listen: { port: 4000 },
});
```

### 4. Caching y Deduplicacion

```typescript
// Si dos posts tienen el mismo authorId, el usuario se obtiene una vez
const posts = [
  { id: 1, authorId: 'user-10' },
  { id: 2, authorId: 'user-10' }, // mismo usuario
  { id: 3, authorId: 'user-20' },
];

// Cada resolver llama loaders.userLoader.load(post.authorId)
// DataLoader recolecta: ['user-10', 'user-10', 'user-20']
// Deduplica a: ['user-10', 'user-20']
// Una llamada batch, retorna resultado cacheado para el segundo 'user-10'
```

### 5. Primear el Cache

Cuando ya tienes datos, primea el loader para evitar fetches redundantes:

```typescript
const resolvers = {
  Query: {
    user: async (_parent, { id }, { db, loaders }) => {
      const user = await db.user.findById(id);

      // Primear el cache — resolvers anidados que llamen load(id) obtienen esto al instante
      loaders.userLoader.prime(id, user);

      return user;
    },
  },
};
```

### 6. Limpiar Cache Despues de Mutaciones

```typescript
const resolvers = {
  Mutation: {
    updateUser: async (_parent, { id, input }, { db, loaders }) => {
      const user = await db.user.update(id, input);

      // Limpiar entrada stale del cache — el proximo load() re-fetcheara
      loaders.userLoader.clear(id);

      return user;
    },
  },
};
```

## Explicacion

- **Batching**: Todas las llamadas `load()` dentro de un tick del event loop se recolectan. DataLoader luego llama la funcion batch una vez con todas las claves
- **Deduplicacion**: Claves duplicadas en el mismo batch se piden una vez. Todos los callers reciben la misma Promise
- **Cache por peticion**: El cache es un `Map` en la instancia del loader. Como se crea un loader nuevo por peticion, el cache esta aislado
- **Contrato de orden**: La funcion batch debe retornar un array de la misma longitud que la entrada, en el mismo orden. DataLoader empareja resultados a callers por indice
- **Manejo de errores**: Retornar un objeto `Error` en un indice especifico para rechazar solo ese caller, no todo el batch

## Variantes

### DataLoader con Prisma

```typescript
const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
  });
  const map = new Map(users.map((u) => [u.id, u]));
  return ids.map((id) => map.get(id));
});
```

### DataLoader con Pipeline de Redis

```typescript
const sessionLoader = new DataLoader(async (sessionIds: readonly string[]) => {
  const pipeline = redis.pipeline();
  sessionIds.forEach((id) => pipeline.get(`session:${id}`));
  const results = await pipeline.exec();
  return results.map(([err, value]) => {
    if (err) return new Error(err.message);
    return value ? JSON.parse(value) : null;
  });
});
```

### Cache Key Function Personalizado

Para claves compuestas o no-string:

```typescript
const permissionLoader = new DataLoader(
  async (keys: readonly { userId: string; resource: string }[]) => {
    const permissions = await db.permission.findMany({
      where: { OR: keys.map((k) => ({ userId: k.userId, resource: k.resource })) },
    });
    const map = new Map(
      permissions.map((p) => [`${p.userId}:${p.resource}`, p])
    );
    return keys.map((k) => map.get(`${k.userId}:${k.resource}`));
  },
  {
    cacheKeyFn: (key) => `${key.userId}:${key.resource}`,
  }
);
```

### Tamano Maximo de Batch

Limitar el tamano del batch para restricciones de queries de base de datos:

```typescript
const userLoader = new DataLoader(batchUsers, {
  maxBatchSize: 50,  // Max 50 IDs por query SELECT ... IN (...)
  batchScheduleFn: (callback) => setTimeout(callback, 10), // ventana de 10ms
});
```

### Deshabilitar Cache para Datos Mutables

```typescript
const stockPriceLoader = new DataLoader(batchStockPrices, {
  cache: false, // Los precios de acciones cambian constantemente — no cachear
});
```

## Mejores Practicas

- Crear una nueva instancia de DataLoader por peticion — nunca compartir entre peticiones
- Retornar resultados en el orden exacto de las claves de entrada en funciones batch
- Usar `prime()` cuando los datos ya estan disponibles desde un resolver padre
- Llamar `clear(id)` despues de mutaciones que modifican entidades cacheadas
- Configurar `maxBatchSize` para mantener clausulas `IN` dentro de los limites de la base de datos
- Retornar objetos `Error` por clave en lugar de lanzar en funciones batch
- Usar `cacheKeyFn` para claves no-string o compuestas
- Nombrar loaders segun la entidad que cargan (`userLoader`, no `dataLoader`)

## Errores Comunes

- **Compartir un DataLoader entre peticiones**: El cache entre peticiones filtra datos entre usuarios y causa lecturas stale
- **Lanzar en funcion batch**: Rechaza todo el batch. Retornar `new Error()` en el indice fallido en su lugar
- **Orden de resultados incorrecto**: DataLoader empareja por posicion. Resultados desalineados silenciosamente devuelven datos incorrectos
- **No limpiar despues de mutaciones**: Datos cacheados stale se retornan para entidades actualizadas
- **Usar DataLoader para caching de larga duracion**: El cache de DataLoader es por peticion. Usar Redis o cache a nivel aplicacion para caching entre peticiones
- **Falta `cacheKeyFn` para claves objeto**: `{ userId: '1' }` y `{ userId: '1' }` son referencias de objeto diferentes — cache miss cada vez

## FAQ

**DataLoader es solo para GraphQL?**

No. DataLoader es una utilidad de batching de proposito general. Funciona donde sea que tengas lookups async individuales que pueden batchearse. GraphQL es el caso de uso mas comun porque los resolvers anidados piden datos relacionados de forma independiente.

**Como decide DataLoader cuando batchear?**

DataLoader recolecta todas las llamadas `load()` dentro del tick actual del event loop de Node.js. Cuando el tick termina, dispara la funcion batch con todas las claves recolectadas. Puedes personalizar el timing con `batchScheduleFn`.

**Deberia usar DataLoader con federation?**

El query planner de federation ya batchea la resolucion de campos entre servicios. Para resolvers internos del subgrafo (queries de base de datos dentro de un servicio), DataLoader sigue siendo util.

**Que pasa si una clave no se encuentra?**

Retorna `null` en ese indice para "no encontrado" como caso no-error. Retorna `new Error('not found')` en ese indice si quieres que el `load()` del caller rechaze. Elige una convencion y mantenla.

**Puedo usar DataLoader con Python u otros lenguajes?**

Si. `aiodataloader` para Python (asyncio), `dataloader-go` para Go, e implementaciones similares existen para otros lenguajes. El concepto de batching es independiente del lenguaje.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
