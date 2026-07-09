---
contentType: recipes
slug: cursor-pagination-postgresql
title: "Cursor-Based Pagination with PostgreSQL"
description: "Implement efficient cursor-based pagination for large datasets in PostgreSQL, avoiding OFFSET performance degradation with indexed keyset pagination and stable sort ordering"
metaDescription: "Implement cursor-based pagination in PostgreSQL. Efficient keyset pagination for large datasets avoiding OFFSET degradation with indexed ordering and stable cursors."
difficulty: intermediate
topics:
  - api
  - databases
tags:
  - pagination
  - api
  - databases
  - rest
  - http
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /recipes/api/api-documentation-openapi
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement cursor-based pagination in PostgreSQL. Efficient keyset pagination for large datasets avoiding OFFSET degradation with indexed ordering and stable cursors."
  keywords:
    - cursor pagination
    - keyset pagination
    - postgresql
    - offset performance
    - api pagination
---

# Cursor-Based Pagination with PostgreSQL

Offset-based pagination (`LIMIT 20 OFFSET 10000`) degrades linearly as offsets grow because PostgreSQL must scan and discard all preceding rows. Cursor-based (keyset) pagination uses indexed columns to seek directly to the starting point, maintaining constant-time performance regardless of dataset size. This implementation provides cursor pagination with PostgreSQL, including cursor encoding, bidirectional navigation, and edge cases with duplicate sort keys.

## When to Use This

- API feeds with millions of items where deep page navigation is common
- Real-time data where rows are inserted continuously, making offset counts unstable
- You need consistent page results even when underlying data changes between requests

## Solution

### 1. Database Schema and Index

```sql
-- migrations/001_create_posts.sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0
);

-- Composite index for cursor pagination by created_at
CREATE INDEX idx_posts_created_at_id ON posts (created_at DESC, id DESC);

-- Index for score-based pagination
CREATE INDEX idx_posts_score_id ON posts (score DESC, id DESC);
```

### 2. Cursor Encoding and Decoding

```typescript
// pagination/Cursor.ts
import { Buffer } from 'buffer';

interface CursorData {
  createdAt: string;
  id: string;
}

function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64url');
}

function decodeCursor(cursor: string): CursorData {
  const json = Buffer.from(cursor, 'base64url').toString('utf8');
  return JSON.parse(json);
}
```

### 3. Query with Keyset Pagination

```typescript
// pagination/PostRepository.ts
import { Pool } from 'pg';

interface PageResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

class PostRepository {
  constructor(private pool: Pool) {}

  async findPage(
    limit: number = 20,
    afterCursor?: string,
    beforeCursor?: string
  ): Promise<PageResult<Post>> {
    const client = await this.pool.connect();

    try {
      let query: string;
      let params: unknown[];

      if (afterCursor) {
        // Forward pagination: get rows after cursor
        const { createdAt, id } = decodeCursor(afterCursor);
        query = `
          SELECT * FROM posts
          WHERE (created_at, id) < ($1, $2)
          ORDER BY created_at DESC, id DESC
          LIMIT $3
        `;
        params = [createdAt, id, limit + 1];
      } else if (beforeCursor) {
        // Backward pagination: get rows before cursor
        const { createdAt, id } = decodeCursor(beforeCursor);
        query = `
          SELECT * FROM (
            SELECT * FROM posts
            WHERE (created_at, id) > ($1, $2)
            ORDER BY created_at ASC, id ASC
            LIMIT $3
          ) sub
          ORDER BY created_at DESC, id DESC
        `;
        params = [createdAt, id, limit + 1];
      } else {
        // First page
        query = `
          SELECT * FROM posts
          ORDER BY created_at DESC, id DESC
          LIMIT $1
        `;
        params = [limit + 1];
      }

      const result = await client.query(query, params);
      const rows = result.rows;
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;

      // Generate cursors
      const nextCursor = hasMore && data.length > 0
        ? encodeCursor({ createdAt: data[data.length - 1].created_at, id: data[data.length - 1].id })
        : null;

      const prevCursor = data.length > 0
        ? encodeCursor({ createdAt: data[0].created_at, id: data[0].id })
        : null;

      return {
        data,
        nextCursor,
        prevCursor: afterCursor || (!beforeCursor && data.length > 0) ? prevCursor : null,
        hasMore,
      };
    } finally {
      client.release();
    }
  }
}
```

### 4. [Express](/recipes/api/express-middleware-patterns) API Endpoint

```typescript
// routes/posts.ts
app.get('/api/posts', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const after = req.query.after as string | undefined;
  const before = req.query.before as string | undefined;

  const page = await postRepo.findPage(limit, after, before);

  res.json({
    data: page.data,
    pagination: {
      nextCursor: page.nextCursor,
      prevCursor: page.prevCursor,
      hasMore: page.hasMore,
    },
  });
});
```

### 5. Client-Side Navigation

```typescript
// client/PaginatedFeed.ts
class PaginatedFeed {
  private nextCursor: string | null = null;
  private prevCursor: string | null = null;

  async loadNext(): Promise<Post[]> {
    const params = new URLSearchParams();
    params.set('limit', '20');
    if (this.nextCursor) params.set('after', this.nextCursor);

    const res = await fetch(`/api/posts?${params}`);
    const page = await res.json();

    this.nextCursor = page.pagination.nextCursor;
    this.prevCursor = page.pagination.prevCursor;

    return page.data;
  }

  async loadPrevious(): Promise<Post[]> {
    if (!this.prevCursor) return [];

    const params = new URLSearchParams();
    params.set('limit', '20');
    params.set('before', this.prevCursor);

    const res = await fetch(`/api/posts?${params}`);
    const page = await res.json();

    this.nextCursor = page.pagination.nextCursor;
    this.prevCursor = page.pagination.prevCursor;

    return page.data;
  }
}
```

## How It Works

- **Keyset pagination** uses indexed composite keys instead of OFFSET, enabling O(log n) seeks
- **Cursor encoding** hides implementation details and prevents clients from manipulating query parameters
- **Bidirectional cursors** support both forward and backward navigation through the same dataset
- **Over-fetching** by 1 row determines if more pages exist without a separate COUNT query

## Production Considerations

- Always create composite indexes matching the exact sort order used in pagination queries. See [SQL Performance Tuning Guide](/guides/databases/sql-performance-tuning-guide) for indexing strategies.
- Use `timestamptz` (not `timestamp`) to avoid timezone ambiguity in cursors
- Validate cursor structure to prevent injection via malformed base64 payloads. See [Input Validation](/recipes/api/input-validation) for validation patterns.

## Common Mistakes

- Paginating by a non-unique column without a tiebreaker (e.g., `created_at` alone), causing skipped or duplicated rows
- Using large LIMIT values, which still requires major index scanning
- Not handling the case where the cursor row is deleted, which breaks forward navigation

## FAQ

**Q: Should I ever use offset pagination?**
A: Only for small datasets (< 10,000 rows) or admin interfaces where jumping to arbitrary pages is required.

**Q: How do I handle sorting by multiple columns?**
A: Include all sort columns in the composite index and encode all values into the cursor.

### How do I encode a cursor safely for URLs?

Base64-encode the cursor payload (JSON or concatenated values) and URL-encode the result. Use base64url encoding (replace `+` with `-`, `/` with `_`, strip `=` padding) to avoid characters that need URL encoding. On the server, reverse the encoding to extract cursor values. Never pass raw SQL values in the cursor — always encode them to prevent tampering.

### How do I handle cursor pagination with UUID primary keys?

UUIDs are not naturally ordered. Add a `created_at` timestamp column with an index and use `(created_at, id)` as the composite cursor. If you need random distribution, use UUIDv7 (time-ordered) instead of UUIDv4. For existing UUIDv4 tables, add a `serial` or `bigserial` column and use that as the cursor key instead.

### How do I implement bidirectional cursor pagination (previous page)?

Store the first and last cursor of the current page on the client. For the previous page, reverse the sort order and query `WHERE (created_at, id) < (previous_first_cursor_values)` with `ORDER BY created_at DESC, id DESC`. Then reverse the results client-side to maintain consistent ordering. Include `has_previous_page` and `has_next_page` booleans in the response.

### How do I handle cursor pagination with filtered queries?

Apply the WHERE filter before the cursor condition. The cursor still uses the sort columns: `WHERE (status = 'active') AND (created_at, id) < (cursor_values) ORDER BY created_at DESC, id DESC LIMIT 20`. Ensure the filter column has an index alongside the sort columns. For dynamic filters, use a composite index on `(filter_column, created_at, id)`.

### What happens if a cursor references a deleted row?

Nothing breaks — cursor pagination uses range comparison (`<` or `>`), not row lookup. The query simply returns the next rows after the cursor position, whether or not the original row still exists. This is a key advantage over offset pagination, which can skip or duplicate rows when data changes between requests.

### How do I handle cursor pagination with time-based sorting?

Use `(created_at, id)` as the cursor key to ensure stable ordering when multiple rows share the same timestamp. Create a composite index on `(created_at DESC, id DESC)` matching your sort direction. When two rows have identical `created_at`, the `id` tiebreaker ensures deterministic ordering. Avoid using `updated_at` as the sort key if rows can be updated concurrently — the cursor position may shift.

### How do I implement cursor pagination in GraphQL connections?

Follow the Relay Connection spec: return `edges` with `node` and `cursor` fields, plus `pageInfo` with `hasNextPage`, `hasPreviousPage`, `startCursor`, and `endCursor`. Encode cursors as base64 strings. On the server, decode the cursor, extract sort values, and query with `WHERE (created_at, id) < (cursor_values)`. The `first` and `last` arguments map to `LIMIT`.

### How do I measure cursor pagination performance?

Use `EXPLAIN ANALYZE` to verify the query uses the composite index and performs an index scan, not a sequential scan. Check that execution time stays constant as the cursor moves deeper into the dataset. Monitor query latency in production with `pg_stat_statements`. Compare p99 latency between first page and page 10000 — cursor pagination should show flat performance, unlike offset which degrades linearly.

### How do I handle cursor pagination with soft-deleted rows?

Add `WHERE deleted_at IS NULL` to your query alongside the cursor condition. The cursor still works correctly because it uses range comparison on sort columns. Create a partial index `CREATE INDEX ON items (created_at DESC, id DESC) WHERE deleted_at IS NULL` to keep the index small and fast. When a row is soft-deleted between requests, the next page simply skips it — no skipped or duplicated rows for the client.

### How do I migrate from offset to cursor pagination?

Start by adding a `created_at` column with an index if one doesn't exist. Implement the cursor endpoint alongside the existing offset endpoint (e.g., `/api/v2/items`). Return cursors in the response body as `next_cursor` and `previous_cursor` fields. Deprecate the old offset endpoint with a sunset header. Migrate frontend consumers to the new endpoint in a coordinated rollout. Keep both endpoints alive during the transition period to avoid breaking changes. Use feature flags to gradually shift traffic from offset to cursor endpoints.

### How do I handle cursor pagination with concurrent inserts?

Concurrent inserts do not affect cursor pagination correctness. New rows inserted after the first page is returned will appear on subsequent pages if their sort values fall within the cursor range. The `has_next_page` flag is computed by querying `LIMIT + 1` and checking if an extra row exists. For real-time feeds where new rows must appear immediately, use a separate "latest items" endpoint rather than modifying cursor behavior.
