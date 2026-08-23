---
contentType: patterns
slug: distributed-lock-pattern
title: "Patrón Distributed Lock con Redis, ZooKeeper y etcd"
description: "Coordina acceso exclusivo a recursos compartidos entre nodos distribuidos con Redis, ZooKeeper o etcd. Incluye TTL, fencing tokens y ejemplos de Redlock."
metaDescription: "Aprende el Patrón Distributed Lock con Redis y ZooKeeper. Ejemplos en Python, Java y JavaScript con Redlock, TTL y fencing tokens."
difficulty: intermediate
topics:
  - design
  - architecture
  - concurrency
tags:
  - distributed-lock
  - pattern
  - design-pattern
  - concurrency
  - redis
  - zookeeper
  - etcd
  - coordination
relatedResources:
  - /patterns/saga-pattern
  - /patterns/idempotent-consumer-pattern
  - /patterns/leader-election-pattern
  - /patterns/lock-free-queue-pattern
  - /recipes/redis-distributed-lock
  - /patterns/sequential-convoy-pattern
lastUpdated: "2026-08-23"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende el Patrón Distributed Lock con Redis y ZooKeeper. Ejemplos en Python, Java y JavaScript con Redlock, TTL y fencing tokens."
  keywords:
    - distributed lock
    - design pattern
    - concurrency
    - redis
    - zookeeper
    - etcd
    - redlock
    - fencing token
---

## Descripción General

El Patrón Distributed Lock otorga acceso mutuamente exclusivo a un recurso compartido cuando
intervienen varios nodos. Sirve cuando un proceso, una fila de base de datos, una entrada de cola de
tareas o un valor de configuración solo puede ser tocado por un nodo a la vez. Sin este patrón, las
race conditions, el procesamiento duplicado y la corrupción de datos aparecen tan pronto como la carga
escala más allá de un solo proceso.

Un mutex local funciona dentro de un proceso, pero un lock distribuido tiene que sobrevivir a
particiones de red, caídas de procesos y desviación de relojes. Necesita un consenso o un store
centralizado al que todos los nodos puedan acceder atómicamente. Los backends más usados son Redis,
ZooKeeper, etcd, Consul y los advisory locks de base de datos.

## Cuándo Usar

Usa este patrón cuando más de un nodo pueda modificar el mismo recurso a la vez, cuando una tarea
programada deba ejecutarse solo una vez en el cluster, cuando un recurso solo pueda ser tocado por un
proceso y el almacenamiento no tenga compare-and-swap, o cuando necesites una elección de líder de
corta duración.

## Cuándo Evitar

Evítalo cuando todo corra en una sola máquina, cuando el almacenamiento ya ofrezca compare-and-swap o
escritura condicional, cuando la consistencia eventual con concurrencia optimista sea suficiente, o
cuando el servicio de lock se convertiría en un punto único de falla.

## Solución

### Python (Redis SET NX con token)

```python
import time
import uuid
import redis
from typing import Optional


class RedisDistributedLock:
    """Lock distribuido usando Redis con TTL automático y fencing token."""

    def __init__(self, redis_client: redis.Redis, lock_key: str,
                 ttl_seconds: int = 30, retry_delay: float = 0.1):
        self.redis = redis_client
        self.lock_key = f"distlock:{lock_key}"
        self.ttl = ttl_seconds
        self.retry_delay = retry_delay
        self.token = None
        self._acquired = False

    def acquire(self, blocking: bool = True, timeout: Optional[float] = None) -> bool:
        """Adquiere el lock con un timeout de bloqueo opcional."""
        self.token = str(uuid.uuid4())
        start_time = time.time()

        while True:
            # SET key value NX EX ttl — adquisición atómica
            acquired = self.redis.set(
                self.lock_key, self.token, nx=True, ex=self.ttl
            )
            if acquired:
                self._acquired = True
                return True

            if not blocking:
                return False

            if timeout and (time.time() - start_time) >= timeout:
                return False

            time.sleep(self.retry_delay)

    def release(self) -> bool:
        """Libera el lock solo si todavía lo poseemos (comparar token)."""
        if not self._acquired:
            return False

        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        result = self.redis.eval(lua_script, 1, self.lock_key, self.token)
        self._acquired = False
        return result == 1

    def extend(self, additional_ttl: int) -> bool:
        """Extiende el TTL del lock si todavía lo poseemos."""
        if not self._acquired:
            return False

        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        result = self.redis.eval(
            lua_script, 1, self.lock_key, self.token, additional_ttl
        )
        return result == 1

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()


# Uso: deduplicación de tareas programadas entre nodos del cluster
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)


def process_daily_report():
    """Solo un nodo en el cluster debería ejecutar esto diariamente."""
    lock = RedisDistributedLock(redis_client, "daily-report", ttl_seconds=60)

    if not lock.acquire(blocking=False):
        print("Otro nodo está procesando el reporte diario. Saltando.")
        return

    try:
        print(f"Procesando reporte diario (token: {lock.token})")
        time.sleep(2)
        print("Reporte diario completo")
    finally:
        lock.release()


def process_with_context():
    with RedisDistributedLock(redis_client, "critical-section", ttl_seconds=30):
        print("Dentro de sección crítica")
        time.sleep(1)


process_daily_report()
process_with_context()
```

### Java (Curator Framework + ZooKeeper)

```java
import org.apache.curator.framework.CuratorFramework;
import org.apache.curator.framework.CuratorFrameworkFactory;
import org.apache.curator.framework.recipes.locks.InterProcessMutex;
import org.apache.curator.retry.ExponentialBackoffRetry;
import java.util.concurrent.TimeUnit;

public class ZooKeeperDistributedLock {
    private final CuratorFramework client;
    private final String lockPath;

    public ZooKeeperDistributedLock(String zkConnectionString, String lockPath) {
        this.lockPath = lockPath;
        this.client = CuratorFrameworkFactory.newClient(
            zkConnectionString,
            new ExponentialBackoffRetry(1000, 3)
        );
        this.client.start();
    }

    public void executeWithLock(Runnable task) throws Exception {
        InterProcessMutex mutex = new InterProcessMutex(client, lockPath);

        if (mutex.acquire(10, TimeUnit.SECONDS)) {
            try {
                System.out.println("Lock adquirido, ejecutando tarea");
                task.run();
            } finally {
                mutex.release();
                System.out.println("Lock liberado");
            }
        } else {
            System.out.println("No se pudo adquirir lock dentro del timeout");
        }
    }

    public void close() {
        client.close();
    }

    public static void main(String[] args) throws Exception {
        ZooKeeperDistributedLock lock = new ZooKeeperDistributedLock(
            "localhost:2181",
            "/locks/daily-report"
        );

        lock.executeWithLock(() -> {
            System.out.println("Procesando reporte diario...");
            try { Thread.sleep(2000); } catch (InterruptedException e) {}
            System.out.println("Procesamiento de reporte completo");
        });

        lock.close();
    }
}
```

### JavaScript (Redlock con tres nodos Redis)

```javascript
const Redis = require('ioredis');
const Redlock = require('redlock');

const redisA = new Redis({ host: 'redis-a', port: 6379 });
const redisB = new Redis({ host: 'redis-b', port: 6379 });
const redisC = new Redis({ host: 'redis-c', port: 6379 });

const redlock = new Redlock([redisA, redisB, redisC], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200
});

class DistributedTaskScheduler {
  async executeExclusive(lockKey, ttl, task) {
    let lock = null;
    try {
      lock = await redlock.acquire(`locks:${lockKey}`, ttl);
      console.log(`Lock adquirido: ${lock.value}`);

      const result = await task(lock.value);

      // Extender el lock si la tarea sigue corriendo
      lock = await lock.extend(ttl);

      return result;
    } catch (err) {
      if (err.name === 'LockError') {
        console.log(`No se pudo adquirir lock para ${lockKey}: ${err.message}`);
        return null;
      }
      throw err;
    } finally {
      if (lock) {
        await lock.release();
        console.log(`Lock liberado: ${lock.value}`);
      }
    }
  }
}

const scheduler = new DistributedTaskScheduler();

async function processDailyReport() {
  return scheduler.executeExclusive('daily-report', 30000, async (fencingToken) => {
    console.log(`Procesando reporte con fencing token: ${fencingToken}`);
    await saveToDatabase({ report: 'daily', token: fencingToken });
    return { status: 'completed' };
  });
}

async function saveToDatabase(data) {
  // En producción, almacenar el token y verificarlo antes de escrituras
  console.log('Guardando:', data);
}

processDailyReport().catch(console.error);
```

## Explicación

Un lock distribuido tiene que acertar en cuatro cosas: solo un nodo lo puede mantener a la vez; si un
nodo se cae, el lock debe expirar y volver a estar disponible; el servicio debe seguir activo mediante
replicación o un ensemble de consenso; y un token monotónico o UUID debe bloquear escrituras rezagadas
de un ex-holder.

Redlock intenta adquirir el mismo lock en varias instancias Redis independientes y lo considera
mantenido cuando consigue una mayoría antes de un timeout. ZooKeeper usa nodos secuenciales efímeros:
el nodo con el número más bajo gana el lock, y ese nodo desaparece automáticamente cuando termina la
sesión del holder. etcd hace algo similar con leases TTL.

En la práctica, este patrón aparece en muchos lados. Kubernetes usa leases de etcd para la elección de
líder entre controladores. Stripe usa locks basados en Redis para evitar reintentos de cargos
duplicados claveados por cliente, monto y timestamp. Spinaltap de Airbnb usa ZooKeeper para garantizar
que solo un lector de binlog MySQL maneje cada partición. Para un ejemplo concreto con Redis, consultá
la [receta de distributed lock con Redis](/es/recipes/redis-distributed-lock/). Si lo que necesitás es un
líder de larga duración, el [patrón leader election](/es/patterns/leader-election-pattern/) encaja mejor.

## Variantes

| Variante | Backend | Trade-offs |
| ---------- | --------- | ------------ |
| **Redis SET NX** | Redis único | Simple y rápido, pero punto único de falla |
| **Redlock** | Varios nodos Redis | Más tolerante a fallos; corrección debatida |
| **ZooKeeper** | Ensemble ZK | Consistencia fuerte y watches para notificaciones |
| **etcd** | Cluster etcd | Liviano, nativo de Kubernetes, leases TTL |
| **Database advisory lock** | PostgreSQL/MySQL | Sin infraestructura nueva, pero acoplado a la BD |
| **Consul** | Sesiones de Consul | Encaja con service mesh y health-checks |

## Mejores Prácticas

- Define un TTL o lease para que un proceso caído no bloquee el recurso para siempre.
- Envía un fencing token con cada escritura y rechaza cualquier escritura con un token obsoleto.
- Mantén el lock corto: adquiérelo, haz el mínimo trabajo y libéralo inmediatamente.
- Para tareas largas, renueva el lock con un heartbeat o extensión periódica.
- Falla seguro. Si el servicio de lock no está disponible, detente en lugar de correr sin protección.

## Errores Comunes

- Olvidar el TTL. Un nodo muerto deja un deadlock permanente detrás.
- Liberar el lock de otro. El check-and-delete debe ser atómico, normalmente con un script Lua.
- Ignorar el skew de reloj. Confía en tokens monotónicos en lugar de timestamps de reloj.
- Mantener el lock demasiado tiempo. Cuanto más tiempo lo mantengas, más fallos, contención y
  recuperación lenta.
- No testear escenarios de falla. Simula un holder muerto o una partición de red antes de salir a
  producción.

## Preguntas Frecuentes

### ¿Es Redlock seguro?

Martin Kleppmann argumentó que Redlock no es estrictamente seguro bajo skew arbitrario de reloj. Para
la mayoría de sistemas en producción con fencing tokens y TTLs razonables, es suficiente. Para
garantías fuertes, prefiere ZooKeeper o etcd.

### ¿Qué es un fencing token?

Un fencing token es un número monotónico o UUID asociado a cada adquisición de lock. El nodo envía
su token con cada escritura al storage compartido. La capa de storage rechaza cualquier escritura con
un token antiguo, evitando que un proceso rezagado sobrescriba un resultado más nuevo.

### ¿Cómo se diferencia de la elección de líder?

Un lock distribuido es de corta duración y se libera tan pronto termina el trabajo. La elección de
líder es básicamente un lock de larga duración: el mismo nodo se mantiene a cargo hasta que falla o
se retira.

### ¿Puedo usar una base de datos en lugar de Redis o ZooKeeper?

Sí. Los advisory locks de PostgreSQL (`pg_advisory_lock`) y `GET_LOCK()` de MySQL funcionan y no
requieren infraestructura extra, pero acoplan el locking a tu base de datos y pueden no escalar tan
bien como un servicio de lock dedicado.
