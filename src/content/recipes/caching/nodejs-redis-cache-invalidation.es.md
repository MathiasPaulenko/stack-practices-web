---





contentType: recipes
slug: nodejs-redis-cache-invalidation
title: "Implementar Invalidation de Cache Redis en Node.js"
description: "Invalida entradas de cache Redis en Node.js con expiracion TTL, eliminacion explicita, limpieza por patron e invalidacion distribuida con pub/sub."
metaDescription: "Invalida cache Redis en Node.js con TTL, delete explicito, SCAN+DEL por patron, e invalidacion distribuida con pub/sub para multiples instancias."
difficulty: intermediate
topics:
  - caching
  - performance
  - api
tags:
  - nodejs
  - redis
  - cache-invalidation
  - pub-sub
  - caching
relatedResources:
  - /recipes/python-redis-cache-decorator
  - /recipes/nginx-reverse-proxy-cache
  - /guides/complete-guide-api-versioning-strategies
  - /recipes/java-spring-cache-annotations
  - /recipes/python-httpx-cache-responses
  - /patterns/write-through-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Invalida cache Redis en Node.js con TTL, delete explicito, SCAN+DEL por patron, e invalidacion distribuida con pub/sub para multiples instancias."
  keywords:
    - nodejs redis cache invalidation
    - redis cache delete
    - cache invalidation strategies
    - redis pub/sub invalidation
    - redis scan pattern





---

## Descripcion general

La invalidacion de cache es la parte dificil del caching. Redis ofrece varias estrategias: expiracion por TTL (automatica), eliminacion explicita (manual), limpieza por patron (SCAN + DEL), e invalidacion distribuida con pub/sub (notificar a otras instancias). A continuacion: implementar cada estrategia en Node.js con `ioredis`, manejar casos edge y elegir el enfoque correcto por caso de uso.

## Cuando Usar Esto


- For alternatives, see [Use Spring Cache Annotations with Redis Backend](/es/recipes/java-spring-cache-annotations/).

- Cualquier aplicacion Node.js que usa Redis como capa de cache
- Cuando los datos cacheados cambian y deben prevenirse lecturas stale
- Despliegues multi-instancia donde la invalidacion de una instancia debe propagarse a otras
- Limpieza de cache por patron despues de actualizaciones masivas de datos

## Prerrequisitos

- Node.js 18+
- Redis 6+
- Paquete `ioredis`

## Solucion

### 1. Instalar ioredis

```bash
npm install ioredis
```

### 2. Invalidacion por TTL (Automatica)

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

// Set con TTL — Redis auto-expira la clave
async function cacheProduct(product) {
  await redis.set(
    `product:${product.id}`,
    JSON.stringify(product),
    'EX', 300 // 5 minutos
  );
}

async function getProduct(id) {
  const data = await redis.get(`product:${id}`);
  return data ? JSON.parse(data) : null;
}

// Redis remueve automaticamente la clave despues de 300 segundos.
// No se necesita invalidacion manual — pero existen datos stale hasta el expiry.
```

### 3. Eliminacion Explicita (Manual)

```javascript
// Eliminar una sola clave despues de que cambian los datos
async function updateProduct(productId, updates) {
  const product = await db.product.update(productId, updates);

  // Invalidar cache
  await redis.del(`product:${productId}`);

  // Opcionalmente re-poblar cache con datos frescos
  await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 300);

  return product;
}

// Eliminar multiples claves a la vez
async function deleteProducts(productIds) {
  const keys = productIds.map(id => `product:${id}`);
  const deleted = await redis.del(...keys);
  console.log(`Deleted ${deleted} cache entries`);
}
```

### 4. Invalidacion por Patron (SCAN + DEL)

Cuando necesitas limpiar todas las claves que coinciden con un patron (ej., todas las entradas de cache de productos):

```javascript
async function invalidatePattern(pattern) {
  const stream = redis.scanStream({
    match: pattern,
    count: 100, // Escanear 100 claves por lote
  });

  const pipeline = redis.pipeline();
  let deletedCount = 0;

  for await (const keys of stream) {
    if (keys.length > 0) {
      pipeline.del(...keys);
      deletedCount += keys.length;
    }
  }

  await pipeline.exec();
  console.log(`Deleted ${deletedCount} keys matching ${pattern}`);
}

// Uso: limpiar todas las entradas de cache de productos
await invalidatePattern('product:*');

// Limpiar todos los productos en una categoria especifica
await invalidatePattern('product:category:electronics:*');
```

### 5. Eliminacion Masiva con Pipeline

Para invalidacion a gran escala, agrupa comandos DEL en un pipeline:

```javascript
async function bulkInvalidate(prefix, batchSize = 1000) {
  let cursor = '0';
  let totalDeleted = 0;

  do {
    // SCAN retorna [cursor, keys[]]
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH', `${prefix}*`,
      'COUNT', batchSize
    );

    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
    }

    cursor = nextCursor;
  } while (cursor !== '0');

  console.log(`Bulk invalidation: deleted ${totalDeleted} keys with prefix ${prefix}`);
  return totalDeleted;
}
```

### 6. Invalidacion Distribuida con Pub/Sub

Cuando ejecutas multiples instancias Node.js, el `redis.del()` de una instancia no notifica a las otras. Usa pub/sub para transmitir eventos de invalidacion:

```javascript
// Publisher de invalidacion de cache (en la instancia que hizo el cambio)
const invalidationChannel = 'cache:invalidate';

async function updateProductAndNotify(productId, updates) {
  const product = await db.product.update(productId, updates);

  // Eliminar entrada de cache local
  await redis.del(`product:${productId}`);

  // Notificar a todas las otras instancias para invalidar
  await redis.publish(invalidationChannel, JSON.stringify({
    type: 'delete',
    keys: [`product:${productId}`],
    timestamp: Date.now(),
  }));

  return product;
}

// Subscriber de invalidacion de cache (en cada instancia)
const subscriber = new Redis({ host: 'localhost', port: 6379 });

subscriber.subscribe(invalidationChannel);

subscriber.on('message', (channel, message) => {
  if (channel !== invalidationChannel) return;

  const event = JSON.parse(message);

  switch (event.type) {
    case 'delete':
      event.keys.forEach(key => {
        localCache.delete(key); // Limpiar cache L1 en memoria
      });
      break;

    case 'pattern':
      // Limpiar todas las claves que coinciden del cache local
      for (const key of localCache.keys()) {
        if (key.startsWith(event.prefix)) {
          localCache.delete(key);
        }
      }
      break;

    case 'flush':
      localCache.clear();
      break;
  }
});
```

### 7. Invalidacion Write-Through

Actualizar cache inmediatamente en write — sin ventana stale:

```javascript
async function writeThroughUpdate(productId, updates) {
  // Actualizar base de datos
  const product = await db.product.update(productId, updates);

  // Sobrescribir cache con datos frescos
  await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 300);

  return product;
}

async function writeThroughDelete(productId) {
  await db.product.delete(productId);
  await redis.del(`product:${productId}`);
}
```

### 8. Cache-Aside con Lock (Prevenir Stampede)

Cuando una entrada de cache expira, prevenir que multiples peticiones hitting la base de datos simultaneamente:

```javascript
async function getProductWithLock(productId) {
  const cacheKey = `product:${productId}`;
  const lockKey = `lock:${cacheKey}`;

  // Intentar cache primero
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Intentar adquirir lock
  const lockAcquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  if (lockAcquired) {
    try {
      // Esta instancia obtiene de DB y popula cache
      const product = await db.product.findById(productId);
      if (product) {
        await redis.set(cacheKey, JSON.stringify(product), 'EX', 300);
      }
      return product;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Otra instancia esta obteniendo — esperar y reintentar
    await new Promise(resolve => setTimeout(resolve, 100));
    return getProductWithLock(productId);
  }
}
```

## Como Funciona

1. **Expiracion TTL**: Redis adjunta un timestamp a cada clave con el flag `EX`. Un proceso en background verifica claves expiradas y las remueve. La clave puede persistir brevemente despues del expiry hasta que el ciclo de expiry activo de Redis la encuentre.
2. **Comando DEL**: `redis.del(key)` remueve claves inmediatamente. Se pueden pasar multiples claves a una sola llamada DEL para eficiencia.
3. **Eliminacion por patron con SCAN**: `SCAN` itera el keyspace en lotes sin bloquear Redis (a diferencia de `KEYS *`). Cada lote retorna un cursor para la siguiente iteracion. Combinar con `DEL` en un pipeline para eliminacion masiva.
4. **Invalidacion pub/sub**: Una instancia publica un evento de invalidacion. Todos los subscribers lo reciben y limpian su cache L1 local. Redis pub/sub es fire-and-forget — sin persistencia, sin acknowledgment.
5. **Prevencion de cache stampede**: Un lock de Redis (`SET key NX EX timeout`) asegura que solo una instancia obtiene de la base de datos en cache miss. Otras esperan y reintentan.

## Variantes

### Invalidacion Lazy (Soft Delete)

Marcar entradas de cache como stale en lugar de eliminarlas:

```javascript
async function softInvalidate(productId) {
  // Setear un flag de que la siguiente lectura debe refrescar
  await redis.set(`stale:product:${productId}`, '1', 'EX', 60);
}

async function getProduct(productId) {
  const isStale = await redis.exists(`stale:product:${productId}`);
  if (isStale) {
    // Forzar refresco desde DB
    const product = await db.product.findById(productId);
    await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 300);
    await redis.del(`stale:product:${productId}`);
    return product;
  }
  // Lectura normal de cache
  const cached = await redis.get(`product:${productId}`);
  return cached ? JSON.parse(cached) : null;
}
```

### Claves de Cache Versionadas

Incrementar un numero de version para invalidar todas las entradas en un namespace:

```javascript
async function getProduct(productId) {
  const version = await redis.get('product_cache_version') || '1';
  const key = `product:v${version}:${productId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const product = await db.product.findById(productId);
  await redis.set(key, JSON.stringify(product), 'EX', 300);
  return product;
}

async function invalidateAllProducts() {
  // Incrementar version — todas las claves viejas se vuelven invisibles
  await redis.incr('product_cache_version');
}
```

### TTL Jitter

Prevenir cache stampedes causados por expiracion sincronizada:

```javascript
async function cacheWithJitter(key, value, baseTTL = 300) {
  // Agregar jitter aleatorio de 0-60 segundos
  const jitter = Math.floor(Math.random() * 60);
  await redis.set(key, JSON.stringify(value), 'EX', baseTTL + jitter);
}
```

## Mejores Practicas

- **Usar TTL como red de seguridad**: Incluso con invalidacion explicita, siempre establece un TTL. Si olvidas invalidar, el cache se auto-repara.
- **Preferir eliminacion explicita sobre TTLs cortos**: TTLs cortos causan cache misses innecesarios. Establece TTLs mas largos e invalida explicitamente en cambios de datos.
- **Usar SCAN, no KEYS**: `KEYS *` bloquea Redis durante toda la duracion del scan. `SCAN` es non-blocking y seguro para produccion.
- **Agrupar DEL en pipelines**: Eliminar 10,000 claves una por una es lento. Usa `redis.pipeline().del(...keys).exec()`.
- **Usar pub/sub para multi-instancia**: Un solo `redis.del()` no limpia los caches L1 de otras instancias. Transmite eventos de invalidacion.
- **Agregar TTL jitter**: Previene expiracion sincronizada causando cache stampedes cuando muchas claves expiran simultaneamente.

## Errores Comunes

- **Usar `KEYS *` en produccion**: Bloquea Redis por segundos o minutos en datasets grandes. Usa `SCAN` en su lugar.
- **Sin TTL como fallback**: Si la invalidacion explicita falla (bug, excepcion), los datos stale persisten para siempre. Siempre establece un TTL.
- **Invalidar demasiado ampliamente**: `invalidatePattern('product:*')` limpia todos los productos cuando solo uno cambio. Elimina claves especificas en su lugar.
- **No manejar desconexiones pub/sub**: Si un subscriber pierde conexion, pierde eventos de invalidacion. Implementa logica de reconexion y refrescos periodicos de cache.
- **Race condition en cache-aside**: Entre `get` (miss) y `set`, otra peticion puede haber ya obtenido y cacheado. Usa un lock para prevenir stampedes.

## FAQ

**TTL vs invalidacion explicita — cual deberia usar?**

Ambos. Usa TTL como red de seguridad (ej., 5 minutos) y eliminacion explicita para invalidacion inmediata en cambios de datos. TTL maneja casos edge donde la invalidacion explicita falla.

**Como difiere Redis pub/sub de Redis Streams para invalidacion de cache?**

Pub/sub es fire-and-forget — si un subscriber esta offline, pierde el evento. Streams persiste mensajes, por lo que los subscribers offline pueden ponerse al dia. Usa pub/sub para invalidacion simple, streams para entrega garantizada.

**Cual es la diferencia entre DEL y UNLINK?**

`DEL` es sincrono — Redis bloquea mientras libera memoria. `UNLINK` remueve la clave del keyspace inmediatamente pero libera memoria asincronamente en un thread en background. Usa `UNLINK` para valores grandes.

**Como invalido cache entre multiples instancias Redis?**

Si usas Redis Cluster, pub/sub transmite entre todos los nodos. Para instancias Redis separadas, cada instancia necesita su propio canal pub/sub, o usa un message broker dedicado (RabbitMQ, Kafka) para invalidacion entre instancias.

**Puedo usar scripts Lua de Redis para invalidacion atomica?**

Si. Un script Lua puede verificar una condicion y eliminar claves atomicamente. Esto es util para invalidacion compare-and-swap donde solo eliminas si el valor cacheado coincide con una version especifica.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
