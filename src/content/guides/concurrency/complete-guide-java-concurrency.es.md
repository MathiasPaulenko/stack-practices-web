---
contentType: guides
slug: complete-guide-java-concurrency
title: "Referencia Detallada de Concurrencia en Java"
description: "Concurrencia en Java en produccion. Cubre threads, locks, CompletableFuture, virtual threads, executors, concurrent collections, memory model y patrones para aplicaciones paralelas de alto throughput."
metaDescription: "Concurrencia Java en producción. Cubre threads, locks, CompletableFuture, virtual threads, executors, concurrent collections y memory model."
difficulty: advanced
topics:
  - concurrency
  - performance
  - testing
tags:
  - java
  - concurrency
  - guia
  - threads
  - completablefuture
  - virtual-threads
  - executors
  - locks
relatedResources:
  - /guides/concurrency/complete-guide-python-asyncio-production
  - /patterns/concurrency/async-generator-pattern
  - /patterns/resilience/bulkhead-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Concurrencia Java en producción. Cubre threads, locks, CompletableFuture, virtual threads, executors, concurrent collections y memory model."
  keywords:
    - concurrencia java
    - java threads
    - completablefuture
    - virtual threads java
    - java executors
    - java locks
    - concurrent collections
    - java memory model
---

## Introducción

Java tiene el toolkit de concurrencia mas maduro de cualquier lenguaje mainstream. Desde threads basicos hasta virtual threads (JEP 444), desde `synchronized` hasta `StampedLock`, desde `ExecutorService` hasta `CompletableFuture`, las opciones son vastas. Elegir la tool correcta para cada escenario es lo que separa codigo que funciona de codigo production-grade. Esta guia recorre el espectro completo de concurrencia en Java con patrones practicos para construir aplicaciones paralelas de alto throughput.

## Fundamentos de Threads

### Crear Threads

```java
import java.lang.Thread;

// Metodo 1: Extend Thread
class Worker extends Thread {
    @Override
    public void run() {
        System.out.println("Working in: " + Thread.currentThread().getName());
    }
}
new Worker().start();

// Metodo 2: Implement Runnable
Thread thread = new Thread(() -> {
    System.out.println("Working in: " + Thread.currentThread().getName());
});
thread.start();

// Metodo 3: ExecutorService (recomendado para produccion)
import java.util.concurrent.*;

ExecutorService executor = Executors.newFixedThreadPool(8);
executor.submit(() -> {
    System.out.println("Working in: " + Thread.currentThread().getName());
});
executor.shutdown();
```

### Lifecycle de Thread

```text
NEW → RUNNABLE → (BLOCKED / WAITING / TIMED_WAITING) → TERMINATED

NEW: Thread creado, no started
RUNNABLE: Running o ready to run
BLOCKED: Esperando un monitor lock
WAITING: Esperando indefinidamente por otro thread
TIMED_WAITING: Esperando por una duracion especificada
TERMINATED: Thread completo ejecucion
```

### Propiedades de Thread

```java
Thread thread = new Thread(() -> {
    try {
        Thread.sleep(1000);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt(); // Restaurar interrupt flag
        return;
    }
});

thread.setName("worker-1");
thread.setPriority(Thread.NORM_PRIORITY); // 1-10, default 5
thread.setDaemon(false); // Daemon threads no previenen JVM shutdown
thread.start();

// Esperar por completitud
thread.join(5000); // Esperar hasta 5 segundos
System.out.println("Thread alive: " + thread.isAlive());
```

## ExecutorService

### Elegir un Thread Pool

```java
import java.util.concurrent.*;

// Fixed pool: uso de recursos predecible
ExecutorService fixed = Executors.newFixedThreadPool(8);

// Cached pool: crece on demand, shrinks cuando idle (60s timeout)
ExecutorService cached = Executors.newCachedThreadPool();

// Single thread: ejecucion secuencial con queueing
ExecutorService single = Executors.newSingleThreadExecutor();

// Scheduled: tasks delayed y recurring
ScheduledExecutorService scheduled = Executors.newScheduledThreadPool(4);
scheduled.scheduleAtFixedRate(() -> heartbeat(), 0, 10, TimeUnit.SECONDS);
scheduled.scheduleWithFixedDelay(() -> cleanup(), 0, 60, TimeUnit.SECONDS);

// Work stealing: parallelismo adaptativo (bueno para ForkJoinTask)
ExecutorService workStealing = Executors.newWorkStealingPool();
```

### Custom Thread Pool con ThreadPoolExecutor

```java
import java.util.concurrent.*;

ThreadPoolExecutor executor = new ThreadPoolExecutor(
    4,                          // Core pool size
    16,                         // Max pool size
    60L, TimeUnit.SECONDS,      // Keep-alive para idle threads
    new LinkedBlockingQueue<>(100),  // Work queue con capacity
    new ThreadFactory() {
        private int count = 0;
        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, "pool-worker-" + count++);
            t.setDaemon(true);
            return t;
        }
    },
    new ThreadPoolExecutor.CallerRunsPolicy()  // Rejection policy
);

// Rejection policies:
// AbortPolicy: throw RejectedExecutionException (default)
// CallerRunsPolicy: correr en el thread llamador (backpressure)
// DiscardPolicy: descartar silenciosamente
// DiscardOldestPolicy: descartar task mas vieja en queue
```

### Graceful Shutdown

```java
ExecutorService executor = Executors.newFixedThreadPool(8);

// Submitir tasks
for (int i = 0; i < 100; i++) {
    executor.submit(() -> processItem(i));
}

// Graceful shutdown
executor.shutdown(); // Dejar de aceptar tasks nuevas
try {
    if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
        executor.shutdownNow(); // Force shutdown
        if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
            System.err.println("Pool did not terminate");
        }
    }
} catch (InterruptedException e) {
    executor.shutdownNow();
    Thread.currentThread().interrupt();
}
```

## Locks

### synchronized vs ReentrantLock

```java
// synchronized: simple, JVM-managed, no puede timeout
public synchronized void incrementSync() {
    count++;
}

// ReentrantLock: flexible, puede timeout, puede ser fair
import java.util.concurrent.locks.*;

private final ReentrantLock lock = new ReentrantLock(true); // Fair lock

public void incrementLock() {
    lock.lock();
    try {
        count++;
    } finally {
        lock.unlock(); // DEBE estar en finally
    }
}

// Try con timeout
public boolean tryIncrement(long timeout, TimeUnit unit) {
    try {
        if (lock.tryLock(timeout, unit)) {
            try {
                count++;
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false; // No se pudo adquirir lock
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return false;
    }
}
```

### ReadWriteLock

```java
import java.util.concurrent.locks.*;

private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
private final Map<String, String> cache = new HashMap<>();

public String get(String key) {
    rwLock.readLock().lock();
    try {
        return cache.get(key);
    } finally {
        rwLock.readLock().unlock();
    }
}

public void put(String key, String value) {
    rwLock.writeLock().lock();
    try {
        cache.put(key, value);
    } finally {
        rwLock.writeLock().unlock();
    }
}
```

### StampedLock

```java
import java.util.concurrent.locks.*;

private final StampedLock stampedLock = new StampedLock();
private double x, y;

// Optimistic read: sin lock, validar despues
public double distanceFromOrigin() {
    long stamp = stampedLock.tryOptimisticRead();
    double currentX = x, currentY = y;
    if (!stampedLock.validate(stamp)) {
        // Optimistic read fallo, upgrade a read lock
        stamp = stampedLock.readLock();
        try {
            currentX = x;
            currentY = y;
        } finally {
            stampedLock.unlockRead(stamp);
        }
    }
    return Math.sqrt(currentX * currentX + currentY * currentY);
}

public void move(double deltaX, double deltaY) {
    long stamp = stampedLock.writeLock();
    try {
        x += deltaX;
        y += deltaY;
    } finally {
        stampedLock.unlockWrite(stamp);
    }
}
```

## CompletableFuture

### Composicion Basica

```java
import java.util.concurrent.*;

CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        // Async computation
        return fetchUser(123);
    })
    .thenApply(user -> {
        // Transformar resultado
        return user.getName();
    })
    .thenApply(name -> {
        // Encadenar otra transformacion
        return name.toUpperCase();
    })
    .thenAccept(name -> {
        // Consumir resultado (sin return)
        System.out.println("Name: " + name);
    })
    .thenRun(() -> {
        // Correr despues de completitud
        System.out.println("Done");
    });

future.join(); // Block y obtener resultado
```

### Combinar Multiple Futures

```java
// Correr dos futures en paralelo y combinar resultados
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> fetchUser(123));
CompletableFuture<Orders> ordersFuture = CompletableFuture.supplyAsync(() -> fetchOrders(123));

CompletableFuture<UserProfile> profileFuture = userFuture
    .thenCombine(ordersFuture, (user, orders) -> new UserProfile(user, orders));

// Esperar a que todas completen
CompletableFuture<Void> all = CompletableFuture.allOf(
    CompletableFuture.supplyAsync(() -> fetchUser(1)),
    CompletableFuture.supplyAsync(() -> fetchUser(2)),
    CompletableFuture.supplyAsync(() -> fetchUser(3))
);
all.join();

// Esperar a que cualquier complete
CompletableFuture<Object> any = CompletableFuture.anyOf(
    CompletableFuture.supplyAsync(() -> fetchFromPrimary()),
    CompletableFuture.supplyAsync(() -> fetchFromSecondary())
);
Object result = any.join();
```

### Error Handling

```java
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        if (Math.random() > 0.5) {
            throw new RuntimeException("Fetch failed");
        }
        return "success";
    })
    .exceptionally(ex -> {
        // Handle exception, retornar fallback
        return "fallback";
    })
    .handle((result, ex) -> {
        // Handle success y exception
        if (ex != null) {
            return "recovered: " + ex.getMessage();
        }
        return result;
    });

// Retry pattern con CompletableFuture
public CompletableFuture<String> fetchWithRetry(String url, int maxRetries) {
    CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> fetch(url));
    for (int i = 0; i < maxRetries; i++) {
        future = future.exceptionallyCompose(ex -> {
            System.err.println("Retry " + (i + 1) + ": " + ex.getMessage());
            return CompletableFuture.supplyAsync(() -> fetch(url));
        });
    }
    return future;
}
```

### Timeout Handling

```java
import java.util.concurrent.*;

CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> slowFetch())
    .orTimeout(5, TimeUnit.SECONDS) // Timeout despues de 5s (Java 9+)
    .exceptionally(ex -> {
        if (ex instanceof TimeoutException) {
            return "timeout fallback";
        }
        return "error fallback";
    });

// Completar con default value despues de timeout
CompletableFuture<String> withDefault = CompletableFuture
    .supplyAsync(() -> slowFetch())
    .completeOnTimeout("default", 5, TimeUnit.SECONDS);
```

## Virtual Threads (Java 21+)

Virtual threads son threads lightweight manejados por la JVM, no el OS. Millones de virtual threads pueden correr en unos pocos platform threads.

```java
import java.util.concurrent.*;

// Crear un virtual thread
Thread vt = Thread.ofVirtual().start(() -> {
    System.out.println("Running in virtual thread");
});

// Virtual thread per task executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = new ArrayList<>();
    
    for (int i = 0; i < 10_000; i++) {
        final int id = i;
        futures.add(executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1)); // Blocking call esta bien!
            return "Result " + id;
        }));
    }
    
    // Las 10,000 tasks completan en ~1 segundo
    for (Future<String> f : futures) {
        System.out.println(f.get());
    }
}

// Structured concurrency (preview en Java 21)
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> user = scope.fork(() -> fetchUser(123));
    Subtask<Orders> orders = scope.fork(() -> fetchOrders(123));
    
    scope.join();           // Esperar a todas
    scope.throwIfFailed();  // Propagar exception si alguna fallo
    
    UserProfile profile = new UserProfile(user.get(), orders.get());
}
```

### Cuándo Usar Virtual Threads

```text
Usar virtual threads cuando:
- Work I/O-bound (HTTP calls, database queries, file I/O)
- Alto numero de tasks concurrentes (miles a millones)
- Quieres estilo blocking-code simple sin callbacks

NO usar virtual threads cuando:
- Work CPU-bound (usar platform threads o ForkJoinPool)
- Necesitas operaciones pinning-sensitive (synchronized blocks pinean virtual threads)
- Thread-local variables son muy usadas (cada virtual thread tiene su propio scope)
```

## Concurrent Collections

```java
import java.util.concurrent.*;
import java.util.*;

// ConcurrentHashMap: thread-safe HashMap
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.put("key", 1);
map.computeIfAbsent("key", k -> expensiveCompute(k));
map.merge("counter", 1, Integer::sum); // Atomic increment

// CopyOnWriteArrayList: thread-safe List, copia en write
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
list.add("item"); // Crea una nueva copia

// ConcurrentLinkedQueue: non-blocking queue
ConcurrentLinkedQueue<String> queue = new ConcurrentLinkedQueue<>();
queue.offer("item");
String item = queue.poll();

// BlockingQueue: patron producer-consumer
BlockingQueue<String> blockingQueue = new LinkedBlockingQueue<>(100);
blockingQueue.put("item");  // Bloquea si full
String item = blockingQueue.take();  // Bloquea si empty

// ArrayBlockingQueue: bounded, array-backed
BlockingQueue<String> bounded = new ArrayBlockingQueue<>(1000);

// DelayQueue: elementos disponibles despues de un delay
class DelayedTask implements Delayed {
    private final long startTime;
    private final String name;
    
    public DelayedTask(String name, long delayMs) {
        this.name = name;
        this.startTime = System.currentTimeMillis() + delayMs;
    }
    
    @Override
    public long getDelay(TimeUnit unit) {
        return unit.convert(startTime - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
    }
    
    @Override
    public int compareTo(Delayed o) {
        return Long.compare(startTime, ((DelayedTask) o).startTime);
    }
}
```

## Atomic Variables

```java
import java.util.concurrent.atomic.*;

AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();     // ++i
counter.getAndIncrement();     // i++
counter.compareAndSet(0, 1);   // CAS: si 0, set a 1
counter.updateAndGet(x -> x * 2); // Atomic update

AtomicLong longCounter = new AtomicLong(0);
AtomicBoolean flag = new AtomicBoolean(false);
AtomicReference<String> ref = new AtomicReference<>("initial");

// LongAdder: mejor para counters de alta contencion
LongAdder adder = new LongAdder();
adder.increment();
adder.add(10);
long sum = adder.sum(); // No atomic, pero rapido para counting

// LongAccumulator: funcion de acumulacion custom
LongAccumulator max = new LongAccumulator(Long::max, Long.MIN_VALUE);
max.accumulate(42);
max.accumulate(17);
long result = max.get(); // 42
```

## Java Memory Model

### Relacion Happens-Before

```java
// La relacion happens-before garantiza visibility:
// 1. Thread A escribe a una volatile variable
// 2. Thread B lee la misma volatile variable
// → Todo lo que A hizo antes del write es visible a B

private volatile boolean running = true;

public void stop() {
    running = false; // Write a volatile — visible a otros threads
}

public void run() {
    while (running) { // Read volatile — ve el valor mas reciente
        doWork();
    }
}
```

### Safe Publication

```java
// Unsafe: otro thread podria ver objeto parcialmente construido
private SomeObject instance; // NOT volatile

// Safe: volatile asegura safe publication
private volatile SomeObject instance;

// Safe: final fields son visibles despues de construccion
class ImmutableValue {
    private final int x;
    private final int y;
    
    public ImmutableValue(int x, int y) {
        this.x = x;
        this.y = y;
    }
}

// Safe: synchronized block establece happens-before
private SomeObject instance;
private final Object lock = new Object();

public SomeObject getInstance() {
    synchronized (lock) {
        if (instance == null) {
            instance = new SomeObject();
        }
        return instance;
    }
}
```

## Patrones de Producción

### Circuit Breaker con CompletableFuture

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

class CircuitBreaker {
    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final int threshold;
    private final long timeoutMs;
    private volatile long lastFailureTime;
    
    enum State { CLOSED, OPEN, HALF_OPEN }
    
    public CircuitBreaker(int threshold, long timeoutMs) {
        this.threshold = threshold;
        this.timeoutMs = timeoutMs;
    }
    
    public <T> CompletableFuture<T> execute(java.util.function.Supplier<T> supplier) {
        if (state.get() == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime > timeoutMs) {
                state.set(State.HALF_OPEN);
            } else {
                return CompletableFuture.failedFuture(new RuntimeException("Circuit open"));
            }
        }
        
        return CompletableFuture.supplyAsync(supplier)
            .handle((result, ex) -> {
                if (ex != null) {
                    if (failureCount.incrementAndGet() >= threshold) {
                        state.set(State.OPEN);
                        lastFailureTime = System.currentTimeMillis();
                    }
                    throw new CompletionException(ex);
                }
                failureCount.set(0);
                state.set(State.CLOSED);
                return result;
            });
    }
}
```

### Rate Limiter con Semaphore

```java
import java.util.concurrent.*;

class RateLimiter {
    private final Semaphore permits;
    private final ScheduledExecutorService refiller;
    
    public RateLimiter(int maxPermits, long refillIntervalMs) {
        this.permits = new Semaphore(maxPermits);
        this.refiller = Executors.newSingleThreadScheduledExecutor();
        
        refiller.scheduleAtFixedRate(() -> {
            int available = permits.availablePermits();
            if (available < maxPermits) {
                permits.release(maxPermits - available);
            }
        }, 0, refillIntervalMs, TimeUnit.MILLISECONDS);
    }
    
    public boolean tryAcquire(long timeout, TimeUnit unit) throws InterruptedException {
        return permits.tryAcquire(timeout, unit);
    }
    
    public void shutdown() {
        refiller.shutdown();
    }
}
```

## Testing Concurrent Code

```java
import org.junit.jupiter.api.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

@Test
void testConcurrentIncrement() throws Exception {
    AtomicInteger counter = new AtomicInteger(0);
    int threads = 100;
    int incrementsPerThread = 1000;
    
    ExecutorService executor = Executors.newFixedThreadPool(threads);
    CountDownLatch latch = new CountDownLatch(threads);
    
    for (int i = 0; i < threads; i++) {
        executor.submit(() -> {
            for (int j = 0; j < incrementsPerThread; j++) {
                counter.incrementAndGet();
            }
            latch.countDown();
        });
    }
    
    latch.await(10, TimeUnit.SECONDS);
    executor.shutdown();
    
    assertEquals(threads * incrementsPerThread, counter.get());
}

@Test
void testCompletableFuture() throws Exception {
    CompletableFuture<String> future = CompletableFuture
        .supplyAsync(() -> "hello")
        .thenApply(String::toUpperCase)
        .thenApply(s -> s + " world");
    
    assertEquals("HELLO world", future.get(5, TimeUnit.SECONDS));
}
```

## Preguntas Frecuentes

### ¿Debería usar virtual threads o platform threads?

Usa virtual threads para work I/O-bound con alta concurrencia (miles de HTTP calls concurrentes, database queries). Usa platform threads para work CPU-bound o cuando necesitas control fine-grained sobre thread scheduling. Virtual threads no son mas rapidas per-task — permiten mas tasks concurrentes usando menos OS threads.

### ¿Cuál es la diferencia entre thenApply y thenCompose?

`thenApply` toma una funcion sincrona y envuelve el resultado en un nuevo CompletableFuture. `thenCompose` toma una funcion que retorna un CompletableFuture y lo flatea (como `flatMap`). Usa `thenCompose` cuando el siguiente step es async.

### ¿Cómo elijo entre synchronized y ReentrantLock?

Usa `synchronized` para casos simples — es mas simple y la JVM lo optimiza bien (biased locking, lock elision). Usa `ReentrantLock` cuando necesitas tryLock con timeout, fairness, interruptibility, o non-block-structured locking. `synchronized` es siempre reentrant y no puede timeout.

### ¿Qué es thread pinning en virtual threads?

Virtual threads son "pinned" a su carrier platform thread cuando ejecutan `synchronized` blocks o native methods. Mientras estan pinned, el carrier thread no puede correr otros virtual threads. Usa `ReentrantLock` en lugar de `synchronized` en hot paths cuando usas virtual threads para evitar pinning.

### ¿Cómo manejo InterruptedException?

Catcheala, restaura el interrupt flag con `Thread.currentThread().interrupt()`, y sal gracefully. No la tragues. Si no puedes manejarla, rethroweala. Nunca catchees `InterruptedException` y no hagas nada — rompe cooperative cancellation.

### ¿Cuál es el mejor thread pool size?

Para work CPU-bound: `N_threads = N_cores + 1`. Para work I/O-bound: `N_threads = N_cores * (1 + wait_time / compute_time)`. Para workloads mixtos, usa pools separados. Con virtual threads, usa `newVirtualThreadPerTaskExecutor()` y deja que la JVM maneje scheduling.
