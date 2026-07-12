---



contentType: patterns
slug: two-level-cache-pattern
title: "Patron Two-Level Cache"
description: "Combina un cache L1 en memoria con un cache L2 distribuido para reducir latencia de hot keys manteniendo consistencia entre instancias."
metaDescription: "Patron two-level cache: L1 en memoria mas L2 Redis para hot keys de baja latencia con consistencia distribuida. Implementa con Python, Java y TypeScript."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - two-level-cache
  - l1-l2
  - patron
  - redis
  - in-memory
  - performance
  - python
  - java
relatedResources:
  - /patterns/read-through-cache-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/cache-aside-pattern
  - /patterns/cache-stampede-prevention-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron two-level cache: L1 en memoria mas L2 Redis para hot keys de baja latencia con consistencia distribuida. Implementa con Python, Java y TypeScript."
  keywords:
    - two-level cache
    - l1 l2 cache
    - in-memory plus redis
    - multi-level caching
    - cache hierarchy
    - distributed cache pattern



---

# Patron Two-Level Cache

## Descripcion general

Un two-level cache combina un cache L1 en memoria (rapido, local, tamano limitado) con un cache L2 distribuido (mas lento, compartido, mayor capacidad). L1 sirve hot keys a velocidad de memoria sin overhead de red. L2 proporciona estado de cache compartido entre instancias y maneja el dataset completo.

Las lecturas comprueban L1 primero. En un miss, comprueban L2. En un miss de L2, obtienen de la base de datos y pueblan ambos niveles. Las escrituras actualizan ambos niveles e invalidan L1 en otras instancias via pub/sub o TTL.

## Cuando usarlo


- For alternatives, see [Read-Through Cache Pattern](/es/patterns/read-through-cache-pattern/).

- Hot keys se leen frecuentemente y la latencia de red a Redis es perceptible
- Multiples instancias de aplicacion comparten datos cacheados
- Necesitas latencia de lectura sub-milisegundo para keys especificas
- La tasa de miss de L1 es lo suficientemente baja para justificar la complejidad extra
- Quieres reducir la carga en el cache distribuido (Redis)

## Solucion

### Python con LRU L1 y Redis L2

```python
import redis
import json
import time
from functools import lru_cache
from collections import OrderedDict

class TwoLevelCache:
    def __init__(self, redis_client: redis.Redis, l1_max_size: int = 1000, l1_ttl: float = 60.0, l2_ttl: int = 3600):
        self.redis = redis_client
        self.l1_max_size = l1_max_size
        self.l1_ttl = l1_ttl
        self.l2_ttl = l2_ttl
        self._l1 = OrderedDict()  # key -> (value, expiry_timestamp)

    def get(self, key: str, loader: callable) -> any:
        # L1 check
        if key in self._l1:
            value, expiry = self._l1[key]
            if time.time() < expiry:
                self._l1.move_to_end(key)
                return value
            del self._l1[key]

        # L2 check
        cached = self.redis.get(key)
        if cached is not None:
            value = json.loads(cached)
            self._populate_l1(key, value)
            return value

        # Cache miss — cargar de base de datos
        value = loader()
        self._populate_l1(key, value)
        self.redis.setex(key, self.l2_ttl, json.dumps(value))
        return value

    def _populate_l1(self, key: str, value: any):
        if len(self._l1) >= self.l1_max_size:
            self._l1.popitem(last=False)  # Evict LRU
        self._l1[key] = (value, time.time() + self.l1_ttl)

    def invalidate(self, key: str):
        self._l1.pop(key, None)
        self.redis.delete(key)

    def invalidate_all(self):
        self._l1.clear()


cache = TwoLevelCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.get(
        f"user:{user_id}",
        lambda: db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    )

def update_user(user_id: str, name: str, email: str):
    db.execute("UPDATE users SET name=%s, email=%s WHERE id=%s", [name, email, user_id])
    cache.invalidate(f"user:{user_id}")
```

### TypeScript con Map L1 y Redis L2

```typescript
import { createClient } from 'redis';

class TwoLevelCache {
  private l1: Map<string, { value: any; expiry: number }> = new Map();
  private l1MaxSize: number;
  private l1TtlMs: number;
  private l2Ttl: number;
  private redis: ReturnType<typeof createClient>;

  constructor(
    redisClient: ReturnType<typeof createClient>,
    l1MaxSize = 1000,
    l1TtlMs = 60000,
    l2Ttl = 3600
  ) {
    this.redis = redisClient;
    this.l1MaxSize = l1MaxSize;
    this.l1TtlMs = l1TtlMs;
    this.l2Ttl = l2Ttl;
  }

  async get<T>(key: string, loader: () => Promise<T>): Promise<T> {
    // L1 check
    const l1Entry = this.l1.get(key);
    if (l1Entry && Date.now() < l1Entry.expiry) {
      this.l1.delete(key);
      this.l1.set(key, l1Entry);
      return l1Entry.value as T;
    }
    this.l1.delete(key);

    // L2 check
    const l2Cached = await this.redis.get(key);
    if (l2Cached !== null) {
      const value = JSON.parse(l2Cached) as T;
      this.populateL1(key, value);
      return value;
    }

    // Cache miss — cargar de base de datos
    const value = await loader();
    this.populateL1(key, value);
    await this.redis.set(key, JSON.stringify(value), { EX: this.l2Ttl });
    return value;
  }

  private populateL1(key: string, value: any): void {
    if (this.l1.size >= this.l1MaxSize) {
      const oldestKey = this.l1.keys().next().value;
      if (oldestKey) this.l1.delete(oldestKey);
    }
    this.l1.set(key, { value, expiry: Date.now() + this.l1TtlMs });
  }

  invalidate(key: string): void {
    this.l1.delete(key);
    this.redis.del(key);
  }

  invalidateAll(): void {
    this.l1.clear();
  }
}

// Uso
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();
const cache = new TwoLevelCache(redisClient);

const user = await cache.get(`user:${userId}`, () =>
  db.query('SELECT * FROM users WHERE id = $1', [userId])
);
```

### Java con Caffeine L1 y Redis L2

```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import redis.clients.jedis.Jedis;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.TimeUnit;

public class TwoLevelCacheManager {

    private final Cache<String, Object> l1;
    private final Jedis l2;
    private final ObjectMapper mapper = new ObjectMapper();
    private final int l2Ttl;

    public TwoLevelCacheManager(Jedis jedis, int l1MaxSize, int l1TtlMinutes, int l2TtlSeconds) {
        this.l2 = jedis;
        this.l2Ttl = l2TtlSeconds;
        this.l1 = Caffeine.newBuilder()
            .maximumSize(l1MaxSize)
            .expireAfterWrite(l1TtlMinutes, TimeUnit.MINUTES)
            .build();
    }

    @SuppressWarnings("unchecked")
    public <T> T getOrLoad(String key, java.util.function.Function<String, T> loader, Class<T> type) {
        // L1 check
        T l1Value = (T) l1.getIfPresent(key);
        if (l1Value != null) {
            return l1Value;
        }

        // L2 check
        String l2Cached = l2.get(key);
        if (l2Cached != null) {
            try {
                T value = mapper.readValue(l2Cached, type);
                l1.put(key, value);
                return value;
            } catch (Exception e) {
                // Deserializacion fallida, tratar como miss
            }
        }

        // Cache miss — cargar de base de datos
        T value = loader.apply(key);
        try {
            l2.setex(key, l2Ttl, mapper.writeValueAsString(value));
        } catch (Exception e) {
            // Serializacion fallida, saltar L2
        }
        l1.put(key, value);
        return value;
    }

    public void invalidate(String key) {
        l1.invalidate(key);
        l2.del(key);
    }
}
```

## Explicacion

El two-level cache explota la localidad de referencia. Las hot keys se sirven desde L1 (en memoria), que tiene tiempo de acceso sub-microsegundo. Las cold keys caen a L2 (Redis), que tiene latencia de red pero sirve a todas las instancias.

El cache L1 es por-instancia. Cada instancia mantiene su propio L1. Esto significa que L1 puede tener datos stale si otra instancia actualiza la base de datos. Para mitigar esto, L1 tiene un TTL corto (ej. 60 segundos). El cache L2 es compartido y tiene un TTL mas largo (ej. 1 hora).

En una escritura, tanto L1 como L2 se invalidan. Otras instancias siguen teniendo el valor antiguo en su L1 hasta que su TTL de L1 expira. Para consistencia mas estricta, usa Redis pub/sub para difundir eventos de invalidacion para que todas las instancias limpien su L1 inmediatamente.

## Variantes

| Enfoque | Implementacion L1 | Implementacion L2 | Consistencia |
|---------|-------------------|-------------------|--------------|
| LRU + Redis | OrderedDict / Map | Redis | Eventual (TTL L1) |
| Caffeine + Redis | Caffeine | Redis | Eventual (TTL L1) |
| Invalidacion pub/sub | Cualquiera en memoria | Redis | Fuerte (al invalidar) |
| Write-through ambos | Cualquiera en memoria | Redis | Fuerte |
| Solo L1 (sin L2) | LRU / Caffeine | Ninguno | Por-instancia, sin sharing |

## Buenas practicas

- **Mantén L1 pequeno** — L1 es por-instancia y consume memoria de aplicacion. 1000-5000 entradas es tipico. Usa eviccion LRU para limitar el tamano.
- **Establece un TTL corto para L1** — L1 debe expirar mas rapido que L2 (ej. 60s vs 1h). Esto limita el staleness cuando otras instancias actualizan datos.
- **Usa pub/sub para invalidacion de L1** — cuando una instancia invalida una key, difunde a todas las instancias para que limpien su L1. Esto reduce la ventana de staleness del TTL de L1 a casi cero.
- **Monitoriza el hit ratio de L1** — si el hit ratio de L1 es bajo, la complejidad extra no se justifica. L1 solo es valioso para hot keys accedidas muchas veces por segundo.
- **Serializa consistentemente** — L1 almacena objetos en memoria, L2 almacena JSON serializado. Asegura que el round-trip de serializacion preserve los tipos de datos.

## Errores comunes

- **L1 demasiado grande** — consumir demasiada memoria de aplicacion causa presion de GC u OOM. Limita el tamano de L1 y usa eviccion LRU.
- **TTL de L1 igual al de L2** — si ambos expiran al mismo tiempo, L1 no reduce la carga en L2. Establece el TTL de L1 mas corto (ej. 1/10 del TTL de L2).
- **Sin invalidacion de L1 entre instancias** — la instancia A actualiza datos y limpia su L1. La instancia B sigue sirviendo datos stale desde su L1. Usa pub/sub o acepta el staleness basado en TTL.
- **Cachear todo en L1** — L1 es solo para hot keys. Cachear cold keys en L1 desperdicia memoria y evicte hot keys. Usa la frecuencia de acceso para decidir que entra en L1.
- **No manejar fallos de L2** — si Redis esta caido, L1 sigue funcionando pero los misses de L2 se convierten en hits a base de datos. Implementa un circuit breaker o fallback a modo solo L1.

## Preguntas frecuentes

### Cual es la diferencia entre cache L1 y L2?

L1 es en memoria, por-instancia, y rapido (sub-microsegundo). L2 es distribuido (Redis), compartido entre instancias, y mas lento (round-trip de red). L1 sirve hot keys; L2 sirve todas las keys.

### Como mantengo L1 consistente entre instancias?

Usa Redis pub/sub para difundir eventos de invalidacion. Cuando la instancia A invalida una key, publica un mensaje. Todas las instancias se suscriben y limpian su L1. Sin pub/sub, L1 es eventualmente consistente via su TTL.

### Cuando no vale la pena un two-level cache?

Si tu aplicacion tiene una sola instancia, L2 solo es suficiente. Si los patrones de acceso son uniformes (sin hot keys), L1 no mejora el hit ratio. Si la latencia de Redis es aceptable (< 1ms), L1 anade complejidad sin beneficio significativo.

### Como dimensiono L1?

Monitoriza la frecuencia de acceso por key. El top 1% de keys tipicamente representa 50-80% de las lecturas. Dimensiona L1 para contener esas hot keys. Empieza con 1000 entradas y ajusta basado en metricas de hit ratio.
