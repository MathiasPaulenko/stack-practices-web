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
  - n-plus-one
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
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Resuelve consultas N+1 en GraphQL con DataLoader. Agrupa llamadas a la base de datos entre resolvers y cachea resultados dentro del ciclo de vida de la peticion."
  keywords:
    - graphql dataloader
    - n+1 query
    - batch loading
    - graphql performance
    - dataloader batching





---
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

- **Propagacion de errores de DataLoader**: cuando una batch function lanza un error, DataLoader rechaza todas las keys del batch.   Envuelve batch functions en try/catch.   Retorna errores individuales por key usando instancias de Error.   Usa .
- **Fallos parciales de batch**: si algunos items en un batch exitan y otros fallan, retorna resultados para items exitosos y objetos Error para los fallidos.   DataLoader soporta retornar una mezcla de valores y errores en el array del batch.   El caller recibe errores individuales via rechazo de .
- **Manejo de timeouts**: setea un timeout en batch functions (ej.   5 segundos).   Si el timeout se dispara, rechaza todos los loads pendientes.  race con una promise de timeout.
- **Fallos de conexion a base de datos**: si la base de datos no esta disponible, la batch function debe rechazar con un error descriptivo.   Falla a datos cacheados si estan disponibles.
- **Errores de invalidacion de cache**: si prime() se llama con datos stale, loads subsiguientes retornan resultados incorrectos.   Valida los datos primed antes de cachear.   Usa .  clearAll() en cambios de schema o deployments.
- **Presion de memoria del cache**: DataLoader cachea por referencia.   Objetos grandes cacheados pueden causar presion de memoria en procesos long-running.

## Tips de Optimizacion de Performance

- **Tuning de batch size**: el batch size optimo depende de la base de datos y complejidad del query.   Empieza con 100-500 items por batch.   Batches mas grandes reducen round trips pero aumentan el costo por query.
- **Seleccion de estrategia de cache**: el cache default es por-request (Map).   Usa Redis para caching distribuido.
- **Batching distribuido**: en entornos serverless, cada instancia tiene su propio DataLoader.   Publica resultados de batch a un canal Redis.   Otras instancias consumen y primean su DataLoader local.
- **Timing de scheduling**: el maxBatchSize y scheduling default pueden no ser optimos.   Para escenarios de alto throughput, dispatcha batches cada 1ms en lugar de esperar al next tick.
- **Optimizacion de queries**: asegurate que los queries de base de datos usen indexes apropiados para lookups batched.
- **Gestion de memoria**: usa maxBatchSize para limitar la memoria del batch.

## Consideraciones de Seguridad

- **Autorizacion en batch functions**: Un atacante puede solicitar keys que no esta autorizado a acceder.   Retorna null o Error para keys no autorizadas.   No filtres la existencia de recursos no autorizados.
- **Ataques de batch injection**: valida todas las keys antes de pasarlas a la base de datos.   Un atacante puede crafit keys para inyectar SQL o causar comportamiento inesperado.   Sanitiza keys con la misma validacion que queries directos.
- **Cache poisoning**: si un atacante puede primear el cache con datos incorrectos, loads subsiguientes retornan resultados envenenados.   Valida los datos primed del lado servidor.   No permitas cache priming controlado por el cliente.
- **Rate limiting de batch loads**: un cliente malicioso puede llamar .  load() miles de veces por request.   Limita el numero de llamadas .  load() por request (ej.   100).   Retorna un error si se excede el limite.
- **Information disclosure**: las batch functions pueden retornar diferentes mensajes de error para keys existentes vs no existentes.   Esto puede filtrar informacion sobre existencia de recursos.   Loguea errores detallados solo del lado servidor.
- **DataLoader en schemas federados**: en un gateway federado, cada subgraph tiene su propio DataLoader.   Un subgraph puede recibir requests del gateway sin contexto de usuario.   Pasa contexto de usuario a traves del query plan de federation.
## Testing y Quality Assurance

- **Unit testing de batch functions**: Verifica que la funcion retorne resultados en el mismo orden que las input keys.   Testea error handling para cada key independientemente.
- **Integration testing con DataLoader**: Verifica que las queries N+1 se eliminen contando database calls.   Asserta que un query pidiendo 100 items resulte en exactamente 1 database call.
- **Testing de comportamiento de cache**: load() retorne resultados cacheados en la segunda llamada.  clearAll() remueva todas las keys.  prime(key, value) cachee sin fetchar.
- **Load testing**: Verifica que DataLoader reduce database queries en 80-95% comparado a resolvers naive.
- **Snapshot testing**: snapshottea la respuesta GraphQL para queries representativos.   Detecta cambios no intencionales en comportamiento del resolver.
- **Testing de escenarios de error**: Verifica que los errores se propaguen apropiadamente a llamadas .  load() individuales.

## Deployment y CI/CD

- **Lifecycle de DataLoader en servidores web**: crea una nueva instancia de DataLoader por request.   Almacenala en el objeto de contexto del request.   Dispose despues de que la respuesta se envie.   Nunca sharees instancias de DataLoader a traves de requests en servidores long-running.
- **Monitoreo de metricas de DataLoader**: Exporta metricas via Prometheus.   Setea dashboards de Grafana.   Alerta en error rate > 1%.
- **Feature flags para batching**: deploya DataLoader detras de un feature flag.   Roll out a un porcentaje de trafico primero.   Si las metricas mejoran, aumenta el rollout.   Si hay regresiones, roll back inmediatamente.
## Monitoreo y Observabilidad

- **Metricas de batch**: trackea batch count, average batch size, max batch size y batch dispatch time.
- **Metricas de cache**: trackea cache hit rate, cache size y cache eviction count.
- **Tracing a nivel resolver**: usa Apollo Tracing u OpenTelemetry para tracear tiempo de ejecucion de resolvers.
- **Monitoreo de error rate**: trackea error rate por batch function.   Loguea errores de batch con contexto de key, stack trace y request ID.
## Optimizacion de Costos

- **Connection pooling de base de datos**: DataLoader reduce database queries pero cada batch necesita una conexion.   Setea pool size basado en peak concurrent batches.
- **Caching para reducir database load**: Cachea resultados de batch comunes por 5-15 minutos.   Invalida en mutaciones.   Reduce database load en 50-90% para workloads read-heavy.
- **Impacto de costo en serverless**: en entornos serverless, cada invocacion paga por tiempo de ejecucion.   DataLoader reduce database round trips, reduciendo tiempo de ejecucion y costo.
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





## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de graphql y dataloader para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica batch y cache de consultas con graphql dataloader** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
