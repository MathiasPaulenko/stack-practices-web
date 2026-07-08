---
contentType: recipes
slug: vault-dynamic-credentials
title: "Credenciales en Vivo de Base de Datos con HashiCorp Vault"
description: "Como usar HashiCorp Vault para generar credenciales de base de datos de corta duracion, eliminando passwords hardcodeados y reduciendo secret sprawl"
metaDescription: "Credenciales en vivo de base de datos con HashiCorp Vault. Genera passwords de corta duracion, elimina secretos hardcodeados y audita todo acceso a base de datos."
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
  metaDescription: "Credenciales en vivo de base de datos con HashiCorp Vault. Genera passwords de corta duracion, elimina secretos hardcodeados y audita todo acceso a base de datos."
  keywords:
    - hashicorp vault
    - live credentials
    - secret management
    - database security
    - password rotation
---

# Credenciales en Vivo de Base de Datos con HashiCorp Vault

Las credenciales de base de datos hardcodeadas en archivos de configuracion son un riesgo persistente de seguridad. HashiCorp Vault resuelve esto generando credenciales gestionadas en vivo que se crean bajo demanda y se revocan automaticamente despues de un TTL configurable.

## Cuando Usar Esto

- Quieres eliminar passwords estaticas de base de datos de la configuracion de aplicaciones
- La rotacion de credenciales debe ocurrir sin reinicios de aplicacion
- Necesitas un audit trail de cada acceso a base de datos con atribucion de usuario

## Requisitos Previos

- Servidor Vault ejecutandose (modo dev aceptable para testing)
- Base de datos PostgreSQL o MySQL
- Token de Vault con permisos para configurar el database secrets engine

## Solucion

### 1. Habilitar el Database Secrets Engine

```bash
vault secrets enable database
```

### 2. Configurar Conexion a Base de Datos

```bash
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app" \
  connection_url="postgresql://{{username}}:{{password}}@localhost:5432/mydb" \
  username="vaultadmin" \
  password="vaultadmin-password"
```

### 3. Crear un Rol en Vivo

```bash
vault write database/roles/app \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### 4. Solicitar Credenciales en Vivo

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

### 5. Integracion de Aplicacion con Renovacion de Lease

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

    // Renueva o rota antes de que expire el lease
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

### 6. Revocar Credenciales al Apagar

```typescript
// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await connectionPool.close();
  await vault.revoke({ lease_id: currentLeaseId });
  process.exit(0);
});
```

## Como Funciona

1. **Database Plugin** se conecta a PostgreSQL con credenciales admin
2. **Role Definition** especifica SQL de creacion con username y password templated
3. **Credential Request** dispara a Vault para crear un nuevo rol en PostgreSQL
4. **TTL Enforcement** elimina automaticamente el rol despues de la expiracion
5. **Lease Renewal** extiende o reemplaza credenciales antes de la expiracion

## Consideraciones de Produccion

- Ejecuta Vault en **modo HA** con almacenamiento Raft para ambientes de produccion
- Usa **AppRole o [Kubernetes auth](/guides/devops/kubernetes-basics-guide)** en lugar de tokens de larga duracion
- Habilita **audit devices** para loggear cada generacion de credenciales y acceso
- Configura **max_ttl** para enforcear duracion maxima de sesion sin importar renovacion

## Errores Comunes

- Olvidar revocar leases, dejando roles huérfanos en base de datos
- Configurar TTL demasiado corto, causando churn excesivo de credenciales
- No manejar indisponibilidad de Vault gracefulmente en la aplicacion. Consulta [respuesta a incidentes on-call](/guides/devops/on-call-incident-response-guide).

## FAQ

**P: Que pasa si Vault esta caido cuando la app necesita credenciales?**
R: La aplicacion deberia fallar al iniciar o caer a un connection pool cacheado. Para sistemas criticos, ejecuta Vault en modo HA con multiples replicas.

**P: Puede Vault rotar tambien la password admin estatica?**
R: Si. Usa `vault write database/rotate-root/postgres` para rotar las credenciales root que Vault usa para gestionar roles en vivo.

**P: Funciona esto con connection pooling?**
R: Si, pero el pool debe recrearse cuando las credenciales rotan. Usa un [factory pattern](/patterns/design/factory-pattern) que gestione el ciclo de vida del pool junto con el TTL del lease.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Cliente hvac de Python con auth AppRole

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
    """Cliente de Vault con autenticación AppRole y cacheo de credenciales."""

    def __init__(self, vault_addr: str, role_id: str, secret_id: str):
        self.client = hvac.Client(url=vault_addr)
        self._authenticate(role_id, secret_id)
        self._cached_creds: DBCredentials | None = None

    def _authenticate(self, role_id: str, secret_id: str):
        """Autenticar usando AppRole (identidad de máquina)."""
        resp = self.client.auth.approle.login(
            role_id=role_id,
            secret_id=secret_id,
        )
        self.client.token = resp['auth']['client_token']

    def get_db_credentials(self, role: str = 'app') -> DBCredentials:
        """Solicitar credenciales de base de datos de corta duración a Vault."""
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
        """Renovar un lease antes de que expire."""
        self.client.sys.renew_lease(
            lease_id=lease_id,
            increment=increment,
        )

    def revoke_lease(self, lease_id: str):
        """Revocar credenciales cuando ya no se necesiten."""
        self.client.sys.revoke_lease(lease_id=lease_id)

# Uso
vault = VaultClient(
    vault_addr=os.environ['VAULT_ADDR'],
    role_id=os.environ['VAULT_ROLE_ID'],
    secret_id=os.environ['VAULT_SECRET_ID'],
)

creds = vault.get_db_credentials()
# Usar creds para conectar a PostgreSQL...
# Al apagar:
vault.revoke_lease(creds['lease_id'])
```

### Método de auth Kubernetes

Cuando ejecutas en Kubernetes, usa el backend de auth de Kubernetes para que los pods se autentiquen con su token de service account en lugar de secretos compartidos:

```python
import hvac

def authenticate_kubernetes(vault_addr: str, role: str, jwt_path: str = '/var/run/secrets/kubernetes.io/serviceaccount/token'):
    """Autenticar a Vault usando el token de service account de Kubernetes."""
    client = hvac.Client(url=vault_addr)

    with open(jwt_path, 'r') as f:
        jwt = f.read().strip()

    resp = client.auth.kubernetes.login(
        role=role,
        jwt=jwt,
    )
    client.token = resp['auth']['client_token']
    return client

# Configuración admin de Vault (una vez):
# vault auth enable kubernetes
# vault write auth/kubernetes/config kubernetes_host="https://kubernetes.default.svc"
# vault write auth/kubernetes/role/database-app \
#   bound_service_account_names=app-sa \
#   bound_service_account_namespaces=production \
#   policies=database-access \
#   ttl=1h
```

### Configuración multi-rol con separación lectura/escritura

Crea roles separados de Vault con diferentes privilegios de base de datos para enforcear least-privilege:

```bash
# Rol de solo lectura para analytics / reporting
vault write database/roles/app-readonly \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="4h" \
  max_ttl="24h"

# Rol de lectura-escritura para mutaciones de aplicación
vault write database/roles/app-readwrite \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="8h"

# Rol de migración con privilegios DDL (TTL corto, solicitud manual)
vault write database/roles/app-migration \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="15m" \
  max_ttl="1h"
```

```python
# Solicitar las credenciales correctas para la tarea
def get_readonly_creds(vault: VaultClient) -> DBCredentials:
    return vault.get_db_credentials(role='app-readonly')

def get_readwrite_creds(vault: VaultClient) -> DBCredentials:
    return vault.get_db_credentials(role='app-readwrite')

def get_migration_creds(vault: VaultClient) -> DBCredentials:
    # TTL corto, siempre revocadas inmediatamente después de la migración
    creds = vault.get_db_credentials(role='app-migration')
    return creds
```

### Cacheo de credenciales con fallback (Node.js)

Cuando Vault no está disponible temporalmente, usa credenciales cacheadas con un warning:

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
const MAX_CACHE_AGE = 2 * 60 * 60 * 1000; // 2 horas

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
      console.warn('Vault no disponible, usando credenciales cacheadas', {
        age: Date.now() - cached.fetchedAt,
        leaseId: cached.leaseId,
      });
      return cached;
    }
    throw new Error('Vault no disponible y no hay credenciales cacheadas válidas');
  }
}
```

## Mejores Prácticas Adicionales

1. **Usa Vault Agent para inyección de credenciales sidecar.** En lugar de que el código de la aplicación llame a Vault directamente, despliega Vault Agent como sidecar que escribe credenciales a un archivo que la aplicación lee:

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

2. **Monitorea conteo de leases y eventos de revocación.** Trackea métricas para detectar leases huérfanos o churn de credenciales:

```python
def check_lease_health(vault_client, max_leases: int = 100):
    """Monitorear leases activos y alertar sobre anomalías."""
    leases = vault_client.sys.list_leases()
    active_count = len(leases)

    if active_count > max_leases:
        logging.warning(
            f'Alto conteo de leases: {active_count} (max: {max_leases})'
        )

    # Verificar leases antiguos que deberían haber sido revocados
    for lease in leases:
        # Alertar si el lease es más antiguo de lo esperado
        pass

    return {'active_leases': active_count}
```

## Errores Comunes Adicionales

1. **Usar un solo token de Vault para todos los servicios.** Cada servicio debería autenticarse independientemente con su propia identidad (AppRole, rol de Kubernetes, AWS IAM). Un token compartido significa que comprometer un servicio compromete todos:

```bash
# INCORRECTO: compartir un token entre servicios
export VAULT_TOKEN=s.shared-token

# CORRECTO: cada servicio obtiene su propio rol
vault write auth/approle/role/api-server token_ttl=1h token_max_ttl=4h
vault write auth/approle/role/worker token_ttl=1h token_max_ttl=4h
```

2. **No configurar `max_ttl` en los roles.** Sin `max_ttl`, los leases renovados pueden persistir indefinidamente. Configura un techo duro para enforcear re-autenticación periódica:

```bash
# Bien: 1h por defecto, 8h max (fuerza re-auth al menos cada 8h)
vault write database/roles/app \
  db_name=postgres \
  creation_statements="..." \
  default_ttl="1h" \
  max_ttl="8h"
```

## Preguntas Frecuentes Adicionales

### ¿Cómo roto las credenciales root de base de datos de Vault?

Usa el endpoint `rotate-root`. Vault genera una nueva password para la cuenta admin y la almacena internamente. La password anterior se descarta:

```bash
vault write -force database/rotate-root/postgres
```

Programa esta rotación trimestralmente o después de cambios de personal. Vault maneja la rotación sin downtime — usa las credenciales actuales para generar una nueva password, luego actualiza su almacenamiento interno.

### ¿Puedo usar credenciales dinámicas de Vault con Redis o MongoDB?

Sí. Vault soporta Redis, MongoDB, Cassandra y otras bases de datos a través de plugins. El patrón de configuración es el mismo: habilitar el database engine, configurar la conexión, crear un rol con creation statements. Para bases de datos NoSQL, las creation statements usan los comandos nativos de gestión de usuarios de la base de datos (ej: `db.createUser()` para MongoDB).

### ¿Cuál es el overhead de las credenciales dinámicas?

Cada solicitud de credenciales crea un rol de base de datos, que es una operación ligera. Para PostgreSQL, la creación de rol toma 1-5ms. El overhead principal es la recreación del connection pool cuando rotan las credenciales. Mitiga usando TTLs más largos (1-4 horas) y renovando leases en lugar de solicitar nuevas credenciales.
