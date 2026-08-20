---
contentType: recipes
slug: python-secrets-management-vault
title: "Gestiona Secretos de Aplicación con HashiCorp Vault y Python"
description: "Almacena, recupera y rota secretos de aplicación de forma segura usando HashiCorp Vault con cliente Python hvac, secretos dinámicos y renovación automática de leases."
metaDescription: "Gestiona secretos de aplicación con HashiCorp Vault y Python. Almacena y recupera secretos, usa credenciales dinámicas de BD y renueva leases con hvac."
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
  metaDescription: "Gestiona secretos de aplicación con HashiCorp Vault y Python. Almacena y recupera secretos, usa credenciales dinámicas de BD y renueva leases con hvac."
  keywords:
    - hashicorp vault
    - python hvac
    - secrets management
    - secretos dinámicos
    - vault python
    - lease renewal
---

## Visión General

Los secretos hardcodeados en variables de entorno o archivos de configuración son
un riesgo de seguridad. HashiCorp Vault centraliza el almacenamiento de secretos
con cifrado, control de acceso, audit logging y secretos dinámicos. Esta receta
cubre cómo conectarse a Vault con Python (`hvac`), almacenar y recuperar
secretos estáticos, usar credenciales dinámicas de base de datos y renovar
leases automáticamente.

## Cuándo Usar

- Aplicaciones con varios secretos (passwords de BD, API keys, certificados TLS).
- Equipos que necesitan gestión centralizada de secretos con audit trails.
- Secretos dinámicos que rotan automáticamente, como credenciales de BD o tokens
  cloud.

### Cuándo evitarlo

- Una app chica con uno o dos secretos y un solo desarrollador. Un gestor
  simple o un archivo de entorno encriptado puede alcanzar.
- No podés ejecutar o acceder a un cluster de Vault. La dependencia extra agrega
  overhead operativo.
- Paths con latencia muy baja donde una consulta a Vault en cada request es
  inaceptable. Cacheá secretos localmente con TTL en ese caso.

## Solución

### Instalar dependencias

```bash
pip install hvac
```

### Conectar a Vault

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

### Almacenar y recuperar secretos estáticos

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

### Listar secretos

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

### Credenciales dinámicas de base de datos

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

Para que esto funcione, el database secrets engine tiene que estar habilitado y
configurado:

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

### Renovación y revocación de leases

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

### Wrapper de secretos con auto-renovación

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

## Explicación

El **motor KV v2** de Vault almacena secretos estáticos como pares clave-valor
versionados. Cada actualización crea una nueva versión, así que podés volver a
una versión anterior.

El **motor de secretos de base de datos** crea usuarios reales de base de datos
bajo demanda. Cada generación de credenciales ejecuta SQL `CREATE ROLE` con un
username y password aleatorios. El usuario es válido hasta que el lease expire o
sea revocado.

La **renovación de lease** extiende el TTL y actualiza la cláusula `VALID UNTIL`
en la base de datos. La **revocación** elimina el usuario inmediatamente,
invalidando las credenciales. La clase wrapper renueva las credenciales de forma
transparente para que la aplicación nunca vea valores vencidos.

## Variantes

| Método de auth | Caso de uso | Cómo usarlo |
| --- | --- | --- |
| Token | Dev local y testing | `hvac.Client(url=..., token=...)` |
| AppRole | Máquina a máquina | `vault.auth.approle.login(...)` |
| Kubernetes | Workloads en pods | `vault.auth.kubernetes.login(...)` |
| Transit | Encriptar datos sin tener las claves | `transit/encrypt/{key_name}` |

### Autenticación AppRole

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

### Motor Transit para encriptación

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

### Autenticación Kubernetes

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

## Mejores Prácticas

- Usá secretos dinámicos siempre que podás. Son de corta duración y únicos por
  request.
- Nunca loguees secretos. Vault devuelve valores en texto plano; mantenelos
  fuera de logs.
- Usá AppRole o Kubernetes auth en producción, nunca root tokens.
- Rotá secretos estáticos regularmente a través del motor KV versionado.
- Cacheá secretos localmente con un TTL corto para que la app sobreviva a cortes
  de Vault.
- Seteá `Cache-Control: no-store` en cualquier endpoint que toque secretos.
- Ejecutá un cluster Vault dedicado o una oferta manejada; no uses `-dev` en
  producción.

## Errores Comunes

- Usar un root token en producción. Los root tokens ignoran todo control de
  acceso.
- No revocar credenciales dinámicas. Los usuarios huérfanos se acumulan con el
  tiempo.
- Guardar el token de Vault en variables de entorno. Usá AppRole con response
  wrapping.
- No manejar caídas de Vault. Implementá cache local y comportamiento de
  fallback.
- Devolver secretos en respuestas de API o mostrarlos en logs de UI.
- Olvidarse de habilitar y configurar el database secrets engine antes de pedir
  credenciales.

## FAQ

### ¿Qué pasa si Vault cae?

Los secretos estáticos no se pueden leer y las credenciales dinámicas no se
pueden generar. Cacheá secretos localmente con un TTL corto (5-10 minutos) para
sobrevivir a cortes breves.

### ¿Cómo se revocan las credenciales dinámicas de base de datos?

Vault ejecuta `DROP ROLE` en la base de datos cuando el lease expira o es
revocado. Las credenciales dejan de funcionar inmediatamente.

### ¿Puedo usar Vault junto con AWS Secrets Manager?

Cumplen propósitos similares pero son sistemas separados. Vault es
self-hosted; Secrets Manager es manejado por AWS. Elegí según tu infraestructura
y necesidades de compliance.

### ¿Cómo roto secretos estáticos?

Actualizá el secreto en Vault con un nuevo valor. Las aplicaciones leen la
última versión en el próximo request. Para rotación sin downtime, usá secretos
dinámicos.

### ¿Uso KV v1 o KV v2?

Usá KV v2. Agrega versionado, borrado lógico y metadata. La mayoría de las
instalaciones modernas de Vault usan v2 por defecto.

### ¿Cómo me autentico desde Kubernetes?

Habilitá el método de auth Kubernetes en Vault, creá un role vinculado a un
service account y llamá a `vault.auth.kubernetes.login` con el JWT token del pod.
