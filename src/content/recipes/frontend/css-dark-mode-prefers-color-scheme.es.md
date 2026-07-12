---



contentType: recipes
slug: css-dark-mode-prefers-color-scheme
title: "Dark Mode con prefers-color-scheme y CSS Variables"
description: "Cómo implementar dark mode usando el media query CSS prefers-color-scheme, CSS custom properties y toggle manual con persistencia en localStorage."
metaDescription: "Implementa dark mode con CSS prefers-color-scheme media query y custom properties. Agrega toggle manual con localStorage y detección de preferencia del sistema."
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
  metaDescription: "Implementa dark mode con CSS prefers-color-scheme media query y custom properties. Agrega toggle manual con localStorage y detección de preferencia del sistema."
  keywords:
    - frontend
    - css
    - dark-mode
    - prefers-color-scheme
    - theming
    - recipe



---

## Overview

El media query CSS `prefers-color-scheme` detecta si el usuario prefiere light o dark mode a nivel de OS. Combinado con CSS custom properties, puedes switchear todos los colores, bordes y sombras overrideando unas pocas variables. Un toggle manual con `localStorage` deja a los usuarios overridear la preferencia del sistema, y un pequeño script inline previene el flash de tema incorrecto en page load.

## When to Use

- Cualquier sitio web que debería respetar el setting de dark mode del OS del usuario
- Aplicaciones donde los usuarios pasan tiempo extendido y la fatiga visual importa
- Sitios con code blocks — dark mode reduce el glare para developers
- Sitios content-heavy donde dark mode mejora la legibilidad en ambientes de poca luz

## When NOT to Use

- Esquemas de color mandatorios por brand que no deben cambiar
- Print stylesheets — dark mode no aplica a páginas impresas
- Browsers legacy sin soporte de `prefers-color-scheme` (IE11, Safari antiguo)

## Solution

### Dark mode solo con CSS y prefers-color-scheme

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

### Toggle manual con atributo data-theme

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

// Inicializar desde localStorage o preferencia del sistema
const saved = localStorage.getItem("theme");
if (saved) {
  setTheme(saved);
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(prefersDark ? "dark" : "light");
}
```

### Prevenir flash de tema incorrecto (FOUC)

Coloca este script en el `<head>` antes de que cargue el CSS:

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

### Componente de botón toggle

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

  // Actualizar visibilidad de icono
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

### Escuchar cambios de preferencia del sistema

```javascript
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const saved = localStorage.getItem("theme");
  if (!saved) {
    document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
  }
});
```

### Dark mode con Tailwind CSS v4

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

Usa la variante `dark:` en componentes:

```html
<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
  Content
</div>
```

### Dark mode con imágenes

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

### Dark mode con syntax highlighting de código

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

### Toggle de tres vías (light/dark/system)

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

### Usar la propiedad CSS color-scheme

```css
:root {
  color-scheme: light;
}

[data-theme="dark"] {
  color-scheme: dark;
}
```

Esto le dice al browser que renderice los elementos de UI nativos (scrollbars, form controls) en el color scheme correspondiente.

## Best Practices


- For a deeper guide, see [Design Tokens with CSS Custom Properties](/es/recipes/css-custom-properties-design-tokens/).

- Usa nombres semánticos de tokens (`--color-bg`, `--color-text`) — switchear temas significa overridear unas pocas variables, no reescribir todo el CSS
- Coloca el script anti-FOUC inline en `<head>` antes del CSS — debe correr antes del primer paint
- Respeta la preferencia del sistema por defecto — solo overridea cuando el usuario togglea explícitamente
- Escucha cambios de `prefers-color-scheme` — si el usuario no seteó una preferencia manual, sigue el OS
- Testea ambos temas — algunas combinaciones de color se ven bien en light mode pero tienen contraste pobre en dark mode
- Usa `color-scheme: light dark` — esto estila los elementos de UI nativos (scrollbars, form controls) correctamente
- Reduce la intensidad de sombras en dark mode — las sombras son menos visibles en fondos oscuros y pueden verse harsh

## Common Mistakes

- **Flash de tema light (FOUC)**: no setear `data-theme` antes de que cargue el CSS. El script inline en head lo previene.
- **Colores hardcodeados en componentes**: `background: #fff` en lugar de `var(--color-bg)` — el componente no switchea en dark mode.
- **No persistir la elección del usuario**: sin `localStorage`, el toggle del usuario se resetea en cada page reload.
- **Ignorar la preferencia del sistema**: defaultear a light cuando el OS del usuario está en dark — checkea `prefers-color-scheme` primero.
- **Contraste pobre en dark mode**: texto gris oscuro en fondos oscuros es ilegible. Verifica contrast ratios con una herramienta.

## FAQ

### ¿Qué es `prefers-color-scheme`?

Un media query CSS que matchea la preferencia de color scheme del usuario a nivel OS. `prefers-color-scheme: dark` matchea cuando el usuario tiene dark mode habilitado en los settings del OS.

### ¿Cómo prevengo el flash de tema incorrecto?

Setea el atributo `data-theme` con un script inline en `<head>` antes de que cargue el CSS. Esto asegura que el tema correcto se aplique en el primer paint.

### ¿Debería usar `prefers-color-scheme` o un toggle manual?

Ambos. Usa `prefers-color-scheme` como default, luego deja que el usuario overridee con un toggle manual. Guarda su elección en `localStorage` y respétala en visitas subsecuentes.

### ¿`prefers-color-scheme` funciona en todos los browsers?

Soportado en Chrome 76+, Firefox 67+, Safari 12.1+ y Edge 79+. Esto cubre 96%+ de usuarios a 2026. Para browsers más antiguos, light mode es el default.

### ¿Cómo manejo imágenes en dark mode?

Usa CSS custom properties para URLs de imágenes, o aplica `filter: invert(1)` para iconos simples. Para fotos, considera reducir brightness ligeramente en dark mode:

```css
[data-theme="dark"] img {
  filter: brightness(0.9);
}
```
