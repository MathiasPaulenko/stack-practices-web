---
contentType: recipes
slug: sql-partitioning-strategies
title: "Partition Large Tables by Date or Range"
description: "Split huge SQL tables into smaller partitions by date, range, or list to improve query performance and maintenance."
metaDescription: "Partition large SQL tables by date, range, or list. Learn strategies to improve query performance, prune partitions, and simplify maintenance."
difficulty: advanced
topics:
  - databases
tags:
  - sql
  - postgresql
  - partitioning
  - performance
  - maintenance
relatedResources:
  - /recipes/sql-index-optimization-analysis
  - /guides/read-replica-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/postgres-query-optimization
  - /recipes/sql-find-duplicate-rows
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Partition large SQL tables by date, range, or list. Learn strategies to improve query performance, prune partitions, and simplify maintenance."
  keywords:
    - databases
    - sql
    - postgresql
    - partitioning
    - performance
    - maintenance
---


## Overview

When a table grows past hundreds of millions of rows, every query becomes a battle against index size and maintenance time. Partitioning splits the table into smaller, more manageable pieces while keeping the whole thing queryable as a single table. The database prunes partitions that do not match the query, so scans are smaller and index maintenance is cheaper.

## When to Use

Use this resource when:
- A table is growing faster than your hardware budget.
- Queries mostly filter by a natural range such as date or region.
- Maintenance windows are too short for vacuuming or reindexing the whole table.
- You need to archive or drop old data efficiently.

## Solution

### Partition orders by month in PostgreSQL

```sql
-- Create a partitioned table
CREATE TABLE orders (
  id BIGSERIAL,
  customer_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create future partitions automatically with a script or extension
```

### List partitioning by region

```sql
-- Partition customers by region
CREATE TABLE customers (
  id BIGSERIAL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  email TEXT,
  PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

CREATE TABLE customers_north PARTITION OF customers
  FOR VALUES IN ('north', 'northeast');

CREATE TABLE customers_south PARTITION OF customers
  FOR VALUES IN ('south', 'southeast');

CREATE TABLE customers_west PARTITION OF customers
  FOR VALUES IN ('west', 'southwest');

-- Default partition for unexpected values
CREATE TABLE customers_default PARTITION OF customers DEFAULT;
```

### Hash partitioning for even distribution

```sql
-- Partition users by hash of user_id for even distribution
CREATE TABLE user_events (
  id BIGSERIAL,
  user_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id, user_id)
) PARTITION BY HASH (user_id);

-- Create 4 hash partitions
CREATE TABLE user_events_p0 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE user_events_p1 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE user_events_p2 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE user_events_p3 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### Sub-partitioning (composite)

```sql
-- Partition by range (date) then sub-partition by list (region)
CREATE TABLE sales (
  id BIGSERIAL,
  region TEXT NOT NULL,
  sale_date DATE NOT NULL,
  amount NUMERIC(10,2),
  PRIMARY KEY (id, sale_date, region)
) PARTITION BY RANGE (sale_date);

-- January 2024, sub-partitioned by region
CREATE TABLE sales_2024_01 PARTITION OF sales
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01')
  PARTITION BY LIST (region);

CREATE TABLE sales_2024_01_north PARTITION OF sales_2024_01
  FOR VALUES IN ('north', 'northeast');

CREATE TABLE sales_2024_01_south PARTITION OF sales_2024_01
  FOR VALUES IN ('south', 'southeast');
```

### Verify partition pruning with EXPLAIN

```sql
-- Confirm the planner skips irrelevant partitions
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE created_at >= '2024-01-15' AND created_at < '2024-02-01';

-- Good: only orders_2024_01 is scanned
-- Bad: all partitions are scanned (check for missing constraints)
```

### Archive old partitions

```sql
-- Detach a partition instead of dropping (keeps data as standalone table)
ALTER TABLE orders DETACH PARTITION orders_2023_01;

-- Now the data is in a regular table that can be archived
-- Drop the detached table when no longer needed
DROP TABLE orders_2023_01;

-- Or move it to cheaper storage
ALTER TABLE orders_2023_01 SET TABLESPACE archive_tablespace;
```

### Automate partition creation with pg_partman

```sql
-- Install pg_partman extension
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Create a weekly partitioned table with automatic maintenance
SELECT partman.create_parent(
  'public.events',
  'created_at',
  'weekly',
  p_count := 4  -- pre-create 4 future partitions
);

-- Schedule weekly maintenance to create new partitions
-- Run via cron: SELECT partman.run_maintenance_proc();
```

### Create indexes on partitioned tables

```sql
-- Create an index on the parent table; PostgreSQL creates it on all partitions
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- Create an index including the partition key
CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at);

-- Verify indexes exist on child partitions
SELECT tablename, indexname FROM pg_indexes
WHERE tablename LIKE 'orders_2024%'
ORDER BY tablename, indexname;
```

## Explanation

Declarative partitioning in PostgreSQL lets you define a partitioned table and attach child tables that hold specific ranges. The partition key must be part of the primary key. When a query filters on `created_at`, the planner only scans the partitions that can contain matching rows, a process called partition pruning. Dropping old data becomes `DROP TABLE orders_2024_01`, which is much faster and recovers space immediately compared to deleting millions of rows.

### Partition pruning

Partition pruning happens at plan time (static pruning) or execution time (dynamic pruning). Static pruning works when the filter is a constant literal. Dynamic pruning works with parameterized queries (e.g., prepared statements).

```sql
-- Static pruning: planner knows the date at plan time
SELECT * FROM orders WHERE created_at = '2024-01-15';

-- Dynamic pruning: pruning happens at execution time
PREPARE get_orders(DATE) AS
  SELECT * FROM orders WHERE created_at = $1;
EXECUTE get_orders('2024-01-15');
```

### Partition vs sharding

| Feature | Partitioning | Sharding |
|---------|-------------|----------|
| Scope | Single database | Multiple databases |
| Transparency | Automatic | Application-aware |
| Use case | Large single-node tables | Horizontal scale-out |
| Query | Single connection | Cross-node fan-out |
| Transactions | ACID | Distributed (2PC) |

## Variants

| Strategy | Key | Best for |
|----------|-----|----------|
| Range | Date, numeric range | Time-series, logs |
| List | Region, status | Discrete categories |
| Hash | Hash of key | Even distribution, no natural range |
| Composite | Range + List | Large multi-tenant tables |
| Default | Catch-all | Unexpected values in list partitioning |

## What Works

1. **Choose the partition key based on query patterns.** Partitioning by a column you never filter on is wasted overhead.
2. **Create future partitions before data arrives.** Use a cron job or extension like `pg_partman` to automate this.
3. **Keep indexes on each partition.** Local indexes are cheaper to rebuild than one giant global index.
4. **Archive old partitions instead of deleting rows.** `DROP TABLE` or `DETACH PARTITION` is fast and reclaims space.
5. **Test partition pruning with EXPLAIN.** Confirm the planner skips irrelevant partitions.
6. **Start with range partitioning on date.** It is the most common and easiest to reason about.
7. **Use a default partition for list partitioning.** It catches unexpected values and prevents insert failures.

## Common Mistakes

1. **Partitioning too early.** Tables with a few million rows rarely benefit from partitioning.
2. **Wrong partition key.** A key with low cardinality or uneven distribution creates hot partitions.
3. **Forgetting the partition key in the primary key.** PostgreSQL requires it for range and list partitioning.
4. **Too many partitions.** Hundreds of partitions can slow planning and increase catalog bloat.
5. **Cross-partition updates.** Updating the partition key moves a row between partitions and can be slow or blocked.
6. **Not automating partition creation.** Forgetting to create next month's partition causes insert failures.
7. **Ignoring default partition size.** A default partition that grows large becomes a performance bottleneck.

## Frequently Asked Questions

**Q: Do I need to change application queries?**
A: No. Partitioned tables look like normal tables to applications. The planner handles pruning automatically.

**Q: How do I add a partition for a new month?**
A: Use `CREATE TABLE ... PARTITION OF ... FOR VALUES FROM ... TO ...`. Automate this with a scheduled job or pg_partman.

**Q: Can I partition an existing table?**
A: Yes, but it usually requires creating a new partitioned table, migrating data, and renaming. PostgreSQL does not support converting a regular table in place.

**Q: How many partitions should I create?**
A: Aim for partitions between 1GB and 50GB each. For time-series data, monthly partitions are a good starting point. Avoid more than a few hundred partitions per table.

**Q: What happens if I insert a row with no matching partition?**
A: For range and list partitioning without a default partition, the insert fails with an error. For hash partitioning, the row goes to the matching hash bucket.

**Q: Can I have foreign keys referencing a partitioned table?**
A: PostgreSQL 12+ supports foreign keys referencing partitioned tables. The partition key must be part of the referenced column set.

**Q: How does partitioning affect VACUUM and maintenance?**
A: Each partition is vacuumed independently, so maintenance is faster and can be parallelized. Old partitions can be detached and dropped instead of vacuuming.

**Q: What is the difference between declarative and inheritance partitioning?**
A: Declarative partitioning (PostgreSQL 10+) uses `PARTITION BY` syntax and is the recommended approach. Inheritance partitioning uses table inheritance with triggers and is the older, manual approach.

## Performance Tips

1. **Verify partition pruning regularly.** Run `EXPLAIN ANALYZE` on key queries and confirm only relevant partitions are scanned. Missing constraints or wrong data types can prevent pruning.

2. **Use `pg_partman` for time-series automation.** It handles partition creation, rotation, and archiving automatically:

```sql
-- Run maintenance weekly via cron
SELECT partman.run_maintenance_proc();
```

3. **Monitor partition sizes.** Keep an eye on partition sizes to detect hot partitions or uneven distribution:

```sql
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE tablename LIKE 'orders_2024%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

4. **Tune `max_parallel_workers_per_gather`.** Partitioned table scans can benefit from parallel workers. Increase this setting for large partitioned scans.

5. **Use `SET enable_partition_pruning = on`** to ensure pruning is active. It is on by default in PostgreSQL 11+, but verify if queries scan all partitions unexpectedly.
