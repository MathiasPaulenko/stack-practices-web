---



contentType: docs
slug: runbook-database-failover
title: "Runbook de Failover de Base de Datos"
description: "Un runbook paso a paso para ejecutar procedimientos de failover de base de datos de forma segura con tiempo de inactividad y perdida de datos minimos."
metaDescription: "Ejecuta failovers de base de datos de forma segura con este runbook. Cubre promocion, cambio de DNS, verificacion de replicacion y procedimientos de rollback."
difficulty: intermediate
topics:
  - devops
  - databases
  - infrastructure
tags:
  - runbook
  - database
  - failover
  - postgres
  - mysql
  - replicacion
  - disaster-recovery
relatedResources:
  - /docs/disaster-recovery-test-plan
  - /docs/deployment-rollback-runbook
  - /docs/data-migration-runbook-template
  - /docs/escalation-policy-template
  - /docs/downtime-communication-template
  - /recipes/sql-find-duplicate-rows
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Ejecuta failovers de base de datos de forma segura con este runbook. Cubre promocion, cambio de DNS, verificacion de replicacion y procedimientos de rollback."
  keywords:
    - failover base de datos
    - runbook
    - failover postgres
    - failover mysql
    - replicacion
    - disaster recovery



---

## Overview

Los failovers de base de datos son eventos de alto riesgo donde minutos de retraso significan perdida de ingresos y erosion de confianza. Un runbook manual reduce los errores impulsados por el panico al proporcionar pasos exactos, comandos de verificacion y procedimientos de rollback. Este runbook cubre la promocion de primaria a replica, la reconfiguracion de aplicaciones y la validacion post-failover.

## When to Use


- For alternatives, see [Complete Guide to PostgreSQL Replication](/es/guides/complete-guide-postgresql-replication/).

Usa este runbook cuando:
- La base de datos primaria no responde o esta severamente degradada
- Un mantenimiento planificado requiere cambiar a una replica
- El centro de datos primario experimenta una interrupcion
- El failover automatico ha fallado y se requiere intervencion manual

## Prerequisites

Antes de comenzar:
- [ ] Acceso a dashboards de monitoreo de base de datos (lag, conexiones, estado de replicacion)
- [ ] Acceso a gestion de configuracion de aplicaciones (variables de entorno, archivos de config, service mesh)
- [ ] Acceso a consola de DNS o balanceador de carga
- [ ] Equipo de guardia notificado y canal de incidente abierto
- [ ] Replica de lectura confirmada saludable y lag < 5 segundos

## Solution

```markdown
# Runbook de Failover de Base de Datos: `<Nombre del Servicio>`

## 1. Verificar la Falla (2 minutos)

### Verificar Salud del Primario
```bash
# PostgreSQL
psql -h primary.db.internal -U monitor -c "SELECT pg_is_in_recovery();"

# MySQL
mysql -h primary.db.internal -u monitor -e "SHOW STATUS LIKE 'Threads_connected';"
```

| Verificacion | Esperado | Accion si Falla |
|--------------|----------|-----------------|
| Ping al primario | Respuesta < 10ms | Proceder al failover |
| Conteo de conexiones | < max_connections | Verificar tormenta de conexiones |
| Lag de replicacion | N/A (primario) | Confirmar que primario es fuente |
| Espacio en disco | > 10% libre | Si esta lleno, failover es la unica opcion |

### Confirmar que la Replica esta Lista
```bash
# PostgreSQL
psql -h replica.db.internal -U monitor -c "SELECT pg_last_xact_replay_timestamp();"

# MySQL
mysql -h replica.db.internal -u monitor -e "SHOW SLAVE STATUS\G" | grep Seconds_Behind_Master
```

**Puerta de Decision:** Solo proceder si el lag de replica < 5 segundos y el disco de replica es saludable.

## 2. Detener Escrituras al Primario (1 minuto)

```bash
# Configurar aplicacion a modo solo lectura (si disponible)
curl -X POST http://app.internal/admin/read-only

# O bloquear en balanceador de carga
# Bloquear puerto 5432/3306 en grupo de seguridad del primario
```

## 3. Promover Replica a Primario (3 minutos)

### PostgreSQL
```bash
# En la replica
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/data

# Verificar promocion
psql -h replica.db.internal -U monitor -c "SELECT pg_is_in_recovery();"  # Debe retornar false
```

### MySQL
```bash
# En la replica
mysql -u root -e "STOP SLAVE; RESET SLAVE ALL;"

# Verificar
mysql -u root -e "SHOW SLAVE STATUS\G"  # Debe retornar conjunto vacio
mysql -u root -e "SHOW MASTER STATUS;"   # Debe mostrar posicion del binlog
```

### AWS RDS
```bash
aws rds promote-read-replica \
  --db-instance-identifier replica-01 \
  --region us-east-1
```

## 4. Actualizar Configuracion de la Aplicacion (2 minutos)

```bash
# Actualizar variable de entorno o config map
export DB_HOST=replica.db.internal

# Recargar aplicacion (sin tiempo de inactividad si usa pool de conexiones)
sudo systemctl reload app

# O para Kubernetes
kubectl set env deployment/app DB_HOST=replica.db.internal
kubectl rollout status deployment/app
```

## 5. Cambio de DNS / Balanceador de Carga (2 minutos)

| Metodo | Comando | RTO |
|--------|---------|-----|
| Registro DNS A | Actualizar a IP de replica | 5-60 segundos (depende del TTL) |
| Balanceador de carga | Cambiar target group | 10-30 segundos |
| Service mesh (Consul) | Actualizar `consul catalog services` | 5-10 segundos |
| Servicio de Kubernetes | Actualizar endpoint o selector de servicio | Inmediato |

```bash
# Ejemplo: AWS Route53
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://failover-dns.json
```

## 6. Verificar Funcionalidad de la Aplicacion (3 minutos)

```bash
# Health check
curl -f http://app.internal/health

# Prueba de escritura
curl -X POST http://app.internal/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "failover-write-2026-06-26"}'

# Verificacion de lectura
curl http://app.internal/api/test/$(id_from_write)
```

| Verificacion | Estado | Tiempo |
|--------------|--------|--------|
| Health checks pasando | [ ] | ___ |
| Escritura exitosa | [ ] | ___ |
| Lectura correcta | [ ] | ___ |
| Lag de replicacion (nueva replica) | < 1s | ___ |
| Tasa de error < 0.1% | [ ] | ___ |

## 7. Establecer Nueva Replicacion (5 minutos)

### Opcion A: Reparar el Viejo Primario (si recuperable)
```bash
# Reconfigurar viejo primario como replica
# PostgreSQL
pg_basebackup -h new-primary.db.internal -D /var/lib/postgresql/data -Fp -Xs -P
# Editar recovery.conf o postgresql.auto.conf con primary_conninfo
sudo -u postgres pg_ctl start
```

### Opcion B: Crear Nueva Replica
```bash
# Desde snapshot o backup base
aws rds create-db-instance-read-replica \
  --db-instance-identifier new-replica-01 \
  --source-db-instance-identifier new-primary-01
```

## 8. Acciones Post-Incidente

- [ ] Actualizar linea de tiempo del incidente con tiempos exactos de cada paso
- [ ] Capturar logs del viejo primario para analisis de causa raiz
- [ ] Documentar perdida de datos (si hay) con IDs de transaccion exactos
- [ ] Programar postmortem dentro de 24 horas
- [ ] Actualizar este runbook con lecciones aprendidas
```

## Explanation

El runbook separa **verificacion** (confirmar falla, confirmar salud de replica) de **ejecucion** (promocion, cambio) y **validacion** (pruebas de escritura/lectura). La puerta de decision en el paso 1 previene failovers hacia una replica no saludable. El cambio de DNS se prefiere sobre reinicios de aplicacion porque minimiza el RTO y evita retrasos por calentamiento de pools de conexion.

## Variants

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Replicacion en streaming de PostgreSQL | `pg_ctl promote` | Mas rapido, requiere streaming WAL saludable |
| MySQL GTID | `STOP SLAVE; RESET SLAVE ALL;` | GTID simplifica encontrar la posicion correcta |
| AWS RDS Multi-AZ | Failover automatico | Solo usar este runbook para cross-region o promocion manual |
| Kubernetes StatefulSet | Orquestador Patroni / Stolon | El operador maneja la promocion; runbook para falla del operador |

## Lo que funciona

1. **Prueba este runbook mensualmente** en un entorno de staging — no durante el incidente
2. **Automatiza los health checks** en los pasos 1 y 6 con scripts, no consultas manuales
3. **Usa pooling de conexiones** (PgBouncer, ProxySQL) para evitar retrasos de TTL DNS
4. **Monitorea el lag de replicacion continuamente** — lag > 30s debe alertar al equipo de guardia
5. **Documenta el ID de transaccion exacto** en la promocion para calculo de perdida de datos

## Common Mistakes

1. **Hacer failover a una replica con lag** — resulta en perdida de datos y errores de aplicacion
2. **No detener escrituras antes de la promocion** — cerebro dividido, conjuntos de datos divergentes
3. **Olvidar actualizar la config de la aplicacion** — apps reconectan al viejo primario fallido
4. **No verificar escrituras post-failover** — fallas silenciosas pasan desapercibidas por horas
5. **Omitir configurar nueva replica** — ejecutando sin redundancia despues del failover

## Frequently Asked Questions

### Como se si la replica esta al dia?

PostgreSQL: `pg_last_xact_replay_timestamp()` debe estar dentro de 5 segundos de `now()`. MySQL: `Seconds_Behind_Master` debe ser 0. Siempre verificar antes de promover.

### Que pasa si el viejo primario vuelve online despues del failover?

Apagalo inmediatamente o configuralo como replica. Un viejo primario que acepta escrituras crea un escenario de cerebro dividido. El enfoque mas seguro: apagarlo hasta poder reconfigurarlo.

### Como minimizo el RTO durante un failover?

Usa un balanceador de carga o service mesh en lugar de DNS. Pre-configura el endpoint de replica en la aplicacion con un pooler de conexiones. Automatiza el paso de promocion con un script que retorne en menos de 10 segundos.

## Soluciones Avanzadas

### Script de failover automatizado con verificaciones pre-flight

Combina todos los pasos del runbook en un solo script ejecutable con puertas de seguridad:

```bash
#!/bin/bash
# failover.sh - Automated database failover with pre-flight checks
# Usage: ./failover.sh [--force] [--dry-run]

set -euo pipefail

FORCE=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

PRIMARY_HOST="primary.db.internal"
REPLICA_HOST="replica.db.internal"
DB_USER="monitor"
MAX_LAG_SECONDS=5

log() { echo "[$(date -u +%H:%M:%S)] $1"; }

# Step 1: Pre-flight checks
log "Running pre-flight checks..."

# Check primary is actually down
if ping -c 1 -W 2 "$PRIMARY_HOST" &>/dev/null && ! $FORCE; then
  log "ERROR: Primary is reachable. Use --force to override."
  exit 1
fi

# Check replica lag
log "Checking replica lag..."
PG_LAG=$(psql -h "$REPLICA_HOST" -U "$DB_USER" -t -c \
  "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null | xargs)

if (( $(echo "$PG_LAG > $MAX_LAG_SECONDS" | bc -l) )) && ! $FORCE; then
  log "ERROR: Replica lag is ${PG_LAG}s (max: ${MAX_LAG_SECONDS}s). Use --force to override."
  exit 1
fi

log "Pre-flight checks passed. Replica lag: ${PG_LAG}s"

if $DRY_RUN; then
  log "DRY RUN: Would proceed with failover."
  exit 0
fi

# Step 2: Enable read-only mode
log "Enabling read-only mode..."
curl -sS -X POST http://app.internal/admin/read-only || log "WARN: Could not enable read-only mode"

# Step 3: Promote replica
log "Promoting replica to primary..."
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/data

# Verify promotion
IS_RECOVERY=$(psql -h "$REPLICA_HOST" -U "$DB_USER" -t -c "SELECT pg_is_in_recovery();" | xargs)
if [ "$IS_RECOVERY" != "f" ]; then
  log "ERROR: Promotion failed. pg_is_in_recovery returned: $IS_RECOVERY"
  exit 1
fi
log "Promotion successful."

# Step 4: Update application config
log "Updating application configuration..."
kubectl set env deployment/app DB_HOST="$REPLICA_HOST"
kubectl rollout status deployment/app --timeout=120s

# Step 5: Verify
log "Running post-failover verification..."
sleep 5
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" http://app.internal/health)
if [ "$HTTP_CODE" != "200" ]; then
  log "ERROR: Health check failed with HTTP $HTTP_CODE"
  exit 1
fi

WRITE_RESULT=$(curl -sS -X POST http://app.internal/api/test \
  -H "Content-Type: application/json" \
  -d "{\"test\": \"failover-$(date +%s)\"}" -w "\n%{http_code}")

WRITE_CODE=$(echo "$WRITE_RESULT" | tail -1)
if [ "$WRITE_CODE" != "200" ] && [ "$WRITE_CODE" != "201" ]; then
  log "ERROR: Write test failed with HTTP $WRITE_CODE"
  exit 1
fi

log "Failover complete. All verifications passed."
log "Next steps:"
log "  1. Establish new replication (Step 7 of runbook)"
log "  2. Update incident timeline"
log "  3. Schedule postmortem"
```

### Configuracion de failover automatizado con Patroni

Para PostgreSQL, Patroni proporciona failover automatizado con health checks y gestion de cluster:

```yaml
# patroni.yml
name: postgres-cluster
scope: pgsql
restapi:
  listen: 0.0.0.0:8008
  connect_address: $(HOSTIP):8008

etcd:
  hosts: etcd1.internal:2379,etcd2.internal:2379,etcd3.internal:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 20
    maximum_lag_on_failover: 1048576  # 1MB
    maximum_lag_on_syncnode: 1048576
    synchronous_mode: true
    synchronous_mode_strict: false
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_segments: 8
        archive_mode: "on"
        archive_timeout: 1800s
      recovery_conf:
        restore_command: "wal-g wal-fetch %f %p"

postgresql:
  listen: 0.0.0.0:5432
  connect_address: $(HOSTIP):5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/bin
  pg_hba:
    - "replication replicator 0.0.0.0/0 md5"
    - "host all all 0.0.0.0/0 md5"
  replication:
    username: replicator
    password: "${REPLICATION_PASSWORD}"
    network: 0.0.0.0/0
  superuser:
    username: postgres
    password: "${POSTGRES_PASSWORD}"

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

### Verificacion de consistencia de datos post-failover

Verifica la integridad de datos despues del failover comparando logs de transacciones:

```python
import psycopg2
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class FailoverVerification:
    promoted_node: str
    old_primary_lsn: str  # Log sequence number at failure
    new_primary_lsn: str  # LSN at promotion
    transactions_lost: int
    consistency_ok: bool

def verify_failover_consistency(
    new_primary_host: str,
    old_primary_lsn: str,
    db_user: str = "monitor",
) -> FailoverVerification:
    """Verify data consistency after a database failover."""
    conn = psycopg2.connect(host=new_primary_host, user=db_user, dbname="postgres")
    cur = conn.cursor()

    # Get current LSN on new primary
    cur.execute("SELECT pg_current_wal_lsn();")
    new_lsn = cur.fetchone()[0]

    # Count transactions since promotion point
    cur.execute("""
        SELECT count(*) FROM pg_stat_activity
        WHERE state = 'active' AND xact_start > now() - interval '5 minutes';
    """)
    active_txns = cur.fetchone()[0]

    # Check for replication slot health
    cur.execute("""
        SELECT slot_name, active, restart_lsn
        FROM pg_replication_slots;
    """)
    slots = cur.fetchall()

    # Verify all slots are active
    all_active = all(slot[1] for slot in slots) if slots else True

    # Estimate lost transactions (simplified)
    lost = 0 if old_primary_lsn == "unknown" else estimate_lost(old_primary_lsn, new_lsn)

    result = FailoverVerification(
        promoted_node=new_primary_host,
        old_primary_lsn=old_primary_lsn,
        new_primary_lsn=new_lsn,
        transactions_lost=lost,
        consistency_ok=all_active,
    )

    cur.close()
    conn.close()
    return result

def estimate_lost(old_lsn: str, new_lsn: str) -> int:
    """Estimate lost transactions between two LSNs."""
    # Parse LSN format (e.g., '0/17000058')
    try:
        old_parts = [int(x, 16) for x in old_lsn.split("/")]
        new_parts = [int(x, 16) for x in new_lsn.split("/")]
        old_bytes = old_parts[0] * 0x100000000 + old_parts[1]
        new_bytes = new_parts[0] * 0x100000000 + new_parts[1]
        diff = new_bytes - old_bytes
        # Rough estimate: 1 transaction ~ 200 bytes average
        return max(0, diff // 200)
    except (ValueError, IndexError):
        return 0

# Example usage
result = verify_failover_consistency(
    new_primary_host="replica.db.internal",
    old_primary_lsn="0/17000058",
)
print(f"Promoted node: {result.promoted_node}")
print(f"Transactions lost (est.): {result.transactions_lost}")
print(f"Replication slots healthy: {result.consistency_ok}")
```

## Mejores Practicas Adicionales

1. **Usa poolers de conexiones para minimizar el impacto del failover.** PgBouncer o ProxySQL pueden apuntar a una IP virtual que actualizas durante el failover, evitando reinicios de aplicacion:

```ini
# pgbouncer.ini
[databases]
appdb = host=primary.db.internal port=5432 dbname=appdb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
```

Durante el failover, actualiza solo la configuracion de PgBouncer y recarga:

```bash
# Update pgbouncer to point to new primary
sed -i 's/primary.db.internal/replica.db.internal/' /etc/pgbouncer/pgbouncer.ini
kill -HUP $(cat /var/run/pgbouncer/pgbouncer.pid)
```

2. **Mantén un arbol de decision de failover para escenarios complejos.** No todo failover es directo. Documenta puntos de decision:

```markdown
## Failover Decision Tree

1. Is primary down?
   - Yes → Go to step 2
   - No but degraded → Can you fix without failover? (restart, kill long queries)
     - Yes → Fix and monitor
     - No → Go to step 2

2. Is replica lag < 5s?
   - Yes → Proceed with failover
   - No → Can you wait 60s for lag to decrease?
     - Yes → Wait and recheck
     - No → Failover with data loss (document lost transactions)

3. Is this a planned failover?
   - Yes → Enable maintenance mode first
   - No → Open incident channel, notify stakeholders
```

## Errores Comunes Adicionales

1. **No probar el failover en condiciones similares a produccion.** Probar en staging con bajo trafico no revela agotamiento de pools de conexiones o problemas de cache DNS. Ejecuta simulacros de failover durante ventanas de bajo trafico en produccion trimestralmente. Documenta que fallo y arreglalo antes de la falla real.

2. **Olvidar actualizar el monitoreo despues del failover.** Tu sistema de monitoreo sigue rastreando el viejo primario. Despues del failover, actualiza dashboards, reglas de alerta y health checks para apuntar al nuevo primario. De lo contrario obtienes alertas falsas o pierdes problemas reales:

```bash
# Update Prometheus targets after failover
kubectl patch servicemonitor postgres-exporter \
  -p '{"spec":{"endpoints":[{"port":"http-metrics","path":"/metrics","targetPort":9187}]}}'

# Update Grafana datasource if using direct connection
curl -X PATCH http://grafana.internal/api/datasources/1 \
  -H "Content-Type: application/json" \
  -d '{"url":"http://new-primary.db.internal:5432"}'
```

## FAQs Adicionales

### Cual es la diferencia entre replicacion sincrona y asincrona para failover?

La replicacion sincrona garantiza que una transaccion se escribe en la replica antes de que el primario confirme el commit al cliente. Esto significa cero perdida de datos en el failover pero anade latencia a cada escritura. La replicacion asincrona confirma el commit al cliente inmediatamente y replica en segundo plano, lo cual es mas rapido pero puede perder las ultimas transacciones en el failover. Usa sincrona para datos financieros o criticos, asincrona para workloads de alto throughput donde pequena perdida de datos es aceptable.

### Como manejamos el failover para bases de datos sharded?

Cada shard hace failover independientemente. Mantén un mapa de shards que rastrea cual shard es primario y cual es replica. Durante el failover, actualiza el mapa de shards y enruta el trafico en consecuencia. Herramientas como Vitess (MySQL) o Citus (PostgreSQL) manejan esto automaticamente. Si lo gestionas manualmente, asegurate de que tu capa de enrutamiento lea el mapa de shards dinamicamente en lugar de cachearlo.
