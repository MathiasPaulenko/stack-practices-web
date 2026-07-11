---
contentType: recipes
slug: concurrent-data-structures
title: "Usar Estructuras de Datos Concurrentes para Colecciones"
description: "CÃ³mo compartir colecciones entre threads de forma segura usando blocking queues, concurrent maps, copy-on-write lists y atomic counters en Java, Python y C++."
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

## VisiÃ³n general

Compartir un `ArrayList` estÃ¡ndar entre threads es peligroso. El thread A lee el Ã­ndice 0 mientras el thread B elimina el Ã­ndice 0 â€” `ConcurrentModificationException`. El thread A y B llaman `map.put("key", value)` simultÃ¡neamente en un `HashMap` â€” la lista enlazada interna puede volverse circular, causando un loop infinito durante la iteraciÃ³n. Estas fallas son no deterministas: pueden pasar miles de tests y fallar solo bajo carga de producciÃ³n.

Las colecciones estÃ¡ndar (`ArrayList`, `HashMap`, `LinkedList`) no son thread-safe. Envolver cada acceso en `synchronized` funciona pero serializa todas las operaciones, derrotando el paralelismo. Las estructuras de datos concurrentes son colecciones diseÃ±adas para acceso multi-thread: usan locks de grano fino, algoritmos lock-free o inmutabilidad para permitir lecturas y escrituras concurrentes seguras con mÃ­nima contenciÃ³n. Lo siguiente cubre blocking queues, concurrent maps, copy-on-write collections y atomic counters con ejemplos prÃ¡cticos.

## CuÃ¡ndo usarlo

Usa esta receta cuando:

- MÃºltiples threads leen y escriben la misma colecciÃ³n
- Implementando patrones productor-consumidor con backpressure
- Construyendo caches, colas de trabajo o [pools de conexiones](/recipes/performance/connection-pooling) compartidos por thread pools
- Reemplazando `synchronized(list)` o `Collections.synchronizedMap()` con alternativas de mayor rendimiento
- Asegurando visibilidad de escrituras entre threads sin barreras de memoria explÃ­citas

## SoluciÃ³n

### Blocking Queue (Java)

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class OrderProcessor {
    private final BlockingQueue<Order> queue = new ArrayBlockingQueue<>(100);

    public void submit(Order order) throws InterruptedException {
        queue.put(order); // bloquea si la cola estÃ¡ llena
    }

    public Order take() throws InterruptedException {
        return queue.take(); // bloquea si la cola estÃ¡ vacÃ­a
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
        self.queue.put(task)  # bloquea si estÃ¡ llena

    def worker(self):
        while True:
            task = self.queue.get()  # bloquea si estÃ¡ vacÃ­a
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

## ExplicaciÃ³n

- **BlockingQueue**: una cola que bloquea productores cuando estÃ¡ llena y consumidores cuando estÃ¡ vacÃ­a. Esto provee backpressure natural â€” un productor rÃ¡pido no puede abrumar a un consumidor lento. `ArrayBlockingQueue` usa un solo lock; `LinkedBlockingQueue` usa locks separados para head y tail, permitiendo mayor concurrencia para cargas mixtas de lectura/escritura.
- **ConcurrentHashMap**: a diferencia de `Collections.synchronizedMap()`, que lockea todo el mapa para cada operaciÃ³n, `ConcurrentHashMap` usa lock striping â€” segmentando el mapa en regiones lockeables independientemente similar a [load balancing](/recipes/architecture/load-balancing). Las lecturas suelen ser lock-free. `computeIfAbsent` chequea e inserta atÃ³micamente, previniendo la carrera clÃ¡sica de doble carga en caches.
- **CopyOnWriteArrayList**: cada escritura crea una copia completa del array subyacente. Las lecturas son lock-free y rÃ¡pidas. Las escrituras son costosas, asÃ­ que esto es ideal para colecciones con pocas escrituras y muchas lecturas â€” como listas de listeners de eventos. Un iterador sobre copy-on-write ve un snapshot del momento de creaciÃ³n del iterador.
- **AtomicInteger / AtomicLong**: no son colecciones, pero son los bloques de construcciÃ³n de contadores concurrentes, generadores de secuencia y estadÃ­sticas. `incrementAndGet()` usa una instrucciÃ³n `CAS` de CPU, haciÃ©ndola lock-free y tÃ­picamente mÃ¡s rÃ¡pida que `synchronized` para contadores simples.

## Variantes

| Estructura | Lecturas | Escrituras | Mejor para | Overhead |
|------------|----------|------------|------------|----------|
| BlockingQueue | Bloqueante | Bloqueante | Productor-consumidor con backpressure | Lock por op |
| ConcurrentHashMap | Lock-free | Lock striping | Caches de alta concurrencia | Bajo |
| CopyOnWriteArrayList | Lock-free | Copia completa | Pocas escrituras, muchas lecturas | Alta escritura |
| ConcurrentLinkedQueue | Lock-free | Lock-free | Colas de alto throughput | Bajo |
| SynchronizedMap | Lockeada | Lockeada | MigraciÃ³n simple | Alta |

## Lo que funciona

- **Prefiere `ConcurrentHashMap` sobre `Collections.synchronizedMap()`**: los wrappers sincronizados lockean todo el mapa para cada operaciÃ³n, incluyendo `get()`. `ConcurrentHashMap` permite lecturas concurrentes y locks mÃ¡s finos para escritura. La diferencia de rendimiento es dramÃ¡tica bajo contenciÃ³n de threads.
- **Usa `computeIfAbsent` para inicializaciÃ³n perezosa de cache**: `if (!map.containsKey(key)) map.put(key, load())` es una condiciÃ³n de carrera. Dos threads pueden cargar y poner. `map.computeIfAbsent(key, k -> load())` chequea e inserta atÃ³micamente, asegurando que el loader corre como mÃ¡ximo una vez por clave.
- **Colas con tamaÃ±o limitada para backpressure**: una `LinkedBlockingQueue` ilimitada puede crecer hasta que la JVM se quede sin memoria bajo un productor rÃ¡pido. Siempre establece un tamaÃ±o mÃ¡ximo y usa `put()` (bloqueante) en lugar de `offer()` (no bloqueante) cuando quieres aplicar [backpressure](/recipes/api/rate-limiting).
- **Copy-on-write para listas de listeners**: si tu aplicaciÃ³n registra listeners de eventos al arrancar y raramente los cambia, `CopyOnWriteArrayList` da lecturas lock-free. No lo uses para listas frecuentemente actualizadas â€” el costo de copia por escritura se vuelve prohibitivo.
- **Itera con `Iterator`, no `for-each` en colecciones sincronizadas**: `for (Item item : synchronizedList)` no es atÃ³mico. Otro thread puede modificar la lista entre pasos del iterador, lanzando `ConcurrentModificationException`. Usa bloques `synchronized(list) { ... }` explÃ­citos alrededor de la iteraciÃ³n, o usa colecciones concurrentes.

## Errores comunes

- **Usar `size()` para decisiones de cola**: chequear `if (queue.size() > 0) queue.take()` es una condiciÃ³n de carrera. La cola puede quedar vacÃ­a entre el chequeo de `size()` y la llamada a `take()`. Usa mÃ©todos bloqueantes (`take()`, `put()`) o no bloqueantes (`poll()`, `offer()`) directamente sin prechequeos.
- **Modificar una colecciÃ³n mientras iteras**: incluso `ConcurrentHashMap` no soporta modificar el mapa vÃ­a el valor retornado por `iterator()`. Usa `Iterator.remove()` u operaciones bulk (`removeIf`, `replaceAll`) en lugar de mutar dentro de un loop `for`.
- **Esperar ordenamiento de `ConcurrentHashMap`**: `ConcurrentHashMap` no garantiza orden de iteraciÃ³n. Si necesitas acceso concurrente ordenado, usa `ConcurrentSkipListMap`, que provee ordenamiento tipo `TreeMap` con lecturas lock-free.
- **Olvidar `task_done()` en `Queue` de Python**: `queue.task_done()` debe llamarse despuÃ©s de procesar cada Ã­tem para seÃ±alar completitud a `queue.join()`. Llamadas faltantes causan que `join()` se cuelgue indefinidamente, esperando tareas que ya fueron procesadas.

## Cuando No Usar Este Enfoque

- **CÃ³digo single-threaded**: las colecciones concurrentes agregan 2-10x de overhead por operaciÃ³n. Si solo un thread accede a los datos, usa colecciones estÃ¡ndar (HashMap, ArrayList, dict)
- **Cargas read-heavy con escrituras infrecuentes**: un CopyOnWriteArrayList copia todo el array en cada escritura. Si las escrituras ocurren mÃ¡s del 5% del tiempo, el costo de copia excede el ahorro de lock contention
- **Operaciones bulk en colecciones pequeÃ±as**: ConcurrentHashMap.putAll() en un map de 10 elementos es mÃ¡s lento que synchronized(map) { putAll() } porque el locking por segmento agrega overhead para tamaÃ±os pequeÃ±os
- **Cuando el orden de iteraciÃ³n importa**: ConcurrentHashMap no garantiza orden de iteraciÃ³n. Si necesitas iteraciÃ³n FIFO u ordenada, usa ConcurrentSkipListMap o ConcurrentLinkedDeque siendo consciente de sus tradeoffs
- **Entornos con memoria limitada**: las colecciones concurrentes usan mÃ¡s memoria que las estÃ¡ndar (arrays de segmentos, metadata CAS, padding extra). En dispositivos con <256MB RAM, el overhead puede ser inaceptable
- **ComparticiÃ³n de datos inmutables**: si los datos se escriben una vez y son leÃ­dos por muchos threads, usa estructuras inmutables o referencias olatile en lugar de colecciones concurrentes. No se necesita sincronizaciÃ³n para datos inmutables read-only
- **Escenarios de baja contenciÃ³n**: si la contenciÃ³n es rara (ej. un contador actualizado una vez por minuto), una variable simple con bloques synchronized ocasionales es mÃ¡s simple y rÃ¡pida que AtomicLong o ConcurrentHashMap

## Benchmarks de Rendimiento

- **ConcurrentHashMap vs HashMap**: put() single-threaded en ConcurrentHashMap es 1.5-2x mÃ¡s lento que HashMap. Bajo contenciÃ³n de 16 threads, ConcurrentHashMap es 5-10x mÃ¡s rÃ¡pido que synchronized(HashMap)
- **AtomicInteger vs synchronized**: AtomicInteger.incrementAndGet() toma ~5ns vs ~50ns para contador synchronized. La brecha se amplÃ­a bajo contenciÃ³n: a 8 threads, atomic es 20x mÃ¡s rÃ¡pido
- **ConcurrentLinkedQueue vs ArrayBlockingQueue**: ConcurrentLinkedQueue ofrece 2-3x mayor throughput para enqueue/dequeue no bloqueante. ArrayBlockingQueue es mejor cuando se necesita backpressure (capacidad acotada)
- **CopyOnWriteArrayList**: las lecturas son 1.2x mÃ¡s rÃ¡pidas que ArrayList (sin sincronizaciÃ³n). Las escrituras son 10-100x mÃ¡s lentas por la copia del array. Break-even en 99% lecturas, 1% escrituras
- **ConcurrentSkipListMap vs TreeMap**: ConcurrentSkipListMap es 1.5-2x mÃ¡s lento que TreeMap para operaciones single-threaded. Bajo contenciÃ³n de 8 threads, escala linealmente mientras TreeMap con locks no
- **Python queue.Queue vs collections.deque**: queue.Queue agrega ~2us por put/get para thread safety. deque con locking manual es 1.5x mÃ¡s rÃ¡pido pero propenso a errores. queue.SimpleQueue es un buen punto intermedio
- **Overhead de memoria**: ConcurrentHashMap usa ~50% mÃ¡s memoria que HashMap por los arrays de segmentos. CopyOnWriteArrayList usa 2x memoria (dos copias de array durante escrituras)

## Estrategia de Testing

- **Stress test con conteo de threads igual al de producciÃ³n**: prueba con 2x el conteo de threads esperado. Si producciÃ³n usa 8 threads, prueba con 16. Las condiciones de carrera a menudo aparecen solo en conteos especÃ­ficos
- **Verificar atomicidad de operaciones compuestas**: testea computeIfAbsent bajo acceso concurrente. Verifica que la mapping function se llame exactamente una vez por key. Usa un ConcurrentHashMap con un mapper contador
- **Test de consistencia de iteraciÃ³n**: los iteradores de colecciones concurrentes son weakly consistent. Verifica que las iteraciones no lancen ConcurrentModificationException y reflejen algÃºn estado, no necesariamente el Ãºltimo
- **Test de comportamiento de bloqueo en colas acotadas**: verifica que put() bloquee cuando la cola estÃ¡ llena y 	ake() bloquee cuando estÃ¡ vacÃ­a. Usa timeouts para detectar deadlocks
- **Test de operaciones bulk**: putAll, clear y eplaceAll en colecciones concurrentes pueden tener semÃ¡ntica no atÃ³mica. Verifica el comportamiento bajo modificaciÃ³n concurrente
- **Test de memory leaks**: tests long-running con millones de ciclos put/remove. Monitorea el uso de heap para detectar leaks en estructuras internas (ej. arrays de segmentos de ConcurrentHashMap)
- **Test con distribuciÃ³n de datos realista**: skew y hot keys se comportan distinto que distribuciÃ³n uniforme. Prueba con patrones de keys de producciÃ³n para identificar hotspots de contenciÃ³n

## Estimacion de Costos

- **Presupuesto de overhead de memoria**: las colecciones concurrentes usan 1.5-2x mÃ¡s memoria. Para una cachÃ© in-memory de 10GB, esto significa 15-20GB. Planifica el sizing de instancias acorde
- **Tiempo de desarrollo**: elegir la colecciÃ³n concurrente correcta toma 2-4 horas de anÃ¡lisis por caso de uso. La elecciÃ³n incorrecta lleva a bugs que toman dÃ­as en diagnosticarse
- **Costo de capacitaciÃ³n**: los miembros del equipo necesitan entender happens-before semantics, iteradores weakly consistent y operaciones CAS. Presupuesta 1-2 dÃ­as de capacitaciÃ³n por developer
- **Ahorros en costo de servidores**: usar colecciones concurrentes en lugar de locking coarse-grained puede reducir tiempos de respuesta 30-60%, permitiendo menos servidores manejar la misma carga
- **Costo de debugging**: los bugs en colecciones concurrentes son difÃ­ciles de reproducir. Una sola condiciÃ³n de carrera puede tomar 20-40 horas en diagnosticarse. Invierte en stress testing temprano

## Monitoring y Observabilidad

- **TamaÃ±o de colecciÃ³n**: monitorea el tamaÃ±o de colas y maps concurrentes. Una cola creciente indica que los consumidores no pueden mantener el ritmo. Alerta cuando el tamaÃ±o excede 80% de la capacidad
- **MÃ©tricas de contenciÃ³n**: trackea lock contention en colecciones sincronizadas. Usa jstack o async-profiler para identificar locks calientes. Alta contenciÃ³n indica necesidad de locking mÃ¡s fino o alternativas concurrentes
- **Latencia de operaciones**: monitorea latencias de put, get, 	ake. P99 >10ms en una cola concurrente indica contenciÃ³n o presiÃ³n de GC
- **Uso de memoria**: trackea el overhead de memoria de las colecciones concurrentes. Compara contra el tamaÃ±o esperado. Crecimiento inesperado puede indicar un leak en estructuras internas
- **Thread wait time**: monitorea la distribuciÃ³n de estados de threads. Alto conteo de threads BLOCKED o WAITING indica lock contention o esperas en colas vacÃ­as

## Deployment Checklist

- [ ] Verificar que la versiÃ³n de JVM soporta las colecciones concurrentes que usas (Java 8+ para mejoras de ConcurrentHashMap, Java 9+ para views de ConcurrentHashMap.keySet)
- [ ] Setear capacidad inicial apropiada para evitar resizing bajo carga (resizear un ConcurrentHashMap es costoso)
- [ ] Configurar capacidades de colas acotadas basadas en presupuesto de memoria y throughput esperado
- [ ] Habilitar monitoreo JMX para mÃ©tricas de colecciones concurrentes (tamaÃ±o, capacidad, contenciÃ³n)
- [ ] Setear tamaÃ±os de thread pool para coincidir con el nÃºmero de consumidores de colecciones concurrentes
- [ ] Testear bajo carga de producciÃ³n antes del deploy para verificar que no haya hotspots de contenciÃ³n

## Consideraciones de Seguridad

- **Denial of service vÃ­a collection flooding**: un atacante puede llenar un ConcurrentLinkedQueue no acotado hasta agotar la memoria. Usa colas acotadas (ArrayBlockingQueue) para operaciones expuestas al usuario
- **Ataques de deserializaciÃ³n en colecciones concurrentes**: eadObject de Java en ConcurrentHashMap no llama computeIfAbsent. La deserializaciÃ³n custom puede bypassar garantÃ­as de concurrencia. Valida los datos deserializados
- **Fuga de informaciÃ³n vÃ­a iteradores weakly consistent**: los iteradores en colecciones concurrentes reflejan un estado pasado. Si se remueven datos sensibles entre iteraciones, un iterador stale puede exponerlos. Limpia datos sensibles atÃ³micamente
- **Condiciones de carrera en check-then-act**: if (!map.containsKey(k)) map.put(k, v) no es atÃ³mico en ConcurrentHashMap. Usa computeIfAbsent o putIfAbsent para prevenir condiciones de carrera que podrÃ­an insertar entradas duplicadas o no autorizadas
- **Agotamiento de memoria vÃ­a keys grandes**: las colecciones concurrentes no limitan el tamaÃ±o de keys. Un atacante puede insertar entradas con keys grandes para agotar memoria. Implementa lÃ­mites de tamaÃ±o a nivel aplicaciÃ³n
- **Ataques de poison pill**: un productor malicioso puede insertar un objeto "poison" en una cola compartida que cause que los consumidores crasheen. Valida los elementos de la cola antes de procesarlos
- **Thread starvation vÃ­a priority inversion**: un thread de baja prioridad que mantiene un lock en una colecciÃ³n concurrente puede bloquear threads de alta prioridad. Usa polÃ­ticas de fair locking (ReentrantLock(fair=true)) en contextos security-sensitive
- **Ataques de timing side-channel**: las operaciones en colecciones concurrentes tienen variaciones de timing segÃºn el estado interno. Un atacante midiendo tiempos de respuesta puede inferir el tamaÃ±o o contenido de la colecciÃ³n. Agrega checks de tiempo constante para operaciones security-sensitive
- **PublicaciÃ³n insegura vÃ­a colecciones concurrentes**: colocar un objeto en un ConcurrentHashMap lo publica de forma segura (happens-before). Pero objetos colocados en un HashMap regular accedido por mÃºltiples threads no se publican de forma segura y pueden verse en estado inconsistente
- **Race de cleanup de recursos**: remover una entrada de un map concurrente no garantiza que sus recursos (file handles, conexiones) se limpien. Usa computeIfPresent con una funciÃ³n de cleanup o emove(key, value) para remociÃ³n y cleanup atÃ³micos
- **InvalidaciÃ³n de iteradores en contextos concurrentes**: los iteradores de ConcurrentHashMap son weakly consistent y no lanzan ConcurrentModificationException. Esto puede enmascarar bugs donde se remueven elementos durante la iteraciÃ³n. Usa sincronizaciÃ³n explÃ­cita si se requiere iteraciÃ³n consistente
- **Data poisoning cross-thread**: si un thread corrompe el estado interno de un objeto compartido (ej. un valor mutable en un ConcurrentHashMap), todos los threads ven la corrupciÃ³n. Usa valores inmutables o defensive copies
- **DoS en colas acotadas vÃ­a bloqueo**: un atacante que llena una cola acotada causa que put() bloquee, negando servicio a los productores. Setea timeouts en operaciones put() (offer(timeout)) e implementa load shedding
- **Superficie de ataque basada en CAS**: las operaciones compareAndSet en AtomicReference pueden explotarse si el valor esperado es controlado por el atacante. AsegÃºrate de que las operaciones CAS usen valores esperados manejados internamente, no input del usuario
## Preguntas frecuentes

**P: Â¿DeberÃ­a siempre usar colecciones concurrentes en cÃ³digo multithread?**
R: Si la colecciÃ³n es compartida, sÃ­. Si cada thread tiene su propia colecciÃ³n (ej. un buffer local que se mergea al final), las colecciones estÃ¡ndar son mÃ¡s rÃ¡pidas y simples. Las colecciones concurrentes tienen overhead que no necesitas para datos thread-local.

**P: Â¿Es `ConcurrentHashMap` completamente thread-safe?**
R: Las operaciones individuales (`get`, `put`, `computeIfAbsent`) son thread-safe. Las operaciones compuestas (`if (!map.containsKey(k)) map.put(k, v)`) no lo son. Usa `computeIfAbsent`, `merge`, o `compute` para operaciones compuestas atÃ³micas.

**P: Â¿CuÃ¡ndo deberÃ­a usar `CopyOnWriteArrayList` vs `Collections.synchronizedList`?**
R: Usa `CopyOnWriteArrayList` cuando las escrituras son raras (ej. listeners configurados al arrancar) y las lecturas frecuentes. Usa `Collections.synchronizedList` cuando las escrituras son frecuentes y las lecturas ocasionales â€” aunque `ConcurrentLinkedQueue` suele ser mejor que ambos para patrones de acceso tipo cola.

**P: Â¿Puedo usar colecciones concurrentes desde cÃ³digo async/await?**
R: Las colecciones concurrentes de Java funcionan bien con virtual threads y `CompletableFuture`. En Python, `asyncio` tiene su propia `asyncio.Queue` â€” mezclar `threading.Queue` con `asyncio` requiere bridging entre contextos de thread y event loop usando `loop.call_soon_threadsafe()`.


### Â¿Esta soluciÃ³n estÃ¡ lista para producciÃ³n?

SÃ­. Los ejemplos de cÃ³digo arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuraciÃ³n a tu entorno especÃ­fico antes de desplegar.

### Â¿CuÃ¡les son las caracterÃ­sticas de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, aÃ±ade caching, batching y connection pooling segÃºn sea necesario.

### Â¿CÃ³mo depuro problemas con este enfoque?

Empieza con el ejemplo mÃ­nimo de arriba. AÃ±ade logging en cada paso. Prueba con entradas pequeÃ±as primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
- **Corrupcion de estado via referencias stale**: si un thread obtiene una referencia a un objeto mutable desde una coleccion concurrente y otro thread lo modifica simultaneamente, el primer thread puede leer datos corruptos. Usa defensive copies o valores inmutables
- **DoS via crecimiento de segmentos**: un atacante puede forzar el crecimiento de segmentos internos de ConcurrentHashMap insertando keys con hash collisions, degradando el rendimiento. Usa funciones de hash con buena distribucion


## Temas Avanzados

### Escenario: Estructuras de Datos Concurrentes en Java

```java
// ConcurrentHashMap: thread-safe sin bloquear toda la estructura
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
// Operaciones atomicas
map.putIfAbsent("count", 0);
map.computeIfPresent("count", (k, v) -> v + 1);
map.computeIfAbsent("stats", k -> new ArrayList<>());

// AtomicLong: contador thread-safe sin locks
AtomicLong counter = new AtomicLong(0);
counter.incrementAndGet();      // ++counter
counter.compareAndSet(5, 10);   // if (counter == 5) counter = 10
counter.updateAndGet(x -> x * 2); // counter *= 2

// BlockingQueue: productor-consumidor thread-safe
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(1000);
// Productor
queue.put(task);  // bloquea si la queue esta llena
// Consumidor
Task task = queue.take();  // bloquea si la queue esta vacia

// CopyOnWriteArrayList: optimizado para lectura, copia en write
CopyOnWriteArrayList<Listener> listeners = new CopyOnWriteArrayList<>();
listeners.add(new Listener());  // copia el array interno
for (Listener l : listeners) { l.notify(); }  // sin sincronizacion en read
```

```text
Comparacion de estructuras concurrentes:
  | Estructura | Lectura | Escritura | Use case |
  |------------|---------|-----------|----------|
  | ConcurrentHashMap | No bloquea | Segment lock | Cache, mapa compartido |
  | synchronizedMap | Bloquea | Bloquea | Legacy, simple |
  | CopyOnWriteArrayList | No bloquea | Copia array | Listeners, configs |
  | BlockingQueue | Bloquea | Bloquea | Producer-consumer |
  | ConcurrentLinkedQueue | No bloquea | CAS | Work stealing |
  | AtomicLong | No bloquea | CAS | Contadores, secuencias |
```

Lecciones:
  - ConcurrentHashMap: segment locks, no bloquea toda la estructura
  - Atomic*: CAS (Compare-And-Swap), sin locks del SO
  - BlockingQueue: bloquea al productor/consumidor, ideal para pipelines
  - CopyOnWrite: optimizado para mucho read, poco write
  - Evitar synchronized en metodos: granularidad gruesa, contencion
  - Preferir java.util.concurrent sobre synchronized Collections
```

### Como evito deadlocks con estructuras concurrentes?

Usa estructuras lock-free cuando sea posible (ConcurrentLinkedQueue, Atomic*). Si necesitas multiples locks, adquiere siempre en el mismo orden. Usa tryLock con timeout: no bloquees indefinidamente. Evita locks anidados: si tienes lock A y lock B, reestructura para no necesitar ambos. Usa java.util.concurrent en lugar de synchronized: las clases concurrentes estan disenadas para evitar deadlocks. Para transacciones, usar STM (Software Transactional Memory) o database transactions.
