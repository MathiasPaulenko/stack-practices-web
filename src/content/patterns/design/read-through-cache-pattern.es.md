---
contentType: patterns
slug: read-through-cache-pattern
title: "Patron Read-Through Cache"
description: "Una capa de cache transparente que intercepta peticiones de lectura, obtiene del origen de datos en caso de miss y puebla el cache automaticamente."
metaDescription: "Patron read-through cache: un cache transparente que carga datos en miss sin logica de aplicacion. Implementa con Redis y Python, Java y TypeScript."
difficulty: intermediate
topics:
  - caching
  - design
tags:
  - caching
  - read-through
  - patron
  - redis
  - cache-miss
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/design/cache-aside-pattern
  - /patterns/design/write-through-cache-pattern
  - /recipes/caching/python-redis-cache-decorator
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron read-through cache: un cache transparente que carga datos en miss sin logica de aplicacion. Implementa con Redis y Python, Java y TypeScript."
  keywords:
    - read-through cache
    - cache pattern
    - redis caching
    - transparent cache
    - cache miss handling
    - python cache
    - java cache
---

# Patron Read-Through Cache

## Descripcion general

En un read-through cache, la aplicacion habla solo con la capa de cache. En un cache hit, el cache devuelve los datos directamente. En un cache miss, el cache obtiene los datos del backing store, los almacena y los devuelve a la aplicacion. La aplicacion nunca interactua con la base de datos directamente para lecturas.

Esto difiere de cache-aside, donde la aplicacion gestiona la poblacion del cache. Read-through mueve esa responsabilidad a la capa de cache o a una libreria de cache, simplificando el codigo de la aplicacion y asegurando comportamiento de cache consistente en todos los caminos de lectura.

## Cuando usarlo

- Multiples caminos de lectura acceden a los mismos datos y quieres comportamiento de cache consistente
- Quieres desacoplar el codigo de aplicacion de la logica de gestion de cache
- Tu capa de cache soporta un callback read-through (Redis con Lua, memcached con callbacks)
- Necesitas comportamiento de cache predecible sin depender de que cada desarrollador llame al cache correctamente
- La latencia de lectura es mas critica que la de escritura

## Solucion

### Python con Redis

```python
import redis
import json
import pickle
from typing import Callable, TypeVar, Optional

T = TypeVar('T')

class ReadThroughCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl

    def get_or_load(self, key: str, loader: Callable[[], T], ttl: Optional[int] = None) -> T:
        cached = self.redis.get(key)
        if cached is not None:
            return pickle.loads(cached)

        value = loader()
        self.redis.setex(key, ttl or self.ttl, pickle.dumps(value))
        return value

    def get_or_load_json(self, key: str, loader: Callable[[], dict], ttl: Optional[int] = None) -> dict:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        value = loader()
        self.redis.setex(key, ttl or self.ttl, json.dumps(value))
        return value


cache = ReadThroughCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.get_or_load_json(
        f"user:{user_id}",
        lambda: db.query_one("SELECT id, name, email FROM users WHERE id = %s", [user_id]),
        ttl=1800
    )
```

### TypeScript con Redis

```typescript
import { createClient } from 'redis';

class ReadThroughCache {
  private client: ReturnType<typeof createClient>;
  private defaultTtl: number;

  constructor(client: ReturnType<typeof createClient>, ttl = 3600) {
    this.client = client;
    this.defaultTtl = ttl;
  }

  async getOrLoad<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.client.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const value = await loader();
    await this.client.set(key, JSON.stringify(value), { EX: ttl ?? this.defaultTtl });
    return value;
  }

  async invalidate(key: string): Promise<void> {
    await this.client.del(key);
  }
}

// Uso
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();
const cache = new ReadThroughCache(redisClient);

async function getUser(userId: string): Promise<User> {
  return cache.getOrLoad(
    `user:${userId}`,
    () => db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]),
    1800
  );
}
```

### Java con Caffeine

```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;

public class ReadThroughCacheManager {

    private final Cache<String, Object> cache;

    public ReadThroughCacheManager() {
        this.cache = Caffeine.newBuilder()
            .expireAfterWrite(30, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();
    }

    @SuppressWarnings("unchecked")
    public <T> T getOrLoad(String key, java.util.function.Function<String, T> loader) {
        return (T) cache.get(key, k -> loader.apply(k));
    }

    public void invalidate(String key) {
        cache.invalidate(key);
    }
}

// Uso
ReadThroughCacheManager cache = new ReadThroughCacheManager();

User user = cache.getOrLoad("user:" + userId, k -> {
    return userRepository.findById(Long.parseLong(k.split(":")[1]))
        .orElseThrow(() -> new NotFoundException("User not found"));
});
```

### Redis con Lua Script (read-through del lado del servidor)

```lua
-- read_through.lua
-- KEYS[1]: cache key
-- ARGV[1]: TTL in seconds
-- ARGV[2]: loader command (e.g., "GET user:123:db")

local cached = redis.call('GET', KEYS[1])
if cached then
  return cached
end

-- En produccion, usa un mecanismo de loader mas sofisticado
local value = redis.call('GET', ARGV[2])
if value then
  redis.call('SETEX', KEYS[1], ARGV[1], value)
  return value
end
return nil
```

```python
# Usando el script Lua
script = r.register_script(lua_script)
result = script(keys=["user:123"], args=[3600, "user:123:db"])
```

## Explicacion

El patron read-through desplaza la gestion del cache de la aplicacion a la capa de cache:

1. **Cache hit** — el cache tiene los datos y los devuelve inmediatamente. No se hace llamada a base de datos.
2. **Cache miss** — el cache llama a una funcion loader (o callback) que sabe como obtener los datos del backing store. Los datos obtenidos se almacenan en el cache con un TTL y se devuelven al llamador.
3. **Lecturas subsiguientes** — la misma key hace hit en el cache hasta que el TTL expira o la entrada se invalida.

La diferencia clave con cache-aside es la transparencia. Con cache-aside, la aplicacion comprueba el cache, falla, obtiene de la base de datos y puebla el cache. Con read-through, la aplicacion llama `cache.get(key)` y el cache maneja el resto. Esto significa que cada camino de lectura obtiene cache automaticamente sin que cada desarrollador escriba logica de cache.

## Variantes

| Enfoque | Capa | Ideal para |
|---------|------|------------|
| Libreria a nivel aplicacion | Wrapper de cache Python/TS/Java | La mayoria de casos, control total |
| Script Lua en Redis | Servidor Redis | Read-through atomico sin round trips |
| Read-through CDN | Edge CDN | Contenido estatico y semi-estatico |
| Proxy de cache de base de datos | Capa proxy | Cache transparente sin cambios de codigo |
| Cache de segundo nivel ORM | Capa ORM | Java/Hibernate, cache de entidades automatico |

## Buenas practicas

- **Establece un TTL en cada entrada** — sin TTL, los datos stale persisten indefinidamente. Elige TTLs segun la frecuencia de cambio de datos.
- **Usa nombrado de keys consistente** — formato `entity:id` (ej. `user:123`, `product:456`) hace el debugging e invalidacion predecibles.
- **Maneja fallos del loader gracefulmente** — si la base de datos esta caida, devuelve datos stale del cache si estan disponibles en lugar de fallar toda la peticion.
- **Serializa eficientemente** — usa JSON para objetos simples, MessagePack o Protobuf para complejos. Evita payloads grandes que consumen memoria del cache.
- **Monitoriza el cache hit ratio** — un hit ratio por debajo del 80% significa que el cache no es efectivo. Revisa TTLs, patrones de keys y tamano del cache.

## Errores comunes

- **Sin TTL en entradas de cache** — los datos se quedan en cache para siempre, volviendose stale. Siempre establece un TTL, aunque sea largo (24h).
- **Cachear demasiado agresivamente** — cachear todo lleva a presion de memoria y datos stale. Cachea hot keys y queries costosas, no cada lectura.
- **No invalidar despues de escrituras** — despues de actualizar un usuario, la version cacheada esta stale. Llama `cache.invalidate(key)` o usa write-through.
- **Objetos grandes en cache** — cachear un objeto de 10MB consume memoria del cache y aumenta el overhead de serializacion. Cachea proyecciones, no entidades completas.
- **Ignorar cache stampede** — cuando una key popular expira, muchas peticiones fallan simultaneamente y inundan la base de datos. Usa un lock o single-flight.

## Preguntas frecuentes

### Cual es la diferencia entre read-through y cache-aside?

En cache-aside, la aplicacion gestiona la poblacion del cache: comprueba cache, falla, obtiene de DB, puebla cache. En read-through, la capa de cache maneja la poblacion via un callback loader. Read-through centraliza la logica de cache; cache-aside da a la aplicacion mas control.

### Cuando debo usar read-through sobre cache-aside?

Usa read-through cuando quieres cache consistente en todos los caminos de lectura sin depender de que cada desarrollador implemente logica de cache correctamente. Usa cache-aside cuando necesitas control fino sobre cuando y como poblar el cache.

### Como manejo cache stampede en read-through?

Usa un mecanismo de lock o single-flight: cuando ocurre un cache miss, solo una peticion obtiene de la base de datos mientras otras esperan. Los locks distribuidos de Redis o librerias single-flight a nivel lenguaje funcionan bien.

### Puedo usar read-through con un cache distribuido?

Si. Redis y Memcached soportan patrones read-through. Para Redis, usa un script Lua para read-through del lado del servidor. A nivel aplicacion, usa una libreria wrapper de cache que maneje el callback loader.
