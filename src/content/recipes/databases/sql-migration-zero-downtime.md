---
contentType: recipes
slug: sql-migration-zero-downtime
title: "Zero-Downtime Column Rename Migration"
description: "Rename columns or change data types without locking tables by using views, triggers, and backfill strategies."
metaDescription: "Rename columns and change data types with zero downtime in SQL. Learn expand-contract migrations, triggers, and incremental backfill strategies."
difficulty: advanced
topics:
  - databases
tags:
  - sql
  - postgresql
  - migration
  - schema
  - zero-downtime
relatedResources:
  - /docs/database-schema-documentation-template
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-partitioning-strategies
  - /recipes/sql-recursive-cte-query
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Rename columns and change data types with zero downtime in SQL. Learn expand-contract migrations, triggers, and incremental backfill strategies."
  keywords:
    - databases
    - sql
    - postgresql
    - migration
    - schema
    - zero-downtime
---


## Overview

Renaming a column or changing its type on a busy table is risky because `ALTER TABLE` can acquire an exclusive lock and block reads and writes for minutes or hours. Zero-downtime migrations avoid this by adding a new column, backfilling data incrementally, synchronizing writes with triggers or views, and then switching over once the old and new values match.

## When to Use

Use this resource when:
- You need to rename a column in a production table without downtime.
- You are changing a data type and cannot afford a long lock.
- You are migrating a legacy column to a new format.
- Your application cannot tolerate a maintenance window.

## Solution

### Rename a column with zero downtime

```sql
-- Step 1: add the new column
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);

-- Step 2: create a trigger to keep both columns in sync
CREATE OR REPLACE FUNCTION sync_email() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_address IS DISTINCT FROM OLD.email_address THEN
    NEW.email := NEW.email_address;
  ELSIF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email_address := NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_sync_email
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION sync_email();

-- Step 3: backfill in batches
UPDATE customers
SET email_address = email
WHERE id BETWEEN 1 AND 1000
  AND email_address IS NULL;

-- Step 4: verify all rows match, then drop old column and rename
```

### Change a data type with zero downtime

```sql
-- Step 1: add new column with the target type
ALTER TABLE orders ADD COLUMN total_cents INTEGER;

-- Step 2: trigger to sync both columns
CREATE OR REPLACE FUNCTION sync_total() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_cents IS DISTINCT FROM OLD.total_cents THEN
    NEW.total := NEW.total_cents / 100.0;
  ELSIF NEW.total IS DISTINCT FROM OLD.total THEN
    NEW.total_cents := (NEW.total * 100)::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_sync_total
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION sync_total();

-- Step 3: backfill in batches with casting
UPDATE orders
SET total_cents = (total * 100)::INTEGER
WHERE id BETWEEN 1 AND 5000
  AND total_cents IS NULL;

-- Step 4: verify
SELECT COUNT(*) FROM orders WHERE total_cents IS NULL;
SELECT COUNT(*) FROM orders WHERE total_cents != (total * 100)::INTEGER;

-- Step 5: switch app reads, add NOT NULL, add check constraint
ALTER TABLE orders ADD CONSTRAINT chk_total_cents CHECK (total_cents >= 0);

-- Step 6: drop old column
ALTER TABLE orders DROP COLUMN total;
ALTER TABLE orders RENAME COLUMN total_cents TO total;
DROP TRIGGER orders_sync_total ON orders;
DROP FUNCTION sync_total();
```

### Backfill script with batch loop

```sql
DO $$
DECLARE
  batch_count INTEGER := 0;
  rows_updated INTEGER;
BEGIN
  LOOP
    UPDATE customers
    SET email_address = email
    WHERE id IN (
      SELECT id FROM customers
      WHERE email_address IS NULL
      LIMIT 1000
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    batch_count := batch_count + 1;
    RAISE NOTICE 'Batch %: updated % rows', batch_count, rows_updated;
    PERFORM pg_sleep(0.1);
  END LOOP;
  RAISE NOTICE 'Backfill complete: % batches', batch_count;
END $$;
```

### Verification query before cutover

```sql
-- Check for any mismatched rows
SELECT COUNT(*) AS mismatch_count
FROM customers
WHERE email_address IS DISTINCT FROM email;

-- Check for NULLs in new column
SELECT COUNT(*) AS null_count
FROM customers
WHERE email_address IS NULL;

-- Sample mismatched rows for manual inspection
SELECT id, email, email_address
FROM customers
WHERE email_address IS DISTINCT FROM email
LIMIT 10;
```

## Explanation

The approach is called expand-contract. First expand the schema by adding the new column while keeping the old one. A trigger ensures that writes update both columns during the transition. Backfill the new column in small batches to avoid long locks. Once the new column is fully populated and applications have been switched to use it, drop the old column and optionally rename the new one. This lets the application switch at its own pace without a database-level cutover.

### The four phases of expand-contract

1. **Expand**: Add new columns, indexes, or tables without removing old ones. The application continues working with the old schema.
2. **Migrate**: Backfill data in batches. A trigger or application-level dual-write keeps new and old columns in sync for concurrent writes.
3. **Verify**: Run validation queries to confirm every row has matching values in both columns. Check for NULLs, type mismatches, and constraint violations.
4. **Contract**: Drop the old column, remove the trigger, and rename the new column. Deploy the final application version that only references the new column.

### Locking behavior of common DDL operations

| Operation | PostgreSQL | MySQL |
|-----------|------------|-------|
| `ADD COLUMN` (nullable, no default) | Brief metadata lock | Brief metadata lock |
| `ADD COLUMN` (with default) | Brief (PG 11+) | Full table rewrite (MySQL 5.6-) |
| `ALTER COLUMN TYPE` | Full table rewrite | Full table rewrite |
| `DROP COLUMN` | Brief metadata lock | Brief metadata lock |
| `CREATE INDEX` | `CONCURRENTLY` = no lock | `INPLACE` = brief lock |
| `ADD CONSTRAINT` | `NOT VALID` + VALIDATE | Brief lock |

## Variants

| Step | Tool | Purpose |
|------|------|---------|
| Add column | `ALTER TABLE` | Expand schema |
| Sync writes | Trigger or application | Dual-write |
| Backfill | Batched `UPDATE` | Migrate existing rows |
| Validate | `COUNT(*)` with mismatch filter | Confirm parity |
| Switch | Deploy new app version | Read from new column |
| Cleanup | `DROP COLUMN` + `DROP TRIGGER` | Contract schema |

## What Works

1. **Always run migrations in a transaction when possible.** This keeps the schema consistent.
2. **Backfill in small batches with a sleep between them.** This reduces lock contention and replication lag.
3. **Use `IS DISTINCT FROM` for NULL-safe comparisons.** `NULL = NULL` is unknown, so use the distinct operator.
4. **Add a feature flag to switch reads.** Switch the application to the new column once backfill is complete.
5. **Monitor replication lag during backfill.** Large updates can overwhelm replicas; pause if lag grows.
6. **Create indexes concurrently.** Use `CREATE INDEX CONCURRENTLY` in PostgreSQL to avoid blocking writes.
7. **Test the full migration on a staging copy.** Measure timing, lock behavior, and resource usage before running in production.
8. **Keep the trigger until after cutover.** Removing the trigger too early can cause data drift if old code paths still write to the old column.

## Common Mistakes

1. **Running a single massive UPDATE.** This locks the table and can roll back on failure.
2. **Forgetting to handle new writes during backfill.** Without a trigger, rows inserted after the backfill start will be missing.
3. **Dropping the old column too early.** Verify both columns match for every row before cutting over.
4. **Not indexing the new column.** If the application queries the new column, add the needed indexes before switching.
5. **Ignoring foreign key references.** Other tables or views may reference the old column by name.
6. **Not setting `statement_timeout`.** A long-running DDL can block all queries. Set a timeout to abort migrations that take too long.
7. **Dropping the trigger before all app instances are updated.** During a rolling deploy, old instances may still write to the old column.

## Frequently Asked Questions

**Q: How long should a backfill take?**
A: It depends on table size and write rate. Typical strategies process a few thousand rows per batch with a short sleep between batches to avoid peak-load impact. A 10M-row table might take 1-4 hours with 1000-row batches and 100ms sleeps.

**Q: Can I do this without triggers?**
A: Yes, you can dual-write from the application layer. The database trigger is a safety net in case not all code paths are updated. Application-level dual-write gives you more control but requires every write path to be updated.

**Q: What if the new column has a different data type?**
A: Cast values during backfill and update the trigger to handle conversions. Test the casting on a sample before running it on the full table. Watch for precision loss when converting between NUMERIC and INTEGER types.

**Q: How do I handle NOT NULL constraints?**
A: Add the column as nullable first. After backfill is complete and verified, add the NOT NULL constraint: `ALTER TABLE customers ALTER COLUMN email_address SET NOT NULL;`. This requires a brief lock but is fast once all rows are populated.

**Q: Can I roll back after dropping the old column?**
A: No. Once you drop the old column, the data is gone. Keep the old column until you are certain the new column works correctly in production. Consider archiving the old column data to a backup table before dropping.

**Q: How do I handle indexes on the new column?**
A: Create indexes with `CREATE INDEX CONCURRENTLY` in PostgreSQL to avoid blocking writes. In MySQL, use `ALGORITHM=INPLACE` or `pt-online-schema-change` for large tables. Create indexes before switching application reads to the new column.

**Q: What about views that reference the old column?**
A: Views in PostgreSQL store the column reference by name, not position. Dropping a column that a view references will cause the view to break. Recreate views to reference the new column before dropping the old one.

## Performance Tips

1. **Set `statement_timeout` before running DDL.** This prevents a migration from blocking the database indefinitely:

```sql
SET statement_timeout = '30s';
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);
SET statement_timeout = '0';  -- reset to default
```

2. **Use `CREATE INDEX CONCURRENTLY` for new indexes.** This avoids blocking writes but takes longer than a regular `CREATE INDEX`. It cannot run inside a transaction.

3. **Monitor `pg_stat_activity` during backfill.** Watch for long-running queries and lock waits:

```sql
SELECT pid, state, wait_event_type, wait_event,
       now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

4. **Adjust `work_mem` for large batch updates.** Increasing `work_mem` for the migration session can speed up batch updates by allowing larger in-memory sorts:

```sql
SET work_mem = '256MB';
```

5. **Use `lock_timeout` to avoid waiting indefinitely.** If a migration cannot acquire a lock, it is better to fail fast and retry than to block:

```sql
SET lock_timeout = '5s';
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);
```

6. **Use `pg_repack` for table bloat.** After large backfills or updates, tables and indexes can become bloated. `pg_repack` rebuilds tables without exclusive locks:

```bash
pg_repack -d mydb -t customers -j 2
```

7. **Monitor `pg_stat_progress_create_index`.** Track progress of concurrent index creation to estimate completion time:

```sql
SELECT phase, blocks_done, blocks_total,
       tuples_done, tuples_total
FROM pg_stat_progress_create_index;
```

8. **Use `temp_files` to detect spill-to-disk.** Large batch updates that exceed `work_mem` spill to disk, slowing down the migration:

```sql
SELECT datname, temp_files, temp_bytes
FROM pg_stat_database
WHERE datname = 'mydb';
```

## Advanced Techniques

### Migration with application-level dual-write

Handle migrations entirely in the application layer without database triggers:

```sql
-- Step 1: add new column (nullable)
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);

-- Step 2: application code writes to both columns
-- (No trigger needed; application handles sync)

-- Step 3: backfill via application in batches
-- Application runs: UPDATE customers SET email_address = email WHERE id BETWEEN ? AND ?

-- Step 4: verify parity
SELECT COUNT(*) FROM customers WHERE email_address IS DISTINCT FROM email;

-- Step 5: switch application to read from new column

-- Step 6: drop old column
ALTER TABLE customers DROP COLUMN email;
```

### Safe column rename using view migration

Rename a column without breaking existing queries:

```sql
-- Step 1: add new column
ALTER TABLE customers ADD COLUMN email_new VARCHAR(255);

-- Step 2: backfill data
UPDATE customers SET email_new = email WHERE email_new IS NULL;

-- Step 3: create view with renamed column
CREATE OR REPLACE VIEW customers_v1 AS
SELECT id, name, email_new AS email, created_at
FROM customers;

-- Step 4: migrate application to use view

-- Step 5: drop old column and rename new
ALTER TABLE customers DROP COLUMN email;
ALTER TABLE customers RENAME COLUMN email_new TO email;

-- Step 6: drop view and use table directly
DROP VIEW customers_v1;
```

### Migration with check constraints for validation

Add constraints incrementally to validate data during migration:

```sql
-- Step 1: add new column
ALTER TABLE orders ADD COLUMN total_cents INTEGER;

-- Step 2: backfill with validation
UPDATE orders SET total_cents = (total * 100)::INTEGER
WHERE total_cents IS NULL;

-- Step 3: add constraint as NOT VALID (no lock)
ALTER TABLE orders ADD CONSTRAINT chk_total_cents_positive
CHECK (total_cents >= 0) NOT VALID;

-- Step 4: validate constraint later (brief lock)
ALTER TABLE orders VALIDATE CONSTRAINT chk_total_cents_positive;

-- Step 5: if validation passes, proceed with cutover
```

### Handling foreign key migrations

Migrate foreign key columns without breaking referential integrity:

```sql
-- Step 1: add new FK column (nullable)
ALTER TABLE orders ADD COLUMN customer_id_new INTEGER;

-- Step 2: backfill from old FK
UPDATE orders SET customer_id_new = customer_id WHERE customer_id_new IS NULL;

-- Step 3: add FK constraint to new column
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer_new
FOREIGN KEY (customer_id_new) REFERENCES customers(id);

-- Step 4: switch application to use new FK

-- Step 5: drop old FK and column
ALTER TABLE orders DROP CONSTRAINT fk_orders_customer;
ALTER TABLE orders DROP COLUMN customer_id;

-- Step 6: rename new column
ALTER TABLE orders RENAME COLUMN customer_id_new TO customer_id;
```

### Rollback strategy with shadow column

Keep a shadow column for quick rollback capability:

```sql
-- Step 1: add shadow column (not used by app)
ALTER TABLE customers ADD COLUMN email_shadow VARCHAR(255);

-- Step 2: backfill shadow column
UPDATE customers SET email_shadow = email WHERE email_shadow IS NULL;

-- Step 3: proceed with main migration
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);
-- ... backfill email_address ...

-- Step 4: if issues arise, rollback using shadow
UPDATE customers SET email = email_shadow WHERE email IS NULL;

-- Step 5: after successful cutover, drop shadow
ALTER TABLE customers DROP COLUMN email_shadow;
```
