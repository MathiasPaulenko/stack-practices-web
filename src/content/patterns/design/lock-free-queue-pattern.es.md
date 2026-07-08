---
contentType: patterns
slug: lock-free-queue-pattern
title: "Patrón Lock-Free Queue"
description: "Construir colas de alto throughput usando operaciones atomicas en lugar de locks. Multiples threads pueden encolar y desencolar concurrentemente sin bloqueo ni overhead de context-switch."
metaDescription: "Construir colas de alto throughput con operaciones atomicas en lugar de locks. Threads encolan y desencolan sin bloqueo ni overhead de context-switch."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - lock-free
  - patron
  - patron-diseno
  - concurrency
  - atomic-operations
  - cas
  - ring-buffer
relatedResources:
  - /patterns/design/producer-consumer-pattern
  - /patterns/design/thread-pool-pattern
  - /patterns/design/reactive-streams-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construir colas de alto throughput con operaciones atomicas en lugar de locks. Threads encolan y desencolan sin bloqueo ni overhead de context-switch."
  keywords:
    - patron lock free queue
    - operaciones atomicas concurrencia
    - cas compare and swap cola
    - patron diseno
---

## Descripción General

Las colas basadas en locks sufren dos problemas bajo alta contencion: bloqueo de threads (threads en espera consumen CPU y memoria) e inversion de prioridad (un thread de baja prioridad con un lock bloquea a uno de alta prioridad). Las colas lock-free usan operaciones atomicas compare-and-swap (CAS) para actualizar la cola sin locks. Multiples threads pueden encolar y desencolar simultaneamente. Si un CAS falla porque otro thread gano la carrera, el thread reintent. Ningun thread se bloquea esperando un lock.

## Cuándo Usar

- Multiples threads necesitan encolar y desencolar a alta frecuencia
- La contencion de locks esta causando degradacion de throughput o picos de latencia
- Necesitas latencia predecible sin bloqueo de threads o context-switching
- Estas construyendo un sistema de mensajeria o dispatch de eventos de alto rendimiento

## Solución

### Python (cola con operaciones atomicas via threading)

```python
import threading
import time
import random

class LockFreeRingBuffer:
    """Ring buffer lock-free single-producer, single-consumer.
    Usa incrementos de indice atomicos. Funciona porque solo un thread
    modifica cada indice."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0  # Indice de escritura (solo productor)
        self.tail = 0  # Indice de lectura (solo consumidor)
        self.count = 0

    def enqueue(self, item):
        while self.count >= self.capacity:
            pass  # Spin: buffer lleno
        self.buffer[self.head] = item
        self.head = (self.head + 1) % self.capacity
        self.count += 1

    def dequeue(self):
        while self.count == 0:
            pass  # Spin: buffer vacio
        item = self.buffer[self.tail]
        self.tail = (self.tail + 1) % self.capacity
        self.count -= 1
        return item

buffer = LockFreeRingBuffer(100)

def producer(count):
    for i in range(count):
        buffer.enqueue(f"item-{i}")
        time.sleep(random.uniform(0, 0.001))

def consumer(count):
    processed = 0
    for _ in range(count):
        item = buffer.dequeue()
        processed += 1
        if processed % 1000 == 0:
            print(f"Processed {processed} items, last: {item}")

p = threading.Thread(target=producer, args=(10000,))
c = threading.Thread(target=consumer, args=(10000,))
p.start()
c.start()
p.join()
c.join()
print("All done")
```

### JavaScript (Atomics + SharedArrayBuffer)

```javascript
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";

// Ring buffer SPSC lock-free usando Atomics
class LockFreeRingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new SharedArrayBuffer(capacity * 4 + 8);
    this.data = new Int32Array(this.buffer, 0, capacity);
    this.indices = new Int32Array(this.buffer, capacity * 4, 2);
    // indices[0] = head (escritura), indices[1] = tail (lectura)
  }

  enqueue(value) {
    let head = Atomics.load(this.indices, 0);
    let tail = Atomics.load(this.indices, 1);
    while (head - tail >= this.capacity) {
      tail = Atomics.load(this.indices, 1); // Spin: buffer lleno
    }
    Atomics.store(this.data, head % this.capacity, value);
    Atomics.store(this.indices, 0, head + 1);
    return true;
  }

  dequeue() {
    let tail = Atomics.load(this.indices, 1);
    let head = Atomics.load(this.indices, 0);
    while (tail >= head) {
      head = Atomics.load(this.indices, 0); // Spin: buffer vacio
    }
    const value = Atomics.load(this.data, tail % this.capacity);
    Atomics.store(this.indices, 1, tail + 1);
    return value;
  }
}

if (isMainThread) {
  const queue = new LockFreeRingBuffer(1000);
  const producer = new Worker(new URL(import.meta.url), {
    workerData: { role: "producer", buffer: queue.buffer, capacity: queue.capacity },
  });
  const consumer = new Worker(new URL(import.meta.url), {
    workerData: { role: "consumer", buffer: queue.buffer, capacity: queue.capacity },
  });

  producer.on("message", (msg) => console.log(`Producer: ${msg}`));
  consumer.on("message", (msg) => console.log(`Consumer: ${msg}`));
} else {
  const { role, buffer, capacity } = workerData;
  const data = new Int32Array(buffer, 0, capacity);
  const indices = new Int32Array(buffer, capacity * 4, 2);

  if (role === "producer") {
    for (let i = 0; i < 10000; i++) {
      let head = Atomics.load(indices, 0);
      let tail = Atomics.load(indices, 1);
      while (head - tail >= capacity) {
        tail = Atomics.load(indices, 1);
      }
      Atomics.store(data, head % capacity, i);
      Atomics.store(indices, 0, head + 1);
    }
    parentPort.postMessage("Done producing 10000 items");
  } else {
    let processed = 0;
    for (let i = 0; i < 10000; i++) {
      let tail = Atomics.load(indices, 1);
      let head = Atomics.load(indices, 0);
      while (tail >= head) {
        head = Atomics.load(indices, 0);
      }
      const value = Atomics.load(data, tail % capacity);
      Atomics.store(indices, 1, tail + 1);
      processed++;
    }
    parentPort.postMessage(`Done consuming ${processed} items`);
  }
}
```

### Java (java.util.concurrent.ConcurrentLinkedQueue)

```java
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LockFreeQueueExample {

    public static void main(String[] args) throws InterruptedException {
        // ConcurrentLinkedQueue es una cola lock-free sin limite (algoritmo Michael & Scott)
        ConcurrentLinkedQueue<Integer> queue = new ConcurrentLinkedQueue<>();
        AtomicInteger produced = new AtomicInteger(0);
        AtomicInteger consumed = new AtomicInteger(0);

        Runnable producer = () -> {
            for (int i = 0; i < 10000; i++) {
                queue.offer(i);
                produced.incrementAndGet();
            }
        };

        Runnable consumer = () -> {
            while (consumed.get() < 20000) {
                Integer item = queue.poll();
                if (item != null) {
                    consumed.incrementAndGet();
                }
            }
        };

        ExecutorService pool = Executors.newFixedThreadPool(4);
        pool.submit(producer);
        pool.submit(producer); // 2 productores, 20k total
        pool.submit(consumer);
        pool.submit(consumer); // 2 consumidores

        pool.shutdown();
        pool.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS);
        System.out.println("Produced: " + produced.get() + ", Consumed: " + consumed.get());
    }
}
```

## Explicación

Una cola lock-free usa operaciones atomicas (compare-and-swap, fetch-and-add) para actualizar los punteros head y tail de la cola. Cuando un thread quiere encolar, lee el tail actual, prepara el nuevo nodo, e intenta hacer CAS del tail al nuevo nodo. Si el CAS tiene exito, el encolado esta hecho. Si otro thread gano la carrera, el CAS falla y el thread reintenta con el tail actualizado.

El insight clave: **ningun thread espera un lock**. Si un CAS falla, el thread reintenta inmediatamente. Baja contencion: CAS casi siempre tiene exito al primer intento. Alta contencion: threads pueden reintentar varias veces, pero nunca se bloquean ni hacen context-switch.

Los algoritmos de cola lock-free mas comunes son:

- **Michael & Scott**: Cola de lista enlazada sin limite. Usada por `ConcurrentLinkedQueue` de Java.
- **SPSC Ring Buffer**: Buffer circular single-producer, single-consumer. Sin CAS: el productor escribe head, el consumidor escribe tail, sin contencion.
- **MPMC Ring Buffer**: Buffer circular multi-productor, multi-consumidor. Usa CAS en head y tail.

## Variantes

| Variante | Productores/Consumidores | Implementacion | Caso de Uso | Compromiso |
|----------|--------------------------|-----------------|-------------|------------|
| **SPSC Ring Buffer** | 1 / 1 | Sin atomics | Latencia minima | Solo un productor y consumidor |
| **MPMC Ring Buffer** | N / N | CAS en head y tail | Proposito general | Contencion de CAS bajo carga alta |
| **Michael & Scott** | N / N | CAS en lista enlazada | Tamano sin limite | Allocation de memoria por nodo |
| **Disruptor** | N / N | Sequences + barriers | Ultra-baja latencia | Complejo, tamano fijo |
| **SkipList Queue** | N / N | CAS en skip list | Cola de prioridad | Mayor overhead |

## Qué Funciona

- Usa SPSC ring buffers para single-producer, single-consumer: sin atomics, latencia minima
- Pre-aloca memoria del ring buffer para evitar GC pressure y latencia de allocation
- Usa `ConcurrentLinkedQueue` para colas lock-free sin limite en Java en lugar de construir la tuya
- Mide contencion: si los retries de CAS son altos, considera sharding de cola (una cola por thread)
- Usa `Memory.orderRelease` / `Memory.orderAcquire` (o equivalente) para asegurar visibilidad sin full fences
- Dimensiona el ring buffer para absorber picos: demasiado pequeño causa spinning (CPU desperdiciado)
- Considera el patron Disruptor para escenarios de ultra-baja latencia (trading financiero, gaming)

## Errores Comunes

- **Usar lock-free cuando no se necesita**: Las colas basadas en locks son mas simples y suficientemente rapidas para la mayoria de casos. Lock-free anade complejidad por ganancias marginales a contencion moderada.
- **Problema ABA**: Un thread lee valor A, otro thread lo cambia a B y de vuelta a A. El CAS del primer thread tiene exito pero la cola se corrompe. Usa punteros versionados (tagged pointers) para detectar el cambio.
- **Bugs de memory ordering**: Usar `store`/`load` sin memory ordering adecuado causa problemas de visibilidad en modelos de memoria debiles (ARM, POWER). Usa semantica acquire/release.
- **Spinning sin limite**: Si la cola esta consistentemente llena o vacia, los threads hacen spin para siempre desperdiciando CPU. Anade backoff o yield.
- **No manejar ABA en colas de lista enlazada**: El algoritmo Michael & Scott usa CAS versionado para prevenir ABA. Una cola naive sin versionado se corrompe bajo ABA.
- **Asumir que lock-free significa wait-free**: Lock-free garantiza progreso a nivel sistema (algun thread progresa), pero threads individuales pueden starve. Wait-free garantiza progreso por thread pero es mas dificil de implementar.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre lock-free y wait-free?

Lock-free garantiza que al menos un thread progresa. Threads individuales pueden reintentar indefinidamente bajo contencion. Wait-free garantiza que cada thread completa en un numero limitado de pasos. Wait-free es mas fuerte pero mas dificil de implementar y a menudo mas lento debido a mas operaciones CAS.

### ¿Qué es el problema ABA?

Un thread lee valor A de una variable compartida. Otro thread lo cambia a B, luego de vuelta a A. El CAS del primer thread tiene exito (el valor sigue siendo A), pero el estado de la cola cambio en medio. Esto puede corromper la cola. Soluciones: punteros versionados (anadir un contador al puntero), hazard pointers, o reclamacion basada en epochs.

### ¿Cuándo debería usar una cola lock-free en lugar de una basada en locks?

Usa lock-free cuando la contencion es lo suficientemente alta para que el overhead de locks (bloqueo, context-switching) domine el throughput. Para baja contencion, las colas basadas en locks son mas simples e igual de rapidas. Haz benchmark de ambas antes de elegir.

### ¿ConcurrentLinkedQueue de Java es realmente lock-free?

Si. Usa el algoritmo Michael & Scott con operaciones CAS en punteros de nodo. No se usan locks. Sin embargo, es sin limite: la memoria crece con el tamano de la cola. Para escenarios limitados, usa `ArrayBlockingQueue` (basada en locks) o un ring buffer lock-free.

### ¿Qué es el patrón Disruptor?

El Disruptor es un patrón de mensajería inter-thread de alto rendimiento que usa un ring buffer pre-asignado con números de secuencia. Los productores reclaman sequence numbers, escriben datos, y publican. Los consumidores esperan sequence numbers y leen datos. Logra latencia sub-microsegundo evitando locks, false sharing, y allocation de memoria. Usado en sistemas de trading financiero.

## Soluciones Avanzadas

### Ring buffer MPMC lock-free con tipos atomicos de Rust

Un buffer circular multi-productor, multi-consumidor usando operaciones atomicas de Rust:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

struct LockFreeRingBuffer<T> {
    buffer: Vec<Option<T>>,
    capacity: usize,
    head: AtomicUsize,  // Indice de escritura
    tail: AtomicUsize,  // Indice de lectura
}

impl<T: Clone> LockFreeRingBuffer<T> {
    fn new(capacity: usize) -> Self {
        Self {
            buffer: vec![None; capacity],
            capacity,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
        }
    }

    fn enqueue(&self, item: T) -> bool {
        let mut head = self.head.load(Ordering::Acquire);
        loop {
            let tail = self.tail.load(Ordering::Acquire);
            if head - tail >= self.capacity {
                return false;  // Buffer lleno
            }
            // CAS para reclamar slot
            match self.head.compare_exchange_weak(
                head, head + 1, Ordering::AcqRel, Ordering::Acquire
            ) {
                Ok(_) => {
                    self.buffer[head % self.capacity] = Some(item);
                    return true;
                }
                Err(new_head) => head = new_head,
            }
        }
    }

    fn dequeue(&self) -> Option<T> {
        let mut tail = self.tail.load(Ordering::Acquire);
        loop {
            let head = self.head.load(Ordering::Acquire);
            if tail >= head {
                return None;  // Buffer vacio
            }
            // CAS para reclamar slot
            match self.tail.compare_exchange_weak(
                tail, tail + 1, Ordering::AcqRel, Ordering::Acquire
            ) {
                Ok(_) => {
                    let item = self.buffer[tail % self.capacity].take();
                    return item;
                }
                Err(new_tail) => tail = new_tail,
            }
        }
    }
}
```

### Cola lock-free con backoff para reducir spinning de CPU

Añade backoff exponencial cuando CAS falla para reducir desperdicio de CPU bajo alta contención:

```python
import time
import random

class LockFreeQueueWithBackoff:
    def __init__(self, capacity):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0
        self.tail = 0
        self.count = 0

    def enqueue_with_backoff(self, item):
        backoff = 1
        while self.count >= self.capacity:
            time.sleep(backoff / 1000.0)  # Backoff exponencial
            backoff = min(backoff * 2, 100)  # Cap a 100ms
        self.buffer[self.head] = item
        self.head = (self.head + 1) % self.capacity
        self.count += 1

    def dequeue_with_backoff(self):
        backoff = 1
        while self.count == 0:
            time.sleep(backoff / 1000.0)
            backoff = min(backoff * 2, 100)
        item = self.buffer[self.tail]
        self.tail = (self.tail + 1) % self.capacity
        self.count -= 1
        return item
```

### Cola lock-free con batching para throughput

Agrupa múltiples items en una sola operación CAS para reducir contención:

```python
class BatchLockFreeQueue:
    def __init__(self, capacity, batch_size=8):
        self.capacity = capacity
        self.batch_size = batch_size
        self.buffer = [None] * capacity
        self.head = 0
        self.tail = 0
        self.pending_batch = []
        self.lock = threading.Lock()  # Solo para pending batch

    def enqueue(self, item):
        with self.lock:
            self.pending_batch.append(item)
            if len(self.pending_batch) >= self.batch_size:
                self._flush_batch()

    def _flush_batch(self):
        if not self.pending_batch:
            return
        # Reclama slots para todo el batch con CAS unico
        start_idx = self.head
        end_idx = (start_idx + len(self.pending_batch)) % self.capacity
        for i, item in enumerate(self.pending_batch):
            self.buffer[(start_idx + i) % self.capacity] = item
        self.head = end_idx
        self.pending_batch.clear()
```

## Mejores Practicas Adicionales

1. **Alinea estructuras de datos para evitar false sharing.** La alineación de cache line previene que diferentes threads compitan por la misma cache line. Añade padding entre variables atomicas frecuentemente accedidas:

```cpp
struct alignas(64) PaddedAtomic {
    std::atomic<size_t> value;
    char padding[64 - sizeof(std::atomic<size_t>)];
};
```

2. **Usa barreras de memoria correctamente.** En modelos de memoria debiles (ARM, POWER), loads y stores simples pueden no ser visibles entre threads. Usa semántica acquire/release para patrones productor-consumidor:

```c
// Productor: release store
std::atomic_store_explicit(&buffer[idx], value, std::memory_order_release);

// Consumidor: acquire load
std::atomic_load_explicit(&buffer[idx], std::memory_order_acquire);
```

## Errores Comunes Adicionales

1. **Ignorar efectos de cache line.** False sharing ocurre cuando dos threads escriben a diferentes variables que comparten una cache line. Esto causa invalidación de cache y thrashing. Alinea tus estructuras de datos con cache lines (típicamente 64 bytes) para prevenir esto.

2. **No manejar overflow de cola gracefulmente.** Los ring buffers lock-free son limitados. Cuando están llenos, la operación de enqueue debe bloquear, drop el item, o retornar failure. Spinning para siempre desperdicia CPU. Implementa backoff o provee una cola de overflow fallback.

## FAQs Adicionales

### ¿Cómo mido si lock-free vale la pena?

Haz benchmark de implementaciones basadas en locks y lock-free bajo niveles de contención realistas. Mide throughput (operaciones por segundo), latencia (p50, p99, p999), y utilización de CPU. Lock-free típicamente gana a alta contención pero puede ser más lento a baja contención debido al overhead de CAS.

### ¿Las colas lock-free pueden causar starvation?

Sí. Lock-free garantiza progreso a nivel sistema (algun thread siempre avanza), pero threads individuales pueden starve si consistentemente pierden carreras CAS. Algoritmos wait-free garantizan pasos limitados por thread pero son más complejos y a menudo más lentos. Para la mayoría de aplicaciones, lock-free es suficiente.

### ¿Cómo manejo inversión de prioridad con colas lock-free?

Las colas lock-free evitan inversión de prioridad eliminando locks completamente. Como ningún thread mantiene un lock, un thread de baja prioridad no puede bloquear a uno de alta prioridad. Esta es una ventaja clave de lock-free sobre colas basadas en locks en sistemas de tiempo real.
