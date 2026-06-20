---
contentType: recipes
slug: redis-cache-patterns
title: "Patrones de Cache de Redis para Aplicaciones de Alto Rendimiento"
description: "Como implementar patrones cache-aside, write-through y write-behind con Redis para reducir carga de base de datos y mejorar tiempos de respuesta"
metaDescription: "Patrones de cache de Redis para apps de alto rendimiento. Implementa cache-aside, write-through y write-behind para reducir carga de base de datos y mejorar latencia."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - redis
  - cache
  - database
  - performance
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/connection-pooling
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patrones de cache de Redis para apps de alto rendimiento. Implementa cache-aside, write-through y write-behind para reducir carga de base de datos y mejorar latencia."
  keywords:
    - redis
    - caching patterns
    - cache-aside
    - write-through
    - performance
---

# Patrones de Cache de Redis para Aplicaciones de Alto Rendimiento

Redis es un almacen de estructuras de datos en memoria que sirve como una capa de cache extremadamente rapida entre tu aplicacion y la base de datos persistente. Elegir el patron de cache correcto — cache-aside, write-through o write-behind — determina como tu aplicacion maneja cache misses, consistencia y escenarios de fallo.

## Cuando Usar Esto

- Las consultas a base de datos son lentas y devuelven datos frecuentemente accedidos. Consulta [Query Optimization](/recipes/databases/postgres-query-optimization) para ajustar queries lentos.
- Necesitas reducir carga en bases de datos primarias durante picos de trafico. Consulta [Rate Limiting](/recipes/api/rate-limiting) para control de tráfico.
- La temporal staleness de datos es aceptable a cambio de menor latencia

## Requisitos Previos

- Servidor Redis ejecutandose localmente o via servicio administrado
- Una libreria cliente como `ioredis` o `redis` para Node.js

## Solucion

### 1. Cache-Aside (Lazy Loading)

La aplicacion revisa el cache primero. En un miss, carga desde la base de datos y pobla el cache.

```typescript
// cache/CacheAside.ts
import Redis from 'ioredis';

class CacheAsideProductRepository {
  private redis = new Redis();
  private ttl = 300; // 5 minutos

  async getProduct(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;
    
    // Revisar cache primero
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss: cargar desde base de datos
    const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) return null;

    // Poblar cache
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
    // Invalidar cache para prevenir lecturas stale
    await this.redis.del(`product:${id}`);
  }
}
```

### 2. Write-Through

Los datos se escriben tanto al cache como a la base de datos simultaneamente. El cache siempre tiene los datos mas recientes.

```typescript
// cache/WriteThrough.ts
class WriteThroughProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Iniciar transaccion de base de datos. Consulta [Database Transactions](/recipes/databases/database-transactions) para patrones ACID.
    await this.db.query('BEGIN');
    try {
      await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
      
      // Escribir al cache dentro de la misma operacion logica
      const updated = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(updated));
      
      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
```

### 3. Write-Behind (Write-Back)

Los datos se escriben primero al cache y se flushean asincronicamente a la base de datos. Mayor rendimiento pero mas riesgoso.

```typescript
// cache/WriteBehind.ts
class WriteBehindProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Escribir al cache inmediatamente
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));

    // Encolar para persistencia async
    await this.redis.lpush('pending_writes', JSON.stringify({ id, data, timestamp: Date.now() }));
  }
}

// Worker en background. Consulta [Batch Processing](/recipes/data/batch-processing-patterns) para patrones de jobs.
async function flushPendingWrites() {
  const batch = await redis.lpop('pending_writes', 100);
  if (!batch) return;

  const writes = batch.map(item => JSON.parse(item));
  
  await db.query('BEGIN');
  try {
    for (const write of writes) {
      await db.query('UPDATE products SET ... WHERE id = $1', [write.id]);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    // Re-encolar escrituras fallidas
    for (const write of writes) {
      await redis.rpush('pending_writes', JSON.stringify(write));
    }
  }
}

// Ejecutar cada 5 segundos
setInterval(flushPendingWrites, 5000);
```

### 4. Prevencion de Cache Stampede

```typescript
// cache/StampedeProtection.ts
class StampedeProtectedCache {
  async getProduct(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;
    const lockKey = `lock:${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Intentar adquirir lock
    const lock = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (lock) {
      // Ganamos la carrera; cargar desde DB
      const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
      await this.redis.del(lockKey);
      return product;
    }

    // Esperar a que el ganador pobla el cache
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getProduct(id);
  }
}
```

## Como Funciona

1. **Cache-Aside** minimiza escrituras de cache pero permite breves datos stale despues de actualizaciones
2. **Write-Through** garantiza consistencia al costo de mayor latencia de escritura
3. **Write-Behind** maximiza throughput pero riesga perdida de datos si el cache falla antes del flush
4. **Stampede Protection** previene multiples consultas simultaneas a base de datos en expiracion de cache

## Consideraciones de Produccion

- Usa **Redis Cluster** o **Redis Sentinel** para alta disponibilidad
- Implementa logica de **[circuit breaker](/patterns/design/circuit-breaker-pattern)** cuando Redis no esta disponible; fallback a base de datos
- Configura **valores de TTL** apropiados basados en frecuencia de cambio de datos
- Monitorea **cache hit ratio** con `INFO stats` y ajusta TTL en consecuencia

## Errores Comunes

- No manejar fallos de conexion a Redis gracefulmente
- Usar el mismo TTL para todos los tipos de datos sin importar frecuencia de cambio
- Olvidar invalidar entradas de cache relacionadas en actualizaciones

## FAQ

**P: Cual patron deberia usar?**
R: Cache-aside para cargas de lectura intensiva. Write-through cuando la consistencia es critica. Write-behind solo cuando puedes tolerar breve perdida de datos.

**P: Como manejo invalidacion de cache entre multiples servicios?**
R: Usa Redis Pub/Sub o una cola de mensajes para broadcast de eventos de invalidacion a todas las instancias de servicio.

**P: Deberia comprimir datos cacheados?**
R: Para objetos grandes (>1KB), si. Usa `msgpack` o compresion JSON para reducir uso de memoria y transferencia de red.
