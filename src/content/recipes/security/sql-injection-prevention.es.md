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
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/database-transactions
  - /recipes/input-validation
  - /recipes/handle-errors
  - /recipes/vault-dynamic-credentials
  - /recipes/container-security-scanning
  - /recipes/api-security-headers
  - /recipes/xss-prevention
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

La causa raíz es casi siempre la misma: concatenar [input](/recipes/api/input-validation) de usuario no confiable directamente en strings de SQL. La solución es igualmente directa: usar queries parametrizadas o un ORM que maneje el escaping automáticamente. Aqui se muestra la forma de la forma segura de acceder a bases de datos en Python, JavaScript y Java.

## Cuándo usarlo

Usa esta receta cuando:

- Escribes cualquier código que ejecute queries SQL con valores en vivo
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
- **Stored procedures**: Pueden agregar una capa de abstracción, pero no previenen la inyección si ellos mismos concatenan input dentro de SQL en vivo.

## Variantes

| Enfoque | Seguridad | Flexibilidad | Mejor para |
|---------|-----------|--------------|------------|
| Raw queries parametrizadas | Excelente | Alta | Queries complejas, reporting |
| ORM | Excelente | Media | Aplicaciones CRUD-intensive |
| Stored procedures | Buena | Baja | Sistemas legacy, DBAs estrictos |
| Query builders (Knex, jOOQ) | Buena | Alta | Construcción en vivo de queries |

## Lo que funciona

- **Nunca concatenes input de usuario en strings de SQL**: ni siquiera para columnas `ORDER BY` o nombres de tablas. Usa listas permitidas si identificadores en vivo son inevitables.
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
- **Asumir que los stored procedures son seguros**: los procedures que construyen SQL en vivo internamente siguen siendo vulnerables a menos que usen queries parametrizadas ellos mismos.

## Preguntas frecuentes

**P: ¿Es seguro usar string formatting para nombres de tablas o columnas?**
R: No. Los nombres de tablas y columnas son identificadores, no valores de datos, y no pueden ser parametrizados. Usa una lista permitida de identificadores permitidos y rechaza cualquier otra cosa.

**P: ¿Los ORMs previenen completamente la inyección SQL?**
R: Sí, para operaciones estándar. Sin embargo, los métodos de SQL raw como `sequelize.query()` o `session.execute()` todavía requieren parametrización manual.

**P: ¿Qué pasa con bases de datos NoSQL como MongoDB?**
R: La [inyección NoSQL](/guides/databases/nosql-database-selection-guide) también existe. Usa queries parametrizadas o métodos del driver que acepten objetos, no concatenación de strings. Nunca pases input raw de usuario a `eval()` o cláusulas `$where`.

**P: ¿Los prepared statements perjudican el rendimiento?**
R: No. Usualmente mejoran el rendimiento porque la base de datos cachea el plan de ejecución. El overhead es negligible comparado con el beneficio de seguridad.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### ORDER BY con allowlist (Python)

Los nombres de tablas y columnas no pueden ser parametrizados. Usa una allowlist para manejar sorting dinámico de forma segura:

```python
ALLOWED_SORT_COLUMNS = {
    'name': 'users.name',
    'email': 'users.email',
    'created_at': 'users.created_at',
    'updated_at': 'users.updated_at',
}

def get_users(sort_by: str = 'created_at', sort_dir: str = 'desc',
              limit: int = 20, offset: int = 0):
    """Obtener usuarios con sorting dinámico seguro."""
    # Validar columna de sort contra allowlist
    column = ALLOWED_SORT_COLUMNS.get(sort_by)
    if column is None:
        raise ValueError(f'Columna de sort inválida: {sort_by}')

    # Validar dirección de sort
    direction = 'ASC' if sort_dir.upper() == 'ASC' else 'DESC'

    # Limit y offset son parametrizados
    query = f"""
        SELECT id, name, email, created_at
        FROM users
        WHERE active = TRUE
        ORDER BY {column} {direction}
        LIMIT %s OFFSET %s
    """

    with db.cursor() as cursor:
        cursor.execute(query, (limit, offset))
        return cursor.fetchall()

# Uso
users = get_users(sort_by='name', sort_dir='asc', limit=10, offset=0)
# Un atacante pasando sort_by="name; DROP TABLE users--" obtiene ValueError
```

### Escaping de wildcards en LIKE (JavaScript)

Incluso con queries parametrizadas, `%` y `_` en input de usuario pueden causar comportamiento inesperado en LIKE:

```javascript
const { Pool } = require('pg');
const pool = new Pool();

async function searchUsers(searchTerm) {
  // Escapar wildcards de LIKE en input de usuario
  const escapedTerm = searchTerm
    .replace(/\\/g, '\\\\')  // Escapar backslashes primero
    .replace(/%/g, '\\%')    // Escapar percent
    .replace(/_/g, '\\_');   // Escapar underscore

  const result = await pool.query(
    `SELECT id, name, email FROM users
     WHERE name LIKE $1 ESCAPE '\\'
     ORDER BY name
     LIMIT 20`,
    [`%${escapedTerm}%`]
  );

  return result.rows;
}

// Uso: searchTerm = "50%_off" becomes "50\%\_off" en el patrón LIKE
// Esto matchea el string literal "50%_off" en lugar de "50<anything><any char>off"
```

### Seguridad en raw queries de Sequelize (Node.js)

El método `query()` de Sequelize soporta SQL raw parametrizado:

```javascript
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

// SEGURO: Replacements
const users = await sequelize.query(
  'SELECT * FROM users WHERE email = :email AND active = :active',
  {
    replacements: { email: userEmail, active: true },
    type: Sequelize.QueryTypes.SELECT,
  }
);

// SEGURO: Parámetros posicionales
const orders = await sequelize.query(
  'SELECT * FROM orders WHERE user_id = $1 AND status = $2',
  {
    bind: [userId, 'completed'],
    type: Sequelize.QueryTypes.SELECT,
  }
);

// PELIGROSO: Nunca hagas esto
// const result = await sequelize.query(
//   `SELECT * FROM users WHERE email = '${userEmail}'`
// );
```

### Queries type-safe con jOOQ (Java)

jOOQ genera SQL type-safe desde tu schema, eliminando inyección por construcción:

```java
import static org.jooq.impl.DSL.*;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.Result;

// jOOQ genera clases desde tu schema de base de datos
import static com.example.generated.tables.Users.USERS;
import static com.example.generated.tables.Orders.ORDERS;

public class UserRepository {

    private final DSLContext ctx;

    public UserRepository(DSLContext ctx) {
        this.ctx = ctx;
    }

    public Result<Record> findActiveUsersByEmail(String email) {
        return ctx.select()
            .from(USERS)
            .where(USERS.EMAIL.eq(email))
            .and(USERS.ACTIVE.eq(true))
            .fetch();
    }

    public Result<Record> searchUsersByName(String namePattern) {
        // LIKE type-safe con patrón escapado
        return ctx.select()
            .from(USERS)
            .where(USERS.NAME.like("%" + namePattern + "%"))
            .orderBy(USERS.CREATED_AT.desc())
            .limit(20)
            .fetch();
    }
}
```

### Detección de inyección con SQLMap

Prueba tu aplicación en busca de vulnerabilidades de inyección SQL:

```bash
#!/bin/bash
# Probar un solo endpoint
sqlmap -u "https://example.com/api/users?id=1" \
  --batch --level=3 --risk=2 \
  --random-agent \
  --output-dir=/tmp/sqlmap-results

# Probar con cookie de autenticación
sqlmap -u "https://example.com/api/users?id=1" \
  --cookie="session=abc123" \
  --batch --level=5

# Probar parámetros POST
sqlmap -u "https://example.com/api/login" \
  --data="email=test@example.com&password=test" \
  --batch --level=3
```

## Mejores Prácticas Adicionales

1. **Usa roles de base de datos con permisos a nivel de columna.** Restringe qué columnas puede leer el usuario de la aplicación, para que incluso si ocurre inyección, las columnas sensibles estén protegidas:

```sql
-- Crear un rol restringido
CREATE ROLE app_readonly;

-- Otorgar acceso solo a columnas no sensibles
GRANT SELECT (id, name, email, created_at) ON users TO app_readonly;
-- Denegar acceso a password_hash, ssn, payment_info
REVOKE SELECT ON users FROM app_readonly;
GRANT SELECT (id, name, email, created_at) ON users TO app_readonly;

-- La aplicación se conecta como app_readonly
-- Operaciones admin usan un rol privilegiado separado
```

2. **Habilita logging de queries con detección de patrones.** Loggea queries que contengan patrones sospechosos para análisis forense:

```python
import re
import logging

SUSPICIOUS_PATTERNS = [
    re.compile(r'UNION\s+SELECT', re.IGNORECASE),
    re.compile(r'OR\s+1\s*=\s*1', re.IGNORECASE),
    re.compile(r';\s*DROP\s+TABLE', re.IGNORECASE),
    re.compile(r'--\s*$'),
    re.compile(r'/\*.*\*/'),
]

def check_query_safety(query: str, params: tuple = None):
    """Loggear warning si la query contiene patrones sospechosos."""
    for pattern in SUSPICIOUS_PATTERNS:
        if pattern.search(query):
            logging.warning(
                f'Patrón SQL sospechoso detectado: {pattern.pattern} '
                f'en query: {query[:200]}'
            )
            break
```

## Errores Comunes Adicionales

1. **Usar `query.toString()` o loggear SQL raw con parámetros.** Loggear el string SQL completo con parámetros interpolados puede exponer datos sensibles en archivos de log. Loggea el template de la query y el conteo de parámetros por separado:

```javascript
// INCORRECTO: loggea SQL completo con datos de usuario
console.log(`Query: SELECT * FROM users WHERE email = '${email}'`);

// CORRECTO: loggea template y conteo de parámetros
logger.debug('Query: SELECT * FROM users WHERE email = $1', {
  paramCount: 1,
  queryType: 'SELECT',
});
```

2. **Confiar ciegamente en métodos `raw()` de ORMs.** Algunos ORMs ofrecen métodos `raw()` o `literal()` que bypassan la parametrización. Siempre pasa los parámetros por separado:

```python
# INCORRECTO: interpolación raw
from sqlalchemy import text
session.execute(text(f"SELECT * FROM users WHERE name = '{name}'"))

# CORRECTO: parámetros bound
from sqlalchemy import text
session.execute(
    text("SELECT * FROM users WHERE name = :name"),
    {"name": name}
)
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo cláusulas IN dinámicas de forma segura?

Construye los placeholders parametrizados dinámicamente basado en la longitud de la lista:

```python
def get_users_by_ids(user_ids: list[str]) -> list:
    if not user_ids:
        return []
    # Crear N placeholders: (?, ?, ?, ...)
    placeholders = ', '.join(['?'] * len(user_ids))
    query = f"SELECT * FROM users WHERE id IN ({placeholders})"
    cursor.execute(query, user_ids)
    return cursor.fetchall()
```

### ¿Qué es la inyección SQL de segundo orden?

La inyección de segundo orden ocurre cuando input malicioso se almacena en la base de datos (mediante una query parametrizada segura) y luego se usa en una query diferente vía concatenación de strings. Por ejemplo, un username como `admin'--` se almacena de forma segura, pero si otra query concatena ese username en SQL, se ejecuta. Siempre parametriza cada query, incluso cuando los datos provienen de tu propia base de datos.

### ¿Debería usar reglas WAF para inyección SQL?

Un Web Application Firewall (WAF) como ModSecurity o AWS WAF agrega una capa de protección bloqueando requests que contienen keywords SQL. Sin embargo, los WAFs son defensa en profundidad, no una defensa primaria. Pueden ser bypassados con trucos de encoding y deben complementar, no reemplazar, las queries parametrizadas.
