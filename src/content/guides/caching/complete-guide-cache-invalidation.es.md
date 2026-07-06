---
contentType: guides
slug: complete-guide-cache-invalidation
title: "Guía Completa de Invalidation de Cache"
description: "Dominar estrategias de invalidation de cache: TTL, event-driven, versioned keys, tag-based purging y write-through. Cubre invalidation multi-tier, race conditions y patrones de consistencia."
metaDescription: "Dominar invalidation de cache: TTL, event-driven, versioned keys, tag-based purging, write-through. Cubre multi-tier, race conditions y consistencia."
difficulty: advanced
topics:
  - caching
  - performance
  - architecture
tags:
  - caching
  - invalidation
  - guia
  - ttl
  - event-driven
  - versioned-keys
  - tag-based
  - consistency
relatedResources:
  - /guides/caching/complete-guide-redis-caching-strategies
  - /guides/caching/complete-guide-application-level-caching
  - /guides/caching/complete-guide-cdn-caching-strategy
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Dominar invalidation de cache: TTL, event-driven, versioned keys, tag-based purging, write-through. Cubre multi-tier, race conditions y consistencia."
  keywords:
    - cache invalidation
    - ttl expiration
    - event-driven invalidation
    - versioned cache keys
    - tag-based purging
    - cache consistency
    - multi-tier invalidation
---

## Introducción

La invalidation de cache es el problema mas dificil en caching. Phil Karlton dijo famosamente: "There are only two hard things in Computer Science: cache invalidation and naming things." Hacer invalidation mal significa servir datos stale a los usuarios, perder updates, o causar thundering herds. Lo siguiente recorre cada estrategia mayor de invalidation, desde simple TTL expiration hasta complejo event-driven tag-based purging, con ejemplos de codigo y tradeoffs para cada una.

## Por Qué la Invalidation de Cache Es Difícil

```text
Write Flow:     App → Base de datos → ??? → Cache
                              ↑
                    Cuándo invalidamos?
                    Cómo manejamos fallos?
                    Qué sobre reads concurrentes?
```

La tension fundamental: quieres servir datos desde cache (rapido) pero necesitas que los datos esten frescos (correcto). Cada estrategia de invalidation es un punto diferente en el espectro entre freshness y rendimiento.

## Resumen de Estrategias de Invalidation

| Estrategia | Freshness | Complejidad | Carga Origin | Mejor Para |
|------------|-----------|------------|-------------|------------|
| TTL expiration | Eventual | Baja | Media | Datos que toleran staleness |
| Event-driven | Fuerte | Media | Baja | Datos que deben estar frescos despues de writes |
| Versioned keys | Fuerte | Media | Baja | Datos inmutables, cache busting |
| Tag-based | Fuerte | Alta | Baja | Grafos de dependencias complejos |
| Write-through | Fuerte | Media | Baja | Mucha escritura con necesidad de consistencia |
| Purge-all | N/A | Baja | Alta | Invalidation de emergencia |

## Expiración Basada en TTL

Setea un time-to-live en cada entrada de cache. Despues de que el TTL expira, la siguiente lectura fetchea datos frescos del origin. Esta es la estrategia de invalidation mas simple.

### TTL Básico

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, db=0)

def get_user(user_id: int) -> dict | None:
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    user = db.users.find_by_id(user_id)
    if user:
        r.setex(cache_key, 3600, json.dumps(user))  # TTL: 1 hora
    return user
```

### TTL con Jitter

Cuando muchas keys expiran al mismo tiempo, ocurre un cache stampede. Anade jitter aleatorio para esparcir expiraciones.

```python
import random

def set_with_jitter(key: str, value: str, base_ttl: int = 3600, jitter_pct: int = 20):
    jitter = int(base_ttl * jitter_pct / 100)
    actual_ttl = base_ttl + random.randint(0, jitter)
    r.setex(key, actual_ttl, value)
```

### Elegir Valores de TTL

```python
TTL_CONFIG = {
    "user_profile": 300,        # 5 minutos — usuarios toleran ligero staleness
    "product_catalog": 3600,    # 1 hora — cambia infrecuentemente
    "app_config": 86400,        # 24 horas — raramente cambia
    "search_results": 60,       # 1 minuto — cambia frecuentemente
    "real_time_stats": 0,       # Sin cache — debe ser tiempo real
}

def get_with_ttl(key: str, loader: callable, data_type: str) -> object:
    ttl = TTL_CONFIG.get(data_type, 300)
    if ttl == 0:
        return loader()
    
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    value = loader()
    if value:
        set_with_jitter(key, json.dumps(value), base_ttl=ttl)
    return value
```

### Ventajas

- Simple de implementar
- No se necesita coordinacion entre write y cache
- Self-healing: los datos stale expiran automaticamente

### Desventajas

- Sirve datos stale entre write y expiracion de TTL
- Spikes de carga de origin cuando muchos TTLs expiran simultaneamente
- No puede garantizar freshness

## Invalidation Event-Driven

Cuando los datos cambian en la base de datos, invalida explicitamente la entrada de cache correspondiente. Esto proporciona garantias fuertes de freshness.

### Patrón Write-Then-Delete

```python
def update_user(user_id: int, data: dict) -> dict:
    # 1. Escribir a base de datos
    user = db.users.update(user_id, data)
    
    # 2. Invalidar cache
    r.delete(f"user:{user_id}")
    
    return user
```

### Pub/Sub para Invalidation Multi-Instancia

Cuando ejecutas multiples instancias de aplicacion, cada una tiene su propio cache en memoria. Usa Redis pub/sub para notificar a todas las instancias que invaliden sus caches locales.

```python
import threading

# Publisher: llamado cuando los datos cambian
def invalidate_cache(key: str):
    r.delete(key)  # Invalidar cache Redis
    r.publish("cache-invalidation", key)  # Notificar a todas las instancias

# Subscriber: corre en cada instancia
def invalidation_subscriber():
    pubsub = r.pubsub()
    pubsub.subscribe("cache-invalidation")
    
    for message in pubsub.listen():
        if message["type"] == "message":
            key = message["data"].decode()
            local_cache.delete(key)  # Invalidar cache local en memoria

threading.Thread(target=invalidation_subscriber, daemon=True).start()
```

### Triggers de Base de Datos para Invalidation

Usa triggers de base de datos o change data capture (CDC) para invalidar cache cuando los datos cambian, incluso si el cambio no pasa por tu aplicacion.

```python
# Usando PostgreSQL LISTEN/NOTIFY
def setup_db_invalidation():
    conn = db.get_raw_connection()
    conn.execute("""
        CREATE OR REPLACE FUNCTION notify_cache_invalidation()
        RETURNS TRIGGER AS $$
        BEGIN
            PERFORM pg_notify('cache_invalidation', 
                json_build_object('table', TG_TABLE_NAME, 'id', NEW.id)::text);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER user_cache_invalidation
        AFTER UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();
    """)
```

### Ventajas

- Freshness fuerte: el cache se invalida inmediatamente despues del write
- Baja carga de origin: no hay revalidaciones innecesarias
- Preciso: solo las entradas afectadas se invalidan

### Desventajas

- Requiere coordinacion entre write path y cache
- Si la invalidation falla, los datos stale persisten hasta que el TTL expira
- Mas complejo de implementar y debuggear

## Versioned Cache Keys

Incluye un numero de version en la cache key. Cuando los datos cambian, incrementa la version. Las entradas de cache viejas expiran naturalmente via TTL.

### Patrón Versioned Keys

```python
def get_user(user_id: int) -> dict | None:
    version = r.get(f"user_version:{user_id}") or "1"
    cache_key = f"user:{user_id}:v{version}"
    
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    user = db.users.find_by_id(user_id)
    if user:
        r.setex(cache_key, 3600, json.dumps(user))
    return user

def update_user(user_id: int, data: dict) -> dict:
    user = db.users.update(user_id, data)
    # Incrementar version — las entradas de cache viejas se vuelven inalcanzables
    r.incr(f"user_version:{user_id}")
    return user
```

### Cache Busting con Versioned Keys

Este patron es similar al cache busting para assets estaticos: `style.v123.css` en lugar de `style.css`. Cuando la version cambia, la URL cambia, y el CDN fetchea la nueva version.

### Ventajas

- No se necesita invalidation explicita: las entradas viejas son inalcanzables
- Sin race conditions: los readers siempre obtienen la ultima version
- Funciona bien con caching CDN

### Desventajas

- Las entradas viejas consumen memoria hasta que el TTL expira
- Requiere trackear numeros de version
- Estructura de cache key mas compleja

## Invalidation Tag-Based

Etiqueta entradas de cache con identificadores de entidades relacionadas. Cuando una entidad cambia, purga todas las entradas etiquetadas con esa entidad.

### Setear Tags

```python
def get_product_with_tags(product_id: int) -> dict | None:
    cache_key = f"product:{product_id}"
    cached = r.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    product = db.products.find_by_id(product_id)
    if product:
        r.setex(cache_key, 3600, json.dumps(product))
        
        # Etiquetar esta entrada de cache con entidades relacionadas
        r.sadd(f"tag:product:{product_id}", cache_key)
        r.sadd(f"tag:category:{product.category_id}", cache_key)
        r.expire(f"tag:product:{product_id}", 3600)
        r.expire(f"tag:category:{product.category_id}", 3600)
    
    return product
```

### Purgar por Tag

```python
def invalidate_tag(tag: str):
    # Obtener todas las cache keys etiquetadas con este tag
    keys = r.smembers(f"tag:{tag}")
    
    if keys:
        # Eliminar todas las entradas etiquetadas
        r.delete(*keys)
    
    # Eliminar el tag set mismo
    r.delete(f"tag:{tag}")

def update_product(product_id: int, data: dict) -> dict:
    product = db.products.update(product_id, data)
    
    # Invalidar todos los caches relacionados con este producto
    invalidate_tag(f"product:{product_id}")
    
    # Tambien invalidar el cache de categoria si cambio
    if "category_id" in data:
        invalidate_tag(f"category:{data['category_id']}")
    
    return product
```

### Ventajas

- Invalidation precisa de entradas relacionadas
- Maneja grafos de dependencias complejos
- Una llamada de purge invalida muchas entradas

### Desventajas

- Alto overhead de memoria para tracking de tags
- Complejo de implementar correctamente
- Los tag sets deben limpiarse para evitar memory leaks

## Invalidation Write-Through

En write-through caching, las escrituras van al cache primero (o simultaneamente), asi que el cache siempre tiene los datos mas recientes. La invalidation es implicita: el write mismo actualiza el cache.

```python
def update_user_write_through(user_id: int, data: dict) -> dict:
    # Escribir a base de datos
    user = db.users.update(user_id, data)
    
    # Actualizar cache con datos nuevos
    r.setex(f"user:{user_id}", 3600, json.dumps(user))
    
    return user
```

### Ventajas

- El cache siempre esta fresco despues de writes
- No se necesita step separado de invalidation
- Sin ventana de datos stale

### Desventajas

- Latencia de escritura aumenta (escritura DB + escritura cache)
- Si la escritura al cache falla, el cache esta stale hasta que el TTL expira
- No adecuado para workloads de mucha escritura

## Invalidation Multi-Tier

Cuando usas multiples tiers de cache (L1 en memoria, L2 Redis), la invalidation debe propagarse a traves de todos los tiers.

```python
class MultiTierInvalidation:
    def __init__(self, redis_client, local_cache):
        self.redis = redis_client
        self.local = local_cache
        self._setup_subscriber()
    
    def invalidate(self, key: str):
        # Invalidar L2 (Redis)
        self.redis.delete(key)
        
        # Invalidar L1 (local)
        self.local.delete(key)
        
        # Notificar a otras instancias para invalidar su L1
        self.redis.publish("cache-invalidation", key)
    
    def _setup_subscriber(self):
        pubsub = self.redis.pubsub()
        pubsub.subscribe("cache-invalidation")
        
        def listen():
            for message in pubsub.listen():
                if message["type"] == "message":
                    key = message["data"].decode()
                    self.local.delete(key)
        
        threading.Thread(target=listen, daemon=True).start()
```

## Race Conditions

### Race Read-Then-Write

```text
Thread A: Read cache (miss) → Read DB → Write cache
Thread B: Write DB → Invalidate cache
Result: Thread A escribe datos stale al cache despues de que Thread B lo invalido
```

### Solución: Lock o Version Check

```python
def get_user_safe(user_id: int) -> dict | None:
    cache_key = f"user:{user_id}"
    lock_key = f"lock:{cache_key}"
    
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Adquirir lock
    acquired = r.set(lock_key, "1", nx=True, ex=10)
    if acquired:
        try:
            # Double-check cache
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
        time.sleep(0.05)
        return get_user_safe(user_id)
```

### Delayed Double-Delete

Para manejar el race donde un read esta en progreso cuando la invalidation ocurre, usa delayed double-delete:

```python
def update_user_safe(user_id: int, data: dict) -> dict:
    # 1. Eliminar cache
    r.delete(f"user:{user_id}")
    
    # 2. Escribir a base de datos
    user = db.users.update(user_id, data)
    
    # 3. Eliminar cache de nuevo (despues de un delay corto)
    threading.Timer(0.5, lambda: r.delete(f"user:{user_id}")).start()
    
    return user
```

El segundo delete maneja el caso donde un read concurrente repopulo el cache con datos stale entre el step 1 y el step 2.

## Modelos de Consistencia

### Consistencia Fuerte

El cache siempre es consistente con la base de datos. Requiere write-through o invalidation sincrona. Mayor latencia pero sin reads stale.

### Consistencia Eventual

El cache puede estar stale por un periodo corto. La expiracion basada en TTL proporciona consistencia eventual. Menor latencia pero tolera reads stale.

### Consistencia Read-Your-Writes

Despues de que un usuario escribe, sus reads subsiguientes ven los datos actualizados. Logra esto invalidando el cache despues del write y asegurando que el siguiente read del usuario vaya a la base de datos.

```python
def update_user_session(user_id: int, data: dict, session_id: str) -> dict:
    user = db.users.update(user_id, data)
    
    # Invalidar cache
    r.delete(f"user:{user_id}")
    
    # Marcar esta sesion como necesitando read fresco
    r.setex(f"bypass_cache:{session_id}", 10, "1")
    
    return user

def get_user_session(user_id: int, session_id: str) -> dict | None:
    # Checkear si esta sesion deberia bypassar el cache
    if r.exists(f"bypass_cache:{session_id}"):
        return db.users.find_by_id(user_id)
    
    # Flow normal de cache
    return get_user(user_id)
```

## Monitoreo de Invalidation

Trackea estas metricas para asegurar que la invalidation esta funcionando correctamente:

- **Latencia de invalidation**: tiempo desde write hasta invalidation de cache
- **Stale read rate**: porcentaje de reads que retornan datos stale
- **Fallos de invalidation**: operaciones de invalidation fallidas
- **Cache hit rate despues de invalidation**: deberia bajar a 0 para keys invalidadas, luego recuperar

```python
import time

def invalidate_with_metrics(key: str):
    start = time.time()
    
    try:
        r.delete(key)
        r.publish("cache-invalidation", key)
        
        latency = (time.time() - start) * 1000
        metrics.histogram("cache.invalidation.latency", latency)
        metrics.increment("cache.invalidation.success")
    except Exception as e:
        metrics.increment("cache.invalidation.failure")
        raise
```

## Checklist de Producción

- [ ] TTL seteado en cada entrada de cache
- [ ] TTL jitter para prevenir stampedes
- [ ] Invalidation event-driven para datos de mucha escritura
- [ ] Pub/sub para invalidation L1 multi-instancia
- [ ] Manejo de race conditions (locks o delayed double-delete)
- [ ] Versioned keys para cache busting amigable con CDN
- [ ] Invalidation tag-based para dependencias complejas
- [ ] Monitoreo y alerting de fallos de invalidation
- [ ] Fallback a TTL si invalidation event-driven falla
- [ ] Stale read rate monitoreado
- [ ] Latencia de invalidation trackeada

## Preguntas Frecuentes

### ¿Cuál es la mejor estrategia de invalidation de cache?

No hay una sola mejor estrategia. Usa TTL para datos que toleran staleness. Usa event-driven para datos que deben estar frescos despues de writes. Usa versioned keys para caching CDN. Usa tag-based para grafos de dependencias complejos. La mayoria de sistemas usan una combinacion: TTL como red de seguridad, event-driven para freshness, y versioned keys para casos especificos.

### ¿Cómo manejo fallos de invalidation?

Siempre ten un TTL como fallback. Si la invalidation event-driven falla, el TTL asegura que los datos stale eventualmente expiren. Loggea fallos de invalidation y alerta sobre ellos. Considera reintentar invalidations fallidas con una queue.

### ¿Qué es el patrón delayed double-delete?

Elimina el cache, escribe a la base de datos, luego elimina el cache de nuevo despues de un delay corto. El segundo delete maneja la race condition donde un read concurrente repopulo el cache con datos stale entre el primer delete y la escritura a base de datos.

### ¿Cómo invalido cache across multiples instancias?

Usa Redis pub/sub. Cuando una instancia invalida una entrada de cache, publica un mensaje. Todas las otras instancias se suscriben e invalidan sus caches locales en memoria. Esto asegura que los caches L1 sean consistentes across instancias.

### ¿Debería invalidar el cache antes o despues de escribir a la base de datos?

Invalida despues de escribir a la base de datos. Si invalidas antes, un read concurrente puede repoblar el cache con datos stale entre la invalidation y la escritura a base de datos. Usa delayed double-delete si esta race es una preocupacion.

### ¿Cómo testeo la invalidation de cache?

Escribe integration tests que verifiquen: los writes invalidan el cache, los reads subsiguientes fetchean datos frescos, los reads concurrentes durante writes no retornan datos stale, los fallos de invalidation fallan back a TTL, y las notificaciones pub/sub llegan a todas las instancias.
