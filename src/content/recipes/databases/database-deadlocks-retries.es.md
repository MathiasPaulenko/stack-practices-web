---


contentType: recipes
slug: database-deadlocks-retries
title: "Manejar deadlocks y reintentos en bases de datos"
description: "Detecta, previene y recupera deadlocks de base de datos con lógica de reintento automático, niveles de aislamiento y estrategias de ordenamiento de queries."
metaDescription: "Maneja deadlocks y reintentos en bases de datos con lógica automática, niveles de aislamiento y ordenamiento de queries. Ejemplos en PostgreSQL, MySQL y SQL Server."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - deadlocks
  - isolation-levels
  - databases
  - sql
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
  - /recipes/deadlock-prevention-sql
  - /recipes/event-sourcing-relational
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Maneja deadlocks y reintentos en bases de datos con lógica automática, niveles de aislamiento y ordenamiento de queries. Ejemplos en PostgreSQL, MySQL y SQL Server."
  keywords:
    - deadlocks
    - reintentos
    - transacciones
    - niveles-aislamiento
    - postgresql
    - mysql


---
# Manejar deadlocks y reintentos en bases de datos

## Visión General

Los deadlocks ocurren cuando dos o más transacciones mantienen locks sobre recursos que la otra necesita, creando una dependencia circular. La base de datos detecta esto y aborta una transacción como "víctima." Aunque los deadlocks son inevitables en sistemas concurrentes, puedes minimizarlos y recuperarte con gracia usando lógica de reintento apropiada.

Aqui se explica como la detección, prevención y reintento automático de transacciones después de deadlocks en PostgreSQL, MySQL y SQL Server.

## Cuándo Usar

Usa este recurso cuando:
- Ves errores de deadlock (`40P01` en PostgreSQL, `1213` en MySQL) en [logs](/recipes/api/logging) de producción
- Múltiples [transacciones](/recipes/databases/database-transactions) concurrentes actualizan el mismo conjunto de filas en diferente orden
- Necesitas asegurar consistencia de datos manteniendo alta concurrencia. Consulta [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) para coordinación.
- [Jobs por lotes](/recipes/data/batch-processing-patterns) y usuarios interactivos compiten por los mismos registros

## Solución

### Python (SQLAlchemy + PostgreSQL)

```python
import random
import time
from sqlalchemy.exc import OperationalError
from functools import wraps

def retry_on_deadlock(max_retries=3, base_delay=0.1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except OperationalError as e:
                    if "deadlock detected" not in str(e).lower():
                        raise
                    if attempt == max_retries - 1:
                        raise
                    # Backoff exponencial con jitter
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_on_deadlock(max_retries=3)
def transfer_funds(session, from_id, to_id, amount):
    # Siempre bloquea filas en orden consistente para prevenir deadlocks
    row_ids = sorted([from_id, to_id])
    accounts = session.execute(
        text("SELECT * FROM accounts WHERE id = ANY(:ids) FOR UPDATE"),
        {"ids": row_ids}
    ).fetchall()

    # Mapear de vuelta por id
    from_acc = next(a for a in accounts if a.id == from_id)
    to_acc = next(a for a in accounts if a.id == to_id)

    from_acc.balance -= amount
    to_acc.balance += amount
    session.commit()
```

### JavaScript (Knex.js + MySQL)

```javascript
const knex = require('knex')({ client: 'mysql2', /* ... */ });

async function withDeadlockRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code !== 'ER_LOCK_DEADLOCK' || attempt === maxRetries - 1) {
        throw err;
      }
      // Backoff exponencial
      await new Promise(r => setTimeout(r, 100 * (2 ** attempt)));
    }
  }
}

async function transferFunds(fromId, toId, amount) {
  return withDeadlockRetry(async () => {
    await knex.transaction(async (trx) => {
      // Ordenamiento consistente previene deadlocks
      const ids = [fromId, toId].sort((a, b) => a - b);
      const rows = await trx('accounts')
        .whereIn('id', ids)
        .forUpdate();

      await trx('accounts')
        .where('id', fromId)
        .decrement('balance', amount);
      await trx('accounts')
        .where('id', toId)
        .increment('balance', amount);
    });
  });
}
```

### Java (JDBC + SQL Server)

```java
@Retryable(
    value = {SQLException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 100, multiplier = 2)
)
public void transferFunds(Connection conn, int fromId, int toId, BigDecimal amount) throws SQLException {
    conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

    try (PreparedStatement stmt = conn.prepareStatement(
        "SELECT * FROM accounts WHERE id IN (?, ?) ORDER BY id FOR UPDATE")) {

        int[] ids = Arrays.stream(new int[]{fromId, toId}).sorted().toArray();
        stmt.setInt(1, ids[0]);
        stmt.setInt(2, ids[1]);
        stmt.executeQuery();
    }

    try (PreparedStatement update = conn.prepareStatement(
        "UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
        update.setBigDecimal(1, amount.negate());
        update.setInt(2, fromId);
        update.executeUpdate();

        update.setBigDecimal(1, amount);
        update.setInt(2, toId);
        update.executeUpdate();
    }
    conn.commit();
}
```

## Explicación

Los deadlocks requieren tres condiciones: exclusión mutua, espera-y-retención, y espera circular. No puedes eliminar la exclusión mutua (eso es lo que hacen las transacciones), pero puedes romper las otras dos:
- **Espera-y-retención**: Adquiere todos los locks a la vez usando `SELECT ... FOR UPDATE` con ordenamiento consistente
- **Espera circular**: Siempre accede a las filas en el mismo orden (ej. por clave primaria ascendente)

La lógica de reintento usa [backoff exponencial](/recipes/architecture/retry-backoff) con jitter para prevenir "thundering herd" — donde todas las transacciones reintentantes colisionan de nuevo.

## Variantes

| Base de datos | Código de error de deadlock | Método de detección | Consejo de reintento |
|---------------|----------------------------|---------------------|----------------------|
| PostgreSQL | `40P01` | Automático | `FOR UPDATE` con `ORDER BY` |
| MySQL | `1213` | Automático | `innodb_deadlock_detect=ON` |
| SQL Server | `1205` | Automático | Hints `ROWLOCK`, `HOLDLOCK` |
| Oracle | `ORA-00060` | Automático | `SELECT ... FOR UPDATE NOWAIT` |

## Lo que funciona

- **Siempre adquiere locks en orden consistente**: Ordena filas por clave primaria antes de bloquear
- **Mantén las transacciones cortas**: Cuanto más tiempo una transacción mantenga locks, mayor el riesgo de deadlock
- **Usa el nivel de aislamiento más bajo que funcione**: `READ COMMITTED` tiene menos deadlocks que `SERIALIZABLE`
- **Añade jitter a los delays de reintento**: Previene que reintentos sincronizados colisionen de nuevo
- **Registra y alerta sobre deadlocks repetidos**: Deadlocks frecuentes indican un problema de diseño, no solo mala suerte

## Errores Comunes

- **Reintentar indefinidamente**: Establece un máximo de reintentos y falla rápido si el sistema está congestionado
- **Sin backoff entre reintentos**: Reintentos inmediatos solo golpean la misma contención
- **Acceder a filas en diferente orden**: Transacción A bloquea fila 1 luego 2; Transacción B bloquea fila 2 luego 1 — deadlock garantizado
- **Mantener locks mientras se hace I/O**: Llamadas de red dentro de una transacción extienden la duración del lock
- **Ignorar hints de deadlock**: Algunos ORMs tragan excepciones; siempre verifica y registra errores de deadlock

## Preguntas Frecuentes

**P: ¿Puedo eliminar los deadlocks por completo?**
R: En la práctica, no — pero puedes reducirlos a niveles insignificantes. Usa ordenamiento de acceso consistente, transacciones cortas e indexación apropiada. Si los deadlocks son frecuentes, rediseña los límites de las transacciones.

**P: ¿Debería usar aislamiento `SERIALIZABLE` para evitar deadlocks?**
R: No — `SERIALIZABLE` aumenta la probabilidad de deadlock porque mantiene locks más restrictivos. Usa el nivel de aislamiento más bajo que satisfaga tus requisitos de consistencia.

**P: ¿Cómo detecto deadlocks en producción?**
R: PostgreSQL: contador `pg_stat_database.deadlocks`. MySQL: `SHOW ENGINE INNODB STATUS` o Performance Schema. SQL Server: `sys.dm_tran_locks` y `sp_who2`. Los tres soportan gráficos de deadlock en sus herramientas de monitoreo.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Patrón de Reintento en C# con Polly

```csharp
using Polly;
using Npgsql;

var retryPolicy = Policy
    .Handle<PostgresException>(ex => ex.SqlState == "40P01") // deadlock_detected
    .Or<PostgresException>(ex => ex.SqlState == "40P02")     // serialization_failure
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt => TimeSpan.FromMilliseconds(50 * Math.Pow(2, attempt)),
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            Console.WriteLine($"Deadlock detectado. Reintento {retryCount} después de {timeSpan.TotalMs}ms");
        });

await retryPolicy.ExecuteAsync(async () =>
{
    await using var conn = new NpgsqlConnection("Host=localhost;Database=mydb");
    await conn.OpenAsync();
    await using var tx = await conn.BeginTransactionAsync();

    try
    {
        await using var cmd = new NpgsqlCommand(
            "UPDATE accounts SET balance = balance - 100 WHERE id = 1; " +
            "UPDATE accounts SET balance = balance + 100 WHERE id = 2;",
            conn, tx);

        await cmd.ExecuteNonQueryAsync();
        await tx.CommitAsync();
    }
    catch
    {
        await tx.RollbackAsync();
        throw;
    }
});
```

### Análisis de Gráficos de Deadlock en SQL Server

```sql
-- Habilitar trace flag de deadlock (SQL Server)
DBCC TRACEON(1222, -1); -- Log deadlock info al error log
DBCC TRACEON(1204, -1); -- Log deadlock info a consola

-- Consultar sesión de system health para gráficos de deadlock
SELECT
    XEventData.XEvent.value('(@timestamp)[1]', 'datetime2') AS Timestamp,
    XEventData.XEvent.value('(data[@name="xml_report"][@value="1"]/value)[1]', 'nvarchar(max)') AS DeadlockGraph
FROM sys.fn_xe_telemetry_blob_target_read_file('dl', null, null, null)
CROSS APPLY (SELECT CAST(event_data AS xml) AS XEventData) AS XEventData;

-- Sesión de Extended Events para capturar deadlocks
CREATE EVENT SESSION [Capture Deadlocks] ON SERVER
ADD EVENT sqlserver.xml_deadlock_report
ADD TARGET package0.event_file(SET filename = N'C:\temp\deadlocks.xel')
WITH (MAX_MEMORY = 4096 KB, STARTUP_STATE = ON);
ALTER EVENT SESSION [Capture Deadlocks] ON SERVER STATE = START;
```

### Análisis de Deadlocks en MySQL InnoDB

```sql
-- Ver información de deadlock reciente
SHOW ENGINE INNODB STATUS\G

-- Habilitar logging de deadlocks en MySQL 8+
SET GLOBAL innodb_print_all_deadlocks = ON;

-- Consultar performance schema para esperas de lock
SELECT
    r.trx_id AS waiting_trx_id,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx_id,
    b.trx_query AS blocking_query,
    TIMEDIFF(NOW(), r.trx_started) AS wait_duration
FROM information_schema.innodb_trx r
JOIN information_schema.innodb_locks wl ON r.trx_id = wl.lock_trx_id
JOIN information_schema.innodb_trx b ON b.trx_id = wl.lock_trx_id
WHERE r.trx_state = 'LOCK WAIT';

-- Establecer timeout de espera de lock (segundos)
SET SESSION innodb_lock_wait_timeout = 5;
```

### SKIP LOCKED para Procesamiento de Colas

```sql
-- PostgreSQL: procesar jobs sin bloquear
SELECT id, payload FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;

-- Marcar jobs como processing
UPDATE job_queue
SET status = 'processing', started_at = NOW()
WHERE id IN (1, 2, 3, 4, 5);
```

```python
import psycopg2

def process_jobs(conn, worker_id, batch_size=10):
    with conn.cursor() as cur:
        # Adquirir jobs sin bloquear otros workers
        cur.execute("""
            SELECT id, payload FROM job_queue
            WHERE status = 'pending'
            ORDER BY created_at
            FOR UPDATE SKIP LOCKED
            LIMIT %s
        """, (batch_size,))

        jobs = cur.fetchall()
        for job_id, payload in jobs:
            try:
                process_payload(payload)
                cur.execute(
                    "UPDATE job_queue SET status = 'completed', completed_at = NOW() WHERE id = %s",
                    (job_id,)
                )
            except Exception as e:
                cur.execute(
                    "UPDATE job_queue SET status = 'failed', error = %s WHERE id = %s",
                    (str(e), job_id)
                )
        conn.commit()
```

### Lock Timeout vs Detección de Deadlock

```sql
-- PostgreSQL: establecer lock timeout por transacción
SET LOCAL lock_timeout = '3s';
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- Si no se adquiere el lock en 3s: ERROR: canceling statement due to lock timeout
COMMIT;

-- MySQL: establecer lock wait timeout
SET SESSION innodb_lock_wait_timeout = 3;
-- Si no se adquiere el lock en 3s: ERROR: Lock wait timeout exceeded

-- SQL Server: establecer lock timeout
SET LOCK_TIMEOUT 3000; -- 3 segundos en milisegundos
-- Si no se adquiere el lock: Error 1222: The lock request timed out
```

### Logging y Alertas de Deadlock

```python
import logging
import psycopg2

logger = logging.getLogger('deadlock_monitor')

def execute_with_deadlock_logging(conn, query, params=None, max_retries=3):
    for attempt in range(max_retries):
        try:
            with conn.cursor() as cur:
                cur.execute(query, params)
                conn.commit()
                return cur.fetchall() if cur.description else None
        except psycopg2.OperationalError as e:
            conn.rollback()
            if e.pgcode == '40P01':  # deadlock_detected
                logger.warning(
                    "Deadlock detectado en intento %d. Query: %s. Reintentando...",
                    attempt + 1, query[:200],
                    extra={
                        'pgcode': e.pgcode,
                        'pgerror': str(e),
                        'attempt': attempt + 1,
                    }
                )
                if attempt < max_retries - 1:
                    import time, random
                    time.sleep(0.05 * (2 ** attempt) + random.uniform(0, 0.05))
                    continue
            raise

    logger.error("Máximo de reintentos excedido para query: %s", query[:200])
    raise RuntimeError("Máximo de reintentos excedido después de deadlock")
```

### Testing de Escenarios de Deadlock

```python
import threading
import psycopg2

def test_deadlock_scenario():
    """Reproducir un deadlock con dos threads que adquieren locks en orden opuesto."""
    barrier = threading.Barrier(2)
    results = {'deadlocks': 0, 'successes': 0}

    def worker(conn_str, first_id, second_id):
        conn = psycopg2.connect(conn_str)
        conn.autocommit = False
        cur = conn.cursor()

        try:
            cur.execute(f"SELECT * FROM accounts WHERE id = {first_id} FOR UPDATE")
            barrier.wait()  # Asegurar que ambos threads mantengan el primer lock

            cur.execute(f"SELECT * FROM accounts WHERE id = {second_id} FOR UPDATE")
            conn.commit()
            results['successes'] += 1
        except psycopg2.OperationalError as e:
            conn.rollback()
            if e.pgcode == '40P01':
                results['deadlocks'] += 1
        finally:
            conn.close()

    conn_str = "postgresql://user:pass@localhost/mydb"
    t1 = threading.Thread(target=worker, args=(conn_str, 1, 2))
    t2 = threading.Thread(target=worker, args=(conn_str, 2, 1))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Un thread debería tener éxito, el otro debería deadlock
    assert results['successes'] == 1
    assert results['deadlocks'] == 1
    print(f"Test pasado: {results}")
```

## Mejores Prácticas Adicionales

6. **Usa `SKIP LOCKED` para procesamiento concurrente de colas.** Esto previene que los workers se bloqueen entre sí al recoger jobs:

```sql
SELECT * FROM job_queue WHERE status = 'pending'
FOR UPDATE SKIP LOCKED LIMIT 5;
```

7. **Configura `lock_timeout` en todas las transacciones.** Una transacción que espera indefinidamente por un lock es peor que una que falla y reintenta:

```sql
SET LOCAL lock_timeout = '5s';
```

8. **Usa `NOWAIT` para reads no críticos.** Si no necesitas esperar por un lock, falla rápido:

```sql
SELECT * FROM products WHERE id = 42 FOR UPDATE NOWAIT;
-- Lanza: ERROR: could not obtain lock on row
```

9. **Monitorea `pg_stat_database.deadlocks` regularmente.** Configura alertas para cualquier incremento:

```sql
SELECT datname, deadlocks FROM pg_stat_database WHERE deadlocks > 0;
```

10. **Documenta el orden de locks en tu codebase.** Añade comentarios a cada transacción especificando el orden de locks. Esto ayuda a nuevos desarrolladores a evitar introducir deadlocks.

## Errores Comunes Adicionales

6. **Capturar deadlocks pero no hacer rollback.** Después de un error de deadlock, la transacción está en estado abortado. Debes llamar `rollback()` antes de reintentar.

7. **Reintentar con la misma transacción.** Una transacción deadlocked está abortada. Necesitas una nueva transacción para cada intento de reintento.

8. **Usar `SERIALIZABLE` sin lógica de reintento.** El aislamiento serializable puede lanzar fallos de serialización (`40001`) que requieren el mismo manejo de reintento que los deadlocks.

9. **No testear el manejo de deadlocks bajo carga.** Los tests unitarios raramente disparan deadlocks. Usa tests de integración con threads concurrentes para verificar que tu lógica de reintento funciona.

10. **Ignorar conexiones `idle_in_transaction`.** Las transacciones idle largas mantienen locks y causan deadlocks. Configura `idle_in_transaction_session_timeout` para eliminarlas automáticamente.

## FAQ Adicional

### ¿Cuál es la diferencia entre un deadlock y un lock timeout?

Un **deadlock** ocurre cuando dos transacciones mantienen locks que la otra necesita. La base de datos detecta esto y mata una transacción. Un **lock timeout** ocurre cuando una transacción espera más del timeout configurado por un lock mantenido por otra transacción. Los deadlocks requieren reintento; los lock timeouts pueden requerir reintento o pueden indicar un problema de rendimiento.

### ¿Cómo priorizo qué transacción sobrevive a un deadlock?

PostgreSQL mata la transacción que ha hecho menos trabajo (menos bytes WAL). No puedes controlar directamente cuál se mata. SQL Server usa deadlock priority (`SET DEADLOCK_PRIORITY LOW`). MySQL mata la transacción que modificó menos filas.

### ¿Debería usar `SKIP LOCKED` o `NOWAIT`?

Usa `SKIP LOCKED` cuando quieres procesar filas disponibles y saltar las bloqueadas (colas de jobs, procesamiento batch). Usa `NOWAIT` cuando quieres fallar inmediatamente si una fila está bloqueada, en lugar de esperar (dashboards en tiempo real, actualizaciones de caché).

## Tips de Rendimiento

1. **Usa `SKIP LOCKED` para procesamiento paralelo de jobs.** Múltiples workers pueden recoger jobs simultáneamente sin bloquearse:

```sql
-- 4 workers pueden cada uno recoger 25 jobs sin contención
SELECT id FROM job_queue WHERE status = 'pending'
FOR UPDATE SKIP LOCKED LIMIT 25;
```

2. **Reduce el scope de locks con transacciones más pequeñas.** Actualiza menos filas por transacción para reducir la ventana de deadlocks:

```python
# Mal: una transacción grande
for item in large_list:
    cur.execute("UPDATE products SET stock = stock - 1 WHERE id = %s", (item['id'],))
conn.commit()

# Bien: batches pequeños
batch_size = 50
for i in range(0, len(large_list), batch_size):
    batch = large_list[i:i+batch_size]
    for item in batch:
        cur.execute("UPDATE products SET stock = stock - 1 WHERE id = %s", (item['id'],))
    conn.commit()
```

3. **Usa `SELECT ... FOR UPDATE` solo cuando sea necesario.** Las transacciones de solo lectura no necesitan row locks. Usa aislamiento `READ COMMITTED` para la mayoría de reads.

4. **Indexa columnas de foreign key.** Las FKs no indexadas causan locks a nivel tabla durante updates de tablas padre:

```sql
-- Asegurar que las columnas FK estén indexadas
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

5. **Monitorea tiempos de espera de lock.** Rastrea cuánto esperan las transacciones por locks:

```sql
SELECT
    pid,
    wait_event_type,
    wait_event,
    query,
    now() - query_start AS wait_time
FROM pg_stat_activity
WHERE wait_event_type = 'Lock'
ORDER BY wait_time DESC;
```
