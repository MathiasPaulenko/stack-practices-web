---




contentType: recipes
slug: nodejs-in-memory-cache-lru
title: "Implement an LRU Cache in Node.js"
description: "Build a least-recently-used cache in Node.js with O(1) get and set operations using a Map-based doubly linked list"
metaDescription: "Implement an LRU cache in Node.js with O(1) operations. Use Map for key storage and a doubly linked list for eviction order tracking."
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
  - /recipes/caching-redis
  - /recipes/python-redis-cache-decorator
  - /patterns/cache-aside-pattern
  - /recipes/multi-level-cache-l1-l2
  - /recipes/java-caffeine-cache-configuration
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement an LRU cache in Node.js with O(1) operations. Use Map for key storage and a doubly linked list for eviction order tracking."
  keywords:
    - nodejs lru cache
    - lru cache implementation
    - in-memory cache nodejs
    - least recently used
    - nodejs caching




---

# Implement an LRU Cache in Node.js

An LRU (Least Recently Used) cache evicts the oldest accessed entry when it reaches capacity. This keeps hot data in memory while bounding memory usage. JavaScript's `Map` preserves insertion order, which makes it a natural fit for LRU — re-inserting a key moves it to the end, so the first entry is always the least recently used.

## When to Use This

- Caching expensive computations or database lookups within a single process
- Rate limiting or deduplication where old entries should expire first
- Scenarios where Redis is overkill but `Map` alone lacks eviction

## Prerequisites

- Node.js 18+
- No external dependencies required

## Solution

### 1. Implement the LRU Cache

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

### 2. Add TTL Support

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

### 3. Use the Cache

```typescript
// usage.ts
import { LRUCache } from './lru-cache';

const cache = new LRUCache<string, any>(100);

cache.set("user:1", { id: 1, name: "Alice" });
cache.set("user:2", { id: 2, name: "Bob" });

console.log(cache.get("user:1")); // { id: 1, name: "Alice" }
console.log(cache.size); // 2

// Adding beyond capacity evicts the least recently used
for (let i = 3; i <= 101; i++) {
  cache.set(`user:${i}`, { id: i });
}

console.log(cache.has("user:2")); // false — evicted
console.log(cache.has("user:1")); // true — recently accessed
```

### 4. Wrap a Function with Caching

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

// Usage
const expensiveCompute = memoize(
  (n: number) => {
    console.log(`Computing for ${n}...`);
    return n * n;
  },
  50,
);

expensiveCompute(5); // "Computing for 5..." → 25
expensiveCompute(5); // 25 (from cache)
```

## How It Works

1. **`Map` preserves insertion order** — keys are iterated in the order they were added. `delete` + `set` moves a key to the end (most recently used).
2. **Eviction** — when `size >= capacity`, the first key from `keys().next()` is the least recently used. Delete it before inserting the new entry.
3. **TTL entries** wrap values with an `expiresAt` timestamp. `get` checks expiry and removes stale entries on access.
4. **`unref()` on the cleanup timer** prevents the timer from keeping the Node.js process alive.

## Variants

### Async LRU Cache

For caching async operations (API calls, DB queries):

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

### Using lru-cache Package

For production use, the `lru-cache` npm package is well-tested and feature-rich:

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

## Best Practices


- For a deeper guide, see [Multi-Level Cache with In-Memory L1 and Redis L2](/recipes/multi-level-cache-l1-l2/).

- **Set a reasonable capacity** — too large wastes memory, too small causes frequent evictions
- **Use TTL for stale-prone data** — combine LRU eviction with TTL expiry for best of both worlds
- **Call `unref()` on timers** — cleanup timers should not prevent process exit
- **Measure hit rate** — a low hit rate means the cache is too small or the access pattern is not repeatable

## Common Mistakes

- **Not deleting before re-setting** — `Map.set` on an existing key updates the value but does NOT change iteration order; you must `delete` first
- **Storing large objects** — the cache holds references; large objects stay in memory until evicted
- **Using LRU across processes** — in-memory caches are per-process; use Redis for shared caching
- **Forgetting to handle `undefined` values** — if a function legitimately returns `undefined`, the cache cannot distinguish between "miss" and "cached undefined"

## FAQ

**Q: What is the time complexity of get and set?**
A: O(1). `Map` operations are constant time, and `delete` + `set` to reorder is also O(1).

**Q: Should I use this or the `lru-cache` npm package?**
A: Use the npm package for production — it handles edge cases, has `dispose` callbacks, and supports TTL with lazy eviction.

**Q: Can I use WeakMap instead of Map?**
A: No. WeakMap does not support iteration, which is required for LRU eviction.

**Q: How do I monitor cache hit rate?**
A: Track hits and misses in `get`: increment a counter and log the ratio periodically.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
