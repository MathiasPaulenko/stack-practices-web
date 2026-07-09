---
contentType: recipes
slug: caching-strategies
title: "Estrategias de Caching"
description: "Implementa estrategias de caching útiles para bases de datos, APIs y frontends usando Redis, CDNs y caches de navegador."
metaDescription: "Estrategias de caching para aplicaciones web: Redis, CDN, cache de navegador, invalidación de cache, stale-while-revalidate y prevención de stampede."
difficulty: intermediate
topics:
  - performance
tags:
  - caching
  - performance
  - redis
  - cdn
  - optimization
relatedResources:
  - /guides/performance-optimization-guide
  - /patterns/proxy-pattern-caching
  - /recipes/redis-cache-patterns
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Estrategias de caching para aplicaciones web: Redis, CDN, cache de navegador, invalidación de cache, stale-while-revalidate y prevención de stampede."
  keywords:
    - caching
    - performance
    - redis
    - cdn
---
## Visión General

El caching es la técnica más útil para mejorar el rendimiento de aplicaciones. Almacenando datos frecuentemente accedidos cerca de los consumidores — en memoria del navegador, bordes de CDN o almacenamiento in-memory — reduces latencia, disminuyes carga de base de datos y mejoras la experiencia del usuario. Elegir la estrategia correcta depende de los requisitos de frescura de datos y patrones de lectura/escritura.

## Cuándo Usar

Usa este recurso cuando:
- Las [consultas de base de datos](/recipes/performance/query-optimization) se vuelven un cuello de botella bajo carga
- Los [tiempos de respuesta de API](/recipes/api/call-rest-api) exceden 200ms para endpoints de lectura intensiva
- Sirves assets estáticos (imágenes, JS, CSS) a usuarios globales via [CDN](/recipes/data/caching)
- Construyes aplicaciones de alto tráfico donde datos stale son aceptables

## Solución

### Cache-Aside con Redis (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
  const cacheKey = `user:${userId}`;
  
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const user = await db.users.findById(userId);
  if (user) {
    await client.setEx(cacheKey, 3600, JSON.stringify(user));
  }
  return user;
}
```

### Stale-While-Revalidate (HTTP)

```javascript
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json(products);
});
```

### CDN Edge Caching (CloudFront/Vercel)

```json
{
  "routes": [
    {
      "src": "/api/public/.*",
      "headers": {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400"
      }
    }
  ]
}
```

## Explicación

| Estrategia | Patrón | Ideal Para |
|------------|--------|------------|
| Cache-Aside | La app revisa cache, fallback a DB | Lectura intensiva; simple de implementar |
| Read-Through | Cache actúa como proxy transparente de DB | Lectura intensiva; la librería maneja lógica |
| Write-Through | Escrituras actualizan cache y DB simultáneamente | Consistencia de datos crítica |
| Write-Behind | Escrituras actualizan cache; flush async a DB | Escritura intensiva; consistencia eventual |
| Refresh-Ahead | Refresh en background antes de expiración | Patrones de acceso predecibles |

**Enfoques de invalidación de cache**:
- **Basado en tiempo (TTL)**: Simple pero puede servir datos stale
- **Basado en clave**: Incluye versión o hash en la clave de cache
- **Basado en eventos**: Invalida cuando los datos cambian vía message bus. Consulta [invalidación de caché](/recipes/performance/cache-invalidation).

## Variantes

| Capa | Tecnología | Latencia | Caso de Uso |
|------|------------|----------|-------------|
| Navegador | LocalStorage, IndexedDB | ~1ms | Apps offline-first |
| CDN | CloudFront, Cloudflare, Fastly | ~10-50ms | Assets estáticos, caching de API en edge |
| Aplicación | Redis, Memcached | ~1ms | Session store, datos hot |
| Base de datos | Query cache, vistas materializadas | ~1-10ms | Queries complejas repetidas |
| Disco | Page cache, buffers del OS | ~0.1ms | Lecturas de file system |

## Lo que funciona

- **Ajusta TTLs según volatilidad**: Perfiles de usuario (1h), catálogos de productos (24h), precios de acciones (10s)
- **Cachea en múltiples capas**: Navegador + CDN + Redis + query cache de DB
- **Usa protección contra stampede**: Lock durante cache miss para prevenir thundering herd
- **Monitorea hit rates**: Por debajo de 80% señala mala configuración o TTL demasiado corto
- **Versiona tus claves de cache**: Incluye versión de app para invalidar en deploy

## Errores Comunes

1. **Cachear todo**: Datos estáticos sí; datos específicos de usuario o cambiantes frecuentemente no
2. **Sin estrategia de invalidación**: Datos stale persisten indefinidamente sin TTL o eventos
3. **Thundering herd**: 1000 requests golpean un cache cold simultáneamente; usa locking
4. **Cache poisoning**: Input de usuario no validado almacenado en cache compartido afecta a todos los usuarios
5. **Ignorar cache warming**: Deploys a producción arrancan con caches vacíos y alta latencia

## Avanzado: Protección contra Cache Stampede

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getWithLock(key, ttl, builder) {
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `${key}:lock`;
  const acquired = await client.set(lockKey, '1', { NX: true, EX: 10 });

  if (!acquired) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getWithLock(key, ttl, builder);
  }

  try {
    const value = await builder();
    await client.setEx(key, ttl, JSON.stringify(value));
    return value;
  } finally {
    await client.del(lockKey);
  }
}
```

Este patrón usa Redis `SET NX` para adquirir un lock. Solo un request obtiene datos de la base de datos mientras otros hacen poll hasta que el cache se popula. El lock expira después de 10 segundos para prevenir deadlocks si el builder crashea.

## Avanzado: Caching Multi-Nivel

```python
import redis
import hashlib
import json

r = redis.Redis()

def get_user(user_id):
    # L1: Cache in-memory local (a nivel proceso)
    if hasattr(get_user, '_cache') and user_id in get_user._cache:
        return get_user._cache[user_id]

    # L2: Cache compartido en Redis
    key = f'user:{user_id}'
    cached = r.get(key)
    if cached:
        user = json.loads(cached)
        if not hasattr(get_user, '_cache'):
            get_user._cache = {}
        get_user._cache[user_id] = user
        return user

    # L3: Base de datos
    user = db.users.find_by_id(user_id)
    if user:
        r.setex(key, 3600, json.dumps(user))
        if not hasattr(get_user, '_cache'):
            get_user._cache = {}
        get_user._cache[user_id] = user
    return user
```

El caching multi-nivel combina L1 (en-proceso), L2 (Redis) y L3 (base de datos). L1 maneja hot keys con latencia sub-milisegundo. L2 comparte datos cacheados entre instancias. L3 es la fuente de verdad. Invalida L1 en deploy reiniciando el proceso o usando un prefijo de versión en las claves.

## Avanzado: Diseño de Cache Keys

```python
def make_cache_key(resource, params, version='v1'):
    param_hash = hashlib.md5(
        json.dumps(params, sort_keys=True).encode()
    ).hexdigest()[:12]
    return f'{version}:{resource}:{param_hash}'
```

Las buenas cache keys son determinísticas, versionadas y con prefijo de namespace. Incluye un segmento de versión para invalidar todas las claves en deploy. Hashea combinaciones de parámetros para mantener claves cortas y resistentes a colisiones. Evita embeber user IDs en claves de cache compartido — usa un namespace separado para datos por usuario.

## Avanzado: Invalidación CDN

```bash
# Invalidación de CloudFront vía AWS CLI
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/*"

# Purge de Cloudflare vía API
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything": false, "files": ["https://example.com/api/products"]}'
```

La invalidación CDN elimina respuestas cacheadas de las ubicaciones edge. Purga URLs específicas cuando sea posible — las purgas completas son costosas y rate-limited. Para cambios de contenido predecibles, usa URLs versionadas (`/api/v2/products`) en lugar de invalidar paths viejos. Configura `s-maxage` apropiadamente para que los edges se auto-expiren sin invalidación explícita.

## Cuándo Evitar

- **Datos en tiempo real**: Trading de acciones, scores de deportes en vivo, precios de subastas — la staleness causa impacto financiero
- **Datos sensibles a compliance**: Contextos HIPAA, GDPR donde copias cacheadas pueden violar acuerdos de manejo de datos
- **Workloads de escritura intensiva**: El hit rate se mantiene bajo porque los datos cambian antes de expirar
- **Datasets pequeños**: Si el dataset completo cabe en memoria, el caching añade complejidad sin beneficio

## Avanzado: Implementación Stale-While-Revalidate

```javascript
async function swr(key, ttl, builder) {
  const cached = await client.get(key);
  const staleFlag = await client.get(`${key}:stale`);

  if (cached) {
    // Devuelve datos cacheados inmediatamente
    const data = JSON.parse(cached);

    // Si está stale, dispara refresh en background
    if (staleFlag === '1') {
      builder().then(value => {
        client.setEx(key, ttl, JSON.stringify(value));
        client.del(`${key}:stale`);
      }).catch(err => console.error('SWR refresh failed:', err));
    }
    return data;
  }

  // Cache cold — fetch y cachea
  const value = await builder();
  await client.setEx(key, ttl, JSON.stringify(value));
  return value;
}
```

Stale-While-Revalidate sirve datos cacheados incluso después de que se vuelven stale, luego refresca en background. Setea un stale flag al 80% del TTL. Cuando un request ve el stale flag, obtiene los datos cacheados inmediatamente y dispara un refresh async. Esto elimina cache stampedes porque ningún request espera por un rebuild.

## Avanzado: Cache Warming en Deploy

```python
import redis
import asyncio

r = redis.Redis()

async def warm_cache(keys, builder):
    tasks = []
    for key in keys:
        tasks.append(warm_single(key, builder))
    await asyncio.gather(*tasks)

async def warm_single(key, builder):
    value = await builder(key)
    r.setex(key, 3600, json.dumps(value))
```

El cache warming pre-popula Redis antes de que llegue tráfico. Ejecuta esto como un paso post-deploy en CI/CD. Identifica hot keys desde analytics o `redis-cli --hotkeys`. Calienta las top 100-500 claves para cubrir el 80% del tráfico. Esto previene picos de latencia por cache cold después de deploys.

## Preguntas Frecuentes

### ¿Cómo prevengo cache stampedes?

Usa un mutex o Redis `SET NX` (lock) para que solo un request reconstruya el cache mientras otros esperan. Alternativa: usa early refresh con jitter para que los valores cacheados se refresquen antes de expirar, distribuyendo la carga.

### ¿Debería cachear respuestas GraphQL?

Sí, pero cachea por hash de query + variables. [Apollo Server](/recipes/api/call-rest-api) tiene caching de respuestas built-in con directivas `cacheControl`. Para persisted queries, cachea por query ID.

### ¿Cuál es la diferencia entre Redis y Memcached?

Redis soporta estructuras de datos (listas, sets, sorted sets) y persistencia. Memcached es más simple y ligeramente más rápido para caching plain key-value. Elige Redis cuando necesites operaciones atómicas, pub/sub o persistencia. Elige Memcached para velocidad bruta con pares key-value simples.

### ¿Cuándo debería evitar el caching?

Evita cachear cuando los datos cambian frecuentemente y la staleness es inaceptable (e.g., balances bancarios, inventario en flash sales). También evita para endpoints de bajo tráfico donde el hit rate se mantiene por debajo del 20% — el overhead de gestión del cache supera el beneficio.

### ¿Cómo mido la efectividad del cache?

Rastrea hit rate, miss rate, eviction rate y latencia promedio. Redis `INFO stats` proporciona `keyspace_hits` y `keyspace_misses`. Apunta a 80%+ hit rate en hot keys. Usa `redis-cli --bigkeys` para identificar claves que consumen memoria desproporcionada.
