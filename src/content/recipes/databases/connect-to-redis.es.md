---
contentType: recipes
slug: connect-to-redis
title: "[ES] Connect to Redis"
description: "[ES] How to connect to Redis and perform basic operations in Python, JavaScript, and Java."
metaDescription: "[ES] Learn how to connect to Redis using Python redis-py, Node.js ioredis, and Java Jedis with practical code examples for caching and sessions."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - redis
  - cache
  - python
  - javascript
  - java
relatedResources:
  - /recipes/connect-to-mysql
  - /recipes/connect-to-postgresql
  - /patterns/cache-aside-pattern
  - /recipes/redis-cache-patterns
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a conectar a Redis usando Python redis-py, Node.js ioredis y Java Jedis con ejemplos de código prácticos para caching y sesiones."
  keywords:
    - databases
    - redis
    - cache
    - python
    - javascript
    - java
---
## Visión General

Redis es un almacén de estructuras de datos en memoria usado para caching, gestión de sesiones, análisis en tiempo real y brokers de mensajes. Conectarse a Redis y usar sus tipos de datos principales de forma eficiente es una habilidad backend fundamental. Esta receta cubre operaciones básicas en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Implementas capas de cache para reducir la carga de la base de datos
- Construyes almacenes de sesiones para aplicaciones web stateless
- Creas leaderboards en tiempo real, rate limiters o colas de mensajes

## Solución

### Python

```python
import redis

r = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

# Strings
r.set('user:1:name', 'Alice', ex=3600)
name = r.get('user:1:name')

# Lists
r.lpush('queue:tasks', 'task_1')
task = r.brpop('queue:tasks', timeout=5)

# Hashes
r.hset('user:1', mapping={'email': 'alice@example.com', 'role': 'admin'})
user = r.hgetall('user:1')
```

### JavaScript

```javascript
const Redis = require('ioredis');

const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 0
});

// Strings
await redis.set('user:1:name', 'Alice', 'EX', 3600);
const name = await redis.get('user:1:name');

// Lists
await redis.lpush('queue:tasks', 'task_1');
const task = await redis.brpop('queue:tasks', 5);

// Hashes
await redis.hset('user:1', 'email', 'alice@example.com', 'role', 'admin');
const user = await redis.hgetall('user:1');
```

### Java

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

public class RedisExample {
    private final JedisPool pool = new JedisPool("localhost", 6379);

    public void stringOps() {
        try (Jedis jedis = pool.getResource()) {
            jedis.setex("user:1:name", 3600, "Alice");
            String name = jedis.get("user:1:name");
        }
    }

    public void listOps() {
        try (Jedis jedis = pool.getResource()) {
            jedis.lpush("queue:tasks", "task_1");
            var task = jedis.brpop(5, "queue:tasks");
        }
    }

    public void hashOps() {
        try (Jedis jedis = pool.getResource()) {
            jedis.hset("user:1", "email", "alice@example.com");
            jedis.hset("user:1", "role", "admin");
            Map<String, String> user = jedis.hgetAll("user:1");
        }
    }
}
```

## Explicación

Redis almacena datos **en memoria**, haciendo lecturas y escrituras extremadamente rápidas (sub-milisegundo). Los **Strings** son el tipo más simple, frecuentemente usados para cachear objetos serializados. Las **Lists** implementan colas (`LPUSH` + `BRPOP` para consumo bloqueante). Los **Hashes** almacenan objetos con múltiples campos de forma compacta. Los tres ejemplos usan una gestión de conexiones sólida: Python `redis.Redis` maneja reconexiones, JavaScript `ioredis` soporta clustering y pub/sub, y Java `JedisPool` reutiliza conexiones vía pooling.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `redis-py` | Cliente oficial, soporta async vía `aredis` |
| JavaScript | `node-redis` | Alternativa a ioredis, soporte nativo de Promise |
| Java | `Lettuce` | Cliente Redis reactivo y async para Spring |

## Lo que funciona

1. Usa pooling de conexiones en todos los lenguajes para evitar agotamiento de conexiones
2. Establece expiración explícita (`EX`, `PX`, `EXAT`) en claves de cache para prevenir crecimiento descontrolado de memoria
3. Usa `decode_responses=True` en Python para obtener strings en lugar de bytes
4. Prefiere `BRPOP` / `BLPOP` para consumo de colas para evitar busy-waiting
5. Usa pipelines de Redis (`.pipeline()` / `.multi()`) para batch de múltiples comandos y reducir RTT

## Errores Comunes

1. Almacenar objetos grandes (>1 MB) en claves individuales, causando picos de latencia
2. No manejar fallos de conexión, causando errores en cascada cuando Redis no está disponible
3. Usar Redis como base de datos primaria en lugar de cache o almacén transitorio
4. Olvidar establecer TTLs, provocando agotamiento de memoria y kills por OOM
5. Usar el comando `KEYS` en producción, que bloquea toda la instancia de Redis

## Preguntas Frecuentes

### ¿Debería usar Redis como mi base de datos principal?

No. Redis es un almacén en memoria mejor adaptado para caching, sesiones, colas y datos en tiempo real. Úsalo junto a una base de datos persistente como PostgreSQL o MySQL.

### ¿Cómo manejo el modo clúster de Redis?

Usa clientes conscientes de clúster: `redis-py-cluster` (Python), `ioredis` con `new Redis.Cluster()` (JS), o `JedisCluster` / `Lettuce` (Java).

### ¿Cuál es la diferencia entre `EX` y `PX` en Redis?

`EX` establece expiración en segundos. `PX` establece expiración en milisegundos. Ambos logran el mismo objetivo; usa el que se ajuste a tus requerimientos de precisión.
