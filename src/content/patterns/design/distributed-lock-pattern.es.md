---






contentType: patterns
slug: distributed-lock-pattern
title: "Patrón Distributed Lock"
description: "Coordina el acceso mutuamente exclusivo a recursos compartidos a través de nodos distribuidos usando un servicio de lock basado en consenso, previniendo race conditions en sistemas escalados."
metaDescription: "Aprende el Patrón Distributed Lock para coordinar nodos con Redis y ZooKeeper. Ejemplos en Python, Java y JavaScript con Redlock, leases y fencing tokens."
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
  - coordination
  - consensus
relatedResources:
  - /patterns/saga-pattern
  - /patterns/idempotent-consumer-pattern
  - /patterns/leader-election-pattern
  - /patterns/lock-free-queue-pattern
  - /recipes/redis-distributed-lock
  - /patterns/sequential-convoy-pattern
  - /guides/acid-vs-base-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Distributed Lock para coordinar nodos con Redis y ZooKeeper. Ejemplos en Python, Java y JavaScript con Redlock, leases y fencing tokens."
  keywords:
    - distributed lock
    - design pattern
    - concurrency
    - redis
    - zookeeper
    - coordination






---

# Patrón Distributed Lock

## Descripción General

El Patrón Distributed Lock coordina el acceso mutuamente exclusivo a recursos compartidos a través de múltiples nodos en un sistema distribuido. Cuando múltiples procesos o servicios compiten por el mismo recurso — un archivo, una fila de base de datos, una entrada de cola de tareas, o un valor de configuración — un lock distribuido asegura que solo un nodo mantenga el lock en un momento dado, previniendo race conditions, procesamiento duplicado y corrupción de datos.

A diferencia de un mutex local (que funciona dentro de un único proceso), un lock distribuido debe funcionar a través de boundaries de red, caídas de procesos y desviación de relojes. Requiere un mecanismo de consenso o un store centralizado al que todos los nodos puedan acceder atómicamente. Las implementaciones comunes usan Redis, ZooKeeper, etcd, Consul o locks de asesoría de base de datos.

## Cuándo Usar


- For alternatives, see [Priority Queue Pattern](/es/patterns/priority-queue-pattern/).

Usa el Patrón Distributed Lock cuando:
- Múltiples nodos pueden modificar concurrentemente el mismo recurso compartido
- Necesitas prevenir ejecución duplicada de tareas programadas a través de un cluster
- Un recurso solo puede ser accedido de forma segura por un proceso a la vez
- Se necesita leader election para servicios singleton en un cluster

## Cuándo Evitar

- El sistema corre en un único nodo (un mutex local es más simple y rápido)
- El recurso compartido soporta operaciones compare-and-swap de forma nativa
- La consistencia eventual es aceptable y la concurrencia optimista basta
- El servicio de lock se convierte en un single point of failure o cuello de botella

## Solución

### Python (Redis Redlock)

```python
import time
import uuid
import redis
from typing import Optional

class RedisDistributedLock:
    """Lock distribuido usando Redis con renovación automática de lease y fencing token"""
    def __init__(self, redis_client: redis.Redis, lock_key: str,
                 ttl_seconds: int = 30, retry_delay: float = 0.1):
        self.redis = redis_client
        self.lock_key = f"distlock:{lock_key}"
        self.ttl = ttl_seconds
        self.retry_delay = retry_delay
        self.token = None
        self._acquired = False

    def acquire(self, blocking: bool = True, timeout: Optional[float] = None) -> bool:
        """Adquiere el lock con un timeout de bloqueo opcional"""
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
        """Libera el lock solo si todavía lo poseemos (comparar token)"""
        if not self._acquired:
            return False

        # Script Lua para check-and-delete atómico
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
        """Extiende el TTL del lock si todavía lo poseemos"""
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


# ============================================================================
# USO: Deduplicación de tareas programadas a través de nodos del cluster
# ============================================================================

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def process_daily_report():
    """Solo un nodo en el cluster debería ejecutar esto diariamente"""
    lock = RedisDistributedLock(redis_client, "daily-report", ttl_seconds=60)

    if not lock.acquire(blocking=False):
        print("Otro nodo está procesando el reporte diario. Saltando.")
        return

    try:
        print(f"Procesando reporte diario (token: {lock.token})")
        # Simular trabajo de larga duración
        time.sleep(2)
        print("Reporte diario completo")
    finally:
        lock.release()

# Uso seguro con context manager
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

        // Adquirir lock con timeout
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

### JavaScript (Redlock + Redis)

```javascript
const Redis = require('ioredis');
const Redlock = require('redlock');

// Crear clientes Redis para Redlock (múltiples para quorum)
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
      // Adquirir lock con algoritmo Redlock (mayoría de nodos Redis)
      lock = await redlock.acquire(`locks:${lockKey}`, ttl);
      console.log(`Lock adquirido: ${lock.value}`);

      // Ejecutar tarea protegida
      const result = await task(lock.value);

      // Extender lock si la tarea sigue corriendo
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

// Uso
const scheduler = new DistributedTaskScheduler();

async function processDailyReport() {
  return scheduler.executeExclusive('daily-report', 30000, async (fencingToken) => {
    console.log(`Procesando reporte con fencing token: ${fencingToken}`);
    // Escribir a base de datos con token para prevenir escrituras rezagadas
    await saveToDatabase({ report: 'daily', token: fencingToken });
    return { status: 'completed' };
  });
}

async function saveToDatabase(data) {
  // En producción: almacenar token y verificar antes de escrituras para manejar skew de reloj
  console.log('Guardando:', data);
}

processDailyReport().catch(console.error);
```

## Explicación

Un lock distribuido debe satisfacer cuatro propiedades:

1. **Exclusión mutua**: Solo un nodo puede mantener el lock a la vez
2. **Sin deadlock**: Si un nodo se cae, el lock eventualmente expira y se vuelve disponible
3. **Tolerancia a fallos**: El servicio de lock mismo debe permanecer disponible (Redis Cluster, ensemble ZooKeeper)
4. **Fencing token**: Un token monotónico previene escrituras rezagadas de un ex-holdder del lock (insight de Martin Kleppmann)

El **algoritmo Redlock** (Redis) adquiere locks en múltiples instancias Redis independientes y considera el lock mantenido si una mayoría es adquirida dentro de un timeout. **ZooKeeper** usa nodos secuenciales efímeros donde el número de secuencia más bajo mantiene el lock; si el holder muere, el nodo efímero se borra automáticamente.

## Variantes

| Variante | Backend | Características |
|----------|---------|-----------------|
| **Redis SET NX** | Redis único | Simple, rápido, single point of failure |
| **Redlock** | Múltiples nodos Redis | Tolerante a fallos, más complejo, corrección debatida |
| **ZooKeeper** | Ensemble ZK | Consistencia fuerte, watches para notificaciones |
| **etcd** | Cluster etcd | Liviano, nativo de Kubernetes, leases TTL |
| **Database advisory lock** | PostgreSQL/MySQL | Sin infraestructura adicional, pero acoplado a BD |
| **Consul** | Sesiones de Consul | Integración con service mesh, health-check integration |

## Lo que funciona

- **Siempre usa un TTL/lease.** Un proceso caído no debe mantener un lock para siempre.
- **Usa fencing tokens para escrituras.** Incluye el token en escrituras al storage para rechazar operaciones obsoletas.
- **Mantén la duración del lock corta.** Adquiere el lock, haz el mínimo trabajo, libera inmediatamente.
- **Implementa renovación de lock.** Para tareas largas, extiende el TTL periódicamente (como un heartbeat).
- **Maneja fallas del servicio de lock.** Si el servicio de lock no está disponible, falla seguro (no procedas sin el lock).

## Errores Comunes

- **Sin TTL en locks.** Un nodo caído crea un deadlock permanente.
- **Liberar el lock de otro.** Un check-and-delete (comparar token) debe ser atómico.
- **Ignorar skew de reloj.** En sistemas distribuidos, los relojes se desvían. Usa tokens monotónicos, no timestamps.
- **Locks mantenidos por mucho tiempo.** Mientras más tiempo se mantiene un lock, mayor la probabilidad de falla y contención.
- **No testear escenarios de falla.** Testear qué pasa cuando el holder del lock muere durante la operación.

## Ejemplos del Mundo Real

### Kubernetes

Kubernetes usa etcd para toda la coordinación distribuida, incluyendo leader election para controladores. Los scheduler y controller-manager usan leases de etcd para asegurar que solo una instancia esté activa.

### Stripe

Stripe usa locks distribuidos basados en Redis para prevenir procesamiento de cargos duplicados. Un lock en `(customer_id, amount, timestamp)` previene doble-cobro durante reintentos de red.

### Airbnb

El sistema Spinaltap CDC de Airbnb usa locks distribuidos de ZooKeeper para coordinar lectores de binlog MySQL a través de un cluster, asegurando que exactamente un lector procesa cada partición.

## Preguntas Frecuentes

**Q: Es Redlock seguro?**
A: Martin Kleppmann argumentó que Redlock no es estrictamente seguro bajo skew arbitrario de reloj. Para la mayoría de casos prácticos con fencing tokens apropiados y TTLs razonables, funciona bien. Para garantías fuertes de corrección, usa ZooKeeper o etcd.

**Q: Qué es un fencing token?**
A: Un número monotónicamente creciente o UUID asociado con cada adquisición de lock. Al escribir al storage compartido, el writer incluye su token; la capa de storage rechaza escrituras con tokens obsoletos.

**Q: Cómo se diferencia esto de leader election?**
A: Los locks distribuidos típicamente son de corta duración y liberados rápidamente. La elección de líder es un caso especial donde el "lock" se mantiene indefinidamente hasta que el líder falla o se retira.

**Q: Puedo usar una base de datos en lugar de Redis/ZooKeeper?**
A: Sí. Los advisory locks de PostgreSQL (`pg_advisory_lock`) y `GET_LOCK()` de MySQL funcionan pero acoplan tu locking a la disponibilidad de tu base de datos y pueden no escalar tan bien como servicios de lock dedicados.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
