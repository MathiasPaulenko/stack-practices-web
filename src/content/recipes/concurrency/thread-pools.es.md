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
  - thread-pools
  - executors
  - concurrency
  - worker-threads
  - rejection-policy
  - java-executors
  - parallelism
  - cpu-bound
relatedResources:
  - /recipes/async-patterns
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/serverless-functions
lastUpdated: "2026-06-14"
author: "StackPractices"
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

El desafío es dimensionar el pool correctamente y manejar sobrecarga. Una tarea CPU-bound en una máquina de 8 cores se beneficia de 8 threads — más threads solo compiten por cores. Una tarea I/O-bound se beneficia de más threads que cores porque los threads pasan la mayor parte del tiempo esperando disco o red. Cuando la cola se llena, el pool debe decidir si rechazar tareas, bloquear al submitter, o ejecutarlas en el thread del llamador. Esta receta cubre dimensionamiento de pools, patrones de executors y estrategias de rechazo en Java, Python y C#.

## Cuándo usarlo

Usa esta receta cuando:

- Procesando un alto volumen de tareas independientes concurrentemente
- Ejecutando computaciones CPU-bound (procesamiento de imágenes, transformación de datos, inferencia ML)
- Ejecutando operaciones I/O-bound donde los threads pasan tiempo esperando (llamadas API, lecturas de archivo)
- Limitando uso de recursos para prevenir agotamiento de threads o presión de memoria
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

## Mejores prácticas

- **Dimensiona pools CPU al número de cores**: para trabajo CPU-bound, usa `Runtime.getRuntime().availableProcessors()` o `os.cpu_count()`. Threads adicionales solo compiten por cores, causando context switches sin ganancias de throughput.
- **Dimensiona pools I/O más alto que core count**: para trabajo I/O-bound, los threads se bloquean en red/disco. Un thread esperando una respuesta no usa un core. Usa 2x-4x core count para pools I/O, dependiendo de latencia. Mide para encontrar el punto óptimo.
- **Siempre shutdown gracefulmente**: un executor no terminado filtra threads y previene salida del proceso JVM/Python. Llama `shutdown()`, espera terminación, luego `shutdownNow()` si es necesario. Usa try-with-resources en Python (`with ThreadPoolExecutor`).
- **Usa colas acotadas con políticas de rechazo**: las colas ilimitadas ocultan backpressure. Un sistema que acepta tareas infinitas eventualmente se cae. Usa colas acotadas y maneja rechazo sheddando carga (retorna 503) o ralentizando al submitter.
- **Nombra tus threads**: debuggear un thread dump de 50 threads sin nombre es imposible. Usa thread factories custom para nombrar threads (`worker-1`, `worker-2`). Esto hace profiling, logging y debugging triviales.

## Errores comunes

- **Bloquear al llamador con `Future.get()` sin timeout**: `future.get()` espera indefinidamente. Si el worker thread se cuelga (loop infinito, deadlock), el llamador se cuelga para siempre. Siempre usa `future.get(timeout, TimeUnit.SECONDS)`.
- **Usar threads para trabajo CPU-bound en Python**: el GIL de Python previene paralelismo real de threads para trabajo CPU. Un `ThreadPoolExecutor` con 8 threads en una máquina de 8 cores ejecuta tareas secuencialmente, no en paralelo. Usa `ProcessPoolExecutor` para trabajo CPU-bound en Python.
- **Ignorar excepciones en tareas fire-and-forget**: enviar una tarea e ignorar el future traga excepciones. La tarea falla silenciosamente. Siempre captura futures y chequea excepciones, o usa un callback de completación.
- **Crear un nuevo pool por request**: un web handler que crea un nuevo `ExecutorService` para cada request entrante derrota el propósito. Crea un pool en el startup de la aplicación y reutilízalo. Pásalo como dependencia a los handlers.

## Preguntas frecuentes

**P: ¿Cuántos threads debería tener mi pool?**
R: Para tareas CPU-bound: igual al número de cores. Para tareas I/O-bound: `cores * (1 + wait_time / compute_time)`. Si una tarea pasa 50ms computando y 450ms esperando, usa `cores * 10`. Mide y ajusta basado en throughput y latencia.

**P: ¿Cuál es la diferencia entre un thread pool y un coroutine pool?**
R: Los thread pools usan OS threads — costosos pero verdaderamente paralelos. Los coroutine pools (asyncio, Goroutines) usan threads ligeros de user-space — baratos pero limitados por el GIL en Python. Usa threads para paralelismo CPU e I/O bloqueante. Usa coroutines para I/O de alta concurrencia con bajo overhead por tarea.

**P: ¿Debería usar `CallerRunsPolicy` o `AbortPolicy`?**
R: `CallerRunsPolicy` provee backpressure natural — el llamador se ralentiza cuando el sistema está sobrecargado. `AbortPolicy` te fuerza a manejar rechazo explícitamente. Usa `CallerRunsPolicy` para procesamiento batch donde ralentizarse es aceptable. Usa `AbortPolicy` para sistemas interactivos donde necesitas retornar errores rápidamente.

**P: ¿Puedo cambiar el tamaño del pool en runtime?**
R: Sí — `ThreadPoolExecutor` de Java soporta `setCorePoolSize()` y `setMaximumPoolSize()`. Esto es útil para scaling dinámico basado en métricas de carga. Sin embargo, crecer el pool crea nuevos threads (costoso), y reducir no interrumpe threads activos.

