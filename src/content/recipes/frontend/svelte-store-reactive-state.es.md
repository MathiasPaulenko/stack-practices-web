---
contentType: recipes
slug: svelte-store-reactive-state
title: "State Management Reactivo con Svelte Stores"
description: "Cómo manejar estado reactivo en Svelte usando writable, readable, derived stores y custom stores con actualizaciones basadas en contrato."
metaDescription: "Maneja estado reactivo en Svelte con writable, readable y derived stores. Construye custom stores con contrato y auto-suscripción en componentes."
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
  metaDescription: "Maneja estado reactivo en Svelte con writable, readable y derived stores. Construye custom stores con contrato y auto-suscripción en componentes."
  keywords:
    - frontend
    - svelte
    - state-management
    - stores
    - reactive
    - recipe
---

## Overview

Svelte stores son contenedores reactivos para valores que necesitan compartirse a través de componentes. Un store es cualquier objeto con un método `subscribe` que notifica a los suscriptores cuando el valor cambia. Svelte provee `writable` (read-write), `readable` (read-only) y `derived` (computado de otros stores). Los componentes se auto-suscriben a stores usando el prefijo `$` en templates, y la suscripción se limpia automáticamente cuando el componente se desmonta.

## When to Use

- Compartir estado entre sibling components sin prop drilling
- Global app state (user session, theme, feature flags)
- Estado computado que depende de múltiples otros stores
- Comunicación cross-component (event buses, notification queues)
- Data async que carga una vez y es consumida por múltiples componentes

## When NOT to Use

- Estado local del componente — usa las declaraciones `let` y reactividad de Svelte directamente
- Server-side data fetching — usa las funciones `load` de SvelteKit en su lugar
- State machines complejas — considera XState o una librería dedicada
- Cuando pasar props es suficiente para 2-3 niveles — no over-engineeres con stores

## Solution

### Writable store

```svelte
<script>
  import { writable } from "svelte/store";

  // Crear un writable store con valor inicial
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

La sintaxis `$count` auto-suscribe en el template. En el script block, usa `count.set()`, `count.update()` o `get(count)`.

### Store compartido en archivo separado

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

### Readable store (read-only con updates internos)

```javascript
// stores/time.js
import { readable } from "svelte/store";

export const currentTime = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  // Cleanup function llamada cuando el último suscriptor se desuscribe
  return () => clearInterval(interval);
});
```

```svelte
<script>
  import { currentTime } from "../stores/time.js";
</script>

<p>Current time: {$currentTime.toLocaleTimeString()}</p>
```

El store arranca el interval cuando el primer suscriptor se adjunta y lo detiene cuando el último se va — no hay recursos desperdiciados.

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

### Derived de múltiples stores

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

### Custom store con contrato

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
    setStep: (newStep) => update((n) => n), // step se captura en closure
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

### Store con persistencia en localStorage

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

### Auto-unsubscribe en componentes

```svelte
<script>
  import { onMount } from "svelte";
  import { user } from "../stores/user.js";

  // Suscripción manual (cuando necesitas el valor en lógica de script)
  let currentUser;
  const unsubscribe = user.subscribe((value) => {
    currentUser = value;
  });

  // Cleanup al desmontar
  onDestroy(unsubscribe);
</script>

<!-- Auto-suscripción con prefijo $ (solo template) -->
<h1>{$user?.name}</h1>
```

### Usar get() para lecturas one-time

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

`get()` lee el valor actual sin suscribirse. Úsalo para lecturas one-time en event handlers — no lo uses en reactive declarations.

### Store con updates async

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

### Usar stores con SvelteKit

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

### Store con debounce

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

- Exporta stores desde archivos separados — mantiene los componentes limpios y los stores reutilizables
- Usa `readable` para valores que los componentes no deberían modificar (clocks, WebSocket data)
- Usa `derived` para estado computado — no dupliques data que se puede calcular de otros stores
- Usa el prefijo `$` en templates — auto-suscripción/desuscripción es manejada por Svelte
- Usa `get()` solo para lecturas one-time en event handlers — no en reactive declarations
- Limpia suscripciones manuales con `onDestroy(unsubscribe)` — las auto-suscripciones manejan esto
- Usa custom stores para exponer una API controlada — esconde `set` y `update` cuando no deberían ser públicos

## Common Mistakes

- **Usar `get()` en reactive statements**: `$: doubled = get(count) * 2` no reacciona a cambios. Usa `$count` o un derived store.
- **No limpiar suscripciones manuales**: llamar `store.subscribe()` sin guardar la unsubscribe function leakea memoria.
- **Overusar stores para estado local**: `let count = 0` es más simple que `const count = writable(0)` para estado local del componente.
- **Crear stores dentro de componentes**: `const count = writable(0)` dentro de un componente crea un nuevo store en cada render. Muévelo fuera o usa `const` a scope de módulo.
- **No usar derived stores**: computar valores en componentes desde múltiples stores manualmente es error-prone — `derived` maneja los updates automáticamente.

## FAQ

### ¿Qué es el prefijo `$` en Svelte?

Es syntactic sugar para auto-suscribirse a un store en templates y reactive declarations. `$count` es equivalente a suscribirse a `count` y usar su valor actual. Svelte maneja suscripción y cleanup automáticamente.

### ¿Puedo usar Svelte stores fuera de componentes Svelte?

Sí. Los stores son objetos JavaScript planos con un método `subscribe`. Puedes suscribirte manualmente en cualquier archivo JavaScript:

```javascript
import { user } from "./stores/user.js";

const unsubscribe = user.subscribe((value) => {
  console.log("User changed:", value);
});

// Después
unsubscribe();
```

### ¿Cuál es el contrato de store?

Cualquier objeto con un método `subscribe` que retorna una unsubscribe function es un store. El método debe aceptar un callback y llamarlo inmediatamente con el valor actual, luego en cada cambio.

### ¿Cómo testeo un store?

```javascript
import { get } from "svelte/store";
import { counter } from "./stores/counter.js";

test("counter increments", () => {
  counter.reset();
  counter.increment();
  expect(get(counter)).toBe(5); // step es 5
});
```

### ¿Debería usar stores o context API para árboles de componentes?

Usa context (`setContext`/`getContext`) para data scoped a un subtree de componentes — es más simple y no requiere stores. Usa stores para estado global compartido a través de toda la app o cuando necesitas reactividad fuera de componentes.
