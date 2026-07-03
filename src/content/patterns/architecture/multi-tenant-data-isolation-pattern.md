---
contentType: patterns
slug: multi-tenant-data-isolation-pattern
title: "Multi-Tenant Data Isolation Pattern"
description: "Isolate tenant data in shared infrastructure using row-level security, schema-per-tenant, or database-per-tenant strategies. A pattern for SaaS applications."
metaDescription: "Learn the Multi-Tenant Data Isolation Pattern in Python, Java, and JavaScript. Compare row-level, schema-per-tenant, and database-per-tenant strategies."
difficulty: advanced
topics:
  - architecture
  - databases
  - security
tags:
  - multi-tenant
  - data-isolation
  - pattern
  - design-pattern
  - saas
  - row-level-security
  - tenant
  - python
  - javascript
  - java
relatedResources:
  - /patterns/authentication/federated-identity-pattern
  - /patterns/authentication/voucher-pattern
  - /patterns/design/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Learn the Multi-Tenant Data Isolation Pattern in Python, Java, and JavaScript. Compare row-level, schema-per-tenant, and database-per-tenant strategies."
  keywords:
    - multi-tenant data isolation
    - design pattern
    - saas pattern
    - row level security
    - tenant isolation
    - python multi-tenant
    - java multi-tenant
    - javascript multi-tenant
---

# Multi-Tenant Data Isolation Pattern

## Overview

The [Multi-Tenant Data Isolation](/patterns/architecture/multi-tenant-data-isolation-pattern) Pattern ensures each tenant in a SaaS application can only access their own data. Three primary strategies exist: **database-per-tenant** (strongest isolation), **schema-per-tenant** (good isolation, shared database), and **row-level security** (shared schema, tenant column + RLS). Each strategy trades isolation strength against operational cost and complexity.

## When to Use

Use the Multi-Tenant Data Isolation Pattern when:
- You are building a SaaS application serving multiple organizations
- Tenants must never see each other's data
- You need to balance isolation, cost, and operational complexity
- Compliance requirements (GDPR, HIPAA, SOC2) mandate data isolation
- You need per-tenant backup, migration, or deletion capabilities

## Solution

### Strategy 1: Row-Level Security (Shared Schema)

```python
from sqlalchemy import create_engine, Column, String, Integer, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from contextlib import contextmanager

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(String)

engine = create_engine("postgresql://user:pass@localhost/saas_db")

# Enable RLS at database level
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE documents ENABLE ROW LEVEL SECURITY"))
    conn.execute(text("""
        CREATE POLICY tenant_isolation ON documents
        USING (tenant_id = current_setting('app.tenant_id')::int)
    """))
    conn.commit()

@contextmanager
def tenant_session(tenant_id: int):
    session = Session(engine)
    try:
        session.execute(text(f"SET app.tenant_id = {tenant_id}"))
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Usage — tenant 1 can only see their documents
with tenant_session(tenant_id=1) as session:
    docs = session.query(Document).all()  # RLS filters automatically
    print(f"Tenant 1 has {len(docs)} documents")

# Tenant 2 gets a different set
with tenant_session(tenant_id=2) as session:
    docs = session.query(Document).all()
    print(f"Tenant 2 has {len(docs)} documents")
```

### Strategy 2: Schema-Per-Tenant

```python
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.orm import declarative_base, sessionmaker
import schema_manager

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(String)

engine = create_engine("postgresql://user:pass@localhost/saas_db")

def provision_tenant(tenant_name: str):
    schema = f"tenant_{tenant_name.lower().replace('-', '_')}"
    with engine.connect() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
        conn.execute(text(f"SET search_path TO {schema}"))
        Base.metadata.create_all(engine)
        conn.commit()

def get_tenant_engine(tenant_name: str):
    schema = f"tenant_{tenant_name.lower().replace('-', '_')}"
    return create_engine(
        f"postgresql://user:pass@localhost/saas_db",
        connect_args={"options": f"-csearch_path={schema}"},
    )

# Usage — each tenant gets isolated schema
provision_tenant("acme")
provision_tenant("globex")

acme_engine = get_tenant_engine("acme")
AcmeSession = sessionmaker(bind=acme_engine)
session = AcmeSession()
docs = session.query(Document).all()
```

### Strategy 3: Database-Per-Tenant

```javascript
const { Pool } = require("pg");

const tenantPools = new Map();

function getTenantPool(tenantId) {
    if (!tenantPools.has(tenantId)) {
        const pool = new Pool({
            host: "localhost",
            port: 5432,
            user: "saas_app",
            password: process.env.DB_PASSWORD,
            database: `tenant_${tenantId}`,
            max: 10,
        });
        tenantPools.set(tenantId, pool);
    }
    return tenantPools.get(tenantId);
}

async function getDocuments(tenantId) {
    const pool = getTenantPool(tenantId);
    const result = await pool.query(
        "SELECT id, title, content FROM documents ORDER BY id"
    );
    return result.rows;
}

async function createDocument(tenantId, title, content) {
    const pool = getTenantPool(tenantId);
    const result = await pool.query(
        "INSERT INTO documents (title, content) VALUES ($1, $2) RETURNING id",
        [title, content]
    );
    return result.rows[0];
}

// Usage
async function main() {
    const acmeDocs = await getDocuments("acme");
    console.log("Acme docs:", acmeDocs.length);

    const doc = await createDocument("globex", "Q3 Report", "Confidential");
    console.log("Created doc:", doc.id);
}

main();
```

### Tenant Resolution Middleware (Java)

```java
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class TenantInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
            HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader("X-Tenant-ID");
        if (tenantId == null || tenantId.isBlank()) {
            response.setStatus(401);
            return false;
        }
        TenantContext.setTenantId(tenantId);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
            HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }
}

// ThreadLocal tenant context
public class TenantContext {
    private static final ThreadLocal<String> CONTEXT = new ThreadLocal<>();

    public static void setTenantId(String tenantId) {
        CONTEXT.set(tenantId);
    }

    public static String getTenantId() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}

// Repository with automatic tenant filter
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public class DocumentRepository {

    private final JdbcTemplate jdbc;

    public DocumentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findAll() {
        String tenant = TenantContext.getTenantId();
        return jdbc.queryForList(
            "SELECT id, title, content FROM tenant_" + tenant + ".documents"
        );
    }
}
```

## Explanation

Three strategies trade isolation against cost:

- **Row-Level Security (RLS)**: All tenants share one schema. A `tenant_id` column on every table. PostgreSQL RLS policies automatically filter queries. Cheapest, most scalable, but weakest isolation — a bug in RLS policy leaks data.
- **Schema-Per-Tenant**: Each tenant gets a dedicated schema in a shared database. Good isolation at the schema level. Per-tenant migrations are needed. Moderate cost.
- **Database-Per-Tenant**: Each tenant gets a dedicated database. Strongest isolation. Per-tenant backup, migration, and deletion are trivial. Highest cost and operational overhead.

Key concepts:

- **Tenant Context**: A thread-local or request-scoped variable holding the current tenant ID. Set by middleware from JWT, API key, or header.
- **Tenant Resolution**: Extract tenant ID from the request (JWT claim, subdomain, header). Validate the tenant exists and the user belongs to it.
- **Cross-Tenant Queries**: Admin operations that span tenants. Must bypass RLS or query all schemas/databases explicitly.
- **Per-Tenant Migrations**: Schema-per-tenant and database-per-tenant require running migrations for each tenant. Automate with a migration runner.

## Variants

| Strategy | Isolation | Cost | Migration | Backup | Use When |
|----------|-----------|------|-----------|--------|----------|
| **Row-Level Security** | Weak (policy bug = leak) | Low | Single | Shared | Many small tenants, cost-sensitive |
| **Schema-Per-Tenant** | Medium (schema boundary) | Medium | Per-tenant | Per-schema | Medium tenants, moderate isolation |
| **Database-Per-Tenant** | Strong (full DB boundary) | High | Per-tenant | Per-DB | Large tenants, compliance, enterprise |

## What Works

- **Use RLS for cost efficiency** — thousands of tenants in one database, minimal overhead
- **Use schema-per-tenant for mid-size SaaS** — good balance of isolation and cost
- **Use database-per-tenant for enterprise** — strongest isolation, per-tenant SLA
- **Always set tenant context in middleware** — never rely on application code to filter
- **Validate tenant membership** — check that the user belongs to the tenant on every request
- **Index the tenant_id column** — RLS filters by tenant_id on every query
- **Automate per-tenant migrations** — write a migration runner that loops over all tenants
- **Provide tenant provisioning/deletion APIs** — automate onboarding and offboarding
- **Monitor cross-tenant queries** — admin queries that bypass isolation should be audited

## Common Mistakes

- Forgetting to set tenant context in a background job — the job runs without isolation
- Relying on application-level filtering instead of RLS — a missed `WHERE tenant_id = ?` leaks data
- Not indexing tenant_id — every query does a full table scan filtered by RLS
- Running a single migration instead of per-tenant migrations — some tenants have stale schemas
- Not testing isolation — write integration tests that verify tenant A cannot read tenant B's data
- Sharing connection pools across tenants in database-per-tenant — connection leaks to wrong DB
- Not cleaning up tenant data on offboarding — deleted tenants' data persists in shared tables
- Using tenant_id in URLs without validation — tenant ID spoofing allows cross-tenant access

## Frequently Asked Questions

**Q: Which strategy should I choose?**
A: Start with row-level security if you have many small tenants and cost is a concern. Use schema-per-tenant for mid-size SaaS with moderate isolation needs. Use database-per-tenant for enterprise customers with strict compliance requirements or per-tenant SLAs.

**Q: How do I handle per-tenant migrations?**
A: Write a migration runner that iterates over all tenants. For schema-per-tenant, run the migration in each schema. For database-per-tenant, connect to each database and run the migration. Track migration versions per tenant to handle failures gracefully.

**Q: Can I mix strategies?**
A: Yes. Start with RLS for small tenants on a shared database. Promote large tenants to their own database when they outgrow the shared instance. Route requests based on tenant configuration. This is called the hybrid or tiered approach.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
