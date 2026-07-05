---
contentType: patterns
slug: producer-consumer-pattern
title: "Patrón Producer-Consumer"
description: "Desacoplar produccion y consumo con una cola compartida. Los productores generan items a su propio ritmo; los consumidores los procesan independientemente a traves de un buffer."
metaDescription: "Desacoplar produccion y consumo con una cola compartida. Productores generan items a su ritmo; consumidores los procesan independientemente via un buffer."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - producer-consumer
  - patron
  - patron-diseno
  - concurrency
  - queue
  - decoupling
  - buffering
relatedResources:
  - /patterns/design/thread-pool-pattern
  - /patterns/design/message-queue-load-leveling-pattern
  - /patterns/design/actor-model-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Desacoplar produccion y consumo con una cola compartida. Productores generan items a su ritmo; consumidores los procesan independientemente via un buffer."
  keywords:
    - patron producer consumer
    - desacoplar produccion consumo
    - buffer limitado concurrencia
    - patron diseno
---

## Descripción General

Cuando una parte de un sistema produce datos y otra los consume, suelen ejecutar a diferentes velocidades. Un productor puede generar 1000 items por segundo mientras un consumidor procesa 100. Sin un buffer entre ellos, el productor debe esperar al consumidor (lento) o descartar items (con perdidas). El patron Producer-Consumer coloca una cola entre ellos. Los productores empujan items a la cola; los consumidores los extraen. Ambos ejecutan a su propio ritmo.

## Cuándo Usar

- Un productor y consumidor ejecutan a diferentes velocidades y necesitas suavizar el desajuste
- Quieres desacoplar al productor del consumidor (no necesitan conocerse)
- Necesitas procesar items concurrentemente con multiples productores o consumidores
- Quieres bufferizar items temporalmente durante picos

## Solución

### Python (queue.Queue con threads)

```python
import threading
import queue
import time
import random

buffer = queue.Queue(maxsize=10)  # Buffer limitado

def producer(name, count):
    for i in range(count):
        item = f"{name}-item-{i}"
        buffer.put(item)  # Bloquea si el buffer esta lleno
        print(f"[{name}] Produced {item}")
        time.sleep(random.uniform(0.01, 0.05))
    buffer.put(None)  # Sentinel: senal de finalizacion

def consumer(name):
    while True:
        item = buffer.get()  # Bloquea si el buffer esta vacio
        if item is None:
            buffer.put(None)  # Pasar sentinel a otros consumidores
            break
        print(f"[{name}] Consumed {item}")
        time.sleep(random.uniform(0.05, 0.15))  # Consumidor mas lento
        buffer.task_done()

# 2 productores, 3 consumidores
producers = [
    threading.Thread(target=producer, args=("P1", 20)),
    threading.Thread(target=producer, args=("P2", 20)),
]
consumers = [
    threading.Thread(target=consumer, args=("C1",)),
    threading.Thread(target=consumer, args=("C2",)),
    threading.Thread(target=consumer, args=("C3",)),
]

for p in producers: p.start()
for c in consumers: c.start()
for p in producers: p.join()
for c in consumers: c.join()
print("All done")
```

### JavaScript (cola async con workers)

```javascript
import { EventEmitter } from "events";

class AsyncQueue {
  constructor(maxsize = Infinity) {
    this.items = [];
    this.maxsize = maxsize;
    this.notFull = new EventEmitter();
    this.notEmpty = new EventEmitter();
    this.closed = false;
  }

  async put(item) {
    while (this.items.length >= this.maxsize) {
      await new Promise((resolve) => this.notFull.once("drain", resolve));
    }
    this.items.push(item);
    this.notEmpty.emit("data");
  }

  async get() {
    while (this.items.length === 0) {
      if (this.closed) return null;
      await new Promise((resolve) => this.notEmpty.once("data", resolve));
    }
    const item = this.items.shift();
    this.notFull.emit("drain");
    return item;
  }

  close() {
    this.closed = true;
    this.notEmpty.emit("data");
  }
}

async function producer(queue, name, count) {
  for (let i = 0; i < count; i++) {
    const item = `${name}-item-${i}`;
    await queue.put(item);
    console.log(`[${name}] Produced ${item}`);
    await new Promise((r) => setTimeout(r, Math.random() * 40));
  }
}

async function consumer(queue, name) {
  while (true) {
    const item = await queue.get();
    if (item === null) break;
    console.log(`[${name}] Consumed ${item}`);
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }
}

async function main() {
  const queue = new AsyncQueue(10);

  const producers = [
    producer(queue, "P1", 20),
    producer(queue, "P2", 20),
  ];
  const consumers = [
    consumer(queue, "C1"),
    consumer(queue, "C2"),
    consumer(queue, "C3"),
  ];

  await Promise.all(producers);
  queue.close();
  await Promise.all(consumers);
  console.log("All done");
}

main();
```

### Java (BlockingQueue)

```java
import java.util.concurrent.*;

public class ProducerConsumerExample {

    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<String> buffer = new ArrayBlockingQueue<>(10);

        // Productor
        Runnable producer = () -> {
            for (int i = 0; i < 20; i++) {
                try {
                    String item = "item-" + i;
                    buffer.put(item); // Bloquea si el buffer esta lleno
                    System.out.println("[Producer] Produced " + item);
                    Thread.sleep((long) (Math.random() * 40));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            try {
                buffer.put("POISON"); // Sentinel
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };

        // Consumidor
        Runnable consumer = () -> {
            while (true) {
                try {
                    String item = buffer.take(); // Bloquea si el buffer esta vacio
                    if ("POISON".equals(item)) {
                        buffer.put("POISON"); // Pasar a otros consumidores
                        break;
                    }
                    System.out.println("[Consumer] Consumed " + item);
                    Thread.sleep(50 + (long) (Math.random() * 100));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        };

        ExecutorService pool = Executors.newFixedThreadPool(4);
        pool.submit(producer);
        pool.submit(producer);
        pool.submit(consumer);
        pool.submit(consumer);
        pool.submit(consumer);

        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("All done");
    }
}
```

## Explicación

La cola actua como buffer entre productores y consumidores. Los productores anaden items a la cola sin esperar a los consumidores. Los consumidores extraen items a su propio ritmo. Si la cola es limitada y esta llena, los productores se bloquean hasta que haya espacio. Si la cola esta vacia, los consumidores se bloquean hasta que lleguen items.

Un **buffer limitado** proporciona backpressure: cuando el buffer esta lleno, los productores se ralentizan. Esto previene que los productores saturen a los consumidores y agoten memoria. Un **buffer sin limite** no tiene backpressure: los productores nunca se bloquean, pero la memoria puede crecer sin limite si los productores son consistentemente mas rapidos.

Multiples productores y consumidores pueden compartir la misma cola. La cola es thread-safe (usando locks o algoritmos lock-free internamente). Cada consumidor obtiene un item distinto; ningun item se procesa dos veces.

## Variantes

| Variante | Tipo de Buffer | Caso de Uso | Compromiso |
|----------|----------------|-------------|------------|
| **Buffer Limitado** | Cola de tamano fijo | Backpressure, seguro para memoria | Productores se bloquean al llenarse |
| **Buffer Sin Limite** | Cola creciente | Maximo throughput | La memoria puede crecer sin limite |
| **Cola de Prioridad** | Basada en prioridad | Algunos items son urgentes | Starvation de items de baja prioridad |
| **Ring Buffer** | Array circular | Baja latencia, memoria fija | Sobrescribe datos antiguos si no se tiene cuidado |
| **Work Stealing** | Colas por consumidor | Balanceo de carga | Mas complejo, overhead de robo |

## Qué Funciona

- Usa un buffer limitado cuando la memoria esta restringida o los productores son consistentemente mas rapidos
- Usa sentinels (poison pills) para senalar a los consumidores que se detengan graceful
- Haz consumidores idempotentes en caso de reentrega tras fallos
- Monitorea la profundidad de cola: una cola creciente significa consumidores lentos
- Dimensiona el buffer para absorber picos esperados sin bloquear productores
- Usa multiples consumidores para escalar throughput de procesamiento
- Nombra los threads de productores y consumidores para debugging y analisis de thread dumps

## Errores Comunes

- **Buffer sin limite con productor rapido**: La memoria crece hasta OOM. Siempre considera un limite.
- **Cuello de botella de consumidor unico**: Un consumidor no da abasto con multiples productores. Escala consumidores.
- **No manejar fallos del consumidor**: Si un consumidor crashea despues de tomar un item, el item se pierde. Usa acks o transacciones.
- **Busy-waiting en lugar de bloqueo**: Polling de la cola en un loop desperdicia CPU. Usa operaciones bloqueantes (`put`, `take`, `get`, `await`).
- **Olvidar detener consumidores**: Sin sentinel o senal de close, los consumidores esperan para siempre el siguiente item.
- **Bloquear la cola externamente**: La cola ya es thread-safe. Locks externos causan deadlocks.

## Preguntas Frecuentes

### ¿En qué se diferencia de una message queue como RabbitMQ?

El patron Producer-Consumer es un patron in-process que usa una cola compartida en memoria. RabbitMQ es un broker que distribuye mensajes entre procesos y maquinas. Usa Producer-Consumer para concurrencia single-process; usa un message broker para sistemas distribuidos.

### ¿Debería usar buffer limitado o sin limite?

Empieza con limitado. Un buffer limitado protege contra agotamiento de memoria y proporciona backpressure natural. Usa sin limite solo cuando estas seguro de que los productores no superaran consistentemente a los consumidores, o cuando el buffering es mas importante que la seguridad de memoria.

### ¿Cuántos consumidores debería usar?

Para trabajo CPU-bound: un consumidor por core de CPU. Para trabajo I/O-bound: mas consumidores que cores ya que pasan tiempo esperando. Monitorea la profundidad de cola para determinar si necesitas mas o menos consumidores.

### ¿Qué es un poison pill?

Un valor sentinel (como `None`, `null`, o un objeto especial) colocado en la cola para senalar a los consumidores que se detengan. Cuando un consumidor ve el poison pill, sabe que no llegaran mas items y termina. Si multiples consumidores comparten la cola, el pill debe re-encolarse para el siguiente consumidor.

### ¿Los productores y consumidores pueden estar en diferentes máquinas?

No con el patron basico. La cola compartida es memoria in-process. Para producer-consumer entre maquinas, usa un message broker (RabbitMQ, Kafka, SQS) que proporciona la cola como un servicio accesible por red.
