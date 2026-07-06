---
contentType: guides
slug: complete-guide-mobile-responsive-design
title: "Complete Guide to Mobile Responsive Design"
description: "Build responsive layouts that work on every device. Covers CSS Grid, Flexbox, container queries, fluid typography, mobile-first breakpoints, and responsive images."
metaDescription: "Complete guide to mobile responsive design. Master CSS Grid, Flexbox, container queries, fluid typography, mobile-first breakpoints and responsive images."
difficulty: intermediate
topics:
  - frontend
  - design
tags:
  - responsive-design
  - css-grid
  - flexbox
  - mobile-first
  - container-queries
  - fluid-typography
  - guide
  - frontend
relatedResources:
  - /guides/frontend/web-components-guide
  - /guides/frontend/complete-guide-react-performance-optimization
  - /guides/frontend/accessibility-wcag-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to mobile responsive design. Master CSS Grid, Flexbox, container queries, fluid typography, mobile-first breakpoints and responsive images."
  keywords:
    - responsive design
    - css grid
    - flexbox
    - mobile first
    - container queries
    - fluid typography
    - responsive images
---

# Complete Guide to Mobile Responsive Design

## Introduction

Responsive design means building layouts that adapt to any screen size — from 320px phones to 4K monitors. Modern CSS gives us Grid, Flexbox, container queries, and fluid typography to build responsive interfaces without JavaScript. The following walks through mobile-first strategy, CSS Grid layouts, Flexbox patterns, container queries, fluid typography, responsive images, and testing strategies.

## Mobile-First Strategy

Start with the smallest screen and progressively enhance for larger screens. This forces you to prioritize content and keeps CSS lean.

```css
/* Base styles — mobile first */
.card {
  padding: 1rem;
  font-size: 0.875rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .card {
    padding: 1.5rem;
    font-size: 1rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .card {
    padding: 2rem;
    font-size: 1.125rem;
  }
}
```

### Common breakpoints

```css
/* Tailwind-inspired breakpoints */
/* sm:  640px */
/* md:  768px */
/* lg:  1024px */
/* xl:  1280px */
/* 2xl: 1536px */

/* Use min-width (mobile-first), not max-width (desktop-first) */
```

## CSS Grid Layouts

### Basic grid

```css
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Auto-fit grid (no media queries needed)

```css
.auto-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
```

### Holy grail layout

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "nav    main   aside"
    "footer footer footer";
  grid-template-columns: 200px 1fr 250px;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .layout {
    grid-template-areas:
      "header"
      "main"
      "nav"
      "aside"
      "footer";
    grid-template-columns: 1fr;
  }
}

.header { grid-area: header; }
.nav    { grid-area: nav; }
.main   { grid-area: main; }
.aside  { grid-area: aside; }
.footer { grid-area: footer; }
```

### Grid with named lines

```css
.grid {
  display: grid;
  grid-template-columns: [sidebar-start] 250px [sidebar-end content-start] 1fr [content-end];
  grid-template-rows: [header-start] 80px [header-end body-start] 1fr [body-end];
}

.header  { grid-column: sidebar-start / content-end; grid-row: header-start / header-end; }
.sidebar { grid-column: sidebar-start / sidebar-end; grid-row: body-start / body-end; }
.content { grid-column: content-start / content-end; grid-row: body-start / body-end; }
```

## Flexbox Patterns

### Centering

```css
.center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
```

### Sticky footer

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}
```

### Navigation bar

```css
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .nav-menu-toggle {
    display: block;
  }
}
```

### Card with flexible content

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-content {
  flex: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

## Container Queries

Container queries let components respond to their container size, not the viewport. This enables true component-level responsiveness.

```css
/* Define a containment context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Query the container size */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 1.5rem;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}
```

### Container query units

```css
.sidebar {
  /* cqw = container query width */
  font-size: clamp(0.875rem, 3cqw, 1.25rem);
  padding: 2cqi;
}
```

## Fluid Typography

### clamp()

```css
/* min, preferred (viewport-relative), max */
h1 {
  font-size: clamp(1.5rem, 5vw, 3.5rem);
}

h2 {
  font-size: clamp(1.25rem, 4vw, 2.5rem);
}

p {
  font-size: clamp(1rem, 2.5vw, 1.125rem);
}
```

### Fluid spacing

```css
.section {
  padding: clamp(1rem, 5vw, 4rem);
  margin-bottom: clamp(1.5rem, 4vw, 3rem);
}
```

## Responsive Images

### srcset and sizes

```html
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w, image-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="Description"
  loading="lazy"
  decoding="async"
/>
```

### picture element (art direction)

```html
<picture>
  <source media="(max-width: 600px)" srcset="mobile.jpg" />
  <source media="(max-width: 1200px)" srcset="tablet.jpg" />
  <img src="desktop.jpg" alt="Description" />
</picture>
```

### Aspect ratio

```css
.image-container {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

## Responsive Tables

```css
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

/* Card layout on mobile */
@media (max-width: 640px) {
  table, thead, tbody, th, td, tr {
    display: block;
  }

  thead {
    display: none;
  }

  tr {
    margin-bottom: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.75rem;
  }

  td {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
  }

  td::before {
    content: attr(data-label);
    font-weight: 600;
    margin-right: 1rem;
  }
}
```

## Testing

### Browser DevTools

- Chrome DevTools: Device Mode (Ctrl+Shift+M)
- Firefox: Responsive Design Mode (Ctrl+Shift+M)
- Safari: Responsive Design Mode (Cmd+Ctrl+R)

### CSS for testing

```css
/* Debug grid lines */
* {
  outline: 1px solid red;
}

/* Show container query boundaries */
@container card (min-width: 400px) {
  .card {
    outline: 2px dashed blue;
  }
}
```

## Best Practices

- **Start mobile-first** — base styles target the smallest screen, `min-width` media queries enhance upward
- **Use `auto-fit` grids** — eliminate media queries for card layouts
- **Prefer `clamp()` for typography** — smooth scaling without breakpoint jumps
- **Set `aspect-ratio` on images** — prevent layout shift (CLS)
- **Use `srcset` for images** — serve appropriate resolution per device
- **Add `loading="lazy"`** — defer off-screen images
- **Use container queries for components** — decouple from viewport
- **Test on real devices** — emulators miss touch behavior and rendering bugs
- **Avoid fixed pixel widths** — use `%`, `fr`, `vw`, `clamp()` instead
- **Handle overflow explicitly** — `overflow-x: auto` on tables and code blocks
- **Use `gap` instead of margins** — cleaner spacing in flex/grid contexts
- **Set `min-width: 0` on flex children** — prevent overflow in nested flex

## Common Mistakes

- Using `max-width` media queries (desktop-first) — overrides are harder and CSS is larger
- Fixed pixel widths on containers — breaks on smaller screens
- Not setting image dimensions — causes layout shift
- Using `display: none` for mobile navigation without a toggle — users cannot navigate
- Forgetting `overflow-x: auto` on tables — horizontal scroll breaks the page
- Not testing on real devices — emulators miss performance and touch issues
- Using `vh` units without fallback — mobile browser chrome changes viewport height
- Overusing media queries — container queries and `auto-fit` grids reduce the need
- Not setting `min-width: 0` on flex children — content overflows containers
- Ignoring landscape orientation — phones in landscape have different constraints

## Frequently Asked Questions

### Should I use container queries or media queries?

Use media queries for page-level layout (header, sidebar, main grid). Use container queries for component-level responsiveness (cards, widgets, sidebars that appear in different contexts). They are complementary — not a replacement.

### What is the difference between `auto-fit` and `auto-fill` in CSS Grid?

`auto-fit` collapses empty tracks to zero, stretching remaining items to fill the row. `auto-fill` preserves empty tracks as gaps. Use `auto-fit` when you want items to grow and fill available space. Use `auto-fill` when you want items to keep their size and leave gaps.

### How do I handle the mobile viewport height issue?

Mobile browsers dynamically show/hide the address bar, changing `vh`. Use `100dvh` (dynamic viewport height) instead of `100vh`. For older browser support, use the `viewport` meta tag with `interactive-widget=resizes-content` or JavaScript with `window.innerHeight`.
