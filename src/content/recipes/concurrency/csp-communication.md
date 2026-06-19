---
contentType: recipes
slug: csp-communication
title: "Coordinate Concurrent Tasks with Communicating Sequential Processes (CSP)"
description: "How to structure concurrent programs using channels, select statements, and goroutines for safe communication without shared mutable state in Go, Rust, and JavaScript."
metaDescription: "Learn CSP for concurrent task coordination. Use channels, select statements, and goroutines to communicate safely without shared mutable state in Go, Rust, and JS."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/async-patterns
  - /recipes/concurrent-data-structures
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
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

Shared memory concurrency is error-prone. Two threads read and write the same variable, and you need locks, atomic operations, and careful reasoning about memory visibility to prevent race conditions. The core problem is not concurrency itself — it is sharing mutable state between concurrent actors.

Communicating Sequential Processes (CSP), popularized by Go, inverts this model. Instead of sharing memory, goroutines (lightweight threads) communicate by sending messages through channels. A channel is a typed queue that one goroutine writes to and another reads from. The sender blocks until the receiver is ready (for unbuffered channels), or until the buffer has space (for buffered channels). By design, goroutines do not share mutable state — they pass ownership of data through channels. This recipe covers Go channels, Rust async channels, and JavaScript-like CSP patterns with practical examples.

## When to use it

Use this recipe when:

- Multiple concurrent workers need to coordinate without shared mutable state
- Building pipelines where the output of one stage is the input of the next
- Implementing fan-out (one producer, many consumers) and fan-in (many producers, one consumer)
- Replacing lock-based concurrency with message-passing for clarity and safety
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

- **Channels as typed queues**: a channel in Go is a typed FIFO queue. The type system ensures you cannot accidentally send a string to a channel expecting integers. Buffered channels decouple the sender and receiver — the sender blocks only when the buffer is full. Unbuffered channels synchronize sender and receiver at the exact moment of handoff.
- **Select for multiplexing**: the `select` statement waits on multiple channel operations simultaneously. If multiple channels are ready, Go picks one pseudorandomly. This enables merging multiple input streams, adding timeouts, and implementing non-blocking receives. It is the CSP equivalent of `poll()` or `epoll()`.
- **Ownership transfer**: when a value is sent through a channel, the sender relinquishes ownership. The receiver becomes the sole owner after the receive. This eliminates data races by construction — there is no shared state to race on. The only synchronization point is the channel itself.
- **Fan-out / fan-in**: fan-out creates multiple worker goroutines reading from the same jobs channel. The channel naturally load-balances — whichever worker is ready receives the next job. Fan-in merges multiple result channels into one using `select`. This pattern scales to thousands of goroutines because goroutines are lightweight (a few KB of stack that grows and shrinks dynamically).

## Variants

| Channel type | Buffer | Synchronization | Best for |
|-------------|--------|-----------------|----------|
| Unbuffered | 0 | Rendezvous | Handshake, precise timing |
| Buffered | N > 0 | Decoupled | Producer-consumer, backpressure |
| Closed | N/A | Signal completion | Signaling no more values |
| Nil | N/A | Never selected | Disabling select cases |

## Best practices

- **Close channels from the sender, not the receiver**: in Go, only the sender should close a channel. Closing from the receiver causes a panic if the sender simultaneously sends. Use a `done` channel or `context.Context` for cancellation signals instead of closing from the consumer side.
- **Use `select` with a `done` channel for cancellation**: long-running goroutines should accept a `done` or `ctx.Done()` channel. When the parent wants to cancel, it closes the done channel. The child uses `select` to either do work or exit when done is closed.
- **Always receive from closed channels correctly**: reading from a closed channel returns the zero value of the channel type immediately. Use the comma-ok idiom (`v, ok := <-ch`) to distinguish between a real zero value and a closed channel.
- **Buffer channels when appropriate**: unbuffered channels force strict synchronization, which can serialize your program and negate concurrency benefits. Buffered channels allow the sender to proceed without waiting, improving throughput. Size the buffer to match expected burstiness.
- **Use `sync.WaitGroup` for goroutine coordination**: when launching a fixed number of goroutines, use `WaitGroup` to block until all complete. Do not count receives from a results channel unless you know the exact expected count — a missed send or extra send deadlocks the program.

## Common mistakes

- **Sending on a closed channel**: this panics. Always ensure only one goroutine closes the channel, and that no other goroutine sends after the close. Use a `sync.Once` or a dedicated controller goroutine if multiple senders exist.
- **Goroutine leaks**: launching a goroutine that never exits leaks memory. If a goroutine waits on a channel that is never closed and never receives another send, it stays alive forever. Always ensure there is a path to exit — either through channel closure, a done signal, or timeout.
- **Using shared variables with goroutines**: closing over a loop variable (`for i := 0; i < 10; i++ { go func() { fmt.Println(i) }() }`) captures the same variable reference in every closure, causing all goroutines to print the final value. Pass the variable as a parameter to the closure: `go func(i int) { ... }(i)`.
- **Forgetting that channel receive from nil blocks forever**: a nil channel never becomes ready for send or receive. If a variable of channel type is declared but not initialized, reading from it blocks forever. Always initialize channels with `make(chan T)` or assign from a function that returns an initialized channel.

## FAQ

**Q: Are channels just queues with locking?**
A: Under the hood, channels use locks and condition variables. But the abstraction they provide — ownership transfer, typed communication, and select-based multiplexing — is higher-level and safer than manual locking. The implementation uses locks; the mental model does not.

**Q: How many goroutines is too many?**
A: Go routinely handles hundreds of thousands of goroutines. They start with a 2KB stack that grows and shrinks. The scheduler multiplexes goroutines onto OS threads (M:N scheduling). The limit is memory — each goroutine consumes some overhead. If you hit memory limits, use a worker pool with a fixed number of goroutines.

**Q: Should I use mutexes or channels?**
A: Use channels for coordinating and communicating between goroutines. Use mutexes for protecting shared state that must be accessed by multiple goroutines. Go's proverb is "share memory by communicating, do not communicate by sharing memory." When in doubt, start with channels.

**Q: Can I use CSP patterns in languages other than Go?**
A: Yes — Rust has `tokio::sync::mpsc`, JavaScript can use async generators, and languages like Clojure have core.async. The fundamental pattern (message passing between sequential processes) is language-agnostic, though Go's built-in syntax (`go`, `chan`, `select`) makes it the most ergonomic.

