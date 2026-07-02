---
contentType: recipes
slug: multi-level-cache-l1-l2
title: "Cache multi-nivel con L1 en memoria y L2 en Redis"
description: "Implementa una cache de dos niveles combinando L1 en memoria y L2 en Redis para lecturas de baja latencia con consistencia entre instancias"
metaDescription: "Construye una cache multi-nivel con L1 en memoria y L2 en Redis. Lecturas sub-milisegundo desde L1, consistencia entre instancias desde L2 y pub/sub."
difficulty: advanced
topics:
  - caching
  - performance
tags:
  - caching
  - multi-level cache
  - redis
  - in-memory cache
  - performance
relatedResources:
  - /recipes/caching/nodejs-in-memory-cache-lru
  - /recipes/caching/redis-cache-aside-pattern
  - /recipes/caching/redis-pubsub-messaging
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye una cache multi-nivel con L1 en memoria y L2 en Redis. Lecturas sub-milisegundo desde L1, consistencia entre instancias desde L2 y pub/sub."
  keywords:
    - multi-level cache
    - l1 l2 cache
    - in-memory redis cache
    - two-level cache
    - cache invalidation
---

# Cache multi-nivel con L1 en memoria y L2 en Redis

Una sola capa de cache raramente es optima. Las caches en memoria ofrecen lecturas sub-milisegundo pero son por instancia. Redis ofrece consistencia entre instancias pero anade latencia de red. Una cache de dos niveles combina ambas: L1 (en memoria) para datos calientes con cero overhead de red, y L2 (Redis) para estado compartido entre instancias. Esta receta implementa una cache L1+L2 con invalidacion basada en pub/sub.

## Cuando Usar Esto

- APIs de alto trafico donde la latencia de round-trip a Redis es un cuello de botella
- Multiples instancias de servidor que necesitan compartir datos cacheados
- Workloads de lectura intensiva donde los mismos datos se acceden repetidamente dentro de una sola instancia

## Requisitos Previos

- Node.js 18+
- Paquete `redis` (`npm install redis`)
- Paquete `lru-cache` (`npm install lru-cache`)

## Solucion

### 1. Instalar dependencias

```bash
npm install redis lru-cache
```

### 2. Implementar la cache multi-nivel

```typescript
// multi-level-cache.ts
import { LRUCache } from 'lru-cache';
import { createClient, RedisClientType } from 'redis';
import { EventEmitter } from 'events';

export class MultiLevelCache {
  private l1: LRUCache<string, any>;
  private l2: RedisClientType;
  private pubsub: RedisClientType;
  private invalidationChannel: string;
  private ready: boolean = false;

  constructor(
    redisUrl: string = 'redis://localhost:6379',
    options: {
      l1MaxSize?: number;
      l1Ttl?: number;
      l2Ttl?: number;
      invalidationChannel?: string;
    } = {},
  ) {
    this.l1 = new LRUCache<string, any>({
      max: options.l1MaxSize ?? 1000,
      ttl: options.l1Ttl ?? 60_000,
      updateAgeOnGet: true,
    });

    this.l2 = createClient({ url: redisUrl });
    this.pubsub = createClient({ url: redisUrl });
    this.invalidationChannel = options.invalidationChannel ?? 'cache:invalidate';
  }

  async connect(): Promise<void> {
    await this.l2.connect();
    await this.pubsub.connect();
    await this.pubsub.subscribe(this.invalidationChannel, (message) => {
      const { key } = JSON.parse(message);
      this.l1.delete(key);
    });
    this.ready = true;
  }

  async disconnect(): Promise<void> {
    await this.pubsub.unsubscribe(this.invalidationChannel);
    await this.pubsub.quit();
    await this.l2.quit();
    this.l1.clear();
    this.ready = false;
  }

  async get<T>(key: string): Promise<T | undefined> {
    // L1 — en memoria
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) {
      return l1Value as T;
    }

    // L2 — Redis
    const l2Value = await this.l2.get(key);
    if (l2Value !== null) {
      const parsed = JSON.parse(l2Value) as T;
      this.l1.set(key, parsed);
      return parsed;
    }

    return undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    // Escribir en ambos niveles
    this.l1.set(key, value, { ttl: ttl ?? 60_000 });
    await this.l2.set(key, serialized, { EX: Math.floor((ttl ?? 300_000) / 1000) });
  }

  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await loader();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.del(key);
    // Notificar a otras instancias para invalidar su L1
    await this.l2.publish(
      this.invalidationChannel,
      JSON.stringify({ key }),
    );
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Limpiar entradas L1 que coincidan con el patron
    for (const key of this.l1.keys()) {
      if (this._matchPattern(key, pattern)) {
        this.l1.delete(key);
      }
    }

    // Limpiar entradas L2 que coincidan con el patron
    const keys = [];
    for await (const key of this.l2.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (keys.length > 0) {
      await this.l2.del(keys);
    }

    // Notificar a otras instancias
    await this.l2.publish(
      this.invalidationChannel,
      JSON.stringify({ pattern }),
    );
  }

  private _matchPattern(key: string, pattern: string): boolean {
    const regex = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`).test(key);
  }

  get stats() {
    return {
      l1Size: this.l1.size,
      l1MaxSize: this.l1.max,
      ready: this.ready,
    };
  }
}
```

### 3. Usar la cache

```typescript
// usage.ts
import { MultiLevelCache } from './multi-level-cache';

const cache = new MultiLevelCache('redis://localhost:6379', {
  l1MaxSize: 500,
  l1Ttl: 30_000,   // 30 segundos en L1
  l2Ttl: 300_000,  // 5 minutos en L2
});

await cache.connect();

// Obtener o cargar desde la base de datos
const user = await cache.getOrLoad(
  `user:123`,
  () => db.users.findById(123),
  120_000, // TTL de 2 minutos
);

// Invalidar despues de actualizar
async function updateUser(id: string, data: dict) {
  const user = await db.users.update(id, data);
  await cache.invalidate(`user:${id}`);
  return user;
}
```

### 4. Monitoreo de hit rate

```typescript
export class InstrumentedMultiLevelCache extends MultiLevelCache {
  private hits = { l1: 0, l2: 0, miss: 0 };

  async get<T>(key: string): Promise<T | undefined> {
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) {
      this.hits.l1++;
      return l1Value as T;
    }

    const l2Value = await this.l2.get(key);
    if (l2Value !== null) {
      this.hits.l2++;
      const parsed = JSON.parse(l2Value) as T;
      this.l1.set(key, parsed);
      return parsed;
    }

    this.hits.miss++;
    return undefined;
  }

  getHitRates() {
    const total = this.hits.l1 + this.hits.l2 + this.hits.miss;
    if (total === 0) return { l1: 0, l2: 0, miss: 0, total: 0 };
    return {
      l1: (this.hits.l1 / total * 100).toFixed(1) + '%',
      l2: (this.hits.l2 / total * 100).toFixed(1) + '%',
      miss: (this.hits.miss / total * 100).toFixed(1) + '%',
      total,
    };
  }

  resetStats() {
    this.hits = { l1: 0, l2: 0, miss: 0 };
  }
}
```

## Como Funciona

1. **Lectura L1** — verifica primero la cache LRU en memoria. Si encuentra el valor, retorna inmediatamente con cero overhead de red (sub-milisegundo).
2. **Lectura L2** — en L1 miss, verifica Redis. Si encuentra el valor, popula L1 y retorna. Esto anade ~1ms de latencia de red pero acierta la cache compartida.
3. **Cache miss** — si tanto L1 como L2 fallan, la funcion `loader` obtiene desde la base de datos. El resultado se escribe en ambos niveles.
4. **Invalidacion** — `invalidate` elimina de L1, L2 y publica un mensaje pub/sub. Otras instancias se suscriben y eliminan su entrada L1, asegurando consistencia entre instancias.
5. **TTLs diferentes** — L1 tiene un TTL mas corto (30s) que L2 (300s). Esto permite que L1 se refresque desde L2 periodicamente, capturando actualizaciones de otras instancias incluso sin pub/sub.

## Variantes

### Cache write-through

Escribir en ambos niveles de cache y la base de datos en una operacion:

```typescript
async setWithPersistence<T>(
  key: string,
  value: T,
  persist: (value: T) => Promise<void>,
  ttl?: number,
): Promise<void> {
  await persist(value);          // Base de datos primero
  await this.set(key, value, ttl); // Luego ambos niveles de cache
}
```

### Read-through con refresco en background

Refrescar L2 en background cuando L1 esta cerca de expirar:

```typescript
async getOrRefresh<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: number,
): Promise<T> {
  const l1Value = this.l1.get(key);
  if (l1Value !== undefined) {
    // Verificar si la entrada L1 esta cerca de expirar
    const remaining = this.l1.getRemainingTTL(key);
    if (remaining < ttl * 0.1) {
      // Refrescar en background
      setImmediate(async () => {
        const fresh = await loader();
        await this.set(key, fresh, ttl);
      });
    }
    return l1Value as T;
  }
  return this.getOrLoad(key, loader, ttl);
}
```

### Implementacion en Python

```python
import json
import threading
from functools import lru_cache
from redis import Redis

class MultiLevelCache:
    def __init__(self, redis_client: Redis, l1_maxsize: int = 1000):
        self.l2 = redis_client
        self.pubsub = redis_client.pubsub()
        self._l1: dict[str, any] = {}
        self._l1_maxsize = l1_maxsize
        self._lock = threading.Lock()

    def get(self, key: str) -> any | None:
        with self._lock:
            if key in self._l1:
                return self._l1[key]

        l2_value = self.l2.get(key)
        if l2_value:
            value = json.loads(l2_value)
            with self._lock:
                self._l1[key] = value
                if len(self._l1) > self._l1_maxsize:
                    oldest = next(iter(self._l1))
                    del self._l1[oldest]
            return value

        return None

    def set(self, key: str, value: any, ttl: int = 300) -> None:
        with self._lock:
            self._l1[key] = value
        self.l2.setex(key, ttl, json.dumps(value, default=str))

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._l1.pop(key, None)
        self.l2.delete(key)
        self.l2.publish("cache:invalidate", json.dumps({"key": key}))
```

## Mejores Practicas

- **Establece el TTL de L1 mas corto que L2** — L1 se refresca desde L2, capturando actualizaciones de otras instancias
- **Usa pub/sub para invalidacion L1** — sin esto, cada instancia sirve datos L1 obsoletos hasta que su TTL expira
- **Monitorea hit rates por nivel** — un hit rate alto en L1 significa que el tamanio de L1 esta bien afinado; un hit rate alto en L2 significa que L1 es demasiado pequeno
- **Maneja fallos de Redis elegantemente** — L1 debe seguir sirviendo datos cacheados incluso si L2 es inalcanzable

## Errores Comunes

- **Establecer el mismo TTL para L1 y L2** — L1 nunca se refresca desde L2, por lo que las actualizaciones de otras instancias son invisibles hasta la expiracion completa
- **No suscribirse a invalidacion** — el L1 de cada instancia deriva independientemente, sirviendo datos obsoletos
- **Hacer L1 demasiado grande** — consume memoria del proceso; usa un tamanio maximo razonable (500-5000 entradas)
- **Invalidar L1 pero no L2** — el siguiente L1 miss se re-pobla desde datos L2 obsoletos

## FAQ

**Q: Que tamanio de L1 debo usar?**
A: Empieza con 1000 entradas. Monitorea el hit rate de L1 — si esta por debajo del 80%, aumenta el tamanio. Si el uso de memoria es demasiado alto, reducelo.

**Q: Que pasa si Redis cae?**
A: L1 sigue sirviendo datos cacheados. Los nuevos cache misses bypassan L2 y llaman al loader directamente. Cuando Redis se recupera, L2 empieza a poblarse de nuevo.

**Q: Debo usar LRU o LFU para L1?**
A: LRU es mas simple y funciona bien para la mayoria de workloads. LFU (Least Frequently Used) es mejor cuando algunas claves se acceden mucho mas frecuentemente que otras.

**Q: Como pruebo la invalidacion entre instancias?**
A: Inicia dos instancias, ambas conectadas al mismo Redis. Setea una clave en la instancia A, invalidala, y verifica que el L1 de la instancia B ya no tiene la clave.
