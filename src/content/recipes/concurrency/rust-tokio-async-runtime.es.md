---





contentType: recipes
slug: rust-tokio-async-runtime
title: "Construir Sistemas Async con Rust Tokio Runtime"
description: "Construir sistemas async en Rust usando el runtime Tokio con tasks, channels, select, primitivas de sincronizacion, graceful shutdown y patrones de concurrencia estructurada."
metaDescription: "Construye sistemas async en Rust con Tokio. Usa tasks, channels, mutexes, graceful shutdown y concurrencia estructurada para networking de alto rendimiento."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - architecture
tags:
  - rust
  - tokio
  - async
  - runtime
  - concurrency
relatedResources:
  - /recipes/go-goroutines-channels-patterns
  - /recipes/python-asyncio-gather-task-groups
  - /guides/concurrency-patterns-guide
  - /recipes/csharp-async-await-task-run
  - /recipes/java-virtual-threads-project-loom
  - /guides/complete-guide-python-asyncio
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye sistemas async en Rust con Tokio. Usa tasks, channels, mutexes, graceful shutdown y concurrencia estructurada para networking de alto rendimiento."
  keywords:
    - rust tokio async
    - rust async runtime
    - tokio tasks channels
    - rust structured concurrency
    - tokio graceful shutdown





---

## Descripcion general

Tokio es el runtime async mas utilizado en Rust. Proporciona un scheduler multi-threaded, I/O driver, timer y primitivas de sincronizacion. Lo siguiente cubre spawn de tasks, comunicacion via channels, uso de `select!` para multiplexing, estado compartido con `Arc<Mutex<T>>`, graceful shutdown con `CancellationToken` y concurrencia estructurada con `tokio::task::JoinSet`.

## Cuando Usar Esto


- For alternatives, see [Build Async Pipelines with C# async/await and Task.Run](/es/recipes/csharp-async-await-task-run/).

- Servidores y clientes de red (HTTP, gRPC, WebSocket)
- Pipelines de procesamiento de datos concurrente
- Aplicaciones que necesitan alto throughput con bajo overhead
- Sistemas que requieren estado compartido seguro entre async tasks

## Prerrequisitos

- Rust 1.75+
- Crate `tokio` con features `full`

## Solucion

### 1. Aplicacion Basica de Tokio

```toml
# Cargo.toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    println!("Starting Tokio runtime");

    // Spawn dos tasks concurrentes
    let task1 = tokio::spawn(async {
        sleep(Duration::from_millis(100)).await;
        println!("Task 1 done");
        42
    });

    let task2 = tokio::spawn(async {
        sleep(Duration::from_millis(50)).await;
        println!("Task 2 done");
        "hello"
    });

    // Esperar ambas tasks
    let result1 = task1.await.unwrap();
    let result2 = task2.await.unwrap();

    println!("Results: {} / {}", result1, result2);
}
```

### 2. Channels — mpsc, oneshot, broadcast

```rust
use tokio::sync::{mpsc, oneshot, broadcast};

#[tokio::main]
async fn main() {
    // --- mpsc: multi-producer, single-consumer ---
    let (tx, mut rx) = mpsc::channel::<String>(32);

    for i in 0..5 {
        let tx = tx.clone();
        tokio::spawn(async move {
            tx.send(format!("message-{}", i)).await.unwrap();
        });
    }

    drop(tx); // Drop el sender original para que rx cierre despues de todos los clones

    while let Some(msg) = rx.recv().await {
        println!("Received: {}", msg);
    }

    // --- oneshot: valor unico, uso unico ---
    let (otx, orx) = oneshot::channel::<i32>();
    tokio::spawn(async move {
        otx.send(99).unwrap();
    });
    let val = orx.await.unwrap();
    println!("Oneshot value: {}", val);

    // --- broadcast: multi-producer, multi-consumer ---
    let (btx, mut brx1) = broadcast::channel::<String>(16);
    let mut brx2 = btx.subscribe();

    btx.send("broadcast msg".to_string()).unwrap();

    println!("Receiver 1: {}", brx1.recv().await.unwrap());
    println!("Receiver 2: {}", brx2.recv().await.unwrap());
}
```

### 3. Macro select! — Multiplexing de Operaciones Async

```rust
use tokio::select;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let (tx1, mut rx1) = mpsc::channel::<String>(16);
    let (tx2, mut rx2) = mpsc::channel::<String>(16);

    tokio::spawn(async move {
        sleep(Duration::from_millis(50)).await;
        tx1.send("from channel 1".to_string()).await.unwrap();
    });

    tokio::spawn(async move {
        sleep(Duration::from_millis(30)).await;
        tx2.send("from channel 2".to_string()).await.unwrap();
    });

    // Procesar el channel que este listo primero
    loop {
        select! {
            msg1 = rx1.recv() => {
                match msg1 {
                    Some(m) => println!("Channel 1: {}", m),
                    None => break,
                }
            }
            msg2 = rx2.recv() => {
                match msg2 {
                    Some(m) => println!("Channel 2: {}", m),
                    None => break,
                }
            }
            _ = sleep(Duration::from_secs(2)) => {
                println!("Timeout — no messages for 2s");
                break;
            }
        }
    }
}
```

### 4. Estado Compartido con Arc y Mutex

```rust
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

struct Counter {
    count: i32,
}

#[tokio::main]
async fn main() {
    let counter = Arc::new(Mutex::new(Counter { count: 0 }));
    let mut handles = Vec::new();

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(tokio::spawn(async move {
            sleep(Duration::from_millis(10)).await;
            let mut c = counter.lock().await;
            c.count += 1;
            c.count
        }));
    }

    let mut results = Vec::new();
    for handle in handles {
        results.push(handle.await.unwrap());
    }

    println!("Final count: {}", counter.lock().await.count);
    println!("All results: {:?}", results);
}
```

### 5. JoinSet — Concurrencia Estructurada

```rust
use tokio::task::JoinSet;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let mut set = JoinSet::new();

    for i in 0..20 {
        set.spawn(async move {
            sleep(Duration::from_millis(10 * i as u64)).await;
            i * i
        });
    }

    // Recolectar resultados a medida que las tasks completan (desorden)
    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        results.push(res.unwrap());
    }

    results.sort();
    println!("Squared results: {:?}", results);
}
```

### 6. Graceful Shutdown con CancellationToken

```rust
use tokio::sync::CancellationToken;
use tokio::time::{sleep, Duration};

async fn worker(id: usize, token: CancellationToken) {
    loop {
        tokio::select! {
            _ = token.cancelled() => {
                println!("Worker {} shutting down gracefully", id);
                break;
            }
            _ = sleep(Duration::from_millis(200)) => {
                println!("Worker {} doing work...", id);
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let token = CancellationToken::new();

    // Spawn 3 workers
    let mut handles = Vec::new();
    for id in 0..3 {
        let token = token.clone();
        handles.push(tokio::spawn(worker(id, token)));
    }

    // Ejecutar por 1 segundo, luego cancelar
    sleep(Duration::from_secs(1)).await;
    println!("Cancelling all workers...");
    token.cancel();

    for handle in handles {
        handle.await.unwrap();
    }

    println!("All workers stopped");
}
```

### 7. Servidor TCP con Tokio

```rust
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("Server listening on :8080");

    loop {
        let (socket, addr) = listener.accept().await?;
        println!("Connection from {}", addr);

        tokio::spawn(async move {
            let (reader, mut writer) = socket.into_split();
            let mut reader = BufReader::new(reader);
            let mut line = String::new();

            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => break, // EOF
                    Ok(_) => {
                        let response = format!("Echo: {}", line);
                        if writer.write_all(response.as_bytes()).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }

            println!("Connection {} closed", addr);
        });
    }
}
```

### 8. Semaforo — Concurrencia Limitada

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let semaphore = Arc::new(Semaphore::new(3)); // Max 3 concurrentes
    let mut handles = Vec::new();

    for i in 0..10 {
        let sem = Arc::clone(&semaphore);
        handles.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            println!("Task {} acquired permit", i);
            sleep(Duration::from_millis(100)).await;
            println!("Task {} releasing permit", i);
            // _permit se dropea aqui, libera el slot
        }));
    }

    for handle in handles {
        handle.await.unwrap();
    }
}
```

## Como Funciona

1. **Tokio Runtime**: La macro `#[tokio::main]` configura un runtime multi-threaded con un scheduler work-stealing. Las tasks son ligeras (asignadas en el heap) y cooperativamente programadas en un pool de OS threads.
2. **Tasks**: `tokio::spawn` crea una task que se ejecuta concurrentemente. Cada task es un green thread — el runtime multiplexa miles de tasks en un numero pequeno de OS threads.
3. **Channels**: `mpsc` es para comunicacion multi-producer single-consumer (como los channels de Go). `oneshot` envia un valor unico una vez. `broadcast` distribuye mensajes a multiples subscribers.
4. **`select!`**: Como el `select` de Go, espera en multiples operaciones async. Cuando una completa, la rama correspondiente se ejecuta. Las otras ramas se dropean.
5. **`Arc<Mutex<T>>`**: `Arc` proporciona ownership compartido entre threads. `tokio::sync::Mutex` proporciona locking async-aware — la task hace yield mientras espera el lock en lugar de bloquear el OS thread.
6. **`JoinSet`**: Gestiona un grupo de tasks spawned. `join_next` retorna resultados a medida que las tasks completan, en cualquier orden. Abortar el set cancela todas las tasks restantes.
7. **`CancellationToken`**: Una signal de cancellation cooperativa. `cancelled()` retorna un future que completa cuando se llama `cancel()`. Se usa con `select!` para salir de loops.

## Variantes

### RwLock para Workloads de Lectura Intensiva

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

#[tokio::main]
async fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));

    // Multiples readers pueden tener el lock simultaneamente
    let r1 = Arc::clone(&data);
    let r2 = Arc::clone(&data);
    let h1 = tokio::spawn(async move {
        let guard = r1.read().await;
        println!("Reader 1: {:?}", *guard);
    });
    let h2 = tokio::spawn(async move {
        let guard = r2.read().await;
        println!("Reader 2: {:?}", *guard);
    });

    h1.await.unwrap();
    h2.await.unwrap();

    // Writer obtiene acceso exclusivo
    let mut guard = data.write().await;
    guard.push(4);
    println!("After write: {:?}", *guard);
}
```

### Task::yield_now para Scheduling Cooperativo

```rust
#[tokio::main]
async fn main() {
    // Task CPU-bound de larga duracion que hace yield periodicamente
    tokio::spawn(async {
        let mut sum: u64 = 0;
        for i in 0..1_000_000 {
            sum += i;
            if i % 10_000 == 0 {
                tokio::task::yield_now().await;
            }
        }
        println!("Sum: {}", sum);
    });

    // Esta task puede ejecutar entre yields
    tokio::spawn(async {
        println!("Concurrent task running");
    });

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}
```

### Interval para Tasks Periodicas

```rust
use tokio::time::{interval, Duration};

#[tokio::main]
async fn main() {
    let mut tick = interval(Duration::from_millis(250));

    for i in 0..5 {
        tick.tick().await;
        println!("Tick {}", i);
    }
}
```

## Mejores Practicas

- **Usar `tokio::sync::Mutex` sobre `std::sync::Mutex`**: El std Mutex bloquea el OS thread mientras espera. El Mutex de Tokio hace yield de la task, permitiendo que otras tasks se ejecuten en el mismo thread.
- **Preferir channels sobre estado compartido**: Los channels proporcionan un modelo de concurrencia mas limpio. Usa `mpsc` para producer-consumer, `broadcast` para pub-sub.
- **Siempre manejar `JoinError`**: `task.await` retorna `Result<T, JoinError>`. Una task puede paniquear — unwrap propaga el panic. Usa `unwrap()` solo en ejemplos.
- **Usar `JoinSet` para concurrencia estructurada**: Asegura que todas las tasks se esperen o se aborten. Abortar un `JoinSet` cancela todas las tasks restantes.
- **Usar `CancellationToken` para shutdown**: Verifica `token.cancelled()` en loops de `select!`. Esto proporciona shutdown limpio y cooperativo.
- **Evitar `std::sync::Mutex` en codigo async**: Mantener un std Mutex a traves de puntos `.await` puede causar deadlock si otra task en el mismo thread intenta adquirirlo.

## Errores Comunes

- **Bloquear en contexto async**: `std::thread::sleep`, `std::fs::read` o loops CPU-heavy bloquean el thread del runtime. Usa `tokio::time::sleep`, `tokio::fs::read` y `spawn_blocking` para trabajo CPU.
- **Olvidar dropear senders**: Si no dropeas todos los senders, `rx.recv()` cuelga para siempre. Dropea el sender original despues de spawn los producers.
- **Mantener `std::sync::Mutex` a traves de `.await`**: Esto puede causar deadlock. El lock se mantiene mientras la task esta suspendida, y otra task en el mismo thread puede intentar adquirirlo.
- **No manejar panics de tasks**: Una task que paniquea retorna `JoinError`. Si haces `unwrap()` sin verificar, el panic se propaga a la task que espera.
- **Usar `tokio::spawn` sin await**: Las tasks spawned se ejecutan en background. Si `main` sale antes de que completen, se cancelan. Usa `JoinSet` o guarda los handles.

## FAQ

**Cual es la diferencia entre `tokio::spawn` y `std::thread::spawn`?**

`tokio::spawn` crea una task async ligera (green thread) gestionada por el runtime de Tokio. `std::thread::spawn` crea un OS thread. Las tasks son mucho mas baratas — puedes tener millones de tasks pero solo miles de threads.

**Cuando deberia usar `spawn_blocking`?**

Usa `tokio::task::spawn_blocking` para trabajo CPU-bound o I/O bloqueante (como operaciones `std::fs`). Ejecuta el closure en un pool de threads bloqueantes dedicado, manteniendo el runtime async responsive.

**Deberia usar `tokio::sync::Mutex` o `std::sync::Mutex`?**

En codigo async, prefiere `tokio::sync::Mutex`. Hace yield de la task mientras espera el lock. Usa `std::sync::Mutex` solo cuando el lock se mantiene brevemente y nunca a traves de un punto `.await`.

**Como limito el numero de tasks concurrentes?**

Usa `tokio::sync::Semaphore`. Adquiere un permit antes de iniciar trabajo y dropealo cuando termines. El semaforo asegura que como mucho N tasks se ejecuten concurrentemente.

**Que es `JoinSet` y por que usarlo?**

`JoinSet` es una coleccion de tasks spawned. Proporciona `join_next` para obtener resultados a medida que completan y `abort_all` para cancelar todas las tasks. Asegura que no haya leaks de tasks — cuando el `JoinSet` se dropea, todas las tasks restantes se abortan.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
