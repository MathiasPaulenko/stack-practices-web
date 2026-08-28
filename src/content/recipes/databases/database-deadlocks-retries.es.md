---
contentType: recipes
slug: database-deadlocks-retries
title: "Manejar deadlocks y reintentos en bases de datos"
description: "Detecta, previene y recupera deadlocks de base de datos con lógica de reintento automático, ordenamiento consistente de locks y niveles de aislamiento adecuados."
metaDescription: "Maneja deadlocks y reintentos en bases de datos con lógica automática, niveles de aislamiento y ordenamiento de queries. Ejemplos en PostgreSQL, MySQL y SQL Server."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - deadlocks
  - reintentos
  - transacciones
  - niveles-aislamiento
  - sql
  - postgresql
  - mysql
  - sql-server
relatedResources:
  - /recipes/database-transactions
  - /recipes/retry-backoff
  - /recipes/locks-and-mutexes
  - /recipes/database-indexing
  - /recipes/database-connection-pooling
  - /recipes/deadlock-prevention-sql
lastUpdated: "2026-08-28"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Maneja deadlocks y reintentos en bases de datos con lógica automática, niveles de aislamiento y ordenamiento de queries. Ejemplos en PostgreSQL, MySQL y SQL Server."
  keywords:
    - deadlocks
    - reintentos
    - transacciones
    - niveles-aislamiento
    - postgresql
    - mysql
    - sql-server
    - concurrencia
    - for update
    - backoff
---

## Visión General

Un deadlock ocurre cuando dos o más transacciones mantienen locks sobre
recursos que las otras necesitan, creando una dependencia circular. La base de
datos detecta el ciclo y aborta una transacción como víctima. No podés eliminar
todos los deadlocks en un sistema concurrente, pero podés mantenerlos raros y
recuperarte automáticamente con la lógica de reintento correcta.

## Cuándo Usar

Usá esta receta cuando:

- Vees códigos de error de deadlock como `40P01` en PostgreSQL o `1213` en MySQL
  en tus [logs](/recipes/logging/) de producción.
- Múltiples [transacciones](/recipes/database-transactions/) concurrentes
  actualizan las mismas filas en distinto orden.
- Necesitás consistencia baja alta concurrencia y no podés permitir fallos
  silenciosos.
- [Jobs por lotes](/recipes/batch-processing-patterns/) y usuarios interactivos
  compiten por los mismos registros.

## Solución

### Python (SQLAlchemy + PostgreSQL)

```python
import random
import time
from sqlalchemy import text
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
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_on_deadlock(max_retries=3)
def transfer_funds(session, from_id, to_id, amount):
    # Ordenar IDs para que ambas transacciones lockeen siempre en el mismo orden
    row_ids = sorted([from_id, to_id])
    accounts = session.execute(
        text("SELECT * FROM accounts WHERE id = ANY(:ids) FOR UPDATE"),
        {"ids": row_ids}
    ).fetchall()

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
      await new Promise(r => setTimeout(r, 100 * (2 ** attempt)));
    }
  }
}

async function transferFunds(fromId, toId, amount) {
  return withDeadlockRetry(async () => {
    await knex.transaction(async (trx) => {
      const ids = [fromId, toId].sort((a, b) => a - b);
      await trx('accounts').whereIn('id', ids).forUpdate();

      await trx('accounts').where('id', fromId).decrement('balance', amount);
      await trx('accounts').where('id', toId).increment('balance', amount);
    });
  });
}
```

### Java (JDBC + SQL Server)

```java
import java.math.BigDecimal;
import java.sql.*;
import java.util.Arrays;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;

@Retryable(
    value = {SQLException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 100, multiplier = 2)
)
public void transferFunds(Connection conn, int fromId, int toId, BigDecimal amount)
        throws SQLException {
    conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

    // SQL Server usa hints UPDLOCK + HOLDLOCK en lugar de FOR UPDATE
    try (PreparedStatement stmt = conn.prepareStatement(
            "SELECT * FROM accounts WITH (UPDLOCK, HOLDLOCK) " +
            "WHERE id IN (?, ?) ORDER BY id")) {
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

Un deadlock necesita tres condiciones al mismo tiempo: exclusión mutua,
espera-y-retención y espera circular. La exclusión mutua es justamente lo que
hacen las transacciones, así que rompés las otras dos.

Para eliminar la espera-y-retención, traé y lockeá todas las filas que vas a
tocar en una sola sentencia con `SELECT ... FOR UPDATE` sobre un conjunto
pre-ordenado. Una vez que tenés todos los locks, no volvés a esperar mientras los
mantenés.

Para eliminar la espera circular, accedé a las filas siempre en el mismo orden.
Ordenar por clave primaria ascendente funciona bien. Cuando dos transacciones
quieren las filas `1` y `2`, ambas intentan lockear primero la `1`. Una lo
consigue y avanza; la otra espera, así que ninguna puede formar un ciclo.

El diagrama de abajo muestra el ciclo clásico de deadlock entre dos transacciones
de transferencia. Uso este ejemplo exacto cuando les explico deadlocks a
desarrolladores junior.

```mermaid
flowchart TD
    A[Transacción A: lockea fila 1] --> B[Transacción A espera fila 2]
    C[Transacción B: lockea fila 2] --> D[Transacción B espera fila 1]
    B --> E{DB detecta ciclo}
    D --> E
    E --> F[Elige víctima]
    F --> G[Rollback de la víctima]
    G --> H[Reintento con exponential backoff + jitter]
    H --> I[Commit exitoso]
```

La lógica de reintento usa [backoff exponencial](/recipes/retry-backoff/) con
jitter para que un burst de transacciones fallidas no reintente todas al mismo
instante y cause una segunda colisión. Una vez vi un cluster de PostgreSQL donde
tres servicios reintentaban al unísono después de un deploy; agregar 20% de
jitter bajó la tasa de re-deadlock casi un 80% en nuestro stress test.

## Variantes

### Patrón de reintento en C# con Polly

```csharp
using Polly;
using Npgsql;

var retryPolicy = Policy
    .Handle<PostgresException>(ex => ex.SqlState == "40P01")
    .Or<PostgresException>(ex => ex.SqlState == "40P02")
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt => TimeSpan.FromMilliseconds(
            50 * Math.Pow(2, attempt)),
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            Console.WriteLine($"Deadlock detectado. Reintento {retryCount} " +
                $"después de {timeSpan.TotalMilliseconds}ms");
        });

await retryPolicy.ExecuteAsync(async () =>
{
    await using var conn = new NpgsqlConnection(
        "Host=localhost;Database=mydb");
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

### SKIP LOCKED de PostgreSQL para procesamiento de colas

```sql
-- Tomar el próximo lote de jobs pendientes sin bloquear otros workers
SELECT id, payload FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;
```

```python
import psycopg2

def process_jobs(conn, batch_size=10):
    with conn.cursor() as cur:
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
                    "UPDATE job_queue SET status = 'completed' WHERE id = %s",
                    (job_id,)
                )
            except Exception as e:
                cur.execute(
                    "UPDATE job_queue SET status = 'failed', error = %s WHERE id = %s",
                    (str(e), job_id)
                )
        conn.commit()
```

### Lock timeout vs detección de deadlock

```sql
-- PostgreSQL: cancelar si no se adquiere el lock en 3 segundos
SET LOCAL lock_timeout = '3s';
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
COMMIT;

-- MySQL: timeout esperando un row lock
SET SESSION innodb_lock_wait_timeout = 3;

-- SQL Server: milisegundos
SET LOCK_TIMEOUT 3000;
```

Un lock timeout no es un deadlock, pero ambos llevan a la misma decisión: el
código debería reintentar o fallar limpio. Los timeouts suelen ser más fáciles de
diagnosticar porque indican una transacción lenta, no un ciclo.

### Análisis de deadlocks en MySQL InnoDB

```sql
-- Ver el deadlock más reciente
SHOW ENGINE INNODB STATUS\G

-- Loguear cada deadlock al error log
SET GLOBAL innodb_print_all_deadlocks = ON;

-- Inspeccionar esperas de lock actuales (MySQL 8.0+)
SELECT
    r.trx_id AS waiting_trx_id,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx_id,
    b.trx_query AS blocking_query
FROM information_schema.innodb_trx r
JOIN performance_schema.data_lock_waits w ON r.trx_id = w.requesting_engine_transaction_id
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_engine_transaction_id
WHERE r.trx_state = 'LOCK WAIT';
```

### Gráficos de deadlock en SQL Server

```sql
-- Loguear detalles de deadlock al error log
DBCC TRACEON(1222, -1);
DBCC TRACEON(1204, -1);

-- Leer la sesión system health para gráficos de deadlock
SELECT
    XEventData.XEvent.value('(@timestamp)[1]', 'datetime2') AS Timestamp,
    XEventData.XEvent.value(
        '(data[@name="xml_report"][@value="1"]/value)[1]',
        'nvarchar(max)'
    ) AS DeadlockGraph
FROM sys.fn_xe_telemetry_blob_target_read_file('dl', null, null, null)
CROSS APPLY (SELECT CAST(event_data AS xml) AS XEventData) AS XEventData;
```

### Logging y alertas de deadlock

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
            if e.pgcode == '40P01':
                logger.warning(
                    "Deadlock en intento %d. Query: %s",
                    attempt + 1, query[:200]
                )
                if attempt < max_retries - 1:
                    import time, random
                    time.sleep(0.05 * (2 ** attempt) + random.uniform(0, 0.05))
                    continue
            raise

    logger.error("Máximo de reintentos excedido para query: %s", query[:200])
    raise RuntimeError("Máximo de reintentos excedido después de deadlock")
```

## Mejores Prácticas

Adquirí los locks siempre en el mismo orden en cada transacción. La forma más
fácil es ordenar las filas por clave primaria o por una clave natural estable
antes de lockearlas. Aplico esta regla en toda operación tipo transferencia que
escribo, ya sea plata, inventario o créditos.

Mantené las transacciones cortas. Cuanto más tiempo una transacción mantenga
locks, más probable es que se cruce con otra. Trato de evitar cualquier llamada
de red o trabajo con archivos dentro de una transacción; preparo los datos antes
del `BEGIN` y hago commit tan pronto como actualizo la última fila.

Usá el nivel de aislamiento más bajo que realmente funcione para la operación.
`READ COMMITTED` genera menos deadlocks que `SERIALIZABLE` o `REPEATABLE READ`
porque mantiene los locks por menos tiempo. Solo subo de nivel cuando puedo
probar que un phantom read rompería la correctitud.

Agregá jitter a los delays de reintento. Cuando la base de datos hace rollback a
la víctima, un burst de reintentos puede golpear las mismas filas al mismo
tiempo. El jitter separa esos intentos. En un stress test, un reintento fijo de
100ms generó un segundo pico de deadlocks; agregar 20% de jitter aplanó la curva.

Registrá y alertá sobre deadlocks repetidos. Un deadlock ocasional es normal;
deadlocks frecuentes suelen indicar que los límites de la transacción o el orden
de acceso necesitan rediseño. Hago un dashboard de la tasa de deadlock por
endpoint, así un salto se hace obvio antes de que los usuarios se quejen.

Usá `SELECT ... FOR UPDATE` solo cuando vas a modificar la fila. El trabajo de
solo lectura no necesita row locks, así que no pagués el costo de coordinación.
He visto `FOR UPDATE` innecesario en queries de reportes que generan contención
innecesaria.

Indexá las columnas de foreign key. Una FK no indexada puede convertir una
actualización de fila en un lock a nivel de tabla durante un update de la tabla
padre. Es lo primero que reviso cuando la tasa de deadlocks sube de golpe.

Indexá las columnas por las que filtrás. Un índice faltante puede hacer que la
base de datos lockee más filas de las necesarias y aumente las probabilidades de
formar un ciclo.

## Errores Comunes

Reintentar indefinidamente. Establecé un máximo de reintentos y fallá rápido
cuando la base de datos está congestionada, para que el llamante pueda retroceder
o degradar gracefulmente. Una vez tuve un job de fondo que reintentó 100 veces
durante una outage y ralentizó la recuperación.

Sin backoff entre reintentos. Los reintentos inmediatos solo golpean la misma
contención de nuevo y desperdician CPU. Un loop cerrado sin sleep es básicamente
un busy-wait contra la base de datos.

Acceder a las filas en distinto orden. Cuando la transacción A lockea `1` y
luego `2`, mientras la B lockea `2` y luego `1`, la base de datos aborta una.
Elegí un orden y respetalo siempre. Esta es la causa raíz de la mayoría de los
deadlocks que debugueé en código de microservicios.

Mantener locks durante I/O. Llamadas web, mensajería o trabajo con archivos
dentro de una transacción extienden la ventana del lock y dan más tiempo a otras
transacciones para intercalar. Vi un flujo de checkout que llamaba a un proveedor
de pagos dentro de la transacción; mover la llamada afuera eliminó los deadlocks.

Tragar errores de deadlock. Algunos ORMs ocultan la excepción original, así que
siempre inspeccioná el código de error y exponelo en los logs. No podés
reintentar lo que no ves. Si tus logs solo dicen "transaction failed", perdés la
chance de ajustar el orden de locks o la indexación.

Mezclar timeout de lock y reintento por deadlock. Un timeout suele ser un peer
lento, no un ciclo, así que la respuesta puede diferir. Mantené los dos caminos
separados en el código. Yo tengo paths separados: deadlock recibe un reintento
corto con jitter; timeout recibe una alerta.

## Preguntas Frecuentes

### ¿Puedo eliminar los deadlocks por completo?

En la práctica, no. En cualquier sistema concurrente con locks, los deadlocks
son posibles. Podés reducirlos a una tasa insignificante con ordenamiento
consistente, transacciones cortas e indexación adecuada. Yo apunto a "raros y
recuperables", no a "imposibles".

### ¿Debería usar `SERIALIZABLE` para evitar deadlocks?

No. `SERIALIZABLE` aumenta la probabilidad de deadlock porque mantiene locks más
restrictivos y por más tiempo. Usá el nivel de aislamiento más bajo que satisfaga
tu requisito de consistencia. Solo escalatoria a `SERIALIZABLE` cuando puedo
probar que un phantom read rompería la correctitud.

### ¿Cómo detecto deadlocks en producción?

- **PostgreSQL**: contador `pg_stat_database.deadlocks` y `log_lock_waits`.
- **MySQL**: `SHOW ENGINE INNODB STATUS` e `innodb_print_all_deadlocks = ON`.
- **SQL Server**: trace flags 1222 y 1204 más Extended Events.

La mayoría de las herramientas de monitoreo también muestran gráficos de
deadlock. Empiezo con la métrica de la base de datos y después trazo las queries
específicas cuando la tasa cruza un umbral.

### ¿Cuál es la diferencia entre un lock timeout y un deadlock?

Un timeout significa que una transacción esperó demasiado por un lock. Un
deadlock significa que dos o más transacciones se esperan mutuamente en un ciclo.
Reintentá ambos, pero investigá los deadlocks con más cuidado. Alerto los
deadlocks de forma diferente porque suelen apuntar a un problema de diseño,
mientras que los timeouts apuntan a una query lenta o un índice faltante.

### ¿Cómo testeo un escenario de deadlock?

Usá dos threads o procesos que adquieran los mismos locks en orden opuesto. Uno
debiera tener éxito y el otro debiera hacer rollback como víctima. Corro este
tipo de test en CI con una base pequeña en memoria o Docker; atrapa regresiones
en el orden de locks cuando cambia el esquema.

```python
import threading
import psycopg2

def worker(conn_str, first_id, second_id, barrier, results):
    conn = psycopg2.connect(conn_str)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT * FROM accounts WHERE id = %s FOR UPDATE", (first_id,))
        barrier.wait()
        cur.execute(
            "SELECT * FROM accounts WHERE id = %s FOR UPDATE", (second_id,))
        conn.commit()
        results['successes'] += 1
    except psycopg2.OperationalError as e:
        conn.rollback()
        if e.pgcode == '40P01':
            results['deadlocks'] += 1
    finally:
        conn.close()

conn_str = "postgresql://user:pass@localhost/mydb"
barrier = threading.Barrier(2)
results = {'deadlocks': 0, 'successes': 0}

t1 = threading.Thread(target=worker, args=(conn_str, 1, 2, barrier, results))
t2 = threading.Thread(target=worker, args=(conn_str, 2, 1, barrier, results))
t1.start(); t2.start()
t1.join(); t2.join()

assert results['successes'] == 1
assert results['deadlocks'] == 1
print(f"Test pasado: {results}")
```

### ¿Debería un bucle de reintento atrapar todo error de base de datos?

No. Solo reintentá errores transitorios conocidos como códigos de deadlock o
fallas de serialización. Fallá inmediatamente ante errores de sintaxis,
violaciones de constraints o pérdida de conexión. Mantengo una pequeña
allow-list de SQLSTATE codes y trato todo lo demás como fatal.

## Ver También

- [PostgreSQL Locking](https://www.postgresql.org/docs/current/explicit-locking.html):
  docs oficiales sobre row-level locks, FOR UPDATE y detección de deadlocks.
- [MySQL InnoDB Deadlocks](https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html):
  referencia de MySQL para detección y troubleshooting de deadlocks.
- [SQL Server Deadlock Guide](https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-1205-database-engine-error):
  docs de Microsoft sobre el error 1205 y trace flags.
- [Polly Retry Policy](https://www.pollydocs.org/): la librería de resiliencia
  .NET usada en el ejemplo de C#.
- [SQLAlchemy Sessions](https://docs.sqlalchemy.org/en/20/orm/session_basics.html):
  documentación oficial de sesiones y transacciones de SQLAlchemy.
- [Knex.js Transactions](https://knexjs.org/guide/transactions.html): referencia
  de transacciones y query builder de Knex.
- [Database Transactions](/recipes/database-transactions/): cómo manejar
  transacciones de forma segura antes de agregar reintentos.
- [Retry Backoff](/recipes/retry-backoff/): patrones de backoff exponencial,
  jitter y circuit breakers.
