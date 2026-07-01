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
relatedResources:
  - /recipes/api/go-rest-api-gin
lastUpdated: "2026-06-18"
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

Offset-based pagination (`LIMIT 20 OFFSET 10000`) degrades linearly as offsets grow because PostgreSQL must scan and discard all preceding rows. Cursor-based (keyset) pagination uses indexed columns to seek directly to the starting point, maintaining constant-time performance regardless of dataset size. This recipe implements cursor pagination with PostgreSQL, including cursor encoding, bidirectional navigation, and edge cases with duplicate sort keys.

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
