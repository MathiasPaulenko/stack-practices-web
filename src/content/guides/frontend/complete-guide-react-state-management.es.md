---



contentType: guides
slug: complete-guide-react-state-management
title: "React State Management: Context, Zustand, TanStack Query"
description: "Dominá React state management: Context API, Zustand, Jotai y TanStack Query para server state. Cubre patterns, persistence, optimistic updates y cuándo usar cada uno."
metaDescription: "Dominá React state management: Context API, Zustand, Jotai y TanStack Query para server state. Cubre patterns, persistence, optimistic updates y cuándo usar cada tool."
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
  - /guides/complete-guide-react-server-components
  - /guides/complete-guide-typescript-advanced-types
  - /recipes/svelte-store-reactive-state
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Dominá React state management: Context API, Zustand, Jotai y TanStack Query para server state. Cubre patterns, persistence, optimistic updates y cuándo usar cada tool."
  keywords:
    - react state management
    - zustand
    - tanstack query
    - context api
    - jotai
    - server state
    - optimistic updates



---

## Introducción

React state management se divide en dos categories: client state (UI state, form input, theme) y server state (API data, cached responses). Different tools handle cada category. Context API está built into React para sharing state sin prop drilling. Zustand provee un lightweight store fuera del React tree. Jotai ofrece atomic state management para fine-grained reactivity. TanStack Query maneja server state con caching, invalidation y optimistic updates. A continuación: los cuatro con practical patterns y guidance sobre cuándo usar cada uno.

## State Categories

```
Client State (vive en el browser):
  - UI state: modal open/closed, active tab, sidebar collapsed
  - Form state: input values, validation errors, dirty fields
  - App preferences: theme, language, sort order
  - Local component state: hover, focus, animation state

Server State (vive en el server, cached en browser):
  - API response data: user list, product details, search results
  - Pagination e infinite scroll state
  - Mutation state: loading, error, success
  - Cache invalidation y refetching

Rule of thumb:
  - Client state → Context, Zustand, o Jotai
  - Server state → TanStack Query
  - No pongas server state en Redux/Zustand — usá TanStack Query
```

## Context API

### Context básico

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

### Context con useReducer

```tsx
// CartContext.tsx — Complex state con useReducer
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

### Store básico

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

### Zustand con middleware

```tsx
// store/useCartStore.ts — Zustand con persist y immer
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

### Selectors para performance

```tsx
// Selecteá solo lo que necesitás — previene unnecessary re-renders
function CartBadge() {
  // Solo re-rendera cuando total cambia
  const total = useCartStore((s) => s.total);
  return <span>{total > 0 ? `$${total}` : "Empty"}</span>;
}

function CartList() {
  // Solo re-rendera cuando items cambian
  const items = useCartStore((s) => s.items);
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name} × {item.quantity}</li>
      ))}
    </ul>
  );
}

// Multiple values con shallow comparison
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

### Atom family para dynamic keys

```tsx
// Un atom per item ID
const itemAtomFamily = atomFamily((id: string) =>
  atom<{ id: string; name: string; price: number } | null>(null)
);

function ProductItem({ id }: { id: string }) {
  const [item, setItem] = useAtom(itemAtomFamily(id));
  // Cada component subscribe a su propio atom
  return <div>{item?.name}</div>;
}
```

## TanStack Query

### Queries básicos

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

### Mutations con cache invalidation

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
      // Invalidateá el products query para refetch
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

    // Optimistically updateá el cache antes de que la mutation complete
    onMutate: async (updatedProduct) => {
      // Cancelá outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshotéa previous value
      const previousProducts = queryClient.getQueryData<Product[]>(["products"]);

      // Optimistically updateá
      queryClient.setQueryData<Product[]>(["products"], (old) =>
        old?.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );

      // Returnéa context para rollback
      return { previousProducts };
    },

    // Si la mutation falla, roll back
    onError: (err, updatedProduct, context) => {
      queryClient.setQueryData(["products"], context?.previousProducts);
    },

    // Always refetch después de success o error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

### Pagination e infinite scroll

```tsx
// Pagination
export function usePaginatedProducts(page: number) {
  return useQuery({
    queryKey: ["products", page],
    queryFn: () => fetch(`/api/products?page=${page}`).then((r) => r.json()),
    placeholderData: keepPreviousData,  // Show stale data mientras fetchea next page
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

## Cuándo Usar Qué

```
Context API:
  ✓ Small to medium apps
  ✓ Theme, auth, locale — low-frequency updates
  ✓ Cuando necesitás React's built-in solution (no dependency)
  ✗ High-frequency updates (causa re-renders en all consumers)

Zustand:
  ✓ Medium to large apps
  ✓ Global state fuera del React tree (no provider)
  ✓ Selective subscriptions (solo re-rendera lo que cambia)
  ✓ Middleware: persist, immer, devtools
  ✗ Very fine-grained atomic updates (usá Jotai)

Jotai:
  ✓ Fine-grained state (cada atom es independent)
  ✓ Derived state con automatic dependency tracking
  ✓ Atom families para per-entity state
  ✗ Simple global state (overkill — usá Zustand)

TanStack Query:
  ✓ All server state (API data)
  ✓ Caching, deduplication, background refetch
  ✓ Optimistic updates, rollback en error
  ✓ Pagination e infinite scroll
  ✗ Client-only state (usá Context/Zustand)
```

## Best Practices


- For a deeper guide, see [Complete Guide to React 19 Features](/es/guides/complete-guide-react-19-features/).

- Separá client state de server state — no pongas API data en Zustand/Context
- Usá TanStack Query para all server state — handlea caching, dedup y refetching
- Usá selectors en Zustand — subscribe solo a los slices que necesitás
- Spliteá Context providers — no pongas todo en un Provider (causa re-renders)
- Usá `useReducer` para complex state transitions en Context — cleaner que multiple `useState`
- Seteá `staleTime` en TanStack Query — evitá refetching en every mount por default
- Usá optimistic updates para instant feedback — roll back en error
- Colocalizá related state — no crees un global store para todo
- Usá `persist` middleware para Zustand — saveá cart, preferences a localStorage
- Mantené atoms chicas en Jotai — un atom per piece of state para fine-grained reactivity

## Common Mistakes

- **Poner server state en Redux/Zustand**: perdés caching, dedup y refetch. Usá TanStack Query.
- **Un giant Context**: cada state change re-rendera all consumers. Spliteá en multiple contexts.
- **No selectors en Zustand**: `useStore()` sin selector subscribe al entire store.
- **Missing `staleTime` en TanStack Query**: default es 0, causando refetch en every mount. Seteá 5+ minutes.
- **No handlear loading/error states**: TanStack Query provee `isLoading`, `error` — usalos.

## FAQ

### Context vs. Zustand — ¿cuál debería usar?

Context está built into React y funciona para low-frequency updates (theme, auth). Zustand es mejor para high-frequency updates porque usa selectors para prevenir unnecessary re-renders. Context causa que all consumers re-render en cualquier state change.

### ¿Por qué no usar Redux anymore?

TanStack Query eliminó el main use case para Redux (server state caching). Para client state, Zustand y Jotai son simpler con less boilerplate. Redux Toolkit es still viable para very large teams que necesitan strict patterns, pero most apps no lo necesitan.

### ¿Qué es optimistic update?

Updatear el UI immediately antes de que el server confirme la mutation. Si el server retorna un error, el UI roll back al previous state. Esto da users instant feedback sin esperar network round-trips.

### ¿Qué es `staleTime` en TanStack Query?

Cuánto tiempo data stays fresh antes de que TanStack Query lo considere stale y refetche en mount. Default es 0 (refetch en every mount). Seteá `staleTime: 5 * 60 * 1000` para 5 minutes para evitar unnecessary refetches.

### ¿Puedo usar multiple state management tools juntos?

Sí. Un common setup: TanStack Query para server state, Zustand para global client state (cart, auth), y `useState`/`useReducer` para local component state. Jotai puede reemplazar Zustand cuando necesitás fine-grained reactivity.
