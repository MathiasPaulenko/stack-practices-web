---
contentType: recipes
slug: javascript-debounce-throttle-implementation
title: "Debounce and Throttle Functions in JavaScript"
description: "Control function execution rate with debounce and throttle. Covers leading and trailing edge, cancelable timers, and real-world use cases."
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
  - /recipes/javascript-infinite-scroll-pagination
  - /recipes/javascript-localstorage-expiration
  - /guides/performance-optimization-guide
  - /guides/complete-guide-bundle-size-optimization
  - /guides/complete-guide-react-performance-optimization
  - /guides/complete-guide-web-performance-core-web-vitals
lastUpdated: "2026-08-23"
publishedAt: "2026-07-02"
author: Mathias Paulenko
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

Debounce and throttle keep rapid events from overwhelming your code. Debounce
waits until the activity pauses before running the function. Throttle lets the
function run once per interval at most, even when the event keeps firing. Both are
useful for scroll, resize, input, and mousemove handlers.

## When to Use

- **Debounce**: search inputs, autosave, window resize — wait until the user
  stops.
- **Throttle**: scroll position, mouse move, repeated clicks — run at a fixed rate.
- You may have an event that fires many times per second and triggers expensive work.

For alternatives, see [Complete Guide to Bundle Size
Optimization](/guides/complete-guide-bundle-size-optimization/).

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

**Debounce** kicks off a fresh timer on every event. The wrapped function only
runs after the stream of calls has been quiet for `delay` milliseconds. That's
when you'd reach for it — while the user is still typing, scrolling, or resizing.

**Throttle** runs the function on the first call and then skips the rest until
`interval` milliseconds pass. It works well for steady, periodic updates rather
than waiting for a pause.

**Leading edge** fires on the first call; later ones are ignored or rescheduled.
**Trailing edge** runs a final call after the quiet period, using the most recent
arguments.

| Technique | Fires When | Use Case |
| ----------- | ------------ | ---------- |
| Debounce (trailing) | After activity stops | Search, autosave |
| Debounce (leading) | Immediately, then wait | Button click protection |
| Throttle | At most once per interval | Scroll, mousemove |
| Throttle (trailing) | Once per interval + final | Scroll with last position |

## Variants

| Pattern | Behavior | Example |
| --------- | ---------- | --------- |
| Debounce | Delay until quiet | Search input |
| Throttle | Rate limit to interval | Scroll handler |
| RequestAnimationFrame | Sync with repaint | Animations |
| IntersectionObserver | Callback on visibility | Lazy loading |

## Best Practices

Choose debounce when you need the final value, like in a search field, an
autosave routine, or a resize handler. Throttle is the better choice for regular
updates, such as a scroll progress bar or a mouse position tracker. For visual
updates tied to the browser's repaint, use `requestAnimationFrame` instead of
throttle. Clear timers when a component unmounts — React's `useEffect`
cleanup and Vue's `onUnmounted` are good places. Add `{ passive: true }` to scroll
and touch listeners so the browser doesn't block the main thread. For button
clicks, leading edge gives instant feedback; for search inputs, trailing edge
captures the latest query. Test with rapid input to confirm the function doesn't
fire too often.

## Common Mistakes

A common scroll mistake is using debounce: the handler won't fire while the
user keeps scrolling, so the UI feels frozen. Throttle is better there. Using
throttle for a search input is also wrong because the API gets called while the
user is still typing; debounce fits that case. Always clean up timers, or pending
timeouts can fire after unmount and throw errors. In throttle, don't forget to
check `remaining`, or the function may fire at odd times. Skipping `{ passive: true
}` on scroll listeners can block scrolling. And if you forget to forward `this` and
`args`, the wrapped function loses context and arguments. A very long debounce
delay makes users think the app is broken, so keep UI feedback delays under one
second.

## FAQ

### What is the difference between debounce and throttle?

Debounce waits for the user to stop triggering the event, then runs once. Throttle
runs at most once per interval, even if the event keeps firing. Pick debounce when
you want to wait until the user is done, and throttle when you want to limit the
rate.

### Should I use debounce or throttle for window resize?

Use debounce. You want to recalculate the layout after the user finishes resizing,
not on every pixel change. A 150-200ms debounce usually does the job.

### How do I implement debounce in React?

A custom hook with `useRef` stores the timeout across renders. Keep the function
reference in another `useRef` and clear the timeout in the cleanup effect:

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

Yes, for visual updates. `requestAnimationFrame` syncs with the browser's repaint
cycle (~60fps). The result is smoother than throttle for animations and
scroll-based visual updates. Keep throttle for non-visual work, like API calls.

### What is the difference between leading and trailing edge debounce?

Leading-edge debounce fires the function immediately on the first call, then
ignores later calls until the wait period expires. Trailing-edge debounce, the
default, fires after the wait period when no new calls have come in. Use leading
for click events where you want immediate feedback, trailing for search-as-you-type
where you want the latest value. Lodash supports both via
`{ leading: true, trailing: false }`.

### Should I cancel pending debounce calls on unmount?

Yes. Always clear the timeout in a cleanup function (`useEffect` return) to prevent
state updates after the component unmounts. This avoids memory leaks and React
warnings about setting state on an unmounted component.
