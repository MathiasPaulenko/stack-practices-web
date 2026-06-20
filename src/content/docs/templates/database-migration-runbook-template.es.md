---
contentType: docs
slug: database-migration-runbook-template
templateType: database-migration-runbook
title: "Plantilla de Runbook de Migración de Base de Datos"
description: "Plantilla de runbook de migración de base de datos para ejecutar cambios de esquema de forma segura con procedimientos de rollback, pasos de verificación y planes de comunicación."
metaDescription: "Plantilla de runbook de migración de base de datos: ejecuta cambios de esquema de forma segura con rollback, verificación y comunicación."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - rollback
  - runbook
  - template
relatedResources:
  - /guides/databases/sql-performance-tuning-guide
  - /guides/databases/database-sharding-partitioning-guide
  - /docs/templates/disaster-recovery-plan-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de runbook de migración de base de datos: ejecuta cambios de esquema de forma segura con rollback, verificación y comunicación."
  keywords:
    - runbook migracion base de datos
    - template cambio schema
    - checklist deploy base de datos
    - procedimientos migracion segura
    - rollback migracion base de datos
---

# Plantilla de Runbook de Migración de Base de Datos

Usa esta plantilla para ejecutar cambios de esquema de base de datos sin downtime ni pérdida de datos.

## Plantilla

```markdown
# Runbook de Migración: [Nombre de Migración]

## Overview
| Campo | Valor |
|-------|-------|
| **ID de migración** | [timestamp o número secuencial] |
| **Autor** | [nombre] |
| **Revisado por** | [nombre] |
| **Bases de datos afectadas** | [lista] |
| **Duración estimada** | [minutos / horas] |
| **Nivel de riesgo** | [Bajo / Medio / Alto] |

## Checklist Pre-Migración

- [ ] Cambio de esquema revisado por ingeniero senior
- [ ] Script de migración testeado en copia de datos de producción
- [ ] Script de rollback testeado y cronometrado
- [ ] Backups verificados (último backup exitoso < 24 horas)
- [ ] Ventana de mantenimiento agendada (si es necesaria)
- [ ] On-call notificado
- [ ] Dashboards de monitoreo en bookmarks

## Pasos de Migración

### Paso 1: [Acción]
```sql
-- Ejemplo: agregar columna nullable
ALTER TABLE orders ADD COLUMN tracking_url VARCHAR(500) NULL;
```

### Paso 2: [Acción]
```sql
-- Ejemplo: crear índice concurrentemente
CREATE INDEX CONCURRENTLY idx_orders_tracking ON orders(tracking_url);
```

### Paso 3: [Acción]
```sql
-- Ejemplo: backfill de datos
UPDATE orders SET tracking_url = 'https://...' WHERE shipped_at IS NOT NULL;
```

## Verificación

| Check | Query | Resultado Esperado |
|-------|-------|-------------------|
| Esquema aplicado | `\d orders` | Columna `tracking_url` existe |
| Índice creado | `\di idx_orders_tracking` | Índice es válido |
| Sin locks | `pg_locks` | No hay locks de larga duración |
| Salud de app | Dashboard | Tasa de error < línea base |

## Procedimiento de Rollback

```sql
-- Paso 1: eliminar índice
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_tracking;

-- Paso 2: eliminar columna
ALTER TABLE orders DROP COLUMN IF EXISTS tracking_url;
```

| Paso de Rollback | Tiempo | Verificación |
|-----------------|--------|-------------|
| Eliminar índice | < 1 minuto | Plan de query vuelve al anterior |
| Eliminar columna | < 1 minuto | Esquema coincide con pre-migración |

## Post-Migración

- [ ] Tasa de error de aplicación normal
- [ ] Latencia dentro de línea base
- [ ] Lag de replicación aceptable
- [ ] Notas de handoff de on-call actualizadas
- [ ] Runbook archivado con duración real

## Comunicación

| Audiencia | Timing | Mensaje |
|----------|--------|---------|
| Ingeniería | Antes | Ventana de mantenimiento anunciada |
| On-call | Durante | Actualizaciones de estado en tiempo real |
| Stakeholders | Después | All-clear + cualquier issue encontrado |
```

## Reglas de Seguridad de Migración

| Regla | Por Qué | Excepción |
|-------|---------|-----------|
| **Agregar columnas como nullable** | Las filas existentes necesitan un valor | Proporcionar default en la misma transacción |
| **Crear índices concurrentemente** | Evita locks de tabla | No disponible en todas las bases de datos |
| **Backfill en batches** | Previene escalación de locks | Tablas pequeñas (< 1M filas) |
| **Testear rollback primero** | Un rollback que nunca practicaste es una suposición | Ninguna |
| **Correr durante bajo tráfico** | Reduce blast radius | Fixes de emergencia |

## Mejores Prácticas

- **Usa expand-contract para cambios breaking** — agregar nuevo esquema, deployar código, eliminar viejo esquema en migraciones separadas
- **Batch updates grandes** — `UPDATE ... WHERE id BETWEEN 1 AND 10000` en un loop, con sleeps
- **Monitorea lag de replicación** — DDL grande puede bloquear replicación; pausa si el lag excede umbrales. Consulta la [Guía de Optimización de SQL](/guides/databases/sql-performance-tuning-guide) para estrategias de monitoreo.
- **Mantén migraciones idempotentes** — `IF NOT EXISTS` y `IF EXISTS` permiten re-ejecución segura
- **Documenta duración real** — las estimaciones futuras mejoran cuando trackeas la realidad

## Errores Comunes

- Correr migraciones no testeadas en producción — testea en una copia con tamaño de datos realista. Documenta tu esquema con la [Plantilla de Documentación de Esquema de BD](/docs/templates/database-schema-documentation-template).
- Olvidar usar `CONCURRENTLY` — lockea la tabla para escrituras, causando outages
- Transacciones grandes sin batching — un `UPDATE` único en 100M filas lockeará y hará rollback lento
- Sin plan de rollback — "ya veremos" no es un plan
- Migrar durante pico de tráfico — incluso migraciones seguras agregan carga; agenda off-peak

## Preguntas Frecuentes

### ¿Debería usar una herramienta de migración o SQL raw?

Usa una herramienta (Flyway, Liquibase, Django migrations, Rails migrations). Consulta la [Guía de Optimización de SQL](/guides/databases/sql-performance-tuning-guide) y la [Guía de Sharding de BD](/guides/databases/database-sharding-partitioning-guide) para mejores prácticas relacionadas. Las herramientas trackean migraciones aplicadas, enforcean ordenamiento, y proveen hooks de rollback. Los scripts SQL raw requieren trackeo manual y son propensos a errores.

### ¿Cómo manejo una migración fallida en producción?

Detente inmediatamente. No apliques migraciones subsiguientes. Evalúa si hacer rollback o fix forward. Rollback si la integridad de datos está en riesgo. Fix forward si el fix es un script pequeño y bien entendido. Siempre ten el script de rollback listo antes de empezar. Para planificación más amplia de desastres, consulta la [Plantilla de Plan de Recuperación ante Desastres](/docs/templates/disaster-recovery-plan-template).

### ¿Puedo correr migraciones en una transacción?

Sí, para bases de datos DDL-safe (PostgreSQL). Para MySQL, DDL se commitea implícitamente, así que las transacciones no te protegen. Conoce el comportamiento de tu base de datos antes de planear la estrategia de migración.
