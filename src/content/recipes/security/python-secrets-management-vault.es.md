---
contentType: recipes
slug: python-secrets-management-vault
title: "Gestiona Secretos con HashiCorp Vault y Python"
description: "Almacena, recupera y rota secretos de aplicación de forma segura usando HashiCorp Vault con cliente Python hvac, secretos dinámicos y renovación automática de leases."
metaDescription: "Gestiona secretos de aplicación con HashiCorp Vault y Python. Almacena y recupera secretos, usa credenciales dinámicas de BD y renova leases con hvac."
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
  metaDescription: "Gestiona secretos de aplicación con HashiCorp Vault y Python. Almacena y recupera secretos, usa credenciales dinámicas de BD y renova leases con hvac."
  keywords:
    - hashicorp vault
    - python hvac
    - secrets management
    - secretos dinámicos
    - vault python
    - lease renewal
---

## Visión General

Los secretos hardcodeados en variables de entorno o archivos de configuración
son un riesgo de seguridad. Una vez que un archivo `.env` llega al control de
versiones, a una capa de imagen Docker, o a un log de CI, el secreto es
efectivamente público. HashiCorp Vault centraliza el almacenamiento de secretos
con cifrado en reposo, control de acceso granular, audit logging y secretos
dinámicos que expiran automáticamente. Esta receta cubre cómo conectarse a
Vault con Python (`hvac`), almacenar y recuperar secretos estáticos en el
[motor KV v2](https://developer.hashicorp.com/vault/docs/secrets/kv), usar
credenciales dinámicas de base de datos, renovar leases automáticamente y
manejar los casos operativos que complican a los equipos en producción.

Vault no es la única opción. AWS Secrets Manager, Google Secret Manager y
Doppler resuelven problemas similares. Vault se destaca cuando necesitás
despliegue self-hosted, secretos dinámicos respaldados por infraestructura real
(usuarios de BD, tokens de cloud IAM), o requisitos estrictos de auditoría.
Para una comparación más amplia, consultá la [guía completa de gestión de
secretos](/guides/complete-guide-secrets-management/).

## Cuándo Usar

- Aplicaciones con varios secretos (passwords de BD, API keys, certificados TLS).
- Equipos que necesitan gestión centralizada de secretos con audit trails.
- Secretos dinámicos que rotan automáticamente, como credenciales de BD o tokens
  cloud.
- Entornos multi-tenant o multi-equipo donde diferentes servicios necesitan
  acceso aislado a diferentes secretos.

### Cuándo evitarlo

- Una app chica con uno o dos secretos y un solo desarrollador. Un gestor
  simple o un archivo de entorno encriptado puede alcanzar.
- No podés ejecutar o acceder a un cluster de Vault. La dependencia extra agrega
  overhead operativo.
- Paths con latencia muy baja donde una consulta a Vault en cada request es
  inaceptable. Cacheá secretos localmente con TTL en ese caso.

## Solución

El flujo siguiente muestra cómo una aplicación Python se autentica con Vault,
solicita secretos y maneja el ciclo de vida de los leases:

```mermaid
flowchart TD
    A[App inicia] --> B{Método de auth}
    B -->|Token| C[Login directo con token]
    B -->|AppRole| D[Login con role_id + secret_id]
    B -->|Kubernetes| E[Login con JWT del pod]
    C --> F[Recibir client token]
    D --> F
    E --> F
    F --> G{Tipo de secreto}
    G -->|Estático KV v2| H[Leer secret/path]
    G -->|Dinámico BD| I[Leer database/creds/role]
    I --> J[Obtener user + password + lease_id]
    J --> K[Usar credenciales en la app]
    K --> L{Lease por vencer}
    L -->|Sí| M[Renovar lease vía sys/renew]
    L -->|No| K
    M --> K
    K --> N[Shutdown: revocar lease]
```

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

El default `root` token arriba es solo para desarrollo local con `vault server
-dev`. En producción, usá AppRole o Kubernetes auth (cubierto en Variantes) y
nunca envíes un root token en variables de entorno.

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

Para que esto funcione, el [motor de secretos de base de
datos](https://developer.hashicorp.com/vault/docs/secrets/databases) tiene que
estar habilitado y configurado:

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
una versión anterior. El borrado es soft por defecto: los datos se eliminan pero
la metadata y el historial de versiones quedan, lo que permite recuperar un
secreto si una rotación sale mal.

El **motor de secretos de base de datos** crea usuarios reales de base de datos
bajo demanda. Cada generación de credenciales ejecuta SQL `CREATE ROLE` con un
username y password aleatorios. El usuario es válido hasta que el lease expire o
sea revocado. Esto significa que cada instancia de aplicación obtiene sus
propias credenciales únicas, y esas credenciales dejan de funcionar en el
momento en que el lease termina. Sin schedules de rotación de passwords, sin
passwords compartidas entre servicios.

La **renovación de lease** extiende el TTL y actualiza la cláusula `VALID UNTIL`
en la base de datos. La **revocación** elimina el usuario inmediatamente,
invalidando las credenciales. La clase wrapper renueva las credenciales de forma
transparente para que la aplicación nunca vea valores vencidos.

### Trade-offs a tener en cuenta

**La disponibilidad de Vault es una dependencia dura.** Si Vault cae y tu app
no tiene cache local, no puede leer secretos estáticos ni generar dinámicos.
Siempre cacheá secretos localmente con un TTL corto (5 a 10 minutos) para que la
app sobreviva a cortes breves de Vault. El cache debe ser en memoria, nunca en
disco.

**Los secretos dinámicos tienen un costo.** Cada generación de credenciales
ejecuta SQL contra la base de datos. Bajo carga alta con TTLs cortos, podés
generar cientos de usuarios de BD por minuto. Ajustá el TTL según tu workload:
1 hora es un default razonable para web apps, 15 minutos para entornos de alta
seguridad.

**El cliente `hvac` no es thread-safe por defecto.** La clase wrapper de arriba
usa un `threading.Lock` para proteger el estado de credenciales dinámicas. Si
compartís un solo `hvac.Client` entre threads para otras operaciones, envolvé
esas llamadas también, o creá un client por thread.

**El ciclo de vida del token importa.** El client token que obtenés de AppRole o
Kubernetes auth tiene su propio TTL y flag renewable. Si el token expira, cada
llamada a Vault falla con 403. Usá el [helper de auto-renovación de
tokens](https://hvac.readthedocs.io/en/stable/usage/auth_methods/index.html) de
`hvac` o un sidecar como [Vault
Agent](https://developer.hashicorp.com/vault/docs/agent) para mantener el token
vivo.

## Estrategia de Testing

Probá la integración con Vault sin un cluster real usando el CLI `vault` en modo
dev dentro de un fixture de test. El patrón de abajo usa `pytest` y `subprocess`
para levantar un servidor Vault temporal:

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

Para unit tests que no necesitan un Vault real, mockeá los métodos de
`hvac.Client`. La clase wrapper `VaultSecretManager` depende solo de unos pocos
métodos (`read`, `sys.renew_lease`, `sys.revoke_lease`), así que un
`unittest.mock.MagicMock` cubre la mayoría de los casos.

## Consideraciones de Seguridad

- **Least privilege**: cada política de Vault debería otorgar solo los paths que
  el servicio necesita. Evitá políticas con acceso a `secret/*`. Usá
  [políticas de Vault](https://developer.hashicorp.com/vault/docs/concepts/policies)
  con patrones de path explícitos.
- **Audit logging**: habilitá el audit device (`vault audit enable file
  file_path=/var/log/vault/audit.log`) para que cada acceso a secretos quede
  registrado. Revisá los logs en busca de lecturas inesperadas.
- **mTLS**: en producción, Vault debería escuchar solo en HTTPS con mutual TLS.
  El cliente `hvac` soporta los parámetros `verify` y `cert` para client certs.
- **Response wrapping**: cuando pases secret IDs o tokens iniciales entre
  sistemas, usá [response
  wrapping](https://developer.hashicorp.com/vault/docs/concepts/response-wrapping)
  para que el valor solo sea legible por el destinatario correcto.
- **Sin secretos en logs**: Vault devuelve valores en texto plano. Configurá tu
  logger para redactar paths de secretos conocidos y nunca loguees el campo
  `data` de una respuesta de Vault. Combiná esto con
  [prevención de SQL injection](/recipes/python-sql-injection-sqlalchemy/) para
  que las credenciales tampoco se expongan en logs de queries.

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
  request, así que una credencial filtrada no sirve después de su TTL.
- Nunca loguees secretos. Vault devuelve valores en texto plano; mantenelos
  fuera de logs y trazas de APM.
- Usá AppRole o Kubernetes auth en producción, nunca root tokens.
- Rotá secretos estáticos regularmente a través del motor KV versionado.
- Cacheá secretos localmente con un TTL corto para que la app sobreviva a cortes
  de Vault.
- Seteá `Cache-Control: no-store` en cualquier endpoint que toque secretos.
- Ejecutá un cluster Vault dedicado o una oferta manejada como [HCP
  Vault](https://developer.hashicorp.com/vault/docs/install); no uses `-dev` en
  producción.

## Solución de Problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `hvac.exceptions.InvalidRequest: permission denied` | El token no tiene política para el path | Verificá la política del token con `vault token lookup` |
| `hvac.exceptions.VaultDown` o connection refused | Vault no está corriendo o `VAULT_ADDR` incorrecto | Verificá la dirección y que el server esté healthy (`vault status`) |
| Credenciales dinámicas funcionan pero la conexión a BD falla | El usuario creado no tiene grants | Agregá statements `GRANT` a `creation_statements` en la config del role |
| La renovación de lease devuelve 400 | El lease ya expiró o fue revocado | Pedí una credencial nueva en lugar de renovar |
| `InvalidPath` al listar secretos | El path no existe o no tiene subkeys | Atrapá `hvac.exceptions.InvalidPath` y devolvé una lista vacía |
| El token expira después de 1 hora | El TTL del token AppRole es muy corto | Incrementá `token_ttl` en el role AppRole o usá un sidecar de renovación |

## Monitoreo

Vault expone [métricas Prometheus](https://developer.hashicorp.com/vault/docs/configuration#telemetry)
en `/v1/sys/metrics`. Habilitá la stanza de telemetría en la config del server:

```hcl
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}
```

Hacé scrape del endpoint desde tu setup de Prometheus existente y configurá
alertas sobre las métricas que importan para acceso a secretos:

| Métrica | Qué te dice | Umbral de alerta |
| --- | --- | --- |
| `vault_core_unsealed` | Estado de sell del cluster | `< 1` para cualquier nodo |
| `vault_token_create_count` | Rate de emisión de tokens | Pico repentino puede indicar cliente mal configurado |
| `vault_lease_revoke_count` | Revocaciones de leases | Caída repentina puede indicar usuarios huérfanos |
| `vault_runtime_heap_bytes` | Presión de memoria | `> 80%` de memoria asignada |
| `vault_request_count{path="database/creds/*"}` | Requests de credenciales dinámicas | Pico sostenido puede indicar TTL corto o hot path |

Habilitá el [audit device](https://developer.hashicorp.com/vault/docs/audit)
en cada nodo para que cada lectura, escritura y operación de lease quede
logueada con un path HMAC-redacted. Reenviá los audit logs a tu SIEM y creá
alertas para lecturas desde paths inesperados o tokens desconocidos.

Para monitoreo del lado de la aplicación, envolvé las llamadas a `hvac` con
métricas de timing para detectar latencia de Vault antes de que afecte a
los usuarios:

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

Combiná esto con
[rate limiting](/recipes/python-rate-limiting-fastapi-redis/) para que una
lentitud de Vault no se cascadae encolando requests.

## FAQ

### ¿Qué pasa si Vault cae?

Los secretos estáticos no se pueden leer y las credenciales dinámicas no se
pueden generar. Cacheá secretos localmente con un TTL corto (5 a 10 minutos)
para sobrevivir a cortes breves. Para cortes más largos, fallá cerrando y
rechazá requests que necesiten secretos en lugar de degradar a credenciales
hardcodeadas de fallback.

### ¿Por qué mis credenciales dinámicas dejan de funcionar antes del TTL?

La cláusula `VALID UNTIL` en PostgreSQL se setea al tiempo de expiración del
lease. Si el reloj de la base de datos se desincroniza respecto a Vault, el
usuario puede expirar unos segundos antes. Renová el lease con un margen (300
segundos es seguro) o sincronizá NTP en ambos hosts.

### ¿Puedo usar Vault junto con AWS Secrets Manager?

Sí. Algunos equipos usan Vault para secretos dinámicos y AWS Secrets Manager
para configuración estática. Vault es self-hosted y soporta secretos dinámicos
respaldados por infraestructura real; Secrets Manager es totalmente manejado y
más simple de operar. La elección depende de tu infraestructura y necesidades
de compliance.

### ¿Cuál es la diferencia entre KV v1 y KV v2?

KV v2 agrega versionado, borrado lógico y metadata personalizada. KV v1 es un
store plano de clave-valor sin historial. Usá KV v2 para todo trabajo nuevo.
La mayoría de las instalaciones modernas de Vault usan v2 por defecto, y los
métodos KV v2 de `hvac` (`create_or_update_secret`, `read_secret_version`) lo
requieren.

### ¿Cuándo conviene AppRole sobre Kubernetes auth?

AppRole está diseñado para autenticación máquina a máquina donde controlás ambos
lados. Kubernetes auth es mejor cuando tus workloads corren en pods y pueden
leer un JWT de service account automáticamente. Si estás dentro de un cluster,
preferí siempre Kubernetes auth: no hay secret ID que distribuir, y el token
rota automáticamente.

### ¿Cómo roto la root key de Vault?

Las root keys no se rotan; se revocan y regeneran. Usá `vault operator
generate-root` con un quorum de unseal keys para generar un nuevo root token, y
luego revocá el anterior. Para operaciones del día a día, evitá root tokens
enteramente y usá políticas con scope mediante AppRole o Kubernetes auth.

## See Also

- [Documentación de HashiCorp Vault](https://developer.hashicorp.com/vault/docs)
- [Documentación del cliente Python hvac](https://hvac.readthedocs.io/)
- [Motor de secretos de base de datos de Vault](https://developer.hashicorp.com/vault/docs/secrets/databases)
- [Telemetría y métricas de Vault](https://developer.hashicorp.com/vault/docs/configuration#telemetry)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST SP 800-57 Part 1 Rev 5: Key Recommendation](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [Repositorio companion](https://mathiaspaulenko.github.io/stack-practices-resources/) — ejemplos ejecutables y tests
- [Rotación de JWT refresh tokens](/recipes/python-jwt-refresh-token-rotation/)
- [Prevención de SQL injection con SQLAlchemy](/recipes/python-sql-injection-sqlalchemy/)
- [Rate limiting con FastAPI y Redis](/recipes/python-rate-limiting-fastapi-redis/)
- [Guía completa de gestión de secretos](/guides/complete-guide-secrets-management/)
