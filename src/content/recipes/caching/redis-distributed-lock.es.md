---




contentType: recipes
slug: redis-distributed-lock
title: "Locking distribuido con Redis y Redlock"
description: "Implementa locks distribuidos con Redis para exclusion mutua entre procesos, usando SET NX con TTL y el algoritmo Redlock para confiabilidad"
metaDescription: "Implementa locks distribuidos con Redis usando SET NX y Redlock. Asegura exclusion mutua entre procesos con locks basados en TTL y release seguro."
difficulty: advanced
topics:
  - caching
  - concurrency
tags:
  - redis
  - distributed lock
  - redlock
  - concurrency
  - mutual exclusion
relatedResources:
  - /recipes/redis-cache-aside-pattern
  - /recipes/redis-rate-limiting-token-bucket
  - /patterns/distributed-lock-pattern
  - /guides/complete-guide-redis-caching-strategies
  - /guides/complete-guide-python-asyncio
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa locks distribuidos con Redis usando SET NX y Redlock. Asegura exclusion mutua entre procesos con locks basados en TTL y release seguro."
  keywords:
    - redis distributed lock
    - redlock algorithm
    - redis set nx
    - distributed mutex
    - redis concurrency




---

# Locking distribuido con Redis y Redlock

Los locks distribuidos aseguran que solo un proceso pueda acceder a un recurso a la vez entre multiples instancias de servidor. Redis hace esto posible con `SET key value NX PX ttl` — una operacion atomica que establece una clave solo si no existe, con una expiracion. Lo siguiente implementa un lock distribuido seguro con release automatico, renovacion de lock y el algoritmo Redlock para confiabilidad multi-nodo.

## Cuando Usar Esto


- For alternatives, see [Complete Guide to Python Asyncio](/es/guides/complete-guide-python-asyncio/).

- Cron jobs o tareas programadas que deben ejecutarse en solo una instancia
- Actualizar recursos compartidos donde escrituras concurrentes causan corrupcion
- Llamadas a APIs externas con rate limit donde solo un proceso debe llamar a la vez
- Eleccion de lider para una tarea temporal de lider unico

## Requisitos Previos

- Python 3.10+
- Paquete `redis` (`pip install redis`)

## Solucion

### 1. Instalar dependencias

```bash
pip install redis
```

### 2. Implementar un lock distribuido seguro

```python
import time
import uuid
import logging
from redis import Redis

logger = logging.getLogger(__name__)

RELEASE_LOCK_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


class DistributedLock:
    def __init__(self, redis_client: Redis, lock_name: str, ttl: int = 30):
        self.redis = redis_client
        self.lock_name = f"lock:{lock_name}"
        self.ttl = ttl
        self.token = str(uuid.uuid4())
        self._acquired = False
        self._release_script = redis_client.register_script(RELEASE_LOCK_SCRIPT)

    def acquire(self, timeout: float = 10.0, retry_interval: float = 0.1) -> bool:
        """Try to acquire the lock, retrying until timeout.

        Args:
            timeout: Maximum time to wait in seconds.
            retry_interval: Time between retries in seconds.

        Returns:
            True if lock was acquired, False if timed out.
        """
        deadline = time.time() + timeout

        while time.time() < deadline:
            acquired = self.redis.set(
                self.lock_name,
                self.token,
                nx=True,
                px=self.ttl * 1000,
            )
            if acquired:
                self._acquired = True
                logger.info("Lock acquired: %s", self.lock_name)
                return True

            time.sleep(retry_interval)

        logger.warning("Lock acquisition timed out: %s", self.lock_name)
        return False

    def release(self) -> bool:
        """Release the lock if we still own it.

        Returns:
            True if lock was released, False if we did not own it.
        """
        if not self._acquired:
            return False

        result = self._release_script(
            keys=[self.lock_name],
            args=[self.token],
        )
        self._acquired = False

        if result:
            logger.info("Lock released: %s", self.lock_name)
            return True
        else:
            logger.warning("Lock already expired or stolen: %s", self.lock_name)
            return False

    def renew(self, ttl: int | None = None) -> bool:
        """Extend the lock's TTL if we still own it.

        Args:
            ttl: New TTL in seconds. Defaults to original TTL.

        Returns:
            True if renewed, False if lock was lost.
        """
        if not self._acquired:
            return False

        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("pexpire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        result = self.redis.eval(
            script, 1, self.lock_name, self.token, (ttl or self.ttl) * 1000
        )
        return bool(result)

    def __enter__(self):
        if not self.acquire():
            raise TimeoutError(f"Could not acquire lock: {self.lock_name}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False
```

### 3. Usar el lock

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Como context manager
def process_job(job_id: str):
    with DistributedLock(r, f"job:{job_id}", ttl=30) as lock:
        # Solo un proceso ejecuta esto a la vez
        job = fetch_job(job_id)
        result = execute_job(job)
        save_result(job_id, result)
        # El lock se libera automaticamente al salir

# Acquire/release manual
lock = DistributedLock(r, "cron:cleanup", ttl=60)
if lock.acquire(timeout=5):
    try:
        run_cleanup()
    finally:
        lock.release()
else:
    print("Otra instancia esta ejecutando cleanup")
```

### 4. Renovacion de lock para tareas largas

```python
import threading

class RenewableLock(DistributedLock):
    def __init__(self, redis_client: Redis, lock_name: str, ttl: int = 30):
        super().__init__(redis_client, lock_name, ttl)
        self._renewal_thread: threading.Thread | None = None
        self._stop_renewal = threading.Event()

    def acquire(self, timeout: float = 10.0, retry_interval: float = 0.1) -> bool:
        acquired = super().acquire(timeout, retry_interval)
        if acquired:
            self._start_renewal()
        return acquired

    def _start_renewal(self):
        self._stop_renewal.clear()
        self._renewal_thread = threading.Thread(
            target=self._renewal_loop, daemon=True
        )
        self._renewal_thread.start()

    def _renewal_loop(self):
        interval = self.ttl * 0.3  # Renovar al 30% del TTL
        while not self._stop_renewal.wait(interval):
            if not self.renew():
                logger.error("Lock lost during renewal: %s", self.lock_name)
                break

    def release(self) -> bool:
        self._stop_renewal.set()
        if self._renewal_thread:
            self._renewal_thread.join(timeout=5)
        return super().release()
```

### 5. Algoritmo Redlock (multi-nodo)

Para mayor confiabilidad, usa multiples instancias de Redis. El lock se adquiere si una mayoria de instancias lo concede:

```python
import time
import uuid

class Redlock:
    def __init__(self, redis_nodes: list[Redis], retry_count: int = 3, retry_delay: float = 0.2):
        self.nodes = redis_nodes
        self.retry_count = retry_count
        self.retry_delay = retry_delay
        self.quorum = len(redis_nodes) // 2 + 1

    def acquire(self, lock_name: str, ttl: int = 30) -> str | None:
        """Acquire a lock across multiple Redis instances.

        Returns:
            Lock token if acquired, None if failed.
        """
        token = str(uuid.uuid4())
        lock_key = f"lock:{lock_name}"

        for attempt in range(self.retry_count):
            start = time.time()
            granted = 0

            for node in self.nodes:
                try:
                    if node.set(lock_key, token, nx=True, px=ttl * 1000):
                        granted += 1
                except Exception as e:
                    logger.warning("Redis node error: %s", e)

            elapsed = (time.time() - start) * 1000
            if granted >= self.quorum and elapsed < ttl * 1000:
                return token

            # Fallo — limpiar locks parciales
            self._release_all(lock_key, token)
            time.sleep(self.retry_delay)

        return None

    def release(self, lock_name: str, token: str) -> None:
        lock_key = f"lock:{lock_name}"
        self._release_all(lock_key, token)

    def _release_all(self, lock_key: str, token: str) -> None:
        for node in self.nodes:
            try:
                node.eval(
                    RELEASE_LOCK_SCRIPT, 1, lock_key, token
                )
            except Exception:
                pass
```

## Como Funciona

1. **`SET NX PX`** establece atomicamente una clave solo si no existe, con un TTL en milisegundos. Este es el nucleo del lock — si la clave existe, otro proceso tiene el lock.
2. **Propiedad basada en token** — cada tenedor de lock genera un token UUID unico. Al liberar, un script Lua verifica que el token coincida antes de eliminar, previniendo que un proceso libere un lock que ya no posee.
3. **TTL** asegura que el lock auto-expire si el tenedor crashea o deja de responder. Sin el, un proceso crasheado tendria el lock para siempre.
4. **Renovacion** extiende el TTL periodicamente, permitiendo que tareas largas mantengan el lock de forma segura. Un thread en background renueva al 30% del intervalo TTL.
5. **Redlock** adquiere el lock en multiples instancias independientes de Redis. Si una mayoria concede el lock, se considera adquirido. Esto sobrevive a la falla de un solo nodo Redis.

## Variantes

### Lock justo con cola

```python
def acquire_fair_lock(redis_client: Redis, lock_name: str, ttl: int = 30) -> str | None:
    """Acquire lock with FIFO ordering using a sorted set queue."""
    token = str(uuid.uuid4())
    queue_key = f"lock_queue:{lock_name}"
    lock_key = f"lock:{lock_name}"

    # Agregar a la cola con timestamp
    score = time.time()
    redis_client.zadd(queue_key, {token: score})

    # Esperar hasta ser primero en la cola y el lock este libre
    while True:
        first = redis_client.zrange(queue_key, 0, 0, withscores=True)
        if first and first[0][0] == token:
            if redis_client.set(lock_key, token, nx=True, px=ttl * 1000):
                redis_client.zrem(queue_key, token)
                return token

        time.sleep(0.1)
```

### Lock con fencing token

```python
def acquire_with_fencing(redis_client: Redis, lock_name: str, ttl: int = 30) -> tuple[str, int] | None:
    """Acquire lock and return a fencing token for ordering."""
    token = str(uuid.uuid4())
    lock_key = f"lock:{lock_name}"
    counter_key = f"lock_counter:{lock_name}"

    if redis_client.set(lock_key, token, nx=True, px=ttl * 1000):
        fencing = redis_client.incr(counter_key)
        return token, fencing

    return None

# El fencing token previene que tenedores de lock obsoletos corrompan estado
# La capa de almacenamiento rechaza escrituras con fencing tokens menores al ultimo visto
```

## Mejores Practicas

- **Siempre establece un TTL** — previene deadlocks si un proceso crashea mientras tiene el lock
- **Usa un token unico por tenedor de lock** — previene liberar accidentalmente el lock de otro proceso
- **Libera locks en un bloque `finally`** — asegura la liberacion incluso si ocurre una excepcion
- **Usa Redlock para secciones criticas** — Redis de instancia unica es un single point of failure para locks

## Errores Comunes

- **No usar un script Lua para liberar** — `get` + `del` no es atomico; otro proceso podria adquirir el lock entre el check y el delete
- **Establecer TTL demasiado corto** — si la tarea toma mas que el TTL, el lock expira y otro proceso empieza concurrentemente
- **No manejar fallo de adquisicion de lock** — si `acquire` retorna `False`, el codigo procede de todas formas, derrotando el proposito del lock
- **Usar `DEL` directamente** — elimina el lock independientemente de la propiedad, potencialmente removiendo el lock de otro proceso

## FAQ

**Q: Es Redlock seguro?**
A: Redlock es debatido en la comunidad de sistemas distribuidos. Para la mayoria de aplicaciones, es suficiente. Para requisitos estrictos de correccion (ej. transacciones financieras), usa un sistema de consenso como etcd o Zookeeper.

**Q: Que TTL debo usar?**
A: Establecelo a la duracion maxima esperada de la tarea mas un margen de seguridad (2x). Usa renovacion para tareas con duracion impredecible.

**Q: Puedo usar Redis Cluster para locks?**
A: Si, pero usa hash tags (`lock:{job_id}`) para asegurar que la clave del lock y cualquier clave relacionada esten en el mismo shard.

**Q: Que pasa si el tenedor del lock se pausa (pausa de GC)?**
A: El TTL puede expirar durante la pausa, permitiendo que otro proceso adquiera el lock. Usa fencing tokens para prevenir que tenedores obsoletos corrompan estado.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
