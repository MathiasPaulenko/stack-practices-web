---
contentType: patterns
slug: graphql-connection-pagination-pattern
title: "GraphQL Connection Pagination Pattern"
description: "Implement Relay-style cursor-based pagination with edges, nodes, and pageInfo for stable GraphQL list queries."
metaDescription: "GraphQL connection pagination pattern: implement Relay-style cursor pagination with edges, nodes, and pageInfo. Stable pagination for large lists in Apollo Server."
difficulty: intermediate
topics:
  - graphql
  - design
tags:
  - graphql
  - pagination
  - connection
  - pattern
  - relay
  - cursor
  - edges
  - typescript
  - apollo-server
relatedResources:
  - /patterns/graphql/graphql-batched-resolver-pattern
  - /patterns/graphql/graphql-dataloader-pattern
  - /recipes/graphql/graphql-pagination-relay-connections
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "GraphQL connection pagination pattern: implement Relay-style cursor pagination with edges, nodes, and pageInfo. Stable pagination for large lists in Apollo Server."
  keywords:
    - graphql pagination
    - relay connections
    - cursor pagination graphql
    - graphql edges nodes
    - apollo server pagination
    - graphql connection pattern
---

# GraphQL Connection Pagination Pattern

## Overview

The Connection pattern is the GraphQL standard for paginating list fields. Instead of returning a plain array, a connection wraps results in `edges` (each containing a `node` and a `cursor`), a `pageInfo` object (with `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`), and an optional `totalCount`.

Cursor-based pagination is more stable than offset-based pagination. When items are inserted or deleted between requests, cursors still point to the correct position. Offsets shift, causing skipped or duplicated items.

## When to Use

- List fields that can return more items than fit in one response
- You need stable pagination that survives inserts and deletes between pages
- Clients need to fetch the next or previous page from any position
- You want to comply with the GraphQL Relay Connection specification
- You need bidirectional pagination (forward and backward)

## Solution

### Schema Definition

```typescript
const typeDefs = `
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    users(
      first: Int
      after: String
      last: Int
      before: String
    ): UserConnection!
  }
`;
```

### Resolver Implementation

```typescript
import { base64, unbase64 } from './encoding';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function encodeCursor(offset: number): string {
  return base64(`offset:${offset}`);
}

function decodeCursor(cursor: string): number {
  const decoded = unbase64(cursor);
  const offset = parseInt(decoded.split(':')[1], 10);
  return isNaN(offset) ? 0 : offset;
}

const resolvers = {
  Query: {
    users: async (_, { first, after, last, before }, context) => {
      const limit = Math.min(first || last || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
      const direction = first !== undefined ? 'forward' : 'backward';

      let offset = 0;
      if (after) offset = decodeCursor(after) + 1;
      if (before) offset = Math.max(0, decodeCursor(before) - limit);

      const totalCountResult = await context.db.query(
        'SELECT COUNT(*) as count FROM users'
      );
      const totalCount = totalCountResult[0].count;

      const rows = await context.db.query(
        'SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit + 1, offset]
      );

      const hasMore = rows.length > limit;
      const nodes = hasMore ? rows.slice(0, limit) : rows;

      const edges = nodes.map((node, index) => ({
        node,
        cursor: encodeCursor(offset + index),
      }));

      return {
        edges,
        totalCount,
        pageInfo: {
          hasNextPage: direction === 'forward' ? hasMore : offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },
  },
};
```

### Client Query Example

```graphql
query GetUsers($first: Int, $after: String) {
  users(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        name
        email
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

### Cursor with Sort Key (Instead of Offset)

For large datasets, use a sort key instead of an offset to avoid scanning skipped rows:

```typescript
function encodeCursor(sortKey: string, id: string): string {
  return base64(`${sortKey}:${id}`);
}

function decodeCursor(cursor: string): { sortKey: string; id: string } {
  const decoded = unbase64(cursor);
  const [sortKey, id] = decoded.split(':');
  return { sortKey, id };
}

const resolvers = {
  Query: {
    users: async (_, { first, after }, context) => {
      const limit = Math.min(first || 20, 100);
      let query = 'SELECT id, name, email, created_at FROM users';
      const params = [];

      if (after) {
        const { sortKey, id } = decodeCursor(after);
        query += ' WHERE (created_at, id) < ($1, $2)';
        params.push(sortKey, id);
      }

      query += ' ORDER BY created_at DESC, id DESC LIMIT $' + (params.length + 1);
      params.push(limit + 1);

      const rows = await context.db.query(query, params);
      const hasMore = rows.length > limit;
      const nodes = hasMore ? rows.slice(0, limit) : rows;

      const edges = nodes.map((node) => ({
        node,
        cursor: encodeCursor(node.created_at, node.id),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: hasMore,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor || null,
          endCursor: edges[edges.length - 1]?.cursor || null,
        },
      };
    },
  },
};
```

## Explanation

The Connection pattern wraps every paginated field in a standard structure:

- **edges** — an array where each item contains a `node` (the actual data) and a `cursor` (an opaque string pointing to that item's position)
- **pageInfo** — metadata about the current page: whether more pages exist in either direction and the cursors of the first and last items
- **totalCount** — optional but useful for UIs that show total result count

Cursors are opaque to the client. The server encodes whatever it needs to find the next page: an offset, a sort key, a timestamp, or a primary key. The client passes the cursor back as `after` or `before` to navigate.

Using a sort key cursor instead of an offset cursor is more efficient for large datasets. The database can use an index to jump directly to the cursor position instead of scanning and skipping `OFFSET` rows.

## Variants

| Approach | Cursor Type | Best For |
|----------|-------------|----------|
| Offset cursor | `base64("offset:50")` | Small datasets, simple implementation |
| Sort key cursor | `base64("2026-07-03:uuid")` | Large datasets, stable ordering |
| Keyset cursor | Primary key + sort column | Ordered by indexed columns |
| Time-based cursor | ISO timestamp | Chronological feeds |
| Hash cursor | Hash of last item | Distributed systems where offset is unknown |

## Best Practices

- **Make cursors opaque** — base64-encode them so clients do not try to parse or construct them manually
- **Always request LIMIT + 1** — fetch one extra row to determine `hasNextPage` without a separate count query
- **Use indexed columns for sort key cursors** — `(created_at, id)` with a composite index avoids full scans
- **Cap page size** — enforce a maximum (e.g. 100) to prevent clients from requesting 10,000 items
- **Return totalCount only when needed** — counting all rows is expensive on large tables. Make it optional via a field directive or separate query

## Common Mistakes

- **Using offset-based cursors on large tables** — `OFFSET 100000` scans 100,000 rows. Use sort key cursors with WHERE clauses instead.
- **Not encoding cursors** — returning raw offsets or timestamps lets clients manipulate them. Always base64-encode.
- **Inconsistent sort order** — if the sort order changes between requests, cursors point to wrong positions. Include the sort column in the cursor.
- **Forgetting `hasPreviousPage`** — backward pagination requires tracking whether items exist before the current page. Calculate it from the offset or a reverse query.
- **Not handling empty pages** — if a query returns zero edges, `startCursor` and `endCursor` must be `null`, not undefined. GraphQL requires explicit nulls.

## Frequently Asked Questions

### What is the difference between offset and cursor pagination?

Offset pagination uses `LIMIT 20 OFFSET 40` to skip rows. Cursor pagination uses a WHERE clause to jump to a specific position. Offset is simpler but slow on large datasets and unstable when items are inserted or deleted between requests. Cursor is stable and efficient.

### Do I need to follow the Relay spec exactly?

The Relay Connection spec is a convention, not a requirement. You can add extra fields to `pageInfo` or `edges` as needed. The key structures (`edges`, `cursor`, `pageInfo.hasNextPage`) are what most clients expect.

### How do I handle pagination with filtering?

Include the filter criteria in the cursor or re-apply the same WHERE clause on each request. The cursor only marks the position; the filter narrows the dataset. The combination of filter + cursor position gives you the correct page.

### Can I use connection pagination with DataLoader?

Yes. Create a DataLoader that batches cursor-based queries. The batch function receives multiple cursors and issues separate queries for each, or combines them if the data source supports it.


## Advanced Topics

### Scenario: Connection Pagination for Product Feed

```typescript
// GraphQL Relay Connection: cursor-based pagination
type ProductConnection {
  edges: ProductEdge[]
  pageInfo: PageInfo
  totalCount: Int
}

type ProductEdge {
  node: Product
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

// Resolver: cursor-based pagination
const resolvers = {
  Query: {
    products: async (_, { first, after, last, before }, ctx) => {
      const afterCursor = after ? JSON.parse(Buffer.from(after, "base64").toString()) : null;
      const limit = first || last || 20;
      const order = first ? "ASC" : "DESC";

      let query = "SELECT * FROM products";
      const params: unknown[] = [];
      if (afterCursor) {
        query += ` WHERE created_at > $1 ORDER BY created_at ${order} LIMIT $2`;
        params.push(afterCursor.created_at, limit + 1);
      } else {
        query += ` ORDER BY created_at ${order} LIMIT $1`;
        params.push(limit + 1);
      }

      const res = await ctx.db.query(query, params);
      const rows = res.rows;
      const hasNextPage = rows.length > limit;
      const edges = rows.slice(0, limit).map(product => ({
        node: product,
        cursor: Buffer.from(JSON.stringify({ id: product.id, created_at: product.created_at })).toString("base64"),
      }));

      return {
        edges,
        totalCount: await ctx.db.query("SELECT COUNT(*) FROM products").then(r => r.rows[0].count),
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!afterCursor,
          startCursor: edges[0]?.cursor || null,
          endCursor: edges[edges.length - 1]?.cursor || null,
        },
      };
    },
  },
};

// Query: first page
// { products(first: 10) { edges { node { id name } cursor } pageInfo { hasNextPage endCursor } } }

// Query: next page
// { products(first: 10, after: "eyJpZCI6IjEyMyJ9") { ... } }
```

Lessons:
  - Cursor-based: the cursor encodes position (id + sort key)
  - More stable than offset: if items are inserted, cursor does not shift
  - first/after: paginate forward. last/before: backward
  - Request limit+1 to know hasNextPage without an extra query
  - The cursor is opaque: base64(JSON) so the client does not depend on format
  - Relay Connection is the industry standard for GraphQL
```

### Cursor-based vs Offset-based: which do I use?

Cursor-based is stable: if items are inserted between pages, the cursor does not shift. Offset-based is simple: LIMIT/OFFSET but if items are inserted, page 2 may repeat or skip items. Use cursor for feeds, timelines, dynamic lists. Use offset for reports, static tables, admin panels. Cursor does not support jumping to page N: only next/prev. Offset does: page=3. For GraphQL, cursor is the standard (Relay).
