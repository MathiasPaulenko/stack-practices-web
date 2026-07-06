---
contentType: recipes
slug: caching-redis
title: "Caching con Redis"
description: "Cómo implementar caching de aplicaciones usando Redis para rendimiento y escalabilidad."
metaDescription: "Aprende a implementar caching con Redis en Python, JavaScript y Java. Cubre cache-aside, TTL, invalidación de caché y serialización."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - cache
  - cache-aside
  - databases
  - sql
relatedResources:
  - /recipes/caching
  - /recipes/database-migrations-safely
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/soft-deletes
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar caching con Redis en Python, JavaScript y Java. Cubre cache-aside, TTL, invalidación de caché y serialización."
  keywords:
    - redis caching tutorial
    - cache-aside pattern
    - invalidacion cache redis
    - redis ttl estrategias
    - caching python javascript java
---
## Visión General

El caching es la forma más útil de acelerar aplicaciones con muchas lecturas. Redis es un almacén de estructuras de datos en memoria que funciona como caché de alto rendimiento, reduciendo la carga en la base de datos y cortando tiempos de respuesta de cientos de milisegundos a microsegundos. La solucion a continuacion cubre el patrón cache-aside, gestión de TTL, serialización y estrategias de invalidación en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Las [consultas a base de datos](/recipes/databases/postgres-query-optimization) son lentas y devuelven los mismos resultados frecuentemente
- Necesitas reducir carga en [APIs](/recipes/api/call-rest-api) o bases de datos downstream
- Datos de sesión, perfiles de usuario o configuración necesitan acceso rápido de lectura
- Se requieren leaderboards en tiempo real, [rate limiting](/recipes/api/rate-limiting) o locks temporales

## Solución

### Python (redis-py)

```python
import json
import redis
from functools import wraps

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Helper cache-aside
def cached(key_prefix, ttl=300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{args}:{kwargs}"
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@cached("user_profile", ttl=600)
def get_user(user_id):
    # Consulta DB costosa
    return {"id": user_id, "name": "Alice", "orders": 42}

# Invalidación manual de caché
r.delete("user_profile:(1,):{}")

# Redis como almacén de sesiones
r.setex("session:abc123", 3600, json.dumps({"user_id": 1, "role": "admin"}))
```

### JavaScript (ioredis)

```javascript
const Redis = require("ioredis");
const redis = new Redis({ host: "localhost", port: 6379 });

async function getCached(key, fetcher, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

async function getUser(userId) {
  return getCached(`user:${userId}`, async () => {
    // Consulta DB costosa
    return { id: userId, name: "Alice", orders: 42 };
  }, 600);
}

// Invalidar caché
async function invalidateUser(userId) {
  await redis.del(`user:${userId}`);
}

// Redis como rate limiter
async function rateLimit(key, maxRequests = 100, window = 60) {
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, window);
  return current <= maxRequests;
}
```

### Java (Jedis + Spring Cache)

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    // Spring declarative caching
    @Cacheable(value = "users", key = "#userId")
    public User getUser(Long userId) {
        // Consulta DB costosa
        return new User(userId, "Alice", 42);
    }

    @CacheEvict(value = "users", key = "#userId")
    public void updateUser(Long userId, User user) {
        // Actualizar DB
    }
}

// Caching manual con Jedis
public class CacheClient {
    private final JedisPool pool = new JedisPool("localhost", 6379);

    public String get(String key) {
        try (Jedis jedis = pool.getResource()) {
            return jedis.get(key);
        }
    }

    public void setex(String key, int seconds, String value) {
        try (Jedis jedis = pool.getResource()) {
            jedis.setex(key, seconds, value);
        }
    }
}
```

## Explicación

El patrón **cache-aside** (o lazy-loading) es la estrategia de caching más común:

1. **Lectura**: Revisa el caché primero. Si hay hit, retorna inmediatamente. Si hay miss, obtiene de la DB, guarda en caché y retorna.
2. **Escritura**: Actualiza la base de datos, luego invalida o actualiza el caché.
3. **TTL**: Cada entrada cacheada tiene un Time-To-Live. Cuando expira, la entrada es evicted y la siguiente lectura obtiene datos frescos.

Este patrón es simple, funciona con cualquier base de datos y maneja fallos de caché elegantemente: si Redis cae, la app recurre a la base de datos (degradación de caché, no outage).

## Variantes

| Estrategia | Cuándo Usar | Trade-off |
|------------|-------------|-----------|
| Cache-Aside | Apps con muchas lecturas | Simple, pero caché y DB pueden divergir |
| Write-Through | Consistencia fuerte requerida | Escrituras más lentas, caché siempre fresco |
| Write-Behind | Alto throughput de escritura | Riesgo de pérdida de datos si caché crashea antes del flush |
| Read-Through | Lógica de invalidación compleja | La librería de caché maneja el fetching |
| Redis Pub/Sub | Invalidación de caché entre instancias | Sync en tiempo real, pero añade complejidad |

## Lo que funciona

- **Configura TTL en todo**: Sin TTL, tu caché crece infinitamente y datos obsoletos viven indefinidamente. Usa 5-15 minutos para datos volátiles, horas para datos de referencia estables.
- **Usa versionado de cache keys**: `user:v2:123` permite invalidar un esquema entero cambiando el prefijo de versión.
- **Serializa a JSON o MessagePack**: JSON es legible; MessagePack es más pequeño y rápido. Evita `pickle` de Python o serialización nativa de Java por seguridad.
- **Maneja cache misses elegantemente**: Los fallos de caché deben degradar a la base de datos, nunca crashear la app. Usa [circuit breakers](/patterns/design/circuit-breaker-pattern) para conexiones Redis.
- **Monitorea hit rates**: Un hit rate menor a 80% usualmente significa que tu TTL es muy corto o estás cacheando los datos equivocados.

## Errores Comunes

- **Cache stampede**: Cuando el TTL expira, cientos de peticiones simultáneamente golpean la base de datos. Usa expiración temprana probabilística o locks para prevenir esto.
- **Caché sin TTL**: El crecimiento ilimitado del caché eventualmente agota la memoria. Redis evictará keys, posiblemente eliminando datos importantes.
- **Almacenar objetos grandes**: Serializar un blob JSON de 10MB en Redis es lento y bloquea la conexión. Cachea fragmentos más pequeños y desnormalizados.
- **No invalidar en escrituras**: Actualizar el email de un usuario pero no limpiar el perfil cacheado significa datos obsoletos por minutos u horas.
- **Usar Redis como base de datos primaria**: Redis es un almacén en memoria. Si el servidor reinicia sin persistencia (AOF/RDB), los datos se pierden. Siempre mantén la fuente primaria en una base de datos real.

## Preguntas Frecuentes

### Cómo prevengo el cache stampede?

**Expiración temprana probabilística**: Refresca el caché unos segundos antes de que expire el TTL, pero solo en una fracción de peticiones. Alternativamente, usa un **lease lock**: la primera petición que recibe un cache miss adquiere un lock, obtiene de la DB y actualiza el caché. Otras peticiones esperan o sirven datos ligeramente obsoletos.

### Qué debo cachear y qué no?

**Cachea**: Perfiles de usuario, catálogos de productos, configuración, datos de referencia, agregados computados y resultados de consultas frecuentes.

**No cachees**: Datos que cambian rápidamente (precios de acciones, analytics en tiempo real), blobs grandes (videos, imágenes), o datos donde la consistencia es crítica y la DB puede manejar la carga.

### Cómo invalido cachés entre múltiples instancias de app?

Usa **Redis Pub/Sub** o un **prefijo de versión en cache keys**. Cuando los datos cambian, publica un mensaje de invalidación a un canal Redis. Todas las instancias de la app se suscriben al canal y limpian sus cachés locales o remotos. Alternativamente, cambia un prefijo de versión (`v1` → `v2`) en tus cache keys para invalidar silenciosamente entradas antiguas sin mensajería explícita.

### Patrón Write-Through Cache

```python
import json
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def write_through_user(user_id: int, data: dict, db_update_fn):
    """Escribir a caché y base de datos atómicamente."""
    cache_key = f"user:{user_id}"

    # Actualizar base de datos primero
    db_update_fn(user_id, data)

    # Luego actualizar caché
    r.setex(cache_key, 600, json.dumps(data))

# Uso
def db_update_user(user_id, data):
    # Ejecutar SQL UPDATE
    pass

write_through_user(42, {"id": 42, "name": "Alice", "email": "alice@new.com"}, db_update_user)
```

```javascript
async function writeThroughProduct(productId, data, dbUpdateFn) {
  const cacheKey = `product:${productId}`;

  // Actualizar base de datos
  await dbUpdateFn(productId, data);

  // Actualizar caché
  await redis.setex(cacheKey, 300, JSON.stringify(data));
}
```

### Patrón Write-Behind (Write-Back)

```python
import json
import redis
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def write_behind_update(entity_type: str, entity_id: int, data: dict):
    """Escribir a caché inmediatamente, encolar para escritura async a DB."""
    cache_key = f"{entity_type}:{entity_id}"

    # Escribir a caché
    r.setex(cache_key, 300, json.dumps(data))

    # Encolar para persistencia async
    r.lpush("pending_writes", json.dumps({
        "type": entity_type,
        "id": entity_id,
        "data": data,
        "timestamp": int(time.time())
    }))

# Worker en background que procesa writes pendientes
def flush_pending_writes(db_write_fn, batch_size=100):
    while True:
        items = r.rpop("pending_writes", batch_size)
        if not items:
            threading.Event().wait(1)
            continue

        for item in items:
            entry = json.loads(item)
            try:
                db_write_fn(entry["type"], entry["id"], entry["data"])
            except Exception as e:
                # Re-encolar writes fallidos
                r.lpush("pending_writes", json.dumps(entry))
                print(f"Write failed: {e}")
```

### Prevención de Cache Stampede con Locks

```python
import json
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_with_stampede_protection(cache_key: str, fetcher, ttl: int = 300):
    """Prevenir cache stampede usando un lock Redis."""
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:{cache_key}"
    acquired = r.set(lock_key, "1", ex=10, nx=True)

    if acquired:
        try:
            result = fetcher()
            r.setex(cache_key, ttl, json.dumps(result))
            return result
        finally:
            r.delete(lock_key)
    else:
        time.sleep(0.1)
        return get_with_stampede_protection(cache_key, fetcher, ttl)

# Expiración temprana probabilística (reduce stampede sin locks)
def get_with_early_refresh(cache_key: str, fetcher, ttl: int = 300, early_refresh_pct: float = 0.1):
    cached = r.get(cache_key)
    if cached:
        ttl_remaining = r.ttl(cache_key)
        if ttl_remaining < ttl * early_refresh_pct and random.random() < 0.1:
            try:
                result = fetcher()
                r.setex(cache_key, ttl, json.dumps(result))
                return result
            except Exception:
                pass  # Servir stale si falla el refresh
        return json.loads(cached)

    result = fetcher()
    r.setex(cache_key, ttl, json.dumps(result))
    return result
```

### Redis Pub/Sub para Invalidation Cross-Instance

```javascript
const Redis = require("ioredis");
const pub = new Redis();
const sub = new Redis();

// Suscribirse al canal de invalidación
sub.subscribe("cache:invalidate");
sub.on("message", (channel, message) => {
  const { key } = JSON.parse(message);
  redis.del(key);
  console.log(`Invalidated: ${key}`);
});

// Publicar invalidación al actualizar datos
async function updateUser(userId, data) {
  await db.query("UPDATE users SET ... WHERE id = ?", [userId]);
  const cacheKey = `user:${userId}`;
  await redis.del(cacheKey);
  await pub.publish("cache:invalidate", JSON.stringify({ key: cacheKey }));
}
```

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
pubsub = r.pubsub()

# Suscriptor
pubsub.subscribe("cache:invalidate")
for message in pubsub.listen():
    if message["type"] == "message":
        data = json.loads(message["data"])
        r.delete(data["key"])

# Publicador
def invalidate_cache(key: str):
    r.delete(key)
    r.publish("cache:invalidate", json.dumps({"key": key}))
```

### Scripts Lua para Operaciones Atómicas

```python
import redis

r = redis.Redis(host="localhost", port=6379)

# Rate limiter atómico usando Lua
RATE_LIMIT_SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
"""

rate_limiter = r.register_script(RATE_LIMIT_SCRIPT)

def is_rate_limited(key: str, max_requests: int, window: int) -> bool:
    current = rate_limiter(keys=[key], args=[window])
    return current > max_requests

# Compare-and-swap atómico para caché
CAS_SCRIPT = """
local cached = redis.call('GET', KEYS[1])
if cached == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
    return 1
end
return 0
"""

cas = r.register_script(CAS_SCRIPT)
```

### Redis Sentinel para Alta Disponibilidad

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ("sentinel1", 26379),
    ("sentinel2", 26379),
    ("sentinel3", 26379),
])

# Conexión al master
master = sentinel.master_for("mymaster", socket_timeout=0.5)

# Conexión a réplica para lecturas
replica = sentinel.slave_for("mymaster", socket_timeout=0.5)

# Escrituras van al master
master.set("key", "value")

# Lecturas pueden ir a la réplica
value = replica.get("key")
```

```javascript
const Redis = require("ioredis");

// Cliente aware de Sentinel
const redis = new Redis({
  sentinels: [
    { host: "sentinel1", port: 26379 },
    { host: "sentinel2", port: 26379 },
  ],
  name: "mymaster",
  role: "master",
});
```

## Mejores Prácticas Adicionales

6. **Usa `SCAN` en lugar de `KEYS` en producción.** `KEYS *` bloquea Redis mientras escanea todas las keys. `SCAN` es cursor-based y non-blocking:

```python
# Mal: bloquea Redis
keys = r.keys("user:*")

# Bien: scan cursor-based non-blocking
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="user:*", count=100)
    for key in keys:
        r.delete(key)
    if cursor == 0:
        break
```

7. **Configura `maxmemory` y política de evicción.** Configura Redis para usar una cantidad limitada de memoria:

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

8. **Usa pipelining de Redis para operaciones batch.** Pipelining envía múltiples comandos en un solo round-trip de red:

```python
# Sin pipeline: 100 round-trips
for i in range(100):
    r.set(f"key:{i}", f"value:{i}")

# Con pipeline: 1 round-trip
pipe = r.pipeline()
for i in range(100):
    pipe.set(f"key:{i}", f"value:{i}")
pipe.execute()
```

9. **Usa `MGET` para lecturas batch.** Obtener múltiples keys en un comando es mucho más rápido que llamadas `GET` individuales:

```python
# Mal: 100 round-trips
values = [r.get(f"key:{i}") for i in range(100)]

# Bien: 1 round-trip
values = r.mget([f"key:{i}" for i in range(100)])
```

10. **Habilita persistencia de Redis para cachés críticos.** Si los rebuilds de caché son costosos, habilita persistencia AOF (Append-Only File):

```bash
# redis.conf
appendonly yes
appendfsync everysec
```

## Errores Comunes Adicionales

6. **Usar `KEYS *` en producción.** Este comando bloquea todo el servidor Redis. Usa `SCAN` en su lugar.

7. **No configurar `maxmemory`.** Sin un límite de memoria, Redis consumirá toda la RAM disponible y el OS lo matará con OOM.

8. **Guardar sesiones sin TTL.** Las keys de sesión sin TTL se acumulan indefinidamente. Siempre configura un TTL en datos de sesión:

```python
r.setex(f"session:{session_id}", 3600, json.dumps(session_data))
```

9. **No manejar fallos de conexión a Redis.** Los fallos de caché should degradar a la base de datos, no crashear la aplicación:

```python
try:
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
except redis.ConnectionError:
    pass  # Caer a la base de datos

result = db_query()
try:
    r.setex(cache_key, 300, json.dumps(result))
except redis.ConnectionError:
    pass  # Caché caído, servir desde DB
```

10. **Usar `FLUSHALL` en scripts o CI.** Esto borra todas las keys en todas las bases de datos. Usa `FLUSHDB` para una sola base de datos, o mejor, usa prefijos de keys y borra por patrón con `SCAN`.

## FAQ Adicional

### ¿Cómo monitoreo el rendimiento del caché Redis?

Usa `INFO stats` para verificar hit rates, uso de memoria y clientes conectados:

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|used_memory"
```

Para monitoreo continuo, usa RedisInsight, Grafana con redis_exporter, o la integración Redis de Datadog. Rastrea estas métricas:
- **Hit rate**: `keyspace_hits / (keyspace_hits + keyspace_misses)`
- **Uso de memoria**: `used_memory / maxmemory`
- **Keys evicted**: `evicted_keys` (valores altos indican TTL muy corto o memoria insuficiente)
- **Clientes conectados**: `connected_clients` (spikes pueden indicar connection leaks)

### ¿Cuál es la diferencia entre Redis Cluster y Sentinel?

**Redis Sentinel** proporciona alta disponibilidad para una sola instancia de Redis. Monitorea un master y promueve una réplica si el master falla. Buen para despliegues pequeños.

**Redis Cluster** shardea datos across múltiples nodos Redis usando hash slots. Proporciona tanto escalado horizontal como alta disponibilidad. Úsalo cuando una sola instancia de Redis no puede manejar tu throughput o requisitos de memoria.

### ¿Debo usar Redis JSON o serialización con strings?

Redis 7+ soporta el módulo RedisJSON para operaciones JSON nativas. Permite actualizaciones parciales sin re-serializar todo el objeto:

```bash
# Guardar como JSON
JSON.SET user:42 $ '{"name":"Alice","orders":42}'

# Actualizar un solo campo
JSON.SET user:42 $.name '"Bob"'

# Leer un solo campo
JSON.GET user:42 $.name
```

Para setups más simples, serialización JSON string con `GET`/`SET` es suficiente. Usa RedisJSON cuando necesitas actualizaciones parciales o consultas JSON path.

## Tips de Rendimiento

1. **Usa `PIPELINE` para writes batch.** Reduce round-trips de red por 10-100x:

```python
pipe = r.pipeline(transaction=False)
for i in range(1000):
    pipe.setex(f"cache:{i}", 300, f"value:{i}")
pipe.execute()
```

2. **Usa `HSET`/`HGETALL` para datos estructurados.** Los hashes son más eficientes en memoria que keys string separadas para campos relacionados:

```python
r.hset("user:42", mapping={"name": "Alice", "email": "alice@example.com", "role": "admin"})
user = r.hgetall("user:42")
```

3. **Usa `ZSET` para datos ordenados.** Los sorted sets permiten consultas eficientes de leaderboards y rankings:

```python
r.zadd("leaderboard", {"alice": 1500, "bob": 1200, "carol": 2000})
top_10 = r.zrevrange("leaderboard", 0, 9, withscores=True)
```

4. **Habilita `lazyfree-lazy-eviction` para keys grandes.** Borrar keys grandes sincrónicamente bloquea Redis. Habilita lazy freeing:

```bash
# redis.conf
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
```

5. **Usa `EXPIRE` con flag `NX` (Redis 7+).** Establece expiración solo si la key no tiene TTL:

```python
r.expire("user:42", 3600, nx=True)  # Solo establece TTL si no existe
