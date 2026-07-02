---
contentType: recipes
slug: javascript-debounce-throttle-implementation
title: "Debounce and Throttle Functions in JavaScript"
description: "Control function execution rate with debounce and throttle. Covers leading/trailing edge, cancelable timers, and real-world use cases."
metaDescription: "Implement debounce and throttle in JavaScript. Leading and trailing edge, cancelable timers, search input, scroll handlers, and resize listeners."
difficulty: intermediate
topics:
  - frontend
  - performance
tags:
  - javascript
  - debounce
  - throttle
  - performance
  - rate-limiting
  - events
relatedResources:
  - /recipes/frontend/javascript-infinite-scroll-pagination
  - /recipes/frontend/javascript-localstorage-expiration
  - /guides/frontend-performance-guide
  - /patterns/rate-limiter-pattern
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implement debounce and throttle in JavaScript. Leading and trailing edge, cancelable timers, search input, scroll handlers, and resize listeners."
  keywords:
    - javascript debounce
    - javascript throttle
    - debounce throttle implementation
    - rate limiting javascript
    - search input debounce
    - scroll throttle javascript
---

## Overview

Debounce and throttle are techniques to control how often a function runs. Debounce delays execution until activity stops. Throttle limits execution to at most once per interval. Both prevent performance issues from rapid-fire events like scrolling, resizing, typing, and clicking.

## When to Use

- **Debounce**: Search input, autosave, window resize — wait until the user stops
- **Throttle**: Scroll position, mouse move, button spam — limit to a fixed rate
- You have an event that fires many times per second and triggers expensive work

## Solution

### Basic debounce

```javascript
function debounce(fn, delay) {
    let timeoutId;

    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

// Usage — search input
const handleSearch = debounce((query) => {
    console.log("Searching for:", query);
    fetchResults(query);
}, 300);

input.addEventListener("input", (e) => handleSearch(e.target.value));
```

### Basic throttle

```javascript
function throttle(fn, interval) {
    let lastTime = 0;

    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
            fn.apply(this, args);
            lastTime = now;
        }
    };
}

// Usage — scroll handler
const handleScroll = throttle(() => {
    console.log("Scroll position:", window.scrollY);
}, 100);

window.addEventListener("scroll", handleScroll);
```

### Debounce with leading edge

```javascript
function debounceLeading(fn, delay) {
    let timeoutId;
    let called = false;

    return function (...args) {
        if (!called) {
            fn.apply(this, args);
            called = true;
        }
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            called = false;
        }, delay);
    };
}

// Fires immediately on first call, then ignores until quiet for delay ms
const handleDoubleClick = debounceLeading(() => {
    console.log("Action triggered");
}, 500);
```

### Debounce with leading and trailing options

```javascript
function debounceAdvanced(fn, delay, { leading = false, trailing = true } = {}) {
    let timeoutId;
    let lastArgs;
    let invoked = false;

    return function (...args) {
        lastArgs = args;

        const shouldInvokeLeading = leading && !invoked;
        if (shouldInvokeLeading) {
            fn.apply(this, args);
            invoked = true;
        }

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (trailing && (!leading || invoked)) {
                fn.apply(this, lastArgs);
            }
            invoked = false;
        }, delay);
    };
}

// Leading only — fire immediately, then ignore
const onClick = debounceAdvanced(saveData, 1000, { leading: true, trailing: false });

// Trailing only — fire after quiet period (default)
const onInput = debounceAdvanced(searchApi, 300, { leading: false, trailing: true });

// Both — fire immediately and again after quiet period
const onResize = debounceAdvanced(layoutCalc, 200, { leading: true, trailing: true });
```

### Throttle with trailing edge

```javascript
function throttleTrailing(fn, interval) {
    let lastTime = 0;
    let timeoutId;
    let lastArgs;

    return function (...args) {
        const now = Date.now();
        const remaining = interval - (now - lastTime);
        lastArgs = args;

        if (remaining <= 0) {
            clearTimeout(timeoutId);
            timeoutId = null;
            lastTime = now;
            fn.apply(this, args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastTime = Date.now();
                timeoutId = null;
                fn.apply(this, lastArgs);
            }, remaining);
        }
    };
}

// Fires at most once per interval, with a final call after activity stops
const onMouseMove = throttleTrailing(updatePosition, 50);
```

### Cancelable debounce and throttle

```javascript
function debounceCancelable(fn, delay) {
    let timeoutId;

    const debounced = function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };

    debounced.cancel = () => {
        clearTimeout(timeoutId);
        timeoutId = null;
    };

    debounced.flush = (...args) => {
        clearTimeout(timeoutId);
        fn.apply(this, args);
    };

    return debounced;
}

// Usage
const save = debounceCancelable(autosave, 1000);
input.addEventListener("input", () => save());
button.addEventListener("click", () => save.cancel());  // Cancel pending save
```

### Practical: autosave with debounce

```javascript
class AutoSave {
    constructor(saveFn, delay = 2000) {
        this.save = debounceCancelable(saveFn, delay);
    }

    onChange(data) {
        this.save(data);
    }

    forceSave(data) {
        this.save.flush(data);
    }

    cancel() {
        this.save.cancel();
    }
}

const autosave = new AutoSave(async (data) => {
    const response = await fetch("/api/save", {
        method: "POST",
        body: JSON.stringify(data),
    });
    console.log("Saved:", await response.json());
});

editor.addEventListener("input", () => autosave.onChange(editor.value));
window.addEventListener("beforeunload", () => autosave.forceSave(editor.value));
```

### Practical: scroll progress with throttle

```javascript
const updateScrollProgress = throttle(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    document.querySelector(".progress-bar").style.width = `${progress}%`;
}, 16);  // ~60fps

window.addEventListener("scroll", updateScrollProgress, { passive: true });
```

## Explanation

**Debounce**: Resets a timer on every call. The function only runs after the caller stops for `delay` milliseconds. Think of it as "wait until the user is done."

**Throttle**: Runs the function immediately, then ignores calls for `interval` milliseconds. Think of it as "run at most once per interval."

**Leading edge**: The function runs on the first call, then subsequent calls are debounced/throttled.

**Trailing edge**: After the quiet period or interval, a final call runs with the latest arguments.

| Technique | Fires When | Use Case |
|-----------|-----------|----------|
| Debounce (trailing) | After activity stops | Search, autosave |
| Debounce (leading) | Immediately, then wait | Button click protection |
| Throttle | At most once per interval | Scroll, mousemove |
| Throttle (trailing) | Once per interval + final | Scroll with last position |

## Variants

| Pattern | Behavior | Example |
|---------|----------|---------|
| Debounce | Delay until quiet | Search input |
| Throttle | Rate limit to interval | Scroll handler |
| RequestAnimationFrame | Sync with repaint | Animations |
| IntersectionObserver | Callback on visibility | Lazy loading |

## Guidelines

- Use debounce for events where you want the final value (search, autosave, resize).
- Use throttle for events where you want periodic updates (scroll, mousemove).
- Use `requestAnimationFrame` instead of throttle for visual updates (animations, transforms).
- Always clean up timers on unmount (React `useEffect` cleanup, Vue `onUnmounted`).
- Use `{ passive: true }` on scroll and touch listeners to improve scroll performance.
- Use leading edge for button clicks to give immediate feedback.
- Use trailing edge for search inputs to capture the final query.
- Test with rapid input to verify the function does not fire too often.

## Common Mistakes

- Using debounce for scroll events. The handler never fires while scrolling continuously. Use throttle instead.
- Using throttle for search inputs. The API is called while the user is still typing. Use debounce instead.
- Not cleaning up timers. Pending timeouts fire after component unmount, causing errors.
- Using `Date.now()` in throttle without checking `remaining`. The function fires late if the interval has passed.
- Not using `passive: true` on scroll listeners. This blocks the main thread during scrolling.
- Forgetting to pass `this` and `args` through. The debounced function loses context and arguments.
- Debouncing with a very long delay. The user thinks the app is broken. Keep delays under 1 second for UI feedback.

## Frequently Asked Questions

### What is the difference between debounce and throttle?

Debounce waits until the user stops triggering the event, then runs once. Throttle runs at most once per interval regardless of how many times the event fires. Use debounce for "wait until done" scenarios. Use throttle for "limit the rate" scenarios.

### Should I use debounce or throttle for window resize?

Debounce. You want to recalculate layout after the user finishes resizing, not on every pixel change. A 150-200ms debounce works well.

### How do I implement debounce in React?

Use a custom hook with `useRef` to store the timeout:

```javascript
function useDebounce(fn, delay) {
    const timeoutRef = useRef(null);
    const fnRef = useRef(fn);
    fnRef.current = fn;

    const debounced = useCallback((...args) => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => fnRef.current(...args), delay);
    }, [delay]);

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    return debounced;
}
```

### Can I use requestAnimationFrame instead of throttle?

Yes, for visual updates. `requestAnimationFrame` syncs with the browser's repaint cycle (~60fps). It is smoother than throttle for animations and scroll-based visual updates. Use throttle for non-visual work like API calls.
