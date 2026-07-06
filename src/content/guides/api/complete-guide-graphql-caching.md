---
contentType: guides
slug: complete-guide-graphql-caching
title: "Complete Guide to GraphQL Caching"
description: "Cache GraphQL responses at every layer: CDN, gateway, DataLoader, persisted queries, and client-side. Covers cache keys, invalidation, HTTP caching directives, and Apollo Client cache."
metaDescription: "Cache GraphQL at every layer: CDN, gateway, DataLoader, persisted queries, client. Covers cache keys, invalidation, HTTP directives, and Apollo Client cache."
difficulty: advanced
topics:
  - graphql
  - caching
  - performance
tags:
  - graphql
  - caching
  - guide
  - cdn
  - dataloader
  - persisted-queries
  - apollo-client
  - cache-invalidation
relatedResources:
  - /guides/api/complete-guide-graphql-schema-design
  - /guides/api/complete-guide-graphql-security
  - /patterns/graphql/graphql-dataloader-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache GraphQL at every layer: CDN, gateway, DataLoader, persisted queries, client. Covers cache keys, invalidation, HTTP directives, and Apollo Client cache."
  keywords:
    - graphql caching
    - graphql cdn caching
    - graphql dataloader
    - graphql persisted queries
    - apollo client cache
    - graphql cache invalidation
    - graphql http caching
---

## Introduction

GraphQL caching is harder than REST caching because every request goes to the same URL (`/graphql`) with a different POST body. REST can cache at the URL level; GraphQL needs cache keys based on the query content. Despite this, there are multiple layers where you can cache GraphQL data effectively. The following guide covers each layer from CDN to client, with code examples and tradeoffs.

## Caching Layers

```text
Client Cache (Apollo Client) → CDN/Edge Cache → Gateway Cache → DataLoader (per-request) → Database
```

Each layer serves a different purpose:

- **Client cache**: Avoids redundant network requests for the same data
- **CDN/edge cache**: Serves responses close to users geographically
- **Gateway cache**: Caches subgraph responses to reduce subgraph load
- **DataLoader**: Batches and caches within a single request to prevent N+1
- **Database cache**: Caches query results at the ORM or database level

## HTTP Caching with GET Requests

### Switch from POST to GET

By default, GraphQL clients send POST requests. POST responses are not cacheable by CDNs or browsers. Switch to GET for cacheable queries.

```javascript
// Apollo Client: use GET for queries
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "/graphql",
    useGETForQueries: true,
  }),
  cache: new InMemoryCache(),
});
```

The server must support GET requests with the query in the URL:

```javascript
// Express server
app.get("/graphql", (req, res) => {
  const { query, variables, operationName } = req.query;
  // Execute and return
});
```

### Cache-Control Directives

Use the `@cacheControl` directive to set max-age and scope on types and fields.

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

The server calculates the cache policy for each query based on the fields requested. If a query includes any `PRIVATE` field, the entire response is private. The max-age is the minimum of all fields' max-age values.

```javascript
import { ApolloServerPluginCacheControl } from "@apollo/server/plugin/cacheControl";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginCacheControl({ defaultMaxAge: 0 })],
});
```

The plugin sets `Cache-Control: max-age=3600, public` or `Cache-Control: max-age=0, private` headers on responses.

## CDN Caching

### How CDN Caching Works for GraphQL

When using GET requests with cache-control headers, CDNs (Cloudflare, Fastly, CloudFront) cache responses based on the full URL including query string.

```
GET /graphql?query={product(id:1){id name price}}&variables={}
```

The CDN stores the response and serves it directly for identical URLs. This works well for public, non-user-specific data.

### Cache Key Considerations

The cache key is the full URL. Two queries that differ only in whitespace produce different cache keys. Use persisted queries to normalize cache keys.

### Persisted Queries for CDN Caching

With persisted queries, the client sends a hash instead of the full query:

```
GET /graphql?extensions={"persistedQuery":{"sha256Hash":"abc123","version":1}}
```

All clients using the same query produce the same URL, maximizing CDN cache hits.

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

### CDN Purge on Data Changes

When data changes, purge the CDN cache. Use webhooks or API calls to the CDN provider.

```javascript
// After updating a product
async function purgeProductCache(productId) {
  await fetch("https://api.fastly.com/purge/abc123", {
    method: "POST",
    headers: { "Fastly-Key": process.env.FASTLY_KEY },
    body: JSON.stringify({ surrogates: [`product-${productId}`] }),
  });
}
```

Use surrogate keys in the `Surrogate-Key` response header to tag responses for targeted purging:

```javascript
res.setHeader("Surrogate-Key", `product-${productId} products`);
```

## Gateway-Level Caching

### Apollo Router Cache

Apollo Router can cache subgraph responses. This reduces load on subgraphs for repeated queries.

```yaml
# router.yaml
supergraph:
  cache:
    enabled: true
    ttl: 300s
```

### Entity Cache

Cache entity resolution results so repeated entity references do not hit the subgraph.

```yaml
# router.yaml
apq:
  router:
    cache:
      in_memory:
        limit: 1000
```

## DataLoader: Per-Request Caching

DataLoader batches and caches within a single GraphQL request. It prevents N+1 queries by grouping individual loads into one batch.

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

// Context factory: create fresh DataLoaders per request
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

### DataLoader Caching Within a Request

DataLoader caches by key within a single request. If two resolvers call `load(42)`, the database is queried once. The second call returns the cached result. This cache is per-request: a new request gets fresh DataLoaders.

### DataLoader vs Redis Cache

DataLoader is a per-request cache. Redis is a cross-request cache. Use both: DataLoader prevents N+1 within a request, Redis prevents redundant database queries across requests.

```javascript
const categoryLoader = new DataLoader(async (categoryIds) => {
  // Check Redis first
  const cached = await ctx.redis.mget(categoryIds.map((id) => `category:${id}`));
  const missing = categoryIds.filter((id, i) => !cached[i]);
  
  // Fetch missing from database
  if (missing.length > 0) {
    const fromDb = await db.categories.findMany({ where: { id: { in: missing } } });
    await Promise.all(fromDb.map((c) => ctx.redis.set(`category:${c.id}`, JSON.stringify(c), "EX", 3600)));
  }
  
  // Merge cached and fresh
  return categoryIds.map((id, i) => cached[i] ? JSON.parse(cached[i]) : fromDb.find((c) => c.id === id));
});
```

## Client-Side Caching with Apollo Client

### Normalized Cache

Apollo Client stores data in a normalized cache by `__typename:id`. This means updating a product in one query updates it everywhere.

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

### Cache Updates After Mutations

After a mutation, update the cache to reflect the change without refetching.

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

### Cache Persistence

Persist the cache to localStorage or sessionStorage so it survives page reloads.

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

## Cache Invalidation Strategies

### TTL-Based Expiration

Set a time-to-live on cached data. After the TTL expires, the next request fetches fresh data. Simple but can serve stale data for up to the TTL duration.

```javascript
// Redis SET with TTL
await redis.set("product:42", JSON.stringify(product), "EX", 3600); // 1 hour
```

### Event-Driven Invalidation

Publish invalidation events when data changes. Subscribers delete the cache entry.

```javascript
// After updating a product
async function updateProduct(id, data) {
  const product = await db.products.update({ where: { id }, data });
  await redis.del(`product:${id}`);
  await redis.publish("cache-invalidation", JSON.stringify({ type: "product", id }));
  return product;
}

// Subscriber
redis.subscribe("cache-invalidation", (message) => {
  const { type, id } = JSON.parse(message);
  redis.del(`${type}:${id}`);
});
```

### Versioned Cache Keys

Include a version number in the cache key. Bump the version when data changes. Old cache entries expire naturally.

```javascript
const version = await redis.get("product:version") || "1";
const cacheKey = `product:${id}:v${version}`;
const cached = await redis.get(cacheKey);
```

### Tag-Based Invalidation

Tag cache entries with related entities. Purge by tag.

```javascript
// Set with tags
await redis.set("product:42", JSON.stringify(product), "EX", 3600);
await redis.sadd("tag:category:5", "product:42");

// Purge by tag
async function purgeCategory(categoryId) {
  const keys = await redis.smembers(`tag:category:${categoryId}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:category:${categoryId}`);
  }
}
```

## What to Cache vs What Not to Cache

### Cache

- Public, read-heavy data (product catalogs, blog posts, categories)
- Data that changes infrequently (configurations, reference data)
- Aggregated data (counts, summaries, reports)
- User-specific data with short TTL (profile, preferences)

### Do Not Cache

- Real-time data (stock prices, live scores)
- Sensitive data requiring fresh reads (account balance, medical records)
- Data behind mutations that must be immediately consistent
- Authentication tokens and session data

## Production Checklist

- [ ] GET requests enabled for cacheable queries
- [ ] `@cacheControl` directives on public types and fields
- [ ] Persisted queries enabled for consistent CDN cache keys
- [ ] CDN configured to cache `public` responses
- [ ] CDN purge mechanism for data changes
- [ ] DataLoader for all list and relationship resolvers
- [ ] Redis cache for frequently accessed entities
- [ ] Apollo Client normalized cache configured
- [ ] Cache updates after mutations (no stale data)
- [ ] Cache persistence for offline support (if needed)
- [ ] Monitoring for cache hit rate at each layer
- [ ] TTLs set appropriately per data type

## FAQ

### Why can't I cache GraphQL like REST?

REST caches by URL. Each resource has a unique URL, so the CDN or browser can cache it. GraphQL sends all requests to `/graphql`, so the URL is the same for every query. To cache GraphQL, you need GET requests with the query in the URL, or persisted queries that produce consistent cache keys.

### Should I cache mutations?

No. Mutations change data and must reach the server. Only cache queries (read operations). The `@cacheControl` directive only applies to query responses.

### How long should I cache data?

Depends on how stale the data can be. Product catalogs: 1 hour. User profiles: 5 minutes. Configurations: 24 hours. Real-time data: 0 (no cache). Set the TTL to the longest acceptable staleness for each data type.

### What is the difference between Apollo Client cache and server cache?

Apollo Client cache is in the browser. It prevents redundant network requests and enables instant UI updates after mutations. Server cache (CDN, Redis, DataLoader) prevents redundant database queries and computation. Both layers are needed for a fast application.

### How do I test cache behavior?

Test that repeated queries return cached results (check response headers for `Age` and `X-Cache: HIT`). Test that mutations invalidate the cache. Test that stale data is not served after updates. Use Apollo Client's `client.cache.extract()` to inspect the client cache.

### Should I use Redis or Memcached for GraphQL caching?

Redis supports structured data (hashes, sets, sorted sets), TTLs, and pub/sub for cache invalidation. Memcached is simpler and faster for key-value caching. Use Redis if you need tag-based invalidation or pub/sub. Use Memcached for simple TTL-based caching.
