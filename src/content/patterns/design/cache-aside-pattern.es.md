---





contentType: patterns
slug: cache-aside-pattern
title: "Patrón Cache-Aside"
description: "Carga datos en el caché bajo demanda desde el almacenamiento principal. Un patrón de caché que da a la aplicación control total sobre qué y cuándo cachear."
metaDescription: "Aprende el Patrón Cache-Aside en Python, Java y JavaScript. Patrón de caché para lectura de datos con lógica de caché gestionada por la aplicación."
difficulty: beginner
topics:
  - design
tags:
  - cache-aside
  - patron
  - patron-de-diseno
  - caching
  - rendimiento
  - redis
  - python
  - javascript
  - java
relatedResources:
  - /patterns/retry-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/singleton-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/cqrs-pattern
  - /patterns/read-through-cache-pattern
  - /patterns/two-level-cache-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Cache-Aside en Python, Java y JavaScript. Patrón de caché para lectura de datos con lógica de caché gestionada por la aplicación."
  keywords:
    - patron cache aside
    - patron de diseno
    - patron de caching
    - read-through caching
    - redis caching
    - python cache
    - java cache
    - javascript cache





---

# Patrón Cache-Aside

## Resumen

El Patrón Cache-Aside es una estrategia de caché donde la aplicación es responsable de cargar datos en el caché desde el almacenamiento principal bajo demanda. La aplicación verifica el caché primero; si los datos no están presentes (cache miss), los obtiene de la base de datos, pobla el caché y devuelve el resultado. Esto da a la aplicación control total sobre la lógica de caché, invalidación y consistencia.

## Cuándo usarlo

Usa el Patrón Cache-Aside cuando:
- Tengas cargas de trabajo de lectura intensiva donde los mismos datos se solicitan frecuentemente
- La aplicación debería controlar qué se cachea y por cuánto tiempo
- La invalidación de caché pueda manejarse explícitamente por la capa de aplicación
- Quieras una estrategia de caché simple y portable que funcione con cualquier proveedor (Redis, Memcached, en-memoria)
- Ejemplos: perfiles de usuario, catálogos de productos, [datos de configuración](/recipes/data/parse-json), datos de referencia

## Solución

### Python

```python
import time
from typing import Optional, Callable

class CacheAside:
    def __init__(self, cache: dict, ttl_seconds: float = 60):
        self.cache = cache
        self.ttl = ttl_seconds
        self.timestamps = {}

    def get(self, key: str, loader: Callable[[], any]) -> any:
        now = time.time()
        if key in self.cache:
            if now - self.timestamps.get(key, 0) < self.ttl:
                print(f"Cache hit: {key}")
                return self.cache[key]
            else:
                del self.cache[key]

        print(f"Cache miss: {key}")
        value = loader()
        self.cache[key] = value
        self.timestamps[key] = now
        return value

    def invalidate(self, key: str):
        self.cache.pop(key, None)
        self.timestamps.pop(key, None)

# Uso
cache = {}
store = CacheAside(cache)

def load_user(user_id: int) -> dict:
    # Simula llamada a DB
    return {"id": user_id, "name": f"User {user_id}"}

user = store.get("user:1", lambda: load_user(1))
user = store.get("user:1", lambda: load_user(1))  # Cache hit
store.invalidate("user:1")
```

### JavaScript

```javascript
class CacheAside {
  constructor(cache, ttlMs = 60000) {
    this.cache = cache;
    this.ttl = ttlMs;
    this.timestamps = new Map();
  }

  get(key, loader) {
    const now = Date.now();
    if (this.cache.has(key)) {
      if (now - (this.timestamps.get(key) || 0) < this.ttl) {
        console.log(`Cache hit: ${key}`);
        return this.cache.get(key);
      }
      this.cache.delete(key);
    }

    console.log(`Cache miss: ${key}`);
    const value = loader();
    this.cache.set(key, value);
    this.timestamps.set(key, now);
    return value;
  }

  invalidate(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }
}

// Uso
const cache = new Map();
const store = new CacheAside(cache);

function loadUser(userId) {
  return { id: userId, name: `User ${userId}` };
}

let user = store.get("user:1", () => loadUser(1));
user = store.get("user:1", () => loadUser(1)); // Cache hit
store.invalidate("user:1");
```

### Java

```java
import java.util.*;
import java.util.function.Supplier;

public class CacheAside<K, V> {
    private final Map<K, V> cache;
    private final Map<K, Long> timestamps;
    private final long ttlMs;

    public CacheAside(Map<K, V> cache, long ttlMs) {
        this.cache = cache;
        this.timestamps = new HashMap<>();
        this.ttlMs = ttlMs;
    }

    public V get(K key, Supplier<V> loader) {
        long now = System.currentTimeMillis();
        if (cache.containsKey(key)) {
            if (now - timestamps.getOrDefault(key, 0L) < ttlMs) {
                System.out.println("Cache hit: " + key);
                return cache.get(key);
            }
            cache.remove(key);
        }

        System.out.println("Cache miss: " + key);
        V value = loader.get();
        cache.put(key, value);
        timestamps.put(key, now);
        return value;
    }

    public void invalidate(K key) {
        cache.remove(key);
        timestamps.remove(key);
    }
}

// Uso
CacheAside<String, Map<String, Object>> store =
    new CacheAside<>(new HashMap<>(), 60000);

Map<String, Object> user = store.get("user:1", () ->
    Map.of("id", 1, "name", "User 1")
);
```

## Explicación

El Patrón Cache-Aside sigue este flujo:

1. **Lectura**: La aplicación verifica el caché → si hay hit, devuelve; si hay miss, procede al paso 2
2. **Carga**: Obtiene desde el almacenamiento principal (base de datos, API)
3. **Almacenamiento**: Escribe el resultado en el caché con un TTL
4. **Invalidación**: En escrituras/actualizaciones, invalida la entrada del caché para que la próxima lectura la refresque

La aplicación es el **único punto de control** — decide cuándo leer del caché, cuándo recurrir al almacenamiento y cuándo invalidar.

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **[Lazy Loading](/recipes/performance/lazy-loading)** | El cache miss dispara la carga | Más común; previene llenados innecesarios del caché |
| **[Write-Through](/recipes/performance/cache-invalidation)** | Las escrituras actualizan caché y DB simultáneamente | Consistencia fuerte requerida |
| **Refresh-Ahead** | Refresca proactivamente antes de que expire el TTL | Patrones de acceso predecibles |
| **Multi-Nivel** | L1 (en-memoria) + L2 (Redis) + L3 (DB) | Aplicaciones de alta escala |

## Lo que funciona

- **Siempre establece un TTL** — datos obsoletos son peores que un cache miss
- **Invalida en escrituras** — elimina la clave del caché después de actualizaciones de DB para mantener consistencia
- **Usa un [circuit breaker](/patterns/design/circuit-breaker-pattern)** alrededor de fallas de caché — si Redis está caído, recurre directamente a la DB
- **Serializa objetos complejos** antes de almacenar (JSON, protobuf)
- **Monitorea el cache hit ratio** — apunta a >90% en cargas de trabajo de lectura intensiva
- **Precalienta el caché** al inicio para datos de referencia críticos

## Errores comunes

- Olvidar invalidar el caché después de escrituras en DB, causando datos obsoletos
- Establecer TTL demasiado largo, sirviendo información desactualizada
- No manejar fallas del proveedor de caché gracefulmente (ej. conexión a Redis perdida)
- Almacenar demasiados datos en caché, causando presión de memoria o eviction de claves calientes
- Cache stampede: muchas peticiones golpean un caché frío simultáneamente, sobrecargando la DB

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Cache-Aside y Read-Through?**
R: En Cache-Aside, la aplicación controla la lógica de caché. En Read-Through, el proveedor de caché (ej. Redis con cache loader) obtiene de la DB transparentemente. Cache-Aside es más explícito y portable; Read-Through delega el control a la capa de caché.

**P: ¿Cómo prevengo cache stampedes?**
R: Usa un [mutex](/recipes/security/rate-limiting) o lock por clave para que solo una petición cargue desde la DB mientras otras esperan. Alternativamente, consulta [estrategias de caché](/recipes/performance/caching-strategies) para más patrones, o usa expiración temprana probabilística (ej. refresca la clave antes de que expire el TTL con cierta probabilidad).

**P: ¿Debería cachear escrituras (Write-Through) o invalidar (Cache-Aside)?**
R: La invalidación de Cache-Aside es más simple y segura. Write-Through agrega complejidad pero garantiza consistencia. Usa Write-Through solo cuando la consistencia fuerte sea crítica y valga la pena el overhead.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Cache-Aside para API de Productos

```typescript
// Cache-Aside: leer de cache, si miss leer de DB y llenar cache
class ProductCache {
  constructor(private redis: RedisClient, private db: Pool, private ttlSec: number = 300) {}

  async getProduct(id: string): Promise<Product | null> {
    // 1. Intentar cache
    const cached = await this.redis.get(`product:${id}`);
    if (cached) return JSON.parse(cached);

    // 2. Cache miss: leer de DB
    const res = await this.db.query("SELECT * FROM products WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    const product = res.rows[0];

    // 3. Llenar cache
    await this.redis.setex(`product:${id}`, this.ttlSec, JSON.stringify(product));
    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    // 1. Actualizar DB
    await this.db.query("UPDATE products SET name=$1, price=$2 WHERE id=$3", [data.name, data.price, id]);
    // 2. Invalidar cache
    await this.redis.del(`product:${id}`);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.query("DELETE FROM products WHERE id = $1", [id]);
    await this.redis.del(`product:${id}`);
  }
}

// Estrategias de invalidacion
  | Estrategia | Descripcion | Pros | Contras |
  |-------------|-------------|------|---------|
  | TTL | Expira tras N segundos | Simple | Datos stale hasta expirar |
  | Write-through | Escribir cache al escribir DB | Siempre consistente | Latencia en writes |
  | Write-around | Escribir solo DB, cache en read | Writes rapidos | Primer read es lento |
  | Write-back | Escribir cache, async a DB | Writes rapidos | Riesgo de perdida |
  | Explicit | Invalidar en update/delete | Control total | Requiere codigo manual |
```

Lecciones:
  - Cache-Aside: la app gestiona el cache explicitamente
  - Read: cache -> miss -> DB -> fill cache
  - Write: DB -> invalidate cache (no actualizar cache)
  - TTL como red de seguridad: si la invalidacion falla, el TTL limpia
  - Cache stampede: si N requests hacen miss simultaneo, N queries a DB
  - Solucion: lock o single-flight: solo 1 request va a DB, los demas esperan
```

### Como evito cache stampede?

Usa un lock distribuido (Redis SETNX): solo el primer request va a DB, los demas esperan. Alternativa: cache con probabilistic early expiration: refrescar antes del TTL si hay trafico. Otra opcion: single-flight en Go o Promise deduplication en JS: si ya hay un fetch en curso para esa key, reutilizar la promesa. Esto reduce N queries a 1 query durante un cache miss masivo.
