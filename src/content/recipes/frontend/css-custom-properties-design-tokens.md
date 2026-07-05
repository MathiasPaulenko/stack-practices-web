---
contentType: recipes
slug: css-custom-properties-design-tokens
title: "Design Tokens with CSS Custom Properties"
description: "How to build a design token system using CSS custom properties, including color scales, spacing, typography, themes, and responsive scaling."
metaDescription: "Build a design token system with CSS custom properties. Define color scales, spacing, typography, dark themes, and responsive scaling in pure CSS."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - css
  - design-tokens
  - custom-properties
  - theming
  - recipe
relatedResources:
  - /recipes/frontend/css-container-queries-responsive
  - /recipes/frontend/css-dark-mode-prefers-color-scheme
  - /recipes/frontend/typescript-discriminated-unions-exhaustive
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a design token system with CSS custom properties. Define color scales, spacing, typography, dark themes, and responsive scaling in pure CSS."
  keywords:
    - frontend
    - css
    - design-tokens
    - custom-properties
    - theming
    - recipe
---

## Overview

CSS custom properties (variables) let you define design tokens — named values for colors, spacing, typography, and other design decisions. Unlike preprocessor variables, custom properties are live: they can change at runtime, respond to media queries, and cascade through the DOM. This makes them ideal for theming, responsive design, and creating consistent design systems without JavaScript or build-time compilation.

## When to Use

- Building a design system with consistent spacing, colors, and typography
- Supporting multiple themes (light/dark, brand variants)
- Responsive scaling — adjusting spacing and font sizes at different breakpoints
- Creating reusable component libraries that adapt to the host application's tokens
- Runtime theme switching without page reload

## When NOT to Use

- Legacy browser support — custom properties don't work in IE11
- Values that never change and don't need theming — a hardcoded `z-index` is fine
- Complex color manipulation — use `color-mix()` or preprocessor functions for dynamic color math

## Solution

### Basic token definitions

```css
:root {
  /* Color scale */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-900: #1e3a8a;

  /* Neutral scale */
  --color-white: #ffffff;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;
  --color-black: #000000;

  /* Semantic tokens */
  --color-bg: var(--color-white);
  --color-text: var(--color-gray-900);
  --color-text-muted: var(--color-gray-500);
  --color-border: var(--color-gray-200);
  --color-accent: var(--color-primary-500);

  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
}
```

### Using tokens in components

```css
.card {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--line-height-normal);
}

.card__title {
  font-size: var(--text-xl);
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.card__body {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
```

### Dark theme with semantic tokens

```css
:root {
  --color-bg: var(--color-white);
  --color-text: var(--color-gray-900);
  --color-text-muted: var(--color-gray-500);
  --color-border: var(--color-gray-200);
  --color-surface: var(--color-white);
  --color-surface-hover: var(--color-gray-100);
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;
  --color-border: #1e293b;
  --color-surface: #1e293b;
  --color-surface-hover: #334155;
}
```

Toggle theme by setting `data-theme` on the root element:

```javascript
document.documentElement.setAttribute("data-theme", "dark");
```

### Responsive spacing with media queries

```css
:root {
  --space-page: var(--space-4);
  --text-heading: var(--text-xl);
}

@media (min-width: 768px) {
  :root {
    --space-page: var(--space-8);
    --text-heading: var(--text-2xl);
  }
}

@media (min-width: 1280px) {
  :root {
    --space-page: var(--space-12);
    --text-heading: var(--text-2xl);
  }
}

.page {
  padding: var(--space-page);
}

.page__title {
  font-size: var(--text-heading);
}
```

### Fluid typography with clamp

```css
:root {
  --text-fluid-sm: clamp(0.875rem, 0.8rem + 0.25vw, 1rem);
  --text-fluid-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-fluid-lg: clamp(1.25rem, 1rem + 1vw, 1.5rem);
  --text-fluid-xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --text-fluid-2xl: clamp(2rem, 1.5rem + 2.5vw, 3rem);
}

h1 { font-size: var(--text-fluid-2xl); }
h2 { font-size: var(--text-fluid-xl); }
h3 { font-size: var(--text-fluid-lg); }
p { font-size: var(--text-fluid-base); }
```

### Component-scoped tokens

```css
.button {
  --button-bg: var(--color-primary-500);
  --button-text: var(--color-white);
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
  --button-radius: var(--radius-md);

  background: var(--button-bg);
  color: var(--button-text);
  padding: var(--button-padding-y) var(--button-padding-x);
  border-radius: var(--button-radius);
  border: none;
  cursor: pointer;
}

.button--secondary {
  --button-bg: var(--color-gray-100);
  --button-text: var(--color-gray-900);
}

.button--large {
  --button-padding-x: var(--space-6);
  --button-padding-y: var(--space-3);
}
```

### Z-index scale

```css
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
}

.dropdown { z-index: var(--z-dropdown); }
.modal { z-index: var(--z-modal); }
.toast { z-index: var(--z-toast); }
```

### Transition tokens

```css
:root {
  --transition-fast: 150ms ease-out;
  --transition-base: 250ms ease-out;
  --transition-slow: 400ms ease-out;
}

.button {
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.button:hover {
  background: var(--color-primary-600);
  transform: translateY(-1px);
}
```

### Using tokens with Tailwind CSS v4

```css
@theme {
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-900: #1e3a8a;

  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

Tailwind v4 reads these tokens and generates utilities like `bg-brand-500`, `p-6`, `rounded-md`.

## Variants

### Using tokens in JavaScript

```javascript
function getToken(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

const primaryColor = getToken("--color-primary-500");
const spaceUnit = getToken("--space-4");
```

### Theme switching with localStorage

```javascript
const theme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", theme);

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}
```

### Brand-specific tokens

```css
[data-brand="acme"] {
  --color-primary-500: #e11d48;
  --color-primary-600: #be123c;
}

[data-brand="globex"] {
  --color-primary-500: #059669;
  --color-primary-600: #047857;
}
```

## Best Practices

- Use semantic token names (`--color-bg`, `--color-text`) instead of raw color names (`--blue-500`) — semantic tokens make theming trivial
- Define raw color scales separately from semantic tokens — raw scales are the palette, semantic tokens are the meaning
- Keep the spacing scale consistent — use a base unit (0.25rem) and multiply
- Use `clamp()` for fluid typography — it adapts smoothly across screen sizes
- Group tokens by category (colors, spacing, typography, shadows) with comments
- Use component-scoped tokens for complex components — override parent tokens locally
- Test both themes during development — don't build the entire UI in light mode then try to add dark mode

## Common Mistakes

- **Using raw color values in components**: `color: #3b82f6` instead of `color: var(--color-accent)` — theming becomes impossible.
- **Hardcoding spacing**: `padding: 14px` instead of `padding: var(--space-3)` — inconsistent spacing across the app.
- **Not defining semantic tokens**: mapping components directly to raw scale tokens (`--color-primary-500`) makes theme changes require updating every component.
- **Overriding tokens at component level without scoping**: setting `--color-bg` globally inside a `.card` rule affects all descendants unexpectedly.
- **Not testing dark theme**: some token combinations look fine in light mode but have poor contrast in dark mode.

## FAQ

### What is the difference between raw tokens and semantic tokens?

Raw tokens are the palette (`--color-blue-500: #3b82f6`). Semantic tokens assign meaning (`--color-accent: var(--color-blue-500)`). Components use semantic tokens. To change the accent color, you update the semantic token, not every component.

### Can I use custom properties with preprocessors?

Yes. Sass/LESS variables are compile-time; custom properties are runtime. You can use both — Sass for static values, custom properties for themeable values.

### How do I support IE11?

You can't use custom properties in IE11. Use `@supports` to provide fallbacks:

```css
.card { background: #ffffff; }
@supports (--css: variables) {
  .card { background: var(--color-bg); }
}
```

### How do custom properties cascade?

Like regular CSS properties. A token defined on `:root` applies to all elements. A token defined on `.dark-theme` overrides the `:root` value for elements inside `.dark-theme`.

### Should I use custom properties or Tailwind's @theme?

Tailwind v4's `@theme` uses custom properties under the hood. Use `@theme` if you're using Tailwind — it generates utilities from your tokens. Use raw custom properties if you're not using Tailwind.
