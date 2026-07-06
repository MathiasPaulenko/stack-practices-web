---
contentType: recipes
slug: connect-to-mysql
title: "[ES] Connect to MySQL"
description: "[ES] How to connect to MySQL databases in Python, JavaScript, and Java."
metaDescription: "Learn how to connect to MySQL databases using Python mysql-connector, Node.js mysql2, and Java JDBC with practical code examples."
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
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to connect to MySQL databases using Python mysql-connector, Node.js mysql2, and Java JDBC with practical code examples."
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
