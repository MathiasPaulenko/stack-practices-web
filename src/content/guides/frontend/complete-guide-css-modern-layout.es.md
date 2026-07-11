---
contentType: guides
slug: complete-guide-css-modern-layout
title: "Guía Completa de CSS Modern Layout: Grid, Flexbox, Container Queries"
description: "Dominá modern CSS layout: CSS Grid, Flexbox, container queries, subgrid, logical properties y responsive design patterns sin media queries."
metaDescription: "Dominá modern CSS layout: CSS Grid, Flexbox, container queries, subgrid, logical properties y responsive design patterns sin media queries para UIs flexibles."
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
  metaDescription: "Dominá modern CSS layout: CSS Grid, Flexbox, container queries, subgrid, logical properties y responsive design patterns sin media queries para UIs flexibles."
  keywords:
    - css grid
    - flexbox
    - container queries
    - subgrid
    - responsive design
    - css layout
    - logical properties
---

## Introducción

Modern CSS provee layout tools que hacen media-query-heavy stylesheets largely innecesarios. CSS Grid maneja two-dimensional layouts. Flexbox maneja one-dimensional distribution. Container queries dejan a los components responder al size de su parent en vez del viewport. Subgrid permite a nested grids alinear con parent grid tracks. A continuación: practical patterns para cada uno, con real-world component examples.

## CSS Grid

### Grid básico

```css
/* 3-column grid con gaps */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* Responsive sin media queries */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
/* Columns automáticamente adjust: 1 column en mobile, 2 en tablet, 3+ en desktop */
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

/* Responsive: stack en mobile */
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
  align-items: start;    /* Items align al top de su row */
  justify-items: stretch; /* Items stretch para fill column width */
}

.center-grid {
  display: grid;
  place-items: center;    /* Shorthand para align-items + justify-items */
  min-height: 100vh;
}
```

### `span` y line-based placement

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

/* Sticky footer con flex */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.page__content { flex: 1; }
```

### Flex wrap y gap

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
.content    { flex: 1 1 auto; }   /* Grow para fill, shrink si needed */
.timestamp  { flex: 0 0 auto; }   /* Fixed width basado en content */
```

## Container Queries

```css
/* Definí un containment context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Component responde a su container, no al viewport */
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
<!-- El mismo card component adapta basado en dónde está placed -->
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
  /* cqi = 1% del container's inline size */
  /* Adapta font size al container width */
}

.widget-body {
  padding: 2cqb;  /* 2% del container's block size */
}
```

## Subgrid

```css
/* Parent grid define los tracks */
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* Child grid hereda parent tracks */
.product-card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}

/* Ahora todos los cards en la misma row tienen aligned headers, images y footers */
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

/* Logical properties (direction-aware, funciona con RTL) */
.new-way {
  margin-inline: 1rem;       /* left + right en LTR, right + left en RTL */
  padding-block: 0.5rem;     /* top + bottom */
  text-align: start;         /* left en LTR, right en RTL */
  border-inline-start: 1px solid #ccc;
}

/* Logical sizing */
.sidebar {
  inline-size: 250px;        /* width en LTR */
  block-size: 100vh;         /* height */
  max-inline-size: 100%;     /* max-width */
}
```

## Responsive Patterns Sin Media Queries

### Fluid typography

```css
/* clamp() para fluid font sizes */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
  /* Min 1.5rem, scales con viewport, max 3rem */
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
/* Cards wrap automáticamente. min() previene overflow en very small screens */
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

### Card con container queries

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

### Sticky sidebar con scrollable main

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

- Usá Grid para 2D layouts (rows + columns), Flexbox para 1D (row OR column)
- Usá `auto-fit` con `minmax()` para responsive grids sin media queries
- Usá container queries para component-level responsiveness — los components deberían adaptar a su container, no al viewport
- Usá logical properties (`margin-inline`, `padding-block`) para RTL support
- Usá `gap` en vez de margins para spacing entre flex/grid items — cleaner y no collapse
- Usá `clamp()` para fluid typography — no media queries needed
- Usá `subgrid` cuando nested grids necesitan alinear con parent tracks
- Usá `aspect-ratio` en vez de padding hacks para video embeds
- Usá `min()` inside `minmax()` para prevenir grid overflow en small screens
- Testeá con browser DevTools device emulation — verificá layouts a 320px, 768px, 1024px, 1440px

## Common Mistakes

- **Usar Flexbox para 2D layouts**: Flexbox wrappea items independently. Grid alinea rows y columns together.
- **Fixed pixel widths**: break en different screen sizes. Usá `fr`, `auto`, `minmax()`, o percentages.
- **Media queries para todo**: container queries y `auto-fit` grids eliminan most breakpoints.
- **Olvidar `gap`**: usar margins para spacing entre items causa double-spacing en edges. `gap` solo aplica entre items.
- **No usar `min()` en `minmax()`**: `minmax(280px, 1fr)` overflow en screens < 280px. Usá `minmax(min(100%, 280px), 1fr)`.

## FAQ

### Grid vs. Flexbox — ¿cuándo usar cuál?

Usá Grid cuando necesitás control sobre rows y columns (page layouts, card grids, dashboards). Usá Flexbox cuando necesitás one-dimensional distribution (toolbars, nav bars, tag lists, centering).

### ¿Qué son container queries?

CSS queries que aplican styles basados en el size de un parent container, no del viewport. Un card component puede render diferente en un narrow sidebar vs. un wide main content area, sin saber dónde está placed.

### ¿Qué es subgrid?

Un CSS Grid feature que deja a un child grid heredar el parent grid's track definitions. Esto asegura que nested grids alinean sus rows o columns con el parent, que era previously impossible.

### ¿Qué son logical properties?

CSS properties que adaptan al writing direction. `margin-inline-start` es `margin-left` en LTR y `margin-right` en RTL. Eliminan la need de separate RTL stylesheets.

### ¿Cómo se diferencia `auto-fit` de `auto-fill`?

`auto-fit` collapsea empty tracks a zero width, stretchando remaining items. `auto-fill` mantiene empty tracks con su minimum width. Usá `auto-fit` cuando querés que items grow para fill el row, `auto-fill` cuando querés consistent item sizes.
