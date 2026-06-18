---
contentType: recipes
slug: locks-and-mutexes
title: "Coordinar Acceso Compartido con Locks, Mutexes y Semáforos"
description: "Cómo prevenir condiciones de carrera en programas concurrentes usando mutexes, read-write locks, semáforos y operaciones atómicas en Java, Python y C++."
metaDescription: "Aprende coordinación de locks para programas concurrentes. Previene race conditions usando mutexes, read-write locks, semáforos y operaciones atómicas."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - atomic-operations
  - race-condition
relatedResources:
  - /recipes/async-patterns
  - /recipes/thread-pools
  - /recipes/microservices-patterns
  - /recipes/database-transactions
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende coordinación de locks para programas concurrentes. Previene race conditions usando mutexes, read-write locks, semáforos y operaciones atómicas."
  keywords:
    - mutex
    - semaphore
    - read write lock
    - race condition
    - sincronizacion threads
---

## Visión general

Cuando múltiples threads acceden a datos compartidos simultáneamente, el resultado depende del timing exacto de su ejecución — una condición de carrera. El thread A lee un balance bancario de $100, el thread B lee el mismo $100, ambos agregan $50, y ambos escriben $150. El resultado correcto es $200, pero el resultado actual es $150. Los $50 perdidos son una data race causada por acceso no coordinado.

Los locks resuelven esto asegurando que solo un thread acceda a datos críticos a la vez. Un mutex (mutual exclusion lock) permite que un solo thread entre a una sección crítica. Un read-write lock permite muchos lectores simultáneamente pero solo un escritor. Un semaphore controla acceso a un pool finito de recursos (ej. 10 conexiones a base de datos). Las operaciones atómicas proveen updates libres de locks para contadores simples. Esta receta cubre cuándo y cómo usar cada mecanismo.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples threads leen y escriben el mismo estado mutable
- Protegiendo caches en memoria, contadores o configuración compartida entre threads
- Limitando acceso concurrente a recursos externos (APIs, bases de datos, file handles)
- Implementando estructuras de datos thread-safe (colas, maps, pools)
- Evitando data races sin rediseñar toda la arquitectura para ser lock-free

## Solución

### Mutex (Java)

```java
import java.util.concurrent.locks.ReentrantLock;

class BankAccount {
    private double balance;
    private final ReentrantLock lock = new ReentrantLock();

    public void deposit(double amount) {
        lock.lock();
        try {
            balance += amount;
        } finally {
            lock.unlock();
        }
    }

    public double getBalance() {
        lock.lock();
        try {
            return balance;
        } finally {
            lock.unlock();
        }
    }
}
```

### Read-Write Lock (Java)

```java
import java.util.concurrent.locks.ReentrantReadWriteLock;

class CachedData {
    private String data;
    private boolean cacheValid;
    private final ReentrantReadWriteLock rwl = new ReentrantReadWriteLock();

    public String processData() {
        rwl.readLock().lock();
        if (cacheValid) {
            String result = data;
            rwl.readLock().unlock();
            return result;
        }
        rwl.readLock().unlock();

        rwl.writeLock().lock();
        try {
            if (!cacheValid) {
                data = fetchFromDatabase();
                cacheValid = true;
            }
            return data;
        } finally {
            rwl.writeLock().unlock();
        }
    }
}
```

### Semaphore (Python)

```python
from threading import Semaphore, Thread
import time

class ConnectionPool:
    def __init__(self, max_connections):
        self.semaphore = Semaphore(max_connections)
        self.connections = [f"conn-{i}" for i in range(max_connections)]

    def acquire(self):
        self.semaphore.acquire()
        return self.connections.pop()

    def release(self, conn):
        self.connections.append(conn)
        self.semaphore.release()

pool = ConnectionPool(3)

def worker(worker_id):
    conn = pool.acquire()
    print(f"Worker {worker_id} usando {conn}")
    time.sleep(1)
    pool.release(conn)
    print(f"Worker {worker_id} liberó {conn}")

threads = [Thread(target=worker, args=(i,)) for i in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

### Operaciones Atómicas (C++)

```cpp
#include <atomic>
#include <thread>
#include <vector>
#include <iostream>

std::atomic<int> counter{0};

void increment() {
    for (int i = 0; i < 100000; ++i) {
        counter.fetch_add(1, std::memory_order_relaxed);
    }
}

int main() {
    std::vector<std::thread> threads;
    for (int i = 0; i < 4; ++i) {
        threads.emplace_back(increment);
    }
    for (auto& t : threads) {
        t.join();
    }
    std::cout << "Counter: " << counter.load() << std::endl;
}
```

## Explicación

- **Mutex**: asegura exclusión mutua — solo un thread tiene el lock a la vez. Otros threads bloquean hasta que el lock se libera. Simple y efectivo, pero puede convertirse en cuello de botella si la sección crítica es grande o frecuentemente accedida.
- **Read-write lock**: permite múltiples lectores concurrentes pero solo un escritor. Ideal para cargas de trabajo dominadas por lecturas donde las escrituras son raras. Un lector no bloquea a otros lectores, pero un escritor bloquea a todos. Algunas implementaciones soportan downgrade de write a read.
- **Semaphore**: un lock generalizado con un contador. Un mutex es un semaphore con count 1. Un pool semaphore con count 10 permite que 10 threads entren simultáneamente. Útil para pools de recursos, throttling y backpressure.
- **Operaciones atómicas**: updates libres de locks usando instrucciones de CPU como `CAS` (compare-and-swap). Más rápidas que locks para operaciones simples pero limitadas en alcance. Usar para contadores y flags. Updates complejos aún requieren locks.

## Variantes

| Mecanismo | Lectores concurrentes | Escritores concurrentes | Mejor para | Overhead |
|-----------|----------------------|------------------------|------------|----------|
| Mutex | No | No | Protección general | Medio |
| Read-write lock | Sí | No | Datos dominados por lectura | Medio |
| Semaphore | N (configurable) | N (configurable) | Pools de recursos | Medio |
| Spinlock | No | No | Secciones críticas muy cortas | Bajo CPU |
| Atómico | N/A (no lock) | N/A | Contadores, flags | Mínimo |

## Mejores prácticas

- **Mantén las secciones críticas pequeñas**: entre más pequeña la región bloqueada, menos contención. Bloquea, actualiza una variable, desbloquea. No hagas I/O, cálculos o llamadas externas mientras sostienes un lock. Las secciones críticas largas serializan threads y derrotan el propósito de la concurrencia.
- **Siempre desbloquea en finally**: un thread que lanza una excepción mientras sostiene un lock nunca lo liberará, deadlockeando otros threads. Usa try/finally (Java), `with` (Python) o RAII (C++ `std::lock_guard`) para asegurar que el unlock ocurre incluso con excepciones.
- **Evita locks anidados**: adquirir el lock A y luego el lock B, mientras otro thread adquiere B y luego A, crea un deadlock clásico. Si los locks anidados son inevitables, adquírelos siempre en un orden global consistente. Mejor aún, rediseña para evitar anidamiento.
- **Prefiere read-write locks para datos dominados por lectura**: si el 99% de los accesos son lecturas, un mutex serializa el 99% de las operaciones innecesariamente. Un read-write lock permite lecturas paralelas, mejorando dramáticamente el throughput en caches, configuración y tablas de lookup.
- **Usa atómicos para contadores simples**: un `AtomicInteger` o `std::atomic<int>` para un contador es más rápido que un mutex y elimina el riesgo de deadlock. No uses atómicos para operaciones compuestas (ej. "chequear balance y retirar") — esas requieren un lock.

## Errores comunes

- **Lockeando en objetos mutables**: `synchronized(someList)` falla si la referencia cambia. Otro thread puede sincronizar en un objeto diferente. Usa un campo privado final como monitor de lock, nunca los datos mismos.
- **Olvidar desbloquear después de retorno temprano**: un método con múltiples paths de retorno puede retornar sin desbloquear. Por eso `ReentrantLock` de Java requiere `unlock()` explícito — te fuerza a pensar en cada path de salida. Usa try/finally religiosamente.
- **Sobre-lockeo (lockear demasiado)**: envolver un método completo en `synchronized` puede proteger datos pero serializa a todos los llamadores, haciendo el código efectivamente single-threaded. Identifica el estado compartido exacto que necesita protección y bloquea solo eso.
- **Testing sin estrés de concurrencia**: una condición de carrera puede no manifestarse con 2 threads en una máquina de desarrollo. Usa stress tests con cientos de threads, buclea millones de iteraciones y corre en hardware multi-core. Herramientas como ThreadSanitizer detectan data races en runtime.

## Preguntas frecuentes

**P: ¿Debería usar synchronized o ReentrantLock en Java?**
R: Usa `synchronized` para casos simples — es menos propenso a errores (unlock es automático). Usa `ReentrantLock` cuando necesites try-lock (no bloqueante), timed lock (timeout), interrupción de lock o múltiples condition variables.

**P: ¿Python tiene GIL, haciendo los locks innecesarios?**
R: El GIL previene paralelismo real de threads para trabajo CPU, pero los locks aún son necesarios para thread safety. Dos threads aún pueden intercalar operaciones en datos compartidos entre instrucciones de bytecode. Usa `threading.Lock` para estado mutable compartido.

**P: ¿Qué es lock contention y cómo la reduzco?**
R: Contención ocurre cuando múltiples threads compiten por el mismo lock. Redúcela: (1) achicando secciones críticas, (2) usando read-write locks, (3) sharding datos (cada shard tiene su propio lock), (4) usando estructuras lock-free, o (5) reduciendo el número de threads.

**P: ¿Son semáforos y mutexes lo mismo?**
R: Un mutex es un semáforo binario (count = 1) con semántica de ownership — solo el thread que lo bloqueó puede desbloquearlo. Un semáforo tiene un contador configurable y no tiene ownership. Usa mutex para acceso exclusivo; semáforo para pools de recursos.

