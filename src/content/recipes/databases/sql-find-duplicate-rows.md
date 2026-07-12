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
  - /recipes/sql-full-text-search-setup
  - /recipes/sql-index-optimization-analysis
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



---


## Overview

Duplicate rows creep into tables through application bugs, import scripts, or race conditions. They waste space, distort analytics, and can break unique constraints you intended to enforce. Finding them requires grouping by the columns that define uniqueness, and removing them safely means keeping one canonical row while deleting the rest without losing related data.

## When to Use


- For alternatives, see [Set Up Database Read Replicas for Scaling](/recipes/database-read-replicas/).

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

### Find duplicates across multiple columns

```sql
-- Find duplicate records based on first_name + last_name + birth_date
SELECT first_name, last_name, birth_date, COUNT(*) AS dup_count
FROM users
GROUP BY first_name, last_name, birth_date
HAVING COUNT(*) > 1
ORDER BY dup_count DESC;
```

### Preview duplicates before deleting

```sql
-- See what will be kept and what will be deleted
WITH duplicates AS (
  SELECT id, email, created_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
SELECT
  id,
  email,
  created_at,
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'DELETE' END AS action
FROM duplicates
ORDER BY email, rn;
```

### Safe deletion in a transaction

```sql
BEGIN;

-- Create a backup of duplicates
CREATE TEMP TABLE dup_backup AS
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
SELECT u.* FROM users u
JOIN duplicates d ON u.id = d.id
WHERE d.rn > 1;

-- Delete duplicates
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Verify count
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Commit only if no duplicates remain
COMMIT;
-- If duplicates remain, ROLLBACK;
```

### Batch deletion for large tables

```sql
-- Delete in batches of 1000 to avoid lock contention
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  LOOP
    WITH duplicates AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
      FROM users
      LIMIT 5000
    )
    DELETE FROM users
    WHERE id IN (SELECT id FROM duplicates WHERE rn > 1 LIMIT 1000);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    EXIT WHEN deleted_count = 0;

    RAISE NOTICE 'Deleted % rows', deleted_count;
    PERFORM pg_sleep(0.1);  -- throttle
  END LOOP;
END $$;
```

### MySQL 5.7 deduplication (no window functions)

```sql
-- Find duplicates
SELECT email, COUNT(*) AS dup_count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Delete duplicates keeping the row with MIN(id)
DELETE u1 FROM users u1
INNER JOIN users u2
  ON u1.email = u2.email
  AND u1.id > u2.id;
```

### Add unique constraint after cleanup

```sql
-- After verifying no duplicates remain
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- Or create a unique index (allows easier removal)
CREATE UNIQUE INDEX idx_users_unique_email ON users (email);
```

## Explanation

The first query groups rows by the column that should be unique and uses `HAVING COUNT(*) > 1` to return only duplicates. The second query uses a common table expression (CTE) with `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at)`. Each group of duplicates gets numbered starting from 1, and we delete every row except the first one. The `ORDER BY` clause determines which row is kept; here we keep the oldest record. Always run the `SELECT` version of the CTE before `DELETE` to confirm what will be removed.

### How ROW_NUMBER partitions work

`PARTITION BY email` groups rows by email. Within each group, `ORDER BY created_at` assigns row numbers starting from 1. The row with `rn = 1` is the canonical row (oldest in this case). All rows with `rn > 1` are duplicates to delete.

### Choosing the canonical row

| Strategy | ORDER BY | Keeps |
|----------|----------|-------|
| Oldest record | `created_at ASC` | First inserted |
| Newest record | `created_at DESC` | Last inserted |
| Most complete | `updated_at DESC` | Last updated |
| Highest ID | `id DESC` | Last assigned |

## Variants

| Database | Technique | Notes |
|----------|-----------|-------|
| PostgreSQL | `ROW_NUMBER() OVER` | Flexible and safe |
| MySQL 8+ | `ROW_NUMBER() OVER` | Same syntax as PostgreSQL |
| MySQL 5.7 | Self-join | Use `MIN(id)` to keep one row |
| SQLite | `DELETE` with `IN` subquery | Works with window functions in 3.25+ |
| SQL Server | `ROW_NUMBER() OVER` | Same syntax, use CTE |

## What Works

1. **Always preview before deleting.** Run the CTE as a `SELECT` first to see which rows will be kept.
2. **Back up the table or use a transaction.** A single bad `DELETE` can remove thousands of rows.
3. **Choose the canonical row with business logic.** Oldest, newest, or most complete record depends on the use case.
4. **Add a unique constraint after cleanup.** This prevents duplicates from returning.
5. **Consider foreign keys.** Deleting a parent row may orphan child rows unless you use `ON DELETE CASCADE` or update references first.
6. **Use batch deletion for large tables.** Deleting millions of rows in one transaction can lock the table and exhaust memory.
7. **Handle NULL values explicitly.** `NULL` does not equal `NULL` in `GROUP BY`; use `COALESCE` or `IS NOT DISTINCT FROM` to catch NULL duplicates.

## Common Mistakes

1. **Deleting without a WHERE clause.** A missing `WHERE` turns the query into a table wipe.
2. **Keeping the wrong row.** If you order randomly, you may discard the most valuable duplicate.
3. **Ignoring NULL values.** `NULL` does not equal `NULL`, so duplicates with NULL keys may not be detected by `GROUP BY`.
4. **Running on production during peak traffic.** Lock contention can block writes; use a batch approach or low-traffic window.
5. **Forgetting to update related sequences.** If you delete the highest `id`, you may need to reset a sequence, though it is rarely required.
6. **Not adding a unique constraint after cleanup.** Without it, duplicates will reappear.
7. **Using `DELETE` instead of `TRUNCATE` for full table dedup.** If all rows are duplicates, export the canonical rows, `TRUNCATE`, and re-import.

## Frequently Asked Questions

**Q: What if duplicates have different values in other columns?**
A: Choose the canonical row by business rules, then either merge the data or keep the row with the most complete or most recent data. You can use `COALESCE` to pick non-null values from duplicates.

**Q: Can I delete duplicates in batches?**
A: Yes. Add `AND id IN (SELECT id FROM duplicates WHERE rn > 1 LIMIT 1000)` and run the delete repeatedly until no duplicates remain. Add a small sleep between batches to reduce lock contention.

**Q: How do I prevent duplicates from reappearing?**
A: Add a unique constraint or unique index on the columns that define uniqueness, and handle duplicate key exceptions in your application with `ON CONFLICT DO NOTHING` (PostgreSQL) or `INSERT IGNORE` (MySQL).

**Q: How do I find duplicates on a JSONB column?**
A: Cast the JSONB to text for comparison: `GROUP BY jsonb_column::text HAVING COUNT(*) > 1`. For partial duplicates, extract specific keys and compare those.

**Q: What is the difference between DISTINCT and deduplication?**
A: `SELECT DISTINCT` removes duplicates from query results but does not modify the table. Deduplication deletes actual rows from the table. Use `DISTINCT` for queries, deduplication for data cleanup.

**Q: Can I use ON CONFLICT to handle duplicates on insert?**
A: Yes. PostgreSQL supports `INSERT ... ON CONFLICT (email) DO NOTHING` to skip duplicates, or `DO UPDATE SET ...` to merge. This prevents duplicates without a separate cleanup step.

**Q: How do I find near-duplicates (fuzzy matching)?**
A: Use trigram similarity: `CREATE EXTENSION pg_trgm; SELECT a.id, b.id, similarity(a.email, b.email) FROM users a, users b WHERE a.id < b.id AND a.email % b.email;`

## Performance Tips

1. **Index the columns used for deduplication.** The `PARTITION BY` and `ORDER BY` columns in the CTE need indexes for fast sorting:

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_email_created ON users (email, created_at);
```

2. **Use `EXPLAIN ANALYZE` to verify the plan.** The CTE should use the index for the window function sort, not a full table scan:

```sql
EXPLAIN ANALYZE
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
SELECT * FROM duplicates WHERE rn > 1;
```

3. **Batch large deduplication jobs.** For tables with millions of rows, delete in batches of 1000-5000 rows to avoid long-running transactions and lock contention.

4. **Run during low-traffic windows.** Deduplication queries scan and sort large portions of the table. Schedule them during off-peak hours or maintenance windows.

5. **Use `ANALYZE` after cleanup.** After deleting a large number of rows, update table statistics so the query planner has accurate information:

```sql
ANALYZE users;
```

6. **Consider `REINDEX` after large deletions.** Deleting many rows can bloat indexes. Rebuild them to reclaim space and improve performance:

```sql
REINDEX INDEX idx_users_email;
```

7. **Use `VACUUM FULL` for severe bloat.** After a massive deduplication, the table may have significant dead space. `VACUUM FULL` rewrites the table and reclaims space, but it locks the table exclusively. Run it during a maintenance window.

8. **Log deletion counts for audit trails.** Track how many rows were deleted in each batch for compliance and rollback verification. Store counts in a dedicated audit table or application logs.

9. **Test with a copy first.** Before running deduplication on production data, test on a copy: `CREATE TABLE users_dedup_test AS SELECT * FROM users;`. Run the CTE against the copy and verify the results match expectations.

10. **Document the deduplication strategy.** Record which columns define uniqueness, which row is kept, and when the cleanup was last run. This helps future maintenance and onboarding.

11. **Set up monitoring for duplicate recurrence.** Create a scheduled job that checks for duplicates weekly and alerts if counts increase, so you catch data quality issues early.

## Advanced Techniques

### Deduplicate with partial column matching

When you need to deduplicate based on a subset of columns but keep all columns:

```sql
-- Find duplicates by email but keep the row with most recent activity
WITH ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY last_activity DESC) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### Merge data from duplicates before deletion

When duplicates contain different valuable data, merge them first:

```sql
-- Merge data from duplicates into the canonical row
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
),
canonical AS (
  SELECT id FROM duplicates WHERE rn = 1
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
UPDATE users u
SET last_name = COALESCE(
  (SELECT MAX(last_name) FROM users WHERE id IN (SELECT id FROM to_delete) AND email = u.email),
  u.last_name
)
WHERE id IN (SELECT id FROM canonical);

-- Then delete the duplicates
DELETE FROM users
WHERE id IN (SELECT id FROM to_delete);
```

### Handle case-insensitive duplicates

Email addresses should be treated case-insensitively:

```sql
-- Find case-insensitive duplicate emails
SELECT LOWER(email) as email_lower, COUNT(*)
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Deduplicate keeping the first occurrence
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
```

### Deduplicate across multiple tables

When duplicates exist across related tables:

```sql
-- Find duplicates across users and archived_users
SELECT email, COUNT(*)
FROM (
  SELECT email FROM users
  UNION ALL
  SELECT email FROM archived_users
) all_emails
GROUP BY email
HAVING COUNT(*) > 1;

-- Remove from archived if exists in active
DELETE FROM archived_users
WHERE email IN (SELECT email FROM users);
```

### Use temporary tables for safe large-scale deduplication

For very large tables, use a temporary table approach:

```sql
-- Create a clean copy
CREATE TABLE users_clean AS
SELECT DISTINCT ON (email) *
FROM users
ORDER BY email, created_at;

-- Verify row counts match expectations
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM users_clean;

-- Swap tables in a transaction
BEGIN;
DROP TABLE users;
ALTER TABLE users_clean RENAME TO users;
COMMIT;
```
