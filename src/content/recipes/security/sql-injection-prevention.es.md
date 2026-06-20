---
contentType: recipes
slug: sql-injection-prevention
title: "Prevenir Ataques de Inyección SQL"
description: "Cómo escribir queries parametrizadas y usar ORMs para eliminar vulnerabilidades de inyección SQL en Python, JavaScript y Java."
metaDescription: "Aprende técnicas de prevención de inyección SQL. Usa queries parametrizadas y ORMs para asegurar el acceso a bases de datos en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - base-de-datos
  - java
relatedResources:
  - /recipes/database-transactions
  - /recipes/input-validation
  - /recipes/handle-errors
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende técnicas de prevención de inyección SQL. Usa queries parametrizadas y ORMs para asegurar el acceso a bases de datos en Python, JavaScript y Java."
  keywords:
    - prevención sql injection
    - queries parametrizadas
    - prepared statements
    - seguridad orm
    - seguridad base de datos
    - ejemplos sql injection
    - sanitización de input
    - coding seguro
---

## Visión general

La inyección SQL es una de las vulnerabilidades más comunes y peligrosas en aplicaciones web. Ocurre cuando un atacante inyecta código SQL malicioso en queries de la aplicación a través de input del usuario, potencialmente exponiendo, modificando o eliminando bases de datos enteras. Los ataques de inyección consistentemente aparecen en el [OWASP Top 10](/guides/security/security-best-practices-guide) porque son fáciles de explotar y devastadores en impacto.

La causa raíz es casi siempre la misma: concatenar [input](/recipes/api/input-validation) de usuario no confiable directamente en strings de SQL. La solución es igualmente directa: usar queries parametrizadas o un ORM que maneje el escaping automáticamente. Esta receta muestra la forma segura de acceder a bases de datos en Python, JavaScript y Java.

## Cuándo usarlo

Usa esta receta cuando:

- Escribes cualquier código que ejecute queries SQL con valores dinámicos
- Migras código legacy que usa concatenación de strings para SQL
- Auditas aplicaciones existentes en busca de vulnerabilidades de inyección
- Entrenas desarrolladores en patrones seguros de acceso a bases de datos
- Configuras checklists de code review para cambios relacionados con bases de datos

## Solución

### Python

```python
import sqlite3

# VULNERABLE — nunca hagas esto
# query = f"SELECT * FROM users WHERE email = '{user_input}'"

# SEGURO — query parametrizada
conn = sqlite3.connect("app.db")
cursor = conn.cursor()

cursor.execute(
    "SELECT * FROM users WHERE email = ? AND active = ?",
    (email, True)
)
rows = cursor.fetchall()
```

### JavaScript (Node.js con pg)

```javascript
const { Pool } = require('pg');
const pool = new Pool();

// VULNERABLE — nunca hagas esto
// const query = `SELECT * FROM users WHERE email = '${email}'`;

// SEGURO — query parametrizada
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  [email, true]
);
const rows = result.rows;
```

### Java (JDBC)

```java
import java.sql.*;

// SEGURO — PreparedStatement
String sql = "SELECT * FROM users WHERE email = ? AND active = ?";
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(sql)) {

    stmt.setString(1, email);
    stmt.setBoolean(2, true);

    try (ResultSet rs = stmt.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getString("name"));
        }
    }
}
```

### Usando un ORM (Python/SQLAlchemy)

```python
from sqlalchemy.orm import Session
from models import User

with Session(engine) as session:
    users = session.query(User).filter_by(
        email=email,
        active=True
    ).all()
```

## Explicación

- **Queries parametrizadas**: El driver de la base de datos trata el input del usuario como datos, no como SQL ejecutable. Los placeholders (`?`, `$1`, `:name`) son reemplazados de forma segura por el driver, previniendo que cualquier SQL inyectado sea interpretado como comandos.
- **Prepared statements**: La base de datos compila el plan de ejecución una vez y lo ejecuta con diferentes parámetros. Esto es tanto una victoria de seguridad como de rendimiento.
- **ORMs**: Los mapeadores objeto-relacional como SQLAlchemy, Sequelize y Hibernate parametrizan queries automáticamente. Son la opción más segura para la mayoría de aplicaciones porque abstraen el SQL por completo.
- **Stored procedures**: Pueden agregar una capa de abstracción, pero no previenen la inyección si ellos mismos concatenan input dentro de SQL dinámico.

## Variantes

| Enfoque | Seguridad | Flexibilidad | Mejor para |
|---------|-----------|--------------|------------|
| Raw queries parametrizadas | Excelente | Alta | Queries complejas, reporting |
| ORM | Excelente | Media | Aplicaciones CRUD-intensive |
| Stored procedures | Buena | Baja | Sistemas legacy, DBAs estrictos |
| Query builders (Knex, jOOQ) | Buena | Alta | Construcción dinámica de queries |

## Mejores prácticas

- **Nunca concatenes input de usuario en strings de SQL**: ni siquiera para columnas `ORDER BY` o nombres de tablas. Usa listas permitidas si identificadores dinámicos son inevitables.
- **Usa un ORM por defecto**: elimina categorías enteras de bugs de inyección con un costo de rendimiento mínimo.
- **Valida el input antes de que llegue a la base de datos**: la [validación de input](/recipes/api/input-validation) y las queries parametrizadas son defensas complementarias.
- **Usa cuentas de base de datos de menor privilegio**: el usuario de la aplicación no debería tener permisos `DROP TABLE` o `GRANT`.
- **Loggea y monitorea intentos de inyección**: queries fallidas conteniendo keywords SQL o caracteres inusuales pueden señalar probing.
- **Mantén drivers de base de datos actualizados**: los patches de seguridad para drivers y ORMs fixean bypasses conocidos.

## Errores comunes

- **Usar `f`-strings o template literals para SQL**: esta es la causa más común de inyección SQL en código moderno.
- **Parametrización parcial**: parametrizar la cláusula `WHERE` pero concatenar columnas `ORDER BY` o nombres de tablas.
- **Confiar en validación client-side**: los atacantes bypassan la validación del frontend por completo. Toda validación debe ser server-side.
- **Usar `LIKE` sin escapar wildcards**: `%` y `_` en input de usuario pueden causar matches inesperados incluso en queries parametrizadas.
- **Asumir que los stored procedures son seguros**: los procedures que construyen SQL dinámico internamente siguen siendo vulnerables a menos que usen queries parametrizadas ellos mismos.

## Preguntas frecuentes

**P: ¿Es seguro usar string formatting para nombres de tablas o columnas?**
R: No. Los nombres de tablas y columnas son identificadores, no valores de datos, y no pueden ser parametrizados. Usa una lista permitida de identificadores permitidos y rechaza cualquier otra cosa.

**P: ¿Los ORMs previenen completamente la inyección SQL?**
R: Sí, para operaciones estándar. Sin embargo, los métodos de SQL raw como `sequelize.query()` o `session.execute()` todavía requieren parametrización manual.

**P: ¿Qué pasa con bases de datos NoSQL como MongoDB?**
R: La [inyección NoSQL](/guides/databases/nosql-database-selection-guide) también existe. Usa queries parametrizadas o métodos del driver que acepten objetos, no concatenación de strings. Nunca pases input raw de usuario a `eval()` o cláusulas `$where`.

**P: ¿Los prepared statements perjudican el rendimiento?**
R: No. Usualmente mejoran el rendimiento porque la base de datos cachea el plan de ejecución. El overhead es negligible comparado con el beneficio de seguridad.

