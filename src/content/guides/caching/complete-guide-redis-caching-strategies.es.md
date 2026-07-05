---
contentType: guides
slug: complete-guide-redis-caching-strategies
title: "Guía Completa de Estrategias de Caching con Redis"
description: "Dominar caching con Redis: cache-aside, read-through, write-through, write-behind y refresh-ahead. Cubre politicas de eviction, tuning de TTL, serializacion y operaciones de produccion."
metaDescription: "Dominar caching con Redis: cache-aside, read-through, write-through, write-behind, refresh-ahead. Cubre eviction, TTL, serializacion y ops de produccion."
difficulty: advanced
topics:
  - caching
  - databases
  - performance
tags:
  - redis
  - caching
  - guia
  - cache-aside
  - write-through
  - eviction
  - ttl
  - performance
relatedResources:
  - /guides/api/complete-guide-graphql-caching
  - /patterns/design/cache-aside-pattern
  - /patterns/design/write-through-cache-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Dominar caching con Redis: cache-aside, read-through, write-through, write-behind, refresh-ahead. Cubre eviction, TTL, serializacion y ops de produccion."
  keywords:
    - redis caching estrategias
    - cache-aside patron
    - write-through redis
    - write-behind redis
    - redis eviction politicas
    - redis ttl tuning
    - redis produccion
---

## Introducción

Redis es el data store en memoria mas popular para caching. Es rapido, versatil, y soporta multiples estructuras de datos. Pero usar Redis efectivamente requiere elegir la estrategia de caching correcta para cada caso de uso. La estrategia equivocada lleva a datos stale, cache stampedes, o memoria desperdiciada. Esta guia cubre los cinco patrones principales de caching con Redis, politicas de eviction, tuning de TTL, elecciones de serializacion, y operaciones de produccion.

## Resumen de Patrones de Caching

```text
Patron           Read Flow                    Write Flow
─────────────────────────────────────────────────────────────────
Cache-Aside       App → Redis → DB → Redis     App → DB, luego invalida Redis
Read-Through      App → Cache Layer → DB       App → Cache Layer → DB
Write-Through     App → Cache → DB (sync)      App → Cache, Cache → DB
Write-Behind      App → Cache (async → DB)     App → Cache, Cache async → DB
Refresh-Ahead     Background refresh antes TTL  App → DB, luego update Redis
```

Cada patron tiene diferentes tradeoffs en consistencia, latencia, y complejidad.

## Cache-Aside (Lazy Loading)

La aplicacion maneja el cache explicitamente. En una lectura, checkea Redis primero. Si los datos no estan (cache miss), lee de la base de datos, escribe a Redis, y retorna. En una escritura, actualiza la base de datos y elimina la entrada de cache.

### Read Flow

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, db=0)

def get_user(user_id: int) -> dict | None:
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Cache miss: leer de base de datos
    user = db.users.find_by_id(user_id)
    if user:
        r.setex(cache_key, 3600, json.dumps(user))
    return user
```

### Write Flow

```python
def update_user(user_id: int, data: dict) -> dict:
    user = db.users.update(user_id, data)
    # Invalidar entrada de cache
    r.delete(f"user:{user_id}")
    return user
```

### Ventajas

- Simple de implementar
- El cache solo contiene datos que son realmente solicitados
- Resiliente a fallos de cache (falla back a base de datos)

### Desventajas

- Cache miss anade latencia (lectura de DB + escritura a cache)
- Los datos pueden estar stale entre escrituras y la siguiente lectura
- Cache stampede en cache frio o despues de invalidacion masiva

### Prevenir Cache Stampede

Cuando muchas requests miss el cache simultaneamente, todas hittean la base de datos. Usa un lock para que solo una request fetchee de la base de datos.

```python
import time

def get_user_safe(user_id: int) -> dict | None:
    cache_key = f"user:{user_id}"
    lock_key = f"lock:user:{user_id}"
    
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Intentar adquirir lock
    acquired = r.set(lock_key, "1", nx=True, ex=10)
    if acquired:
        try:
            # Double-check cache despues de adquirir lock
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            
            user = db.users.find_by_id(user_id)
            if user:
                r.setex(cache_key, 3600, json.dumps(user))
            return user
        finally:
            r.delete(lock_key)
    else:
        # Esperar y reintentar
        time.sleep(0.1)
        return get_user_safe(user_id)
```

## Read-Through

La aplicacion habla con una capa de cache que transparentemente fetchea de la base de datos en un miss. La aplicacion no sabe sobre la base de datos.

```python
class ReadThroughCache:
    def __init__(self, redis_client, db_loader):
        self.redis = redis_client
        self.db_loader = db_loader
    
    def get(self, key: str, ttl: int = 3600) -> dict | None:
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        # Cargar de base de datos
        data = self.db_loader(key)
        if data:
            self.redis.setex(key, ttl, json.dumps(data))
        return data

user_cache = ReadThroughCache(r, lambda key: db.users.find_by_id(int(key.split(":")[1])))
user = user_cache.get("user:42")
```

### Ventajas

- Codigo de aplicacion mas limpio (sin logica de cache)
- Comportamiento de caching consistente across todos los read paths
- Facil anadir caching a codigo existente

### Desventajas

- La capa de cache es un single point of failure
- Menos control sobre cuando cachear y cuando no
- Datos stale hasta que el TTL expira

## Write-Through

Las escrituras van al cache primero, luego sincronamente a la base de datos. El cache siempre tiene los datos mas recientes.

```python
class WriteThroughCache:
    def __init__(self, redis_client, db_writer):
        self.redis = redis_client
        self.db_writer = db_writer
    
    def set(self, key: str, value: dict, ttl: int = 3600) -> dict:
        # Escribir a base de datos primero
        result = self.db_writer(key, value)
        # Luego escribir a cache
        self.redis.setex(key, ttl, json.dumps(result))
        return result

user_cache = WriteThroughCache(r, lambda key, val: db.users.update(int(key.split(":")[1]), val))
user = user_cache.set("user:42", {"name": "Alice"})
```

### Ventajas

- El cache siempre es consistente con la base de datos
- Sin datos stale
- Simple de razonar

### Desventajas

- Latencia de escritura mas alta (dos escrituras sincronas)
- Si el cache falla, la escritura falla (o necesitas un fallback)
- No adecuado para workloads de mucha escritura

## Write-Behind (Write-Back)

Las escrituras van al cache primero. Un proceso en background escribe asincronamente a la base de datos. Esto reduce la latencia de escritura pero introduce una ventana de potencial perdida de datos.

```python
import threading
import queue

write_queue = queue.Queue()

class WriteBehindCache:
    def __init__(self, redis_client, db_writer):
        self.redis = redis_client
        self.db_writer = db_writer
    
    def set(self, key: str, value: dict, ttl: int = 3600) -> dict:
        # Escribir a cache inmediatamente
        self.redis.setex(key, ttl, json.dumps(value))
        # Encolar para escritura asincrona a DB
        write_queue.put((key, value))
        return value

# Worker en background
def write_worker():
    while True:
        key, value = write_queue.get()
        try:
            db_writer(key, value)
        except Exception as e:
            print(f"Write failed for {key}: {e}")
        finally:
            write_queue.task_done()

threading.Thread(target=write_worker, daemon=True).start()
```

### Ventajas

- Latencia de escritura muy baja (solo la escritura a Redis es sincrona)
- Alto throughput para workloads de mucha escritura
- Carga de base de datos suavizada (batch writes posibles)

### Desventajas

- Riesgo de perdida de datos si Redis crashea antes de la escritura a DB
- Complejo de implementar correctamente (orden, retries, idempotencia)
- Dificil de debuggear issues de consistencia

### Cuándo Usar Write-Behind

- Volumen alto de escrituras donde ligera perdida de datos es aceptable (analytics, counters)
- Workloads de mucha escritura donde la base de datos es el bottleneck
- Escenarios donde consistencia eventual es aceptable

## Refresh-Ahead

Un proceso en background refresca entradas de cache antes de que expiren. Esto previene cache misses y mantiene datos frescos.

```python
import threading
import time

def refresh_ahead():
    while True:
        # Encontrar keys que expiran pronto (dentro de 5 minutos)
        keys = r.scan(match="user:*", count=100)
        for key in keys:
            ttl = r.ttl(key)
            if 0 < ttl < 300:  # Expira en menos de 5 minutos
                user_id = int(key.split(":")[1])
                user = db.users.find_by_id(user_id)
                if user:
                    r.setex(key, 3600, json.dumps(user))
        time.sleep(60)  # Checkear cada minuto

threading.Thread(target=refresh_ahead, daemon=True).start()
```

### Ventajas

- Sin cache misses para hot keys
- Los datos se mantienen frescos
- Carga de base de datos suavizada (proactivo, no reactivo)

### Desventajas

- Desperdicia recursos refrescando cold keys que ya no se acceden
- Complejo de implementar (necesitas trackear cuales keys son hot)
- Datos stale si el refresh falla

## Políticas de Eviction

Cuando Redis alcanza su limite de memoria, evicta keys basandose en la politica configurada.

| Politica | Descripcion | Mejor Para |
|----------|-------------|------------|
| `noeviction` | Retorna error en writes cuando memoria esta llena | Datos criticos que no deben perderse |
| `allkeys-lru` | Evicta key least recently used (cualquier key) | Caching de proposito general |
| `allkeys-lfu` | Evicta key least frequently used (cualquier key) | Patrones de acceso skewed |
| `volatile-lru` | Evicta LRU entre keys con TTL seteado | Mix de datos cacheados y persistentes |
| `volatile-lfu` | Evicta LFU entre keys con TTL seteado | Mix de datos cacheados y persistentes |
| `volatile-ttl` | Evicta key con TTL mas corto | Datos sensibles al tiempo |
| `volatile-random` | Evicta key random entre keys con TTL | Simple, bajo overhead |
| `allkeys-random` | Evicta key random (cualquier key) | Patrones de acceso uniforme |

### Elegir una Política de Eviction

```bash
# Setear politica de eviction en redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

Para la mayoria de workloads de caching, `allkeys-lru` es la opcion correcta. Evicta las keys least recently used, que son probables de ser las menos utiles. Usa `volatile-lru` cuando almacenas tanto datos cacheados (con TTL) como datos persistentes (sin TTL) en la misma instancia de Redis.

## Tuning de TTL

### Setear TTLs

Siempre setea un TTL en datos cacheados. Sin TTL, los datos se quedan en Redis para siempre, consumiendo memoria.

```python
# TTL corto para datos que cambian frecuentemente
r.setex("session:abc123", 900, session_data)  # 15 minutos

# TTL medio para datos que cambian moderadamente
r.setex("user:42", 3600, user_data)  # 1 hora

# TTL largo para datos que cambian raramente
r.setex("config:app", 86400, config_data)  # 24 horas
```

### TTL Jitter

Cuando muchas keys expiran al mismo tiempo, ocurre un cache stampede. Anade jitter aleatorio a los TTLs para esparcir expiraciones.

```python
import random

def set_with_jitter(key: str, value: str, base_ttl: int = 3600, jitter: int = 300):
    actual_ttl = base_ttl + random.randint(0, jitter)
    r.setex(key, actual_ttl, value)
```

### TTL vs Eviction

TTL controla cuando los datos expiran. Eviction controla que se remueve cuando la memoria esta llena. Ambos son necesarios: TTL previene datos stale, eviction previene out-of-memory.

## Serialización

### JSON

JSON es human-readable y soportado en todas partes. Usalo para la mayoria de datos cacheados.

```python
import json

r.set("user:42", json.dumps({"id": 42, "name": "Alice"}))
user = json.loads(r.get("user:42"))
```

### MessagePack

MessagePack es mas compacto que JSON. Usalo para objetos grandes donde la memoria importa.

```python
import msgpack

r.set("user:42", msgpack.packb({"id": 42, "name": "Alice"}))
user = msgpack.unpackb(r.get("user:42"), raw=False)
```

### Redis Hashes

Para objetos con muchos campos, usa Redis hashes en lugar de strings serializados. Esto permite actualizaciones parciales.

```python
r.hset("user:42", mapping={"name": "Alice", "email": "alice@example.com", "age": "30"})
name = r.hget("user:42", "name")
```

## Operaciones de Producción

### Monitoreo

Trackea estas metricas en produccion:

- **Hit rate**: `hits / (hits + misses)` — deberia estar sobre 80% para la mayoria de workloads
- **Uso de memoria**: `used_memory / maxmemory` — deberia mantenerse bajo 80%
- **Eviction rate**: keys evicted por segundo — rate alto significa que necesitas mas memoria
- **Latencia**: p99 para GET y SET — deberia estar bajo 1ms
- **Clientes conectados**: monitorea por connection leaks
- **Estado de persistencia**: si usas RDB/AOF, checkea last save time

```bash
# Checkear stats de Redis
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|evicted_keys"

# Checkear memoria
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
```

### Persistencia

Redis ofrece dos opciones de persistencia:

- **RDB (snapshotting)**: Snapshots point-in-time. Recuperacion rapida, potencial perdida de datos entre snapshots.
- **AOF (append-only file)**: Loggea cada operacion de escritura. Mas lento, perdida de datos minima.

Para workloads de caching donde los datos pueden reconstruirse desde la base de datos, RDB es suficiente. Para patrones write-behind donde Redis es temporalmente la fuente de verdad, usa AOF.

```bash
# redis.conf
save 900 1      # Guardar si al menos 1 key cambio en 15 minutos
save 300 10     # Guardar si al menos 10 keys cambiaron en 5 minutos
appendonly yes
appendfsync everysec
```

### Clustering

Cuando una sola instancia de Redis no es suficiente, usa Redis Cluster para escalado horizontal.

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host="localhost", port=7000)

# Redis Cluster automaticamente sharda keys across nodos
rc.set("user:42", json.dumps({"name": "Alice"}))
```

### Connection Pooling

Siempre usa connection pooling en produccion. Crear una nueva conexion por request es costoso.

```python
pool = redis.ConnectionPool(host="localhost", port=6379, max_connections=50)
r = redis.Redis(connection_pool=pool)
```

## Pitfalls Comunes

### Almacenar Objetos Grandes

Objetos grandes (>1MB) en Redis consumen memoria y ralentizan operaciones. Almacena referencias en lugar de objetos completos, o usa un blob store dedicado.

```python
# Mal: almacenar una imagen de 5MB en Redis
r.set("image:42", large_image_bytes)

# Bien: almacenar metadata en Redis, imagen en S3
r.hset("image:42", mapping={"url": "s3://bucket/image42.jpg", "width": "1920", "height": "1080"})
```

### Usar KEYS en Producción

El comando `KEYS` bloquea Redis mientras escanea todas las keys. Usa `SCAN` en su lugar.

```python
# Mal: bloquea Redis
keys = r.keys("user:*")

# Bien: non-blocking, retorna en batches
for key in r.scan_iter(match="user:*", count=100):
    process(key)
```

### No Manejar Fallos de Cache

Si Redis se cae, tu aplicacion deberia fallar back a la base de datos, no crashear.

```python
def get_user_resilient(user_id: int) -> dict | None:
    try:
        cached = r.get(f"user:{user_id}")
        if cached:
            return json.loads(cached)
    except redis.ConnectionError:
        pass  # Fall back a base de datos
    
    user = db.users.find_by_id(user_id)
    if user:
        try:
            r.setex(f"user:{user_id}", 3600, json.dumps(user))
        except redis.ConnectionError:
            pass  # Cache caido, continuar sin cachear
    return user
```

## Preguntas Frecuentes

### ¿Con qué patrón de caching debería empezar?

Empieza con cache-aside. Es el mas simple de implementar y razonar. Anade patrones mas complejos (write-through, write-behind) solo cuando tienes requerimientos especificos de latencia o throughput que cache-aside no puede satisfacer.

### ¿Cuánta memoria debería asignar a Redis?

Asigna suficiente memoria para contener tu working set (datos frecuentemente accedidos) con 20-30% de headroom. Monitorea eviction rate: si es alto, aumenta memoria o reduce TTLs.

### ¿Debería usar Redis para session storage?

Si. Redis es bien adecuado para session storage. Setea un TTL igual al timeout de sesion. Usa politica de eviction `allkeys-lru` o `volatile-lru` para que sesiones viejas sean evicted cuando la memoria este llena.

### ¿Cómo testeo el comportamiento del cache?

Escribe integration tests que verifiquen: cache hits retornan datos cacheados, cache misses fetchean de base de datos y pueblan cache, escrituras invalidan cache, expiracion de TTL triggerea fetch de DB. Usa una instancia de Redis de test (no produccion).

### ¿Cuál es la diferencia entre Redis y Memcached?

Redis soporta multiples estructuras de datos (strings, hashes, lists, sets, sorted sets), persistencia, pub/sub, y clustering. Memcached es mas simple (solo key-value) y multithreaded. Usa Redis para la mayoria de workloads de caching. Usa Memcached para caching simple key-value de alto throughput donde no necesitas persistencia o estructuras de datos avanzadas.

### ¿Debería usar Redis Cluster o Redis Sentinel?

Redis Cluster sharda datos across multiples nodos para escalado horizontal. Redis Sentinel proporciona alta disponibilidad (failover automatico) sin sharding. Usa Cluster cuando necesitas mas capacidad de la que un solo nodo puede proveer. Usa Sentinel cuando necesitas alta disponibilidad pero un solo nodo tiene suficiente capacidad.
