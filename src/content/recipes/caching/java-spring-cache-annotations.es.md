---
contentType: recipes
slug: java-spring-cache-annotations
title: "Usar Anotaciones de Cache de Spring con Backend Redis"
description: "Aplica las anotaciones @Cacheable, @CachePut y @CacheEvict de Spring con un cache manager Redis para caching declarativo en aplicaciones Java."
metaDescription: "Usa anotaciones de cache Spring con backend Redis. Aplica @Cacheable, @CachePut, @CacheEvict para caching declarativo con TTL y eviction condicional."
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
  metaDescription: "Usa anotaciones de cache Spring con backend Redis. Aplica @Cacheable, @CachePut, @CacheEvict para caching declarativo con TTL y eviction condicional."
  keywords:
    - spring cache annotations
    - java redis cache
    - cacheable cacheput cacheevict
    - spring boot caching
    - declarative caching java
---

## Descripcion general

Spring Framework proporciona caching declarativo a traves de anotaciones: `@Cacheable`, `@CachePut`, `@CacheEvict` y `@Caching`. Estas anotaciones interceptan llamadas a metodos, verifican el cache antes de la ejecucion, y almacenan resultados despues de la ejecucion — todo sin modificar la logica de negocio. Con un backend Redis, el cache se comparte entre todas las instancias de la aplicacion. A continuacion: configurar Spring Cache con Redis, usar cada anotacion, caching condicional, operaciones multi-cache y gestion de TTL.

## Cuando Usar Esto

- Aplicaciones Spring Boot que necesitan caching sin acoplar logica de negocio a codigo de cache
- Metodos de capa de servicio con consultas de base de datos costosas o computaciones
- Despliegues multi-instancia que necesitan un cache compartido (backend Redis)
- Cualquier proyecto Spring donde el caching declarativo reduzca boilerplate

## Prerrequisitos

- Java 17+
- Spring Boot 3+
- Servidor Redis

## Solucion

### 1. Agregar Dependencias

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

### 2. Configurar Redis Cache Manager

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

    // Configuracion de TTL por cache
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

### 3. @Cacheable — Saltar Metodo en Cache Hit

```java
@Service
public class UserService {

  @Cacheable(value = "users", key = "#id")
  public User getUserById(String id) {
    // Solo ejecutado en cache miss
    return userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));
  }

  // Cache con clave compuesta
  @Cacheable(value = "users", key = "#email")
  public User getUserByEmail(String email) {
    return userRepository.findByEmail(email);
  }

  // Cache condicional — solo cachear si el resultado es active
  @Cacheable(value = "users", key = "#id", condition = "#result.active == true")
  public User getUserByIdConditional(String id) {
    return userRepository.findById(id).orElseThrow();
  }

  // Cache a menos que el resultado sea null
  @Cacheable(value = "users", key = "#id", unless = "#result == null")
  public User findUserById(String id) {
    return userRepository.findById(id).orElse(null);
  }
}
```

### 4. @CachePut — Siempre Ejecutar, Actualizar Cache

```java
@Service
public class UserService {

  // El metodo siempre se ejecuta, el resultado reemplaza la entrada de cache
  @CachePut(value = "users", key = "#user.id")
  public User updateUser(User user) {
    return userRepository.save(user);
  }

  // Actualizar cache despues de crear
  @CachePut(value = "users", key = "#result.id")
  public User createUser(UserDto dto) {
    User user = new User(dto.getEmail(), dto.getName());
    return userRepository.save(user);
  }
}
```

### 5. @CacheEvict — Remover del Cache

```java
@Service
public class UserService {

  // Evictar entrada unica
  @CacheEvict(value = "users", key = "#id")
  public void deleteUser(String id) {
    userRepository.deleteById(id);
  }

  // Evictar todas las entradas del cache
  @CacheEvict(value = "users", allEntries = true)
  public void clearUserCache() {
    // No-op — solo limpia el cache
  }

  // Evictar antes de la ejecucion del metodo (ej., antes de una actualizacion masiva)
  @CacheEvict(value = "users", allEntries = true, beforeInvocation = true)
  public void bulkUpdateUsers(List<User> users) {
    userRepository.saveAll(users);
  }

  // Eviction condicional
  @CacheEvict(value = "users", key = "#user.id", condition = "#user.active == false")
  public void deactivateUser(User user) {
    user.setActive(false);
    userRepository.save(user);
  }
}
```

### 6. @Caching — Multiples Operaciones de Cache

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

### 7. Key Generator Personalizado

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

Uso:

```java
@Cacheable(value = "users", keyGenerator = "customKeyGenerator")
public User getUser(String id, String tenantId) {
  return userRepository.findByIdAndTenant(id, tenantId);
}
```

### 8. Multi-Cache con @CacheConfig

```java
@Service
@CacheConfig(cacheNames = {"users", "userList"}) // Nombres de cache por defecto para la clase
public class UserService {

  @Cacheable(key = "#id")
  public User getUserById(String id) {
    return userRepository.findById(id).orElseThrow();
  }

  @CacheEvict(allEntries = true)
  public void clearAll() {}
}
```

## Como Funciona

1. **Proxy AOP**: Spring envuelve beans `@Cacheable` en un proxy. Cuando se llama a un metodo, el proxy intercepta, verifica el cache, y retorna el valor cacheado o ejecuta el metodo y almacena el resultado.
2. **`@Cacheable`**: Antes de la ejecucion del metodo, el proxy verifica el cache para la clave. En hit, el valor cacheado se retorna y el metodo se salta. En miss, el metodo se ejecuta y el resultado se cachea.
3. **`@CachePut`**: El metodo siempre se ejecuta. Despues de la ejecucion, el resultado se coloca en el cache, sobrescribiendo cualquier entrada existente. Usar para updates donde quieres datos frescos tanto en DB como en cache.
4. **`@CacheEvict`**: Remueve entradas del cache. `allEntries = true` limpia todo el cache. `beforeInvocation = true` evicta antes de que el metodo se ejecute (util para seguridad de rollback).
5. **Resolucion de clave**: Por defecto, Spring usa todos los parametros del metodo como clave. Usa `key = "#id"` para especificar un solo parametro, o `keyGenerator` para logica personalizada.

## Variantes

### Cache Multi-Nivel Caffeine + Redis

```java
@Configuration
public class CacheConfig {

  @Bean
  @Primary
  public CompositeCacheManager cacheManager(
      RedisCacheManager redisManager,
      CaffeineCacheManager caffeineManager) {
    CompositeCacheManager manager = new CompositeCacheManager(
        caffeineManager, // L1 — verificado primero
        redisManager     // L2 — verificado segundo
    );
    manager.setFallbackToNoOpCache(false);
    return manager;
  }
}
```

### Cache con TTL por Entrada (Redis TTL)

```java
@Cacheable(value = "users", key = "#id")
@CacheEvict(value = "users", key = "#id", condition = "#result.updatedAt > T(java.time.Instant).now().minusSeconds(300)")
public User getUser(String id) {
  return userRepository.findById(id).orElseThrow();
}
```

### Cache Async (Spring 6+)

```java
@Cacheable(value = "users", key = "#id")
public CompletableFuture<User> getUserAsync(String id) {
  return CompletableFuture.supplyAsync(() ->
    userRepository.findById(id).orElseThrow()
  );
}
```

### Acceso Programatico al Cache

```java
@Service
public class UserService {

  @Autowired
  private CacheManager cacheManager;

  public void manualCacheOperation(String userId) {
    Cache cache = cacheManager.getCache("users");
    if (cache != null) {
      // Put manual
      cache.put(userId, new User(userId, "Alice"));
      // Get manual
      User cached = cache.get(userId, User.class);
      // Evict manual
      cache.evict(userId);
    }
  }
}
```

## Mejores Practicas

- **Usar `@Cacheable` para lecturas, `@CachePut` para writes, `@CacheEvict` para deletes**: Cada anotacion tiene un proposito especifico. No uses `@Cacheable` en metodos que mutan.
- **Establecer TTLs por cache**: Diferentes datos tienen diferentes requerimientos de frescura. Configura TTLs en el `RedisCacheManager`, no globalmente.
- **Usar `unless` para saltar caching de nulls o resultados no deseados**: `unless = "#result == null"` previene cachear valores null que enmascararian misses reales.
- **Evictar en writes**: Despues de `update` o `delete`, evicta la entrada de cache. De lo contrario, datos stale se sirven hasta que el TTL expira.
- **Usar `allEntries = true` con moderacion**: Limpiar todo el cache causa un pico en cache misses. Evicta claves especificas cuando sea posible.
- **Deshabilitar caching de `null`**: Usa `disableCachingNullValues()` para prevenir cachear resultados `null`, que pueden enmascarar errores de base de datos.

## Errores Comunes

- **Usar `@Cacheable` en metodos de update**: `@Cacheable` salta el metodo en cache hit — los updates nunca se ejecutan. Usa `@CachePut` para writes.
- **Falta `@EnableCaching`**: Sin esta anotacion en una clase `@Configuration`, las anotaciones de cache son no-ops.
- **Colisiones de claves entre metodos**: Dos metodos con `@Cacheable("users")` y diferentes parametros pueden colisionar si las claves se superponen. Usa expresiones de clave distintas.
- **Cachear objetos mutables**: Si el objeto cacheado se modifica despues de cachear, el cache mantiene una referencia al objeto mutado. Usa DTOs inmutables o deep copies.
- **No manejar fallos de cache**: Si Redis cae, las operaciones de cache lanzan excepciones. Configura un fallback o usa `errorHandler` para loguear y continuar.

## FAQ

**Spring Cache vs caching manual — cual es mejor?**

Las anotaciones de Spring Cache son declarativas y reducen boilerplate. Funcionan bien para patrones simples cache-aside. Para logica compleja (refresco condicional, multi-nivel, prevencion de stampede), usa caching programatico con `CacheManager` o una libreria de cache dedicada.

**Puedo usar @Cacheable con Spring reactivo (WebFlux)?**

Spring 6+ soporta `@Cacheable` con tipos reactivos (`Mono`, `Flux`). El cache almacena el wrapper reactivo, no el valor resuelto. Para caching reactivo adecuado, usa `Mono.cache()` o una libreria de cache reactiva.

**Como establezco diferentes TTLs para diferentes caches?**

Configura TTLs por cache en `RedisCacheManager` usando `withInitialCacheConfigurations(Map<String, RedisCacheConfiguration>)`. Cada nombre de cache obtiene su propia `RedisCacheConfiguration` con un TTL especifico.

**Que pasa cuando Redis no esta disponible?**

Por defecto, las operaciones de cache lanzan excepciones. Configura un `CacheErrorHandler` para loguear errores y hacer fallback a la ejecucion del metodo:

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

**Puedo usar @Cacheable con TTL condicional por entrada?**

`@Cacheable` de Spring no soporta TTL por entrada. Usa `@CachePut` con un template Redis personalizado que establezca TTL basado en el valor, o usa caching programatico para este caso de uso.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
