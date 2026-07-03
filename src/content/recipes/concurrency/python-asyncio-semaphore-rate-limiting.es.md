---
contentType: recipes
slug: python-asyncio-semaphore-rate-limiting
title: "Rate Limiting de Operaciones Async con asyncio.Semaphore"
description: "Controlar la concurrencia en async Python usando asyncio.Semaphore para rate limiting de llamadas a API, conexiones a base de datos y acceso a recursos con patrones de paralelismo limitado."
metaDescription: "Rate limiting de operaciones async en Python con asyncio.Semaphore. Controla concurrencia para llamadas a API, conexiones a DB y recursos con paralelismo limitado."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - api
tags:
  - python
  - asyncio
  - semaphore
  - rate-limiting
  - concurrency
relatedResources:
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /recipes/concurrency/python-thread-pool-executor
  - /guides/complete-guide-python-asyncio
  - /guides/concurrency-patterns-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Rate limiting de operaciones async en Python con asyncio.Semaphore. Controla concurrencia para llamadas a API, conexiones a DB y recursos con paralelismo limitado."
  keywords:
    - asyncio semaphore
    - python rate limiting async
    - asyncio bounded parallelism
    - python semaphore rate limit
    - asyncio concurrency control
---

## Descripcion general

`asyncio.Semaphore` limita el numero de operaciones concurrentes en async Python. Esto previene abrumar servicios externos, agotar connection pools o alcanzar rate limits. A continuacion: uso basico de semaforo, rate limiting de llamadas a API, gestion de connection pools, ajuste dinamico de concurrencia, patron token bucket y combinacion de semaforos con otros primitivos de asyncio.

## Cuando Usar Esto

- Llamadas a API con rate limits (ej., 100 peticiones/minuto)
- Gestion de connection pool de base de datos
- Limitar operaciones concurrentes de archivos o conexiones de red
- Cualquier escenario donde concurrencia sin limites causa agotamiento de recursos

## Prerrequisitos

- Python 3.11+
- `aiohttp` para ejemplos HTTP

## Solucion

### 1. Semaforo Basico

```python
import asyncio

async def worker(semaphore: asyncio.Semaphore, worker_id: int):
    async with semaphore:
        print(f"Worker {worker_id} started")
        await asyncio.sleep(1)  # Simular trabajo
        print(f"Worker {worker_id} finished")

async def main():
    # Solo 3 workers pueden ejecutar concurrentemente
    semaphore = asyncio.Semaphore(3)

    # Iniciar 10 workers — solo 3 ejecutan a la vez
    tasks = [asyncio.create_task(worker(semaphore, i)) for i in range(10)]
    await asyncio.gather(*tasks)

asyncio.run(main())
```

### 2. Rate Limiting de Llamadas a API

```python
import asyncio
import aiohttp
import time

class RateLimitedClient:
    def __init__(self, max_concurrent: int = 10):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()

    async def fetch(self, url: str) -> dict:
        async with self.semaphore:
            async with self.session.get(url) as response:
                return await response.json()

async def fetch_many(urls: list, max_concurrent: int = 10) -> list:
    async with RateLimitedClient(max_concurrent) as client:
        tasks = [client.fetch(url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)

# Fetch 200 URLs con max 10 concurrentes
urls = [f'https://api.example.com/data/{i}' for i in range(200)]
results = asyncio.run(fetch_many(urls, max_concurrent=10))
```

### 3. Rate Limiter Token Bucket

```python
import asyncio
import time

class TokenBucketRateLimiter:
    """Rate limiter usando algoritmo token bucket — permite bursts hasta la capacidad
    mientras mantiene una tasa de refill constante."""

    def __init__(self, rate: float, capacity: int):
        self.rate = rate  # Tokens por segundo
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            # Refill tokens basado en tiempo transcurrido
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_refill = now

            if self.tokens < 1:
                # Esperar hasta que un token este disponible
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

# Uso: 5 peticiones por segundo, capacidad de burst de 10
limiter = TokenBucketRateLimiter(rate=5.0, capacity=10)

async def rate_limited_fetch(url: str) -> dict:
    await limiter.acquire()
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

# Hacer 50 peticiones a 5/segundo
urls = [f'https://api.example.com/data/{i}' for i in range(50)]
tasks = [rate_limited_fetch(url) for url in urls]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

### 4. Rate Limiting por Host

```python
import asyncio
import aiohttp
from urllib.parse import urlparse
from collections import defaultdict

class PerHostRateLimiter:
    """Mantiene un semaforo separado para cada host."""

    def __init__(self, max_per_host: int = 5):
        self.max_per_host = max_per_host
        self.semaphores = defaultdict(lambda: asyncio.Semaphore(max_per_host))

    def get_semaphore(self, url: str) -> asyncio.Semaphore:
        host = urlparse(url).netloc
        return self.semaphores[host]

    async def fetch(self, session: aiohttp.ClientSession, url: str) -> dict:
        semaphore = self.get_semaphore(url)
        async with semaphore:
            async with session.get(url) as response:
                return await response.json()

async def fetch_multiple_hosts():
    limiter = PerHostRateLimiter(max_per_host=3)

    urls = [
        'https://api1.example.com/data',
        'https://api1.example.com/data2',
        'https://api1.example.com/data3',
        'https://api2.example.com/data',
        'https://api2.example.com/data2',
    ]

    async with aiohttp.ClientSession() as session:
        tasks = [limiter.fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

### 5. Connection Pool de Base de Datos con Semaforo

```python
import asyncio
import asyncpg

class DatabasePool:
    def __init__(self, dsn: str, min_size: int = 5, max_size: int = 20):
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self.semaphore = asyncio.Semaphore(max_size)
        self.pool = None

    async def initialize(self):
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=self.min_size,
            max_size=self.max_size,
        )

    async def query(self, sql: str, *args) -> list:
        async with self.semaphore:
            async with self.pool.acquire() as conn:
                return await conn.fetch(sql, *args)

    async def close(self):
        if self.pool:
            await self.pool.close()

# Uso
db = DatabasePool('postgresql://user:pass@localhost/mydb', max_size=20)
await db.initialize()

# Ejecutar 100 queries con max 20 concurrentes
queries = [db.query('SELECT * FROM users WHERE id = $1', i) for i in range(100)]
results = await asyncio.gather(*queries, return_exceptions=True)
await db.close()
```

### 6. Ajuste Dinamico de Concurrencia

```python
import asyncio

class AdaptiveSemaphore:
    """Ajusta concurrencia basado en tasas de exito/fallo."""

    def __init__(self, initial: int = 10, min_val: int = 1, max_val: int = 50):
        self._limit = initial
        self.min_val = min_val
        self.max_val = max_val
        self._semaphore = asyncio.Semaphore(initial)
        self._successes = 0
        self._failures = 0
        self._lock = asyncio.Lock()

    async def acquire(self):
        await self._semaphore.acquire()

    def release(self):
        self._semaphore.release()

    async def record_success(self):
        async with self._lock:
            self._successes += 1
            # Aumentar concurrencia si la tasa de exito es alta
            if self._successes >= 10 and self._limit < self.max_val:
                self._limit += 1
                self._semaphore.release()  # Agregar un slot
                self._successes = 0
                print(f"Increased concurrency to {self._limit}")

    async def record_failure(self):
        async with self._lock:
            self._failures += 1
            # Reducir concurrencia en fallos
            if self._failures >= 3 and self._limit > self.min_val:
                self._limit -= 1
                await self._semaphore.acquire()  # Remover un slot
                self._failures = 0
                print(f"Decreased concurrency to {self._limit}")

    @property
    def current_limit(self):
        return self._limit
```

### 7. Combinar Semaforo con Timeout

```python
import asyncio
import aiohttp

async def fetch_with_limits(
    session: aiohttp.ClientSession,
    url: str,
    semaphore: asyncio.Semaphore,
    timeout: float = 10.0,
) -> dict:
    async with semaphore:
        try:
            async with asyncio.timeout(timeout):
                async with session.get(url) as response:
                    return await response.json()
        except asyncio.TimeoutError:
            return {'url': url, 'error': 'timeout'}

async def fetch_all(urls: list, max_concurrent: int = 10, timeout: float = 10.0):
    semaphore = asyncio.Semaphore(max_concurrent)

    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_with_limits(session, url, semaphore, timeout)
            for url in urls
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

## Como Funciona

1. **Semaforo**: Un contador que empieza en un valor dado. `acquire()` decrementa el contador; `release()` lo incrementa. Si el contador es cero, `acquire()` bloquea hasta que otra tarea libere.
2. **`async with semaphore`**: El context manager adquiere al entrar y libera al salir. Esto asegura que el semaforo siempre se libere, incluso si ocurre una excepcion.
3. **Token bucket**: En lugar de limitar concurrencia, el token bucket limita la tasa. Los tokens se refill a una tasa constante; cada peticion consume uno. Se permiten bursts hasta la capacidad, pero la tasa a largo plazo esta limitada.
4. **Limiting por host**: Diferentes hosts tienen diferentes rate limits. Usar un diccionario de semaforos keyed por host asegura que cada host obtenga su propio limite de concurrencia.
5. **Semaforo adaptativo**: Monitorea tasas de exito/fallo y ajusta concurrencia dinamicamente. En fallos, reduce concurrencia para evitar abrumar el servicio. En exitos, aumenta para maximizar throughput.

## Variantes

### Semaforo Limitado (con Queue)

```python
import asyncio

class BoundedWorkerPool:
    """Procesar items de una queue con concurrencia limitada."""

    def __init__(self, max_workers: int):
        self.semaphore = asyncio.Semaphore(max_workers)

    async def process_queue(self, queue: asyncio.Queue, handler):
        while True:
            item = await queue.get()
            async with self.semaphore:
                await handler(item)
            queue.task_done()

# Uso
queue = asyncio.Queue()
pool = BoundedWorkerPool(max_workers=5)

# Iniciar workers
workers = [asyncio.create_task(pool.process_queue(queue, handler)) for _ in range(5)]

# Alimentar items
for item in items:
    await queue.put(item)

await queue.join()  # Esperar a que todos los items se procesen
```

### Semaforo Ponderado

```python
class WeightedSemaphore:
    """Semaforo donde diferentes operaciones requieren diferentes pesos."""

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.available = capacity
        self.condition = asyncio.Condition()

    async def acquire(self, weight: int = 1):
        async with self.condition:
            while self.available < weight:
                await self.condition.wait()
            self.available -= weight

    async def release(self, weight: int = 1):
        async with self.condition:
            self.available += weight
            self.condition.notify_all()
```

## Mejores Practicas

- **Elegir el limite correcto**: Para peticiones HTTP, empieza con 10-20 concurrentes. Para conexiones a base de datos, iguala el tamano del connection pool. Monitorea y ajusta basado en tiempos de respuesta y tasas de error.
- **Usar `async with`**: Siempre usa la forma context manager para asegurar que el semaforo se libere, incluso en excepciones.
- **Semaforos separados por recurso**: No compartas un semaforo entre diferentes APIs. Cada API tiene diferentes rate limits — usa semaforos por host o por servicio.
- **Combinar con timeouts**: Un semaforo limita concurrencia, pero una operacion lenta puede mantener un slot indefinidamente. Agrega timeouts para liberar slots de operaciones atascadas.
- **Monitorear tiempo de espera del semaforo**: Si las tareas pasan la mayor parte del tiempo esperando el semaforo, el limite es demasiado bajo. Si el servicio esta abrumado, el limite es demasiado alto.
- **Usar token bucket para limites basados en tasa**: Los semaforos limitan concurrencia (paralelismo), no tasa (throughput). Para limites de "N peticiones por segundo", usa un token bucket.

## Errores Comunes

- **Usar un solo semaforo para todo**: Diferentes APIs tienen diferentes limites. Un semaforo compartido subutiliza APIs rapidas y sobrecarga APIs lentas.
- **No liberar en excepcion**: `acquire()`/`release()` manual puede leak slots si ocurre una excepcion entre ellos. Siempre usa `async with semaphore`.
- **Establecer el limite demasiado alto**: 100 peticiones concurrentes a una API con rate limit causara que la mayoria sean rechazadas. Iguala el limite al rate limit de la API.
- **Confundir concurrencia con tasa**: Un semaforo limita cuantas operaciones ejecutan a la vez, no cuantas ejecutan por segundo. Para rate limiting, usa un token bucket o leaky bucket.
- **No manejar starvation del semaforo**: Si tareas de alta prioridad esperan detras de tareas de baja prioridad, considera queuing con prioridad en lugar de un semaforo plano.

## FAQ

**Cual es la diferencia entre un semaforo y un lock?**

Un lock (mutex) permite solo una tarea a la vez. Un semaforo permite N tareas a la vez. Un lock es equivalente a un semaforo con valor 1.

**Como elijo el limite de concurrencia correcto?**

Empieza con 10 para peticiones HTTP. Monitorea tiempos de respuesta y tasas de error. Si las respuestas son rapidas y los errores bajos, aumenta. Si los errores aumentan o las respuestas se ralentizan, disminuye. La documentacion de la API suele especificar rate limits.

**Puedo cambiar el limite del semaforo en runtime?**

No directamente — `asyncio.Semaphore` no soporta resize dinamico. Crea un semaforo nuevo o implementa un semaforo adaptativo que ajusta llamando `release()` (para agregar slots) o `acquire()` (para remover slots).

**Deberia usar un semaforo o un connection pool?**

Para acceso a base de datos, usa un connection pool (ej., `asyncpg.create_pool`). El pool gestiona conexiones eficientemente. Usa un semaforo cuando no tienes pool — ej., rate-limiting de peticiones HTTP a una API externa.

**Que pasa si todos los slots estan ocupados y una tarea se cuelga?**

Otras tareas esperan indefinidamente. Siempre combina semaforos con timeouts para que una tarea atascada eventualmente libere su slot. Usa `asyncio.wait_for` o `asyncio.timeout()`.
