---






contentType: guides
slug: complete-guide-python-asyncio-production
title: "Referencia Detallada de Python Asyncio en Producción"
description: "Ejecutar Python asyncio en produccion con confianza. Cubre event loops, gestion de tasks, debugging, cancellation, timeouts, backpressure y patrones para aplicaciones async de alta concurrencia."
metaDescription: "Ejecutar Python asyncio en produccion. Cubre event loops, tasks, debugging, cancellation, timeouts, backpressure y patrones async."
difficulty: advanced
topics:
  - concurrency
  - performance
  - testing
tags:
  - python
  - asyncio
  - guia
  - concurrency
  - event-loop
  - async
  - cancellation
  - backpressure
relatedResources:
  - /guides/complete-guide-event-driven-systems
  - /patterns/async-generator-pattern
  - /patterns/circuit-breaker-pattern
  - /guides/complete-guide-go-concurrency
  - /recipes/python-schedule-periodic-tasks
  - /recipes/python-async-gather-concurrent-requests
  - /guides/complete-guide-llm-application-architecture
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejecutar Python asyncio en produccion. Cubre event loops, tasks, debugging, cancellation, timeouts, backpressure y patrones async."
  keywords:
    - python asyncio produccion
    - asyncio event loop
    - asyncio task management
    - asyncio debugging
    - asyncio cancellation
    - asyncio timeouts
    - async backpressure
    - python async patterns






---

## Introducción

Python asyncio es un framework de concurrencia para escribir codigo concurrente single-threaded usando coroutines, event loops, e I/O multiplexing. Maneja miles de operaciones I/O concurrentes sin overhead de threads. Ejecutar asyncio en produccion requiere entender event loop internals, task lifecycle, cancellation semantics, debugging tools, y pitfalls comunes. Lo siguiente recorre todo lo que necesitas para construir aplicaciones async de alta concurrencia confiables.

## Fundamentos del Event Loop

### Como Funciona el Event Loop

```text
Event Loop Cycle:
1. Run ready callbacks (coroutines resumed by I/O readiness)
2. Poll for I/O events (with timeout based on next scheduled callback)
3. Process I/O events (schedule callbacks for ready file descriptors)
4. Run scheduled callbacks (call_later, call_at)
5. Repeat
```

El event loop corre en un solo thread. Las coroutines devuelven control al loop en los puntos de `await`. El loop multiplexa I/O usando `select`, `poll`, `epoll`, o `kqueue` dependiendo de la plataforma.

### Elegir un Event Loop

```python
import asyncio

# Default event loop (uvloop on Linux if installed, otherwise selector)
loop = asyncio.new_event_loop()

# uvloop: 2-4x mas rapido, drop-in replacement (Linux/macOS only)
# pip install uvloop
try:
    import uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
except ImportError:
    pass

# Setup de produccion con uvloop
async def main():
    await asyncio.gather(
        handle_requests(),
        background_worker()
    )

if __name__ == "__main__":
    asyncio.run(main())
```

### Ejecutar el Event Loop

```python
import asyncio

# asyncio.run() — recomendado para produccion
# Crea un nuevo event loop, corre la coroutine, cierra el loop
async def app():
    server = await asyncio.start_server(handle_client, "0.0.0.0", 8080)
    async with server:
        await server.serve_forever()

asyncio.run(app())

# Aplicacion long-running con graceful shutdown
async def main():
    stop_event = asyncio.Event()
    
    # Start background tasks
    tasks = [
        asyncio.create_task(web_server()),
        asyncio.create_task(worker_pool()),
        asyncio.create_task(monitoring())
    ]
    
    # Wait for shutdown signal
    await stop_event.wait()
    
    # Cancel all tasks
    for task in tasks:
        task.cancel()
    
    await asyncio.gather(*tasks, return_exceptions=True)

asyncio.run(main())
```

## Gestion de Tasks

### Crear y Awaitear Tasks

```python
import asyncio

async def fetch_data(url):
    await asyncio.sleep(1)  # Simular I/O
    return {"url": url, "data": "response"}

async def main():
    # create_task schedulea la coroutine inmediatamente
    task1 = asyncio.create_task(fetch_data("https://api1.example.com"))
    task2 = asyncio.create_task(fetch_data("https://api2.example.com"))
    
    # Ambas corren concurrentemente
    result1, result2 = await asyncio.gather(task1, task2)
    print(f"Results: {result1}, {result2}")

asyncio.run(main())
```

### gather vs TaskGroup

```python
import asyncio

# asyncio.gather — fire and forget, error handling manual
async def gather_pattern():
    results = await asyncio.gather(
        fetch_data("url1"),
        fetch_data("url2"),
        fetch_data("url3"),
        return_exceptions=True  # No propagar exceptions
    )
    for result in results:
        if isinstance(result, Exception):
            print(f"Task failed: {result}")
        else:
            print(f"Result: {result}")

# asyncio.TaskGroup — Python 3.11+, structured concurrency
async def taskgroup_pattern():
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch_data("url1"))
        t2 = tg.create_task(fetch_data("url2"))
        t3 = tg.create_task(fetch_data("url3"))
    
    # Todas las tasks completan antes de salir del block
    # Si cualquier task falla, todas las demas son cancelled
    print(f"Results: {t1.result()}, {t2.result()}, {t3.result()}")

asyncio.run(taskgroup_pattern())
```

### Esperar con Timeouts

```python
import asyncio

async def fetch_with_timeout(url, timeout=5.0):
    try:
        result = await asyncio.wait_for(
            fetch_data(url),
            timeout=timeout
        )
        return result
    except asyncio.TimeoutError:
        return {"url": url, "error": "timeout"}

# asyncio.timeout — Python 3.11+ (cancellation-safe)
async def fetch_with_timeout_v2(url, timeout=5.0):
    try:
        async with asyncio.timeout(timeout):
            result = await fetch_data(url)
            return result
    except TimeoutError:
        return {"url": url, "error": "timeout"}

# Esperar a que la primera complete
async def fetch_first_successful(urls):
    tasks = [asyncio.create_task(fetch_data(url)) for url in urls]
    
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )
    
    # Cancelar tasks restantes
    for task in pending:
        task.cancel()
    
    # Obtener el primer resultado exitoso
    for task in done:
        if not task.exception():
            return task.result()
    
    raise RuntimeError("All tasks failed")
```

## Cancellation

### Semantica de Cancellation

Cuando una task es cancelled, `CancelledError` se raisea en el siguiente punto de `await`. Las coroutines deberian manejar cleanup en bloques `finally`.

```python
import asyncio

async def long_running_operation():
    try:
        while True:
            data = await fetch_data()
            process(data)
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        # Cleanup resources
        await cleanup_resources()
        raise  # Re-raise para propagar cancellation

async def main():
    task = asyncio.create_task(long_running_operation())
    
    await asyncio.sleep(5)
    task.cancel()
    
    try:
        await task
    except asyncio.CancelledError:
        print("Task was cancelled")
```

### Proteger de Cancellation

```python
import asyncio

async def critical_operation():
    # Shield previene cancellation durante este await
    result = await asyncio.shield(
        save_to_database()
    )
    return result

async def main():
    task = asyncio.create_task(critical_operation())
    
    await asyncio.sleep(0.1)
    task.cancel()
    
    try:
        await task
    except asyncio.CancelledError:
        # La task fue cancelled, pero save_to_database() continua
        # La operacion shielded no es interrumpida
        print("Task cancelled, but DB save continues")
```

### Graceful Shutdown

```python
import asyncio
import signal

class Application:
    def __init__(self):
        self.shutdown_event = asyncio.Event()
        self.tasks = []
    
    async def start(self):
        # Registrar signal handlers
        loop = asyncio.get_event_loop()
        loop.add_signal_handler(signal.SIGINT, self.shutdown_event.set)
        loop.add_signal_handler(signal.SIGTERM, self.shutdown_event.set)
        
        # Start workers
        for i in range(4):
            task = asyncio.create_task(self.worker(i))
            self.tasks.append(task)
        
        # Wait for shutdown
        await self.shutdown_event.wait()
        
        # Cancel workers
        for task in self.tasks:
            task.cancel()
        
        # Wait for cleanup con timeout
        await asyncio.wait_for(
            asyncio.gather(*self.tasks, return_exceptions=True),
            timeout=10.0
        )
    
    async def worker(self, worker_id):
        try:
            while not self.shutdown_event.is_set():
                job = await self.fetch_job()
                await self.process_job(job)
        except asyncio.CancelledError:
            print(f"Worker {worker_id} shutting down")
            await self.flush_state()
            raise

asyncio.run(Application().start())
```

## Backpressure y Rate Limiting

### Control de Concurrencia con Semaphore

```python
import asyncio

async def fetch_with_concurrency_limit(urls, max_concurrent=10):
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def bounded_fetch(url):
        async with semaphore:
            return await fetch_data(url)
    
    tasks = [bounded_fetch(url) for url in urls]
    return await asyncio.gather(*tasks, return_exceptions=True)

# Producer-consumer con bounded queue
async def producer_consumer_pipeline():
    queue = asyncio.Queue(maxsize=100)  # Backpressure: bloquea cuando esta full
    
    async def producer():
        for i in range(1000):
            await queue.put(i)  # Bloquea si queue esta full
        await queue.put(None)  # Sentinel
    
    async def consumer(worker_id):
        while True:
            item = await queue.get()
            if item is None:
                queue.task_done()
                break
            await process_item(item)
            queue.task_done()
    
    producers = [asyncio.create_task(producer())]
    consumers = [asyncio.create_task(consumer(i)) for i in range(4)]
    
    await asyncio.gather(*producers)
    await queue.join()
    
    for c in consumers:
        await queue.put(None)  # Enviar sentinel a cada consumer
    await asyncio.gather(*consumers)
```

### Rate Limiting con Token Bucket

```python
import asyncio
import time

class AsyncTokenBucket:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_refill = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            
            # Esperar por el siguiente token
            wait_time = (1 - self.tokens) / self.rate
            await asyncio.sleep(wait_time)
            self.tokens = 0
            return True

# Uso
bucket = AsyncTokenBucket(rate=10, capacity=20)  # 10 req/s, burst de 20

async def rate_limited_fetch(url):
    await bucket.acquire()
    return await fetch_data(url)
```

## Mezclar Sync y Async

### Ejecutar Codigo Blocking en Contexto Async

```python
import asyncio
import requests

async def fetch_sync_in_async(url):
    # to_thread corre funcion blocking en un thread pool
    # Python 3.9+
    result = await asyncio.to_thread(requests.get, url)
    return result.json()

# Para Python < 3.9, usar run_in_executor
async def fetch_sync_legacy(url):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,  # Default thread pool
        requests.get,
        url
    )
    return result.json()

# Custom thread pool para CPU-bound work
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

async def cpu_bound_in_thread(data):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor,
        heavy_computation,
        data
    )
    return result
```

### Process Pool para CPU-Bound Work

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

def heavy_computation(data):
    # CPU-bound work corre en un proceso separado
    result = 0
    for i in range(10 ** 7):
        result += i * data
    return result

async def main():
    # Process pool bypassa el GIL para true parallelism
    with ProcessPoolExecutor(max_workers=4) as pool:
        loop = asyncio.get_event_loop()
        
        tasks = [
            loop.run_in_executor(pool, heavy_computation, i)
            for i in range(8)
        ]
        
        results = await asyncio.gather(*tasks)
        print(f"Results: {results}")

asyncio.run(main())
```

## Error Handling

### Propagacion de Exceptions en Tasks

```python
import asyncio

async def failing_task():
    await asyncio.sleep(0.1)
    raise ValueError("Something went wrong")

async def main():
    # Si no se awaitea, exceptions son silently swallowed hasta GC
    task = asyncio.create_task(failing_task())
    
    try:
        await task
    except ValueError as e:
        print(f"Caught: {e}")
    
    # Checkear task state
    print(f"Task done: {task.done()}")
    print(f"Task cancelled: {task.cancelled()}")
    print(f"Task exception: {task.exception()}")

# gather con return_exceptions
async def gather_with_errors():
    results = await asyncio.gather(
        fetch_data("url1"),
        failing_task(),
        fetch_data("url3"),
        return_exceptions=True
    )
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"Task {i} failed: {result}")
        else:
            print(f"Task {i} succeeded: {result}")
```

### Custom Exception Handling

```python
import asyncio
import logging

logger = logging.getLogger(__name__)

def handle_task_exception(loop, context):
    msg = context.get("message", "Unhandled exception")
    exception = context.get("exception")
    task = context.get("task")
    
    logger.error(
        f"Unhandled exception in task: {msg}",
        exc_info=exception
    )
    
    # Custom recovery logic
    if task and not task.done():
        task.cancel()

async def main():
    loop = asyncio.get_event_loop()
    loop.set_exception_handler(handle_task_exception)
    
    # Tasks que pueden fallar
    tasks = [asyncio.create_task(risky_operation()) for _ in range(10)]
    await asyncio.gather(*tasks, return_exceptions=True)

async def risky_operation():
    await asyncio.sleep(0.01)
    if hash(asyncio.current_task()) % 3 == 0:
        raise RuntimeError("Random failure")
```

## Debugging

### Debug Mode

```python
import asyncio

async def main():
    loop = asyncio.get_event_loop()
    loop.set_debug(True)
    
    # Habilitar slow callback warnings
    loop.slow_callback_duration = 0.1  # Warn si callback toma > 100ms
    
    await run_application()

# Environment variable
# PYTHONASYNCIODEBUG=1 python app.py
```

### Detectar Event Loop Bloqueado

```python
import asyncio
import time
import threading

def watchdog(loop, threshold=0.5):
    """Detectar cuando el event loop esta bloqueado."""
    last_tick = time.monotonic()
    
    def checker():
        nonlocal last_tick
        while True:
            now = time.monotonic()
            if now - last_tick > threshold:
                print(f"Event loop blocked for {now - last_tick:.2f}s")
            last_tick = now
            time.sleep(threshold / 2)
    
    thread = threading.Thread(target=checker, daemon=True)
    thread.start()

async def main():
    loop = asyncio.get_event_loop()
    watchdog(loop)
    
    # Esto va a triggerar el watchdog
    time.sleep(2)  # Blocking call — bloquea el event loop!
```

### Logging con aiodebug

```python
import asyncio
import logging

# Loggear slow callbacks
def log_slow_callbacks(duration=0.1):
    loop = asyncio.get_event_loop()
    
    original_run_once = loop._run_once
    
    def instrumented_run_once():
        start = time.monotonic()
        original_run_once()
        elapsed = time.monotonic() - start
        if elapsed > duration:
            logging.getLogger("asyncio").warning(
                f"Callback took {elapsed:.3f}s"
            )
    
    loop._run_once = instrumented_run_once
```

## Testing Async Code

### pytest-asyncio

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data("https://example.com")
    assert result["status"] == "ok"

@pytest.mark.asyncio
async def test_concurrent_fetch():
    results = await asyncio.gather(
        fetch_data("url1"),
        fetch_data("url2")
    )
    assert len(results) == 2

# Testing con mocks
@pytest.mark.asyncio
async def test_with_mock(mocker):
    mock_fetch = mocker.patch("__main__.fetch_data")
    mock_fetch.return_value = {"status": "ok"}
    
    result = await fetch_data("url1")
    assert result["status"] == "ok"
    mock_fetch.assert_called_once_with("url1")

# Testing timeouts
@pytest.mark.asyncio
async def test_timeout():
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=0.1)

# Testing cancellation
@pytest.mark.asyncio
async def test_cancellation():
    task = asyncio.create_task(long_running())
    await asyncio.sleep(0.01)
    task.cancel()
    
    with pytest.raises(asyncio.CancelledError):
        await task
```

## Patrones de Producción

### Connection Pooling

```python
import asyncio
import aiohttp

class HttpClientPool:
    def __init__(self, pool_size=100, timeout=30):
        self.pool_size = pool_size
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.session = None
        self.semaphore = asyncio.Semaphore(pool_size)
    
    async def start(self):
        connector = aiohttp.TCPConnector(
            limit=self.pool_size,
            limit_per_host=20,
            ttl_dns_cache=300
        )
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=self.timeout
        )
    
    async def fetch(self, url):
        async with self.semaphore:
            async with self.session.get(url) as response:
                return await response.json()
    
    async def close(self):
        if self.session:
            await self.session.close()

# Uso
pool = HttpClientPool(pool_size=50)
await pool.start()
try:
    results = await asyncio.gather(*[pool.fetch(url) for url in urls])
finally:
    await pool.close()
```

### Health Checks y Liveness

```python
import asyncio
from aiohttp import web

class HealthServer:
    def __init__(self, app):
        self.app = app
        self.healthy = True
    
    async def health_handler(self, request):
        if self.healthy:
            return web.json_response({"status": "healthy"})
        return web.json_response(
            {"status": "unhealthy"},
            status=503
        )
    
    async def liveness_handler(self, request):
        return web.json_response({"status": "alive"})
    
    async def start(self):
        web_app = web.Application()
        web_app.router.add_get("/health", self.health_handler)
        web_app.router.add_get("/live", self.liveness_handler)
        runner = web.AppRunner(web_app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", 8081)
        await site.start()
```

## Preguntas Frecuentes

### ¿Cuándo debería usar asyncio vs threading vs multiprocessing?

Usa asyncio para work I/O-bound (HTTP requests, database queries, file I/O). Usa threading para work I/O-bound con librerias que no soportan async. Usa multiprocessing para work CPU-bound (computation, data processing). asyncio da la mejor concurrencia para I/O en un solo thread.

### ¿Qué pasa si llamo una funcion blocking en codigo async?

El event loop deja de procesar otras tasks mientras la funcion blocking corre. Esto afecta todas las coroutines concurrentes. Usa `asyncio.to_thread()` o `loop.run_in_executor()` para correr funciones blocking en un thread pool. Monitorea con un watchdog para detectar loops bloqueados.

### ¿Cómo manejo CancelledError?

Catchea `CancelledError` en un bloque `try/finally`, hace cleanup en `finally`, y re-raisea el `CancelledError`. No lo tragues. Si lo catcheas sin re-raisear, la task no se cancelara properly, lo que puede romper `asyncio.gather` y semantica de `TaskGroup`.

### ¿Cuál es la diferencia entre asyncio.gather y TaskGroup?

`asyncio.gather` es fire-and-forget: manejas error handling y cancellation manualmente. `TaskGroup` (Python 3.11+) proporciona structured concurrency: si cualquier task falla, todas las demas son cancelled automaticamente. Usa `TaskGroup` para codigo nuevo. Usa `gather` cuando necesitas control fine-grained sobre error handling.

### ¿Cómo debuggeo una aplicacion async lenta?

Habilita debug mode con `loop.set_debug(True)` o `PYTHONASYNCIODEBUG=1`. Esto habilita slow callback warnings y detecta unclosed resources. Usa un watchdog thread para detectar event loops bloqueados. Profilea con `pyinstrument` o `aiomonitor`. Checkea por blocking calls, puntos de `await` excesivos, o slow callbacks.

### ¿Puedo usar asyncio con Flask?

Flask es sincrono. Para web frameworks async, usa FastAPI, aiohttp, o Starlette. Si debes usar Flask, corre codigo async con `asyncio.run()` dentro de route handlers, o usa Flask 2.0+ que soporta async route handlers con `async def` (los corre en un thread pool).

## See Also

- [Complete Guide to Python Asyncio](/es/guides/complete-guide-python-asyncio/)
- [Complete Guide to Go Concurrency](/es/guides/complete-guide-go-concurrency/)
- [Complete Guide to Java Concurrency](/es/guides/complete-guide-java-concurrency/)
- [Concurrent Async Tasks with asyncio.gather and Task Groups](/es/recipes/python-asyncio-gather-task-groups/)
- [Rate Limit Async Operations with asyncio.Semaphore](/es/recipes/python-asyncio-semaphore-rate-limiting/)

