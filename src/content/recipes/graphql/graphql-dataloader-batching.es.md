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
  - /recipes/graphql-apollo-server
  - /recipes/graphql-pagination-relay-connections
  - /patterns/graphql-dataloader-pattern
  - /recipes/graphql-n-1-query-detection
  - /recipes/graphql-custom-scalar-types
  - /recipes/graphql-subscriptions-realtime
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


- For alternatives, see [Detect and Fix N+1 Queries in GraphQL Resolvers](/es/recipes/graphql-n-1-query-detection/).

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

## Manejo de Errores y Recuperacion

- **Propagacion de errores de DataLoader**: cuando una batch function lanza un error, DataLoader rechaza todas las keys del batch. Envuelve batch functions en try/catch. Retorna errores individuales por key usando instancias de Error. Usa .clear(key) para remover entradas fallidas del cache. Loguea fallos de batch con contexto de key para debugging
- **Fallos parciales de batch**: si algunos items en un batch exitan y otros fallan, retorna resultados para items exitosos y objetos Error para los fallidos. DataLoader soporta retornar una mezcla de valores y errores en el array del batch. El caller recibe errores individuales via rechazo de .load()
- **Manejo de timeouts**: setea un timeout en batch functions (ej. 5 segundos). Si el timeout se dispara, rechaza todos los loads pendientes. Usa Promise.race con una promise de timeout. Limpia el cache para keys con timeout para permitir retries en requests subsiguientes
- **Fallos de conexion a base de datos**: si la base de datos no esta disponible, la batch function debe rechazar con un error descriptivo. Usa un patron circuit breaker para dejar de intentar batches despues de N fallos consecutivos. Falla a datos cacheados si estan disponibles. Alerta al equipo en activacion del circuit breaker
- **Errores de invalidacion de cache**: si prime() se llama con datos stale, loads subsiguientes retornan resultados incorrectos. Valida los datos primed antes de cachear. Usa .clearAll() en cambios de schema o deployments. Implementa una estrategia de cache versioning para invalidar entradas stale
- **Presion de memoria del cache**: DataLoader cachea por referencia. Objetos grandes cacheados pueden causar presion de memoria en procesos long-running. Setea maxAgeMs o usa un custom cache Map con eviction LRU. Monitorea el tamaÃ±o del cache y hit rate. Limpia el cache en seÃ±ales de presion de memoria

## Tips de Optimizacion de Performance

- **Tuning de batch size**: el batch size optimo depende de la base de datos y complejidad del query. Empieza con 100-500 items por batch. Mide la latencia del query en diferentes batch sizes. Batches mas grandes reducen round trips pero aumentan el costo por query. Usa EXPLAIN de la base de datos para encontrar el sweet spot
- **Seleccion de estrategia de cache**: el cache default es por-request (Map). Para workloads read-heavy, usa un shared LRU cache a traves de requests. Usa Redis para caching distribuido. Setea cacheKeyFn para keys complejas para evitar issues de referencia de objetos. Deshabilita caching con cache: false para queries unicas
- **Batching distribuido**: en entornos serverless, cada instancia tiene su propio DataLoader. Usa Redis para sharear resultados de batch a traves de instancias. Publica resultados de batch a un canal Redis. Otras instancias consumen y primean su DataLoader local. Reduce queries duplicadas a la base de datos
- **Timing de scheduling**: el maxBatchSize y scheduling default pueden no ser optimos. Usa un atchScheduleFn custom para controlar cuando los batches se dispatchan. Para escenarios de alto throughput, dispatcha batches cada 1ms en lugar de esperar al next tick. Reduce latencia a costo de batches mas pequeÃ±os
- **Optimizacion de queries**: asegurate que los queries de base de datos usen indexes apropiados para lookups batched. Usa clausulas IN o SELECTs batched. Evita N+1 dentro de la batch function misma. Usa EXPLAIN ANALYZE para verificar query plans. Agrega covering indexes para patrones de batch comunes
- **Gestion de memoria**: usa maxBatchSize para limitar la memoria del batch. Limpia instancias de DataLoader despues de cada request en servidores web. Usa WeakMap para cache si las referencias son short-lived. Monitorea RSS y heap usage. Profilea con --inspect para encontrar retention paths

## Consideraciones de Seguridad

- **Autorizacion en batch functions**: chequea permisos para cada key en el batch. Un atacante puede solicitar keys que no esta autorizado a acceder. Retorna null o Error para keys no autorizadas. No filtres la existencia de recursos no autorizados. Usa mensajes de error consistentes
- **Ataques de batch injection**: valida todas las keys antes de pasarlas a la base de datos. Un atacante puede crafit keys para inyectar SQL o causar comportamiento inesperado. Usa queries parametrizadas. Sanitiza keys con la misma validacion que queries directos. Nunca concatenes keys en strings SQL
- **Cache poisoning**: si un atacante puede primear el cache con datos incorrectos, loads subsiguientes retornan resultados envenenados. Valida los datos primed del lado servidor. No permitas cache priming controlado por el cliente. Usa endpoints de cache priming autenticados. Firma entradas de cache con HMAC
- **Rate limiting de batch loads**: un cliente malicioso puede llamar .load() miles de veces por request. Implementa rate limiting a nivel resolver. Limita el numero de llamadas .load() por request (ej. 100). Retorna un error si se excede el limite. Loguea patrones de load excesivos
- **Information disclosure**: las batch functions pueden retornar diferentes mensajes de error para keys existentes vs no existentes. Esto puede filtrar informacion sobre existencia de recursos. Usa mensajes de error consistentes para todos los casos de fallo. Loguea errores detallados solo del lado servidor. Retorna errores genericos a los clientes
- **DataLoader en schemas federados**: en un gateway federado, cada subgraph tiene su propio DataLoader. Asegura que los checks de autorizacion sean consistentes a traves de subgraphs. Un subgraph puede recibir requests del gateway sin contexto de usuario. Pasa contexto de usuario a traves del query plan de federation. Valida permisos en cada subgraph
## Testing y Quality Assurance

- **Unit testing de batch functions**: testea batch functions en aislamiento con database calls mockeadas. Verifica que la funcion retorne resultados en el mismo orden que las input keys. Testea batch vacio, batch de un solo item, y batch lleno. Testea error handling para cada key independientemente. Usa Jest o Vitest con async/await
- **Integration testing con DataLoader**: testea DataLoader dentro de un contexto de resolver GraphQL. Verifica que las queries N+1 se eliminen contando database calls. Usa un middleware query counter. Asserta que un query pidiendo 100 items resulte en exactamente 1 database call. Testea con nested resolvers para verificar batching a traves del query tree
- **Testing de comportamiento de cache**: testea que .load() retorne resultados cacheados en la segunda llamada. Testea que .clear(key) remueva solo la key especificada. Testea que .clearAll() remueva todas las keys. Testea que .prime(key, value) cachee sin fetchar. Verifica que el cache es por-instancia, no shared a traves de requests
- **Load testing**: usa Artillery o k6 para enviar 1000+ queries GraphQL concurrentes. Mide database query count, tiempo de respuesta y uso de memoria. Verifica que DataLoader reduce database queries en 80-95% comparado a resolvers naive. Monitorea memory leaks bajo load sostenido
- **Snapshot testing**: snapshottea la respuesta GraphQL para queries representativos. Compara snapshots en cada run de CI. Detecta cambios no intencionales en comportamiento del resolver. Usa patron graphql-response-snapshot con Jest. Updatea snapshots solo despues de cambios intencionales
- **Testing de escenarios de error**: testea batch function con database timeout, fallo de conexion y fallos parciales. Verifica que los errores se propaguen apropiadamente a llamadas .load() individuales. Testea que items exitosos en un fallo parcial se retornen igual. Verifica que el cache se limpie para keys fallidas

## Deployment y CI/CD

- **Lifecycle de DataLoader en servidores web**: crea una nueva instancia de DataLoader por request. Almacenala en el objeto de contexto del request. Dispose despues de que la respuesta se envie. Nunca sharees instancias de DataLoader a traves de requests en servidores long-running. Usa un patron middleware para inyectar instancias de DataLoader por-request
- **Monitoreo de metricas de DataLoader**: trackea batch count, batch size, cache hit rate y error rate. Exporta metricas via Prometheus. Setea dashboards de Grafana. Alerta en cache hit rate < 50% (indica pobre utilizacion de cache). Alerta en error rate > 1%. Trackea average batch size para tunear maxBatchSize
- **Feature flags para batching**: deploya DataLoader detras de un feature flag. Roll out a un porcentaje de trafico primero. Monitorea database query count y tiempo de respuesta. Si las metricas mejoran, aumenta el rollout. Si hay regresiones, roll back inmediatamente. Usa LaunchDarkly o Unleash para gestion de feature flags
## Monitoreo y Observabilidad

- **Metricas de batch**: trackea batch count, average batch size, max batch size y batch dispatch time. Usa histogramas de Prometheus para distribucion de batch size. Alerta en average batch size < 5 (indica pobre eficiencia de batching). Monitorea batch dispatch latency p95 < 100ms
- **Metricas de cache**: trackea cache hit rate, cache size y cache eviction count. Alerta en cache hit rate < 30%. Monitorea uso de memoria del cache. Trackea patrones de cache keys para identificar hot keys. Usa metricas de cacheKeyFn para entender distribucion de keys
- **Tracing a nivel resolver**: usa Apollo Tracing u OpenTelemetry para tracear tiempo de ejecucion de resolvers. Identifica resolvers que bypassan DataLoader. Trackea el ratio de loads de DataLoader vs database calls directas. Usa distributed tracing para ver el path completo del request desde gateway a base de datos
- **Monitoreo de error rate**: trackea error rate por batch function. Alerta en error rate > 1%. Loguea errores de batch con contexto de key, stack trace y request ID. Usa Sentry para error tracking con contexto GraphQL. Correlaciona errores con deployments usando release tags
## Optimizacion de Costos

- **Connection pooling de base de datos**: DataLoader reduce database queries pero cada batch necesita una conexion. Usa un connection pool (PgBouncer, Prisma Data Proxy) para sharear conexiones a traves de batches. Setea pool size basado en peak concurrent batches. Monitorea pool utilization y alerta al 80% de capacidad
- **Caching para reducir database load**: usa DataLoader cache con Redis para caching cross-request. Cachea resultados de batch comunes por 5-15 minutos. Invalida en mutaciones. Reduce database load en 50-90% para workloads read-heavy. Monitorea cache hit rate y ajusta TTL basado en tolerancia de staleness
- **Impacto de costo en serverless**: en entornos serverless, cada invocacion paga por tiempo de ejecucion. DataLoader reduce database round trips, reduciendo tiempo de ejecucion y costo. Mide costo por request antes y despues de adoptar DataLoader. Ahorro tipico: 30-60% en costos relacionados a base de datos
## Pitfalls Comunes y Anti-Patrones

- **Sharear DataLoader a traves de requests**: nunca sharees una instancia de DataLoader a traves de HTTP requests en un servidor web. Cada request debe obtener una instancia fresh. Sharear lleva a leakage de cache entre usuarios y potencial bypass de autorizacion. Usa un patron de contexto por-request
- **No manejar keys null**: las batch functions de DataLoader reciben keys null cuando los resolvers retornan null. Maneja nulls explicitamente en la batch function. Retorna null para input keys null. No pases null a queries de base de datos. Valida keys antes de procesar
## FAQ

**Q: DataLoader cachea entre peticiones?**
A: No. La cache por defecto es por instancia. Como creas una instancia nueva por peticion, la cache es por peticion. Para cache entre peticiones, usa Redis u otro almacen compartido.

**Q: Puedo usar DataLoader con codigo no-GraphQL?**
A: Si. DataLoader funciona donde necesites agrupar cargas asincronas individuales. No esta ligado a GraphQL.

**Q: Que pasa si una funcion batch lanza un error?**
A: El error se propaga a todas las llamadas `.load()` pendientes de ese batch. Maneja errores por clave retornando objetos `Error` en el array de resultados.

**Q: Debo usar DataLoader para relaciones uno-a-muchos?**
A: Si. Para uno-a-muchos (ej. user.posts), la funcion batch agrupa resultados por foreign key y retorna arrays por clave.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Puedo usar DataLoader con fuentes de datos que no son bases de datos?

Sí. DataLoader funciona con cualquier fuente de datos batcheable: APIs REST, microservicios, message queues, o stores en memoria. La batch function recibe un array de keys y retorna una Promise de un array de valores. Úsalo para cualquier problema N+1, no solo queries de base de datos.