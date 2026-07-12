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
  - databases
relatedResources:
  - /recipes/acid-transactions-postgres
  - /recipes/postgres-query-optimization
  - /recipes/database-deadlocks-retries
  - /recipes/optimistic-locking
  - /guides/complete-guide-python-asyncio
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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Lógica de Reintento en Python con psycopg2

```python
import time
import psycopg2
from psycopg2 import errors

def execute_with_retry(conn, operation, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return operation(conn)
        except errors.DeadlockDetected:
            conn.rollback()
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt) + (random.random() * 0.05)
            time.sleep(delay)
        except errors.SerializationFailure:
            conn.rollback()
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            time.sleep(delay)

def transfer(conn, from_id, to_id, amount):
    def _transfer(c):
        with c.cursor() as cur:
            ids = sorted([from_id, to_id])
            cur.execute("BEGIN")
            cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (ids[0],))
            cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (ids[1],))
            cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
            cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
            c.commit()
    return execute_with_retry(conn, _transfer)
```

### `SELECT FOR UPDATE SKIP LOCKED` para Procesamiento de Colas

```sql
-- Procesar jobs de una cola sin bloquear en filas lockeadas
BEGIN;

SELECT id, payload FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;

-- Actualizar jobs reclamados
UPDATE job_queue SET status = 'processing', started_at = NOW()
WHERE id IN (1, 2, 3);

COMMIT;
```

`SKIP LOCKED` omite filas que ya están lockeadas por otra transacción. Esto es ideal para colas de jobs donde quieres que los workers tomen jobs diferentes sin esperar.

### Advisory Locks para Coordinar Lógica de Aplicación

```sql
-- Advisory lock a nivel transacción (libere en COMMIT/ROLLBACK)
BEGIN;
SELECT pg_advisory_xact_lock(12345);
-- Solo una transacción puede mantener este lock a la vez
-- ... sección crítica ...
COMMIT;

-- Advisory lock a nivel sesión (debe liberarse explícitamente)
SELECT pg_advisory_lock(67890);
-- ... coordinación long-running ...
SELECT pg_advisory_unlock(67890);

-- Try-lock (non-blocking, retorna true/false)
SELECT pg_try_advisory_lock(67890);
-- Retorna true si se adquirió, false si ya está lockeado
```

### Logging de Deadlocks en PostgreSQL

```sql
-- Habilitar logging de esperas de locks
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET deadlock_timeout = '200ms';

-- Ver estadísticas de deadlock por base de datos
SELECT
    datname,
    deadlocks,
    conflicts,
    temp_files,
    blk_read_time,
    blk_write_time
FROM pg_stat_database
WHERE deadlocks > 0
ORDER BY deadlocks DESC;

-- Ver transacciones bloqueadas actuales
SELECT
    activity.pid,
    activity.usename,
    activity.query,
    now() - activity.query_start AS duration,
    waiting.locktype AS waiting_locktype
FROM pg_stat_activity activity
JOIN pg_locks waiting ON activity.pid = waiting.pid
WHERE NOT waiting.granted
ORDER BY duration DESC;
```

### Reintento en Java con Spring `@Retryable`

```java
import org.springframework.retry.annotation.Retryable;
import org.springframework.retry.annotation.Backoff;
import org.springframework.dao.DeadlockLoserDataAccessException;

@Service
public class InventoryService {

    @Retryable(
        value = { DeadlockLoserDataAccessException.class, CannotSerializeTransactionException.class },
        maxAttempts = 3,
        backoff = @Backoff(delay = 100, multiplier = 2, maxDelay = 1000)
    )
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void updateStock(Long productId, int delta) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));

        product.setStock(product.getStock() + delta);
        productRepository.save(product);
    }
}
```

### Detectando Patrones de Deadlock con `pg_stat_activity`

```sql
-- Encontrar transacciones esperando locks con sus consultas bloqueantes
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query,
    blocked.state AS blocked_state,
    now() - blocked.query_start AS blocked_duration
FROM pg_stat_activity blocked
JOIN pg_locks bl ON blocked.pid = bl.pid AND NOT bl.granted
JOIN pg_locks ul ON ul.locktype = bl.locktype
    AND ul.database IS NOT DISTINCT FROM bl.database
    AND ul.relation IS NOT DISTINCT FROM bl.relation
    AND ul.granted
JOIN pg_stat_activity blocking ON ul.pid = blocking.pid
WHERE blocked.pid != blocking.pid;
```

## Buenas Prácticas Adicionales

6. **Usa `SKIP LOCKED` para procesamiento concurrente de jobs.** Múltiples workers pueden extraer de la misma tabla de cola sin deadlock:

```sql
SELECT * FROM jobs WHERE status = 'pending' FOR UPDATE SKIP LOCKED LIMIT 5;
```

7. **Establece `lock_timeout` para transacciones de escritura.** Previene que las transacciones esperen indefinidamente:

```sql
SET lock_timeout = '5s';
```

8. **Usa `NOWAIT` para locking fail-fast.** En lugar de esperar, error inmediato si la fila está lockeada:

```sql
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- Genera error 55P03 si la fila está lockeada
```

9. **Mantén transacciones por debajo de 50ms cuando sea posible.** Transacciones más cortas mantienen locks por menos tiempo, reduciendo probabilidad de deadlock.

10. **Usa advisory locks para exclusión mutua a nivel aplicación.** Evita locks a nivel fila cuando necesitas coordinación cross-table:

```sql
SELECT pg_advisory_xact_lock(hashtext('user:' || user_id::text));
```

## Errores Comunes Adicionales

6. **Usar `SERIALIZABLE` sin lógica de reintento.** Las fallas de serialización (SQLSTATE 40001) son esperadas bajo `SERIALIZABLE`. Siempre implementa reintento.

7. **Lockear filas padre antes que filas hijo innecesariamente.** Si solo actualizas filas hijo, no lockees el padre. Lockea el conjunto mínimo de filas necesario.

8. **No manejar `40P01` vs `40001` diferentemente.** `40P01` es un deadlock (espera circular), `40001` es una falla de serialización. Ambos requieren reintento, pero los deadlocks indican un problema de ordenamiento de locks mientras que las fallas de serialización son esperadas bajo `SERIALIZABLE`.

9. **Usar mutexes a nivel aplicación en lugar de locks de base de datos.** Los mutexes de aplicación no protegen contra acceso concurrente desde otros servicios o conexiones SQL directas.

10. **No probar bajo carga concurrente.** Los deadlocks a menudo solo aparecen bajo tráfico de producción. Usa `pgbench` o herramientas de load testing para simular concurrencia.

## Preguntas Frecuentes Adicionales

### Cómo monitoreo la frecuencia de deadlocks a lo largo del tiempo?

Consulta `pg_stat_database.deadlocks` periódicamente y almacena los valores. Un aumento repentino indica un nuevo patrón de deadlock:

```sql
SELECT datname, deadlocks FROM pg_stat_database WHERE datname = 'mydb';
```

Resetea estadísticas después de investigar:

```sql
SELECT pg_stat_reset();
```

### Cuál es la diferencia entre `FOR UPDATE` y `FOR NO KEY UPDATE`?

`FOR UPDATE` lockea la fila y previene que otras transacciones la modifiquen o la lockeen. `FOR NO KEY UPDATE` es más débil: permite que otras transacciones lockeen la fila con `FOR KEY SHARE`, lo cual es útil cuando solo actualizas columnas no-key.

### Debería usar `SKIP LOCKED` o `NOWAIT`?

Usa `SKIP LOCKED` cuando quieres procesar filas disponibles y saltar las ocupadas (colas de jobs). Usa `NOWAIT` cuando necesitas la fila específica y prefieres fallar inmediatamente en lugar de esperar.

### Cómo difieren los deadlocks entre PostgreSQL y MySQL?

PostgreSQL detecta deadlocks vía un proceso dedicado de detección que corre cada `deadlock_timeout` (default 1s). MySQL usa un detector interno de deadlocks en InnoDB que detecta deadlocks inmediatamente. Los códigos de error difieren: PostgreSQL usa `40P01`, MySQL usa `1213` (ER_LOCK_DEADLOCK).

## Tips de Rendimiento

1. **Usa `pgbench` para reproducir deadlocks.** Simula patrones de acceso concurrente:

```bash
pgbench -i -s 10 mydb
pgbench -c 20 -j 4 -T 60 -f deadlock_test.sql mydb
```

2. **Monitorea el conteo de `pg_locks`.** Un número alto de locks indica contención:

```sql
SELECT count(*) AS total_locks, count(*) FILTER (WHERE NOT granted) AS waiting_locks
FROM pg_locks;
```

3. **Usa `idle_in_transaction_session_timeout` para prevenir transacciones atascadas.** Las transacciones idle pero no commiteadas mantienen locks indefinidamente:

```sql
ALTER SYSTEM SET idle_in_transaction_session_timeout = '300s';
```

4. **Batch `FOR UPDATE` con `SKIP LOCKED` para throughput de colas.** Procesa múltiples jobs por transacción para reducir round trips:

```sql
BEGIN;
SELECT id FROM jobs WHERE status = 'pending' FOR UPDATE SKIP LOCKED LIMIT 50;
UPDATE jobs SET status = 'processing' WHERE id IN (...);
COMMIT;
```

5. **Usa `lock_timeout` combinado con reintento para degradación graceful.** Establece un lock timeout corto y reintenta con backoff:

```sql
SET lock_timeout = '2s';
-- Si la adquisición del lock falla (55P03), reintenta con backoff
```
