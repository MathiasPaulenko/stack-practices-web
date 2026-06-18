---
contentType: guides
slug: concurrency-patterns-guide
title: "Guía de Patrones de Concurrencia"
description: "Guía de patrones de concurrencia comunes y mejores prácticas para escribir código concurrente seguro y eficiente."
metaDescription: "Aprende patrones de concurrencia: thread pools, async/await, futures, semáforos y prevención de race conditions. Ejemplos prácticos en múltiples lenguajes."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - architecture
  - concurrencia
  - concurrency
  - paralelismo
  - semaforo
relatedResources:
  - /es/recipes/caching
  - /es/patterns/design/singleton-pattern
  - /es/guides/software-architecture-guide
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende patrones de concurrencia: thread pools, async/await, futures, semáforos y prevención de race conditions. Ejemplos prácticos en múltiples lenguajes."
  keywords:
    - concurrencia
    - async programming
    - thread pools
    - paralelismo
    - race conditions
    - sincronizacion
---

## Resumen

La concurrencia permite que los programas manejen múltiples tareas simultáneamente. Usada correctamente, mejora el throughput y la capacidad de respuesta. Usada incorrectamente, introduce race conditions, deadlocks y bugs sutiles que son difíciles de reproducir.

## Cuándo Usar Concurrencia

| Caso de Uso | Enfoque |
|-------------|---------|
| Tareas I/O-bound | Async/await, coroutines |
| Tareas CPU-bound | Thread pools, multiprocessing |
| Jobs en background | Colas de tareas |

## Thread Pool Pattern

En vez de crear threads por tarea, reutiliza un pool fijo.

```python
from concurrent.futures import ThreadPoolExecutor

def fetch(url):
    return requests.get(url, timeout=10).status_code

with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(fetch, urls))
```

**Regla general**: Tamaño del pool ~ número de cores de CPU para tareas CPU-bound, mayor para I/O-bound.

## Async/Await Pattern

I/O no bloqueante sin threads.

```python
import asyncio

async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

## Producer-Consumer Pattern

Desacopla la generación de trabajo del procesamiento.

```python
import asyncio
from asyncio import Queue

async def producer(queue: Queue, items: list):
    for item in items:
        await queue.put(item)
    await queue.put(None)

async def consumer(queue: Queue):
    while True:
        item = await queue.get()
        if item is None: break
        # ... procesar item
        queue.task_done()
```

## Semáforo para Rate Limiting

Controla el acceso a recursos limitados.

```python
class RateLimitedClient:
    def __init__(self, max_concurrent: int = 5):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def request(self, url: str):
        async with self.semaphore:
            return await fetch(url)
```

## Evitando Race Conditions

### Datos Inmutables

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: float
    y: float
```

### Operaciones Atómicas

```python
import threading

class SafeCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:
            self._value += 1
```

## Errores Comunes

| Problema | Síntoma | Solución |
|----------|---------|----------|
| **Race condition** | Resultados incorrectos intermitentes | Locks, operaciones atómicas, inmutabilidad |
| **Deadlock** | Threads congelados esperándose | Orden consistente de locks, timeouts |
| **Thread leak** | Memoria crece con el tiempo | Usar thread pools, siempre hacer shutdown |
| **Context switching** | CPU alta, throughput bajo | Reducir cantidad de threads, usar async I/O |

## Buenas Prácticas

- **Share nothing**: Prefiere paso de mensajes sobre estado compartido
- **Usa colecciones thread-safe**: `ConcurrentHashMap`, `Queue`, `AtomicInteger`
- **Mantén secciones críticas pequeñas**: Bloquea por el mínimo tiempo
- **Nunca llames APIs externas mientras mantienes un lock**

## Preguntas Frecuentes

### Cuándo debería usar async/await vs threads?

Usa async/await para tareas I/O-bound (HTTP calls, sistema de archivos, bases de datos). Usa threads o procesos para trabajo CPU-bound (cálculos, procesamiento de datos) que necesita ejecución paralela.

### Cómo evito deadlocks?

Siempre adquiere locks en el mismo orden en tu codebase. Usa timeouts en adquisición de locks. Prefiere estructuras de datos lock-free cuando sea posible. La solución más simple a menudo es reducir el estado compartido.

### Cuál es la diferencia entre concurrencia y paralelismo?

La concurrencia es sobre estructurar un programa para manejar múltiples tareas (intercalación). El paralelismo es sobre ejecutar múltiples tareas simultáneamente (realmente al mismo tiempo). Async I/O es concurrente; multithreading en múltiples cores es paralelo.
