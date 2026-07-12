---





contentType: recipes
slug: database-transactions
title: "Transacciones de Base de Datos"
description: "Cómo usar transacciones ACID para garantizar integridad de datos en Python, JavaScript y Java con ejemplos SQL."
metaDescription: "Ejemplos prácticos de transacciones de base de datos en Python, JavaScript y Java. Aprende ACID, BEGIN/COMMIT/ROLLBACK y niveles de aislamiento."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - transactions
  - acid
  - databases
  - sql
relatedResources:
  - /recipes/sql-joins
  - /recipes/pagination
  - /patterns/repository-pattern
  - /recipes/caching-redis
  - /recipes/database-connection-pooling
  - /recipes/database-deadlocks-retries
  - /recipes/database-migrations-safely
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de transacciones de base de datos en Python, JavaScript y Java. Aprende ACID, BEGIN/COMMIT/ROLLBACK y niveles de aislamiento."
  keywords:
    - transacciones base de datos
    - acid
    - transacciones sql
    - commit rollback
    - niveles de aislamiento
    - python transacciones
    - nodejs transacciones
    - java jdbc





---

## Visión general

Una transacción de base de datos es una secuencia de operaciones tratadas como una unidad lógica de trabajo. Las transacciones garantizan las propiedades ACID: Atomicidad, Consistencia, Aislamiento y Durabilidad. Son esenciales para operaciones financieras, gestión de inventario y cualquier mutación de datos multi-paso donde la completitud parcial dejaría los datos en un estado inválido.

## Cuándo usarlo

Usa esta recipe cuando:

- Transfieres dinero entre cuentas. Consulta [Money and Currency](/recipes/data/money-currency) para aritmética decimal exacta.
- Actualizas inventario después de una compra. Consulta [Batch Processing](/recipes/data/batch-processing-patterns) para operaciones masivas.
- Creas registros relacionados en múltiples tablas
- Aseguras consistencia de lectura para queries de reporting
- Prevenes [condiciones de carrera](/recipes/data/race-condition-prevention) en escrituras concurrentes

## Solución

### Python (SQLAlchemy / psycopg2)

```python
import psycopg2

conn = psycopg2.connect("dbname=mydb user=postgres")
cur = conn.cursor()

try:
    cur.execute("BEGIN")
    cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
    print("Transfer committed")
except Exception as e:
    conn.rollback()
    print(f"Rolled back: {e}")
finally:
    cur.close()
    conn.close()
```

### JavaScript (Node.js + pg)

```javascript
const { Pool } = require('pg');
const pool = new Pool();

async function transfer(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
    console.log('Transfer committed');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Rolled back:', e);
  } finally {
    client.release();
  }
}
```

### Java (JDBC)

```java
import java.sql.*;

public class TransactionExample {
    public static void transfer(Connection conn, int fromId, int toId, double amount) throws SQLException {
        conn.setAutoCommit(false);
        try (PreparedStatement debit = conn.prepareStatement("UPDATE accounts SET balance = balance - ? WHERE id = ?");
             PreparedStatement credit = conn.prepareStatement("UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
            debit.setDouble(1, amount);
            debit.setInt(2, fromId);
            debit.executeUpdate();

            credit.setDouble(1, amount);
            credit.setInt(2, toId);
            credit.executeUpdate();

            conn.commit();
            System.out.println("Transfer committed");
        } catch (SQLException e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(true);
        }
    }
}
```

## Niveles de aislamiento SQL

```sql
-- Sintaxis PostgreSQL
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
-- tus operaciones
COMMIT;
```

| Nivel | Dirty Read | Non-Repeatable Read | Phantom Read | Rendimiento |
| ----- | ---------- | ------------------- | ------------ | ----------- |
| READ UNCOMMITTED | Permitido | Permitido | Permitido | Más rápido |
| READ COMMITTED | Prevenido | Permitido | Permitido | Default (PG, Oracle) |
| REPEATABLE READ | Prevenido | Prevenido | Permitido | Default (MySQL) |
| SERIALIZABLE | Prevenido | Prevenido | Prevenido | Más lento, más seguro |

## Lo que funciona

- **Mantén transacciones cortas**: Las transacciones largas retienen locks y bloquean otros queries
- **Usa el nivel de aislamiento más bajo** que cumpla tus requerimientos de corrección
- **Siempre maneja rollback**: Usa try/catch/finally para asegurar rollback en error
- **Usa optimistic locking** para datos de alta contención (columnas de versión). Consulta [Optimistic Locking](/recipes/databases/optimistic-locking) para concurrencia basada en versiones.
- **Testea escenarios concurrentes**: Simula condiciones de carrera en tu suite de tests
- **Evita input de usuarios dentro de transacciones**: Recolecta datos antes de iniciar la transacción

## Errores comunes

- Olvidar llamar `commit()` o `rollback()`, dejando conexiones idle en transacción
- Ejecutar queries largos dentro de transacciones, causando contención de locks
- Usar `SERIALIZABLE` en todas partes sin entender el costo de rendimiento
- No manejar [excepciones de deadlock](/recipes/databases/database-deadlocks-retries) (código de error 40P01 en PostgreSQL)
- Anidar transacciones sin savepoints

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre una transacción y un batch?**
R: Un batch envía múltiples statements de una vez por eficiencia. Una transacción los envuelve en garantías ACID. Puedes hacer batch dentro de una transacción.

**P: ¿Cuándo debería usar optimistic vs pessimistic locking?**
R: Optimistic (version checks) funciona mejor para datos read-heavy con conflictos raros. Pessimistic (SELECT FOR UPDATE) es mejor para filas hot con mucha escritura.

**P: ¿Puedo usar transacciones con bases de datos NoSQL?**
R: Algunas bases NoSQL soportan transacciones limitadas (MongoDB 4.0+ multi-document ACID, DynamoDB transactions). Muchas no lo hacen.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Savepoints para transacciones anidadas

```python
try:
    cur.execute("BEGIN")
    cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")

    # Savepoint antes de operación riesgosa
    cur.execute("SAVEPOINT before_insert")
    try:
        cur.execute("INSERT INTO audit_log (action) VALUES ('transfer')")
    except Exception:
        cur.execute("ROLLBACK TO SAVEPOINT before_insert")
        # Continuar con transacción principal

    cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
except Exception as e:
    conn.rollback()
    print(f"Rolled back: {e}")
```

### Lógica de retry para deadlocks

```python
import time
from psycopg2 import errors

def with_retry(fn, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return fn()
        except errors.DeadlockDetected:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"Deadlock detectado, reintentando en {delay}s...")
            time.sleep(delay)

def transfer(conn, from_id, to_id, amount):
    def _transfer():
        with conn.cursor() as cur:
            cur.execute("BEGIN")
            cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
            cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
            conn.commit()
    return with_retry(_transfer)
```

### Transacción JavaScript con retry

```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 100) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (err.code === '40P01' && attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Deadlock detectado, reintentando en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
}

async function safeTransfer(fromId, toId, amount) {
    return withRetry(async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
            await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    });
}
```

### Transacción Java con Spring `@Transactional`

```java
import org.springframework.transaction.annotation.Transactional;
import org.springframework.retry.annotation.Retryable;
import org.springframework.dao.DeadlockLoserDataAccessException;

@Service
public class TransferService {

    @Retryable(value = DeadlockLoserDataAccessException.class, maxAttempts = 3)
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId)
            .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada"));
        Account to = accountRepository.findById(toId)
            .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada"));

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepository.save(from);
        accountRepository.save(to);

        auditLogRepository.save(new AuditLog("transfer", fromId, toId, amount));
    }
}
```

### Detectar idle-in-transaction

```sql
-- PostgreSQL: encontrar transacciones idle que retienen locks
SELECT
    pid,
    state,
    now() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY duration DESC;

-- Matar sesiones idle-in-transaction largas
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - query_start > interval '5 minutes';
```

### Optimistic locking con columna de versión

```python
def update_with_optimistic_lock(conn, user_id, new_name, expected_version):
    with conn.cursor() as cur:
        cur.execute("BEGIN")
        cur.execute(
            "UPDATE users SET name = %s, version = version + 1 "
            "WHERE id = %s AND version = %s",
            (new_name, user_id, expected_version)
        )
        if cur.rowcount == 0:
            conn.rollback()
            raise ConcurrentModificationError("El usuario fue modificado por otra transacción")
        conn.commit()
```

## Buenas prácticas adicionales

6. **Configura `lock_timeout` para transacciones de escritura.** Previene que las transacciones esperen indefinidamente por locks:

```sql
SET lock_timeout = '5s';
```

7. **Usa `SELECT ... FOR UPDATE` para pessimistic locking.** Bloquea las filas que vas a actualizar para prevenir modificaciones concurrentes:

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Lógica de aplicación aquí
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

8. **Batchea updates dentro de una sola transacción.** Agrupa múltiples updates para reducir overhead de transacción y volumen de WAL:

```python
cur.execute("BEGIN")
for item in items:
    cur.execute("UPDATE inventory SET stock = stock - %s WHERE id = %s", (item.qty, item.id))
conn.commit()
```

9. **Usa `SET TRANSACTION SNAPSHOT` para lecturas consistentes.** Exporta un snapshot de una transacción e impórtalo en otra para lecturas consistentes cross-transacción:

```sql
-- Transacción 1
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT pg_export_snapshot();
-- Retorna '00000003-00000001-1'

-- Transacción 2
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION SNAPSHOT '00000003-00000001-1';
```

10. **Loguea la duración de transacciones.** Rastrea cuánto tardan las transacciones para identificar las long-running:

```python
import time

start = time.monotonic()
try:
    cur.execute("BEGIN")
    # ... operaciones
    conn.commit()
finally:
    elapsed = time.monotonic() - start
    if elapsed > 1.0:
        logger.warning(f"Transacción lenta: {elapsed:.2f}s")
```

## Errores comunes adicionales

6. **Iniciar transacciones antes de tener todos los datos listos.** Recolecta y valida el input del usuario antes de `BEGIN`. Mantener una transacción abierta durante I/O o input del usuario causa contención de locks.

7. **No manejar fallos de serialización.** El aislamiento `SERIALIZABLE` puede lanzar `40001` en conflictos. Siempre implementa lógica de retry para transacciones serializables.

8. **Usar autocommit para operaciones multi-paso.** Sin transacciones explícitas, cada statement se confirma independientemente. Un fallo entre pasos deja datos inconsistentes.

9. **Olvidar cerrar conexiones después del rollback.** El rollback no cierra la conexión. Siempre cierra conexiones en bloques `finally` o usa context managers.

10. **Mezclar DDL y DML en la misma transacción.** Algunas bases de datos (MySQL) confirman implícitamente en statements DDL, rompiendo la atomicidad de la transacción.

## Preguntas frecuentes adicionales

### ¿Cómo manejo transacciones de larga duración?

Divídelas en batches más pequeños. Para backfills, procesa 1.000-10.000 filas por transacción con `COMMIT` entre batches. Para reporting, usa una transacción read-only con `REPEATABLE READ` o una materialized view.

### ¿Qué es una transacción distribuida?

Una transacción distribuida abarca múltiples bases de datos o servicios. Usa two-phase commit (2PC) para consistencia fuerte, o el patrón saga para consistencia eventual. PostgreSQL soporta 2PC via `PREPARE TRANSACTION`.

### ¿Cómo testeo el aislamiento de transacciones?

Usa scripts de test concurrentes que ejecutan transacciones en paralelo y verifican las garantías de aislamiento. Frameworks como `pytest` con `pytest-xdist` o `CompletableFuture` de Java pueden simular acceso concurrente.

### ¿Qué es `idle in transaction` y por qué es malo?

`idle in transaction` significa que una transacción está abierta pero no está ejecutando queries. Retiene locks, previene vacuuming y causa bloat. Siempre confirma o haz rollback prontamente. Usa `idle_in_transaction_session_timeout` para auto-matar transacciones atascadas:

```sql
ALTER SYSTEM SET idle_in_transaction_session_timeout = '300s';
```

## Tips de Rendimiento

1. **Mantén transacciones por debajo de 100ms cuando sea posible.** Las transacciones cortas reducen la contención de locks y mejoran el throughput.

2. **Usa `COPY` en lugar de `INSERT` para cargas masivas.** `COPY` es considerablemente más rápido y genera menos WAL:

```sql
BEGIN;
COPY users FROM '/path/to/users.csv' WITH (FORMAT csv, HEADER true);
COMMIT;
```

3. **Configura `synchronous_commit = off` para escrituras no críticas.** Reduce latencia al no esperar el flush de WAL. Usa solo para datos que pueden regenerarse:

```sql
SET LOCAL synchronous_commit = off;
```

4. **Usa advisory locks para coordinación a nivel aplicación.** Evita locks a nivel de fila cuando necesitas coordinación cross-transacción:

```sql
-- Adquirir advisory lock
SELECT pg_advisory_lock(12345);
-- ... lógica de aplicación
SELECT pg_advisory_unlock(12345);
```

5. **Monitorea `pg_locks` para contención.** Identifica transacciones bloqueadas:

```sql
SELECT
    bl.pid AS blocked_pid,
    kl.pid AS blocking_pid,
    a.query AS blocked_query,
    ka.query AS blocking_query
FROM pg_locks bl
JOIN pg_stat_activity a ON bl.pid = a.pid
JOIN pg_locks kl ON bl.locktype = kl.locktype
    AND bl.database IS NOT DISTINCT FROM kl.database
    AND bl.relation IS NOT DISTINCT FROM kl.relation
    AND bl.pid != kl.pid
JOIN pg_stat_activity ka ON kl.pid = ka.pid
WHERE NOT bl.granted;
```
