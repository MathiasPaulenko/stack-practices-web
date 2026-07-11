---
contentType: patterns
slug: css-architecture-pattern
title: "CSS Architecture: Utility-First with Component-Scoped Layers"
description: "How to organize CSS with utility-first classes and component-scoped layers. Covers Tailwind CSS, CSS layers, BEM, CSS modules, and design tokens."
metaDescription: "Organize CSS with utility-first classes and component-scoped layers. Learn Tailwind CSS, @layer, BEM, CSS modules, design tokens, and cascade control."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - css
  - tailwind
  - architecture
  - design-system
  - pattern
category: architectural
relatedResources:
  - /patterns/container-presenter-pattern
  - /patterns/islands-architecture-pattern
  - /patterns/progressive-enhancement-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Organize CSS with utility-first classes and component-scoped layers. Learn Tailwind CSS, @layer, BEM, CSS modules, design tokens, and cascade control."
  keywords:
    - frontend
    - css
    - tailwind
    - architecture
    - design-system
    - pattern
---

## Overview

CSS architecture is about organizing styles so they scale without becoming a maintenance nightmare. The utility-first with component-scoped layers pattern combines Tailwind CSS (or similar utility frameworks) for rapid layout and spacing with component-scoped CSS for complex, reusable components. CSS `@layer` provides cascade control — utilities can override component styles, and component styles can override base styles, all without `!important`. This approach gives you the speed of utility classes for common patterns and the maintainability of scoped styles for complex components.

## When to Use

- Applications with 50+ components that need consistent styling
- Teams where multiple developers write CSS simultaneously
- Design systems that need to scale across multiple projects
- Projects using Tailwind CSS, UnoCSS, or similar utility-first frameworks
- When you need cascade control — base styles < component styles < utility overrides

## When NOT to Use

- Simple landing pages with fewer than 10 components
- Projects where CSS is already well-organized with BEM or another methodology
- Legacy projects where introducing a new CSS architecture would be disruptive
- Static sites with no reusable components

## Solution

### CSS layers for cascade control

```css
/* styles.css — CSS cascade layers */
@layer base, components, utilities;

/* Base layer — resets, typography, element defaults */
@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: var(--font-sans);
    line-height: 1.6;
    color: var(--color-text);
    background-color: var(--color-bg);
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.2;
  }

  a {
    color: var(--color-primary);
    text-decoration: none;
  }
}

/* Components layer — reusable component styles */
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    transition: all 0.15s;
  }

  .btn-primary {
    background-color: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--color-primary-dark);
  }

  .card {
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

/* Utilities layer — single-purpose helpers (highest priority) */
@layer utilities {
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .hidden { display: none; }
  .mt-4 { margin-top: 1rem; }
  .mb-4 { margin-bottom: 1rem; }
  .w-full { width: 100%; }
}
```

### Tailwind CSS v4 configuration

```css
/* app.css — Tailwind CSS v4 CSS-first configuration */
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --radius-card: 0.5rem;
  --radius-button: 0.375rem;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Component classes using @apply */
@layer components {
  .btn {
    @apply inline-flex items-center px-4 py-2 rounded-button font-medium transition-all;
  }

  .btn-primary {
    @apply bg-brand-500 text-white hover:bg-brand-600;
  }

  .btn-secondary {
    @apply bg-white text-slate-700 border border-slate-300 hover:bg-slate-50;
  }

  .btn-danger {
    @apply bg-red-500 text-white hover:bg-red-600;
  }

  .card {
    @apply bg-white border border-slate-200 rounded-card p-6 shadow-card;
  }

  .card-hover {
    @apply hover:shadow-card-hover hover:border-brand-400 transition-all;
  }

  .input {
    @apply w-full px-3 py-2 border border-slate-300 rounded-button
           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent;
  }

  .badge {
    @apply inline-flex items-center px-2 py-0.5 text-xs font-medium rounded;
  }

  .badge-brand {
    @apply bg-brand-100 text-brand-700;
  }
}
```

### CSS modules for component-scoped styles

```css
/* Button.module.css — scoped component styles */
.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-button);
  font-weight: 500;
  transition: all 0.15s ease;
  border: none;
  cursor: pointer;
}

.primary {
  background-color: var(--color-brand-500);
  color: white;
}

.primary:hover {
  background-color: var(--color-brand-600);
}

.secondary {
  background-color: white;
  color: var(--color-slate-700);
  border: 1px solid var(--color-slate-300);
}

.secondary:hover {
  background-color: var(--color-slate-50);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  width: 1rem;
  height: 1rem;
}
```

```jsx
// Button.jsx — using CSS module
import styles from './Button.module.css';

function Button({ variant = 'primary', disabled, icon: Icon, children, ...props }) {
  const className = [
    styles.button,
    styles[variant],
    disabled && styles.disabled,
  ].filter(Boolean).join(' ');

  return (
    <button className={className} disabled={disabled} {...props}>
      {Icon && <Icon className={styles.icon} />}
      {children}
    </button>
  );
}

export default Button;
```

### BEM methodology for complex components

```css
/* search-widget.css — BEM naming convention */
.search-widget {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
}

.search-widget__input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  font-size: 0.875rem;
}

.search-widget__input--focused {
  border-color: var(--color-brand-500);
  box-shadow: 0 0 0 2px var(--color-brand-100);
}

.search-widget__input--error {
  border-color: var(--color-red-500);
}

.search-widget__suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.search-widget__suggestion {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.search-widget__suggestion:hover,
.search-widget__suggestion--active {
  background-color: var(--color-brand-50);
}

.search-widget__clear {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-slate-400);
}
```

### Design tokens as CSS custom properties

```css
/* tokens.css — design tokens */
:root {
  /* Colors — Brand */
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;

  /* Colors — Neutral */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-600: #475569;
  --color-slate-700: #334155;
  --color-slate-900: #0f172a;

  /* Colors — Semantic */
  --color-bg: var(--color-slate-50);
  --color-text: var(--color-slate-900);
  --color-text-muted: var(--color-slate-600);
  --color-border: var(--color-slate-200);
  --color-primary: var(--color-brand-500);
  --color-primary-dark: var(--color-brand-600);

  /* Typography */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-button: 0.375rem;
  --radius-card: 0.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

/* Dark mode tokens */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: var(--color-slate-900);
    --color-text: #f1f5f9;
    --color-text-muted: var(--color-slate-600);
    --color-border: #1e293b;
  }
}
```

### Combining utility-first with component classes

```jsx
// ProductCard.jsx — utility classes for layout, component class for complex styles
function ProductCard({ product }) {
  return (
    <div className="card card-hover p-6 flex flex-col gap-4">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-48 object-cover rounded-card"
      />
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
        <p className="text-sm text-slate-600">{product.description}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-2xl font-bold text-brand-600">
          ${product.price}
        </span>
        <button className="btn btn-primary">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
```

### Responsive utility patterns

```css
/* responsive.css — responsive utilities with container queries */
@layer utilities {
  /* Flex utilities */
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .items-center { align-items: center; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .gap-2 { gap: 0.5rem; }
  .gap-4 { gap: 1rem; }

  /* Grid utilities */
  .grid { display: grid; }
  .grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }

  /* Responsive — media queries */
  @media (min-width: 768px) {
    .md\:flex-row { flex-direction: row; }
    .md\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .md\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .md\:text-lg { font-size: 1.125rem; }
  }

  /* Container queries */
  @container (min-width: 400px) {
    .@container\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  }
}
```

## Variants

### CUBE CSS methodology

```css
/* CUBE CSS — Composition, Utility, Block, Exception */
/* Composition — layout patterns */
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Utility — single purpose */
.bg-brand-500 { background-color: var(--color-brand-500); }
.text-white { color: white; }
.p-4 { padding: 1rem; }

/* Block — component */
.product-card { /* ... */ }

/* Exception — state modifiers */
.product-card:where(.is-featured) {
  border-color: var(--color-brand-500);
}
```

### Atomic CSS with UnoCSS

```html
<!-- UnoCSS — atomic classes generated on demand -->
<div class="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 class="text-xl font-bold text-gray-900">Title</h2>
  <p class="text-sm text-gray-600">Description</p>
</div>
```

## Best Practices

- Use `@layer` for cascade control — declare `@layer base, components, utilities` so utilities always win
- Keep design tokens in `:root` — colors, spacing, fonts, shadows as CSS custom properties
- Use `@apply` sparingly — it's useful for component classes but don't build entire apps with it
- Prefer utility classes for layout — flex, grid, padding, margin are faster as utilities
- Use component classes for complex patterns — buttons, cards, inputs that have hover/focus states
- Scope component styles with CSS modules — prevents class name collisions in large apps
- Use semantic token names — `--color-primary` not `--color-blue-500`, so you can retheme without changing usages
- Support dark mode with token overrides — change token values in a media query, not individual components

## Common Mistakes

- **No cascade layers**: utilities and component styles fight for specificity. `@layer` solves this declaratively.
- **Hardcoding values**: `color: #3b82f6` instead of `color: var(--color-brand-500)`. Changes require find-and-replace.
- **Over-using `@apply`**: turning every utility combination into a component class. This defeats the purpose of utilities.
- **Not using CSS modules for components**: global class names like `.button` collide. Use `.module.css` or scoped styles.
- **Ignoring dark mode**: building light mode only and bolting on dark mode later. Design tokens from the start make it trivial.

## FAQ

### What is the utility-first CSS approach?

Writing styles using small, single-purpose classes like `flex`, `p-4`, `text-center` instead of custom CSS. Tailwind CSS is the most popular utility-first framework. You compose utilities directly in HTML/JSX.

### What are CSS layers?

CSS `@layer` provides explicit cascade control. Styles in later layers override earlier ones regardless of specificity. Declare `@layer base, components, utilities` so utilities always override component and base styles.

### Should I use CSS modules or Tailwind?

Both. Use Tailwind utilities for layout and spacing (fast, consistent). Use CSS modules for complex component styles with hover, focus, and state transitions (scoped, maintainable).

### What are design tokens?

CSS custom properties that store design decisions: colors, fonts, spacing, shadows, radii. They centralize the design system so changes propagate everywhere. Example: `--color-primary: var(--color-brand-500)`.

### How do I handle dark mode?

Override design tokens in a `@media (prefers-color-scheme: dark)` block. Change `--color-bg`, `--color-text`, etc. Components automatically pick up the new values without any changes to component CSS.
