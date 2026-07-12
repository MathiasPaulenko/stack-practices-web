---


contentType: recipes
slug: javascript-event-loop
title: "JavaScript Event Loop"
description: "Understand how the JavaScript event loop works internally and how to write non-blocking code."
metaDescription: "How the JavaScript event loop works: call stack, task queue, microtasks, and writing efficient async code for better web app performance."
difficulty: intermediate
topics:
  - frontend
tags:
  - event-loop
  - async
  - javascript
  - performance
  - frontend
relatedResources:
  - /recipes/race-condition-prevention
  - /recipes/deep-clone-structured
  - /recipes/url-encoding-decoding
  - /recipes/brotli-nginx-compression
  - /recipes/spa-code-splitting-lazy
  - /guides/complete-guide-bundle-size-optimization
  - /guides/complete-guide-react-performance-optimization
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "How the JavaScript event loop works: call stack, task queue, microtasks, and writing efficient async code for better web app performance."
  keywords:
    - event-loop
    - async
    - javascript
    - performance


---
## Overview

The JavaScript event loop is the heart of asynchronous programming in browsers and Node.js. It orchestrates the execution of code, collects and processes events, and executes queued sub-tasks. Understanding how the call stack, task queue, and microtask queue interact is essential for writing performant, non-blocking applications.

## When to Use

Use this resource when:

- Debugging mysterious asynchronous bugs or race conditions. See [Unit Testing](/recipes/testing/unit-testing) for testing async code.
- Optimizing UI responsiveness in frontend applications. See [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) for frontend performance.
- Choosing between setTimeout, Promise, and queueMicrotask. See [WebSockets Real-Time](/recipes/frontend/websockets-realtime) for event-driven frontend patterns.
- Understanding why code order does not always match execution order. See [Parse JSON](/recipes/data/parse-json) for handling async data parsing.

## When to Avoid

- **CPU-bound work**: The event loop is single-threaded. Use Web Workers for heavy computation (image processing, crypto, parsing).
- **Real-time audio/video processing**: Use Web Audio API or WebRTC, which run on separate threads.
- **Server-side parallelism**: Node.js worker threads or child processes are better for CPU-bound server tasks.

## Solution

### Visualizing the Event Loop

```javascript
console.log('1. Script start');

setTimeout(() => {
  console.log('2. setTimeout (macrotask)');
}, 0);

Promise.resolve().then(() => {
  console.log('3. Promise (microtask)');
});

queueMicrotask(() => {
  console.log('4. queueMicrotask');
});

console.log('5. Script end');

// Output order:
// 1. Script start
// 5. Script end
// 3. Promise (microtask)
// 4. queueMicrotask
// 2. setTimeout (macrotask)
```

### Handling Long-Running Tasks

```javascript
function processLargeArray(arr, chunkSize = 1000) {
  let index = 0;

  function processChunk() {
    const chunk = arr.slice(index, index + chunkSize);
    chunk.forEach(item => heavyComputation(item));
    index += chunkSize;

    if (index < arr.length) {
      setTimeout(processChunk, 0); // Yield to event loop
    }
  }

  processChunk();
}
```

### Async/Await and the Event Loop

```javascript
async function fetchUserData(userId) {
  // Await yields control to the event loop
  const response = await fetch(`/api/users/${userId}`);
  const data = await response.json();
  return data;
}

// Multiple awaits run sequentially
async function fetchSequential() {
  const a = await fetch('/api/a'); // waits for a
  const b = await fetch('/api/b'); // waits for b
  // Total time: time(a) + time(b)
}

// Promise.all runs concurrently
async function fetchParallel() {
  const [a, b] = await Promise.all([
    fetch('/api/a'),
    fetch('/api/b'),
  ]);
  // Total time: max(time(a), time(b))
}
```

### Web Workers for CPU-Intensive Tasks

```javascript
// main.js
const worker = new Worker('compute.js');

worker.postMessage({ data: largeArray });
worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

// compute.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

Web Workers run on a separate thread. They do not block the event loop or the UI.

### Scheduler API (Modern Browsers)

```javascript
// Yield to the main thread with scheduler.yield()
async function processChunks(items) {
  for (const item of items) {
    process(item);
    await scheduler.yield(); // Let the browser paint
  }
}

// Schedule tasks with priorities
scheduler.postTask(() => {
  // user-visible task
}, { priority: 'user-visible' });

scheduler.postTask(() => {
  // background task
}, { priority: 'background' });
```

### Node.js: setImmediate vs process.nextTick

```javascript
// process.nextTick runs before any I/O or timers
process.nextTick(() => console.log('1. nextTick'));

// setImmediate runs after I/O events
setImmediate(() => console.log('3. setImmediate'));

// setTimeout runs after a minimum delay
setTimeout(() => console.log('2. setTimeout'), 0);

// Order: 1. nextTick, 2. setTimeout, 3. setImmediate
// (setTimeout vs setImmediate order is not guaranteed in practice)
```

## Explanation

The event loop operates in phases:

1. **Call Stack**: Executes synchronous code. When empty, the event loop checks queues.
2. **Microtask Queue**: Processes Promise callbacks, queueMicrotask, and MutationObserver callbacks. Cleared entirely before next macrotask.
3. **Macrotask Queue**: Processes setTimeout, setInterval, setImmediate (Node.js), and I/O events.
4. **Render Phase**: Browsers may update the DOM and repaint if time allows.

**Critical rule**: All microtasks execute before the next macrotask. This can starve the macrotask queue if microtasks recursively enqueue more microtasks.

## Variants

| Runtime | Macrotask API | Microtask API | Notes |
|---------|--------------|---------------|-------|
| Browser | setTimeout, requestAnimationFrame | Promise, queueMicrotask | rAF runs before paint |
| Node.js | setTimeout, setImmediate | Promise, process.nextTick | nextTick runs before Promises |
| Deno | setTimeout | Promise, queueMicrotask | Aligns with browser behavior |
| Bun | setTimeout, setImmediate | Promise, queueMicrotask | nextTick not supported |

## Advanced: Measuring Event Loop Lag

```javascript
// Node.js: measure event loop delay
let lastCheck = performance.now();

setInterval(() => {
  const now = performance.now();
  const lag = now - lastCheck - 1000; // expected 1000ms interval
  if (lag > 10) {
    console.warn(`Event loop lag: ${lag.toFixed(1)}ms`);
  }
  lastCheck = now;
}, 1000);
```

```javascript
// Browser: measure long tasks with PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn(`Long task: ${entry.duration.toFixed(0)}ms`);
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

Tasks longer than 50ms are reported as long tasks. These cause visible jank.

## Advanced: AbortController for Cancellation

```javascript
const controller = new AbortController();

async function fetchWithTimeout(url, ms) {
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

When aborted, `fetch` rejects with an `AbortError`. This is the standard way to cancel async operations.

## What Works

- **Break heavy work into chunks**: Use setTimeout or requestIdleCallback to yield control
- **Prefer microtasks for DOM updates**: queueMicrotask ensures DOM reads are batched
- **Avoid recursive microtask enqueuing**: Can freeze the event loop indefinitely
- **Use requestAnimationFrame for visual updates**: Synchronizes with the browser's render cycle
- **Profile with Performance tab**: Chrome DevTools visualizes microtask and macrotask timing

## Common Mistakes

1. **Assuming setTimeout(0) is immediate**: It is always slower than microtasks
2. **Blocking the main thread**: Synchronous loops >50ms cause jank and dropped frames
3. **Forgetting nextTick in Node.js**: process.nextTick runs before Promises, not after
4. **Mixing microtask recursion**: Promise.resolve().then(() => Promise.resolve().then(...)) can deadlock
5. **Ignoring the render phase**: Heavy microtask queues prevent browser painting

## Frequently Asked Questions

### Why does Promise.then() run before setTimeout(0)?

Promise callbacks enter the microtask queue, which has higher priority than the macrotask queue where setTimeout callbacks live. The event loop drains all microtasks before processing the next macrotask.

### What is the difference between queueMicrotask and Promise.resolve().then()?

Functionally identical in most cases, but queueMicrotask is more explicit and slightly more efficient. It avoids creating a Promise object. Use queueMicrotask when you do not need the Promise chain.

### How do I prevent the event loop from freezing?

Break work into small chunks using setTimeout, requestIdleCallback, or Web Workers for CPU-intensive tasks. Use `scheduler.yield()` in modern browsers. Monitor with PerformanceObserver for long tasks.

### What is the difference between microtask and macrotask?

Microtasks (Promise callbacks, queueMicrotask, MutationObserver) run after the current task completes and before the next macrotask. Macrotasks (setTimeout, setInterval, I/O events) are scheduled by the event loop. All microtasks drain before the next macrotask runs.

### How does async/await relate to the event loop?

`await` suspends the async function and yields control to the event loop. When the awaited Promise resolves, the continuation is enqueued as a microtask. This means async functions do not block the event loop — they cooperatively yield.

### What is requestAnimationFrame and when should I use it?

requestAnimationFrame schedules a callback before the browser's next paint. It runs in the render phase, after microtasks but before the actual paint. Use it for visual updates: DOM mutations, canvas drawing, CSS transitions. It syncs with the display refresh rate (usually 60Hz).

### What is the Node.js event loop model?

Node.js uses libuv, which has phases: timers, pending callbacks, idle/prepare, poll, check (setImmediate), and close callbacks. Between each phase, microtasks (process.nextTick and Promises) are drained. This is more structured than the browser model.

### How do I measure event loop performance?

In Node.js, use `perf_hooks` to measure event loop lag. In browsers, use PerformanceObserver with `longtask` entry type. Chrome DevTools Performance tab visualizes task timing. Look for tasks longer than 50ms.

### Can the event loop run in parallel?

No. JavaScript is single-threaded in the event loop. Web Workers and Node.js worker threads run separate event loops on separate threads. SharedArrayBuffer and Atomics allow limited shared memory communication.

### What happens when the event loop is blocked?

The UI freezes. No animations, no clicks, no scroll. In Node.js, no I/O is processed, no timers fire. The server becomes unresponsive. This is why blocking the main thread with synchronous work is the most common performance issue in JavaScript.

### How do I cancel an ongoing async operation?

Use AbortController. Pass `controller.signal` to fetch, streams, and other async APIs. Call `controller.abort()` to cancel. The operation rejects with an AbortError. This is the web standard for cancellation.

### What is the difference between setTimeout and setInterval?

setTimeout runs a callback once after a delay. setInterval runs a callback repeatedly with a fixed delay between each execution. setInterval does not wait for the previous callback to finish — if the callback takes longer than the interval, executions stack up. Prefer recursive setTimeout for reliable scheduling.
