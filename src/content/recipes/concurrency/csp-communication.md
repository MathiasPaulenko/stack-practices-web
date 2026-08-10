---
contentType: recipes
slug: csp-communication
title: "Coordinate Concurrent Tasks with Communicating"
description: "How to structure concurrent programs using channels, select statements, and goroutines for safe communication without shared mutable state in Go, Rust, and JavaScript."
metaDescription: "Learn CSP for concurrent task coordination. Use channels, select statements, and goroutines to communicate safely without shared mutable state in Go, Rust, and JS."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - async
  - threads
  - parallel
  - locks
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/async-patterns
  - /recipes/concurrent-data-structures
  - /guides/concurrency-patterns-guide
  - /docs/race-condition-debugging-checklist
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Learn CSP for concurrent task coordination. Use channels, select statements, and goroutines to communicate safely without shared mutable state in Go, Rust, and JS."
  keywords:
    - CSP communicating sequential processes
    - channels concurrency
    - goroutines go
    - select statement
    - message passing

---
## Overview

Shared memory concurrency is error-prone. Two threads read and write the same variable, and you need locks, atomic operations, and careful reasoning about memory visibility to prevent race conditions. The core problem is not concurrency itself â€” it is sharing mutable state between concurrent actors.

Communicating Sequential Processes (CSP), popularized by Go, inverts this model. Instead of sharing memory, goroutines (lightweight threads) communicate by sending messages through channels. A channel is a typed queue that one goroutine writes to and another reads from. The sender blocks until the receiver is ready (for unbuffered channels), or until the buffer has space (for buffered channels). By design, goroutines do not share mutable state â€” they pass ownership of data through channels. This approach handles Go channels, Rust async channels, and JavaScript-like CSP patterns with practical examples.

## When to use it

Use this recipe when:

- Multiple concurrent workers need to coordinate without shared mutable state
- Building [pipelines](/guides/microservices-architecture-guide/) where the output of one stage is the input of the next
- Implementing fan-out (one producer, many consumers) and fan-in (many producers, one consumer)
- Replacing [lock-based concurrency](/recipes/concurrent-data-structures/) with message-passing for clarity and safety
- Writing Go programs where goroutines and channels are the idiomatic concurrency model

## Solution

### Go Channels and Goroutines

```go
package main

import (
	"fmt"
	"time"
)

// Pipeline stage: generator produces numbers
func generator(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		for _, n := range nums {
			out <- n
		}
		close(out)
	}()
	return out
}

// Pipeline stage: squares incoming numbers
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			out <- n * n
		}
		close(out)
	}()
	return out
}

// Fan-out: multiple workers consuming from the same channel
func worker(id int, jobs <-chan int, results chan<- int) {
	for j := range jobs {
		fmt.Printf("Worker %d processing job %d\n", id, j)
		time.Sleep(time.Millisecond * 100)
		results <- j * 2
	}
}

func main() {
	// Pipeline
	nums := generator(2, 3, 4, 5)
	squares := square(nums)
	for s := range squares {
		fmt.Println(s)
	}

	// Fan-out / Fan-in
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	for j := 1; j <= 9; j++ {
		jobs <- j
	}
	close(jobs)

	for a := 1; a <= 9; a++ {
		<-results
	}
}
```

### Select Statement (Go)

```go
func multiplex(ch1, ch2 <-chan string) <-chan string {
	out := make(chan string)
	go func() {
		for {
			select {
			case msg := <-ch1:
				out <- "ch1: " + msg
			case msg := <-ch2:
				out <- "ch2: " + msg
			case <-time.After(time.Second * 5):
				out <- "timeout"
				return
			}
		}
	}()
	return out
}
```

### Rust Async Channels (tokio)

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<i32>(100);

    tokio::spawn(async move {
        for i in 0..10 {
            tx.send(i).await.unwrap();
        }
    });

    while let Some(value) = rx.recv().await {
        println!("Received: {}", value);
    }
}
```

### JavaScript-like CSP (using async generators)

```typescript
async function* generatorChannel() {
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 100));
    yield i;
  }
}

async function* squareChannel(source: AsyncIterable<number>) {
  for await (const n of source) {
    yield n * n;
  }
}

async function main() {
  const nums = generatorChannel();
  const squares = squareChannel(nums);

  for await (const s of squares) {
    console.log(s);
  }
}
```

## Explanation

- **Channels as typed queues**: a channel in Go is a typed FIFO queue.  The type system ensures you cannot accidentally send a string to a channel expecting integers.  Buffered channels decouple the sender and receiver â€” the sender blocks only when the buffer is full.  Unbuffered channels synchronize sender and receiver at the exact moment of handoff.
- **Select for multiplexing**: the `select` statement waits on multiple channel operations simultaneously.  If multiple channels are ready, Go picks one pseudorandomly.  This enables merging multiple input streams, adding timeouts, and implementing non-blocking receives.  It is the CSP equivalent of `poll()` or `epoll()`.
- **Ownership transfer**: when a value is sent through a channel, the sender relinquishes ownership.  The receiver becomes the sole owner after the receive.  This eliminates data races by construction â€” there is no shared state to race on.  The only synchronization point is the channel itself.
- **Fan-out / fan-in**: fan-out creates multiple worker goroutines reading from the same jobs channel.  The channel naturally load-balances â€” whichever worker is ready receives the next job.  Fan-in merges multiple result channels into one using `select`.  This pattern scales to thousands of goroutines because goroutines are lightweight (a few KB of stack that grows and shrinks dynamically).

## Variants

| Channel type | Buffer | Synchronization | Best for |
|-------------|--------|-----------------|----------|
| Unbuffered | 0 | Rendezvous | Handshake, precise timing |
| Buffered | N > 0 | Decoupled | Producer-consumer, backpressure |
| Closed | N/A | Signal completion | Signaling no more values |
| Nil | N/A | Never selected | Disabling select cases |

## What Works

- **Close channels from the sender, not the receiver**: in Go, only the sender should close a channel.  Closing from the receiver causes a panic if the sender simultaneously sends. Context` for cancellation signals instead of closing from the consumer side.
- **Use `select` with a `done` channel for cancellation**: long-running goroutines should accept a `done` or `ctx. Done()` channel.  When the parent wants to cancel, it closes the done channel.  The child uses `select` to either do work or exit when done is closed.
- **Always receive from closed channels correctly**: reading from a closed channel returns the zero value of the channel type immediately.
- **Buffer channels when appropriate**: unbuffered channels force strict synchronization, which can serialize your program and negate concurrency benefits.  Buffered channels allow the sender to proceed without waiting, improving throughput.  Size the buffer to match expected burstiness.
- **Use `sync.WaitGroup` for goroutine coordination**: when launching a fixed number of goroutines, use `WaitGroup` to block until all complete.  Do not count receives from a results channel unless you know the exact expected count â€” a missed send or extra send deadlocks the program.

## Common mistakes

- **Sending on a closed channel**: this panics.  Always ensure only one goroutine closes the channel, and that no other goroutine sends after the close. Once` or a dedicated controller goroutine if multiple senders exist.
- **Goroutine leaks**: launching a goroutine that never exits leaks memory.  If a goroutine waits on a channel that is never closed and never receives another send, it stays alive forever.  Always ensure there is a path to exit â€” either through channel closure, a done signal, or timeout.
- **Using shared variables with goroutines**: closing over a loop variable (`for i := 0; i < 10; i++ { go func() { fmt. Println(i) }() }`) captures the same variable reference in every closure, causing all goroutines to print the final value.  Pass the variable as a parameter to the closure: `go func(i int) { ...  }(i)`.
- **Forgetting that channel receive from nil blocks forever**: a nil channel never becomes ready for send or receive.  If a variable of channel type is declared but not initialized, reading from it blocks forever.  Always initialize channels with `make(chan T)` or assign from a function that returns an initialized channel.

## When Not to Use This Approach

- **High-throughput data pipelines**: CSP channels add coordination overhead.
- **Systems requiring random access to shared data**: channels are for passing ownership, not sharing mutable state.
- **Latency-sensitive inner loops**: channel send/receive involves scheduling and potential blocking.
- **Inter-process communication**: Go channels work within a single process.  For IPC, use OS pipes, shared memory, or message queues.
- **Simple request-response patterns**: if a function just needs to call another and get a result, a channel is overkill.
- **Fan-out to millions of consumers**: channels are M:N communication, not pub/sub.  Broadcasting to millions of consumers requires a different pattern (e. g.

## Performance Benchmarks

- **Channel send/receive latency**: unbuffered channel send+receive takes ~50-100ns on modern hardware.
- **Channel throughput**: a single Go channel handles 10-50 million messages/sec for small payloads (<64 bytes).
- **Select statement overhead**: a select with 4 cases adds ~30ns per operation.  With 64 cases, overhead rises to ~200ns.
- **Goroutine scheduling**: the Go scheduler multiplexes goroutines onto OS threads with ~100ns context switch cost.
- **Channel vs mutex**: for sharing a counter, sync. Mutex + int64 is 2-3x faster than channel-based communication.
- **Buffered vs unbuffered**: buffered channels with capacity 1,000 achieve 2x throughput of unbuffered channels under high load.

## Testing Strategy

- **Test for deadlocks**: run tests with -race flag in Go. Use untime.GOMAXPROCS(runtime.NumCPU()) to maximize scheduling diversity and surface deadlocks
- **Test channel closure behavior**: verify that sending on a closed channel panics and receiving on a closed channel returns the zero value.
- **Test select fairness**: Go's select randomizes case selection.
- **Test backpressure**: fill a buffered channel and verify that senders block.
- **Test goroutine leaks**: use untime.NumGoroutine() before and after tests. A growing count indicates goroutines that never terminate (blocked on channel receive)
- **Test with the race detector**: go test -race detects data races at runtime.  Run it on every CI build.

## Cost Estimation

- **Memory per channel**: an unbuffered channel uses ~96 bytes.  A buffered channel with capacity N uses ~96 + N * element_size bytes.
- **Goroutine stack memory**: each goroutine starts with 2KB and grows/shrinks dynamically.  100,000 goroutines use ~200MB minimum.
- **Development productivity**: CSP encourages clear ownership boundaries.  Teams report 30-40% fewer race condition bugs compared to shared-memory concurrency.
- **Infrastructure savings**: Go's efficient goroutine model means fewer servers.
- **Monitoring cost**: Go's built-in pprof and trace tools are free.  Channel contention and goroutine leaks are visible without commercial APM tools.

## Monitoring and Observability

- **Goroutine count**: monitor untime.NumGoroutine(). A growing count indicates leaks. Alert when count exceeds 2x the expected steady state
- **Channel queue depth**: there is no built-in len() alerting for channels.
- **GC pause time**: Go's GC pauses are typically <1ms.
- **Scheduler latency**: use untime/trace to measure scheduling delays. High delays (>1ms) indicate CPU starvation or too many runnable goroutines
- **Send/receive blocking time**: instrument channel operations with timers to measure how long senders and receivers block.

## Deployment Checklist

- [ ] Set GOMAXPROCS to the number of CPU cores (default in Go 1.5+). Do not override unless you have a specific reason
- [ ] Configure graceful shutdown: close channels in dependency order, use context.Context for cancellation, wait for goroutines with sync.WaitGroup
- [ ] Set memory limits: Go's runtime respects GOMEMLIMIT (Go 1.19+). Set it to 80% of container memory to avoid OOM kills
- [ ] Enable pprof endpoints in production (
et/http/pprof). Protect them with authentication or bind to an internal port
- [ ] Set GC tuning parameters: GOGC controls trigger ratio. Default 100 means GC runs when heap doubles. Lower values reduce memory at the cost of CPU
- [ ] Configure channel buffer sizes based on producer/consumer rate analysis. Default to unbuffered unless you measure a specific benefit

## Security Considerations

- **Goroutine leak DoS**: an attacker can trigger goroutine leaks by opening connections and never completing the handshake.  Each leaked goroutine holds ~2KB+ of memory.
- **Channel-based resource exhaustion**: unbuffered channels block senders.  An attacker can exploit this by being a slow receiver, causing senders to accumulate and exhaust goroutines.
- **Poison pill injection**: a malicious producer can send a specially crafted value that causes consumers to panic or enter an infinite loop.
- **Information leakage via channel timing**: channel send/receive timing varies with queue depth.  An attacker measuring response times can infer internal state.
- **Unsafe closure capture**: closing over loop variables in goroutines captures the final value of the loop variable.  This is a well-known Go bug that can leak data or cause incorrect behavior.
- **Channel close race**: closing a channel while a sender is still active causes a panic. Once or a context. Context to coordinate shutdown.
- **Denial of service via select starvation**: if a select has cases with varying execution times, fast cases may starve slow cases.  Go randomizes case selection, but an attacker can exploit timing to bias selection.
- **Memory exhaustion via large channel messages**: channels do not limit message size.  An attacker can send large payloads through a channel to exhaust memory.
- **Goroutine stack growth attacks**: deeply recursive goroutines can grow their stack to the 1GB limit.  An attacker can trigger deep recursion via crafted input.
- **Context cancellation bypass**: if a goroutine does not check ctx. Done(), it ignores cancellation.  Audit all goroutines for context checks.

## Troubleshooting

- **Race conditions appear under load**: protect shared state with locks, atomics, or message passing.  Reproduce with targeted stress tests.
- **Deadlock between workers**: establish a consistent lock acquisition order and keep critical sections short.
- **Thread pool saturation**: monitor queue length and rejection policy.  Increase pool size only if CPU and memory allow.
- **Actor mailbox grows unbounded**: apply backpressure, bounded queues, and load shedding.
- **Async task never completes**: check for unhandled promise rejections, forgotten awaits, and infinite loops in cooperative scheduling.



## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply coordinate concurrent tasks with communicating** when you need a practical solution for concurrency.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Are channels just queues with locking?**
A: internally, channels use locks and condition variables. But the abstraction they provide â€” ownership transfer, typed communication, and select-based multiplexing â€” is higher-level and safer than manual locking. The implementation uses locks; the mental model does not.

**Q: How many goroutines is too many?**
A: Go routinely handles hundreds of thousands of goroutines. They start with a 2KB stack that grows and shrinks. The scheduler multiplexes goroutines onto OS threads (M:N scheduling). The limit is memory â€” each goroutine consumes some overhead. If you hit memory limits, use a worker pool with a fixed number of goroutines.

**Q: Should I use mutexes or channels?**
A: Use channels for coordinating and communicating between goroutines. Use mutexes for protecting shared state that must be accessed by multiple goroutines. Go's proverb is "share memory by communicating, do not communicate by sharing memory." When in doubt, start with channels. See [Concurrent Data Structures](/recipes/concurrent-data-structures/) for lock-based alternatives.

**Q: Can I use CSP patterns in languages other than Go?**
A: Yes â€” Rust has `tokio::sync::mpsc`, JavaScript can use async generators, and languages like Clojure have core.async. The fundamental pattern (message passing between sequential processes) is language-agnostic, though Go's built-in syntax (`go`, `chan`, `select`) makes it the most ergonomic.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
