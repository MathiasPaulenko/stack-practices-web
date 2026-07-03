---
contentType: patterns
slug: write-behind-cache-pattern
title: "Patron Write-Behind Cache"
description: "Escribe en cache sincronamente y persiste a la base de datos asincronamente para workloads de escritura de alto throughput con consistencia eventual."
metaDescription: "Patron write-behind cache: escribe en cache sincrono, persiste a DB asincrono. Escrituras de alto throughput con consistencia eventual en Redis y Python."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - write-behind
  - patron
  - redis
  - eventual-consistency
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/design/write-through-cache-pattern
  - /patterns/design/read-through-cache-pattern
  - /patterns/design/cache-aside-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron write-behind cache: escribe en cache sincrono, persiste a DB asincrono. Escrituras de alto throughput con consistencia eventual en Redis y Python."
  keywords:
    - write-behind cache
    - write-back cache
    - async cache write
    - eventual consistency cache
    - redis write-behind
    - high throughput caching
---

# Patron Write-Behind Cache

## Descripcion general

En un write-behind cache (tambien llamado write-back), las escrituras van al cache sincronamente y a la base de datos asincronamente. La aplicacion escribe en el cache, obtiene un acuse de recibo inmediato, y un proceso en segundo plano vuelca los cambios cacheados a la base de datos en lotes.

Esto desacopla la latencia de escritura del rendimiento de la base de datos. El cache (tipicamente en memoria o Redis) absorbe escrituras a velocidad de memoria. La base de datos recibe escrituras batched a una tasa controlada, reduciendo carga y permitiendo mayor throughput.

El trade-off es consistencia eventual: no se garantiza que el cache y la base de datos esten sincronizados en ningun momento. Si el cache cae antes de volcar, las escrituras confirmadas se pierden.

## Cuando usarlo

- Workloads de escritura intensa donde la latencia de escritura debe mantenerse baja
- La base de datos no puede seguir el ritmo de escritura
- Puedes tolerar periodos breves de inconsistencia entre cache y base de datos
- Escrituras batched a la base de datos son mas eficientes que escrituras individuales
- Tienes mecanismos para recuperar de fallos de cache (WAL, replicacion)

## Solucion

### Python con Redis y volcado en segundo plano

```python
import redis
import json
import threading
import time
from collections import defaultdict

class WriteBehindCache:
    def __init__(self, redis_client: redis.Redis, db_writer: callable, flush_interval: float = 5.0):
        self.redis = redis_client
        self.db_writer = db_writer
        self.flush_interval = flush_interval
        self._dirty_keys = set()
        self._lock = threading.Lock()
        self._running = True
        self._flush_thread = threading.Thread(target=self._flush_loop, daemon=True)
        self._flush_thread.start()

    def write(self, key: str, value: dict, ttl: int = 3600) -> dict:
        serialized = json.dumps(value)
        self.redis.setex(key, ttl, serialized)

        with self._lock:
            self._dirty_keys.add(key)

        return value

    def _flush_loop(self):
        while self._running:
            time.sleep(self.flush_interval)
            self._flush()

    def _flush(self):
        with self._lock:
            if not self._dirty_keys:
                return
            keys_to_flush = list(self._dirty_keys)
            self._dirty_keys.clear()

        batch = []
        for key in keys_to_flush:
            value = self.redis.get(key)
            if value is not None:
                batch.append(json.loads(value))

        if batch:
            try:
                self.db_writer(batch)
            except Exception as e:
                with self._lock:
                    self._dirty_keys.update(keys_to_flush)
                raise

    def flush_now(self):
        self._flush()

    def shutdown(self):
        self._running = False
        self._flush_thread.join(timeout=10)
        self._flush()


def batch_update_users(users: list[dict]):
    if not users:
        return
    values = []
    for u in users:
        values.extend([u["name"], u["email"], u["id"]])
    placeholders = ",".join(f"(%s, %s, %s)" for _ in users)
    db.execute(
        f"UPDATE users SET name = %s, email = %s WHERE id = %s VALUES {placeholders}",
        values
    )


cache = WriteBehindCache(
    redis.Redis(host='localhost', port=6379),
    db_writer=batch_update_users,
    flush_interval=2.0
)

def update_user(user_id: str, name: str, email: str) -> dict:
    user = {"id": user_id, "name": name, "email": email}
    return cache.write(f"user:{user_id}", user, ttl=3600)
```

### TypeScript con Redis y cola

```typescript
import { createClient } from 'redis';

class WriteBehindCache {
  private client: ReturnType<typeof createClient>;
  private dirtyKeys: Set<string> = new Set();
  private flushTimer: NodeJS.Timeout | null = null;
  private flushInterval: number;

  constructor(
    client: ReturnType<typeof createClient>,
    private dbWriter: (batch: Array<{ key: string; value: any }>) => Promise<void>,
    flushIntervalMs = 5000
  ) {
    this.client = client;
    this.flushInterval = flushIntervalMs;
    this.startFlushTimer();
  }

  async write<T>(key: string, value: T, ttl = 3600): Promise<T> {
    await this.client.set(key, JSON.stringify(value), { EX: ttl });
    this.dirtyKeys.add(key);
    return value;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  async flush(): Promise<void> {
    if (this.dirtyKeys.size === 0) return;

    const keys = Array.from(this.dirtyKeys);
    this.dirtyKeys.clear();

    const batch: Array<{ key: string; value: any }> = [];
    for (const key of keys) {
      const raw = await this.client.get(key);
      if (raw !== null) {
        batch.push({ key, value: JSON.parse(raw) });
      }
    }

    if (batch.length > 0) {
      try {
        await this.dbWriter(batch);
      } catch (error) {
        for (const item of batch) {
          this.dirtyKeys.add(item.key);
        }
        throw error;
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
  }
}

// Uso
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

const cache = new WriteBehindCache(
  redisClient,
  async (batch) => {
    const values = batch.flatMap(b => [b.value.name, b.value.email, b.value.id]);
    const placeholders = batch.map(() => '($1, $2, $3)').join(', ');
    await db.query(
      `UPDATE users SET name = $1, email = $2 WHERE id = $3 VALUES ${placeholders}`,
      values
    );
  },
  3000
);

await cache.write(`user:${userId}`, { id: userId, name, email });
```

### Java con Spring Cache y async

```java
import org.springframework.cache.annotation.CachePut;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WriteBehindCacheService {

    private final UserRepository userRepository;
    private final Map<String, User> dirtyEntries = new ConcurrentHashMap<>();

    public WriteBehindCacheService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @CachePut(value = "users", key = "#user.id")
    public User writeUser(User user) {
        dirtyEntries.put(user.getId().toString(), user);
        return user;
    }

    @Scheduled(fixedDelay = 5000)
    public void flushToDatabase() {
        if (dirtyEntries.isEmpty()) return;

        List<User> batch = new ArrayList<>(dirtyEntries.values());
        dirtyEntries.clear();

        try {
            userRepository.saveAll(batch);
        } catch (Exception e) {
            for (User u : batch) {
                dirtyEntries.put(u.getId().toString(), u);
            }
        }
    }
}
```

## Explicacion

El patron write-behind separa el acuse de escritura de la persistencia:

1. **Escritura a cache** — la aplicacion escribe en el cache. La escritura se acusa inmediatamente. El llamador no espera a la base de datos.
2. **Tracking de dirty** — el cache marca la key escrita como dirty, significando que la base de datos aun no se ha actualizado.
3. **Volcado en segundo plano** — un timer o evento dispara un volcado. El cache recolecta todas las entradas dirty, las envia a la base de datos en lote y limpia el set dirty.
4. **Recuperacion de fallos** — si la escritura a base de datos falla, las keys dirty se re-encolan para el siguiente volcado. Esto asegura entrega eventual.

El insight clave es que las lecturas siempre van al cache, que tiene los datos mas recientes. La base de datos se queda atras pero eventualmente alcanza. Esto funciona cuando la aplicacion lee del cache, no de la base de datos.

## Variantes

| Enfoque | Disparador de volcado | Ideal para |
|---------|----------------------|------------|
| Volcado por tiempo | Intervalo fijo (ej. 5s) | Workloads de escritura estables |
| Volcado por tamano de lote | Cuando N entradas dirty se acumulan | Escrituras de alto volumen |
| Volcado hibrido | Tiempo O tamano de lote, lo que ocurra primero | Tasas de escritura variables |
| Volcado por evento | En eventos especificos (ej. shutdown) | Degradacion graceful |
| Volcado con WAL | Write-ahead log para durabilidad | Requisitos de recuperacion de crash |

## Buenas practicas

- **Usa un cache durable** — si el cache cae, las escrituras no volcadas se pierden. Usa Redis con persistencia (AOF o RDB) para reducir el riesgo de perdida.
- **Batchea escrituras a base de datos** — la ganancia principal de rendimiento viene del batching. Agrupa multiples escrituras en una sola sentencia SQL o transaccion.
- **Implementa retry en fallo de volcado** — si la base de datos no esta disponible temporalmente, re-encola las keys dirty. Usa backoff exponencial para evitar saturar una base de datos en recuperacion.
- **Vuelca en shutdown** — cuando la aplicacion se detiene, vuelca todas las entradas dirty para evitar perdida. Registra un shutdown hook.
- **Monitoriza el conteo de dirty** — si las entradas dirty crecen sin limite, la tasa de volcado es demasiado lenta. Aumenta la frecuencia o el tamano de lote.

## Errores comunes

- **No volcar en shutdown** — si el proceso cae, las entradas dirty se pierden. Siempre vuelca en shutdown graceful y usa un cache durable.
- **Volcar una entrada a la vez** — esto derrocha el proposito de write-behind. Batchea escrituras para reducir la carga en la base de datos.
- **No reintentar en fallo** — si un volcado falla y las keys dirty se limpian, los datos se pierden. Siempre re-encola en fallo.
- **Usar write-behind para datos financieros** — la consistencia eventual significa que la base de datos puede no reflejar el estado mas reciente. Usa write-through para datos que requieren persistencia inmediata.
- **No manejar eviccion del cache** — si una entrada dirty se evicte del cache antes de volcar, la escritura se pierde. Usa un set dirty separado o write-ahead log.

## Preguntas frecuentes

### Cual es la diferencia entre write-behind y write-through?

Write-through escribe en cache y base de datos sincronamente. El llamador espera a ambos. Write-behind escribe en cache sincronamente y en base de datos asincronamente. El llamador espera solo al cache. Write-through es consistente; write-behind es eventualmente consistente.

### Como prevengo perdida de datos si el cache cae?

Usa Redis con persistencia AOF (Append-Only File). AOF escribe cada operacion a disco antes de acusar recibo. Si Redis cae, repasa el AOF al reiniciar. Para garantias mas fuertes, usa un write-ahead log (WAL) en la aplicacion antes de escribir al cache.

### Cuando es write-behind mejor que write-through?

Write-behind es mejor cuando el throughput de escritura es mas importante que la consistencia inmediata. Ejemplos: contadores de vistas, eventos de analytics, preferencias de usuario. Write-through es mejor cuando la base de datos debe reflejar el estado mas reciente inmediatamente: transacciones financieras, actualizaciones de inventario.

### Puedo combinar write-behind con read-through?

Si. Las lecturas van a traves del cache con un callback loader. Las escrituras van al cache con persistencia asincrona a base de datos. El cache siempre tiene los datos mas recientes para lecturas, y la base de datos eventualmente alcanza. Esta combinacion maneja workloads de lectura y escritura intensa.
