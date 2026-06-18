---
contentType: recipes
slug: database-views-materialized
title: "Create and Use Database Views and Materialized Views"
description: "How to create and use database views and materialized views to simplify queries and improve read performance"
metaDescription: "Create database views and materialized views to simplify queries and boost read performance. Use PostgreSQL, MySQL, and SQL Server with examples."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - database-views
  - materialized-views
  - mysql
  - performance
  - postgresql
  - sql
  - sql-server
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/sql-joins
  - /guides/database-design-guide
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Create database views and materialized views to simplify queries and boost read performance. Use PostgreSQL, MySQL, and SQL Server with examples."
  keywords:
    - database-views
    - materialized-views
    - postgresql
    - mysql
    - sql-server
    - performance
    - sql
---
## Overview

Database views are virtual tables defined by a query. They simplify complex joins, enforce access control by exposing only selected columns, and centralize business logic in the schema. Materialized views go further by physically storing the query result, trading disk space and eventual staleness for dramatically faster reads. This recipe covers creating, refreshing, and indexing both types across PostgreSQL, MySQL, and SQL Server.

## When to Use

Use this resource when:
- You run the same complex aggregation query repeatedly and it is slow
- You want to restrict data access without duplicating permission logic in application code
- You need to precompute expensive joins or aggregations for reporting dashboards
- You want to abstract schema changes from downstream consumers

## Solution

### Python

```python
import psycopg2

conn = psycopg2.connect("dbname=app user=app password=secret")
cur = conn.cursor()

# Create a standard view
cur.execute("""
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;
""")

# Create a materialized view
cur.execute("""
CREATE MATERIALIZED VIEW monthly_revenue_mat AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;
""")

# Index the materialized view for fast lookups
cur.execute("""
CREATE UNIQUE INDEX idx_monthly_revenue_mat_month
ON monthly_revenue_mat (month);
""")

# Refresh the materialized view (blocking)
cur.execute("REFRESH MATERIALIZED VIEW monthly_revenue_mat;")

# Concurrent refresh (requires unique index)
cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;")

conn.commit()
```

### JavaScript

```javascript
// Using Knex.js / raw SQL with PostgreSQL
const knex = require('knex')({
  client: 'pg',
  connection: { host: 'localhost', database: 'app', user: 'app', password: 'secret' }
});

async function setupViews() {
  await knex.raw(`
    CREATE OR REPLACE VIEW active_users AS
    SELECT id, email, created_at
    FROM users
    WHERE deleted_at IS NULL;
  `);

  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS daily_signups AS
    SELECT DATE(created_at) AS day, COUNT(*) AS signups
    FROM users
    GROUP BY DATE(created_at);
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_signups_day
    ON daily_signups (day);
  `);
}

async function refreshMaterializedView() {
  await knex.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_signups;');
}
```

### Java

```java
// Using Spring Data JPA with a native query for a view entity
import jakarta.persistence.*;

@Entity
@Table(name = "monthly_revenue")
@Immutable  // Critical: mark view-backed entities as immutable
public class MonthlyRevenue {
    @Id
    private java.sql.Date month;

    @Column(name = "total")
    private BigDecimal total;

    // Getters...
}

// Repository
public interface MonthlyRevenueRepository extends JpaRepository<MonthlyRevenue, java.sql.Date> {
    List<MonthlyRevenue> findByMonthAfter(LocalDate date);
}

// Refresh materialized view via JdbcTemplate
@Autowired
private JdbcTemplate jdbcTemplate;

public void refreshRevenueView() {
    jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue");
}
```

## Explanation

A **view** is a stored query. Every time you query the view, the underlying SQL runs. This means data is always fresh but performance depends on the complexity of the query and the indexes on the base tables.

A **materialized view** stores the query result on disk. Reads are as fast as querying a regular table, but the data is only as fresh as the last refresh. They are ideal for:
- Expensive aggregations that run in dashboards
- Joining large tables where indexes cannot help enough
- Data warehousing and ETL staging areas

**Trade-offs:**
- Views: always fresh, no storage overhead, but can be slow for complex queries
- Materialized views: fast reads, consume disk space, and require explicit refresh

## Variants

| Database | View Support | Materialized View | Notes |
|----------|--------------|-------------------|-------|
| PostgreSQL | Full | Full | `REFRESH MATERIALIZED VIEW CONCURRENTLY` for zero-downtime refresh |
| MySQL | Full | Partial (via Flexviews or manual tables) | No native MV; simulate with tables + scheduled rebuilds |
| SQL Server | Full | Indexed Views | Create with `SCHEMABINDING` and `CLUSTERED INDEX` |
| Oracle | Full | Full | `ON COMMIT` or `ON DEMAND` refresh options |
| SQLite | Full | None | Use triggers to simulate materialized tables |

## Best Practices

1. Always create a unique index on materialized views before using `CONCURRENTLY` refresh
2. Use `CREATE OR REPLACE VIEW` for non-breaking changes; drop and recreate only when necessary
3. Schedule refreshes with cron, pg_cron, or your job scheduler; refresh after ETL, not during peak read times
4. Use views to expose only needed columns for least-privilege access control
5. Monitor disk usage; materialized views can grow large with wide rows or high cardinality

## Common Mistakes

1. **Forgetting to refresh** — stale materialized views silently return outdated data to users
2. **No unique index** — `REFRESH CONCURRENTLY` fails without one, locking the view during refresh
3. **Writable views without rules/triggers** — not all databases support `INSERT` into views; application code must handle this
4. **Complex views with no underlying indexes** — a view does not create indexes; ensure base tables are indexed
5. **Using views for real-time transactional queries** — views add query overhead; use them for reporting, not OLTP hot paths

## Frequently Asked Questions

### Can I update data through a view?

Sometimes. Simple single-table views are often updatable. Multi-table joins, aggregations, or views with `DISTINCT` are not. PostgreSQL supports `INSTEAD OF` triggers to make complex views updatable.

### How often should I refresh a materialized view?

Refresh after the underlying data changes, or on a schedule that matches your tolerance for staleness. A revenue dashboard might refresh hourly; a user search index might refresh every 5 minutes. Use `CONCURRENTLY` to avoid read locks.

### What is the difference between a view and a CTE?

A CTE (`WITH` clause) exists only for the duration of a single query. A view is a persistent schema object that any query can reference. Use CTEs for one-off query organization; use views for reusable abstractions.
