---
contentType: guides
slug: complete-guide-react-performance-optimization
title: "Referencia Detallada de Optimización de Performance en React"
description: "Optimiza apps de React para velocidad. Cubre memoization, virtualization, code splitting, bundle analysis, React Profiler, concurrent features y Core Web Vitals."
metaDescription: "Referencia Detallada de optimización de performance en React. Master memoization, virtualization, code splitting, bundle analysis, React Profiler y Core Web Vitals."
difficulty: intermediate
topics:
  - frontend
  - performance
tags:
  - react
  - performance
  - optimization
  - memoization
  - code-splitting
  - virtualization
  - guide
  - frontend
relatedResources:
  - /guides/frontend/web-components-guide
  - /guides/performance/performance-optimization-guide
  - /guides/frontend/accessibility-wcag-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Referencia Detallada de optimización de performance en React. Master memoization, virtualization, code splitting, bundle analysis, React Profiler y Core Web Vitals."
  keywords:
    - react performance
    - react optimization
    - react memoization
    - react code splitting
    - react virtualization
    - react profiler
    - core web vitals react
---

# Referencia Detallada de Optimización de Performance en React

## Introducción

React es rápido por default, pero a medida que las apps crecen, re-renders innecesarios, bundles grandes y listas no optimizadas pueden degradar performance. A continuación: memoization, virtualization, code splitting, bundle analysis, React Profiler, concurrent features y tuning de Core Web Vitals.

## Identificando Problemas de Performance

### React Profiler

```jsx
import { Profiler } from "react";

function onRenderCallback(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <ExpensiveComponent />
    </Profiler>
  );
}
```

### Por qué los componentes re-renderizan

- **Cambio de state** — el componente y todos los children re-renderizan
- **Parent re-render** — todos los children re-renderizan a menos que estén memoizados
- **Cambio de context** — todos los consumers re-renderizan
- **Nuevos props** — incluso si los valores son idénticos, nuevas referencias de objeto triggeran re-renders

## Memoization

### React.memo

```jsx
const ExpensiveCard = React.memo(function ExpensiveCard({ title, description }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
});

// Comparación custom
const MemoizedCard = React.memo(Card, (prevProps, nextProps) => {
  return prevProps.title === nextProps.title && prevProps.description === nextProps.description;
});
```

### useMemo

```jsx
function ProductList({ products, filter }) {
  const filtered = useMemo(() => {
    return products.filter((p) => p.category === filter);
  }, [products, filter]);

  return (
    <ul>
      {filtered.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### useCallback

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");

  const handleClick = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <MemoizedButton onClick={handleClick} count={count} />
    </div>
  );
}
```

### Cuándo NO memoizar

- **Componentes pequeños** — el overhead de memoization excede el costo de re-render
- **Props primitivos que raramente cambian** — React ya optimiza esto
- **Cada render** — si el componente siempre re-renderiza, memoization añade overhead
- **Cálculos simples** — `useMemo` para `a + b` es más lento que computarlo

## Virtualization (Listas Grandes)

### react-window

```jsx
import { FixedSizeList } from "react-window";

function Row({ index, style, data }) {
  return (
    <div style={style}>
      {data[index].name} — {data[index].email}
    </div>
  );
}

function UserList({ users }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={users.length}
      itemSize={50}
      width="100%"
      itemData={users}
    >
      {Row}
    </FixedSizeList>
  );
}
```

### @tanstack/react-virtual (altura variable)

```jsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VariableHeightList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Code Splitting

### React.lazy + Suspense

```jsx
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
```

### Route-based splitting

```jsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Product = lazy(() => import("./pages/Product"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/product/:id" element={<Product />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Conditional loading

```jsx
function App({ showAdmin }) {
  const AdminPanel = useMemo(() => {
    if (!showAdmin) return null;
    const LazyAdmin = lazy(() => import("./AdminPanel"));
    return <LazyAdmin />;
  }, [showAdmin]);

  return (
    <div>
      <Header />
      {AdminPanel && <Suspense fallback={<Loader />}>{AdminPanel}</Suspense>}
    </div>
  );
}
```

## Bundle Analysis

```bash
# Instalar bundle analyzer
npm install --save-dev webpack-bundle-analyzer

# Analizar production build
npx webpack-bundle-analyzer dist/stats.json

# O con Vite
npm install --save-dev rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from "rollup-plugin-visualizer";

export default {
  plugins: [
    visualizer({
      open: true,
      filename: "dist/stats.html",
      gzipSize: true,
    }),
  ],
};
```

## Optimización de Imágenes

```jsx
import { useState } from "react";

function OptimizedImage({ src, alt, width, height }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ width, height, background: "#f0f0f0" }}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
      />
    </div>
  );
}
```

## Optimización de State Management

### Selector optimization (Zustand)

```jsx
import { create } from "zustand";

const useStore = create((set) => ({
  user: null,
  posts: [],
  setPosts: (posts) => set({ posts }),
}));

// MAL — re-renderiza en cualquier cambio de state
function PostList() {
  const store = useStore();
  return <div>{store.posts.map((p) => <p key={p.id}>{p.title}</p>)}</div>;
}

// BIEN — solo re-renderiza cuando posts cambia
function PostList() {
  const posts = useStore((s) => s.posts);
  return <div>{posts.map((p) => <p key={p.id}>{p.title}</p>)}</div>;
}
```

### Context splitting

```jsx
// MAL — todos los consumers re-renderizan cuando cualquier valor cambia
const AppContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  return (
    <AppContext.Provider value={{ user, theme, setUser, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

// BIEN — splitir en contexts separados
const UserContext = createContext();
const ThemeContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

## Concurrent Features (React 18+)

### useTransition

```jsx
import { useTransition, useState } from "react";

function SearchResults({ allItems }) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(allItems);

  function handleChange(e) {
    setQuery(e.target.value);
    startTransition(() => {
      const filtered = allItems.filter((item) =>
        item.name.toLowerCase().includes(e.target.value.toLowerCase())
      );
      setFiltered(filtered);
    });
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <span>Filtering...</span>}
      <ul>
        {filtered.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useDeferredValue

```jsx
import { useDeferredValue, useMemo } from "react";

function SearchResults({ query, items }) {
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [items, deferredQuery]);

  return (
    <ul>
      {filtered.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

## Core Web Vitals

| Métrica | Target | Qué Optimizar |
|--------|--------|-----------------|
| LCP | < 2.5s | Image loading, font loading, server response |
| INP | < 200ms | Event handlers, re-renders, heavy computations |
| CLS | < 0.1 | Image dimensions, layout stability, fonts |

### Lighthouse audit

```bash
npx lighthouse https://localhost:3000 --view --preset=desktop
```

## Pautas

- **Profilar antes de optimizar** — usar React Profiler para encontrar bottlenecks reales
- **Memoizar solo operaciones costosas** — over-memoization añade overhead
- **Virtualizar listas de más de 100 items** — los DOM nodes son el mayor killer de performance
- **Splitir rutas** — los usuarios solo descargan code de la página que visitan
- **Usar `loading="lazy"` en imágenes** — deferir imágenes off-screen
- **Setear dimensiones de imagen** — prevenir layout shift (CLS)
- **Splitir context por concern** — evitar re-renderizar todos los consumers
- **Usar selectors en state management** — subscribir solo a slices necesarios
- **Debouncear handlers costosos** — search, resize, scroll
- **Usar `useTransition` para updates pesados** — mantener UI responsive durante filtering
- **Analizar bundle size regularmente** — capturar regresiones antes de que shipen
- **Usar production build** — el development build es 10x más lento

## Errores Comunes

- Memoizar todo — el overhead excede el beneficio para componentes pequeños
- No usar keys en listas — React re-renderiza todos los items en cualquier cambio
- Usar array index como key — causa bugs cuando los items se reordenan
- Props de objeto/array inline — nueva referencia en cada render, rompe `React.memo`
- No splitir bundles grandes — los usuarios descargan code no usado
- Renderizar miles de DOM nodes — sin virtualization
- Guardar derived state en `useState` — usar `useMemo` en su lugar
- No usar `useCallback` para handlers pasados a children memoizados
- Ignorar warnings de Lighthouse — Core Web Vitals afectan SEO y UX
- Usar context para todo — global state causa re-renders globales

## Preguntas Frecuentes

### ¿Cuándo debo usar `React.memo` vs `useMemo` vs `useCallback`?

Usar `React.memo` para prevenir re-renders de child components. Usar `useMemo` para cachear cálculos costosos. Usar `useCallback` para estabilizar referencias de funciones pasadas a children memoizados. Los tres añaden overhead — solo usarlos cuando profiling muestre un bottleneck real.

### ¿Cómo mido performance de React?

Usar la React Profiler API en development para medir render times. Usar Lighthouse para Core Web Vitals en producción. Usar el tab React DevTools Profiler para visualizar render trees y encontrar re-renders innecesarios.

### ¿Debo usar Server Components en lugar de memoization?

Server Components reducen el JavaScript client-side renderizando en el server. Eliminan muchos issues de re-render enteramente. Si estás en React 18+ con un framework como Next.js, Server Components es el enfoque preferido. Para apps client-only, memoization sigue siendo la herramienta principal.
