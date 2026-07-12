---


contentType: guides
slug: database-replication-guide
title: "Replicación de Bases de Datos"
description: "Guía práctica de estrategias de replicación de bases de datos: master-slave, multi-master, síncrona vs asíncrona, y cómo manejar failover y resolución de conflictos."
metaDescription: "Aprende replicación de bases de datos: master-slave, multi-master, síncrona vs async, failover y resolución de conflictos. Guía práctica para sistemas escalables."
difficulty: intermediate
topics:
  - databases
  - infrastructure
  - devops
tags:
  - replicacion-base-datos
  - master-slave
  - multi-master
  - failover
  - resolucion-conflictos
  - alta-disponibilidad
  - guia
relatedResources:
  - /guides/database-denormalization-guide
  - /guides/acid-vs-base-guide
  - /guides/indexing-strategies-guide
  - /guides/read-replica-guide
  - /recipes/connect-to-postgresql
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende replicación de bases de datos: master-slave, multi-master, síncrona vs async, failover y resolución de conflictos. Guía práctica para sistemas escalables."
  keywords:
    - replicacion-base-datos
    - master-slave
    - multi-master
    - failover
    - resolucion-conflictos
    - alta-disponibilidad
    - guia


---

## Overview

La replicación de bases de datos es el proceso de copiar y mantener datos a través de múltiples nodos de base de datos. Provee alta disponibilidad, escalado de lecturas y recuperación ante desastres. Pero la replicación introduce complejidad: lag, conflictos, escenarios de split-brain y trade-offs de consistencia. A continuación: las estrategias de replicación usadas en producción, desde simples setups master-slave hasta clusters multi-master.

## When to Use


- For alternatives, see [Complete Guide to PostgreSQL Replication](/es/guides/complete-guide-postgresql-replication/).

- Necesitas escalar lecturas más allá de lo que un solo nodo puede manejar
- La alta disponibilidad requiere failover automático
- La recuperación ante desastres necesita copias de datos off-site
- Quieres ejecutar analytics sin impactar cargas transaccionales

## Replicación Master-Slave

Un nodo primario maneja escrituras; las réplicas manejan lecturas. La topología más simple y común.

```
┌─────────┐     write     ┌─────────┐
│ Master  │───────────────▶│  Slave  │
│  (R+W)  │                │  (R)    │
└─────────┘                └─────────┘
      │                          │
      │         read             │
      └──────────────────────────┘
```

### Replicación Asíncrona

El master commitea localmente, luego envía cambios a los slaves. Baja latencia pero potencial pérdida de datos si el master falla antes de que los slaves alcancen.

```sql
-- MySQL
CHANGE MASTER TO
  MASTER_HOST='master_host',
  MASTER_USER='replica',
  MASTER_PASSWORD='password';
START SLAVE;

-- PostgreSQL (streaming replication)
-- Primario: wal_level = replica, max_wal_senders = 3
-- Standby: primary_conninfo = 'host=primary_host port=5432'
```

### Replicación Semi-Síncrona

El master espera que al menos un slave confirme recepción antes de commitear. Balancea seguridad y rendimiento.

```sql
-- MySQL
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 10000;  -- 10 segundos
```

### Replicación Síncrona

Master espera que todos los slaves confirmen la escritura. Sin pérdida de datos pero mayor latencia.

```sql
-- PostgreSQL synchronous_commit
SET synchronous_commit = 'remote_apply';
SET synchronous_standby_names = 'replica1, replica2';
```

## Lag de Replicación

El lag es el retraso entre una escritura en el master y su aparición en las réplicas. Causas y mitigaciones:

| Causa | Mitigación |
|-------|------------|
| Latencia de red | Usar regiones cercanas, compresión |
| Alto volumen de escrituras | Sharding de escrituras, agregar réplicas |
| Transacciones grandes | Dividir en batches más pequeños |
| Hardware lento de réplica | Equiparar especs de réplica al master |
| Lecturas de réplica compitiendo | Réplicas dedicadas de lectura |

### Detectando Lag

```sql
-- PostgreSQL
SELECT
  now() - pg_last_xact_replay_timestamp() AS lag;

-- MySQL
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master
```

## Replicación Multi-Master

Múltiples nodos aceptan escrituras. Compleja pero habilita escalado de escrituras y distribución geográfica.

```
┌─────────┐◀──────────▶┌─────────┐
│ Master A│            │ Master B│
└─────────┘            └─────────┘
      │                      │
      ▼                      ▼
┌─────────┐            ┌─────────┐
│  Slave  │            │  Slave  │
└─────────┘            └─────────┘
```

### Escenarios de Conflicto

| Escenario | Conflicto |
|-----------|-----------|
| Misma key insertada | Violación de primary key |
| Misma fila actualizada | Last-write-wins o merge |
| Fila eliminada en A, actualizada en B | Update gana o flag de conflicto |
| IDs autoincrementales | IDs duplicados entre masters |

### Estrategias de Resolución de Conflictos

1. **Last-write-wins** — timestamp o vector clock decide
2. **Merge** — lógica específica de la aplicación combina cambios
3. **Resolución manual** — flag de conflictos para revisión humana
4. **Prevención** — particionar datos para que cada fila tenga un solo master

## Failover

Cambio a una réplica cuando el master falla. Manual vs automático:

### Failover Manual

```bash
# PostgreSQL: promover standby
pg_ctl promote -D /var/lib/postgresql/data

# MySQL: detener slave, resetear, iniciar
STOP SLAVE;
RESET SLAVE ALL;
```

### Failover Automático (Patroni)

```yaml
# patroni.yml
scope: mycluster
restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.1:8008
etcd:
  hosts: 10.0.0.10:2379,10.0.0.11:2379,10.0.0.12:2379
postgresql:
  data_dir: /var/lib/postgresql/data
  pg_hba:
    - host replication replicator 10.0.0.0/24 md5
```

## Réplicas de Lectura para Escalado

Enruta lecturas a réplicas, escrituras al master. La aplicación debe manejar el lag de replicación.

```typescript
class DatabaseRouter {
  private master: Pool;
  private replicas: Pool[];
  private currentReplica = 0;

  getWritePool(): Pool {
    return this.master;
  }

  getReadPool(): Pool {
    // Round-robin entre réplicas
    const pool = this.replicas[this.currentReplica];
    this.currentReplica = (this.currentReplica + 1) % this.replicas.length;
    return pool;
  }
}

// Uso
const db = new DatabaseRouter();
await db.getWritePool().query('INSERT INTO ...');
const result = await db.getReadPool().query('SELECT ...');
```

## Errores Comunes

- **Ignorar lag de replicación** — leer inmediatamente después de escribir ve datos desactualizados
- **Escribir en réplicas** — causa split-brain e inconsistencia de datos
- **Sin automatización de failover** — minutos de trabajo manual se convierten en horas de downtime
- **Monitorear solo Seconds_Behind_Master** — el lag puede ser cero mientras el slave sigue procesando
- **Réplicas sub-provisionadas** — réplicas que no pueden mantener el ritmo del throughput del master

## FAQ

**¿La replicación reemplaza los backups?**
No. La replicación maneja fallos de nodo, no corrupción de datos, ransomware o eliminación accidental. Mantén backups separados.

**¿Cómo manejo cambios de esquema?**
Usa herramientas de cambio de esquema online (pt-online-schema-change, gh-ost, o DDL online nativo) para evitar bloquear réplicas.

**¿Puedo replicar entre proveedores de nube?**
Sí, pero la latencia y los costos de egress aumentan. Considera replicación lógica para sincronización selectiva de tablas.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Alta Disponibilidad con Patroni

```text
Sistema: PostgreSQL cluster con 3 nodos
  - 1 primary (us-east-1a)
  - 2 replicas (us-east-1b, us-east-1c)
  - etcd cluster (3 nodos) para consenso
  - HAProxy como load balancer

Topologia:
  Clientes -> HAProxy -> Primary (writes)
                      -> Replica1 (reads)
                      -> Replica2 (reads)

  etcd <- Patroni (health checks, leader election)
  Patroni gestiona: failover automatico, reinicio, reconfiguracion

Configuracion Patroni:
  scope: production
  restapi:
    listen: 0.0.0.0:8008
  etcd:
    hosts: 10.0.0.10:2379,10.0.0.11:2379,10.0.0.12:2379
  postgresql:
    data_dir: /var/lib/postgresql/data
    bin_dir: /usr/lib/postgresql/15/bin
    parameters:
      wal_level: replica
      max_wal_senders: 10
      max_replication_slots: 10
      hot_standby: on
      synchronous_commit: on
      synchronous_standby_names: "FIRST 1 (replica1, replica2)"
    recovery_conf:
      primary_conninfo: "host=10.0.0.1 port=5432 user=replicator"

HAProxy config:
  listen pg_write
    bind *:5432
    mode tcp
    option tcp-check
    tcp-check send GET /master HTTP/1.0\r\n\r\n
    tcp-check expect status 200
    server pg1 10.0.0.1:5432 check port 8008
    server pg2 10.0.0.2:5432 check port 8008 backup
    server pg3 10.0.0.3:5432 check port 8008 backup

  listen pg_read
    bind *:5433
    mode tcp
    balance roundrobin
    option tcp-check
    tcp-check send GET /replica HTTP/1.0\r\n\r\n
    tcp-check expect status 200
    server pg2 10.0.0.2:5432 check port 8008
    server pg3 10.0.0.3:5432 check port 8008

Failover automatico:
  1. Patroni detecta primary caido (health check falla)
  2. etcd realiza leader election entre replicas
  3. Replica ganadora promueve a primary
  4. HAProxy re-ruta trafico automaticamente
  5. Otras replicas se reconectan al nuevo primary
  Tiempo total: 10-30 segundos

Monitoreo:
  | Metrica | Alerta |
  |---------|--------|
  | Replication lag | > 5s |
  | Patroni health | non-200 |
  | etcd cluster health | leader changes > 1/h |
  | Connections activas | > 80% del max |
  | WAL backlog | > 1GB |

Lecciones:
  - Patroni + etcd da failover automatico robusto
  - HAProxy distingue primary/replica via Patroni REST API
  - Synchronous commit garantiza cero perdida de datos
  - 3 nodos es el minimo para quorum (no uses 2)
  - Testea failover regularmente en staging
```

### Como manejo split-brain?

Split-brain ocurre cuando dos nodos creen ser primary. Patroni lo previene con etcd quorum: solo un nodo puede adquirir el lock de leader. Si etcd no esta disponible, Patroni degrada a solo lectura. Nunca configures dos primaries manualmente. Si ocurre split-brain, detiene uno inmediatamente, resuelve conflictos con pg_rewind, y reconecta como replica.
