---
contentType: recipes
slug: database-connection-pooling
title: "Pool de Conexiones a Base de Datos"
description: "Configura y ajusta pools de conexiones para maximizar throughput y prevenir el agotamiento de conexiones."
metaDescription: "Connection pooling de bases de datos: configura, ajusta y monitorea pools para PostgreSQL, MySQL y Redis para prevenir agotamiento y mejorar throughput."
difficulty: intermediate
topics:
  - databases
tags:
  - connection-pooling
  - databases
  - postgresql
  - performance
  - mysql
  - jdbc
relatedResources:
  - /recipes/databases/postgres-query-optimization
  - /recipes/databases/database-transactions
  - /guides/databases/database-normalization-guide
lastUpdated: "2026-07-03"
author: "StackPractices"
seo:
  metaDescription: "Connection pooling de bases de datos: configura, ajusta y monitorea pools para PostgreSQL, MySQL y Redis para prevenir agotamiento y mejorar throughput."
  keywords:
    - connection-pooling
    - databases
    - postgresql
    - performance
---
## Visión General

El connection pooling reutiliza conexiones de base de datos establecidas en lugar de crear una nueva por petición. Cada nueva conexión requiere un handshake TCP, negociación TLS y autenticación, añadiendo 20-100ms de overhead. Bajo carga, crear conexiones por petición agota el límite de conexiones de la base de datos y causa fallos en cascada.

## Cuándo Usar

Usa este recurso cuando:
- Tu aplicación abre demasiadas conexiones y la base de datos rechaza nuevas peticiones
- Hay picos de latencia porque establecer TCP + TLS + auth handshake en cada petición es costoso
- Necesitas ajustar límites de conexión para arquitecturas serverless o de alta concurrencia

## Solución

### Python (psycopg2 + psycopg2.pool)

```python
from psycopg2 import pool

# Crear un pool de conexiones con min y max
pg_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host='localhost',
    port=5432,
    dbname='myapp',
    user='postgres',
    password='secret'
)

def query_db(sql, params=None):
    conn = pg_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        pg_pool.putconn(conn)

# Siempre devuelve conexiones al pool
results = query_db("SELECT * FROM users WHERE active = %s", (True,))
```

### JavaScript (pg Pool)

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'secret',
  max: 20,              // conexiones máximas
  min: 5,               // conexiones mínimas listas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function queryDb(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

const users = await queryDb('SELECT * FROM users WHERE active = $1', [true]);
```

### Java (HikariCP)

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/myapp");
config.setUsername("postgres");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setIdleTimeout(30000);
config.setConnectionTimeout(2000);
config.setMaxLifetime(1800000);

HikariDataSource ds = new HikariDataSource(config);

try (Connection conn = ds.getConnection();
     PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE active = ?")) {
    stmt.setBoolean(1, true);
    try (ResultSet rs = stmt.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getString("name"));
        }
    }
}
```

## Explicación

Un pool de conexiones mantiene un conjunto de conexiones abiertas a la base de datos. Cuando una petición necesita una conexión, la toma prestada del pool, la usa y la devuelve. Esto elimina el overhead de conexión por petición.

**Tamaño del pool** es el parámetro de ajuste más crítico. Muy pocas conexiones causan que las peticiones se acumulen. Demasiadas conexiones saturan la base de datos. Una fórmula común: `pool_size = (core_count * 2) + effective_spindle_count`.

**Idle timeout** cierra conexiones que no se han usado por un tiempo, liberando recursos durante tráfico bajo. **Max lifetime** previene que conexiones long-lived acumulen estado stale o alcancen timeouts del lado de la base de datos.

## Variantes

| Librería | Lenguaje | Característica clave |
|----------|----------|----------------------|
| psycopg2.pool | Python | ThreadedConnectionPool para apps multi-hilo |
| pg Pool | Node.js | Soporte promise nativo, auto-reconnect |
| HikariCP | Java | Pool JDBC más rápido, métricas via Micrometer |
| PgBouncer | Externo | Pooler del lado servidor, multiplexa conexiones |

## Lo que funciona

1. Dimensiona pools según la capacidad de la base de datos, no del thread count de la app
2. Configura idle timeout para cerrar conexiones sin uso durante tráfico bajo
3. Monitorea métricas del pool: conexiones activas, idle y en espera
4. Usa un pooler del lado servidor como PgBouncer para serverless o muchos clientes pequeños
5. Siempre devuelve conexiones en un bloque finally para prevenir leaks

## Errores Comunes

1. Configurar max pool size muy alto, saturando la base de datos con conexiones
2. No devolver conexiones al pool, causando leaks de conexiones
3. Usar el mismo pool para queries transaccionales y de solo lectura
4. No monitorear tiempos de espera, dejando que queries lentos bloqueen todo el pool
5. Olvidar configurar max lifetime, causando conexiones stale después de reinicios de base de datos

## Preguntas Frecuentes

### ¿Cuántas conexiones debe tener mi pool?

Empieza con `((core_count * 2) + disk_spindles)` y ajusta desde ahí. Para PostgreSQL, el `max_connections` por defecto es 100. Si múltiples servicios se conectan, divide ese presupuesto entre ellos. PgBouncer puede multiplexar miles de clientes en un pool pequeño.

### ¿Debo usar PgBouncer en lugar de pooling a nivel aplicación?

Usa ambos. PgBouncer multiplexa conexiones de aplicación a un conjunto menor de conexiones de base de datos, lo que ayuda con serverless y muchos servicios pequeños. El pooling a nivel aplicación reduce la latencia de conexión y te da métricas por petición.

### ¿Cómo detecto leaks de conexiones?

Monitorea el contador de conexiones activas del pool. Si aumenta constantemente y nunca baja, las conexiones no se están devolviendo. En Java, HikariCP loguea leaks después de `leakDetectionThreshold` (default 0, configurar a 60000ms). En Node.js, rastrea `pool.totalCount` vs `pool.idleCount`.
