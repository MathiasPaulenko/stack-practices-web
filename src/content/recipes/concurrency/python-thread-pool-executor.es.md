---
contentType: recipes
slug: python-thread-pool-executor
title: "Paralelizar Trabajo CPU y I/O con ThreadPoolExecutor"
description: "Usar ThreadPoolExecutor de Python para operaciones I/O paralelas, recoleccion thread-safe de resultados, callbacks de Future, manejo de errores y mezcla de threads con asyncio para trabajo bloqueante."
metaDescription: "Paraleliza trabajo I/O en Python con ThreadPoolExecutor. Usa callbacks de Future, recoleccion thread-safe, manejo de errores y mezcla threads con asyncio."
difficulty: intermediate
topics:
  - concurrency
  - performance
tags:
  - python
  - threading
  - thread-pool
  - parallelism
  - concurrent-futures
relatedResources:
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /recipes/concurrency/python-asyncio-semaphore-rate-limiting
  - /guides/concurrency-patterns-guide
  - /guides/complete-guide-python-asyncio
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Paraleliza trabajo I/O en Python con ThreadPoolExecutor. Usa callbacks de Future, recoleccion thread-safe, manejo de errores y mezcla threads con asyncio."
  keywords:
    - python threadpool executor
    - concurrent futures python
    - python thread pool
    - python parallel io
    - future callback python
---

## Descripcion general

`ThreadPoolExecutor` de `concurrent.futures` proporciona una API simple para ejecutar funciones en threads paralelos. Es ideal para trabajo I/O-bound (peticiones HTTP, operaciones de archivos, queries a base de datos) donde el GIL se libera. A continuacion: ejecucion paralela basica, `map` vs `submit`, callbacks de Future, manejo de errores, uso de context manager y mezcla de threads con asyncio.

## Cuando Usar Esto

- Trabajo I/O-bound paralelo (peticiones HTTP, descargas de archivos, queries a base de datos)
- Llamar librerias bloqueantes desde codigo async
- Ejecucion paralela de funciones independientes sin soporte async
- Tareas en background que no necesitan el event loop

## Prerrequisitos

- Python 3.10+

## Solucion

### 1. ThreadPoolExecutor Basico

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import time

def fetch_url(url: str) -> dict:
    response = requests.get(url, timeout=10)
    return {'url': url, 'status': response.status_code, 'size': len(response.content)}

urls = [
    'https://api.example.com/users',
    'https://api.example.com/orders',
    'https://api.example.com/products',
    'https://api.example.com/inventory',
]

# Usando context manager — el pool se apaga automaticamente
start = time.time()
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(fetch_url, url): url for url in urls}

    for future in as_completed(futures):
        url = futures[future]
        try:
            result = future.result()
            print(f"{url}: {result['status']} ({result['size']} bytes)")
        except Exception as e:
            print(f"{url} failed: {e}")

print(f"Total time: {time.time() - start:.2f}s")
```

### 2. Usar executor.map (Resultados Ordenados)

```python
from concurrent.futures import ThreadPoolExecutor

def process_item(item: int) -> int:
    import time
    time.sleep(0.5)
    return item * 2

items = list(range(10))

with ThreadPoolExecutor(max_workers=5) as executor:
    # map retorna resultados en el MISMO ORDEN que el input — a diferencia de as_completed
    results = list(executor.map(process_item, items))

print(results)  # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
```

### 3. Callbacks de Future

```python
from concurrent.futures import ThreadPoolExecutor
import threading

def long_task(task_id: int) -> str:
    import time
    time.sleep(1)
    return f"Result of task {task_id}"

def on_complete(future):
    try:
        result = future.result()
        print(f"[Thread {threading.current_thread().name}] Callback: {result}")
    except Exception as e:
        print(f"Callback error: {e}")

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = []
    for i in range(5):
        future = executor.submit(long_task, i)
        future.add_done_callback(on_complete)
        futures.append(future)

    # Esperar a que todos completen
    for future in futures:
        future.result()
```

### 4. Manejo de Errores

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def risky_task(task_id: int) -> str:
    if task_id == 2:
        raise ValueError(f"Task {task_id} intentionally failed")
    import time
    time.sleep(0.1)
    return f"Task {task_id} succeeded"

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {executor.submit(risky_task, i): i for i in range(5)}

    for future in as_completed(futures):
        task_id = futures[future]
        try:
            result = future.result(timeout=5)
            print(f"Success: {result}")
        except ValueError as e:
            print(f"Task {task_id} ValueError: {e}")
        except TimeoutError:
            print(f"Task {task_id} timed out")
        except Exception as e:
            print(f"Task {task_id} unexpected error: {type(e).__name__}: {e}")
```

### 5. Recoleccion Thread-Safe de Resultados

```python
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
import requests

class ThreadSafeResults:
    def __init__(self):
        self._results = []
        self._lock = Lock()
        self._errors = []

    def add_result(self, result):
        with self._lock:
            self._results.append(result)

    def add_error(self, error):
        with self._lock:
            self._errors.append(error)

    @property
    def results(self):
        with self._lock:
            return list(self._results)

    @property
    def errors(self):
        with self._lock:
            return list(self._errors)

def fetch_and_store(url: str, storage: ThreadSafeResults):
    try:
        response = requests.get(url, timeout=10)
        storage.add_result({'url': url, 'status': response.status_code})
    except Exception as e:
        storage.add_error({'url': url, 'error': str(e)})

storage = ThreadSafeResults()
urls = [f'https://api.example.com/data/{i}' for i in range(50)]

with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(lambda url: fetch_and_store(url, storage), urls)

print(f"Successes: {len(storage.results)}")
print(f"Failures: {len(storage.errors)}")
```

### 6. Mezclar Threads con asyncio

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor
import requests

def blocking_fetch(url: str) -> dict:
    """Funcion sincrona que bloquea — ejecuta en un thread."""
    response = requests.get(url, timeout=10)
    return response.json()

async def fetch_all(urls: list) -> list:
    loop = asyncio.get_event_loop()

    # Ejecutar funcion bloqueante en thread pool — no bloquea el event loop
    with ThreadPoolExecutor(max_workers=10) as executor:
        tasks = [
            loop.run_in_executor(executor, blocking_fetch, url)
            for url in urls
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)

# O usar asyncio.to_thread (Python 3.9+) para casos mas simples
async def fetch_one(url: str) -> dict:
    return await asyncio.to_thread(blocking_fetch, url)

urls = [f'https://api.example.com/data/{i}' for i in range(20)]
results = asyncio.run(fetch_all(urls))
```

### 7. Procesamiento en Chunks

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

def process_chunk(chunk: list) -> list:
    """Procesar un chunk de URLs secuencialmente dentro de un thread."""
    results = []
    for url in chunk:
        try:
            response = requests.get(url, timeout=10)
            results.append({'url': url, 'status': response.status_code})
        except Exception as e:
            results.append({'url': url, 'error': str(e)})
    return results

def process_in_chunks(urls: list, num_workers: int = 5) -> list:
    # Dividir URLs en chunks — uno por worker
    chunk_size = (len(urls) + num_workers - 1) // num_workers
    chunks = [urls[i:i + chunk_size] for i in range(0, len(urls), chunk_size)]

    all_results = []
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = {executor.submit(process_chunk, chunk): chunk for chunk in chunks}

        for future in as_completed(futures):
            all_results.extend(future.result())

    return all_results

urls = [f'https://api.example.com/data/{i}' for i in range(100)]
results = process_in_chunks(urls, num_workers=10)
```

### 8. ProcessPoolExecutor para Trabajo CPU-Bound

```python
from concurrent.futures import ProcessPoolExecutor
import math

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

def count_primes(start: int, end: int) -> int:
    return sum(1 for n in range(start, end) if is_prime(n))

# Usar ProcessPoolExecutor para trabajo CPU-bound — byebyes el GIL
ranges = [(0, 100000), (100000, 200000), (200000, 300000), (300000, 400000)]

with ProcessPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(count_primes, start, end) for start, end in ranges]
    total = sum(f.result() for f in futures)

print(f"Total primes: {total}")
```

## Como Funciona

1. **ThreadPoolExecutor**: Gestiona un pool de threads workers. `submit()` programa una funcion para ejecutar en un thread y retorna un `Future`. El pool reutiliza threads, evitando el overhead de crear un thread por tarea.
2. **`submit` vs `map`**: `submit` retorna un `Future` inmediatamente — los resultados llegan en orden de completado con `as_completed`. `map` retorna un iterador que produce resultados en orden de entrada, bloqueando hasta que cada uno este listo.
3. **Future**: Representa el resultado eventual de una operacion asincrona. `future.result()` bloquea hasta que la operacion completa y retorna el resultado (o lanza la excepcion).
4. **GIL**: El Global Interpreter Lock de Python previene que multiples threads ejecuten bytecode de Python simultaneamente. Sin embargo, las operaciones I/O (red, archivo, sleep) liberan el GIL, permitiendo paralelismo real para trabajo I/O-bound.
5. **ProcessPoolExecutor**: Para trabajo CPU-bound, usa procesos en lugar de threads. Cada proceso tiene su propio GIL, habilitando paralelismo real para computacion.

## Variantes

### Executor Reutilizable

```python
from concurrent.futures import ThreadPoolExecutor

class WorkerPool:
    """Thread pool de larga vida para uso repetido."""
    def __init__(self, max_workers: int = 10):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit(self, fn, *args, **kwargs):
        return self.executor.submit(fn, *args, **kwargs)

    def map(self, fn, *iterables):
        return self.executor.map(fn, *iterables)

    def shutdown(self):
        self.executor.shutdown(wait=True)

# Uso — mantener el pool vivo entre multiples batches
pool = WorkerPool(max_workers=10)
results1 = list(pool.map(fetch_url, urls_batch1))
results2 = list(pool.map(fetch_url, urls_batch2))
pool.shutdown()
```

### Thread-Local Storage

```python
from concurrent.futures import ThreadPoolExecutor
import threading

thread_local = threading.local()

def init_session():
    if not hasattr(thread_local, 'session'):
        import requests
        thread_local.session = requests.Session()
    return thread_local.session

def fetch_with_reused_session(url: str) -> dict:
    session = init_session()  # Cada thread obtiene su propia session
    response = session.get(url, timeout=10)
    return {'url': url, 'status': response.status_code}

# Cada thread reutiliza su propia Session — connection pooling por thread
with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(fetch_with_reused_session, urls))
```

## Mejores Practicas

- **Usar threads para I/O, procesos para CPU**: Los threads estan bien para peticiones HTTP y I/O de archivos (el GIL se libera). Para trabajo CPU-bound, usa `ProcessPoolExecutor` para byepasar el GIL.
- **Establecer `max_workers` apropiadamente**: Para trabajo I/O-bound, 5-20 workers es tipico. Para trabajo CPU-bound, iguala el numero de cores de CPU. Demasiados workers causan overhead de context-switching.
- **Siempre usar context manager**: `with ThreadPoolExecutor() as executor` asegura que el pool se apague incluso si ocurren excepciones.
- **Usar `as_completed` para progreso**: `as_completed` produce futures a medida que terminan, permitiendo procesamiento progresivo de resultados. Usa `map` cuando el orden importa.
- **Manejar excepciones por future**: `future.result()` re-lanza la excepcion original. Catch por future para manejar fallos sin abortar todo el batch.
- **Usar thread-local para recursos por thread**: Las conexiones a base de datos y sesiones HTTP deben ser por thread para evitar problemas de sharing. Usa `threading.local()`.

## Errores Comunes

- **Usar threads para trabajo CPU-bound**: El GIL previene paralelismo real para computacion. Usa `ProcessPoolExecutor` en su lugar.
- **No manejar excepciones**: Si un future lanza y no llamas `future.result()`, la excepcion se swallow silenciosamente. Siempre llama `result()` o verifica `future.exception()`.
- **Compartir estado mutable sin locks**: Los threads acceden memoria compartida. Usa `threading.Lock` o data structures thread-safe para prevenir race conditions.
- **Crear demasiados threads**: Cada thread consume ~8MB de stack. 1000 threads = 8GB de stack. Usa un pool limitado.
- **No apagar el executor**: Sin el context manager, debes llamar `executor.shutdown()`. Executors con leak mantienen threads vivos, impidiendo que el proceso termine.

## FAQ

**Cuando deberia usar ThreadPoolExecutor vs asyncio?**

Usa `ThreadPoolExecutor` para llamar librerias bloqueantes (requests, psycopg2) que no tienen equivalentes async. Usa asyncio para codigo nuevo donde controlas la capa I/O (aiohttp, asyncpg).

**Cuantos workers deberia usar?**

Para trabajo I/O-bound: 5-20 es tipico. Para trabajo CPU-bound: `os.cpu_count()`. Mas workers de los necesarios causan overhead de context-switching. Monitorea con `executor._work_queue.qsize()`.

**Que es el GIL y como afecta a los threads?**

El Global Interpreter Lock previene que multiples threads ejecuten bytecode de Python simultaneamente. Las operaciones I/O liberan el GIL, permitiendo que los threads ejecuten en paralelo durante I/O. El trabajo CPU-bound no libera el GIL, por lo que los threads ejecutan secuencialmente.

**Puedo cancelar un future enviado?**

Si. `future.cancel()` previene que el future se ejecute si aun no ha empezado. Si ya esta ejecutando, la cancelacion falla. Verifica con `future.cancelled()`.

**Cual es la diferencia entre `map` y `submit`?**

`map` retorna resultados en orden de entrada y bloquea hasta que cada resultado esta listo. `submit` retorna un `Future` inmediatamente — usa `as_completed` para procesar resultados a medida que terminan. Usa `map` para resultados ordenados, `submit` para flexibilidad.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
