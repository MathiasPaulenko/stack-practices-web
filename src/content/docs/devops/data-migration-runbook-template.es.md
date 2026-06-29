---
contentType: docs
slug: data-migration-runbook-template
title: "Plantilla de Runbook de Migracion de Datos"
description: "Una plantilla de runbook para migrar datos entre sistemas de forma segura incluyendo verificaciones pre-migracion, procedimientos de rollback y validacion post-migracion."
metaDescription: "Migra datos de forma segura con esta plantilla de runbook. Cubre verificaciones pre-migracion, pasos de ejecucion, procedimientos de rollback y validacion post-migracion."
difficulty: advanced
topics:
  - devops
  - databases
  - data
tags:
  - runbook
  - data-migration
  - database
  - etl
  - rollback
  - validation
relatedResources:
  - /docs/devops/runbook-database-failover
  - /docs/devops/deployment-rollback-runbook
  - /docs/devops/disaster-recovery-test-plan
  - /docs/feature-specification-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Migra datos de forma segura con esta plantilla de runbook. Cubre verificaciones pre-migracion, pasos de ejecucion, procedimientos de rollback y validacion post-migracion."
  keywords:
    - migracion de datos
    - migracion de base de datos
    - runbook de migracion
    - validacion de datos
    - runbook etl
---

## Overview

Las migraciones de datos estan entre las operaciones mas riesgosas en ingenieria de software. A diferencia de los despliegues de codigo, las migraciones de datos no pueden revertirse con un simple `kubectl rollout undo`. Una migracion fallida puede corromper datos de produccion, violar requisitos de cumplimiento y causar interrupciones extendidas. Esta plantilla de runbook estructura la migracion en fases verificables: preparacion, prueba en seco, ejecucion, validacion y rollback.

## When to Use

Usa este recurso cuando:
- Mueves datos entre versiones o motores de base de datos (MySQL 5.7 a 8.0, PostgreSQL a Aurora)
- Migras de monolito a microservicios (base de datos por servicio)
- Consolidas multiples fuentes de datos en un data warehouse
- Ejecutas cambios de esquema a gran escala que requieren transformacion de datos
- Migras entre proveedores de cloud (AWS RDS a GCP Cloud SQL)

## Prerequisites

Antes de comenzar:
- [ ] Backup completo de sistemas fuente y destino completado y verificado
- [ ] Script de migracion probado con un dataset con volumen similar a produccion
- [ ] Ventana de tiempo de inactividad aprobada por stakeholders (si aplica)
- [ ] Plan de rollback documentado y probado
- [ ] Monitoreo y alertas configurados para fuente y destino

## Solution

```markdown
# Runbook de Migracion de Datos: `<Nombre de la Migracion>`

## 1. Checklist Pre-Migracion

### Sistema Fuente
```bash
# Verificar integridad del backup
pg_dump -h source.db.internal -U admin mydb | gzip > /backups/pre-migration.sql.gz
gunzip -t /backups/pre-migration.sql.gz

# Registrar metricas baseline
psql -h source.db.internal -c "SELECT pg_size_pretty(pg_database_size('mydb'));"
psql -h source.db.internal -c "SELECT COUNT(*) FROM orders;"
psql -h source.db.internal -c "SELECT MAX(updated_at) FROM orders;"
```

| Metrica | Valor | Notas |
|---------|-------|-------|
| Tamano de base de datos | ______ | |
| Conteos de filas por tabla | ______ | |
| Ultimo timestamp de actualizacion | ______ | |
| Conexiones activas | ______ | |
| Lag de replicacion | ______ | |

### Sistema Destino
- [ ] Esquema de destino creado y coincide con estructura fuente
- [ ] Indices de destino construidos y validados
- [ ] Capacidad de almacenamiento de destino > 2x tamano esperado de datos
- [ ] Conectividad de red verificada entre fuente y destino
- [ ] Baseline de rendimiento de destino establecido

### Aplicacion
- [ ] Feature flags configurados para escritura dual o lectura-post-escritura
- [ ] Codigo de aplicacion desplegado que soporta ambos sistemas viejo y nuevo
- [ ] Dashboards de monitoreo actualizados con metricas del sistema destino

## 2. Seleccion de Estrategia de Migracion

| Estrategia | Tiempo de Inactividad | Complejidad | Caso de Uso |
|------------|----------------------|-------------|-------------|
| Big Bang | Minutos a horas | Baja | Datasets pequenos (< 100GB), esquema simple |
| Incremental / Batch | Casi cero | Media | Datasets grandes, puede tolerar consistencia eventual |
| Escritura Dual | Cero | Alta | Sistemas en vivo que requieren 100% disponibilidad |
| CDC (Change Data Capture) | Casi cero | Alta | Replicacion continua, tiempo de inactividad minimo |

### Registro de Decision
**Estrategia seleccionada:** ______

**Justificacion:** ______

## 3. Ejecucion de Prueba en Seco

```bash
# Ejecutar migracion en una copia de datos de produccion
# NO conectar a sistemas de produccion

cp /backups/pre-migration.sql.gz /tmp/dry-run.sql.gz
gunzip /tmp/dry-run.sql.gz

# Ejecutar script de migracion
psql -h target-staging.db.internal -f /tmp/dry-run.sql

# Validar prueba en seco
./scripts/validate-migration.sh \
  --source source-staging.db.internal \
  --target target-staging.db.internal
```

| Resultado de Prueba en Seco | Estado |
|----------------------------|--------|
| Duracion | ______ |
| Filas migradas | ______ |
| Errores encontrados | ______ |
| Validacion aprobada | [ ] |

**Puerta de Decision:** Solo proceder a produccion si la prueba en seco completo sin errores y la validacion paso.

## 4. Ejecucion de Migracion en Produccion

### Paso 4a: Backup Final
```bash
# Crear backup point-in-time inmediatamente antes de la migracion
aws rds create-db-snapshot \
  --db-instance-identifier source-db \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d-%H%M%S)
```

### Paso 4b: Detener Escrituras (si se usa Big Bang)
```bash
# Configurar aplicacion a solo lectura
curl -X POST http://app.internal/admin/maintenance-mode

# Verificar que no hay escrituras activas
psql -h source.db.internal -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';"
```

### Paso 4c: Ejecutar Migracion
```bash
# Registrar tiempo de inicio de migracion
MIGRATION_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Migracion iniciada: $MIGRATION_START"

# Ejecutar migracion
psql -h target.db.internal -f migration-script.sql 2>&1 | tee migration.log

# Registrar tiempo de fin de migracion
MIGRATION_END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Migracion finalizada: $MIGRATION_END"
```

### Paso 4d: Reanudar Escrituras (si aplica)
```bash
# Verificar que destino es saludable antes de cambiar escrituras
curl -X POST http://app.internal/admin/target-health-check

# Cambiar aplicacion a destino
curl -X POST http://app.internal/admin/switch-datastore \
  -H "Content-Type: application/json" \
  -d '{"target": "new-database"}'

# Reanudar operaciones normales
curl -X POST http://app.internal/admin/normal-mode
```

## 5. Validacion Post-Migracion

### Verificacion de Conteo de Filas
```sql
-- Comparar conteos de filas para todas las tablas principales
SELECT 'source_orders' as table_name, COUNT(*) as row_count FROM source.orders
UNION ALL
SELECT 'target_orders', COUNT(*) FROM target.orders
UNION ALL
SELECT 'source_users', COUNT(*) FROM source.users
UNION ALL
SELECT 'target_users', COUNT(*) FROM target.users;
```

### Verificaciones de Integridad de Datos
```sql
-- Comparacion de checksums para tablas criticas
SELECT 'source', SUM(CHECKSUM(id, amount, created_at)) FROM source.payments
UNION ALL
SELECT 'target', SUM(CHECKSUM(id, amount, created_at)) FROM target.payments;

-- Verificar que no hay valores NULL en columnas requeridas
SELECT COUNT(*) FROM target.orders WHERE customer_id IS NULL;
SELECT COUNT(*) FROM target.orders WHERE created_at IS NULL;
```

### Smoke Tests de Aplicacion
```bash
# Flujos criticos de usuario
./scripts/smoke-test.sh --environment=production

# Comparacion de baseline de rendimiento
./scripts/performance-test.sh --target=new-db --baseline=old-db
```

| Verificacion | Fuente | Destino | Coincide | Tiempo |
|--------------|--------|---------|----------|--------|
| Conteo total de filas | ______ | ______ | [ ] | ______ |
| Conteos a nivel de tabla | ______ | ______ | [ ] | ______ |
| Checksum de pagos | ______ | ______ | [ ] | ______ |
| Verificaciones de constraint NULL | N/A | ______ | [ ] | ______ |
| Smoke tests aprobados | N/A | ______ | [ ] | ______ |
| Rendimiento dentro de 10% | ______ | ______ | [ ] | ______ |

## 6. Procedimiento de Rollback

### Condiciones de Disparo
Rollback si OCURRE CUALQUIERA de los siguientes:
- Tasa de error > 1% despues de la migracion
- Falla la verificacion de integridad de datos
- Degradacion de rendimiento > 50%
- Funcion orientada al cliente rota

### Pasos de Rollback
```bash
# 1. Detener escrituras a destino inmediatamente
curl -X POST http://app.internal/admin/maintenance-mode

# 2. Cambiar aplicacion de vuelta a fuente
curl -X POST http://app.internal/admin/switch-datastore \
  -d '{"target": "source-database"}'

# 3. Reanudar operaciones en fuente
curl -X POST http://app.internal/admin/normal-mode

# 4. NO BORRAR datos de destino hasta que se resuelva la causa raiz
# 5. Documentar todos los hallazgos para el postmortem
```

| Paso de Rollback | Estado | Tiempo |
|------------------|--------|--------|
| Modo de mantenimiento activado | [ ] | ______ |
| Fuente restaurada como primaria | [ ] | ______ |
| Aplicacion cambiada | [ ] | ______ |
| Smoke tests aprobados en fuente | [ ] | ______ |
| Datos de destino preservados | [ ] | ______ |

## 7. Acciones Post-Migracion

- [ ] Monitorear sistema destino por minimo 24 horas
- [ ] Comparar tasas de error entre pre y post migracion
- [ ] Validar backup del sistema destino
- [ ] Actualizar runbook con duracion real y problemas encontrados
- [ ] Programar limpieza de datos fuente (despues de retencion de 30 dias)
- [ ] Documentar lecciones aprendidas
- [ ] Cerrar canal de incidente cuando este estable
```

## Explanation

El runbook separa **preparacion** (backups, pruebas en seco) de **ejecucion** (la migracion real) y **validacion** (verificaciones de integridad de datos). La idea critica es la **puerta de decision** despues de la prueba en seco — nunca ejecutes una migracion no probada en produccion. El procedimiento de rollback esta disenado para ser rapido (minutos, no horas) porque los problemas de datos se componen con el tiempo.

## Variants

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Actualizacion de version de base de datos | `pg_dumpall` / `pg_upgrade` | Probar en OS y versiones identicas de PostgreSQL |
| Migracion entre proveedores de cloud | AWS DMS / GCP Database Migration Service | Validacion integrada, pero monitorear lag de replicacion |
| Extraccion de microservicios | Patron de escritura dual | Complejo, pero sin tiempo de inactividad; requiere cambios en aplicacion |
| ETL a data warehouse | Cargas batch con Airflow | Programar durante ventanas de bajo trafico |
| NoSQL a SQL | Scripts de transformacion personalizados | El diseno de esquema es la parte mas dificil; probar queries exhaustivamente |

## Lo que funciona

1. **Siempre ejecuta una prueba en seco** con datos a escala de produccion en un entorno aislado
2. **Nunca modifiques la fuente** durante la migracion — acceso solo lectura previene corrupcion accidental
3. **Valida incrementalmente** — verifica conteos de filas por tabla, no solo totales
4. **Preserva ambos sistemas** hasta que la validacion este completa y estable
5. **Documenta la duracion real vs. estimada** — mejora la planificacion futura

## Common Mistakes

1. **No probar con volumen de datos de produccion** — datasets pequenos ocultan problemas de rendimiento
2. **Modificar datos fuente durante la migracion** — crea inconsistencia que no puede reconciliarse
3. **Saltar el ensayo del rollback** — descubres que el rollback no funciona cuando mas lo necesitas
4. **Eliminar datos fuente demasiado pronto** — la validacion puede revelar problemas horas despues de la migracion
5. **No monitorear el comportamiento de la aplicacion** — exito de migracion de base de datos != exito de aplicacion

## Frequently Asked Questions

### Como manejo migraciones muy grandes (TB+)?

Usa un enfoque incremental: migra datos historicos en lotes durante periodos de bajo trafico, luego usa CDC para el delta final. Herramientas como AWS DMS, Debezium o scripts batch personalizados funcionan bien. Planifica dias o semanas, no horas.

### Que pasa si los esquemas fuente y destino difieren?

Documenta el cambio en el script de migracion y valida cada campo cambiado. Problemas comunes: conversiones de zona horaria, codificaciones de caracteres, valores enum y columnas nullable. Prueba casos de borde en la prueba en seco.

### Cuanto tiempo debo mantener los datos fuente despues de la migracion?

Minimo 30 dias para la mayoria de sistemas. Para datos regulados por cumplimiento, sigue tu politica de retencion (frecuentemente 90 dias o mas). Mantenlos hasta que estes confiado de que la migracion es estable y todos los consumidores downstream han verificado sus integraciones.
