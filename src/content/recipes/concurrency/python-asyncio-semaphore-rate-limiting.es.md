---



contentType: recipes
slug: python-asyncio-semaphore-rate-limiting
title: "Limitar operaciones asíncronas con asyncio.Semaphore"
description: "Usa asyncio.Semaphore en Python para acotar llamadas a API, consultas a base de datos y acceso a recursos con patrones practicos de limitacion de tasa."
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
  - /recipes/python-asyncio-gather-task-groups
  - /recipes/python-thread-pool-executor
  - /guides/complete-guide-python-asyncio
  - /guides/concurrency-patterns-guide
  - /recipes/python-async-gather-concurrent-requests
lastUpdated: "2026-08-17"
publishedAt: "2026-07-03"
author: Mathias Paulenko
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

`asyncio.Semaphore` pone un tope al numero de operaciones asincronas que pueden ejecutarse a la vez. Ese tope evita saturar una API, agotar un grupo de conexiones o superar un limite de tasa. A continuacion veras el uso basico del semaforo, llamadas a API con limitacion de tasa, gestion de grupos de conexiones, ajuste dinamico de concurrencia, un cubo de tokens y la combinacion con timeouts. Para combinar esto con la coordinacion de tareas, consulta [Tareas asincronas concurrentes con asyncio.gather y grupos de tareas](/es/recipes/python-asyncio-gather-task-groups/).

## Cuando Usar Esto

- Llamadas a API con limites de tasa (p. ej., 100 peticiones/minuto)
- Gestion del grupo de conexiones de una base de datos
- Limitar operaciones concurrentes de archivos o conexiones de red
- Cualquier escenario donde la concurrencia sin limites agote los recursos

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
import aiohttp

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

Un semaforo es, en esencia, un contador que comienza con el limite que tu definas. Cuando una tarea llama `acquire()`, el contador baja en uno; cuando llama `release()`, vuelve a subir. Si el contador llega a cero, la siguiente tarea espera hasta que otra libere su hueco.

La forma mas segura de usarlo es con `async with semaphore`. Python toma el hueco al entrar en el bloque y lo devuelve al salir, incluso si la tarea lanza una excepcion. No tienes que acordarte de llamar `release()` a mano.

El cubo de tokens funciona de otra manera. En vez de restringir cuantas tareas estan activas a la vez, restringe la velocidad con la que puedes lanzarlas. Los tokens se recargan a ritmo constante y cada peticion gasta uno. Puedes hacer rafagas que superen la tasa media siempre que quepan en el cubo, pero a largo plazo el promedio no pasa del limite.

Cuando llamas a varios hosts distintos, cada uno puede soportar una carga diferente. Un diccionario que asigne un semaforo a cada nombre de host mantiene cada uno bajo su propio tope, asi que un host lento no bloquea al resto.

Un semaforo adaptativo vigila los exitos y los fallos y mueve el limite arriba o abajo. Si se acumulan fallos, baja el limite para darle aire al servicio. Si todo funciona bien, lo sube para sacar mas rendimiento.

Para una vision mas amplia de patrones de concurrencia, consulta la [Guia de patrones de concurrencia](/es/guides/concurrency-patterns-guide/).

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
import asyncio

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

Para una guia mas completa, consulta [Tareas asincronas concurrentes con asyncio.gather y grupos de tareas](/es/recipes/python-asyncio-gather-task-groups/).

Elige un limite que encaje con el recurso. Para llamadas HTTP, 10–20 tareas concurrentes es un punto de partida sensato. Para bases de datos, quedate cerca del tamano del grupo de conexiones. Luego observa los tiempos de respuesta y las tasas de error y ajusta el limite desde ahi.

Usa siempre `async with semaphore`. El context manager libera el semaforo incluso si la tarea lanza una excepcion, asi que un fallo no deja un slot tomado.

No compartas un unico semaforo entre todas las APIs. Cada servicio tolera una carga distinta, asi que asigna un limite por host o por API.

Combina el semaforo con un timeout. Sin el, una llamada lenta puede quedarse con un slot para siempre y paralizar el resto de la cola.

Si la mayor parte del tiempo se pasa esperando el semaforo, el limite es demasiado bajo. Si el servicio remoto devuelve errores o empieza a dar timeouts, el limite es demasiado alto.

Cuando la regla es "N peticiones por segundo" y no "N a la vez", usa un cubo de tokens o un cubo con fuga en vez de un semaforo simple.

## Errores Comunes

Usar el mismo semaforo para todas las APIs es tentador, pero incorrecto. Cada servicio tolera una carga distinta, y un unico limite o deja hambrientas a las rapidas o satura a las lentas.

Llamar `acquire()` y `release()` a mano es arriesgado. Si entre medias salta una excepcion, el slot no vuelve. Usa `async with semaphore` para que la liberacion sea automatica.

Enviar 100 peticiones a la vez a una API con limite de tasa suele acabar con la mayoria rechazada. Parte del limite que publique la API.

No confundas concurrencia con tasa. Un semaforo dice "como mucho N a la vez", no "como mucho N por segundo". Para lo segundo necesitas un cubo de tokens o un cubo con fuga.

Si las tareas de alta prioridad siempre esperan detras de las de baja prioridad, un semaforo simple no alcanza. Agrega una cola con prioridad u otro mecanismo de planificacion.

## FAQ

**En que se diferencia un semaforo de un lock?**

Un lock deja pasar una sola tarea a la vez, mientras que un semaforo deja pasar N. En otras palabras, un lock es un semaforo con limite 1.

**Como elijo un buen limite de concurrencia?**

Para llamadas HTTP, empieza con 10 tareas concurrentes. Observa la tasa de errores y la latencia. Si ambas se mantienen sanas, sube el limite; si suben los errores o la latencia se dispara, bajalo. La documentacion de la API suele indicar el limite de tasa que debes respetar.

**Puedo cambiar el limite del semaforo mientras corre el programa?**

`asyncio.Semaphore` no tiene un metodo de redimensionamiento. Puedes construir un envoltorio que agregue slots llamando `release()` o los quite llamando `acquire()`. Otra opcion es reemplazar el semaforo por uno nuevo con otro valor inicial.

**Necesito un semaforo si ya tengo un grupo de conexiones?**

Para bases de datos, el grupo de conexiones ya limita cuantas conexiones estan abiertas, asi que un semaforo adicional suele ser redundante. Usa un semaforo para clientes HTTP o para cualquier otro cliente que no traiga su propio grupo.

**Y si una tarea toma un slot y nunca termina?**

La cola que hay detras se queda parada. Agrega un timeout con `asyncio.wait_for` o `asyncio.timeout()`. Si el trabajo tarda demasiado, el timeout salta, el slot se libera y el resto de las tareas pueden continuar.
