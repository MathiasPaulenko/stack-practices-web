---
contentType: recipes
slug: database-replication
title: "Replicación de Bases de Datos"
description: "Configura y gestiona replicación de bases de datos para alta disponibilidad, escalado de lecturas y disaster recovery con arquitecturas primaria-réplica."
metaDescription: "Replicación de bases de datos: primaria-réplica, multi-primaria, replicación síncrona/asíncrona, failover y escalado de lecturas para alta disponibilidad."
difficulty: intermediate
topics:
  - databases
tags:
  - database-replication
  - databases
  - performance
relatedResources:
  - /recipes/uuid-generation-strategies
  - /recipes/database-connection-pooling
  - /recipes/postgres-query-optimization
  - /guides/sql-performance-tuning-guide
  - /recipes/cursor-pagination-postgresql
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Replicación de bases de datos: primaria-réplica, multi-primaria, replicación síncrona/asíncrona, failover y escalado de lecturas para alta disponibilidad."
  keywords:
    - database-replication
    - databases
    - high-availability
    - performance
---
## Visión General

La replicación de bases de datos copia datos de una base de datos primaria a una o más réplicas. Esto habilita el escalado de lecturas, alta disponibilidad y disaster recovery. Ya sea usando streaming replication en PostgreSQL, binary log replication en MySQL, o replica sets nativos en MongoDB, entender el lag de replicación, failover y trade-offs de consistencia es esencial para construir capas de datos resilientes.

## Cuándo Usar

Usa este recurso cuando:
- El tráfico de lecturas excede lo que una única instancia de base de datos puede manejar
- Necesitas failover con near-zero downtime para aplicaciones críticas
- La distribución geográfica requiere datos más cerca de los usuarios
- Los backups no deben impactar la performance de la base de datos primaria

## Solución

### PostgreSQL Streaming Replication

```sql
-- En primaria: configurar postgresql.conf
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10

-- En primaria: crear usuario de replicación
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secret';

-- En réplica: usar pg_basebackup
pg_basebackup -h primary-db.example.com -D /var/lib/postgresql/data \
  -U replicator -P -v -R -X stream -C -S replica_1
```

### MySQL Group Replication (Single-Primary)

```sql
-- En cada nodo
SET GLOBAL group_replication_bootstrap_group=OFF;
START GROUP_REPLICATION;

-- Verificar estado de miembros
SELECT * FROM performance_schema.replication_group_members;

-- Verificar lag de replicación
SELECT 
  MEMBER_ID, 
  COUNT_TRANSACTIONS_IN_QUEUE as trx_behind,
  COUNT_TRANSACTIONS_REMOTE_IN_APPLIER_QUEUE as applying
FROM performance_schema.replication_group_member_stats;
```

### Read Replica Routing (Node.js)

```javascript
const { Pool } = require('pg');

const primaryPool = new Pool({
  host: process.env.DB_PRIMARY_HOST,
  database: 'app'
});

const replicaPool = new Pool({
  host: process.env.DB_REPLICA_HOST,
  database: 'app',
  poolMode: 'read-only'
});

async function query(sql, params, options = {}) {
  const pool = options.readOnly ? replicaPool : primaryPool;
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// Lecturas van a réplica
const users = await query('SELECT * FROM users', [], { readOnly: true });
// Escrituras van a primaria
await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
```

## Explicación

**Modos de replicación**:

| Modo | Consistencia | Caso de Uso |
|------|--------------|-------------|
| Asíncrono | Eventual | Escalado de lecturas; lag aceptable |
| Síncrono | Fuerte | Datos financieros; zero data loss |
| Semi-síncrono | Balanceado | La mayoría de escenarios HA |

**Causas de lag de replicación**:
- Transacciones grandes bloquean el stream de replicación
- El hardware de réplica es más lento que la primaria
- Latencia de red entre primaria y réplica
- Réplica bajo carga de lectura pesada compitiendo con el proceso de apply

**Estrategias de failover**:
- **Promoción manual**: DBA ejecuta `pg_promote()` o `CHANGE MASTER TO`
- **Patroni/etcd**: Failover automatizado con elección de líder
- **AWS RDS**: Automático con detección de ~60-120 segundos
- **Capa de proxy**: PgBouncer o ProxySQL rutean a la nueva primaria

## Variantes

| Base de Datos | Método | Feature |
|---------------|--------|---------|
| PostgreSQL | Streaming WAL | Hot standby; réplicas en cascada |
| MySQL | Binlog | Row-based o statement-based |
| MongoDB | Oplog | Replica sets; failover automático |
| Redis | Replication | Async; Sentinel para HA |
| CockroachDB | Multi-raft | Síncrono por default |

## Mejores Prácticas

- **Monitorea lag de replicación**: Alerta cuando el lag excede la tolerancia de la aplicación (usualmente 1-5 segundos)
- **Usa connection pooling**: PgBouncer o ProxySQL manejan el ruteo primaria/réplica
- **Testea failover trimestralmente**: El failover automatizado aún necesita validación humana
- **Mantén réplicas en AZs diferentes**: No solo diferentes instancias — diferentes dominios de falla
- **No escribas en réplicas**: Incluso si está soportado, crea conflictos y escenarios de split-brain

## Errores Comunes

1. **Asumir que las réplicas son real-time**: El lag asíncrono puede ser segundos o minutos; diseña para consistencia eventual
2. **Sin testing de failover**: La primera vez que haces failover no debería ser durante un outage
3. **Ignorar bloat de replication slots**: Los slots de replicación de PostgreSQL previenen cleanup de WAL; monitorea uso de disco
4. **Único path de red**: Réplicas en la misma AZ que la primaria comparten el mismo dominio de falla
5. **Leyendo de réplicas con lag**: Mostrar datos stale a usuarios que acaban de escribir causa confusión

## Preguntas Frecuentes

**P: ¿Cuánto lag de replicación es aceptable?**
R: Para analytics: minutos. Para lecturas user-facing: <1 segundo. Para datos financieros: usa replicación síncrona.

**P: ¿Puedo usar réplicas para backups?**
R: Sí. `pg_basebackup` desde una réplica descarga la primaria. Asegúrate de que la réplica esté al día primero.

**P: ¿Cuál es la diferencia entre replicación lógica y física?**
R: La física copia byte-por-byte (rápida; base de datos completa). La lógica replica cambios de fila (tablas selectivas; compatible entre versiones).
