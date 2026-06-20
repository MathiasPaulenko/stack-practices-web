---
contentType: recipes
slug: caching-strategies
title: "Estrategias de Caching"
description: "Implementa estrategias de caching efectivas para bases de datos, APIs y frontends usando Redis, CDNs y caches de navegador."
metaDescription: "Estrategias de caching para aplicaciones web: Redis, CDN, cache de navegador, invalidación de cache, stale-while-revalidate y prevención de stampede."
difficulty: intermediate
topics:
  - performance
tags:
  - caching
  - performance
  - redis
  - cdn
relatedResources:
  - /guides/performance-optimization-guide
  - /patterns/proxy-pattern-caching
  - /recipes/redis-cache-patterns
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
lastUpdated: "2026-06-19"
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

El caching es la técnica más efectiva para mejorar el rendimiento de aplicaciones. Almacenando datos frecuentemente accedidos cerca de los consumidores — en memoria del navegador, bordes de CDN o almacenamiento in-memory — reduces latencia, disminuyes carga de base de datos y mejoras la experiencia del usuario. Elegir la estrategia correcta depende de los requisitos de frescura de datos y patrones de lectura/escritura.

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

## Mejores Prácticas

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

## Preguntas Frecuentes

**P: ¿Cómo prevengo cache stampedes?**
R: Usa un mutex o Redis SET NX (lock) para que solo un request reconstruya el cache mientras otros esperan.

**P: ¿Debería cachear respuestas GraphQL?**
R: Sí, pero cachea por hash de query + variables. [Apollo Server](/recipes/api/call-rest-api) tiene caching de respuestas built-in.

**P: ¿Cuál es la diferencia entre Redis y Memcached?**
R: Redis soporta estructuras de datos (listas, sets, sorted sets) y persistencia. Memcached es más simple y ligeramente más rápido para caching plain key-value.
