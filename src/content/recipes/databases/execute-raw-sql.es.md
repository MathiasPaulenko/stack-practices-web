---
contentType: recipes
slug: execute-raw-sql
title: "[ES] Execute Raw SQL"
description: "[ES] How to execute raw SQL queries safely with parameterized statements."
metaDescription: "[ES] Learn to execute raw SQL queries safely in Python, JavaScript, and Java using parameterized statements to prevent SQL injection."
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
  metaDescription: "Aprende a ejecutar consultas SQL de forma segura en Python, JavaScript y Java usando consultas parametrizadas para prevenir inyección SQL."
  keywords:
    - databases
    - sql
    - security
    - python
    - javascript
    - java
---
## Visión General

Incluso con ORMs, SQL crudo a veces es necesario para consultas complejas, migraciones o optimización de rendimiento. Sin embargo, ejecutar SQL sin salvaguardas es una causa principal de vulnerabilidades de inyección SQL. Esta receta demuestra cómo ejecutar SQL de forma segura usando consultas parametrizadas en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Escribes consultas analíticas complejas que los ORMs no pueden expresar eficientemente
- Ejecutas migraciones de base de datos o comandos administrativos
- Optimizas rendimiento con características SQL específicas de la base de datos

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

## Mejores Prácticas

1. Nunca concatenes input de usuario en strings SQL; usa siempre consultas parametrizadas
2. Usa `RETURNING` (PostgreSQL) o `getGeneratedKeys()` (JDBC) en lugar de `SELECT MAX(id)`
3. Envuelve múltiples sentencias en transacciones con rollback apropiado ante errores
4. Valida y haz whitelist de nombres de tabla/columna cuando deban ser dinámicos
5. Registra tiempos de ejecución de SQL para detectar consultas lentas y patrones N+1

## Errores Comunes

1. Usar f-strings de Python, template literals de JS o concatenación `+` en Java para SQL
2. Asumir que los ORMs son siempre seguros; `.query("..." + input)` sigue siendo vulnerable
3. Sanitizar input con regex en lugar de usar consultas parametrizadas
4. Olvidar hacer commit de transacciones, dejando datos en estado inconsistente
5. Usar `Statement` en lugar de `PreparedStatement` en Java

## Preguntas Frecuentes

### ¿Es seguro `cursor.execute(f"SELECT * FROM {table}")`?

No. Los nombres de tabla y columna no pueden parametrizarse en la mayoría de drivers. Si necesitas nombres de tabla dinámicos, haz whitelist contra un conjunto conocido de nombres válidos.

### ¿Puedo usar consultas parametrizadas para cláusulas `IN`?

La mayoría de drivers no soportan `IN (%s)` con una lista. Usa extensiones específicas del driver: `ANY($1)` en PostgreSQL, genera placeholders dinámicamente en Python/Java, o usa `find_in_set` en MySQL.

### ¿Debería evitar SQL crudo por completo y usar solo ORMs?

No necesariamente. Los ORMs sobresalen en CRUD pero luchan con agregaciones complejas, funciones de ventana y optimizaciones específicas de la base de datos. Usa SQL crudo para estos casos, pero parametriza siempre los inputs.
