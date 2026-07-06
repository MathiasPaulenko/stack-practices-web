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
  - databases
  - sql
  - postgresql
  - mysql
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

Database views are virtual tables defined by a query. They simplify complex joins, enforce access control by exposing only selected columns, and centralize business logic in the schema. Materialized views go further by physically storing the query result, trading disk space and eventual staleness for dramatically faster reads. The following demonstrates how to creating, refreshing, and indexing both types across PostgreSQL, MySQL, and SQL Server.

## When to Use

Use this resource when:
- You run the same complex [aggregation query](/recipes/databases/sql-joins) repeatedly and it is slow
- You want to restrict data access without duplicating permission logic in application code
- You need to precompute expensive joins or aggregations for [reporting dashboards](/recipes/databases/postgres-query-optimization)
- You want to abstract schema changes from downstream consumers. See [Input Validation](/recipes/api/input-validation) for schema safety.

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

## What Works

1. Always create a unique index on materialized views before using `CONCURRENTLY` refresh
2. Use `CREATE OR REPLACE VIEW` for non-breaking changes; drop and recreate only when necessary
3. Schedule refreshes with cron, pg_cron, or your job scheduler; refresh after ETL, not during peak read times. See [Batch Processing](/recipes/data/batch-processing-patterns) for job scheduling.
4. Use views to expose only needed columns for least-privilege access control
5. Monitor disk usage; materialized views can grow large with wide rows or high cardinality

## Common Mistakes

1. **Forgetting to refresh** — stale materialized views silently return outdated data to users
2. **No unique index** — `REFRESH CONCURRENTLY` fails without one, locking the view during refresh
3. **Writable views without rules/triggers** — not all databases support `INSERT` into views; application code must handle this
4. **Complex views with no underlying indexes** — a view does not create indexes; ensure base tables are indexed
5. **Using views for real-time transactional queries** — views add query overhead; use them for reporting, not OLTP hot paths. See [Database Transactions](/recipes/databases/database-transactions) for transactional patterns.

## Frequently Asked Questions

### Can I update data through a view?

Sometimes. Simple single-table views are often updatable. Multi-table joins, aggregations, or views with `DISTINCT` are not. PostgreSQL supports `INSTEAD OF` triggers to make complex views updatable.

### How often should I refresh a materialized view?

Refresh after the underlying data changes, or on a schedule that matches your tolerance for staleness. A revenue dashboard might refresh hourly; a user search index might refresh every 5 minutes. Use `CONCURRENTLY` to avoid read locks.

### What is the difference between a view and a CTE?

A CTE (`WITH` clause) exists only for the duration of a single query. A view is a persistent schema object that any query can reference. Use CTEs for one-off query organization; use views for reusable abstractions.

### SQL Server Indexed Views

SQL Server supports indexed views (similar to materialized views) with `SCHEMABINDING`:

```sql
-- Create view with SCHEMABINDING (required for indexed views)
CREATE VIEW dbo.OrderTotals
WITH SCHEMABINDING
AS
SELECT
    o.customer_id,
    COUNT_BIG(*) AS order_count,
    SUM(o.total) AS total_spent
FROM dbo.orders o
WHERE o.status = 'completed'
GROUP BY o.customer_id;
GO

-- Create clustered index (materializes the view)
CREATE UNIQUE CLUSTERED INDEX IX_OrderTotals_Customer
ON dbo.OrderTotals (customer_id);
GO

-- Query the indexed view (uses the materialized data)
SELECT * FROM dbo.OrderTotals WITH (NOEXPAND)
WHERE total_spent > 1000;
```

### Oracle Materialized Views with Refresh Options

```sql
-- Fast refresh (incremental, requires materialized view logs)
CREATE MATERIALIZED VIEW mv_monthly_revenue
REFRESH FAST ON COMMIT
AS
SELECT
    TRUNC(created_at, 'MM') AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY TRUNC(created_at, 'MM');

-- Create materialized view log for fast refresh
CREATE MATERIALIZED VIEW LOG ON orders
WITH PRIMARY KEY, ROWID (status, amount, created_at)
INCLUDING NEW VALUES;

-- On-demand complete refresh
EXEC DBMS_MVIEW.REFRESH('mv_monthly_revenue', 'C');

-- On-demand fast refresh
EXEC DBMS_MVIEW.REFRESH('mv_monthly_revenue', 'F');
```

### Trigger-Based Refresh for Databases Without Materialized Views

```sql
-- MySQL: simulate materialized views with triggers
DELIMITER //

CREATE TABLE mv_daily_signups (
    day DATE PRIMARY KEY,
    signups INT NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO mv_daily_signups (day, signups)
    VALUES (DATE(NEW.created_at), 1)
    ON DUPLICATE KEY UPDATE signups = signups + 1;
END //

CREATE TRIGGER trg_user_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    UPDATE mv_daily_signups
    SET signups = signups - 1
    WHERE day = DATE(OLD.created_at);
END //

DELIMITER ;
```

### Scheduling Refreshes with pg_cron

```sql
-- Install pg_cron extension (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily refresh at 2 AM
SELECT cron.schedule(
    'refresh_monthly_revenue',
    '0 2 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat'
);

-- Schedule hourly refresh for time-sensitive views
SELECT cron.schedule(
    'refresh_hourly_signups',
    '0 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY daily_signups'
);

-- List scheduled jobs
SELECT jobid, schedule, command, active FROM cron.job;

-- Unschedule a job
SELECT cron.unschedule('refresh_monthly_revenue');
```

### Updatable Views with INSTEAD OF Triggers

```sql
-- Create a view that joins users and profiles
CREATE OR REPLACE VIEW user_profiles AS
SELECT
    u.id,
    u.email,
    u.role,
    p.full_name,
    p.bio,
    p.avatar_url
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id;

-- Make the view updatable with INSTEAD OF trigger
CREATE OR REPLACE FUNCTION upsert_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update users table
    UPDATE users SET email = NEW.email, role = NEW.role
    WHERE id = NEW.id;

    -- Upsert profile
    INSERT INTO profiles (user_id, full_name, bio, avatar_url)
    VALUES (NEW.id, NEW.full_name, NEW.bio, NEW.avatar_url)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upsert_user_profile
INSTEAD OF INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION upsert_user_profile();

-- Now you can INSERT/UPDATE through the view
INSERT INTO user_profiles (id, email, role, full_name, bio)
VALUES (1, 'alice@example.com', 'admin', 'Alice Smith', 'Software engineer');
```

### Using Views for Row-Level Security

```sql
-- Create a view that filters by current user
CREATE OR REPLACE VIEW my_orders AS
SELECT * FROM orders
WHERE customer_id = current_setting('app.current_user_id')::int;

-- Grant access to the view, not the base table
GRANT SELECT ON my_orders TO app_user;
REVOKE SELECT ON orders FROM app_user;

-- Set the current user context
SET app.current_user_id = '42';
SELECT * FROM my_orders; -- Only sees orders for customer 42
```

### Monitoring Materialized View Staleness

```sql
-- PostgreSQL: track last refresh time
CREATE TABLE mv_refresh_log (
    view_name TEXT PRIMARY KEY,
    last_refresh TIMESTAMP DEFAULT NOW(),
    duration_ms INTEGER,
    rows_refreshed INTEGER
);

-- Automated refresh with logging
CREATE OR REPLACE FUNCTION refresh_mv_with_logging(view_name TEXT)
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMP;
    row_count INTEGER;
BEGIN
    start_time := clock_timestamp();

    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);

    EXECUTE format('SELECT COUNT(*) FROM %I', view_name) INTO row_count;

    INSERT INTO mv_refresh_log (view_name, last_refresh, duration_ms, rows_refreshed)
    VALUES (view_name, NOW(), EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000, row_count)
    ON CONFLICT (view_name) DO UPDATE
    SET last_refresh = EXCLUDED.last_refresh,
        duration_ms = EXCLUDED.duration_ms,
        rows_refreshed = EXCLUDED.rows_refreshed;
END;
$$ LANGUAGE plpgsql;

-- Check staleness
SELECT view_name, last_refresh,
       EXTRACT(EPOCH FROM (NOW() - last_refresh)) / 60 AS minutes_since_refresh
FROM mv_refresh_log
ORDER BY minutes_since_refresh DESC;
```

## Additional Best Practices

6. **Use `WITH NO DATA` for initial materialized view creation.** This avoids blocking while populating large views:

```sql
CREATE MATERIALIZED VIEW large_aggregation
WITH NO DATA AS
SELECT ... FROM very_large_table GROUP BY ...;

-- Populate later
REFRESH MATERIALIZED VIEW large_aggregation;
```

7. **Create indexes on materialized views.** A materialized view is a physical table — index it like one:

```sql
CREATE MATERIALIZED VIEW customer_stats AS
SELECT customer_id, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders GROUP BY customer_id;

CREATE INDEX idx_customer_stats_revenue ON customer_stats (revenue DESC);
CREATE INDEX idx_customer_stats_orders ON customer_stats (orders DESC);
```

8. **Use `CREATE OR REPLACE VIEW` for non-breaking changes.** Adding a column to a view is safe with `OR REPLACE`:

```sql
CREATE OR REPLACE VIEW active_users AS
SELECT id, email, role, created_at, last_login  -- Added last_login
FROM users
WHERE deleted_at IS NULL;
```

9. **Monitor materialized view size.** Large views consume disk and slow down refreshes:

```sql
SELECT relname AS view_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
WHERE relname IN ('monthly_revenue_mat', 'daily_signups', 'customer_stats')
ORDER BY pg_total_relation_size(relid) DESC;
```

10. **Use `pg_stat_user_tables` to track view usage.** Identify which views are actually queried:

```sql
SELECT relname AS view_name,
       seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE relname LIKE 'mv_%' OR relname LIKE '%_mat';
```

## Additional Common Mistakes

6. **Refreshing materialized views during peak traffic.** Even `CONCURRENTLY` adds overhead. Schedule refreshes during low-traffic windows or use read replicas for refresh operations.

7. **Not creating a unique index before `CONCURRENTLY`.** The refresh will fail with: `ERROR: cannot refresh materialized view concurrently without a unique index`.

8. **Using materialized views for data that changes too frequently.** If the underlying data changes every second, the view is always stale. Use regular views or caching instead.

9. **Forgetting to drop materialized views before dropping base tables.** The view depends on the base table. Drop the view first:

```sql
DROP MATERIALIZED VIEW IF EXISTS monthly_revenue_mat;
DROP TABLE IF EXISTS orders;
```

10. **Not testing view performance with production data volume.** A view that performs well with 1,000 rows may be unusable with 10M rows. Test with realistic data.

## Additional FAQ

### Can I create a materialized view on top of another materialized view?

Yes, but be careful about refresh order. Refresh the base view first, then the dependent view. In PostgreSQL, you can automate this with a function:

```sql
CREATE FUNCTION refresh_all_views() RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY base_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY dependent_mv;
END;
$$ LANGUAGE plpgsql;
```

### How do I handle materialized views in migrations?

Treat materialized views like any other schema object. Create them in migration files, and include refresh logic:

```python
def upgrade():
    op.execute("""
        CREATE MATERIALIZED VIEW monthly_revenue_mat AS
        SELECT date_trunc('month', created_at) AS month,
               SUM(amount) AS total
        FROM orders WHERE status = 'completed'
        GROUP BY 1;
    """)
    op.execute("""
        CREATE UNIQUE INDEX idx_monthly_revenue_mat_month
        ON monthly_revenue_mat (month);
    """)

def downgrade():
    op.execute("DROP MATERIALIZED VIEW IF EXISTS monthly_revenue_mat")
```

### What is the difference between `REFRESH` and `REFRESH CONCURRENTLY`?

`REFRESH MATERIALIZED VIEW` locks the view and blocks all reads until the refresh completes. `REFRESH MATERIALIZED VIEW CONCURRENTLY` allows reads during refresh by using a diff-based approach, but requires a unique index and takes longer.

## Performance Tips

1. **Use `CONCURRENTLY` for all production refreshes.** This prevents read blocking:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;
```

2. **Partition large materialized views.** If your view aggregates millions of rows, consider partitioning the underlying table by date range:

```sql
CREATE TABLE orders (
    id SERIAL,
    created_at TIMESTAMP NOT NULL,
    amount DECIMAL(10,2),
    status VARCHAR(20)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

3. **Use `ANALYZE` after refresh.** Update planner statistics so queries against the materialized view use optimal plans:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;
ANALYZE monthly_revenue_mat;
```

4. **Consider `pg_ivm` for incremental view maintenance.** The `pg_ivm` extension provides immediate view maintenance (updates on every base table change):

```sql
CREATE EXTENSION pg_ivm;
SELECT create_immv('monthly_revenue_ivm',
    'SELECT date_trunc(''month'', created_at) AS month, SUM(amount) AS total
     FROM orders WHERE status = ''completed'' GROUP BY 1');
```

5. **Use `EXPLAIN` on view queries.** Views are macro expansions — the planner sees the full query. Check that indexes on base tables are being used:

```sql
EXPLAIN ANALYZE SELECT * FROM monthly_revenue WHERE total > 10000;
```
