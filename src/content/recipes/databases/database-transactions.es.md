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
  - transactions
  - acid
  - sql
  - database
  - python
  - javascript
  - java
relatedResources:
  - /recipes/sql-joins
  - /recipes/api/pagination
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-10"
author: "StackPractices"
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

- Transfieres dinero entre cuentas
- Actualizas inventario después de una compra
- Creas registros relacionados en múltiples tablas
- Aseguras consistencia de lectura para queries de reporting
- Prevenes condiciones de carrera en escrituras concurrentes

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

## Mejores prácticas

- **Mantén transacciones cortas**: Las transacciones largas retienen locks y bloquean otros queries
- **Usa el nivel de aislamiento más bajo** que cumpla tus requerimientos de corrección
- **Siempre maneja rollback**: Usa try/catch/finally para asegurar rollback en error
- **Usa optimistic locking** para datos de alta contención (columnas de versión)
- **Testea escenarios concurrentes**: Simula condiciones de carrera en tu suite de tests
- **Evita input de usuarios dentro de transacciones**: Recolecta datos antes de iniciar la transacción

## Errores comunes

- Olvidar llamar `commit()` o `rollback()`, dejando conexiones idle en transacción
- Ejecutar queries largos dentro de transacciones, causando contención de locks
- Usar `SERIALIZABLE` en todas partes sin entender el costo de rendimiento
- No manejar excepciones de deadlock (código de error 40P01 en PostgreSQL)
- Anidar transacciones sin savepoints

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre una transacción y un batch?**
R: Un batch envía múltiples statements de una vez por eficiencia. Una transacción los envuelve en garantías ACID. Puedes hacer batch dentro de una transacción.

**P: ¿Cuándo debería usar optimistic vs pessimistic locking?**
R: Optimistic (version checks) funciona mejor para datos read-heavy con conflictos raros. Pessimistic (SELECT FOR UPDATE) es mejor para filas hot con mucha escritura.

**P: ¿Puedo usar transacciones con bases de datos NoSQL?**
R: Algunas bases NoSQL soportan transacciones limitadas (MongoDB 4.0+ multi-document ACID, DynamoDB transactions). Muchas no lo hacen.
