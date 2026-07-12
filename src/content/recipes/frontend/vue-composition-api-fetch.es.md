---



contentType: recipes
slug: vue-composition-api-fetch
title: "Data Fetching con Vue 3 Composition API"
description: "Cómo fetchear y manejar data en Vue 3 usando la Composition API con ref, computed, watch y composables para lógica de data reutilizable."
metaDescription: "Fetchea y maneja data en Vue 3 con la Composition API. Usa ref, computed, watch y composables para lógica de data fetching reutilizable en componentes."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - vue
  - composition-api
  - data-fetching
  - composables
  - recipe
relatedResources:
  - /recipes/react-form-react-hook-form-validation
  - /recipes/react-usememo-usecallback-performance
  - /recipes/css-container-queries-responsive
  - /recipes/svelte-store-reactive-state
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Fetchea y maneja data en Vue 3 con la Composition API. Usa ref, computed, watch y composables para lógica de data fetching reutilizable en componentes."
  keywords:
    - frontend
    - vue
    - composition-api
    - data-fetching
    - composables
    - recipe



---

## Overview

La Composition API de Vue 3 provee `ref`, `reactive`, `computed` y `watch` para manejar estado y side effects. Para data fetching, combinas estos con `onMounted` para cargar data cuando el componente se inicializa. Extraer la lógica de fetch en una composable function la hace reutilizable a través de componentes — similar a los hooks de React pero con el sistema de reactividad de Vue.

## When to Use

- Cargar data de una API cuando un componente se monta
- Reutilizar lógica de data-fetching a través de múltiples componentes (user data, settings, feature flags)
- Data reactiva que depende de otros valores reactivos (fetch cuando cambia un filter)
- Paginación, búsqueda o cualquier escenario donde re-fetcheas basado en user input

## When NOT to Use

- Data estática hardcodeada en el componente — no necesita lógica de fetch
- Global state management — usa Pinia para estado compartido a través de la app
- Server-side rendering con Nuxt — usa `useAsyncData` o `useFetch` de Nuxt en su lugar

## Solution

### Fetch básico en mount

```vue
<script setup>
import { ref, onMounted } from "vue";

const users = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    loading.value = true;
    const response = await fetch("/api/users");
    users.value = await response.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error }}</p>
    <ul v-else>
      <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
  </div>
</template>
```

### Extraer en un composable

```javascript
// composables/useUsers.js
import { ref } from "vue";

export function useUsers() {
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      users.value = await response.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  return { users, loading, error, fetchUsers };
}
```

```vue
<script setup>
import { onMounted } from "vue";
import { useUsers } from "@/composables/useUsers";

const { users, loading, error, fetchUsers } = useUsers();

onMounted(fetchUsers);
</script>

<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">{{ error }}</p>
    <ul v-else>
      <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
  </div>
</template>
```

### Fetch reactivo con watch

```javascript
// composables/useSearch.js
import { ref, watch } from "vue";

export function useSearch(initialQuery = "") {
  const query = ref(initialQuery);
  const results = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function search() {
    if (!query.value.trim()) {
      results.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.value)}`);
      results.value = await response.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  // Re-fetch cuando query cambia (debounced)
  let timeout;
  watch(query, () => {
    clearTimeout(timeout);
    timeout = setTimeout(search, 300);
  });

  return { query, results, loading, error, search };
}
```

```vue
<script setup>
import { useSearch } from "@/composables/useSearch";

const { query, results, loading, error } = useSearch();
</script>

<template>
  <div>
    <input v-model="query" placeholder="Search..." />
    <p v-if="loading">Searching...</p>
    <p v-else-if="error">{{ error }}</p>
    <ul v-else>
      <li v-for="result in results" :key="result.id">{{ result.title }}</li>
    </ul>
  </div>
</template>
```

### Composable de fetch genérico

```javascript
// composables/useFetch.js
import { ref, watch, isRef, unref } from "vue";

export function useFetch(url, options = {}) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);

  async function doFetch() {
    loading.value = true;
    error.value = null;
    try {
      const resolvedUrl = unref(url);
      const response = await fetch(resolvedUrl, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data.value = await response.json();
    } catch (err) {
      error.value = err.message;
      data.value = null;
    } finally {
      loading.value = false;
    }
  }

  if (isRef(url)) {
    watch(url, doFetch, { immediate: true });
  } else {
    doFetch();
  }

  return { data, error, loading, refresh: doFetch };
}
```

```vue
<script setup>
import { ref } from "vue";
import { useFetch } from "@/composables/useFetch";

const userId = ref(1);
const { data: user, error, loading, refresh } = useFetch(
  () => `/api/users/${userId.value}`
);
</script>

<template>
  <div>
    <button @click="userId--">Previous</button>
    <span>User #{{ userId }}</span>
    <button @click="userId++">Next</button>

    <p v-if="loading">Loading...</p>
    <p v-else-if="error">{{ error }}</p>
    <div v-else-if="user">
      <h3>{{ user.name }}</h3>
      <p>{{ user.email }}</p>
    </div>

    <button @click="refresh">Refresh</button>
  </div>
</template>
```

### Composable de paginación

```javascript
// composables/usePagination.js
import { ref, computed, watch } from "vue";

export function usePagination(fetchFn, perPage = 10) {
  const page = ref(1);
  const total = ref(0);
  const items = ref([]);
  const loading = ref(false);

  const totalPages = computed(() => Math.ceil(total.value / perPage));
  const hasNext = computed(() => page.value < totalPages.value);
  const hasPrev = computed(() => page.value > 1);

  async function loadPage() {
    loading.value = true;
    try {
      const result = await fetchFn(page.value, perPage);
      items.value = result.items;
      total.value = result.total;
    } finally {
      loading.value = false;
    }
  }

  function next() {
    if (hasNext.value) {
      page.value++;
      loadPage();
    }
  }

  function prev() {
    if (hasPrev.value) {
      page.value--;
      loadPage();
    }
  }

  function goTo(p) {
    page.value = p;
    loadPage();
  }

  watch(page, loadPage, { immediate: true });

  return { page, items, total, totalPages, hasNext, hasPrev, loading, next, prev, goTo };
}
```

### Usar con async setup (Suspense)

```vue
<!-- UserCard.vue -->
<script setup>
import { ref } from "vue";

const props = defineProps(["userId"]);

const user = ref(
  await fetch(`/api/users/${props.userId}`).then((r) => r.json())
);
</script>

<template>
  <div>
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
  </div>
</template>
```

```vue
<!-- Parent.vue -->
<script setup>
import { Suspense } from "vue";
import UserCard from "./UserCard.vue";
</script>

<template>
  <Suspense>
    <template #default>
      <UserCard :userId="1" />
    </template>
    <template #fallback>
      <p>Loading user...</p>
    </template>
  </Suspense>
</template>
```

## Variants

### Usar con Pinia store

```javascript
// stores/userStore.js
import { defineStore } from "pinia";
import { ref } from "vue";

export const useUserStore = defineStore("user", () => {
  const user = ref(null);
  const loading = ref(false);

  async function fetchUser(id) {
    loading.value = true;
    try {
      const response = await fetch(`/api/users/${id}`);
      user.value = await response.json();
    } finally {
      loading.value = false;
    }
  }

  return { user, loading, fetchUser };
});
```

```vue
<script setup>
import { onMounted } from "vue";
import { useUserStore } from "@/stores/userStore";

const userStore = useUserStore();

onMounted(() => userStore.fetchUser(1));
</script>
```

### Usar con axios e interceptors

```javascript
// composables/useApi.js
import { ref } from "vue";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function useApi(url) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);

  async function fetch() {
    loading.value = true;
    try {
      const response = await api.get(url);
      data.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  }

  return { data, error, loading, fetch };
}
```

## Best Practices


- For a deeper guide, see [Container Queries for Component Responsiveness](/es/recipes/css-container-queries-responsive/).

- Extrae la lógica de fetch en composables — no escribas llamadas `fetch()` directamente en componentes
- Siempre maneja estados de loading y error — los usuarios necesitan feedback durante y después de fetches
- Usa `watch` con `immediate: true` para fetcheear en mount y cuando cambian las dependencias
- Debouncea inputs de búsqueda — no fetchees en cada keystroke
- Usa `unref()` cuando aceptas tanto ref como non-ref arguments en composables
- Limpia timeouts y subscriptions en `onUnmounted` — previene memory leaks
- Usa `computed` para estado derivado — no dupliques data en múltiples refs

## Common Mistakes

- **Olvidar manejar el estado de error**: la UI muestra "loading" para siempre si el fetch falla.
- **No debouncear la búsqueda**: cada keystroke dispara un fetch, abrumando la API.
- **Usar `reactive` para valores primitivos**: `reactive(0)` no funciona — usa `ref(0)`.
- **No limpiar watchers**: un `watch` creado dentro de un composable que se llama fuera de `setup` leakea. Usa `onScopeDispose` o retorna la stop function.
- **Fetcheear en `setup` sin `onMounted`**: `setup` corre durante la creación del componente — usa `onMounted` para fetches solo de browser.

## FAQ

### ¿Cuál es la diferencia entre `ref` y `reactive`?

`ref` envuelve cualquier valor (incluyendo primitivos) en un reactive object. `reactive` hace un objeto existente reactivo. Usa `ref` para primitivos y `reactive` para objetos. Accede a valores de `ref` con `.value` en script, se auto-unwrappean en templates.

### ¿Puedo usar async/await en `setup`?

Solo con `<script setup>` y top-level `await` — esto hace el componente async y requiere `<Suspense>` en el parent. De lo contrario, usa `onMounted` con callbacks async.

### ¿Cómo cancelo un fetch cuando el componente se desmonta?

```javascript
import { onUnmounted } from "vue";

const controller = new AbortController();

onMounted(() => {
  fetch("/api/data", { signal: controller.signal })
    .then((r) => r.json())
    .then(setData);
});

onUnmounted(() => controller.abort());
```

### ¿Debería usar composables o Pinia para data fetching?

Usa composables para data local del componente. Usa Pinia para data compartida a través de múltiples componentes o cuando necesitas devtools, persistencia o acciones cross-component.

### ¿Cómo testeo un composable?

Usa `@vue/test-utils` con `mount` o `shallowMount`. Para composables que usan lifecycle hooks, llámalos dentro del `setup` de un componente:

```javascript
import { mount } from "@vue/test-utils";
import { useUsers } from "@/composables/useUsers";

test("useUsers fetches users", async () => {
  let result;
  const wrapper = mount({
    setup() {
      result = useUsers();
      return {};
    },
  });
  await result.fetchUsers();
  expect(result.users.value.length).toBeGreaterThan(0);
});
```
