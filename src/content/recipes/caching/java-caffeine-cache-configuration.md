---
contentType: recipes
slug: java-caffeine-cache-configuration
title: "Configure Caffeine Cache in Java with Eviction Policies"
description: "Set up Caffeine cache in a Java application with size-based, time-based, and weighted eviction policies for high-performance local caching."
metaDescription: "Configure Caffeine cache in Java with size-based, time-based, and weighted eviction. Use Spring Boot integration, record stats, and tune performance."
difficulty: intermediate
topics:
  - caching
  - performance
  - databases
tags:
  - java
  - caffeine
  - cache
  - eviction
  - spring-boot
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/nodejs-in-memory-cache-lru
  - /guides/complete-guide-redis-caching-strategies
  - /guides/complete-guide-application-level-caching
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configure Caffeine cache in Java with size-based, time-based, and weighted eviction. Use Spring Boot integration, record stats, and tune performance."
  keywords:
    - java caffeine cache
    - cache eviction
    - spring boot cache
    - in-memory cache java
    - caffeine configuration
---

## Overview

Caffeine is a high-performance Java caching library that outperforms Guava and ConcurrentHashMap by using an efficient eviction policy based on the Window TinyLfu algorithm. It supports size-based, time-based, and weighted eviction, reference-based eviction (weak keys/values), and async loading. Below: configuring Caffeine standalone and with Spring Boot, eviction strategies, cache statistics, and tuning.

## When to Use This

- Application-local caching where Redis or Memcached is overkill
- Read-heavy workloads with predictable access patterns
- Caching computed values, database lookups, or HTTP responses in a single JVM
- Spring Boot applications needing `@Cacheable` with a fast local cache

## Prerequisites

- Java 17+
- Maven or Gradle
- Spring Boot 3+ (optional, for Spring integration)

## Solution

### 1. Add Caffeine Dependency

```xml
<!-- pom.xml -->
<dependency>
  <groupId>com.github.ben-manes.caffeine</groupId>
  <artifactId>caffeine</artifactId>
  <version>3.1.8</version>
</dependency>
```

For Spring Boot integration:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
  <groupId>com.github.ben-manes.caffeine</groupId>
  <artifactId>caffeine</artifactId>
</dependency>
```

### 2. Basic Cache with Size Eviction

```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;

Cache<String, User> userCache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(30, TimeUnit.MINUTES)
    .recordStats()
    .build();

// Put
userCache.put("user:123", new User("123", "Alice"));

// Get (returns null if absent)
User user = userCache.getIfPresent("user:123");

// Get with loader (computes and caches if absent)
User loaded = userCache.get("user:456", key -> fetchUserFromDb("456"));

// Invalidate
userCache.invalidate("user:123");
userCache.invalidateAll();
```

### 3. Time-Based Eviction

```java
// Evict entries 10 minutes after they were written
Cache<String, String> writeExpireCache = Caffeine.newBuilder()
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .maximumSize(5_000)
    .build();

// Evict entries 5 minutes after they were last accessed
Cache<String, String> accessExpireCache = Caffeine.newBuilder()
    .expireAfterAccess(5, TimeUnit.MINUTES)
    .maximumSize(5_000)
    .build();

// Both: expire 30 min after write, but also if not accessed in 10 min
Cache<String, String> hybridCache = Caffeine.newBuilder()
    .expireAfterWrite(30, TimeUnit.MINUTES)
    .expireAfterAccess(10, TimeUnit.MINUTES)
    .build();
```

### 4. Weighted Eviction

When entries have different sizes (e.g., cached responses of varying length):

```java
Cache<String, String> weightedCache = Caffeine.newBuilder()
    .maximumWeight(10_000_000) // 10MB total
    .weigher((String key, String value) -> value.length())
    .build();

weightedCache.put("small", "hello");       // weight: 5
weightedCache.put("large", "x".repeat(100_000)); // weight: 100000
```

### 5. Loading Cache (Auto-Populate)

```java
import com.github.benmanes.caffeine.cache.LoadingCache;
import com.github.benmanes.caffeine.cache.Caffeine;

LoadingCache<String, Product> productCache = Caffeine.newBuilder()
    .maximumSize(5_000)
    .expireAfterWrite(15, TimeUnit.MINUTES)
    .refreshAfterWrite(10, TimeUnit.MINUTES) // refresh before expiry
    .build(key -> fetchProductFromDb(key));

// Automatically loads on miss
Product p1 = productCache.get("product:1");
Map<String, Product> batch = productCache.getAll(List.of("product:1", "product:2"));
```

### 6. Async Loading Cache

```java
import com.github.benmanes.caffeine.cache.AsyncLoadingCache;

AsyncLoadingCache<String, User> asyncCache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .buildAsync(key -> fetchUserAsync(key));

CompletableFuture<User> future = asyncCache.get("user:789");
User user = future.join();
```

### 7. Spring Boot Integration

```java
@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  public CaffeineCacheManager cacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager();
    manager.setCaffeine(Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterWrite(30, TimeUnit.MINUTES)
        .recordStats());
    return manager;
  }

  // Per-cache configuration
  @Bean
  public CacheManager multiCacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager("users", "products", "config");
    manager.registerCustomCache("users", Caffeine.newBuilder()
        .maximumSize(5_000)
        .expireAfterWrite(10, TimeUnit.MINUTES)
        .build());
    manager.registerCustomCache("products", Caffeine.newBuilder()
        .maximumSize(20_000)
        .expireAfterWrite(30, TimeUnit.MINUTES)
        .build());
    return manager;
  }
}
```

Use with annotations:

```java
@Service
public class UserService {

  @Cacheable(value = "users", key = "#id")
  public User getUser(String id) {
    return userRepository.findById(id); // Only called on cache miss
  }

  @CachePut(value = "users", key = "#user.id")
  public User updateUser(User user) {
    return userRepository.save(user); // Updates cache
  }

  @CacheEvict(value = "users", key = "#id")
  public void deleteUser(String id) {
    userRepository.deleteById(id); // Removes from cache
  }

  @CacheEvict(value = "users", allEntries = true)
  public void clearUserCache() {
    // Clear entire cache
  }
}
```

### 8. Cache Statistics

```java
Cache<String, User> cache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .recordStats()
    .build();

// After some operations...
com.github.benmanes.caffeine.cache.stats.CacheStats stats = cache.stats();

System.out.println("Hit rate: " + stats.hitRate());
System.out.println("Hits: " + stats.hitCount());
System.out.println("Misses: " + stats.missCount());
System.out.println("Evictions: " + stats.evictionCount());
System.out.println("Average load time: " + stats.averageLoadPenalty() + " ns");
System.out.println("Cache size: " + cache.estimatedSize());
```

## How It Works

1. **Window TinyLfu**: Caffeine uses a frequency-based admission policy. New entries go into a small window space. When the main cache is full, the least-frequently-used entry from the main space is compared with the new entry's frequency — the less frequent one is evicted.
2. **Size eviction**: When `maximumSize` is reached, Caffeine evicts entries based on the TinyLfu policy. Eviction happens asynchronously in batches for performance.
3. **Time eviction**: `expireAfterWrite` sets a fixed TTL from insertion. `expireAfterAccess` resets the timer on each read. Entries are cleaned up lazily — during reads or scheduled maintenance, not on a timer.
4. **Weighted eviction**: The `weigher` function assigns a cost to each entry. Caffeine maintains the total weight under `maximumWeight` by evicting the least valuable entries.
5. **Loading cache**: The `build(loader)` variant auto-computes missing entries. `refreshAfterWrite` triggers a background refresh before expiry, serving stale data while the new value loads.

## Variants

### Reference-Based Eviction

Allow garbage collector to evict entries when memory is low:

```java
Cache<String, User> cache = Caffeine.newBuilder()
    .weakKeys()        // Keys use weak references — evicted when key is GC'd
    .weakValues()      // Values use weak references
    .build();

Cache<String, User> softCache = Caffeine.newBuilder()
    .softValues()      // Values use soft references — GC evicts under memory pressure
    .build();
```

### Scheduled Cleanup

Force periodic cleanup instead of lazy eviction:

```java
Cache<String, String> cache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .scheduler(Scheduler.systemScheduler()) // Enables proactive cleanup
    .build();
```

### Multi-Level Cache (L1 Caffeine + L2 Redis)

```java
public class MultiLevelCache {
  private final Cache<String, String> l1 = Caffeine.newBuilder()
      .maximumSize(1_000)
      .expireAfterWrite(5, TimeUnit.MINUTES)
      .build();
  private final RedisTemplate<String, String> l2;

  public String get(String key) {
    String l1Value = l1.getIfPresent(key);
    if (l1Value != null) return l1Value;

    String l2Value = l2.opsForValue().get(key);
    if (l2Value != null) {
      l1.put(key, l2Value); // Populate L1
      return l2Value;
    }

    String dbValue = fetchFromDb(key);
    l1.put(key, dbValue);
    l2.opsForValue().set(key, dbValue, 30, TimeUnit.MINUTES);
    return dbValue;
  }
}
```

## Best Practices

- **Size your cache**: Set `maximumSize` based on available heap. A cache that's too large causes GC pressure; too small causes evictions.
- **Use `recordStats()` in production**: Monitor hit rate. Below 50% means the cache is misconfigured or the workload isn't cacheable.
- **Prefer `expireAfterWrite` over `expireAfterAccess`**: Access-based expiry can keep stale data alive indefinitely if it's constantly read.
- **Use `refreshAfterWrite` for hot caches**: Refreshes in the background, serving stale data during the refresh — no cache stampede.
- **Set `initialCapacity`**: Reduces rehashing if you know the expected size.
- **Use per-cache configs in Spring**: Different caches have different access patterns — don't use one global config.

## Common Mistakes

- **No `maximumSize`**: The cache grows unbounded until OOM. Always set a size or weight limit.
- **Using `weakKeys` with String keys**: Interned strings may be GC'd unexpectedly. Use `weakKeys` only with object keys that have clear lifecycle.
- **Forgetting `recordStats()`**: Stats are disabled by default. Add it before you need metrics.
- **Cache too large for heap**: A 1M-entry cache with large objects can consume gigabytes. Profile heap usage.
- **Not handling `null` from loader**: If the loader returns `null`, Caffeine caches the absence. Use `Optional` or throw to avoid this.

## FAQ

**Caffeine vs Guava Cache — which should I use?**

Caffeine is the successor to Guava Cache, maintained by the same author. It offers better hit rates, higher throughput, and lower memory overhead. Use Caffeine for new projects. Guava Cache is in maintenance mode.

**How does Caffeine compare to Redis?**

Caffeine is an in-process, per-JVM cache. Redis is a distributed, cross-process cache. Use Caffeine for single-instance or as an L1 cache in front of Redis. For distributed consistency, use Redis as the source of truth.

**Does Caffeine support distributed caching?**

No. Caffeine is strictly local. For distributed caching, pair it with Redis (L1+L2 pattern) or use a distributed cache like Hazelcast or Ignite.

**What is the maximum cache size?**

Limited only by heap size. For multi-gigabyte caches, consider off-heap solutions like MapDB or Ehcache with off-heap storage.

**How does `refreshAfterWrite` differ from `expireAfterWrite`?**

`expireAfterWrite` removes the entry after the TTL — the next read blocks while the new value loads. `refreshAfterWrite` triggers a background refresh but keeps serving the old value until the new one is ready. Use refresh for hot caches where blocking is unacceptable.
