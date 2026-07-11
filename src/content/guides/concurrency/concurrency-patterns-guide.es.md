---
contentType: guides
slug: concurrency-patterns-guide
title: "Guía de Patrones de Concurrencia"
description: "Guía de patrones de concurrencia comunes y lo que funciona para escribir código concurrente seguro y eficiente."
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
  - /recipes/caching
  - /recipes/singleton-pattern-recipe
  - /guides/software-architecture-guide
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

## Lo que funciona

- **Share nothing**: Prefiere paso de mensajes sobre estado compartido
- **Usa colecciones thread-safe**: `ConcurrentHashMap`, `Queue`, `AtomicInteger`
- **Mantén secciones críticas pequeñas**: Bloquea por el mínimo tiempo
- **Nunca llames APIs externas mientras mantienes un lock** — consulta [reintentos con backoff](/recipes/architecture/retry-backoff) para llamadas externas resilientes

## Preguntas Frecuentes

### Cuándo debería usar async/await vs threads?

Usa async/await para tareas I/O-bound ([HTTP calls](/guides/api/rest-api-design-guide), [sistema de archivos](/recipes/file-handling/read-write-file), bases de datos). Usa threads o procesos para trabajo CPU-bound (cálculos, procesamiento de datos) que necesita ejecución paralela.

### Cómo evito deadlocks?

Siempre adquiere locks en el mismo orden en tu codebase. Usa timeouts en adquisición de locks. Prefiere estructuras de datos lock-free cuando sea posible. La solución más simple a menudo es reducir el estado compartido.

### Cuál es la diferencia entre concurrencia y paralelismo?

La concurrencia es sobre estructurar un programa para manejar múltiples tareas (intercalación). El paralelismo es sobre ejecutar múltiples tareas simultáneamente (realmente al mismo tiempo). Async I/O es concurrente; multithreading en múltiples cores es paralelo.


## Temas Avanzados

### Escenario Detallado: Procesamiento Paralelo de Pedidos

```text
Sistema: Procesamiento de pedidos e-commerce (Python + asyncio)
Volumen: 10,000 pedidos/hora durante picos
Requisito: Cada pedido requiere 3 llamadas API externas (inventario, pago, envio)

Problema: Procesamiento secuencial tarda 3s por pedido (3 x 1s)
Objetivo: Reducir a 1s por pedido con concurrencia

Solucion: asyncio.gather para paralelizar las 3 llamadas

  async def process_order(order: Order) -> OrderResult:
      # Ejecutar las 3 llamadas en paralelo
      inventory, payment, shipping = await asyncio.gather(
          check_inventory(order.items),
          process_payment(order.total, order.customer_id),
          arrange_shipping(order.address),
          return_exceptions=True
      )

      # Manejar fallos parciales
      if isinstance(inventory, Exception):
          return OrderResult(failed=True, reason="inventory_error")
      if isinstance(payment, Exception):
          return OrderResult(failed=True, reason="payment_error")
      if isinstance(shipping, Exception):
          return OrderResult(failed=True, reason="shipping_error")

      return OrderResult(success=True, order_id=order.id)

Rate limiting con semaforo: max 50 pedidos concurrentes
  semaphore = asyncio.Semaphore(50)

  async def process_batch(orders: List[Order]):
      async def limited_process(order):
          async with semaphore:
              return await process_order(order)
      return await asyncio.gather(*[limited_process(o) for o in orders])

Resultados:
  | Metrica | Secuencial | Concurrente |
  |---------|-----------|-------------|
  | Tiempo por pedido | 3.0s | 1.1s |
  | Throughput | 1,200/h | 10,000/h |
  | CPU usage | 15% | 35% |
  | Memoria | 50MB | 120MB |
  | Errores por timeout | 2% | 0.3% |

Lessons learned:
  - asyncio.gather reduce latencia de I/O paralelo
  - return_exceptions=True evita que un fallo cancele todo el batch
  - El semaforo previene saturar las APIs externas
  - Monitorear memoria: cada tarea concurrente consume RAM
```

### Patron Actor Model (Erlang/Elixir)

El modelo de actores trata la concurrencia como entidades aisladas que se comunican por mensajes. Cada actor tiene su propio estado, no lo comparte. Erlang y Elixir usan este modelo en la VM BEAM.

```elixir
# Actor de contador en Elixir
defmodule Counter do
  use GenServer

  def start_link(initial_value \ 0) do
    GenServer.start_link(__MODULE__, initial_value)
  end

  def increment(pid) do
    GenServer.call(pid, :increment)
  end

  def get_value(pid) do
    GenServer.call(pid, :get_value)
  end

  # Callbacks del GenServer
  def init(initial_value) do
    {:ok, initial_value}
  end

  def handle_call(:increment, _from, state) do
    new_state = state + 1
    {:reply, new_state, new_state}
  end

  def handle_call(:get_value, _from, state) do
    {:reply, state, state}
  end
end

# Uso: cada actor es independiente, no hay estado compartido
{:ok, counter1} = Counter.start_link(0)
{:ok, counter2} = Counter.start_link(100)
Counter.increment(counter1)  # => 1
Counter.increment(counter1)  # => 2
Counter.get_value(counter2)  # => 100 (no afectado)
```

### Patron Circuit Breaker para concurrencia

Cuando un recurso concurrente falla repetidamente, el circuit breaker detiene las llamadas temporalmente para evitar cascadas de fallos.

```python
import asyncio
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.last_failure_time = None
        self._lock = asyncio.Lock()

    async def call(self, func, *args, **kwargs):
        async with self._lock:
            if self.state == CircuitState.OPEN:
                if asyncio.get_event_loop().time() - self.last_failure_time > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                else:
                    raise Exception("Circuit breaker is OPEN")
        try:
            result = await func(*args, **kwargs)
            async with self._lock:
                self.failure_count = 0
                self.state = CircuitState.CLOSED
            return result
        except Exception as e:
            async with self._lock:
                self.failure_count += 1
                self.last_failure_time = asyncio.get_event_loop().time()
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
            raise
```

### Como testeo codigo concurrente?

Usa herramientas como ThreadSanitizer (C++/Go), Helgrind (Valgrind) o pytest-asyncio para detectar race conditions. Escribe tests que ejecuten operaciones concurrentes bajo carga. Para deadlocks, usa timeouts en tests. Para determinismo, usa modelos de ejecucion controlada como loctest o property-based testing con hipotesis.
