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
  - cache-invalidation
  - caching
relatedResources:
  - /recipes/database-indexing
  - /recipes/connection-pooling
  - /recipes/cdn-edge-caching
lastUpdated: "2026-06-13"
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

El caching mejora el rendimiento de lectura almacenando datos frecuentemente accedidos en almacenamiento rápido en memoria. Sin embargo, las cachés introducen un problema clásico de sistemas distribuidos: cuando los datos subyacentes cambian, la caché se vuelve obsoleta. Servir datos obsoletos puede llevar a decisiones de negocio incorrectas, problemas de seguridad y malas experiencias de usuario.

La invalidación de caché es el mecanismo que garantiza que los datos cacheados permanezcan consistentes con su fuente. No hay una solución universal — la estrategia correcta depende de tus requerimientos de consistencia, volumen de escrituras, y tolerancia a lecturas obsoletas. Esta receta cubre los cuatro patrones principales: expiración TTL, write-through, write-behind e invalidación event-driven.

## Cuándo usarlo

Usa esta receta cuando:

- Agregas caching a una aplicación que requiere consistencia de datos
- Debuggeas problemas de caché obsoleta donde usuarios ven información desactualizada
- Diseñas sistemas distribuidos con múltiples escritores y lectores
- Eliges entre Redis, Memcached o capas de caching de CDN
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

## Explicación

- **Expiración TTL**: El enfoque más simple. Los datos expiran después de un tiempo fijo. Adecuado para datos que cambian infrecuentemente o donde la obsolescencia breve es aceptable. Fácil de implementar pero puede servir datos obsoletos durante la duración del TTL.
- **Write-through**: Actualiza la caché sincrónicamente cuando se escribe en la base de datos. Garantiza consistencia pero agrega latencia a las escrituras e incrementa la carga de la caché.
- **Write-behind (write-back)**: Las escrituras van primero a la caché, que persiste asíncronamente en la base de datos. Escrituras extremadamente rápidas pero riesgo de pérdida de datos si la caché falla antes de flush.
- **Event-driven**: Los servicios publican eventos cuando los datos cambian. Los listeners de caché eliminan o refrescan las keys afectadas. Acoplamiento débil pero requiere un message broker.

## Variantes

| Estrategia | Consistencia | Latencia de escritura | Complejidad | Mejor para |
|------------|--------------|----------------------|-------------|------------|
| TTL | Eventual | Baja | Baja | Datos que cambian infrecuentemente |
| Write-through | Fuerte | Alta | Media | Datos críticos, bajo volumen de escrituras |
| Write-behind | Débil | Muy baja | Alta | Cargas de escritura intensas |
| Event-driven | Fuerte | Baja | Alta | Microservicios distribuidos |

## Mejores prácticas

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

**P: ¿Cómo prevengo cache stampedes?**
R: Usa un lock distribuido para que solo un proceso repopule la caché después de la expiración. Alternativamente, usa expiración temprana probabilística donde cada request tiene una pequeña chance de refrescar la caché antes de que el TTL llegue a cero.

**P: ¿Debería cachear escrituras además de lecturas?**
R: Solo en escenarios específicos de alta escritura. El write caching (write-behind) introduce complejidad y riesgos de durabilidad. La mayoría de aplicaciones se beneficia solo de read caching.

**P: ¿Puedo usar triggers de base de datos para invalidar cachés?**
R: Sí, pero cuidadosamente. Los triggers pueden publicar eventos a Redis o una cola de mensajes cuando las filas cambian. Sin embargo, los triggers agregan carga a la base de datos y pueden ser difíciles de debuggear.

**P: ¿Cuál es la diferencia entre eviction e invalidation?**
R: La eviction ocurre cuando la caché remueve entradas por presión de memoria (políticas LRU, LFU). La invalidación es remoción deliberada porque los datos subyacentes cambiaron.

