---
contentType: recipes
slug: vault-dynamic-credentials
title: "Credenciales Dinamicas de Base de Datos con HashiCorp Vault"
description: "Como usar HashiCorp Vault para generar credenciales de base de datos de corta duracion, eliminando passwords hardcodeados y reduciendo secret sprawl"
metaDescription: "Credenciales dinamicas de base de datos con HashiCorp Vault. Genera passwords de corta duracion, elimina secretos hardcodeados y audita todo acceso a base de datos."
difficulty: intermediate
topics:
  - security
  - databases
tags:
  - vault
  - security
  - database
  - secret-management
relatedResources:
  - /recipes/secret-management
  - /recipes/security-headers
  - /guides/security-best-practices
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Credenciales dinamicas de base de datos con HashiCorp Vault. Genera passwords de corta duracion, elimina secretos hardcodeados y audita todo acceso a base de datos."
  keywords:
    - hashicorp vault
    - dynamic credentials
    - secret management
    - database security
    - password rotation
---

# Credenciales Dinamicas de Base de Datos con HashiCorp Vault

Las credenciales de base de datos hardcodeadas en archivos de configuracion son un riesgo persistente de seguridad. HashiCorp Vault resuelve esto generando credenciales dinamicamente gestionadas que se crean bajo demanda y se revocan automaticamente despues de un TTL configurable.

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

### 3. Crear un Rol Dinamico

```bash
vault write database/roles/app \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### 4. Solicitar Credenciales Dinamicas

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
- Usa **AppRole o Kubernetes auth** en lugar de tokens de larga duracion
- Habilita **audit devices** para loggear cada generacion de credenciales y acceso
- Configura **max_ttl** para enforcear duracion maxima de sesion sin importar renovacion

## Errores Comunes

- Olvidar revocar leases, dejando roles huérfanos en base de datos
- Configurar TTL demasiado corto, causando churn excesivo de credenciales
- No manejar indisponibilidad de Vault gracefulmente en la aplicacion

## FAQ

**P: Que pasa si Vault esta caido cuando la app necesita credenciales?**
R: La aplicacion deberia fallar al iniciar o caer a un connection pool cacheado. Para sistemas criticos, ejecuta Vault en modo HA con multiples replicas.

**P: Puede Vault rotar tambien la password admin estatica?**
R: Si. Usa `vault write database/rotate-root/postgres` para rotar las credenciales root que Vault usa para gestionar roles dinamicos.

**P: Funciona esto con connection pooling?**
R: Si, pero el pool debe recrearse cuando las credenciales rotan. Usa un factory pattern que gestione el ciclo de vida del pool junto con el TTL del lease.
