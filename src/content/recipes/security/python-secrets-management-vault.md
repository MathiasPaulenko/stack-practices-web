---
contentType: recipes
slug: python-secrets-management-vault
title: "Manage Application Secrets with HashiCorp Vault and Python"
description: "Store, retrieve, and rotate application secrets securely using HashiCorp Vault with Python hvac client, dynamic secrets, and automatic lease renewal."
metaDescription: "Manage application secrets with HashiCorp Vault and Python. Store and retrieve secrets, use dynamic database credentials, and auto-renew leases with hvac."
difficulty: advanced
topics:
  - security
  - infrastructure
tags:
  - python
  - hashicorp-vault
  - secrets-management
  - security
  - infrastructure
  - postgresql
relatedResources:
  - /recipes/python-jwt-refresh-token-rotation
  - /recipes/python-sql-injection-sqlalchemy
  - /recipes/python-rate-limiting-fastapi-redis
  - /guides/complete-guide-secrets-management
  - /guides/complete-guide-supply-chain-security
  - /guides/ci-cd-security-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Manage application secrets with HashiCorp Vault and Python. Store and retrieve secrets, use dynamic database credentials, and auto-renew leases with hvac."
  keywords:
    - hashicorp vault
    - python hvac
    - secrets management
    - dynamic secrets
    - vault python
    - lease renewal
---

## Overview

Hardcoded secrets in environment variables or config files are a security risk.
HashiCorp Vault centralizes secret storage with encryption, access control, audit
logging, and dynamic secrets. This recipe covers connecting to Vault with Python
(`hvac`), storing and retrieving static secrets, using dynamic database
credentials, and auto-renewing leases.

## When to Use

- Applications with several secrets (database passwords, API keys, TLS certs).
- Teams needing centralized secret management with audit trails.
- Dynamic secrets that rotate automatically, like database credentials or cloud
tokens.

### When to avoid

- A small app with one or two secrets and a single developer. A simpler secret
manager or encrypted env file may be enough.
- You can't run or access a Vault cluster. The extra dependency adds operational
overhead.
- Extremely low-latency paths where a Vault lookup on every request is
prohibitive. Cache secrets locally with TTL instead.

## Solution

### Install dependencies

```bash
pip install hvac
```

### Connect to Vault

```python
import os
import hvac

def create_vault_client() -> hvac.Client:
    client = hvac.Client(
        url=os.getenv("VAULT_ADDR", "http://127.0.0.1:8200"),
        token=os.getenv("VAULT_TOKEN", "root"),
    )

    if not client.is_authenticated():
        raise RuntimeError("Vault authentication failed")

    return client

vault = create_vault_client()
```

### Store and retrieve static secrets

```python
def store_secret(path: str, secret_data: dict) -> None:
    vault.secrets.kv.v2.create_or_update_secret(
        path=path,
        secret=secret_data,
        mount_point="secret",
    )

def get_secret(path: str, version: int | None = None) -> dict:
    response = vault.secrets.kv.v2.read_secret_version(
        path=path,
        version=version,
        mount_point="secret",
    )
    return response["data"]["data"]

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

db_creds = get_secret("myapp/database")
print(f"DB Host: {db_creds['host']}")
print(f"DB User: {db_creds['username']}")
```

### List secrets

```python
def list_secrets(path: str = "") -> list[str]:
    try:
        response = vault.secrets.kv.v2.list_secrets(
            path=path,
            mount_point="secret",
        )
        return response["data"]["keys"]
    except hvac.exceptions.InvalidPath:
        return []

keys = list_secrets("myapp")
print(f"Secrets under myapp/: {keys}")
```

### Dynamic database credentials

```python
def get_dynamic_db_credentials() -> dict:
    response = vault.read("database/creds/app-role")
    return {
        "username": response["data"]["username"],
        "password": response["data"]["password"],
        "lease_id": response["lease_id"],
        "lease_duration": response["lease_duration"],
        "renewable": response["renewable"],
    }

creds = get_dynamic_db_credentials()
print(f"Dynamic user: {creds['username']}")
print(f"Lease duration: {creds['lease_duration']}s")
```

For this to work, the database secrets engine must be enabled and configured:

```python
vault.sys.enable_secrets_engine(
    backend_type="database",
    path="database",
)

vault.write("database/config/my-postgresql", {
    "plugin_name": "postgresql-database-plugin",
    "allowed_roles": "app-role",
    "connection_url": "postgresql://{{username}}:{{password}}@db.example.com:5432/mydb",
    "username": "vault_admin",
    "password": "vault_admin_password",
})

vault.write("database/roles/app-role", {
    "db_name": "my-postgresql",
    "creation_statements": [
        "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
        "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";",
    ],
    "default_ttl": "1h",
    "max_ttl": "24h",
})
```

### Lease renewal and revocation

```python
import time

def renew_lease(lease_id: str, increment: int = 3600) -> bool:
    try:
        vault.sys.renew_lease(
            lease_id=lease_id,
            increment=increment,
        )
        return True
    except hvac.exceptions.InvalidRequest:
        return False

def revoke_lease(lease_id: str) -> None:
    vault.sys.revoke_lease(lease_id=lease_id)

creds = get_dynamic_db_credentials()
time.sleep(creds["lease_duration"] - 300)
renew_lease(creds["lease_id"], increment=3600)

revoke_lease(creds["lease_id"])
```

### Secret wrapper with auto-renewal

```python
import threading
from typing import Any

class VaultSecretManager:

    def __init__(self, vault_client: hvac.Client):
        self.vault = vault_client
        self._dynamic_creds: dict[str, dict] = {}
        self._lock = threading.Lock()

    def get_static_secret(self, path: str) -> dict:
        return get_secret(path)

    def get_dynamic_secret(self, role_path: str, name: str = "default") -> dict:
        with self._lock:
            if name in self._dynamic_creds:
                creds = self._dynamic_creds[name]
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
        creds = self._dynamic_creds[name]
        try:
            self.vault.sys.renew_lease(
                lease_id=creds["lease_id"],
                increment=creds["lease_duration"],
            )
            creds["expires_at"] = time.time() + creds["lease_duration"]
        except hvac.exceptions.InvalidRequest:
            del self._dynamic_creds[name]

    def cleanup(self) -> None:
        with self._lock:
            for creds in self._dynamic_creds.values():
                try:
                    self.vault.sys.revoke_lease(creds["lease_id"])
                except Exception:
                    pass
            self._dynamic_creds.clear()

manager = VaultSecretManager(vault)
db_creds = manager.get_dynamic_secret("database/creds/app-role", "main_db")
print(f"Using DB user: {db_creds['username']}")

# On shutdown
manager.cleanup()
```

## Explanation

Vault's **KV v2 engine** stores static secrets as versioned key-value pairs.
Each update creates a new version, so you can roll back to previous values.

The **database secrets engine** creates real database users on demand. Each
credential generation runs SQL `CREATE ROLE` with a random username and password.
The user is valid until the lease expires or is revoked.

**Lease renewal** extends the TTL and updates the `VALID UNTIL` clause in the
database. **Lease revocation** immediately drops the user, invalidating the
credentials. The wrapper class renews credentials transparently so the
application never sees expired values.

## Variants

| Auth method | Use case | How to use |
| --- | --- | --- |
| Token | Local dev and testing | `hvac.Client(url=..., token=...)` |
| AppRole | Machine-to-machine | `vault.auth.approle.login(...)` |
| Kubernetes | Workloads running in pods | `vault.auth.kubernetes.login(...)` |
| Transit | Encrypt data without holding keys | `transit/encrypt/{key_name}` |

### AppRole authentication

```python
def authenticate_approle(role_id: str, secret_id: str) -> str:
    response = vault.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id,
    )
    return response["auth"]["client_token"]

token = authenticate_approle("role-uuid", "secret-uuid")
vault = hvac.Client(url="http://127.0.0.1:8200", token=token)
```

### Transit engine for encryption

```python
import base64

def encrypt_data(key_name: str, plaintext: str) -> str:
    encoded = base64.b64encode(plaintext.encode()).decode()
    response = vault.write(f"transit/encrypt/{key_name}", {"plaintext": encoded})
    return response["data"]["ciphertext"]

def decrypt_data(key_name: str, ciphertext: str) -> str:
    response = vault.write(f"transit/decrypt/{key_name}", {"ciphertext": ciphertext})
    return base64.b64decode(response["data"]["plaintext"]).decode()

encrypted = encrypt_data("my-key", "sensitive data")
decrypted = decrypt_data("my-key", encrypted)
```

### Kubernetes authentication

```python
def authenticate_kubernetes(jwt_path: str = "/var/run/secrets/kubernetes.io/serviceaccount/token"):
    with open(jwt_path) as f:
        jwt_token = f.read()

    response = vault.auth.kubernetes.login(
        role="my-app-role",
        jwt=jwt_token,
    )
    return response["auth"]["client_token"]
```

## Best Practices

- Use dynamic secrets when possible. They're short-lived and unique per request.
- Never log secrets. Vault returns plaintext values; keep them out of logs.
- Use AppRole or Kubernetes auth in production, never root tokens.
- Rotate static secrets regularly through Vault's versioned KV engine.
- Cache secrets locally with a short TTL so the app survives brief Vault outages.
- Set `Cache-Control: no-store` on any endpoint that touches secrets.
- Run a dedicated Vault cluster or managed offering; don't run `-dev` in
  production.

## Common Mistakes

- Using a root token in production. Root tokens bypass all access control.
- Not revoking dynamic credentials. Orphaned database users accumulate over time.
- Storing the Vault token in environment variables. Use AppRole with response
  wrapping instead.
- Not handling Vault downtime. Implement local caching and fallback behavior.
- Returning secrets in API responses or rendering them in UI logs.
- Forgetting to enable and configure the database secrets engine before
  requesting credentials.

## FAQ

### What happens when Vault is down?

Static secrets can't be read and dynamic credentials can't be generated. Cache
secrets locally with a short TTL (5–10 minutes) to survive brief outages.

### How are dynamic database credentials revoked?

Vault runs `DROP ROLE` on the database when the lease expires or is revoked. The
credentials stop working immediately.

### Can I use Vault with AWS Secrets Manager?

They serve similar purposes but are separate systems. Vault is self-hosted;
Secrets Manager is AWS-managed. Choose based on your infrastructure and
compliance needs.

### How do I rotate static secrets?

Update the secret in Vault with a new value. Applications read the latest
version on the next request. For zero-downtime rotation, use dynamic secrets
instead.

### Should I use KV v1 or KV v2?

Use KV v2. It adds versioning, soft deletes, and metadata. Most modern Vault
setups default to v2.

### How do I authenticate from Kubernetes?

Enable the Kubernetes auth method in Vault, create a role bound to a service
account, and call `vault.auth.kubernetes.login` with the pod's JWT token.
