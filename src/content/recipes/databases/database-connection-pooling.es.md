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
  - /recipes/postgres-query-optimization
  - /recipes/database-transactions
  - /guides/database-normalization-guide
  - /recipes/database-replication
  - /recipes/schema-evolution
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


- For alternatives, see [Complete Guide to PostgreSQL Tuning](/es/guides/complete-guide-postgresql-tuning/).

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

### Pool de conexiones SQLAlchemy (Python)

```python
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://user:pass@localhost/mydb",
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True
)

with engine.connect() as conn:
    result = conn.execute("SELECT 1")
    print(result.scalar())
```

- `pool_size`: número base de conexiones
- `max_overflow`: conexiones adicionales permitidas más allá de `pool_size`
- `pool_timeout`: segundos de espera por una conexión antes de lanzar error
- `pool_recycle`: segundos antes de que una conexión se recicle (previene conexiones stale)
- `pool_pre_ping`: valida la conexión antes de usarla (añade ligero overhead)

### PgBouncer pooling del lado servidor

```ini
; pgbouncer.ini
[databases]
myapp = host=127.0.0.1 port=5432 dbname=myapp

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 600
server_lifetime = 3600
```

```bash
# Iniciar PgBouncer
pgbouncer -d /etc/pgbouncer/pgbouncer.ini

# Conectar a través de PgBouncer (puerto 6432 en lugar de 5432)
psql -h localhost -p 6432 -U postgres myapp
```

**Modos de pool:**
- `session`: una conexión de servidor por sesión de cliente (default)
- `transaction`: conexión de servidor asignada por transacción (recomendado para la mayoría de apps)
- `statement`: conexión de servidor asignada por sentencia (sin transacciones multi-sentencia)

### Monitoreo de salud del pool

```python
# Python: monitorear pool psycopg2
print(f"Conexiones actuales: {pg_pool._used}")
print(f"Disponibles: {pg_pool._pool}")
```

```javascript
// Node.js: monitorear pg Pool
console.log({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount
});
```

```java
// Java: monitorear HikariCP
HikariPoolMXBean poolProxy = ds.getHikariPoolMXBean();
System.out.println("Activas: " + poolProxy.getActiveConnections());
System.out.println("Idle: " + poolProxy.getIdleConnections());
System.out.println("En espera: " + poolProxy.getThreadsAwaitingConnection());
```

### Fórmula de tamaño de pool

```
pool_size = (core_count * 2) + effective_spindle_count
```

Para setups solo SSD sin discos mecánicos:
```
pool_size = core_count * 2
```

Para PostgreSQL con `max_connections = 100` y 4 servicios:
```
pool_por_servicio = 100 / 4 = 25 conexiones
```

## Buenas prácticas adicionales

6. **Usa `pool_pre_ping` para conexiones long-lived.** Los reinicios de base de datos o problemas de red dejan conexiones stale. Pre-ping valida la conexión antes de usarla, añadiendo ~1ms de overhead pero previniendo errores.

7. **Configura `max_lifetime` menor que el timeout del lado base de datos.** Si la base de datos o firewall mata conexiones idle a los 30 minutos, configura `max_lifetime` a 25 minutos:

```python
engine = create_engine(
    "...",
    pool_recycle=1500  # 25 minutos
)
```

8. **Usa pools separados para lecturas y escrituras.** Ruta queries de solo lectura a pools de réplicas y escrituras al pool del primary. Esto previene que queries de lectura bloqueen transacciones de escritura.

9. **Configura `statement_timeout` por conexión.** Previene que queries lentos retengan conexiones del pool indefinidamente:

```sql
SET statement_timeout = '30s';
```

10. **Usa queries de validación de conexión.** Algunos pools soportan queries de validación. Usa una query ligera como `SELECT 1` para verificar la salud de la conexión:

```java
config.setConnectionTestQuery("SELECT 1");
```

## Errores comunes adicionales

6. **No configurar `connectionTimeout`.** Sin un timeout, las peticiones se bloquean indefinidamente cuando el pool se agota. Configura 2-5 segundos.

7. **Compartir un solo pool entre código async y sync.** Mezclar frameworks async (asyncio, Node.js) con librerías de pool sync causa deadlocks. Usa pools compatibles con async.

8. **Crear múltiples instancias de pool.** Cada pool abre sus propias conexiones. Múltiples pools en un proceso multiplican el conteo de conexiones y pueden exceder `max_connections`.

9. **No drenar pools al apagar.** No cerrar pools al salir de la aplicación deja conexiones huérfanas en el servidor de base de datos.

10. **Usar `pool_mode = session` en PgBouncer para serverless.** Las funciones serverless abren y cierran conexiones rápidamente. Usa modo `transaction` para multiplexar.

## Preguntas frecuentes adicionales

### ¿Cómo afecta el transaction pooling de PgBouncer a las prepared statements?

PgBouncer en modo transacción no soporta prepared statements a nivel sesión. Usa `prepared_statement_cache_size = 0` en tu driver o cambia a modo `session`. PostgreSQL 16+ soporta prepared statements a nivel protocol que funcionan con transaction pooling.

### ¿Cuál es la diferencia entre `pool_size` y `max_overflow` en SQLAlchemy?

`pool_size` es el número de conexiones persistentes. `max_overflow` permite conexiones temporales más allá de `pool_size` bajo carga. Cuando el tráfico baja, las conexiones de overflow se cierran primero.

### ¿Cómo manejo connection pooling en entornos serverless?

Usa PgBouncer o un proxy gestionado (AWS RDS Proxy, PlanetScale Proxy). Las funciones serverless escalan a cientos de instancias concurrentes, cada una necesitando una conexión. Un pooler del lado servidor multiplexa estas en un pool fijo pequeño.

### ¿Debo configurar conexiones `min_idle`?

Sí, para aplicaciones sensibles a latencia. Mantener 2-5 conexiones idle calientes elimina el coste de 20-100ms de setup de conexión para las primeras peticiones después de periodos idle.

## Tips de Rendimiento

1. **Monitorea `pg_stat_activity` para conteos de conexión.** Rastrea cuántas conexiones usa cada aplicación:

```sql
SELECT application_name, state, COUNT(*)
FROM pg_stat_activity
GROUP BY application_name, state
ORDER BY count DESC;
```

2. **Usa `pg_stat_statements` para encontrar queries que retienen conexiones.** Queries de larga ejecución ocupan conexiones del pool. Identifícalos:

```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

3. **Benchmark tamaños de pool con load testing.** Usa `pgbench` o `wrk` para encontrar el tamaño óptimo de pool para tu workload:

```bash
pgbench -c 20 -j 4 -T 60 -h localhost -p 5432 mydb
```

4. **Usa `LISTEN/NOTIFY` con una conexión dedicada.** PostgreSQL `LISTEN` retiene una conexión. Usa un pool separado o una conexión dedicada para event listeners.

5. **Ajusta `work_mem` por conexión.** Cada conexión asigna `work_mem` para sorts y hashes. Con 20 conexiones y `work_mem = 64MB`, eso es 1.28GB solo para memoria de sort.
