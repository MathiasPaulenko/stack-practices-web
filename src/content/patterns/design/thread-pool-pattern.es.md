---




contentType: patterns
slug: thread-pool-pattern
title: "Patrón Thread Pool"
description: "Reutilizar un conjunto fijo de threads para tareas cortas en lugar de crear un thread por tarea. Reduce overhead y limita el uso de recursos bajo carga."
metaDescription: "Reutilizar un conjunto fijo de threads para tareas cortas. Reduce overhead de creacion y limita el uso de recursos bajo carga con un thread pool."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - thread-pool
  - patron
  - patron-diseno
  - concurrency
  - thread-reuse
  - resource-bounding
  - executor
relatedResources:
  - /patterns/producer-consumer-pattern
  - /patterns/actor-model-pattern
  - /patterns/reactive-streams-pattern
  - /patterns/async-generator-pattern
  - /patterns/lock-free-queue-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Reutilizar un conjunto fijo de threads para tareas cortas. Reduce overhead de creacion y limita el uso de recursos bajo carga con un thread pool."
  keywords:
    - patron thread pool
    - reutilizacion threads concurrencia
    - executor service patron
    - patron diseno




---

## Descripción General

Crear un thread es costoso. Cada thread asigna un stack (tipicamente 1MB), requiere setup a nivel kernel y anade overhead de scheduling. Cuando las tareas son cortas y frecuentes, crear un thread por tarea desperdicia recursos y puede agotar memoria bajo carga. El patron Thread Pool mantiene un conjunto fijo de threads trabajadores que toman tareas de una cola. Las tareas se envian al pool y las ejecuta el siguiente thread disponible.

## Cuándo Usar


- For alternatives, see [Actor Model Pattern](/es/patterns/actor-model-pattern/).

- Tienes muchas tareas cortas que se ejecutan concurrentemente
- Crear un thread por tarea es demasiado costoso (alto throughput, corta duracion)
- Necesitas limitar el numero de threads concurrentes para proteger recursos
- Quieres controlar el comportamiento de encolado cuando todos los threads estan ocupados

## Solución

### Python (concurrent.futures)

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import requests

def fetch_url(url):
    response = requests.get(url, timeout=5)
    return {"url": url, "status": response.status_code, "length": len(response.content)}

urls = [
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/2",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/3",
    "https://httpbin.org/delay/1",
]

# Pool con 3 threads: maximo 3 peticiones concurrentes
with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(fetch_url, url): url for url in urls}

    for future in as_completed(futures):
        url = futures[future]
        try:
            result = future.result()
            print(f"{result['url']}: {result['status']} ({result['length']} bytes)")
        except Exception as e:
            print(f"{url}: FAILED - {e}")
```

### JavaScript (workerpool — Node.js)

```javascript
import workerpool from "workerpool";

// worker.js — se ejecuta en un thread separado
workerpool.worker({
  fetchUrl(url) {
    return fetch(url)
      .then((res) => res.text())
      .then((text) => ({ url, length: text.length }));
  },
});

// main.js
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);

const pool = workerpool.pool(path.join(path.dirname(__filename), "worker.js"), {
  minWorkers: 2,
  maxWorkers: 4,
});

const urls = [
  "https://httpbin.org/delay/1",
  "https://httpbin.org/delay/2",
  "https://httpbin.org/delay/1",
  "https://httpbin.org/delay/3",
  "https://httpbin.org/delay/1",
];

async function fetchAll() {
  const promises = urls.map((url) => pool.exec("fetchUrl", [url]));
  const results = await Promise.all(promises);
  results.forEach((r) => console.log(`${r.url}: ${r.length} bytes`));
  await pool.terminate();
}

fetchAll();
```

### Java (ExecutorService)

```java
import java.util.concurrent.*;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.URI;
import java.net.http.HttpResponse;

public class ThreadPoolExample {

    private static final HttpClient client = HttpClient.newHttpClient();

    public static String fetchUrl(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(5))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return url + ": " + response.statusCode() + " (" + response.body().length() + " bytes)";
    }

    public static void main(String[] args) throws Exception {
        String[] urls = {
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/2",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/3",
            "https://httpbin.org/delay/1"
        };

        // Pool con 3 threads
        ExecutorService pool = Executors.newFixedThreadPool(3);
        List<Future<String>> futures = new ArrayList<>();

        for (String url : urls) {
            futures.add(pool.submit(() -> fetchUrl(url)));
        }

        for (Future<String> future : futures) {
            try {
                System.out.println(future.get(10, TimeUnit.SECONDS));
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
            }
        }

        pool.shutdown();
    }
}
```

## Explicación

El thread pool pre-crea un numero fijo de threads trabajadores. Cuando se envia una tarea, va a una cola de trabajo. Cada thread ocioso toma la siguiente tarea de la cola y la ejecuta. Cuando la tarea completa, el thread vuelve al pool y toma la siguiente tarea.

Esto da tres beneficios:

1. **Sin overhead de creacion de threads**: Los threads se crean una vez al iniciar el pool y se reutilizan
2. **Recursos limitados**: El tamano del pool limita cuantos threads se ejecutan concurrentemente, previniendo agotamiento de memoria
3. **Backpressure**: Cuando todos los threads estan ocupados, las nuevas tareas se encolan en lugar de generar threads sin limite

El tamano del pool es el parametro clave. Tareas CPU-bound deberian tener tantos threads como cores de CPU. Tareas I/O-bound pueden tener mas threads ya que pasan tiempo esperando.

## Variantes

| Variante | Tipo de Pool | Caso de Uso | Compromiso |
|----------|-------------|-------------|------------|
| **Pool Fijo** | N threads, cola sin limite | Carga predecible | La cola puede crecer sin limite |
| **Pool Cacheado** | 0 a N threads, SynchronousQueue | Tareas cortas y muchas | Creacion de threads sin limite |
| **Pool Programado** | N threads, cola con delay | Tareas periodicas y diferidas | Scheduling mas complejo |
| **Pool Limitado** | N threads, cola limitada | Seguro para memoria bajo carga | Rechazo cuando la cola se llena |
| **Work Stealing** | Colas por thread con robo | Tareas recursivas fork-join | Mas overhead, complejo |

## Qué Funciona

- Dimensiona el pool al workload: CPU-bound = numero de cores, I/O-bound = mayor
- Usa una cola limitada para prevenir agotamiento de memoria bajo carga
- Establece una politica de rechazo (abort, caller-runs, discard) para cuando la cola se llena
- Nombra los threads del pool para debugging y analisis de thread dumps
- Siempre cierra el pool en bloques finally o try-with-resources
- Monitorea metricas del pool: threads activos, profundidad de cola, latencia de tareas
- Usa un pool compartido para la aplicacion en lugar de crear pools por peticion

## Errores Comunes

- **Pool demasiado grande**: Muchos threads causan overhead de context-switching y desperdicio de memoria. Mas threads no significa mas rapido.
- **Pool demasiado pequeño**: Las tareas se encolan y la latencia aumenta. Para tareas I/O, un pool pequeño limita el throughput.
- **Cola sin limite**: Las tareas se acumulan en memoria cuando los productores son mas rapidos que los consumidores. Usa una cola limitada.
- **Tareas bloqueantes en el pool**: Una tarea que bloquea indefinidamente (loop infinito, deadlock) ocupa un thread para siempre. Establece timeouts.
- **No cerrar el pool**: Los threads siguen ejecutando y la JVM no termina. Siempre llama `shutdown()`.
- **Usar threads del pool para tareas largas**: Las tareas largas privan de recursos a otras tareas. Muevelas a un pool separado.

## Preguntas Frecuentes

### ¿Cómo elijo el tamaño correcto del pool?

Para tareas CPU-bound: `poolSize = Runtime.getRuntime().availableProcessors()`. Para tareas I/O-bound: `poolSize = N * U * (1 + W/C)` donde N = cores, U = utilizacion objetivo, W = tiempo de espera, C = tiempo de computo. En practica, 2-10x cores para tareas I/O.

### ¿Qué pasa cuando la cola se llena?

Con cola sin limite (default en `Executors.newFixedThreadPool` de Java), las tareas se acumulan hasta agotar memoria. Con cola limitada, la politica de rechazo se activa: `AbortPolicy` lanza excepcion, `CallerRunsPolicy` ejecuta la tarea en el thread que la envio, `DiscardPolicy` la descarta silenciosamente.

### ¿Debería usar thread pool o virtual threads?

Los virtual threads de Java 21+ son ideales para tareas I/O-bound con alta concurrencia. No necesitan pooling porque son baratos de crear. Usa thread pool para tareas CPU-bound donde necesitas limitar el paralelismo.

### ¿Puedo compartir un thread pool entre componentes?

Si, y es recomendado. Crear pools por peticion o por componente desperdicia recursos. Usa un pool unico para toda la aplicacion o un numero pequeño de pools proposito-especificos (ej. uno para CPU, uno para I/O).

### ¿Cómo manejo excepciones en tareas del pool?

Las excepciones lanzadas por tareas son capturadas por el pool y envueltas en el `Future`. Llama `future.get()` para recuperar la excepcion. Para tareas fire-and-forget, instala un `UncaughtExceptionHandler` o usa `afterExecute` en un `ThreadPoolExecutor` custom.


## Temas Avanzados

### Escenario: Thread Pool para Tareas CPU-Intensivas

```typescript
// Thread pool pattern: reutilizar threads para trabajo CPU-intensivo
import { Worker } from "worker_threads";

class ThreadPool {
  private workers: Worker[] = [];
  private taskQueue: { task: unknown; resolve: Function; reject: Function }[] = [];
  private idleWorkers: number[] = [];
  private busy = new Set<number>();

  constructor(private size: number, private workerFile: string) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerFile);
      const workerId = i;
      worker.on("message", (result) => {
        this.busy.delete(workerId);
        this.idleWorkers.push(workerId);
        const task = this.taskQueue.shift();
        if (task) task.resolve(result);
        this.processQueue();
      });
      worker.on("error", (err) => {
        this.busy.delete(workerId);
        this.idleWorkers.push(workerId);
        this.processQueue();
      });
      this.workers.push(worker);
      this.idleWorkers.push(i);
    }
  }

  submit<T>(task: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.idleWorkers.length > 0 && this.taskQueue.length > 0) {
      const workerId = this.idleWorkers.shift()!;
      const { task } = this.taskQueue.shift()!;
      this.busy.add(workerId);
      this.workers[workerId].postMessage(task);
    }
  }

  async shutdown() {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}

// Uso: procesamiento de imagenes con 4 workers
const pool = new ThreadPool(4, "./image-worker.js");
const results = await Promise.all([
  pool.submit({ file: "img1.png", op: "resize", w: 800 }),
  pool.submit({ file: "img2.png", op: "resize", w: 800 }),
  pool.submit({ file: "img3.png", op: "resize", w: 800 }),
]);
await pool.shutdown();

// Tuning del tamano del pool
  | Workload | Tamano | Razon |
  |----------|--------|-------|
  | CPU-heavy | CPU cores | Un thread por core |
  | I/O-heavy | 2x CPU cores | Threads esperan en I/O |
  | Mixto | CPU cores + 2 | Balance CPU e I/O |
  | Procesamiento imagenes | CPU cores | CPU-bound |
  | Parsing archivos | 2x CPU cores | I/O + CPU |
```

Lecciones:
  - Thread pool reutiliza threads: evita overhead de creacion
  - La cola de tareas bufferiza trabajo cuando todos los threads estan ocupados
  - Tamano del pool: CPU cores para CPU-heavy, 2x para I/O-heavy
  - Siempre shutdown el pool para evitar resource leaks
  - En Node.js, usar worker_threads para tareas CPU-intensivas
  - Para I/O, usar async/await: el event loop es suficiente
```

### Cuando uso threads vs async en Node.js?

Usa worker_threads para tareas CPU-intensivas (procesamiento de imagenes, crypto, compresion, parsing de archivos grandes). El event loop es single-threaded: el trabajo CPU lo bloquea. Usa async/await para tareas I/O (DB, HTTP, lectura de archivos): el event loop maneja I/O eficientemente sin threads. Si tu tarea toma < 10ms, mantenla en el event loop. Si toma > 100ms de CPU, offloadea a un worker.
