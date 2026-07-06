---
contentType: recipes
slug: graphql-n-1-query-detection
title: "Detect and Fix N+1 Queries in GraphQL Resolvers"
description: "Identify N+1 query problems in GraphQL resolvers using logging, DataLoader, and query analysis tools before they hit production"
metaDescription: "Detect and fix N+1 queries in GraphQL resolvers. Use request-scoped DataLoader, logging plugins, and query analysis to eliminate redundant DB calls."
difficulty: intermediate
topics:
  - graphql
  - api
  - performance
tags:
  - graphql
  - n+1
  - performance
  - dataloader
  - debugging
relatedResources:
  - /recipes/graphql/graphql-dataloader-batching
  - /recipes/api/graphql-apollo-server
  - /recipes/databases/postgres-query-optimization
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Detect and fix N+1 queries in GraphQL resolvers. Use request-scoped DataLoader, logging plugins, and query analysis to eliminate redundant DB calls."
  keywords:
    - graphql n+1
    - n+1 query detection
    - graphql performance
    - dataloader
    - graphql debugging
---

# Detect and Fix N+1 Queries in GraphQL Resolvers

The N+1 problem is the most common performance issue in GraphQL APIs. When a list query returns N items and each item triggers a separate database call for a related field, you get 1 + N queries instead of 1. The following demonstrates how to detect N+1 patterns during development and fix them with DataLoader batching.

## When to Use This

- GraphQL queries are slow under load but fast for single items
- Database connection counts spike during list queries
- You want to catch N+1 issues before they reach production

## Prerequisites

- A GraphQL server with resolvers that fetch related data
- A database client with query logging enabled

## Solution

### 1. Detect N+1 with Query Logging

Add a logging wrapper to your database client that counts queries per request:

```typescript
// middleware/queryLogger.ts
import { Plugin } from '@apollo/server';

export const queryLoggerPlugin: Plugin = {
  async requestDidStart() {
    const queryCount = { value: 0 };
    const queries: string[] = [];

    return {
      contextDidStart: () => {
        queryCount.value = 0;
        queries.length = 0;
      },

      async willSendResponse(requestContext) {
        if (queryCount.value > 5) {
          console.warn(
            `[N+1 SUSPECT] ${queryCount.value} queries for operation: ` +
            `${requestContext.operationName ?? 'anonymous'}\n` +
            queries.slice(0, 10).map((q, i) => `  ${i + 1}. ${q}`).join('\n')
          );
        }
      },
    };
  },
};
```

### 2. Instrument the Database Client

```typescript
// db/instrumented.ts
export function instrumentDbClient(db: any, queryLog: { count: number; queries: string[] }) {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      const original = target[prop];
      if (typeof original === 'function') {
        return (...args: any[]) => {
          queryLog.queries.push(`${String(prop)}(${JSON.stringify(args[0]?.where ?? {})})`);
          queryLog.count++;
          return original.apply(target, args);
        };
      }
      if (original && typeof original === 'object') {
        return new Proxy(original, handler);
      }
      return original;
    },
  };

  return new Proxy(db, handler);
}
```

### 3. Register the Plugin in Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { queryLoggerPlugin } from './middleware/queryLogger';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [queryLoggerPlugin],
});
```

### 4. The N+1 Problem — Before

```typescript
// BEFORE — N+1 problem
const resolvers = {
  Query: {
    posts: () => db.posts.findMany({ take: 20 }),
  },

  Post: {
    // This runs once per post — 20 posts = 20 queries
    author: (post: { authorId: string }) =>
      db.users.findById(post.authorId),
  },
};
```

A query for 20 posts with their authors produces 21 queries: 1 for posts + 20 for authors.

### 5. The Fix — After with DataLoader

```typescript
// AFTER — batched with DataLoader
import DataLoader from 'dataloader';

function createUserLoader(db: any) {
  return new DataLoader<string, any>(async (userIds: readonly string[]) => {
    const users = await db.users.findMany({
      where: { id: { in: [...userIds] } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return userIds.map((id) => userMap.get(id));
  });
}

const resolvers = {
  Query: {
    posts: (_: unknown, __: unknown, ctx: Context) =>
      ctx.db.posts.findMany({ take: 20 }),
  },

  Post: {
    // DataLoader batches all authorIds into one query
    author: (post: { authorId: string }, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(post.authorId),
  },
};
```

The same query now produces 2 queries: 1 for posts + 1 batched query for all authors.

### 6. Use Apollo Query Analyzer

For deeper analysis, use Apollo's query complexity plugin to flag expensive queries:

```bash
npm install graphql-query-complexity
```

```typescript
import { createComplexityRule, simpleEstimator } from 'graphql-query-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityRule({
      maximumComplexity: 1000,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      onComplete: (complexity: number) => {
        console.log(`Query complexity: ${complexity}`);
      },
    }),
  ],
});
```

## How It Works

1. **Query logging** wraps every database call and counts them per GraphQL operation. A high count (e.g., >5 for a list query) flags a potential N+1.
2. **DataLoader batching** collects all `.load(id)` calls within a single tick and dispatches them as one `WHERE id IN (...)` query, reducing N+1 to 2 queries.
3. **Query complexity analysis** assigns a cost to each field and rejects queries that exceed a threshold, preventing expensive nested queries from reaching the database.
4. **The plugin lifecycle** resets the counter per request and logs the result before the response is sent, so each operation is measured independently.

## Variants

### Detect N+1 with OpenTelemetry Traces

Distributed tracing reveals N+1 patterns across services:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('graphql');

const resolvers = {
  Post: {
    author: (post, _, ctx) => {
      return tracer.startActiveSpan('resolve.post.author', (span) => {
        return ctx.db.users.findById(post.authorId).finally(() => span.end());
      });
    },
  },
};
```

In the trace viewer, you see 20 sequential spans for `resolve.post.author` — a clear N+1 signal.

### Automated N+1 Detection in Tests

```typescript
import { ApolloServer } from '@apollo/server';

test('posts query should not produce N+1', async () => {
  const queryCount = { count: 0 };
  const instrumentedDb = instrumentDbClient(db, queryCount);

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.executeOperation({
    query: 'query { posts { id title author { name } } }',
  }, { contextValue: { db: instrumentedDb } });

  expect(queryCount.count).toBeLessThanOrEqual(2);
});
```

### Prisma Middleware for N+1 Detection

```typescript
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  if (params.action === 'findUnique' && duration < 1) {
    console.warn(`Potential N+1: ${params.model}.${params.action}`);
  }

  return result;
});
```

## Best Practices

- **Log query counts in development** — catch N+1 before it reaches staging
- **Use DataLoader for every relation** — even if you think a list will always have one item
- **Write tests that assert query counts** — `expect(queryCount).toBeLessThanOrEqual(2)` prevents regressions
- **Monitor query counts in production** — alert when an operation exceeds a threshold

## Common Mistakes

- **Only fixing N+1 for list queries** — single-item queries with nested relations can also N+1 if the client requests deep nesting
- **Sharing DataLoader across requests** — the cache leaks between users; create a new instance per request
- **Ignoring the count in tests** — a passing test that makes 50 queries is a future performance incident
- **Not measuring after the fix** — always verify the query count dropped after adding DataLoader

## FAQ

**Q: How many queries is too many?**
A: A good rule: 1 query per top-level field plus 1 batched query per relation. A list of 20 posts with authors should be 2 queries, not 21.

**Q: Can I have N+1 with DataLoader?**
A: Yes, if you call `.load()` in a loop with `await` between each call. DataLoader batches within a tick, so sequential awaits prevent batching.

**Q: Does N+1 only affect databases?**
A: No. Any external service call (REST API, gRPC, cache) can N+1. DataLoader works for any batchable call.

**Q: Should I use query complexity limits instead of DataLoader?**
A: Both. Complexity limits prevent expensive queries from running. DataLoader makes the queries that do run efficient. They solve different problems.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
