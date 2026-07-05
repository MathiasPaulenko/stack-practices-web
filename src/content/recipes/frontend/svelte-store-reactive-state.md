---
contentType: recipes
slug: svelte-store-reactive-state
title: "Reactive State Management with Svelte Stores"
description: "How to manage reactive state in Svelte using writable, readable, derived stores, and custom stores with contract-based updates."
metaDescription: "Manage reactive state in Svelte with writable, readable, and derived stores. Build custom stores with contract-based updates and auto-subscriptions in components."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - svelte
  - state-management
  - stores
  - reactive
  - recipe
relatedResources:
  - /recipes/frontend/vue-composition-api-fetch
  - /recipes/frontend/react-usememo-usecallback-performance
  - /recipes/frontend/css-container-queries-responsive
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Manage reactive state in Svelte with writable, readable, and derived stores. Build custom stores with contract-based updates and auto-subscriptions in components."
  keywords:
    - frontend
    - svelte
    - state-management
    - stores
    - reactive
    - recipe
---

## Overview

Svelte stores are reactive containers for values that need to be shared across components. A store is any object with a `subscribe` method that notifies subscribers when the value changes. Svelte provides `writable` (read-write), `readable` (read-only), and `derived` (computed from other stores) factories. Components auto-subscribe to stores using the `$` prefix in templates, and the subscription is cleaned up automatically when the component unmounts.

## When to Use

- Sharing state across sibling components without prop drilling
- Global app state (user session, theme, feature flags)
- Computed state that depends on multiple other stores
- Cross-component communication (event buses, notification queues)
- Async data that loads once and is consumed by multiple components

## When NOT to Use

- Component-local state — use Svelte's `let` declarations and reactivity directly
- Server-side data fetching — use SvelteKit's `load` functions instead
- Complex state machines — consider XState or a dedicated state machine library
- When prop passing is sufficient for 2-3 levels — don't over-engineer with stores

## Solution

### Writable store

```svelte
<script>
  import { writable } from "svelte/store";

  // Create a writable store with initial value
  const count = writable(0);

  function increment() {
    count.update((n) => n + 1);
  }

  function decrement() {
    count.update((n) => n - 1);
  }

  function reset() {
    count.set(0);
  }
</script>

<h1>Count: {$count}</h1>
<button on:click={increment}>+</button>
<button on:click={decrement}>-</button>
<button on:click={reset}>Reset</button>
```

The `$count` syntax auto-subscribes in the template. In the script block, use `count.set()`, `count.update()`, or `get(count)`.

### Shared store in a separate file

```javascript
// stores/user.js
import { writable } from "svelte/store";

export const user = writable(null);

export async function loginUser(credentials) {
  const response = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  user.set(data);
  return data;
}

export function logoutUser() {
  user.set(null);
}
```

```svelte
<!-- Header.svelte -->
<script>
  import { user, logoutUser } from "../stores/user.js";
</script>

{#if $user}
  <span>Welcome, {$user.name}</span>
  <button on:click={logoutUser}>Logout</button>
{:else}
  <a href="/login">Login</a>
{/if}
```

### Readable store (read-only with internal updates)

```javascript
// stores/time.js
import { readable } from "svelte/store";

export const currentTime = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  // Cleanup function called when the last subscriber unsubscribes
  return () => clearInterval(interval);
});
```

```svelte
<script>
  import { currentTime } from "../stores/time.js";
</script>

<p>Current time: {$currentTime.toLocaleTimeString()}</p>
```

The store starts the interval when the first subscriber attaches and stops it when the last subscriber leaves — no wasted resources.

### Derived store

```javascript
// stores/cart.js
import { writable, derived } from "svelte/store";

export const cart = writable([]);

export const itemCount = derived(cart, ($cart) =>
  $cart.reduce((sum, item) => sum + item.quantity, 0)
);

export const totalPrice = derived(cart, ($cart) =>
  $cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

export const formattedTotal = derived(
  totalPrice,
  ($total) => `$${$total.toFixed(2)}`
);
```

```svelte
<script>
  import { cart, itemCount, formattedTotal } from "../stores/cart.js";

  function addItem() {
    cart.update((items) => [
      ...items,
      { id: Date.now(), name: "Product", price: 9.99, quantity: 1 },
    ]);
  }
</script>

<p>Items in cart: {$itemCount}</p>
<p>Total: {$formattedTotal}</p>
<button on:click={addItem}>Add item</button>
```

### Derived from multiple stores

```javascript
import { derived } from "svelte/store";
import { user } from "./user.js";
import { settings } from "./settings.js";

export const greeting = derived(
  [user, settings],
  ([$user, $settings]) => {
    if (!$user) return "Welcome, guest";
    const name = $settings.formal ? $user.fullName : $user.firstName;
    return `Hello, ${name}`;
  }
);
```

### Custom store with contract

```javascript
// stores/counter.js
import { writable } from "svelte/store";

function createCounter(start = 0, step = 1) {
  const { subscribe, update, set } = writable(start);

  return {
    subscribe,
    increment: () => update((n) => n + step),
    decrement: () => update((n) => n - step),
    reset: () => set(start),
    setStep: (newStep) => update((n) => n), // step is captured in closure
  };
}

export const counter = createCounter(0, 5);
```

```svelte
<script>
  import { counter } from "../stores/counter.js";
</script>

<h1>{$counter}</h1>
<button on:click={counter.increment}>+5</button>
<button on:click={counter.decrement}>-5</button>
<button on:click={counter.reset}>Reset</button>
```

### Store with localStorage persistence

```javascript
// stores/persistent.js
import { writable } from "svelte/store";

function persistent(key, initialValue) {
  const stored = localStorage.getItem(key);
  const initial = stored ? JSON.parse(stored) : initialValue;

  const store = writable(initial);

  store.subscribe((value) => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  return store;
}

export const theme = persistent("theme", "light");
export const sidebarOpen = persistent("sidebar", false);
```

### Auto-unsubscribe in components

```svelte
<script>
  import { onMount } from "svelte";
  import { user } from "../stores/user.js";

  // Manual subscription (when you need the value in script logic)
  let currentUser;
  const unsubscribe = user.subscribe((value) => {
    currentUser = value;
  });

  // Cleanup on unmount
  onDestroy(unsubscribe);
</script>

<!-- Auto-subscription with $ prefix (template only) -->
<h1>{$user?.name}</h1>
```

### Using get() for one-time reads

```javascript
import { get } from "svelte/store";
import { user } from "../stores/user.js";

function checkAuth() {
  const currentUser = get(user);
  if (!currentUser) {
    throw new Error("Not authenticated");
  }
  return currentUser;
}
```

`get()` reads the current value without subscribing. Use it for one-time reads in event handlers — don't use it in reactive declarations.

### Store with async updates

```javascript
// stores/products.js
import { writable } from "svelte/store";

export const products = writable([]);
export const loading = writable(false);
export const error = writable(null);

export async function fetchProducts() {
  loading.set(true);
  error.set(null);
  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    products.set(data);
  } catch (err) {
    error.set(err.message);
  } finally {
    loading.set(false);
  }
}
```

```svelte
<script>
  import { onMount } from "svelte";
  import { products, loading, error, fetchProducts } from "../stores/products.js";

  onMount(fetchProducts);
</script>

{#if $loading}
  <p>Loading...</p>
{:else if $error}
  <p>Error: {$error}</p>
{:else}
  <ul>
    {#each $products as product}
      <li>{product.name} — ${product.price}</li>
    {/each}
  </ul>
{/if}
```

## Variants

### Using stores with SvelteKit

```javascript
// src/stores/session.js
import { writable } from "svelte/store";

export const session = writable({
  user: null,
  token: null,
});

export function setSession(data) {
  session.set(data);
  if (data.token) {
    document.cookie = `token=${data.token}; path=/; max-age=3600`;
  }
}
```

```svelte
<!-- +layout.svelte -->
<script>
  import { session } from "$lib/stores/session.js";
  import { onMount } from "svelte";

  onMount(() => {
    const token = document.cookie
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

    if (token) {
      fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((user) => session.set({ user, token }));
    }
  });
</script>

{#if $session.user}
  <slot />
{:else}
  <p>Please log in</p>
{/if}
```

### Store with debounce

```javascript
import { writable } from "svelte/store";

function debouncedStore(initialValue, delay = 300) {
  const store = writable(initialValue);
  let timeout;

  function set(value) {
    clearTimeout(timeout);
    timeout = setTimeout(() => store.set(value), delay);
  }

  return {
    subscribe: store.subscribe,
    set,
    update: (fn) => set(fn(get(store))),
  };
}

export const searchQuery = debouncedStore("", 300);
```

## Best Practices

- Export stores from separate files — keeps components clean and stores reusable
- Use `readable` for values that components shouldn't modify (clocks, WebSocket data)
- Use `derived` for computed state — don't duplicate data that can be calculated from other stores
- Use the `$` prefix in templates — auto-subscribe/unsubscribe is handled by Svelte
- Use `get()` only for one-time reads in event handlers — not in reactive declarations
- Clean up manual subscriptions with `onDestroy(unsubscribe)` — auto-subscriptions handle this
- Use custom stores to expose a controlled API — hide `set` and `update` when they shouldn't be public

## Common Mistakes

- **Using `get()` in reactive statements**: `$: doubled = get(count) * 2` doesn't react to changes. Use `$count` or a derived store.
- **Not cleaning up manual subscriptions**: calling `store.subscribe()` without storing the unsubscribe function leaks memory.
- **Overusing stores for local state**: `let count = 0` is simpler than `const count = writable(0)` for component-local state.
- **Creating stores inside components**: `const count = writable(0)` inside a component creates a new store on every render. Move it outside or use `const` at module scope.
- **Not using derived stores**: computing values in components from multiple stores manually is error-prone — `derived` handles updates automatically.

## FAQ

### What is the `$` prefix in Svelte?

It's syntactic sugar for auto-subscribing to a store in templates and reactive declarations. `$count` is equivalent to subscribing to `count` and using its current value. Svelte handles subscription and cleanup automatically.

### Can I use Svelte stores outside of Svelte components?

Yes. Stores are plain JavaScript objects with a `subscribe` method. You can subscribe manually in any JavaScript file:

```javascript
import { user } from "./stores/user.js";

const unsubscribe = user.subscribe((value) => {
  console.log("User changed:", value);
});

// Later
unsubscribe();
```

### What is the store contract?

Any object with a `subscribe` method that returns an unsubscribe function is a store. The method must accept a callback and call it immediately with the current value, then on every change.

### How do I test a store?

```javascript
import { get } from "svelte/store";
import { counter } from "./stores/counter.js";

test("counter increments", () => {
  counter.reset();
  counter.increment();
  expect(get(counter)).toBe(5); // step is 5
});
```

### Should I use stores or context API for component trees?

Use context (`setContext`/`getContext`) for data scoped to a component subtree — it's simpler and doesn't require stores. Use stores for global state shared across the entire app or when you need reactivity outside components.
