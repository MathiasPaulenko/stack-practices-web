---



contentType: recipes
slug: css-dark-mode-prefers-color-scheme
title: "Dark Mode with prefers-color-scheme and CSS Variables"
description: "How to implement dark mode using CSS prefers-color-scheme media query, CSS custom properties, and manual toggle with localStorage persistence."
metaDescription: "Implement dark mode with CSS prefers-color-scheme media query and custom properties. Add manual toggle with localStorage and system preference detection."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - css
  - dark-mode
  - prefers-color-scheme
  - theming
  - recipe
relatedResources:
  - /recipes/css-custom-properties-design-tokens
  - /recipes/css-container-queries-responsive
  - /recipes/react-usememo-usecallback-performance
  - /guides/complete-guide-css-modern-layout
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement dark mode with CSS prefers-color-scheme media query and custom properties. Add manual toggle with localStorage and system preference detection."
  keywords:
    - frontend
    - css
    - dark-mode
    - prefers-color-scheme
    - theming
    - recipe



---

## Overview

The `prefers-color-scheme` CSS media query detects whether the user prefers light or dark mode at the OS level. Combined with CSS custom properties, you can switch all colors, borders, and shadows by overriding a few variables. A manual toggle with `localStorage` lets users override the system preference, and a small inline script prevents the flash of incorrect theme on page load.

## When to Use

- Any website that should respect the user's OS dark mode setting
- Applications where users spend extended time and eye strain matters
- Sites with code blocks — dark mode reduces glare for developers
- Content-heavy sites where dark mode improves readability in low-light environments

## When NOT to Use

- Brand-mandated color schemes that must not change
- Print stylesheets — dark mode doesn't apply to printed pages
- Legacy browsers without `prefers-color-scheme` support (IE11, older Safari)

## Solution

### CSS-only dark mode with prefers-color-scheme

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-surface: #1e293b;
    --color-text: #e2e8f0;
    --color-text-muted: #94a3b8;
    --color-border: #334155;
    --color-accent: #3b82f6;
    --color-accent-hover: #60a5fa;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

body {
  background: var(--color-bg);
  color: var(--color-text);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

a {
  color: var(--color-accent);
}

a:hover {
  color: var(--color-accent-hover);
}
```

### Manual toggle with data-theme attribute

```css
:root,
[data-theme="light"] {
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-accent: #3b82f6;
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
  --color-accent: #60a5fa;
}
```

```javascript
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
}

// Initialize from localStorage or system preference
const saved = localStorage.getItem("theme");
if (saved) {
  setTheme(saved);
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(prefersDark ? "dark" : "light");
}
```

### Preventing flash of incorrect theme (FOUC)

Place this script in the `<head>` before CSS loads:

```html
<head>
  <script>
    (function () {
      const saved = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = saved || (prefersDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
    })();
  </script>
  <link rel="stylesheet" href="/styles.css" />
</head>
```

### Toggle button component

```html
<button id="theme-toggle" aria-label="Toggle theme">
  <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
  </svg>
  <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
</button>

<script>
  const toggle = document.getElementById("theme-toggle");
  toggle.addEventListener("click", toggleTheme);

  // Update icon visibility
  function updateIcon() {
    const theme = document.documentElement.getAttribute("data-theme");
    toggle.classList.toggle("dark", theme === "dark");
  }
  updateIcon();
  toggle.addEventListener("click", updateIcon);
</script>

<style>
  .sun-icon { display: block; }
  .moon-icon { display: none; }
  #theme-toggle.dark .sun-icon { display: none; }
  #theme-toggle.dark .moon-icon { display: block; }
</style>
```

### Listening to system preference changes

```javascript
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const saved = localStorage.getItem("theme");
  if (!saved) {
    document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
  }
});
```

### Dark mode with Tailwind CSS v4

```css
@theme {
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #111827;
}

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #e2e8f0;
}
```

Use the `dark:` variant in components:

```html
<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
  Content
</div>
```

### Dark mode with images

```css
:root {
  --logo-url: url("/images/logo-light.png");
}

[data-theme="dark"] {
  --logo-url: url("/images/logo-dark.png");
}

.logo {
  background-image: var(--logo-url);
  background-size: contain;
  background-repeat: no-repeat;
}
```

### Dark mode with code syntax highlighting

```css
:root {
  --code-bg: #f8f8f8;
  --code-text: #333;
  --code-keyword: #c678dd;
  --code-string: #98c379;
  --code-comment: #7c7c7c;
}

[data-theme="dark"] {
  --code-bg: #282c34;
  --code-text: #abb2bf;
  --code-keyword: #c678dd;
  --code-string: #98c379;
  --code-comment: #5c6370;
}

pre {
  background: var(--code-bg);
  color: var(--code-text);
}

.token.keyword { color: var(--code-keyword); }
.token.string { color: var(--code-string); }
.token.comment { color: var(--code-comment); }
```

## Variants

### Three-way toggle (light/dark/system)

```javascript
const THEME_KEY = "theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "system";
}

function getResolvedTheme() {
  const stored = getStoredTheme();
  if (stored === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return stored;
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", getResolvedTheme());
}

setTheme(getStoredTheme());

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (getStoredTheme() === "system") {
    document.documentElement.setAttribute("data-theme", getResolvedTheme());
  }
});
```

### Using CSS color-scheme property

```css
:root {
  color-scheme: light;
}

[data-theme="dark"] {
  color-scheme: dark;
}
```

This tells the browser to render native UI elements (scrollbars, form controls) in the matching color scheme.

## Best Practices


- For a deeper guide, see [Design Tokens with CSS Custom Properties](/recipes/css-custom-properties-design-tokens/).

- Use semantic token names (`--color-bg`, `--color-text`) — switching themes means overriding a few variables, not rewriting all CSS
- Place the anti-FOUC script inline in `<head>` before CSS — it must run before the first paint
- Respect system preference by default — only override when the user explicitly toggles
- Listen to `prefers-color-scheme` changes — if the user hasn't set a manual preference, follow the OS
- Test both themes — some color combinations look fine in light mode but have poor contrast in dark mode
- Use `color-scheme: light dark` — this styles native UI elements (scrollbars, form controls) correctly
- Reduce shadow intensity in dark mode — shadows are less visible on dark backgrounds and can look harsh

## Common Mistakes

- **Flash of light theme (FOUC)**: not setting `data-theme` before CSS loads. The inline head script prevents this.
- **Hardcoded colors in components**: `background: #fff` instead of `var(--color-bg)` — the component doesn't switch in dark mode.
- **Not persisting user choice**: without `localStorage`, the user's toggle resets on page reload.
- **Ignoring system preference**: defaulting to light when the user's OS is set to dark — check `prefers-color-scheme` first.
- **Poor contrast in dark mode**: dark gray text on dark backgrounds is unreadable. Check contrast ratios with a tool.

## FAQ

### What is `prefers-color-scheme`?

A CSS media query that matches the user's OS-level color scheme preference. `prefers-color-scheme: dark` matches when the user has dark mode enabled in their OS settings.

### How do I prevent the flash of incorrect theme?

Set the `data-theme` attribute with an inline script in `<head>` before the CSS loads. This ensures the correct theme is applied on the first paint.

### Should I use `prefers-color-scheme` or a manual toggle?

Both. Use `prefers-color-scheme` as the default, then let the user override with a manual toggle. Store their choice in `localStorage` and respect it on subsequent visits.

### Does `prefers-color-scheme` work in all browsers?

Supported in Chrome 76+, Firefox 67+, Safari 12.1+, and Edge 79+. This covers 96%+ of users as of 2026. For older browsers, light mode is the default.

### How do I handle images in dark mode?

Use CSS custom properties for image URLs, or apply `filter: invert(1)` for simple icons. For photos, consider reducing brightness slightly in dark mode:

```css
[data-theme="dark"] img {
  filter: brightness(0.9);
}
```
