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
  - /patterns/decorator-pattern
  - /patterns/adapter-pattern
  - /recipes/cache-invalidation
  - /recipes/caching-strategies
  - /patterns/builder-pattern-configuration
  - /patterns/decorator-pattern-pipeline
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Implement a caching proxy pattern for API responses. Reduce latency, avoid redundant requests, and control cache invalidation with a clean wrapper."
  keywords:
    - proxy pattern
    - caching proxy
    - api caching
    - structural pattern
    - response cache




---

The [Proxy](/patterns/proxy-pattern/) pattern intercepts access to an object to add behavior without changing the original implementation. When applied to API clients, it becomes a capable caching layer that stores responses, reduces latency, and shields downstream services from redundant requests.

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

- Set TTL based on data volatility, not a fixed value for everything. See [cache invalidation](/patterns/cache-aside-pattern/) patterns.
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

### How is this different from a simple wrapper function?

The Proxy pattern implements the same interface as the real object, so callers do not know or care whether they are using the cache or the original client.

### Can I combine this with the Decorator pattern?

Yes. A [Decorator](/patterns/decorator-pattern/) adds behavior; a Proxy controls access. They are often used together in practice.

### How do I handle cache invalidation?

Implement explicit invalidation methods for write-through consistency, or use TTL-based expiration for eventual consistency.

### Should I use in-memory cache or distributed cache?

Use in-memory cache for single-instance applications. Use distributed cache (Redis, Memcached) for multi-instance deployments.

### How do I prevent cache stampede?

Implement request coalescing or use cache locks to prevent multiple simultaneous requests for the same uncached data.

### Can I cache POST requests?

Generally no. POST requests have side effects and should not be cached unless you fully understand the implications.

### How do I handle cache serialization?

Use JSON serialization for simple objects. Consider MessagePack or Protocol Buffers for high-performance scenarios.

### Should I cache errors?

Cache errors with short TTL to prevent repeated failing requests from overwhelming downstream services.

### How do I implement cache warming?

Pre-populate cache during application startup or scheduled jobs to avoid cold starts for frequently accessed data.

### Can I use this pattern with GraphQL?

Yes. Implement caching at the resolver level or use DataLoader for batched caching.

### How do I handle cache versioning?

Include version information in cache keys to handle schema changes and prevent stale data issues.

### Should I cache pagination results?

Cache individual pages with short TTL, but avoid caching full result sets unless the data is stable.

### How do I implement cache compression?

Compress cached data before storage to reduce memory usage, especially for large payloads.

### Can I use this pattern with WebSocket connections?

Yes. Cache WebSocket connection states or message histories to improve reconnection performance.

### How do I handle cache consistency across instances?

Use distributed cache with pub/sub invalidation or implement cache invalidation messages.

### Should I cache authentication tokens?

Cache tokens with TTL matching their expiration time to reduce authentication overhead.

### How do I implement cache staleness detection?

Add metadata to cached entries (last modified, ETag) to detect staleness and trigger refreshes.

### Can I use this pattern with file system operations?

Yes. Cache file contents or metadata to reduce disk I/O for frequently accessed files.

### How do I handle cache eviction policies?

Implement LRU, LFU, or time-based eviction policies based on your access patterns and requirements.

### Should I cache database query results?

Cache query results with careful consideration of data volatility and invalidation strategies.

### How do I implement cache backup and restore?

Periodically dump cache state to persistent storage for disaster recovery scenarios.

### Can I use this pattern with API rate limiting?

Yes. Combine caching with rate limiting to reduce API calls and stay within rate limits.

### How do I handle cache security?

Implement access controls, encryption, and audit logging for cached sensitive data.

### Should I cache API responses with authentication?

Cache responses with user-specific cache keys to prevent unauthorized data access.

### How do I implement cache monitoring and alerting?

Monitor hit rates, eviction rates, and cache size. Set up alerts for abnormal patterns.

### Can I use this pattern with microservices?

Yes. Implement caching at service boundaries to reduce inter-service communication overhead.

### How do I handle cache warm-up for new deployments?

Implement gradual warm-up strategies to prevent cache stampedes during deployments.

### Should I cache API responses with conditional requests?

Use ETag and Last-Modified headers to implement conditional requests and reduce bandwidth.

### How do I implement cache for streaming responses?

Cache stream metadata or initial chunks, but avoid caching full streaming responses.

### Can I use this pattern with GraphQL subscriptions?

Cache subscription state or initial data to improve subscription initialization performance.

### How do I handle cache for time-sensitive data?

Use very short TTL or implement time-based invalidation for time-sensitive data like stock prices.

### Should I cache API responses with pagination?

Cache individual pages with appropriate TTL, but consider caching full result sets for stable data.

### How do I implement cache for multi-tenant applications?

Use tenant-specific cache keys to prevent data leakage between tenants.

### Can I use this pattern with API gateways?

Yes. Implement caching at the API gateway level to reduce load on backend services.

### How do I handle cache for geo-distributed systems?

Use edge caching or implement cache replication strategies for geo-distributed deployments.

### Should I cache API responses with soft deletes?

Implement cache invalidation on soft deletes or use short TTL to prevent serving deleted data.

### How do I implement cache for API versioning?

Include API version in cache keys to prevent version conflicts and ensure data consistency.

### Can I use this pattern with GraphQL mutations?

Generally avoid caching mutations. Cache only read operations that are idempotent and safe to cache.

### How do I handle cache for API responses with conditional data?

Include all conditional parameters in cache keys to ensure correct cache hits.

### Should I cache API responses with user-specific data?

Cache user-specific data with user-specific cache keys and appropriate security measures.

### How do I implement cache for API responses with dynamic content?

Use short TTL or implement cache invalidation based on content change events.

### Can I use this pattern with API response compression?

Yes. Compress cached responses to reduce memory usage and improve transfer performance.

### How do I handle cache for API responses with large payloads?

Implement chunked caching or use streaming approaches for large payloads.

### Should I cache API responses with authentication tokens?

Cache authentication tokens with TTL matching their expiration time.

### How do I implement cache for API responses with rate limiting?

Combine caching with rate limiting to reduce API calls and stay within rate limits.

### Can I use this pattern with API response validation?

Yes. Validate cached responses on retrieval to ensure data integrity and consistency.

### How do I handle cache for API responses with conditional rendering?

Cache raw data and apply conditional rendering logic on cache retrieval.

### Should I cache API responses with real-time data?

Use very short TTL or implement cache invalidation based on real-time data updates.

### How do I implement cache for API responses with pagination and sorting?

Include pagination and sorting parameters in cache keys for accurate cache hits.

### Can I use this pattern with API response transformation?

Yes. Cache transformed responses to avoid repeated transformation overhead.

### How do I handle cache for API responses with filtering?

Include filter parameters in cache keys to ensure correct cache hits for filtered data.

### Should I cache API responses with aggregation?

Cache aggregated results with TTL based on data volatility and update frequency.

### How do I implement cache for API responses with joins?

Cache joined results or implement multi-level caching for individual entities.

### Can I use this pattern with API response deduplication?

Yes. Implement cache deduplication to avoid storing duplicate responses for identical requests.

### How do I handle cache for API responses with partial updates?

Implement cache patching or use short TTL for data that receives partial updates.

### Should I cache API responses with complex queries?

Cache complex query results with careful consideration of invalidation strategies.

### How do I implement cache for API responses with nested data?

Cache nested data structures or implement hierarchical caching for different nesting levels.

### Can I use this pattern with API response streaming?

Cache stream metadata or initial chunks, but avoid caching full streaming responses.

### Should I cache API responses with soft deletes?

Implement cache invalidation on soft deletes or use short TTL to prevent serving deleted data.

### How do I implement cache for API versioning?

Include API version in cache keys to prevent version conflicts and ensure data consistency.

### Can I use this pattern with GraphQL mutations?

Generally avoid caching mutations. Cache only read operations that are idempotent and safe to cache.

### How do I handle cache for API responses with conditional data?

Include all conditional parameters in cache keys to ensure correct cache hits.

### Should I cache API responses with user-specific data?

Cache user-specific data with user-specific cache keys and appropriate security measures.

### How do I implement cache for API responses with dynamic content?

Use short TTL or implement cache invalidation based on content change events.

### Can I use this pattern with API response compression?

Yes. Compress cached responses to reduce memory usage and improve transfer performance.

### How do I handle cache for API responses with large payloads?

Implement chunked caching or use streaming approaches for large payloads.

### Should I cache API responses with authentication tokens?

Cache authentication tokens with appropriate TTL matching their expiration time.

### How do I implement cache for API responses with rate limiting?

Combine caching with rate limiting to reduce API calls and stay within rate limits.

### Can I use this pattern with API response validation?

Yes. Validate cached responses on retrieval to ensure data integrity and consistency.

### How do I handle cache for API responses with conditional rendering?

Cache raw data and apply conditional rendering logic on cache retrieval.

### Should I cache API responses with real-time data?

Use very short TTL or implement cache invalidation based on real-time data updates.

### How do I implement cache for API responses with pagination and sorting?

Include pagination and sorting parameters in cache keys for accurate cache hits.

### Can I use this pattern with API response transformation?

Yes. Cache transformed responses to avoid repeated transformation overhead.

### How do I handle cache for API responses with filtering?

Include filter parameters in cache keys to ensure correct cache hits for filtered data.

### Should I cache API responses with aggregation?

Cache aggregated results with appropriate TTL based on data volatility and update frequency.

### How do I implement cache for API responses with joins?

Cache joined results or implement multi-level caching for individual entities.

### Can I use this pattern with API response deduplication?

Yes. Implement cache deduplication to avoid storing duplicate responses for identical requests.

### How do I handle cache for API responses with partial updates?

Implement cache patching or use short TTL for data that receives partial updates.

### Should I cache API responses with complex queries?

Cache complex query results with careful consideration of invalidation strategies.

### How do I implement cache for API responses with nested data?

Cache nested data structures or implement hierarchical caching for different nesting levels.

### Can I use this pattern with API response streaming?

Cache stream metadata or initial chunks, but avoid caching full streaming responses.

