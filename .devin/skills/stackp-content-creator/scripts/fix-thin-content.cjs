#!/usr/bin/env node
/**
 * fix-thin-content.cjs — Fill Phase 0 stub recipes with real content
 * Targets: api-rate-limiting (EN+ES), database-connection-pooling (EN+ES)
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../../../..', 'src', 'content');

// ─── api-rate-limiting.md ─────────────────────────────────────────────────────
const apiRateLimitingEN = `---
contentType: recipes
slug: api-rate-limiting
title: "API Rate Limiting"
description: "Protect APIs from abuse and ensure fair resource usage with token bucket, sliding window, and leaky bucket rate limiting."
metaDescription: "API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
difficulty: intermediate
topics:
  - api
tags:
  - rate-limiting
  - api
  - redis
  - security
  - token-bucket
  - sliding-window
relatedResources:
  - /recipes/api-rate-limiting-redis
  - /guides/security/api-security-checklist-guide
  - /recipes/caching/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-03"
author: "StackPractices"
seo:
  metaDescription: "API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
  keywords:
    - rate-limiting
    - api
    - redis
    - security
---
## Overview

Rate limiting protects APIs from abuse and ensures fair resource distribution across clients. Three algorithms cover most use cases: token bucket allows bursts, sliding window enforces strict limits, and leaky bucket smooths traffic.

## When to Use

Use this resource when:
- Public APIs need protection against brute force and scraping
- Different user tiers require different rate limits
- Multiple API nodes must share rate limit state consistently

## Solution

### Python (Token Bucket with Redis)

\`\`\`python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def token_bucket(key, capacity=10, refill_rate=1.0):
    """Token bucket algorithm using Redis INCR with expiry."""
    now = time.time()
    bucket_key = f"rate_limit:{key}"
    tokens = r.hgetall(bucket_key)

    if not tokens:
        r.hset(bucket_key, mapping={"tokens": capacity - 1, "last_refill": now})
        r.expire(bucket_key, int(capacity / refill_rate) + 1)
        return True

    current_tokens = float(tokens.get(b"tokens", 0))
    last_refill = float(tokens.get(b"last_refill", now))
    elapsed = now - last_refill
    current_tokens = min(capacity, current_tokens + elapsed * refill_rate)

    if current_tokens < 1:
        r.hset(bucket_key, mapping={"tokens": current_tokens, "last_refill": now})
        return False

    r.hset(bucket_key, mapping={"tokens": current_tokens - 1, "last_refill": now})
    return True
\`\`\`

### JavaScript (Sliding Window with Redis)

\`\`\`javascript
import { createClient } from 'redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

async function slidingWindow(key, limit = 100, windowSec = 60) {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const sortedSetKey = \`rate_limit:\${key}\`;

  // Remove entries outside the window
  await client.zRemRangeByScore(sortedSetKey, 0, windowStart);

  // Count current entries
  const count = await client.zCard(sortedSetKey);

  if (count >= limit) {
    return { allowed: false, retryAfter: windowSec };
  }

  // Add current request
  await client.zAdd(sortedSetKey, [{ score: now, value: \`\${now}\` }]);
  await client.expire(sortedSetKey, windowSec);

  return { allowed: true, remaining: limit - count - 1 };
}
\`\`\`

### Java (Leaky Bucket)

\`\`\`java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class LeakyBucket {
    private static final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    static class Bucket {
        final int capacity;
        final double leakRatePerSec;
        double water;
        long lastLeak;

        Bucket(int capacity, double leakRatePerSec) {
            this.capacity = capacity;
            this.leakRatePerSec = leakRatePerSec;
            this.water = 0;
            this.lastLeak = System.currentTimeMillis();
        }

        synchronized boolean allow() {
            long now = System.currentTimeMillis();
            double elapsed = (now - lastLeak) / 1000.0;
            water = Math.max(0, water - elapsed * leakRatePerSec);
            lastLeak = now;
            if (water < capacity) {
                water += 1;
                return true;
            }
            return false;
        }
    }

    public static boolean allowRequest(String clientId, int capacity, double leakRate) {
        return buckets.computeIfAbsent(clientId, k -> new Bucket(capacity, leakRate)).allow();
    }
}
\`\`\`

## Explanation

**Token bucket** maintains a pool of tokens that refills at a fixed rate. Each request consumes one token. If no tokens are available, the request is rejected. This allows short bursts up to the bucket capacity while maintaining an average rate.

**Sliding window** tracks requests within a time window and rejects new requests once the limit is reached. Unlike fixed windows, it avoids boundary spikes by using a rolling window.

**Leaky bucket** processes requests at a fixed rate regardless of arrival pattern. Incoming requests queue up and "leak" out at a constant rate, smoothing bursty traffic.

## Variants

| Algorithm | Burst Handling | Memory | Best For |
|-----------|---------------|--------|----------|
| Token bucket | Allows bursts up to capacity | Low | APIs with bursty traffic |
| Sliding window | Strict per-window limit | Medium | Payment APIs, sensitive endpoints |
| Leaky bucket | Smooths to constant rate | Low | Downstream service protection |

## What Works

1. Use token bucket for controlled bursts and sliding window for strict limits
2. Return \`Retry-After\` headers with 429 responses so clients know when to retry
3. Rate limit by user ID, not just IP, to avoid blocking legitimate users behind NAT
4. Log rate limit violations for security monitoring and abuse detection
5. Implement a circuit breaker around Redis to fail open if the cache is down

## Common Mistakes

1. Rate limiting only by IP, which blocks legitimate users behind NAT
2. Not handling Redis failures gracefully, causing API outages
3. Returning 429 without \`Retry-After\` headers, leaving clients guessing
4. Using the same rate limit for all endpoints regardless of cost or sensitivity
5. Ignoring rate limit violations instead of logging them for security analysis

## Frequently Asked Questions

### Should I fail open or closed when Redis is down?

Fail open for rate limiting. Rejecting all requests because the rate limiter is unavailable causes worse outages than allowing traffic through temporarily. Log the failure and alert on it.

### How do I handle distributed rate limiting across multiple nodes?

Use a shared store like Redis. Each node checks and increments the counter in Redis. For lower latency, use local token buckets with periodic Redis synchronization, accepting slightly less precise limits.

### What rate limit values should I start with?

Start with 100 requests per minute for authenticated users and 10 per minute for anonymous. Monitor usage patterns and adjust. Expensive endpoints (exports, reports) should have separate, lower limits.
`;

const apiRateLimitingES = `---
contentType: recipes
slug: api-rate-limiting
title: "Rate Limiting de APIs"
description: "Protege las APIs de abuso y asegura uso justo de recursos con token bucket, sliding window y leaky bucket."
metaDescription: "Estrategias de rate limiting para APIs: algoritmos token bucket, sliding window, leaky bucket, rate limiters basados en Redis y rate limiting distribuido."
difficulty: intermediate
topics:
  - api
tags:
  - rate-limiting
  - api
  - redis
  - security
  - token-bucket
  - sliding-window
relatedResources:
  - /recipes/api-rate-limiting-redis
  - /guides/security/api-security-checklist-guide
  - /recipes/caching/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-03"
author: "StackPractices"
seo:
  metaDescription: "Estrategias de rate limiting para APIs: algoritmos token bucket, sliding window, leaky bucket, rate limiters basados en Redis y rate limiting distribuido."
  keywords:
    - rate-limiting
    - api
    - redis
    - security
---
## Visión General

El rate limiting protege las APIs de abuso y asegura distribución justa de recursos entre clientes. Tres algoritmos cubren la mayoría de los casos: token bucket permite bursts, sliding window impone límites estrictos y leaky bucket suaviza el tráfico.

## Cuándo Usar

Usa este recurso cuando:
- APIs públicas necesitan protección contra brute force y scraping
- Diferentes tiers de usuarios requieren diferentes rate limits
- Múltiples nodos de API deben compartir estado de rate limit consistentemente

## Solución

### Python (Token Bucket con Redis)

\`\`\`python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def token_bucket(key, capacity=10, refill_rate=1.0):
    """Algoritmo token bucket usando Redis INCR con expiración."""
    now = time.time()
    bucket_key = f"rate_limit:{key}"
    tokens = r.hgetall(bucket_key)

    if not tokens:
        r.hset(bucket_key, mapping={"tokens": capacity - 1, "last_refill": now})
        r.expire(bucket_key, int(capacity / refill_rate) + 1)
        return True

    current_tokens = float(tokens.get(b"tokens", 0))
    last_refill = float(tokens.get(b"last_refill", now))
    elapsed = now - last_refill
    current_tokens = min(capacity, current_tokens + elapsed * refill_rate)

    if current_tokens < 1:
        r.hset(bucket_key, mapping={"tokens": current_tokens, "last_refill": now})
        return False

    r.hset(bucket_key, mapping={"tokens": current_tokens - 1, "last_refill": now})
    return True
\`\`\`

### JavaScript (Sliding Window con Redis)

\`\`\`javascript
import { createClient } from 'redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

async function slidingWindow(key, limit = 100, windowSec = 60) {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const sortedSetKey = \`rate_limit:\${key}\`;

  // Eliminar entradas fuera de la ventana
  await client.zRemRangeByScore(sortedSetKey, 0, windowStart);

  // Contar entradas actuales
  const count = await client.zCard(sortedSetKey);

  if (count >= limit) {
    return { allowed: false, retryAfter: windowSec };
  }

  // Agregar petición actual
  await client.zAdd(sortedSetKey, [{ score: now, value: \`\${now}\` }]);
  await client.expire(sortedSetKey, windowSec);

  return { allowed: true, remaining: limit - count - 1 };
}
\`\`\`

### Java (Leaky Bucket)

\`\`\`java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class LeakyBucket {
    private static final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    static class Bucket {
        final int capacity;
        final double leakRatePerSec;
        double water;
        long lastLeak;

        Bucket(int capacity, double leakRatePerSec) {
            this.capacity = capacity;
            this.leakRatePerSec = leakRatePerSec;
            this.water = 0;
            this.lastLeak = System.currentTimeMillis();
        }

        synchronized boolean allow() {
            long now = System.currentTimeMillis();
            double elapsed = (now - lastLeak) / 1000.0;
            water = Math.max(0, water - elapsed * leakRatePerSec);
            lastLeak = now;
            if (water < capacity) {
                water += 1;
                return true;
            }
            return false;
        }
    }

    public static boolean allowRequest(String clientId, int capacity, double leakRate) {
        return buckets.computeIfAbsent(clientId, k -> new Bucket(capacity, leakRate)).allow();
    }
}
\`\`\`

## Explicación

**Token bucket** mantiene un pool de tokens que se rellena a una tasa fija. Cada petición consume un token. Si no hay tokens disponibles, la petición se rechaza. Permite bursts cortos hasta la capacidad del bucket manteniendo una tasa promedio.

**Sliding window** rastrea peticiones dentro de una ventana temporal y rechaza nuevas peticiones cuando se alcanza el límite. A diferencia de las ventanas fijas, evita picos en los límites usando una ventana deslizante.

**Leaky bucket** procesa peticiones a una tasa fija sin importar el patrón de llegada. Las peticiones entrantes se acumulan y "gotean" a una tasa constante, suavizando el tráfico bursty.

## Variantes

| Algoritmo | Manejo de Bursts | Memoria | Ideal Para |
|-----------|-----------------|---------|------------|
| Token bucket | Permite bursts hasta capacidad | Baja | APIs con tráfico bursty |
| Sliding window | Límite estricto por ventana | Media | APIs de pagos, endpoints sensibles |
| Leaky bucket | Suaviza a tasa constante | Baja | Protección de servicios downstream |

## Lo que funciona

1. Usa token bucket para bursts controlados y sliding window para límites estrictos
2. Retorna headers \`Retry-After\` con respuestas 429 para que los clientes sepan cuándo reintentar
3. Rate limita por ID de usuario, no solo por IP, para evitar bloquear usuarios legítimos detrás de NAT
4. Loguea violaciones de rate limit para monitoreo de seguridad y detección de abuso
5. Implementa circuit breaker alrededor de Redis para fail open si el cache cae

## Errores Comunes

1. Rate limitar solo por IP, bloqueando usuarios legítimos detrás de NAT
2. No manejar fallos de Redis gracefulmente, causando outages de API
3. Retornar 429 sin headers \`Retry-After\`, dejando clientes adivinando
4. Usar el mismo rate limit para todos los endpoints sin importar costo o sensibilidad
5. Ignorar violaciones de rate limit en lugar de loguearlas para análisis de seguridad

## Preguntas Frecuentes

### ¿Debo fail open o closed cuando Redis cae?

Fail open para rate limiting. Rechazar todas las peticiones porque el rate limiter no está disponible causa peores outages que permitir tráfico temporalmente. Loguea el fallo y alerta sobre él.

### ¿Cómo manejo rate limiting distribuido entre múltiples nodos?

Usa un store compartido como Redis. Cada nodo verifica e incrementa el contador en Redis. Para menor latencia, usa token buckets locales con sincronización periódica con Redis, aceptando límites ligeramente menos precisos.

### ¿Con qué valores de rate limit debo empezar?

Empieza con 100 peticiones por minuto para usuarios autenticados y 10 por minuto para anónimos. Monitorea patrones de uso y ajusta. Endpoints costosos (exports, reports) deben tener límites separados más bajos.
`;

// ─── database-connection-pooling.md ──────────────────────────────────────────
const dbPoolingEN = `---
contentType: recipes
slug: database-connection-pooling
title: "Database Connection Pooling"
description: "Configure and tune database connection pools to maximize throughput while preventing connection exhaustion."
metaDescription: "Database connection pooling: configure, tune, and monitor pools for PostgreSQL, MySQL, and Redis to prevent exhaustion and improve throughput."
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
  metaDescription: "Database connection pooling: configure, tune, and monitor pools for PostgreSQL, MySQL, and Redis to prevent exhaustion and improve throughput."
  keywords:
    - connection-pooling
    - databases
    - postgresql
    - performance
---
## Overview

Connection pooling reuses established database connections instead of creating a new one per request. Each new connection requires a TCP handshake, TLS negotiation, and authentication, adding 20-100ms of overhead. Under load, creating connections per request exhausts the database's connection limit and causes cascading failures.

## When to Use

Use this resource when:
- Your application opens too many connections and the database rejects new requests
- Latency spikes occur because establishing a TCP + TLS + auth handshake on every request is expensive
- You need to tune connection limits for serverless or high-concurrency architectures

## Solution

### Python (psycopg2 + psycopg2.pool)

\`\`\`python
from psycopg2 import pool

# Create a connection pool with min and max connections
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

# Always return connections to the pool
results = query_db("SELECT * FROM users WHERE active = %s", (True,))
\`\`\`

### JavaScript (pg Pool)

\`\`\`javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'secret',
  max: 20,              // max connections
  min: 5,               // min connections kept ready
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
\`\`\`

### Java (HikariCP)

\`\`\`java
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
\`\`\`

## Explanation

A connection pool maintains a set of open database connections. When a request needs a connection, it borrows one from the pool, uses it, and returns it. This eliminates the per-request connection overhead.

**Pool sizing** is the most critical tuning parameter. Too few connections cause requests to queue. Too many connections overwhelm the database. A common formula: \`pool_size = (core_count * 2) + effective_spindle_count\`.

**Idle timeout** closes connections that haven't been used for a while, freeing database resources during low traffic. **Max lifetime** prevents long-lived connections from accumulating stale state or hitting database-side timeouts.

## Variants

| Pool Library | Language | Key Feature |
|-------------|----------|-------------|
| psycopg2.pool | Python | ThreadedConnectionPool for multi-threaded apps |
| pg Pool | Node.js | Built-in promise support, auto-reconnect |
| HikariCP | Java | Fastest JDBC pool, metrics via Micrometer |
| PgBouncer | External | Server-side pooler, multiplexes connections |

## What Works

1. Size pools based on database capacity, not application thread count
2. Set idle timeout to close unused connections during low traffic periods
3. Monitor pool metrics: active, idle, and waiting connections
4. Use a server-side pooler like PgBouncer for serverless or many small clients
5. Always return connections in a finally block to prevent leaks

## Common Mistakes

1. Setting max pool size too high, overwhelming the database with connections
2. Not returning connections to the pool, causing connection leaks
3. Using the same pool for transactional and read-only queries
4. Not monitoring wait times, letting slow queries block the entire pool
5. Forgetting to set max lifetime, causing stale connections after database restarts

## Frequently Asked Questions

### How many connections should my pool have?

Start with \`((core_count * 2) + disk_spindles)\` and tune from there. For PostgreSQL, the default \`max_connections\` is 100. If multiple services connect, divide that budget across them. PgBouncer can multiplex thousands of clients onto a small pool.

### Should I use PgBouncer instead of application-level pooling?

Use both. PgBouncer multiplexes application connections to a smaller set of database connections, which helps with serverless and many small services. Application-level pooling reduces connection latency and gives you per-request metrics.

### How do I detect connection leaks?

Monitor the pool's active count. If it steadily increases and never drops, connections are not being returned. In Java, HikariCP logs leaks after \`leakDetectionThreshold\` (default 0, set to 60000ms). In Node.js, track \`pool.totalCount\` vs \`pool.idleCount\`.
`;

const dbPoolingES = `---
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

\`\`\`python
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
\`\`\`

### JavaScript (pg Pool)

\`\`\`javascript
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
\`\`\`

### Java (HikariCP)

\`\`\`java
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
\`\`\`

## Explicación

Un pool de conexiones mantiene un conjunto de conexiones abiertas a la base de datos. Cuando una petición necesita una conexión, la toma prestada del pool, la usa y la devuelve. Esto elimina el overhead de conexión por petición.

**Tamaño del pool** es el parámetro de ajuste más crítico. Muy pocas conexiones causan que las peticiones se acumulen. Demasiadas conexiones saturan la base de datos. Una fórmula común: \`pool_size = (core_count * 2) + effective_spindle_count\`.

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

Empieza con \`((core_count * 2) + disk_spindles)\` y ajusta desde ahí. Para PostgreSQL, el \`max_connections\` por defecto es 100. Si múltiples servicios se conectan, divide ese presupuesto entre ellos. PgBouncer puede multiplexar miles de clientes en un pool pequeño.

### ¿Debo usar PgBouncer en lugar de pooling a nivel aplicación?

Usa ambos. PgBouncer multiplexa conexiones de aplicación a un conjunto menor de conexiones de base de datos, lo que ayuda con serverless y muchos servicios pequeños. El pooling a nivel aplicación reduce la latencia de conexión y te da métricas por petición.

### ¿Cómo detecto leaks de conexiones?

Monitorea el contador de conexiones activas del pool. Si aumenta constantemente y nunca baja, las conexiones no se están devolviendo. En Java, HikariCP loguea leaks después de \`leakDetectionThreshold\` (default 0, configurar a 60000ms). En Node.js, rastrea \`pool.totalCount\` vs \`pool.idleCount\`.
`;

// Write all files
const files = {
  'recipes/api/api-rate-limiting.md': apiRateLimitingEN,
  'recipes/api/api-rate-limiting.es.md': apiRateLimitingES,
  'recipes/databases/database-connection-pooling.md': dbPoolingEN,
  'recipes/databases/database-connection-pooling.es.md': dbPoolingES,
};

for (const [relPath, content] of Object.entries(files)) {
  const filePath = path.join(BASE, relPath);
  fs.writeFileSync(filePath, content);
  console.log(`Wrote: ${relPath}`);
}

console.log('\nDone!');
