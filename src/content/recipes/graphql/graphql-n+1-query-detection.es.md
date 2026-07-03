---
contentType: recipes
slug: graphql-n+1-query-detection
title: "Detectar y corregir consultas N+1 en resolvers GraphQL"
description: "Identifica problemas de consultas N+1 en resolvers GraphQL usando logging, DataLoader y herramientas de analisis antes de que lleguen a produccion"
metaDescription: "Detecta y corrige consultas N+1 en resolvers GraphQL. Usa DataLoader por peticion, plugins de logging y analisis de queries para eliminar llamadas DB."
difficulty: intermediate
topics:
  - graphql
  - api
  - performance
tags:
  - graphql
  - n+1
  - performance
  - dataloader
  - debugging
relatedResources:
  - /recipes/graphql/graphql-dataloader-batching
  - /recipes/api/graphql-apollo-server
  - /recipes/databases/postgres-query-optimization
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Detecta y corrige consultas N+1 en resolvers GraphQL. Usa DataLoader por peticion, plugins de logging y analisis de queries para eliminar llamadas DB."
  keywords:
    - graphql n+1
    - n+1 query detection
    - graphql performance
    - dataloader
    - graphql debugging
---

# Detectar y corregir consultas N+1 en resolvers GraphQL

El problema N+1 es el problema de rendimiento mas comun en APIs GraphQL. Cuando una consulta de lista retorna N items y cada item dispara una llamada separada a la base de datos para un campo relacionado, obtienes 1 + N consultas en lugar de 1. Esta receta muestra como detectar patrones N+1 durante el desarrollo y corregirlos con batching de DataLoader.

## Cuando Usar Esto

- Consultas GraphQL lentas bajo carga pero rapidas para items individuales
- Conteos de conexiones a base de datos que suben durante consultas de lista
- Quieres detectar problemas N+1 antes de que lleguen a produccion

## Requisitos Previos

- Un servidor GraphQL con resolvers que obtienen datos relacionados
- Un cliente de base de datos con logging de consultas habilitado

## Solucion

### 1. Detectar N+1 con logging de consultas

Agrega un wrapper de logging a tu cliente de base de datos que cuente consultas por peticion:

```typescript
// middleware/queryLogger.ts
import { Plugin } from '@apollo/server';

export const queryLoggerPlugin: Plugin = {
  async requestDidStart() {
    const queryCount = { value: 0 };
    const queries: string[] = [];

    return {
      contextDidStart: () => {
        queryCount.value = 0;
        queries.length = 0;
      },

      async willSendResponse(requestContext) {
        if (queryCount.value > 5) {
          console.warn(
            `[N+1 SOSPECHA] ${queryCount.value} consultas para operacion: ` +
            `${requestContext.operationName ?? 'anonima'}\n` +
            queries.slice(0, 10).map((q, i) => `  ${i + 1}. ${q}`).join('\n')
          );
        }
      },
    };
  },
};
```

### 2. Instrumentar el cliente de base de datos

```typescript
// db/instrumented.ts
export function instrumentDbClient(db: any, queryLog: { count: number; queries: string[] }) {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      const original = target[prop];
      if (typeof original === 'function') {
        return (...args: any[]) => {
          queryLog.queries.push(`${String(prop)}(${JSON.stringify(args[0]?.where ?? {})})`);
          queryLog.count++;
          return original.apply(target, args);
        };
      }
      if (original && typeof original === 'object') {
        return new Proxy(original, handler);
      }
      return original;
    },
  };

  return new Proxy(db, handler);
}
```

### 3. Registrar el plugin en Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { queryLoggerPlugin } from './middleware/queryLogger';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [queryLoggerPlugin],
});
```

### 4. El problema N+1 — Antes

```typescript
// ANTES — problema N+1
const resolvers = {
  Query: {
    posts: () => db.posts.findMany({ take: 20 }),
  },

  Post: {
    // Esto se ejecuta una vez por post — 20 posts = 20 consultas
    author: (post: { authorId: string }) =>
      db.users.findById(post.authorId),
  },
};
```

Una consulta de 20 posts con sus autores produce 21 consultas: 1 para posts + 20 para autores.

### 5. La solucion — Despues con DataLoader

```typescript
// DESPUES — batched con DataLoader
import DataLoader from 'dataloader';

function createUserLoader(db: any) {
  return new DataLoader<string, any>(async (userIds: readonly string[]) => {
    const users = await db.users.findMany({
      where: { id: { in: [...userIds] } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return userIds.map((id) => userMap.get(id));
  });
}

const resolvers = {
  Query: {
    posts: (_: unknown, __: unknown, ctx: Context) =>
      ctx.db.posts.findMany({ take: 20 }),
  },

  Post: {
    // DataLoader agrupa todos los authorIds en una consulta
    author: (post: { authorId: string }, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(post.authorId),
  },
};
```

La misma consulta ahora produce 2 consultas: 1 para posts + 1 consulta batch para todos los autores.

### 6. Usar analizador de consultas de Apollo

Para analisis mas profundo, usa el plugin de complejidad de consultas de Apollo:

```bash
npm install graphql-query-complexity
```

```typescript
import { createComplexityRule, simpleEstimator } from 'graphql-query-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityRule({
      maximumComplexity: 1000,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      onComplete: (complexity: number) => {
        console.log(`Query complexity: ${complexity}`);
      },
    }),
  ],
});
```

## Como Funciona

1. **Logging de consultas** envuelve cada llamada a la base de datos y las cuenta por operacion GraphQL. Un conteo alto (ej. >5 para una consulta de lista) indica un posible N+1.
2. **Batching de DataLoader** recolecta todas las llamadas `.load(id)` dentro de un mismo tick y las despacha como una sola consulta `WHERE id IN (...)`, reduciendo N+1 a 2 consultas.
3. **Analisis de complejidad** asigna un costo a cada campo y rechaza consultas que exceden un umbral, previniendo que consultas anidadas costosas lleguen a la base de datos.
4. **El ciclo de vida del plugin** resetea el contador por peticion y registra el resultado antes de enviar la respuesta, para que cada operacion se mida independientemente.

## Variantes

### Detectar N+1 con traces de OpenTelemetry

El tracing distribuido revela patrones N+1 entre servicios:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('graphql');

const resolvers = {
  Post: {
    author: (post, _, ctx) => {
      return tracer.startActiveSpan('resolve.post.author', (span) => {
        return ctx.db.users.findById(post.authorId).finally(() => span.end());
      });
    },
  },
};
```

En el visor de traces, ves 20 spans secuenciales para `resolve.post.author` — una seal clara de N+1.

### Deteccion automatizada de N+1 en pruebas

```typescript
import { ApolloServer } from '@apollo/server';

test('posts query should not produce N+1', async () => {
  const queryCount = { count: 0 };
  const instrumentedDb = instrumentDbClient(db, queryCount);

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.executeOperation({
    query: 'query { posts { id title author { name } } }',
  }, { contextValue: { db: instrumentedDb } });

  expect(queryCount.count).toBeLessThanOrEqual(2);
});
```

### Middleware de Prisma para deteccion N+1

```typescript
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  if (params.action === 'findUnique' && duration < 1) {
    console.warn(`Potential N+1: ${params.model}.${params.action}`);
  }

  return result;
});
```

## Mejores Practicas

- **Registra conteos de consultas en desarrollo** — detecta N+1 antes de que llegue a staging
- **Usa DataLoader para cada relacion** — incluso si crees que una lista siempre tendra un item
- **Escribe pruebas que verifiquen conteos de consultas** — `expect(queryCount).toBeLessThanOrEqual(2)` previene regresiones
- **Monitorea conteos en produccion** — alerta cuando una operacion excede un umbral

## Errores Comunes

- **Solo corregir N+1 en consultas de lista** — consultas de item unico con relaciones anidadas tambien pueden N+1 si el cliente pide anidamiento profundo
- **Compartir DataLoader entre peticiones** — la cache filtra entre usuarios; crea una instancia nueva por peticion
- **Ignorar el conteo en pruebas** — una prueba que pasa pero hace 50 consultas es un incidente de rendimiento futuro
- **No medir despues del fix** — siempre verifica que el conteo de consultas bajo despues de agregar DataLoader

## FAQ

**Q: Cuantas consultas son demasiadas?**
A: Una buena regla: 1 consulta por campo de nivel superior mas 1 consulta batch por relacion. Una lista de 20 posts con autores deberia ser 2 consultas, no 21.

**Q: Puedo tener N+1 con DataLoader?**
A: Si, si llamas `.load()` en un bucle con `await` entre cada llamada. DataLoader agrupa dentro de un tick, por lo que awaits secuenciales impiden el batching.

**Q: N+1 solo afecta bases de datos?**
A: No. Cualquier llamada a servicio externo (REST API, gRPC, cache) puede N+1. DataLoader funciona para cualquier llamada batcheable.

**Q: Debo usar limites de complejidad en lugar de DataLoader?**
A: Ambos. Los limites de complejidad previenen que consultas costosas se ejecuten. DataLoader hace eficientes las consultas que si se ejecutan. Resuelven problemas diferentes.
