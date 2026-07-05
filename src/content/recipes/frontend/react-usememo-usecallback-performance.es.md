---
contentType: recipes
slug: react-usememo-usecallback-performance
title: "Cuándo Usar useMemo y useCallback"
description: "Cómo y cuándo usar los hooks useMemo y useCallback de React para optimización de performance, y cuándo añaden overhead innecesario."
metaDescription: "Aprende cuándo usar React useMemo y useCallback para performance, cuándo añaden overhead, y cómo medir impacto con el React Profiler."
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
  - /recipes/frontend/react-virtual-list-react-window
  - /recipes/frontend/react-form-react-hook-form-validation
  - /recipes/frontend/css-container-queries-responsive
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende cuándo usar React useMemo y useCallback para performance, cuándo añaden overhead, y cómo medir impacto con el React Profiler."
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

`useMemo` cachea un valor computado para que React lo reutilice entre renders a menos que sus dependencias cambien. `useCallback` cachea una referencia de función para el mismo propósito. Ambos hooks previenen re-renders innecesarios y cálculos redundantes. Pero tienen su propio costo — almacenar el valor cacheado y comparar dependencias en cada render. Usarlos en valores baratos de computar o funciones que no se pasan a hijos memoizados hace las cosas más lentas.

## When to Use

- **Cómputos costosos**: filtrar una lista de 10,000 items, parsear JSON grande, math complejo
- **Referencias estables para hijos memoizados**: pasar callbacks a componentes `React.memo` que de otra forma re-renderizarían en cada render del parent
- **Dependencias estables para otros hooks**: un valor usado en un `useEffect` dependency array que no debería disparar el effect en cada render
- **Estabilización de context value**: prevenir que todos los context consumers re-rendericen cuando el state del provider cambia

## When NOT to Use

- **Cómputos baratos**: aritmética simple, concatenación de strings, operaciones de arrays pequeños — el overhead del hook excede los ahorros
- **Funciones pasadas solo a hijos no memoizados**: si el child no usa `React.memo`, una nueva referencia de función no causa renders extra
- **Valores primitivos**: `useMemo(() => 42, [])` — los primitivos se comparan por valor, no por referencia
- **Cada variable y función**: envolver todo en hooks es cargo-cult programming, no optimización

## Solution

### useMemo básico para cómputo costoso

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

Sin `useMemo`, cada keystroke en el search input re-filtra y re-ordena la lista completa de productos incluso si `products` no ha cambiado.

### useCallback para referencias de función estables

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

Sin `useCallback`, cada render de `Parent` (disparado por escribir en el input o incrementar count) crea una nueva referencia de `handleClick`, lo que rompe `memo` en `ExpensiveChild` y causa que re-renderice.

### Cuando useCallback es innecesario

```jsx
function Parent() {
  const [text, setText] = useState("");

  // Este child NO está memoizado — re-renderiza en cada render del parent de todas formas
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

Envolver `handleClick` en `useCallback` aquí añade overhead con cero beneficio — el botón no es un componente memoizado.

### useMemo para estabilización de context value

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

Sin `useMemo`, cada render del provider crea un nuevo objeto `value`, causando que todos los consumers re-rendericen — incluso si solo cambió `theme` y `UserProfile` solo usa `user`.

### Medir con React Profiler

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

Usa el Profiler para medir tiempos de render reales antes y después de agregar `useMemo`. Si la duración no mejora, remueve el hook.

### useMemo con creación de objeto costoso

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

### useCallback con dependencia de useEffect

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

Sin `useCallback`, `fetchResults` es una nueva función en cada render, causando que `useEffect` se re-ejecute en cada render — un infinite loop.

## Variants

### Usar useMemo para valores debounced

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

### Custom hook combinando useMemo y useCallback

```jsx
function useFilteredData(data, filterFn) {
  const stableFilter = useCallback(filterFn, [filterFn]);

  const filtered = useMemo(() => data.filter(stableFilter), [data, stableFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => a.id - b.id), [filtered]);

  return sorted;
}
```

## Best Practices

- Mide antes de optimizar — usa el React Profiler para identificar bottlenecks reales
- Aplica `useMemo` a cómputos que toman más de 1-2ms — los más baratos no valen el overhead del hook
- Aplica `useCallback` solo cuando la función se pasa a un child `React.memo` o se usa como dependencia de `useEffect`
- Mantén los dependency arrays completos — omitir una dependencia causa stale closures y bugs
- No memoices valores primitivos (strings, numbers, booleans) — se comparan por valor
- Usa `React.memo` en children antes de usar `useCallback` — memoizar un callback para un child no memoizado es desperdicio

## Common Mistakes

- **Envolver todo en hooks**: `useMemo(() => a + b, [a, b])` para suma simple es más lento que `const sum = a + b`
- **Arrays de dependencias vacíos con valores que cambian**: `useMemo(() => compute(x), [])` — `x` se captura una vez y nunca se actualiza
- **Usar useMemo para side effects**: `useMemo` es para cómputos puros. Usa `useEffect` para side effects.
- **No memoizar context values**: un nuevo object literal en un context provider causa que todos los consumers re-rendericen
- **Memoizar la cosa equivocada**: memoizar el resultado de una operación barata mientras se ignora la costosa

## FAQ

### ¿useMemo garantiza que el valor cacheado se reutiliza?

No. React puede descartar valores cacheados para liberar memoria. `useMemo` es un hint, no una garantía. No dependas de él para correctness — solo para performance.

### ¿Debería siempre usar React.memo en componentes?

No. `React.memo` añade una shallow comparison en cada render. Si los props del componente cambian en cada render de todas formas (nuevos objetos, nuevos arrays), `memo` nunca previene un re-render y la comparación es overhead desperdiciado.

### ¿Cuál es el overhead de useMemo?

En cada render, React compara cada dependencia con `Object.is`. Para un hook con 3 dependencias, son 3 comparaciones más el costo de almacenar el valor cacheado. Para cómputos baratos (menos de 1ms), este overhead excede los ahorros.

### ¿Puedo usar useMemo para operaciones async?

No. `useMemo` es sincrónico. Para async, usa `useEffect` con state, o una librería como `@tanstack/react-query` o SWR.

### ¿Cómo sé si un cómputo es lo suficientemente costoso para memoizar?

Usa `console.time` y `console.timeEnd` alrededor del cómputo, o usa el React Profiler. Si un render toma más de 16ms (un frame a 60fps), busca cómputos costosos para memoizar.
