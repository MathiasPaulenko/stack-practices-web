---


contentType: recipes
slug: react-virtual-list-react-window
title: "Virtualize Long Lists with react-window"
description: "How to render large lists efficiently in React using react-window for DOM virtualization, including fixed and variable height rows and grid layouts."
metaDescription: "Render large lists efficiently in React with react-window. Virtualize fixed and variable height rows, grid layouts, and infinite scrolling with minimal DOM nodes."
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
  metaDescription: "Render large lists efficiently in React with react-window. Virtualize fixed and variable height rows, grid layouts, and infinite scrolling with minimal DOM nodes."
  keywords:
    - frontend
    - react
    - performance
    - virtualization
    - react-window
    - recipe


---

## Overview

`react-window` renders only the visible rows of a long list, recycling DOM nodes as the user scrolls. Instead of rendering 10,000 `<div>` elements, it renders only the ~20 visible ones plus a few overscan rows. This keeps the DOM small and scrolling smooth, even with massive datasets. `react-window` is a lighter, faster successor to `react-virtualized`.

## When to Use

- Lists with 1,000+ items where rendering all items causes jank
- Tables with large datasets that need smooth scrolling
- Grid layouts with many cells
- Chat message lists with thousands of messages
- Any list where rendering all items increases memory usage or initial render time

## When NOT to Use

- Lists with fewer than 100 items — the overhead of virtualization isn't worth it
- Lists where items have vastly different heights that are hard to measure — consider `react-virtuoso` instead
- Lists that need to be fully rendered for SEO or print — virtualized content isn't in the DOM until scrolled into view
- When you need browser find (Ctrl+F) to search all items — only visible items are in the DOM

## Solution

### Setup

```bash
npm install react-window
```

### Fixed-size list

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

The `style` prop from react-window includes `position: absolute`, `top`, and `height` — apply it to the row's root element. Don't override these values.

### Variable-size list

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
  // Vary height based on content
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

### Grid layout

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

### With scroll-to-item

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

### Horizontal scrolling

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

### Custom scrollbar with react-window-scroller

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

### Using with data fetching

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

### Using with React.memo for row components

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

Pass data via `itemData` prop — react-window passes it to each row. Combined with `memo`, this prevents unnecessary re-renders when the list scrolls.

## Best Practices


- For a deeper guide, see [Complete Guide to React Performance Optimization](/guides/complete-guide-react-performance-optimization/).

- Use `FixedSizeList` when all rows have the same height — it's faster and simpler
- Use `VariableSizeList` only when row heights vary — you must provide a `getItemSize` function
- Apply the `style` prop to the row's root element — react-window positions rows absolutely
- Use `itemData` to pass data to rows instead of closures — this enables `React.memo` optimization
- Set `overscanCount` to 3-5 — rendering a few extra rows above and below prevents blank flashes during fast scrolling
- Use `React.memo` on row components — react-window re-renders visible rows on scroll, memo prevents unnecessary work
- Call `resetAfterIndex` on `VariableSizeList` when item heights change — cached sizes become stale

## Common Mistakes

- **Overriding the `style` prop**: react-window sets `position`, `top`, `height` — overriding these breaks the layout. Merge additional styles: `style={{ ...style, borderBottom: "1px solid #ccc" }}`.
- **Not using `itemData` for large data**: closures over large arrays cause re-renders. Pass data via `itemData` and use `React.memo`.
- **Using `VariableSizeList` with fixed heights**: `FixedSizeList` is faster and simpler when heights are uniform.
- **Forgetting to reset cache after data changes**: `VariableSizeList` caches item sizes. Call `ref.current.resetAfterIndex(0)` after data changes that affect heights.
- **Setting `height` to a fixed pixel value on responsive layouts**: use a parent container with a measured height, or use `WindowScroller` for page-level scrolling.

## FAQ

### What is the difference between react-window and react-virtualized?

`react-window` is the successor to `react-virtualized` by the same author. It's smaller (6KB vs 30KB), faster, and has a simpler API. Use `react-window` for new projects. Use `react-virtualized` only if you need features not in `react-window` (like table sorting).

### How do I handle dynamic content that changes row height?

Use `VariableSizeList` with a `getItemSize` function. If heights depend on rendered content, measure with a `ResizeObserver` and call `resetAfterIndex` to update the cache.

### Can I use react-window with TypeScript?

Yes. Install `@types/react-window` and type the row component:

```tsx
import { FixedSizeListProps } from "react-window";

const Row: FixedSizeListProps["children"] = ({ index, style }) => (
  <div style={style}>Item {index}</div>
);
```

### How do I make the list responsive to container width?

Use a `ResizeObserver` to track the container width and pass it to the list:

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

### Does react-window work with server-side rendering?

No. react-window relies on browser APIs for scrolling and measurement. For SSR, render a fallback list and replace it with the virtualized list on the client.
