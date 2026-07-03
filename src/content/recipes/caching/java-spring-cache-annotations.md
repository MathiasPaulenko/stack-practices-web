---
contentType: recipes
slug: java-spring-cache-annotations
title: "Use Spring Cache Annotations with Redis Backend"
description: "Apply Spring's @Cacheable, @CachePut, and @CacheEvict annotations with a Redis cache manager for declarative caching in Java applications."
metaDescription: "Use Spring cache annotations with Redis backend. Apply @Cacheable, @CachePut, @CacheEvict for declarative caching with TTL and conditional eviction."
difficulty: intermediate
topics:
  - caching
  - performance
  - api
tags:
  - java
  - spring-boot
  - cache-annotations
  - redis
  - declarative-caching
relatedResources:
  - /recipes/caching/java-caffeine-cache-configuration
  - /recipes/caching/nodejs-redis-cache-invalidation
  - /guides/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use Spring cache annotations with Redis backend. Apply @Cacheable, @CachePut, @CacheEvict for declarative caching with TTL and conditional eviction."
  keywords:
    - spring cache annotations
    - java redis cache
    - cacheable cacheput cacheevict
    - spring boot caching
    - declarative caching java
---

## Overview

Spring Framework provides declarative caching through annotations: `@Cacheable`, `@CachePut`, `@CacheEvict`, and `@Caching`. These annotations intercept method calls, check the cache before execution, and store results after execution — all without modifying business logic. With a Redis backend, the cache is shared across all application instances. Below: configuring Spring Cache with Redis, using each annotation, conditional caching, multi-cache operations, and TTL management.

## When to Use This

- Spring Boot applications that need caching without coupling business logic to cache code
- Service-layer methods with expensive database queries or computations
- Multi-instance deployments that need a shared cache (Redis backend)
- Any Spring project where declarative caching reduces boilerplate

## Prerequisites

- Java 17+
- Spring Boot 3+
- Redis server

## Solution

### 1. Add Dependencies

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### 2. Configure Redis Cache Manager

```java
@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
    RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(10))
        .disableCachingNullValues()
        .serializeValuesWith(
            RedisSerializationContext.SerializationPair.fromSerializer(
                new GenericJackson2JsonRedisSerializer()));

    // Per-cache TTL configuration
    Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
    cacheConfigs.put("users", config.entryTtl(Duration.ofMinutes(5)));
    cacheConfigs.put("products", config.entryTtl(Duration.ofMinutes(30)));
    cacheConfigs.put("config", config.entryTtl(Duration.ofHours(24)));

    return RedisCacheManager.builder(factory)
        .cacheDefaults(config)
        .withInitialCacheConfigurations(cacheConfigs)
        .transactionAware()
        .build();
  }
}
```

### 3. @Cacheable — Skip Method on Cache Hit

```java
@Service
public class UserService {

  @Cacheable(value = "users", key = "#id")
  public User getUserById(String id) {
    // Only executed on cache miss
    return userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));
  }

  // Cache with composite key
  @Cacheable(value = "users", key = "#email")
  public User getUserByEmail(String email) {
    return userRepository.findByEmail(email);
  }

  // Cache with conditional — only cache if result is active
  @Cacheable(value = "users", key = "#id", condition = "#result.active == true")
  public User getUserByIdConditional(String id) {
    return userRepository.findById(id).orElseThrow();
  }

  // Cache unless result is null
  @Cacheable(value = "users", key = "#id", unless = "#result == null")
  public User findUserById(String id) {
    return userRepository.findById(id).orElse(null);
  }
}
```

### 4. @CachePut — Always Execute, Update Cache

```java
@Service
public class UserService {

  // Method always executes, result replaces cache entry
  @CachePut(value = "users", key = "#user.id")
  public User updateUser(User user) {
    return userRepository.save(user);
  }

  // Update cache after creating
  @CachePut(value = "users", key = "#result.id")
  public User createUser(UserDto dto) {
    User user = new User(dto.getEmail(), dto.getName());
    return userRepository.save(user);
  }
}
```

### 5. @CacheEvict — Remove from Cache

```java
@Service
public class UserService {

  // Evict single entry
  @CacheEvict(value = "users", key = "#id")
  public void deleteUser(String id) {
    userRepository.deleteById(id);
  }

  // Evict all entries in cache
  @CacheEvict(value = "users", allEntries = true)
  public void clearUserCache() {
    // No-op — just clears the cache
  }

  // Evict before method execution (e.g., before a bulk update)
  @CacheEvict(value = "users", allEntries = true, beforeInvocation = true)
  public void bulkUpdateUsers(List<User> users) {
    userRepository.saveAll(users);
  }

  // Conditional eviction
  @CacheEvict(value = "users", key = "#user.id", condition = "#user.active == false")
  public void deactivateUser(User user) {
    user.setActive(false);
    userRepository.save(user);
  }
}
```

### 6. @Caching — Multiple Cache Operations

```java
@Service
public class UserService {

  @Caching(
      evict = {
          @CacheEvict(value = "users", key = "#id"),
          @CacheEvict(value = "users", key = "#user.email"),
          @CacheEvict(value = "userList", allEntries = true),
      }
  )
  public User updateUserAndEvictCaches(String id, UserDto dto) {
    User user = userRepository.findById(id).orElseThrow();
    user.setEmail(dto.getEmail());
    user.setName(dto.getName());
    return userRepository.save(user);
  }
}
```

### 7. Custom Key Generator

```java
@Configuration
public class CacheConfig {

  @Bean
  public KeyGenerator customKeyGenerator() {
    return (target, method, params) -> {
      StringBuilder sb = new StringBuilder();
      sb.append(target.getClass().getSimpleName()).append(":");
      sb.append(method.getName()).append(":");
      for (Object param : params) {
        sb.append(param.hashCode()).append(":");
      }
      return sb.toString();
    };
  }
}
```

Usage:

```java
@Cacheable(value = "users", keyGenerator = "customKeyGenerator")
public User getUser(String id, String tenantId) {
  return userRepository.findByIdAndTenant(id, tenantId);
}
```

### 8. Multi-Cache @CacheConfig

```java
@Service
@CacheConfig(cacheNames = {"users", "userList"}) // Default cache names for the class
public class UserService {

  @Cacheable(key = "#id")
  public User getUserById(String id) {
    return userRepository.findById(id).orElseThrow();
  }

  @CacheEvict(allEntries = true)
  public void clearAll() {}
}
```

## How It Works

1. **AOP proxy**: Spring wraps `@Cacheable` beans in a proxy. When a method is called, the proxy intercepts, checks the cache, and either returns the cached value or executes the method and stores the result.
2. **`@Cacheable`**: Before method execution, the proxy checks the cache for the key. On hit, the cached value is returned and the method is skipped. On miss, the method executes and the result is cached.
3. **`@CachePut`**: The method always executes. After execution, the result is placed in the cache, overwriting any existing entry. Use for updates where you want fresh data in both DB and cache.
4. **`@CacheEvict`**: Removes entries from the cache. `allEntries = true` clears the entire cache. `beforeInvocation = true` evicts before the method runs (useful for rollback safety).
5. **Key resolution**: By default, Spring uses all method parameters as the key. Use `key = "#id"` to specify a single parameter, or `keyGenerator` for custom logic.

## Variants

### Caffeine + Redis Multi-Level Cache

```java
@Configuration
public class CacheConfig {

  @Bean
  @Primary
  public CompositeCacheManager cacheManager(
      RedisCacheManager redisManager,
      CaffeineCacheManager caffeineManager) {
    CompositeCacheManager manager = new CompositeCacheManager(
        caffeineManager, // L1 — checked first
        redisManager     // L2 — checked second
    );
    manager.setFallbackToNoOpCache(false);
    return manager;
  }
}
```

### Cache with TTL per Entry (Redis TTL)

```java
@Cacheable(value = "users", key = "#id")
@CacheEvict(value = "users", key = "#id", condition = "#result.updatedAt > T(java.time.Instant).now().minusSeconds(300)")
public User getUser(String id) {
  return userRepository.findById(id).orElseThrow();
}
```

### Async Cache (Spring 6+)

```java
@Cacheable(value = "users", key = "#id")
public CompletableFuture<User> getUserAsync(String id) {
  return CompletableFuture.supplyAsync(() ->
    userRepository.findById(id).orElseThrow()
  );
}
```

### Programmatic Cache Access

```java
@Service
public class UserService {

  @Autowired
  private CacheManager cacheManager;

  public void manualCacheOperation(String userId) {
    Cache cache = cacheManager.getCache("users");
    if (cache != null) {
      // Manual put
      cache.put(userId, new User(userId, "Alice"));
      // Manual get
      User cached = cache.get(userId, User.class);
      // Manual evict
      cache.evict(userId);
    }
  }
}
```

## Best Practices

- **Use `@Cacheable` for reads, `@CachePut` for writes, `@CacheEvict` for deletes**: Each annotation has a specific purpose. Don't use `@Cacheable` on mutating methods.
- **Set per-cache TTLs**: Different data has different freshness requirements. Configure TTLs in the `RedisCacheManager`, not globally.
- **Use `unless` to skip caching nulls or unwanted results**: `unless = "#result == null"` prevents caching null values that would mask real misses.
- **Evict on writes**: After `update` or `delete`, evict the cache entry. Otherwise, stale data is served until TTL expires.
- **Use `allEntries = true` sparingly**: Clearing the entire cache causes a spike in cache misses. Evict specific keys when possible.
- **Disable `null` caching**: Use `disableCachingNullValues()` to prevent caching `null` results, which can mask database errors.

## Common Mistakes

- **Using `@Cacheable` on update methods**: `@Cacheable` skips the method on cache hit — updates never execute. Use `@CachePut` for writes.
- **Missing `@EnableCaching`**: Without this annotation on a `@Configuration` class, cache annotations are no-ops.
- **Key collisions between methods**: Two methods with `@Cacheable("users")` and different parameters can collide if keys overlap. Use distinct key expressions.
- **Caching mutable objects**: If the cached object is modified after caching, the cache holds a reference to the mutated object. Use immutable DTOs or deep copies.
- **Not handling cache failures**: If Redis is down, cache operations throw exceptions. Configure a fallback or use `errorHandler` to log and continue.

## FAQ

**Spring Cache vs manual caching — which is better?**

Spring Cache annotations are declarative and reduce boilerplate. They work well for simple cache-aside patterns. For complex logic (conditional refresh, multi-level, stampede prevention), use programmatic caching with `CacheManager` or a dedicated cache library.

**Can I use @Cacheable with reactive Spring (WebFlux)?**

Spring 6+ supports `@Cacheable` with reactive types (`Mono`, `Flux`). The cache stores the reactive wrapper, not the resolved value. For proper reactive caching, use `Mono.cache()` or a reactive cache library.

**How do I set different TTLs for different caches?**

Configure per-cache TTLs in `RedisCacheManager` using `withInitialCacheConfigurations(Map<String, RedisCacheConfiguration>)`. Each cache name gets its own `RedisCacheConfiguration` with a specific TTL.

**What happens when Redis is unavailable?**

By default, cache operations throw exceptions. Configure a `CacheErrorHandler` to log errors and fall back to method execution:

```java
@Bean
public CacheErrorHandler errorHandler() {
  return new CacheErrorHandler() {
    @Override public void handleCacheGetError(RuntimeException e, Cache cache, Object key) { log.warn("Cache get failed", e); }
    @Override public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) { log.warn("Cache put failed", e); }
    @Override public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) { log.warn("Cache evict failed", e); }
    @Override public void handleCacheClearError(RuntimeException e, Cache cache) { log.warn("Cache clear failed", e); }
  };
}
```

**Can I use @Cacheable with conditional TTL?**

Spring's `@Cacheable` doesn't support per-entry TTL. Use `@CachePut` with a custom Redis template that sets TTL based on the value, or use programmatic caching for this use case.
