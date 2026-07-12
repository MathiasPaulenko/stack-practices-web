---






contentType: recipes
slug: css-container-queries-responsive
title: "Container Queries for Component Responsiveness"
description: "How to use CSS container queries for component-level responsive layouts that adapt to their container size instead of the viewport."
metaDescription: "Use CSS container queries for component-level responsive layouts. Components adapt to their container size, not the viewport, enabling true modularity."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - css
  - container-queries
  - responsive
  - layout
  - recipe
relatedResources:
  - /recipes/css-custom-properties-design-tokens
  - /recipes/css-dark-mode-prefers-color-scheme
  - /recipes/react-usememo-usecallback-performance
  - /recipes/react-virtual-list-react-window
  - /recipes/svelte-store-reactive-state
  - /recipes/vue-composition-api-fetch
  - /guides/complete-guide-accessibility-wcag
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use CSS container queries for component-level responsive layouts. Components adapt to their container size, not the viewport, enabling true modularity."
  keywords:
    - frontend
    - css
    - container-queries
    - responsive
    - layout
    - recipe






---

## Overview

Container queries let a component adapt its layout based on its parent container's size, not the viewport. This means a card component can switch from horizontal to vertical layout when its sidebar shrinks, regardless of the screen size. Media queries only respond to the viewport — container queries respond to the component's actual available space, making components truly reusable across different layouts.

## When to Use

- Reusable components placed in different layout contexts (sidebar, main content, grid cell)
- Cards that switch between horizontal and vertical layouts depending on available width
- Navigation that collapses to a hamburger menu when its container is narrow, not the viewport
- Dashboard widgets that resize within a drag-and-drop grid
- Embeddable widgets that need to adapt to their host container

## When NOT to Use

- Full-page layouts — media queries are still appropriate for page-level responsive design
- Fixed-width components — if the component always has the same width, container queries add no value
- Legacy browser support — container queries require modern browsers (Chrome 105+, Safari 16+, Firefox 110+)

## Solution

### Basic container query

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }
}
```

When the `.card-container` is at least 400px wide, the card switches to horizontal layout. Below 400px, it stays vertical.

### Named containers

```css
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

.main-content {
  container-type: inline-size;
  container-name: main;
}

@container sidebar (min-width: 300px) {
  .widget {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@container main (min-width: 600px) {
  .widget {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
  }
}
```

Named containers let you target specific containers when components are nested.

### Container query units

```css
.panel {
  container-type: inline-size;
}

.panel-title {
  font-size: clamp(1rem, 5cqi, 2rem);
  padding: 2cqb;
  margin-bottom: 2cqh;
}
```

Container query units:
- `cqw` — 1% of container width
- `cqh` — 1% of container height
- `cqi` — 1% of container inline size
- `cqb` — 1% of container block size
- `cqmin` — 1% of container smaller dimension
- `cqmax` — 1% of container larger dimension

### Responsive card component

```css
.product-card-container {
  container-type: inline-size;
  padding: 1rem;
}

.product-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.product-card__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.product-card__title {
  font-size: 1rem;
}

@container (min-width: 350px) {
  .product-card {
    flex-direction: row;
    gap: 1rem;
  }

  .product-card__image {
    width: 150px;
    aspect-ratio: 1;
  }

  .product-card__title {
    font-size: 1.125rem;
  }
}

@container (min-width: 600px) {
  .product-card {
    flex-direction: column;
  }

  .product-card__image {
    width: 100%;
    aspect-ratio: 16 / 9;
  }

  .product-card__title {
    font-size: 1.25rem;
  }
}
```

### Navigation that adapts to container

```css
.nav-container {
  container-type: inline-size;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.nav__link {
  padding: 0.5rem 1rem;
}

@container (max-width: 500px) {
  .nav {
    flex-direction: column;
  }

  .nav__link {
    width: 100%;
    text-align: center;
  }
}
```

### Container queries with CSS Grid

```css
.grid-container {
  container-type: inline-size;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@container (min-width: 400px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

@container (min-width: 700px) {
  .grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@container (min-width: 1000px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Style container queries

```css
.theme-container {
  container-type: style;
}

@container style(--theme: dark) {
  .card {
    background: #1a1a2e;
    color: #e0e0e0;
  }
}

@container style(--theme: light) {
  .card {
    background: #ffffff;
    color: #1a1a2e;
  }
}
```

Set the theme with a custom property:

```html
<div class="theme-container" style="--theme: dark;">
  <div class="card">Content</div>
</div>
```

### Container queries in Tailwind CSS v4

```html
<div class="@container">
  <div class="card flex flex-col @md:flex-row @lg:flex-col">
    <img class="w-full @md:w-36 @lg:w-full" src="product.jpg" />
    <div class="@md:ml-4">
      <h3 class="text-base @md:text-lg @lg:text-xl">Product Title</h3>
    </div>
  </div>
</div>
```

Tailwind v4 generates container query variants with `@container` and breakpoint modifiers like `@md`, `@lg`.

## Variants

### Using container queries with React

```jsx
function ProductCard({ product }) {
  return (
    <div className="product-card-container">
      <div className="product-card">
        <img className="product-card__image" src={product.image} alt={product.name} />
        <div>
          <h3 className="product-card__title">{product.name}</h3>
          <p>${product.price}</p>
        </div>
      </div>
    </div>
  );
}

// Works in any layout context — sidebar, grid, full width
function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <ProductCard product={product} />
      </aside>
      <main className="content">
        <ProductCard product={product} />
      </main>
    </div>
  );
}
```

### Using container queries with Vue

```vue
<template>
  <div class="card-container">
    <div class="card">
      <img :src="product.image" :alt="product.name" />
      <div class="card-body">
        <h3>{{ product.name }}</h3>
        <p>{{ product.price }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
</style>
```

## Best Practices


- For a deeper guide, see [Complete Guide to CSS Grid and Flexbox](/guides/complete-guide-css-grid-and-flexbox/).

- Use `container-type: inline-size` for most cases — it responds to width, which is what you usually need
- Use named containers (`container-name`) when components are nested and you need to target a specific ancestor
- Set `container-type` on the parent wrapper, not the component itself — the component queries its container
- Use container query units (`cqi`, `cqw`) for fluid typography that scales with the container
- Combine with `clamp()` for min/max bounds: `font-size: clamp(1rem, 5cqi, 2rem)`
- Test components in different container sizes — don't assume the viewport size determines the component's space
- Use `@container (max-width: ...)` for mobile-first patterns that adapt when space shrinks

## Common Mistakes

- **Setting `container-type` on the component instead of its parent**: the component can't query its own size — it queries its container.
- **Using `container-type: size` without setting a height**: `size` requires both dimensions to be defined. Use `inline-size` for width-only queries.
- **Forgetting that container queries don't replace media queries**: use media queries for page layout, container queries for component layout.
- **Over-nesting containers**: each `container-type` creates a containment context. Deep nesting can cause unexpected behavior.
- **Not testing in narrow containers**: a component that looks fine full-width might break in a 200px sidebar.

## FAQ

### What browser support do container queries have?

Container queries are supported in Chrome 105+, Safari 16+, Firefox 110+, and Edge 105+. This covers 93%+ of global users as of 2026. For older browsers, use `@supports` to provide a media-query fallback.

### How do container queries differ from media queries?

Media queries respond to the viewport size. Container queries respond to the component's container size. A component in a 300px sidebar on a 1920px screen sees a 300px container, not 1920px.

### Can I use container queries with CSS frameworks?

Yes. Tailwind CSS v4 has built-in container query support with `@container` and `@sm`, `@md`, `@lg` variants. Other frameworks may require custom CSS.

### What is the difference between `container-type: inline-size` and `container-type: size`?

`inline-size` establishes containment on the inline axis (width in horizontal writing modes). `size` establishes containment on both axes. Use `inline-size` for most cases — `size` requires the container to have a defined height.

### How do I provide a fallback for older browsers?

```css
.card { flex-direction: column; }

@supports (container-type: inline-size) {
  .card-container { container-type: inline-size; }
  @container (min-width: 400px) {
    .card { flex-direction: row; }
  }
}

/* Fallback for browsers without container queries */
@media (min-width: 768px) {
  .card { flex-direction: row; }
}
```
