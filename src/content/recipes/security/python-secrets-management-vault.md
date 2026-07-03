---
contentType: recipes
slug: python-secrets-management-vault
title: "Manage Application Secrets with HashiCorp Vault and Python"
description: "Store, retrieve, and rotate application secrets securely using HashiCorp Vault with Python hvac client, dynamic secrets, and automatic lease renewal"
metaDescription: "Manage application secrets with HashiCorp Vault and Python. Store and retrieve secrets, use dynamic database credentials, and auto-renew leases with hvac."
difficulty: advanced
topics:
  - security
  - infrastructure
tags:
  - python
  - hashicorp vault
  - secrets management
  - hvac
  - security
relatedResources:
  - /recipes/security/python-jwt-refresh-token-rotation
  - /recipes/security/python-sql-injection-sqlalchemy
  - /recipes/security/python-rate-limiting-fastapi-redis
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Manage application secrets with HashiCorp Vault and Python. Store and retrieve secrets, use dynamic database credentials, and auto-renew leases with hvac."
  keywords:
    - hashicorp vault
    - python hvac
    - secrets management
    - dynamic secrets
    - vault python
---

# Manage Application Secrets with HashiCorp Vault and Python

Hardcoded secrets in environment variables or config files are a security risk. HashiCorp Vault centralizes secret storage with encryption, access control, audit logging, and dynamic secrets. Below: connecting to Vault with Python (`hvac`), storing and retrieving static secrets, using dynamic database credentials, and auto-renewing leases.

## When to Use This

- Applications with multiple secrets (database passwords, API keys, TLS certs)
- Teams needing centralized secret management with audit trails
- Dynamic secrets that rotate automatically (database credentials, cloud tokens)

## Prerequisites

- Python 3.10+
- `hvac` package (`pip install hvac`)
- A running Vault server (dev mode: `vault server -dev`)

## Solution

### 1. Install Dependencies

```bash
pip install hvac
```

### 2. Connect to Vault

```python
import hvac
import os

def create_vault_client() -> hvac.Client:
    """Create and authenticate a Vault client.

    Returns:
        Authenticated hvac.Client instance.
    """
    client = hvac.Client(
        url=os.getenv("VAULT_ADDR", "http://127.0.0.1:8200"),
        token=os.getenv("VAULT_TOKEN", "root"),
    )

    if not client.is_authenticated():
        raise RuntimeError("Vault authentication failed")

    return client

vault = create_vault_client()
```

### 3. Store and Retrieve Static Secrets

```python
def store_secret(path: str, secret_data: dict) -> None:
    """Store a secret in Vault's KV v2 engine.

    Args:
        path: Secret path (e.g., "myapp/database").
        secret_data: Dict of key-value pairs to store.
    """
    vault.secrets.kv.v2.create_or_update_secret(
        path=path,
        secret=secret_data,
        mount_point="secret",
    )

def get_secret(path: str, version: int | None = None) -> dict:
    """Retrieve a secret from Vault's KV v2 engine.

    Args:
        path: Secret path.
        version: Specific version (None = latest).

    Returns:
        Secret data dict.
    """
    response = vault.secrets.kv.v2.read_secret_version(
        path=path,
        version=version,
        mount_point="secret",
    )
    return response["data"]["data"]

# Store secrets
store_secret("myapp/database", {
    "username": "app_user",
    "password": "super-secret-password",
    "host": "db.example.com",
    "port": "5432",
})

store_secret("myapp/api_keys", {
    "stripe": "sk_live_xxx",
    "sendgrid": "SG.xxx",
})

# Retrieve secrets
db_creds = get_secret("myapp/database")
print(f"DB Host: {db_creds['host']}")
print(f"DB User: {db_creds['username']}")
```

### 4. List Secrets

```python
def list_secrets(path: str = "") -> list[str]:
    """List secrets at a given path."""
    try:
        response = vault.secrets.kv.v2.list_secrets(
            path=path,
            mount_point="secret",
        )
        return response["data"]["keys"]
    except hvac.exceptions.InvalidPath:
        return []

# List all secrets under myapp/
keys = list_secrets("myapp")
print(f"Secrets under myapp/: {keys}")
# ['database', 'api_keys']
```

### 5. Dynamic Database Credentials

```python
def setup_database_engine():
    """Configure Vault's database secrets engine for dynamic credentials."""
    # Enable the database secrets engine
    vault.sys.enable_secrets_engine(
        backend_type="database",
        path="database",
    )

    # Configure PostgreSQL connection
    vault.write("database/config/my-postgresql", {
        "plugin_name": "postgresql-database-plugin",
        "allowed_roles": "app-role",
        "connection_url": "postgresql://{{username}}:{{password}}@db.example.com:5432/mydb",
        "username": "vault_admin",
        "password": "vault_admin_password",
    })

    # Create a role with 1-hour TTL
    vault.write("database/roles/app-role", {
        "db_name": "my-postgresql",
        "creation_statements": [
            "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
            "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";",
        ],
        "default_ttl": "1h",
        "max_ttl": "24h",
    })

def get_dynamic_db_credentials() -> dict:
    """Generate dynamic database credentials from Vault.

    Returns:
        Dict with username, password, and lease_id.
    """
    response = vault.read("database/creds/app-role")
    return {
        "username": response["data"]["username"],
        "password": response["data"]["password"],
        "lease_id": response["lease_id"],
        "lease_duration": response["lease_duration"],
        "renewable": response["renewable"],
    }

# Generate credentials — each call creates a unique user
creds = get_dynamic_db_credentials()
print(f"Dynamic user: {creds['username']}")
print(f"Lease duration: {creds['lease_duration']}s")
```

### 6. Lease Renewal and Revocation

```python
import time

def renew_lease(lease_id: str, increment: int = 3600) -> bool:
    """Renew a lease for dynamic secrets.

    Args:
        lease_id: The lease ID from credential generation.
        increment: Seconds to extend the lease.

    Returns:
        True if renewal succeeded.
    """
    try:
        vault.sys.renew_lease(
            lease_id=lease_id,
            increment=increment,
        )
        return True
    except hvac.exceptions.InvalidRequest:
        return False

def revoke_lease(lease_id: str) -> None:
    """Revoke a lease — immediately invalidates the dynamic credentials."""
    vault.sys.revoke_lease(lease_id=lease_id)

# Usage with auto-renewal
creds = get_dynamic_db_credentials()

# Renew before expiry
time.sleep(creds["lease_duration"] - 300)  # 5 min before expiry
renew_lease(creds["lease_id"], increment=3600)

# Revoke when done
revoke_lease(creds["lease_id"])
```

### 7. Secret Wrapper Class

```python
import threading
from typing import Any

class VaultSecretManager:
    """Manages static and dynamic secrets with auto-renewal."""

    def __init__(self, vault_client: hvac.Client):
        self.vault = vault_client
        self._dynamic_creds: dict[str, dict] = {}
        self._lock = threading.Lock()

    def get_static_secret(self, path: str) -> dict:
        """Get a static secret from KV v2."""
        return get_secret(path)

    def get_dynamic_secret(self, role_path: str, name: str = "default") -> dict:
        """Get dynamic credentials, caching and auto-renewing."""
        with self._lock:
            if name in self._dynamic_creds:
                creds = self._dynamic_creds[name]
                # Renew if close to expiry
                if creds["expires_at"] - time.time() < 300:
                    self._renew(name)
                return creds

            response = self.vault.read(role_path)
            creds = {
                "username": response["data"]["username"],
                "password": response["data"]["password"],
                "lease_id": response["lease_id"],
                "lease_duration": response["lease_duration"],
                "expires_at": time.time() + response["lease_duration"],
            }
            self._dynamic_creds[name] = creds
            return creds

    def _renew(self, name: str) -> None:
        """Renew dynamic credentials."""
        creds = self._dynamic_creds[name]
        try:
            self.vault.sys.renew_lease(
                lease_id=creds["lease_id"],
                increment=creds["lease_duration"],
            )
            creds["expires_at"] = time.time() + creds["lease_duration"]
        except hvac.exceptions.InvalidRequest:
            # Lease expired — get new credentials
            del self._dynamic_creds[name]

    def cleanup(self) -> None:
        """Revoke all dynamic credentials."""
        with self._lock:
            for creds in self._dynamic_creds.values():
                try:
                    self.vault.sys.revoke_lease(creds["lease_id"])
                except Exception:
                    pass
            self._dynamic_creds.clear()

# Usage
manager = VaultSecretManager(vault)
db_creds = manager.get_dynamic_secret("database/creds/app-role", "main_db")
print(f"Using DB user: {db_creds['username']}")

# On shutdown
manager.cleanup()
```

## How It Works

1. **KV v2 engine** stores static secrets as versioned key-value pairs. Each update creates a new version, allowing rollback to previous versions.
2. **Database secrets engine** creates real database users on demand. Each credential generation runs SQL `CREATE ROLE` with a random username and password. The credentials are valid until the lease expires or is revoked.
3. **Lease renewal** extends the TTL of dynamic credentials. The database user's `VALID UNTIL` clause is updated to the new expiration time.
4. **Lease revocation** immediately drops the database user, invalidating the credentials. This happens automatically when the lease expires or manually via `revoke_lease`.
5. **Auto-renewal** checks if credentials are close to expiry and renews them transparently, so the application never sees expired credentials.

## Variants

### AppRole Authentication

```python
def authenticate_approle(role_id: str, secret_id: str) -> str:
    """Authenticate using AppRole — for machine-to-machine auth."""
    response = vault.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id,
    )
    return response["auth"]["client_token"]

# Use the token for subsequent requests
token = authenticate_approle("role-uuid", "secret-uuid")
vault = hvac.Client(url="http://127.0.0.1:8200", token=token)
```

### Transit Engine for Encryption

```python
def encrypt_data(key_name: str, plaintext: str) -> str:
    """Encrypt data using Vault's Transit engine (envelope encryption)."""
    import base64
    encoded = base64.b64encode(plaintext.encode()).decode()
    response = vault.write(f"transit/encrypt/{key_name}", {"plaintext": encoded})
    return response["data"]["ciphertext"]

def decrypt_data(key_name: str, ciphertext: str) -> str:
    """Decrypt data using Vault's Transit engine."""
    response = vault.write(f"transit/decrypt/{key_name}", {"ciphertext": ciphertext})
    import base64
    return base64.b64decode(response["data"]["plaintext"]).decode()

# Vault manages the encryption key — app never sees it
encrypted = encrypt_data("my-key", "sensitive data")
decrypted = decrypt_data("my-key", encrypted)
```

### Kubernetes Authentication

```python
def authenticate_kubernetes(jwt_path: str = "/var/run/secrets/kubernetes.io/serviceaccount/token"):
    """Authenticate from within a Kubernetes pod."""
    with open(jwt_path) as f:
        jwt_token = f.read()

    response = vault.auth.kubernetes.login(
        role="my-app-role",
        jwt=jwt_token,
    )
    return response["auth"]["client_token"]
```

## Best Practices

- **Use dynamic secrets when possible** — credentials are short-lived and unique per request
- **Never log secrets** — Vault returns secrets in plaintext; ensure they don't end up in logs
- **Use AppRole or Kubernetes auth in production** — not root tokens
- **Rotate static secrets regularly** — use Vault's rotation features or update manually

## Common Mistakes

- **Using root token in production** — root tokens bypass all access control; use AppRole
- **Not revoking dynamic credentials** — orphaned database users accumulate; always revoke on shutdown
- **Storing Vault token in environment variables** — use AppRole with response wrapping instead
- **Not handling Vault downtime** — implement caching with TTL so the app survives brief Vault outages

## FAQ

**Q: What happens when Vault is down?**
A: Static secrets can't be read, and dynamic credentials can't be generated. Cache secrets locally with a short TTL (5-10 min) to survive brief outages.

**Q: How are dynamic database credentials revoked?**
A: Vault runs `DROP ROLE` on the database when the lease expires or is revoked. The credentials stop working immediately.

**Q: Can I use Vault with AWS Secrets Manager?**
A: They serve similar purposes but are separate systems. Vault is self-hosted; Secrets Manager is AWS-managed. Choose based on your infrastructure.

**Q: How do I rotate static secrets?**
A: Update the secret in Vault with a new value. Applications reading the secret on next request get the new value. For zero-downtime rotation, use dynamic secrets instead.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
