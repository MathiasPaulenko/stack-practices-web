---
contentType: guides
slug: caching-strategies-guide
title: "Caching Strategies — From Browser to Database, a Complete Guide"
description: "A practical guide to caching strategies: browser caching, CDN edge caching, application caching with Redis, and database query caching. Learn when to use each and how to avoid cache invalidation nightmares."
metaDescription: "Learn caching strategies: browser, CDN, Redis, and database query caching. When to use each, how to invalidate, and how to avoid common pitfalls."
difficulty: intermediate
topics:
  - data
  - performance
  - infrastructure
tags:
  - caching
  - redis
  - cdn
  - browser-cache
  - cache-invalidation
  - performance
  - guide
relatedResources:
  - /guides/data/database-sharding-implementation-guide
  - /guides/data/read-replica-guide
  - /guides/data/connection-pooling-deep-dive-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn caching strategies: browser, CDN, Redis, and database query caching. When to use each, how to invalidate, and how to avoid common pitfalls."
  keywords:
    - caching
    - redis
    - cdn
    - browser-cache
    - cache-invalidation
    - performance
    - guide
---

## Overview

Caching is one of the most effective ways to improve application performance and reduce infrastructure costs. By storing copies of frequently accessed data closer to where it is needed, you reduce latency, decrease database load, and improve user experience. But caching introduces complexity: stale data, invalidation logic, and consistency challenges.

This guide covers caching at every layer of the stack, from browser to database.

## When to Use

- Your database is under high read load and scaling vertically is expensive
- API response times exceed your latency SLO
- You serve static or semi-static content to many users
- You have expensive computations that can be reused
- Your application makes repeated identical queries or API calls

## The Caching Hierarchy

```
User Browser
    ↓ (HTTP Cache-Control)
CDN Edge (Cloudflare, Fastly, CloudFront)
    ↓ (Cache rules, TTL)
Load Balancer / Reverse Proxy (Nginx, Varnish)
    ↓ (Proxy cache, rate limit cache)
Application Cache (Redis, Memcached)
    ↓ (Key-value, TTL, eviction)
Database Query Cache (PostgreSQL, MySQL)
    ↓ (Query plan cache, buffer pool)
Disk / Storage
```

| Layer | Latency | Typical Use Case |
|-------|---------|------------------|
| Browser | 0ms | Static assets, API responses |
| CDN | 10-50ms | Images, CSS, JS, HTML pages |
| Reverse Proxy | 1-5ms | API endpoints, rendered pages |
| Application | 1-5ms | Session data, computed results |
| Database | 1-10ms | Query results, frequently joined data |

## Step-by-Step Caching Implementation

### 1. Browser Caching

Leverage the browser's built-in cache first:

```nginx
# Nginx: Cache static assets aggressively
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# API responses: conditional caching
location /api/ {
    add_header Cache-Control "public, max-age=60, stale-while-revalidate=300";
}
```

```javascript
// Client-side: Service Worker for offline caching
// sw.js
const CACHE_NAME = 'app-v1';
const urlsToCache = ['/static/app.js', '/static/styles.css', '/api/config'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached or fetch from network
      return response || fetch(event.request);
    })
  );
});
```

**Browser cache headers explained:**

| Header | Meaning | Example |
|--------|---------|---------|
| `Cache-Control: no-store` | Never cache | Sensitive data |
| `Cache-Control: no-cache` | Revalidate every time | Semi-dynamic content |
| `Cache-Control: max-age=3600` | Cache for 1 hour | Static API responses |
| `Cache-Control: immutable` | Never revalidate | Hashed asset filenames |
| `ETag` | Version identifier for conditional requests | API resources |
| `Last-Modified` | Timestamp for conditional requests | File-based resources |

### 2. CDN Edge Caching

Cache at the edge to reduce origin load:

```nginx
# Nginx with cache layer
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:100m max_size=1g;

server {
    location /api/public/ {
        proxy_cache app_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

```terraform
# CloudFront CDN distribution with caching
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "app_origin"

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
}
```

**CDN cache rules:**
- Cache static assets (images, CSS, JS) for 1 year with hashed filenames
- Cache API responses based on URL patterns and query parameters
- Use `stale-while-revalidate` for user-facing content (show stale, refresh in background)
- Purge selectively using cache tags or surrogate keys

### 3. Application Caching with Redis

The workhorse of application caching:

```python
# Example: Python with Redis for application caching
import redis
import json
import hashlib
from functools import wraps

r = redis.Redis(host='redis', port=6379, db=0)

def cache_with_ttl(ttl_seconds=300):
    """Decorator to cache function results in Redis."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create a deterministic cache key
            key_data = json.dumps({"func": func.__name__, "args": args, "kwargs": kwargs})
            cache_key = f"cache:{func.__name__}:{hashlib.sha256(key_data.encode()).hexdigest()[:16]}"
            
            # Try to get from cache
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Compute and store
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl_seconds, json.dumps(result))
            return result
        return wrapper
    return decorator

@cache_with_ttl(ttl_seconds=600)
def get_product_details(product_id):
    """Expensive database query."""
    return db.query(Product).get(product_id).to_dict()

@cache_with_ttl(ttl_seconds=60)
def get_dashboard_stats(user_id):
    """Expensive aggregation."""
    return compute_dashboard_stats(user_id)
```

```java
// Example: Spring Boot with Redis cache
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        return RedisCacheManager.builder(factory)
            .cacheDefaults(
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(10))
                    .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                            new GenericJackson2JsonRedisSerializer()
                        )
                    )
            )
            .build();
    }
}

@Service
public class ProductService {
    
    @Cacheable(value = "products", key = "#id")
    public Product getProduct(String id) {
        return productRepository.findById(id).orElseThrow();
    }
    
    @CacheEvict(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }
    
    @CacheEvict(value = "products", allEntries = true)
    public void clearProductCache() {
        // Bulk invalidation
    }
}
```

**Redis caching patterns:**

| Pattern | When to Use | Risk |
|---------|-------------|------|
| **Cache-Aside** | Read-heavy, simple invalidation | Stale data if invalidation fails |
| **Read-Through** | Complex cache warming | Cache becomes required dependency |
| **Write-Through** | Strong consistency needed | Write latency increases |
| **Write-Behind** | Write-heavy, eventual consistency | Data loss if cache fails before flush |

### 4. Database Query Caching

Let the database cache for you:

```sql
-- PostgreSQL: Enable and tune query cache settings
-- postgresql.conf
shared_buffers = 4GB                  # 25% of RAM for buffer pool
effective_cache_size = 12GB           # Total OS + PostgreSQL cache
work_mem = 256MB                      # Per-query sort/hash memory

-- Create a materialized view for expensive aggregations
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT 
    date_trunc('day', created_at) as day,
    sum(amount) as total_sales,
    count(*) as order_count
FROM orders
WHERE created_at > now() - interval '90 days'
GROUP BY 1;

-- Refresh on a schedule (or use pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

```sql
-- MySQL: Query cache (removed in 8.0; use ProxySQL or application cache instead)
-- For MySQL 5.7 and earlier:
query_cache_type = 1
query_cache_size = 256M
query_cache_limit = 8M
```

**Database caching best practices:**
- Tune `shared_buffers` (PostgreSQL) or `innodb_buffer_pool_size` (MySQL)
- Use materialized views for expensive aggregations that do not need real-time data
- Create covering indexes so queries are served entirely from index pages
- Monitor cache hit ratio (should be >99% for OLTP)

## Cache Invalidation Strategies

The hardest problem in caching:

| Strategy | How It Works | Best For |
|----------|--------------|----------|
| **TTL (Time to Live)** | Expire after fixed duration | Data that can be stale briefly |
| **Active Invalidation** | Delete/update cache on write | Strong consistency requirements |
| **Event-Driven** | Listen to change events (CDC) | Distributed systems |
| **Versioned Keys** | Include version/hash in key | Immutable deployments |
| **Cache Warming** | Pre-populate before peak load | Predictable traffic patterns |

```python
# Example: Event-driven invalidation with Redis Pub/Sub
import redis

r = redis.Redis(host='redis', port=6379)
p = r.pubsub()

def handle_invalidation(message):
    key = message['data']
    r.delete(f"cache:product:{key}")
    print(f"Invalidated cache for product {key}")

p.subscribe(**{'product-updates': handle_invalidation})
p.run_in_thread(sleep_time=0.001)

# On product update, publish event
r.publish('product-updates', product_id)
```

## Best Practices

- **Cache at multiple layers.** Browser + CDN + Redis + database buffer pool.
- **Use TTLs appropriate to data volatility.** User profile: 1 hour. Product catalog: 1 day. Session: 15 minutes.
- **Design for cache failure.** If Redis is down, your app should still work (degraded, not broken).
- **Monitor cache hit rates.** Target >90% for application cache, >99% for database buffer pool.
- **Avoid caching everything.** Small, frequently accessed data benefits most. Large, rarely accessed data wastes memory.
- **Use consistent hashing for distributed caches.** Redis Cluster or client-side sharding prevents hotspotting.

## Common Mistakes

- **Cache stampede (thundering herd).** Many requests hit the backend simultaneously when cache expires. Use locks or single-flight patterns.
- **Storing non-serializable objects.** Cache simple types (strings, JSON), not ORM objects or file handles.
- **No eviction strategy.** Unbounded cache growth leads to OOM. Set `maxmemory-policy` in Redis.
- **Ignoring cache warm-up.** A cold cache after restart causes latency spikes. Warm gradually.
- **Over-caching.** Every layer of caching adds complexity. Measure before adding each layer.

## Variants

- **Local in-process cache:** Caffeine (Java), LRU-cache (Python) — fastest, no network, but per-instance
- **Distributed cache:** Redis, Memcached — shared across instances, requires network
- **Hierarchical cache:** Local L1 + Redis L2 — best of both worlds, complex invalidation
- **CDN with edge logic:** Cloudflare Workers, Fastly VCL — cache and compute at the edge

## FAQ

**Q: Should I use Redis or Memcached?**
Redis is more feature-rich (data structures, persistence, pub/sub). Memcached is simpler and slightly faster for pure key-value. Use Redis unless you have a specific reason not to.

**Q: How do I prevent cache stampede?**
Use a locking mechanism (Redis SET NX EX) so only one process regenerates the cache. Alternatively, stagger TTLs or use probabilistic early expiration.

**Q: What is a good cache hit rate?**
Application cache: >85% is good, >95% is excellent. Database buffer pool: >99% is expected for OLTP.

**Q: Should I cache writes (write-behind)?**
Only if you can tolerate brief data loss and have a retry mechanism. Write-through or cache-aside are safer for most applications.

## Conclusion

Effective caching transforms application performance. By layering caches from browser to database, choosing appropriate invalidation strategies, and monitoring hit rates, you reduce latency and infrastructure cost while maintaining data consistency.
