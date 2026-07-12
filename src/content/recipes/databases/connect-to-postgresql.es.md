---



contentType: recipes
slug: connect-to-postgresql
title: "Conectar a PostgreSQL"
description: "Cómo conectar a bases de datos PostgreSQL en Python, JavaScript y Java."
metaDescription: "Aprende a conectar a bases de datos PostgreSQL usando Python psycopg2, Node.js pg y Java JDBC con ejemplos de código prácticos."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - postgresql
  - python
  - javascript
  - java
  - jdbc
relatedResources:
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/ambassador-pattern
  - /patterns/bridge-pattern
  - /patterns/builder-pattern
  - /recipes/connect-to-mysql
  - /recipes/connect-to-redis
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a conectar a bases de datos PostgreSQL usando Python psycopg2, Node.js pg y Java JDBC con ejemplos de código prácticos."
  keywords:
    - databases
    - postgresql
    - python
    - javascript
    - java
    - jdbc



---
## Visión General

PostgreSQL es la base de datos relacional open-source más popular. Conectarse de forma fiable requiere manejar connection strings, SSL y pools de conexiones. A continuacion se muestra como cómo conectar y consultar PostgreSQL en Python, JavaScript y Java.

## Cuándo Usar


- For alternatives, see [Connect to MySQL](/es/recipes/connect-to-mysql/).

Usa este recurso cuando:
- Construyes aplicaciones web que persisten datos en PostgreSQL
- Migras desde SQLite o MySQL a PostgreSQL
- Configuras pipelines de datos que leen o escriben en PostgreSQL

## Solución

### Python

```python
import psycopg2
from psycopg2.extras import RealDictCursor

# Conexión básica
conn = psycopg2.connect(
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    sslmode="require"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)
cursor.execute("SELECT * FROM users WHERE id = %s", (1,))
row = cursor.fetchone()
cursor.close()
conn.close()
```

### JavaScript

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { rejectUnauthorized: false },
    max: 20
});

async function getUser(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
}
```

### Java

```java
import java.sql.*;

public class PostgresConnect {
    public Connection connect() throws SQLException {
        String url = "jdbc:postgresql://localhost:5432/mydb?sslmode=require";
        return DriverManager.getConnection(url, "user", "pass");
    }

    public void queryUser(int id) throws SQLException {
        try (Connection conn = connect();
             PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                System.out.println(rs.getString("email"));
            }
        }
    }
}
```

## Explicación

Los tres ejemplos usan **consultas preparadas** (parameterized queries) para prevenir inyección SQL. El ejemplo de **Python** usa `psycopg2`, el adaptador estándar de PostgreSQL. El de **JavaScript** usa `pg` con un pool de conexiones, que reutiliza conexiones entre peticiones. El de **Java** usa JDBC, la API estándar de Java para bases de datos, con `try-with-resources` para cerrar conexiones automáticamente.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `asyncpg` | Driver asíncrono de PostgreSQL para asyncio |
| JavaScript | `pg-promise` | Librería helper con transacciones y tareas |
| Java | `HikariCP` | Pool de conexiones JDBC de alto rendimiento |

## Lo que funciona

1. Usa siempre pools de conexiones en producción en lugar de crear conexiones por petición
2. Almacena credenciales en variables de entorno o gestores de secretos, nunca en código
3. Usa SSL (`sslmode=require`) para todas las conexiones de producción
4. Prefiere consultas preparadas sobre concatenación de strings para valores en vivo
5. Cierra cursores y conexiones explícitamente o usa context managers

## Errores Comunes

1. Hardcodear credenciales de base de datos en el código fuente
2. Crear una nueva conexión por cada consulta en lugar de usar un pool
3. Olvidar cerrar conexiones, causando errores de "demasiadas conexiones"
4. Desactivar la verificación SSL en producción (`sslmode=disable`)
5. Usar f-strings de Python o template literals de JS para consultas SQL

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre psycopg2 y psycopg3?

`psycopg2` es el driver maduro y estable. `psycopg3` (ahora simplemente `psycopg`) añade soporte async, mejor manejo de tipos y es la opción recomendada para proyectos nuevos.

### ¿Cuántas conexiones debería tener mi pool?

Un buen punto de partida es `(2 x núcleos CPU) + effective_spindle_count` para la base de datos, dividido entre el número de instancias de la aplicación. Monitorea `pg_stat_activity` y ajusta.

### ¿Debo usar `sslmode=require` o `verify-full`?

Usa `verify-full` cuando tengas el certificado CA y quieras verificar la identidad del servidor. Usa `require` cuando necesites encriptación pero no tengas o confíes en la cadena CA.

### Python con context manager y pool de conexiones

```python
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

# Crear un pool de conexiones
pg_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    sslmode="require"
)

@contextmanager
def get_db_cursor():
    conn = pg_pool.getconn()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
        cursor.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        pg_pool.putconn(conn)

# Uso
with get_db_cursor() as cur:
    cur.execute("SELECT * FROM users WHERE active = %s", (True,))
    rows = cur.fetchall()
    for row in rows:
        print(row)
```

### Python asíncrono con asyncpg

```python
import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        host="localhost",
        database="mydb",
        user="user",
        password="pass",
        ssl="require"
    )

    # Consulta parametrizada
    row = await conn.fetchrow(
        "SELECT * FROM users WHERE id = $1", 1
    )
    print(row)

    # Insert masivo
    await conn.executemany(
        "INSERT INTO logs (level, message) VALUES ($1, $2)",
        [("INFO", "startup"), ("WARN", "alta latencia")]
    )

    await conn.close()

asyncio.run(main())
```

### JavaScript con manejo de transacciones

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

async function transferBalance(fromId, toId, amount) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
            [amount, fromId]
        );

        await client.query(
            'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
            [amount, toId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
```

### Java con pool HikariCP

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

public class PostgresPool {
    private static final HikariDataSource ds;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        config.setUsername("user");
        config.setPassword("pass");
        config.addDataSourceProperty("sslmode", "require");
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(5000);
        ds = new HikariDataSource(config);
    }

    public static Connection getConnection() throws SQLException {
        return ds.getConnection();
    }

    public static void batchInsert(List<String> emails) throws SQLException {
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "INSERT INTO users (email) VALUES (?)")) {
            for (String email : emails) {
                stmt.setString(1, email);
                stmt.addBatch();
            }
            stmt.executeBatch();
        }
    }
}
```

## Variantes adicionales

| Tecnología | Driver | Async | Pooling | Notas |
|------------|--------|-------|---------|-------|
| Python | `psycopg2` | No | Manual o `SimpleConnectionPool` | Maduro, estable |
| Python | `psycopg3` | Sí | Built-in | Recomendado para proyectos nuevos |
| Python | `asyncpg` | Sí | Built-in | Driver async más rápido |
| JavaScript | `pg` | Sí (Promise) | `Pool` built-in | Driver estándar de Node.js |
| JavaScript | `pg-promise` | Sí | Built-in | Helpers extra para tareas |
| Java | JDBC | No | HikariCP | Estándar de la industria |
| Go | `pgx` | Sí | `pgxpool` | Alto rendimiento |

## Buenas prácticas adicionales

6. **Configura `idle_timeout` en las conexiones.** Las conexiones inactivas pueden volverse stale después de un reinicio de base de datos o problema de red. Configura un timeout para reciclarlas automáticamente.
7. **Usa `application_name` para debugging.** Configura `application_name` en el connection string para identificar tu aplicación en `pg_stat_activity`:

```python
conn = psycopg2.connect(
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    application_name="my-api-server"
)
```

8. **Habilita `statement_timeout` a nivel sesión.** Previene que queries descontrolados consuman recursos:

```sql
SET statement_timeout = '10s';
```

9. **Usa `COPY` para inserts masivos.** `COPY` es 10-100x más rápido que `INSERT` individuales para datasets grandes:

```python
import io

buf = io.StringIO()
buf.write("1\talice@example.com\n")
buf.write("2\tbob@example.com\n")
buf.seek(0)

with psycopg2.connect(...) as conn:
    with conn.cursor() as cur:
        cur.copy_from(buf, "users", columns=("id", "email"))
```

10. **Monitorea la salud del pool.** Rastrea conexiones activas, threads en espera y lifetime de conexiones. En HikariCP, usa `getHikariPoolMXBean()` para exponer métricas.

## Errores comunes adicionales

6. **No manejar caídas de conexión.** Problemas de red o reinicios de base de datos pueden invalidar conexiones. Usa lógica de retry o un pool con health checks.
7. **Usar `SELECT *` en código de producción.** Listas explícitas de columnas previenen roturas cuando el schema cambia y reducen overhead de red.
8. **No configurar `serverTimezone` o parámetros `timezone`.** Mismatch de zona horaria causa bugs sutiles con columnas `TIMESTAMPTZ`.
9. **Ignorar `pg_stat_activity`.** Conexiones inactivas largas desperdician recursos. Monitorea y mata conexiones idle que excedan tu timeout.
10. **Usar autocommit para operaciones multi-statement.** Sin transacciones explícitas, fallos parciales dejan datos en estado inconsistente.

## Preguntas frecuentes adicionales

### ¿Cómo manejo fallos de conexión gracefully?

Implementa lógica de retry con backoff exponencial. En Python, usa `tenacity` o una librería similar. En Node.js, usa `p-retry`. Siempre establece un máximo de reintentos para evitar loops infinitos:

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def query_with_retry(sql, params):
    with get_db_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
```

### ¿Qué es el connection multiplexing?

El multiplexing de conexiones permite que múltiples sesiones lógicas compartan una única conexión de base de datos. PgBouncer proporciona esto para PostgreSQL. Usa `transaction mode` para la mayoría de aplicaciones, donde cada transacción obtiene una conexión del pool.

### ¿Cómo depuro queries lentas?

Habilita `log_min_duration_statement` en PostgreSQL para loggear queries más lentas que un umbral:

```sql
ALTER SYSTEM SET log_min_duration_statement = '100ms';
SELECT pg_reload_conf();
```

Luego revisa el archivo de log de PostgreSQL para entradas de queries lentas. Usa `EXPLAIN ANALYZE` para inspeccionar el plan de ejecución.
