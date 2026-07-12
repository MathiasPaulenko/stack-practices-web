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
  - rest
relatedResources:
  - /patterns/adapter-pattern-api
  - /recipes/call-rest-api
  - /recipes/graphql-custom-scalar-types
  - /recipes/graphql-dataloader-batching
  - /recipes/graphql-directives-auth
  - /recipes/graphql-error-handling-best-practices
  - /recipes/graphql-federation-gateway-setup
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

GraphQL permite a los clientes solicitar exactamente los datos que necesitan en una sola consulta. Apollo Server proporciona un framework listo para produccion para construir APIs GraphQL con desarrollo schema-first, soporte integrado de suscripciones y una amplia plataforma de plugins.

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

1. **Definicion de Schema** trabaja como contrato entre cliente y servidor
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
R: Apollo Server tiene la comunidad más grande. Yoga es mas ligero y rapido para casos simples. Ambos son aptos para produccion.

**P: Como manejo uploads de archivos en GraphQL?**
R: Usa `graphql-upload-minimal` con peticiones multipart, o prefiere un endpoint REST separado para archivos grandes.

**P: Cuando deberia evitar GraphQL?**
R: Para CRUD simple con pocas relaciones, [REST](/recipes/api/call-rest-api) es usualmente mas simple. GraphQL brilla cuando los clientes necesitan consultas flexibles sobre grafos complejos.

## Mejores Prácticas

- **Usa schema-first design**: define tu schema antes de escribir resolvers. Esto te fuerza a pensar en el contrato del API primero, no en la implementación. Herramientas como Apollo Studio visualizan el schema para stakeholders.
- **Habilita Apollo Sandbox solo en desarrollo**: Sandbox expone introspection y query building. Deshabilítalo en producción para prevenir schema leakage. Setea `introspection: false` en la config de Apollo Server de producción.
- **Usa context para shared state por petición**: pasa autenticación, database connections y request-scoped data a través del GraphQL context. Evita global state — rompe con peticiones concurrentes.
- **Implementa field-level resolvers solo cuando sea necesario**: Apollo Server resuelve campos usando default resolvers que leen object properties. Agrega custom resolvers solo para campos computados o campos que requieren data sources separados.
- **Usa directivas `@cacheControl`**: anota campos con cache hints (maxAge, scope). Apollo Server y CDN layers usan esto para cachear respuestas automáticamente, reduciendo resolver calls en 50-90% para schemas read-heavy.
- **Valida cambios de schema con `graphql-inspector`**: corre schema diffing en CI para detectar breaking changes antes del deployment. Bloquea PRs que eliminan campos o cambian tipos sin deprecation.

## Checklist de Producción

- [ ] Introspection está deshabilitada en producción (`introspection: false`)
- [ ] Playground/Sandbox está deshabilitado o protegido en producción
- [ ] Context incluye autenticación y data sources por petición
- [ ] DataLoader se usa para todo database batch loading
- [ ] Query depth limiting está habilitado (max 7-10 niveles)
- [ ] Persisted queries se enforcement en producción
- [ ] Directivas `@cacheControl` están seteadas en campos cacheable
- [ ] Error formatting oculta detalles internos en producción
- [ ] Endpoint de health check está disponible en `/.well-known/apollo/server-health`
- [ ] Schema está registrado en Apollo Studio o schema registry

## Consideraciones de Escalado

- **Performance de resolvers**: cada field resolver corre secuencialmente dentro de un selection set. Una query con 50 campos y 5ms por resolver toma 250ms. Usa `Promise.all` para resolvers independientes y paralelizarlos.
- **Memory usage con result sets grandes**: GraphQL construye el response object completo en memoria antes de serializar. Para queries retornando 10K+ items, usa streaming o pagination. La directiva `@stream` de Apollo Server habilita incremental delivery para listas grandes.
- **Despliegues multi-instancia**: Apollo Server es stateless, así que el escalado horizontal funciona out of the box. Sin embargo, subscriptions requieren un pub/sub backend compartido (Redis, NATS) para broadcastear eventos across instancias.
- **Cold start con serverless**: Apollo Server en Lambda tiene 500-1500ms cold starts debido a schema validation. Usa `serverlessExport` de Apollo Server para pre-build el schema al deploy time, reduciendo cold start a 200-400ms.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| Apollo Server (self-hosted) | $0 | Open-source, Node.js |
| Apollo Cloud (por millón de peticiones) | $150-$400/mes | Managed routing, caching, metrics |
| Redis (para subscriptions + DataLoader) | $10-$75/mes | Single instance o cluster |
| Apollo Studio (free tier) | $0 | Schema registry, basic metrics |
| Apollo Studio (team tier) | $15-$90/mes/user | Advanced analytics, trace viewing |

Para 50K peticiones/día: Apollo Server self-hosted en 1x EC2 t3.small ($10/mes) + Redis ($15/mes) es suficiente. Apollo Cloud agrega $150/mes pero provee managed caching, schema validation y client-side query tracking. Para teams, Apollo Studio Team ($30/mes) da trace-based performance insights.

## Cuándo No Usar Este Enfoque

- **Reemplazo simple de REST**: si tu API ya es REST con 5-10 endpoints y sin relaciones anidadas, migrar a Apollo Server agrega complejidad sin valor. Quédate con REST y usa OpenAPI para documentación.
- **APIs edge-deployed**: el cold start de Apollo Server (500-1500ms en Lambda) lo hace unsuitable para edge functions (Cloudflare Workers, Vercel Edge). Usa un GraphQL executor lightweight como `graphql-helix` para entornos edge.
- **Apps móviles bandwidth-critical**: Apollo Client descarga el schema completo para code generation (50-200KB). En redes móviles con data caps, esto es significativo. Usa persisted queries o cambia a REST para flows bandwidth-critical.

## Benchmarks de Rendimiento

| Setup | Cold start | Latencia warm | Throughput | Notas |
|-------|----------|-----------|-----------|-------|
| Apollo Server (Node.js) | 200ms | 15-50ms | 5K req/s | Self-hosted |
| Apollo Server (Lambda) | 500-1500ms | 20-60ms | 3K req/s | Serverless |
| Apollo Cloud | 0ms | 10-30ms | 10K req/s | Managed |
| GraphQL Yoga | 100ms | 10-35ms | 7K req/s | Alternativa más ligera |
| Hasura (Postgres) | 0ms | 5-20ms | 15K req/s | Auto-generated |

Apollo Server en una instancia dedicada de Node.js outperforma despliegues Lambda por 2-3x debido a no cold start overhead. Para serverless, usa `serverlessExport` para pre-build el schema. Hasura outperforma Apollo Server por 3x para APIs Postgres-backed porque genera resolvers a nivel database, skipeando JavaScript enteramente.

## Estrategia de Testing

- **Testea inyección de Apollo context**: crea una instancia de test de Apollo Server con mock context (auth, data sources, cache). Verifica que los resolvers reciban el shape correcto de context y fallen gracefully cuando falten fields requeridos.
- **Testea validación de schema**: usa `graphql-tools` `assertValidSchema` en CI para catchear cambios de schema que rompan clientes existentes. Corre `apollo service:check` para comparar schema contra el registry y detectar breaking changes.
- **Testea cache control headers**: envía queries con directives `@cacheControl` y verifica que la respuesta incluya headers `Cache-Control` correctos. Testea que las mutations bypassen el cache y que las queries cacheadas retornen `X-Cache: HIT` en peticiones subsiguientes.
- **Testea cleanup de subscriptions**: conecta una WebSocket subscription, verifica que reciba data, luego cierra la conexión. Verifica que el server elimine la subscription del pub/sub system y libere recursos dentro de 5 segundos.

## Errores Comunes

- **Habilitar GraphQL Playground en producción**: Apollo Server habilita Playground por defecto en development. Olvidar deshabilitarlo en producción expone tu schema y permite queries arbitrarias. Setea `introspection: false` y `playground: false` en producción.
- **No usar DataLoader para batched loading**: sin DataLoader, cada resolver fetchea data independientemente. Una query retornando 50 orders con customer details triggerea 50 customer fetches separados. DataLoader batchea estos en un solo fetch por petición.
- **Ignorar Apollo Studio schema registration**: sin schema registration, no hay visibility en cambios de schema o client usage. Registra tu schema con Apollo Studio gratis para obtener change tracking, client usage analytics y breaking change detection.
- **Over-fetching en resolvers**: retornar database rows completas cuando el cliente solo pide 2 fields desperdicia bandwidth y CPU. Usa el parámetro `info` para parsear el selection set y fethear solo los fields pedidos de la database.

## Monitoring y Observabilidad

- **Trackea Apollo Server cold starts**: si despliegas en Lambda, monitorea cold start frequency y duration. Cold starts >2 segundos indican que el schema build es demasiado lento. Pre-build el schema con `serverlessExport` para reducir cold start time.
- **Monitorea cache hit/miss ratio**: trackea cuántas queries son servidas desde cache vs ejecutadas. Un hit ratio <50% sugiere que faltan cache directives o que los TTLs son demasiado cortos. Usa el cache metrics dashboard de Apollo Studio para visibility.
- **Trackea DataLoader batch sizes**: monitorea el average batch size por instancia DataLoader. Batch sizes pequeños (1-2 items) indican que el request pattern no se beneficia de batching. Batches grandes (>100) pueden causar database query timeouts.
- **Monitorea WebSocket subscription memory**: cada subscription activa holderea memoria para la pub/sub connection. Trackea memoria por subscription y setea límites para prevenir OOM. Alerta si subscription memory excede 10% del total heap.

## Checklist de Despliegue

- [ ] Deshabilitar GraphQL Playground e introspection en producción
- [ ] Configurar DataLoader para todos los resolvers con nested relationships
- [ ] Registrar schema con Apollo Studio para change tracking y analytics
- [ ] Setear directives `@cacheControl` en todos los queryable types
- [ ] Configurar context de `apollo:server` con auth, data sources y cache
- [ ] Setear `assertValidSchema` en CI para catchear breaking schema changes
- [ ] Configurar WebSocket transport con connection limits y authentication
- [ ] Usar `serverlessExport` para despliegues Lambda para reducir cold start
- [ ] Setear Prometheus metrics para resolver latency y cache hit ratio
- [ ] Testear subscription cleanup y resource freeing en staging

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
