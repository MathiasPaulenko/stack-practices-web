---



contentType: patterns
slug: cache-stampede-prevention-pattern
title: "Patron Cache Stampede Prevention"
description: "Previene thundering herd de cache misses con locks, single-flight y refresco temprano para proteger la base de datos de recargas concurrentes."
metaDescription: "Cache stampede prevention: evita thundering herd con locks y single-flight. Protege bases de datos de recargas concurrentes en Python y TypeScript."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - stampede
  - thundering-herd
  - patron
  - single-flight
  - distributed-lock
  - redis
  - python
  - typescript
relatedResources:
  - /patterns/read-through-cache-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/two-level-cache-pattern
  - /patterns/refresh-ahead-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache stampede prevention: evita thundering herd con locks y single-flight. Protege bases de datos de recargas concurrentes en Python y TypeScript."
  keywords:
    - cache stampede
    - thundering herd cache
    - single-flight cache
    - cache lock pattern
    - redis distributed lock cache
    - cache miss prevention



---

# Patron Cache Stampede Prevention

## Descripcion general

Un cache stampede (tambien llamado thundering herd o dogpile) ocurre cuando una key de cache popular expira y muchas peticiones concurrentes fallan simultaneamente. Todas las peticiones fallidas inundan la base de datos con la misma query, causando un pico de carga que puede cascadar a timeouts y caidas.

El patron stampede prevention asegura que solo una peticion recargue los datos despues de un cache miss. Otras peticiones concurrentes esperan a que la primera termine y luego leen el valor recien cacheado. Esto reduce la carga en base de datos de N queries concurrentes a 1.

## Cuando usarlo


- For alternatives, see [Cache Invalidation Pattern](/es/patterns/cache-invalidation-pattern/).

- Una key de cache con alta concurrencia de lectura expira y causa picos en base de datos
- Ves picos periodicos de latencia correlacionados con la expiracion del TTL de cache
- La carga de base de datos sube cuando entradas populares se evictan o invalidan
- Multiples instancias de aplicacion comparten un cache y todas fallan a la vez
- Quieres proteger la base de datos de carga burst durante cache misses

## Solucion

### Estrategia 1: Single-Flight con lock en memoria (instancia unica)

```python
import threading
import time
import redis
import json

class SingleFlightCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl
        self._locks = {}
        self._lock_guard = threading.Lock()

    def get_or_load(self, key: str, loader: callable) -> any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        # Single-flight: solo un hilo carga, otros esperan
        with self._lock_guard:
            if key in self._locks:
                event = self._locks[key]
            else:
                event = threading.Event()
                self._locks[key] = event
                event = None  # Este hilo cargara

        if event is not None:
            # Esperar a que el hilo cargador termine
            event.wait(timeout=30)
            # Intentar leer del cache de nuevo
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)
            # Si aun no esta cacheado, cargar nosotros (timeout o fallo del loader)
            return self._load_and_cache(key, loader)

        # Este hilo es el cargador
        try:
            return self._load_and_cache(key, loader)
        finally:
            with self._lock_guard:
                evt = self._locks.pop(key, None)
            if evt:
                evt.set()  # Notificar hilos en espera

    def _load_and_cache(self, key: str, loader: callable) -> any:
        value = loader()
        self.redis.setex(key, self.ttl, json.dumps(value))
        return value


cache = SingleFlightCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.get_or_load(
        f"user:{user_id}",
        lambda: db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    )
```

### Estrategia 2: Lock distribuido con Redis (multi-instancia)

```python
import redis
import json
import time
import uuid

class StampedeSafeCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600, lock_timeout: int = 30):
        self.redis = redis_client
        self.ttl = ttl
        self.lock_timeout = lock_timeout

    def get_or_load(self, key: str, loader: callable) -> any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        lock_key = f"lock:{key}"
        lock_value = str(uuid.uuid4())

        # Intentar adquirir lock
        acquired = self.redis.set(lock_key, lock_value, nx=True, ex=self.lock_timeout)
        if not acquired:
            # Otra instancia esta cargando — esperar y reintentar
            return self._wait_and_read(key, loader)

        try:
            # Double-check del cache despues de adquirir lock
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)

            value = loader()
            self.redis.setex(key, self.ttl, json.dumps(value))
            return value
        finally:
            # Liberar lock solo si aun lo poseemos
            self._release_lock(lock_key, lock_value)

    def _wait_and_read(self, key: str, loader: callable) -> any:
        for _ in range(10):
            time.sleep(0.5)
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)

        # Timeout esperando — cargar directamente (fallback)
        value = loader()
        self.redis.setex(key, self.ttl, json.dumps(value))
        return value

    def _release_lock(self, lock_key: str, lock_value: str):
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(script, 1, lock_key, lock_value)


cache = StampedeSafeCache(redis.Redis(host='localhost', port=6379))
```

### TypeScript con lock distribuido Redis

```typescript
import { createClient } from 'redis';
import { randomUUID } from 'crypto';

class StampedeSafeCache {
  private redis: ReturnType<typeof createClient>;
  private ttl: number;
  private lockTimeout: number;

  constructor(redisClient: ReturnType<typeof createClient>, ttl = 3600, lockTimeout = 30) {
    this.redis = redisClient;
    this.ttl = ttl;
    this.lockTimeout = lockTimeout;
  }

  async getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const lockKey = `lock:${key}`;
    const lockValue = randomUUID();

    const acquired = await this.redis.set(lockKey, lockValue, { NX: true, EX: this.lockTimeout });
    if (!acquired) {
      return this.waitAndRead(key, loader);
    }

    try {
      const doubleCheck = await this.redis.get(key);
      if (doubleCheck !== null) {
        return JSON.parse(doubleCheck) as T;
      }

      const value = await loader();
      await this.redis.set(key, JSON.stringify(value), { EX: this.ttl });
      return value;
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  private async waitAndRead<T>(key: string, loader: () => Promise<T>): Promise<T> {
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const cached = await this.redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    }
    const value = await loader();
    await this.redis.set(key, JSON.stringify(value), { EX: this.ttl });
    return value;
  }

  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, { keys: [lockKey], arguments: [lockValue] });
  }
}
```

### Estrategia 3: Refresco temprano (TTL probabilistico)

En lugar de esperar a la expiracion, refresca entradas aleatoriamente antes de que expiren. Esto distribuye las recargas en el tiempo, evitando un miss sincronizado.

```python
import random
import time

def get_or_load_probabilistic(key: str, loader: callable, ttl: int = 3600, early_refresh_window: int = 300) -> any:
    cached = r.get(key)
    if cached is not None:
        data = json.loads(cached)
        ttl_remaining = r.ttl(key)

        # Refresco temprano probabilistico: probabilidad creciente al acercarse el TTL a 0
        if ttl_remaining < early_refresh_window:
            refresh_probability = 1 - (ttl_remaining / early_refresh_window)
            if random.random() < refresh_probability:
                try:
                    value = loader()
                    r.setex(key, ttl, json.dumps(value))
                    return value
                except Exception:
                    pass  # Devolver datos stale si el refresco falla

        return data

    # Miss completo — cargar y cachear
    value = loader()
    r.setex(key, ttl, json.dumps(value))
    return value
```

## Explicacion

El problema de stampede surge porque todas las peticiones comprueban el cache al mismo tiempo, lo encuentran expirado, y recargan independientemente. Las tres estrategias lo resuelven de forma diferente:

- **Single-flight** — la primera peticion que falla adquiere un lock o flag. Las peticiones posteriores que fallan ven el lock y esperan. Cuando la primera peticion termina, puebla el cache y libera el lock. Las peticiones en espera luego leen el valor cacheado.

- **Lock distribuido** — para despliegues multi-instancia, un lock en memoria no funciona porque cada instancia tiene su propia memoria. Un lock distribuido Redis (`SET NX EX`) asegura que solo una instancia recargue. Otras instancias hacen polling del cache hasta que se puebla.

- **Refresco temprano** — en lugar de prevenir recargas concurrentes, esta estrategia las distribuye en el tiempo. A medida que el TTL se acerca a la expiracion, cada peticion tiene una probabilidad creciente de disparar un refresco. Esto evita un miss sincronizado cuando el TTL expira.

## Variantes

| Estrategia | Alcance | Complejidad | Ideal para |
|-----------|---------|-------------|------------|
| Single-flight (en memoria) | Instancia unica | Baja | Aplicaciones de proceso unico |
| Lock distribuido (Redis) | Multi-instancia | Media | Despliegues multi-instancia |
| Refresco temprano probabilistico | Cualquiera | Baja | Keys de alto trafico con TTLs largos |
| Lease con timeout | Multi-instancia | Media | Garantia estricta de unico cargador |
| Coalescing de peticiones | Instancia unica | Baja | Workloads orientados a lotes |

## Buenas practicas

- **Establece un timeout de lock** — si el loader se cuelga o cae, el lock debe expirar para que otras peticiones puedan proceder. Establecelo al maximo tiempo de espera aceptable (ej. 30 segundos).
- **Double-check despues de adquirir lock** — entre el cache miss y la adquisicion del lock, otra peticion puede haber poblado el cache. Comprueba de nuevo antes de cargar.
- **Usa refresco probabilistico para keys de alto trafico** — es mas simple que locks y distribuye la carga naturalmente. La ventana de refresco temprano debe ser 5-10% del TTL.
- **Falla a datos stale** — si el loader falla, devuelve el ultimo valor cacheado (incluso expirado) en lugar de fallar la peticion. Esto degrada gracefulmente.
- **Monitoriza la contencion de locks** — si muchas peticiones esperan por locks, el TTL de cache puede ser demasiado corto o el loader demasiado lento.

## Errores comunes

- **Sin timeout de lock** — si el loader cae, el lock se mantiene para siempre. Todas las peticiones subsiguientes esperan indefinidamente. Siempre establece un timeout.
- **No double-check despues del lock** — sin double-check, puedes recargar datos que otra peticion ya cacheo. Esto desperdicia recursos pero no causa problemas de correccion.
- **Usar locks en memoria en multi-instancia** — un lock en memoria solo funciona dentro de un proceso. En despliegues multi-instancia, usa un lock distribuido (Redis).
- **Lockear todo el cache** — lockea por key, no globalmente. Un lock global serializa todos los cache misses, creando un cuello de botella.
- **No manejar el fallo de adquisicion de lock** — si `SET NX` falla, la peticion debe esperar y reintentar, no proceder a cargar independientemente. Esto derrocha el proposito del lock.

## Preguntas frecuentes

### Cual es la diferencia entre cache stampede y cache penetration?

Cache stampede ocurre cuando una key valida expira y muchas peticiones fallan simultaneamente. Cache penetration ocurre cuando las peticiones consultan keys que no existen en cache ni en base de datos, causando que cada peticion hitting la base de datos. Problemas diferentes, soluciones diferentes.

### Es single-flight suficiente para despliegues multi-instancia?

No. Single-flight usa locks en memoria que son por-proceso. En un despliegue multi-instancia, cada instancia tiene sus propios locks. Usa un lock distribuido (Redis `SET NX`) para coordinar entre instancias.

### Como funciona el refresco temprano probabilistico?

A medida que el TTL se acerca a cero, cada peticion tiene una probabilidad creciente de disparar un refresco. Por ejemplo, con un TTL de 1 hora y una ventana de refresco de 5 minutos, una peticion a 4 minutos antes de la expiracion tiene un 20% de probabilidad de refrescar. Esto distribuye las recargas en el tiempo, previniendo un miss sincronizado.

### Debo devolver datos stale mientras refresco?

Si. Si el cache tiene un valor (incluso expirado), devuelvelo mientras una peticion refresca en segundo plano. Esto se llama stale-while-revalidate. Mantiene la aplicacion responsiva mientras el cache se actualiza.
