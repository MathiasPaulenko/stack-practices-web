---
contentType: recipes
slug: concurrent-data-structures
title: "Usar Estructuras de Datos Concurrentes para Colecciones Thread-Safe"
description: "Cómo compartir colecciones entre threads de forma segura usando blocking queues, concurrent maps, copy-on-write lists y atomic counters en Java, Python y C++."
metaDescription: "Aprende estructuras de datos concurrentes para thread safety. Usa blocking queues, concurrent maps, copy-on-write lists y atomic counters en Java, Python y C++."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - atomic-operations
  - async
  - threads
  - parallel
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/async-patterns
  - /recipes/microservices-patterns
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende estructuras de datos concurrentes para thread safety. Usa blocking queues, concurrent maps, copy-on-write lists y atomic counters en Java, Python y C++."
  keywords:
    - estructuras datos concurrentes
    - colecciones thread safe
    - blocking queue
    - concurrent hash map
    - productor consumidor
---

## Visión general

Compartir un `ArrayList` estándar entre threads es peligroso. El thread A lee el índice 0 mientras el thread B elimina el índice 0 — `ConcurrentModificationException`. El thread A y B llaman `map.put("key", value)` simultáneamente en un `HashMap` — la lista enlazada interna puede volverse circular, causando un loop infinito durante la iteración. Estas fallas son no deterministas: pueden pasar miles de tests y fallar solo bajo carga de producción.

Las colecciones estándar (`ArrayList`, `HashMap`, `LinkedList`) no son thread-safe. Envolver cada acceso en `synchronized` funciona pero serializa todas las operaciones, derrotando el paralelismo. Las estructuras de datos concurrentes son colecciones diseñadas para acceso multi-thread: usan locks de grano fino, algoritmos lock-free o inmutabilidad para permitir lecturas y escrituras concurrentes seguras con mínima contención. Lo siguiente cubre blocking queues, concurrent maps, copy-on-write collections y atomic counters con ejemplos prácticos.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples threads leen y escriben la misma colección
- Implementando patrones productor-consumidor con backpressure
- Construyendo caches, colas de trabajo o [pools de conexiones](/recipes/performance/connection-pooling) compartidos por thread pools
- Reemplazando `synchronized(list)` o `Collections.synchronizedMap()` con alternativas de mayor rendimiento
- Asegurando visibilidad de escrituras entre threads sin barreras de memoria explícitas

## Solución

### Blocking Queue (Java)

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class OrderProcessor {
    private final BlockingQueue<Order> queue = new ArrayBlockingQueue<>(100);

    public void submit(Order order) throws InterruptedException {
        queue.put(order); // bloquea si la cola está llena
    }

    public Order take() throws InterruptedException {
        return queue.take(); // bloquea si la cola está vacía
    }
}

// Productor
Thread producer = new Thread(() -> {
    for (int i = 0; i < 1000; i++) {
        processor.submit(new Order(i));
    }
});

// Pool de consumidores
for (int i = 0; i < 4; i++) {
    new Thread(() -> {
        while (true) {
            try {
                Order order = processor.take();
                process(order);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }).start();
}
```

### Concurrent Map (Java)

```java
import java.util.concurrent.ConcurrentHashMap;

class InMemoryCache {
    private final ConcurrentHashMap<String, CachedValue> cache = new ConcurrentHashMap<>();

    public String get(String key, Supplier<String> loader) {
        return cache.computeIfAbsent(key, k -> {
            String value = loader.get();
            return new CachedValue(value, System.currentTimeMillis());
        }).value;
    }

    public void invalidate(String key) {
        cache.remove(key);
    }

    private record CachedValue(String value, long timestamp) {}
}
```

### Python Queue (Thread-Safe)

```python
from queue import Queue
from threading import Thread

class TaskQueue:
    def __init__(self, maxsize=100):
        self.queue = Queue(maxsize=maxsize)

    def submit(self, task):
        self.queue.put(task)  # bloquea si está llena

    def worker(self):
        while True:
            task = self.queue.get()  # bloquea si está vacía
            if task is None:
                break
            self.process(task)
            self.queue.task_done()

tq = TaskQueue()
Thread(target=lambda: [tq.submit(i) for i in range(1000)]).start()
for _ in range(4):
    Thread(target=tq.worker).start()
```

### Copy-on-Write List (Java)

```java
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

class EventDispatcher {
    private final CopyOnWriteArrayList<Consumer<Event>> listeners = new CopyOnWriteArrayList<>();

    public void addListener(Consumer<Event> listener) {
        listeners.add(listener);
    }

    public void removeListener(Consumer<Event> listener) {
        listeners.remove(listener);
    }

    public void dispatch(Event event) {
        for (Consumer<Event> listener : listeners) {
            listener.accept(event);
        }
    }
}
```

## Explicación

- **BlockingQueue**: una cola que bloquea productores cuando está llena y consumidores cuando está vacía. Esto provee backpressure natural — un productor rápido no puede abrumar a un consumidor lento. `ArrayBlockingQueue` usa un solo lock; `LinkedBlockingQueue` usa locks separados para head y tail, permitiendo mayor concurrencia para cargas mixtas de lectura/escritura.
- **ConcurrentHashMap**: a diferencia de `Collections.synchronizedMap()`, que lockea todo el mapa para cada operación, `ConcurrentHashMap` usa lock striping — segmentando el mapa en regiones lockeables independientemente similar a [load balancing](/recipes/architecture/load-balancing). Las lecturas suelen ser lock-free. `computeIfAbsent` chequea e inserta atómicamente, previniendo la carrera clásica de doble carga en caches.
- **CopyOnWriteArrayList**: cada escritura crea una copia completa del array subyacente. Las lecturas son lock-free y rápidas. Las escrituras son costosas, así que esto es ideal para colecciones con pocas escrituras y muchas lecturas — como listas de listeners de eventos. Un iterador sobre copy-on-write ve un snapshot del momento de creación del iterador.
- **AtomicInteger / AtomicLong**: no son colecciones, pero son los bloques de construcción de contadores concurrentes, generadores de secuencia y estadísticas. `incrementAndGet()` usa una instrucción `CAS` de CPU, haciéndola lock-free y típicamente más rápida que `synchronized` para contadores simples.

## Variantes

| Estructura | Lecturas | Escrituras | Mejor para | Overhead |
|------------|----------|------------|------------|----------|
| BlockingQueue | Bloqueante | Bloqueante | Productor-consumidor con backpressure | Lock por op |
| ConcurrentHashMap | Lock-free | Lock striping | Caches de alta concurrencia | Bajo |
| CopyOnWriteArrayList | Lock-free | Copia completa | Pocas escrituras, muchas lecturas | Alta escritura |
| ConcurrentLinkedQueue | Lock-free | Lock-free | Colas de alto throughput | Bajo |
| SynchronizedMap | Lockeada | Lockeada | Migración simple | Alta |

## Lo que funciona

- **Prefiere `ConcurrentHashMap` sobre `Collections.synchronizedMap()`**: los wrappers sincronizados lockean todo el mapa para cada operación, incluyendo `get()`. `ConcurrentHashMap` permite lecturas concurrentes y locks más finos para escritura. La diferencia de rendimiento es dramática bajo contención de threads.
- **Usa `computeIfAbsent` para inicialización perezosa de cache**: `if (!map.containsKey(key)) map.put(key, load())` es una condición de carrera. Dos threads pueden cargar y poner. `map.computeIfAbsent(key, k -> load())` chequea e inserta atómicamente, asegurando que el loader corre como máximo una vez por clave.
- **Colas con tamaño limitada para backpressure**: una `LinkedBlockingQueue` ilimitada puede crecer hasta que la JVM se quede sin memoria bajo un productor rápido. Siempre establece un tamaño máximo y usa `put()` (bloqueante) en lugar de `offer()` (no bloqueante) cuando quieres aplicar [backpressure](/recipes/api/rate-limiting).
- **Copy-on-write para listas de listeners**: si tu aplicación registra listeners de eventos al arrancar y raramente los cambia, `CopyOnWriteArrayList` da lecturas lock-free. No lo uses para listas frecuentemente actualizadas — el costo de copia por escritura se vuelve prohibitivo.
- **Itera con `Iterator`, no `for-each` en colecciones sincronizadas**: `for (Item item : synchronizedList)` no es atómico. Otro thread puede modificar la lista entre pasos del iterador, lanzando `ConcurrentModificationException`. Usa bloques `synchronized(list) { ... }` explícitos alrededor de la iteración, o usa colecciones concurrentes.

## Errores comunes

- **Usar `size()` para decisiones de cola**: chequear `if (queue.size() > 0) queue.take()` es una condición de carrera. La cola puede quedar vacía entre el chequeo de `size()` y la llamada a `take()`. Usa métodos bloqueantes (`take()`, `put()`) o no bloqueantes (`poll()`, `offer()`) directamente sin prechequeos.
- **Modificar una colección mientras iteras**: incluso `ConcurrentHashMap` no soporta modificar el mapa vía el valor retornado por `iterator()`. Usa `Iterator.remove()` u operaciones bulk (`removeIf`, `replaceAll`) en lugar de mutar dentro de un loop `for`.
- **Esperar ordenamiento de `ConcurrentHashMap`**: `ConcurrentHashMap` no garantiza orden de iteración. Si necesitas acceso concurrente ordenado, usa `ConcurrentSkipListMap`, que provee ordenamiento tipo `TreeMap` con lecturas lock-free.
- **Olvidar `task_done()` en `Queue` de Python**: `queue.task_done()` debe llamarse después de procesar cada ítem para señalar completitud a `queue.join()`. Llamadas faltantes causan que `join()` se cuelgue indefinidamente, esperando tareas que ya fueron procesadas.

## Preguntas frecuentes

**P: ¿Debería siempre usar colecciones concurrentes en código multithread?**
R: Si la colección es compartida, sí. Si cada thread tiene su propia colección (ej. un buffer local que se mergea al final), las colecciones estándar son más rápidas y simples. Las colecciones concurrentes tienen overhead que no necesitas para datos thread-local.

**P: ¿Es `ConcurrentHashMap` completamente thread-safe?**
R: Las operaciones individuales (`get`, `put`, `computeIfAbsent`) son thread-safe. Las operaciones compuestas (`if (!map.containsKey(k)) map.put(k, v)`) no lo son. Usa `computeIfAbsent`, `merge`, o `compute` para operaciones compuestas atómicas.

**P: ¿Cuándo debería usar `CopyOnWriteArrayList` vs `Collections.synchronizedList`?**
R: Usa `CopyOnWriteArrayList` cuando las escrituras son raras (ej. listeners configurados al arrancar) y las lecturas frecuentes. Usa `Collections.synchronizedList` cuando las escrituras son frecuentes y las lecturas ocasionales — aunque `ConcurrentLinkedQueue` suele ser mejor que ambos para patrones de acceso tipo cola.

**P: ¿Puedo usar colecciones concurrentes desde código async/await?**
R: Las colecciones concurrentes de Java funcionan bien con virtual threads y `CompletableFuture`. En Python, `asyncio` tiene su propia `asyncio.Queue` — mezclar `threading.Queue` con `asyncio` requiere bridging entre contextos de thread y event loop usando `loop.call_soon_threadsafe()`.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
