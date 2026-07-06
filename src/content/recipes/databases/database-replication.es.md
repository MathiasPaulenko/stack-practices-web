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
  - sql
  - postgresql
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

La replicación de bases de datos copia datos de una base de datos primaria a una o más réplicas. Esto habilita el escalado de lecturas, alta disponibilidad y [disaster recovery](/guides/devops/on-call-incident-response-guide). Ya sea usando streaming replication en PostgreSQL, binary log replication en MySQL, o replica sets nativos en MongoDB, entender el lag de replicación, failover y trade-offs de consistencia es esencial para construir capas de datos resilientes.

## Cuándo Usar

Usa este recurso cuando:
- El tráfico de lecturas excede lo que una única instancia de base de datos puede manejar
- Necesitas failover con near-zero downtime para aplicaciones críticas
- La distribución geográfica requiere datos más cerca de los usuarios
- Los [backups](/guides/devops/on-call-incident-response-guide) no deben impactar la performance de la base de datos primaria

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

## Lo que funciona

- **Monitorea lag de replicación**: Alerta cuando el lag excede la tolerancia de la aplicación (usualmente 1-5 segundos)
- **Usa connection pooling**: [PgBouncer](/recipes/performance/connection-pooling) o ProxySQL manejan el ruteo primaria/réplica
- **Testea failover trimestralmente**: El failover automatizado aún necesita validación humana
- **Mantén réplicas en AZs diferentes**: No solo diferentes instancias — diferentes dominios de falla
- **No escribas en réplicas**: Incluso si está soportado, crea conflictos y escenarios de split-brain

## Errores Comunes

1. **Asumir que las réplicas son real-time**: El lag asíncrono puede ser segundos o minutos; diseña para consistencia eventual. Aprende más en [CAP theorem](/guides/databases/cap-theorem-guide).
2. **Sin testing de failover**: La primera vez que haces failover no debería ser durante un outage
3. **Ignorar bloat de replication slots**: Los slots de replicación de PostgreSQL previenen cleanup de WAL; monitorea uso de disco
4. **Único path de red**: Réplicas en la misma AZ que la primaria comparten el mismo dominio de falla
5. **Leyendo de réplicas con lag**: Mostrar datos stale a usuarios que acaban de escribir causa confusión

## Preguntas Frecuentes

**P: ¿Cuánto lag de replicación es aceptable?**
R: Para analytics: minutos. Para lecturas user-facing: <1 segundo. Para datos financieros: usa replicación síncrona.

**P: ¿Puedo usar réplicas para backups?**
R: Sí. `pg_basebackup` desde una réplica descarga la primaria. Asegúrate de que la réplica esté al día primero. Consulta nuestra [plantilla de disaster recovery](/guides/devops/on-call-incident-response-guide).

**P: ¿Cuál es la diferencia entre replicación lógica y física?**
R: La física copia byte-por-byte (rápida; base de datos completa). La lógica replica cambios de fila (tablas selectivas; compatible entre versiones).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Replicación lógica de PostgreSQL

```sql
-- En primaria: crear una publicación
CREATE PUBLICATION my_pub FOR TABLE users, orders;

-- En destino: crear una suscripción
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary-db.example.com port=5432 user=replicator password=secret'
  PUBLICATION my_pub;
```

La replicación lógica copia cambios de fila a nivel lógico, permitiendo replicación selectiva de tablas y compatibilidad entre versiones. Úsala cuando necesites replicar solo tablas específicas o migrar entre versiones de PostgreSQL.

### Réplicas en cascada

```ini
# En réplica intermedia (replica_1)
# postgresql.conf
hot_standby = on
primary_conninfo = 'host=primary-db.example.com port=5432 user=replicator'
# Permitir que replica_2 se conecte a replica_1
max_replication_slots = 5
max_wal_senders = 5
```

```bash
# En replica_2: base backup desde replica_1
pg_basebackup -h replica_1.example.com -D /var/lib/postgresql/data \
  -U replicator -P -v -R -X stream -C -S replica_2
```

Las réplicas en cascada reducen la carga en la primaria permitiendo que las réplicas transmitan WAL a otras réplicas.

### Failover automatizado con Patroni

```yaml
# patroni.yml
scope: my_cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: node1.example.com:8008

etcd:
  hosts: node1:2379,node2:2379,node3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        max_wal_senders: 10
        max_replication_slots: 10

postgresql:
  listen: 0.0.0.0:5432
  connect_address: node1.example.com:5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/bin
  authentication:
    replication:
      username: replicator
      password: secret
    superuser:
      username: postgres
      password: secret
```

### Monitoreo de lag de replicación

```sql
-- PostgreSQL: verificar lag de replicación
SELECT
    application_name,
    client_addr,
    state,
    sync_state,
    sent_lsn,
    replay_lsn,
    (sent_lsn - replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- Verificar tamaño de WAL
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- Verificar uso de disco de replication slots
SELECT slot_name, active, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots;
```

```sql
-- MySQL: verificar estado de réplica
SHOW REPLICA STATUS\G

-- Campos clave a monitorear:
-- Seconds_Behind_Master: lag de replicación en segundos
-- Replica_IO_Running: Yes
-- Replica_SQL_Running: Yes
-- Last_Error: debería estar vacío
```

### Consistencia read-after-write

```javascript
// Rutear lecturas a primaria por 5 segundos después de una escritura
const recentWrites = new Map();

async function writeAndRead(userId, data) {
    // Escribir a primaria
    await primaryPool.query('UPDATE users SET data = $1 WHERE id = $2', [data, userId]);
    recentWrites.set(userId, Date.now());

    // Leer de primaria si escritura reciente, si no de réplica
    const isRecent = Date.now() - (recentWrites.get(userId) || 0) < 5000;
    const pool = isRecent ? primaryPool : replicaPool;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
}
```

## Buenas prácticas adicionales

6. **Usa replication slots en PostgreSQL.** Los replication slots previenen que el WAL se recicle antes de que la réplica lo consuma. Monitorea el uso de disco de los slots para prevenir bloat.

7. **Configura `max_replication_slots` y `max_wal_senders` apropiadamente.** Cada réplica necesita un slot y un WAL sender. Configura 2-3 más que tu conteo de réplicas para expansión futura.

8. **Usa `synchronous_commit = remote_apply` para datos críticos.** Esto espera hasta que la réplica aplica la transacción antes de confirmar el commit:

```sql
ALTER SYSTEM SET synchronous_commit = remote_apply;
```

9. **Mantén réplicas en diferentes availability zones.** Una falla de una sola AZ no debería tumbar tanto la primaria como la réplica.

10. **Automatiza el testing de failover.** Ejecuta drills de failover mensualmente. Documenta el runbook. Las herramientas de failover automatizado (Patroni, Stolon) aún necesitan validación humana.

## Errores comunes adicionales

6. **No limpiar replication slots inactivos.** Los slots inactivos acumulan WAL, eventualmente llenando el disco. Elimina slots sin uso:

```sql
SELECT pg_drop_replication_slot('unused_replica_slot');
```

7. **Ejecutar analytics pesados en réplicas.** Queries de larga ejecución en réplicas causan lag de replicación. Usa una réplica dedicada para analytics o una materialized view.

8. **No monitorear `pg_stat_replication`.** Sin monitoreo, no sabrás que las réplicas tienen lag hasta que los usuarios se quejen de datos stale.

9. **Usar `synchronous_commit = on` sin réplicas.** La replicación síncrona sin réplicas disponibles bloquea todas las escrituras. Siempre ten al menos una réplica saludable.

10. **Olvidar actualizar `primary_conninfo` después del failover.** Después de promover una réplica, otras réplicas deben apuntar a la nueva primaria. Automatiza esto con Patroni o una herramienta de configuration management.

## Preguntas frecuentes adicionales

### ¿Cómo promuevo una réplica a primaria en PostgreSQL?

```sql
-- PostgreSQL 12+
SELECT pg_promote();
```

Para versiones anteriores, crea un trigger file o usa `pg_ctl promote`. Con Patroni, el failover es automático.

### ¿Qué es split-brain y cómo lo prevengo?

Split-brain ocurre cuando dos nodos creen que son la primaria. Prevénlo con:
- Failover basado en quórum (Patroni + etcd)
- Fencing (STONITH) para apagar la primaria antigua
- Detección de split-brain en tu capa de proxy

### ¿Cómo manejo la replicación durante un upgrade de versión major?

Usa replicación lógica para actualizar con near-zero downtime:
1. Configura replicación lógica de la versión antigua a la nueva
2. Espera a que alcance el catch-up
3. Cambia las conexiones de la aplicación a la nueva versión
4. Elimina la suscripción

### ¿Qué es `pg_rewind` y cuándo lo uso?

`pg_rewind` resincroniza una primaria antigua que divergió de la nueva primaria. Sin él, debes reconstruir todo el data directory con `pg_basebackup`.

## Tips de Rendimiento

1. **Ajusta `wal_sender_timeout` y `wal_receiver_timeout`.** Configura 30-60 segundos para detectar fallos de red rápidamente:

```sql
ALTER SYSTEM SET wal_sender_timeout = '30s';
ALTER SYSTEM SET wal_receiver_timeout = '30s';
```

2. **Usa `wal_compression = on` para replicación WAN.** Comprime el WAL antes de enviarlo, reduciendo ancho de banda para réplicas cross-region:

```sql
ALTER SYSTEM SET wal_compression = on;
```

3. **Batchea escrituras grandes para reducir volumen de WAL.** Transacciones grandes individuales generan menos WAL que muchas pequeñas:

```sql
-- Mejor: una transacción grande
BEGIN;
INSERT INTO logs SELECT * FROM staging_logs;
COMMIT;

-- Peor: muchas transacciones pequeñas
```

4. **Monitorea `pg_stat_wal_receiver` para salud de conexión.** Esta vista muestra el estado del proceso WAL receiver en una réplica:

```sql
SELECT status, sender_host, sender_port, received_lsn, latest_end_lsn
FROM pg_stat_wal_receiver;
```

5. **Usa `hot_standby_feedback = on` para prevenir conflictos de queries.** Esto envía feedback de queries de la réplica a la primaria, previniendo que vacuum elimine filas aún necesitadas por queries de la réplica:

```sql
ALTER SYSTEM SET hot_standby_feedback = on;
```
