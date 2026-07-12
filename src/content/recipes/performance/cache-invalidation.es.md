---




contentType: recipes
slug: cache-invalidation
title: "Implementar Estrategias de Invalidación de Caché"
description: "Cómo mantener la caché consistente con las bases de datos usando TTL, write-through, write-behind y patrones de invalidación event-driven."
metaDescription: "Aprende estrategias de invalidación de caché. Mantén consistencia con TTL, write-through, write-behind y patrones event-driven para sistemas distribuidos."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - caching
  - optimization
  - profiling
  - latency
relatedResources:
  - /recipes/database-indexing
  - /recipes/connection-pooling
  - /recipes/cdn-edge-caching
  - /recipes/redis-cache-patterns
  - /recipes/caching-strategies
  - /recipes/lazy-loading
  - /patterns/flyweight-pattern-text
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende estrategias de invalidación de caché. Mantén consistencia con TTL, write-through, write-behind y patrones event-driven para sistemas distribuidos."
  keywords:
    - cache invalidation
    - caching strategies
    - redis cache
    - write through
    - cache consistency
    - distributed caching




---

## Visión general

El caching mejora el rendimiento de lectura almacenando datos frecuentemente accedidos en almacenamiento rápido en memoria. Sin embargo, las cachés introducen un problema clásico de [sistemas distribuidos](/guides/architecture/microservices-architecture-guide): cuando los datos subyacentes cambian, la caché se vuelve obsoleta. Servir datos obsoletos puede llevar a decisiones de negocio incorrectas, problemas de seguridad y malas experiencias de usuario.

La invalidación de caché es el mecanismo que garantiza que los datos cacheados permanezcan consistentes con su fuente. No hay una solución universal — la estrategia correcta depende de tus requerimientos de consistencia, volumen de escrituras, y tolerancia a lecturas obsoletas. Lo siguiente cubre los cuatro patrones principales: expiración TTL, write-through, write-behind e invalidación event-driven.

## Cuándo usarlo

Usa esta receta cuando:

- Agregas caching a una aplicación que requiere consistencia de datos
- Debuggeas problemas de caché obsoleta donde usuarios ven información desactualizada
- Diseñas sistemas distribuidos con múltiples escritores y lectores
- Eliges entre Redis, Memcached o capas de caching de [CDN](/recipes/data/caching)
- Implementas políticas de cache warming y eviction

## Solución

### Expiración TTL (Python + Redis)

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_user(user_id):
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    user = db.query("SELECT * FROM users WHERE id = %s", (user_id,))
    r.setex(key, 300, json.dumps(user))  # TTL: 5 minutos
    return user
```

### Write-Through Cache

```python
def update_user(user_id, data):
    db.execute("UPDATE users SET name = %s WHERE id = %s", (data['name'], user_id))
    r.setex(f"user:{user_id}", 300, json.dumps(data))
```

### Invalidación Event-Driven (Node.js + Redis)

```javascript
const redis = require('redis');
const subscriber = redis.createClient();

subscriber.subscribe('user:updated');
subscriber.on('message', (channel, userId) => {
  redisClient.del(`user:${userId}`);
});

redisClient.publish('user:updated', userId);
```

### Write-Behind (Write-Back) Cache

```python
import threading

write_queue = []
write_lock = threading.Lock()

def write_behind_update(user_id, data):
    # Escribe en caché inmediatamente
    r.setex(f"user:{user_id}", 300, json.dumps(data))
    # Encola para escritura asíncrona en base de datos
    with write_lock:
        write_queue.append((user_id, data))

def flush_writes():
    while True:
        time.sleep(1)  # Flush cada segundo
        with write_lock:
            if not write_queue:
                continue
            batch = write_queue[:100]
            write_queue = write_queue[100:]
        for user_id, data in batch:
            db.execute(
                "UPDATE users SET name = %s WHERE id = %s",
                (data['name'], user_id)
            )
```

### Protección contra Cache Stampede

```python
import time
import random

def get_with_stampede_protection(key, ttl, loader):
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    # Expiración temprana probabilística: 5% chance de refrescar antes
    remaining_ttl = r.ttl(key)
    if remaining_ttl and remaining_ttl < ttl * 0.1:
        if random.random() < 0.05:
            # Este request refresca la caché
            value = loader()
            r.setex(key, ttl, json.dumps(value))
            return value

    # Lock distribuido para prevenir stampede
    lock_key = f"lock:{key}"
    acquired = r.set(lock_key, "1", nx=True, ex=10)
    if acquired:
        try:
            value = loader()
            r.setex(key, ttl, json.dumps(value))
            return value
        finally:
            r.delete(lock_key)
    else:
        # Otro proceso está refrescando; espera brevemente y reintenta
        time.sleep(0.1)
        return get_with_stampede_protection(key, ttl, loader)
```

### Invalidación de Caché Multi-Nivel

```python
# L1: In-process (LRU cache)
# L2: Redis (caché compartida)
# L3: Base de datos (source of truth)

def get_user_multi_level(user_id):
    # Revisa L1 primero
    if user_id in l1_cache:
        return l1_cache[user_id]

    # Revisa L2
    cached = r.get(f"user:{user_id}")
    if cached:
        user = json.loads(cached)
        l1_cache[user_id] = user  # Popula L1
        return user

    # Carga desde L3 (base de datos)
    user = db.query("SELECT * FROM users WHERE id = %s", (user_id,))
    r.setex(f"user:{user_id}", 300, json.dumps(user))
    l1_cache[user_id] = user
    return user

def invalidate_user(user_id):
    # Invalida todos los niveles
    l1_cache.pop(user_id, None)  # Limpia L1
    r.delete(f"user:{user_id}")   # Limpia L2
    # L3 es la fuente — no necesita invalidación
```

## Explicación

- **Expiración TTL**: El enfoque más simple. Los datos expiran después de un tiempo fijo. Adecuado para datos que cambian infrecuentemente o donde la obsolescencia breve es aceptable. Fácil de implementar pero puede servir datos obsoletos durante la duración del TTL.
- **Write-through**: Actualiza la caché sincrónicamente cuando se escribe en la base de datos. Garantiza consistencia pero agrega latencia a las escrituras e incrementa la carga de la caché.
- **Write-behind (write-back)**: Las escrituras van primero a la caché, que persiste asíncronamente en la base de datos. Escrituras extremadamente rápidas pero riesgo de pérdida de datos si la caché falla antes de flush.
- **Event-driven**: Los servicios publican [eventos](/recipes/messaging/event-driven-microservices) cuando los datos cambian. Los listeners de caché eliminan o refrescan las keys afectadas. Acoplamiento débil pero requiere un message broker.

## Variantes

| Estrategia | Consistencia | Latencia de escritura | Complejidad | Mejor para |
|------------|--------------|----------------------|-------------|------------|
| TTL | Eventual | Baja | Baja | Datos que cambian infrecuentemente |
| Write-through | Fuerte | Alta | Media | Datos críticos, bajo volumen de escrituras |
| Write-behind | Débil | Muy baja | Alta | Cargas de escritura intensas |
| Event-driven | Fuerte | Baja | Alta | Microservicios distribuidos |
| Cache-aside | Eventual | Baja | Baja | Lecturas de propósito general |
| Refresh-ahead | Fuerte | Baja | Media | Patrones de acceso predecibles |

## Avanzado: Diseño de Cache Keys

Un buen diseño de keys previene colisiones y permite invalidación dirigida:

```python
# Mal: key ambigua
r.set("user:42", data)

# Bien: namespace + entidad + id + versión
r.set("app:v2:user:42", data)

# Para colecciones, incluye parámetros de query en la key
r.set("app:v2:users:role=admin:active=true", data)

# Para invalidación, usa patrones de keys
r.delete("app:v2:user:42")
# O escanea y elimina keys que coinciden
for key in r.scan_iter("app:v2:users:*"):
    r.delete(key)
```

## Avanzado: Invalidación de Caché CDN

El caching de CDN agrega otra capa. Invalidar cachés de CDN requiere llamadas API:

```bash
# Cloudflare purge por URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"files": ["https://example.com/users/42"]}'

# AWS CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id {dist_id} \
  --paths "/*"
```

La invalidación de CDN es lenta (segundos a minutos). Usa URLs versionadas (`/v2/users/42`) o parámetros de cache-busting (`?v=123`) para actualizaciones instantáneas.

## Lo que funciona

- **Usa cache-aside para lecturas**: revisa caché, fallback a base de datos, popula caché. Es el patrón más común y resiliente.
- **Configura TTLs apropiados**: demasiado corto y derrotas el propósito del caching; demasiado largo y los datos obsoletos persisten. Basado en requerimientos de negocio.
- **Implementa protección contra cache stampede**: cuando el TTL expira, muchos requests concurrentes pueden golpear la base de datos simultáneamente. Usa un mutex o expiración temprana probabilística.
- **Versiona keys de caché**: incluye una versión de schema en la key (`user:v2:123`). Cuando el formato de datos cambia, las entradas cacheadas viejas se ignoran naturalmente.
- **Monitorea tasas de cache hit**: una tasa de hit bajo del 80% generalmente indica mala selección de keys o ajuste de TTL.

## Errores comunes

- **Cachear todo**: algunos datos ya son rápidos de consultar o cambian demasiado frecuentemente para beneficiarse del caching. Profile antes de agregar capas de caché.
- **Olvidar invalidar**: actualizaciones a la base de datos que no limpian la caché causan datos obsoletos persistentes. Los pipelines de invalidación automatizada ayudan.
- **No manejar fallas de caché**: si Redis cae, la aplicación debería degradar graciosamente a queries de base de datos, no crashear.
- **Usar el mismo TTL para todos los datos**: los perfiles de usuario pueden tolerar 10 minutos de obsolescencia; los conteos de inventario pueden necesitar consistencia instantánea.

## Preguntas frecuentes

### ¿Cómo prevengo cache stampedes?

Usa un lock distribuido para que solo un proceso repopule la caché después de la expiración. Consulta [rate limiting](/recipes/security/rate-limiting) para patrones de locking distribuido. Alternativamente, usa expiración temprana probabilística donde cada request tiene una pequeña chance de refrescar la caché antes de que el TTL llegue a cero.

### ¿Debería cachear escrituras además de lecturas?

Solo en escenarios específicos de alta escritura. El write caching (write-behind) introduce complejidad y riesgos de durabilidad. La mayoría de aplicaciones se beneficia solo de read caching. Si necesitas write-behind, asegúrate de tener una cola de escritura durable y recuperación de crashes.

### ¿Puedo usar triggers de base de datos para invalidar cachés?

Sí, pero cuidadosamente. Los triggers pueden publicar eventos a Redis o una cola de mensajes cuando las filas cambian. Sin embargo, los triggers agregan carga a la base de datos y pueden ser difíciles de debuggear. Prefiere invalidación a nivel aplicación en la mayoría de los casos.

### ¿Cuál es la diferencia entre eviction e invalidation?

La eviction ocurre cuando la caché remueve entradas por presión de memoria (políticas LRU, LFU). La invalidación es remoción deliberada porque los datos subyacentes cambiaron. La eviction es automática; la invalidación es explícita.

### ¿Cómo manejo la invalidación de caché en microservicios?

Usa invalidación event-driven. Cada servicio publica un evento de dominio (e.g., `UserUpdated`) a un message broker. Los listeners de caché se suscriben a estos eventos y eliminan las keys afectadas. Esto desacopla los servicios y asegura que todas las cachés se invaliden. Consulta [microservicios event-driven](/recipes/messaging/event-driven-microservices) para patrones.

### ¿Qué TTL debería usar?

Depende de los datos. Los perfiles de usuario pueden tolerar 10-30 minutos de obsolescencia. El inventario de productos necesita consistencia casi en tiempo real (TTL de segundos o sin caché). Los datos de configuración pueden cachearse por horas. Basa el TTL en requerimientos de negocio, no en un valor por defecto.

### ¿Cómo testeo la invalidación de caché?

Escribe tests de integración que verifiquen: (1) los datos cacheados se devuelven en lecturas repetidas, (2) la caché se limpia después de una escritura, (3) no se sirven datos obsoletos después de que el TTL expira. Usa una instancia real de Redis en los tests, no un mock. Testea lecturas y escrituras concurrentes para verificar la protección contra stampede.

### ¿Qué es cache-aside vs read-through?

En cache-aside, la aplicación revisa la caché, fallback a base de datos, y popula la caché. En read-through, la librería de caché trae transparentemente desde la base de datos en un miss. Cache-aside da más control; read-through simplifica el código de aplicación.

### ¿Cómo monitorizo la salud de la caché?

Rastrea la tasa de cache hit (objetivo >80%), uso de memoria, conteo de evictions y latencia. El comando INFO de Redis provee estas métricas. Configura alertas para caídas en hit rate, presión de memoria y fallos de conexión. Consulta [guía de observabilidad](/guides/devops/logging-monitoring-observability-guide) para patrones de monitoreo.

### ¿Debería usar Redis o Memcached?

Redis para la mayoría de los casos: soporta estructuras de datos, persistencia, pub/sub y Lua scripting. Memcached para caching simple key-value con rendimiento multi-threaded. Redis es la opción por defecto para proyectos nuevos.

### ¿Cómo manejo la caché durante deploys?

Versiona tus cache keys (`app:v2:user:42`). Al deployar un nuevo schema, el bump de versión invalida naturalmente las entradas viejas. Alternativamente, flush la caché durante el deploy (causa un spike temporal en carga de base de datos). Calienta la caché pre-cargando hot keys después del deploy.

### ¿Qué es cache warming?

El cache warming pre-carga datos frecuentemente accedidos en la caché antes de que los usuarios los pidan. Corre un script de warming después de deploys o durante horas valle. Esto previene cache stampedes en el primer acceso después de un flush.
