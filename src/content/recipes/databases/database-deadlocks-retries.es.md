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
  - deadlocks
  - retries
  - transactions
  - isolation-levels
  - postgresql
  - mysql
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
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

Esta receta cubre la detección, prevención y reintento automático de transacciones después de deadlocks en PostgreSQL, MySQL y SQL Server.

## Cuándo Usar

Usa este recurso cuando:
- Ves errores de deadlock (`40P01` en PostgreSQL, `1213` en MySQL) en logs de producción
- Múltiples transacciones concurrentes actualizan el mismo conjunto de filas en diferente orden
- Necesitas asegurar consistencia de datos manteniendo alta concurrencia
- Jobs por lotes y usuarios interactivos compiten por los mismos registros

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

La lógica de reintento usa backoff exponencial con jitter para prevenir "thundering herd" — donde todas las transacciones reintentantes colisionan de nuevo.

## Variantes

| Base de datos | Código de error de deadlock | Método de detección | Consejo de reintento |
|---------------|----------------------------|---------------------|----------------------|
| PostgreSQL | `40P01` | Automático | `FOR UPDATE` con `ORDER BY` |
| MySQL | `1213` | Automático | `innodb_deadlock_detect=ON` |
| SQL Server | `1205` | Automático | Hints `ROWLOCK`, `HOLDLOCK` |
| Oracle | `ORA-00060` | Automático | `SELECT ... FOR UPDATE NOWAIT` |

## Mejores Prácticas

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
