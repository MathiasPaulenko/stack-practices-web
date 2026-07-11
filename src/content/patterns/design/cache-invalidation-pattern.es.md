---
contentType: patterns
slug: cache-invalidation-pattern
title: "Patron Cache Invalidation"
description: "Estrategias para mantener frescos los datos cacheados: expiracion TTL, invalidacion explicita, write-through y eviccion basada en eventos."
metaDescription: "Patron cache invalidation: mantén datos cacheados frescos con TTL, eviccion explicita, invalidacion por eventos. Implementa con Redis pub/sub y Python."
difficulty: intermediate
topics:
  - caching
  - design
tags:
  - caching
  - invalidation
  - patron
  - redis
  - ttl
  - eviction
  - pub-sub
  - python
  - typescript
relatedResources:
  - /patterns/design/cache-aside-pattern
  - /patterns/design/write-through-cache-pattern
  - /patterns/design/read-through-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron cache invalidation: mantén datos cacheados frescos con TTL, eviccion explicita, invalidacion por eventos. Implementa con Redis pub/sub y Python."
  keywords:
    - cache invalidation
    - cache eviction strategies
    - ttl cache
    - redis pub/sub invalidation
    - event-driven cache
    - cache consistency
---

# Patron Cache Invalidation

## Descripcion general

La invalidacion de cache elimina o actualiza entradas stale para que las lecturas subsiguientes obtengan datos frescos. Sin invalidacion, el cache sirve datos desactualizados indefinidamente. El reto es saber cuando cambian los datos y actuar rapidamente sin anadir overhead excesivo.

Hay cuatro estrategias principales de invalidacion: expiracion basada en TTL, invalidacion explicita en escritura, invalidacion basada en eventos via pub/sub, y keys versionadas. Cada una tiene diferentes garantias de consistencia y niveles de complejidad.

## Cuando usarlo

- Datos cacheados cambian en la base de datos y lecturas stale causan problemas de correccion
- Necesitas invalidar keys especificas, no todo el cache
- Multiples instancias de aplicacion deben sincronizarse cuando una modifica datos
- El TTL solo es insuficiente porque la ventana de staleness es demasiado larga
- Quieres minimizar cache misses manteniendo los datos frescos

## Solucion

### Estrategia 1: Expiracion basada en TTL

El enfoque mas simple. Establece un TTL en cada entrada de cache. El cache evicta automaticamente las entradas expiradas. La siguiente lectura falla y recarga datos frescos.

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379)

def get_user(user_id: str) -> dict:
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    user = db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    r.setex(key, 300, json.dumps(user))  # TTL de 5 minutos
    return user
```

### Estrategia 2: Invalidacion explicita en escritura

Despues de actualizar la base de datos, borra la key de cache correspondiente. La siguiente lectura falla y recarga.

```python
def update_user(user_id: str, name: str, email: str):
    db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s",
        [name, email, user_id]
    )
    # Invalidar la entrada de cache
    r.delete(f"user:{user_id}")
    # Tambien invalidar caches derivados
    r.delete(f"user:{user_id}:profile")
    r.delete(f"users:list")
```

### Estrategia 3: Invalidacion por eventos con Redis Pub/Sub

Cuando una instancia actualiza datos, publica un evento de invalidacion. Todas las instancias se suscriben y limpian sus caches locales.

```python
import redis
import json
import threading

class CacheInvalidator:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()
        self.pubsub.subscribe("cache:invalidate")
        self._listener = threading.Thread(target=self._listen, daemon=True)
        self._listener.start()

    def invalidate(self, key: str):
        self.redis.delete(key)
        self.redis.publish("cache:invalidate", json.dumps({"key": key}))

    def invalidate_pattern(self, pattern: str):
        for key in self.redis.scan_iter(pattern):
            self.redis.delete(key)
        self.redis.publish("cache:invalidate", json.dumps({"pattern": pattern}))

    def _listen(self):
        for message in self.pubsub.listen():
            if message["type"] != "message":
                continue
            data = json.loads(message["data"])
            if "key" in data:
                self.redis.delete(data["key"])
            elif "pattern" in data:
                for key in self.redis.scan_iter(data["pattern"]):
                    self.redis.delete(key)


invalidator = CacheInvalidator(redis.Redis(host='localhost', port=6379))

def update_user(user_id: str, name: str, email: str):
    db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s",
        [name, email, user_id]
    )
    invalidator.invalidate(f"user:{user_id}")
```

### TypeScript con Redis Pub/Sub

```typescript
import { createClient } from 'redis';

class CacheInvalidator {
  private publisher: ReturnType<typeof createClient>;
  private subscriber: ReturnType<typeof createClient>;

  constructor(publisher: ReturnType<typeof createClient>, subscriber: ReturnType<typeof createClient>) {
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.subscriber.subscribe('cache:invalidate', (message) => {
      const data = JSON.parse(message);
      if (data.key) {
        this.publisher.del(data.key);
      } else if (data.pattern) {
        this.publisher.keys(data.pattern).then((keys) => {
          if (keys.length > 0) this.publisher.del(keys);
        });
      }
    });
  }

  async invalidate(key: string): Promise<void> {
    await this.publisher.del(key);
    await this.publisher.publish('cache:invalidate', JSON.stringify({ key }));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.publisher.keys(pattern);
    if (keys.length > 0) await this.publisher.del(keys);
    await this.publisher.publish('cache:invalidate', JSON.stringify({ pattern }));
  }
}
```

### Estrategia 4: Keys versionadas

En lugar de invalidar, cambia el nombre de la key. La key antigua expira naturalmente via TTL. Esto evita race conditions entre invalidacion y lecturas concurrentes.

```python
def get_user_version(user_id: str) -> str:
    version = r.get(f"user:{user_id}:version")
    if version is None:
        version = "1"
        r.set(f"user:{user_id}:version", version)
    return version

def get_user(user_id: str) -> dict:
    version = get_user_version(user_id)
    key = f"user:{user_id}:v{version}"

    cached = r.get(key)
    if cached:
        return json.loads(cached)

    user = db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    r.setex(key, 300, json.dumps(user))
    return user

def update_user(user_id: str, name: str, email: str):
    db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s",
        [name, email, user_id]
    )
    # Incrementar version — la key antigua queda huerfana y expira via TTL
    r.incr(f"user:{user_id}:version")
```

## Explicacion

Cada estrategia intercambia complejidad por consistencia:

- **TTL** — la entrada de cache expira despues de una duracion fija. Simple, pero los datos pueden estar stale hasta la duracion del TTL. Bueno para datos que cambian infrecuentemente o donde el staleness es aceptable.

- **Invalidacion explicita** — el camino de escritura borra la key de cache despues de actualizar la base de datos. La ventana de staleness es casi cero. El riesgo es olvidar invalidar una key despues de una escritura, dejando datos stale hasta que el TTL expira.

- **Basada en eventos** — cuando multiples instancias comparten un cache, la invalidacion de una instancia debe propagarse a las demas. Redis pub/sub difunde el evento de invalidacion. Todos los suscriptores borran la key. Esto asegura consistencia en todo el cluster.

- **Keys versionadas** — en lugar de borrar una key, el camino de escritura incrementa un contador de version. La siguiente lectura usa una key nueva (con la nueva version). La key antigua queda huerfana y expira via TTL. Esto evita race conditions donde una lectura carga datos stale entre la escritura a DB y el borrado de cache.

## Variantes

| Estrategia | Consistencia | Complejidad | Ideal para |
|-----------|--------------|-------------|------------|
| Expiracion TTL | Eventual (dentro de TTL) | Baja | Datos que cambian infrecuentemente |
| Invalidacion explicita | Fuerte (en siguiente lectura) | Media | La mayoria de casos |
| Basada en eventos (pub/sub) | Fuerte (cluster-wide) | Alta | Despliegues multi-instancia |
| Keys versionadas | Fuerte (sin race) | Media | Lecturas de alta concurrencia |
| Invalidacion por tags | Fuerte (agrupada) | Alta | Entradas de cache relacionadas |

## Buenas practicas

- **Siempre establece un TTL como red de seguridad** — incluso con invalidacion explicita, un TTL captura invalidaciones perdidas. Establecelo a la duracion maxima de staleness aceptable.
- **Invalida caches derivados** — si cacheas `user:123` y tambien `user:123:profile`, invalida ambos. Trackea dependencias o usa invalidacion por tags.
- **Invalida despues de la escritura a base de datos** — borra la key de cache despues de que la actualizacion a DB tenga exito. Si borras antes y la escritura a DB falla, la siguiente lectura recarga datos stale.
- **Usa pub/sub para multi-instancia** — si multiples instancias comparten un cache Redis, pub/sub asegura que todas invaliden consistentemente.
- **Monitoriza la tasa de invalidacion** — si invalidas mas de lo que cacheas, el cache no es efectivo. Considera TTLs mas largos o write-through.

## Errores comunes

- **Olvidar invalidar** — el bug de cache mas comun. Cada camino de escritura debe invalidar las keys de cache correspondientes. Usa un wrapper u ORM hook para automatizar esto.
- **Invalidar antes de la escritura a DB** — si la escritura a DB falla, el cache se borro para nada. La siguiente lectura recarga los datos antiguos. Siempre invalida despues de que la escritura tenga exito.
- **No invalidar caches de lista** — actualizar un usuario invalida `user:123`, pero `users:list` sigue conteniendo el usuario antiguo. Invalida tambien caches de lista y agregados.
- **Confiar solo en TTL** — un TTL de 5 minutos significa que los datos pueden estar stale por 5 minutos. Si los datos cambian, los usuarios ven datos antiguos hasta que el TTL expira. Anade invalidacion explicita para datos sensibles al tiempo.
- **Race condition en invalidacion** — hilo A lee de DB, hilo B escribe a DB y borra key de cache, hilo A escribe datos stale al cache. Usa keys versionadas o locks para prevenir esto.

## Preguntas frecuentes

### Cual es la mejor estrategia de invalidacion de cache?

No hay una sola mejor estrategia. Usa TTL como red de seguridad base. Anade invalidacion explicita para datos que cambian y necesitan estar frescos inmediatamente. Usa invalidacion por eventos para despliegues multi-instancia. Usa keys versionadas para escenarios de alta concurrencia donde las race conditions son una preocupacion.

### Cual es el problema de cache stampede?

Cuando una key de cache popular expira, muchas peticiones concurrentes fallan simultaneamente e inundan la base de datos. Esto no es un problema de invalidacion sino de expiracion de TTL. Usa el patron cache-stampede-prevention (locks, single-flight) para resolverlo.

### Como funciona la invalidacion por tags?

Cada entrada de cache se asocia con tags (ej. `user:123` tiene tags `["user", "user:123"]`). Cuando un usuario se actualiza, invalidas todas las entradas con el tag `user:123`. Esto maneja caches derivados automaticamente. Redis no soporta tags nativamente, pero librerias como `redis-tag-cache` anaden esta capa.

### Debo invalidar o actualizar el cache en escritura?

Invalidar (borrar) es mas simple y seguro. La siguiente lectura recarga datos frescos. Actualizar el cache en escritura (write-through) es mas rapido para la siguiente lectura pero arriesga escribir datos stale si la escritura a DB y la actualizacion de cache no son atomicas. Prefiere invalidacion a menos que write-through sea explicitamente necesario.


## Temas Avanzados

### Escenario: Cache Invalidation para E-commerce

```typescript
// Estrategias de invalidacion de cache
class CacheManager {
  constructor(private redis: RedisClient) {}

  // 1. Invalidacion explicita: al actualizar un producto
  async invalidateProduct(productId: string): Promise<void> {
    await this.redis.del(`product:${productId}`);
    // Invalidar listas que contienen el producto
    await this.redis.del(`products:category:*`);
    await this.redis.del(`products:featured`);
    await this.redis.del(`search:product:*`);
  }

  // 2. Invalidacion por tag: agrupar keys por tag
  async invalidateByTag(tag: string): Promise<void> {
    // Redis: obtener todas las keys con el tag
    const keys = await this.redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      await this.redis.del(`tag:${tag}`);
    }
  }

  // 3. Invalidacion con version: bump de version
  async bumpVersion(namespace: string): Promise<void> {
    await this.redis.incr(`version:${namespace}`);
  }

  async getWithVersion<T>(namespace: string, key: string): Promise<T | null> {
    const version = await this.redis.get(`version:${namespace}`) || "1";
    const fullKey = `${namespace}:${version}:${key}`;
    const cached = await this.redis.get(fullKey);
    return cached ? JSON.parse(cached) : null;
  }

  // 4. Write-through: actualizar cache al escribir DB
  async updateProduct(product: Product): Promise<void> {
    await db.update(product);
    await this.redis.setex(`product:${product.id}`, 300, JSON.stringify(product));
    await this.invalidateByTag(`category:${product.categoryId}`);
  }
}

// Comparacion de estrategias
  | Estrategia | Latencia | Consistencia | Complejidad |
  |-------------|----------|---------------|-------------|
  | Explicita | Baja | Alta | Media |
  | Por tag | Media | Alta | Media |
  | Version | Baja | Alta | Baja |
  | TTL-only | Alta | Baja (stale) | Minima |
  | Write-through | Baja | Maxima | Alta |
  | Event-driven | Media | Alta | Alta |
```

Lecciones:
  - Invalidacion explicita: borrar key al actualizar
  - Invalidacion por tag: agrupar keys relacionadas y borrar en lote
  - Version-based: bump de version, las keys viejas expiran por TTL
  - Write-through: escribir cache al actualizar DB (maxima consistencia)
  - TTL como safety net: si la invalidacion falla, el TTL limpia
  - El problema mas dificil en caching: cuando invalidar
```

### Como manejo invalidacion en microservicios?

Usa event-driven invalidation: cuando un servicio actualiza un producto, publica un evento ProductUpdated. Los servicios que cachean escuchan el evento e invalidan su cache local. Para cache distribuido (Redis), usa pub/sub: el servicio que actualiza publica en un canal, los demas suscriben e invalidan. Para consistencia eventual, TTL corto (60s) + eventos. Para consistencia fuerte, write-through + invalidacion sincrona. Evita invalidacion en cascada: puede causar thundering herd.
