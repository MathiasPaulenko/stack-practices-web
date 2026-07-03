---
contentType: recipes
slug: java-virtual-threads-project-loom
title: "Escalar Aplicaciones Concurrentes con Java Virtual Threads"
description: "Escalar aplicaciones Java con virtual threads de Project Loom. Usar Thread.ofVirtual, Executors.newVirtualThreadPerTaskExecutor, concurrencia estructurada y scoped values."
metaDescription: "Escala apps Java con virtual threads de Project Loom. Usa Thread.ofVirtual, concurrencia estructurada y scoped values para millones de threads."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - architecture
tags:
  - java
  - virtual-threads
  - loom
  - jdk-21
  - concurrency
relatedResources:
  - /recipes/concurrency/java-completable-future-composition
  - /recipes/concurrency/go-goroutines-channels-patterns
  - /guides/complete-guide-concurrency-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Escala apps Java con virtual threads de Project Loom. Usa Thread.ofVirtual, concurrencia estructurada y scoped values para millones de threads."
  keywords:
    - java virtual threads
    - project loom
    - jdk 21 concurrency
    - structured concurrency java
    - java lightweight threads
---

## Descripcion general

Los virtual threads, introducidos como preview en Java 19 y finalizados en Java 21, son threads ligeros gestionados por la JVM en lugar del OS. Permiten escribir codigo bloqueante sencillo que escala a millones de operaciones concurrentes. Esta receta cubre creacion de virtual threads, executors de virtual threads, concurrencia estructurada con `StructuredTaskScope` y scoped values como alternativa a ThreadLocal.

## Cuando Usar Esto

- Aplicaciones servidor de alto throughput que manejan muchas requests concurrentes
- Workloads I/O-heavy donde operaciones bloqueantes dominan
- Reemplazar codigo async/reactivo complejo con codigo bloqueante mas simple
- Aplicaciones limitadas actualmente por el tamano del pool de platform threads

## Prerrequisitos

- Java 21+ (JDK con virtual threads finalizados)
- `--enable-preview` para features de concurrencia estructurada (Java 21 preview)

## Solucion

### 1. Virtual Thread Basico

```java
import java.time.Duration;
import java.util.concurrent.TimeUnit;

public class BasicVirtualThread {
    public static void main(String[] args) throws InterruptedException {
        // Crear e iniciar un virtual thread
        Thread vt = Thread.ofVirtual().name("my-virtual-thread").start(() -> {
            System.out.println("Running in: " + Thread.currentThread());
            System.out.println("Is virtual: " + Thread.currentThread().isVirtual());
        });

        vt.join();
        System.out.println("Virtual thread completed");
    }
}
```

### 2. Executor de Virtual Thread por Task

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

public class VirtualThreadExecutor {
    public static void main(String[] args) throws InterruptedException {
        // Un virtual thread por task — no se necesita pooling
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {

            // Submit 10,000 tasks
            IntStream.range(0, 10_000).forEach(i -> {
                executor.submit(() -> {
                    try {
                        TimeUnit.MILLISECONDS.sleep(100);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return i * 2;
                });
            });

            // Esperar todas las tasks
            executor.shutdown();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }

        System.out.println("All 10,000 virtual threads completed");
    }
}
```

### 3. I/O Bloqueante con Virtual Threads

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.List;
import java.util.ArrayList;

public class VirtualThreadIO {
    private static final HttpClient client = HttpClient.newBuilder()
        .build();

    public static String fetch(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        return response.body();
    }

    public static void main(String[] args) throws Exception {
        List<String> urls = List.of(
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/2",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/3",
            "https://httpbin.org/delay/1"
        );

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<java.util.concurrent.Future<String>> futures = new ArrayList<>();

            for (String url : urls) {
                futures.add(executor.submit(() -> fetch(url)));
            }

            // Todos los fetches se ejecutan concurrentemente — cada uno en su virtual thread
            // Tiempo total ~3s (max delay), no 8s (suma de delays)
            long start = System.currentTimeMillis();
            for (java.util.concurrent.Future<String> f : futures) {
                String body = f.get();
                System.out.println("Fetched " + body.length() + " bytes");
            }
            long elapsed = System.currentTimeMillis() - start;
            System.out.println("Total time: " + elapsed + "ms");
        }
    }
}
```

### 4. Concurrencia Estructurada con StructuredTaskScope

```java
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.ShutdownOnFailure;
import java.util.concurrent.StructuredTaskScope.Subtask;
import java.util.concurrent.ExecutionException;

public class StructuredConcurrency {
    record User(String name, String email) {}
    record Order(String id, double total) {}
    record UserOrder(User user, Order order) {}

    static User fetchUser(String userId) throws Exception {
        Thread.sleep(100);
        return new User("Alice", "alice@example.com");
    }

    static Order fetchOrder(String orderId) throws Exception {
        Thread.sleep(150);
        return new Order("ord-123", 99.99);
    }

    public static void main(String[] args) throws Exception {
        // ShutdownOnFailure: si cualquier subtask falla, cancela todas
        try (var scope = new ShutdownOnFailure()) {

            Subtask<User> userTask = scope.fork(() -> fetchUser("u1"));
            Subtask<Order> orderTask = scope.fork(() -> fetchOrder("o1"));

            scope.join();          // Esperar todas las subtasks
            scope.throwIfFailed(); // Propagar primer error si hay

            // Ambas completaron exitosamente
            UserOrder result = new UserOrder(userTask.get(), orderTask.get());
            System.out.println("Result: " + result);

        } catch (ExecutionException e) {
            System.err.println("A subtask failed: " + e.getCause());
        }
    }
}
```

### 5. ShutdownOnSuccess — Primer Resultado Gana

```java
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.ShutdownOnSuccess;
import java.util.concurrent.Subtask;

public class FirstResultPattern {
    static String fetchFromReplica(String replicaUrl) throws Exception {
        Thread.sleep((long) (Math.random() * 500));
        return "Data from " + replicaUrl;
    }

    public static void main(String[] args) throws Exception {
        // ShutdownOnSuccess: cancela todas cuando la primera tiene exito
        try (var scope = new ShutdownOnSuccess<String>()) {

            scope.fork(() -> fetchFromReplica("replica-1"));
            scope.fork(() -> fetchFromReplica("replica-2"));
            scope.fork(() -> fetchFromReplica("replica-3"));

            scope.join();

            // Obtener el primer resultado
            String result = scope.result();
            System.out.println("First response: " + result);
        }
    }
}
```

### 6. Scoped Values — Alternativa a ThreadLocal

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScopedValue;

public class ScopedValueExample {
    // Definir un scoped value
    static final ScopedValue<String> USER_ID = ScopedValue.newInstance();
    static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

    static void handleRequest() {
        System.out.println("User: " + USER_ID.get() + ", Request: " + REQUEST_ID.get());

        // Los virtual threads heredan scoped values automaticamente
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            executor.submit(() -> {
                System.out.println("In child thread — User: " + USER_ID.get()
                    + ", Request: " + REQUEST_ID.get());
            }).get();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        // Bind scoped values por la duracion de la llamada
        ScopedValue.where(USER_ID, "user-42")
            .where(REQUEST_ID, "req-abc-123")
            .run(() -> handleRequest());
    }
}
```

### 7. Mezclar Platform y Virtual Threads

```java
import java.util.concurrent.*;

public class MixedThreads {
    static void cpuIntensiveTask(int id) {
        long result = 0;
        for (long i = 0; i < 100_000_000L; i++) {
            result += i;
        }
        System.out.println("CPU task " + id + " result: " + result);
    }

    static void ioTask(int id) throws InterruptedException {
        Thread.sleep(500);
        System.out.println("IO task " + id + " done");
    }

    public static void main(String[] args) throws InterruptedException {
        // Tasks CPU-bound en platform threads (pool fijo)
        try (ExecutorService cpuPool = Executors.newFixedThreadPool(4)) {

            // Tasks I/O-bound en virtual threads
            try (ExecutorService ioPool = Executors.newVirtualThreadPerTaskExecutor()) {

                for (int i = 0; i < 4; i++) {
                    final int id = i;
                    cpuPool.submit(() -> cpuIntensiveTask(id));
                    ioPool.submit(() -> ioTask(id));
                }

                cpuPool.shutdown();
                ioPool.shutdown();
                cpuPool.awaitTermination(10, TimeUnit.SECONDS);
                ioPool.awaitTermination(10, TimeUnit.SECONDS);
            }
        }

        System.out.println("All tasks completed");
    }
}
```

### 8. Bloques Synchronized y Pinning

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class PinningExample {
    // ReentrantLock NO pinea virtual threads
    private static final ReentrantLock lock = new ReentrantLock();
    private static int counter = 0;

    // bloques synchronized PUEDEN pinear virtual threads en Java 21
    // Usa ReentrantLock para locking compatible con virtual threads

    public static void main(String[] args) throws InterruptedException {
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1000; i++) {
                executor.submit(() -> {
                    lock.lock();
                    try {
                        counter++;
                    } finally {
                        lock.unlock();
                    }
                });
            }

            executor.shutdown();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }

        System.out.println("Counter: " + counter);
    }
}
```

## Como Funciona

1. **Virtual Threads**: Gestionados por la JVM, no el OS. Son baratos de crear (~cientos de bytes vs ~1MB para platform threads) y pueden llegar a millones. Cuando un virtual thread bloquea en I/O, la JVM lo desmonta del carrier thread y monta otro virtual thread.
2. **Carrier Threads**: Los virtual threads se ejecutan en carrier threads (platform threads del ForkJoinPool). La JVM multiplexa virtual threads en un numero pequeno de carriers (~numero de CPUs). Operaciones bloqueantes ceden el carrier.
3. **`newVirtualThreadPerTaskExecutor`**: Crea un nuevo virtual thread para cada task enviada. No se necesita pooling — los virtual threads son baratos. El executor se cierra cuando el bloque try-with-resources termina.
4. **`StructuredTaskScope`**: Proporciona concurrencia estructurada. `ShutdownOnFailure` cancela todas las subtasks si una falla. `ShutdownOnSuccess` cancela todas cuando la primera tiene exito. `join()` espera a que todas las subtasks completen.
5. **`ScopedValue`**: Una alternativa moderna a `ThreadLocal`. Los valores se asocian por la duracion de una llamada `run()` y se heredan automaticamente por virtual threads hijos. Son inmutables dentro de su scope y se limpian automaticamente.
6. **Pinning**: Un virtual thread se "pinea" a su carrier cuando bloquea dentro de un bloque `synchronized` o metodo nativo. Los threads pineados no pueden ceder el carrier, reduciendo throughput. Usa `ReentrantLock` en lugar de `synchronized` para evitar pinning.

## Variantes

### Thread Builder Personalizado

```java
Thread.Builder builder = Thread.ofVirtual()
    .name("worker-", 0) // Prefijo + contador
    .uncaughtExceptionHandler((t, e) -> {
        System.err.println("Uncaught in " + t.getName() + ": " + e);
    });

Thread t = builder.start(() -> {
    System.out.println("Running in " + Thread.currentThread().getName());
});
t.join();
```

### Semaforo para Concurrencia Limitada

```java
import java.util.concurrent.*;

public class BoundedVirtualThreads {
    public static void main(String[] args) throws InterruptedException {
        Semaphore semaphore = new Semaphore(10); // Max 10 concurrentes

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 100; i++) {
                final int id = i;
                executor.submit(() -> {
                    semaphore.acquire();
                    try {
                        Thread.sleep(100);
                        System.out.println("Task " + id + " done");
                    } finally {
                        semaphore.release();
                    }
                });
            }
            executor.shutdown();
            executor.awaitTermination(30, TimeUnit.SECONDS);
        }
    }
}
```

### StructuredTaskScope Anidado

```java
try (var outer = new StructuredTaskScope.ShutdownOnFailure()) {
    var dataTask = outer.fork(() -> fetchData());

    try (var inner = new StructuredTaskScope.ShutdownOnFailure()) {
        var enrichTask = inner.fork(() -> enrichData());
        inner.join();
        inner.throwIfFailed();
    }

    outer.join();
    outer.throwIfFailed();
    System.out.println("All done: " + dataTask.get());
}
```

## Mejores Practicas

- **Usar `newVirtualThreadPerTaskExecutor` para trabajo I/O**: Los virtual threads destacan en tasks I/O-bound. No los poolees — crea uno por task.
- **Usar `ReentrantLock` sobre `synchronized`**: Los bloques `synchronized` pinean virtual threads a carrier threads. `ReentrantLock` permite desmontar durante bloqueo.
- **No poolear virtual threads**: Los virtual threads son baratos de crear y desechar. Poolear agrega overhead y complejidad. Usa uno-por-task.
- **Usar platform threads para trabajo CPU-bound**: Los virtual threads no ayudan con tasks CPU-bound — siguen ocupando un carrier thread. Usa un pool fijo del tamano de cores de CPU.
- **Usar `StructuredTaskScope` para subtasks relacionadas**: Asegura que las subtasks se esperen y cancelen juntas, previniendo leaks.
- **Preferir `ScopedValue` sobre `ThreadLocal`**: `ScopedValue` es mas seguro (inmutable, vida limitada) y funciona correctamente con virtual threads.

## Errores Comunes

- **Usar `synchronized` con virtual threads**: `synchronized` pinea el virtual thread a su carrier, impidiendo desmontar. Reemplaza con `ReentrantLock`.
- **Poolear virtual threads**: Los virtual threads no estan hechos para poolearse. Crear un pool derrocha su proposito y agrega overhead innecesario.
- **Ejecutar trabajo CPU-bound en virtual threads**: El trabajo CPU-bound bloquea el carrier thread. Usa platform threads con un pool fijo del tamano de cores de CPU.
- **No manejar `InterruptedException`**: Los virtual threads pueden ser interrumpidos. Siempre maneja `InterruptedException` y restaura el interrupt flag con `Thread.currentThread().interrupt()`.
- **Usar `ThreadLocal` con virtual threads**: `ThreadLocal` puede leakar memoria con millones de threads. Usa `ScopedValue` — tiene vida limitada y cleanup automatico.

## FAQ

**Cual es la diferencia entre virtual threads y platform threads?**

Los platform threads son wrappers delgados de OS threads (~1MB de stack cada uno). Los virtual threads son gestionados por la JVM (~cientos de bytes) y pueden llegar a millones. Los virtual threads ceden su carrier cuando bloquean en I/O.

**Puedo usar virtual threads con Spring Boot?**

Si. Spring Boot 3.2+ soporta virtual threads. Establece `spring.threads.virtual.enabled=true` en `application.properties` y Tomcat usara virtual threads para manejo de requests.

**Los virtual threads reemplazan CompletableFuture?**

No enteramente. Los virtual threads simplifican codigo estilo bloqueante. `CompletableFuture` sigue siendo util para componer pipelines async. Usa virtual threads cuando el codigo bloqueante es mas simple y legible que la composicion async.

**Que es pinning y por que importa?**

Pinning ocurre cuando un virtual thread no puede desmontarse de su carrier — tipicamente dentro de bloques `synchronized` o metodos nativos. Los threads pineados bloquean el carrier, reduciendo throughput. Usa `ReentrantLock` para evitar pinning.

**Cuantos virtual threads puedo crear?**

Practicamente, millones. El limite es la memoria del heap. Cada virtual thread usa ~200-400 bytes. 1 millon de virtual threads usan ~200-400MB. La JVM los multiplexa en un numero pequeno de carrier threads.
