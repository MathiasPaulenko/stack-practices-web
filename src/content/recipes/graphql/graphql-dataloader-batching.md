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

## FAQ

**Q: Does DataLoader cache across requests?**
A: No. The default cache is per-instance. Since you create a new instance per request, the cache is request-scoped. For cross-request caching, use Redis or another shared store.

**Q: Can I use DataLoader with non-GraphQL code?**
A: Yes. DataLoader works anywhere you need to batch individual async loads. It is not tied to GraphQL.

**Q: What happens if a batch function throws?**
A: The error propagates to all pending `.load()` calls for that batch. Handle errors per-key by returning `Error` objects in the result array instead.

**Q: Should I use DataLoader for one-to-many relationships?**
A: Yes. For one-to-many (e.g., user.posts), the batch function groups results by foreign key and returns arrays per key.
