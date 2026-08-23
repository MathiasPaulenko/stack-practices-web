---
contentType: recipes
slug: connection-pooling
title: "Configurar connection pooling para bases de datos y HTTP"
description: "Configura connection pooling para PostgreSQL, MySQL, Redis y clientes HTTP en Python, JavaScript y Java. Reduce latencia y evita agotamiento de conexiones."
metaDescription: "Configura connection pooling para PostgreSQL, MySQL, Redis y clientes HTTP en Python, JavaScript y Java. Reduce latencia y evita agotamiento de conexiones."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - connection-pooling
  - postgresql
  - redis
  - http-client
  - optimization
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/performance-optimization-guide
  - /recipes/database-indexing
  - /recipes/query-optimization
  - /patterns/cache-aside-pattern
  - /recipes/redis-cache-patterns
lastUpdated: "2026-08-23"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Configura connection pooling para PostgreSQL, MySQL, Redis y clientes HTTP en Python, JavaScript y Java. Reduce latencia y evita agotamiento de conexiones."
  keywords:
    - connection pooling
    - postgresql
    - hikari
    - redis
    - http client
    - rendimiento
---

## Visión General

Abrir una nueva conexión de base de datos o HTTP para cada petición es costoso. El handshake TCP, la
negociación TLS y la autenticación en la base de datos suman latencia y consumen CPU en ambos lados. El
connection pooling mantiene un conjunto reutilizable de conexiones ya establecidas: tu código toma una,
ejecuta una consulta o llamada a API, y la devuelve. El resultado es menos latencia, mayor throughput y
muchos menos errores de "demasiadas conexiones".

Cubrimos pools de base de datos para PostgreSQL, MySQL y Redis, más pooling de clientes HTTP en Python,
JavaScript y Java.

## Cuándo Usar

Usá connection pooling cuando tu aplicación abre una conexión nueva por petición y el throughput es bajo,
cuando estás recibiendo errores de "demasiadas conexiones" bajo carga, cuando hacés llamadas frecuentes a
APIs externas y querés reutilizar TCP, o cuando necesitás limitar la concurrencia para proteger una base
de datos o servicio remoto.

## Cuándo Evitar

Evitalo cuando un script de corta duración ejecuta una sola consulta y sale, porque el overhead del pool
no vale la pena. También evitalo si tu driver o cliente HTTP ya maneja conexiones persistentes de forma
transparente, o si corrés en una plataforma serverless con límites estrictos de vida de conexiones.

## Solución

### Python

```python
import psycopg2
from psycopg2 import pool
import requests
from requests.adapters import HTTPAdapter

# Pool de conexiones PostgreSQL
pg_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host="localhost",
    database="app",
    user="app",
    password="secret"
)

def get_user(user_id: int):
    conn = pg_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()
    finally:
        pg_pool.putconn(conn)

# Pool de conexiones HTTP
session = requests.Session()
adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20)
session.mount("https://", adapter)
session.mount("http://", adapter)

resp = session.get("https://api.example.com/data")
```

### JavaScript

```javascript
const { Pool } = require('pg');
const axios = require('axios');

// Pool de conexiones PostgreSQL
const pgPool = new Pool({
  host: 'localhost',
  database: 'app',
  user: 'app',
  password: 'secret',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function getUser(userId) {
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Cliente HTTP con keep-alive
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 });

const api = axios.create({ httpAgent, httpsAgent });

api.get('https://api.example.com/data')
  .then(res => console.log(res.data));
```

### Java

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import java.util.concurrent.TimeUnit;

// HikariCP — el estándar de oro para pooling en JVM
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost/app");
config.setUsername("app");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setConnectionTimeout(2000);
config.setIdleTimeout(30000);
config.addDataSourceProperty("cachePrepStmts", "true");

HikariDataSource ds = new HikariDataSource(config);

int userId = 1;
try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setInt(1, userId);
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
}

// Cliente HTTP con pool acotado
OkHttpClient httpClient = new OkHttpClient.Builder()
    .connectionPool(new ConnectionPool(20, 5, TimeUnit.MINUTES))
    .connectTimeout(5, TimeUnit.SECONDS)
    .build();

Request request = new Request.Builder()
    .url("https://api.example.com/data")
    .build();

httpClient.newCall(request).execute();
```

## Explicación

Un connection pool es una cola acotada de conexiones TCP ya establecidas. Cuando tu código pide una, el
pool entrega una conexión inactiva en lugar de abrir un nuevo socket. Cuando termina el trabajo, la
conexión vuelve al pool en lugar de cerrarse, así la mayoría de las operaciones se salta el costo del
handshake y la autenticación.

Hay algunas palancas importantes. El tamaño mínimo mantiene conexiones precalentadas para que la primera
petición no sea lenta. El tamaño máximo es el techo que evita que el pool sature la base de datos o el
servidor remoto. El connection timeout decide cuánto espera el llamador antes de rendirse. El idle
timeout cierra conexiones que estuvieron inactivas un tiempo. El max lifetime limita qué tan vieja puede
ser una conexión antes de ser reemplazada, lo cual evita sockets viejos y facilita la rotación de
credenciales.

Para clientes HTTP, `keep-alive` reutiliza la conexión TCP subyacente entre peticiones al mismo host,
ahorrando el handshake TLS en cada llamada. Si la base de datos sigue siendo el cuello de botella después
de ajustar el pool, los siguientes pasos suelen ser consultas y esquema. Consultá
[database indexing](/es/recipes/database-indexing/) y [query optimization](/es/recipes/query-optimization/).

## Variantes

| Tecnología | Enfoque | Notas |
| ------------ | --------- | ------- |
| **PostgreSQL** | `psycopg2.pool` / `pg` / HikariCP | Pools threaded o async; ajustá el tamaño a la concurrencia |
| **MySQL** | `mysql-connector-python` / `mysql2` / HikariCP | Controlá `wait_timeout` y `max_connections` |
| **Redis** | connection pool de `redis-py` / `ioredis` / Lettuce | Rápido, pero el pool importa en alta concurrencia |
| **HTTP (Python)** | `requests.Session` + `HTTPAdapter` | `pool_maxsize` controla conexiones por host |
| **HTTP (Node)** | `axios` + `http.Agent` | `maxSockets` controla conexiones paralelas |
| **HTTP (Java)** | OkHttp `ConnectionPool` / Apache HttpClient | Managers integrados con límites por ruta |

## Mejores Prácticas

Dimensioná el pool según tu concurrencia real, no la cantidad de núcleos. Empezá con la cantidad de
workers concurrentes más un pequeño margen y ajustá desde ahí. Siempre liberá conexiones en un bloque
`finally` para que vuelvan al pool incluso si hay una excepción. Mantené `connectionTimeout` menor que el
timeout total de la petición de tu aplicación para fallar rápido en lugar de quedarse colgado. Monitoreá
conexiones activas, inactivas, en espera y totales; si se encolan, el pool es chico o la base de datos
está saturada. Activá el cache de prepared statements a nivel de pool cuando esté disponible, como
`cachePrepStmts` de HikariCP. Usá TLS para conexiones de base de datos y HTTP entre servicios, pero
mantené un idle timeout razonable para cerrar sockets viejos. Para una estrategia general de rendimiento,
consultá la [guía de optimización de
performance](/es/guides/performance-optimization-guide/).

## Errores Comunes

El más grande es no liberar conexiones: una que no se devuelve eventualmente vacía el pool y bloquea
todas las peticiones. Un pool size de 1 serializa todo el acceso a base de datos y mata el throughput. Un
pool demasiado grande puede saturar el límite `max_connections` de la base de datos y gastar memoria.
Ignorar idle timeouts produce conexiones stale y fallos silenciosos. Desactivar HTTP keep-alive desperdicia
milisegundos y CPU reabriendo TLS en cada petición externa. Compartir un mismo pool entre bases de datos
no relacionadas acopla tráfico y hace imposible ajustarlo; usá un pool por base de datos y por instancia
de aplicación.

## Preguntas Frecuentes

### ¿Cuál es el tamaño óptimo del pool?

Para cargas OLTP, empezá con `(núcleos * 2) + discos_efectivos`. En entornos cloud o contenerizados, igualá
el tamaño del pool a la concurrencia de la aplicación, no a los núcleos de CPU. Monitoreá métricas de
`waiting` y aumentá solo si las conexiones empiezan a encolarse.

### ¿Debo usar un pool o varios?

Un pool por base de datos por instancia de aplicación es lo usual. Varios pools a la misma base de datos
fragmentan recursos y reducen eficiencia. En microservicios, cada servicio gestiona su propio pool.

### ¿Cómo manejo el agotamiento del pool?

Mantené `connectionTimeout` corto para que las peticiones fallen rápido en lugar de colgarse
indefinidamente. Agregá circuit breakers o reintentos con backoff. Monitoreá la saturación del pool y
escalá la base de datos o los workers antes de que el agotamiento sea crítico.

### ¿Y el pooling de conexiones HTTP?

HTTP keep-alive y pools acotados permiten reutilizar conexiones TLS con el mismo host. Paga cuando tu
servicio llama repetidamente a las mismas pocas APIs de bajada. Configurá `pool_maxsize` o `maxSockets`
suficiente para tu concurrencia, pero no tanto que agotes los puertos efímeros.
