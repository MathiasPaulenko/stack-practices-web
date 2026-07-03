---
contentType: recipes
slug: java-caffeine-cache-configuration
title: "Configurar Caffeine Cache en Java con Politicas de Eviction"
description: "Configura Caffeine cache en una aplicacion Java con politicas de eviction por tamano, tiempo y peso para caching local de alto rendimiento."
metaDescription: "Configura Caffeine cache en Java con eviction por tamano, tiempo y peso. Usa integracion con Spring Boot, registra estadisticas y ajusta el rendimiento."
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
  - /guides/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura Caffeine cache en Java con eviction por tamano, tiempo y peso. Usa integracion con Spring Boot, registra estadisticas y ajusta el rendimiento."
  keywords:
    - java caffeine cache
    - cache eviction
    - spring boot cache
    - in-memory cache java
    - caffeine configuration
---

## Descripcion general

Caffeine es una libreria de caching Java de alto rendimiento que supera a Guava y ConcurrentHashMap usando una politica de eviction eficiente basada en el algoritmo Window TinyLfu. Soporta eviction por tamano, tiempo y peso, eviction basada en referencias (weak keys/values) y carga asincrona. A continuacion: configurar Caffeine standalone y con Spring Boot, estrategias de eviction, estadisticas de cache y tuning.

## Cuando Usar Esto

- Caching local en la aplicacion donde Redis o Memcached son excesivos
- Workloads de lectura intensa con patrones de acceso predecibles
- Cachear valores calculados, lookups de base de datos o respuestas HTTP en un solo JVM
- Aplicaciones Spring Boot que necesitan `@Cacheable` con un cache local rapido

## Prerrequisitos

- Java 17+
- Maven o Gradle
- Spring Boot 3+ (opcional, para integracion con Spring)

## Solucion

### 1. Agregar Dependencia Caffeine

```xml
<!-- pom.xml -->
<dependency>
  <groupId>com.github.ben-manes.caffeine</groupId>
  <artifactId>caffeine</artifactId>
  <version>3.1.8</version>
</dependency>
```

Para integracion con Spring Boot:

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

### 2. Cache Basico con Eviction por Tamano

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

// Get (retorna null si esta ausente)
User user = userCache.getIfPresent("user:123");

// Get con loader (calcula y cachea si esta ausente)
User loaded = userCache.get("user:456", key -> fetchUserFromDb("456"));

// Invalidar
userCache.invalidate("user:123");
userCache.invalidateAll();
```

### 3. Eviction por Tiempo

```java
// Evictar entradas 10 minutos despues de que fueron escritas
Cache<String, String> writeExpireCache = Caffeine.newBuilder()
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .maximumSize(5_000)
    .build();

// Evictar entradas 5 minutos despues del ultimo acceso
Cache<String, String> accessExpireCache = Caffeine.newBuilder()
    .expireAfterAccess(5, TimeUnit.MINUTES)
    .maximumSize(5_000)
    .build();

// Ambos: expirar 30 min despues de escritura, pero tambien si no se accede en 10 min
Cache<String, String> hybridCache = Caffeine.newBuilder()
    .expireAfterWrite(30, TimeUnit.MINUTES)
    .expireAfterAccess(10, TimeUnit.MINUTES)
    .build();
```

### 4. Eviction por Peso

Cuando las entradas tienen tamanos diferentes (ej., respuestas cacheadas de longitud variable):

```java
Cache<String, String> weightedCache = Caffeine.newBuilder()
    .maximumWeight(10_000_000) // 10MB total
    .weigher((String key, String value) -> value.length())
    .build();

weightedCache.put("small", "hello");       // peso: 5
weightedCache.put("large", "x".repeat(100_000)); // peso: 100000
```

### 5. Loading Cache (Auto-Poblar)

```java
import com.github.benmanes.caffeine.cache.LoadingCache;
import com.github.benmanes.caffeine.cache.Caffeine;

LoadingCache<String, Product> productCache = Caffeine.newBuilder()
    .maximumSize(5_000)
    .expireAfterWrite(15, TimeUnit.MINUTES)
    .refreshAfterWrite(10, TimeUnit.MINUTES) // refrescar antes de expirar
    .build(key -> fetchProductFromDb(key));

// Carga automaticamente en miss
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

### 7. Integracion con Spring Boot

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

  // Configuracion por cache
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

Usar con anotaciones:

```java
@Service
public class UserService {

  @Cacheable(value = "users", key = "#id")
  public User getUser(String id) {
    return userRepository.findById(id); // Solo llamado en cache miss
  }

  @CachePut(value = "users", key = "#user.id")
  public User updateUser(User user) {
    return userRepository.save(user); // Actualiza cache
  }

  @CacheEvict(value = "users", key = "#id")
  public void deleteUser(String id) {
    userRepository.deleteById(id); // Remueve del cache
  }

  @CacheEvict(value = "users", allEntries = true)
  public void clearUserCache() {
    // Limpiar todo el cache
  }
}
```

### 8. Estadisticas de Cache

```java
Cache<String, User> cache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .recordStats()
    .build();

// Despues de algunas operaciones...
com.github.benmanes.caffeine.cache.stats.CacheStats stats = cache.stats();

System.out.println("Hit rate: " + stats.hitRate());
System.out.println("Hits: " + stats.hitCount());
System.out.println("Misses: " + stats.missCount());
System.out.println("Evictions: " + stats.evictionCount());
System.out.println("Average load time: " + stats.averageLoadPenalty() + " ns");
System.out.println("Cache size: " + cache.estimatedSize());
```

## Como Funciona

1. **Window TinyLfu**: Caffeine usa una politica de admision basada en frecuencia. Las entradas nuevas van a un pequeno espacio ventana. Cuando el cache principal esta lleno, la entrada menos frecuentemente usada del espacio principal se compara con la frecuencia de la nueva entrada — la menos frecuente se evicta.
2. **Eviction por tamano**: Cuando se alcanza `maximumSize`, Caffeine evicta entradas basadas en la politica TinyLfu. La eviction ocurre asincronamente en lotes por rendimiento.
3. **Eviction por tiempo**: `expireAfterWrite` establece un TTL fijo desde la insercion. `expireAfterAccess` resetea el timer en cada lectura. Las entradas se limpian lazy — durante lecturas o mantenimiento programado, no en un timer.
4. **Eviction por peso**: La funcion `weigher` asigna un costo a cada entrada. Caffeine mantiene el peso total bajo `maximumWeight` evictando las entradas menos valiosas.
5. **Loading cache**: La variante `build(loader)` auto-calcula entradas faltantes. `refreshAfterWrite` dispara un refresco en background antes de la expiracion, sirviendo datos stale mientras el nuevo valor carga.

## Variantes

### Eviction Basada en Referencias

Permitir al garbage collector evictar entradas cuando la memoria es baja:

```java
Cache<String, User> cache = Caffeine.newBuilder()
    .weakKeys()        // Las claves usan weak references — evictadas cuando la key es GC'd
    .weakValues()      // Los valores usan weak references
    .build();

Cache<String, User> softCache = Caffeine.newBuilder()
    .softValues()      // Los valores usan soft references — GC evicta bajo presion de memoria
    .build();
```

### Limpieza Programada

Forzar limpieza periodica en lugar de eviction lazy:

```java
Cache<String, String> cache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .scheduler(Scheduler.systemScheduler()) // Habilita limpieza proactiva
    .build();
```

### Cache Multi-Nivel (L1 Caffeine + L2 Redis)

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
      l1.put(key, l2Value); // Poblar L1
      return l2Value;
    }

    String dbValue = fetchFromDb(key);
    l1.put(key, dbValue);
    l2.opsForValue().set(key, dbValue, 30, TimeUnit.MINUTES);
    return dbValue;
  }
}
```

## Mejores Practicas

- **Dimensionar el cache**: Establecer `maximumSize` segun el heap disponible. Un cache demasiado grande causa presion de GC; demasiado pequeno causa evictions.
- **Usar `recordStats()` en produccion**: Monitorear el hit rate. Menos de 50% significa que el cache esta mal configurado o el workload no es cacheable.
- **Preferir `expireAfterWrite` sobre `expireAfterAccess`**: El expiry por acceso puede mantener datos stale indefinidamente si se leen constantemente.
- **Usar `refreshAfterWrite` para caches calientes**: Refresca en background, sirviendo datos stale durante el refresco — sin cache stampede.
- **Establecer `initialCapacity`**: Reduce el rehashing si conoces el tamano esperado.
- **Usar configs por cache en Spring**: Diferentes caches tienen diferentes patrones de acceso — no uses una config global.

## Errores Comunes

- **Sin `maximumSize`**: El cache crece sin limite hasta OOM. Siempre establece un limite de tamano o peso.
- **Usar `weakKeys` con claves String**: Los strings interned pueden ser GC'd inesperadamente. Usar `weakKeys` solo con claves objeto que tienen un ciclo de vida claro.
- **Olvidar `recordStats()`**: Las estadisticas estan deshabilitadas por defecto. Agregalo antes de necesitar metricas.
- **Cache demasiado grande para el heap**: Un cache de 1M entradas con objetos grandes puede consumir gigabytes. Perfila el uso de heap.
- **No manejar `null` del loader**: Si el loader retorna `null`, Caffeine cachea la ausencia. Usar `Optional` o lanzar excepcion para evitar esto.

## FAQ

**Caffeine vs Guava Cache — cual deberia usar?**

Caffeine es el sucesor de Guava Cache, mantenido por el mismo autor. Ofrece mejores hit rates, mayor throughput y menor overhead de memoria. Usar Caffeine para proyectos nuevos. Guava Cache esta en modo mantenimiento.

**Como se compara Caffeine con Redis?**

Caffeine es un cache en-proceso, por-JVM. Redis es un cache distribuido, entre-procesos. Usar Caffeine para instancia unica o como cache L1 frente a Redis. Para consistencia distribuida, usar Redis como fuente de verdad.

**Caffeine soporta caching distribuido?**

No. Caffeine es estrictamente local. Para caching distribuido, combinalo con Redis (patron L1+L2) o usa un cache distribuido como Hazelcast o Ignite.

**Cual es el tamano maximo de cache?**

Limitado solo por el tamano del heap. Para caches de multi-gigabyte, considera soluciones off-heap como MapDB o Ehcache con almacenamiento off-heap.

**Como difiere `refreshAfterWrite` de `expireAfterWrite`?**

`expireAfterWrite` remueve la entrada despues del TTL — la siguiente lectura bloquea mientras el nuevo valor carga. `refreshAfterWrite` dispara un refresco en background pero sigue sirviendo el valor viejo hasta que el nuevo esta listo. Usar refresh para caches calientes donde el bloqueo es inaceptable.
