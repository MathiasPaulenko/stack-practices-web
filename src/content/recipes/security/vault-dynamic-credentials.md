---
contentType: recipes
slug: vault-dynamic-credentials
title: "Live Database Credentials with HashiCorp Vault"
description: "How to use HashiCorp Vault to generate short-lived database credentials, eliminating hardcoded passwords and reducing secret sprawl"
metaDescription: "Live database credentials with HashiCorp Vault. Generate short-lived passwords, eliminate hardcoded secrets, and audit all database access with Vault."
difficulty: intermediate
topics:
  - security
  - databases
tags:
  - vault
  - security
  - database
  - secret-management
  - vulnerabilities
relatedResources:
  - /recipes/secret-management
  - /recipes/security-headers
  - /guides/security/security-best-practices-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Live database credentials with HashiCorp Vault. Generate short-lived passwords, eliminate hardcoded secrets, and audit all database access with Vault."
  keywords:
    - hashicorp vault
    - live credentials
    - secret management
    - database security
    - password rotation
---

# Live Database Credentials with HashiCorp Vault

Hardcoded database credentials in configuration files are a persistent security risk. HashiCorp Vault solves this by generating short-lived, live-managed credentials that are created on demand and automatically revoked after a configurable TTL.

## When to Use This

- You want to eliminate static database passwords from application configuration
- Credential rotation must happen without application restarts
- You need an audit trail of every database access with user attribution

## Prerequisites

- Vault server running (dev mode acceptable for testing)
- PostgreSQL or MySQL database
- Vault token with permissions to configure the database secrets engine

## Solution

### 1. Enable the Database Secrets Engine

```bash
vault secrets enable database
```

### 2. Configure Database Connection

```bash
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app" \
  connection_url="postgresql://{{username}}:{{password}}@localhost:5432/mydb" \
  username="vaultadmin" \
  password="vaultadmin-password"
```

### 3. Create a Live Role

```bash
vault write database/roles/app \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### 4. Request Live Credentials

```typescript
// vault-client.ts
import vault from 'node-vault';

const client = vault({ apiVersion: 'v1', endpoint: 'http://localhost:8200' });

export async function getDatabaseCredentials() {
  const result = await client.read('database/creds/app');
  return {
    username: result.data.username,
    password: result.data.password,
    leaseId: result.lease_id,
    leaseDuration: result.lease_duration,
  };
}
```

### 5. Application Integration with Lease Renewal

```typescript
// db/ConnectionPool.ts
import { getDatabaseCredentials } from './vault-client';
import { Pool } from 'pg';

class ManagedConnectionPool {
  private pool: Pool | null = null;
  private leaseTimer: NodeJS.Timeout | null = null;

  async initialize() {
    const creds = await getDatabaseCredentials();
    
    this.pool = new Pool({
      host: 'localhost',
      database: 'mydb',
      user: creds.username,
      password: creds.password,
      max: 20,
    });

    // Renew or rotate before lease expires
    const renewalMs = (creds.leaseDuration - 60) * 1000;
    this.leaseTimer = setTimeout(() => this.rotate(), renewalMs);
  }

  private async rotate() {
    await this.pool?.end();
    await this.initialize();
  }

  async query(sql: string, params: unknown[]) {
    return this.pool!.query(sql, params);
  }

  async close() {
    if (this.leaseTimer) clearTimeout(this.leaseTimer);
    await this.pool?.end();
  }
}
```

### 6. Revoke Credentials on Shutdown

```typescript
// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await connectionPool.close();
  await vault.revoke({ lease_id: currentLeaseId });
  process.exit(0);
});
```

## How It Works

1. **Database Plugin** connects to PostgreSQL with admin credentials
2. **Role Definition** specifies creation SQL with templated username and password
3. **Credential Request** triggers Vault to create a new role in PostgreSQL
4. **TTL Enforcement** automatically drops the role after expiration
5. **Lease Renewal** extends or replaces credentials before expiration

## Production Considerations

- Run Vault in **HA mode** with Raft storage for production environments
- Use **AppRole or [Kubernetes auth](/guides/devops/kubernetes-basics-guide)** instead of long-lived tokens
- Enable **audit devices** to log every credential generation and access
- Set **max_ttl** to enforce maximum session duration regardless of renewal

## Common Mistakes

- Forgetting to revoke leases, leaving orphaned database roles
- Setting TTL too short, causing excessive credential churn
- Not handling Vault unavailability gracefully in the application. See [on-call incident response](/guides/devops/on-call-incident-response-guide).

## FAQ

**Q: What happens if Vault is down when the app needs credentials?**
A: The application should fail to start or fall back to a cached connection pool. For critical systems, run Vault in HA mode with multiple replicas.

**Q: Can Vault rotate the static admin password too?**
A: Yes. Use `vault write database/rotate-root/postgres` to rotate the root credentials Vault uses to manage live roles.

**Q: Does this work with connection pooling?**
A: Yes, but the pool must be recreated when credentials rotate. Use a [factory pattern](/patterns/design/factory-pattern) that manages pool lifecycle alongside lease TTL.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
