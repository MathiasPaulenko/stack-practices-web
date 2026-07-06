---
contentType: guides
slug: complete-guide-css-grid-and-flexbox
title: "Guía Completa de CSS Grid y Flexbox"
description: "Dominar modern CSS layout con Grid y Flexbox. Cubre grid templates, areas, subgrid, responsive layouts, flexbox alignment, wrapping, gap, container queries y cuando usar Grid vs Flexbox con ejemplos practicos y patterns."
metaDescription: "Master CSS layout. Covers Grid templates, areas, subgrid, responsive layouts, Flexbox alignment, wrapping, gap, container queries, Grid vs Flexbox."
difficulty: intermediate
topics:
  - frontend
  - design
tags:
  - css
  - frontend
  - guia
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

## Introducción

CSS Grid y Flexbox son los dos layout systems que reemplazaron floats, tables, y positioning hacks. Grid handlea two-dimensional layouts (rows y columns). Flexbox handlea one-dimensional layouts (ya sea rows o columns). Lo siguiente es una guia practica para ambos con practical patterns.

## Cuando usar Grid vs Flexbox

```text
Usa CSS Grid cuando:
  - Necesitas tanto rows como columns (2D layout)
  - El layout tiene un defined structure
  - Necesitas alinear items en ambas direcciones
  - Queres gap entre items sin margins
  - Necesitas areas con named regions

Usa Flexbox cuando:
  - Necesitas un single row o column (1D layout)
  - Items deberian grow o shrink basado en content
  - Necesitas alinear items along un axis
  - Necesitas reorder items sin cambiar HTML
  - Necesitas dynamic spacing entre items

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

/* Responsive sin media queries */
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

/* Responsive: stack en mobile */
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
  grid-row: span 3;  /* Span 3 rows del parent grid */
}

/* Example: aligned card titles y prices */
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
/* Todos los titles alinean across cards, todos los images alinean, todos los prices alinean */
```

### Grid Alignment

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  
  /* Align items along el block (row) axis */
  align-items: start | center | end | stretch;
  
  /* Align items along el inline (column) axis */
  justify-items: start | center | end | stretch;
  
  /* Align el entire grid dentro del container */
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

/* Card con image, content, y action */
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
  /* Grow: cuanto grow relative a other items */
  flex-grow: 0;  /* Default */
  
  /* Shrink: cuanto shrink relative a other items */
  flex-shrink: 1;  /* Default */
  
  /* Basis: initial size antes de growing/shrinking */
  flex-basis: auto;  /* Default — size basado en content */
  
  /* Shorthand: flex: grow shrink basis */
  flex: 1;          /* = flex: 1 1 0% — equal distribution */
  flex: 2;          /* = flex: 2 1 0% — twice el space */
  flex: auto;       /* = flex: 1 1 auto — grow basado en content */
  flex: none;       /* = flex: 0 0 auto — no grow, no shrink */
  
  /* Order: reorder sin cambiar HTML */
  order: -1;  /* Move al front */
  order: 1;   /* Move al back */
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

/* Sticky footer con flex */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-content {
  flex: 1;
}

/* Input con button */
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
/* Container queries — responsive basado en parent size, no viewport */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* Styles apply basado en el container's width, no el viewport */
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
  height: 50cqh;  /* 50% del container height */
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

/* Sidebar layout que colapsa en mobile */
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
/* Gap funciona en tanto Grid como Flexbox */
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
  /* column-gap: 1rem; */
}

/* Multi-column gap */
.flex-wrap-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;  /* row-gap column-gap */
}
```

## Preguntas Frecuentes

### ¿Deberia usar Grid o Flexbox para mi layout?

Usa Grid cuando necesitas un two-dimensional layout con tanto rows como columns — page layouts, card grids, dashboards. Usa Flexbox cuando necesitas un one-dimensional layout — navigation bars, button groups, card content. Podes nestearlos: usa Grid para el page structure y Flexbox dentro de cada grid cell para el content layout. Ambos soportan `gap`, alignment, y responsive behavior.

### ¿Qué es subgrid y que browsers lo soportan?

Subgrid permite que un grid item herede el parent grid's tracks (rows o columns). Esto enables aligned card grids donde titles, images, y prices se alinean across cards regardless de content length. Subgrid es supported en todos los modern browsers as of 2024 (Chrome 117+, Firefox 71+, Safari 16+). Usa `grid-template-rows: subgrid` o `grid-template-columns: subgrid` en un grid item.

### ¿Cómo diferieren container queries de media queries?

Media queries responden al viewport size — el entire browser window. Container queries responden al size de un parent container. Esto significa que un card component puede adaptar su layout basado en el space available en su parent, no el entire screen. Esto hace components truly reusable — el mismo card se ve diferente en un sidebar (narrow) vs un main content area (wide) sin media queries.

### ¿Cómo centro algo con CSS?

Para centering en un flex container: `display: flex; align-items: center; justify-content: center;`. Para centering en un grid container: `display: grid; place-items: center;`. Para centering un element en la page: usa grid con `min-height: 100vh` y `place-items: center`. Evita `position: absolute` con transforms para centering — remove el element del document flow y causa layout issues.

### ¿Cuál es la diferencia entre flex: 1 y flex: auto?

`flex: 1` significa `flex-grow: 1, flex-shrink: 1, flex-basis: 0%` — todos los items comparten space equally regardless de content size. `flex: auto` significa `flex-grow: 1, flex-shrink: 1, flex-basis: auto` — items grow para fill space pero empiezan con su content size como basis. Usa `flex: 1` cuando queres equal-sized items. Usa `flex: auto` cuando queres items que sean al menos tan wide como su content pero compartan extra space.

### ¿Cómo creo un responsive grid sin media queries?

Usa `grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr))`. El `auto-fill` keyword crea tantas columns como fiteen. El `minmax(min(100%, 280px), 1fr)` setea cada column a al menos 280px (o 100% en very small screens) y at most 1fr. El `min(100%, 280px)` prevent overflow en screens mas narrow que 280px. Esto crea un grid que automaticamente adjusts column count basado en available space.
