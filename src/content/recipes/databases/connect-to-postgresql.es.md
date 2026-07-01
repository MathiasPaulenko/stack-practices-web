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

PostgreSQL es la base de datos relacional open-source más popular. Conectarse de forma fiable requiere manejar connection strings, SSL y pools de conexiones. Esta receta muestra cómo conectar y consultar PostgreSQL en Python, JavaScript y Java.

## Cuándo Usar

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
