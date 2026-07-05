---
contentType: docs
slug: async-task-cancellation-runbook
templateType: runbook
title: "Runbook de Cancelacion de Async Tasks"
description: "Runbook para cancelar de forma segura long-running async tasks en Python, JavaScript, Go y Java: cancellation tokens, context propagation, resource cleanup, timeout strategies y graceful shutdown procedures con ejemplos de codigo."
metaDescription: "Async task cancellation runbook: cancellation tokens, context propagation, resource cleanup, timeouts, graceful shutdown for Python, JS, Go, Java."
difficulty: advanced
topics:
  - concurrency
tags:
  - async
  - cancellation
  - concurrency
  - graceful-shutdown
  - timeouts
  - context-propagation
relatedResources:
  - /docs/concurrency/thread-pool-sizing-template
  - /docs/concurrency/race-condition-debugging-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Async task cancellation runbook: cancellation tokens, context propagation, resource cleanup, timeouts, graceful shutdown for Python, JS, Go, Java."
  keywords:
    - async cancellation
    - cancellation token
    - graceful shutdown
    - context propagation
    - async timeout
    - task cancellation
    - concurrent programming
---

## Overview

Este runbook cubre procedures para cancelar de forma segura long-running async tasks across Python, JavaScript, Go y Java. Improper cancellation lleva a resource leaks, partial writes, orphaned connections y inconsistent state. Este documento cubre cancellation tokens, context propagation, resource cleanup, timeout strategies y graceful shutdown.

---

## 1. Cancellation Patterns

### 1.1 Pattern Comparison

```text
Language    | Cancellation mechanism     | Propagation method
────────────┼────────────────────────────┼──────────────────────────
Python      | asyncio.CancelledError     | task.cancel() + try/finally
JavaScript  | AbortSignal / AbortController | signal.aborted + listeners
Go          | context.Context            | ctx.Done() channel
Java        | CompletableFuture.cancel() | future.cancel(true) + interrupt
```

### 1.2 Cancellation Token Concept

```text
Un cancellation token es un signal object que:
  - Propagates cancellation de caller a callee
  - Puede ser checked en safe points en el code
  - Supporta cleanup via finally blocks o defer
  - Puede tener un timeout (auto-cancel despues de N seconds)
  - Puede tener un deadline (cancela a specific time)

Safe points para check cancellation:
  - Antes de I/O operations (DB, HTTP, file)
  - Dentro de loops que processean batches
  - Antes de acquiring locks
  - Al start de cada pipeline stage
```

---

## 2. Python (asyncio)

### 2.1 Basic Cancellation

```python
import asyncio

async def long_running_task(task_id: str):
    try:
        for i in range(1000):
            # Checkea cancellation en safe points
            await asyncio.sleep(0.1)
            print(f"Task {task_id}: processing item {i}")

    except asyncio.CancelledError:
        print(f"Task {task_id}: cancelled, cleaning up...")
        # Performea cleanup aqui
        await cleanup_resources(task_id)
        raise  # Re-raise para propagate cancellation

async def cleanup_resources(task_id: str):
    print(f"Task {task_id}: closing connections...")
    await asyncio.sleep(0.05)  # Simulatea cleanup
    print(f"Task {task_id}: cleanup complete")

async def main():
    task = asyncio.create_task(long_running_task("worker-1"))

    # Cancela despues de 2 seconds
    await asyncio.sleep(2)
    task.cancel()

    try:
        await task
    except asyncio.CancelledError:
        print("Task was cancelled successfully")

asyncio.run(main())
```

### 2.2 Timeout-Based Cancellation

```python
import asyncio

async def fetch_with_timeout(url: str, timeout: float = 5.0):
    try:
        result = await asyncio.wait_for(
            fetch_data(url),
            timeout=timeout,
        )
        return result
    except asyncio.TimeoutError:
        print(f"Request to {url} timed out after {timeout}s")
        return None

async def fetch_data(url: str):
    reader, writer = await asyncio.open_connection(url, 80)
    try:
        writer.write(b"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n")
        await writer.drain()
        data = await reader.read(4096)
        return data
    finally:
        writer.close()
        await writer.wait_closed()
```

### 2.3 Graceful Shutdown con Signal Handling

```python
import asyncio
import signal

class GracefulShutdown:
    def __init__(self):
        self.shutdown_event = asyncio.Event()
        self.tasks: set[asyncio.Task] = set()

    def setup_signal_handlers(self):
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, self._signal_handler)

    def _signal_handler(self):
        print("\nShutdown signal received, cancelling tasks...")
        self.shutdown_event.set()

    async def run_with_shutdown(self, worker_func, num_workers: int = 4):
        self.setup_signal_handlers()

        # Startea workers
        for i in range(num_workers):
            task = asyncio.create_task(worker_func(i, self.shutdown_event))
            self.tasks.add(task)
            task.add_done_callback(self.tasks.discard)

        # Wait por shutdown signal
        await self.shutdown_event.wait()

        # Cancela all tasks
        for task in self.tasks:
            task.cancel()

        # Wait por all tasks para finish cleanup
        await asyncio.gather(*self.tasks, return_exceptions=True)
        print("All tasks shut down gracefully")

async def worker(worker_id: int, shutdown: asyncio.Event):
    try:
        while not shutdown.is_set():
            print(f"Worker {worker_id}: processing...")
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        print(f"Worker {worker_id}: cleaning up...")
        await asyncio.sleep(0.1)
        print(f"Worker {worker_id}: done")
        raise

asyncio.run(GracefulShutdown().run_with_shutdown(worker))
```

---

## 3. JavaScript (Node.js)

### 3.1 AbortController Cancellation

```javascript
async function longRunningTask(signal, taskId) {
    try {
        for (let i = 0; i < 1000; i++) {
            // Checkea cancellation en safe points
            if (signal.aborted) {
                throw new DOMException('Task cancelled', 'AbortError');
            }

            await sleep(100, signal);
            console.log(`Task ${taskId}: processing item ${i}`);
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log(`Task ${taskId}: cancelled, cleaning up...`);
            await cleanupResources(taskId);
            throw err;
        }
        throw err;
    }
}

function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}

async function cleanupResources(taskId) {
    console.log(`Task ${taskId}: closing connections...`);
    await sleep(50);
    console.log(`Task ${taskId}: cleanup complete`);
}

// Usage
const controller = new AbortController();
const task = longRunningTask(controller.signal, 'worker-1');

setTimeout(() => controller.abort(), 2000);

try {
    await task;
} catch (err) {
    if (err.name === 'AbortError') {
        console.log('Task cancelled successfully');
    } else {
        throw err;
    }
}
```

### 3.2 Fetch con Cancellation

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return await response.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error(`Request to ${url} timed out after ${timeout}ms`);
            return null;
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}
```

### 3.3 Graceful Shutdown en Express

```javascript
const express = require('express');
const app = express();
const server = app.listen(3000);
let connections = new Set();

server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
});

function gracefulShutdown(signal) {
    console.log(`\n${signal} received, shutting down...`);

    server.close(() => {
        console.log('HTTP server closed');

        // Force-close idle connections despues de 10s
        setTimeout(() => {
            connections.forEach((conn) => conn.destroy());
            process.exit(0);
        }, 10000);
    });

    // Destroy idle connections immediately
    connections.forEach((conn) => {
        if (!conn.writableEnded) return;
        conn.destroy();
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## 4. Go (context.Context)

### 4.1 Basic Cancellation

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func longRunningTask(ctx context.Context, taskID string) error {
    for i := 0; i < 1000; i++ {
        // Checkea cancellation en safe points
        select {
        case <-ctx.Done():
            fmt.Printf("Task %s: cancelled, cleaning up...\n", taskID)
            cleanupResources(taskID)
            return ctx.Err()
        default:
        }

        time.Sleep(100 * time.Millisecond)
        fmt.Printf("Task %s: processing item %d\n", taskID, i)
    }
    return nil
}

func cleanupResources(taskID string) {
    fmt.Printf("Task %s: closing connections...\n", taskID)
    time.Sleep(50 * time.Millisecond)
    fmt.Printf("Task %s: cleanup complete\n", taskID)
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    err := longRunningTask(ctx, "worker-1")
    if err != nil {
        fmt.Printf("Task ended: %v\n", err)
    }
}
```

### 4.2 Propagating Context Through HTTP Handlers

```go
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    select {
    case <-ctx.Done():
        // Client disconnected
        fmt.Println("Client cancelled request")
        return
    default:
    }

    result, err := processWithTimeout(ctx, r.URL.Query().Get("id"))
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(result)
}

func processWithTimeout(ctx context.Context, id string) (Result, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    type result struct {
        data Result
        err  error
    }
    ch := make(chan result, 1)

    go func() {
        data, err := slowDatabaseQuery(id)
        ch <- result{data, err}
    }()

    select {
    case <-ctx.Done():
        return Result{}, ctx.Err()
    case res := <-ch:
        return res.data, res.err
    }
}
```

---

## 5. Java (CompletableFuture)

### 5.1 Basic Cancellation

```java
import java.util.concurrent.*;

public class TaskCancellation {
    public static void main(String[] args) throws Exception {
        ExecutorService executor = Executors.newSingleThreadExecutor();

        Future<String> future = executor.submit(() -> {
            for (int i = 0; i < 1000; i++) {
                if (Thread.currentThread().isInterrupted()) {
                    System.out.println("Task cancelled, cleaning up...");
                    cleanupResources();
                    throw new InterruptedException("Task cancelled");
                }
                Thread.sleep(100);
                System.out.println("Processing item " + i);
            }
            return "done";
        });

        Thread.sleep(2000);
        future.cancel(true);

        try {
            future.get();
        } catch (CancellationException e) {
            System.out.println("Task was cancelled");
        }

        executor.shutdown();
    }

    static void cleanupResources() {
        System.out.println("Closing connections...");
        try { Thread.sleep(50); } catch (InterruptedException ignored) {}
        System.out.println("Cleanup complete");
    }
}
```

### 5.2 CompletableFuture con Timeout

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    try {
        Thread.sleep(10000);
        return "result";
    } catch (InterruptedException e) {
        throw new CompletionException(e);
    }
});

try {
    String result = future.orTimeout(5, TimeUnit.SECONDS).get();
    System.out.println("Result: " + result);
} catch (ExecutionException e) {
    if (e.getCause() instanceof TimeoutException) {
        System.out.println("Task timed out after 5 seconds");
        future.cancel(true);
    }
}
```

## Preguntas Frecuentes

### ¿Qué es un cancellation token y por qué lo necesito?

Un cancellation token es un object que signalea cuando un task deberia stop. Sin el, no puedes safely stopper long-running operations — killeando threads abruptly puede leavear resources open, data inconsistent y connections leaked. Un token le permite al task checkear cancellation en safe points y performear cleanup en finally blocks o defer statements. Tambien supporta timeouts y deadlines, para que tasks auto-canceleen si corren too long.

### ¿Cómo handleo cancellation en un pipeline de async stages?

Pasea el cancellation token through every stage del pipeline. Cada stage checkea el token antes de starting work y propagatea cancellation a downstream stages. En Python, usa `asyncio.Task` objects y cancela el root task. En Go, pasea `context.Context` a every function. En JavaScript, pasea `AbortSignal` a cada stage. Cuando cualquier stage se cancela, all upstream y downstream stages deberian stop y clean up.

### ¿Qué pasa si no propago cancellation?

El task continuea running en el background, consumiendo CPU, memory y connections. Esto se llama "leaked task" o "orphaned goroutine." Over time, leaked tasks exhaustan resources y causan que el process hanguee o crashee. Siempre propaga cancellation — si un parent se cancela, cancela all children. Usa structured concurrency patterns (TaskGroups en Python, errgroup en Go) para ensure automatic cancellation propagation.

### ¿Cuánto deberia tomar cleanup despues de cancellation?

Cleanup deberia completear dentro de 5-10 seconds. Setea un hard timeout en cleanup — si toma longer, force-closea resources. En Python, usa `asyncio.wait_for(cleanup(), timeout=5)`. En Go, usa `context.WithTimeout` para cleanup. En JavaScript, usa `Promise.race([cleanup(), timeout(5000)])`. Si cleanup excede el timeout, loggea el issue y force-exit. Nunca dejes que cleanup blockee indefinitely — puede prevenir que el process shut down.

### ¿Deberia usar cancellation o simplemente killear el process?

Usa cancellation para graceful shutdown — permite a tasks finishear current work, flushear buffers, closear connections y writear final state. Kill el process solo como last resort cuando cancellation no funciona dentro de un timeout. En Kubernetes, setea `terminationGracePeriodSeconds` a 30 (default) — el pod recibe SIGTERM, tu code deberia cancelar tasks y cleanup, y si no exit dentro de 30s, Kubernetes manda SIGKILL. Siempre handlea SIGTERM para graceful shutdown.
