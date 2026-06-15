---
contentType: recipes
slug: query-optimization
title: "Optimize Slow Database Queries"
description: "How to identify, analyze, and fix slow SQL queries using EXPLAIN, query refactoring, and database-specific optimization techniques."
metaDescription: "Learn database query optimization. Use EXPLAIN, refactor queries, and apply database-specific techniques to fix slow SQL and improve application performance."
difficulty: intermediate
topics:
  - performance
tags:
  - query-optimization
  - sql
  - database
  - performance
  - explain
  - postgresql
  - mysql
  - profiling
relatedResources:
  - /recipes/database-indexing
  - /recipes/sql-joins
  - /recipes/connection-pooling
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn database query optimization. Use EXPLAIN, refactor queries, and apply database-specific techniques to fix slow SQL and improve application performance."
  keywords:
    - query optimization
    - slow queries
    - sql performance
    - explain analyze
    - database profiling
    - query refactoring
---

## Overview

Slow database queries are one of the most common causes of application performance degradation. A single unoptimized query can consume 100% of a CPU core, hold locks for seconds, or scan millions of rows unnecessarily. The good news is that most slow queries can be dramatically improved with systematic analysis and targeted refactoring.

Query optimization is a three-step process: identify slow queries through logging and monitoring, understand their execution plan with `EXPLAIN`, and apply targeted fixes like indexing, rewriting, or schema changes. This recipe walks through each step with concrete examples.

## When to Use

Use this recipe when:

- Application response times degrade as data volume grows
- Database CPU or I/O usage is consistently high
- Monitoring tools flag specific queries as slow query log entries
- Adding pagination, search, or reporting features to existing tables
- Migrating legacy SQL to a new database engine

## Solution

### Identify Slow Queries (PostgreSQL)

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = '1000ms';
SELECT pg_reload_conf();

-- Query pg_stat_statements for worst offenders
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Analyze with EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > '2025-01-01'
ORDER BY o.total DESC
LIMIT 100;
```

### Refactor N+1 Queries

```python
# BEFORE: N+1 queries (inefficient)
for order in orders:
    customer = db.query("SELECT name FROM customers WHERE id = %s", (order.customer_id,))

# AFTER: Single JOIN query
customers = db.query("""
    SELECT o.id, o.total, c.name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ANY(%s)
""", ([o.id for o in orders],))
```

## Explanation

- **EXPLAIN ANALYZE**: Executes the query and shows the actual execution plan, including row counts, filter conditions, and I/O operations. Look for sequential scans, nested loops with high row counts, and sort operations without indexes.
- **N+1 queries**: Occur when code loops over a result set and executes an additional query per iteration. A single well-crafted JOIN or `IN` clause replaces hundreds of individual queries.
- **Covering indexes**: When all columns a query needs are in the index, the database can answer the query without touching the table. This is called an "index-only scan" and can be 10x faster.
- **Query rewriting**: Sometimes the query itself is the problem. Converting `NOT IN` to `NOT EXISTS`, using `UNION ALL` instead of `UNION`, or filtering early with subqueries can dramatically improve performance.

## Variants

| Technique | Impact | Effort | Best For |
|-----------|--------|--------|----------|
| Add index | High | Low | Missing index on WHERE/JOIN columns |
| Rewrite query | High | Medium | Inefficient joins, subqueries |
| Partition table | Very high | High | Tables > 10M rows with time-based queries |
| Materialized view | High | Medium | Complex aggregations queried frequently |

## Best Practices

- **Filter early**: apply `WHERE` conditions on indexed columns before joins and sorts. The fewer rows that flow through the query pipeline, the faster it runs.
- **Avoid `SELECT *`**: fetching unnecessary columns wastes I/O and memory. Select only the columns you need.
- **Use `EXISTS` instead of `IN` for large subqueries**: `EXISTS` short-circuits on the first match, while `IN` may build a complete intermediate result set.
- **Update table statistics**: the query optimizer relies on statistics to choose plans. Run `ANALYZE` after bulk loads or significant data changes.
- **Monitor query plans over time**: execution plans can change as data distribution shifts. Set up alerts when a previously fast query suddenly slows down.

## Common Mistakes

- **Indexing without analyzing**: adding an index on a low-cardinality column (like a boolean) rarely helps and always slows writes.
- **Ignoring query planner hints**: sometimes the optimizer chooses a bad plan. Use hints (`USE INDEX`, `SET enable_seqscan = off`) judiciously when you know better.
- **Not testing with production data volume**: a query that runs in 10ms on a development database with 1,000 rows may take 10 seconds on production with 10 million rows.
- **Premature optimization**: profile first. Do not rewrite perfectly fast queries. Focus on the top 5 slowest queries by total execution time.

## Frequently Asked Questions

**Q: How do I know if a query is using an index?**
A: Check the `EXPLAIN` output. `Index Scan` or `Index Only Scan` means the query is using an index. `Seq Scan` means it is reading the entire table.

**Q: Should I always avoid `SELECT *`?**
A: For production queries, yes. But for ad-hoc exploration or very small tables, `SELECT *` is fine. The key is being intentional about what you fetch.

**Q: What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?**
A: `EXPLAIN` shows the estimated plan without executing. `EXPLAIN ANALYZE` executes the query and shows actual timings and row counts. Always use `ANALYZE` when tuning.

**Q: Can ORMs generate efficient queries?**
A: Usually, but not always. ORMs like SQLAlchemy and Hibernate can generate N+1 queries or inefficient joins. Profile the actual SQL they emit and optimize at the SQL level when needed.

