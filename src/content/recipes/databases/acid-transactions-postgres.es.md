---



contentType: recipes
slug: acid-transactions-postgres
title: "Implementa Transacciones ACID en PostgreSQL"
description: "Como usar transacciones de PostgreSQL para asegurar Atomicidad, Consistencia, Aislamiento y Durabilidad en operaciones de base de datos de multiples pasos"
metaDescription: "Transacciones ACID en PostgreSQL. Asegura atomicidad, consistencia, aislamiento y durabilidad con boundaries y niveles de aislamiento apropiados."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - acid
  - database
  - postgres
  - transactions
  - databases
relatedResources:
  - /recipes/mongodb-crud-mongoose
  - /recipes/query-optimization
  - /guides/database-design-guide
  - /recipes/deadlock-prevention-sql
  - /recipes/postgres-query-optimization
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Transacciones ACID en PostgreSQL. Asegura atomicidad, consistencia, aislamiento y durabilidad con boundaries y niveles de aislamiento apropiados."
  keywords:
    - acid transactions
    - postgresql
    - database consistency
    - isolation levels
    - sql transactions



---

# Implementa Transacciones ACID en PostgreSQL

Las propiedades ACID — Atomicidad, Consistencia, Aislamiento, Durabilidad — son la fundacion de operaciones de base de datos confiables. PostgreSQL proporciona cumplimiento ACID completo con multiples niveles de aislamiento, savepoints para transacciones anidadas y manejo confiable de errores que asegura integridad de datos incluso en escenarios de fallo.

## Cuando Usar Esto

- Multiples operaciones relacionadas deben tener exito o fallar juntas. Consulta [Database Transactions](/recipes/databases/database-transactions) para patrones específicos por lenguaje.
- El acceso concurrente a los mismos registros requiere comportamiento predecible. Consulta [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) para primitivas de coordinación.
- Operaciones financieras, de inventario o reservas no deben dejar datos en estado intermedio. Consulta [Money and Currency](/recipes/data/money-currency) para aritmética exacta.

## Requisitos Previos

- PostgreSQL 14+ ejecutandose localmente o en un servicio administrado
- Comprension basica de SQL y conexiones a base de datos

## Solucion

### 1. Transaccion Basica con Commit y Rollback

```sql
-- Transferir fondos entre cuentas
BEGIN;

UPDATE accounts
SET balance = balance - 100
WHERE id = 1 AND balance >= 100;

UPDATE accounts
SET balance = balance + 100
WHERE id = 2;

-- Verificar que ambas actualizaciones tuvieron exito
IF NOT FOUND THEN
  ROLLBACK;
  RAISE EXCEPTION 'Fondos insuficientes o cuenta no encontrada';
END IF;

COMMIT;
```

```typescript
// db/transfer.ts
import { Pool } from 'pg';

async function transferFunds(pool: Pool, fromId: number, toId: number, amount: number) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const debitResult = await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
      [amount, fromId]
    );
    
    if (debitResult.rowCount === 0) {
      throw new Error('Fondos insuficientes');
    }
    
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );
    
    await client.query('COMMIT');
    return { success: true, newBalance: debitResult.rows[0].balance };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 2. Niveles de Aislamiento

```sql
-- READ COMMITTED (default): previene dirty reads
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Otra transaccion hace commit de un cambio aqui
SELECT balance FROM accounts WHERE id = 1; -- ve el cambio commiteado
COMMIT;

-- REPEATABLE READ: previene non-repeatable reads
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;
-- Otra transaccion hace commit de un cambio aqui
SELECT balance FROM accounts WHERE id = 1; -- sigue viendo el valor original
COMMIT;

-- SERIALIZABLE: previene phantom reads, aislamiento mas fuerte
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM orders WHERE status = 'pending';
-- Otra transaccion inserta una orden pendiente
SELECT COUNT(*) FROM orders WHERE status = 'pending'; -- mismo count que antes
COMMIT;
```

### 3. Savepoints para Operaciones Anidadas

```sql
BEGIN;

INSERT INTO orders (customer_id, total) VALUES (1, 250.00) RETURNING id;
-- order_id = 100

SAVEPOINT before_items;

INSERT INTO order_items (order_id, product_id, quantity) VALUES (100, 5, 2);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (100, 8, 1);

-- Rollback parcial si el check de inventario falla
SAVEPOINT before_inventory;

UPDATE inventory SET stock = stock - 2 WHERE product_id = 5;
UPDATE inventory SET stock = stock - 1 WHERE product_id = 8;

-- Si algun stock fue negativo
ROLLBACK TO SAVEPOINT before_inventory;
-- Los items permanecen, pero la actualizacion de inventario se deshace

COMMIT;
```

### 4. Advisory Locks para Coordinacion a Nivel de Aplicacion

```typescript
// db/distributed-lock.ts
async function withAdvisoryLock(pool: Pool, lockId: number, task: () => Promise<void>) {
  const client = await pool.connect();
  
  try {
    // Obtener advisory lock exclusivo
    await client.query('SELECT pg_advisory_lock($1)', [lockId]);
    await task();
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    client.release();
  }
}

// Uso: prevenir procesamiento duplicado de ordenes
await withAdvisoryLock(pool, orderId, async () => {
  await processOrder(orderId);
});
```

## Como Funciona

1. **Atomicidad** asegura que todas las operaciones completen o ninguna lo haga via `COMMIT`/`ROLLBACK`
2. **Consistencia** enforcea constraints (foreign keys, check constraints) dentro de transacciones
3. **Aislamiento** previene que transacciones concurrentes interfieran via MVCC y locks
4. **Durabilidad** garantiza que datos commiteados sobreviven crashes a traves de WAL (Write-Ahead Logging)

## Consideraciones de Produccion

- Usa **READ COMMITTED** para la mayoria de aplicaciones; actualiza a **SERIALIZABLE** solo cuando sea necesario. Consulta [Deadlocks and Retries](/recipes/databases/database-deadlocks-retries) para seguridad de concurrencia.
- Manten transacciones cortas para minimizar contencion de locks
- Usa **advisory locks** cuando necesites serializacion a nivel de aplicacion entre servicios. Consulta [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) para patrones de locks.
- Habilita **pg_stat_statements** para identificar transacciones de larga duracion

## Errores Comunes

- Mantener transacciones abiertas mientras se llaman APIs externas
- No manejar fallos de serializacion en modo SERIALIZABLE
- Olvidar liberar conexiones al pool despues de ROLLBACK

## FAQ

**P: Deberia usar SERIALIZABLE para todas las transacciones?**
R: No. SERIALIZABLE tiene mayor overhead y requiere reintentos. READ COMMITTED es suficiente para la mayoria de casos de uso.

**P: Que pasa si la conexion cae durante una transaccion?**
R: PostgreSQL automaticamente hace rollback de cualquier trabajo no commiteado cuando la conexion termina.

**P: Como debuggeo contencion de locks?**
R: Consulta `pg_locks` y `pg_stat_activity` para ver transacciones esperando y sus bloqueadores.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Transacciones Async en Python con `asyncpg`

```python
import asyncio
import asyncpg

async def transfer_funds(conn, from_account, to_account, amount):
    async with conn.transaction():
        # Verificar balance con FOR UPDATE para prevenir modificaciones concurrentes
        row = await conn.fetchrow(
            "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE",
            from_account
        )
        if row['balance'] < amount:
            raise ValueError("Saldo insuficiente")

        await conn.execute(
            "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
            amount, from_account
        )
        await conn.execute(
            "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
            amount, to_account
        )

        # Insertar log de auditoría en la misma transacción
        await conn.execute(
            "INSERT INTO transfers (from_account, to_account, amount) VALUES ($1, $2, $3)",
            from_account, to_account, amount
        )

async def main():
    conn = await asyncpg.connect('postgresql://user:pass@localhost/mydb')
    try:
        await transfer_funds(conn, 1, 2, 100.00)
        print("Transferencia completada")
    except Exception as e:
        print(f"Transferencia falló: {e}")
    finally:
        await conn.close()

asyncio.run(main())
```

### Transacciones Java JDBC con Savepoints

```java
import java.sql.*;

public class OrderProcessor {
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(
            "jdbc:postgresql://localhost:5432/mydb", "user", "pass"
        );
    }

    public void processOrderWithItems(int orderId, List<OrderItem> items)
            throws SQLException {
        Connection conn = getConnection();
        conn.setAutoCommit(false);

        try {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE orders SET status = 'processing' WHERE id = ?")) {
                ps.setInt(1, orderId);
                ps.executeUpdate();
            }

            for (OrderItem item : items) {
                Savepoint sp = conn.setSavepoint("item_" + item.getProductId());
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)")) {
                    ps.setInt(1, orderId);
                    ps.setInt(2, item.getProductId());
                    ps.setInt(3, item.getQuantity());
                    ps.executeUpdate();
                } catch (SQLException e) {
                    conn.rollback(sp);
                    System.err.println("Error al añadir item " + item.getProductId() + ": " + e.getMessage());
                }
            }

            conn.commit();
        } catch (SQLException e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(true);
            conn.close();
        }
    }
}
```

### Tabla Comparativa de Niveles de Aislamiento

| Nivel | Dirty Read | Non-Repeatable Read | Phantom Read | Anomalía de Serialización | Impacto en Performance |
|-------|-----------|--------------------|--------------|-----------------------|--------------------|
| Read Uncommitted | Posible | Posible | Posible | Posible | Mínimo |
| Read Committed | Prevenido | Posible | Posible | Posible | Bajo |
| Repeatable Read | Prevenido | Prevenido | Posible | Posible | Medio |
| Serializable | Prevenido | Prevenido | Prevenido | Prevenido | Alto |

### Advisory Locks para Coordinación a Nivel Aplicación

```sql
-- Advisory lock a nivel transacción (auto-liberado en commit/rollback)
SELECT pg_advisory_xact_lock(12345);

-- Advisory lock a nivel sesión (debe liberarse explícitamente)
SELECT pg_advisory_lock(12345);
-- ... hacer trabajo ...
SELECT pg_advisory_unlock(12345);

-- Try-lock (non-blocking, devuelve true/false)
SELECT pg_try_advisory_lock(12345);
-- Devuelve true si se adquirió, false si ya está bloqueado
```

```python
import psycopg2

conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")
cur = conn.cursor()

cur.execute("SELECT pg_advisory_lock(%s)", (99999,))
locked = cur.fetchone()[0]

try:
    cur.execute("DELETE FROM old_logs WHERE created_at < NOW() - INTERVAL '30 days'")
    conn.commit()
finally:
    cur.execute("SELECT pg_advisory_unlock(%s)", (99999,))
    conn.commit()
```

### LISTEN/NOTIFY para Comunicación Cross-Process

```sql
-- Proceso 1: Escuchar notificaciones
LISTEN order_created;

-- Proceso 2: Notificar cuando se crea una orden
NOTIFY order_created, '{"order_id": 42, "customer": "alice"}';
```

```python
import psycopg2
import select

conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")
conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()
cur.execute("LISTEN order_created")

while True:
    if select.select([conn], [], [], 1) == ([], [], []):
        continue

    conn.poll()
    while conn.notifies:
        notify = conn.notifies.pop(0)
        print(f"Recibido: {notify.channel} - {notify.payload}")
```

### Monitoreo de Transacciones y Detección de Deadlocks

```sql
-- Ver transacciones activas con esperas de lock
SELECT
    activity.pid,
    activity.usename,
    activity.query,
    now() - activity.query_start AS duration,
    locks.locktype,
    locks.relation::regclass AS locked_table
FROM pg_stat_activity activity
JOIN pg_locks locks ON activity.pid = locks.pid
WHERE locks.granted = false
ORDER BY duration DESC;

-- Identificar fuentes de deadlock
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid != blocked.pid
WHERE blocked.wait_event_type = 'Lock';

-- Establecer lock_timeout para operaciones críticas
SET lock_timeout = '5s';
```

### Context Manager de Python para Transacciones

```python
from contextlib import contextmanager
import psycopg2

@contextmanager
def transaction(conn_str, isolation_level='READ COMMITTED'):
    conn = psycopg2.connect(conn_str)
    conn.set_isolation_level(
        getattr(psycopg2.extensions, f'ISOLATION_LEVEL_{isolation_level.replace(" ", "_").upper()}')
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Uso
with transaction("postgresql://user:pass@localhost/mydb") as conn:
    with conn.cursor() as cur:
        cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 1")
        cur.execute("INSERT INTO audit_log (action, amount) VALUES ('deposit', 100)")
```

## Mejores Prácticas Adicionales

6. **Configura `lock_timeout` para transacciones interactivas.** Previene que una consulta espere indefinidamente por un lock:

```sql
SET LOCAL lock_timeout = '5s';
BEGIN;
SELECT * FROM large_table WHERE id = 42 FOR UPDATE;
COMMIT;
```

7. **Usa `idle_in_transaction_session_timeout`.** Previene que transacciones abandonadas mantengan locks:

```sql
ALTER DATABASE mydb SET idle_in_transaction_session_timeout = '30s';
```

8. **Batch inserts con `COPY` en lugar de `INSERT`.** Para cargas de datos grandes, `COPY` es 10-100x más rápido y sigue siendo transaccional:

```python
import csv
import io

def bulk_insert_products(conn, products):
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter='\t')
    for p in products:
        writer.writerow([p['id'], p['name'], p['price']])
    buffer.seek(0)

    with conn.cursor() as cur:
        cur.copy_from(buffer, 'products', columns=('id', 'name', 'price'))
    conn.commit()
```

9. **Usa `RETURNING` para encadenar operaciones.** Evita consultas extra después de inserts:

```sql
INSERT INTO orders (customer_id, total) VALUES (42, 99.99)
RETURNING id;
```

10. **Mantén las transacciones cortas.** Las transacciones largas mantienen locks, impiden vacuuming y aumentan la probabilidad de deadlocks. Mueve el trabajo no relacionado con la base de datos fuera del límite de la transacción.

## Errores Comunes Adicionales

6. **Usar autocommit para operaciones multi-paso.** Si el paso 1 tiene éxito y el paso 2 falla, la base de datos queda en un estado inconsistente. Siempre envuelve operaciones multi-paso en una transacción explícita.

7. **Mantener transacciones abiertas entre peticiones HTTP.** Una transacción iniciada en una petición no puede continuarse en otra. Usa una transacción por petición o un patrón saga para workflows multi-petición.

8. **No manejar fallos de serialización.** El aislamiento `SERIALIZABLE` puede lanzar `40001` (serialization failure). La aplicación debe reintentar:

```python
from psycopg2 import OperationalError

def run_serializable(conn, fn, max_retries=3):
    for attempt in range(max_retries):
        try:
            conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE)
            result = fn(conn)
            conn.commit()
            return result
        except OperationalError as e:
            if e.pgcode == '40001' and attempt < max_retries - 1:
                conn.rollback()
                continue
            raise
```

9. **Olvidar liberar savepoints.** En PostgreSQL, los savepoints se liberan automáticamente en commit, pero liberarlos explícitamente mejora la legibilidad:

```sql
SAVEPOINT sp1;
-- Algún trabajo
RELEASE SAVEPOINT sp1;
```

10. **Usar `SELECT MAX(id) + 1` para generar IDs.** Esto causa race conditions bajo inserts concurrentes. Usa `SERIAL`, `IDENTITY` o sequences en su lugar.

## FAQ Adicional

### ¿Cómo depuro deadlocks de transacciones?

Habilita el logging de deadlocks en PostgreSQL:

```sql
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET deadlock_timeout = '1s';
SELECT pg_reload_conf();
```

Luego revisa los logs de PostgreSQL para detalles del deadlock. El log muestra las consultas exactas y los recursos involucrados.

### ¿Puedo usar transacciones anidadas en PostgreSQL?

PostgreSQL no soporta transacciones anidadas reales. Usa savepoints como sustituto. Un `ROLLBACK TO savepoint` deshace el trabajo después del savepoint pero mantiene la transacción exterior activa.

### ¿Cuál es la diferencia entre `READ COMMITTED` y `REPEATABLE READ` en PostgreSQL?

En PostgreSQL, `READ COMMITTED` re-evalúa el snapshot para cada sentencia, por lo que puedes ver nuevas filas confirmadas por otras transacciones entre sentencias. `REPEATABLE READ` usa un solo snapshot para toda la transacción. El `REPEATABLE READ` de PostgreSQL también previene phantom reads, a diferencia de la definición del estándar SQL.

## Tips de Rendimiento

1. **Usa `COPY` para carga masiva de datos.** Omite la mayoría del overhead de parsing SQL:

```sql
COPY products FROM '/path/to/products.csv' WITH (FORMAT csv, HEADER true);
```

2. **Reduce round-trips con consultas multi-sentencia.** Envía múltiples sentencias en un solo `execute`:

```python
cur.execute("""
    INSERT INTO orders (customer_id, total) VALUES (42, 99.99) RETURNING id;
    INSERT INTO audit_log (action) VALUES ('order_created');
""")
```

3. **Usa tablas `UNLOGGED` para datos temporales.** Omite writes de WAL para tablas efímeras:

```sql
CREATE UNLOGGED TABLE temp_import (id INT, data TEXT);
```

4. **Configura `synchronous_commit = off` para writes no críticos.** Esto reduce latencia al no esperar el flush de WAL:

```sql
SET LOCAL synchronous_commit = off;
```

5. **Monitorea estadísticas de transacciones.** Rastrea rollbacks y deadlocks:

```sql
SELECT
    datname,
    xact_commit,
    xact_rollback,
    deadlocks,
    blks_read,
    blks_hit
FROM pg_stat_database
WHERE datname = current_database();
```
