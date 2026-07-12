---
contentType: guides
slug: complete-guide-go-concurrency
title: "Referencia Detallada de Concurrencia en Go"
description: "Concurrencia en Go en produccion. Cubre goroutines, channels, context, select, sync primitives, worker pools, pipelines, fan-out/fan-in y patrones para aplicaciones Go concurrentes de alto throughput."
metaDescription: "Concurrencia Go en producción. Cubre goroutines, channels, context, select, sync primitives, worker pools, pipelines y fan-out/fan-in."
difficulty: advanced
topics:
  - concurrency
  - performance
  - testing
tags:
  - go
  - golang
  - concurrency
  - guia
  - goroutines
  - channels
  - context
  - select
relatedResources:
  - /guides/concurrency/complete-guide-python-asyncio-production
  - /guides/concurrency/complete-guide-java-concurrency
  - /patterns/concurrency/async-generator-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Concurrencia Go en producción. Cubre goroutines, channels, context, select, sync primitives, worker pools, pipelines y fan-out/fan-in."
  keywords:
    - concurrencia go
    - goroutines
    - go channels
    - go context
    - go select
    - go sync primitives
    - go worker pools
    - go pipelines
---

## Introducción

Go fue construido para concurrencia. Las goroutines son lightweight (2KB stack inicial), los channels proporcionan comunicacion tipada, y el runtime scheduler multiplexa goroutines sobre OS threads. El approach de Go es diferente de threads-and-locks: favorece comunicacion sobre sharing. Aqui se presenta una guia sobre goroutines, channels, context cancellation, sync primitives, worker pools, pipelines, y patrones de produccion para construir servicios Go concurrentes de alto throughput.

## Goroutines

### Iniciar Goroutines

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func main() {
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            time.Sleep(time.Second)
            fmt.Printf("Worker %d done\n", id)
        }(i)
    }

    wg.Wait()
    fmt.Println("All workers complete")
}
```

### Lifecycle de Goroutine

```text
Goroutine States:
  Running → ejecutando en un OS thread
  Runnable → ready to execute, esperando por un P (processor)
  Waiting → bloqueado en channel, mutex, I/O, o timer

Go Scheduler (GMP model):
  G = Goroutine
  M = Machine (OS thread)
  P = Processor (context para scheduling)
  
  Default: GOMAXPROCS = numero de CPU cores
  Cada P tiene una local run queue de goroutines
  Work-stealing entre local queues de P's
```

### Pitfalls Comunes

```go
// Pitfall 1: Capturar loop variable (Go < 1.22)
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i) // Puede imprimir 5 cinco veces!
    }()
}

// Fix: Pasar como parametro
for i := 0; i < 5; i++ {
    go func(id int) {
        fmt.Println(id) // Correcto
    }(i)
}

// Go 1.22+: loop variable es per-iteration, no necesita fix

// Pitfall 2: Goroutine leak
func leakyFunction() {
    ch := make(chan int)
    go func() {
        val := <-ch // Bloquea para siempre si nadie envia
        fmt.Println(val)
    }()
    // La funcion retorna, la goroutine esta leaked
}

// Fix: Usar context para cancellation
func properFunction(ctx context.Context) {
    ch := make(chan int, 1)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return // Salir cuando context es cancelled
        }
    }()
}
```

## Channels

### Unbuffered vs Buffered

```go
// Unbuffered: sender bloquea hasta receiver este ready
ch := make(chan int)
go func() {
    ch <- 42 // Bloquea hasta que alguien lea
}()
val := <-ch // Bloquea hasta que alguien envie

// Buffered: sender bloquea cuando buffer esta full
ch := make(chan int, 3)
ch <- 1 // No bloquea (buffer tiene espacio)
ch <- 2
ch <- 3
// ch <- 4 // Bloquearia — buffer full
val := <-ch // Recibe 1, buffer ahora tiene espacio

// Channel close
close(ch)

// Leer de closed channel retorna zero value
val, ok := <-ch // ok es false si channel esta closed y empty
```

### Directional Channels

```go
// Send-only channel
func producer(out chan<- int) {
    for i := 0; i < 10; i++ {
        out <- i
    }
    close(out)
}

// Receive-only channel
func consumer(in <-chan int) {
    for val := range in { // Range hasta channel closed
        fmt.Println("Received:", val)
    }
}

func main() {
    ch := make(chan int)
    go producer(ch)
    consumer(ch)
}
```

### Select Statement

```go
// Select espera en multiples channel operations
func selectExample(ch1, ch2 <-chan int, timeout <-chan time.Time) {
    for {
        select {
        case val := <-ch1:
            fmt.Println("From ch1:", val)
        case val := <-ch2:
            fmt.Println("From ch2:", val)
        case <-timeout:
            fmt.Println("Timeout")
            return
        default:
            // Non-blocking: corre si no hay channel ready
            time.Sleep(10 * time.Millisecond)
        }
    }
}

// Select con random choice cuando multiples estan ready
func fanIn(ch1, ch2 <-chan string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for ch1 != nil || ch2 != nil {
            select {
            case v, ok := <-ch1:
                if !ok {
                    ch1 = nil
                    continue
                }
                out <- v
            case v, ok := <-ch2:
                if !ok {
                    ch2 = nil
                    continue
                }
                out <- v
            }
        }
    }()
    return out
}
```

## Context Package

### Context para Cancellation

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func worker(ctx context.Context, id int) error {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d cancelled: %v\n", id, ctx.Err())
            return ctx.Err()
        default:
            // Do work
            time.Sleep(100 * time.Millisecond)
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel() // Siempre llamar cancel para liberar resources

    go worker(ctx, 1)
    go worker(ctx, 2)

    time.Sleep(3 * time.Second)
    fmt.Println("Main done")
}
```

### Propagacion de Context

```go
// Context con deadline
ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(5*time.Second))
defer cancel()

// Context con timeout (relativo)
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// Context con value (usar con moderacion)
type key int
const userIDKey key = 0

ctx = context.WithValue(ctx, userIDKey, "user-123")
userID, _ := ctx.Value(userIDKey).(string)

// Derivar child contexts
func handleRequest(ctx context.Context, req Request) {
    // Child context hereda deadline y cancellation del parent
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    // Pasar a downstream calls
    fetchUser(ctx, req.UserID)
    fetchOrders(ctx, req.UserID)
}

func fetchUser(ctx context.Context, userID string) error {
    req, _ := http.NewRequestWithContext(ctx, "GET", "/users/"+userID, nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            return fmt.Errorf("user fetch timed out")
        }
        return err
    }
    defer resp.Body.Close()
    return nil
}
```

## Sync Primitives

### WaitGroup

```go
var wg sync.WaitGroup

for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        doWork(id)
    }(i)
}
wg.Wait()
```

### Mutex y RWMutex

```go
type SafeCounter struct {
    mu    sync.RWMutex
    count map[string]int
}

func (c *SafeCounter) Increment(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count[key]++
}

func (c *SafeCounter) Value(key string) int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.count[key]
}
```

### Once

```go
var (
    instance *Database
    once     sync.Once
)

func GetDB() *Database {
    once.Do(func() {
        instance = connectDatabase()
    })
    return instance
}
```

### Cond

```go
type Queue struct {
    mu    sync.Mutex
    cond  *sync.Cond
    items []interface{}
}

func NewQueue() *Queue {
    q := &Queue{}
    q.cond = sync.NewCond(&q.mu)
    return q
}

func (q *Queue) Enqueue(item interface{}) {
    q.mu.Lock()
    defer q.mu.Unlock()
    q.items = append(q.items, item)
    q.cond.Signal() // Despertar un waiter
}

func (q *Queue) Dequeue() interface{} {
    q.mu.Lock()
    defer q.mu.Unlock()
    for len(q.items) == 0 {
        q.cond.Wait() // Libera lock, espera, readquiere lock
    }
    item := q.items[0]
    q.items = q.items[1:]
    return item
}
```

### Pool

```go
var bufPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func processRequest(data []byte) string {
    buf := bufPool.Get().(*bytes.Buffer)
    defer bufPool.Put(buf)
    
    buf.Reset()
    buf.Write(data)
    return buf.String()
}
```

## Worker Pool Pattern

```go
package main

import (
    "fmt"
    "sync"
)

type Job struct {
    ID    int
    Input string
}

type Result struct {
    Job    Job
    Output string
    Err    error
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        output, err := process(job.Input)
        results <- Result{Job: job, Output: output, Err: err}
    }
}

func process(input string) (string, error) {
    return "processed:" + input, nil
}

func main() {
    numWorkers := 4
    numJobs := 20

    jobs := make(chan Job, numJobs)
    results := make(chan Result, numJobs)

    var wg sync.WaitGroup

    // Start workers
    for w := 0; w < numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Enviar jobs
    for j := 0; j < numJobs; j++ {
        jobs <- Job{ID: j, Input: fmt.Sprintf("input-%d", j)}
    }
    close(jobs)

    // Esperar a workers terminar, luego cerrar results
    go func() {
        wg.Wait()
        close(results)
    }()

    // Recolectar results
    for result := range results {
        if result.Err != nil {
            fmt.Printf("Job %d failed: %v\n", result.Job.ID, result.Err)
        } else {
            fmt.Printf("Job %d: %s\n", result.Job.ID, result.Output)
        }
    }
}
```

## Pipeline Pattern

```go
package main

import "fmt"

// Stage 1: Generar numeros
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

// Stage 2: Cuadrar cada numero
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// Stage 3: Filtrar numeros pares
func filter(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if n%2 == 0 {
                out <- n
            }
        }
    }()
    return out
}

func main() {
    // Pipeline: generate → square → filter
    nums := generate(1, 2, 3, 4, 5)
    squared := square(nums)
    evens := filter(squared)

    for n := range evens {
        fmt.Println(n) // 4, 16
    }
}
```

## Fan-Out / Fan-In

```go
package main

import (
    "fmt"
    "sync"
)

func producer(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func squarer(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// Fan-out: multiples workers leyendo del mismo channel
// Fan-in: mergear multiples channels en uno
func merge(cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            out <- n
        }
    }

    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}

func main() {
    in := producer(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    // Fan-out: 3 squarer workers
    c1 := squarer(in)
    c2 := squarer(in)
    c3 := squarer(in)

    // Fan-in: mergear results
    for n := range merge(c1, c2, c3) {
        fmt.Println(n)
    }
}
```

## Rate Limiting

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// Token bucket rate limiter usando time.Ticker
func rateLimitedWorker(ctx context.Context, rate int) {
    ticker := time.NewTicker(time.Second / time.Duration(rate))
    defer ticker.Stop()

    for i := 0; ; i++ {
        select {
        case <-ticker.C:
            fmt.Printf("Processing request %d at %v\n", i, time.Now())
        case <-ctx.Done():
            return
        }
    }
}

// Burst rate limiter con buffered channel
func burstRateLimiter(rate int, burst int) <-chan time.Time {
    ch := make(chan time.Time, burst)
    
    // Pre-llenar el burst
    for i := 0; i < burst; i++ {
        ch <- time.Now()
    }
    
    go func() {
        ticker := time.NewTicker(time.Second / time.Duration(rate))
        defer ticker.Stop()
        for t := range ticker.C {
            ch <- t
        }
    }()
    
    return ch
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    limiter := burstRateLimiter(10, 5) // 10/sec, burst de 5

    for i := 0; i < 20; i++ {
        <-limiter // Esperar por token
        fmt.Printf("Request %d at %v\n", i, time.Now())
    }
}
```

## Graceful Shutdown

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    server := &http.Server{
        Addr:    ":8080",
        Handler: nil, // Usar default mux
    }

    // Start server en goroutine
    go func() {
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server failed: %v", err)
        }
    }()
    log.Println("Server started on :8080")

    // Esperar por interrupt signal
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
    <-stop
    log.Println("Shutting down...")

    // Dar 30 segundos a requests outstanding para completar
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Printf("Shutdown error: %v", err)
    }
    log.Println("Server stopped")
}
```

### Detectar Goroutine Leaks

```go
package main

import (
    "runtime"
    "testing"
)

// Trackear goroutine count
func getGoroutineCount() int {
    return runtime.NumGoroutine()
}

// Test para leaks
func TestNoGoroutineLeak(t *testing.T) {
    before := getGoroutineCount()

    // Correr la funcion bajo test
    doWork()

    // Forzar goroutine cleanup
    runtime.GC()
    time.Sleep(100 * time.Millisecond)

    after := getGoroutineCount()
    if before != after {
        t.Errorf("Goroutine leak: before=%d, after=%d", before, after)
    }
}

// Usando goleak en tests
// import "go.uber.org/goleak"
// func TestMain(m *testing.M) {
//     goleak.VerifyTestMain(m)
// }
```

## Testing Concurrent Code

```go
package main

import (
    "sync"
    "sync/atomic"
    "testing"
)

func TestConcurrentCounter(t *testing.T) {
    var counter int64
    var wg sync.WaitGroup

    goroutines := 100
    incrementsPerGoroutine := 1000

    wg.Add(goroutines)
    for i := 0; i < goroutines; i++ {
        go func() {
            defer wg.Done()
            for j := 0; j < incrementsPerGoroutine; j++ {
                atomic.AddInt64(&counter, 1)
            }
        }()
    }
    wg.Wait()

    expected := int64(goroutines * incrementsPerGoroutine)
    if counter != expected {
        t.Errorf("Counter = %d, want %d", counter, expected)
    }
}

func TestChannelOrdering(t *testing.T) {
    ch := make(chan int, 3)
    ch <- 1
    ch <- 2
    ch <- 3
    close(ch)

    expected := []int{1, 2, 3}
    i := 0
    for val := range ch {
        if val != expected[i] {
            t.Errorf("Got %d, want %d", val, expected[i])
        }
        i++
    }
}
```

## Preguntas Frecuentes

### ¿Cuántas goroutines debería correr?

Go puede manejar millones de goroutines. Cada goroutine arranca con 2KB de stack. El limite practico es memoria: 1 millon de goroutines = ~2GB de stack. Para work I/O-bound, usa tantas goroutines como necesites. Para work CPU-bound, limita a `GOMAXPROCS` workers.

### ¿Cuál es la diferencia entre buffered y unbuffered channels?

Unbuffered channels sincronizan sender y receiver: el sender bloquea hasta que el receiver este ready. Buffered channels los desacoplan: el sender bloquea solo cuando el buffer esta full. Usa unbuffered channels para sincronizacion. Usa buffered channels para throughput cuando el producer es mas rapido que el consumer.

### ¿Debería usar channels o mutexes?

Usa channels cuando goroutines necesitan comunicarse y coordinar. Usa mutexes cuando proteges shared state. El motto de Go: "Do not communicate by sharing memory; instead, share memory by communicating." En practica, ambos son validos — elige basado en claridad. Proteger un counter simple con un mutex es mas simple que un channel.

### ¿Cómo cancelo goroutines?

Usa `context.Context`. Crea un context con `context.WithCancel` o `context.WithTimeout`. Pasa el context a las goroutines. Las goroutines deberian `select` en `ctx.Done()` para detectar cancellation. Siempre llama `cancel()` (usualmente con `defer`) para liberar resources.

### ¿Qué causa goroutine leaks?

Una goroutine leakea cuando bloquea para siempre sin forma de salir. Causas comunes: enviar en un channel sin receiver, recibir de un channel que nunca se envia, o olvidar cerrar un channel. Siempre asegura que las goroutines tengan un exit path. Usa context para cancellation y cierra channels cuando los producers terminan.

### ¿Cómo funciona el Go scheduler?

Go usa el modelo GMP: G (goroutine), M (machine/OS thread), P (processor/context). Cada P tiene una local run queue de goroutines. El scheduler corre goroutines en M's usando P's. Cuando una goroutine bloquea en I/O, la M se libera y la P agarra otra goroutine. Work-stealing balancea load entre P's. `GOMAXPROCS` controla el numero de P's.
