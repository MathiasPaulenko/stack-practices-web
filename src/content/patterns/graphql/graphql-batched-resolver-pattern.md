---
contentType: patterns
slug: graphql-batched-resolver-pattern
title: "GraphQL Batched Resolver Pattern"
description: "Resolve nested GraphQL fields in a single batched request to eliminate N+1 queries and reduce database load."
metaDescription: "Eliminate GraphQL N+1 queries with batched resolvers. Group field resolutions into a single batch call using DataLoader and per-request caching."
difficulty: intermediate
category: structural
topics:
  - graphql
  - performance
  - api
tags:
  - batched-resolver
  - pattern
  - dataloader
  - n-plus-1
  - graphql-performance
relatedResources:
  - /patterns/graphql-dataloader-pattern
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Eliminate GraphQL N+1 queries with batched resolvers. Group field resolutions into a single batch call using DataLoader and per-request caching."
  keywords:
    - batched-resolver
    - pattern
    - dataloader
    - n-plus-1
    - graphql-performance
---

## Overview

When a GraphQL query asks for nested fields across a list, each item triggers a separate database call. Querying 50 posts and their authors produces 50 extra `SELECT` statements — the classic N+1 problem. Batched resolvers collect all keys from the list, make one batched request, and distribute results back to each item.

The pattern pairs naturally with DataLoader, which handles batching, caching, and deduplication per request.

## When to Use

- Resolvers that fetch related data per parent item (posts → author, orders → product)
- Lists of items where each item has a nested relationship
- Any GraphQL field that triggers a database query or API call per parent
- Gateway or stitching layers that delegate to backend services

## When Not to Use

- Single-item queries where N=1 (no batching benefit)
- Fields resolved from already-loaded data on the parent object (use direct property access)
- Real-time subscriptions where batching windows add unacceptable latency

## Solution

### 1. The N+1 Problem

Without batching, each post triggers a separate author lookup:

```typescript
const resolvers = {
  Post: {
    author: (post, _args, { db }) => {
      // Called once per post — 50 posts = 50 queries
      return db.user.findById(post.authorId);
    },
  },
};
```

Querying 50 posts generates 50 SQL queries:

```sql
SELECT * FROM users WHERE id = 1;
SELECT * FROM users WHERE id = 2;
SELECT * FROM users WHERE id = 1;  -- duplicate
SELECT * FROM users WHERE id = 3;
-- ... 46 more
```

### 2. DataLoader: Batch and Cache

DataLoader collects all `authorId` values within a single tick of the event loop, deduplicates them, and sends one batch request.

```typescript
import DataLoader from 'dataloader';

async function batchLoadUsers(userIds: readonly string[], { db }) {
  // One query: SELECT * FROM users WHERE id IN (1, 2, 3, ...)
  const users = await db.user.findMany({ where: { id: { in: [...userIds] } } });

  // DataLoader expects results in the same order as the input keys
  const userMap = new Map(users.map((u) => [u.id, u]));
  return userIds.map((id) => userMap.get(id) ?? new Error(`User ${id} not found`));
}

// Create a new DataLoader per request to avoid cross-request caching
function createLoaders(context) {
  return {
    userLoader: new DataLoader(
      (ids) => batchLoadUsers(ids, context),
      { cacheKeyFn: (key) => key.toString() }
    ),
  };
}
```

### 3. Use the Loader in Resolvers

```typescript
const resolvers = {
  Post: {
    author: (post, _args, { loaders }) => {
      // DataLoader batches all calls within the same tick
      return loaders.userLoader.load(post.authorId);
    },
  },
  Query: {
    posts: async (_parent, _args, { db }) => {
      return db.post.findMany({ take: 50 });
    },
  },
};
```

Now 50 posts produce one SQL query:

```sql
SELECT * FROM users WHERE id IN (1, 2, 3, 4, 5, ...);
```

### 4. Per-Request Loader Initialization

Create fresh loaders for each request to prevent leaking cached data between users:

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const db = getDatabase();
    const loaders = createLoaders({ db });
    return { db, loaders, user: req.headers.authorization };
  },
  listen: { port: 4000 },
});
```

### 5. Batching Across Multiple Fields

DataLoader batches across different resolver fields too. If a query asks for both `post.author` and `comment.author`, both resolve through the same `userLoader`:

```typescript
const resolvers = {
  Post: {
    author: (post, _args, { loaders }) => loaders.userLoader.load(post.authorId),
  },
  Comment: {
    author: (comment, _args, { loaders }) => loaders.userLoader.load(comment.authorId),
  },
};
```

A query like `{ posts { author { name } } comments { author { name } } }` still produces one batched call for all author IDs.

## Explanation

- **Batching window**: DataLoader collects all `.load()` calls within one tick of the Node.js event loop, then fires the batch function once
- **Deduplication**: If two posts have the same `authorId`, DataLoader requests that user once and returns the cached result for both
- **Per-request cache**: The cache lives only for the duration of one GraphQL operation, preventing stale data across requests
- **Order preservation**: The batch function must return results in the same order as the input keys — DataLoader matches results to callers by position

## Variants

### Custom Batch Functions for REST APIs

Batch against a REST endpoint that accepts multiple IDs:

```typescript
const productLoader = new DataLoader(async (productIds: readonly string[]) => {
  const response = await fetch(
    `https://api.example.com/products?ids=${productIds.join(',')}`
  );
  const products = await response.json();
  const productMap = new Map(products.map((p) => [p.id, p]));
  return productIds.map((id) => productMap.get(id));
});
```

### Batch with Max Batch Size

Limit batch size to avoid oversized SQL `IN` clauses:

```typescript
const userLoader = new DataLoader(batchLoadUsers, {
  maxBatchSize: 100,
  cache: true,
});
```

### Batch with Priming

Pre-populate the cache when you already have data:

```typescript
Query: {
  user: async (_parent, { id }, { db, loaders }) => {
    const user = await db.user.findById(id);
    // Prime the cache so nested resolvers don't re-fetch
    loaders.userLoader.prime(id, user);
    return user;
  },
},
```

### Batch with Custom Cache Key

For composite keys (e.g., tenant + user ID):

```typescript
const loader = new DataLoader(batchLoad, {
  cacheKeyFn: (key) => `${key.tenantId}:${key.userId}`,
});
```

## Best Practices

- Create one DataLoader instance per request, never shared across requests
- Always return results in the same order as the input keys in batch functions
- Use `prime()` when you already have data to avoid redundant fetches
- Set `maxBatchSize` to keep SQL `IN` clauses within database limits
- Handle errors per-key: return an `Error` object for failed items, not a thrown exception
- Monitor batch sizes in production to catch unexpected query patterns

## Common Mistakes

- **Sharing DataLoader across requests**: Causes data leaks between users and stale cache hits
- **Returning results out of order**: DataLoader matches by position, so misaligned results silently return wrong data
- **Throwing in batch function**: One failed key rejects the entire batch. Return `new Error()` per item instead
- **Not using `cacheKeyFn` for non-string keys**: Objects as keys cause cache misses because `{}` !== `{}` by reference
- **Forgetting to clear cache on mutations**: After updating a user, call `loader.clear(id)` to prevent stale reads

## FAQ

**Does DataLoader work with subscriptions?**

Yes, but the batching window may behave differently. For subscriptions, consider disabling batching or using a shorter batch interval.

**How is this different from the DataLoader pattern?**

The batched resolver pattern is the broader concept — DataLoader is one implementation. You can also batch with custom logic, Redis pipelines, or GraphQL.js's `info` field collection.

**Can I batch mutations?**

Not directly. Mutations execute sequentially by design. Use a single mutation with list input instead of multiple mutation calls.

**What about batching in federation?**

Apollo Federation's query planner automatically batches field resolution across services. If you're using federation, you may not need manual DataLoader for cross-service fields.
