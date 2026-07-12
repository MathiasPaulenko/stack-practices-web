---


contentType: recipes
slug: react-virtual-list-react-window
title: "Virtualizar Listas Largas con react-window"
description: "Cómo renderizar listas grandes eficientemente en React usando react-window para virtualización del DOM, incluyendo filas de altura fija y variable y layouts de grid."
metaDescription: "Renderiza listas grandes eficientemente en React con react-window. Virtualiza filas de altura fija y variable, grids e infinite scroll con nodos DOM mínimos."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - react
  - performance
  - virtualization
  - react-window
  - recipe
relatedResources:
  - /recipes/react-usememo-usecallback-performance
  - /recipes/react-form-react-hook-form-validation
  - /recipes/css-container-queries-responsive
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Renderiza listas grandes eficientemente en React con react-window. Virtualiza filas de altura fija y variable, grids e infinite scroll con nodos DOM mínimos."
  keywords:
    - frontend
    - react
    - performance
    - virtualization
    - react-window
    - recipe


---

## Overview

`react-window` renderiza solo las filas visibles de una lista larga, reciclando nodos del DOM mientras el usuario scrollea. En lugar de renderizar 10,000 elementos `<div>`, renderiza solo los ~20 visibles más algunas filas de overscan. Esto mantiene el DOM pequeño y el scroll suave, incluso con datasets masivos. `react-window` es un sucesor más ligero y rápido de `react-virtualized`.

## When to Use

- Listas con 1,000+ items donde renderizar todos causa jank
- Tablas con datasets grandes que necesitan scroll suave
- Grid layouts con muchas celdas
- Listas de mensajes de chat con miles de mensajes
- Cualquier lista donde renderizar todos los items aumenta el uso de memoria o el tiempo de render inicial

## When NOT to Use

- Listas con menos de 100 items — el overhead de virtualización no vale la pena
- Listas donde los items tienen alturas muy diferentes difíciles de medir — considera `react-virtuoso` en su lugar
- Listas que necesitan render completo para SEO o print — el contenido virtualizado no está en el DOM hasta que se scrollea
- Cuando necesitas browser find (Ctrl+F) para buscar todos los items — solo los items visibles están en el DOM

## Solution

### Setup

```bash
npm install react-window
```

### Lista de tamaño fijo

```jsx
import { FixedSizeList } from "react-window";

const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);

function Row({ index, style }) {
  return (
    <div style={style} className="list-row">
      {items[index]}
    </div>
  );
}

function VirtualList() {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={50}
    >
      {Row}
    </FixedSizeList>
  );
}
```

El prop `style` de react-window incluye `position: absolute`, `top` y `height` — aplícalo al elemento root de la fila. No overridees estos valores.

### Lista de tamaño variable

```jsx
import { VariableSizeList } from "react-window";

const items = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  text: `Item ${i} — ${"x".repeat((i % 5) + 1) * 20}`,
}));

function Row({ index, style }) {
  const item = items[index];
  return (
    <div style={style} className="list-row">
      <h4>{item.text}</h4>
    </div>
  );
}

function getItemSize(index) {
  // Variar altura basado en contenido
  const lines = (index % 5) + 1;
  return 40 + lines * 24;
}

function VariableList() {
  return (
    <VariableSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={getItemSize}
    >
      {Row}
    </VariableSizeList>
  );
}
```

### Layout de grid

```jsx
import { FixedSizeGrid } from "react-window";

const columnCount = 4;
const rowCount = 2500;

function Cell({ columnIndex, rowIndex, style }) {
  return (
    <div style={style} className="grid-cell">
      Row {rowIndex}, Col {columnIndex}
    </div>
  );
}

function VirtualGrid() {
  return (
    <FixedSizeGrid
      columnCount={columnCount}
      rowCount={rowCount}
      columnWidth={200}
      rowHeight={100}
      height={600}
      width={800}
    >
      {Cell}
    </FixedSizeGrid>
  );
}
```

### Infinite scrolling

```jsx
import { FixedSizeList } from "react-window";
import { useState, useCallback, useRef } from "react";

function InfiniteList() {
  const [items, setItems] = useState(
    Array.from({ length: 50 }, (_, i) => `Item ${i}`)
  );
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef(null);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setTimeout(() => {
      const newItems = Array.from(
        { length: 50 },
        (_, i) => `Item ${items.length + i}`
      );
      setItems((prev) => [...prev, ...newItems]);
      if (items.length + newItems.length >= 10000) {
        setHasMore(false);
      }
    }, 500);
  }, [items.length, hasMore]);

  function handleScroll({ scrollOffset, scrollDirection }) {
    if (listRef.current) {
      const { height, itemCount } = listRef.current.props;
      const totalHeight = itemCount * 50;
      if (scrollOffset + height >= totalHeight - 200 && scrollDirection === "forward") {
        loadMore();
      }
    }
  }

  function Row({ index, style }) {
    if (index === items.length && hasMore) {
      return (
        <div style={style} className="loading-row">
          Loading more...
        </div>
      );
    }
    return (
      <div style={style} className="list-row">
        {items[index]}
      </div>
    );
  }

  return (
    <FixedSizeList
      ref={listRef}
      height={600}
      width="100%"
      itemCount={items.length + (hasMore ? 1 : 0)}
      itemSize={50}
      onScroll={handleScroll}
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Scroll a item específico

```jsx
import { FixedSizeList } from "react-window";
import { useRef } from "react";

function ListWithScroll() {
  const listRef = useRef(null);

  function scrollToItem(index) {
    listRef.current?.scrollToItem(index, "center");
  }

  return (
    <div>
      <button onClick={() => scrollToItem(500)}>Jump to item 500</button>
      <FixedSizeList
        ref={listRef}
        height={600}
        width="100%"
        itemCount={10000}
        itemSize={50}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}
```

### Scroll horizontal

```jsx
import { FixedSizeList } from "react-window";

function HorizontalList() {
  return (
    <FixedSizeList
      layout="horizontal"
      height={100}
      width={800}
      itemCount={1000}
      itemSize={150}
    >
      {({ index, style }) => (
        <div style={style} className="horizontal-item">
          Card {index}
        </div>
      )}
    </FixedSizeList>
  );
}
```

### Scrollbar custom con react-window-scroller

```jsx
import { FixedSizeList } from "react-window";
import WindowScroller from "react-window-scroller";

function ScrolledList() {
  return (
    <WindowScroller>
      {({ ref, outerRef, style, onScroll }) => (
        <FixedSizeList
          ref={ref}
          outerRef={outerRef}
          style={style}
          onScroll={onScroll}
          height={window.innerHeight}
          width="100%"
          itemCount={10000}
          itemSize={50}
        >
          {Row}
        </FixedSizeList>
      )}
    </WindowScroller>
  );
}
```

## Variants

### Usar con data fetching

```jsx
function DataList({ data, loading, onLoadMore }) {
  function Row({ index, style }) {
    if (index >= data.length) {
      return (
        <div style={style} className="loading-row">
          {loading ? "Loading..." : "Load more"}
        </div>
      );
    }
    return (
      <div style={style} className="list-row">
        <strong>{data[index].name}</strong>
        <span>{data[index].email}</span>
      </div>
    );
  }

  function handleItemsRendered({ visibleStopIndex }) {
    if (visibleStopIndex >= data.length - 5 && !loading) {
      onLoadMore();
    }
  }

  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={data.length + 1}
      itemSize={60}
      onItemsRendered={handleItemsRendered}
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Usar con React.memo para componentes de fila

```jsx
import { memo } from "react";

const MemoizedRow = memo(function Row({ index, style, data }) {
  const item = data[index];
  return (
    <div style={style} className="list-row">
      {item.name} — {item.email}
    </div>
  );
});

function OptimizedList({ items }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={50}
      itemData={items}
    >
      {MemoizedRow}
    </FixedSizeList>
  );
}
```

Pasa data vía prop `itemData` — react-window la pasa a cada fila. Combinado con `memo`, previene re-renders innecesarios cuando la lista scrollea.

## Best Practices


- For a deeper guide, see [Complete Guide to React Performance Optimization](/es/guides/complete-guide-react-performance-optimization/).

- Usa `FixedSizeList` cuando todas las filas tienen la misma altura — es más rápido y simple
- Usa `VariableSizeList` solo cuando las alturas varían — debes proveer una función `getItemSize`
- Aplica el prop `style` al elemento root de la fila — react-window posiciona las filas absolutamente
- Usa `itemData` para pasar data a las filas en lugar de closures — esto habilita la optimización con `React.memo`
- Setea `overscanCount` a 3-5 — renderizar algunas filas extra arriba y abajo previene flashes en blanco durante scroll rápido
- Usa `React.memo` en componentes de fila — react-window re-renderiza las filas visibles en scroll, memo previene trabajo innecesario
- Llama `resetAfterIndex` en `VariableSizeList` cuando las alturas de items cambian — los tamaños cacheados quedan stale

## Common Mistakes

- **Overridear el prop `style`**: react-window setea `position`, `top`, `height` — overridear estos rompe el layout. Mergea estilos adicionales: `style={{ ...style, borderBottom: "1px solid #ccc" }}`.
- **No usar `itemData` para data grande**: closures sobre arrays grandes causan re-renders. Pasa data vía `itemData` y usa `React.memo`.
- **Usar `VariableSizeList` con alturas fijas**: `FixedSizeList` es más rápido y simple cuando las alturas son uniformes.
- **Olvidar resetear el cache después de cambios de data**: `VariableSizeList` cachea los tamaños de items. Llama `ref.current.resetAfterIndex(0)` después de cambios que afectan alturas.
- **Setear `height` a un valor fijo de píxeles en layouts responsivos**: usa un container parent con altura medida, o usa `WindowScroller` para scroll a nivel de página.

## FAQ

### ¿Cuál es la diferencia entre react-window y react-virtualized?

`react-window` es el sucesor de `react-virtualized` del mismo autor. Es más pequeño (6KB vs 30KB), más rápido y tiene una API más simple. Usa `react-window` para proyectos nuevos. Usa `react-virtualized` solo si necesitas features que no están en `react-window` (como sorting de tablas).

### ¿Cómo manejo contenido dinámico que cambia la altura de fila?

Usa `VariableSizeList` con una función `getItemSize`. Si las alturas dependen del contenido renderizado, mide con un `ResizeObserver` y llama `resetAfterIndex` para actualizar el cache.

### ¿Puedo usar react-window con TypeScript?

Sí. Instala `@types/react-window` y tipa el componente de fila:

```tsx
import { FixedSizeListProps } from "react-window";

const Row: FixedSizeListProps["children"] = ({ index, style }) => (
  <div style={style}>Item {index}</div>
);
```

### ¿Cómo hago la lista responsiva al ancho del container?

Usa un `ResizeObserver` para trackear el ancho del container y pásalo a la lista:

```jsx
function ResponsiveList() {
  const [width, setWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {width > 0 && (
        <FixedSizeList height={600} width={width} itemCount={10000} itemSize={50}>
          {Row}
        </FixedSizeList>
      )}
    </div>
  );
}
```

### ¿react-window funciona con server-side rendering?

No. react-window depende de APIs del browser para scroll y medición. Para SSR, rendera una lista fallback y reemplázala con la lista virtualizada en el client.
