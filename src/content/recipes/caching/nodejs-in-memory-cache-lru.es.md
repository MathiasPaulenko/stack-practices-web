---
contentType: recipes
slug: nodejs-in-memory-cache-lru
title: "Implementar una cache LRU en Node.js"
description: "Construye una cache least-recently-used en Node.js con operaciones get y set O(1) usando un Map y lista doblemente enlazada"
metaDescription: "Implementa una cache LRU en Node.js con operaciones O(1). Usa Map para almacenamiento de claves y seguimiento de orden de eviccion."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - nodejs
  - lru cache
  - in-memory cache
  - caching
  - performance
relatedResources:
  - /recipes/caching/caching-redis
  - /recipes/caching/python-redis-cache-decorator
  - /patterns/caching/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa una cache LRU en Node.js con operaciones O(1). Usa Map para almacenamiento de claves y seguimiento de orden de eviccion."
  keywords:
    - nodejs lru cache
    - lru cache implementation
    - in-memory cache nodejs
    - least recently used
    - nodejs caching
---

# Implementar una cache LRU en Node.js

Una cache LRU (Least Recently Used) evicta la entrada accedida mas antigua cuando alcanza su capacidad. Esto mantiene datos calientes en memoria mientras limita el uso de memoria. El `Map` de JavaScript preserva el orden de insercion, lo que lo hace ideal para LRU — re-insertar una clave la mueve al final, por lo que la primera entrada es siempre la menos recientemente usada.

## Cuando Usar Esto

- Cachear computaciones costosas o consultas a base de datos dentro de un solo proceso
- Rate limiting o deduplicacion donde entradas viejas deben expirar primero
- Escenarios donde Redis es excesivo pero `Map` solo carece de eviccion

## Requisitos Previos

- Node.js 18+
- Sin dependencias externas requeridas

## Solucion

### 1. Implementar la cache LRU

```typescript
// lru-cache.ts
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("Capacity must be positive");
    }
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}
```

### 2. Agregar soporte TTL

```typescript
// lru-cache-ttl.ts
interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly capacity: number;
  private readonly defaultTtl: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(capacity: number, defaultTtl: number = 300_000) {
    this.capacity = capacity;
    this.defaultTtl = defaultTtl;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttl: number = this.defaultTtl): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  startCleanup(interval: number = 60_000): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), interval);
    this.cleanupTimer.unref();
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      } else {
        break;
      }
    }
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 3. Usar la cache

```typescript
// usage.ts
import { LRUCache } from './lru-cache';

const cache = new LRUCache<string, any>(100);

cache.set("user:1", { id: 1, name: "Alice" });
cache.set("user:2", { id: 2, name: "Bob" });

console.log(cache.get("user:1")); // { id: 1, name: "Alice" }
console.log(cache.size); // 2

// Agregar mas alla de la capacidad evicta el menos recientemente usado
for (let i = 3; i <= 101; i++) {
  cache.set(`user:${i}`, { id: i });
}

console.log(cache.has("user:2")); // false — evicted
console.log(cache.has("user:1")); // true — accedido recientemente
```

### 4. Envolver una funcion con caching

```typescript
// memoize.ts
import { LRUCache } from './lru-cache';

export function memoize<Args extends any[], R>(
  fn: (...args: Args) => R,
  capacity: number = 100,
  keyFn: (...args: Args) => string = (...args) => JSON.stringify(args),
): (...args: Args) => R {
  const cache = new LRUCache<string, R>(capacity);

  return (...args: Args): R => {
    const key = keyFn(...args);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Uso
const expensiveCompute = memoize(
  (n: number) => {
    console.log(`Computing for ${n}...`);
    return n * n;
  },
  50,
);

expensiveCompute(5); // "Computing for 5..." -> 25
expensiveCompute(5); // 25 (desde cache)
```

## Como Funciona

1. **`Map` preserva el orden de insercion** — las claves se iteran en el orden en que se agregaron. `delete` + `set` mueve una clave al final (mas recientemente usada).
2. **Eviccion** — cuando `size >= capacity`, la primera clave de `keys().next()` es la menos recientemente usada. Eliminala antes de insertar la nueva entrada.
3. **Entradas TTL** envuelven valores con un timestamp `expiresAt`. `get` verifica la expiracion y elimina entradas obsoletas al acceder.
4. **`unref()` en el timer de limpieza** evita que el timer mantenga vivo el proceso de Node.js.

## Variantes

### Cache LRU asincrona

Para cachear operaciones asincronas (llamadas a API, consultas DB):

```typescript
export class AsyncLRUCache<K, V> {
  private cache: Map<K, { promise: Promise<V>; expiresAt: number }>;
  private readonly capacity: number;
  private readonly ttl: number;

  constructor(capacity: number, ttl: number = 300_000) {
    this.capacity = capacity;
    this.ttl = ttl;
    this.cache = new Map();
  }

  async get(key: K, loader: () => Promise<V>): Promise<V> {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.promise;
    }

    const promise = loader();
    this.cache.set(key, { promise, expiresAt: Date.now() + this.ttl });

    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }

    return promise;
  }
}
```

### Usar el paquete lru-cache

Para uso en produccion, el paquete npm `lru-cache` esta bien probado y rico en features:

```bash
npm install lru-cache
```

```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 300_000,
  updateAgeOnGet: true,
  dispose: (value, key, reason) => {
    console.log(`Evicted ${key}: ${reason}`);
  },
});
```

## Mejores Practicas

- **Establece una capacidad razonable** — muy grande desperdicia memoria, muy pequena causa evicciones frecuentes
- **Usa TTL para datos propensos a obsolescencia** — combina eviccion LRU con expiracion TTL para lo mejor de ambos mundos
- **Llama `unref()` en timers** — los timers de limpieza no deben impedir la salida del proceso
- **Mide el hit rate** — un hit rate bajo significa que la cache es demasiado pequena o el patron de acceso no es repetible

## Errores Comunes

- **No eliminar antes de re-setear** — `Map.set` en una clave existente actualiza el valor pero NO cambia el orden de iteracion; debes hacer `delete` primero
- **Almacenar objetos grandes** — la cache mantiene referencias; los objetos grandes permanecen en memoria hasta ser evicted
- **Usar LRU entre procesos** — las caches en memoria son por proceso; usa Redis para cache compartida
- **Olvidar manejar valores `undefined`** — si una funcion retorna legitimo `undefined`, la cache no puede distinguir entre "miss" y "undefined cacheado"

## FAQ

**Q: Cual es la complejidad temporal de get y set?**
A: O(1). Las operaciones de `Map` son de tiempo constante, y `delete` + `set` para reordenar tambien es O(1).

**Q: Debo usar esto o el paquete npm `lru-cache`?**
A: Usa el paquete npm para produccion — maneja casos extremos, tiene callbacks `dispose` y soporta TTL con eviccion perezosa.

**Q: Puedo usar WeakMap en lugar de Map?**
A: No. WeakMap no soporta iteracion, que es requerida para la eviccion LRU.

**Q: Como monitoreo el hit rate de la cache?**
A: Rastrea hits y misses en `get`: incrementa un contador y registra el ratio periodicamente.
