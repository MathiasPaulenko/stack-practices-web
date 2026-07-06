---
contentType: recipes
slug: connect-to-redis
title: "Conectar a Redis"
description: "Cómo conectarse a Redis y realizar operaciones básicas en Python, JavaScript y Java."
metaDescription: "Aprende a conectar a Redis usando Python redis-py, Node.js ioredis y Java Jedis con ejemplos prácticos para caching y sesiones."
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
  metaDescription: "Aprende a conectar a Redis usando Python redis-py, Node.js ioredis y Java Jedis con ejemplos prácticos para caching y sesiones."
  keywords:
    - databases
    - redis
    - cache
    - python
    - javascript
    - java
---
## Visión General

Redis es un almacén de estructuras de datos en memoria usado para caching, gestión de sesiones, análisis en tiempo real y brokers de mensajes. Conectarse a Redis y usar sus tipos de datos principales de forma eficiente es una habilidad backend fundamental. Lo siguiente cubre operaciones básicas en Python, JavaScript y Java.

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

### Python con pipelines y transacciones

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Pipeline: batch de múltiples comandos para reducir RTT
pipe = r.pipeline()
pipe.set('user:1:name', 'Alice', ex=3600)
pipe.set('user:1:email', 'alice@example.com', ex=3600)
pipe.hset('user:1', mapping={'name': 'Alice', 'email': 'alice@example.com'})
results = pipe.execute()
print(results)  # [True, True, 1]

# Transacción con MULTI/EXEC
pipe = r.pipeline(transaction=True)
pipe.multi()
pipe.set('counter', 0)
pipe.incr('counter')
pipe.incr('counter')
results = pipe.execute()
print(results)  # [True, 1, 2]
```

### JavaScript con sorted sets y pub/sub

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

// Sorted sets: leaderboards
await redis.zadd('leaderboard', 100, 'alice', 85, 'bob', 120, 'charlie');
const topPlayers = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');
// ['charlie', '120', 'alice', '100', 'bob', '85']

// Pub/Sub
const subscriber = new Redis({ host: 'localhost', port: 6379 });
const publisher = new Redis({ host: 'localhost', port: 6379 });

await subscriber.subscribe('notifications');
subscriber.on('message', (channel, message) => {
    console.log(`Recibido en ${channel}: ${message}`);
});

await publisher.publish('notifications', JSON.stringify({ event: 'user_joined', userId: 42 }));
```

### Java con JedisPool y scripting Lua

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import java.util.List;

public class RedisAdvanced {
    private final JedisPool pool;

    public RedisAdvanced(String host, int port) {
        this.pool = new JedisPool(host, port);
    }

    public void rateLimit(String userId, int maxRequests, int windowSeconds) {
        try (Jedis jedis = pool.getResource()) {
            String key = "rate:" + userId;
            String luaScript =
                "local current = redis.call('INCR', KEYS[1]) " +
                "if current == 1 then " +
                "  redis.call('EXPIRE', KEYS[1], ARGV[2]) " +
                "end " +
                "return tonumber(current) <= tonumber(ARGV[1])";

            Object allowed = jedis.eval(
                luaScript, 1, key,
                String.valueOf(maxRequests), String.valueOf(windowSeconds)
            );
            System.out.println("Request permitido: " + allowed);
        }
    }

    public void pipelineExample() {
        try (Jedis jedis = pool.getResource()) {
            var pipe = jedis.pipelined();
            pipe.set("key1", "value1");
            pipe.set("key2", "value2");
            pipe.sync();
        }
    }
}
```

### Python async con redis-py

```python
import asyncio
import redis.asyncio as aioredis

async def main():
    r = aioredis.Redis(host='localhost', port=6379, decode_responses=True)

    # Operaciones async con strings
    await r.set('async:key', 'value', ex=60)
    value = await r.get('async:key')

    # Pipeline async
    pipe = r.pipeline()
    pipe.set('a', 1)
    pipe.set('b', 2)
    pipe.get('a')
    results = await pipe.execute()
    print(results)  # [True, True, b'1']

    await r.close()

asyncio.run(main())
```

## Buenas prácticas adicionales

6. **Usa `SCAN` en lugar de `KEYS` en producción.** `KEYS` bloquea toda la instancia de Redis. `SCAN` itera en lotes pequeños:

```python
for key in r.scan_iter(match="user:*", count=100):
    print(key)
```

7. **Configura `maxmemory` y `maxmemory-policy`.** Configura Redis para evictar claves cuando la memoria está llena:

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

8. **Usa `EXPIRE` para claves de sesión.** Siempre establece un TTL en datos de sesión para prevenir crecimiento descontrolado:

```python
r.setex('session:abc123', 3600, json.dumps(session_data))
```

9. **Monitorea estadísticas con `INFO`.** Rastrea uso de memoria, clientes conectados y estadísticas de comandos:

```python
info = r.info()
print(f"Memoria usada: {info['used_memory_human']}")
print(f"Clientes conectados: {info['connected_clients']}")
print(f"Hits keyspace: {info['keyspace_hits']}")
print(f"Misses keyspace: {info['keyspace_misses']}")
```

10. **Usa `SENTINEL` para alta disponibilidad.** Redis Sentinel provee failover automático cuando un master cae. Usa clientes conscientes de sentinel en todos los lenguajes.

## Errores comunes adicionales

6. **Almacenar blobs serializados > 1MB.** Valores grandes causan picos de latencia. Divide objetos grandes en claves más pequeñas o usa un almacén separado.
7. **No manejar failover de Redis.** Cuando Redis reinicia, todos los datos en memoria se pierden (sin persistencia). Las aplicaciones deberían degradar graceful a la base de datos.
8. **Usar `FLUSHALL` o `FLUSHDB` en producción.** Estos comandos eliminan todas las claves instantáneamente. Usa `DEL` con claves específicas o `UNLINK` para borrado async.
9. **No usar `PIPELINE` para operaciones masivas.** Enviar 100 comandos individuales tiene 100x el RTT de un solo pipeline.
10. **Ignorar `maxmemory-policy`.** Sin una política, Redis sufrirá OOM kill cuando la memoria se agote, tirando todos los servicios que dependen de él.

## Preguntas frecuentes adicionales

### ¿Cómo implemento un rate limiter con Redis?

Usa un contador de ventana deslizante con `INCR` y `EXPIRE`:

```python
def rate_limit(r, user_id, max_requests=100, window=60):
    key = f"rate:{user_id}"
    current = r.incr(key)
    if current == 1:
        r.expire(key, window)
    return current <= max_requests
```

### ¿Cuál es la diferencia entre `MULTI/EXEC` y `PIPELINE`?

`MULTI/EXEC` es una transacción: los comandos son atómicos, ningún cliente puede intercalar. `PIPELINE` batchea comandos para reducir RTT pero no son atómicos. Usa `MULTI/EXEC` cuando necesites atomicidad, `PIPELINE` cuando necesites throughput.

### ¿Cómo uso Redis Streams para colas de mensajes?

```python
# Productor
r.xadd('events', {'type': 'order_created', 'order_id': 123})

# Consumidor
response = r.xread({'events': '0'}, block=5000, count=10)
for stream, messages in response:
    for msg_id, fields in messages:
        print(f"Evento {msg_id}: {fields}")
```

## Tips de Rendimiento

1. **Usa `PIPELINE` para operaciones masivas.** Reduce round-trips de red enviando múltiples comandos en un solo batch.

2. **Usa `MGET` / `MSET` para operaciones de múltiples claves.** Más rápido que llamadas `GET`/`SET` individuales:

```python
values = r.mget('key1', 'key2', 'key3')
r.mset({'key1': 'val1', 'key2': 'val2'})
```

3. **Usa `HGETALL` con moderación en hashes grandes.** Si un hash tiene muchos campos, usa `HSCAN` para iterar:

```python
for field, value in r.hscan_iter('large_hash', count=100):
    print(field, value)
```

4. **Habilita `lazyfree-lazy-eviction` en Redis 4.0+.** El borrado async previene picos de latencia durante la evicción de claves:

```bash
# redis.conf
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
```

5. **Usa `OBJECT ENCODING` para inspeccionar el almacenamiento.** Redis usa encodings compactos para estructuras de datos pequeñas. Verifica si tus claves usan encodings eficientes:

```python
encoding = r.object('encoding', 'mykey')
print(f"Encoding: {encoding}")  # ej. ziplist, hashtable, int
```
