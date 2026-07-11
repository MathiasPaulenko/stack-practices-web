---
contentType: guides
slug: complete-guide-react-state-management
title: "React State Management: Context, Zustand, TanStack Query"
description: "Master React state management: Context API, Zustand, Jotai, and TanStack Query for server state. Covers patterns, persistence, optimistic updates, and when to use each."
metaDescription: "Master React state management: Context API, Zustand, Jotai, and TanStack Query for server state with patterns, persistence, and optimistic updates."
difficulty: intermediate
topics:
  - frontend
tags:
  - guide
  - react
  - state-management
  - zustand
  - tanstack-query
  - context-api
  - frontend
relatedResources:
  - /guides/frontend/complete-guide-react-server-components
  - /guides/frontend/complete-guide-typescript-advanced-types
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master React state management: Context API, Zustand, Jotai, and TanStack Query for server state with patterns, persistence, and optimistic updates."
  keywords:
    - react state management
    - zustand
    - tanstack query
    - context api
    - jotai
    - server state
    - optimistic updates
---

## Introduction

React state management splits into two categories: client state (UI state, form input, theme) and server state (API data, cached responses). Different tools handle each category. Context API is built into React for sharing state without prop drilling. Zustand provides a lightweight store outside the React tree. Jotai offers atomic state management for fine-grained reactivity. TanStack Query handles server state with caching, invalidation, and optimistic updates. This guide walks through all four with practical patterns and guidance on when to use each.

## State Categories

```
Client State (lives in the browser):
  - UI state: modal open/closed, active tab, sidebar collapsed
  - Form state: input values, validation errors, dirty fields
  - App preferences: theme, language, sort order
  - Local component state: hover, focus, animation state

Server State (lives on the server, cached in browser):
  - API response data: user list, product details, search results
  - Pagination and infinite scroll state
  - Mutation state: loading, error, success
  - Cache invalidation and refetching

Rule of thumb:
  - Client state → Context, Zustand, or Jotai
  - Server state → TanStack Query
  - Don't put server state in Redux/Zustand — use TanStack Query
```

## Context API

### Basic context

```tsx
// ThemeContext.tsx — Built-in React context
import { createContext, useContext, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

// Usage
function ThemedButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-slate-900"}
    >
      Toggle theme (current: {theme})
    </button>
  );
}
```

### Context with useReducer

```tsx
// CartContext.tsx — Complex state with useReducer
import { createContext, useContext, useReducer, ReactNode } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

type CartAction =
  | { type: "ADD_ITEM"; item: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "UPDATE_QUANTITY"; id: string; quantity: number }
  | { type: "CLEAR" };

interface CartState {
  items: CartItem[];
  total: number;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        const items = state.items.map((i) =>
          i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
        return { items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) };
      }
      const items = [...state.items, { ...action.item, quantity: 1 }];
      return { items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) };
    }
    case "REMOVE_ITEM": {
      const items = state.items.filter((i) => i.id !== action.id);
      return { items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) };
    }
    case "UPDATE_QUANTITY": {
      const items = state.items.map((i) =>
        i.id === action.id ? { ...i, quantity: Math.max(0, action.quantity) } : i
      ).filter((i) => i.quantity > 0);
      return { items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) };
    }
    case "CLEAR":
      return { items: [], total: 0 };
    default:
      return state;
  }
}

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });
  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
```

## Zustand

### Basic store

```tsx
// store/useStore.ts — Lightweight global state
import { create } from "zustand";

interface UserStore {
  user: { id: string; name: string; email: string } | null;
  setUser: (user: UserStore["user"]) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

// Usage — no provider needed
function UserProfile() {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);

  if (!user) return <p>Not logged in</p>;
  return (
    <div>
      <p>{user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Zustand with middleware

```tsx
// store/useCartStore.ts — Zustand with persist and immer
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    immer((set) => ({
      items: [],
      total: 0,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            existing.quantity += 1;
          } else {
            state.items.push({ ...item, quantity: 1 });
          }
          state.total = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
        }),
      removeItem: (id) =>
        set((state) => {
          state.items = state.items.filter((i) => i.id !== id);
          state.total = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
        }),
      updateQuantity: (id, quantity) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (item) item.quantity = Math.max(0, quantity);
          state.items = state.items.filter((i) => i.quantity > 0);
          state.total = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
        }),
      clear: () =>
        set((state) => {
          state.items = [];
          state.total = 0;
        }),
    })),
    { name: "cart-storage" }  // localStorage key
  )
);
```

### Selectors for performance

```tsx
// Select only what you need — prevents unnecessary re-renders
function CartBadge() {
  // Only re-renders when total changes
  const total = useCartStore((s) => s.total);
  return <span>{total > 0 ? `$${total}` : "Empty"}</span>;
}

function CartList() {
  // Only re-renders when items change
  const items = useCartStore((s) => s.items);
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name} × {item.quantity}</li>
      ))}
    </ul>
  );
}

// Multiple values with shallow comparison
import { useShallow } from "zustand/react/shallow";

function CartSummary() {
  const { items, total, clear } = useCartStore(
    useShalllow((s) => ({ items: s.items, total: s.total, clear: s.clear }))
  );
  return (
    <div>
      <p>{items.length} items — ${total}</p>
      <button onClick={clear}>Clear cart</button>
    </div>
  );
}
```

## Jotai

### Atomic state

```tsx
// atoms.ts — Fine-grained reactive state
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";

// Primitive atom
const countAtom = atom(0);

// Derived atom (read-only)
const doubleCountAtom = atom((get) => get(countAtom) * 2);

// Derived atom (read-write)
const incrementAtom = atom(
  (get) => get(countAtom),
  (get, set) => set(countAtom, get(countAtom) + 1)
);

// Async derived atom
const userDataAtom = atom(async (get) => {
  const userId = get(currentUserIdAtom);
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
});

// Usage
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleCountAtom);
  const increment = useSetAtom(incrementAtom);

  return (
    <div>
      <p>Count: {count} (doubled: {double})</p>
      <button onClick={increment}>+1</button>
    </div>
  );
}
```

### Atom family for dynamic keys

```tsx
// One atom per item ID
const itemAtomFamily = atomFamily((id: string) =>
  atom<{ id: string; name: string; price: number } | null>(null)
);

function ProductItem({ id }: { id: string }) {
  const [item, setItem] = useAtom(itemAtomFamily(id));
  // Each component subscribes to its own atom
  return <div>{item?.name}</div>;
}
```

## TanStack Query

### Basic queries

```tsx
// hooks/useProducts.ts — Server state management
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes (garbage collection)
  });
}

// Usage
function ProductList() {
  const { data, isLoading, error, refetch } = useProducts();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {data?.map((p) => <li key={p.id}>{p.name}</li>)}
      </ul>
    </div>
  );
}
```

### Mutations with cache invalidation

```tsx
async function createProduct(data: Omit<Product, "id">): Promise<Product> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      // Invalidate the products query to refetch
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

function AddProductForm() {
  const createProduct = useCreateProduct();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createProduct.mutate({
          name: formData.get("name") as string,
          price: Number(formData.get("price")),
        });
      }}
    >
      <input name="name" required />
      <input name="price" type="number" required />
      <button type="submit" disabled={createProduct.isPending}>
        {createProduct.isPending ? "Creating..." : "Create"}
      </button>
      {createProduct.error && <p>Error: {createProduct.error.message}</p>}
    </form>
  );
}
```

### Optimistic updates

```tsx
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Product) =>
      fetch(`/api/products/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),

    // Optimistically update the cache before the mutation completes
    onMutate: async (updatedProduct) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshot previous value
      const previousProducts = queryClient.getQueryData<Product[]>(["products"]);

      // Optimistically update
      queryClient.setQueryData<Product[]>(["products"], (old) =>
        old?.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );

      // Return context for rollback
      return { previousProducts };
    },

    // If mutation fails, roll back
    onError: (err, updatedProduct, context) => {
      queryClient.setQueryData(["products"], context?.previousProducts);
    },

    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

### Pagination and infinite scroll

```tsx
// Pagination
export function usePaginatedProducts(page: number) {
  return useQuery({
    queryKey: ["products", page],
    queryFn: () => fetch(`/api/products?page=${page}`).then((r) => r.json()),
    placeholderData: keepPreviousData,  // Show stale data while fetching next page
  });
}

// Infinite scroll
import { useInfiniteQuery } from "@tanstack/react-query";

export function useInfiniteProducts() {
  return useInfiniteQuery({
    queryKey: ["products", "infinite"],
    queryFn: ({ pageParam = 1 }) =>
      fetch(`/api/products?page=${pageParam}`).then((r) => r.json()),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}

function InfiniteProductList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteProducts();

  return (
    <div>
      {data.pages.map((page) =>
        page.items.map((product: Product) => (
          <div key={product.id}>{product.name}</div>
        ))
      )}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? "Loading..." : "Load more"}
      </button>
    </div>
  );
}
```

## When to Use What

```
Context API:
  ✓ Small to medium apps
  ✓ Theme, auth, locale — low-frequency updates
  ✓ When you need React's built-in solution (no dependency)
  ✗ High-frequency updates (causes re-renders on all consumers)

Zustand:
  ✓ Medium to large apps
  ✓ Global state outside React tree (no provider)
  ✓ Selective subscriptions (only re-renders what changes)
  ✓ Middleware: persist, immer, devtools
  ✗ Very fine-grained atomic updates (use Jotai)

Jotai:
  ✓ Fine-grained state (each atom is independent)
  ✓ Derived state with automatic dependency tracking
  ✓ Atom families for per-entity state
  ✗ Simple global state (overkill — use Zustand)

TanStack Query:
  ✓ All server state (API data)
  ✓ Caching, deduplication, background refetch
  ✓ Optimistic updates, rollback on error
  ✓ Pagination and infinite scroll
  ✗ Client-only state (use Context/Zustand)
```

## Best Practices

- Separate client state from server state — don't put API data in Zustand/Context
- Use TanStack Query for all server state — it handles caching, dedup, and refetching
- Use selectors in Zustand — subscribe only to the slices you need
- Split Context providers — don't put everything in one Provider (causes re-renders)
- Use `useReducer` for complex state transitions in Context — cleaner than multiple `useState`
- Set `staleTime` in TanStack Query — avoid refetching on every mount by default
- Use optimistic updates for instant feedback — roll back on error
- Colocate related state — don't create one global store for everything
- Use `persist` middleware for Zustand — save cart, preferences to localStorage
- Keep atoms small in Jotai — one atom per piece of state for fine-grained reactivity

## Common Mistakes

- **Putting server state in Redux/Zustand**: you lose caching, dedup, and refetch. Use TanStack Query.
- **One giant Context**: every state change re-renders all consumers. Split into multiple contexts.
- **No selectors in Zustand**: `useStore()` without a selector subscribes to the entire store.
- **Missing `staleTime` in TanStack Query**: default is 0, causing refetch on every mount. Set 5+ minutes.
- **Not handling loading/error states**: TanStack Query provides `isLoading`, `error` — use them.

## FAQ

### Context vs. Zustand — which should I use?

Context is built into React and works for low-frequency updates (theme, auth). Zustand is better for high-frequency updates because it uses selectors to prevent unnecessary re-renders. Context causes all consumers to re-render on any state change.

### Why not use Redux anymore?

TanStack Query eliminated the main use case for Redux (server state caching). For client state, Zustand and Jotai are simpler with less boilerplate. Redux Toolkit is still viable for very large teams that need strict patterns, but most apps don't need it.

### What is optimistic update?

Updating the UI immediately before the server confirms the mutation. If the server returns an error, the UI rolls back to the previous state. This gives users instant feedback without waiting for network round-trips.

### What is `staleTime` in TanStack Query?

How long data stays fresh before TanStack Query considers it stale and refetches on mount. Default is 0 (refetch on every mount). Set `staleTime: 5 * 60 * 1000` for 5 minutes to avoid unnecessary refetches.

### Can I use multiple state management tools together?

Yes. A common setup: TanStack Query for server state, Zustand for global client state (cart, auth), and `useState`/`useReducer` for local component state. Jotai can replace Zustand when you need fine-grained reactivity.
