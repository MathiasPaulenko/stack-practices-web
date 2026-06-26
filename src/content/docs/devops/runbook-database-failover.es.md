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
  - /docs/devops/disaster-recovery-test-plan
  - /docs/devops/deployment-rollback-runbook
  - /docs/devops/data-migration-runbook-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/downtime-communication-template
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

## Best Practices

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
