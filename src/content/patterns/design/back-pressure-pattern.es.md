---




contentType: patterns
slug: back-pressure-pattern
title: "Patrón Back-Pressure"
description: "Previene que sistemas upstream abrumen a consumidores downstream propagando señales de control de flujo hacia atrás a través del pipeline, asegurando throughput estable bajo carga."
metaDescription: "Aprende el Patrón Back-Pressure para control de flujo en streaming. Ejemplos en Python, Java y JavaScript con reactive streams y colas acotadas."
difficulty: intermediate
topics:
  - design
  - architecture
  - performance
tags:
  - back-pressure
  - pattern
  - design-pattern
  - streaming
  - reactive
  - flow-control
  - resilience
relatedResources:
  - /patterns/throttling-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/queue-based-load-leveling-pattern
  - /patterns/flyweight-pattern-text
  - /patterns/pipes-and-filters-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Back-Pressure para control de flujo en streaming. Ejemplos en Python, Java y JavaScript con reactive streams y colas acotadas."
  keywords:
    - back pressure
    - design pattern
    - streaming
    - reactive
    - flow control
    - resilience




---

# Patrón Back-Pressure

## Descripción General

El Patrón Back-Pressure previene que un productor upstream abrume a un consumidor downstream propagando señales de control de flujo hacia atrás a través de un pipeline de datos. Cuando el consumidor no puede seguir el ritmo, señaliza al productor para que disminuya la velocidad o pause, previniendo crecimiento de memoria sin límites, timeouts y fallas en cascada.

Sin back-pressure, productores rápidos y consumidores lentos llevan a:
- **Errores de out-of-memory** por buffers sin límites
- **Picos de latencia** a medida que las colas crecen
- **Mensajes descartados** cuando los buffers se desbordan
- **Fallos en cascada** a medida que servicios downstream colapsan bajo carga

El back-pressure es fundamental en sistemas reactivos, procesamiento de streams (Kafka, Flink), y frameworks de I/O async (Node.js streams, ReactiveX).

## Cuándo Usar


- For alternatives, see [Content Delivery Network (CDN) Pattern](/es/patterns/content-delivery-network-pattern/).

Usa el Patrón Back-Pressure cuando:
- Productores y consumidores operan a diferentes velocidades de forma sostenida
- Necesitas uso de memoria acotado en pipelines de streaming o async
- Los servicios downstream tienen límites de capacidad hard (tasas de escritura a BD, cuotas de API)
- El sistema debe mantenerse estable bajo picos de carga impredecibles

## Cuándo Evitar
- Todas las etapas procesan datos a ritmos similares (el pipelining síncrono basta)
- La latencia es más importante que el throughput (el back-pressure agrega delay)
- Un simple buffer de tamaño fijo con política de descarte es aceptable
- El consumidor es infinitamente escalable (serverless auto-scaling) y el buffering es más barato

## Solución

### Python

```python
import queue
import threading
import time
from typing import Callable, Optional

class BackPressuredQueue:
    """Cola acotada con put bloqueante que ejerce back-pressure sobre productores"""
    def __init__(self, max_size: int = 10):
        self._queue = queue.Queue(maxsize=max_size)
        self._shutdown = False

    def produce(self, item) -> bool:
        """Bloquea si la cola está llena, ejerciendo back-pressure sobre el caller"""
        if self._shutdown:
            return False
        try:
            self._queue.put(item, block=True, timeout=1.0)
            return True
        except queue.Full:
            return False

    def consume(self) -> Optional:
        """Retorna item o None si se apagó"""
        if self._shutdown and self._queue.empty():
            return None
        try:
            return self._queue.get(block=True, timeout=0.5)
        except queue.Empty:
            return None

    def mark_done(self):
        self._queue.task_done()

    def shutdown(self):
        self._shutdown = True


class DataPipeline:
    """Pipeline con back-pressure entre productor y consumidor"""
    def __init__(self, buffer_size: int = 5):
        self.buffer = BackPressuredQueue(max_size=buffer_size)
        self.producer_thread: Optional[threading.Thread] = None
        self.consumer_thread: Optional[threading.Thread] = None

    def start(self, producer_fn: Callable, consumer_fn: Callable):
        self.producer_thread = threading.Thread(
            target=self._run_producer, args=(producer_fn,)
        )
        self.consumer_thread = threading.Thread(
            target=self._run_consumer, args=(consumer_fn,)
        )
        self.producer_thread.start()
        self.consumer_thread.start()

    def _run_producer(self, producer_fn):
        for item in producer_fn():
            if not self.buffer.produce(item):
                print("Productor: back-pressure aplicado, descartando item")
        self.buffer.shutdown()

    def _run_consumer(self, consumer_fn):
        while True:
            item = self.buffer.consume()
            if item is None:
                break
            consumer_fn(item)
            self.buffer.mark_done()

    def join(self):
        self.producer_thread.join()
        self.consumer_thread.join()


# Uso
def fast_producer():
    for i in range(20):
        print(f"Produciendo {i}")
        yield f"data-{i}"
        time.sleep(0.1)  # Rápido: 10 items/seg

def slow_consumer(item):
    print(f"Consumiendo {item}")
    time.sleep(0.5)  # Lento: 2 items/seg

pipeline = DataPipeline(buffer_size=3)
pipeline.start(fast_producer, slow_consumer)
pipeline.join()
```

### Java

```java
import java.util.concurrent.*;
import java.util.function.*;

public class BackPressuredPipeline<T> {
    private final BlockingQueue<T> queue;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    public BackPressuredPipeline(int capacity) {
        this.queue = new ArrayBlockingQueue<>(capacity);
    }

    public void run(Supplier<T> producer, Consumer<T> consumer) {
        Future<?> producerTask = executor.submit(() -> {
            while (true) {
                T item = producer.get();
                if (item == null) break;
                try {
                    queue.put(item); // Bloquea cuando lleno — back-pressure
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });

        Future<?> consumerTask = executor.submit(() -> {
            while (true) {
                try {
                    T item = queue.poll(1, TimeUnit.SECONDS);
                    if (item == null && producerTask.isDone()) break;
                    if (item != null) consumer.accept(item);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });

        try {
            producerTask.get();
            consumerTask.get();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            executor.shutdown();
        }
    }
}
```

### JavaScript

```javascript
const { Transform } = require('stream');

// Transform stream con back-pressure en Node.js
const slowTransform = new Transform({
  highWaterMark: 3, // Buffer pequeño para ejercer back-pressure rápidamente
  transform(chunk, encoding, callback) {
    console.log(`Procesando: ${chunk.toString().trim()}`);
    setTimeout(() => {
      callback(null, chunk);
    }, 500);
  }
});

// Productor rápido (stdin o generator)
process.stdin.pipe(slowTransform).pipe(process.stdout);

// O con async generators y back-pressure manual
class BackPressuredChannel {
  constructor(capacity = 5) {
    this.buffer = [];
    this.capacity = capacity;
    this.waitingConsumers = [];
    this.waitingProducers = [];
    this.closed = false;
  }

  async send(value) {
    if (this.closed) throw new Error('Canal cerrado');
    while (this.buffer.length >= this.capacity) {
      await new Promise(resolve => this.waitingProducers.push(resolve));
    }
    this.buffer.push(value);
    const waiter = this.waitingConsumers.shift();
    if (waiter) waiter();
  }

  async receive() {
    while (this.buffer.length === 0 && !this.closed) {
      await new Promise(resolve => this.waitingConsumers.push(resolve));
    }
    if (this.buffer.length === 0) return undefined;
    const value = this.buffer.shift();
    const waiter = this.waitingProducers.shift();
    if (waiter) waiter();
    return value;
  }

  close() {
    this.closed = true;
    this.waitingConsumers.forEach(w => w());
  }
}
```

## Explicación

El back-pressure funciona haciendo que la **operación de envío del productor dependa de la capacidad del consumidor**:

1. **Buffer acotado**: La cola entre productor y consumidor tiene un tamaño máximo
2. **Send bloqueante**: Cuando el buffer está lleno, el productor bloquea o recibe una señal de "ralentizar"
3. **Flujo basado en créditos**: El consumidor otorga "créditos" (permiso para enviar N items más) al productor
4. **Pull reactivo**: El consumidor solicita items a su propio ritmo (ej. Reactive Streams `request(n)`)

En Reactive Streams (Java), esto se formaliza a través del mecanismo `Subscription.request(n)`. En Kafka, el `max.poll.records` del consumidor y los commits manuales de offset crean back-pressure implícito.

## Variantes

| Variante | Mecanismo | Mejor Para |
|----------|-----------|------------|
| **Blocking queue** | Thread bloquea cuando lleno | Pipelines basados en threads |
| **Reactive Streams** | `request(n)` basado en créditos | Pipelines async componibles |
| **TCP windowing** | Protocolo de ventana deslizante | Control de flujo de red |
| **Token bucket** | Productor necesita token para enviar | APIs con rate limit |
| **Pause/resume** | Consumidor envía señal de pausa | Sistemas de procesamiento batch |

## Lo que Funciona

- **Usa buffers acotados en todas partes.** Las colas sin límites son la causa raíz de la mayoría de las fallas de back-pressure.
- **Ajusta tamaños de buffer basado en latencia p99, no promedio.** Un buffer ajustado para carga promedio se desbordará durante picos.
- **Monitorea la profundidad del buffer.** Alerta cuando los buffers corren consistentemente por encima del 80% de capacidad.
- **Prefiere pull reactivo sobre push.** Deja que el consumidor maneje la tasa, no el productor.
- **Maneja back-pressure en cada capa.** BD → servicio → API gateway → cliente.

## Errores Comunes

- **Colas sin límites.** `LinkedBlockingQueue` sin capacidad consume silenciosamente toda la memoria disponible.
- **Ignorar back-pressure en código async.** `Promise.all()` con arrays sin límites crea el mismo problema.
- **Tragar excepciones de bloqueo.** Los timeouts en `put()` deberían propagarse o reintentar, no descartar silenciosamente.
- **Buffer de talla única.** Diferentes etapas de pipeline necesitan diferentes tamaños de buffer.
- **Asumir que los consumidores siempre son más lentos.** El back-pressure debería ser bidireccional si el pipeline tiene múltiples etapas.

## Ejemplos del Mundo Real

### Apache Kafka

Los consumidores de Kafka controlan el back-pressure a través de `max.poll.records` y commits manuales de offset. Un consumidor lento simplemente commitea menos offsets, y el broker no empuja más mensajes hasta que el consumidor está listo.

### gRPC Streaming

gRPC soporta control de flujo vía HTTP/2 windowing. Cuando el buffer del receptor está lleno, el tamaño de ventana HTTP/2 disminuye, señalizando al emisor que deje de enviar.

### Node.js Streams

`readable.pipe(writable)` de Node.js maneja automáticamente el back-pressure. Cuando el buffer del writable se llena, `pipe()` pausa el readable hasta que el writable se vacía.

### Akka Streams / Project Reactor

Las implementaciones de Reactive Streams usan señalización de demanda explícita. Un subscriber downstream llama `request(n)`, otorgando permiso al upstream para enviar `n` elementos más.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre back-pressure y throttling?**
A: El back-pressure es reactivo: el consumidor señaliza al productor que disminuya. El throttling es proactivo: el productor limita su propia tasa independientemente de la capacidad del consumidor.

**Q: Puede funcionar el back-pressure a través de boundaries de red?**
A: Sí, protocolos como TCP, HTTP/2 y gRPC implementan control de flujo via windowing y mecanismos basados en créditos que funcionan a través de redes.

**Q: Qué pasa si el productor no puede disminuir la velocidad?**
A: Entonces necesitas una estrategia de buffering, descarte, o load shedding. El back-pressure es una señal; si el productor la ignora, el sistema necesita una política fallback.

**Q: Cómo se relaciona el back-pressure con el Circuit Breaker?**
A: Resuelven problemas diferentes. El back-pressure maneja la tasa de flujo. El Circuit Breaker detiene todo el flujo cuando un servicio está fallando. Se complementan en pipelines resilientes.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
