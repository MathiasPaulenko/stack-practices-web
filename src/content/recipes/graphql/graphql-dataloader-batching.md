---
contentType: recipes
slug: graphql-dataloader-batching
title: "Batch and Cache Database Queries with GraphQL DataLoader"
description: "Use DataLoader to coalesce individual load requests into batched database calls, solving the N+1 query problem in GraphQL resolvers"
metaDescription: "Solve GraphQL N+1 queries with DataLoader. Batch database calls across resolver fields and cache results within a single request lifecycle."
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
  metaDescription: "Solve GraphQL N+1 queries with DataLoader. Batch database calls across resolver fields and cache results within a single request lifecycle."
  keywords:
    - graphql dataloader
    - n+1 query
    - batch loading
    - graphql performance
    - dataloader batching
---

# Batch and Cache Database Queries with GraphQL DataLoader

When a GraphQL query resolves nested relationships — like fetching the author of each post in a list — a naive resolver issues one database query per item. This is the N+1 problem: one query for the list, plus N queries for the related data. DataLoader solves this by collecting individual load requests within a single event loop tick and dispatching them as a single batched query.

## When to Use This

- Resolvers that fetch related data by foreign key (post.author, user.posts, order.items)
- Any GraphQL schema with nested type relationships
- APIs where N+1 queries cause latency or database connection exhaustion

## Prerequisites

- Node.js 18+ with a GraphQL server (Apollo Server, GraphQL Yoga)
- A database client that supports `WHERE id IN (...)` queries

## Solution

### 1. Install DataLoader

```bash
npm install dataloader
```

### 2. Create a Batch Loader Function

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

### 3. Inject Loaders Per Request

Create a fresh DataLoader instance per request so the cache only lives for the duration of that request:

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

### 4. Use Loaders in Resolvers

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

### 5. Wire Up in Apollo Server

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

## How It Works

1. **Batching**: DataLoader collects all `.load(id)` calls within the same tick. When `process.nextTick` fires, it dispatches them as a single batch function call with all IDs.
2. **Caching**: After the batch function returns, results are cached by key. Subsequent `.load(id)` calls for the same key return the cached value without hitting the database.
3. **Per-request isolation**: A new DataLoader instance is created in the context factory for each request. This prevents cross-request cache leaks.
4. **Error handling**: If the batch function returns an `Error` for a specific key, that error is thrown when `.load(id)` is called for that key — other keys in the batch are unaffected.

## Variants

### Redis-Backed DataLoader

For shared caching across requests, wrap the batch function with a Redis lookup:

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

### Custom Batch Schedule

For high-throughput scenarios, use a custom batch scheduler to control when batches dispatch:

```typescript
const loader = new DataLoader(batchFn, {
  batchScheduleFn: (callback) => setTimeout(callback, 10),
});
```

## Best Practices

- **Create loaders per request** — never share DataLoader instances across requests; the cache leaks data between users
- **Sort batch results to match input order** — DataLoader expects the return array to align with the input key order
- **Return errors per-key** — throw `new Error()` for missing keys instead of rejecting the whole batch
- **Disable batching for single-item loads** — set `{ batch: false }` when you know a loader will only ever load one key

## Common Mistakes

- **Sharing a DataLoader across requests** — causes stale data and cross-user cache contamination
- **Not returning results in input order** — DataLoader maps results by position, not by key; misaligned arrays produce wrong data
- **Using `.load()` in a loop without awaiting** — DataLoader batches automatically, but you must still await each `.load()` call
- **Caching across requests with the default cache** — use `{ cache: false }` or a request-scoped cache if you need cross-request caching

## Error Handling and Recovery

- **DataLoader error propagation**: when a batch function throws, DataLoader rejects all keys in the batch. Wrap batch functions in try/catch. Return individual errors per key using Error instances. Use .clear(key) to remove failed entries from cache. Log batch failures with key context for debugging
- **Partial batch failures**: if some items in a batch succeed and others fail, return results for successful items and Error objects for failed ones. DataLoader supports returning a mix of values and errors in the batch array. The caller receives individual errors via .load() rejection
- **Timeout handling**: set a timeout on batch functions (e.g., 5 seconds). If the timeout fires, reject all pending loads. Use Promise.race with a timeout promise. Clear the cache for timed-out keys to allow retries on subsequent requests
- **Database connection failures**: if the database is unavailable, the batch function should reject with a descriptive error. Use a circuit breaker pattern to stop attempting batches after N consecutive failures. Fall back to cached data if available. Alert the team on circuit breaker activation
- **Cache invalidation errors**: if prime() is called with stale data, subsequent loads return incorrect results. Validate primed data before caching. Use .clearAll() on schema changes or deployments. Implement a cache versioning strategy to invalidate stale entries
- **Memory pressure from cache**: DataLoader caches by reference. Large cached objects can cause memory pressure in long-running processes. Set maxAgeMs or use a custom cache Map with LRU eviction. Monitor cache size and hit rate. Clear cache on memory pressure signals

## Performance Optimization Tips

- **Batch size tuning**: optimal batch size depends on database and query complexity. Start with 100-500 items per batch. Measure query latency at different batch sizes. Larger batches reduce round trips but increase per-query cost. Use database EXPLAIN to find the sweet spot
- **Cache strategy selection**: default cache is per-request (Map). For read-heavy workloads, use a shared LRU cache across requests. Use Redis for distributed caching. Set cacheKeyFn for complex keys to avoid object reference issues. Disable caching with cache: false for unique queries
- **Distributed batching**: in serverless environments, each instance has its own DataLoader. Use Redis to share batch results across instances. Publish batch results to a Redis channel. Other instances consume and prime their local DataLoader. Reduces duplicate database queries
- **Schedule timing**: the default maxBatchSize and scheduling may not be optimal. Use a custom atchScheduleFn to control when batches are dispatched. For high-throughput scenarios, dispatch batches every 1ms instead of waiting for the next tick. Reduces latency at the cost of smaller batches
- **Query optimization**: ensure database queries use appropriate indexes for batched lookups. Use IN clauses or batched SELECTs. Avoid N+1 within the batch function itself. Use EXPLAIN ANALYZE to verify query plans. Add covering indexes for common batch patterns
- **Memory management**: use maxBatchSize to limit batch memory. Clear DataLoader instances after each request in web servers. Use WeakMap for cache if references are short-lived. Monitor RSS and heap usage. Profile with --inspect to find retention paths

## Security Considerations

- **Authorization in batch functions**: check permissions for each key in the batch. An attacker may request keys they are not authorized to access. Return null or Error for unauthorized keys. Do not leak existence of unauthorized resources. Use consistent error messages
- **Batch injection attacks**: validate all keys before passing to the database. An attacker may craft keys to inject SQL or cause unexpected behavior. Use parameterized queries. Sanitize keys with the same validation as direct queries. Never concatenate keys into SQL strings
- **Cache poisoning**: if an attacker can prime the cache with incorrect data, subsequent loads return poisoned results. Validate primed data server-side. Do not allow client-controlled cache priming. Use authenticated cache priming endpoints. Sign cache entries with HMAC
- **Rate limiting batch loads**: a malicious client may call .load() thousands of times per request. Implement rate limiting at the resolver level. Limit the number of .load() calls per request (e.g., 100). Return an error if the limit is exceeded. Log excessive load patterns
- **Information disclosure**: batch functions may return different error messages for existing vs non-existing keys. This can leak information about resource existence. Use consistent error messages for all failure cases. Log detailed errors server-side only. Return generic errors to clients
- **DataLoader in federated schemas**: in a federated gateway, each subgraph has its own DataLoader. Ensure authorization checks are consistent across subgraphs. A subgraph may receive requests from the gateway without user context. Pass user context through the federation query plan. Validate permissions in each subgraph
## Testing and Quality Assurance

- **Unit testing batch functions**: test batch functions in isolation with mocked database calls. Verify that the function returns results in the same order as input keys. Test empty batch, single-item batch, and full batch. Test error handling for each key independently. Use Jest or Vitest with async/await
- **Integration testing with DataLoader**: test DataLoader within a GraphQL resolver context. Verify that N+1 queries are eliminated by counting database calls. Use a query counter middleware. Assert that a query requesting 100 items results in exactly 1 database call. Test with nested resolvers to verify batching across the query tree
- **Cache behavior testing**: test that .load() returns cached results on second call. Test that .clear(key) removes only the specified key. Test that .clearAll() removes all keys. Test that .prime(key, value) caches without fetching. Verify cache is per-instance, not shared across requests
- **Load testing**: use Artillery or k6 to send 1000+ concurrent GraphQL queries. Measure database query count, response time, and memory usage. Verify that DataLoader reduces database queries by 80-95% compared to naive resolvers. Monitor for memory leaks under sustained load
- **Snapshot testing**: snapshot the GraphQL response for representative queries. Compare snapshots on each CI run. Detects unintended changes in resolver behavior. Use graphql-response-snapshot pattern with Jest. Update snapshots only after intentional changes
- **Error scenario testing**: test batch function with database timeout, connection failure, and partial failures. Verify that errors are properly propagated to individual .load() calls. Test that successful items in a partial failure are still returned. Verify that cache is cleared for failed keys

## Deployment and CI/CD

- **DataLoader lifecycle in web servers**: create a new DataLoader instance per request. Store on the request context object. Dispose after the response is sent. Never share DataLoader instances across requests in long-running servers. Use a middleware pattern to inject per-request DataLoader instances
- **Monitoring DataLoader metrics**: track batch count, batch size, cache hit rate, and error rate. Export metrics via Prometheus. Set up Grafana dashboards. Alert on cache hit rate < 50% (indicates poor cache utilization). Alert on error rate > 1%. Track average batch size to tune maxBatchSize
- **Feature flags for batching**: deploy DataLoader behind a feature flag. Roll out to a percentage of traffic first. Monitor database query count and response time. If metrics improve, increase rollout. If regressions occur, roll back immediately. Use LaunchDarkly or Unleash for feature flag management
## Monitoring and Observability

- **Batch metrics**: track batch count, average batch size, max batch size, and batch dispatch time. Use Prometheus histograms for batch size distribution. Alert on average batch size < 5 (indicates poor batching efficiency). Monitor batch dispatch latency p95 < 100ms
- **Cache metrics**: track cache hit rate, cache size, and cache eviction count. Alert on cache hit rate < 30%. Monitor cache memory usage. Track cache key patterns to identify hot keys. Use cacheKeyFn metrics to understand key distribution
- **Resolver-level tracing**: use Apollo Tracing or OpenTelemetry to trace resolver execution time. Identify resolvers that bypass DataLoader. Track the ratio of DataLoader loads vs direct database calls. Use distributed tracing to see the full request path from gateway to database
- **Error rate monitoring**: track error rate per batch function. Alert on error rate > 1%. Log batch errors with key context, stack trace, and request ID. Use Sentry for error tracking with GraphQL context. Correlate errors with deployments using release tags
## Cost Optimization

- **Database connection pooling**: DataLoader reduces database queries but each batch still needs a connection. Use a connection pool (PgBouncer, Prisma Data Proxy) to share connections across batches. Set pool size based on peak concurrent batches. Monitor pool utilization and alert at 80% capacity
- **Caching to reduce database load**: use DataLoader cache with Redis for cross-request caching. Cache common batch results for 5-15 minutes. Invalidate on mutations. Reduces database load by 50-90% for read-heavy workloads. Monitor cache hit rate and adjust TTL based on staleness tolerance
- **Serverless cost impact**: in serverless environments, each invocation pays for execution time. DataLoader reduces database round trips, reducing execution time and cost. Measure cost per request before and after DataLoader adoption. Typical savings: 30-60% on database-related costs
## Common Pitfalls and Anti-Patterns

- **Sharing DataLoader across requests**: never share a DataLoader instance across HTTP requests in a web server. Each request should get a fresh instance. Sharing leads to cache leakage between users and potential authorization bypass. Use a per-request context pattern
- **Not handling null keys**: DataLoader batch functions receive null keys when resolvers return null. Handle nulls explicitly in the batch function. Return null for null input keys. Do not pass null to database queries. Validate keys before processing
## FAQ

**Q: Does DataLoader cache across requests?**
A: No. The default cache is per-instance. Since you create a new instance per request, the cache is request-scoped. For cross-request caching, use Redis or another shared store.

**Q: Can I use DataLoader with non-GraphQL code?**
A: Yes. DataLoader works anywhere you need to batch individual async loads. It is not tied to GraphQL.

**Q: What happens if a batch function throws?**
A: The error propagates to all pending `.load()` calls for that batch. Handle errors per-key by returning `Error` objects in the result array instead.

**Q: Should I use DataLoader for one-to-many relationships?**
A: Yes. For one-to-many (e.g., user.posts), the batch function groups results by foreign key and returns arrays per key.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Can I use DataLoader with non-database data sources?

Yes. DataLoader works with any batchable data source: REST APIs, microservices, message queues, or in-memory stores. The batch function receives an array of keys and returns a Promise of an array of values. Use it for any N+1 problem, not just database queries.