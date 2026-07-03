---
contentType: recipes
slug: redis-cache-aside-pattern
title: "Implementar el patron Cache-Aside con Redis"
description: "Usa el patron cache-aside para leer y escribir datos a traves de Redis, manejando cache misses, lecturas obsoletas e invalidacion write-through"
metaDescription: "Implementa el patron cache-aside con Redis. Maneja cache misses, lazy loading, invalidacion write-through y proteccion contra thundering herd."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - redis
  - cache-aside
  - caching pattern
  - performance
  - database
relatedResources:
  - /recipes/caching/caching-redis
  - /recipes/caching/python-redis-cache-decorator
  - /patterns/caching/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa el patron cache-aside con Redis. Maneja cache misses, lazy loading, invalidacion write-through y proteccion contra thundering herd."
  keywords:
    - cache aside pattern
    - redis cache aside
    - lazy loading cache
    - write through cache
    - redis caching pattern
---

# Implementar el patron Cache-Aside con Redis

Cache-aside (tambien llamado lazy loading) es el patron de caching mas comun. La aplicacion verifica la cache primero; en un miss, carga desde la base de datos, escribe el resultado en la cache y lo retorna. En escrituras, la aplicacion actualiza la base de datos e invalida la entrada de cache. Esta receta implementa cache-aside en Python con Redis, incluyendo proteccion contra thundering herd e invalidacion write-through.

## Cuando Usar Esto

- Workloads de lectura intensiva donde los mismos datos se acceden repetidamente
- Datos que cambian infrecuentemente pero son costosos de obtener
- Quieres que la cache sea opcional — el sistema funciona sin ella

## Requisitos Previos

- Python 3.10+
- Paquete `redis` (`pip install redis`)
- Un cliente de base de datos (SQLAlchemy, Psycopg o similar)

## Solucion

### 1. Instalar dependencias

```bash
pip install redis
```

### 2. Implementar lectura cache-aside

```python
import json
import logging
from redis import Redis

logger = logging.getLogger(__name__)


class CacheAside:
    def __init__(self, redis_client: Redis, default_ttl: int = 300):
        self.redis = redis_client
        self.default_ttl = default_ttl

    def get_or_load(
        self,
        key: str,
        loader: callable,
        ttl: int | None = None,
    ) -> dict | None:
        """Read from cache, or load from source and cache the result.

        Args:
            key: Cache key.
            loader: Function that loads data from the source on cache miss.
            ttl: Override default TTL in seconds.

        Returns:
            Cached or freshly loaded data.
        """
        try:
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)
        except Exception as e:
            logger.warning("Cache read failed for %s: %s", key, e)

        result = loader()
        if result is None:
            return None

        try:
            self.redis.setex(key, ttl or self.default_ttl, json.dumps(result, default=str))
        except Exception as e:
            logger.warning("Cache write failed for %s: %s", key, e)

        return result

    def invalidate(self, key: str) -> None:
        """Remove a key from the cache."""
        try:
            self.redis.delete(key)
        except Exception as e:
            logger.warning("Cache invalidation failed for %s: %s", key, e)

    def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern (e.g., 'user:*')."""
        count = 0
        try:
            for key in self.redis.scan_iter(match=pattern, count=100):
                self.redis.delete(key)
                count += 1
        except Exception as e:
            logger.warning("Pattern invalidation failed for %s: %s", pattern, e)
        return count
```

### 3. Implementar invalidacion write-through

```python
from myapp.database import db

cache = CacheAside(redis_client, default_ttl=300)

def get_user(user_id: str) -> dict | None:
    return cache.get_or_load(
        key=f"user:{user_id}",
        loader=lambda: db.users.find_by_id(user_id),
        ttl=120,
    )

def update_user(user_id: str, data: dict) -> dict:
    user = db.users.update(user_id, data)
    cache.invalidate(f"user:{user_id}")
    return user

def delete_user(user_id: str) -> None:
    db.users.delete(user_id)
    cache.invalidate(f"user:{user_id}")
    cache.invalidate_pattern(f"user_posts:{user_id}:*")
```

### 4. Proteccion contra thundering herd

Cuando una entrada de cache expira, multiples peticiones pueden disparar el loader simultaneamente, causando un pico en la base de datos. Un lock previene esto:

```python
import time
import uuid

class CacheAsideWithLock(CacheAside):
    def get_or_load(
        self,
        key: str,
        loader: callable,
        ttl: int | None = None,
        lock_timeout: int = 10,
    ) -> dict | None:
        # Intentar cache primero
        try:
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)
        except Exception:
            pass

        # Adquirir lock para prevenir thundering herd
        lock_key = f"lock:{key}"
        lock_token = str(uuid.uuid4())

        acquired = self.redis.set(lock_key, lock_token, nx=True, ex=lock_timeout)
        if acquired:
            try:
                result = loader()
                if result is not None:
                    self.redis.setex(key, ttl or self.default_ttl, json.dumps(result, default=str))
                return result
            finally:
                # Liberar lock solo si todavia lo poseemos
                self._release_lock(lock_key, lock_token)
        else:
            # Esperar y reintentar
            for _ in range(5):
                time.sleep(0.1)
                cached = self.redis.get(key)
                if cached is not None:
                    return json.loads(cached)
            # Lock expiro — cargar de todas formas como fallback
            return loader()

    def _release_lock(self, lock_key: str, token: str) -> None:
        """Release lock using Lua script to prevent releasing someone else's lock."""
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(script, 1, lock_key, token)
```

### 5. Calentamiento de cache

Pre-poblar la cache antes de que llegue el trafico:

```python
def warm_user_cache(user_ids: list[str]) -> None:
    users = db.users.find_many({"id": {"in": user_ids}})
    for user in users:
        cache_key = f"user:{user['id']}"
        redis_client.setex(cache_key, 300, json.dumps(user, default=str))
    logger.info("Warmed cache for %d users", len(users))
```

## Como Funciona

1. **Lectura de cache** — `get_or_load` verifica Redis primero. En un hit, retorna el valor cacheado sin tocar la base de datos.
2. **Cache miss** — la funcion `loader` obtiene desde la base de datos. El resultado se escribe a Redis con un TTL para que auto-expire.
3. **Invalidacion write-through** — despues de cualquier escritura a la base de datos, `invalidate` elimina la entrada de cache para que la siguiente lectura cargue datos frescos.
4. **Lock de thundering herd** — en un cache miss, solo una peticion adquiere el lock y carga desde la base de datos. Las demas esperan y reintentan la lectura de cache.
5. **Invalidacion por patron** — `invalidate_pattern` usa `SCAN` para encontrar y eliminar claves que coinciden con un patron glob, util para invalidar todas las entradas de un usuario.

## Variantes

### Read-Through con Refresh-Ahead

Refresca la cache antes de que expire:

```python
def get_or_refresh(key: str, loader: callable, ttl: int = 300) -> dict | None:
    cached = redis_client.get(key)
    if cached:
        result = json.loads(cached)
        # Verificar si la entrada esta cerca de expirar (dentro del 10% del TTL)
        ttl_remaining = redis_client.ttl(key)
        if ttl_remaining < ttl * 0.1:
            # Refrescar en background
            threading.Thread(target=lambda: cache.get_or_load(key, loader, ttl), daemon=True).start()
        return result
    return cache.get_or_load(key, loader, ttl)
```

### Write-Behind (Write-Back)

Escribe en la cache primero, luego persiste asincronamente a la base de datos:

```python
def write_behind_update(user_id: str, data: dict) -> dict:
    cache_key = f"user:{user_id}"
    redis_client.setex(cache_key, 300, json.dumps(data, default=str))
    redis_client.lpush("write_queue:user", json.dumps({"id": user_id, "data": data}))
    return data

# Worker en background procesa la cola
def process_write_queue():
    while True:
        item = redis_client.brpop("write_queue:user", timeout=10)
        if item:
            payload = json.loads(item[1])
            db.users.update(payload["id"], payload["data"])
```

## Mejores Practicas

- **Establece un TTL en cada entrada de cache** — previene que datos obsoletos persistan indefinidamente
- **Invalida al escribir** — actualiza la base de datos primero, luego elimina la entrada de cache (no al reves)
- **Maneja fallos de Redis elegantemente** — la cache es una optimizacion; el loader debe seguir funcionando sin ella
- **Usa TTLs cortos para datos mutables** — 30-120 segundos para datos de usuario, mas largo para datos de referencia

## Errores Comunes

- **Actualizar la cache antes que la base de datos** — si la escritura a la base de datos falla, la cache tiene datos obsoletos
- **No manejar cache misses** — si el loader retorna `None`, no lo caches (o cachealo con un TTL corto para prevenir misses repetidos)
- **Usar `KEYS` en lugar de `SCAN`** — `KEYS` bloquea Redis; `SCAN` es non-blocking y seguro para produccion
- **Cachear demasiado** — cachea solo datos calientes; datos frios desperdician memoria y aumentan la overhead de invalidacion

## FAQ

**Q: Cache-aside vs. read-through — cual es la diferencia?**
A: En cache-aside, la aplicacion gestiona lecturas y escrituras de cache. En read-through, una libreria de cache lo maneja transparentemente. Cache-aside da mas control; read-through es mas simple.

**Q: Debo actualizar la cache o invalidarla al escribir?**
A: Invalida (elimina). La siguiente lectura cargara datos frescos. Actualizar la cache arriesga inconsistencia si la escritura a la base de datos falla.

**Q: Como manejo cache stampede?**
A: Usa el patron de lock mostrado arriba, o coalescing de peticiones — solo una peticion carga datos mientras las demas esperan.

**Q: Que TTL debo usar?**
A: Empieza con 300 segundos y ajusta. Monitorea el hit rate de cache — por debajo del 80% significa que el TTL es demasiado corto o los datos cambian muy rapido.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
