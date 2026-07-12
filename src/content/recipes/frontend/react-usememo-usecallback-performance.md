---






contentType: recipes
slug: react-usememo-usecallback-performance
title: "When to Use useMemo and useCallback"
description: "How and when to use React's useMemo and useCallback hooks for performance optimization, and when they add unnecessary overhead."
metaDescription: "Learn when to use React useMemo and useCallback for performance, when they add overhead, and how to measure impact with the React Profiler."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - react
  - performance
  - hooks
  - usememo
  - usecallback
  - recipe
relatedResources:
  - /recipes/react-virtual-list-react-window
  - /recipes/react-form-react-hook-form-validation
  - /recipes/css-container-queries-responsive
  - /recipes/css-dark-mode-prefers-color-scheme
  - /recipes/svelte-store-reactive-state
  - /recipes/typescript-discriminated-unions-exhaustive
  - /recipes/typescript-utility-types-generics
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn when to use React useMemo and useCallback for performance, when they add overhead, and how to measure impact with the React Profiler."
  keywords:
    - frontend
    - react
    - performance
    - hooks
    - usememo
    - usecallback
    - recipe






---

## Overview

`useMemo` caches a computed value so React reuses it across renders unless its dependencies change. `useCallback` caches a function reference for the same purpose. Both hooks prevent unnecessary re-renders and redundant calculations. But they have their own cost — storing the cached value and comparing dependencies on every render. Using them on values that are cheap to compute or functions that aren't passed to memoized children actually makes things slower.

## When to Use

- **Expensive computations**: filtering a list of 10,000 items, parsing large JSON, complex math
- **Stable references for memoized children**: passing callbacks to `React.memo` components that would otherwise re-render on every parent render
- **Stable dependencies for other hooks**: a value used in a `useEffect` dependency array that shouldn't trigger the effect on every render
- **Context value stabilization**: preventing all context consumers from re-rendering when the provider's state changes

## When NOT to Use

- **Cheap computations**: simple arithmetic, string concatenation, small array operations — the hook overhead exceeds the savings
- **Functions passed only to non-memoized children**: if the child doesn't use `React.memo`, a new function reference doesn't cause extra renders
- **Primitive values**: `useMemo(() => 42, [])` — primitives are compared by value, not reference
- **Every variable and function**: wrapping everything in hooks is cargo-cult programming, not optimization

## Solution

### Basic useMemo for expensive computation

```jsx
import { useMemo, useState } from "react";

function ProductList({ products }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");

  const filteredSorted = useMemo(() => {
    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price") return a.price - b.price;
      return 0;
    });
  }, [products, query, sort]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <select value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="name">Name</option>
        <option value="price">Price</option>
      </select>
      <ul>
        {filteredSorted.map((p) => (
          <li key={p.id}>{p.name} — ${p.price}</li>
        ))}
      </ul>
    </div>
  );
}
```

Without `useMemo`, every keystroke in the search input re-filters and re-sorts the entire product list even if `products` hasn't changed.

### useCallback for stable function references

```jsx
import { useCallback, useState, memo } from "react";

const ExpensiveChild = memo(function ExpensiveChild({ onClick, id }) {
  console.log("ExpensiveChild rendered");
  return <button onClick={() => onClick(id)}>Click me</button>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");

  const handleClick = useCallback((id) => {
    console.log("Clicked item", id);
  }, []);

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveChild onClick={handleClick} id={1} />
    </div>
  );
}
```

Without `useCallback`, every render of `Parent` (triggered by typing in the input or incrementing count) creates a new `handleClick` reference, which breaks `memo` on `ExpensiveChild` and causes it to re-render.

### When useCallback is unnecessary

```jsx
function Parent() {
  const [text, setText] = useState("");

  // This child is NOT memoized — it re-renders on every parent render anyway
  const handleClick = (id) => {
    console.log("Clicked", id);
  };

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={() => handleClick(1)}>Click</button>
    </div>
  );
}
```

Wrapping `handleClick` in `useCallback` here adds overhead with zero benefit — the button isn't a memoized component.

### useMemo for context value stabilization

```jsx
import { createContext, useContext, useMemo, useState } from "react";

const UserContext = createContext(null);

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");

  const value = useMemo(
    () => ({ user, setUser, theme, setTheme }),
    [user, theme]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

function UserProfile() {
  const { user } = useContext(UserContext);
  return <div>{user?.name}</div>;
}
```

Without `useMemo`, every provider render creates a new `value` object, causing all consumers to re-render — even if only `theme` changed and `UserProfile` only uses `user`.

### Measuring with React Profiler

```jsx
import { Profiler } from "react";

function onRender(id, phase, actualDuration) {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="ProductList" onRender={onRender}>
      <ProductList products={largeProductList} />
    </Profiler>
  );
}
```

Use the Profiler to measure actual render times before and after adding `useMemo`. If the duration doesn't improve, remove the hook.

### useMemo with expensive object creation

```jsx
function Chart({ data }) {
  const chartConfig = useMemo(() => {
    return {
      scales: {
        x: { type: "time" },
        y: { min: Math.min(...data.map((d) => d.value)) },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
          },
        },
      },
    };
  }, [data]);

  return <canvas ref={(c) => drawChart(c, chartConfig)} />;
}
```

### useCallback with useEffect dependency

```jsx
function SearchResults({ query, onSearch }) {
  const [results, setResults] = useState([]);

  const fetchResults = useCallback(async () => {
    const response = await fetch(`/api/search?q=${query}`);
    const data = await response.json();
    setResults(data);
  }, [query]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return <ResultList results={results} onSearch={onSearch} />;
}
```

Without `useCallback`, `fetchResults` is a new function on every render, causing `useEffect` to re-run on every render — an infinite loop.

## Variants

### Using useMemo for debounced values

```jsx
function SearchInput() {
  const [input, setInput] = useState("");
  const debounced = useMemo(() => {
    let timeout;
    return (value) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setInput(value), 300);
    };
  }, []);

  return <input onChange={(e) => debounced(e.target.value)} />;
}
```

### Custom hook combining useMemo and useCallback

```jsx
function useFilteredData(data, filterFn) {
  const stableFilter = useCallback(filterFn, [filterFn]);

  const filtered = useMemo(() => data.filter(stableFilter), [data, stableFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => a.id - b.id), [filtered]);

  return sorted;
}
```

## Best Practices


- For a deeper guide, see [Virtualize Long Lists with react-window](/recipes/react-virtual-list-react-window/).

- Measure before optimizing — use the React Profiler to identify actual bottlenecks
- Apply `useMemo` to computations that take more than 1-2ms — cheaper ones aren't worth the hook overhead
- Apply `useCallback` only when the function is passed to a `React.memo` child or used as a `useEffect` dependency
- Keep dependency arrays complete — omitting a dependency causes stale closures and bugs
- Don't memoize primitive values (strings, numbers, booleans) — they're compared by value
- Use `React.memo` on children before using `useCallback` — memoizing a callback for a non-memoized child is wasted

## Common Mistakes

- **Wrapping everything in hooks**: `useMemo(() => a + b, [a, b])` for simple addition is slower than `const sum = a + b`
- **Empty dependency arrays with changing values**: `useMemo(() => compute(x), [])` — `x` is captured once and never updates
- **Using useMemo for side effects**: `useMemo` is for pure computations. Use `useEffect` for side effects.
- **Not memoizing context values**: a new object literal in a context provider causes all consumers to re-render
- **Memoizing the wrong thing**: memoizing the result of a cheap operation while ignoring the expensive one

## FAQ

### Does useMemo guarantee the cached value is reused?

No. React may discard cached values to free memory. `useMemo` is a hint, not a guarantee. Don't rely on it for correctness — only for performance.

### Should I always use React.memo on components?

No. `React.memo` adds a shallow comparison on every render. If the component's props change on every render anyway (new objects, new arrays), `memo` never prevents a re-render and the comparison is wasted overhead.

### What is the overhead of useMemo?

On every render, React compares each dependency with `Object.is`. For a hook with 3 dependencies, that's 3 comparisons plus the cost of storing the cached value. For cheap computations (under 1ms), this overhead exceeds the savings.

### Can I use useMemo for async operations?

No. `useMemo` is synchronous. For async, use `useEffect` with state, or a library like `@tanstack/react-query` or SWR.

### How do I know if a computation is expensive enough to memoize?

Use `console.time` and `console.timeEnd` around the computation, or use the React Profiler. If a render takes more than 16ms (one frame at 60fps), look for expensive computations to memoize.
