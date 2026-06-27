---
contentType: recipes
slug: race-condition-prevention
title: "Prevent Race Conditions in JavaScript Async Code"
description: "Identify and fix race conditions in asynchronous JavaScript using proper sequencing, atomic operations, locks, and Promise patterns for predictable concurrent execution"
metaDescription: "Prevent race conditions in async JavaScript. Use proper sequencing, atomic operations, and Promise patterns for predictable concurrent execution."
difficulty: intermediate
topics:
  - concurrency
  - frontend
tags:
  - race-condition
  - concurrency
  - javascript
  - async
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prevent race conditions in async JavaScript. Use proper sequencing, atomic operations, and Promise patterns for predictable concurrent execution."
  keywords:
    - race condition
    - async javascript
    - concurrent execution
    - atomic operations
    - promise patterns
---

# Prevent Race Conditions in JavaScript Async Code

Race conditions occur when multiple async operations access shared state without proper coordination, leading to non-deterministic behavior. This recipe covers identifying, preventing, and fixing race conditions in JavaScript using atomic updates, proper Promise sequencing, and lock patterns.

## When to Use This

- Multiple [API calls](/recipes/api/call-rest-api) update the same state or DOM elements. See [Async Patterns](/recipes/concurrency/async-patterns) for coordination.
- [Cached data](/recipes/data/caching) becomes stale or inconsistent under concurrent access
- Debounced inputs trigger overlapping network requests with unpredictable ordering

## Problem

A search component fires a new request on every keystroke. If results arrive out of order, the UI shows stale data from a previous query.

## Solution

### 1. Request Cancellation with AbortController

```typescript
// search/SearchService.ts
class SearchService {
  private abortController: AbortController | null = null;

  async search(query: string): Promise<unknown[]> {
    // Cancel previous request
    this.abortController?.abort();
    this.abortController = new AbortController();

    const response = await fetch(`/api/search?q=${query}`, {
      signal: this.abortController.signal,
    });

    return response.json();
  }
}
```

### 2. Atomic State Updates

```typescript
// counter/AtomicCounter.ts
class AtomicCounter {
  private value = 0;
  private queue = Promise.resolve();

  increment(): Promise<number> {
    this.queue = this.queue.then(async () => {
      // Read current value
      const current = this.value;
      // Simulate async work
      await delay(10);
      // Only update if value hasn't changed
      if (this.value === current) {
        this.value = current + 1;
      }
      return this.value;
    });

    return this.queue;
  }

  getValue(): number {
    return this.value;
  }
}
```

### 3. Debounce with Latest-Only Execution

```typescript
// hooks/useLatestQuery.ts
import { useCallback, useRef } from 'react';

function useLatestQuery<T>() {
  const latestRequest = useRef(0);

  return useCallback(async (query: string, fetcher: (q: string) => Promise<T>): Promise<T> => {
    const requestId = ++latestRequest.current;
    const result = await fetcher(query);

    // Ignore if a newer request was made
    if (requestId !== latestRequest.current) {
      throw new Error('Stale request');
    }

    return result;
  }, []);
}
```

### 4. [Mutex Lock](/recipes/concurrency/locks-and-mutexes) for Critical Sections

```typescript
// locks/Mutex.ts
class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => resolve(() => this.release()));
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

// Usage
const balanceMutex = new Mutex();

async function transfer(from: Account, to: Account, amount: number): Promise<void> {
  const release = await balanceMutex.acquire();
  try {
    if (from.balance >= amount) {
      from.balance -= amount;
      to.balance += amount;
    }
  } finally {
    release();
  }
}
```

### 5. Compare-and-Swap Pattern

```typescript
// storage/CASStore.ts
class CASStore<T> {
  private value: T;

  constructor(initial: T) {
    this.value = initial;
  }

  compareAndSwap(expected: T, newValue: T): boolean {
    if (this.value === expected) {
      this.value = newValue;
      return true;
    }
    return false;
  }

  getValue(): T {
    return this.value;
  }
}
```

## How It Works

- **AbortController** cancels in-flight requests when superseded
- **Atomic queues** serialize operations on shared state
- **Request IDs** ignore responses from outdated calls
- **Mutex locks** enforce mutual exclusion in critical sections
- **CAS operations** retry updates when concurrent modifications are detected

## Production Considerations

- Use React's `startTransition` for non-urgent state updates to avoid UI blocking
- Implement optimistic updates with rollback on failure for better perceived performance
- Monitor for race condition symptoms with Sentry or similar error tracking

## Common Mistakes

- Reading state before an async operation and using the stale value after
- Not cleaning up event listeners or timers that modify shared state
- Assuming `await` blocks all concurrent code execution

## FAQ

**Q: How is this different from a deadlock?**
A: Race conditions produce incorrect results from concurrent access. [Deadlocks](/recipes/concurrency/locks-and-mutexes) occur when threads block each other indefinitely waiting for resources.

**Q: Do I need locks in single-threaded JavaScript?**
A: JavaScript is single-threaded but async operations interleave. State can still be corrupted between await points.
