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
  - databases
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/database-sharding-partitioning-guide
  - /docs/disaster-recovery-plan-template
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/event-sourcing-relational
  - /docs/database-schema-documentation-template
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

## Lo que funciona

- **Usa expand-contract para cambios breaking** — agregar nuevo esquema, deployar código, eliminar viejo esquema en migraciones separadas
- **Batch updates grandes** — `UPDATE ... WHERE id BETWEEN 1 AND 10000` en un loop, con sleeps
- **Monitorea lag de replicación** — DDL grande puede bloquear replicación; pausa si el lag excede umbrales. Consulta la [Guía de Optimización de SQL](/guides/databases/sql-performance-tuning-guide) para estrategias de monitoreo.
- **Mantén migraciones idempotentes** — `IF NOT EXISTS` y `IF EXISTS` permiten re-ejecución segura
- **Documenta duración real** — las estimaciones futuras mejoran cuando trackeas la realidad

## Errores Comunes

- Correr migraciones no testeadas en producción — testea en una copia con tamaño de datos realista. Documenta tu esquema con la [Plantilla de Documentación de Esquema de BD](/docs/templates/database-schema-documentation-template).
- Olvidar usar `CONCURRENTLY` — lockea la tabla para escrituras, causando outages
- Transacciones grandes sin batching — un `UPDATE` único en 100M filas lockeará y hará rollback lento
- Sin plan de rollback — "ya se aborda" no es un plan
- Migrar durante pico de tráfico — incluso migraciones seguras agregan carga; agenda off-peak

## Preguntas Frecuentes

### ¿Debería usar una herramienta de migración o SQL raw?

Usa una herramienta (Flyway, Liquibase, Django migrations, Rails migrations). Consulta la [Guía de Optimización de SQL](/guides/databases/sql-performance-tuning-guide) y la [Guía de Sharding de BD](/guides/databases/database-sharding-partitioning-guide) para pautas relacionadas. Las herramientas trackean migraciones aplicadas, enforcean ordenamiento, y proveen hooks de rollback. Los scripts SQL raw requieren trackeo manual y son propensos a errores.

### ¿Cómo manejo una migración fallida en producción?

Detente inmediatamente. No apliques migraciones subsiguientes. Evalúa si hacer rollback o fix forward. Rollback si la integridad de datos está en riesgo. Fix forward si el fix es un script pequeño y bien entendido. Siempre ten el script de rollback listo antes de empezar. Para planificación más amplia de desastres, consulta la [Plantilla de Plan de Recuperación ante Desastres](/docs/templates/disaster-recovery-plan-template).

### ¿Puedo correr migraciones en una transacción?

Sí, para bases de datos DDL-safe (PostgreSQL). Para MySQL, DDL se commitea implícitamente, así que las transacciones no te protegen. Conoce el comportamiento de tu base de datos antes de planear la estrategia de migración.


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Migracion de schema | Expand/contract pattern | Sin downtime; compatible con version vieja y nueva |
| Migracion de datos | Backfill + verificacion | Puede tardar horas; ejecutar en background |
| Migracion de engine | Blue-green con replicacion | Cambiar de MySQL a PostgreSQL por ejemplo |
| Migracion zero-downtime | Expand -> migrate -> contract | 3 fases; cada deploy es independiente |

## Ejemplo de Migracion: Agregar Columna NOT NULL

```text
=== Migracion: Agregar columna email_verified (NOT NULL) ===

Servicio: user-service
Base de datos: PostgreSQL (users table)
Riesgo: Medio (requiere 3 deploys)
Duracion estimada: 2 dias

Fase 1: Expand (Deploy 1)
  - Agregar columna como nullable:
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN;
  - Deploy codigo que escribe a la nueva columna:
    - En cada login, set email_verified = true si email verificado
    - En cada signup, set email_verified = false
  - Backfill datos existentes:
    UPDATE users SET email_verified = true WHERE email IN (SELECT email FROM verified_emails);
    -- Ejecutar en batches de 1000 para no bloquear
  - Verificar: SELECT count(*) FROM users WHERE email_verified IS NULL;
    -- Debe ser 0 despues del backfill

Fase 2: Migrate (Deploy 2)
  - Verificar que no hay NULLs:
    SELECT count(*) FROM users WHERE email_verified IS NULL; -- debe ser 0
  - Agregar constraint NOT NULL:
    ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
  - Agregar default:
    ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
  - Verificar: intentar insertar sin email_verified -> debe usar default

Fase 3: Contract (Deploy 3)
  - Remover codigo que maneja el caso NULL (ya no es posible)
  - Remover codigo de backfill
  - Verificar que la app funciona correctamente
  - Monitorear errores por 24 horas

Rollback:
  - Fase 1: ALTER TABLE users DROP COLUMN email_verified;
  - Fase 2: ALTER TABLE users ALTER COLUMN email_verified DROP NOT NULL;
  - Fase 3: No se puede revertir facilmente; mantener codigo defensivo

Verificacion Post-Migracion:
  - Todos los usuarios tienen email_verified no NULL
  - Nuevos signups tienen email_verified = false
  - Logins verifican email correctamente
  - No hay errores en logs relacionados con la columna
```

### Como manejamos migraciones de base de datos con zero downtime?

Usa el patron expand-contract: Fase 1 (Expand) agrega la nueva estructura sin romper la vieja — la app vieja y nueva funcionan. Fase 2 (Migrate) mueve datos y aplica constraints cuando es seguro. Fase 3 (Contract) remueve la estructura vieja. Cada fase es un deploy independiente. Nunca hagas un ALTER que bloquee la tabla en produccion — usa tools como pt-online-schema-change (MySQL) o CREATE INDEX CONCURRENTLY (PostgreSQL). Para columnas NOT NULL: agregalas como nullable primero, haz backfill, luego agrega el constraint. Para renombrar columnas: agrega la nueva, escribe en ambas, migra lecturas, luego remueve la vieja.

### Que hacemos si una migracion falla a mitad de camino?

Si una migracion falla: evalua el estado actual de la base de datos. Si la migracion no comenzo: no hacer nada, corregir el script y reintentar. Si la migracion comenzo pero no completo: determinar si es seguro reanudar o si hay que revertir. Para migraciones con transacciones: el rollback es automatico. Para migraciones sin transacciones (DDL en MySQL): revertir manualmente con un script de rollback preparado. Si los datos fueron modificados: usar el backup para comparar y restaurar si es necesario. Documenta el fallo y la causa. Nunca fuerces una migracion que fallo — investiga la causa raiz primero. Comunica al equipo si la migracion afecta la disponibilidad.

### Como probamos migraciones antes de produccion?

Prueba migraciones en un entorno que replica produccion: usa un dump de produccion (sanitizado si es necesario) en staging. Ejecuta la migracion y mide el tiempo. Verifica que la app funciona con el nuevo schema. Prueba el rollback — debe funcionar y restaurar el estado anterior. Prueba con datos en gran volumen — una migracion que tarda 1 segundo con 100 filas puede tardar horas con 10 millones. Ejecuta la migracion con la app bajo carga para detectar locks. Usa un checklist de verificacion post-migracion. Si la migracion tiene multiples fases: prueba cada fase independientemente y la secuencia completa.





































































End of document. Review and update quarterly.