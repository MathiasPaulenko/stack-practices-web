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

El Disruptor es un patron de mensajeria inter-thread de alto rendimiento que usa un ring buffer pre-asignado con numeros de secuencia. Los productores reclaman sequence numbers, escriben datos, y publican. Los consumidores esperan sequence numbers y leen datos. Logra latencia sub-microsegundo evitando locks, false sharing, y allocation de memoria. Usado en sistemas de trading financiero.
