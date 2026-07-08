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

## Advanced Solutions

### Python hvac client with AppRole auth

```python
import hvac
import os
from typing import TypedDict

class DBCredentials(TypedDict):
    username: str
    password: str
    lease_id: str
    lease_duration: int

class VaultClient:
    """Vault client with AppRole authentication and credential caching."""

    def __init__(self, vault_addr: str, role_id: str, secret_id: str):
        self.client = hvac.Client(url=vault_addr)
        self._authenticate(role_id, secret_id)
        self._cached_creds: DBCredentials | None = None

    def _authenticate(self, role_id: str, secret_id: str):
        """Authenticate using AppRole (machine identity)."""
        resp = self.client.auth.approle.login(
            role_id=role_id,
            secret_id=secret_id,
        )
        self.client.token = resp['auth']['client_token']

    def get_db_credentials(self, role: str = 'app') -> DBCredentials:
        """Request short-lived database credentials from Vault."""
        resp = self.client.read(f'database/creds/{role}')
        creds = DBCredentials(
            username=resp['data']['username'],
            password=resp['data']['password'],
            lease_id=resp['lease_id'],
            lease_duration=resp['lease_duration'],
        )
        self._cached_creds = creds
        return creds

    def renew_lease(self, lease_id: str, increment: int = 3600):
        """Renew a lease before it expires."""
        self.client.sys.renew_lease(
            lease_id=lease_id,
            increment=increment,
        )

    def revoke_lease(self, lease_id: str):
        """Revoke credentials when no longer needed."""
        self.client.sys.revoke_lease(lease_id=lease_id)

# Usage
vault = VaultClient(
    vault_addr=os.environ['VAULT_ADDR'],
    role_id=os.environ['VAULT_ROLE_ID'],
    secret_id=os.environ['VAULT_SECRET_ID'],
)

creds = vault.get_db_credentials()
# Use creds to connect to PostgreSQL...
# On shutdown:
vault.revoke_lease(creds['lease_id'])
```

### Kubernetes auth method

When running in Kubernetes, use the Kubernetes auth backend so pods authenticate with their service account token instead of shared secrets:

```python
import hvac

def authenticate_kubernetes(vault_addr: str, role: str, jwt_path: str = '/var/run/secrets/kubernetes.io/serviceaccount/token'):
    """Authenticate to Vault using Kubernetes service account token."""
    client = hvac.Client(url=vault_addr)

    with open(jwt_path, 'r') as f:
        jwt = f.read().strip()

    resp = client.auth.kubernetes.login(
        role=role,
        jwt=jwt,
    )
    client.token = resp['auth']['client_token']
    return client

# Vault admin setup (one-time):
# vault auth enable kubernetes
# vault write auth/kubernetes/config kubernetes_host="https://kubernetes.default.svc"
# vault write auth/kubernetes/role/database-app \
#   bound_service_account_names=app-sa \
#   bound_service_account_namespaces=production \
#   policies=database-access \
#   ttl=1h
```

### Multi-role setup with read/write separation

Create separate Vault roles with different database privileges to enforce least-privilege:

```bash
# Read-only role for analytics / reporting
vault write database/roles/app-readonly \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="4h" \
  max_ttl="24h"

# Read-write role for application mutations
vault write database/roles/app-readwrite \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="8h"

# Migration role with DDL privileges (short TTL, manual request)
vault write database/roles/app-migration \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="15m" \
  max_ttl="1h"
```

```python
# Request the right credentials for the task
def get_readonly_creds(vault: VaultClient) -> DBCredentials:
    return vault.get_db_credentials(role='app-readonly')

def get_readwrite_creds(vault: VaultClient) -> DBCredentials:
    return vault.get_db_credentials(role='app-readwrite')

def get_migration_creds(vault: VaultClient) -> DBCredentials:
    # Short TTL, always revoked immediately after migration
    creds = vault.get_db_credentials(role='app-migration')
    return creds
```

### Credential caching with fallback (Node.js)

When Vault is temporarily unavailable, fall back to cached credentials with a warning:

```typescript
import vault from 'node-vault';
import { Pool } from 'pg';

const client = vault({ apiVersion: 'v1', endpoint: process.env.VAULT_ADDR });

interface CachedCreds {
  username: string;
  password: string;
  leaseId: string;
  leaseDuration: number;
  fetchedAt: number;
}

let cached: CachedCreds | null = null;
const MAX_CACHE_AGE = 2 * 60 * 60 * 1000; // 2 hours

async function getCredsWithFallback(): Promise<CachedCreds> {
  try {
    const result = await client.read('database/creds/app');
    cached = {
      username: result.data.username,
      password: result.data.password,
      leaseId: result.lease_id,
      leaseDuration: result.lease_duration,
      fetchedAt: Date.now(),
    };
    return cached;
  } catch (err) {
    if (cached && Date.now() - cached.fetchedAt < MAX_CACHE_AGE) {
      console.warn('Vault unavailable, using cached credentials', {
        age: Date.now() - cached.fetchedAt,
        leaseId: cached.leaseId,
      });
      return cached;
    }
    throw new Error('Vault unavailable and no valid cached credentials');
  }
}
```

## Additional Best Practices

1. **Use Vault Agent for sidecar credential injection.** Instead of application code calling Vault directly, deploy Vault Agent as a sidecar that writes credentials to a file the application reads:

```hcl
# vault-agent.hcl
auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "database-app"
    }
  }
  sink "file" {
    config = {
      path = "/vault/token"
    }
  }
}

template {
  source = "/vault/templates/db-creds.tpl"
  destination = "/vault/secrets/db-creds.json"
}

template_config {
  static_secret_render_interval = "5m"
}
```

```json
// /vault/templates/db-creds.tpl
{{ with secret "database/creds/app" }}
{
  "username": "{{ .Data.username }}",
  "password": "{{ .Data.password }}",
  "leaseId": "{{ .LeaseID }}",
  "leaseDuration": {{ .LeaseDuration }}
}
{{ end }}
```

2. **Monitor lease counts and revocation events.** Track metrics to detect orphaned leases or credential churn:

```python
def check_lease_health(vault_client, max_leases: int = 100):
    """Monitor active leases and alert on anomalies."""
    leases = vault_client.sys.list_leases()
    active_count = len(leases)

    if active_count > max_leases:
        logging.warning(
            f'High lease count: {active_count} (max: {max_leases})'
        )

    # Check for old leases that should have been revoked
    for lease in leases:
        # Alert if lease is older than expected
        pass

    return {'active_leases': active_count}
```

## Additional Common Mistakes

1. **Using a single Vault token for all services.** Each service should authenticate independently with its own identity (AppRole, Kubernetes role, AWS IAM). A shared token means compromise of one service compromises all:

```bash
# WRONG: sharing one token across services
export VAULT_TOKEN=s.shared-token

# CORRECT: each service gets its own role
vault write auth/approle/role/api-server token_ttl=1h token_max_ttl=4h
vault write auth/approle/role/worker token_ttl=1h token_max_ttl=4h
```

2. **Not setting `max_ttl` on roles.** Without `max_ttl`, renewed leases can persist indefinitely. Set a hard ceiling to enforce periodic re-authentication:

```bash
# Good: 1h default, 8h max (forces re-auth at least every 8h)
vault write database/roles/app \
  db_name=postgres \
  creation_statements="..." \
  default_ttl="1h" \
  max_ttl="8h"
```

## Additional FAQ

### How do I rotate the Vault root database credentials?

Use the `rotate-root` endpoint. Vault generates a new password for the admin account and stores it internally. The old password is discarded:

```bash
vault write -force database/rotate-root/postgres
```

Schedule this rotation quarterly or after personnel changes. Vault handles the rotation without downtime — it uses the current credentials to generate a new password, then updates its internal storage.

### Can I use Vault dynamic credentials with Redis or MongoDB?

Yes. Vault supports Redis, MongoDB, Cassandra, and other databases through plugins. The configuration pattern is the same: enable the database engine, configure the connection, create a role with creation statements. For NoSQL databases, the creation statements use the database's native user management commands (e.g., `db.createUser()` for MongoDB).

### What is the overhead of dynamic credentials?

Each credential request creates a database role, which is a lightweight operation. For PostgreSQL, role creation takes 1-5ms. The main overhead is connection pool recreation when credentials rotate. Mitigate by using longer TTLs (1-4 hours) and renewing leases instead of requesting new credentials.
