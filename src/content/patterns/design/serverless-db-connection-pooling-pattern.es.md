---
contentType: patterns
slug: serverless-db-connection-pooling-pattern
title: "Patrón Serverless DB Connection Pooling"
description: "Gestionar conexiones de base de datos entre invocaciones serverless usando poolers externos, reutilizacion de conexiones y clientes ligeros para evitar el agotamiento de conexiones."
metaDescription: "Gestionar conexiones de base de datos en funciones serverless con poolers externos como PgBouncer. Evitar agotamiento por invocaciones Lambda concurrentes."
difficulty: intermediate
topics:
  - serverless
  - databases
  - infrastructure
tags:
  - serverless-db-pooling
  - patron
  - patron-diseno
  - connection-pooling
  - pgbouncer
  - rds-proxy
  - lambda
relatedResources:
  - /patterns/design/serverless-throttling-pattern
  - /patterns/design/serverless-warm-pool-pattern
  - /patterns/design/serverless-function-composition-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Gestionar conexiones de base de datos en funciones serverless con poolers externos como PgBouncer. Evitar agotamiento por invocaciones Lambda concurrentes."
  keywords:
    - pooling conexiones serverless
    - pgbouncer lambda
    - rds proxy
    - connection pool serverless
    - patron diseno
---

## Descripción General

Las funciones serverless escalan horizontalmente creando muchas instancias concurrentes. Cada instancia puede abrir su propia conexion a la base de datos, y durante picos de trafico puedes tener cientos de conexiones simultaneas. La mayoria de bases de datos limitan las conexiones a unos cientos o miles. Cuando excedes ese limite, las nuevas conexiones fallan y todo el sistema se degrada.

El patron Serverless DB Connection Pooling resuelve esto colocando un pooler de conexiones externo entre tus funciones y la base de datos. El pooler mantiene un conjunto pequeno de conexiones persistentes y multiplexa las peticiones de las funciones a traves de ellas.

## Cuándo Usar

- Ejecutas funciones serverless (Lambda, Cloud Functions, Azure Functions) que se conectan a una base de datos relacional
- Ves errores `connection refused` o `too many connections` durante picos de trafico
- Tu conteo de conexiones escala linealmente con las invocaciones concurrentes
- Usas PostgreSQL o MySQL con RDS, Aurora, Cloud SQL o bases de datos administradas similares

## Solución

### Python (AWS Lambda + PgBouncer)

```python
import os
import psycopg2
from contextlib import contextmanager

# Conectar a traves de PgBouncer (modo transaction pooling)
# PgBouncer corre como sidecar o servicio administrado (RDS Proxy)
DB_HOST = os.environ.get("DB_HOST", "pgbouncer.internal")
DB_PORT = int(os.environ.get("DB_PORT", 6432))
DB_NAME = os.environ.get("DB_NAME", "appdb")
DB_USER = os.environ.get("DB_USER", "appuser")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "secret")

# Reutilizar conexion entre invocaciones calientes
_connection = None

def get_connection():
    global _connection
    if _connection is None or _connection.closed:
        _connection = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=3,
            application_name="lambda",
        )
    return _connection

@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()

def handler(event, context):
    with db_cursor() as cur:
        cur.execute("SELECT id, name FROM users WHERE active = TRUE LIMIT 10")
        rows = cur.fetchall()
    return {"statusCode": 200, "body": str(rows)}
```

### JavaScript (AWS Lambda + RDS Proxy)

```javascript
import pg from "pg";

const { Pool } = pg;

// El endpoint de RDS Proxy maneja el pooling automaticamente
// Establece max=1 por instancia Lambda — RDS Proxy multiplexa
const pool = new Pool({
  host: process.env.DB_HOST, // endpoint de RDS Proxy
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1, // Una conexion por contenedor Lambda
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

export const handler = async (event) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, name FROM users WHERE active = TRUE LIMIT 10"
    );
    return { statusCode: 200, body: JSON.stringify(result.rows) };
  } finally {
    client.release();
  }
};
```

### Java (AWS Lambda + HikariCP + PgBouncer)

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class DbHandler {
    private static HikariDataSource dataSource;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(
            "jdbc:postgresql://" + System.getenv("DB_HOST") + ":6432/appdb"
        );
        config.setUsername(System.getenv("DB_USER"));
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setMaximumPoolSize(1); // Una por instancia Lambda
        config.setConnectionTimeout(3000);
        config.setIdleTimeout(30000);
        // PgBouncer transaction pooling — desactivar prepared statements
        config.addDataSourceProperty("prepareThreshold", "0");
        dataSource = new HikariDataSource(config);
    }

    public String handleRequest(Object event, Object context) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                 "SELECT id, name FROM users WHERE active = TRUE LIMIT 10")) {
            ResultSet rs = ps.executeQuery();
            StringBuilder sb = new StringBuilder();
            while (rs.next()) {
                sb.append(rs.getInt("id")).append(":").append(rs.getString("name")).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("DB query failed", e);
        }
    }
}
```

## Explicación

La idea central es desacoplar el conteo de conexiones del conteo de invocaciones. Sin pooler, 500 invocaciones Lambda concurrentes crean 500 conexiones a la base de datos. Con un pooler como PgBouncer o RDS Proxy, esas 500 invocaciones comparten 20-50 conexiones agrupadas.

**PgBouncer** se situa entre tus funciones y la base de datos. Acepta muchas conexiones de cliente y enruta sus consultas a traves de un pool pequeno de conexiones al servidor. En **modo transaction pooling**, PgBouncer asigna una conexion del servidor solo durante la transaccion y luego la devuelve al pool.

**AWS RDS Proxy** es un pooler administrado que hace lo mismo sin infraestructura. Maneja failover, reutilizacion de conexiones y rotacion de secretos automaticamente.

**Reutilizacion entre invocaciones calientes**: Lambda reutiliza entornos de ejecucion entre invocaciones. Al mantener una conexion abierta en el ambito del modulo, las invocaciones calientes omiten el costo de conexion. Los cold starts siguen pagando el costo completo, pero un pooler hace esa conexion barata porque multiplexa.

## Variantes

| Variante | Herramienta | Caso de Uso | Compromiso |
|----------|-------------|-------------|------------|
| **Pooler Externo** | PgBouncer, Pgpool | Bases de datos auto-administradas | Control total, requiere ops |
| **Proxy Administrado** | RDS Proxy, Aurora Serverless | Bases de datos AWS administradas | Zero ops, solo AWS, costo extra |
| **API de Datos HTTP** | Aurora Data API, PlanetScale HTTP | Sin conexiones persistentes | Sin conexion TCP, mayor latencia por consulta |
| **Sin Conexiones** | DynamoDB, FaunaDB | NoSQL nativo serverless | Sin pooling, modelo de consulta diferente |

## Qué Funciona

- Establece `max=1` conexion por instancia Lambda — el pooler maneja la multiplexacion
- Usa modo transaction pooling en PgBouncer para maxima eficiencia
- Desactiva el cache de prepared statements con PgBouncer (se rompe en modo transaccion)
- Manten conexiones en el ambito del modulo para reutilizar entre invocaciones calientes
- Establece timeouts de conexion agresivos (3-5 segundos) para fallar rapido
- Usa RDS Proxy para bases de datos administradas y evitar administrar PgBouncer
- Monitorea el conteo de conexiones y configura alarmas al 70% del maximo

## Errores Comunes

- **Abrir una nueva conexion por peticion**: Causa agotamiento bajo carga. Reutiliza conexiones en el ambito del modulo.
- **Usar session pooling con PgBouncer**: Session pooling mantiene conexiones del servidor durante toda la sesion del cliente, anulando el proposito. Usa transaction pooling.
- **Olvidar cerrar conexiones en caso de error**: Filtra conexiones. Siempre usa try/finally o context managers.
- **Establecer `max` muy alto en HikariCP**: Cada contenedor Lambda es un proceso separado. 100 contenedores × 10 conexiones = 1000 conexiones. Manten `max=1`.
- **Usar prepared statements con PgBouncer modo transaccion**: Los prepared statements son de ambito de sesion y se rompen cuando PgBouncer reasigna conexiones. Establece `prepareThreshold=0`.
- **No manejar la latencia de conexion en cold start**: Los cold starts pagan el costo completo de conexion. Usa provisioned concurrency o acepta la latencia.

## Preguntas Frecuentes

### ¿Debería usar RDS Proxy o PgBouncer?

RDS Proxy si estas en AWS y quieres zero ops. PgBouncer si necesitas mas control, corres fuera de AWS o quieres ahorrar costos de RDS Proxy.

### ¿Puedo usar connection pooling con Aurora Serverless?

Aurora Serverless v2 soporta la Data API, que es basada en HTTP y no necesita pooling. Para conexiones JDBC/ODBC estandar, usa RDS Proxy.

### ¿Cuántas conexiones debería permitir mi base de datos?

Formula aproximada: `max_connections = (memoria_disponible / (work_mem + overhead))`. Para PostgreSQL en db.r6g.large (16GB), 100-200 conexiones es razonable. Con un pooler necesitas muchas menos.

### ¿Este patrón aplica a bases de datos NoSQL?

DynamoDB y bases de datos nativas serverless similares usan APIs HTTP y no necesitan pooling. MongoDB y Redis si se benefician del pooling en entornos serverless.
