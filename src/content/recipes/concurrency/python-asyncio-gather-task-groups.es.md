---
contentType: recipes
slug: python-asyncio-gather-task-groups
title: "Ejecutar Tareas Async Concurrentes con asyncio.gather y Task Groups"
description: "Ejecutar multiples operaciones async concurrentemente en Python usando asyncio.gather, asyncio.TaskGroup, manejo de errores con return_exceptions, timeouts y semaforos para rate limiting."
metaDescription: "Ejecuta tareas async concurrentes en Python con asyncio.gather y TaskGroup. Maneja errores, timeouts, semaforos para rate limiting y concurrencia estructurada."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - api
tags:
  - python
  - asyncio
  - concurrency
  - async
  - task-groups
relatedResources:
  - /recipes/concurrency/python-asyncio-semaphore-rate-limiting
  - /recipes/concurrency/python-thread-pool-executor
  - /guides/complete-guide-async-python
  - /guides/complete-guide-concurrency-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejecuta tareas async concurrentes en Python con asyncio.gather y TaskGroup. Maneja errores, timeouts, semaforos para rate limiting y concurrencia estructurada."
  keywords:
    - python asyncio gather
    - asyncio taskgroup
    - python concurrent async
    - asyncio return_exceptions
    - python structured concurrency
---

## Descripcion general

`asyncio.gather` y `asyncio.TaskGroup` (Python 3.11+) permiten ejecutar multiples operaciones async concurrentemente, reduciendo el tiempo total de espera de la suma de todas las operaciones a la operacion mas lenta. A continuacion: peticiones HTTP concurrentes, estrategias de manejo de errores, timeouts, rate limiting con semaforos y concurrencia estructurada con TaskGroup.

## Cuando Usar Esto

- Obtener datos de multiples APIs simultaneamente
- Queries paralelas a base de datos entre shards o servicios
- Procesamiento batch de operaciones I/O-bound (lecturas de archivos, llamadas de red)
- Cualquier escenario donde operaciones async independientes pueden ejecutarse en paralelo

## Prerrequisitos

- Python 3.11+
- `aiohttp` para ejemplos HTTP

## Solucion

### 1. asyncio.gather Basico

```python
import asyncio
import aiohttp
import time

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        data = await response.json()
        return {'url': url, 'status': response.status, 'data': data}

async def fetch_all(urls: list) -> list:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        # Todas las tareas ejecutan concurrentemente — tiempo total = peticion mas lenta
        results = await asyncio.gather(*tasks)
        return results

# Uso
urls = [
    'https://api.example.com/users',
    'https://api.example.com/orders',
    'https://api.example.com/products',
]

start = time.time()
results = asyncio.run(fetch_all(urls))
print(f"Fetched {len(results)} URLs in {time.time() - start:.2f}s")
```

### 2. Manejo de Errores con return_exceptions

```python
import asyncio

async def risky_operation(task_id: int) -> str:
    await asyncio.sleep(0.1)
    if task_id == 2:
        raise ValueError(f"Task {task_id} failed")
    return f"Task {task_id} succeeded"

async def main():
    # return_exceptions=True — las tareas fallidas retornan la excepcion en lugar de lanzarla
    results = await asyncio.gather(
        risky_operation(1),
        risky_operation(2),
        risky_operation(3),
        return_exceptions=True,
    )

    for result in results:
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"Success: {result}")

asyncio.run(main())
# Output:
# Success: Task 1 succeeded
# Error: Task 2 failed
# Success: Task 3 succeeded
```

### 3. asyncio.TaskGroup (Python 3.11+)

```python
import asyncio
import aiohttp

async def fetch_with_task_group(urls: list) -> list:
    results = []

    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            for url in urls:
                task = tg.create_task(fetch_url(session, url))
                # Almacenar objetos task para recuperar resultados despues
                task.add_done_callback(lambda t: results.append(t.result()))

    # TaskGroup garantiza que todas las tareas completen (o lancen) antes de salir
    return results

async def fetch_url(session, url):
    async with session.get(url) as response:
        return await response.json()

# TaskGroup lanza ExceptionGroup si cualquier tarea falla
async def main():
    try:
        results = await fetch_with_task_group(urls)
    except ExceptionGroup as eg:
        for exc in eg.exceptions:
            print(f"Task failed: {exc}")
```

### 4. Timeouts con asyncio.wait_for

```python
import asyncio

async def slow_api_call(endpoint: str) -> dict:
    await asyncio.sleep(10)  # Simula API lenta
    return {'endpoint': endpoint, 'data': 'result'}

async def fetch_with_timeout(url: str, timeout: float = 5.0) -> dict:
    try:
        result = await asyncio.wait_for(slow_api_call(url), timeout=timeout)
        return result
    except asyncio.TimeoutError:
        return {'endpoint': url, 'error': 'timeout'}

async def fetch_all_with_timeout(urls: list, timeout: float = 5.0) -> list:
    tasks = [fetch_with_timeout(url, timeout) for url in urls]
    return await asyncio.gather(*tasks)

results = asyncio.run(fetch_all_with_timeout(['api1', 'api2', 'api3'], timeout=3.0))
```

### 5. Semaforo para Rate Limiting

```python
import asyncio
import aiohttp

async def fetch_with_limit(
    session: aiohttp.ClientSession,
    url: str,
    semaphore: asyncio.Semaphore,
) -> dict:
    async with semaphore:  # Limita peticiones concurrentes
        async with session.get(url) as response:
            return await response.json()

async def fetch_all_rate_limited(urls: list, max_concurrent: int = 10) -> list:
    semaphore = asyncio.Semaphore(max_concurrent)

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_limit(session, url, semaphore) for url in urls]
        return await asyncio.gather(*tasks)

# Procesar 100 URLs con max 10 peticiones concurrentes
urls = [f'https://api.example.com/page/{i}' for i in range(100)]
results = asyncio.run(fetch_all_rate_limited(urls, max_concurrent=10))
```

### 6. as_completed para Resultados Progresivos

```python
import asyncio

async def process_as_completed(urls: list) -> None:
    async with aiohttp.ClientSession() as session:
        tasks = {asyncio.create_task(fetch_url(session, url)): url for url in urls}

        # Los resultados llegan a medida que completan — no en orden de envio
        for coro in asyncio.as_completed(tasks.keys()):
            try:
                result = await coro
                url = tasks[coro]
                print(f"Completed: {url} -> {result['status']}")
            except Exception as e:
                print(f"Failed: {e}")

asyncio.run(process_as_completed(urls))
```

### 7. Paralelismo Limitado con Batches

```python
import asyncio
import aiohttp

async def fetch_in_batches(urls: list, batch_size: int = 20) -> list:
    """Procesar URLs en batches para evitar abrumar al servidor."""
    results = []

    async with aiohttp.ClientSession() as session:
        for i in range(0, len(urls), batch_size):
            batch = urls[i:i + batch_size]
            tasks = [fetch_url(session, url) for url in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            results.extend(batch_results)
            print(f"Processed batch {i // batch_size + 1}")

    return results

# Procesar 1000 URLs en batches de 20
urls = [f'https://api.example.com/item/{i}' for i in range(1000)]
results = asyncio.run(fetch_in_batches(urls, batch_size=20))
```

### 8. Combinar Resultados de Diferentes Fuentes

```python
import asyncio

async def fetch_users() -> list:
    await asyncio.sleep(0.5)
    return [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]

async def fetch_orders() -> list:
    await asyncio.sleep(0.3)
    return [{'id': 101, 'userId': 1, 'total': 50}]

async def fetch_products() -> list:
    await asyncio.sleep(0.4)
    return [{'id': 201, 'name': 'Widget', 'price': 10}]

async def fetch_dashboard_data() -> dict:
    # Los tres fetches ejecutan concurrentemente
    users, orders, products = await asyncio.gather(
        fetch_users(),
        fetch_orders(),
        fetch_products(),
    )
    return {'users': users, 'orders': orders, 'products': products}

# Tiempo total = max(0.5, 0.3, 0.4) = 0.5s, no 0.5 + 0.3 + 0.4 = 1.2s
data = asyncio.run(fetch_dashboard_data())
```

## Como Funciona

1. **`asyncio.gather`**: Toma multiples coroutines, las programa todas en el event loop y retorna un future que resuelve cuando todas completan. Los resultados se retornan en el mismo orden que las coroutines de entrada.
2. **`return_exceptions=True`**: Por defecto, `gather` lanza la primera excepcion encontrada. Con `return_exceptions=True`, las excepciones se retornan como resultados — util cuando el exito parcial es aceptable.
3. **`asyncio.TaskGroup`**: Introducido en Python 3.11, proporciona concurrencia estructurada. Todas las tareas en el grupo estan garantizadas a completar antes de que el context manager salga. Si cualquier tarea falla, las tareas restantes se cancelan.
4. **`asyncio.wait_for`**: Envuelve una coroutine con un timeout. Si el timeout expira, la coroutine se cancela y se lanza `asyncio.TimeoutError`.
5. **`asyncio.Semaphore`**: Limita el numero de operaciones concurrentes. Cada `async with semaphore` adquiere un slot; liberarlo permite que la siguiente tarea en espera proceda.

## Variantes

### Cancelar en Primera Excepcion

```python
async def fetch_first_successful(urls: list) -> dict:
    """Retornar el primer resultado exitoso, cancelar el resto."""
    tasks = [asyncio.create_task(fetch_url(url)) for url in urls]

    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Cancelar tareas restantes
    for task in pending:
        task.cancel()

    # Retornar primer resultado completado
    for task in done:
        if not task.exception():
            return task.result()

    raise RuntimeError("All tasks failed")
```

### Creacion Dinamica de Tareas

```python
async def process_stream(stream, handler):
    """Crear tareas dinamicamente a medida que items llegan de un stream."""
    async with asyncio.TaskGroup() as tg:
        async for item in stream:
            tg.create_task(handler(item))
```

### Gather con Tracking de Progreso

```python
async def fetch_with_progress(urls: list) -> list:
    results = [None] * len(urls)
    progress = 0

    async def fetch_and_store(index, url):
        nonlocal progress
        results[index] = await fetch_url(url)
        progress += 1
        print(f"Progress: {progress}/{len(urls)}")

    await asyncio.gather(*[fetch_and_store(i, url) for i, url in enumerate(urls)])
    return results
```

## Mejores Practicas

- **Usar `TaskGroup` sobre `gather` en Python 3.11+**: TaskGroup proporciona concurrencia estructurada — todas las tareas estan garantizadas a completar o cancelarse antes de salir. Tambien proporciona mejores mensajes de error via `ExceptionGroup`.
- **Establecer timeouts**: Sin timeouts, una operacion lenta bloquea `gather` indefinidamente. Usa `asyncio.wait_for` o `async.timeout()` (Python 3.11+).
- **Usar semaforos para rate limiting**: Concurrencia sin limites puede abrumar servidores o alcanzar limites de conexiones. Usa `asyncio.Semaphore` para limitar operaciones concurrentes.
- **Usar `return_exceptions=True` para exito parcial**: Cuando procesas muchos items independientes, no dejes que un fallo aborte todo el batch.
- **Reusar `aiohttp.ClientSession`**: Crear una session por peticion es costoso. Crea una session y compartela entre todas las tareas.
- **Procesar en batches para listas muy grandes**: 10,000 tareas concurrentes pueden agotar memoria. Procesa en batches de 50-100.

## Errores Comunes

- **Olvidar `asyncio.run()`**: Las coroutines no ejecutan hasta que se awaited o se programan. Usa `asyncio.run()` para ejecutar la coroutine de nivel superior.
- **No manejar excepciones**: Por defecto, `gather` lanza la primera excepcion. Si necesitas todos los resultados, usa `return_exceptions=True`.
- **Crear demasiadas tareas concurrentes**: 10,000 peticiones HTTP simultaneas abrumaran la mayoria de servidores. Usa un semaforo o procesamiento en batches.
- **Mezclar sync y async**: Las llamadas bloqueantes (`time.sleep`, `requests.get`) bloquean el event loop. Usa equivalentes async (`asyncio.sleep`, `aiohttp`).
- **No cancelar tareas pendientes**: Con `asyncio.wait(FIRST_COMPLETED)`, las tareas pendientes deben cancelarse explicitamente. De lo contrario siguen ejecutandose en background.

## FAQ

**Cual es la diferencia entre `gather` y `TaskGroup`?**

`gather` retorna resultados en orden y no garantiza cleanup en error. `TaskGroup` (Python 3.11+) proporciona concurrencia estructurada — todas las tareas completan o se cancelan antes de salir, y los errores se recolectan en un `ExceptionGroup`.

**Cuantas tareas concurrentes deberia ejecutar?**

Depende de la operacion. Para peticiones HTTP, 10-50 concurrentes es tipico. Para trabajo CPU-bound, usa `ProcessPoolExecutor`. Para trabajo I/O-bound, 100-1000 puede estar bien con un semaforo.

**`gather` preserva el orden?**

Si. Los resultados se retornan en el mismo orden que las coroutines de entrada, independientemente del orden de completado. Usa `as_completed` si necesitas resultados a medida que terminan.

**Que pasa si una tarea en `TaskGroup` lanza una excepcion?**

Todas las otras tareas en el grupo se cancelan. La excepcion se recolecta en un `ExceptionGroup` que se lanza cuando el bloque `async with TaskGroup()` sale.

**Puedo usar `gather` con funciones regulares?**

No. `gather` requiere coroutines (funciones async). Para funciones sincronas, usa `asyncio.to_thread()` para envolverlas, o usa `ThreadPoolExecutor` con `loop.run_in_executor()`.
