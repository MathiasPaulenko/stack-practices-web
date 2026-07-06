---
contentType: guides
slug: complete-guide-css-modern-layout
title: "Complete Guide to CSS Modern Layout: Grid, Flexbox, Container Queries"
description: "Master modern CSS layout: CSS Grid, Flexbox, container queries, subgrid, logical properties, and responsive design patterns without media queries."
metaDescription: "Master modern CSS layout: CSS Grid, Flexbox, container queries, subgrid, logical properties, and responsive design patterns without media queries for flexible UIs."
difficulty: intermediate
topics:
  - frontend
tags:
  - guide
  - css
  - grid
  - flexbox
  - container-queries
  - responsive-design
  - frontend
relatedResources:
  - /guides/frontend/complete-guide-accessibility-wcag
  - /recipes/frontend/css-container-queries-responsive
  - /recipes/frontend/css-dark-mode-prefers-color-scheme
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master modern CSS layout: CSS Grid, Flexbox, container queries, subgrid, logical properties, and responsive design patterns without media queries for flexible UIs."
  keywords:
    - css grid
    - flexbox
    - container queries
    - subgrid
    - responsive design
    - css layout
    - logical properties
---

## Introduction

Modern CSS provides layout tools that make media-query-heavy stylesheets largely unnecessary. CSS Grid handles two-dimensional layouts. Flexbox handles one-dimensional distribution. Container queries let components respond to their parent's size instead of the viewport. Subgrid allows nested grids to align with parent grid tracks. This guide walks through practical patterns for each, with real-world component examples.

## CSS Grid

### Basic grid

```css
/* 3-column grid with gaps */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* Responsive without media queries */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
/* Columns automatically adjust: 1 column on mobile, 2 on tablet, 3+ on desktop */
```

### Named grid areas

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "sidebar footer footer";
  grid-template-columns: 250px 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  gap: 1rem;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .layout {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
    grid-template-columns: 1fr;
  }
}
```

### Grid alignment

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  align-items: start;    /* Items align to top of their row */
  justify-items: stretch; /* Items stretch to fill column width */
}

.center-grid {
  display: grid;
  place-items: center;    /* Shorthand for align-items + justify-items */
  min-height: 100vh;
}
```

### `span` and line-based placement

```css
.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 200px);
  gap: 1rem;
}

.featured    { grid-column: span 2; grid-row: span 2; }
.wide        { grid-column: 1 / -1; }  /* Full width */
.sidebar-item { grid-column: 4; grid-row: 1 / 4; }  /* Right column, full height */
```

## Flexbox

### One-dimensional distribution

```css
/* Horizontal distribution */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
}

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
.page__content { flex: 1; }
```

### Flex wrap and gap

```css
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: #e0f2fe;
  border-radius: 9999px;
  font-size: 0.875rem;
}
```

### Flex grow/shrink ratios

```css
.message-layout {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.avatar     { flex: 0 0 48px; }  /* Fixed width, no grow/shrink */
.content    { flex: 1 1 auto; }   /* Grow to fill, shrink if needed */
.timestamp  { flex: 0 0 auto; }   /* Fixed width based on content */
```

## Container Queries

```css
/* Define a containment context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Component responds to its container, not the viewport */
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
```

```html
<!-- The same card component adapts based on where it's placed -->
<div class="sidebar" style="container-type: inline-size;">
  <div class="card">...</div>  <!-- Narrow: stacked layout -->
</div>

<div class="main-content" style="container-type: inline-size;">
  <div class="card">...</div>  <!-- Wide: side-by-side layout -->
</div>
```

### Container query units

```css
.sidebar-widget {
  container-type: inline-size;
}

.widget-title {
  font-size: clamp(1rem, 5cqi, 1.5rem);
  /* cqi = 1% of container's inline size */
  /* Adapts font size to container width */
}

.widget-body {
  padding: 2cqb;  /* 2% of container's block size */
}
```

## Subgrid

```css
/* Parent grid defines the tracks */
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* Child grid inherits parent tracks */
.product-card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}

/* Now all cards in the same row have aligned headers, images, and footers */
.product-image   { grid-row: 1; }
.product-title   { grid-row: 2; }
.product-actions { grid-row: 3; }
```

## Logical Properties

```css
/* Physical properties (direction-specific) */
.old-way {
  margin-left: 1rem;
  margin-right: 1rem;
  padding-top: 0.5rem;
  text-align: left;
  border-left: 1px solid #ccc;
}

/* Logical properties (direction-aware, works with RTL) */
.new-way {
  margin-inline: 1rem;       /* left + right in LTR, right + left in RTL */
  padding-block: 0.5rem;     /* top + bottom */
  text-align: start;         /* left in LTR, right in RTL */
  border-inline-start: 1px solid #ccc;
}

/* Logical sizing */
.sidebar {
  inline-size: 250px;        /* width in LTR */
  block-size: 100vh;         /* height */
  max-inline-size: 100%;     /* max-width */
}
```

## Responsive Patterns Without Media Queries

### Fluid typography

```css
/* clamp() for fluid font sizes */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
  /* Min 1.5rem, scales with viewport, max 3rem */
}

p {
  font-size: clamp(1rem, 2.5vw, 1.125rem);
  line-height: 1.6;
}
```

### Auto-fit grid (no breakpoints)

```css
.responsive-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 1.5rem;
}
/* Cards wrap automatically. min() prevents overflow on very small screens */
```

### Aspect ratio

```css
.video-embed {
  aspect-ratio: 16 / 9;
  width: 100%;
  background: #000;
}

.avatar-square {
  aspect-ratio: 1;
  width: 48px;
  object-fit: cover;
}
```

## Real-World Components

### Holy Grail layout

```css
.holy-grail {
  display: grid;
  grid-template:
    "header header header" auto
    "nav    main   aside"  1fr
    "footer footer footer" auto
    / 200px 1fr 200px;
  min-height: 100vh;
  gap: 1rem;
}

.holy-grail > header { grid-area: header; }
.holy-grail > nav    { grid-area: nav; }
.holy-grail > main   { grid-area: main; }
.holy-grail > aside  { grid-area: aside; }
.holy-grail > footer { grid-area: footer; }

@media (max-width: 768px) {
  .holy-grail {
    grid-template:
      "header" auto
      "main"   1fr
      "nav"    auto
      "aside"  auto
      "footer" auto
      / 1fr;
  }
}
```

### Card with container queries

```css
.product-listing {
  container-type: inline-size;
  display: grid;
  gap: 1rem;
}

@container (min-width: 500px) {
  .product {
    display: grid;
    grid-template-columns: 150px 1fr auto;
    align-items: center;
    gap: 1rem;
  }
  .product__image { grid-column: 1; }
  .product__info  { grid-column: 2; }
  .product__price { grid-column: 3; }
}

@container (max-width: 499px) {
  .product {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}
```

### Sticky sidebar with scrollable main

```css
.app-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100vh;
}

.sidebar {
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
}

.main-content {
  overflow-y: auto;
  padding: 2rem;
}
```

## Best Practices

- Use Grid for 2D layouts (rows + columns), Flexbox for 1D (row OR column)
- Use `auto-fit` with `minmax()` for responsive grids without media queries
- Use container queries for component-level responsiveness — components should adapt to their container, not the viewport
- Use logical properties (`margin-inline`, `padding-block`) for RTL support
- Use `gap` instead of margins for spacing between flex/grid items — cleaner and doesn't collapse
- Use `clamp()` for fluid typography — no media queries needed
- Use `subgrid` when nested grids need to align with parent tracks
- Use `aspect-ratio` instead of padding hacks for video embeds
- Use `min()` inside `minmax()` to prevent grid overflow on small screens
- Test with browser DevTools device emulation — verify layouts at 320px, 768px, 1024px, 1440px

## Common Mistakes

- **Using Flexbox for 2D layouts**: Flexbox wraps items independently. Grid aligns rows and columns together.
- **Fixed pixel widths**: breaks on different screen sizes. Use `fr`, `auto`, `minmax()`, or percentages.
- **Media queries for everything**: container queries and `auto-fit` grids eliminate most breakpoints.
- **Forgetting `gap`**: using margins for spacing between items causes double-spacing at edges. `gap` only applies between items.
- **Not using `min()` in `minmax()`**: `minmax(280px, 1fr)` overflows on screens < 280px. Use `minmax(min(100%, 280px), 1fr)`.

## FAQ

### Grid vs. Flexbox — when to use which?

Use Grid when you need control over both rows and columns (page layouts, card grids, dashboards). Use Flexbox when you need one-dimensional distribution (toolbars, nav bars, tag lists, centering).

### What are container queries?

CSS queries that apply styles based on the size of a parent container, not the viewport. A card component can render differently in a narrow sidebar vs. a wide main content area, without knowing where it's placed.

### What is subgrid?

A CSS Grid feature that lets a child grid inherit the parent grid's track definitions. This ensures nested grids align their rows or columns with the parent, which was previously impossible.

### What are logical properties?

CSS properties that adapt to the writing direction. `margin-inline-start` is `margin-left` in LTR and `margin-right` in RTL. They eliminate the need for separate RTL stylesheets.

### How does `auto-fit` differ from `auto-fill`?

`auto-fit` collapses empty tracks to zero width, stretching remaining items. `auto-fill` keeps empty tracks with their minimum width. Use `auto-fit` when you want items to grow to fill the row, `auto-fill` when you want consistent item sizes.
