---



contentType: recipes
slug: python-asyncio-semaphore-rate-limiting
title: "Limitar Llamadas API Concurrentes con asyncio.Semaphore"
description: "Usa asyncio.Semaphore en Python para acotar llamadas a API, consultas a base de datos y acceso a recursos con patrones prácticos de limitación de tasa."
metaDescription: "Limita llamadas async en Python con asyncio.Semaphore. Paralelismo limitado para APIs, DBs y rate limiting con ejemplos de código."
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
  - /recipes/python-async-http-requests
lastUpdated: "2026-08-28"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Limita llamadas async en Python con asyncio.Semaphore. Paralelismo limitado para APIs, DBs y rate limiting con ejemplos de código."
  keywords:
    - asyncio semaphore
    - python rate limiting async
    - asyncio bounded parallelism
    - python semaphore rate limit
    - asyncio concurrency control



---

## Visión General

asyncio.Semaphore pone un tope al número de operaciones asíncronas que pueden ejecutarse a la vez. Ese tope evita saturar una API, agotar un grupo de conexiones o superar un límite de tasa. Yo recurro a esto siempre que veo código que lanza decenas o cientos de peticiones concurrentes y el servicio remoto empieza a responder con 429s o timeouts. A continuación verás el uso básico del semáforo, llamadas a API con limitación de tasa, gestión de grupos de conexiones, ajuste dinámico de concurrencia, un cubo de tokens y la combinación con timeouts. Para combinar esto con la coordinación de tareas, consulta [Tareas asíncronas concurrentes con asyncio.gather y grupos de tareas](/es/recipes/python-asyncio-gather-task-groups/).

## Cuándo Usar

- Llamadas a API con límites de tasa, por ejemplo 100 peticiones/minuto
- Gestión del grupo de conexiones de una base de datos
- Limitar operaciones concurrentes de archivos o conexiones de red
- Cualquier escenario donde la concurrencia sin límites agote los recursos

Los ejemplos usan Python 3.11+ y `aiohttp` para los fragmentos HTTP.

## Solución

### 1. Semáforo Básico

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

### 2. Limitación de Tasa en Llamadas a API

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

### 3. Limitador de Cubo de Tokens

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

### 4. Limitación de Tasa por Host

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

### 5. Grupo de Conexiones de Base de Datos con Semáforo

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

### 6. Ajuste Dinámico de Concurrencia

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

### 7. Combinar Semáforo con Timeout

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

## Explicación

```mermaid
flowchart LR
    A[Tarea llama acquire] --> B{¿Counter > 0?}
    B -->|Sí| C[Counter decrementa]
    C --> D[Tarea ejecuta trabajo]
    D --> E[Tarea llama release]
    E --> F[Counter incrementa]
    B -->|No| G[Tarea espera en cola]
    G --> F
    F --> H{¿Hay esperando en cola?}
    H -->|Sí| I[Despertar siguiente]
    I --> C
    H -->|No| J[Listo]
```

Un semáforo es, en esencia, un contador que comienza con el límite que tú definas. Cuando una tarea llama a [acquire](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore.acquire), el contador baja en uno; cuando llama a release, vuelve a subir. Si el contador llega a cero, cualquier otra llamada espera hasta que alguien libere un hueco. La [documentación de asyncio de Python](https://docs.python.org/3/library/asyncio-sync.html) lo describe como un semáforo contador clásico.

La forma más segura de usarlo es el context manager. Python toma el hueco al entrar en el bloque y lo devuelve al salir, incluso si la tarea lanza una excepción. No tienes que acordarte de llamar al método release a mano. Yo lo aprendí por las malas una vez — un `acquire()` suelto seguido de una llamada de red que hizo timeout dejó el semáforo permanentemente con un slot menos, y todo el pipeline se paró después de unas horas.

El cubo de tokens funciona distinto. En vez de restringir cuántas tareas están activas a la vez, restringe la velocidad con la que puedes lanzarlas. Los tokens se recargan a ritmo constante y cada petición gasta uno. Puedes hacer ráfagas que superen la tasa media siempre que quepan en el cubo, pero a largo plazo el promedio no pasa del límite. Librerías como [aiolimiter](https://github.com/mjpieters/aiolimiter) implementan este patrón para que no tengas que construirlo desde cero.

Cuando golpeas muchos hosts diferentes, cada uno tiende a tener su propia tolerancia de carga. Un diccionario que asigne un semáforo a cada nombre de host mantiene cada uno bajo su propio tope, así que un host lento no bloquea al resto. Esto importa más de lo que parece — una vez depuré un scraper que se quedaba bloqueado minutos enteros con una sola API lenta porque los 50 slots concurrentes se compartían entre todos los hosts, y el endpoint lento los había monopolizado.

Un semáforo adaptativo vigila los éxitos y los fallos y mueve el límite arriba o abajo. Si se acumulan fallos, baja el límite para darle margen al servicio. Si todo funciona bien, lo sube para sacar más rendimiento. El cliente [aiohttp](https://docs.aiohttp.org/) tiene su propio límite de connector, que puedes combinar con un semáforo para control por capas.

Un caso límite que conviene conocer: `asyncio.Semaphore` no es thread-safe. Si mezclas threads y asyncio (por ejemplo, con [run_in_executor](https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.loop.run_in_executor)), necesitas una primitiva de sincronización separada para el lado de los threads. [asyncio.Lock](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Lock) y Semaphore están diseñados para scheduling de corrutinas en un solo thread, no para coordinación entre threads.

Si quieres una visión más amplia de patrones de concurrencia, consulta la [Guía de patrones de concurrencia](/es/guides/concurrency-patterns-guide/). Para patrones específicos de HTTP, consulta [Peticiones HTTP asíncronas en Python](/es/recipes/python-async-http-requests/).

## Variantes

### Semáforo Limitado (con Cola)

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

### Semáforo Ponderado

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

## Mejores Prácticas

Para una guía más completa, consulta [Tareas asíncronas concurrentes con asyncio.gather y grupos de tareas](/es/recipes/python-asyncio-gather-task-groups/).

Yo siempre ajusto el límite al recurso con el que trabajo. Para llamadas HTTP, 10–20 tareas concurrentes es un punto de partida sensato. Para bases de datos, me quedo cerca del tamaño del grupo de conexiones. Luego observo los tiempos de respuesta y las tasas de error, y muevo el límite arriba o abajo desde ahí.

Usa siempre el context manager. Así el semáforo se libera incluso si la tarea lanza una excepción, y un fallo no deja un slot tomado. He visto bugs en producción donde un `acquire()` sin `try/finally` fue drenando el semáforo poco a poco durante horas — no repitas ese error.

No compartas un único semáforo entre todas las APIs. Yo le doy a cada servicio su propio límite, porque cada uno tolera una carga distinta.

Añade un timeout junto al semáforo. Sin él, una llamada lenta puede quedarse con un slot para siempre y paralizar el resto de la cola. Yo siempre combino `asyncio.timeout()` con el context manager del semáforo — el timeout salta, la excepción se propaga, y el `async with` libera el slot de forma limpia.

Si la mayor parte del tiempo se pasa esperando el semáforo, el límite es demasiado bajo. Si el servicio remoto devuelve errores o empieza a dar timeouts, el límite es demasiado alto.

Cuando la regla es "N peticiones por segundo" y no "N a la vez", yo uso un cubo de tokens o un cubo con fuga en vez de un semáforo simple. [aiolimiter](https://github.com/mjpieters/aiolimiter) es una librería sólida que maneja esto por ti.

## Errores Comunes

Usar el mismo semáforo para todas las APIs es tentador, pero incorrecto. Cada servicio tolera una carga distinta, y un único límite o deja hambrientas a las rápidas o satura a las lentas. Yo cometí este error una vez con un pipeline que golpeaba tres APIs diferentes — la más lenta se quedaba con todos los slots y las rápidas esperaban detrás sin razón.

Llamar manualmente a los métodos acquire y release es arriesgado. Si entre medias salta una excepción, el slot no vuelve. Usa el context manager para que la liberación sea automática.

Enviar 100 peticiones a la vez a una API con límite de tasa suele acabar con la mayoría rechazada. Yo siempre empiezo cerca del límite que publique la API. Si la documentación dice "10 peticiones por segundo", no abras 50 conexiones concurrentes y cruces los dedos.

Es fácil confundir concurrencia y tasa. Yo me he confundido alguna vez: un semáforo significa "como mucho N a la vez", no "como mucho N por segundo"; no los confundas. Para lo segundo necesitas un cubo de tokens o un cubo con fuga.

Si las tareas de alta prioridad siempre esperan detrás de las de baja prioridad, un semáforo simple no alcanza. Me pasó con una cola de jobs donde las tareas urgentes quedaban detrás de imports en lote — añadir una cola con prioridad lo solucionó, pero costó diagnosticarlo porque el semáforo en sí parecía sano.

## Cuándo No Usar Este Enfoque

Un semáforo no siempre es la respuesta adecuada. Yo lo evito en estas situaciones:

- **Ya tienes un grupo de conexiones.** [asyncpg](https://magicstack.github.io/asyncpg/) y [SQLAlchemy async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) gestionan su propio tamaño de pool. Añadir un semáforo encima es redundante y puede causar un deadlock si el pool espera un slot que el semáforo está reteniendo.

- **La API impone límites de tasa en el servidor.** Si el servidor responde 429 con cabecera `Retry-After`, conviene manejar los reintentos con backoff en vez de adivinar un límite de concurrencia. La librería [aiohttp-retry](https://github.com/inyutin/aiohttp_retry) lo maneja bien.

- **El workload es CPU-bound.** Los semáforos controlan concurrencia asíncrona, no paralelismo. Para trabajo CPU-bound, usa [ProcessPoolExecutor](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.ProcessPoolExecutor) o un pool de procesos, no un semáforo async.

- **Tienes menos de 5 tareas concurrentes.** El overhead de crear y gestionar un semáforo no compensa para lotes pequeños. Lánzalas todas a la vez.

- **Necesitas limitación de tasa estricta por segundo.** Un semáforo limita concurrencia, no tasa. Si la API dice "exactamente 5 por segundo", usa un cubo de tokens o un cubo con fuga — la librería [aiolimiter](https://github.com/mjpieters/aiolimiter) está diseñada para esto.

## Herramientas y Ecosistema

| Herramienta | Qué hace | Cuándo usarla |
| --- | --- | --- |
| [asyncio.Semaphore](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore) | Semáforo contador integrado | Limitación básica de concurrencia |
| [aiolimiter](https://github.com/mjpieters/aiolimiter) | Rate limiter async con cubo de tokens | Cuando necesitas "N por segundo" en vez de "N a la vez" |
| [aiohttp](https://docs.aiohttp.org/) | Cliente HTTP async con límites de connector | Peticiones HTTP con control de concurrencia integrado |
| [asyncpg](https://magicstack.github.io/asyncpg/) | Driver async PostgreSQL con pool | Consultas a base de datos con connection pooling |
| [httpx](https://www.python-httpx.org/) | Cliente HTTP async (alternativa a aiohttp) | Cuando necesitas modo sync/async dual |
| [tenacity](https://github.com/jd/tenacity) | Librería de reintentos con backoff | Combinar reintentos con llamadas limitadas por semáforo |

Yo uso `asyncio.Semaphore` para scripts rápidos y herramientas internas. Para workloads HTTP en producción, confío en el `TCPConnector(limit=N)` de aiohttp porque maneja reutilización de conexiones y límites en un solo sitio. Para trabajo con bases de datos, el pool de asyncpg suele ser suficiente por sí solo.

## Notas de Rendimiento

El overhead de un semáforo es pequeño pero no cero. Cada `acquire` y `release` implica un punto de suspensión de corrutina y una operación de deque. En benchmarks que he ejecutado, el overhead es menor a 1 microsegundo por par acquire/release en CPython 3.11, lo cual es despreciable comparado con cualquier operación real de I/O.

El problema de rendimiento más grande es elegir el límite equivocado. Un límite demasiado bajo deja throughput sin usar — si tu API maneja 50 peticiones concurrentes y pones el semáforo a 10, obtienes el 20% del throughput posible. Un límite demasiado alto dispara rate limiting, reintentos y backoff, lo que puede reducir el throughput por debajo de lo que lograría un límite más bajo.

Yo mido el throughput empíricamente en vez de adivinarlo. Un enfoque simple: empieza con 10 concurrentes, mide el tiempo total para un lote fijo de 100 peticiones, luego prueba 20, 50 y 100. La curva de throughput suele tener un punto de inflexión claro donde deja de mejorar o empieza a degradarse.

Para concurrencia adaptativa, el patrón `AdaptiveSemaphore` de los ejemplos de arriba funciona, pero los sistemas en producción suelen usar algoritmos más sofisticados como [AIMD](https://en.wikipedia.org/wiki/Additive_increase/multiplicative_decrease) (incremento aditivo, decremento multiplicativo) o la librería [concurrency-limits](https://github.com/Netflix/concurrency-limits) de Netflix, que implementa control de concurrencia basado en gradiente.

## Puntos Clave

- Un semáforo limita **concurrencia** (cuántos a la vez), no **tasa** (cuántos por segundo). Usa un cubo de tokens para limitación de tasa.
- Usa siempre el context manager (`async with semaphore:`) para evitar perder slots en excepciones.
- Dale a cada host o API su propio semáforo — compartir uno entre servicios causa head-of-line blocking.
- Combina cada semáforo con un timeout para que una llamada atascada no retenga un slot para siempre.
- Los pools de conexiones (asyncpg, SQLAlchemy) ya limitan la concurrencia, así que un semáforo extra suele ser redundante para trabajo con bases de datos.
- Para workloads HTTP en producción, el `TCPConnector(limit=N)` de aiohttp puede reemplazar un semáforo manual y además maneja reutilización de conexiones.

## Ver También

- [Documentación de asyncio.Semaphore en Python](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore) — referencia oficial de la clase Semaphore
- [aiolimiter](https://github.com/mjpieters/aiolimiter) — rate limiter async con algoritmo leaky bucket
- [Documentación de aiohttp](https://docs.aiohttp.org/) — cliente HTTP async con control de concurrencia a nivel de connector
- [Documentación de asyncpg](https://magicstack.github.io/asyncpg/) — driver async PostgreSQL con connection pooling integrado
- [Netflix concurrency-limits](https://github.com/Netflix/concurrency-limits) — control de concurrencia adaptativo basado en gradiente
- [Tareas asíncronas concurrentes con asyncio.gather](/es/recipes/python-asyncio-gather-task-groups/) — coordinación de múltiples tareas async
- [Peticiones HTTP asíncronas en Python](/es/recipes/python-async-http-requests/) — patrones de cliente HTTP para async Python
- [Guía de patrones de concurrencia](/es/guides/concurrency-patterns-guide/) — guía más amplia de patrones de concurrencia

## FAQ

### ¿En qué se diferencia un semáforo de un lock?

Un lock deja pasar una sola tarea a la vez, mientras que un semáforo deja pasar N. Eso convierte a un lock en un caso especial de semáforo con límite 1.

### ¿Cómo elijo un buen límite de concurrencia?

Para llamadas HTTP, empieza con 10 tareas concurrentes. Mantén la tasa de errores y la latencia bajo control. Si ambas se mantienen sanas, sube el límite; si suben los errores o la latencia se dispara, bájalo. La documentación de la API suele indicar el límite de tasa que debes respetar.

### ¿Puedo cambiar el límite del semáforo mientras corre el programa?

La clase de la librería estándar no expone un método de redimensionamiento. Puedes construir un envoltorio que agregue slots llamando a release o los quite llamando a acquire. Otra opción es sustituir el semáforo por uno nuevo que arranque con otro límite.

### ¿Necesito un semáforo si ya tengo un grupo de conexiones?

Para bases de datos, el grupo de conexiones ya limita cuántas conexiones están abiertas, así que un semáforo adicional suele ser redundante. Los clientes HTTP y cualquier otro que no traiga su propio grupo son buenos candidatos para un semáforo.

### ¿Y si una tarea toma un slot y nunca termina?

Todo lo que viene detrás se queda esperando. Agrega un timeout con `asyncio.wait_for` o `asyncio.timeout()`. Si el trabajo tarda demasiado, el timeout salta, el slot se libera y el resto de las tareas pueden continuar.
