---
contentType: recipes
slug: caching
title: "Caching y Memoización"
description: "Cómo cachear computaciones costosas y respuestas de API usando caches en memoria, LRU y distribuidos en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de caching en Python, JavaScript y Java. Aprende memoización, TTL y estrategias de invalidación de cache."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - caching
  - java
  - parsing
  - json
relatedResources:
  - /recipes/call-rest-api
  - /recipes/pagination
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de caching en Python, JavaScript y Java. Aprende memoización, TTL y estrategias de invalidación de cache."
  keywords:
    - caching
    - memoización
    - lru cache
    - redis cache
    - invalidación de cache
    - python caching
    - javascript caching
    - java caching
    - optimización de rendimiento
---

## Visión general

El caching almacena el resultado de computaciones costosas para que requests posteriores por los mismos datos puedan ser servidos más rápido. La memoización es una forma específica de caching donde los valores de retorno de funciones se cachean basados en sus argumentos.

El caching es una de las optimizaciones de rendimiento más útiles, pero introduce complejidad: datos stale, invalidación de cache y consistencia distribuida.

## Cuándo usarlo

Usa esta recipe cuando:

- Llamas queries de base de datos o [endpoints de API](/recipes/api/call-rest-api) costosos repetidamente
- Computas resultados matemáticos o estadísticos complejos
- Sirves datos de configuración estáticos o de cambio lento
- Reduces latencia en sistemas de lectura intensa de alto tráfico. Consulta [Pagination](/recipes/api/pagination) para gestionar grandes conjuntos de resultados.
- Descargas carga de servicios downstream

## Solución

### Python

```python
from functools import lru_cache
from cachetools import TTLCache

# Memoización LRU built-in
@lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # Instantáneo, cacheado

# TTL cache con expiración
api_cache = TTLCache(maxsize=100, ttl=300)  # 5 minutos

def fetch_user(user_id):
    if user_id in api_cache:
        return api_cache[user_id]
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    api_cache[user_id] = user
    return user
```

### JavaScript

```javascript
// Memoización simple
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const fib = memoize((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
console.log(fib(100)); // Instantáneo

// LRU cache con límite de tamaño
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value); // Mover al final (más reciente)
    return value;
  }
  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, value);
  }
}
```

### Java

```java
import com.github.benmanes.caffeine.cache.*;

Cache<String, User> userCache = Caffeine.newBuilder()
    .maximumSize(100)
    .expireAfterWrite(Duration.ofMinutes(5))
    .build();

// Get or compute
User user = userCache.get(userId, id -> db.findById(id));

// Put manual
userCache.put(userId, updatedUser);

// Invalidar
userCache.invalidate(userId);
```

## Estrategias de Invalidación de Cache

| Estrategia | Cuándo usar | Compromiso |
|------------|-------------|------------|
| **TTL (Time To Live)** | Los datos cambian predeciblemente | Puede servir datos stale brevemente |
| **Write-through** | La consistencia es crítica | Writes más lentos, reads más simples |
| **Write-behind** | Alto throughput de escritura | Riesgo de pérdida de datos en crash |
| **Cache-aside** | Flexibilidad, lectura intensiva | La aplicación maneja la lógica de cache |
| **Eviction (LRU/LFU)** | Restricciones de memoria | Puede evictar datos hot prematuramente |

## Lo que funciona

- **Cachea al nivel correcto**: No cachees todo. Cachea los datos más costosos y más frecuentemente accedidos.
- **Establece TTLs consideradamente**: Demasiado corto = inútil. Demasiado largo = datos stale.
- **Monitorea hit rates**: Un cache con <80% hit rate generalmente no vale la complejidad. Consulta [Logging](/recipes/api/logging) para métricas de cache.
- **Maneja fallos de cache graceful**: Si Redis está caído, fallback a la base de datos. No falles el request.
- **Versiona cache keys**: Incluye la versión de datos o app en la key para prevenir datos stale después de deploys.
- **Invalida proactivamente**: Limpia entradas de cache cuando los datos subyacentes cambian, no solo cuando expira el TTL.

## Errores comunes

- Cachear datos que cambian demasiado frecuentemente o raramente se solicitan
- No manejar cache stampede (thundering herd) cuando expira el TTL
- Almacenar caches sin bounds que crecen hasta out-of-memory
- Ignorar consistencia de cache en sistemas distribuidos
- Olvidar invalidar cache después de mutaciones

## Preguntas frecuentes

**P: ¿Qué es cache stampede y cómo lo prevengo?**
R: El cache stampede ocurre cuando muchos requests golpean simultáneamente una key de cache faltante. Usa locking, semáforos per-key, o expiración temprana probabilística.

**P: ¿Cuándo debería usar Redis en lugar de caching en memoria?**
R: Usa Redis cuando necesites cache compartido entre múltiples instancias de aplicación, persistencia, o estructuras de datos avanzadas. Consulta [Connection Pooling](/recipes/performance/connection-pooling) para gestionar conexiones Redis.

**P: ¿Debería cachear respuestas de API?**
R: Sí, si los datos son cacheables y el endpoint es de lectura intensa. Usa el header Cache-Control para comunicar cacheability a clientes y CDNs.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
