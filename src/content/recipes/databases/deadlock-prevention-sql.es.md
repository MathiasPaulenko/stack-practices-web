---
contentType: recipes
slug: deadlock-prevention-sql
title: "Prevencion y Resolucion de Deadlocks en Transacciones SQL"
description: "Identifica patrones de deadlock en bases de datos SQL, aplica ordenamiento consistente de locks, usa niveles de aislamiento apropiados e implementa logica de reintento para transacciones concurrentes resilientes"
metaDescription: "Previene y resuelve deadlocks en SQL. Aplica ordenamiento de locks, niveles de aislamiento y reintento para transacciones concurrentes."
difficulty: intermediate
topics:
  - databases
  - concurrency
tags:
  - deadlocks
  - isolation-levels
  - sql
  - concurrency
relatedResources:
  - /recipes/databases/acid-transactions-postgres
  - /recipes/databases/postgres-query-optimization
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Previene y resuelve deadlocks en SQL. Aplica ordenamiento de locks, niveles de aislamiento y reintento para transacciones concurrentes."
  keywords:
    - sql deadlock
    - isolation levels
    - concurrent transactions
    - lock ordering
    - retry logic
---

# Prevencion y Resolucion de Deadlocks en Transacciones SQL

Los deadlocks ocurren cuando dos transacciones mantienen locks que la otra necesita, creando una espera circular. Esta recipe cubre detectar patrones de deadlock, aplicar ordenamiento consistente de locks, elegir niveles de aislamiento sabiamente e implementar logica de reintento client-side para resiliencia de base de datos en produccion.

## Cuando Usar Esto

- [Transacciones](/recipes/databases/database-transactions) concurrentes fallan intermitentemente con errores de deadlock
- [Operaciones batch](/recipes/data/batch-processing-patterns) y transacciones user-facing compiten por las mismas filas
- Se requiere row-level locking pero el rendimiento debe permanecer aceptable

## Problema

Dos transferencias de fondos concurrentes entre cuentas A y B deadlock porque la Transaccion 1 lockea A y espera por B, mientras la Transaccion 2 lockea B y espera por A.

## Solucion

### 1. Ordenamiento Consistente de Locks

```typescript
// transactions/TransferService.ts
class TransferService {
  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    // Siempre lockea en orden consistente (ej. por ID de cuenta)
    const [first, second] = [fromId, toId].sort();

    await db.transaction(async (trx) => {
      const fromAccount = await trx('accounts')
        .where('id', first)
        .forUpdate()
        .first();

      const toAccount = await trx('accounts')
        .where('id', second)
        .forUpdate()
        .first();

      await trx('accounts')
        .where('id', fromId)
        .decrement('balance', amount);

      await trx('accounts')
        .where('id', toId)
        .increment('balance', amount);
    });
  }
}
```

### 2. Optimistic Locking (Sin Locks de Base de Datos)

```typescript
// transactions/OptimisticUpdate.ts
class InventoryService {
  async updateStock(productId: string, delta: number): Promise<boolean> {
    const result = await db('inventory')
      .where('product_id', productId)
      .where('version', db('inventory')
        .select('version')
        .where('product_id', productId)
      )
      .update({
        quantity: db.raw('quantity + ?', [delta]),
        version: db.raw('version + 1'),
      });

    return result > 0;
  }
}
```

### 3. Seleccion de Nivel de Aislamiento

```sql
-- Read Committed: default, previene dirty reads
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read: previene non-repeatable reads (mayor contencion de locks)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Serializable: aislamiento completo, mayor riesgo de deadlock
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### 4. Logica de Reintento Resiliente a Deadlocks

```typescript
// transactions/RetryWithBackoff.ts
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isDeadlockError(error) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

await executeWithRetry(() => transferService.transfer('A', 'B', 100));
```

### 5. Detectando Deadlocks en PostgreSQL

```sql
-- Ver locks actuales
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation = blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Log de detalles de deadlock
SHOW log_lock_waits;
```

## Como Funciona

- **Ordenamiento consistente** previene esperas circulares adquiriendo locks siempre en la misma secuencia
- **[Optimistic locking](/recipes/databases/optimistic-locking)** usa versionado en lugar de locks de base de datos, reduciendo contencion
- **Niveles de aislamiento** intercambian consistencia contra concurrencia; niveles mas bajos tienen menos deadlocks
- **Logica de reintento** con exponential backoff maneja deadlocks transitorios que se resuelven rapidamente

## Consideraciones de Produccion

- Manten transacciones cortas para minimizar duracion de locks
- Usa `SELECT FOR UPDATE SKIP LOCKED` para workloads tipo queue. Consulta [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) para coordinación.
- Monitorea `pg_stat_database.deadlocks` para trackear frecuencia de deadlocks

## Errores Comunes

- Lockear filas en diferente orden en diferentes partes de la aplicacion
- Usar `SELECT FOR UPDATE` en filas innecesarias, incrementando scope del lock
- No reintentar despues de errores de deadlock, causando fallos user-facing

## FAQ

**P: En que se diferencia de una race condition?**
R: Una [race condition](/recipes/data/race-condition-prevention) es un bug dependiente de timing en correccion. Un deadlock es una condicion de bloqueo donde transacciones esperan indefinidamente una a la otra.

**P: Deberia siempre reintentar transacciones deadlock?**
R: Si, con backoff. Los deadlocks son transitorios en sistemas bien disenados y tipicamente tienen exito en el reintento.
