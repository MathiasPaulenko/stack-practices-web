---
contentType: recipes
slug: multi-tenancy
title: "Multi-Tenancy Architecture"
description: "Design multi-tenant applications with shared or isolated databases, tenant-aware routing, and data isolation strategies."
metaDescription: "Multi-tenancy architecture patterns: shared database, isolated schema, dedicated instance per tenant, routing, and data isolation strategies for SaaS."
difficulty: advanced
topics:
  - architecture
tags:
  - multi-tenancy
  - architecture
  - databases
  - design
  - patterns
relatedResources:
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /docs/engineering-handbook-template
  - /guides/rest-api-design-guide
  - /guides/domain-driven-design-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Multi-tenancy architecture patterns: shared database, isolated schema, dedicated instance per tenant, routing, and data isolation strategies for SaaS."
  keywords:
    - multi-tenancy
    - architecture
    - saas
    - databases
---
## Overview

Multi-tenancy is an architecture where a single software instance serves multiple customers (tenants) while keeping their data and configuration isolated. The trade-off is between operational simplicity (shared everything) and data isolation (separate everything). Choosing the right model affects scalability, security, and compliance.

## When to Use

Use this resource when:
- Building SaaS applications serving multiple organizations
- Meeting compliance requirements (SOC 2, HIPAA) that mandate data segregation. See [API Security Checklist](/guides/security/api-security-checklist-guide) for what works in compliance.
- Optimizing infrastructure costs by sharing compute across tenants
- Scaling from hundreds to thousands of tenants with predictable performance

## Solution

### Shared Database with Tenant ID (PostgreSQL)

```sql
-- Row-Level Security ensures tenant isolation
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: tenants can only see their own data
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### Tenant-Aware Middleware (Node.js)

```javascript
function tenantMiddleware(req, res, next) {
  const tenantId = req.headers['x-tenant-id'] || req.subdomain;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }
  
  // Set tenant context for this request
  req.tenantId = tenantId;
  
  // Apply to database connection
  db.query("SET app.current_tenant = $1", [tenantId]);
  
  next();
}
```

### Schema-Per-Tenant Migration

```python
from sqlalchemy import create_engine, MetaData

def migrate_tenant_schema(tenant_id: str):
    engine = create_engine("postgresql://user:pass@localhost/db")
    with engine.begin() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS tenant_{}".format(tenant_id))
        # Run migrations within tenant schema
        metadata = MetaData(schema="tenant_{}".format(tenant_id))
        metadata.create_all(conn)
```

## Explanation

**Three multi-tenancy models**:

| Model | Isolation | Cost | Complexity |
|-------|-----------|------|------------|
| Shared DB + Tenant ID | Low (RLS needed) | Lowest | Low |
| Schema-per-tenant | Medium | Medium | Medium |
| Database-per-tenant | High | Highest | High |

**Tenant resolution strategies**:
- **Subdomain**: tenant1.app.com, tenant2.app.com
- **Path**: app.com/tenant1/, app.com/tenant2/
- **Header**: X-Tenant-ID in API requests
- **JWT claim**: tenant embedded in auth token

## Variants

| Approach | Best For | Trade-off |
|----------|----------|-----------|
| Shared everything | Early-stage SaaS | Simplest; weakest isolation |
| Shared compute, isolated storage | Mid-market SaaS | Balance of cost and compliance |
| Fully isolated | Enterprise/regulated | Highest cost; strongest isolation |
| Cell-based | Global scale | Shards tenants across regions |

## What Works

- **Never trust tenant ID from user input**: Always resolve from [authenticated context](/recipes/authentication/jwt-authentication)
- **Index tenant_id first**: Every query filters by tenant; make it the leading column
- **Use [connection pooling](/recipes/performance/connection-pooling) carefully**: Schema-per-tenant requires live schema switching
- **Backup per tenant**: Schema-per-tenant makes pg_dump per-schema trivial
- **Resource quotas**: Limit CPU, storage, and [API rate](/recipes/api/api-rate-limiting-redis) per tenant to prevent noisy neighbors

## Common Mistakes

1. **Missing tenant filter**: One forgotten WHERE tenant_id = $1 exposes all customer data
2. **Caching without tenant scoping**: Shared cache keys leak data across tenants
3. **Background jobs without tenant context**: Scheduled tasks must run for each tenant separately
4. **Hard-coded schemas**: Mixing tenant data in application code creates security holes
5. **No tenant-aware logging**: Debugging production issues requires filtering logs by tenant

## Frequently Asked Questions

**Q: Can I migrate from shared DB to schema-per-tenant later?**
A: Yes, but it requires a major migration. Start with tenant_id columns and RLS even if you plan to split later.

**Q: How do I handle tenant-specific customizations?**
A: Use feature flags per tenant, white-label configuration, or metadata-driven UI. Avoid separate code branches.

**Q: Does GDPR affect multi-tenancy design?**
A: Yes. Right to erasure is simpler with schema-per-tenant (drop schema) than with shared tables (delete rows across many tables).

### Database-Per-Tenant with Connection Pool (TypeScript)

```typescript
import { Pool, PoolClient } from 'pg';

interface TenantDatabase {
  pool: Pool;
  schema: string;
}

class TenantConnectionManager {
  private pools: Map<string, TenantDatabase> = new Map();

  async getTenantConnection(tenantId: string): Promise<PoolClient> {
    let tenantDb = this.pools.get(tenantId);

    if (!tenantDb) {
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: 5432,
        database: `tenant_${tenantId}`,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
      });
      tenantDb = { pool, schema: 'public' };
      this.pools.set(tenantId, tenantDb);
    }

    const client = await tenantDb.pool.connect();
    await client.query('SET search_path TO public');
    return client;
  }

  async closeTenant(tenantId: string): Promise<void> {
    const tenantDb = this.pools.get(tenantId);
    if (tenantDb) {
      await tenantDb.pool.end();
      this.pools.delete(tenantId);
    }
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map(db => db.pool.end());
    await Promise.all(promises);
    this.pools.clear();
  }
}

// Usage — each request gets a connection to the tenant's database
async function getOrder(tenantId: string, orderId: string) {
  const manager = new TenantConnectionManager();
  const client = await manager.getTenantConnection(tenantId);
  try {
    const result = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}
```

### Tenant-Aware Caching with Redis (Python)

```python
import redis
import json
from functools import wraps

class TenantCache:
    def __init__(self, redis_url: str = 'redis://localhost:6379'):
        self._redis = redis.from_url(redis_url)

    def _key(self, tenant_id: str, key: str) -> str:
        return f'tenant:{tenant_id}:{key}'

    def get(self, tenant_id: str, key: str):
        raw = self._redis.get(self._key(tenant_id, key))
        if raw:
            return json.loads(raw)
        return None

    def set(self, tenant_id: str, key: str, value, ttl: int = 300):
        self._redis.setex(
            self._key(tenant_id, key),
            ttl,
            json.dumps(value)
        )

    def delete(self, tenant_id: str, key: str):
        self._redis.delete(self._key(tenant_id, key))

    def invalidate_tenant(self, tenant_id: str):
        pattern = f'tenant:{tenant_id}:*'
        keys = self._redis.keys(pattern)
        if keys:
            self._redis.delete(*keys)

# Usage — cache scoped per tenant
cache = TenantCache()

def cached_query(tenant_id: str, cache_key: str, query_fn, ttl: int = 300):
    cached = cache.get(tenant_id, cache_key)
    if cached is not None:
        return cached
    result = query_fn()
    cache.set(tenant_id, cache_key, result, ttl)
    return result
```

### Tenant Onboarding Pipeline (TypeScript)

```typescript
class TenantOnboardingService {
  constructor(
    private db: Database,
    private cache: TenantCache,
    private config: TenantConfigService
  ) {}

  async onboard(tenantId: string, plan: string): Promise<void> {
    // 1. Create database schema or dedicated database
    if (plan === 'enterprise') {
      await this.db.query(`CREATE DATABASE tenant_${tenantId}`);
      await this.db.query(`CREATE USER tenant_${tenantId} WITH PASSWORD $1`, [generatePassword()]);
    } else {
      await this.db.query(`CREATE SCHEMA IF NOT EXISTS tenant_${tenantId}`);
    }

    // 2. Run migrations
    await this.runMigrations(tenantId);

    // 3. Seed default data
    await this.seedDefaults(tenantId);

    // 4. Configure feature flags
    await this.config.setFlags(tenantId, getDefaultFlags(plan));

    // 5. Set resource quotas
    await this.config.setQuotas(tenantId, getQuotas(plan));

    // 6. Warm cache
    await this.cache.set(tenantId, 'status', 'active', 3600);
  }

  async offboard(tenantId: string): Promise<void> {
    // 1. Mark tenant as inactive
    await this.db.query('UPDATE tenants SET status = $1 WHERE id = $2', ['inactive', tenantId]);

    // 2. Export tenant data (GDPR compliance)
    await this.exportTenantData(tenantId);

    // 3. Drop schema or database
    await this.db.query(`DROP SCHEMA IF EXISTS tenant_${tenantId} CASCADE`);

    // 4. Invalidate cache
    await this.cache.invalidate_tenant(tenantId);

    // 5. Remove configuration
    await this.config.removeAll(tenantId);
  }

  private async runMigrations(tenantId: string): Promise<void> {
    const migrations = await this.db.query('SELECT * FROM migrations ORDER BY version');
    for (const migration of migrations.rows) {
      await this.db.query(`SET search_path TO tenant_${tenantId}; ${migration.sql}`);
    }
  }

  private async seedDefaults(tenantId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO tenant_${tenantId}.settings (key, value) VALUES ('timezone', 'UTC'), ('locale', 'en-US')`
    );
  }
}
```

## Additional Best Practices

1. **Use tenant-aware database migrations.** Run migrations per tenant schema, not globally. Track which tenants have which migration versions:

```sql
CREATE TABLE tenant_migrations (
  tenant_id UUID NOT NULL,
  migration_version INT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, migration_version)
);
```

2. **Implement tenant-specific rate limiting.** Prevent noisy neighbors by enforcing per-tenant quotas at the API gateway:

```typescript
class TenantRateLimiter {
  private limits: Map<string, { count: number; resetAt: number }> = new Map();

  check(tenantId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(tenantId);
    if (!entry || now > entry.resetAt) {
      this.limits.set(tenantId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }
}
```

3. **Log with tenant context.** Include tenant_id in every log entry for debugging and audit trails:

```typescript
function tenantLogger(tenantId: string) {
  return {
    info: (msg: string, meta?: object) => console.log(JSON.stringify({ tenantId, level: 'info', msg, ...meta })),
    error: (msg: string, meta?: object) => console.error(JSON.stringify({ tenantId, level: 'error', msg, ...meta })),
  };
}
```

## Additional Common Mistakes

1. **Cross-tenant queries in analytics.** Reporting queries that aggregate across tenants without filtering expose data. Use separate analytics warehouses per tenant or enforce tenant_id filters in every BI query.

2. **Shared sequences and auto-increment.** Using a shared `SERIAL` primary key across tenants in a shared database creates contention and leaks tenant scale information. Use UUIDs instead:

```sql
-- Bad: shared sequence, contention
CREATE TABLE orders (id SERIAL PRIMARY KEY, tenant_id UUID, ...);

-- Good: UUID, no contention, no information leak
CREATE TABLE orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, ...);
```

3. **Ignoring tenant lifecycle in CI/CD.** Deployments that run schema migrations must handle all tenant schemas. A migration that works for one tenant may fail for another with different data volume. Test migrations against the largest tenant first.

## Additional FAQ

### How do I handle tenant-specific feature flags?

Store feature flags in a tenant configuration table and evaluate them at runtime. Avoid compile-time flags or environment variables since different tenants need different feature sets:

```typescript
class FeatureFlagService {
  private flags: Map<string, Set<string>> = new Map();

  async loadFlags(tenantId: string): Promise<void> {
    const result = await this.db.query('SELECT flag_name FROM tenant_flags WHERE tenant_id = $1', [tenantId]);
    this.flags.set(tenantId, new Set(result.rows.map(r => r.flag_name)));
  }

  isEnabled(tenantId: string, flag: string): boolean {
    return this.flags.get(tenantId)?.has(flag) ?? false;
  }
}
```

### Is this solution production-ready?

Yes. Row-Level Security with PostgreSQL is used by production SaaS platforms. The database-per-tenant model with connection pooling is standard for enterprise tenants. The tenant onboarding pipeline mirrors what platforms like Heroku and Render do when provisioning new customer databases. The caching layer with tenant-scoped keys prevents cross-tenant data leakage in Redis.

### What are the performance characteristics?

Shared database with RLS adds a filter check per query — negligible overhead with proper indexes on `tenant_id`. Schema-per-tenant requires `SET search_path` per connection (sub-millisecond). Database-per-tenant uses separate connection pools — each pool consumes memory (10 connections x 1000 tenants = 10,000 connections). Use PgBouncer to multiplex connections. Cache lookups with tenant-scoped keys are O(1) in Redis. Tenant onboarding with schema creation takes 50-200ms; database creation takes 1-5 seconds.

### How do I debug issues with this approach?

Log tenant_id in every request, query, and cache operation. Use PostgreSQL's `current_setting('app.current_tenant')` to verify RLS context in debug sessions. For schema-per-tenant, log `search_path` before each query. For database-per-tenant, log which pool served the request. Test tenant isolation by querying as tenant A and verifying zero rows from tenant B. Use `EXPLAIN ANALYZE` to verify that RLS policies use the tenant_id index.
