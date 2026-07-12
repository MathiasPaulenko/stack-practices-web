---
contentType: recipes
slug: locks-and-mutexes
title: "Coordinar Acceso Compartido con Locks, Mutexes y SemÃ¡foros"
description: "CÃ³mo prevenir condiciones de carrera en programas concurrentes usando mutexes, read-write locks, semÃ¡foros y operaciones atÃ³micas en Java, Python y C++."
metaDescription: "Aprende coordinaciÃ³n de locks para programas concurrentes. Previene race conditions usando mutexes, read-write locks, semÃ¡foros y operaciones atÃ³micas."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - atomic-operations
  - race-condition
  - async
  - threads
relatedResources:
  - /recipes/async-patterns
  - /recipes/thread-pools
  - /recipes/microservices-patterns
  - /recipes/database-transactions
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende coordinaciÃ³n de locks para programas concurrentes. Previene race conditions usando mutexes, read-write locks, semÃ¡foros y operaciones atÃ³micas."
  keywords:
    - mutex
    - semaphore
    - read write lock
    - race condition
    - sincronizacion threads
---

## VisiÃ³n general

Cuando mÃºltiples threads acceden a datos compartidos simultÃ¡neamente, el resultado depende del timing exacto de su ejecuciÃ³n â€” una condiciÃ³n de carrera. El thread A lee un balance bancario de $100, el thread B lee el mismo $100, ambos agregan $50, y ambos escriben $150. El resultado correcto es $200, pero el resultado actual es $150. Los $50 perdidos son una data race causada por acceso no coordinado.

Los locks resuelven esto asegurando que solo un thread acceda a datos crÃ­ticos a la vez. Un mutex (mutual exclusion lock) permite que un solo thread entre a una secciÃ³n crÃ­tica. Un read-write lock permite muchos lectores simultÃ¡neamente pero solo un escritor. Un semaphore controla acceso a un pool finito de recursos (ej. 10 conexiones a base de datos). Las operaciones atÃ³micas proveen updates libres de locks para contadores simples. A continuacion se cubre cuÃ¡ndo y cÃ³mo usar cada mecanismo.

## CuÃ¡ndo usarlo

Usa esta receta cuando:

- MÃºltiples threads leen y escriben el mismo estado mutable
- Protegiendo caches en memoria, contadores o configuraciÃ³n compartida entre threads
- Limitando acceso concurrente a recursos externos (APIs, bases de datos, file handles)
- Implementando [estructuras de datos thread-safe](/recipes/concurrency/concurrent-data-structures) (colas, maps, pools)
- Evitando data races sin rediseÃ±ar toda la arquitectura para ser lock-free

## SoluciÃ³n

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
    print(f"Worker {worker_id} liberÃ³ {conn}")

threads = [Thread(target=worker, args=(i,)) for i in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

### Operaciones AtÃ³micas (C++)

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

## ExplicaciÃ³n

- **Mutex**: asegura exclusiÃ³n mutua â€” solo un thread tiene el lock a la vez. Otros threads bloquean hasta que el lock se libera. Simple y Ãºtil, pero puede convertirse en cuello de botella si la secciÃ³n crÃ­tica es grande o frecuentemente accedida.
- **Read-write lock**: permite mÃºltiples lectores concurrentes pero solo un escritor. Ideal para cargas de trabajo dominadas por lecturas donde las escrituras son raras. Un lector no bloquea a otros lectores, pero un escritor bloquea a todos. Algunas implementaciones soportan downgrade de write a read.
- **Semaphore**: un lock generalizado con un contador. Un mutex es un semaphore con count 1. Un pool semaphore con count 10 permite que 10 threads entren simultÃ¡neamente. Ãštil para [pools de recursos](/recipes/performance/connection-pooling), throttling y backpressure.
- **Operaciones atÃ³micas**: updates libres de locks usando instrucciones de CPU como `CAS` (compare-and-swap). MÃ¡s rÃ¡pidas que locks para operaciones simples pero limitadas en alcance. Usar para contadores y flags. Updates complejos aÃºn requieren locks.

## Variantes

| Mecanismo | Lectores concurrentes | Escritores concurrentes | Mejor para | Overhead |
|-----------|----------------------|------------------------|------------|----------|
| Mutex | No | No | ProtecciÃ³n general | Medio |
| Read-write lock | SÃ­ | No | Datos dominados por lectura | Medio |
| Semaphore | N (configurable) | N (configurable) | Pools de recursos | Medio |
| Spinlock | No | No | Secciones crÃ­ticas muy cortas | Bajo CPU |
| AtÃ³mico | N/A (no lock) | N/A | Contadores, flags | MÃ­nimo |

## Lo que funciona

- **MantÃ©n las secciones crÃ­ticas pequeÃ±as**: entre mÃ¡s pequeÃ±a la regiÃ³n bloqueada, menos contenciÃ³n. Bloquea, actualiza una variable, desbloquea. No hagas I/O, cÃ¡lculos o llamadas externas mientras sostienes un lock. Las secciones crÃ­ticas largas serializan threads y derrotan el propÃ³sito de la concurrencia.
- **Siempre desbloquea en finally**: un thread que lanza una excepciÃ³n mientras sostiene un lock nunca lo liberarÃ¡, deadlockeando otros threads. Usa try/finally (Java), `with` (Python) o RAII (C++ `std::lock_guard`) para asegurar que el unlock ocurre incluso con excepciones.
- **Evita locks anidados**: adquirir el lock A y luego el lock B, mientras otro thread adquiere B y luego A, crea un deadlock clÃ¡sico. Si los locks anidados son inevitables, adquÃ­relos siempre en un orden global consistente. Mejor aÃºn, rediseÃ±a para evitar anidamiento.
- **Prefiere read-write locks para datos dominados por lectura**: si el 99% de los accesos son lecturas, un mutex serializa el 99% de las operaciones innecesariamente. Un read-write lock permite lecturas paralelas, mejorando dramÃ¡ticamente el throughput en caches, configuraciÃ³n y tablas de lookup.
- **Usa atÃ³micos para contadores simples**: un `AtomicInteger` o `std::atomic<int>` para un contador es mÃ¡s rÃ¡pido que un mutex y elimina el riesgo de deadlock. No uses atÃ³micos para operaciones compuestas â€” esas requieren un lock. Consulta [Thread Pools](/recipes/concurrency/thread-pools) para gestionar workers concurrentes.

## Errores comunes

- **Lockeando en objetos mutables**: `synchronized(someList)` falla si la referencia cambia. Otro thread puede sincronizar en un objeto diferente. Usa un campo privado final como monitor de lock, nunca los datos mismos.
- **Olvidar activar despuÃ©s de retorno temprano**: un mÃ©todo con mÃºltiples paths de retorno puede retornar sin activar. Por eso `ReentrantLock` de Java requiere `unlock()` explÃ­cito â€” te fuerza a pensar en cada path de salida. Usa try/finally religiosamente.
- **Sobre-lockeo (lockear demasiado)**: envolver un mÃ©todo completo en `synchronized` puede proteger datos pero serializa a todos los llamadores, haciendo el cÃ³digo bien single-threaded. Identifica el estado compartido exacto que necesita protecciÃ³n y bloquea solo eso.
- **Testing sin estrÃ©s de concurrencia**: una condiciÃ³n de carrera puede no manifestarse con 2 threads en una mÃ¡quina de desarrollo. Usa stress tests con cientos de threads, buclea millones de iteraciones y corre en hardware multi-core. Herramientas como ThreadSanitizer detectan data races en runtime.

## Cuando No Usar Este Enfoque

- **Datos compartidos read-only**: si los datos se escriben una vez y solo se leen despuÃ©s, no se necesita lock. Usa campos inal en Java, const en C++ o estructuras de datos inmutables. Los locks agregan overhead innecesario
- **CÃ³digo single-threaded**: los locks agregan 10-50ns por acquire/release. En paths single-threaded, esto es desperdicio puro. Remueve locks de code paths que estÃ¡n garantizados a correr en un solo thread
- **Existen alternativas lock-free**: para contadores simples, usa AtomicInteger / std::atomic en lugar de incrementos protegidos por mutex. Los atomics son 5-20x mÃ¡s rÃ¡pidos bajo contenciÃ³n
- **Message passing es mÃ¡s limpio**: si el problema es coordinaciÃ³n entre tasks, no protecciÃ³n de datos, los channels o modelos de actor evitan gestiÃ³n de locks enteramente. Prefiere message passing para coordinaciÃ³n compleja
- **Locking coarse-grained basta**: si la contenciÃ³n es baja y la critical section es corta, un solo lock es mÃ¡s simple y rÃ¡pido que locking fino. No optimices prematuramente la granularidad del lock
- **Sistemas distribuidos**: los mutexes locales no funcionan entre procesos o mÃ¡quinas. Usa locks distribuidos (Redis Redlock, ZooKeeper, etcd) siendo consciente de sus tradeoffs y modos de fallo

## Benchmarks de Rendimiento

- **Lock acquire no contendido**: synchronized en JVM toma ~10-30ns (biased locking). ReentrantLock toma ~20-50ns. std::mutex en C++ toma ~15-40ns
- **Lock acquire contendido**: con 4 threads contendiendo, lock acquire toma 1-10us. Con 16 threads, 10-100us. La contenciÃ³n escala mal â€” el throughput cae inversamente con el conteo de threads
- **Lock vs atomic**: AtomicInteger.incrementAndGet() toma ~5ns no contendido, ~50ns bajo contenciÃ³n de 8 threads. Contador synchronized toma ~50ns no contendido, ~5us bajo contenciÃ³n de 8 threads
- **Read-write lock vs mutex**: ReentrantReadWriteLock mejora el throughput de lectura 3-5x cuando las lecturas dominan 90%+. Para 50% lecturas, es mÃ¡s lento que un mutex simple por el overhead
- **Spin lock vs blocking lock**: los spin locks gastan CPU pero evitan el costo de context switch. Para hold times <1us, los spin locks son 2-3x mÃ¡s rÃ¡pidos. Para hold times >10us, los blocking locks son mejores
- **Fair vs unfair locking**: los fair locks (ReentrantLock(fair=true)) reducen starvation pero aumentan la contenciÃ³n 30-50%. Usa fair locks solo cuando se observe thread starvation
- **Granularidad de lock**: locking fino (un lock por bucket en una hash table) mejora el throughput 5-10x bajo contenciÃ³n alta. El costo es complejidad y potenciales escenarios de deadlock

## Estrategia de Testing

- **Stress test con alto conteo de threads**: prueba con 2-4x el conteo de threads de producciÃ³n. Usa CountDownLatch para iniciar todos los threads simultÃ¡neamente y maximizar la contenciÃ³n
- **Test de detecciÃ³n de deadlocks**: ejecuta tests con detecciÃ³n de deadlocks habilitada (-XX:+UnlockDiagnosticVMOptions -XX:+SyncFlags en JVM). Usa jstack para verificar que no aparezcan patrones de deadlock
- **Test de fairness de locks**: si usas fair locks, verifica que los threads adquieran locks en orden FIFO. Usa una cola compartida para registrar el orden de adquisiciÃ³n y verifica el ordenamiento
- **Test de comportamiento de timeout**: verifica que 	ryLock(timeout) retorne false cuando el lock estÃ¡ tomado. Usa un mock que mantenga el lock mÃ¡s tiempo que el timeout
- **Test de reentrancia**: verifica que un thread que tiene un ReentrantLock pueda adquirirlo de nuevo sin bloquear. Verifica que el lock count se mantenga correctamente
- **Test de manejo de excepciones**: verifica que los locks se liberen cuando ocurran excepciones en la critical section. Usa patrones 	ry-finally o 	ry-with-resources
- **Test con ThreadSanitizer**: compila con -fsanitize=thread (C/C++) o corre con -race (Go). Estas herramientas detectan data races que los stress tests no encuentran

## Estimacion de Costos

- **Costo de servidores**: la lock contention reduce el throughput. Un servicio que gasta 30% del tiempo en lock contention necesita 30% mÃ¡s servidores. Reducir la contenciÃ³n de 30% a 5% ahorra ,500-3,000/mes en una flota de 10 servidores
- **Costo de desarrollo**: diseÃ±ar esquemas de locking fino toma 2-5x mÃ¡s tiempo que locking coarse-grained. Presupuesta design reviews y stress testing
- **Costo de debugging**: los bugs de deadlock toman 20-80 horas en diagnosticarse en promedio. Invierte en tooling de detecciÃ³n de deadlocks y capacitaciÃ³n en anÃ¡lisis de thread dumps
- **Profiling de performance**: usa async-profiler (JVM), perf (C++) o py-spy (Python) para identificar hotspots de locks. Estas herramientas son gratuitas pero requieren expertise para interpretar
- **Overhead de memoria**: cada objeto lock usa 24-48 bytes (JVM) o 40 bytes (pthread mutex). 10,000 locks agregan ~400KB â€” despreciable, pero los lock pools para locking fino deben dimensionarse cuidadosamente

## Monitoring y Observabilidad

- **Tiempo de lock contention**: monitorea el tiempo gastado esperando locks. JVM: usa LockSupport.getBlockedTime() o JFR. Alta contenciÃ³n (>10% del tiempo de CPU) indica necesidad de optimizaciÃ³n de locks
- **DetecciÃ³n de deadlocks**: ejecuta thread dumps periÃ³dicos y verifica ciclos de deadlock. JVM: jstack <pid> o JMX ThreadMXBean.findDeadlockedThreads(). Alerta ante cualquier deadlock detectado
- **Lock hold time**: mide cuÃ¡nto tiempo se mantienen los locks. Hold times largos (>1ms) indican que la critical section es demasiado grande. DivÃ­dela en secciones mÃ¡s pequeÃ±as o usa read-write locks
- **Conteo de threads bloqueados**: monitorea el nÃºmero de threads en estado BLOCKED. Un conteo alto indica lock contention. Alerta cuando >20% de los threads estÃ¡n bloqueados
- **Lock queue depth**: trackea el nÃºmero de threads esperando por cada lock. Colas profundas (>10 waiters) indican locks calientes que necesitan splitting o redisign

## Deployment Checklist

- [ ] Verificar que la implementaciÃ³n del lock coincide con el runtime (no uses pthread_mutex en runtimes de green-threads, usa locks nativos del lenguaje)
- [ ] Setear tamaÃ±os de thread pool para evitar oversubscription. MÃ¡s threads que CPU cores aumenta lock contention sin mejorar throughput
- [ ] Configurar detecciÃ³n de deadlocks en producciÃ³n (JVM: habilitar JFR, Go: usar untime/pprof goroutine profiling)
- [ ] Setear timeouts en todas las adquisiciones de locks en cÃ³digo network-facing. Usa 	ryLock(timeout) en lugar de lock() para prevenir bloqueo indefinido
- [ ] Habilitar recolecciÃ³n de thread dumps on signal (JVM: -XX:+UnlockDiagnosticVMOptions, C++: instalar signal handler para SIGQUIT)
- [ ] Documentar el orden de locks en comentarios de cÃ³digo. Los deadlocks por orden inconsistente de locks son el bug de concurrencia mÃ¡s comÃºn en producciÃ³n

## Consideraciones de Seguridad

- **Denial of service vÃ­a retenciÃ³n de lock**: un atacante puede mantener un lock indefinidamente enviando un request lento que entra en una critical section. Usa timeouts de lock y deadlines de request para prevenir esto
- **Deadlock como vector de DoS**: un atacante puede craftar requests que triggeren violaciones de orden de locks, causando deadlocks que cuelgan todo el sistema. Enforceza orden estricto de locks y usa 	ryLock con timeouts
- **Side-channel de lock contention**: las variaciones de timing por lock contention pueden leakear informaciÃ³n sobre las operaciones de otros threads. Un atacante midiendo tiempos de respuesta puede inferir estado interno. Usa operaciones de tiempo constante en paths security-sensitive
- **Priority inversion**: un thread de baja prioridad que mantiene un lock puede bloquear threads de alta prioridad. El incidente del Mars Pathfinder fue causado por priority inversion. Usa protocolo de priority inheritance (PTHREAD_PRIO_INHERIT) en sistemas real-time
- **Lock poisoning**: si un thread crashea mientras mantiene un lock, el lock queda "poisoned" y adquisiciones subsiguientes pueden colgarse. Usa 	ryLock con timeouts y watchdog threads para detectar locks envenenados
- **Abuso de reentrant locks**: los reentrant locks permiten al mismo thread adquirir un lock mÃºltiples veces. Si un thread adquiere un lock en un loop sin liberar, puede monopolizar el lock. Audita el uso de reentrant locks por adquisiciÃ³n no acotada
- **PublicaciÃ³n insegura de locks**: si un objeto lock es accesible a cÃ³digo no confiable, puede ser mantenido indefinidamente o usado para coordinar ataques. MantÃ©n los objetos lock privados y nunca los expongas en APIs pÃºblicas
- **Spin lock y agotamiento de CPU**: los spin locks gastan CPU mientras esperan. Un atacante puede triggerar alta contenciÃ³n, causando que los spin locks consuman 100% CPU. Usa locks adaptativos que spinnen brevemente y luego bloqueen
- **Bypass de lock vÃ­a publicaciÃ³n insegura**: si un objeto compartido se publica sin sincronizaciÃ³n apropiada (ej. vÃ­a un campo non-volatile), otro thread puede ver un objeto parcialmente construido y bypassar la protecciÃ³n del lock. Usa campos inal o publicaciÃ³n olatile
- **Reader-writer lock starvation**: un stream continuo de readers puede starvar a los writers en read-write locks non-fair. Un atacante puede explotar esto floodeando requests de lectura, bloqueando todas las escrituras. Usa fair read-write locks
- **Spoofing de condition variables**: si las condition variables son accesibles a cÃ³digo no confiable, 
otify() puede ser llamado espuriamente, despertando threads que deberÃ­an permanecer bloqueados. MantÃ©n las condition variables privadas
- **Race de lock file en inicializaciÃ³n**: usar locks basados en archivos para inicializaciÃ³n tiene races TOCTOU (time-of-check-to-time-of-use). Un atacante puede reemplazar el lock file entre el check y el uso. Usa O_CREAT|O_EXCL con manejo de errores apropiado
## Preguntas frecuentes

**P: Â¿DeberÃ­a usar synchronized o ReentrantLock en Java?**
R: Usa `synchronized` para casos simples â€” es menos propenso a errores (unlock es automÃ¡tico). Usa `ReentrantLock` cuando necesites try-lock (no bloqueante), timed lock (timeout), interrupciÃ³n de lock o mÃºltiples condition variables.

**P: Â¿Python tiene GIL, haciendo los locks innecesarios?**
R: El GIL previene paralelismo real de threads para trabajo CPU, pero los locks aÃºn son necesarios para thread safety. Dos threads aÃºn pueden intercalar operaciones en datos compartidos entre instrucciones de bytecode. Usa `threading.Lock` para estado mutable compartido.

**P: Â¿QuÃ© es lock contention y cÃ³mo la reduzco?**
R: ContenciÃ³n ocurre cuando mÃºltiples threads compiten por el mismo lock. RedÃºcela: (1) achicando secciones crÃ­ticas, (2) usando read-write locks, (3) sharding datos (cada shard tiene su propio lock), (4) usando [estructuras lock-free](/recipes/concurrency/concurrent-data-structures), o (5) reduciendo el nÃºmero de threads.

**P: Â¿Son semÃ¡foros y mutexes lo mismo?**
R: Un mutex es un semÃ¡foro binario (count = 1) con semÃ¡ntica de ownership â€” solo el thread que lo bloqueÃ³ puede desbloquearlo. Un semÃ¡foro tiene un contador configurable y no tiene ownership. Usa mutex para acceso exclusivo; semÃ¡foro para pools de recursos.


### Â¿Esta soluciÃ³n estÃ¡ lista para producciÃ³n?

SÃ­. Los ejemplos de cÃ³digo arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuraciÃ³n a tu entorno especÃ­fico antes de desplegar.

### Â¿CuÃ¡les son las caracterÃ­sticas de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, aÃ±ade caching, batching y connection pooling segÃºn sea necesario.

### Â¿CÃ³mo depuro problemas con este enfoque?

Empieza con el ejemplo mÃ­nimo de arriba. AÃ±ade logging en cada paso. Prueba con entradas pequeÃ±as primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
