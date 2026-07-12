---






contentType: guides
slug: complete-guide-python-asyncio
title: "Referencia Detallada de Python Asyncio"
description: "Master programación asincrónica en Python con asyncio. Cubre coroutines, tasks, event loops, async/await, gather, semaphores, queues, HTTP clients, websockets y debugging."
metaDescription: "Referencia detallada de Python asyncio: coroutines, tasks, event loops, async/await, gather, semaphores, queues, HTTP clients y debugging de codigo async."
difficulty: advanced
topics:
  - concurrency
  - performance
tags:
  - python
  - asyncio
  - async
  - concurrency
  - coroutines
  - event-loop
  - guide
  - concurrency
relatedResources:
  - /guides/complete-guide-kafka-stream-processing
  - /guides/performance-optimization-guide
  - /guides/concurrency-patterns-guide
  - /recipes/redis-distributed-lock
  - /recipes/python-schedule-periodic-tasks
  - /recipes/rust-tokio-async-runtime
  - /recipes/deadlock-prevention-sql
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Referencia detallada de Python asyncio: coroutines, tasks, event loops, async/await, gather, semaphores, queues, HTTP clients y debugging de codigo async."
  keywords:
    - python asyncio
    - async python
    - coroutines
    - event loop
    - async await
    - asyncio gather
    - async http client
    - python concurrency






---

# Referencia Detallada de Python Asyncio

## Introducción

Asyncio es el framework de Python para escribir concurrent code usando async/await syntax. Usa un single-threaded event loop para manejar múltiples coroutines, haciéndolo ideal para I/O-bound workloads como HTTP requests, database queries y websocket connections. A continuación: coroutines, tasks, el event loop, concurrency primitives, async HTTP clients, websockets y debugging.

## Coroutines y async/await

### Coroutine básica

```python
import asyncio

async def fetch_data(url: str) -> str:
    print(f"Fetching {url}")
    await asyncio.sleep(1)  # Simular I/O
    return f"Data from {url}"

async def main():
    result = await fetch_data("https://example.com")
    print(result)

asyncio.run(main())
```

### Corriendo múltiples coroutines secuencialmente

```python
async def main():
    start = asyncio.get_event_loop().time()

    result1 = await fetch_data("https://api1.example.com")
    result2 = await fetch_data("https://api2.example.com")
    result3 = await fetch_data("https://api3.example.com")

    elapsed = asyncio.get_event_loop().time() - start
    print(f"Sequential: {elapsed:.2f}s")  # ~3.0s
```

### Corriendo concurrentemente con asyncio.gather

```python
async def main():
    start = asyncio.get_event_loop().time()

    results = await asyncio.gather(
        fetch_data("https://api1.example.com"),
        fetch_data("https://api2.example.com"),
        fetch_data("https://api3.example.com"),
    )

    elapsed = asyncio.get_event_loop().time() - start
    print(f"Concurrent: {elapsed:.2f}s")  # ~1.0s
    print(results)
```

### Error handling con gather

```python
async def fetch_with_error(url: str) -> str:
    if "error" in url:
        raise ValueError(f"Failed to fetch {url}")
    await asyncio.sleep(0.5)
    return f"Data from {url}"

async def main():
    # return_exceptions=True mantiene errors como results en lugar de raisear
    results = await asyncio.gather(
        fetch_with_error("https://good.example.com"),
        fetch_with_error("https://error.example.com"),
        fetch_with_error("https://good2.example.com"),
        return_exceptions=True,
    )

    for result in results:
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"Success: {result}")
```

## Tasks

### Creando tasks manualmente

```python
async def main():
    # Schedulear coroutines como tasks — empiezan a correr inmediatamente
    task1 = asyncio.create_task(fetch_data("https://api1.example.com"))
    task2 = asyncio.create_task(fetch_data("https://api2.example.com"))

    # Hacer otro work mientras las tasks corren
    print("Tasks started, doing other work...")
    await asyncio.sleep(0.5)

    # Awaitear tasks cuando necesitas results
    result1 = await task1
    result2 = await task2
    print(result1, result2)
```

### Task cancellation

```python
async def long_running():
    try:
        while True:
            print("Working...")
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        print("Task cancelled, cleaning up...")
        raise  # Re-raisear para propagar cancellation

async def main():
    task = asyncio.create_task(long_running())
    await asyncio.sleep(3.5)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("Task was cancelled")
```

### Task groups (Python 3.11+)

```python
async def main():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch_data("https://api1.example.com"))
        task2 = tg.create_task(fetch_data("https://api2.example.com"))
        task3 = tg.create_task(fetch_data("https://api3.example.com"))

    # Todas las tasks completan cuando el context manager exita
    print(task1.result(), task2.result(), task3.result())
```

## El Event Loop

### Corriendo el event loop

```python
# asyncio.run() — recomendado para top-level entry point
asyncio.run(main())

# Manual loop control (para advanced use cases)
async def main():
    loop = asyncio.get_running_loop()
    print(f"Running on: {loop}")

# Correr en background thread (para mixing sync/async code)
import asyncio
from threading import Thread

class AsyncRunner:
    def __init__(self):
        self.loop = asyncio.new_event_loop()
        self.thread = Thread(target=self.loop.run_forever, daemon=True)
        self.thread.start()

    def submit(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, self.loop).result()

runner = AsyncRunner()
result = runner.submit(fetch_data("https://example.com"))
```

## Semaphores (Limitando Concurrency)

```python
async def fetch_with_limit(url: str, semaphore: asyncio.Semaphore) -> str:
    async with semaphore:
        await asyncio.sleep(0.5)
        return f"Data from {url}"

async def main():
    semaphore = asyncio.Semaphore(10)  # Max 10 concurrent

    urls = [f"https://api{i}.example.com" for i in range(100)]
    tasks = [fetch_with_limit(url, semaphore) for url in urls]

    results = await asyncio.gather(*tasks)
    print(f"Fetched {len(results)} URLs")
```

## Queues

### Producer-consumer pattern

```python
async def producer(queue: asyncio.Queue, items: list):
    for item in items:
        await queue.put(item)
        print(f"Produced: {item}")
    await queue.put(None)  # Sentinel

async def consumer(queue: asyncio.Queue, consumer_id: int):
    while True:
        item = await queue.get()
        if item is None:
            await queue.put(None)  # Pasar sentinel al next consumer
            break
        await asyncio.sleep(0.5)
        print(f"Consumer {consumer_id} processed: {item}")
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=10)
    items = list(range(20))

    producers = [asyncio.create_task(producer(queue, items))]
    consumers = [asyncio.create_task(consumer(queue, i)) for i in range(3)]

    await asyncio.gather(*producers)
    await queue.join()
    for c in consumers:
        c.cancel()
```

## Async HTTP Clients

### aiohttp

```python
import aiohttp
import asyncio

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_many(urls: list) -> list:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await asyncio.gather(*tasks)

async def main():
    urls = [f"https://api.example.com/users/{i}" for i in range(50)]
    results = await fetch_many(urls)
    print(f"Fetched {len(results)} users")

asyncio.run(main())
```

### httpx (sync + async)

```python
import httpx
import asyncio

async def fetch_with_httpx(urls: list) -> list:
    async with httpx.AsyncClient(timeout=30, limits=httpx.Limits(max_connections=20)) as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]

async def main():
    urls = [f"https://api.example.com/items/{i}" for i in range(100)]
    results = await fetch_with_httpx(urls)
    print(f"Got {len(results)} items")
```

### Retry con tenacity

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
)
async def fetch_with_retry(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()
```

## Websockets

### Server

```python
import asyncio
import websockets

connected = set()

async def handler(websocket):
    connected.add(websocket)
    try:
        async for message in websocket:
            # Broadcast a todos los connected clients
            websockets.broadcast(connected, message)
    finally:
        connected.remove(websocket)

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()  # Correr forever

asyncio.run(main())
```

### Client

```python
import asyncio
import websockets

async def client():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as ws:
        await ws.send("Hello, server!")
        response = await ws.recv()
        print(f"Received: {response}")

asyncio.run(client())
```

## Mixing Sync y Async Code

### asyncio.to_thread (Python 3.9+)

```python
import asyncio
import time

def blocking_io(duration: float) -> str:
    time.sleep(duration)  # Blocking call
    return f"Slept for {duration}s"

async def main():
    # Correr blocking function en un thread
    result = await asyncio.to_thread(blocking_io, 2.0)
    print(result)

asyncio.run(main())
```

### run_in_executor

```python
async def main():
    loop = asyncio.get_running_loop()

    # Usar default thread pool
    result = await loop.run_in_executor(None, blocking_io, 2.0)

    # Usar process pool para CPU-bound work
    from concurrent.futures import ProcessPoolExecutor
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, cpu_intensive_work, data)
```

## Debuggeando Async Code

### Habilitar debug mode

```python
import asyncio
import logging

logging.basicConfig(level=logging.DEBUG)

async def main():
    asyncio.get_running_loop().set_debug(True)

    # Logear slow callbacks (> 100ms)
    asyncio.get_running_loop().slow_callback_duration = 0.1

    await some_operation()

asyncio.run(main(), debug=True)
```

### Pitfalls comunes

```python
# PITFALL 1: Olvidar await — coroutine nunca corre
async def bad():
    fetch_data("https://example.com")  # Falta await!
    # RuntimeWarning: coroutine 'fetch_data' was never awaited

# PITFALL 2: Blocking call en async code
async def bad():
    time.sleep(5)  # Bloquea el entire event loop!

async def good():
    await asyncio.sleep(5)  # Non-blocking

# PITFALL 3: Crear coroutine sin schedulear
async def bad():
    coro = fetch_data("https://example.com")
    # Nunca awaited, nunca scheduled

# PITFALL 4: Usar requests (sync) en async code
import requests

async def bad():
    response = requests.get("https://example.com")  # Bloquea event loop!

async def good():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://example.com")
```

## Pautas

- **Usar `asyncio.run()` como entry point** — crea y cierra el event loop propiamente
- **Usar `asyncio.gather()` para concurrent I/O** — corre coroutines concurrentemente, espera a todas
- **Limitar concurrency con semaphores** — prevenir overwhelming external services
- **Usar `asyncio.TaskGroup` (3.11+)** — mejor error handling que `gather`
- **Nunca llamar blocking functions en async code** — usar `asyncio.to_thread()` en su lugar
- **Usar async HTTP clients** — `aiohttp` o `httpx`, nunca `requests`
- **Setear timeouts** — `asyncio.wait_for()` o `asyncio.timeout()` para prevenir hangs
- **Handlear `CancelledError`** — limpiar resources cuando las tasks se cancelan
- **Usar `return_exceptions=True`** cuando quieres handlear errors per-task
- **Preferir `asyncio.Queue` sobre threading.Queue** — funciona con el event loop
- **Habilitar debug mode en development** — captura missing awaits y slow callbacks
- **Usar type hints con `Coroutine`** — mejorar IDE support y capturar type errors

## Errores Comunes

- Olvidar `await` — coroutine se crea pero nunca se ejecuta
- Llamar `time.sleep()` en lugar de `await asyncio.sleep()` — bloquea el event loop
- Usar `requests` library en async code — bloquea el event loop
- No limitar concurrency — miles de simultaneous requests overwhelm servers
- No handlear `CancelledError` — resources leakean cuando las tasks se cancelan
- Mixing `asyncio.run()` calls — solo un event loop debería correr por process
- No setear timeouts — una response lenta cuelga el entire application
- Usar `asyncio.get_event_loop()` en código moderno — usar `asyncio.get_running_loop()` o `asyncio.run()`
- Crear tasks sin guardar references — el garbage collector puede cancelarlas
- No usar `async with` para resources — connections leakean sin proper cleanup

## Preguntas Frecuentes

### ¿Cuándo debo usar asyncio vs threading vs multiprocessing?

Usar **asyncio** para I/O-bound workloads (HTTP requests, database queries, file I/O) — maneja miles de concurrent connections con un solo thread. Usar **threading** para I/O-bound code que usa blocking libraries (como `requests`). Usar **multiprocessing** para CPU-bound work (data processing, computation) — asyncio y threading están limitados por el GIL.

### ¿Puedo usar asyncio con Flask?

Flask es síncrono por default. Para async support, usar Flask 2.0+ con `async def` route handlers, o switchear a un async framework como FastAPI, Quart o Starlette. FastAPI es la opción más popular — usa Starlette's asyncio internamente y soporta async/await nativamente.

### ¿Cómo testeo async code?

Usar `pytest-asyncio`:

```python
import pytest

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data("https://example.com")
    assert "Data from" in result
```

## See Also

- [Complete Guide to Python Asyncio in Production](/es/guides/complete-guide-python-asyncio-production/)
- [Concurrent Async Tasks with asyncio.gather and Task Groups](/es/recipes/python-asyncio-gather-task-groups/)
- [Rate Limit Async Operations with asyncio.Semaphore](/es/recipes/python-asyncio-semaphore-rate-limiting/)
- [Complete Guide to Go Concurrency](/es/guides/complete-guide-go-concurrency/)
- [Complete Guide to Java Concurrency](/es/guides/complete-guide-java-concurrency/)

