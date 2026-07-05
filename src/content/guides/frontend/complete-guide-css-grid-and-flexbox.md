---
contentType: guides
slug: complete-guide-css-grid-and-flexbox
title: "Complete Guide to CSS Grid and Flexbox"
description: "Master modern CSS layout with Grid and Flexbox. Covers grid templates, areas, subgrid, responsive layouts, flexbox alignment, wrapping, gap, container queries, and when to use Grid vs Flexbox with practical examples and patterns."
metaDescription: "Master CSS layout. Covers Grid templates, areas, subgrid, responsive layouts, Flexbox alignment, wrapping, gap, container queries, Grid vs Flexbox."
difficulty: intermediate
topics:
  - frontend
  - design
tags:
  - css
  - frontend
  - guide
  - css-grid
  - flexbox
  - responsive-design
  - layout
  - container-queries
relatedResources:
  - /guides/frontend/complete-guide-react-19-features
  - /guides/frontend/complete-guide-web-performance-core-web-vitals
  - /guides/frontend/complete-guide-bundle-size-optimization
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master CSS layout. Covers Grid templates, areas, subgrid, responsive layouts, Flexbox alignment, wrapping, gap, container queries, Grid vs Flexbox."
  keywords:
    - css grid
    - flexbox
    - css layout
    - responsive design
    - subgrid
    - container queries
    - css grid areas
    - flexbox alignment
---

## Introduction

CSS Grid and Flexbox are the two layout systems that replaced floats, tables, and positioning hacks. Grid handles two-dimensional layouts (rows and columns). Flexbox handles one-dimensional layouts (either rows or columns). This guide covers both with practical patterns.

## When to Use Grid vs Flexbox

```text
Use CSS Grid when:
  - You need both rows and columns (2D layout)
  - The layout has a defined structure
  - You need to align items in both directions
  - You want gap between items without margins
  - You need areas with named regions

Use Flexbox when:
  - You need a single row or column (1D layout)
  - Items should grow or shrink based on content
  - You need to align items along one axis
  - You need to reorder items without changing HTML
  - You need dynamic spacing between items

Rule of thumb:
  Grid = page layout, card grids, dashboards
  Flexbox = navigation bars, toolbars, card content, button groups
```

## CSS Grid

### Basic Grid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* Responsive without media queries */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Fixed sidebar + fluid content */
.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
}
```

### Grid Template Areas

```css
.page-layout {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "sidebar main   aside"
    "footer  footer  footer";
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  gap: 1rem;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.aside   { grid-area: aside; }
.footer  { grid-area: footer; }

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .page-layout {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "aside"
      "footer";
    grid-template-columns: 1fr;
  }
}
```

```html
<div class="page-layout">
  <header class="header">Header</header>
  <nav class="sidebar">Sidebar</nav>
  <main class="main">Main content</main>
  <aside class="aside">Aside</aside>
  <footer class="footer">Footer</footer>
</div>
```

### Subgrid

```css
/* Subgrid lets children inherit parent grid tracks */
.card-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;  /* Span 3 rows of the parent grid */
}

/* Example: aligned card titles and prices */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.product-card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  gap: 0;
}

.product-card .title { grid-row: 1; }
.product-card .image { grid-row: 2; }
.product-card .price { grid-row: 3; }
/* All titles align across cards, all images align, all prices align */
```

### Grid Alignment

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  
  /* Align items along the block (row) axis */
  align-items: start | center | end | stretch;
  
  /* Align items along the inline (column) axis */
  justify-items: start | center | end | stretch;
  
  /* Align the entire grid within the container */
  align-content: start | center | end | space-between | space-around;
  justify-content: start | center | end | space-between | space-around;
}

/* Individual item alignment */
.grid-item {
  align-self: center;
  justify-self: end;
}
```

### Common Grid Patterns

```css
/* Holy Grail Layout */
.holy-grail {
  display: grid;
  grid-template:
    "header header header" auto
    "nav    main   aside"  1fr
    "footer footer footer" auto
    / 200px 1fr 200px;
  min-height: 100vh;
}

/* Masonry-like layout (CSS Grid Masonry — experimental) */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-template-rows: masonry;  /* Experimental */
  gap: 1rem;
}

/* Center anything */
.center-anything {
  display: grid;
  place-items: center;
  min-height: 100vh;
}

/* Sticky header + scrollable content */
.app-shell {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-content {
  overflow-y: auto;
}
```

## Flexbox

### Basic Flexbox

```css
/* Horizontal navigation bar */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
  list-style: none;
}

/* Card with image, content, and action */
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.card-content {
  flex: 1;  /* Take remaining space */
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
```

### Flexbox Alignment

```css
.flex-container {
  display: flex;
  
  /* Main axis alignment */
  justify-content: flex-start | flex-end | center | space-between | space-around | space-evenly;
  
  /* Cross axis alignment */
  align-items: stretch | flex-start | center | flex-end | baseline;
  
  /* Multi-line alignment (when wrapping) */
  align-content: flex-start | center | flex-end | space-between | space-around;
  
  /* Direction */
  flex-direction: row | row-reverse | column | column-reverse;
  
  /* Wrapping */
  flex-wrap: nowrap | wrap | wrap-reverse;
  
  /* Gap */
  gap: 1rem;
}

/* Individual item alignment */
.flex-item {
  align-self: flex-start | center | flex-end | stretch | baseline;
}
```

### Flex Item Properties

```css
.flex-item {
  /* Grow: how much to grow relative to other items */
  flex-grow: 0;  /* Default */
  
  /* Shrink: how much to shrink relative to other items */
  flex-shrink: 1;  /* Default */
  
  /* Basis: initial size before growing/shrinking */
  flex-basis: auto;  /* Default — size based on content */
  
  /* Shorthand: flex: grow shrink basis */
  flex: 1;          /* = flex: 1 1 0% — equal distribution */
  flex: 2;          /* = flex: 2 1 0% — twice the space */
  flex: auto;       /* = flex: 1 1 auto — grow based on content */
  flex: none;       /* = flex: 0 0 auto — no grow, no shrink */
  
  /* Order: reorder without changing HTML */
  order: -1;  /* Move to front */
  order: 1;   /* Move to back */
}
```

### Common Flexbox Patterns

```css
/* Center anything */
.center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

/* Sticky footer with flex */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-content {
  flex: 1;
}

/* Input with button */
.input-group {
  display: flex;
  align-items: stretch;
}

.input-group input {
  flex: 1;
  border-radius: 4px 0 0 4px;
}

.input-group button {
  border-radius: 0 4px 4px 0;
}

/* Media object (avatar + content) */
.media {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.media-image {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.media-body {
  flex: 1;
}

/* Responsive wrap */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  flex: 0 0 auto;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: #e0e0e0;
}
```

## Container Queries

```css
/* Container queries — responsive based on parent size, not viewport */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* Styles apply based on the container's width, not the viewport */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 1rem;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}

/* Container query units */
.card-title {
  font-size: clamp(1rem, 5cqi, 1.5rem);  /* cqi = container query inline */
}

.card-image {
  width: 100%;
  height: 50cqh;  /* 50% of container height */
}
```

## Responsive Design Patterns

```css
/* Mobile-first grid */
.responsive-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .responsive-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Auto-fill grid — no media queries needed */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1.5rem;
}

/* Sidebar layout that collapses on mobile */
.sidebar-layout {
  display: grid;
  grid-template-columns: 1fr;
}

@container (min-width: 768px) {
  .sidebar-layout {
    grid-template-columns: 240px 1fr;
  }
}
```

## Gap Property

```css
/* Gap works in both Grid and Flexbox */
.grid-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  /* row-gap: 1rem; */
  /* column-gap: 0.5rem; */
}

.flex-layout {
  display: flex;
  gap: 1rem;
  /* row-gap: 0.5rem; */
  /* column-gap: 1rem; }
}

/* Multi-column gap */
.flex-wrap-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;  /* row-gap column-gap */
}
```

## FAQ

### Should I use Grid or Flexbox for my layout?

Use Grid when you need a two-dimensional layout with both rows and columns — page layouts, card grids, dashboards. Use Flexbox when you need a one-dimensional layout — navigation bars, button groups, card content. You can nest them: use Grid for the page structure and Flexbox inside each grid cell for the content layout. Both support `gap`, alignment, and responsive behavior.

### What is subgrid and which browsers support it?

Subgrid allows a grid item to inherit the parent grid's tracks (rows or columns). This enables aligned card grids where titles, images, and prices line up across cards regardless of content length. Subgrid is supported in all modern browsers as of 2024 (Chrome 117+, Firefox 71+, Safari 16+). Use `grid-template-rows: subgrid` or `grid-template-columns: subgrid` on a grid item.

### How do container queries differ from media queries?

Media queries respond to the viewport size — the entire browser window. Container queries respond to the size of a parent container. This means a card component can adapt its layout based on the space available in its parent, not the entire screen. This makes components truly reusable — the same card looks different in a sidebar (narrow) vs a main content area (wide) without media queries.

### How do I center something with CSS?

For centering in a flex container: `display: flex; align-items: center; justify-content: center;`. For centering in a grid container: `display: grid; place-items: center;`. For centering an element on the page: use grid with `min-height: 100vh` and `place-items: center`. Avoid `position: absolute` with transforms for centering — it removes the element from the document flow and causes layout issues.

### What is the difference between flex: 1 and flex: auto?

`flex: 1` means `flex-grow: 1, flex-shrink: 1, flex-basis: 0%` — all items share space equally regardless of content size. `flex: auto` means `flex-grow: 1, flex-shrink: 1, flex-basis: auto` — items grow to fill space but start with their content size as the basis. Use `flex: 1` when you want equal-sized items. Use `flex: auto` when you want items to be at least as wide as their content but share extra space.

### How do I create a responsive grid without media queries?

Use `grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr))`. The `auto-fill` keyword creates as many columns as fit. The `minmax(min(100%, 280px), 1fr)` sets each column to at least 280px (or 100% on very small screens) and at most 1fr. The `min(100%, 280px)` prevents overflow on screens narrower than 280px. This creates a grid that automatically adjusts column count based on available space.
