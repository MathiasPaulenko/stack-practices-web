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

## FAQ

**Q: How is this different from a simple wrapper function?**
A: The Proxy pattern implements the same interface as the real object, so callers do not know or care whether they are using the cache or the original client.

**Q: Can I combine this with the Decorator pattern?**
A: Yes. A [Decorator](/patterns/design/decorator-pattern) adds behavior; a Proxy controls access. They are often used together in practice.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
