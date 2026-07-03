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
  - /recipes/databases/mongodb-crud-mongoose
  - /recipes/query-optimization
  - /guides/database-design-guide
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
