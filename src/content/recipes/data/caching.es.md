---
contentType: recipes
slug: caching
title: "Caché y Memoización en Python, JavaScript y Java"
description: "Cómo cachear computaciones costosas y respuestas de API usando caches en memoria, LRU, TTL y distribuidos en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de caché y memoización en Python, JavaScript y Java. Cubre LRU, TTL, Redis y estrategias de invalidación de caché."
difficulty: intermediate
topics:
  - data
  - performance
tags:
  - caching
  - memoization
  - lru
  - ttl
  - redis
  - performance
  - python
  - javascript
  - java
relatedResources:
  - /recipes/redis-cache-aside-pattern
  - /recipes/nodejs-in-memory-cache-lru
  - /recipes/java-caffeine-cache-configuration
  - /recipes/python-redis-cache-decorator
  - /recipes/multi-level-cache-l1-l2
  - /recipes/redis-distributed-lock
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Ejemplos prácticos de caché y memoización en Python, JavaScript y Java. Cubre LRU, TTL, Redis y estrategias de invalidación de caché."
  keywords:
    - caching
    - memoización
    - lru cache
    - redis cache
    - invalidación de cache
    - python caching
    - javascript caching
    - java caching
    - rendimiento
---

## Resumen

El caching almacena el resultado de computaciones costosas para que requests posteriores por
los mismos datos se sirvan más rápido. La memoización es una forma de caching donde los
valores de retorno de funciones se almacenan según sus argumentos. Es una de las
optimizaciones de rendimiento más efectivas, pero agrega complejidad: datos stale,
invalidación y consistencia distribuida.

## Cuándo Usar

- Llamar repetidamente queries costosas de base de datos o endpoints de API.
- Calcular resultados matemáticos o estadísticos complejos.
- Servir datos de configuración estáticos o que cambian poco.
- Reducir latencia en sistemas de mucho tráfico y lectura intensiva.
- Descargar carga de servicios downstream.

## Cuándo NO Usar

- Los datos cambian más rápido de lo que se invalida la caché.
- Se requiere consistencia fuerte y no se toleran lecturas stale breves.
- El working set es mayor que la memoria de caché disponible sin política de evicción.
- No mediste el cuello de botella — cacheá solo después de perfilar.

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

# Caché TTL con expiración
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

// Caché LRU con límite de tamaño
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
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

### Java con Caffeine

```java
import com.github.benmanes.caffeine.cache.*;

Cache<String, User> userCache = Caffeine.newBuilder()
    .maximumSize(100)
    .expireAfterWrite(Duration.ofMinutes(5))
    .build();

// Obtener o computar
User user = userCache.get(userId, id -> db.findById(id));

// Put manual
userCache.put(userId, updatedUser);

// Invalidar
userCache.invalidate(userId);
```

### Redis cache-aside

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_user(user_id):
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    user = db.find(user_id)
    r.setex(f"user:{user_id}", 300, json.dumps(user))
    return user
```

## Explicación

Una caché vive entre el llamador y la fuente de datos costosa. En un miss, la caché obtiene,
almacena y devuelve el valor. En un hit, devuelve el valor almacenado. El TTL limita la
antigüedad, el tamaño máximo dispara la evicción y la invalidación elimina entradas cuando
los datos subyacentes cambian.

## Variantes

|Estrategia|Cuándo usar|Compromiso|
|------------|-------------|------------|
|TTL|Los datos cambian predeciblemente|Puede servir datos stale brevemente|
|Write-through|La consistencia es crítica|Writes más lentos, reads más simples|
|Write-behind|Alto throughput de escritura|Riesgo de pérdida de datos ante crash|
|Cache-aside|Flexibilidad, read-heavy|La aplicación maneja la lógica de caché|
|Evicción (LRU/LFU)|Restricciones de memoria|Puede evictar datos calientes prematuramente|

## Buenas Prácticas

- Cacheá los datos más costosos y los más frecuentes, no todo.
- Definí TTLs con criterio: muy cortos hacen inútil la caché; muy largos sirven datos stale.
- Monitoreá hit rates. Una caché con menos del 80% de hits suele no valer la complejidad.
- Manejá fallos de caché con elegancia. Si Redis cae, caé en la base de datos.
- Versioná las claves o incluí la versión de la app para evitar datos stale tras deploys.
- Invalidá proactivamente cuando los datos subyacentes cambian, no solo cuando expira el TTL.

## Errores Comunes

- Cachear datos que cambian muy frecuentemente o raramente se piden.
- No manejar cache stampede cuando expira una clave popular.
- Guardar caches sin límite que crecen hasta agotar la memoria.
- Ignorar la consistencia de caché en sistemas distribuidos.
- Olvidar invalidar la caché después de mutaciones.

## Preguntas Frecuentes

### ¿Qué es el cache stampede y cómo lo prevengo?

Un stampede ocurre cuando muchos requests golpean una clave de caché ausente al mismo tiempo.
Usá locking, semáforos por clave o expiración temprana probabilística para reducir la carga
en la fuente.

### ¿Cuándo uso Redis en vez de una caché en memoria?

Usá Redis cuando necesitás una caché compartida entre instancias, persistencia o estructuras
de datos avanzadas. Las cachés en memoria son más rápidas pero locales a un proceso.

### ¿Debería cachear respuestas de API?

Sí, si los datos son cacheables y el endpoint es read-heavy. Usá el header `Cache-Control`
para comunicar cacheabilidad a clientes y CDNs.

### ¿Cómo elijo entre evicción LRU y LFU?

LRU elimina el menos recientemente usado y funciona bien cuando hay localidad temporal. LFU
elimina el menos frecuentemente usado y funciona mejor cuando un pequeño set de claves es
accedido intensivamente.

### ¿Cómo mantengo la caché consistente entre servicios?

Usá TTLs cortos, pub/sub de invalidación o write-through. Para consistencia fuerte, considerá
si la caché es apropiada en absoluto.
