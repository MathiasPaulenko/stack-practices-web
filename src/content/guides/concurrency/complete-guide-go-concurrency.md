---
contentType: guides
slug: complete-guide-go-concurrency
title: "Complete Guide to Go Concurrency"
description: "Master Go concurrency in production. Covers goroutines, channels, context, select, sync primitives, worker pools, pipelines, fan-out/fan-in, and patterns for high-throughput concurrent Go applications."
metaDescription: "Master Go concurrency. Covers goroutines, channels, context, select, sync primitives, worker pools, pipelines, and fan-out/fan-in patterns."
difficulty: advanced
topics:
  - concurrency
  - performance
  - testing
tags:
  - go
  - golang
  - concurrency
  - guide
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
  metaDescription: "Master Go concurrency. Covers goroutines, channels, context, select, sync primitives, worker pools, pipelines, and fan-out/fan-in patterns."
  keywords:
    - go concurrency
    - goroutines
    - go channels
    - go context
    - go select
    - go sync primitives
    - go worker pools
    - go pipelines
---

## Introduction

Go was built for concurrency. Goroutines are lightweight (2KB initial stack), channels provide typed communication, and the runtime scheduler multiplexes goroutines onto OS threads. Go's approach is different from threads-and-locks: it favors communication over sharing. This guide covers goroutines, channels, context cancellation, sync primitives, worker pools, pipelines, and production patterns for building high-throughput concurrent Go services.

## Goroutines

### Starting Goroutines

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

### Goroutine Lifecycle

```text
Goroutine States:
  Running → executing on an OS thread
  Runnable → ready to execute, waiting for a P (processor)
  Waiting → blocked on channel, mutex, I/O, or timer

Go Scheduler (GMP model):
  G = Goroutine
  M = Machine (OS thread)
  P = Processor (context for scheduling)
  
  Default: GOMAXPROCS = number of CPU cores
  Each P has a local run queue of goroutines
  Work-stealing between P's local queues
```

### Common Pitfalls

```go
// Pitfall 1: Capturing loop variable (Go < 1.22)
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i) // May print 5 five times!
    }()
}

// Fix: Pass as parameter
for i := 0; i < 5; i++ {
    go func(id int) {
        fmt.Println(id) // Correct
    }(i)
}

// Go 1.22+: loop variable is per-iteration, no fix needed

// Pitfall 2: Goroutine leak
func leakyFunction() {
    ch := make(chan int)
    go func() {
        val := <-ch // Blocks forever if nobody sends
        fmt.Println(val)
    }()
    // Function returns, goroutine is leaked
}

// Fix: Use context for cancellation
func properFunction(ctx context.Context) {
    ch := make(chan int, 1)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return // Exit when context is cancelled
        }
    }()
}
```

## Channels

### Unbuffered vs Buffered

```go
// Unbuffered: sender blocks until receiver is ready
ch := make(chan int)
go func() {
    ch <- 42 // Blocks until someone reads
}()
val := <-ch // Blocks until someone sends

// Buffered: sender blocks when buffer is full
ch := make(chan int, 3)
ch <- 1 // Does not block (buffer has space)
ch <- 2
ch <- 3
// ch <- 4 // Would block — buffer full
val := <-ch // Receives 1, buffer now has space

// Channel close
close(ch)

// Reading from closed channel returns zero value
val, ok := <-ch // ok is false if channel is closed and empty
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
    for val := range in { // Range until channel is closed
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
// Select waits on multiple channel operations
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
            // Non-blocking: runs if no channel is ready
            time.Sleep(10 * time.Millisecond)
        }
    }
}

// Select with random choice when multiple are ready
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

### Context for Cancellation

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
    defer cancel() // Always call cancel to release resources

    go worker(ctx, 1)
    go worker(ctx, 2)

    time.Sleep(3 * time.Second)
    fmt.Println("Main done")
}
```

### Context Propagation

```go
// Context with deadline
ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(5*time.Second))
defer cancel()

// Context with timeout (relative)
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// Context with value (use sparingly)
type key int
const userIDKey key = 0

ctx = context.WithValue(ctx, userIDKey, "user-123")
userID, _ := ctx.Value(userIDKey).(string)

// Derive child contexts
func handleRequest(ctx context.Context, req Request) {
    // Child context inherits parent's deadline and cancellation
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    // Pass to downstream calls
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

### Mutex and RWMutex

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
    q.cond.Signal() // Wake one waiter
}

func (q *Queue) Dequeue() interface{} {
    q.mu.Lock()
    defer q.mu.Unlock()
    for len(q.items) == 0 {
        q.cond.Wait() // Releases lock, waits, reacquires lock
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

    // Send jobs
    for j := 0; j < numJobs; j++ {
        jobs <- Job{ID: j, Input: fmt.Sprintf("input-%d", j)}
    }
    close(jobs)

    // Wait for workers to finish, then close results
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
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

// Stage 1: Generate numbers
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

// Stage 2: Square each number
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

// Stage 3: Filter even numbers
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

// Fan-out: multiple workers reading from the same channel
// Fan-in: merge multiple channels into one
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

    // Fan-in: merge results
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

// Token bucket rate limiter using time.Ticker
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

// Burst rate limiter with buffered channel
func burstRateLimiter(rate int, burst int) <-chan time.Time {
    ch := make(chan time.Time, burst)
    
    // Pre-fill the burst
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

    limiter := burstRateLimiter(10, 5) // 10/sec, burst of 5

    for i := 0; i < 20; i++ {
        <-limiter // Wait for token
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
        Handler: nil, // Use default mux
    }

    // Start server in goroutine
    go func() {
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server failed: %v", err)
        }
    }()
    log.Println("Server started on :8080")

    // Wait for interrupt signal
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
    <-stop
    log.Println("Shutting down...")

    // Give outstanding requests 30 seconds to complete
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Printf("Shutdown error: %v", err)
    }
    log.Println("Server stopped")
}
```

## Detecting Goroutine Leaks

```go
package main

import (
    "runtime"
    "testing"
)

// Track goroutine count
func getGoroutineCount() int {
    return runtime.NumGoroutine()
}

// Test for leaks
func TestNoGoroutineLeak(t *testing.T) {
    before := getGoroutineCount()

    // Run the function under test
    doWork()

    // Force goroutine cleanup
    runtime.GC()
    time.Sleep(100 * time.Millisecond)

    after := getGoroutineCount()
    if before != after {
        t.Errorf("Goroutine leak: before=%d, after=%d", before, after)
    }
}

// Using goleak in tests
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

## FAQ

### How many goroutines should I run?

Go can handle millions of goroutines. Each goroutine starts with 2KB of stack. The practical limit is memory: 1 million goroutines = ~2GB of stack. For I/O-bound work, use as many goroutines as needed. For CPU-bound work, limit to `GOMAXPROCS` workers.

### What is the difference between buffered and unbuffered channels?

Unbuffered channels synchronize sender and receiver: the sender blocks until the receiver is ready. Buffered channels decouple them: the sender blocks only when the buffer is full. Use unbuffered channels for synchronization. Use buffered channels for throughput when the producer is faster than the consumer.

### Should I use channels or mutexes?

Use channels when goroutines need to communicate and coordinate. Use mutexes when protecting shared state. Go's motto: "Do not communicate by sharing memory; instead, share memory by communicating." In practice, both are valid — choose based on clarity. Protecting a simple counter with a mutex is simpler than a channel.

### How do I cancel goroutines?

Use `context.Context`. Create a context with `context.WithCancel` or `context.WithTimeout`. Pass the context to goroutines. Goroutines should `select` on `ctx.Done()` to detect cancellation. Always call `cancel()` (usually with `defer`) to release resources.

### What causes goroutine leaks?

A goroutine leaks when it blocks forever with no way to exit. Common causes: sending on a channel with no receiver, receiving on a channel that is never sent to, or forgetting to close a channel. Always ensure goroutines have an exit path. Use context for cancellation and close channels when producers are done.

### How does the Go scheduler work?

Go uses the GMP model: G (goroutine), M (machine/OS thread), P (processor/context). Each P has a local run queue of goroutines. The scheduler runs goroutines on M's using P's. When a goroutine blocks on I/O, the M is freed and the P picks up another goroutine. Work-stealing balances load between P's. `GOMAXPROCS` controls the number of P's.
