---
contentType: recipes
slug: debounce-throttle
title: "Debounce and Throttle"
description: "How to implement debounce and throttle patterns to control function execution frequency for search inputs, scroll handlers, and API calls."
metaDescription: "Learn debounce and throttle patterns in Python, JavaScript, and Java. Covers leading/trailing edge, rate limiting, and event handler optimization."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - debounce
  - throttle
relatedResources:
  - /recipes/rate-limiting
  - /recipes/webhooks
  - /recipes/caching
  - /recipes/caching-redis
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn debounce and throttle patterns in Python, JavaScript, and Java. Covers leading/trailing edge, rate limiting, and event handler optimization."
  keywords:
    - debounce
    - throttle
    - rate-limiting
    - events
    - performance
    - python
    - javascript
    - java
---
## Overview

Debouncing and throttling are rate-limiting techniques that control how often a function executes in response to rapid, repeated triggers. Debounce waits for a burst of events to settle before firing once. Throttle guarantees execution at most once per time window. Use debounce for search inputs (fire after user stops typing); use throttle for scroll or resize handlers (fire every N milliseconds). This recipe covers implementations with configurable leading/trailing edges, cancellation, and both synchronous and async variants in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Implementing real-time search that should query only after the user pauses typing
- Handling high-frequency events like scroll, resize, or mousemove without freezing the UI
- Rate-limiting API calls triggered by user actions (button spam, autocomplete)
- Processing streaming data where you want periodic snapshots rather than every single event

## Solution

### Python

```python
import threading
import time
from functools import wraps

def debounce(wait_secs: float, leading: bool = False, trailing: bool = True):
    def decorator(fn):
        timer = None
        lock = threading.Lock()

        @wraps(fn)
        def wrapper(*args, **kwargs):
            nonlocal timer

            def call_it():
                with lock:
                    if trailing:
                        fn(*args, **kwargs)

            with lock:
                if timer:
                    timer.cancel()
                if leading and timer is None:
                    fn(*args, **kwargs)
                timer = threading.Timer(wait_secs, call_it)
                timer.start()

        def cancel():
            with lock:
                if timer:
                    timer.cancel()
                    timer = None

        wrapper.cancel = cancel
        return wrapper
    return decorator

def throttle(limit_secs: float, leading: bool = True, trailing: bool = False):
    def decorator(fn):
        last_call = 0
        pending = False
        lock = threading.Lock()

        @wraps(fn)
        def wrapper(*args, **kwargs):
            nonlocal last_call, pending

            def call_it():
                nonlocal last_call, pending
                with lock:
                    last_call = time.time()
                    pending = False
                fn(*args, **kwargs)

            with lock:
                now = time.time()
                remaining = limit_secs - (now - last_call)

                if remaining <= 0:
                    last_call = now
                    if leading:
                        fn(*args, **kwargs)
                elif trailing and not pending:
                    pending = True
                    threading.Timer(remaining, call_it).start()

        return wrapper
    return decorator

# Usage
@debounce(0.3)
def search_api(query: str):
    print(f"Searching: {query}")

@throttle(0.1)
def on_scroll():
    print("Scroll event handled")
```

### JavaScript

```javascript
function debounce(fn, wait, options = {}) {
  const { leading = false, trailing = true } = options;
  let timeout = null;

  const debounced = (...args) => {
    const callNow = leading && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (trailing) fn(...args);
    }, wait);

    if (callNow) fn(...args);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}

function throttle(fn, limit, options = {}) {
  const { leading = true, trailing = false } = options;
  let lastCall = 0;
  let timeout = null;

  return (...args) => {
    const now = Date.now();

    if (!lastCall && !leading) {
      lastCall = now;
    }

    const remaining = limit - (now - lastCall);

    if (remaining <= 0 || remaining > limit) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      if (leading) fn(...args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        fn(...args);
      }, remaining);
    }
  };
}

// Usage
const search = debounce((query) => {
  fetch(`/api/search?q=${encodeURIComponent(query)}`);
}, 300);

const handleScroll = throttle(() => {
  console.log("scroll position:", window.scrollY);
}, 100);
```

### Java

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

public class RateLimiters {

  public static <T> Consumer<T> debounce(
      Consumer<T> fn, long waitMillis, boolean leading, boolean trailing) {
    ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    ScheduledFuture<?> future = null;
    final Object lock = new Object();

    return (T arg) -> {
      synchronized (lock) {
        if (future != null) {
          future.cancel(false);
        }
        boolean isFirst = future == null;
        if (leading && isFirst) {
          fn.accept(arg);
        }
        future = scheduler.schedule(() -> {
          synchronized (lock) {
            if (trailing) fn.accept(arg);
            future = null;
          }
        }, waitMillis, TimeUnit.MILLISECONDS);
      }
    };
  }

  public static <T> Consumer<T> throttle(
      Consumer<T> fn, long limitMillis, boolean leading, boolean trailing) {
    ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    AtomicLong lastCall = new AtomicLong(0);
    ScheduledFuture<?> pending = null;
    final Object lock = new Object();

    return (T arg) -> {
      long now = System.currentTimeMillis();
      long elapsed = now - lastCall.get();

      if (elapsed >= limitMillis) {
        synchronized (lock) {
          if (pending != null) {
            pending.cancel(false);
            pending = null;
          }
          lastCall.set(now);
        }
        if (leading) fn.accept(arg);
      } else if (trailing && pending == null) {
        synchronized (lock) {
          long delay = limitMillis - elapsed;
          pending = scheduler.schedule(() -> {
            lastCall.set(System.currentTimeMillis());
            pending = null;
            fn.accept(arg);
          }, delay, TimeUnit.MILLISECONDS);
        }
      }
    };
  }

  // Usage
  public static void main(String[] args) {
    Consumer<String> search = debounce(
      System.out::println, 300, false, true
    );
    search.accept("hello");
    search.accept("hello world"); // only this fires after 300ms

    Consumer<String> logger = throttle(
      System.out::println, 100, true, false
    );
    logger.accept("event"); // fires immediately
    logger.accept("event"); // ignored until 100ms passes
  }
}
```

## Explanation

- **Debounce** resets a timer on every trigger. Only after the timer completes without new triggers does the function execute. Use it for "wait until the user pauses" scenarios.
- **Throttle** tracks the last execution time. It allows execution only if enough time has passed since the last call. Use it for "at most once every N ms" scenarios.
- **Leading edge** fires the function on the first trigger immediately, then waits. Trailing edge fires on the last trigger after the wait period. They can be combined (both true) or used alone.
- **Cancellation** is critical: if a component unmounts or a user navigates away, pending debounced calls should not execute. Always expose a `cancel()` method.
- **Thread safety** matters in Python and Java where multiple threads may trigger events concurrently. Use locks to prevent race conditions on timer management.

## Variants

| Pattern | Behavior | Ideal For |
|---------|----------|-----------|
| Debounce (trailing) | Fires after pause | Search inputs, form validation |
| Debounce (leading) | Fires immediately, then waits | Button clicks, save actions |
| Throttle (leading) | Fires first, then limits | Scroll, resize, mousemove |
| Throttle (trailing) | Limits, fires last one | Periodic sync, heartbeat |
| requestAnimationFrame | Syncs to display refresh | Animations, visual updates |

## Best Practices

1. **Use debounce for text inputs** — querying an API on every keystroke wastes resources; wait for the typing pause (typically 200-500ms).
2. **Use throttle for visual events** — scroll, resize, and mousemove can fire 60+ times per second. Throttle to 100ms or use `requestAnimationFrame`.
3. **Always implement cancellation** — pending timers can execute after a component is destroyed, causing errors or wasted API calls.
4. **Choose the right edge** — leading edge feels snappy for buttons; trailing edge is better for search to capture the final input.
5. **Measure the impact** — use DevTools Performance tab to verify that your debounce/throttle actually reduces main-thread work.

## Common Mistakes

1. Using debounce where throttle is needed, causing important intermediate events to be lost entirely.
2. Forgetting to clean up timers on component unmount, causing memory leaks and stale executions.
3. Setting debounce delays too long (e.g., 2 seconds), making the UI feel unresponsive.
4. Using throttle without trailing edge, dropping the final event of a burst (e.g., last scroll position).
5. Not handling race conditions in multi-threaded environments where timers can overlap.

## Frequently Asked Questions

### When should I use debounce vs throttle?

Use debounce when you only care about the final state after a burst of events (search input, window resize end). Use throttle when you need periodic updates during a continuous stream (scroll position tracking, live graph updates). If in doubt: text input → debounce; visual/mouse events → throttle.

### What is the right delay for a search debounce?

Typically 200-500ms. Too short and you query on every keystroke; too long and the UI feels sluggish. A/B test within your app to find the sweet spot for your users' typing speed.

### Can I combine debounce and throttle?

Yes. A common pattern is "throttle then debounce": guarantee a minimum execution rate (throttle) while also waiting for pauses (debounce). For example, update a live preview at most every 100ms, but also ensure a final update 300ms after the user stops typing.
