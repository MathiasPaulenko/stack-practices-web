---



contentType: guides
slug: graphql-vs-rest-guide
title: "GraphQL vs REST — Cuándo Elegir y Cómo Migrar"
description: "Guía de decisión comparando GraphQL y REST APIs: casos de uso, rendimiento, caching, herramientas y estrategias de migración para equipos de ingeniería."
metaDescription: "Guía comparativa GraphQL vs REST: casos de uso, rendimiento, caching y estrategias de migración. Elige el estilo de API correcto para tu proyecto."
difficulty: intermediate
topics:
  - architecture
  - api
tags:
  - graphql
  - rest
  - api
  - architecture
  - comparison
  - caching
  - performance
  - guide
relatedResources:
  - /guides/rest-api-design-guide
  - /guides/api-gateway-design-guide
  - /docs/api-performance-budget-template
  - /guides/system-design-interview-guide
  - /docs/api-lifecycle-management-template
  - /docs/api-error-handling-guideline
  - /docs/api-rate-limiting-policy-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Guía comparativa GraphQL vs REST: casos de uso, rendimiento, caching y estrategias de migración. Elige el estilo de API correcto para tu proyecto."
  keywords:
    - graphql
    - rest
    - api
    - arquitectura
    - comparacion
    - caching
    - rendimiento
    - guia



---
## Visión General

REST ha sido el estándar de facto para APIs web durante más de una década. GraphQL, desarrollado por Facebook en 2012, ofrece un enfoque diferente: en lugar de múltiples endpoints fijos, el cliente solicita exactamente los datos que necesita en una sola consulta. La elección entre ambos no es dogmática — depende de tus clientes, tu equipo, y las restricciones de rendimiento. Esta guía compara casos de uso, trade-offs, caching, herramientas y estrategias de migración.

## Cuándo Usar


- For alternatives, see [Complete Guide to API Versioning Strategies](/es/guides/complete-guide-api-versioning-strategies/).

Usa esta guía cuando:
- Estás diseñando una nueva API y debes elegir entre GraphQL y REST
- Tu API REST actual sufre de over-fetching, under-fetching o explosión de endpoints
- Consideras migrar de REST a GraphQL y necesitas una estrategia de transición

## Solución

### Comparación Fundamental

| Dimensión | REST | GraphQL |
|-----------|------|---------|
| **Modelo de datos** | Múltiples recursos con endpoints fijos | Un solo endpoint con schema tipado |
| **Solicitud del cliente** | URL + método HTTP + headers | Query/mutation/subscription en body |
| **Respuesta** | Formato fijo definido por servidor | Formato flexible definido por cliente |
| **Over-fetching** | Común (obtienes todo el recurso) | Eliminado (solicitas campos específicos) |
| **Under-fetching** | Común (múltiples requests para datos relacionados) | Eliminado (resolución anidada en un solo request) |
| **Versionado** | v1, v2 en URL o headers | Evolución del schema sin versionado |
| **Caching** | HTTP nativo (Cache-Control, ETag) | Requiere cache de aplicación (Apollo, Relay) |
| **Herramientas** | Swagger/OpenAPI, Postman | Apollo Studio, GraphiQL, codegen |
| **Curva de aprendizaje** | Baja (conceptos HTTP familiares) | Media-alta (schema, resolvers, N+1) |

### Ejemplo REST vs GraphQL

```http
# REST: Múltiples requests para datos relacionados
GET /users/42
GET /users/42/posts
GET /users/42/followers

# Respuestas: 3 requests, datos potencialmente no necesarios
```

```graphql
# GraphQL: Un solo request con datos exactos
query {
  user(id: 42) {
    name
    email
    posts(limit: 5) {
      title
      createdAt
    }
    followers {
      name
    }
  }
}

# Respuesta: 1 request, solo campos solicitados
```

### Implementación de Resolver con DataLoader (N+1)

```javascript
// Resolver GraphQL con DataLoader para evitar N+1
const DataLoader = require('dataloader');

const userLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findMany({
    where: { id: { in: userIds } }
  });
  return userIds.map(id => users.find(u => u.id === id));
});

const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId)
  },
  Query: {
    posts: () => db.posts.findMany()
  }
};
```

### Caching en GraphQL

```javascript
// Cache de resolvers con Redis
const { Redis } = require('ioredis');
const redis = new Redis();

const cachedResolver = (key, ttl, resolver) => async (parent, args, context) => {
  const cacheKey = `${key}:${JSON.stringify(args)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await resolver(parent, args, context);
  await redis.setex(cacheKey, ttl, JSON.stringify(result));
  return result;
};

const resolvers = {
  Query: {
    user: cachedResolver('user', 300, async (_, { id }) => {
      return db.users.findById(id);
    })
  }
};
```

## Explicación

REST funciona mejor cuando tus recursos son **estáticos y bien definidos** y tus clientes consumen datos de manera predecible. El caching HTTP funciona automáticamente con navegadores, CDNs y proxies. GraphQL brilla cuando tienes **múltiples clientes con necesidades de datos diferentes** — una app móvil que necesita resúmenes, una app web que necesita detalles, un dashboard que necesita agregaciones.

El problema N+1 es el mayor riesgo de GraphQL. Si un query solicita 100 posts y cada post tiene un autor, un resolver naive hará 101 queries a la base de datos. DataLoader resuelve esto con batching: acumula IDs durante un tick del event loop, luego hace una sola query `WHERE IN`. Sin DataLoader, GraphQL es más lento que REST.

El versionado en GraphQL se maneja mediante **evolución del schema**: agregar campos es no-ruptor; deprecar campos en lugar de eliminarlos. Esto elimina el caos de `/v1`, `/v2`, pero requiere disciplina del equipo. El schema actúa como contrato; romperlo es un breaking change detectable por herramientas.


### Escenario Detallado: Migracion Gradual de REST a GraphQL

```text
Sistema: Plataforma de blog con API REST existente
Endpoints REST: /posts, /posts/:id, /users/:id, /comments, /tags
Problema: App movil hace 4-5 requests por pantalla (over-fetching)
Meta: Reducir a 1 request por pantalla con GraphQL

Fase 1: Capa de agregacion GraphQL sobre REST (semana 1-2)
  - Instalar Apollo Server como proxy
  - Cada resolver llama al endpoint REST existente
  - Sin cambios en servicios backend

  const resolvers = {
    Query: {
      post: (_, { id }) => fetch(`https://api.example.com/posts/${id}`).then(r => r.json()),
      posts: (_, { limit = 10 }) => fetch(`https://api.example.com/posts?limit=${limit}`).then(r => r.json()),
      user: (_, { id }) => fetch(`https://api.example.com/users/${id}`).then(r => r.json()),
    },
    Post: {
      author: (post) => fetch(`https://api.example.com/users/${post.authorId}`).then(r => r.json()),
      comments: (post) => fetch(`https://api.example.com/posts/${post.id}/comments`).then(r => r.json()),
    }
  }

  Resultado: App movil hace 1 query GraphQL en lugar de 4-5 requests REST
  Latencia: Similar (el proxy agrega overhead, pero reduce round-trips)

Fase 2: DataLoader para N+1 (semana 3)
  - Sin DataLoader: query de 10 posts con autores = 11 requests REST
  - Con DataLoader: 2 requests REST (posts + batch de autores)

  const authorLoader = new DataLoader(async (authorIds) => {
    const users = await fetch(`https://api.example.com/users?ids=${authorIds.join(",")}`).then(r => r.json());
    return authorIds.map(id => users.find(u => u.id === id));
  });

  Post: {
    author: (post) => authorLoader.load(post.authorId)
  }

Fase 3: Migrar resolvers a base de datos directa (mes 2-3)
  - Reemplazar fetch REST por queries SQL directas
  - Medir latencia antes/despues de cada migracion
  - Mantener REST para servicios que ya tienen buena latencia

Fase 4: Persisted queries en produccion (mes 4)
  - Precompilar queries en build time
  - Cliente envia hash en lugar de query string
  - Reducir payload de request en 60-80%

  // Cliente
  const query = gql`query GetPost($id: ID!) { post(id: $id) { title author { name } } }`;
  // En produccion: envia solo el hash "abc123"

Metricas antes/despues:
  | Metrica | REST | GraphQL (fase 4) |
  |---------|------|-----------------|
  | Requests por pantalla (movil) | 4-5 | 1 |
  | Payload de request | 200-500 bytes | 8 bytes (hash) |
  | Latencia p95 | 350ms | 180ms |
  | Datos transferidos por pantalla | 8KB | 2KB |
```

### Como manejo el caching en GraphQL?

GraphQL no tiene caching HTTP nativo como REST. Usa Apollo Client cache (normalized cache en el cliente) para evitar refetch. En el servidor, cachea resolvers con Redis o Memcached. Configura `cacheControl` en tus resolvers para que Apollo Server genere headers HTTP para CDN caching de respuestas. Para datos inmutables, usa `maxAge: 3600`. Para datos volatiles, usa `maxAge: 0`.

### Como prevengo ataques de queries maliciosas en GraphQL?

Configura tres protecciones: (1) maxDepth para limitar profundidad de query (ej: 7 niveles), (2) complexity score para limitar el costo total de una query, (3) rate limiting basado en costo, no en numero de requests. Un query complejo cuenta mas que uno simple. Usa `graphql-cost-analysis` o `graphql-query-complexity` para calcular el costo. Bloquea queries que excedan el limite antes de ejecutarlas.

## Variantes

| Situación | Recomendación | Razonamiento |
|-----------|---------------|------------|
| **API pública simple** | REST | Caching HTTP, familiaridad, menor barrera de entrada |
| **Múltiples clientes (móvil + web + dashboard)** | GraphQL | Diferentes necesidades de datos sin proliferación de endpoints |
| **Microservicios con agregación** | GraphQL + Federación | Unifica múltiples servicios bajo un solo schema |
| **Alto throughput, baja latencia** | REST + gRPC | Caching HTTP y wire format binario |
| **Migración gradual desde REST** | GraphQL como capa de agregación | Deja REST intacto, agrega GraphQL sobre él |
| **Real-time updates** | GraphQL Subscriptions | WebSocket nativo para eventos push |

## Lo que funciona

1. Usa **DataLoader** siempre que haya relaciones en tu schema; sin batching, GraphQL es lentísimo
2. Limita la **profundidad de query** (maxDepth) y **complejidad** (complexity score) para prevenir DoS
3. Instrumenta **tiempo de resolución por campo** para identificar resolvers lentos
4. Mantén el **schema como tu contrato público**; documenta cada tipo y campo
5. Usa **persisted queries** en producción para reducir payload de query strings

## Errores Comunes

1. Migrar todo a GraphQL sin **agregar DataLoader**; el N+1 mata el rendimiento
2. Exponer **mutaciones complejas** que modifican múltiples recursos; preferir atomicidad
3. Ignorar **rate limiting de queries**; un query profundo puede DoSearte fácilmente
4. Tratar GraphQL como REST con un solo endpoint; el poder está en el schema, no en el URL
5. No versionar el schema; la evolución requiere disciplina, no magia

## Preguntas Frecuentes

### ¿Puedo usar GraphQL y REST juntos?

Sí, y muchas organizaciones lo hacen. Un patrón común es mantener REST para servicios internos simples y agregar una capa de agregación GraphQL para clientes externos. Otro patrón es exponer REST para operaciones CRUD simples y GraphQL para queries complejas. La federación GraphQL permite combinar múltiples servicios REST bajo un solo schema sin modificar los servicios subyacentes.

### ¿Cómo migro de REST a GraphQL sin reescribir todo?

Agrega un servidor GraphQL que actúe como proxy/resolver sobre tus endpoints REST existentes. Cada resolver GraphQL llama a un endpoint REST. Esto te da beneficios inmediatos (queries flexibles, un solo endpoint) sin reescribir servicios. Luego, migra gradualmente los resolvers más críticos a queries directas a la base de datos o a servicios internos.

### ¿GraphQL es más lento que REST?

Depende. Para queries simples de un solo recurso, REST es más rápido debido al caching HTTP y menor overhead. Para queries complejas con múltiples relaciones, GraphQL puede ser más rápido porque hace un solo request en lugar de múltiples requests REST. El rendimiento de GraphQL depende casi enteramente de la calidad de tus resolvers y si usas DataLoader.



































End of document. Review and update quarterly.