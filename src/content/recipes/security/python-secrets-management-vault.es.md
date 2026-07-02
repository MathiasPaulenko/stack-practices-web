---
contentType: recipes
slug: python-secrets-management-vault
title: "Gestiona secretos de aplicacion con HashiCorp Vault y Python"
description: "Almacena, recupera y rota secretos de aplicacion de forma segura usando HashiCorp Vault con cliente Python hvac, secretos dinamicos y renovacion automatica de leases"
metaDescription: "Gestiona secretos de aplicacion con HashiCorp Vault y Python. Almacena y recupera secretos, usa credenciales dinamicas de BD y renueva leases con hvac."
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
  metaDescription: "Gestiona secretos de aplicacion con HashiCorp Vault y Python. Almacena y recupera secretos, usa credenciales dinamicas de BD y renueva leases con hvac."
  keywords:
    - hashicorp vault
    - python hvac
    - secrets management
    - dynamic secrets
    - vault python
---

# Gestiona secretos de aplicacion con HashiCorp Vault y Python

Los secretos hardcodeados en variables de entorno o archivos de configuracion son un riesgo de seguridad. HashiCorp Vault centraliza el almacenamiento de secretos con cifrado, control de acceso, audit logging y secretos dinamicos. Esta receta cubre conectarse a Vault con Python (`hvac`), almacenar y recuperar secretos estaticos, usar credenciales dinamicas de base de datos y renovar leases automaticamente.

## Cuando Usar Esto

- Aplicaciones con multiples secretos (passwords de BD, API keys, certificados TLS)
- Equipos que necesitan gestion centralizada de secretos con audit trails
- Secretos dinamicos que rotan automaticamente (credenciales de BD, tokens cloud)

## Requisitos Previos

- Python 3.10+
- Paquete `hvac` (`pip install hvac`)
- Un servidor Vault ejecutandose (modo dev: `vault server -dev`)

## Solucion

### 1. Instalar dependencias

```bash
pip install hvac
```

### 2. Conectar a Vault

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

### 3. Almacenar y recuperar secretos estaticos

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

# Almacenar secretos
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

# Recuperar secretos
db_creds = get_secret("myapp/database")
print(f"DB Host: {db_creds['host']}")
print(f"DB User: {db_creds['username']}")
```

### 4. Listar secretos

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

# Listar todos los secretos bajo myapp/
keys = list_secrets("myapp")
print(f"Secrets under myapp/: {keys}")
# ['database', 'api_keys']
```

### 5. Credenciales dinamicas de base de datos

```python
def setup_database_engine():
    """Configure Vault's database secrets engine for dynamic credentials."""
    # Habilitar el engine de secretos de base de datos
    vault.sys.enable_secrets_engine(
        backend_type="database",
        path="database",
    )

    # Configurar conexion PostgreSQL
    vault.write("database/config/my-postgresql", {
        "plugin_name": "postgresql-database-plugin",
        "allowed_roles": "app-role",
        "connection_url": "postgresql://{{username}}:{{password}}@db.example.com:5432/mydb",
        "username": "vault_admin",
        "password": "vault_admin_password",
    })

    # Crear un rol con TTL de 1 hora
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

# Generar credenciales — cada llamada crea un usuario unico
creds = get_dynamic_db_credentials()
print(f"Dynamic user: {creds['username']}")
print(f"Lease duration: {creds['lease_duration']}s")
```

### 6. Renovacion y revocacion de leases

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

# Uso con auto-renovacion
creds = get_dynamic_db_credentials()

# Renovar antes de expirar
time.sleep(creds["lease_duration"] - 300)  # 5 min antes de expirar
renew_lease(creds["lease_id"], increment=3600)

# Revocar al terminar
revoke_lease(creds["lease_id"])
```

### 7. Clase wrapper de secretos

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
                # Renovar si esta cerca de expirar
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
            # Lease expirado — obtener nuevas credenciales
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

# Uso
manager = VaultSecretManager(vault)
db_creds = manager.get_dynamic_secret("database/creds/app-role", "main_db")
print(f"Using DB user: {db_creds['username']}")

# Al apagar
manager.cleanup()
```

## Como Funciona

1. **Engine KV v2** almacena secretos estaticos como pares key-value versionados. Cada actualizacion crea una nueva version, permitiendo rollback a versiones anteriores.
2. **Engine de secretos de base de datos** crea usuarios reales de base de datos on demand. Cada generacion de credenciales ejecuta SQL `CREATE ROLE` con un username y password aleatorios. Las credenciales son validas hasta que el lease expira o se revoca.
3. **Renovacion de lease** extiende el TTL de las credenciales dinamicas. La clausula `VALID UNTIL` del usuario de base de datos se actualiza al nuevo tiempo de expiracion.
4. **Revocacion de lease** elimina inmediatamente el usuario de base de datos, invalidando las credenciales. Esto ocurre automaticamente cuando el lease expira o manualmente via `revoke_lease`.
5. **Auto-renovacion** verifica si las credenciales estan cerca de expirar y las renueva transparentemente, para que la aplicacion nunca vea credenciales expiradas.

## Variantes

### Autenticacion AppRole

```python
def authenticate_approle(role_id: str, secret_id: str) -> str:
    """Authenticate using AppRole — for machine-to-machine auth."""
    response = vault.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id,
    )
    return response["auth"]["client_token"]

# Usar el token para peticiones subsiguientes
token = authenticate_approle("role-uuid", "secret-uuid")
vault = hvac.Client(url="http://127.0.0.1:8200", token=token)
```

### Engine Transit para cifrado

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

# Vault gestiona la clave de cifrado — la app nunca la ve
encrypted = encrypt_data("my-key", "sensitive data")
decrypted = decrypt_data("my-key", encrypted)
```

### Autenticacion Kubernetes

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

## Mejores Practicas

- **Usa secretos dinamicos cuando sea posible** — las credenciales son de corta duracion y unicas por peticion
- **Nunca loguees secretos** — Vault retorna secretos en plaintext; asegurate de que no terminen en logs
- **Usa AppRole o Kubernetes auth en produccion** — no tokens root
- **Rota secretos estaticos regularmente** — usa las features de rotacion de Vault o actualiza manualmente

## Errores Comunes

- **Usar token root en produccion** — los tokens root evitan todo control de acceso; usa AppRole
- **No revocar credenciales dinamicas** — los usuarios de BD huerfanos se acumulan; siempre revoca al apagar
- **Almacenar token de Vault en variables de entorno** — usa AppRole con response wrapping en su lugar
- **No manejar el downtime de Vault** — implementa caching con TTL para que la app sobreviva caidas breves de Vault

## FAQ

**Q: Que pasa cuando Vault cae?**
A: Los secretos estaticos no se pueden leer y las credenciales dinamicas no se pueden generar. Cachea secretos localmente con un TTL corto (5-10 min) para sobrevivir caidas breves.

**Q: Como se revocan las credenciales dinamicas de BD?**
A: Vault ejecuta `DROP ROLE` en la base de datos cuando el lease expira o se revoca. Las credenciales dejan de funcionar inmediatamente.

**Q: Puedo usar Vault con AWS Secrets Manager?**
A: Sirven propositos similares pero son sistemas separados. Vault es self-hosted; Secrets Manager es gestionado por AWS. Elige segun tu infraestructura.

**Q: Como roto secretos estaticos?**
A: Actualiza el secreto en Vault con un nuevo valor. Las aplicaciones que lean el secreto en la siguiente peticion obtienen el nuevo valor. Para rotacion sin downtime, usa secretos dinamicos en su lugar.
