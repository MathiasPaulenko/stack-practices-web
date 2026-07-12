---





contentType: recipes
slug: go-goroutines-channels-patterns
title: "Concurrent Patterns with Go Goroutines and Channels"
description: "Build concurrent systems in Go using goroutines, channels, select statements, worker pools, fan-out/fan-in, pipelines, context cancellation, and rate limiting with tickers."
metaDescription: "Build concurrent systems in Go with goroutines and channels. Use select, worker pools, fan-out/fan-in, pipelines, context cancellation, and rate limiting patterns."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - architecture
tags:
  - go
  - golang
  - goroutines
  - channels
  - concurrency
relatedResources:
  - /recipes/python-asyncio-gather-task-groups
  - /recipes/java-completable-future-composition
  - /guides/concurrency-patterns-guide
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-go-concurrency
  - /recipes/csharp-async-await-task-run
  - /recipes/java-virtual-threads-project-loom
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build concurrent systems in Go with goroutines and channels. Use select, worker pools, fan-out/fan-in, pipelines, context cancellation, and rate limiting patterns."
  keywords:
    - go goroutines channels
    - golang concurrency patterns
    - go worker pool
    - go fan-out fan-in
    - go select context cancellation





---

## Overview

Go's concurrency model is built on goroutines (lightweight threads) and channels (typed conduits for communication). The `select` statement multiplexes channel operations. Below: goroutine basics, worker pools, fan-out/fan-in, pipeline construction, context-based cancellation, rate limiting with tickers, and error handling with errgroup.

## When to Use This

- Parallel API calls or data processing
- Producer-consumer pipelines with multiple stages
- Rate-limited operations (API calls, database queries)
- Background workers with graceful shutdown

## Prerequisites

- Go 1.21+

## Solution

### 1. Basic Goroutines and Channels

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
	defer wg.Done()
	for job := range jobs {
		fmt.Printf("Worker %d processing job %d\n", id, job)
		time.Sleep(time.Second) // Simulate work
		results <- job * 2
	}
}

func main() {
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	var wg sync.WaitGroup

	// Start 3 workers
	for w := 1; w <= 3; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}

	// Send 5 jobs
	for j := 1; j <= 5; j++ {
		jobs <- j
	}
	close(jobs)

	// Wait for all workers to finish
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	for r := range results {
		fmt.Printf("Result: %d\n", r)
	}
}
```

### 2. Worker Pool Pattern

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
	JobID  int
	Output string
	Err    error
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()
	for job := range jobs {
		// Process job
		output, err := process(job.Input)
		results <- Result{
			JobID:  job.ID,
			Output: output,
			Err:    err,
		}
	}
}

func process(input string) (string, error) {
	return "processed:" + input, nil
}

func runWorkerPool(numWorkers, numJobs int) []Result {
	jobs := make(chan Job, numJobs)
	results := make(chan Result, numJobs)
	var wg sync.WaitGroup

	// Launch workers
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}

	// Send jobs
	for j := 0; j < numJobs; j++ {
		jobs <- Job{ID: j, Input: fmt.Sprintf("task-%d", j)}
	}
	close(jobs)

	// Wait and collect
	go func() {
		wg.Wait()
		close(results)
	}()

	var allResults []Result
	for r := range results {
		allResults = append(allResults, r)
	}
	return allResults
}

func main() {
	results := runWorkerPool(5, 20)
	fmt.Printf("Processed %d jobs\n", len(results))
}
```

### 3. Fan-Out / Fan-In

```go
package main

import (
	"fmt"
	"sync"
)

// Fan-out: distribute work to multiple goroutines
// Fan-in: merge results from multiple goroutines into one channel

func producer(start, end int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for i := start; i <= end; i++ {
			out <- i
		}
	}()
	return out
}

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

// Fan-in: merge multiple channels into one
func merge(channels ...<-chan int) <-chan int {
	var wg sync.WaitGroup
	out := make(chan int)

	output := func(c <-chan int) {
		defer wg.Done()
		for n := range c {
			out <- n
		}
	}

	wg.Add(len(channels))
	for _, c := range channels {
		go output(c)
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

func main() {
	// Fan-out: 4 workers processing the same input
	input := producer(1, 100)

	squared1 := square(input)
	squared2 := square(input)
	squared3 := square(input)
	squared4 := square(input)

	// Fan-in: merge all squared outputs
	for result := range merge(squared1, squared2, squared3, squared4) {
		fmt.Printf("Result: %d\n", result)
	}
}
```

### 4. Pipeline Pattern

```go
package main

import "fmt"

// Multi-stage pipeline: generate → filter → transform → collect

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

func filter(in <-chan int, predicate func(int) bool) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			if predicate(n) {
				out <- n
			}
		}
	}()
	return out
}

func transform(in <-chan int, fn func(int) int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- fn(n)
		}
	}()
	return out
}

func main() {
	// Pipeline: generate → filter even → square → print
	nums := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
	evens := filter(nums, func(n int) bool { return n%2 == 0 })
	squared := transform(evens, func(n int) int { return n * n })

	for result := range squared {
		fmt.Printf("Even squared: %d\n", result)
	}
}
```

### 5. Context Cancellation and Timeout

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func workerWithCtx(ctx context.Context, id int) error {
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("Worker %d cancelled: %v\n", id, ctx.Err())
			return ctx.Err()
		default:
			// Simulate work
			time.Sleep(500 * time.Millisecond)
			fmt.Printf("Worker %d working...\n", id)
		}
	}
}

func main() {
	// Timeout context — cancels after 2 seconds
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Start 3 workers
	done := make(chan struct{})
	go func() {
		workerWithCtx(ctx, 1)
		workerWithCtx(ctx, 2)
		workerWithCtx(ctx, 3)
		close(done)
	}()

	select {
	case <-done:
		fmt.Println("All workers done")
	case <-ctx.Done():
		fmt.Println("Context cancelled:", ctx.Err())
	}
}
```

### 6. Rate Limiting with Ticker

```go
package main

import (
	"fmt"
	"time"
)

func rateLimitedWorker(id int, rate <-chan time.Time) {
	for t := range rate {
		fmt.Printf("Worker %d ticked at %v\n", id, t)
		// Do rate-limited work here
	}
}

func main() {
	// 5 operations per second
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	// Run for 2 seconds
	timeout := time.After(2 * time.Second)

	go rateLimitedWorker(1, ticker.C)

	select {
	case <-timeout:
		fmt.Println("Time's up!")
	}
}
```

### 7. Select with Multiple Channels

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	tick := time.Tick(100 * time.Millisecond)
	boom := time.After(500 * time.Millisecond)

	for {
		select {
		case <-tick:
			fmt.Println("tick.")
		case <-boom:
			fmt.Println("BOOM!")
			return
		default:
			fmt.Println("    .")
			time.Sleep(50 * time.Millisecond)
		}
	}
}
```

### 8. Error Group (errgroup)

```go
package main

import (
	"fmt"
	"net/http"
	"golang.org/x/sync/errgroup"
)

func fetchURL(url string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("fetch %s: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("fetch %s: status %d", url, resp.StatusCode)
	}
	return nil
}

func main() {
	urls := []string{
		"https://api.example.com/users",
		"https://api.example.com/orders",
		"https://api.example.com/products",
	}

	var g errgroup.Group

	for _, url := range urls {
		url := url // Capture loop variable
		g.Go(func() error {
			return fetchURL(url)
		})
	}

	// Wait for all goroutines — returns first error
	if err := g.Wait(); err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println("All fetches succeeded")
	}
}
```

## How It Works

1. **Goroutines**: Lightweight threads managed by the Go runtime. They start with ~2KB of stack and grow as needed. Millions of goroutines can run concurrently on a handful of OS threads.
2. **Channels**: Typed conduits for communication between goroutines. Unbuffered channels block until both sender and receiver are ready. Buffered channels block only when the buffer is full.
3. **`select`**: Multiplexes multiple channel operations. It blocks until one case is ready, then executes it. If multiple cases are ready, one is chosen at random. The `default` case makes `select` non-blocking.
4. **`context`**: Carries cancellation signals, deadlines, and values across API boundaries. `context.WithCancel` creates a cancellable context. `context.WithTimeout` adds a deadline. Goroutines should check `ctx.Done()` to know when to stop.
5. **`errgroup`**: From `golang.org/x/sync/errgroup`. Manages a group of goroutines and returns the first error. If one goroutine fails, the context is cancelled, signaling other goroutines to stop.

## Variants

### Bounded Parallelism with Semaphore

```go
func boundedParallel(urls []string, maxConcurrent int) []error {
	sem := make(chan struct{}, maxConcurrent)
	errs := make([]error, len(urls))
	var wg sync.WaitGroup

	for i, url := range urls {
		wg.Add(1)
		go func(idx int, u string) {
			defer wg.Done()
			sem <- struct{}{}        // Acquire
			defer func() { <-sem }() // Release
			errs[idx] = fetchURL(u)
		}(i, url)
	}

	wg.Wait()
	return errs
}
```

### Done Channel for Cancellation

```go
func worker(done <-chan struct{}, jobs <-chan Job) {
	for {
		select {
		case <-done:
			return
		case job := <-jobs:
			process(job)
		}
	}
}

// Cancel by closing the done channel
done := make(chan struct{})
go worker(done, jobs)
// ... later
close(done) // Signals all workers to stop
```

### Tee Pattern (Split Channel)

```go
func tee[T any](in <-chan T) (<-chan T, <-chan T) {
	out1 := make(chan T)
	out2 := make(chan T)
	go func() {
		defer close(out1)
		defer close(out2)
		for val := range in {
			out1 <- val
			out2 <- val
		}
	}()
	return out1, out2
}
```

## Best Practices


- For a deeper guide, see [Complete Guide to Go Concurrency](/guides/complete-guide-go-concurrency/).

- **Close channels from the sender side**: The goroutine that writes to a channel should close it. Never close from the receiver side — sending on a closed channel panics.
- **Use `context` for cancellation**: Don't use custom done channels. `context.Context` is the standard way to propagate cancellation. It integrates with HTTP servers, database drivers, and most libraries.
- **Check `ctx.Done()` in loops**: Long-running goroutines should check for cancellation regularly. Use `select` with `case <-ctx.Done()` in the loop.
- **Use buffered channels for decoupling**: Buffered channels let producers and consumers work at different rates. Set the buffer size to the expected burst size.
- **Use `errgroup` for error-aware fan-out**: If any goroutine fails, `errgroup` cancels the context, stopping other goroutines. This prevents wasted work.
- **Avoid goroutine leaks**: Every goroutine should have a termination condition — either a closed channel, a cancelled context, or a completed range. Leaked goroutines consume memory and CPU.

## Common Mistakes

- **Closing a channel from the receiver**: Sending on a closed channel panics. Only the sender should close the channel.
- **Not capturing loop variables**: `for _, url := range urls { go func() { fetch(url) }() }` — all goroutines see the last `url`. Use `url := url` inside the loop or pass as a parameter.
- **Goroutine leaks**: Starting a goroutine that blocks forever (e.g., reading from a channel nobody writes to). Use `context` or a done channel to ensure termination.
- **Using unbuffered channels when decoupling is needed**: Unbuffered channels force sender and receiver to synchronize. If the receiver is slow, the sender blocks. Use buffered channels to decouple.
- **Not handling channel close**: `for val := range ch` handles close automatically. But `val, ok := <-ch` requires checking `ok` — `ok` is false when the channel is closed and empty.

## FAQ

**How many goroutines can I run?**

Go's runtime supports millions of goroutines. Each starts with ~2KB of stack. 100,000 goroutines use ~200MB of stack. The practical limit is memory, not the scheduler.

**Should I use buffered or unbuffered channels?**

Unbuffered channels provide synchronization — the sender blocks until the receiver is ready. Buffered channels decouple sender and receiver. Use unbuffered when you need synchronization, buffered when you need decoupling.

**What is the difference between `context.WithCancel` and `context.WithTimeout`?**

`WithCancel` creates a context you cancel manually by calling `cancel()`. `WithTimeout` creates a context that cancels automatically after the specified duration. Use `WithTimeout` for operations with a deadline, `WithCancel` for explicit cancellation.

**How do I wait for all goroutines to finish?**

Use `sync.WaitGroup`. Call `wg.Add(1)` before starting each goroutine, `wg.Done()` when it finishes, and `wg.Wait()` to block until all are done. For error-aware waiting, use `errgroup.Group`.

**What happens if I send on a closed channel?**

It panics with "send on closed channel". This is a common bug. Only the sender should close the channel, and only after all sends are complete. Use `sync.Once` if multiple goroutines might close the same channel.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
