---






contentType: patterns
slug: write-through-cache-pattern
title: "Patron Write-Through Cache"
description: "Escribe sincronamente en cache y backing store para que el cache siempre tenga los datos mas recientes sin invalidacion basada en TTL."
metaDescription: "Patron write-through cache: escribe sincronamente en cache y base de datos para mantener consistencia. Implementa con Redis y Python, Java y TypeScript."
difficulty: intermediate
topics:
  - caching
  - design
tags:
  - caching
  - write-through
  - patron
  - redis
  - cache-consistency
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/cache-aside-pattern
  - /patterns/read-through-cache-pattern
  - /recipes/nodejs-redis-cache-invalidation
  - /patterns/refresh-ahead-cache-pattern
  - /patterns/write-behind-cache-pattern
  - /patterns/cache-invalidation-pattern
  - /guides/complete-guide-redis-caching-strategies
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron write-through cache: escribe sincronamente en cache y base de datos para mantener consistencia. Implementa con Redis y Python, Java y TypeScript."
  keywords:
    - write-through cache
    - cache pattern
    - cache consistency
    - redis caching
    - synchronous write cache
    - python cache
    - java cache






---

# Patron Write-Through Cache

## Descripcion general

En un write-through cache, cada operacion de escritura va tanto al cache como al backing store de forma sincrona. La aplicacion escribe en el cache, el cache escribe en la base de datos, y ambos tienen exito antes de que la operacion devuelva. Esto garantiza que el cache siempre refleje los datos mas recientes.

El trade-off es latencia de escritura: cada escritura incurre el coste de actualizar tanto cache como base de datos. Las lecturas permanecen rapidas porque el cache siempre esta actualizado. Este patron suits workloads de lectura intensa donde la consistencia de datos entre cache y base de datos es critica.

## Cuando usarlo


- For alternatives, see [Read-Through Cache Pattern](/es/patterns/read-through-cache-pattern/).

- Workloads de lectura intensa donde las lecturas superan ampliamente a las escrituras
- Necesitas consistencia fuerte entre cache y base de datos
- Datos stale en cache causan problemas de correccion (sistemas financieros, inventario)
- Quieres eliminar logica de invalidacion de cache manteniendo el cache siempre fresco
- La latencia de escritura es aceptable a cambio de rendimiento de lectura y consistencia

## Solucion

### Python con Redis

```python
import redis
import json
from typing import Any

class WriteThroughCache:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def write(self, key: str, value: Any, db_writer: callable, ttl: int = 3600) -> Any:
        serialized = json.dumps(value)

        # Escribir a base de datos primero (fuente de verdad)
        db_writer(value)

        # Luego escribir en cache
        self.redis.setex(key, ttl, serialized)

        return value

    def write_transaction(self, key: str, value: Any, db_writer: callable, ttl: int = 3600) -> Any:
        pipe = self.redis.pipeline()
        try:
            # Escribir a base de datos
            db_writer(value)

            # Encolar escritura de cache
            pipe.setex(key, ttl, json.dumps(value))
            pipe.execute()

            return value
        except Exception as e:
            # Si la escritura a DB tiene exito pero la de cache falla, invalidar cache
            # para prevenir datos stale en la siguiente lectura
            self.redis.delete(key)
            raise


cache = WriteThroughCache(redis.Redis(host='localhost', port=6379))

def update_user(user_id: str, name: str, email: str) -> dict:
    user = {"id": user_id, "name": name, "email": email}
    return cache.write(
        f"user:{user_id}",
        user,
        lambda u: db.execute(
            "UPDATE users SET name = %s, email = %s WHERE id = %s",
            [u["name"], u["email"], u["id"]]
        ),
        ttl=1800
    )
```

### TypeScript con Redis

```typescript
import { createClient } from 'redis';

class WriteThroughCache {
  private client: ReturnType<typeof createClient>;

  constructor(client: ReturnType<typeof createClient>) {
    this.client = client;
  }

  async write<T>(
    key: string,
    value: T,
    dbWriter: (value: T) => Promise<void>,
    ttl = 3600
  ): Promise<T> {
    try {
      // Escribir a base de datos primero
      await dbWriter(value);

      // Luego actualizar cache
      await this.client.set(key, JSON.stringify(value), { EX: ttl });

      return value;
    } catch (error) {
      // Si la escritura a DB falla, no actualizar cache
      // Si la escritura de cache falla, invalidar para prevenir lecturas stale
      await this.client.del(key).catch(() => {});
      throw error;
    }
  }

  async delete(key: string, dbDeleter: () => Promise<void>): Promise<void> {
    await dbDeleter();
    await this.client.del(key);
  }
}

// Uso
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();
const cache = new WriteThroughCache(redisClient);

async function updateUser(userId: string, name: string, email: string): Promise<User> {
  const user = { id: userId, name, email };
  return cache.write(
    `user:${userId}`,
    user,
    async (u) => {
      await db.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [u.name, u.email, u.id]
      );
    },
    1800
  );
}
```

### Java con Spring Cache

```java
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // @CachePut siempre escribe en cache despues de la ejecucion del metodo
    // El metodo escribe en DB, Spring escribe el resultado en cache
    @CachePut(value = "users", key = "#user.id")
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    @CachePut(value = "users", key = "#id")
    public User updateUser(Long id, String name, String email) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("User not found"));
        user.setName(name);
        user.setEmail(email);
        return userRepository.save(user);
    }

    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
```

### Combinar Read-Through y Write-Through

```python
class ReadWriteThroughCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl

    def read(self, key: str, loader: callable) -> Any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        value = loader()
        self.redis.setex(key, self.ttl, json.dumps(value))
        return value

    def write(self, key: str, value: Any, db_writer: callable, ttl: int = None) -> Any:
        db_writer(value)
        self.redis.setex(key, ttl or self.ttl, json.dumps(value))
        return value

    def delete(self, key: str, db_deleter: callable) -> None:
        db_deleter()
        self.redis.delete(key)


cache = ReadWriteThroughCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.read(
        f"user:{user_id}",
        lambda: db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    )

def update_user(user_id: str, **fields) -> dict:
    user = {"id": user_id, **fields}
    return cache.write(
        f"user:{user_id}",
        user,
        lambda u: db.execute("UPDATE users SET name=%s WHERE id=%s", [u["name"], u["id"]])
    )
```

## Explicacion

El patron write-through asegura consistencia de datos escribiendo en cache y base de datos en secuencia:

1. **Escribir a base de datos** — la base de datos es la fuente de verdad. Escribe aqui primero para que si la escritura de cache falla, los datos sigan persistidos.
2. **Escribir a cache** — despues de que la escritura a base de datos tenga exito, actualiza el cache con el nuevo valor.
3. **Manejo de errores** — si la escritura de cache falla despues de que la escritura a DB tiene exito, invalida la entrada de cache. La siguiente lectura fallara y recargara desde la base de datos via read-through o cache-aside.

El orden importa: base de datos primero, cache segundo. Si escribes en cache primero y la escritura a DB falla, el cache tiene datos que no existen en la base de datos. Si escribes a DB primero y la escritura de cache falla, el cache tiene datos stale, pero la siguiente lectura read-through lo arreglara.

## Variantes

| Enfoque | Orden de escritura | Ideal para |
|---------|-------------------|------------|
| DB primero, luego cache | DB luego cache | La mayoria de casos, default seguro |
| Cache primero, luego DB | Cache luego DB | Latencia de escritura ultra-baja (riesgoso) |
| Write-around | Solo DB, sin cache | Datos write-once, read-rarely |
| Write-behind | Cache primero, DB asincrono | Escrituras de alto throughput (consistencia eventual) |
| Transaccional | Ambos en una transaccion | Requisitos de consistencia fuerte |

## Buenas practicas

- **Escribe a base de datos primero** — la base de datos es la fuente de verdad. Si la escritura de cache falla, los datos siguen persistidos.
- **Invalida en fallo de escritura de cache** — si la escritura de cache falla despues de la escritura a DB, borra la key para que la siguiente lectura obtenga datos frescos.
- **Usa un TTL como red de seguridad** — incluso con write-through, establece un TTL. Si se pierde una escritura (particion de red, bug), el cache se auto-repara al expirar el TTL.
- **Mantén operaciones de escritura idempotentes** — reintentar una operacion write-through no debe causar datos duplicados. Usa upserts o idempotency keys.
- **Monitoriza la latencia de escritura** — write-through anade tiempo de escritura de cache a cada escritura. Si la latencia es demasiado alta, considera write-behind para datos no criticos.

## Errores comunes

- **Escribir en cache primero** — si la escritura a DB falla, el cache tiene datos que no existen. Siempre escribe a DB primero.
- **No manejar fallo de escritura de cache** — si la escritura de cache falla silenciosamente, el cache sirve datos stale hasta que el TTL expira. Siempre invalida en fallo.
- **Usar write-through para workloads de escritura intensa** — cada escritura hitting cache y DB. Para workloads write-heavy, usa write-behind o write-around.
- **No establecer un TTL** — incluso con write-through, un TTL captura casos edge donde se pierde una escritura. Establece un TTL como red de seguridad.
- **Cachear demasiado** — write-through escribe en cache en cada update. Cachear datos raramente leidos desperdicia memoria y anade latencia de escritura sin beneficio.

## Preguntas frecuentes

### Cual es la diferencia entre write-through y write-behind?

Write-through escribe en cache y base de datos sincronamente. La operacion no devuelve hasta que ambos tienen exito. Write-behind escribe en cache primero y asincronamente a base de datos. Write-through es consistente pero mas lento; write-behind es mas rapido pero eventualmente consistente.

### Cuando debo usar write-through sobre cache-aside?

Usa write-through cuando necesitas que el cache siempre tenga los datos mas recientes despues de una escritura. Cache-aside requiere invalidacion explicita despues de escrituras, que los desarrolladores pueden olvidar. Write-through garantiza consistencia.

### Que pasa si la escritura a base de datos falla?

El cache no se actualiza. La operacion lanza un error. El cache retiene el valor anterior (o ningun valor si la key es nueva). La aplicacion debe manejar el error y reintentar o notificar al usuario.

### Puedo combinar read-through y write-through?

Si. Esta es la combinacion mas comun. Las lecturas van a traves del cache con un callback loader. Las escrituras actualizan tanto cache como base de datos. El cache es siempre consistente para lecturas y escrituras. Esta combinacion proporciona lo mejor de ambos patrones.
