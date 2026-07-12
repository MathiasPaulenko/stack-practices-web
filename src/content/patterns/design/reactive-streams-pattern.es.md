---




contentType: patterns
slug: reactive-streams-pattern
title: "Patrón Reactive Streams"
description: "Procesar streams de datos asincronos con backpressure. Los suscriptores piden N items a la vez, previniendo que productores rapidos saturen a consumidores lentos."
metaDescription: "Procesar streams async con backpressure. Suscriptores piden N items a la vez, previniendo que productores rapidos saturen a consumidores lentos."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - reactive-streams
  - patron
  - patron-diseno
  - backpressure
  - async-stream
  - publisher-subscriber
  - flow-control
relatedResources:
  - /patterns/async-generator-pattern
  - /patterns/producer-consumer-pattern
  - /patterns/publish-subscribe-pattern
  - /patterns/lock-free-queue-pattern
  - /patterns/thread-pool-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Procesar streams async con backpressure. Suscriptores piden N items a la vez, previniendo que productores rapidos saturen a consumidores lentos."
  keywords:
    - patron reactive streams
    - backpressure flow control
    - publisher subscriber async
    - patron diseno




---

## Descripción General

En un modelo de streaming push-based, el productor envia datos tan rapido como puede. Si el consumidor es mas lento, los items se bufferizan en memoria hasta agotarla. Reactive Streams resuelve esto con un protocolo pull-based: el suscriptor pide un numero especifico de items, y el publicador envia solo esos. Esto se llama backpressure. El publicador no puede empujar mas de lo que el suscriptor pidio, previniendo overflow de memoria y permitiendo al consumidor controlar el flujo.

## Cuándo Usar


- For alternatives, see [Async Generator Pattern](/es/patterns/async-generator-pattern/).

- Un productor rapido transmite datos a un consumidor lento y necesitas control de flujo
- Procesas streams de datos grandes o infinitos con memoria limitada
- Necesitas componer operaciones de stream (map, filter, merge) con backpressure
- Quieres un protocolo estandar para procesamiento async de streams entre librerias

## Solución

### Python (asyncio + backpressure manual)

```python
import asyncio

class Publisher:
    def __init__(self, data):
        self.data = data
        self.index = 0

    def request(self, n):
        """El suscriptor pide n items. Retorna hasta n items."""
        items = []
        for _ in range(n):
            if self.index >= len(self.data):
                break
            items.append(self.data[self.index])
            self.index += 1
        return items

class Subscriber:
    def __init__(self, publisher, batch_size=5):
        self.publisher = publisher
        self.batch_size = batch_size
        self.processed = 0

    async def consume(self):
        while True:
            # Pedir solo batch_size items: backpressure
            items = self.publisher.request(self.batch_size)
            if not items:
                break
            for item in items:
                await self.process(item)
                self.processed += 1
        print(f"Total processed: {self.processed}")

    async def process(self, item):
        await asyncio.sleep(0.01)  # Simular procesamiento lento
        print(f"Processed: {item}")

async def main():
    data = list(range(100))
    publisher = Publisher(data)
    subscriber = Subscriber(publisher, batch_size=5)
    await subscriber.consume()

asyncio.run(main())
```

### JavaScript (ReadableStream + backpressure)

```javascript
// Crear un readable stream con productor consciente de backpressure
function createNumberStream(max) {
  let current = 0;
  return new ReadableStream({
    start(controller) {
      function push() {
        if (current >= max) {
          controller.close();
          return;
        }
        // desiredSize nos dice cuantos items puede aceptar el consumidor
        // Cuando es negativo, el consumidor va atrasado: dejar de empujar
        if (controller.desiredSize > 0) {
          controller.enqueue(current++);
          push();
        }
      }
      push();
    },
  });
}

async function consume(stream, batchSize = 5) {
  const reader = stream.getReader();
  let processed = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Simular procesamiento lento
    await new Promise((r) => setTimeout(r, 10));
    processed++;
    console.log(`Processed: ${value}`);
  }
  console.log(`Total processed: ${processed}`);
}

// El productor genera 0-99, el consumidor procesa con backpressure
consume(createNumberStream(100));
```

### Java (Project Reactor Flux)

```java
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

public class ReactiveStreamsExample {

    public static void main(String[] args) throws InterruptedException {
        // Publicador: emitir 0 a 99
        Flux<Integer> publisher = Flux.range(0, 100);

        // Suscriptor con backpressure: pedir 5 a la vez
        publisher
            .publishOn(Schedulers.parallel())
            .doOnNext(item -> {
                // Simular procesamiento lento
                try {
                    Thread.sleep(10);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                System.out.println("Processed: " + item);
            })
            .doOnComplete(() -> System.out.println("Done"))
            // Limitar prefetch: tamano del buffer de backpressure
            .subscribeOn(Schedulers.parallel())
            .blockLast(); // Esperar completacion

        System.out.println("All done");
    }
}
```

## Explicación

El protocolo Reactive Streams define cuatro interfaces:

- **Publisher**: Produce items y los envia a suscriptores. Respeta la demanda.
- **Subscriber**: Consume items. Llama `request(n)` para senalar demanda de n items.
- **Subscription**: Representa el enlace entre publicador y suscriptor. Se usa para pedir items o cancelar.
- **Processor**: Actua como publicador y suscriptor (para etapas intermedias).

La regla clave: **el publicador no debe enviar mas items de los solicitados**. Si el suscriptor pide 5, el publicador envia maximo 5. El suscriptor los procesa, luego pide 5 mas. Esto crea un flujo pull-based donde el consumidor controla el ritmo.

Backpressure es el mecanismo que previene que un productor rapido sature a un consumidor lento. En lugar de buffering sin limite, el publicador espera a que el suscriptor pida mas items. El uso de memoria se mantiene limitado independientemente de la longitud del stream.

## Variantes

| Variante | Implementacion | Caso de Uso | Compromiso |
|----------|----------------|-------------|------------|
| **Project Reactor** | Java (Spring) | Enterprise, Spring WebFlux | Curva de aprendizaje pronunciada |
| **RxJava** | Java | Rico set de operadores | API surface grande |
| **Akka Streams** | Scala/Java | Streams basados en actores | Dependencia de Akka |
| **ReadableStream** | Web Streams API | Browser/Node.js | Operadores limitados |
| **Backpressure manual** | asyncio + request | Simple, sin framework | Sin operadores de composicion |

## Qué Funciona

- Empieza con un tamano de request pequeno (ej. 5-10) y ajusta segun throughput
- Usa buffers limitados para operadores como `buffer`, `window` para prevenir crecimiento de memoria
- Siempre maneja `onError`: los streams pueden fallar, y errores no manejados cancelan la suscripcion silenciosamente
- Usa `subscribeOn` y `publishOn` para controlar que thread produce y consume
- Cancela suscripciones al terminar para liberar recursos y detener al publicador
- Monitorea la demanda: si el suscriptor nunca pide mas, el stream se estanca
- Usa `onBackpressureBuffer`, `onBackpressureDrop`, o `onBackpressureLatest` para manejar overflow

## Errores Comunes

- **Solicitar demanda sin limite**: Llamar `request(Long.MAX_VALUE)` desactiva backpressure, revirtiendo a push-based. Solo hazlo cuando el consumidor es siempre mas rapido.
- **Bloquear en el suscriptor**: Una llamada bloqueante en `onNext` bloquea el thread del publicador. Descarga a un scheduler separado.
- **No manejar errores**: Si `onError` no se implementa, las excepciones se tragan y el stream se detiene silenciosamente.
- **Ignorar cancelacion**: Si el consumidor termino pero no cancela, el publicador sigue produciendo y desperdiciando recursos.
- **Mezclar push y pull**: Llamar `onNext` sin un `request` correspondiente viola el protocolo y puede causar errores.
- **Tamanos de request grandes**: Pedir demasiados items a la vez reduce la efectividad del backpressure y puede causar picos de memoria.

## Preguntas Frecuentes

### ¿En qué se diferencia de pub/sub?

Pub/sub transmite mensajes a todos los suscriptores sin control de flujo. Reactive Streams tiene un solo suscriptor por suscripcion con backpressure explicito. Pub/sub es para difusion de eventos; Reactive Streams es para procesamiento de streams con control de flujo.

### ¿En qué se diferencia de async generators?

Los async generators son pull-based (el consumidor pide el siguiente). Reactive Streams tambien son pull-based pero con un protocolo estandarizado, operadores de composicion y soporte multi-thread. Los async generators son mas simples; Reactive Streams son mas ricos.

### ¿Qué pasa cuando el suscriptor es mucho más lento?

El suscriptor pide menos items por lote, o pide uno a la vez. El publicador espera. La memoria se mantiene limitada. Si el suscriptor es demasiado lento, puedes usar `onBackpressureDrop` para descartar items o `onBackpressureLatest` para mantener solo el mas reciente.

### ¿Debería usar Reactive Streams o async/await simple?

Para casos simples (un productor, un consumidor, sin composicion), async/await es mas simple. Para pipelines complejos (map, filter, merge, retry, debounce), las librerias Reactive Streams proporcionan operadores que requeririan codigo manual significativo.

### ¿Puedo tener múltiples suscriptores?

Si, pero cada uno obtiene su propia suscripcion con demanda independiente. Un operador `publish` comparte una sola suscripcion upstream entre multiples suscriptores. Un operador `multicast` bufferiza items para suscriptores tardios.


## Temas Avanzados

### Escenario: Reactive Streams para Procesamiento de Eventos

```typescript
// Reactive Streams: Publisher, Subscriber, Subscription
interface Publisher<T> {
  subscribe(subscriber: Subscriber<T>): void;
}

interface Subscriber<T> {
  onNext(value: T): void;
  onError(err: Error): void;
  onComplete(): void;
}

// Publisher: emite datos
class EventPublisher<T> implements Publisher<T> {
  private subscribers: Subscriber<T>[] = [];
  private buffer: T[] = [];
  private maxBuffer = 1000;

  subscribe(sub: Subscriber<T>) { this.subscribers.push(sub); }

  emit(value: T) {
    this.buffer.push(value);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift(); // descartar el mas viejo
    }
    this.subscribers.forEach(s => {
      try { s.onNext(value); }
      catch (err) { s.onError(err); }
    });
  }

  complete() {
    this.subscribers.forEach(s => s.onComplete());
    this.subscribers = [];
  }
}

// Subscriber: procesa datos con backpressure
class BatchProcessor<T> implements Subscriber<T> {
  private batch: T[] = [];
  private batchSize: number;
  private processFn: (batch: T[]) => Promise<void>;

  constructor(batchSize: number, processFn: (batch: T[]) => Promise<void>) {
    this.batchSize = batchSize;
    this.processFn = processFn;
  }

  async onNext(value: T) {
    this.batch.push(value);
    if (this.batch.length >= this.batchSize) {
      const batch = this.batch.splice(0, this.batchSize);
      await this.processFn(batch);
    }
  }
  onError(err: Error) { console.error("[REACTIVE] Error:", err); }
  async onComplete() {
    if (this.batch.length > 0) await this.processFn(this.batch);
    console.log("[REACTIVE] Stream complete");
  }
}

// Uso: procesar eventos de click en batches de 100
const publisher = new EventPublisher<ClickEvent>();
const processor = new BatchProcessor(100, async (batch) => {
  await fetch("/api/analytics", { method: "POST", body: JSON.stringify(batch) });
});
publisher.subscribe(processor);

// Simular eventos
for (let i = 0; i < 350; i++) {
  publisher.emit({ x: i, y: i * 2, timestamp: Date.now() });
}
publisher.complete(); // procesa el batch final de 50

// Comparacion: RxJS vs Reactive Streams
  | Aspecto | Reactive Streams | RxJS |
  |---------|-----------------|------|
  | Estandar | Reactive Streams spec | Libreria |
  | Backpressure | Explicita (Subscription) | Buffer/lossy |
  | Operadores | Basicos | 100+ operadores |
  | Tipado | Generics | TypeScript nativo |
  | Uso | Sistemas event-driven | UI, transformaciones |
```

Lecciones:
  - Reactive Streams estandariza pub/sub con backpressure
  - Publisher emite, Subscriber consume, Subscription controla
  - Backpressure: el subscriber controla el ritmo de consumo
  - Batching reduce overhead: procesa 100 eventos por HTTP request
  - En Node.js, usa RxJS o most.js para reactive programming
  - Para sistemas event-driven puros, usa Reactive Streams
```

### Como manejo backpressure en reactive streams?

Backpressure es cuando el publisher emite mas rapido de lo que el subscriber puede procesar. Estrategias: 1) Buffer: almacenar hasta un limite (puede causar OOM). 2) Drop: descartar eventos nuevos. 3) Latest: guardar solo el ultimo. 4) Throttle: limitar la tasa de emision. 5) Request(n): el subscriber pide N elementos al publisher (pull-based). La mejor estrategia depende del caso: para analytics, drop es aceptable. Para pagos, buffer con persistencia.
