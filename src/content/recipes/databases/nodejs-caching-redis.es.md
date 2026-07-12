---


contentType: recipes
slug: nodejs-caching-redis
title: "Caché en Node.js con Redis: Cache-Aside, TTL e Invalidation"
description: "Implementa caché de respuestas API en Node.js con Redis e ioredis."
metaDescription: "Implementa caché en Node.js con Redis usando ioredis. Patrones cache-aside, TTL, invalidación por tags, stale-while-revalidate y middleware para Express."
difficulty: intermediate
topics:
  - caching
tags:
  - nodejs
  - redis
  - caching
  - ioredis
  - cache-aside
  - ttl
  - performance
relatedResources:
  - /recipes/caching-redis
  - /recipes/python-api-rate-limiting
  - /recipes/api-rate-limiting-redis
  - /guides/caching-strategies-guide
  - /patterns/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implementa caché en Node.js con Redis usando ioredis. Patrones cache-aside, TTL, invalidación por tags, stale-while-revalidate y middleware para Express."
  keywords:
    - nodejs redis caché
    - cache-aside nodejs
    - redis ttl
    - ioredis caching
    - invalidación caché
    - api response caching


---

## Visión General

Cachear respuestas de API con Redis reduce la carga de la base de datos, mejora los tiempos de respuesta y escala las aplicaciones eficientemente. Esta recipe cubre cache-aside, expiración basada en TTL, invalidación por tags y patrones de middleware usando ioredis en aplicaciones Node.js Express.

## Cuándo Usar


- For alternatives, see [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/).

- Tienes endpoints de API que retornan los mismos datos repetidamente
- Las queries a la base de datos son lentas y los datos cambian infrecuentemente
- Necesitas reducir la carga en servicios o bases de datos downstream
- Quieres cachear a nivel aplicación en vez de a nivel CDN

## Solución

### Cache-aside básico con ioredis

```javascript
const express = require("express");
const Redis = require("ioredis");

const app = express();
const redis = new Redis({ host: "localhost", port: 6379 });

app.get("/api/users/:id", async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `user:${userId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json({
                data: JSON.parse(cached),
                source: "cache"
            });
        }

        const user = await fetchUserFromDatabase(userId);

        await redis.setex(cacheKey, 300, JSON.stringify(user));

        res.json({ data: user, source: "database" });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

async function fetchUserFromDatabase(id) {
    return { id: parseInt(id), name: "John Doe", email: "john@example.com" };
}

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Middleware de caché para Express

```javascript
const express = require("express");
const Redis = require("ioredis");

const app = express();
const redis = new Redis({ host: "localhost", port: 6379 });

function cacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
        const cacheKey = `api:${req.originalUrl}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                res.setHeader("X-Cache", "HIT");
                res.setHeader("X-Cache-TTL", await redis.ttl(cacheKey));
                return res.json(data);
            }

            const originalJson = res.json.bind(res);
            res.json = async function (data) {
                if (res.statusCode === 200 && data) {
                    try {
                        await redis.setex(cacheKey, ttl, JSON.stringify(data));
                    } catch (cacheErr) {
                        console.error("Cache write failed:", cacheErr.message);
                    }
                }
                res.setHeader("X-Cache", "MISS");
                return originalJson(data);
            };

            next();
        } catch (err) {
            console.error("Cache read failed:", err.message);
            next();
        }
    };
}

app.get("/api/products", cacheMiddleware(600), async (req, res) => {
    const products = await fetchProducts();
    res.json(products);
});

app.get("/api/products/:id", cacheMiddleware(300), async (req, res) => {
    const product = await fetchProduct(req.params.id);
    res.json(product);
});

async function fetchProducts() {
    return [
        { id: 1, name: "Widget", price: 9.99 },
        { id: 2, name: "Gadget", price: 19.99 }
    ];
}

async function fetchProduct(id) {
    return { id: parseInt(id), name: "Widget", price: 9.99 };
}

app.listen(3000);
```

### Invalidación de caché basada en tags

```javascript
const Redis = require("ioredis");

const redis = new Redis({ host: "localhost", port: 6379 });

async function cacheWithTags(key, data, tags, ttl = 300) {
    const pipeline = redis.pipeline();

    pipeline.setex(key, ttl, JSON.stringify(data));

    for (const tag of tags) {
        pipeline.sadd(`tag:${tag}`, key);
        pipeline.expire(`tag:${tag}`, ttl + 60);
    }

    await pipeline.exec();
}

async function invalidateByTag(tag) {
    const tagKey = `tag:${tag}`;
    const keys = await redis.smembers(tagKey);

    if (keys.length === 0) return;

    const pipeline = redis.pipeline();

    for (const key of keys) {
        pipeline.del(key);
    }
    pipeline.del(tagKey);

    await pipeline.exec();
}

// Uso: cachear un usuario y taguearlo
await cacheWithTags(
    "user:123",
    { id: 123, name: "John", department: "engineering" },
    ["users", "department:engineering"],
    300
);

// Invalidar todos los cachés relacionados con engineering
await invalidateByTag("department:engineering");

// Invalidar todos los cachés de usuarios
await invalidateByTag("users");
```

### Caché con stale-while-revalidate

```javascript
const Redis = require("ioredis");

const redis = new Redis({ host: "localhost", port: 6379 });

async function cacheSWR(key, fetchFn, ttl = 300, staleTtl = 600) {
    const cached = await redis.get(key);

    if (cached) {
        const data = JSON.parse(cached);
        const remainingTTL = await redis.ttl(key);

        if (remainingTTL > 0) {
            return { data, source: "cache-fresh" };
        }

        setImmediate(async () => {
            try {
                const fresh = await fetchFn();
                await redis.setex(key, ttl, JSON.stringify(fresh));
            } catch (err) {
                console.error("Background revalidation failed:", err.message);
            }
        });

        return { data, source: "cache-stale" };
    }

    const fresh = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(fresh));

    return { data: fresh, source: "database" };
}

app.get("/api/dashboard", async (req, res) => {
    const result = await cacheSWR(
        "dashboard:summary",
        async () => {
            return await fetchDashboardData();
        },
        60,
        300
    );

    res.json(result);
});
```

### Redis pub/sub para invalidación entre instancias

```javascript
const Redis = require("ioredis");

const redis = new Redis({ host: "localhost", port: 6379 });
const subscriber = new Redis({ host: "localhost", port: 6379 });

const localCache = new Map();

subscriber.subscribe("cache:invalidate");
subscriber.on("message", (channel, message) => {
    if (channel === "cache:invalidate") {
        const { key, tag } = JSON.parse(message);
        if (key) localCache.delete(key);
        if (tag) {
            for (const [k] of localCache.entries()) {
                if (k.includes(tag)) localCache.delete(k);
            }
        }
    }
});

async function cachedFetch(key, fetchFn, ttl = 300) {
    if (localCache.has(key)) {
        return localCache.get(key);
    }

    const redisData = await redis.get(key);
    if (redisData) {
        const data = JSON.parse(redisData);
        localCache.set(key, data);
        return data;
    }

    const fresh = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(fresh));
    localCache.set(key, fresh);

    return fresh;
}

async function invalidateCache(key) {
    localCache.delete(key);
    await redis.del(key);
    await redis.publish("cache:invalidate", JSON.stringify({ key }));
}
```

### Wrapper completo de caché

```javascript
const Redis = require("ioredis");

class CacheManager {
    constructor(redisOptions = { host: "localhost", port: 6379 }) {
        this.redis = new Redis(redisOptions);
        this.defaultTTL = 300;
    }

    async get(key) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set(key, value, ttl = this.defaultTTL, tags = []) {
        const pipeline = this.redis.pipeline();
        pipeline.setex(key, ttl, JSON.stringify(value));

        for (const tag of tags) {
            pipeline.sadd(`tag:${tag}`, key);
            pipeline.expire(`tag:${tag}`, ttl + 60);
        }

        await pipeline.exec();
    }

    async delete(key) {
        await this.redis.del(key);
    }

    async invalidateTag(tag) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length === 0) return;

        const pipeline = this.redis.pipeline();
        for (const key of keys) {
            pipeline.del(key);
        }
        pipeline.del(`tag:${tag}`);
        await pipeline.exec();
    }

    async getOrSet(key, fetchFn, ttl = this.defaultTTL, tags = []) {
        const cached = await this.get(key);
        if (cached) return { data: cached, source: "cache" };

        const fresh = await fetchFn();
        await this.set(key, fresh, ttl, tags);
        return { data: fresh, source: "database" };
    }

    async flush() {
        await this.redis.flushdb();
    }
}

const cache = new CacheManager();

app.get("/api/articles/:id", async (req, res) => {
    const result = await cache.getOrSet(
        `article:${req.params.id}`,
        () => fetchArticle(req.params.id),
        600,
        ["articles"]
    );
    res.json(result);
});

app.put("/api/articles/:id", async (req, res) => {
    await cache.invalidateTag("articles");
    res.json({ message: "Cache invalidated" });
});
```

## Explicación

El patrón cache-aside funciona revisando la caché antes de ir a la base de datos. Si los datos están en la caché, se retornan. Si no, se buscan desde la base de datos, se almacenan en caché con un TTL y se retornan. Es el patrón más común porque es simple y maneja los cache misses elegantemente.

Conceptos clave:

- **TTL (Time to Live)**: Cada key cacheada tiene una expiración. Después de TTL segundos, la key se elimina automáticamente de Redis. Esto previene que los datos stale persistan indefinidamente.
- **Invalidación por tags**: Cuando los datos cambian, necesitas invalidar las entradas de caché relacionadas. Los tags agrupan keys de caché para que puedas invalidarlas en lote. Por ejemplo, tagguea todos los cachés relacionados con usuarios con `users` e invalida todos a la vez.
- **Stale-while-revalidate**: Sirve datos stale inmediatamente mientras se buscan datos frescos en background. Esto mantiene los tiempos de respuesta rápidos incluso cuando la caché expira.
- **Pipeline**: Los pipelines de Redis batchean múltiples comandos en un solo round-trip, reduciendo latencia.
- **Invalidación pub/sub**: En deployments multi-instancia, cada instancia puede tener una caché local en memoria. Redis pub/sub transmite eventos de invalidación para que todas las instancias se mantengan consistentes.

## Variantes

| Patrón | Estrategia | Usar Cuando |
|--------|-----------|-------------|
| Cache-aside | Revisar caché, luego DB | Propósito general, más común |
| Write-through | Escribir a caché y DB simultáneamente | Los datos deben ser siempre consistentes |
| Write-behind | Escribir a caché, async a DB | Alta throughput de escritura, tolerar leve delay |
| Stale-while-revalidate | Servir stale, refrescar en background | Baja latencia, tolerar algo de staleness |
| Multi-level | L1 memoria + L2 Redis | Máxima performance, distribuido |

## Pautas

- Setea TTLs que coincidan con la frecuencia de cambio de los datos. Perfiles de usuario: 5 minutos. Catálogos: 1 hora. Config estática: 24 horas.
- Usa pipelines para operaciones en lote y reducir round-trips.
- Tagguea entradas de caché relacionadas para invalidación eficiente en lote.
- Siempre maneja fallos de caché elegantemente. Si Redis está caído, fall back a la base de datos.
- Monitorea el cache hit rate. Menos de 80% significa que tu TTL es muy corto o tus keys demasiado granulares.
- Usa naming consistente: `entity:id` o `api:path`.
- Evita cachear datos personalizados sin incluir el user ID en la key de caché.

## Errores Comunes

- No setear TTL. Los datos cacheados viven para siempre y se vuelven stale.
- Usar la misma key de caché para diferentes usuarios. El Usuario A ve los datos del Usuario B.
- No manejar fallos de conexión a Redis. La app se cae cuando Redis está down.
- Cachear demasiado agresivamente. Los datos que cambian frecuentemente se vuelven stale antes de expirar.
- No invalidar la caché en escrituras. Los usuarios ven datos viejos después de actualizar.
- Almacenar objetos grandes en caché. Redis es in-memory. Los valores grandes consumen RAM rápidamente.

## Preguntas Frecuentes

### ¿Cómo elijo el TTL correcto?

Matchea el TTL a la frecuencia de cambio de los datos. Si los datos cambian cada 5 minutos, setea TTL a 300 segundos. Si cambian cada hora, setea TTL a 3600. Para stale-while-revalidate, setea un fresh TTL corto (60s) y un stale TTL más largo (300s).

### ¿Debo cachear a nivel aplicación o usar un CDN?

Los CDN cachean assets estáticos y respuestas en edge locations. El caching de aplicación con Redis cachea datos computados y resultados de base de datos. Usa ambos: CDN para contenido estático, Redis para respuestas dinámicas de API.

### ¿Cómo prevengo cache stampede (thundering herd)?

Cuando una key popular expira, muchas peticiones golpean la base de datos simultáneamente. Usa un lock para permitir que solo una petición haga el fetch:

```javascript
async function getOrSetWithLock(key, fetchFn, ttl) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const lockKey = `lock:${key}`;
    const acquired = await redis.set(lockKey, "1", "EX", 10, "NX");

    if (!acquired) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return getOrSetWithLock(key, fetchFn, ttl);
    }

    try {
        const fresh = await fetchFn();
        await redis.setex(key, ttl, JSON.stringify(fresh));
        return fresh;
    } finally {
        await redis.del(lockKey);
    }
}
```

### ¿Cómo mido el cache hit rate?

Trackea hits y misses en tu aplicación:

```javascript
let cacheHits = 0;
let cacheMisses = 0;

async function getOrSet(key, fetchFn, ttl) {
    const cached = await redis.get(key);
    if (cached) {
        cacheHits++;
        return JSON.parse(cached);
    }
    cacheMisses++;
    const fresh = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(fresh));
    return fresh;
}

function getHitRate() {
    const total = cacheHits + cacheMisses;
    return total > 0 ? (cacheHits / total * 100).toFixed(1) + "%" : "N/A";
}
```
