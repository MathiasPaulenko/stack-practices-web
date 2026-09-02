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
lastUpdated: "2026-09-02"
publishedAt: "2026-07-03"
estimatedReadTime: 11
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
Once a `.env` file lands in version control, a Docker image layer, or a CI log,
the secret is public. HashiCorp Vault centralizes secret storage
with encryption at rest, fine-grained access control, audit logging, and dynamic
secrets that expire automatically. This recipe covers connecting to Vault with
Python (`hvac`), storing and retrieving static secrets in the [KV v2
engine](https://developer.hashicorp.com/vault/docs/secrets/kv), using dynamic
database credentials, auto-renewing leases, and handling the operational edge
cases that bite teams in production.

Vault isn't the only option. AWS Secrets Manager, Google Secret Manager, and
Doppler all solve similar problems. Vault stands out when you need
self-hosted deployment, dynamic secrets backed by real infrastructure (database
users, cloud IAM tokens), or strict audit requirements. For a broader
comparison, see the [complete guide to secrets
management](/guides/complete-guide-secrets-management/).

## When to Use

- Applications with several secrets (database passwords, API keys, TLS certs).
- Teams needing centralized secret management with audit trails.
- Dynamic secrets that rotate automatically, like database credentials or cloud
  tokens.
- Multi-tenant or multi-team environments where different services need
  isolated access to different secrets.

### When to avoid

- A small app with one or two secrets and a single developer. A simpler secret
  manager or encrypted env file may be enough.
- You can't run or access a Vault cluster. The extra dependency adds operational
  overhead.
- Extremely low-latency paths where a Vault lookup on every request is
  prohibitive. Cache secrets locally with TTL instead.

## Solution

The flow below shows how a Python application authenticates to Vault, requests
secrets, and manages lease lifecycles:

```mermaid
flowchart TD
    A[App starts] --> B{Auth method}
    B -->|Token| C[Direct token login]
    B -->|AppRole| D[Login with role_id + secret_id]
    B -->|Kubernetes| E[Login with pod JWT]
    C --> F[Receive client token]
    D --> F
    E --> F
    F --> G{Secret type}
    G -->|Static KV v2| H[Read secret/path]
    G -->|Dynamic DB| I[Read database/creds/role]
    I --> J[Get user + password + lease_id]
    J --> K[Use credentials in app]
    K --> L{Lease expiring}
    L -->|Yes| M[Renew lease via sys/renew]
    L -->|No| K
    M --> K
    K --> N[Shutdown: revoke lease]
```

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

The `root` token default above is only for local development with `vault server
-dev`. In production, use AppRole or Kubernetes auth (covered in Variants) and
never ship a root token in environment variables.

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

For this to work, the [database secrets
engine](https://developer.hashicorp.com/vault/docs/secrets/databases) must be
enabled and configured:

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
Deletion is soft by default: the data is removed but the metadata and version
history remain, letting you undelete a secret if a rotation goes wrong.

The **database secrets engine** creates real database users on demand. Each
credential generation runs SQL `CREATE ROLE` with a random username and
password. The user is valid until the lease expires or is revoked. This means
every application instance gets its own unique credentials, and those
credentials stop working the moment the lease ends. No password rotation
schedules, no shared passwords between services.

**Lease renewal** extends the TTL and updates the `VALID UNTIL` clause in the
database. **Lease revocation** immediately drops the user, invalidating the
credentials. The wrapper class renews credentials transparently so the
application never sees expired values.

### Trade-offs worth knowing

**Vault availability is a hard dependency.** If Vault is down and your app has
no local cache, it can't read static secrets or generate new dynamic ones.
Always cache secrets locally with a short TTL (5 to 10 minutes) so the app
survives brief Vault outages. The cache should be in-memory, never on disk.

**Dynamic secrets have a cost.** Each credential generation runs SQL against
the database. Under high load with short TTLs, you can generate hundreds of
database users per minute. Tune the TTL based on your workload: 1 hour is a
reasonable default for web apps, 15 minutes for high-security environments.

**The `hvac` client isn't thread-safe by default.** The wrapper class above
uses a `threading.Lock` to protect dynamic credential state. If you share a
single `hvac.Client` across threads for other operations, wrap those calls too,
or create one client per thread.

**Token lifecycle matters.** The client token you get from AppRole or
Kubernetes auth has its own TTL and renewable flag. If the token expires, every
Vault call fails with 403. Use the `hvac` [token self-renewal
helper](https://hvac.readthedocs.io/en/stable/usage/auth_methods/index.html)
or a sidecar like [Vault Agent](https://developer.hashicorp.com/vault/docs/agent)
to keep the token alive.

## Testing Strategy

Test Vault integration without a real cluster using the `vault` CLI in dev mode
inside a test fixture. The pattern below uses `pytest` and
`subprocess` to spin up a temporary Vault server:

```python
import os
import subprocess
import time
import pytest
import hvac

@pytest.fixture(scope="session")
def vault_client():
    proc = subprocess.Popen(
        ["vault", "server", "-dev", "-dev-root-token-id=root"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={**os.environ, "VAULT_ADDR": "http://127.0.0.1:8200"},
    )
    time.sleep(1)
    client = hvac.Client(url="http://127.0.0.1:8200", token="root")
    assert client.is_authenticated()
    yield client
    proc.terminate()
    proc.wait()

def test_store_and_read_secret(vault_client):
    vault_client.secrets.kv.v2.create_or_update_secret(
        path="test/secret",
        secret={"api_key": "test-value"},
        mount_point="secret",
    )
    response = vault_client.secrets.kv.v2.read_secret_version(
        path="test/secret",
        mount_point="secret",
    )
    assert response["data"]["data"]["api_key"] == "test-value"

def test_list_secrets_empty_path(vault_client):
    result = vault_client.secrets.kv.v2.list_secrets(
        path="nonexistent",
        mount_point="secret",
    )
    assert result["data"]["keys"] == []
```

For unit tests that don't need a real Vault, mock the `hvac.Client` methods.
The wrapper class `VaultSecretManager` depends only on a few methods
(`read`, `sys.renew_lease`, `sys.revoke_lease`), so a `unittest.mock.MagicMock`
covers most cases.

## Security Considerations

- **Least privilege**: every Vault policy should grant only the paths the
  service needs. Avoid policies with `secret/*` access. Use [Vault
  policies](https://developer.hashicorp.com/vault/docs/concepts/policies) with
  explicit path patterns.
- **Audit logging**: enable the audit device (`vault audit enable file
  file_path=/var/log/vault/audit.log`) so every secret access is recorded.
  Review logs for unexpected reads.
- **mTLS**: in production, Vault should listen only on HTTPS with mutual TLS.
  The `hvac` client supports `verify` and `cert` parameters for client certs.
- **Response wrapping**: when passing secret IDs or initial tokens between
  systems, use [response wrapping](https://developer.hashicorp.com/vault/docs/concepts/response-wrapping)
  so the value is only readable by the intended recipient.
- **No secrets in logs**: Vault returns plaintext values. Configure your logger
  to redact known secret paths and never log the `data` field of a Vault
  response. Pair this with [SQL injection
  prevention](/recipes/python-sql-injection-sqlalchemy/) so credentials aren't
  exposed through query logs either.

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

- Use dynamic secrets when possible. They're short-lived and unique per
  request, so a leaked credential is useless after its TTL.
- Never log secrets. Vault returns plaintext values; keep them out of logs and
  APM traces.
- Use AppRole or Kubernetes auth in production, never root tokens.
- Rotate static secrets regularly through Vault's versioned KV engine.
- Cache secrets locally with a short TTL so the app survives brief Vault
  outages.
- Set `Cache-Control: no-store` on any endpoint that touches secrets.
- Run a dedicated Vault cluster or a managed offering like [HCP
  Vault](https://developer.hashicorp.com/vault/docs/install); don't run
  `-dev` in production.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `hvac.exceptions.InvalidRequest: permission denied` | Token lacks policy for the path | Check the policy attached to the token with `vault token lookup` |
| `hvac.exceptions.VaultDown` or connection refused | Vault isn't running or wrong `VAULT_ADDR` | Verify the address and that the server is healthy (`vault status`) |
| Dynamic creds work but DB connection fails | The created user lacks grants | Add `GRANT` statements to `creation_statements` in the role config |
| Lease renewal returns 400 | Lease already expired or was revoked | Request a fresh credential instead of renewing |
| `InvalidPath` when listing secrets | The path doesn't exist or has no subkeys | Catch `hvac.exceptions.InvalidPath` and return an empty list |
| Token expires after 1 hour | AppRole token TTL is too short | Increase `token_ttl` on the AppRole role or use a renewal sidecar |

## Monitoring

Vault exposes [Prometheus metrics](https://developer.hashicorp.com/vault/docs/configuration#telemetry)
at `/v1/sys/metrics`. Enable the telemetry stanza in the server config:

```hcl
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}
```

Scrape the endpoint from your existing Prometheus setup and alert on the
metrics that matter for secret access:

| Metric | What it tells you | Alert threshold |
| --- | --- | --- |
| `vault_core_unsealed` | Cluster seal status | `< 1` for any node |
| `vault_token_create_count` | Token issuance rate | Sudden spike may indicate a misconfigured client |
| `vault_lease_revoke_count` | Lease revocations | Sudden drop may indicate orphaned users |
| `vault_runtime_heap_bytes` | Memory pressure | `> 80%` of allocated memory |
| `vault_request_count{path="database/creds/*"}` | Dynamic credential requests | Sustained spike may indicate short TTL or hot path |

Enable the [audit device](https://developer.hashicorp.com/vault/docs/audit)
on every node so every secret read, write, and lease operation is logged
with a HMAC-redacted path. Forward audit logs to your SIEM and create alerts
for reads from unexpected paths or tokens.

For application-side monitoring, wrap `hvac` calls with timing metrics so
you can detect Vault latency before it affects users:

```python
import time
import logging

logger = logging.getLogger("vault")

def timed_read(vault, path):
    start = time.monotonic()
    try:
        result = vault.read(path)
        duration = time.monotonic() - start
        logger.info("vault.read path=%s duration=%.3fs", path, duration)
        return result
    except Exception as exc:
        duration = time.monotonic() - start
        logger.error("vault.read path=%s duration=%.3fs error=%s", path, duration, exc)
        raise
```

Pair this with [rate limiting](/recipes/python-rate-limiting-fastapi-redis/)
so a Vault slowdown doesn't cascade into request queuing.

## FAQ

### What happens when Vault is down?

Static secrets can't be read and dynamic credentials can't be generated. Cache
secrets locally with a short TTL (5 to 10 minutes) to survive brief outages. For
longer outages, fail closed and reject requests that need secrets rather than
degrading to hardcoded fallback credentials.

### Why do my dynamic database credentials stop working before the TTL?

The `VALID UNTIL` clause in PostgreSQL is set to the lease expiration time.
If the database clock drifts relative to Vault, the user may expire a few
seconds early. Renew the lease with a buffer (300 seconds is a safe margin) or
sync NTP across both hosts.

### Can I use Vault alongside AWS Secrets Manager?

Yes. Some teams use Vault for dynamic secrets and AWS Secrets Manager for
static configuration. Vault is self-hosted and supports dynamic secrets backed
by real infrastructure; Secrets Manager is fully managed and simpler to operate.
The choice depends on your infrastructure and compliance needs.

### What is the difference between KV v1 and KV v2?

KV v2 adds versioning, soft deletes, and custom metadata. KV v1 is a flat
key-value store with no history. Use KV v2 for all new work. Most modern Vault
setups default to v2, and the `hvac` KV v2 methods (`create_or_update_secret`,
`read_secret_version`) require it.

### When should I choose AppRole over Kubernetes auth?

AppRole is designed for machine-to-machine authentication where you control
both sides. Kubernetes auth is better when your workloads run in pods and can
read a service account JWT automatically. If you're inside a cluster, always
prefer Kubernetes auth: no secret ID to distribute, and the token rotates
automatically.

### How do I rotate the Vault root key?

Root keys aren't rotated; they're revoked and regenerated. Use `vault
operator generate-root` with a quorum of unseal keys to generate a new root
token, then revoke the old one. For day-to-day operations, avoid root tokens
entirely and use scoped policies with AppRole or Kubernetes auth.

## See Also

- [HashiCorp Vault documentation](https://developer.hashicorp.com/vault/docs)
- [hvac Python client documentation](https://hvac.readthedocs.io/)
- [Vault database secrets engine](https://developer.hashicorp.com/vault/docs/secrets/databases)
- [Vault telemetry and metrics](https://developer.hashicorp.com/vault/docs/configuration#telemetry)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST SP 800-57 Part 1 Rev 5: Key Recommendation](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [Companion code repository](https://mathiaspaulenko.github.io/stack-practices-resources/) — runnable examples and tests
- [JWT refresh token rotation](/recipes/python-jwt-refresh-token-rotation/)
- [SQL injection prevention with SQLAlchemy](/recipes/python-sql-injection-sqlalchemy/)
- [Rate limiting with FastAPI and Redis](/recipes/python-rate-limiting-fastapi-redis/)
- [Complete guide to secrets management](/guides/complete-guide-secrets-management/)
