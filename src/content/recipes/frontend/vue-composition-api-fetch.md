---
contentType: recipes
slug: vue-composition-api-fetch
title: "Data Fetching with Vue 3 Composition API"
description: "How to fetch and manage data in Vue 3 using the Composition API with ref, computed, watch, and composables for reusable data logic."
metaDescription: "Fetch and manage data in Vue 3 with the Composition API. Use ref, computed, watch, and composables for reusable data fetching logic in components."
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
  - /recipes/frontend/react-form-react-hook-form-validation
  - /recipes/frontend/react-usememo-usecallback-performance
  - /recipes/frontend/css-container-queries-responsive
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Fetch and manage data in Vue 3 with the Composition API. Use ref, computed, watch, and composables for reusable data fetching logic in components."
  keywords:
    - frontend
    - vue
    - composition-api
    - data-fetching
    - composables
    - recipe
---

## Overview

Vue 3's Composition API provides `ref`, `reactive`, `computed`, and `watch` for managing state and side effects. For data fetching, you combine these with `onMounted` to load data when the component initializes. Extracting the fetch logic into a composable function makes it reusable across components — similar to React hooks but with Vue's reactivity system.

## When to Use

- Loading data from an API when a component mounts
- Reusing data-fetching logic across multiple components (user data, settings, feature flags)
- Reactive data that depends on other reactive values (fetch when filter changes)
- Pagination, search, or any scenario where you re-fetch based on user input

## When NOT to Use

- Static data hardcoded in the component — no need for fetch logic
- Global state management — use Pinia for shared state across the app
- Server-side rendering with Nuxt — use `useAsyncData` or `useFetch` from Nuxt instead

## Solution

### Basic data fetch on mount

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

### Extracting into a composable

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

### Reactive fetch with watch

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

  // Re-fetch when query changes (debounced)
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

### Generic fetch composable

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

### Pagination composable

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

### Using with async setup (Suspense)

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

### Using with Pinia store

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

### Using with axios and interceptors

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

- Extract fetch logic into composables — don't write `fetch()` calls directly in components
- Always handle loading and error states — users need feedback during and after fetches
- Use `watch` with `immediate: true` to fetch on mount and when dependencies change
- Debounce search inputs — don't fetch on every keystroke
- Use `unref()` when accepting both ref and non-ref arguments in composables
- Clean up timeouts and subscriptions in `onUnmounted` — prevent memory leaks
- Use `computed` for derived state — don't duplicate data in multiple refs

## Common Mistakes

- **Forgetting to handle error state**: the UI shows "loading" forever if the fetch fails.
- **Not debouncing search**: every keystroke triggers a fetch, overwhelming the API.
- **Using `reactive` for primitive values**: `reactive(0)` doesn't work — use `ref(0)`.
- **Not cleaning up watchers**: `watch` created inside a composable that's called outside `setup` leaks. Use `onScopeDispose` or return the stop function.
- **Fetching in `setup` without `onMounted`**: `setup` runs during component creation — use `onMounted` for browser-only fetches.

## FAQ

### What is the difference between `ref` and `reactive`?

`ref` wraps any value (including primitives) in a reactive object. `reactive` makes an existing object reactive. Use `ref` for primitives and `reactive` for objects. Access `ref` values with `.value` in script, they're auto-unwrapped in templates.

### Can I use async/await in `setup`?

Only with `<script setup>` and top-level `await` — this makes the component async and requires `<Suspense>` in the parent. Otherwise, use `onMounted` with async callbacks.

### How do I cancel a fetch when the component unmounts?

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

### Should I use composables or Pinia for data fetching?

Use composables for component-local data. Use Pinia for data shared across multiple components or when you need devtools, persistence, or cross-component actions.

### How do I test a composable?

Use `@vue/test-utils` with `mount` or `shallowMount`. For composables that use lifecycle hooks, call them inside a component's `setup`:

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
