---
contentType: recipes
slug: pagination
title: "Pagination"
description: "How to implement cursor-based and offset-based pagination in APIs and databases across Python, JavaScript, and SQL."
metaDescription: "Practical pagination examples in Python, JavaScript, and SQL. Learn offset vs cursor pagination, LIMIT/OFFSET, and cursor-based APIs for scalable data fetching."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - pagination
  - database
relatedResources:
  - /recipes/call-rest-api
  - /recipes/sql-joins
  - /recipes/handle-errors
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical pagination examples in Python, JavaScript, and SQL. Learn offset vs cursor pagination, LIMIT/OFFSET, and cursor-based APIs for scalable data fetching."
  keywords:
    - pagination
    - api pagination
    - offset pagination
    - cursor pagination
    - limit offset
    - python pagination
    - javascript pagination
    - sql pagination
---

## Overview

Pagination is the technique of dividing a large dataset into discrete pages, improving performance and user experience. It is essential for APIs, admin dashboards, search results, and any interface that displays more data than fits on a single screen.

There are two primary strategies: offset-based (skip N, take M) and cursor-based (start after ID X, take M). Each has trade-offs in performance, consistency, and implementation complexity.

## When to Use

Use this recipe when:

- Building [REST](/recipes/api/call-rest-api) or [GraphQL](/recipes/api/graphql-api) APIs that return collections
- Displaying large tables or lists in a UI
- Exporting data in manageable chunks
- Avoiding out-of-memory errors when processing large datasets

## Solution

### Python

```python
from typing import List, Dict, Any

# Offset-based pagination
async def get_users_offset(db, page: int = 1, page_size: int = 20) -> List[Dict[str, Any]]:
    offset = (page - 1) * page_size
    rows = await db.fetch("SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2", page_size, offset)
    return [dict(row) for row in rows]

# Cursor-based pagination (recommended for large datasets)
async def get_users_cursor(db, cursor: int = None, page_size: int = 20) -> Dict[str, Any]:
    if cursor:
        rows = await db.fetch(
            "SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT $2",
            cursor, page_size + 1
        )
    else:
        rows = await db.fetch("SELECT * FROM users ORDER BY id LIMIT $1", page_size + 1)
    
    has_more = len(rows) > page_size
    items = rows[:page_size]
    next_cursor = items[-1]["id"] if items and has_more else None
    
    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}
```

### JavaScript (Node.js)

```javascript
// Offset-based
async function getUsersOffset(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const users = await db.query(
    'SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2',
    [pageSize, offset]
  );
  return users.rows;
}

// Cursor-based (recommended)
async function getUsersCursor(cursor = null, pageSize = 20) {
  const query = cursor
    ? 'SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT $2'
    : 'SELECT * FROM users ORDER BY id LIMIT $1';
  const params = cursor ? [cursor, pageSize + 1] : [pageSize + 1];
  
  const result = await db.query(query, params);
  const rows = result.rows;
  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize);
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  
  return { items, nextCursor, hasMore };
}
```

### SQL

```sql
-- Offset-based (simple but slower on large offsets)
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 400;

-- Cursor-based (efficient for large datasets)
SELECT * FROM users
WHERE created_at < '2024-01-15T10:00:00Z'
ORDER BY created_at DESC
LIMIT 20;

-- Count for offset pagination metadata
SELECT COUNT(*) FROM users;
```

## Explanation

- **Offset pagination**: Simple to implement. `LIMIT 20 OFFSET 400` skips 400 rows, returns 20. Becomes slow with large offsets because the database still scans all skipped rows.
- **Cursor pagination**: Uses a value (usually an ID or timestamp) to resume from. Consistent and fast even for deep pages. Harder to jump to arbitrary pages.
- **Keyset pagination**: A form of cursor pagination using indexed columns. Prevents missing/duplicate rows when data changes between requests.

## Variants

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| Offset/Limit | Simple, jump to any page | Slow at deep offsets, inconsistent under mutations | Small datasets, admin UIs |
| Cursor-based | Fast, consistent | Cannot jump to arbitrary page | Social feeds, infinite scroll |
| Seek / Keyset | Fast, stable sorting | Requires ordered unique key | Large sorted datasets |

## Best Practices

- **Use cursor pagination for high-traffic APIs**: Prevents performance cliffs
- **Always ORDER BY**: Without ordering, pagination is non-deterministic. See [SQL Joins](/recipes/databases/sql-joins) for query optimization.
- **Return total count optionally**: Only when necessary — it requires an extra `COUNT(*)` query
- **Validate page_size**: Cap at a maximum (e.g., 100) to prevent abuse
- **Use indexed columns for cursor fields**: Ensures efficient range scans
- **Encode cursors**: Obfuscate IDs with base64 or encrypted strings

## Common Mistakes

- Not ordering results, causing items to shift between pages
- Using `SELECT COUNT(*)` unnecessarily on massive tables
- Allowing unlimited `page_size` parameters
- Using offset pagination on datasets with millions of rows. See [Cursor Pagination](/recipes/api/cursor-pagination-postgresql) for scalable pagination.
- Ignoring race conditions where data is inserted/deleted between page requests

## Frequently Asked Questions

**Q: Which pagination method should I use for a REST API?**
A: Cursor-based for public/high-traffic APIs (feeds, search). Offset-based for admin/internal tools where users need page numbers.

**Q: How do I paginate with filters and sorting?**
A: Include the filter/sort columns in your cursor. The cursor must uniquely identify the starting point given the current sort order.

**Q: What is the maximum page size I should allow?**
A: Typically 50-100. Larger values strain the database, increase response time, and may hit payload size limits.
