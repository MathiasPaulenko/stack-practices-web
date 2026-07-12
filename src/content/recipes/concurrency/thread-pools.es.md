---



contentType: recipes
slug: thread-pools
title: "Gestionar Trabajo Concurrente con Thread Pools y Executors"
description: "Cómo gestionar worker threads eficientemente usando thread pools, executors y políticas de rechazo en Java, Python y C# para cargas CPU-bound e I/O-bound."
metaDescription: "Aprende patrones de thread pool para trabajo concurrente. Gestiona worker threads con executors y políticas de rechazo en Java, Python y C# para CPU e I/O."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - async
  - threads
  - parallel
  - locks
relatedResources:
  - /recipes/async-patterns
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/serverless-functions
  - /recipes/csp-communication
  - /recipes/concurrent-data-structures
  - /recipes/locks-and-mutexes
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende patrones de thread pool para trabajo concurrente. Gestiona worker threads con executors y políticas de rechazo en Java, Python y C# para CPU e I/O."
  keywords:
    - thread pools
    - java executors
    - worker threads
    - procesamiento concurrente
    - tamano thread pool



---

## Visión general

Crear un nuevo thread para cada tarea concurrente es costoso. Cada thread consume memoria para su stack (típicamente 1MB), requiere scheduling del SO, y agrega overhead de context-switching. En alta concurrencia, la creación de threads se convierte en cuello de botella — el sistema pasa más tiempo gestionando threads que haciendo trabajo útil. Los thread pools resuelven esto manteniendo un conjunto fijo de worker threads reutilizables. Las tareas se envían a una cola; workers inactivos las toman. Cuando todos los workers están ocupados, las tareas esperan en la cola en lugar de spawnear nuevos threads.

El desafío es dimensionar el pool correctamente y manejar sobrecarga. Una tarea CPU-bound en una máquina de 8 cores se beneficia de 8 threads — más threads solo compiten por cores. Una tarea I/O-bound se beneficia de más threads que cores porque los threads pasan la mayor parte del tiempo esperando disco o red. Cuando la cola se llena, el pool debe decidir si rechazar tareas, bloquear al submitter, o ejecutarlas en el thread del llamador. Aqui se explica como dimensionamiento de pools, patrones de executors y estrategias de rechazo en Java, Python y C#.

## Cuándo usarlo

Usa esta receta cuando:

- Procesando un alto volumen de tareas independientes concurrentemente
- Ejecutando computaciones CPU-bound (procesamiento de imágenes, transformación de datos, inferencia ML)
- Ejecutando operaciones I/O-bound donde los threads pasan tiempo esperando (llamadas API, lecturas de archivo). Consulta [Async Patterns](/recipes/concurrency/async-patterns) para alternativas no bloqueantes.
- Limitando uso de recursos para prevenir agotamiento de threads o presión de memoria. Consulta [Locks y Mutexes](/recipes/concurrency/locks-and-mutexes) para coordinar acceso compartido.
- Construyendo colas de trabajo donde las tareas deben ejecutarse asíncronamente del submitter

## Solución

### Java Executors (Fixed Thread Pool)

```java
import java.util.concurrent.*;

public class ImageProcessor {
    private final ExecutorService executor;

    public ImageProcessor(int poolSize) {
        this.executor = Executors.newFixedThreadPool(poolSize);
    }

    public CompletableFuture<String> processAsync(String imageId) {
        return CompletableFuture.supplyAsync(() -> {
            return processImage(imageId);
        }, executor);
    }

    public void shutdown() {
        executor.shutdown();
        try {
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
        }
    }
}

ExecutorService executor = new ThreadPoolExecutor(
    4, 8, 30L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(100),
    new ThreadFactory() {
        private final AtomicInteger counter = new AtomicInteger(0);
        public Thread newThread(Runnable r) {
            return new Thread(r, "worker-" + counter.incrementAndGet());
        }
    },
    new ThreadPoolExecutor.CallerRunsPolicy()
);
```

### Python concurrent.futures

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

def fetch_url(url):
    response = requests.get(url, timeout=10)
    return response.json()

urls = [
    "https://api.example.com/users/1",
    "https://api.example.com/users/2",
    "https://api.example.com/users/3",
]

with ThreadPoolExecutor(max_workers=20) as executor:
    futures = {executor.submit(fetch_url, url): url for url in urls}
    for future in as_completed(futures):
        url = futures[future]
        try:
            data = future.result()
            print(f"Fetched {url}: {data}")
        except Exception as e:
            print(f"Failed {url}: {e}")

from concurrent.futures import ProcessPoolExecutor

def process_data(chunk):
    return sum(x ** 2 for x in chunk)

data = [range(0, 1000000), range(1000000, 2000000)]
with ProcessPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(process_data, data))
```

### C# Task Parallel Library

```csharp
public class WorkerPool
{
    public async Task ProcessBatchAsync(IEnumerable<string> items)
    {
        var semaphore = new SemaphoreSlim(10);

        var tasks = items.Select(async item =>
        {
            await semaphore.WaitAsync();
            try { return await ProcessItemAsync(item); }
            finally { semaphore.Release(); }
        });

        var results = await Task.WhenAll(tasks);
    }

    private async Task<string> ProcessItemAsync(string item)
    {
        await Task.Delay(100);
        return $"Processed: {item}";
    }
}

ThreadPool.SetMinThreads(4, 4);
ThreadPool.SetMaxThreads(8, 8);
```

### Go Worker Pool (Goroutines + Channels)

```go
package main

import (
    "fmt"
    "sync"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs {
        results <- j * j
    }
}

func main() {
    numWorkers := 4
    jobs := make(chan int, 100)
    results := make(chan int, 100)
    var wg sync.WaitGroup

    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    for j := 1; j <= 20; j++ {
        jobs <- j
    }
    close(jobs)

    go func() {
        wg.Wait()
        close(results)
    }()

    for r := range results {
        fmt.Println("result:", r)
    }
}
```

Las goroutines de Go son ligeras (2KB de stack vs 1MB para OS threads), por lo que puedes spawnear miles. Para trabajo CPU-bound, usa `runtime.GOMAXPROCS(runtime.NumCPU())` para limitar el paralelismo. Para trabajo I/O-bound, un mayor numero de workers esta bien ya que las goroutines bloqueadas ceden a otras.

## Explicación

- **Core vs máximo pool size**: el core size es el número de threads mantenidos vivos incluso cuando están inactivos. El máximo es el límite superior. Cuando las tareas exceden el core size, nuevos threads se crean hasta el máximo. Threads por encima del core se terminan después del timeout de keep-alive si están inactivos. Esto permite al pool escalar entre una línea base y un pico.
- **Cola de trabajo**: las tareas enviadas cuando todos los threads están ocupados esperan en una cola. Una cola ilimitada (`LinkedBlockingQueue`) acepta tareas infinitas pero riesga `OutOfMemoryError`. Una cola acotada limita memoria pero requiere una política de rechazo cuando se llena.
- **Políticas de rechazo**: cuando el pool y la cola están saturados, Java ofrece cuatro políticas. `AbortPolicy` (default) lanza excepción. `CallerRunsPolicy` ejecuta la tarea en el thread del llamador, ralentizando submission. `DiscardPolicy` descarta la tarea silenciosamente. `DiscardOldestPolicy` descarta la tarea más antigua en cola.
- **Thread-per-task vs pools**: crear un thread por tarea funciona para algunas pocas docenas de operaciones concurrentes. A cientos o miles, el overhead de creación de threads domina. Los pools amortizan el costo de creación a través de la vida de la aplicación y proveen uso acotado de recursos.

## Variantes

| Tipo de pool | Core threads | Max threads | Cola | Mejor para |
|--------------|-------------|-------------|------|------------|
| Fixed | N | N | Ilimitada | Trabajo CPU steady-state |
| Cached | 0 | Ilimitado | Síncrona | Burst I/O, tareas de corta vida |
| Single | 1 | 1 | Ilimitada | Ejecución ordenada |
| Scheduled | N | N | Cola delayed | Tareas temporizadas/recurrentes |
| Work stealing | CPU count | CPU count | Deque por thread | Paralelismo fork-join |

## Lo que funciona

- **Dimensiona pools CPU al número de cores**: para trabajo CPU-bound, usa `Runtime.getRuntime().availableProcessors()` o `os.cpu_count()`. Threads adicionales solo compiten por cores, causando context switches sin ganancias de throughput. Consulta [Load Balancing](/recipes/architecture/load-balancing) para distribuir trabajo entre cores.
- **Dimensiona pools I/O más alto que core count**: para trabajo I/O-bound, los threads se bloquean en red/disco. Un thread esperando una respuesta no usa un core. Usa 2x-4x core count para pools I/O, dependiendo de latencia. Mide para encontrar el punto óptimo.
- **Siempre shutdown gracefulmente**: un executor no terminado filtra threads y previene salida del proceso JVM/Python. Llama `shutdown()`, espera terminación, luego `shutdownNow()` si es necesario. Usa try-with-resources en Python (`with ThreadPoolExecutor`).
- **Usa colas acotadas con políticas de rechazo**: las colas ilimitadas ocultan backpressure. Un sistema que acepta tareas infinitas eventualmente se cae. Usa colas acotadas y maneja rechazo sheddando carga o ralentizando al submitter. Consulta [Rate Limiting](/recipes/api/rate-limiting) para gestionar sobrecarga.
- **Nombra tus threads**: debuggear un thread dump de 50 threads sin nombre es imposible. Usa thread factories custom para nombrar threads (`worker-1`, `worker-2`). Esto hace profiling, logging y debugging triviales.
- **Monitorea metricas del pool**: rastrea threads activos, tamano de cola, tareas completadas y conteo de rechazos. `ThreadPoolExecutor` de Java expone estos via getters. En Python, envuelve el executor para rastrear submissions y completions. Alerta cuando la profundidad de cola excede un umbral.
- **Usa `shutdownNow()` con cuidado**: `shutdownNow()` interrumpe threads en ejecucion. Si tus tareas no chequean `Thread.interrupted()` o manejan `InterruptedException`, continuaran ejecutandose. Disena tareas cooperativas y responsivas a interrupcion.

## Errores comunes

- **Bloquear al llamador con `Future.get()` sin timeout**: `future.get()` espera indefinidamente. Si el worker thread se cuelga (loop infinito, deadlock), el llamador se cuelga para siempre. Siempre usa `future.get(timeout, TimeUnit.SECONDS)`.
- **Usar threads para trabajo CPU-bound en Python**: el GIL de Python previene paralelismo real de threads para trabajo CPU. Un `ThreadPoolExecutor` con 8 threads en una máquina de 8 cores ejecuta tareas secuencialmente, no en paralelo. Usa `ProcessPoolExecutor` para trabajo CPU-bound en Python.
- **Ignorar excepciones en tareas fire-and-forget**: enviar una tarea e ignorar el future traga excepciones. La tarea falla silenciosamente. Siempre captura futures y chequea excepciones, o usa un callback de completación.
- **Crear un nuevo pool por request**: un web handler que crea un nuevo `ExecutorService` para cada request entrante derrota el propósito. Crea un pool en el startup de la aplicación y reutilízalo. Pásalo como dependencia a los handlers.
- **Compartir un solo pool entre workloads no relacionados**: las tareas CPU-bound e I/O-bound tienen diferentes tamaños óptimos de pool. Si comparten un pool, un workload priva al otro. Usa pools separados por tipo de workload.
- **No manejar `RejectedExecutionException`**: cuando usas `AbortPolicy`, el pool lanza `RejectedExecutionException` bajo sobrecarga. Si no lo capturas, la excepción propaga y puede crashear al llamador. Captúralo y degrada gracefulmente.

## Preguntas frecuentes

**P: ¿Cuántos threads debería tener mi pool?**
R: Para tareas CPU-bound: igual al número de cores. Para tareas I/O-bound: `cores * (1 + wait_time / compute_time)`. Si una tarea pasa 50ms computando y 450ms esperando, usa `cores * 10`. Mide y ajusta basado en throughput y latencia. Consulta [Estructuras de Datos Concurrentes](/recipes/concurrency/concurrent-data-structures) para coordinación de estado compartido.

**P: ¿Cuál es la diferencia entre un thread pool y un coroutine pool?**
R: Los thread pools usan OS threads — costosos pero verdaderamente paralelos. Los coroutine pools (asyncio, Goroutines) usan threads ligeros de user-space — baratos pero limitados por el GIL en Python. Usa threads para paralelismo CPU e I/O bloqueante. Usa coroutines para I/O de alta concurrencia con bajo overhead por tarea.

**P: ¿Debería usar `CallerRunsPolicy` o `AbortPolicy`?**
R: `CallerRunsPolicy` provee backpressure natural — el llamador se ralentiza cuando el sistema está sobrecargado. `AbortPolicy` te fuerza a manejar rechazo explícitamente. Usa `CallerRunsPolicy` para procesamiento batch donde ralentizarse es aceptable. Usa `AbortPolicy` para sistemas interactivos donde necesitas retornar errores rápidamente.

**P: ¿Puedo cambiar el tamaño del pool en runtime?**
R: Sí — `ThreadPoolExecutor` de Java soporta `setCorePoolSize()` y `setMaximumPoolSize()`. Esto es útil para scaling en vivo basado en métricas de carga. Sin embargo, crecer el pool crea nuevos threads (costoso), y reducir no interrumpe threads activos.

**P: ¿Cómo pruebo el comportamiento de un thread pool?**
R: Usa `CountDownLatch` o `CyclicBarrier` para simular submissions concurrentes. Para testing de rechazo, envía más tareas de las que la cola puede contener y verifica que la política de rechazo dispare. Para testing de timeout, envía una tarea que duerma más que el timeout y verifica que `TimeoutException` se lance.

**P: ¿Qué pasa si un worker thread lanza una excepción no capturada?**
R: En Java, la excepción es capturada por el `Future` y relanzada en `get()`. Sin llamar `get()`, la excepción es tragada. En Python, las excepciones se almacenan en el `Future` y se relanzan en `result()`. Siempre llama `result()` o `get()` para surfacer fallos. Alternativamente, usa el hook `afterExecute` en Java para loggear excepciones.

**P: ¿Debería usar `newFixedThreadPool` o `new ThreadPoolExecutor`?**
R: `newFixedThreadPool` usa una cola ilimitada, lo que significa que las tareas nunca se rechazan — solo se acumulan hasta que la memoria se agota. Para producción, siempre usa `new ThreadPoolExecutor` con una cola acotada y política de rechazo explícita. Los métodos de conveniencia están bien para tests y prototipos.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cómo manejo deadlocks en thread pools?

Los deadlocks ocurren cuando tareas esperan por resultados de otras tareas que no pueden ejecutarse. Para prevenirlos: nunca envíes una tarea desde dentro de otra tarea del mismo pool y esperes su resultado. Usa pools separados para tareas anidadas, o usa `CompletableFuture` con composición en lugar de bloqueo.

### ¿Qué bibliotecas recomiendadas para thread pools en cada lenguaje?

En Java, `java.util.concurrent` es el estándar. En Python, `concurrent.futures` viene incluido. Para uso avanzado, considera `uvloop` con `asyncio` para I/O de alta concurrencia. En Go, las goroutines y channels son nativos. En C#, la Task Parallel Library (TPL) viene con el framework. Para casos especiales, considera bibliotecas como `akka` (Java/Scala) para actores.

### ¿Cuál es la diferencia entre Fixed y Cached thread pool?

`FixedThreadPool` mantiene un número fijo de threads con una cola ilimitada. Es ideal para trabajo CPU-bound estable. `CachedThreadPool` crea threads bajo demanda (hasta Integer.MAX_VALUE) y los recicla después de 60 segundos de inactividad. Es mejor para burst I/O con tareas de corta duración. Nunca uses `CachedThreadPool` para trabajo CPU-bound porque puede crear miles de threads y agotar memoria.

### ¿Cómo implemento backpressure con thread pools?

El backpressure ocurre cuando el productor envía tareas más rápido de lo que el pool puede procesarlas. Tres estrategias: (1) `CallerRunsPolicy` — el thread del llamador ejecuta la tarea, ralentizando la submission. (2) Cola acotada con `AbortPolicy` — rechaza tareas y el llamador debe manejar el rechazo. (3) Semaphore — el llamador adquiere un permiso antes de enviar, bloqueando si no hay permisos disponibles.

### ¿Cómo monitoreo la salud de un thread pool en producción?

Registra métricas clave: tamaño actual del pool, tareas activas, tareas en cola, tareas completadas y rechazos. En Java, usa JMX o Micrometer para exponer estas métricas. En Python, usa `concurrent.futures` con callbacks de monitoreo. Configura alertas para rechazos sostenidos o crecimiento de cola, que indican saturación.

### ¿Cómo elijo el tamaño óptimo del pool?

Para tareas CPU-bound, usa la fórmula de Brian Goetz: `N_threads = N_cores * (1 + W/C)` donde W es el tiempo de espera y C es el tiempo de cómputo. Para tareas puramente CPU-bound, W/C ≈ 0, así que `N_threads = N_cores`. Para tareas I/O-bound, W/C puede ser 10-50, resultando en pools mucho más grandes. Mide el ratio real con un profiler antes de ajustar.
