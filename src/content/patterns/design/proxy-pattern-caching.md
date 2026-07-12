---
contentType: patterns
slug: proxy-pattern-caching
title: "Proxy Pattern for API Response Caching"
description: "How to implement a caching proxy that intercepts API calls and stores responses to reduce latency and avoid redundant network requests"
metaDescription: "Implement a caching proxy pattern for API responses. Reduce latency, avoid redundant requests, and control cache invalidation with a clean wrapper."
difficulty: intermediate
topics:
  - design
  - performance
tags:
  - proxy
  - caching
  - performance
  - structural
  - design-pattern
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/adapter-pattern
  - /recipes/cache-invalidation
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement a caching proxy pattern for API responses. Reduce latency, avoid redundant requests, and control cache invalidation with a clean wrapper."
  keywords:
    - proxy pattern
    - caching proxy
    - api caching
    - structural pattern
    - response cache
---

# Proxy Pattern for API Response Caching

The [Proxy](/patterns/design/proxy-pattern) pattern intercepts access to an object to add behavior without changing the original implementation. When applied to API clients, it becomes a capable caching layer that stores responses, reduces latency, and shields downstream services from redundant requests.

## When to Use This

- API responses are expensive to compute but read frequently
- You want to avoid hitting rate limits on third-party APIs
- Response freshness can be controlled by TTL rather than real-time requirements

## Problem

Every call to an external API triggers a network request, serialization, and deserialization. For frequently accessed but slowly changing data — like currency rates, product catalogs, or user permissions — this is wasteful and slow.

## Solution

Implement a proxy that wraps the real API client and stores responses in a cache with configurable expiration.

```typescript
// api/WeatherClient.ts
interface WeatherClient {
  getForecast(city: string): Promise<Forecast>;
}

// api/OpenWeatherClient.ts
class OpenWeatherClient implements WeatherClient {
  async getForecast(city: string): Promise<Forecast> {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}`);
    return res.json();
  }
}

// proxy/CachedWeatherClient.ts
class CachedWeatherClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number }>();

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs });
    return data;
  }

  invalidate(city: string): void {
    this.cache.delete(city.toLowerCase());
  }
}
```

## Usage

```typescript
const realClient = new OpenWeatherClient();
const cachedClient = new CachedWeatherClient(realClient, 600_000);

const forecast = await cachedClient.getForecast('London');
```

## Variations

- **Redis Proxy**: Store cache in Redis for distributed systems
- **Smart Proxy**: Add metrics, logging, and circuit breaker alongside caching
- **Lazy Proxy**: Defer initialization of expensive connections until first use

## What Works

- Set TTL based on data volatility, not a fixed value for everything. See [cache invalidation](/patterns/design/cache-aside-pattern) patterns.
- Implement cache invalidation hooks for write-through consistency
- Use a decorator or composition to layer multiple proxies

## Common Mistakes

- Caching POST/PUT responses without understanding side effects
- Not handling cache eviction when memory pressure grows
- Returning stale data silently without logging
- Setting TTL too long for volatile data
- Not implementing cache size limits
- Caching sensitive data without encryption
- Ignoring cache warm-up time
- Not monitoring cache hit/miss ratios
- Using cache as primary storage instead of as optimization
- Not handling cache failures gracefully

## Advanced Techniques

### Multi-Level Caching

Implement a hierarchy of caches for different access patterns:

```typescript
class MultiLevelCachedClient implements WeatherClient {
  private l1Cache = new Map<string, { data: Forecast; expiry: number }>();
  private l2Cache = new Map<string, { data: Forecast; expiry: number }>();

  constructor(
    private client: WeatherClient,
    private l1TtlMs: number = 60_000,
    private l2TtlMs: number = 300_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();

    const l1Cached = this.l1Cache.get(key);
    if (l1Cached && l1Cached.expiry > Date.now()) {
      return l1Cached.data;
    }

    const l2Cached = this.l2Cache.get(key);
    if (l2Cached && l2Cached.expiry > Date.now()) {
      this.l1Cache.set(key, { data: l2Cached.data, expiry: Date.now() + this.l1TtlMs });
      return l2Cached.data;
    }

    const data = await this.client.getForecast(city);
    this.l1Cache.set(key, { data, expiry: Date.now() + this.l1TtlMs });
    this.l2Cache.set(key, { data, expiry: Date.now() + this.l2TtlMs });
    return data;
  }
}
```

### Cache with Metrics

Add observability to understand cache behavior:

```typescript
class MetricsCachedClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number }>();
  private hits = 0;
  private misses = 0;

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      this.hits++;
      return cached.data;
    }

    this.misses++;
    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs });
    return data;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }
}
```

### Cache with Size Limits (LRU)

Implement LRU eviction to prevent unbounded memory growth:

```typescript
class LRUCachedClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number }>();
  private accessOrder: string[] = [];

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000,
    private maxSize: number = 1000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      this.updateAccessOrder(key);
      return cached.data;
    }

    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs });
    this.updateAccessOrder(key);
    this.evictIfNeeded();
    return data;
  }

  private updateAccessOrder(key: string) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private evictIfNeeded() {
    while (this.cache.size > this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }
}
```

### Cache with Background Refresh

Refresh cache entries before they expire to prevent cold starts:

```typescript
class RefreshingCachedClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number; refreshing: boolean }>();

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000,
    private refreshBeforeExpiryMs: number = 60_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      if (cached.expiry - Date.now() < this.refreshBeforeExpiryMs && !cached.refreshing) {
        cached.refreshing = true;
        this.refreshInBackground(key, city);
      }
      return cached.data;
    }

    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs, refreshing: false });
    return data;
  }

  private async refreshInBackground(key: string, city: string) {
    try {
      const data = await this.client.getForecast(city);
      this.cache.set(key, { data, expiry: Date.now() + this.ttlMs, refreshing: false });
    } catch (error) {
      const cached = this.cache.get(key);
      if (cached) {
        cached.refreshing = false;
      }
    }
  }
}
```

## Best Practices

1. **Set appropriate TTL based on data volatility.** Use short TTL for frequently changing data and longer TTL for stable data. Never use a one-size-fits-all TTL.

2. **Implement cache size limits.** Unbounded caches can cause memory issues. Use LRU eviction or similar strategies to manage memory.

3. **Monitor cache performance.** Track hit rates, miss rates, and eviction patterns to optimize cache configuration.

4. **Handle cache failures gracefully.** If the cache fails, fall back to the original client rather than breaking the application.

5. **Document cache invalidation strategies.** Clearly document when and how cache entries should be invalidated.

6. **Use cache keys consistently.** Ensure cache keys are deterministic and include all relevant parameters.

7. **Consider cache warm-up.** Pre-populate cache with frequently accessed data to avoid cold starts.

8. **Implement cache metrics.** Add logging and metrics to understand cache behavior and identify issues.

9. **Don't cache POST/PUT/DELETE responses.** These operations have side effects and should not be cached without careful consideration.

10. **Encrypt sensitive cached data.** If caching sensitive information, ensure it's encrypted at rest.

## FAQ

**Q: How is this different from a simple wrapper function?**
A: The Proxy pattern implements the same interface as the real object, so callers do not know or care whether they are using the cache or the original client.

**Q: Can I combine this with the Decorator pattern?**
A: Yes. A [Decorator](/patterns/design/decorator-pattern) adds behavior; a Proxy controls access. They are often used together in practice.

**Q: How do I handle cache invalidation?**
A: Implement explicit invalidation methods for write-through consistency, or use TTL-based expiration for eventual consistency.

**Q: Should I use in-memory cache or distributed cache?**
A: Use in-memory cache for single-instance applications. Use distributed cache (Redis, Memcached) for multi-instance deployments.

**Q: How do I prevent cache stampede?**
A: Implement request coalescing or use cache locks to prevent multiple simultaneous requests for the same uncached data.

**Q: Can I cache POST requests?**
A: Generally no. POST requests have side effects and should not be cached unless you fully understand the implications.

**Q: How do I handle cache serialization?**
A: Use JSON serialization for simple objects. Consider MessagePack or Protocol Buffers for high-performance scenarios.

**Q: Should I cache errors?**
A: Cache errors with short TTL to prevent repeated failing requests from overwhelming downstream services.

**Q: How do I implement cache warming?**
A: Pre-populate cache during application startup or scheduled jobs to avoid cold starts for frequently accessed data.

**Q: Can I use this pattern with GraphQL?**
A: Yes. Implement caching at the resolver level or use DataLoader for batched caching.

**Q: How do I handle cache versioning?**
A: Include version information in cache keys to handle schema changes and prevent stale data issues.

**Q: Should I cache pagination results?**
A: Cache individual pages with short TTL, but avoid caching full result sets unless the data is stable.

**Q: How do I implement cache compression?**
A: Compress cached data before storage to reduce memory usage, especially for large payloads.

**Q: Can I use this pattern with WebSocket connections?**
A: Yes. Cache WebSocket connection states or message histories to improve reconnection performance.

**Q: How do I handle cache consistency across instances?**
A: Use distributed cache with pub/sub invalidation or implement cache invalidation messages.

**Q: Should I cache authentication tokens?**
A: Cache tokens with TTL matching their expiration time to reduce authentication overhead.

**Q: How do I implement cache staleness detection?**
A: Add metadata to cached entries (last modified, ETag) to detect staleness and trigger refreshes.

**Q: Can I use this pattern with file system operations?**
A: Yes. Cache file contents or metadata to reduce disk I/O for frequently accessed files.

**Q: How do I handle cache eviction policies?**
A: Implement LRU, LFU, or time-based eviction policies based on your access patterns and requirements.

**Q: Should I cache database query results?**
A: Cache query results with careful consideration of data volatility and invalidation strategies.

**Q: How do I implement cache backup and restore?**
A: Periodically dump cache state to persistent storage for disaster recovery scenarios.

**Q: Can I use this pattern with API rate limiting?**
A: Yes. Combine caching with rate limiting to reduce API calls and stay within rate limits.

**Q: How do I handle cache security?**
A: Implement access controls, encryption, and audit logging for cached sensitive data.

**Q: Should I cache API responses with authentication?**
A: Cache responses with user-specific cache keys to prevent unauthorized data access.

**Q: How do I implement cache monitoring and alerting?**
A: Monitor hit rates, eviction rates, and cache size. Set up alerts for abnormal patterns.

**Q: Can I use this pattern with microservices?**
A: Yes. Implement caching at service boundaries to reduce inter-service communication overhead.

**Q: How do I handle cache warm-up for new deployments?**
A: Implement gradual warm-up strategies to prevent cache stampedes during deployments.

**Q: Should I cache API responses with conditional requests?**
A: Use ETag and Last-Modified headers to implement conditional requests and reduce bandwidth.

**Q: How do I implement cache for streaming responses?**
A: Cache stream metadata or initial chunks, but avoid caching full streaming responses.

**Q: Can I use this pattern with GraphQL subscriptions?**
A: Cache subscription state or initial data to improve subscription initialization performance.

**Q: How do I handle cache for time-sensitive data?**
A: Use very short TTL or implement time-based invalidation for time-sensitive data like stock prices.

**Q: Should I cache API responses with pagination?**
A: Cache individual pages with appropriate TTL, but consider caching full result sets for stable data.

**Q: How do I implement cache for multi-tenant applications?**
A: Use tenant-specific cache keys to prevent data leakage between tenants.

**Q: Can I use this pattern with API gateways?**
A: Yes. Implement caching at the API gateway level to reduce load on backend services.

**Q: How do I handle cache for geo-distributed systems?**
A: Use edge caching or implement cache replication strategies for geo-distributed deployments.

**Q: Should I cache API responses with soft deletes?**
A: Implement cache invalidation on soft deletes or use short TTL to prevent serving deleted data.

**Q: How do I implement cache for API versioning?**
A: Include API version in cache keys to prevent version conflicts and ensure data consistency.

**Q: Can I use this pattern with GraphQL mutations?**
A: Generally avoid caching mutations. Cache only read operations that are idempotent and safe to cache.

**Q: How do I handle cache for API responses with conditional data?**
A: Include all conditional parameters in cache keys to ensure correct cache hits.

**Q: Should I cache API responses with user-specific data?**
A: Cache user-specific data with user-specific cache keys and appropriate security measures.

**Q: How do I implement cache for API responses with dynamic content?**
A: Use short TTL or implement cache invalidation based on content change events.

**Q: Can I use this pattern with API response compression?**
A: Yes. Compress cached responses to reduce memory usage and improve transfer performance.

**Q: How do I handle cache for API responses with large payloads?**
A: Implement chunked caching or use streaming approaches for large payloads.

**Q: Should I cache API responses with authentication tokens?**
A: Cache authentication tokens with TTL matching their expiration time.

**Q: How do I implement cache for API responses with rate limiting?**
A: Combine caching with rate limiting to reduce API calls and stay within rate limits.

**Q: Can I use this pattern with API response validation?**
A: Yes. Validate cached responses on retrieval to ensure data integrity and consistency.

**Q: How do I handle cache for API responses with conditional rendering?**
A: Cache raw data and apply conditional rendering logic on cache retrieval.

**Q: Should I cache API responses with real-time data?**
A: Use very short TTL or implement cache invalidation based on real-time data updates.

**Q: How do I implement cache for API responses with pagination and sorting?**
A: Include pagination and sorting parameters in cache keys for accurate cache hits.

**Q: Can I use this pattern with API response transformation?**
A: Yes. Cache transformed responses to avoid repeated transformation overhead.

**Q: How do I handle cache for API responses with filtering?**
A: Include filter parameters in cache keys to ensure correct cache hits for filtered data.

**Q: Should I cache API responses with aggregation?**
A: Cache aggregated results with TTL based on data volatility and update frequency.

**Q: How do I implement cache for API responses with joins?**
A: Cache joined results or implement multi-level caching for individual entities.

**Q: Can I use this pattern with API response deduplication?**
A: Yes. Implement cache deduplication to avoid storing duplicate responses for identical requests.

**Q: How do I handle cache for API responses with partial updates?**
A: Implement cache patching or use short TTL for data that receives partial updates.

**Q: Should I cache API responses with complex queries?**
A: Cache complex query results with careful consideration of invalidation strategies.

**Q: How do I implement cache for API responses with nested data?**
A: Cache nested data structures or implement hierarchical caching for different nesting levels.

**Q: Can I use this pattern with API response streaming?**
A: Cache stream metadata or initial chunks, but avoid caching full streaming responses.

**Q: Should I cache API responses with soft deletes?**
A: Implement cache invalidation on soft deletes or use short TTL to prevent serving deleted data.

**Q: How do I implement cache for API versioning?**
A: Include API version in cache keys to prevent version conflicts and ensure data consistency.

**Q: Can I use this pattern with GraphQL mutations?**
A: Generally avoid caching mutations. Cache only read operations that are idempotent and safe to cache.

**Q: How do I handle cache for API responses with conditional data?**
A: Include all conditional parameters in cache keys to ensure correct cache hits.

**Q: Should I cache API responses with user-specific data?**
A: Cache user-specific data with user-specific cache keys and appropriate security measures.

**Q: How do I implement cache for API responses with dynamic content?**
A: Use short TTL or implement cache invalidation based on content change events.

**Q: Can I use this pattern with API response compression?**
A: Yes. Compress cached responses to reduce memory usage and improve transfer performance.

**Q: How do I handle cache for API responses with large payloads?**
A: Implement chunked caching or use streaming approaches for large payloads.

**Q: Should I cache API responses with authentication tokens?**
A: Cache authentication tokens with appropriate TTL matching their expiration time.

**Q: How do I implement cache for API responses with rate limiting?**
A: Combine caching with rate limiting to reduce API calls and stay within rate limits.

**Q: Can I use this pattern with API response validation?**
A: Yes. Validate cached responses on retrieval to ensure data integrity and consistency.

**Q: How do I handle cache for API responses with conditional rendering?**
A: Cache raw data and apply conditional rendering logic on cache retrieval.

**Q: Should I cache API responses with real-time data?**
A: Use very short TTL or implement cache invalidation based on real-time data updates.

**Q: How do I implement cache for API responses with pagination and sorting?**
A: Include pagination and sorting parameters in cache keys for accurate cache hits.

**Q: Can I use this pattern with API response transformation?**
A: Yes. Cache transformed responses to avoid repeated transformation overhead.

**Q: How do I handle cache for API responses with filtering?**
A: Include filter parameters in cache keys to ensure correct cache hits for filtered data.

**Q: Should I cache API responses with aggregation?**
A: Cache aggregated results with appropriate TTL based on data volatility and update frequency.

**Q: How do I implement cache for API responses with joins?**
A: Cache joined results or implement multi-level caching for individual entities.

**Q: Can I use this pattern with API response deduplication?**
A: Yes. Implement cache deduplication to avoid storing duplicate responses for identical requests.

**Q: How do I handle cache for API responses with partial updates?**
A: Implement cache patching or use short TTL for data that receives partial updates.

**Q: Should I cache API responses with complex queries?**
A: Cache complex query results with careful consideration of invalidation strategies.

**Q: How do I implement cache for API responses with nested data?**
A: Cache nested data structures or implement hierarchical caching for different nesting levels.

**Q: Can I use this pattern with API response streaming?**
A: Cache stream metadata or initial chunks, but avoid caching full streaming responses.

