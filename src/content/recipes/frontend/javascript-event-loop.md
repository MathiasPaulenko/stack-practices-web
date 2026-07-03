---
contentType: recipes
slug: javascript-event-loop
title: "JavaScript Event Loop"
description: "Understand how the JavaScript event loop works under the hood and how to write non-blocking code."
metaDescription: "Deep dive into the JavaScript event loop: call stack, task queue, microtasks, and how to write efficient async code for better web app performance."
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
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Deep dive into the JavaScript event loop: call stack, task queue, microtasks, and how to write efficient async code for better web app performance."
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

**Q: Why does Promise.then() run before setTimeout(0)?**
A: Promise callbacks enter the microtask queue, which has higher priority than the macrotask queue where setTimeout callbacks live.

**Q: What is the difference between queueMicrotask and Promise.resolve().then()?**
A: Functionally identical in most cases, but queueMicrotask is more explicit and slightly more efficient.

**Q: How do I prevent the event loop from freezing?**
A: Break work into small chunks using setTimeout, requestIdleCallback, or Web Workers for CPU-intensive tasks.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
