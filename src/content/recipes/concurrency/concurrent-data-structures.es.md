---
contentType: recipes
slug: concurrent-data-structures
title: "Estructuras Concurrentes para Colecciones Seguras"
description: "Cómo compartir colecciones entre hilos de forma segura usando estructuras concurrentes: colas, mapas, listas y contadores atómicos en Java, Python y C++."
metaDescription: "Estructuras concurrentes para colecciones seguras en Java, Python y C++: colas bloqueantes, mapas concurrentes y contadores atómicos—sin bloqueos manuales."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - atomic-operations
  - threads
  - parallel
  - java
  - python
  - cpp
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/python-thread-pool-executor
  - /recipes/race-condition-prevention
  - /recipes/csp-communication
  - /recipes/async-patterns
lastUpdated: "2026-08-16"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Estructuras concurrentes para colecciones seguras en Java, Python y C++: colas bloqueantes, mapas concurrentes y contadores atómicos—sin bloqueos manuales."
  keywords:
    - estructuras de datos concurrentes
    - colecciones seguras entre hilos
    - cola bloqueante
    - mapa concurrente
    - contador atómico
    - productor-consumidor
    - copy-on-write
---

## Visión general

Compartir un ArrayList o HashMap normal entre hilos es pedir corrupción silenciosa. Un hilo puede leer el índice 0 mientras otro lo elimina, lanzando ConcurrentModificationException o, peor, dejando la lista interna de buckets en un estado inconsistente. Estos errores suelen pasar todos los tests unitarios y aparecen solo bajo carga real.

Ahí entran las colecciones concurrentes. Usan bloqueos de grano fino, algoritmos sin bloqueos o instantáneas para que varios hilos lean y escriban sin andar envolviendo cada llamada en synchronized. Los ejemplos están en Java, Python y C++; usa el que tengas.

## Cuándo usarlo

Usa una colección concurrente cuando varios hilos lean y escriban los mismos datos. Eso incluye pipelines productor-consumidor, cachés compartidas, colas de tareas o pools de conexiones ligados a un [pool de hilos](/recipes/thread-pools). También son un buen reemplazo directo de mapas sincronizados o listas sincronizadas cuando quieres menos contención de bloqueos, y te dan la visibilidad happens-before que de otro modo tendrías que construir a mano.

## Cuándo NO usarlo

No las uses si solo un hilo toca los datos, porque la coordinación extra es un gasto innecesario. Evita las listas copy-on-write si las escrituras son frecuentes: cada una copia el array completo. No esperes un orden de iteración estable de un mapa concurrente; si necesitas acceso ordenado, usa un mapa concurrente con skip list. Si los datos se escriben una vez y después solo se leen, una instantánea inmutable o una referencia volatile suele ser más simple y rápida. En Python, no mezcles la cola del módulo threading con corrutinas de asyncio; en ese caso usa la cola de asyncio.

## Solución

### Cola bloqueante (Java)

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

record Order(int id) {}

class OrderProcessor {
    private final BlockingQueue<Order> queue = new ArrayBlockingQueue<>(100);

    public void submit(Order order) throws InterruptedException {
        queue.put(order); // bloquea si está llena
    }

    public Order take() throws InterruptedException {
        return queue.take(); // bloquea si está vacía
    }

    public void process(Order order) {
        System.out.println("Processing " + order.id());
    }

    public void start() {
        Thread producer = new Thread(() -> {
            try {
                for (int i = 0; i < 1000; i++) {
                    submit(new Order(i));
                }
                for (int i = 0; i < 4; i++) {
                    submit(new Order(-1)); // centinela para detener cada consumidor
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        for (int i = 0; i < 4; i++) {
            new Thread(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Order order = take();
                        if (order.id() == -1) break;
                        process(order);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }).start();
        }

        producer.start();
    }

    public static void main(String[] args) {
        new OrderProcessor().start();
    }
}
```

### Mapa concurrente (Java)

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

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

### Cola en Python (thread-safe)

```python
from queue import Queue
from threading import Thread

class TaskQueue:
    def __init__(self, maxsize=100):
        self.queue = Queue(maxsize=maxsize)

    def submit(self, task):
        self.queue.put(task)  # bloquea si está llena

    def process(self, task):
        print(f"Processing {task}")

    def producer(self):
        for i in range(1000):
            self.submit(i)
        for _ in range(4):
            self.queue.put(None)  # centinela para detener cada trabajador

    def worker(self):
        while True:
            task = self.queue.get()  # bloquea si está vacía
            if task is None:
                self.queue.task_done()
                break
            self.process(task)
            self.queue.task_done()

    def start(self):
        workers = [Thread(target=self.worker) for _ in range(4)]
        for w in workers:
            w.start()
        producer = Thread(target=self.producer)
        producer.start()
        producer.join()
        self.queue.join()

TaskQueue().start()
```

### Lista copy-on-write (Java)

```java
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

record Event(String type) {}

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

### Contador atómico en Python

```python
import threading

class AtomicCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:
            self._value += 1
            return self._value

    def value(self):
        with self._lock:
            return self._value

counter = AtomicCounter()

def worker():
    for _ in range(100_000):
        counter.increment()

threads = [threading.Thread(target=worker) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(counter.value())
```

### Contador atómico en C++

```cpp
#include <atomic>
#include <iostream>
#include <thread>

std::atomic<int> counter{0};

int main() {
    std::thread t1([] {
        for (int i = 0; i < 100000; ++i) {
            counter++;
        }
    });

    std::thread t2([] {
        for (int i = 0; i < 100000; ++i) {
            counter++;
        }
    });

    t1.join();
    t2.join();

    std::cout << counter << '\n';
}
```

## Explicación

Una cola bloqueante frena a los productores si la cola está llena y a los consumidores si está vacía. Ese backpressure integrado evita que un productor rápido sature a uno lento. Una cola con array subyacente usa un solo bloqueo; una vinculada usa bloqueos separados para la cabeza y la cola, lo que mejora cuando productores y consumidores corren a la vez.

Un mapa concurrente no bloquea el mapa entero como hace uno sincronizado. Usa bloqueo de grano fino por cubeta (per-bin lock striping), así que las lecturas son en general sin bloqueos y las escrituras tocan solo una región pequeña. Con compute-if-absent, la carga perezosa de una caché pasa a ser atómica. Si vas a proteger una sección crítica más amplia, revisa [locks y mutexes](/recipes/locks-and-mutexes).

Una lista copy-on-write copia el array subyacente entero en cada escritura, así que las lecturas son sin bloqueos y siempre ven una instantánea estable. Es útil cuando las escrituras son raras, como en listas de listeners de eventos o pequeñas instantáneas de configuración.

La cola de Python usa un bloqueo reentrante y dos semáforos, así que put, get y task_done son seguros desde cualquier hilo. En código asyncio, la que corresponde es la cola de asyncio.

El contador atómico de Python envuelve un entero bajo un único bloqueo, mientras que std::atomic en C++ usa compare-and-swap del hardware. Ambos se libran de mutexes explícitos para contadores simples. Para cambios de estado más complejos, consulta la receta de [prevención de condiciones de carrera](/recipes/race-condition-prevention).

## Variantes

| Estructura | Lecturas | Escrituras | Mejor para | Sobrecarga |
|-----------|----------|------------|------------|----------|
| `ArrayBlockingQueue` | Bloqueante | Bloqueante | Productor-consumidor con backpressure | Un bloqueo |
| `LinkedBlockingQueue` | Bloqueante | Bloqueante | Mayor throughput productor-consumidor | Bloqueos separados para cabeza y cola |
| `ConcurrentHashMap` | Sin bloqueos | Bloqueo por cubetas | Cachés y mapas de alta concurrencia | Bajo |
| `CopyOnWriteArrayList` | Sin bloqueos | Copia completa del array | Pocas escrituras, muchas lecturas | Alto en escrituras |
| `ConcurrentLinkedQueue` | Sin bloqueos | Sin bloqueos | Colas de trabajo no bloqueantes | Bajo |
| `Collections.synchronizedMap` | Totalmente bloqueada | Totalmente bloqueada | Migración simple, baja contención | Alta bajo contención |

## Buenas prácticas

- Elige un mapa concurrente en lugar de uno totalmente sincronizado. Los wrappers sincronizados bloquean todo el mapa en cada operación, incluso una lectura; la versión concurrente deja pasar muchas lecturas a la vez.
- Para la carga perezosa de caché, usa el método compute-if-absent del mapa. Verificar si la clave existe y luego meter el valor cargado a mano es una condición de carrera: dos hilos pueden cargar y pisarse con el mismo valor. Compute-if-absent ejecuta el loader a lo sumo una vez por clave.
- Acota tus colas bloqueantes y usa un put bloqueante cuando quieras backpressure. Una cola bloqueante vinculada sin límite puede crecer hasta que la JVM se quede sin memoria.
- Las listas copy-on-write rinden bien con listeners de eventos e instantáneas de configuración que cambian poco. No las uses cuando las escrituras sean frecuentes.
- Mejor usa la colección concurrente del lenguaje antes que inventarte un wrapper sincronizado. Las implementaciones estándar están probadas, optimizadas y tienen semánticas más claras.

## Errores comunes

- Fijarte en el tamaño de la cola antes de tomar un elemento. Si la cola se vacía antes de la llamada a take, caes en una carrera check-then-act.
- Modificar una colección mientras la recorres. Incluso un mapa concurrente no permite cambiarlo dentro de un bucle sobre sus valores. Recolecta las claves primero o elimina a través del iterador.
- Pensar que un mapa concurrente va a mantener un orden estable. El orden de iteración puede cambiar al redimensionarse; si necesitas acceso concurrente ordenado, usa un mapa concurrente con skip list.
- Olvidarte de llamar a task_done tras cada elemento de la cola de Python. join espera hasta que el contador de tareas sin terminar llegue a cero, así que llamadas faltantes bloquean al que espera.
- Pensar que un contador atómico arregla cualquier problema de estado compartido. Solo protege el valor que envuelve, no un grupo completo de campos relacionados.

## Notas de producción

- Dale una capacidad inicial al mapa concurrente para evitar redimensiones costosas bajo carga. Hacerlo crecer cuesta más que con un HashMap común.
- Usa una cola bloqueante basada en array cuando quieras backpressure acotado con mínima asignación, y una vinculada cuando puedas cambiar algo de memoria por mayor throughput.
- Ten bajo control el tamaño de las colas, la tasa de aciertos de caché y la longitud de la lista de listeners. Una cola que crece, una tasa de aciertos que cae o una lista de listeners larga son señales tempranas de fugas de memoria o retraso de consumidores.
- Carga el sistema con más hilos y corridas más largas que en producción. Las condiciones de carrera suelen esconderse hasta que la presión aparece.
- Mantén los valores inmutables o copiados defensivamente antes de compartirlos. Un contenedor seguro entre hilos no evita que otro hilo cambie un objeto que contiene.

## Preguntas frecuentes

### ¿Cuándo conviene una cola bloqueante?

Cuando los productores tienen que parar si la cola está llena y los consumidores si está vacía. Ese backpressure integrado evita que la cola crezca sin control y mantiene el uso de CPU a raya.

### ¿Toda operación en un mapa concurrente es segura?

Las lecturas y escrituras individuales son seguras, pero una secuencia de containsKey y luego put no lo es. Para ese check-then-act, usa compute-if-absent o merge.

### ¿Puedo iterar sobre un mapa concurrente mientras otros hilos escriben en él?

Sí. El iterador es débilmente consistente, así que muestra el estado en algún momento posterior a su creación y puede no reflejar cambios recientes. De todos modos, no lanza ConcurrentModificationException.

### ¿Cuándo penaliza el rendimiento una lista copy-on-write?

Se pone cara cuando las escrituras son frecuentes, porque cada una copia el array completo. Úsala cuando las lecturas sean muchas más que las escrituras, como en listas de listeners de eventos.

### ¿Sigo necesitando locks si uso std::atomic?

No, para un contador o flag simple. Un atómico solo protege el valor que envuelve. Si actualizas varios campos relacionados a la vez, sigues necesitando un mutex o un diseño de más alto nivel.

### ¿Por qué no usar Collections.synchronizedList en todas partes?

Bloquea toda la lista en cada acceso. Cuando los hilos empiezan a competir, se encolan y el throughput cae. Las colecciones concurrentes evitan ese cuello de botella.

## Conclusiones clave

Elige la estructura que se ajuste al patrón de acceso, no solo al lenguaje. Una cola bloqueante encaja bien en pipelines productor-consumidor, un mapa concurrente en cachés compartidas y una lista copy-on-write en listas de listeners que casi no cambian.

Los contadores atómicos y las colas seguras entre hilos se encargan de gran parte del bloqueo, pero no hacen inmutables tus valores. Un contenedor seguro entre hilos no evita que otro hilo modifique un objeto que contiene, así que mantén los valores inmutables o copiados antes de compartirlos.

## Lecturas adicionales

- Documentación oficial de Java: [resumen del paquete java.util.concurrent](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html) y [ConcurrentHashMap](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html).
- Documentación oficial de Python: [módulo queue](https://docs.python.org/3/library/queue.html) y [módulo threading](https://docs.python.org/3/library/threading.html).
- Referencia de C++: [std::atomic](https://en.cppreference.com/w/cpp/atomic/atomic).
- Recetas relacionadas: [Pools de hilos](/recipes/thread-pools), [Locks y mutexes](/recipes/locks-and-mutexes), [Prevención de condiciones de carrera](/recipes/race-condition-prevention).
