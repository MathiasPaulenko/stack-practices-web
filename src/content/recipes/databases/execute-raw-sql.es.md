---
contentType: recipes
slug: execute-raw-sql
title: "Ejecutar SQL Crudo"
description: "Cómo ejecutar consultas SQL crudas de forma segura con sentencias parametrizadas."
metaDescription: "Aprende a ejecutar SQL crudo de forma segura en Python, JavaScript y Java usando consultas parametrizadas para prevenir inyección SQL."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - sql
  - security
  - python
  - javascript
  - java
relatedResources:
  - /recipes/connect-to-mysql
  - /recipes/connect-to-postgresql
  - /recipes/connect-to-redis
  - /recipes/escape-html-entities
  - /recipes/sanitize-user-input
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a ejecutar SQL crudo de forma segura en Python, JavaScript y Java usando consultas parametrizadas para prevenir inyección SQL."
  keywords:
    - databases
    - sql
    - security
    - python
    - javascript
    - java
---
## Visión General

Incluso con ORMs, SQL crudo a veces es necesario para consultas complejas, migraciones o optimización de rendimiento. Sin embargo, ejecutar SQL sin salvaguardas es una causa principal de vulnerabilidades de inyección SQL. Cómo ejecutar SQL de forma segura usando consultas parametrizadas en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Escribes consultas analíticas complejas que los ORMs no pueden expresar eficientemente
- Ejecutas migraciones de base de datos o comandos administrativos
- Optimizas rendimiento con capacidades SQL específicas de la base de datos

## Solución

### Python

```python
import psycopg2

conn = psycopg2.connect(host="localhost", database="mydb", user="user", password="pass")
cursor = conn.cursor()

# Consulta parametrizada segura
cursor.execute("SELECT * FROM users WHERE email = %s AND active = %s", (email, True))
rows = cursor.fetchall()

# Inserción segura con RETURNING
cursor.execute(
    "INSERT INTO users (email, role) VALUES (%s, %s) RETURNING id",
    (email, role)
)
user_id = cursor.fetchone()[0]
conn.commit()
cursor.close()
conn.close()
```

### JavaScript

```javascript
const { Pool } = require('pg');
const pool = new Pool({ /* config */ });

// Consulta parametrizada segura
async function findUser(email) {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND active = $2',
        [email, true]
    );
    return result.rows;
}

// Inserción segura con RETURNING
async function createUser(email, role) {
    const result = await pool.query(
        'INSERT INTO users (email, role) VALUES ($1, $2) RETURNING id',
        [email, role]
    );
    return result.rows[0].id;
}
```

### Java

```java
import java.sql.*;

public class RawSQL {
    public void findUser(Connection conn, String email) throws SQLException {
        String sql = "SELECT * FROM users WHERE email = ? AND active = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, email);
            stmt.setBoolean(2, true);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                System.out.println(rs.getString("name"));
            }
        }
    }

    public int createUser(Connection conn, String email, String role) throws SQLException {
        String sql = "INSERT INTO users (email, role) VALUES (?, ?) RETURNING id";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, email);
            stmt.setString(2, role);
            stmt.executeUpdate();
            try (ResultSet keys = stmt.getGeneratedKeys()) {
                keys.next();
                return keys.getInt(1);
            }
        }
    }
}
```

## Explicación

Las **consultas parametrizadas** (prepared statements) separan la lógica SQL de los datos. La base de datos compila la plantilla SQL una vez y vincula los valores en tiempo de ejecución, haciendo la inyección imposible. En **Python**, `%s` es un placeholder, no un format string. En **JavaScript**, `$1`, `$2` son parámetros posicionales. En **Java**, `?` es el placeholder de JDBC. Ninguno de estos concatena input de usuario en el string SQL.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `SQLAlchemy text()` | SQL crudo dentro del ORM con parámetros vinculados |
| JavaScript | `knex.raw()` | Query builder con SQL crudo y bindings |
| Java | `Jdbi` | API fluida sobre JDBC con binding de parámetros |

## Lo que funciona

1. Nunca concatenes input de usuario en strings SQL; usa siempre consultas parametrizadas
2. Usa `RETURNING` (PostgreSQL) o `getGeneratedKeys()` (JDBC) en lugar de `SELECT MAX(id)`
3. Envuelve múltiples sentencias en transacciones con rollback apropiado ante errores
4. Valida y haz whitelist de nombres de tabla/columna cuando deban ser en vivo
5. Registra tiempos de ejecución de SQL para detectar consultas lentas y patrones N+1

## Errores Comunes

1. Usar f-strings de Python, template literals de JS o concatenación `+` en Java para SQL
2. Asumir que los ORMs son siempre seguros; `.query("..." + input)` sigue siendo vulnerable
3. Sanitizar input con regex en lugar de usar consultas parametrizadas
4. Olvidar hacer commit de transacciones, dejando datos en estado inconsistente
5. Usar `Statement` en lugar de `PreparedStatement` en Java

## Preguntas Frecuentes

### ¿Es seguro `cursor.execute(f"SELECT * FROM {table}")`?

No. Los nombres de tabla y columna no pueden parametrizarse en la mayoría de drivers. Si necesitas nombres de tabla en vivo, haz whitelist contra un conjunto conocido de nombres válidos.

### ¿Puedo usar consultas parametrizadas para cláusulas `IN`?

La mayoría de drivers no soportan `IN (%s)` con una lista. Usa extensiones específicas del driver: `ANY($1)` en PostgreSQL, genera placeholders dinámicamente en Python/Java, o usa `find_in_set` en MySQL.

### ¿Debería evitar SQL crudo por completo y usar solo ORMs?

No necesariamente. Los ORMs sobresalen en CRUD pero luchan con agregaciones complejas, funciones de ventana y optimizaciones específicas de la base de datos. Usa SQL crudo para estos casos, pero parametriza siempre los inputs.

### Python con SQLAlchemy `text()`

```python
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://user:pass@localhost/mydb")

with engine.connect() as conn:
    # SQL crudo parametrizado dentro de SQLAlchemy
    result = conn.execute(
        text("SELECT * FROM users WHERE email = :email AND active = :active"),
        {"email": "alice@example.com", "active": True}
    )
    for row in result:
        print(row.name, row.email)

    # Transacción con SQL crudo
    conn.execute(
        text("INSERT INTO audit_log (action, user_id) VALUES (:action, :user_id)"),
        {"action": "login", "user_id": 1}
    )
    conn.commit()
```

### JavaScript con `knex.raw()`

```javascript
const knex = require('knex')({
    client: 'pg',
    connection: 'postgresql://user:pass@localhost/mydb'
});

// SQL crudo con bindings
const users = await knex.raw(
    'SELECT * FROM users WHERE email = ? AND active = ?',
    ['alice@example.com', true]
);

// SQL crudo en una cadena de query builder
const activeUsers = await knex('users')
    .whereRaw('created_at > NOW() - INTERVAL ? DAYS', [30])
    .select('id', 'email');
```

### Manejo seguro de cláusulas `IN`

```python
# Python: generar placeholders dinámicamente
emails = ['alice@example.com', 'bob@example.com']
placeholders = ','.join(['%s'] * len(emails))
cursor.execute(
    f"SELECT * FROM users WHERE email IN ({placeholders})",
    emails
)

# PostgreSQL: usar ANY() con un array
cursor.execute(
    "SELECT * FROM users WHERE email = ANY(%s)",
    (emails,)
)
```

```javascript
// JavaScript: usar ANY() en PostgreSQL
const result = await pool.query(
    'SELECT * FROM users WHERE email = ANY($1::text[])',
    [emails]
);
```

```java
// Java: construir PreparedStatement con placeholders dinámicos
List<String> emails = List.of("alice@example.com", "bob@example.com");
String placeholders = String.join(",", Collections.nCopies(emails.size(), "?"));
String sql = "SELECT * FROM users WHERE email IN (" + placeholders + ")";
try (PreparedStatement stmt = conn.prepareStatement(sql)) {
    for (int i = 0; i < emails.size(); i++) {
        stmt.setString(i + 1, emails.get(i));
    }
    ResultSet rs = stmt.executeQuery();
}
```

### Whitelist de nombres de tabla/columna

```python
ALLOWED_TABLES = {"users", "orders", "products"}
ALLOWED_COLUMNS = {"id", "name", "email", "amount", "status"}

def safe_query(table_name, column_name, value):
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"Tabla inválida: {table_name}")
    if column_name not in ALLOWED_COLUMNS:
        raise ValueError(f"Columna inválida: {column_name}")

    cursor.execute(
        f"SELECT * FROM {table_name} WHERE {column_name} = %s",
        (value,)
    )
    return cursor.fetchall()
```

## Buenas prácticas adicionales

6. **Usa `EXPLAIN ANALYZE` para validar planes de ejecución.** El SQL crudo omite las optimizaciones del ORM. Verifica siempre el plan de ejecución para tablas grandes.

7. **Configura `statement_timeout` para consultas crudas.** Previene que queries descontrolados consuman recursos:

```sql
SET statement_timeout = '30s';
```

8. **Registra consultas lentas.** Rastrea el tiempo de ejecución del SQL crudo para identificar regresiones de rendimiento:

```python
import time

start = time.monotonic()
cursor.execute("SELECT * FROM large_table WHERE ...")
elapsed = time.monotonic() - start
if elapsed > 0.5:
    logger.warning(f"Query lenta tomó {elapsed:.2f}s")
```

9. **Usa pools de conexiones para SQL crudo.** Crear una nueva conexión por query es costoso. Usa `psycopg2.pool` o el pooling integrado de SQLAlchemy.

10. **Quota identificadores cuando sea necesario.** Usa el módulo `psycopg2.sql` para quoting seguro de identificadores:

```python
from psycopg2 import sql

query = sql.SQL("SELECT * FROM {} WHERE {} = %s").format(
    sql.Identifier("users"),
    sql.Identifier("email")
)
cursor.execute(query, ("alice@example.com",))
```

## Errores comunes adicionales

6. **Usar `executemany()` para inserts masivos sin probar.** Algunos drivers ejecutan sentencias individuales, sin mejora. Usa `COPY` en PostgreSQL o batch inserts con listas `VALUES`.
7. **No cerrar cursores y conexiones.** Usa context managers (`with` blocks) para asegurar que los recursos se liberen.
8. **Ignorar el tamaño del result set.** Obtener millones de filas en memoria causa OOM. Usa cursores server-side o paginación:

```python
cursor.execute("SELECT * FROM large_table")
while True:
    rows = cursor.fetchmany(1000)
    if not rows:
        break
    process(rows)
```

9. **Mezclar SQL parametrizado y formateado con strings.** Incluso una interpolación de `f-string` en una consulta parametrizada introduce riesgo de inyección.
10. **No manejar `NULL` en consultas parametrizadas.** `WHERE col = %s` con `None` no devuelve filas. Usa `IS DISTINCT FROM` o `IS NULL`.

## Preguntas frecuentes adicionales

### ¿Cómo ejecuto un script SQL crudo multi-sentencia?

Usa `cursor.execute()` para sentencias individuales. Para scripts con múltiples sentencias, divídelas o usa `execute()` de `psycopg2` con el script completo (maneja punto y coma). En Java, usa `Statement.execute()` que soporta múltiples sentencias.

### ¿Cuál es la diferencia entre `execute()` y `executemany()`?

`execute()` ejecuta una query con un set de parámetros. `executemany()` ejecuta la misma query con múltiples sets de parámetros. Para inserts masivos en PostgreSQL, `COPY` o `execute_values` de `psycopg2.extras` es más rápido.

### ¿Cómo uso dinámicamente cláusulas `ORDER BY` de forma segura?

Los nombres de columna no pueden parametrizarse. Haz whitelist de columnas permitidas y valida la dirección:

```python
SORTABLE_COLUMNS = {"name", "email", "created_at"}
SORT_DIRECTIONS = {"ASC", "DESC"}

def safe_sort(column, direction):
    if column not in SORTABLE_COLUMNS:
        raise ValueError(f"Columna inválida: {column}")
    if direction.upper() not in SORT_DIRECTIONS:
        raise ValueError(f"Dirección inválida: {direction}")
    return f"ORDER BY {column} {direction.upper()}"
```

## Tips de Rendimiento

1. **Usa `COPY` para inserts masivos en PostgreSQL.** Es 10-100x más rápido que `INSERT` individuales.

2. **Usa `execute_values` para batch inserts en Python.** Reduce round-trips enviando múltiples filas en una sentencia:

```python
from psycopg2.extras import execute_values

execute_values(
    cursor,
    "INSERT INTO users (email, name) VALUES %s",
    [("alice@example.com", "Alice"), ("bob@example.com", "Bob")]
)
```

3. **Usa cursores server-side para result sets grandes.** Evita cargar millones de filas en memoria:

```python
cursor = conn.cursor("server_side_cursor")
cursor.execute("SELECT * FROM large_table")
for row in cursor:
    process(row)
cursor.close()
```

4. **Prefiere `EXISTS` sobre `COUNT(*)` para verificaciones de existencia.** `EXISTS` deja de escanear al encontrar la primera coincidencia:

```sql
SELECT EXISTS(SELECT 1 FROM users WHERE email = 'alice@example.com');
```

5. **Usa `PREPARE` para queries repetidas frecuentemente.** PostgreSQL cachea el plan de consulta, reduciendo overhead de parse para ejecuciones repetidas."
