---
contentType: recipes
slug: sql-find-duplicate-rows
title: "Find and Remove Duplicate Rows in SQL"
description: "Detect duplicate records in SQL tables using GROUP BY and HAVING, then remove them safely while keeping the canonical row."
metaDescription: "Find and remove duplicate rows in SQL using GROUP BY, HAVING, and CTEs. Learn safe deduplication techniques to keep canonical records and clean tables."
difficulty: beginner
topics:
  - databases
tags:
  - sql
  - postgresql
  - mysql
  - deduplication
  - cte
relatedResources:
  - /guides/read-replica-guide
  - /guides/sql-cte-guide
  - /docs/runbook-database-failover
  - /docs/database-schema-documentation-template
  - /guides/full-text-search-guide
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Find and remove duplicate rows in SQL using GROUP BY, HAVING, and CTEs. Learn safe deduplication techniques to keep canonical records and clean tables."
  keywords:
    - databases
    - sql
    - postgresql
    - mysql
    - deduplication
    - cte
    - /guides/read-replica-guide
    - /guides/sql-cte-guide
    - /docs/runbook-database-failover
    - /docs/database-schema-documentation-template
    - /guides/full-text-search-guide
    - databases
    - sql
    - postgresql
    - mysql
    - deduplication
    - cte
    - /guides/read-replica-guide
    - /guides/sql-cte-guide
    - /docs/runbook-database-failover
    - /docs/database-schema-documentation-template
    - /guides/full-text-search-guide
    - sql
    - postgresql
    - mysql
    - deduplication
    - cte
---


## Overview

Duplicate rows creep into tables through application bugs, import scripts, or race conditions. They waste space, distort analytics, and can break unique constraints you intended to enforce. Finding them requires grouping by the columns that define uniqueness, and removing them safely means keeping one canonical row while deleting the rest without losing related data.

## When to Use

Use this resource when:
- You need to identify duplicate records in a table.
- A unique constraint violation prevents adding a required index.
- You are cleaning data after an import or migration.
- You want to deduplicate before enforcing a new primary key or unique index.

## Solution

### Find duplicates in PostgreSQL

```sql
-- Find duplicate emails in the users table
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Keep the oldest row and delete the rest
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

## Explanation

The first query groups rows by the column that should be unique and uses `HAVING COUNT(*) > 1` to return only duplicates. The second query uses a common table expression (CTE) with `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at)`. Each group of duplicates gets numbered starting from 1, and we delete every row except the first one. The `ORDER BY` clause determines which row is kept; here we keep the oldest record. Always run the `SELECT` version of the CTE before `DELETE` to confirm what will be removed.

## Variants

| Database | Technique | Notes |
|----------|-----------|-------|
| PostgreSQL | `ROW_NUMBER() OVER` | Flexible and safe |
| MySQL 8+ | `ROW_NUMBER() OVER` | Same syntax as PostgreSQL |
| MySQL 5.7 | Self-join | Use `MIN(id)` to keep one row |
| SQLite | `DELETE` with `IN` subquery | Works with window functions in 3.25+ |

## What Works

1. **Always preview before deleting.** Run the CTE as a `SELECT` first to see which rows will be kept.
2. **Back up the table or use a transaction.** A single bad `DELETE` can remove thousands of rows.
3. **Choose the canonical row with business logic.** Oldest, newest, or most complete record depends on the use case.
4. **Add a unique constraint after cleanup.** This prevents duplicates from returning.
5. **Consider foreign keys.** Deleting a parent row may orphan child rows unless you use `ON DELETE CASCADE` or update references first.

## Common Mistakes

1. **Deleting without a WHERE clause.** A missing `WHERE` turns the query into a table wipe.
2. **Keeping the wrong row.** If you order randomly, you may discard the most valuable duplicate.
3. **Ignoring NULL values.** `NULL` does not equal `NULL`, so duplicates with NULL keys may not be detected by `GROUP BY`.
4. **Running on production during peak traffic.** Lock contention can block writes; use a batch approach or low-traffic window.
5. **Forgetting to update related sequences.** If you delete the highest `id`, you may need to reset a sequence, though it is rarely required.

## Frequently Asked Questions

**Q: What if duplicates have different values in other columns?**
A: Choose the canonical row by business rules, then either merge the data or keep the row with the most complete or most recent data.

**Q: Can I delete duplicates in batches?**
A: Yes. Add `AND id IN (SELECT id FROM duplicates WHERE rn > 1 LIMIT 1000)` and run the delete repeatedly until no duplicates remain.

**Q: How do I prevent duplicates from reappearing?**
A: Add a unique constraint or unique index on the columns that define uniqueness, and handle duplicate key exceptions in your application.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
