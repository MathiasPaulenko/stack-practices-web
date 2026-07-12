---



contentType: recipes
slug: connect-to-mysql
title: "Conectar a MySQL"
description: "Cómo conectar a bases de datos MySQL en Python, JavaScript y Java."
metaDescription: "Aprende a conectar a bases de datos MySQL usando Python mysql-connector, Node.js mysql2 y Java JDBC con ejemplos de código prácticos."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - mysql
  - python
  - javascript
  - java
  - jdbc
relatedResources:
  - /recipes/connect-to-postgresql
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/ambassador-pattern
  - /patterns/bridge-pattern
  - /recipes/connect-to-redis
  - /recipes/execute-raw-sql
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a conectar a bases de datos MySQL usando Python mysql-connector, Node.js mysql2 y Java JDBC con ejemplos de código prácticos."
  keywords:
    - databases
    - mysql
    - python
    - javascript
    - java
    - jdbc



---
## Visión General

MySQL sigue siendo una de las bases de datos relacionales más desplegadas. Ya sea ejecutándose localmente, en AWS RDS o en un clúster gestionado, conectarse de forma segura y eficiente es crítico. A continuacion se cubre conexiones a MySQL con pools, SSL y consultas preparadas en Python, JavaScript y Java.

## Cuándo Usar


- For alternatives, see [Connect to PostgreSQL](/es/recipes/connect-to-postgresql/).

Usa este recurso cuando:
- Desarrollas aplicaciones que usan MySQL como almacén principal de datos
- Migras desde MariaDB o cambias de PostgreSQL a MySQL
- Escribes scripts que importan o exportan datos desde bases de datos MySQL

## Solución

### Python

```python
import mysql.connector
from mysql.connector import Error

# Conexión básica
conn = mysql.connector.connect(
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    ssl_ca="ca.pem",
    ssl_verify_cert=True
)

cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM users WHERE id = %s", (1,))
row = cursor.fetchone()
cursor.close()
conn.close()
```

### JavaScript

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { ca: require('fs').readFileSync('ca.pem') },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function getUser(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
}
```

### Java

```java
import java.sql.*;

public class MySQLConnect {
    public Connection connect() throws SQLException {
        String url = "jdbc:mysql://localhost:3306/mydb?sslMode=VERIFY_CA&serverTimezone=UTC";
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

MySQL usa **consultas preparadas** a través de placeholders a nivel de protocolo (`%s` en Python, `?` en Java, `?` en mysql2). Los **pools de conexiones** son esenciales porque las conexiones MySQL son relativamente costosas de establecer. El pool de `mysql2/promise` maneja la cola cuando todas las conexiones están en uso. El ejemplo de **Java** usa el moderno `com.mysql.cj.jdbc.Driver` (MySQL Connector/J) con configuraciones de zona horaria y verificación SSL en la URL JDBC.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `PyMySQL` | Implementación pura Python, sin dependencias C |
| JavaScript | `mysql` (no promise) | Driver legacy basado en callbacks |
| Java | `HikariCP` + MySQL Connector/J | Pooling estándar de la industria para Spring Boot |

## Lo que funciona

1. Usa pools de conexiones con un límite apropiado para `max_connections` de tu base de datos
2. Habilita SSL con verificación de certificado en entornos de producción
3. Configura timeouts de conexión e inactividad explícitos para evitar conexiones stale
4. Usa `execute()` (consultas preparadas) en lugar de `query()` para valores proporcionados por usuarios
5. Almacena connection strings en variables de entorno y usa autenticación IAM en AWS RDS

## Errores Comunes

1. Usar el paquete `mysql` deprecado en Node.js en lugar de `mysql2`
2. Olvidar `serverTimezone` en URLs JDBC, causando bugs de desplazamiento horario
3. No manejar errores de conexión, causando rechazos de promesas no manejados o crashes
4. Usar `SELECT *` en producción sin considerar la cantidad de columnas y overhead de red
5. Abrir conexiones en bucles en lugar de reutilizar conexiones del pool

## Preguntas Frecuentes

### ¿Debo usar `mysql-connector-python` o `PyMySQL`?

`mysql-connector-python` es el driver oficial de Oracle con mejor rendimiento. `PyMySQL` es una alternativa pura Python útil cuando no se pueden instalar extensiones C.

### ¿Cómo manejo timeouts de conexión en mysql2?

Configura `connectTimeout`, `acquireTimeout` y `timeout` en las opciones del pool. También habilita `enableKeepAlive` para conexiones de larga duración.

### ¿Cuál es la diferencia entre `query()` y `execute()` en mysql2?

`query()` envía el SQL como string plano. `execute()` envía una consulta preparada con parámetros vinculados, segura contra inyección SQL y con mejor rendimiento para consultas repetidas.

### Python con pool de conexiones y context manager

```python
import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager

# Crear un pool de conexiones
mysql_pool = pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=10,
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    ssl_ca="ca.pem",
    ssl_verify_cert=True
)

@contextmanager
def get_db_cursor():
    conn = mysql_pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        yield cursor
        conn.commit()
        cursor.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Uso
with get_db_cursor() as cur:
    cur.execute("SELECT * FROM users WHERE active = %s", (True,))
    rows = cur.fetchall()
    for row in rows:
        print(row)
```

### JavaScript con manejo de transacciones

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { ca: require('fs').readFileSync('ca.pem') },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

async function transferBalance(fromId, toId, amount) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?',
            [amount, fromId]
        );

        await conn.execute(
            'UPDATE accounts SET balance = balance + ? WHERE id = ?',
            [amount, toId]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}
```

### Java con pool HikariCP

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

public class MySQLPool {
    private static final HikariDataSource ds;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb?sslMode=VERIFY_CA&serverTimezone=UTC");
        config.setUsername("user");
        config.setPassword("pass");
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

### Python con PyMySQL (alternativa pura Python)

```python
import pymysql
from contextlib import contextmanager

@contextmanager
def get_db():
    conn = pymysql.connect(
        host="localhost",
        database="mydb",
        user="user",
        password="pass",
        ssl={"ca": "ca.pem"},
        cursorclass=pymysql.cursors.DictCursor
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
with get_db() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (1,))
        row = cur.fetchone()
        print(row)
```

## Variantes adicionales

| Tecnología | Driver | Async | Pooling | Notas |
|------------|--------|-------|---------|-------|
| Python | `mysql-connector-python` | No | `MySQLConnectionPool` | Driver oficial de Oracle |
| Python | `PyMySQL` | No | Manual | Python puro, sin deps C |
| Python | `aiomysql` | Sí | Built-in | MySQL asíncrono para asyncio |
| JavaScript | `mysql2` | Sí (Promise) | `createPool` | Recomendado para Node.js |
| JavaScript | `mysql` | No (callback) | `createPool` | Legacy, evitar para código nuevo |
| Java | JDBC + HikariCP | No | HikariCP | Estándar de la industria |
| Go | `go-sql-driver/mysql` | Sí | `database/sql` | Driver estándar de Go |

## Buenas prácticas adicionales

6. **Habilita `enableKeepAlive` en mysql2.** Esto previene que conexiones inactivas sean dropeadas por la infraestructura de red o el `wait_timeout` de MySQL:

```javascript
const pool = mysql.createPool({
    // ... otras opciones
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});
```

7. **Usa `LOAD DATA INFILE` para inserts masivos.** Es 20-100x más rápido que `INSERT` individuales para datasets grandes:

```sql
LOAD DATA INFILE '/tmp/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, email, name);
```

8. **Configura `wait_timeout` e `interactive_timeout` en el servidor.** Ajusta estos valores para reciclar conexiones inactivas antes de que se vuelvan stale:

```sql
SET GLOBAL wait_timeout = 300;
SET GLOBAL interactive_timeout = 300;
```

9. **Usa autenticación IAM en AWS RDS.** Evita almacenar passwords usando autenticación IAM de base de datos:

```bash
aws rds generate-db-auth-token \
  --hostname mydb.abc123.us-east-1.rds.amazonaws.com \
  --port 3306 \
  --username myuser
```

10. **Monitorea `SHOW PROCESSLIST` para consultas largas.** Identifica y mata consultas que bloquean a otras:

```sql
SHOW PROCESSLIST;
KILL <thread_id>;
```

## Errores comunes adicionales

6. **No manejar caídas de conexión.** Problemas de red o reinicios de MySQL invalidan conexiones. Usa lógica de retry o un pool con health checks.
7. **Usar `SELECT *` en código de producción.** Listas explícitas de columnas previenen roturas cuando el schema cambia y reducen overhead de red.
8. **No configurar `connectionLimit` correctamente.** Ajústalo según `max_connections` de MySQL y el número de instancias de la aplicación. Fórmula: `max_connections / app_instances - safety_margin`.
9. **Ignorar `SHOW STATUS LIKE 'Threads_connected'`.** Monitorea conexiones activas para detectar leaks de conexión temprano.
10. **Usar autocommit para operaciones multi-statement.** Sin transacciones explícitas, fallos parciales dejan datos en estado inconsistente.

## Preguntas frecuentes adicionales

### ¿Cómo manejo fallos de conexión gracefully?

Implementa lógica de retry con backoff exponencial. En Python, usa `tenacity`. En Node.js, usa `p-retry`. Siempre establece un máximo de reintentos:

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def query_with_retry(sql, params):
    with get_db_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
```

### ¿Cómo habilito query logging para debugging?

Habilita el slow query log en MySQL para identificar consultas que toman más de un umbral:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

### ¿Qué es el connection multiplexing para MySQL?

El multiplexing de conexiones MySQL lo proporcionan ProxySQL o MySQL Router. Estos proxies agrupan conexiones de múltiples instancias de aplicación y las multiplexan a un conjunto menor de conexiones de base de datos. Usa `transaction_persistent=0` en ProxySQL para la mayoría de las aplicaciones.

### ¿Cómo uso SSL con MySQL en AWS RDS?

Descarga el CA bundle de RDS y úsalo en tu conexión:

```python
conn = mysql.connector.connect(
    host="mydb.abc123.us-east-1.rds.amazonaws.com",
    database="mydb",
    user="user",
    password="pass",
    ssl_ca="rds-ca-2019-root.pem",
    ssl_verify_cert=True
)
```
