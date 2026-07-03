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
    - /recipes/sql-index-optimization-analysis
    - /guides/read-replica-guide
    - /guides/sql-performance-tuning-guide
    - /recipes/postgres-query-optimization
    - /recipes/sql-find-duplicate-rows
    - databases
    - sql
    - postgresql
    - partitioning
    - performance
    - maintenance
    - /recipes/sql-index-optimization-analysis
    - /guides/read-replica-guide
    - /guides/sql-performance-tuning-guide
    - /recipes/postgres-query-optimization
    - /recipes/sql-find-duplicate-rows
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

## Explanation

Declarative partitioning in PostgreSQL lets you define a partitioned table and attach child tables that hold specific ranges. The partition key must be part of the primary key. When a query filters on `created_at`, the planner only scans the partitions that can contain matching rows, a process called partition pruning. Dropping old data becomes `DROP TABLE orders_2024_01`, which is much faster and recovers space immediately compared to deleting millions of rows.

## Variants

| Strategy | Key | Best for |
|----------|-----|----------|
| Range | Date, numeric range | Time-series, logs |
| List | Region, status | Discrete categories |
| Hash | Hash of key | Even distribution, no natural range |
| Composite | Range + List | Large multi-tenant tables |

## What Works

1. **Choose the partition key based on query patterns.** Partitioning by a column you never filter on is wasted overhead.
2. **Create future partitions before data arrives.** Use a cron job or extension like `pg_partman` to automate this.
3. **Keep indexes on each partition.** Local indexes are cheaper to rebuild than one giant global index.
4. **Archive old partitions instead of deleting rows.** `DROP TABLE` or `DETACH PARTITION` is fast and reclaims space.
5. **Test partition pruning with EXPLAIN.** Confirm the planner skips irrelevant partitions.

## Common Mistakes

1. **Partitioning too early.** Tables with a few million rows rarely benefit from partitioning.
2. **Wrong partition key.** A key with low cardinality or uneven distribution creates hot partitions.
3. **Forgetting the partition key in the primary key.** PostgreSQL requires it for range and list partitioning.
4. **Too many partitions.** Hundreds of partitions can slow planning and increase catalog bloat.
5. **Cross-partition updates.** Updating the partition key moves a row between partitions and can be slow or blocked.

## Frequently Asked Questions

**Q: Do I need to change application queries?**
A: No. Partitioned tables look like normal tables to applications. The planner handles pruning automatically.

**Q: How do I add a partition for a new month?**
A: Use `CREATE TABLE ... PARTITION OF ... FOR VALUES FROM ... TO ...`. Automate this with a scheduled job or pg_partman.

**Q: Can I partition an existing table?**
A: Yes, but it usually requires creating a new partitioned table, migrating data, and renaming. PostgreSQL does not support converting a regular table in place.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
