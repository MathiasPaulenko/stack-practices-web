---
contentType: patterns
slug: graphql-batched-resolver-pattern
title: "Patron de Resolver Batch en GraphQL"
description: "Resuelve campos anidados de GraphQL en una sola peticion batch para eliminar consultas N+1 y reducir la carga de la base de datos."
metaDescription: "Elimina consultas N+1 en GraphQL con resolvers batch. Agrupa resoluciones de campos en una sola llamada usando DataLoader y cache por peticion."
difficulty: intermediate
category: structural
topics:
  - graphql
  - performance
  - api
tags:
  - batched-resolver
  - pattern
  - dataloader
  - n-plus-1
  - graphql-performance
relatedResources:
  - /patterns/graphql-dataloader-pattern
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Elimina consultas N+1 en GraphQL con resolvers batch. Agrupa resoluciones de campos en una sola llamada usando DataLoader y cache por peticion."
  keywords:
    - batched-resolver
    - pattern
    - dataloader
    - n-plus-1
    - graphql-performance
---

## Descripcion general

Cuando una query GraphQL pide campos anidados a traves de una lista, cada item dispara una llamada separada a la base de datos. Consultar 50 posts y sus autores produce 50 sentencias `SELECT` extra — el clasico problema N+1. Los resolvers batch recolectan todas las claves de la lista, hacen una sola peticion batch, y distribuyen los resultados de vuelta a cada item.

El patron se combina naturalmente con DataLoader, que maneja batching, caching y deduplicacion por peticion.

## Cuando Usar

- Resolvers que obtienen datos relacionados por item padre (posts → autor, ordenes → producto)
- Listas de items donde cada item tiene una relacion anidada
- Cualquier campo GraphQL que dispara una query de base de datos o llamada API por padre
- Capas de gateway o stitching que delegan a servicios backend

## Cuando No Usar

- Queries de un solo item donde N=1 (sin beneficio de batching)
- Campos resueltos desde datos ya cargados en el objeto padre (usar acceso directo a propiedad)
- Subscripciones en tiempo real donde las ventanas de batch anaden latencia inaceptable

## Solucion

### 1. El Problema N+1

Sin batching, cada post dispara una busqueda de autor separada:

```typescript
const resolvers = {
  Post: {
    author: (post, _args, { db }) => {
      // Llamado una vez por post — 50 posts = 50 queries
      return db.user.findById(post.authorId);
    },
  },
};
```

Consultar 50 posts genera 50 queries SQL:

```sql
SELECT * FROM users WHERE id = 1;
SELECT * FROM users WHERE id = 2;
SELECT * FROM users WHERE id = 1;  -- duplicado
SELECT * FROM users WHERE id = 3;
-- ... 46 mas
```

### 2. DataLoader: Batch y Cache

DataLoader recolecta todos los valores de `authorId` dentro de un mismo tick del event loop, los deduplica, y envia una sola peticion batch.

```typescript
import DataLoader from 'dataloader';

async function batchLoadUsers(userIds: readonly string[], { db }) {
  // Una query: SELECT * FROM users WHERE id IN (1, 2, 3, ...)
  const users = await db.user.findMany({ where: { id: { in: [...userIds] } } });

  // DataLoader espera resultados en el mismo orden que las claves de entrada
  const userMap = new Map(users.map((u) => [u.id, u]));
  return userIds.map((id) => userMap.get(id) ?? new Error(`User ${id} not found`));
}

// Crear un nuevo DataLoader por peticion para evitar caching entre peticiones
function createLoaders(context) {
  return {
    userLoader: new DataLoader(
      (ids) => batchLoadUsers(ids, context),
      { cacheKeyFn: (key) => key.toString() }
    ),
  };
}
```

### 3. Usar el Loader en Resolvers

```typescript
const resolvers = {
  Post: {
    author: (post, _args, { loaders }) => {
      // DataLoader agrupa todas las llamadas dentro del mismo tick
      return loaders.userLoader.load(post.authorId);
    },
  },
  Query: {
    posts: async (_parent, _args, { db }) => {
      return db.post.findMany({ take: 50 });
    },
  },
};
```

Ahora 50 posts producen una sola query SQL:

```sql
SELECT * FROM users WHERE id IN (1, 2, 3, 4, 5, ...);
```

### 4. Inicializacion de Loaders por Peticion

Crear loaders frescos para cada peticion para evitar filtrar datos cacheados entre usuarios:

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const db = getDatabase();
    const loaders = createLoaders({ db });
    return { db, loaders, user: req.headers.authorization };
  },
  listen: { port: 4000 },
});
```

### 5. Batching Entre Multiples Campos

DataLoader agrupa tambien entre diferentes campos de resolver. Si una query pide `post.author` y `comment.author`, ambos resuelven a traves del mismo `userLoader`:

```typescript
const resolvers = {
  Post: {
    author: (post, _args, { loaders }) => loaders.userLoader.load(post.authorId),
  },
  Comment: {
    author: (comment, _args, { loaders }) => loaders.userLoader.load(comment.authorId),
  },
};
```

Una query como `{ posts { author { name } } comments { author { name } } }` sigue produciendo una sola llamada batch para todos los IDs de autor.

## Explicacion

- **Ventana de batch**: DataLoader recolecta todas las llamadas `.load()` dentro de un tick del event loop de Node.js, luego dispara la funcion batch una vez
- **Deduplicacion**: Si dos posts tienen el mismo `authorId`, DataLoader pide ese usuario una vez y devuelve el resultado cacheado para ambos
- **Cache por peticion**: El cache vive solo durante una operacion GraphQL, previniendo datos stale entre peticiones
- **Preservacion de orden**: La funcion batch debe retornar resultados en el mismo orden que las claves de entrada — DataLoader empareja resultados por posicion

## Variantes

### Funciones Batch Personalizadas para APIs REST

Batchear contra un endpoint REST que acepta multiples IDs:

```typescript
const productLoader = new DataLoader(async (productIds: readonly string[]) => {
  const response = await fetch(
    `https://api.example.com/products?ids=${productIds.join(',')}`
  );
  const products = await response.json();
  const productMap = new Map(products.map((p) => [p.id, p]));
  return productIds.map((id) => productMap.get(id));
});
```

### Batch con Tamano Maximo

Limitar el tamano del batch para evitar clausulas `IN` demasiado grandes:

```typescript
const userLoader = new DataLoader(batchLoadUsers, {
  maxBatchSize: 100,
  cache: true,
});
```

### Batch con Priming

Pre-poblar el cache cuando ya tienes los datos:

```typescript
Query: {
  user: async (_parent, { id }, { db, loaders }) => {
    const user = await db.user.findById(id);
    // Primear el cache para que los resolvers anidados no re-fetchen
    loaders.userLoader.prime(id, user);
    return user;
  },
},
```

### Batch con Cache Key Personalizado

Para claves compuestas (ej. tenant + user ID):

```typescript
const loader = new DataLoader(batchLoad, {
  cacheKeyFn: (key) => `${key.tenantId}:${key.userId}`,
});
```

## Mejores Practicas

- Crear una instancia de DataLoader por peticion, nunca compartida entre peticiones
- Retornar siempre resultados en el mismo orden que las claves de entrada en funciones batch
- Usar `prime()` cuando ya tienes datos para evitar fetches redundantes
- Configurar `maxBatchSize` para mantener clausulas `IN` dentro de los limites de la base de datos
- Manejar errores por clave: retornar un objeto `Error` para items fallidos, no lanzar una excepcion
- Monitorear tamanos de batch en produccion para detectar patrones de query inesperados

## Errores Comunes

- **Compartir DataLoader entre peticiones**: Causa fugas de datos entre usuarios y cache hits stale
- **Retornar resultados desordenados**: DataLoader empareja por posicion, resultados desalineados silenciosamente devuelven datos incorrectos
- **Lanzar en funcion batch**: Una clave fallida rechaza todo el batch. Retornar `new Error()` por item en su lugar
- **No usar `cacheKeyFn` para claves no-string**: Objetos como claves causan cache misses porque `{}` !== `{}` por referencia
- **Olvidar limpiar el cache en mutaciones**: Despues de actualizar un usuario, llamar `loader.clear(id)` para prevenir lecturas stale

## FAQ

**DataLoader funciona con subscripciones?**

Si, pero la ventana de batch puede comportarse diferente. Para subscripciones, considera deshabilitar batching o usar un intervalo de batch mas corto.

**En que se diferencia del patron DataLoader?**

El patron de resolver batch es el concepto mas amplio — DataLoader es una implementacion. Tambien puedes batchear con logica personalizada, pipelines de Redis, o coleccion de campos `info` de GraphQL.js.

**Puedo batchear mutaciones?**

No directamente. Las mutaciones se ejecutan secuencialmente por diseno. Usa una sola mutacion con input de lista en lugar de multiples llamadas de mutacion.

**Que hay del batching en federation?**

El query planner de Apollo Federation automaticamente batchea la resolucion de campos entre servicios. Si usas federation, puede que no necesites DataLoader manual para campos entre servicios.
