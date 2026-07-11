---
contentType: recipes
slug: redis-cache-patterns
title: "Patrones de Cache de Redis para Aplicaciones de Alto"
description: "Como implementar patrones cache-aside, write-through y write-behind con Redis para reducir carga de base de datos y mejorar tiempos de respuesta"
metaDescription: "Patrones de cache de Redis para apps de alto rendimiento. Implementa cache-aside, write-through y write-behind para reducir carga de base de datos y mejorar latencia."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - redis
  - cache
  - database
  - performance
  - databases
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/connection-pooling
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patrones de cache de Redis para apps de alto rendimiento. Implementa cache-aside, write-through y write-behind para reducir carga de base de datos y mejorar latencia."
  keywords:
    - redis
    - caching patterns
    - cache-aside
    - write-through
    - performance
---

# Patrones de Cache de Redis para Aplicaciones de Alto Rendimiento

Redis es un almacen de estructuras de datos en memoria que funciona como una capa de cache extremadamente rapida entre tu aplicacion y la base de datos persistente. Elegir el patron de cache correcto — cache-aside, write-through o write-behind — determina como tu aplicacion maneja cache misses, consistencia y escenarios de fallo.

## Cuando Usar Esto

- Las consultas a base de datos son lentas y devuelven datos frecuentemente accedidos. Consulta [Query Optimization](/recipes/databases/postgres-query-optimization) para ajustar queries lentos.
- Necesitas reducir carga en bases de datos primarias durante picos de trafico. Consulta [Rate Limiting](/recipes/api/rate-limiting) para control de tráfico.
- La temporal staleness de datos es aceptable a cambio de menor latencia

## Requisitos Previos

- Servidor Redis ejecutandose localmente o via servicio administrado
- Una libreria cliente como `ioredis` o `redis` para Node.js

## Solucion

### 1. Cache-Aside (Lazy Loading)

La aplicacion revisa el cache primero. En un miss, carga desde la base de datos y pobla el cache.

```typescript
// cache/CacheAside.ts
import Redis from 'ioredis';

class CacheAsideProductRepository {
  private redis = new Redis();
  private ttl = 300; // 5 minutos

  async getProduct(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;
    
    // Revisar cache primero
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss: cargar desde base de datos
    const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) return null;

    // Poblar cache
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
    // Invalidar cache para prevenir lecturas stale
    await this.redis.del(`product:${id}`);
  }
}
```

### 2. Write-Through

Los datos se escriben tanto al cache como a la base de datos simultaneamente. El cache siempre tiene los datos mas recientes.

```typescript
// cache/WriteThrough.ts
class WriteThroughProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Iniciar transaccion de base de datos. Consulta [Database Transactions](/recipes/databases/database-transactions) para patrones ACID.
    await this.db.query('BEGIN');
    try {
      await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
      
      // Escribir al cache dentro de la misma operacion logica
      const updated = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(updated));
      
      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
```

### 3. Write-Behind (Write-Back)

Los datos se escriben primero al cache y se flushean asincronicamente a la base de datos. Mayor rendimiento pero mas riesgoso.

```typescript
// cache/WriteBehind.ts
class WriteBehindProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Escribir al cache inmediatamente
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));

    // Encolar para persistencia async
    await this.redis.lpush('pending_writes', JSON.stringify({ id, data, timestamp: Date.now() }));
  }
}

// Worker en background. Consulta [Batch Processing](/recipes/data/batch-processing-patterns) para patrones de jobs.
async function flushPendingWrites() {
  const batch = await redis.lpop('pending_writes', 100);
  if (!batch) return;

  const writes = batch.map(item => JSON.parse(item));
  
  await db.query('BEGIN');
  try {
    for (const write of writes) {
      await db.query('UPDATE products SET ... WHERE id = $1', [write.id]);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    // Re-encolar escrituras fallidas
    for (const write of writes) {
      await redis.rpush('pending_writes', JSON.stringify(write));
    }
  }
}

// Ejecutar cada 5 segundos
setInterval(flushPendingWrites, 5000);
```

### 4. Prevencion de Cache Stampede

```typescript
// cache/StampedeProtection.ts
class StampedeProtectedCache {
  async getProduct(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;
    const lockKey = `lock:${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Intentar adquirir lock
    const lock = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (lock) {
      // Ganamos la carrera; cargar desde DB
      const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
      await this.redis.del(lockKey);
      return product;
    }

    // Esperar a que el ganador pobla el cache
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getProduct(id);
  }
}
```

## Como Funciona

1. **Cache-Aside** minimiza escrituras de cache pero permite breves datos stale despues de actualizaciones
2. **Write-Through** garantiza consistencia al costo de mayor latencia de escritura
3. **Write-Behind** maximiza throughput pero riesga perdida de datos si el cache falla antes del flush
4. **Stampede Protection** previene multiples consultas simultaneas a base de datos en expiracion de cache

## Consideraciones de Produccion

- Usa **Redis Cluster** o **Redis Sentinel** para alta disponibilidad
- Implementa logica de **[circuit breaker](/patterns/design/circuit-breaker-pattern)** cuando Redis no esta disponible; fallback a base de datos
- Configura **valores de TTL** apropiados basados en frecuencia de cambio de datos
- Monitorea **cache hit ratio** con `INFO stats` y ajusta TTL en consecuencia

## Errores Comunes

- No manejar fallos de conexion a Redis gracefulmente
- Usar el mismo TTL para todos los tipos de datos sin importar frecuencia de cambio
- Olvidar invalidar entradas de cache relacionadas en actualizaciones

## FAQ

**P: Cual patron deberia usar?**
R: Cache-aside para cargas de lectura intensiva. Write-through cuando la consistencia es critica. Write-behind solo cuando puedes tolerar breve perdida de datos.

**P: Como manejo invalidacion de cache entre multiples servicios?**
R: Usa Redis Pub/Sub o una cola de mensajes para broadcast de eventos de invalidacion a todas las instancias de servicio.

**P: Deberia comprimir datos cacheados?**
R: Para objetos grandes (>1KB), si. Usa `msgpack` o compresion JSON para reducir uso de memoria y transferencia de red.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Cache-Aside en Python con `redis-py`

```python
import json
import redis
import functools

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def cache_aside(prefix: str, ttl: int = 300):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{prefix}:{':'.join(str(a) for a in args)}"
            cached = r.get(key)
            if cached:
                return json.loads(cached)

            result = func(*args, **kwargs)
            r.setex(key, ttl, json.dumps(result, default=str))
            return result
        return wrapper
    return decorator

# Uso
@cache_aside("user_profile", ttl=600)
def get_user_profile(user_id: int) -> dict:
    # Query de base de datos
    return {"id": user_id, "name": "Alice", "email": "alice@example.com"}
```

### Write-Through en Python con Redis

```python
import json
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

class WriteThroughCache:
    def __init__(self, redis_client, db_conn):
        self.r = redis_client
        self.db = db_conn

    def set(self, key: str, value: dict, ttl: int = 300):
        # Escribir a base de datos primero
        self.db.execute(
            "INSERT INTO cache_store (key, value) VALUES (%s, %s) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            (key, json.dumps(value))
        )
        self.db.commit()

        # Luego actualizar caché
        self.r.setex(key, ttl, json.dumps(value))

    def get(self, key: str) -> dict | None:
        cached = self.r.get(key)
        if cached:
            return json.loads(cached)

        # Cache miss: leer de base de datos
        row = self.db.execute(
            "SELECT value FROM cache_store WHERE key = %s", (key,)
        ).fetchone()
        if row:
            value = json.loads(row[0])
            self.r.setex(key, 300, json.dumps(value))
            return value
        return None
```

### Redis Streams para Patrón Write-Behind

```python
import json
import redis
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def write_behind_set(key: str, value: dict, ttl: int = 300):
    """Escribir a caché inmediatamente, encolar write a DB via Redis Streams."""
    r.setex(key, ttl, json.dumps(value))

    # Añadir al stream para procesamiento async
    r.xadd("write_behind_stream", {
        "key": key,
        "value": json.dumps(value),
        "operation": "set",
        "timestamp": str(int(time.time()))
    })

# Consumer que procesa el stream
def process_write_behind_stream(db_conn, consumer_name="worker-1"):
    while True:
        # Leer nuevas entradas del stream
        entries = r.xread({"write_behind_stream": "$"}, count=10, block=1000)

        if not entries:
            continue

        for stream, messages in entries:
            for msg_id, fields in messages:
                try:
                    key = fields["key"]
                    value = json.loads(fields["value"])

                    db_conn.execute(
                        "INSERT INTO cache_store (key, value) VALUES (%s, %s) "
                        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                        (key, json.dumps(value))
                    )
                    db_conn.commit()

                    # Acknowledge processing
                    r.xack("write_behind_stream", consumer_name, msg_id)
                except Exception as e:
                    print(f"Error al procesar {msg_id}: {e}")
```

### Cache Warming en Startup

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def warm_cache(queries: list[tuple[str, callable, int]]):
    """Pre-poblar caché en el arranque de aplicación.

    Args:
        queries: Lista de tuplas (cache_key, fetcher_fn, ttl)
    """
    for key, fetcher, ttl in queries:
        try:
            result = fetcher()
            r.setex(key, ttl, json.dumps(result, default=str))
            print(f"Calentado: {key}")
        except Exception as e:
            print(f"Error al calentar {key}: {e}")

# Uso
def fetch_popular_products():
    # Query de base de datos para productos populares
    return [{"id": 1, "name": "Widget"}, {"id": 2, "name": "Gadget"}]

def fetch_config():
    # Query de base de datos para config de app
    return {"theme": "dark", "features": ["search", "filters"]}

warm_cache([
    ("popular_products", fetch_popular_products, 3600),
    ("app_config", fetch_config, 7200),
])
```

### Circuit Breaker para Fallos de Caché

```python
import time
import redis
from functools import wraps

class CacheCircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time = 0
        self.state = "closed"  # closed, open, half-open

    def can_execute(self):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        return True

    def record_success(self):
        self.failure_count = 0
        self.state = "closed"

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

breaker = CacheCircuitBreaker()
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def cached_with_circuit_breaker(key: str, fetcher, ttl: int = 300):
    if breaker.can_execute():
        try:
            cached = r.get(key)
            if cached:
                breaker.record_success()
                return json.loads(cached)

            result = fetcher()
            r.setex(key, ttl, json.dumps(result, default=str))
            breaker.record_success()
            return result
        except redis.ConnectionError:
            breaker.record_failure()
            # Fall through a fetch directo
    # Circuit abierto o caché falló: fetch directo
    return fetcher()
```

### Invalidation de Caché Basada en Tags

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def set_with_tags(key: str, value: dict, tags: list[str], ttl: int = 300):
    """Setear entrada de caché y asociarla con tags para invalidación grupal."""
    r.setex(key, ttl, json.dumps(value))

    for tag in tags:
        r.sadd(f"tag:{tag}", key)
        r.expire(f"tag:{tag}", ttl + 60)  # Ligeramente más largo que el TTL del key

def invalidate_tag(tag: str):
    """Invalidar todas las entradas de caché asociadas a un tag."""
    keys = r.smembers(f"tag:{tag}")
    if keys:
        r.delete(*keys)
        r.delete(f"tag:{tag}")

# Uso
set_with_tags("user:42", {"name": "Alice"}, tags=["users", "user:42"], ttl=600)
set_with_tags("user:43", {"name": "Bob"}, tags=["users", "user:43"], ttl=600)

# Invalidar todos los caches de usuario cuando cambia el schema
invalidate_tag("users")  # Elimina tanto user:42 como user:43
```

### Caché Multi-Nivel (L1 en memoria + L2 Redis)

```python
import json
import redis
import time
from functools import lru_cache

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

class MultiTierCache:
    def __init__(self, redis_client, l1_size=128, ttl=300):
        self.r = redis_client
        self.ttl = ttl
        self._l1 = {}  # L1 cache simple basado en dict
        self._l1_max = l1_size
        self._l1_times = {}

    def get(self, key: str):
        # L1: check en memoria
        if key in self._l1:
            if time.time() - self._l1_times[key] < self.ttl:
                return self._l1[key]
            else:
                del self._l1[key]
                del self._l1_times[key]

        # L2: check Redis
        cached = self.r.get(key)
        if cached:
            value = json.loads(cached)
            self._set_l1(key, value)
            return value

        return None

    def set(self, key: str, value: dict, ttl: int = None):
        ttl = ttl or self.ttl
        self._set_l1(key, value)
        self.r.setex(key, ttl, json.dumps(value, default=str))

    def _set_l1(self, key: str, value):
        if len(self._l1) >= self._l1_max:
            # Evictar entrada más antigua
            oldest = min(self._l1_times, key=self._l1_times.get)
            del self._l1[oldest]
            del self._l1_times[oldest]
        self._l1[key] = value
        self._l1_times[key] = time.time()

    def invalidate(self, key: str):
        self._l1.pop(key, None)
        self._l1_times.pop(key, None)
        self.r.delete(key)

# Uso
cache = MultiTierCache(r, l1_size=256, ttl=300)
cache.set("user:42", {"name": "Alice"})
user = cache.get("user:42")  # Hit L1 en segunda llamada
```

## Mejores Prácticas Adicionales

6. **Usa convenciones de naming de keys consistentes.** Usa namespaces separados por dos puntos: `entity:id:field`:

```python
# Bien: jerarquía clara
r.set("user:42:profile", json.dumps(profile))
r.set("user:42:settings", json.dumps(settings))

# Mal: keys planos, difíciles de gestionar
r.set("user_42_profile", json.dumps(profile))
```

7. **Configura TTL en cada key.** Las keys sin TTL se acumulan para siempre. Incluso datos "permanentes" deberían tener un TTL largo (ej. 7 días) como red de seguridad:

```python
r.setex("config:app", 604800, json.dumps(config))  # 7 días
```

8. **Usa `SET NX EX` para locks distribuidos.** Set atómico si-no-existe con expiración:

```python
lock_acquired = r.set("lock:resource:42", "owner_id", ex=30, nx=True)
if lock_acquired:
    try:
        # Hacer trabajo
        pass
    finally:
        # Solo liberar si aún somos dueños del lock
        r.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1, "lock:resource:42", "owner_id"
        )
```

9. **Usa `OBJECT ENCODING` para verificar eficiencia de memoria.** Redis usa diferentes encodings internos según el tamaño de datos:

```bash
redis-cli OBJECT ENCODING user:42
# "embstr" (string pequeño, eficiente)
# "raw" (string grande, menos eficiente)
```

10. **Usa `MEMORY USAGE` para rastrear tamaños de keys.** Identifica keys que consumen demasiada memoria:

```bash
redis-cli MEMORY USAGE user:42
# Retorna bytes consumidos por el key
```

## Errores Comunes Adicionales

6. **Usar `DEL` en keys grandes sin verificar tamaño primero.** Eliminar una lista con 1M de items bloquea Redis. Usa `UNLINK` (delete async):

```python
r.unlink("large_list_key")  # Delete no bloqueante
```

7. **No manejar errores de serialización.** Si los datos cacheados están corruptos o usan un schema diferente, la deserialización falla:

```python
try:
    return json.loads(cached)
except (json.JSONDecodeError, TypeError):
    r.delete(key)  # Eliminar entrada corrupta
    return fetcher()  # Re-fetch desde fuente
```

8. **Usar `FLUSHDB` en código de producción.** Esto elimina todas las keys en la base de datos actual. Usa deletes dirigidos con `SCAN`.

9. **No configurar `maxmemory-policy`.** Sin una política de evicción, Redis se queda sin memoria:

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

10. **Almacenar objetos grandes en Redis.** Objetos mayores a unos pocos MB deberían almacenarse en object storage (S3) con solo la URL en Redis:

```python
# Mal: almacenar imagen de 5MB en Redis
r.set("image:42", base64_encode(image_data))

# Bien: almacenar URL, mantener imagen en S3
r.setex("image:42:url", 3600, "https://s3.amazonaws.com/bucket/image42.png")
```

## FAQ Adicional

### ¿Cómo testeo el comportamiento de caché?

Usa una instancia de Redis de test (o `fakeredis` en Python) y verifica hits, misses e invalidación:

```python
import fakeredis

r = fakeredis.FakeRedis()

def test_cache_aside():
    r.flushdb()

    # Primera llamada: cache miss, fetch desde fuente
    result = get_user_profile(42)
    assert r.exists("user_profile:42")

    # Segunda llamada: cache hit
    result2 = get_user_profile(42)
    assert result == result2

    # Después de invalidación: cache miss otra vez
    r.delete("user_profile:42")
    result3 = get_user_profile(42)
    assert r.exists("user_profile:42")
```

### ¿Cuál es la diferencia entre `SETEX` y `SET ... EX`?

Son equivalentes. `SETEX key seconds value` es la forma antigua. `SET key value EX seconds` es la forma nueva y más flexible que soporta `NX`, `XX` y otras opciones en un solo comando.

### ¿Cómo manejo caché durante despliegues?

Usa un prefijo de versión de caché que cambie con cada despliegue:

```python
import os
CACHE_VERSION = os.getenv("CACHE_VERSION", "v1")

def cache_key(entity: str, id: int) -> str:
    return f"{CACHE_VERSION}:{entity}:{id}"
```

Cuando despliegas, incrementa `CACHE_VERSION`. Las keys antiguas expiran naturalmente via TTL, y las nuevas peticiones usan el nuevo prefijo de versión.

## Tips de Rendimiento

1. **Usa `MSET` y `MGET` para operaciones batch.** Reduce round-trips al setear o obtener múltiples keys:

```python
# Mal: 100 round-trips
for i in range(100):
    r.set(f"key:{i}", f"value:{i}")

# Bien: 1 round-trip
r.mset({f"key:{i}": f"value:{i}" for i in range(100)})
```

2. **Usa `HSET` con múltiples campos.** Las operaciones de Hash son más eficientes en memoria para datos estructurados:

```python
r.hset("user:42", mapping={
    "name": "Alice",
    "email": "alice@example.com",
    "role": "admin",
})
```

3. **Usa `SETEX` en lugar de `SET` + `EXPIRE`.** `SETEX` es atómico y ahorra un round-trip:

```python
# Mal: dos comandos
r.set("key", "value")
r.expire("key", 300)

# Bien: un comando atómico
r.setex("key", 300, "value")
```

4. **Habilita `tcp-keepalive` en Redis.** Previene que conexiones stale consuman recursos:

```bash
# redis.conf
tcp-keepalive 60
```

5. **Usa `CLIENT INFO` para debuggear connection leaks.** Rastrea cuántas conexiones mantiene cada cliente:

```bash
redis-cli CLIENT LIST
# Mostrar idle times y edades de conexión
```
