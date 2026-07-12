---
contentType: recipes
slug: css-custom-properties-design-tokens
title: "Design Tokens con CSS Custom Properties"
description: "Cómo construir un sistema de design tokens usando CSS custom properties, incluyendo escalas de color, spacing, tipografía, temas y escalado responsivo."
metaDescription: "Construye un sistema de design tokens con CSS custom properties. Define escalas de color, spacing, tipografía, dark themes y escalado responsivo en CSS puro."
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
  metaDescription: "Construye un sistema de design tokens con CSS custom properties. Define escalas de color, spacing, tipografía, dark themes y escalado responsivo en CSS puro."
  keywords:
    - frontend
    - css
    - design-tokens
    - custom-properties
    - theming
    - recipe
---

## Overview

CSS custom properties (variables) te permiten definir design tokens — valores nombrados para colores, spacing, tipografía y otras decisiones de diseño. A diferencia de las variables de preprocesador, las custom properties son live: pueden cambiar en runtime, responder a media queries y cascadear a través del DOM. Esto las hace ideales para theming, responsive design y crear design systems consistentes sin JavaScript o compilación en build time.

## When to Use

- Construir un design system con spacing, colores y tipografía consistentes
- Soportar múltiples temas (light/dark, variantes de brand)
- Escalado responsivo — ajustar spacing y font sizes en diferentes breakpoints
- Crear librerías de componentes reutilizables que se adaptan a los tokens de la aplicación host
- Switching de tema en runtime sin page reload

## When NOT to Use

- Soporte de browsers legacy — las custom properties no funcionan en IE11
- Valores que nunca cambian y no necesitan theming — un `z-index` hardcodeado está bien
- Manipulación compleja de color — usa `color-mix()` o funciones de preprocesador para math de color dinámico

## Solution

### Definiciones básicas de tokens

```css
:root {
  /* Escala de color */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-900: #1e3a8a;

  /* Escala neutral */
  --color-white: #ffffff;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;
  --color-black: #000000;

  /* Tokens semánticos */
  --color-bg: var(--color-white);
  --color-text: var(--color-gray-900);
  --color-text-muted: var(--color-gray-500);
  --color-border: var(--color-gray-200);
  --color-accent: var(--color-primary-500);

  /* Escala de spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Tipografía */
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

### Usar tokens en componentes

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

### Dark theme con tokens semánticos

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

Toggle theme seteando `data-theme` en el elemento root:

```javascript
document.documentElement.setAttribute("data-theme", "dark");
```

### Spacing responsivo con media queries

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

### Tipografía directa con clamp

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

### Tokens scoped a componente

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

### Escala de z-index

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

### Tokens de transición

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

### Usar tokens con Tailwind CSS v4

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

Tailwind v4 lee estos tokens y genera utilities como `bg-brand-500`, `p-6`, `rounded-md`.

## Variants

### Usar tokens en JavaScript

```javascript
function getToken(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

const primaryColor = getToken("--color-primary-500");
const spaceUnit = getToken("--space-4");
```

### Switching de tema con localStorage

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

### Tokens brand-specific

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

- Usa nombres semánticos de tokens (`--color-bg`, `--color-text`) en lugar de nombres de color crudos (`--blue-500`) — los tokens semánticos hacen el theming trivial
- Define escalas de color crudas separadas de los tokens semánticos — las escalas crudas son la paleta, los tokens semánticos son el significado
- Mantén la escala de spacing consistente — usa una unidad base (0.25rem) y multiplica
- Usa `clamp()` para tipografía directa — se adapta suavemente a través de tamaños de pantalla
- Agrupa tokens por categoría (colors, spacing, typography, shadows) con comentarios
- Usa tokens scoped a componente para componentes complejos — overridea tokens parent localmente
- Testea ambos temas durante el desarrollo — no construyas toda la UI en light mode y luego intentes agregar dark mode

## Common Mistakes

- **Usar valores de color crudos en componentes**: `color: #3b82f6` en lugar de `color: var(--color-accent)` — el theming se vuelve imposible.
- **Hardcodear spacing**: `padding: 14px` en lugar de `padding: var(--space-3)` — spacing inconsistente a través de la app.
- **No definir tokens semánticos**: mapear componentes directamente a tokens de escala cruda (`--color-primary-500`) hace que los cambios de tema requieran actualizar cada componente.
- **Overridear tokens a nivel de componente sin scoping**: setear `--color-bg` globalmente dentro de un rule `.card` afecta a todos los descendientes inesperadamente.
- **No testear dark theme**: algunas combinaciones de tokens se ven bien en light mode pero tienen contraste pobre en dark mode.

## FAQ

### ¿Cuál es la diferencia entre raw tokens y semantic tokens?

Los raw tokens son la paleta (`--color-blue-500: #3b82f6`). Los semantic tokens asignan significado (`--color-accent: var(--color-blue-500)`). Los componentes usan tokens semánticos. Para cambiar el color accent, actualizas el token semántico, no cada componente.

### ¿Puedo usar custom properties con preprocesadores?

Sí. Las variables de Sass/LESS son compile-time; las custom properties son runtime. Puedes usar ambas — Sass para valores estáticos, custom properties para valores themeable.

### ¿Cómo soporto IE11?

No puedes usar custom properties en IE11. Usa `@supports` para proveer fallbacks:

```css
.card { background: #ffffff; }
@supports (--css: variables) {
  .card { background: var(--color-bg); }
}
```

### ¿Cómo cascadean las custom properties?

Como las CSS properties regulares. Un token definido en `:root` aplica a todos los elementos. Un token definido en `.dark-theme` overridea el valor de `:root` para elementos dentro de `.dark-theme`.

### ¿Debería usar custom properties o @theme de Tailwind?

`@theme` de Tailwind v4 usa custom properties por debajo. Usa `@theme` si estás usando Tailwind — genera utilities desde tus tokens. Usa custom properties crudas si no estás usando Tailwind.
