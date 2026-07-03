---
contentType: recipes
slug: connection-pooling
title: "Configurar connection pooling para bases de datos y clientes HTTP"
description: "Cómo configurar connection pooling para bases de datos y clientes HTTP para mejorar rendimiento y confiabilidad"
metaDescription: "Configura connection pooling para PostgreSQL, MySQL, Redis y clientes HTTP. Mejora throughput, reduce latencia y previene agotamiento de conexiones."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - optimization
  - profiling
  - latency
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/performance-optimization-guide
  - /recipes/cdn-edge-caching
  - /recipes/debounce-throttle
  - /patterns/cache-aside-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura connection pooling para PostgreSQL, MySQL, Redis y clientes HTTP. Mejora throughput, reduce latencia y previene agotamiento de conexiones."
  keywords:
    - connection-pooling
    - base-datos
    - postgresql
    - redis
    - http-client
    - rendimiento
---
## Visión General

Abrir una nueva conexión de base de datos o HTTP para cada petición es costoso. El connection pooling mantiene un conjunto reutilizable de conexiones ya establecidas, reduciendo drásticamente la latencia y previniendo el agotamiento de recursos bajo carga. La mayoría de los incidentes en producción relacionados con "demasiadas conexiones" se resuelven con una configuración adecuada del pool.

Esta receta cubre connection pooling de base de datos con PostgreSQL, MySQL y Redis, más pooling de clientes HTTP para llamadas a APIs externas.

## Cuándo Usar

Usa este recurso cuando:
- Tu aplicación abre una conexión nueva por petición y el throughput es bajo. Consulta [SQL Performance Tuning](/guides/databases/sql-performance-tuning-guide) para optimización previa.
- Recibes errores de "demasiadas conexiones" bajo carga. Consulta [Performance Optimization](/guides/performance/performance-optimization-guide) para diagnóstico de cuellos de botella.
- Haces llamadas HTTP frecuentes a APIs externas y quieres reutilizar conexiones TCP. Consulta [Call REST API](/recipes/api/call-rest-api) para patrones de cliente HTTP.
- Necesitas ajustar los límites de concurrencia para un servicio web o worker. Consulta [Rate Limiting](/recipes/api/rate-limiting) para control de concurrencia.

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
const httpAgent = new (require('http').Agent)({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new (require('https').Agent)({ keepAlive: true, maxSockets: 20 });

const api = axios.create({ httpAgent, httpsAgent });
```

### Java

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

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

try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setInt(1, userId);
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
}

// Cliente HTTP con pooling (Java 11+)
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
```

## Explicación

El connection pooling funciona manteniendo una cola acotada de conexiones TCP ya establecidas. Cuando tu código solicita una conexión, el pool entrega una inactiva en lugar de abrir un nuevo socket. Cuando la operación termina, la conexión vuelve al pool en lugar de cerrarse.

**Parámetros clave del pool:**
- **min connections**: Conexiones precalentadas listas al inicio
- **max connections**: Tope máximo para proteger la base de datos o servidor remoto
- **connection timeout**: Cuánto esperar por una conexión disponible antes de fallar
- **idle timeout**: Cuánto mantener una conexión inactiva abierta antes de cerrarla

Para clientes HTTP, `keep-alive` reutiliza la conexión TCP subyacente entre múltiples peticiones al mismo host, eliminando el overhead del handshake TLS en cada llamada.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| PostgreSQL | psycopg2.pool / pg / HikariCP | ThreadedConnectionPool para threads, AsyncConnectionPool para asyncio |
| MySQL | mysql-connector-python / mysql2 / HikariCP | Mismos conceptos de pool; cuidado con `wait_timeout` del servidor |
| Redis | redis-py connection pool / ioredis / Lettuce | Redis es rápido, pero el pool sigue siendo importante en alta concurrencia |
| HTTP (Python) | requests Session + HTTPAdapter | `pool_maxsize` controla conexiones por host |
| HTTP (Node) | axios + http.Agent | `maxSockets` controla conexiones paralelas |
| HTTP (Java) | Apache HttpClient / OkHttp | Connection managers integrados con límites por ruta |

## Lo que funciona

1. Ajusta `max pool size` aproximadamente al número de workers concurrentes (threads, procesos o concurrencia del event loop)
2. Siempre usa `release()` o `putconn()` en un bloque `finally` para evitar fugas
3. Configura `connectionTimeout` menor que el timeout total de la petición de tu aplicación
4. Monitorea métricas del pool: activas, inactivas, en espera y totales
5. Usa cache de prepared statements a nivel de pool cuando esté disponible (ej. HikariCP `cachePrepStmts`)

## Errores Comunes

1. **No liberar conexiones** — siempre devuélvelas al pool, incluso ante excepciones
2. **Pool size = 1** — serializa todo el acceso a base de datos y mata el throughput
3. **Pool demasiado grande** — puede saturar la base de datos con límites de `max_connections`
4. **Ignorar idle timeouts** — conexiones stale causan fallos silenciosos o sockets semiabiertos
5. **Sin HTTP keep-alive** — reabrir TLS en cada petición externa desperdicia milisegundos

## Preguntas Frecuentes

### ¿Cuál es el tamaño óptimo del pool?

Un buen punto de partida es `(núcleos * 2) + discos_efectivos` para cargas OLTP. Para bases de datos en la nube, iguala el tamaño del pool a la concurrencia de la aplicación, no a los núcleos de CPU. Monitorea métricas de `waiting` y aumenta solo si las conexiones se encolan.

### ¿Debo usar un pool o varios?

Un pool por base de datos por instancia de aplicación es el estándar. Crear múltiples pools a la misma base de datos fragmenta recursos y reduce eficiencia. Para microservicios, cada servicio gestiona su propio pool.

### ¿Cómo manejo el agotamiento del pool?

Configura un `connectionTimeout` razonable para que las peticiones fallen rápido en lugar de colgarse indefinidamente. Agrega circuit breakers o reintentos con backoff. Monitorea la saturación del pool y escala la base de datos o los workers antes de que el agotamiento sea crítico.
