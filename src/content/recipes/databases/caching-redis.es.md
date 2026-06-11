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
  - redis
  - caching
  - cache
  - cache-aside
  - ttl
  - performance
  - python
  - javascript
  - java
relatedResources:
  - /recipes/caching
  - /recipes/database-migrations-safely
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/soft-deletes
lastUpdated: "2026-06-11"
author: "StackPractices"
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

El caching es la forma más efectiva de acelerar aplicaciones con muchas lecturas. Redis es un almacén de estructuras de datos en memoria que sirve como caché de alto rendimiento, reduciendo la carga en la base de datos y cortando tiempos de respuesta de cientos de milisegundos a microsegundos. Esta receta cubre el patrón cache-aside, gestión de TTL, serialización y estrategias de invalidación en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Las consultas a base de datos son lentas y devuelven los mismos resultados frecuentemente
- Necesitas reducir carga en APIs o bases de datos downstream
- Datos de sesión, perfiles de usuario o configuración necesitan acceso rápido de lectura
- Se requieren leaderboards en tiempo real, rate limiting o locks temporales

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

## Mejores Prácticas

- **Configura TTL en todo**: Sin TTL, tu caché crece infinitamente y datos obsoletos viven indefinidamente. Usa 5-15 minutos para datos volátiles, horas para datos de referencia estables.
- **Usa versionado de cache keys**: `user:v2:123` permite invalidar un esquema entero cambiando el prefijo de versión.
- **Serializa a JSON o MessagePack**: JSON es legible; MessagePack es más pequeño y rápido. Evita `pickle` de Python o serialización nativa de Java por seguridad.
- **Maneja cache misses elegantemente**: Los fallos de caché deben degradar a la base de datos, nunca crashear la app. Usa circuit breakers para conexiones Redis.
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
