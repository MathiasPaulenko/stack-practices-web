---
contentType: recipes
slug: graphql-pagination-relay-connections
title: "Cursor-based Pagination with GraphQL Relay Connections"
description: "Implement Relay-style cursor pagination in GraphQL with edges, nodes, and pageInfo for efficient forward and backward traversal"
metaDescription: "Implement cursor-based pagination in GraphQL using Relay connections spec. Edges, nodes, cursors, and pageInfo for efficient forward and backward traversal."
difficulty: intermediate
topics:
  - graphql
  - api
tags:
  - graphql
  - pagination
  - relay
  - cursor
  - api
relatedResources:
  - /recipes/api/graphql-apollo-server
  - /recipes/data/cursor-pagination-postgresql
  - /patterns/graphql/graphql-batched-resolver-pattern
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement cursor-based pagination in GraphQL using Relay connections spec. Edges, nodes, cursors, and pageInfo for efficient forward and backward traversal."
  keywords:
    - graphql pagination
    - relay connections
    - cursor pagination
    - graphql edges
    - graphql pageinfo
---

# Cursor-based Pagination with GraphQL Relay Connections

The Relay Connection specification is the de facto standard for paginating GraphQL results. It models collections as connections containing edges, where each edge wraps a node and a cursor. This structure supports stable pagination across inserts and deletes, unlike offset-based approaches that skip or duplicate rows when data changes between requests.

## When to Use This

- Collections that grow over time and need stable pagination
- Clients that support infinite scroll or "load more" patterns
- APIs consumed by Relay, Apollo, or any client expecting cursor-based navigation

## Prerequisites

- A GraphQL server (Apollo Server, GraphQL Yoga, or similar)
- A data source with a sortable, unique column (ID, timestamp, or cursor)

## Solution

### 1. Define the Connection Types

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type PostEdge {
    cursor: String!
    node: Post!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    createdAt: String!
  }

  input PaginationInput {
    first: Int
    after: String
    last: Int
    before: String
  }

  type Query {
    posts(pagination: PaginationInput): PostConnection!
  }
`;
```

### 2. Implement Cursor Encoding

```typescript
// cursor.ts
export function encodeCursor(value: string | number): string {
  return Buffer.from(String(value)).toString('base64');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf8');
}
```

### 3. Build the Resolver

```typescript
// resolvers.ts
import { encodeCursor, decodeCursor } from './cursor';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export const postResolvers = {
  Query: {
    posts: async (
      _: unknown,
      { pagination }: { pagination: { first?: number; after?: string; last?: number; before?: string } },
      context: { db: { posts: { findMany: (opts: any) => Promise<Post[]>; count: () => Promise<number> } } }
    ) => {
      const { first, after, last, before } = pagination;
      const limit = first ?? last ?? 10;
      const maxLimit = 50;

      const take = Math.min(limit, maxLimit);

      let cursor: string | undefined;
      let skip = 0;
      let order: 'asc' | 'desc' = 'desc';

      if (after) {
        cursor = decodeCursor(after);
        skip = 1;
      } else if (before) {
        cursor = decodeCursor(before);
        skip = 1;
        order = 'asc';
      }

      const posts = await context.db.posts.findMany({
        take: take + 1,
        skip,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: order },
      });

      const hasMore = posts.length > take;
      const trimmed = hasMore ? posts.slice(0, take) : posts;
      const reversed = last ? trimmed.reverse() : trimmed;

      const edges = reversed.map((post) => ({
        cursor: encodeCursor(post.id),
        node: post,
      }));

      const totalCount = await context.db.posts.count();

      return {
        edges,
        totalCount,
        pageInfo: {
          hasNextPage: Boolean(first && hasMore),
          hasPreviousPage: Boolean(after),
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
      };
    },
  },
};
```

### 4. Query the Connection

```graphql
query GetPosts($first: Int, $after: String) {
  posts(pagination: { first: $first, after: $after }) {
    edges {
      cursor
      node {
        id
        title
        createdAt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

Pass the `endCursor` from the previous response as `after` in the next request to load the next page.

## How It Works

1. **Cursors** are opaque tokens encoding the last-seen position (typically the row ID). Clients treat them as black boxes.
2. **Edges** pair each node with its cursor, so clients can navigate from any point without tracking offsets.
3. **`first` + `after`** fetches forward; **`last` + `before`** fetches backward. The resolver reverses results when paginating backward.
4. **`take + 1`** is a trick to check for a next page without a separate count query — if you get more rows than requested, `hasNextPage` is true.

## Variants

### Offset-Based Fallback

For data sources without cursor support (Elasticsearch aggregations, legacy APIs), fall back to offset pagination but still return the connection shape for client compatibility:

```typescript
const offset = after ? parseInt(decodeCursor(after), 10) + 1 : 0;
const posts = await db.posts.findMany({ skip: offset, take });
```

### Keyset Pagination with Composite Cursors

For ordered columns that aren't unique (like `createdAt`), use a composite cursor `(createdAt, id)` to avoid skipping rows with identical timestamps:

```typescript
export function encodeCompositeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64');
}
```

## Advanced: Pagination with Sort Order

When paginating by a non-id column (e.g., `createdAt`), encode the sort value in the cursor:

```typescript
export function encodeSortCursor(value: string, id: string): string {
  return Buffer.from(`${value}|${id}`).toString('base64');
}

export function decodeSortCursor(cursor: string): { value: string; id: string } {
  const [value, id] = Buffer.from(cursor, 'base64').toString().split('|');
  return { value, id };
}
```

The resolver uses a compound `WHERE` clause to skip rows seen in the previous page:

```typescript
const { value, id } = after ? decodeSortCursor(after) : { value: null, id: null };

const posts = await db.posts.findMany({
  where: value
    ? {
        OR: [
          { createdAt: { lt: new Date(value) } },
          { createdAt: new Date(value), id: { lt: id } },
        ],
      }
    : undefined,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  take: take + 1,
});
```

This handles rows with identical `createdAt` values without skipping or duplicating them.

## Best Practices

- **Cap `first` and `last`** at a reasonable maximum (50–100) to prevent expensive queries
- **Always sort by a stable column** — sorting by non-unique fields without a tiebreaker causes skipped rows
- **Keep cursors opaque** — don't expose internal structures that clients might try to parse
- **Include `totalCount`** only when the client needs it; it can be expensive on large tables

## Common Mistakes

- **Using offset as cursor** — this defeats the purpose of cursor pagination and reintroduces skip/duplicate issues
- **Forgetting `skip: 1`** after a cursor — without it, the first item of each page repeats the last item of the previous page
- **Not handling empty results** — return an empty `edges` array with `hasNextPage: false` instead of throwing

## FAQ

**Q: Should I use cursor or offset pagination for GraphQL?**
A: Cursor pagination is the standard for GraphQL because it handles inserts and deletes gracefully. Use offset only when cursors aren't supported by the data source.

**Q: How do I implement bidirectional pagination?**
A: Support both `first/after` and `last/before` in your resolver. The `hasPreviousPage` flag tells clients whether a previous page exists.

**Q: Can I use Relay connections without the Relay client?**
A: Yes. The connection spec works with any GraphQL client. Apollo Client, urql, and graphql-request all support it.

**Q: What should the cursor encode?**
A: Typically the primary key or a composite of the sort column plus primary key. Avoid encoding offsets.

### How do I handle pagination with sort order?

Encode the sort column value plus the primary key in the cursor (e.g., `createdAt|id`). The resolver uses a compound `WHERE` clause: rows where `createdAt < cursor.createdAt`, or where `createdAt == cursor.createdAt AND id < cursor.id`. This prevents skipping rows with identical timestamps.

### Should I include `totalCount` in every response?

Only when the client needs it. `totalCount` requires a separate `COUNT` query that can be expensive on large tables. Make it optional — return it only when the client requests the field. Some APIs make `totalCount` nullable and return `null` when the count exceeds a threshold.

### How do I cap page size without breaking the spec?

Set a maximum for `first` and `last` (e.g., 50–100) in the resolver. If the client requests more, clamp to the max and return the clamped amount. This prevents expensive queries that scan large portions of the table.
