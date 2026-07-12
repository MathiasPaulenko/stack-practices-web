---





contentType: guides
slug: complete-guide-graphql-caching
title: "Referencia Detallada de Caching GraphQL"
description: "Cachear respuestas GraphQL en cada capa: CDN, gateway, DataLoader, persisted queries y cliente. Cubre cache keys, invalidacion, directivas HTTP caching y Apollo Client cache."
metaDescription: "Cachear GraphQL en cada capa: CDN, gateway, DataLoader, persisted queries, cliente. Cubre cache keys, invalidacion, directivas HTTP y Apollo Client cache."
difficulty: advanced
topics:
  - graphql
  - caching
  - performance
tags:
  - graphql
  - caching
  - guia
  - cdn
  - dataloader
  - persisted-queries
  - apollo-client
  - cache-invalidation
relatedResources:
  - /guides/complete-guide-graphql-schema-design
  - /guides/complete-guide-graphql-security
  - /patterns/graphql-dataloader-pattern
  - /guides/complete-guide-graphql-testing
  - /guides/complete-guide-cdn-caching-strategy
  - /guides/complete-guide-redis-caching-strategies
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cachear GraphQL en cada capa: CDN, gateway, DataLoader, persisted queries, cliente. Cubre cache keys, invalidacion, directivas HTTP y Apollo Client cache."
  keywords:
    - graphql caching
    - graphql cdn caching
    - graphql dataloader
    - graphql persisted queries
    - apollo client cache
    - graphql cache invalidation
    - graphql http caching





---

## Introducción

El caching en GraphQL es mas dificil que en REST porque cada request va a la misma URL (`/graphql`) con un body POST diferente. REST puede cachear a nivel de URL; GraphQL necesita cache keys basadas en el contenido de la query. A pesar de esto, hay multiples capas donde puedes cachear datos GraphQL efectivamente. Lo siguiente recorre cada capa desde CDN hasta cliente, con ejemplos de codigo y tradeoffs.

## Capas de Caching

```text
Client Cache (Apollo Client) → CDN/Edge Cache → Gateway Cache → DataLoader (por-request) → Database
```

Cada capa sirve un proposito diferente:

- **Client cache**: Evita requests de red redundantes para los mismos datos
- **CDN/edge cache**: Sirve respuestas cerca de los usuarios geograficamente
- **Gateway cache**: Cachea respuestas de subgrafos para reducir carga de subgrafos
- **DataLoader**: Batchea y cachea dentro de una sola request para prevenir N+1
- **Database cache**: Cachea resultados de queries a nivel ORM o base de datos

## HTTP Caching con GET Requests

### Cambiar de POST a GET

Por defecto, los clientes GraphQL envian POST requests. Las respuestas POST no son cacheables por CDNs o browsers. Cambia a GET para queries cacheables.

```javascript
// Apollo Client: usar GET para queries
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "/graphql",
    useGETForQueries: true,
  }),
  cache: new InMemoryCache(),
});
```

El servidor debe soportar GET requests con la query en la URL:

```javascript
// Express server
app.get("/graphql", (req, res) => {
  const { query, variables, operationName } = req.query;
  // Ejecutar y retornar
});
```

### Directivas Cache-Control

Usa la directiva `@cacheControl` para setear max-age y scope en tipos y campos.

```graphql
type Query {
  product(id: ID!): Product @cacheControl(maxAge: 3600)
  products: [Product!]! @cacheControl(maxAge: 600)
  currentUser: User @cacheControl(maxAge: 0, scope: PRIVATE)
}

type Product @cacheControl(maxAge: 3600) {
  id: ID!
  name: String!
  price: Float!
}

type User @cacheControl(maxAge: 0, scope: PRIVATE) {
  id: ID!
  email: String!
}
```

El servidor calcula la politica de cache para cada query basandose en los campos solicitados. Si una query incluye cualquier campo `PRIVATE`, toda la respuesta es privada. El max-age es el minimo de los valores max-age de todos los campos.

```javascript
import { ApolloServerPluginCacheControl } from "@apollo/server/plugin/cacheControl";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginCacheControl({ defaultMaxAge: 0 })],
});
```

El plugin setea headers `Cache-Control: max-age=3600, public` o `Cache-Control: max-age=0, private` en las respuestas.

## CDN Caching

### Cómo Funciona el CDN Caching para GraphQL

Cuando usas GET requests con cache-control headers, los CDNs (Cloudflare, Fastly, CloudFront) cachean respuestas basandose en la URL completa incluyendo query string.

```text
GET /graphql?query={product(id:1){id name price}}&variables={}
```

El CDN almacena la respuesta y la sirve directamente para URLs identicas. Esto funciona bien para datos publicos, no especificos de usuario.

### Consideraciones de Cache Key

La cache key es la URL completa. Dos queries que difieren solo en whitespace producen cache keys diferentes. Usa persisted queries para normalizar cache keys.

### Persisted Queries para CDN Caching

Con persisted queries, el cliente envia un hash en lugar de la query completa:

```text
GET /graphql?extensions={"persistedQuery":{"sha256Hash":"abc123","version":1}}
```

Todos los clientes que usan la misma query producen la misma URL, maximizando cache hits del CDN.

```javascript
import { createPersistedQueryLink } from "@apollo/client/link/persisted-queries";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { sha256 } from "crypto-hash";

const persistedQueryLink = createPersistedQueryLink({ sha256 });
const httpLink = new HttpLink({ uri: "/graphql", useGETForQueries: true });

const client = new ApolloClient({
  link: persistedQueryLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

### Purge del CDN en Cambios de Datos

Cuando los datos cambian, purga el cache del CDN. Usa webhooks o llamadas API al proveedor de CDN.

```javascript
// Despues de actualizar un producto
async function purgeProductCache(productId) {
  await fetch("https://api.fastly.com/purge/abc123", {
    method: "POST",
    headers: { "Fastly-Key": process.env.FASTLY_KEY },
    body: JSON.stringify({ surrogates: [`product-${productId}`] }),
  });
}
```

Usa surrogate keys en el header de respuesta `Surrogate-Key` para etiquetar respuestas para purging dirigido:

```javascript
res.setHeader("Surrogate-Key", `product-${productId} products`);
```

## Caching a Nivel de Gateway

### Apollo Router Cache

Apollo Router puede cachear respuestas de subgrafos. Esto reduce la carga en subgrafos para queries repetidas.

```yaml
# router.yaml
supergraph:
  cache:
    enabled: true
    ttl: 300s
```

### Entity Cache

Cachea resultados de resolucion de entidades para que referencias repetidas no hitteen el subgrafo.

```yaml
# router.yaml
apq:
  router:
    cache:
      in_memory:
        limit: 1000
```

## DataLoader: Caching Por-Request

DataLoader batchea y cachea dentro de una sola request GraphQL. Previene N+1 queries agrupando cargas individuales en un batch.

```javascript
import DataLoader from "dataloader";

const resolvers = {
  Query: {
    products: async (_root, { ids }, ctx) => {
      const products = await ctx.db.products.findMany({ where: { id: { in: ids } } });
      return products;
    },
  },
  Product: {
    category: (product, _args, ctx) => ctx.loaders.categoryLoader.load(product.categoryId),
  },
};

// Fabrica de context: crear DataLoaders frescos por request
function createContext(db) {
  return {
    db,
    loaders: {
      categoryLoader: new DataLoader(async (categoryIds) => {
        const categories = await db.categories.findMany({ where: { id: { in: categoryIds } } });
        const map = new Map(categories.map((c) => [c.id, c]));
        return categoryIds.map((id) => map.get(id));
      }),
    },
  };
}
```

### Caching de DataLoader Dentro de una Request

DataLoader cachea por key dentro de una sola request. Si dos resolvers llaman `load(42)`, la base de datos se query una vez. La segunda llamada retorna el resultado cacheado. Este cache es por-request: una nueva request obtiene DataLoaders frescos.

### DataLoader vs Redis Cache

DataLoader es un cache por-request. Redis es un cache cross-request. Usa ambos: DataLoader previene N+1 dentro de una request, Redis previene queries redundantes de base de datos entre requests.

```javascript
const categoryLoader = new DataLoader(async (categoryIds) => {
  // Checkear Redis primero
  const cached = await ctx.redis.mget(categoryIds.map((id) => `category:${id}`));
  const missing = categoryIds.filter((id, i) => !cached[i]);
  
  // Fetchear faltantes de base de datos
  if (missing.length > 0) {
    const fromDb = await db.categories.findMany({ where: { id: { in: missing } } });
    await Promise.all(fromDb.map((c) => ctx.redis.set(`category:${c.id}`, JSON.stringify(c), "EX", 3600)));
  }
  
  // Mergear cacheados y frescos
  return categoryIds.map((id, i) => cached[i] ? JSON.parse(cached[i]) : fromDb.find((c) => c.id === id));
});
```

## Caching del Lado del Cliente con Apollo Client

### Cache Normalizado

Apollo Client almacena datos en un cache normalizado por `__typename:id`. Esto significa que actualizar un producto en una query lo actualiza en todas partes.

```javascript
import { ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Product: {
        keyFields: ["id"],
      },
      Query: {
        fields: {
          products: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});
```

### Actualizaciones de Cache Después de Mutaciones

Despues de una mutacion, actualiza el cache para reflejar el cambio sin refetchear.

```javascript
const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      product { id name price }
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProducts {
    products { id name price }
  }
`;

function CreateProduct() {
  const [createProduct] = useMutation(CREATE_PRODUCT, {
    update(cache, { data }) {
      const newProduct = data.createProduct.product;
      cache.modify({
        fields: {
          products(existing = []) {
            cache.writeFragment({
              data: newProduct,
              fragment: gql`fragment NewProduct on Product { id name price }`,
            });
            return [...existing, newProduct];
          },
        },
      });
    },
  });
  // ...
}
```

### Persistencia de Cache

Persiste el cache a localStorage o sessionStorage para que sobreviva recargas de pagina.

```javascript
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { LocalStorageWrapper, persistCache } from "apollo3-cache-persist";

const cache = new InMemoryCache();

await persistCache({
  cache,
  storage: new LocalStorageWrapper(window.localStorage),
  maxSize: 1048576, // 1MB
});
```

## Estrategias de Invalidación de Cache

### Expiración Basada en TTL

Setea un time-to-live en los datos cacheados. Despues de que el TTL expira, la siguiente request fetchea datos frescos. Simple pero puede servir datos stale por la duracion del TTL.

```javascript
// Redis SET con TTL
await redis.set("product:42", JSON.stringify(product), "EX", 3600); // 1 hora
```

### Invalidación Event-Driven

Publica eventos de invalidacion cuando los datos cambian. Los suscriptores eliminan la entrada de cache.

```javascript
// Despues de actualizar un producto
async function updateProduct(id, data) {
  const product = await db.products.update({ where: { id }, data });
  await redis.del(`product:${id}`);
  await redis.publish("cache-invalidation", JSON.stringify({ type: "product", id }));
  return product;
}

// Suscriptor
redis.subscribe("cache-invalidation", (message) => {
  const { type, id } = JSON.parse(message);
  redis.del(`${type}:${id}`);
});
```

### Cache Keys Versionadas

Incluye un numero de version en la cache key. Incrementa la version cuando los datos cambian. Las entradas de cache viejas expiran naturalmente.

```javascript
const version = await redis.get("product:version") || "1";
const cacheKey = `product:${id}:v${version}`;
const cached = await redis.get(cacheKey);
```

### Invalidación Basada en Tags

Etiqueta entradas de cache con entidades relacionadas. Purga por tag.

```javascript
// Set con tags
await redis.set("product:42", JSON.stringify(product), "EX", 3600);
await redis.sadd("tag:category:5", "product:42");

// Purgar por tag
async function purgeCategory(categoryId) {
  const keys = await redis.smembers(`tag:category:${categoryId}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:category:${categoryId}`);
  }
}
```

## Qué Cachear vs Qué No Cachear

### Cachear

- Datos publicos, de mucha lectura (catalogos de productos, blog posts, categorias)
- Datos que cambian infrecuentemente (configuraciones, datos de referencia)
- Datos agregados (conteos, resumenes, reportes)
- Datos especificos de usuario con TTL corto (perfil, preferencias)

### No Cachear

- Datos en tiempo real (precios de acciones, resultados en vivo)
- Datos sensibles que requieren lecturas frescas (saldo de cuenta, registros medicos)
- Datos detras de mutaciones que deben ser inmediatamente consistentes
- Tokens de autenticacion y datos de sesion

## Checklist de Producción

- [ ] GET requests habilitados para queries cacheables
- [ ] Directivas `@cacheControl` en tipos y campos publicos
- [ ] Persisted queries habilitadas para cache keys consistentes en CDN
- [ ] CDN configurado para cachear respuestas `public`
- [ ] Mecanismo de purge de CDN para cambios de datos
- [ ] DataLoader para todos los resolvers de lista y relacion
- [ ] Redis cache para entidades frecuentemente accedidas
- [ ] Apollo Client normalized cache configurado
- [ ] Actualizaciones de cache despues de mutaciones (sin datos stale)
- [ ] Persistencia de cache para soporte offline (si se necesita)
- [ ] Monitoreo de cache hit rate en cada capa
- [ ] TTLs seteados apropiadamente por tipo de dato

## Preguntas Frecuentes

### ¿Por qué no puedo cachear GraphQL como REST?

REST cachea por URL. Cada recurso tiene una URL unica, por lo que el CDN o browser puede cachearlo. GraphQL envia todas las requests a `/graphql`, por lo que la URL es la misma para cada query. Para cachear GraphQL, necesitas GET requests con la query en la URL, o persisted queries que produzcan cache keys consistentes.

### ¿Debería cachear mutaciones?

No. Las mutaciones cambian datos y deben llegar al servidor. Solo cachea queries (operaciones de lectura). La directiva `@cacheControl` solo aplica a respuestas de query.

### ¿Por cuánto tiempo debería cachear datos?

Depende de cuan stale pueden estar los datos. Catalogos de productos: 1 hora. Perfiles de usuario: 5 minutos. Configuraciones: 24 horas. Datos en tiempo real: 0 (sin cache). Setea el TTL al maximo staleness aceptable para cada tipo de dato.

### ¿Cuál es la diferencia entre Apollo Client cache y server cache?

Apollo Client cache esta en el browser. Previene requests de red redundantes y habilita actualizaciones instantaneas de UI despues de mutaciones. Server cache (CDN, Redis, DataLoader) previene queries redundantes de base de datos y computacion. Ambas capas son necesarias para una aplicacion rapida.

### ¿Cómo testeo el comportamiento del cache?

Testea que queries repetidas retornen resultados cacheados (checkea headers de respuesta para `Age` y `X-Cache: HIT`). Testea que las mutaciones invaliden el cache. Testea que no se sirvan datos stale despues de actualizaciones. Usa `client.cache.extract()` de Apollo Client para inspeccionar el cache del cliente.

### ¿Debería usar Redis o Memcached para caching GraphQL?

Redis soporta datos estructurados (hashes, sets, sorted sets), TTLs, y pub/sub para invalidacion de cache. Memcached es mas simple y rapido para caching key-value. Usa Redis si necesitas invalidacion basada en tags o pub/sub. Usa Memcached para caching simple basado en TTL.

## See Also

- [Complete Guide to CDN Caching Strategy](/es/guides/complete-guide-cdn-caching-strategy/)
- [Complete Guide to LLM Cost Optimization](/es/guides/complete-guide-llm-cost-optimization/)
- [Complete Guide to Application-Level Caching](/es/guides/complete-guide-application-level-caching/)
- [Complete Guide to Cache Invalidation](/es/guides/complete-guide-cache-invalidation/)
- [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/)

