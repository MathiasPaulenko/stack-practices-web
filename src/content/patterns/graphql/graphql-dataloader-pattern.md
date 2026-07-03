---
contentType: patterns
slug: graphql-dataloader-pattern
title: "GraphQL DataLoader Pattern"
description: "Coalesce individual load requests into batched calls with per-request caching to prevent N+1 queries and redundant fetches."
metaDescription: "Coalesce individual GraphQL load requests into batched calls with DataLoader. Per-request caching, deduplication, and automatic batching."
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
  metaDescription: "Coalesce individual GraphQL load requests into batched calls with DataLoader. Per-request caching, deduplication, and automatic batching."
  keywords:
    - dataloader
    - pattern
    - batching
    - caching
    - n-plus-1
---

## Overview

DataLoader is a generic utility that coalesces individual `load()` calls into a single batched request. It was built at Facebook to solve the N+1 query problem in GraphQL servers. Within one tick of the event loop, all calls to `load(key)` are collected, deduplicated, and passed to a batch function that fetches all keys at once. Results are cached for the lifetime of the loader instance.

The pattern is not GraphQL-specific — it works anywhere you need to batch individual async lookups. But it shines in GraphQL where nested resolvers independently request related data.

## When to Use

- GraphQL resolvers that fetch related entities per parent item
- Any async lookup pattern where individual calls can be batched (database, REST, gRPC)
- Preventing duplicate fetches when the same key is requested multiple times in one operation
- Gateway or BFF layers that aggregate data from multiple backend services

## When Not to Use

- Single-item lookups with no batching opportunity (N=1)
- Synchronous data access (DataLoader is async-only)
- Long-lived caches (DataLoader caches per request, not across requests)
- Real-time subscriptions where batching adds latency

## Solution

### 1. Basic DataLoader Setup

```typescript
import DataLoader from 'dataloader';

type User = { id: string; name: string; email: string };

async function batchUsers(ids: readonly string[]): Promise<User[]> {
  // Single query for all requested IDs
  const rows = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
  const map = new Map(rows.map((r) => [r.id, r]));

  // Must return in same order as input ids
  return ids.map((id) => map.get(id) ?? new Error(`User ${id} not found`));
}

const userLoader = new DataLoader(batchUsers);
```

### 2. Using in GraphQL Resolvers

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

When a query asks for 20 posts with their authors and comments with their authors, DataLoader batches:
- One call to `batchUsers` with all unique author IDs from posts and comments
- One call to `batchComments` with all comment ID arrays

### 3. Per-Request Context

Create fresh loaders for each GraphQL operation:

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

### 4. Caching and Deduplication

```typescript
// If two posts have the same authorId, the user is fetched once
const posts = [
  { id: 1, authorId: 'user-10' },
  { id: 2, authorId: 'user-10' }, // same user
  { id: 3, authorId: 'user-20' },
];

// Each resolver calls loaders.userLoader.load(post.authorId)
// DataLoader collects: ['user-10', 'user-10', 'user-20']
// Deduplicates to: ['user-10', 'user-20']
// One batch call, returns cached result for the second 'user-10'
```

### 5. Priming the Cache

When you already have data, prime the loader to avoid redundant fetches:

```typescript
const resolvers = {
  Query: {
    user: async (_parent, { id }, { db, loaders }) => {
      const user = await db.user.findById(id);

      // Prime the cache — nested resolvers calling load(id) get this instantly
      loaders.userLoader.prime(id, user);

      return user;
    },
  },
};
```

### 6. Clearing Cache After Mutations

```typescript
const resolvers = {
  Mutation: {
    updateUser: async (_parent, { id, input }, { db, loaders }) => {
      const user = await db.user.update(id, input);

      // Clear stale cache entry — next load() will re-fetch
      loaders.userLoader.clear(id);

      return user;
    },
  },
};
```

## Explanation

- **Batching**: All `load()` calls within one event loop tick are collected. DataLoader then calls the batch function once with all keys
- **Deduplication**: Duplicate keys in the same batch are requested once. All callers receive the same Promise
- **Per-request cache**: The cache is a `Map` on the loader instance. Since a new loader is created per request, cache is isolated
- **Order contract**: The batch function must return an array of the same length as the input, in the same order. DataLoader matches results to callers by index
- **Error handling**: Return an `Error` object at a specific index to reject only that caller, not the entire batch

## Variants

### DataLoader with Prisma

```typescript
const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
  });
  const map = new Map(users.map((u) => [u.id, u]));
  return ids.map((id) => map.get(id));
});
```

### DataLoader with Redis Pipeline

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

### Custom Cache Key Function

For composite or non-string keys:

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

### Max Batch Size

Limit batch size for database query constraints:

```typescript
const userLoader = new DataLoader(batchUsers, {
  maxBatchSize: 50,  // Max 50 IDs per SELECT ... IN (...) query
  batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms window
});
```

### Disabling Cache for Mutable Data

```typescript
const stockPriceLoader = new DataLoader(batchStockPrices, {
  cache: false, // Stock prices change constantly — don't cache
});
```

## Best Practices

- Create a new DataLoader instance per request — never share across requests
- Return results in the exact order of input keys in batch functions
- Use `prime()` when data is already available from a parent resolver
- Call `clear(id)` after mutations that modify cached entities
- Set `maxBatchSize` to keep `IN` clauses within database limits
- Return per-key `Error` objects instead of throwing in batch functions
- Use `cacheKeyFn` for non-string or composite keys
- Name loaders after the entity they load (`userLoader`, not `dataLoader`)

## Common Mistakes

- **Sharing a DataLoader across requests**: Cross-request caching leaks data between users and causes stale reads
- **Throwing in batch function**: Rejects the entire batch. Return `new Error()` at the failing index instead
- **Wrong result order**: DataLoader matches by position. Misaligned results silently return wrong data
- **Not clearing after mutations**: Stale cached data is returned for updated entities
- **Using DataLoader for long-lived caching**: DataLoader cache is per-request. Use Redis or application-level cache for cross-request caching
- **Missing `cacheKeyFn` for object keys**: `{ userId: '1' }` and `{ userId: '1' }` are different object references — cache misses every time

## FAQ

**Is DataLoader only for GraphQL?**

No. DataLoader is a general-purpose batching utility. It works anywhere you have individual async lookups that can be batched. GraphQL is the most common use case because nested resolvers independently request related data.

**How does DataLoader decide when to batch?**

DataLoader collects all `load()` calls within the current tick of the Node.js event loop. When the tick completes, it fires the batch function with all collected keys. You can customize the timing with `batchScheduleFn`.

**Should I use DataLoader with federation?**

Federation's query planner already batches field resolution across services. For subgraph-internal resolvers (database queries within one service), DataLoader is still useful.

**What happens if a key is not found?**

Return `null` at that index for "not found" as a non-error case. Return `new Error('not found')` at that index if you want the caller's `load()` to reject. Choose one convention and stick to it.

**Can I use DataLoader with Python or other languages?**

Yes. `aiodataloader` for Python (asyncio), `dataloader-go` for Go, and similar implementations exist for other languages. The batching concept is language-agnostic.
