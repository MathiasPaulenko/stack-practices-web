---






contentType: guides
slug: complete-guide-react-performance-optimization
title: "Complete Guide to React Performance Optimization"
description: "Optimize React apps for speed. Covers memoization, virtualization, code splitting, bundle analysis, React Profiler, concurrent features, and Core Web Vitals."
metaDescription: "Complete guide to React performance optimization. Master memoization, virtualization, code splitting, bundle analysis, React Profiler and Core Web Vitals."
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
  - /guides/web-components-guide
  - /guides/performance-optimization-guide
  - /guides/accessibility-wcag-guide
  - /recipes/javascript-debounce-throttle-implementation
  - /recipes/javascript-event-loop
  - /recipes/web-performance
  - /recipes/database-query-result-caching
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to React performance optimization. Master memoization, virtualization, code splitting, bundle analysis, React Profiler and Core Web Vitals."
  keywords:
    - react performance
    - react optimization
    - react memoization
    - react code splitting
    - react virtualization
    - react profiler
    - core web vitals react






---

# Complete Guide to React Performance Optimization

## Introduction

React is fast by default, but as apps grow, unnecessary re-renders, large bundles, and unoptimized lists can degrade performance. The following guide covers memoization, virtualization, code splitting, bundle analysis, React Profiler, concurrent features, and Core Web Vitals tuning.

## Identifying Performance Issues

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

### Why components re-render

- **State change** — component and all children re-render
- **Parent re-render** — all children re-render unless memoized
- **Context change** — all consumers re-render
- **New props** — even if values are identical, new object references trigger re-renders

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

// Custom comparison
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

### When NOT to memoize

- **Small components** — memoization overhead exceeds re-render cost
- **Primitive props that rarely change** — React already optimizes this
- **Every render** — if the component always re-renders, memoization adds overhead
- **Simple calculations** — `useMemo` for `a + b` is slower than computing it

## Virtualization (Large Lists)

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

### @tanstack/react-virtual (variable height)

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
# Install bundle analyzer
npm install --save-dev webpack-bundle-analyzer

# Analyze production build
npx webpack-bundle-analyzer dist/stats.json

# Or with Vite
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

## Image Optimization

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

## State Management Optimization

### Selector optimization (Zustand)

```jsx
import { create } from "zustand";

const useStore = create((set) => ({
  user: null,
  posts: [],
  setPosts: (posts) => set({ posts }),
}));

// BAD — re-renders on any state change
function PostList() {
  const store = useStore();
  return <div>{store.posts.map((p) => <p key={p.id}>{p.title}</p>)}</div>;
}

// GOOD — only re-renders when posts change
function PostList() {
  const posts = useStore((s) => s.posts);
  return <div>{posts.map((p) => <p key={p.id}>{p.title}</p>)}</div>;
}
```

### Context splitting

```jsx
// BAD — all consumers re-render when either value changes
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

// GOOD — split into separate contexts
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

| Metric | Target | What to Optimize |
|--------|--------|-----------------|
| LCP | < 2.5s | Image loading, font loading, server response |
| INP | < 200ms | Event handlers, re-renders, heavy computations |
| CLS | < 0.1 | Image dimensions, layout stability, fonts |

### Lighthouse audit

```bash
npx lighthouse https://localhost:3000 --view --preset=desktop
```

## Best Practices


- For a deeper guide, see [Complete Guide to Bundle Size Optimization](/guides/complete-guide-bundle-size-optimization/).

- **Profile before optimizing** — use React Profiler to find actual bottlenecks
- **Memoize only expensive operations** — over-memoization adds overhead
- **Virtualize lists over 100 items** — DOM nodes are the biggest performance killer
- **Split routes** — users only download code for the page they visit
- **Use `loading="lazy"` on images** — defer off-screen images
- **Set image dimensions** — prevent layout shift (CLS)
- **Split context by concern** — avoid re-rendering all consumers
- **Use selectors in state management** — subscribe only to needed slices
- **Debounce expensive handlers** — search, resize, scroll
- **Use `useTransition` for heavy updates** — keep UI responsive during filtering
- **Analyze bundle size regularly** — catch regressions before they ship
- **Use production build** — development build is 10x slower

## Common Mistakes

- Memoizing everything — overhead exceeds benefit for small components
- Not using keys in lists — React re-renders all items on any change
- Using array index as key — causes bugs when items reorder
- Inline object/array props — new reference every render, breaks `React.memo`
- Not splitting large bundles — users download unused code
- Rendering thousands of DOM nodes — no virtualization
- Storing derived state in `useState` — use `useMemo` instead
- Not using `useCallback` for handlers passed to memoized children
- Ignoring Lighthouse warnings — Core Web Vitals affect SEO and UX
- Using context for everything — global state causes global re-renders

## Frequently Asked Questions

### When should I use `React.memo` vs `useMemo` vs `useCallback`?

Use `React.memo` to prevent re-renders of child components. Use `useMemo` to cache expensive computations. Use `useCallback` to stabilize function references passed to memoized children. All three add overhead — only use them when profiling shows a real bottleneck.

### How do I measure React performance?

Use the React Profiler API in development to measure render times. Use Lighthouse for production Core Web Vitals. Use the React DevTools Profiler tab to visualize render trees and find unnecessary re-renders.

### Should I use Server Components instead of memoization?

Server Components reduce client-side JavaScript by rendering on the server. They eliminate many re-render issues entirely. If you are on React 18+ with a framework like Next.js, Server Components are the preferred approach. For client-only apps, memoization remains the primary tool.
