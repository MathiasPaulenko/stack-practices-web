# Design System — StackPractices

> Especificacion completa del sistema de diseno visual, tokens, componentes y patrones de UI.

---

## 1. Filosofia de Diseno

StackPractices usa un sistema de **alto contraste dark/light** inspirado en la estetica de developer tools modernos:

- **Zonas oscuras:** Header, footer, hero (fondo slate-900)
- **Zonas claras:** Contenido, cards, body (fondo slate-50 / white)
- **Acento:** Azul brand (#3b82f6) para acciones y highlights
- **Tipografia:** Inter (sans) + JetBrains Mono (mono)

El objetivo es crear una experiencia de lectura comoda para desarrolladores que pasan tiempo leyendo documentacion tecnica.

---

## 2. Tokens de Color

### 2.1 Brand Palette (Azul)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-brand-50` | `#eff6ff` | Fondos muy claros |
| `--color-brand-100` | `#dbeafe` | Tags de concepto, badges |
| `--color-brand-200` | `#bfdbfe` | Hover states suaves |
| `--color-brand-300` | `#93c5fd` | Links hover, borders focus |
| `--color-brand-400` | `#60a5fa` | Links, acentos secundarios |
| `--color-brand-500` | `#3b82f6` | **Primary:** botones, logo, acentos |
| `--color-brand-600` | `#2563eb` | Links activos, headings accent |
| `--color-brand-700` | `#1d4ed8` | Hover de botones primarios |
| `--color-brand-800` | `#1e40af` | Fondos oscuros de brand |
| `--color-brand-900` | `#1e3a8a` | Texto sobre fondos claros |

### 2.2 Slate Palette (Escala de Grises)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-slate-50` | `#f8fafc` | Body background (claro) |
| `--color-slate-100` | `#f1f5f9` | Cards background hover |
| `--color-slate-200` | `#e2e8f0` | Borders de cards, dividers |
| `--color-slate-300` | `#cbd5e1` | Borders de inputs, tags |
| `--color-slate-400` | `#94a3b8` | Texto secundario, placeholders |
| `--color-slate-500` | `#64748b` | Texto terciario |
| `--color-slate-600` | `#475569` | Texto de body |
| `--color-slate-700` | `#334155` | Texto de headings en dark |
| `--color-slate-800` | `#1e293b` | Fondos oscuros secundarios |
| `--color-slate-900` | `#0f172a` | **Dark:** header, footer, hero |

### 2.3 Accent (Teal — Reservado)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-accent-400` | `#2dd4bf` | Destacados, badges de estado |
| `--color-accent-500` | `#14b8a6` | Acento secundario |
| `--color-accent-600` | `#0d9488` | Hover de acento |

Actualmente poco usado. Reservado para futuras features (badges de status, indicadores de progreso).

---

## 3. Tipografia

### 3.1 Familias

```css
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
```

### 3.2 Jerarquia

| Elemento | Tamanio | Peso | Color |
|----------|---------|------|-------|
| H1 | `text-3xl` (mobile) / `text-4xl` (desktop) | `font-bold` (700) | `text-slate-900` |
| H2 | `text-2xl` | `font-semibold` (600) | `text-slate-900` |
| H3 | `text-xl` | `font-semibold` (600) | `text-slate-800` |
| Body | `text-base` (16px) | `font-normal` (400) | `text-slate-600` |
| Small / Caption | `text-sm` (14px) | `font-normal` (400) | `text-slate-500` |
| Code inline | `text-sm` | `font-mono` | `text-brand-600` |
| Code block | `text-sm` | `font-mono` | tema `github-dark` |

### 3.3 Line Height

- Headings: `leading-tight` (1.25)
- Body: `leading-relaxed` (1.625)
- Codigo: `leading-snug` (1.375)

---

## 4. Componentes UI

### 4.1 Cards

```html
<div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg hover:border-brand-400">
  <!-- Card content -->
</div>
```

**Variantes:**
- **Default:** `bg-white` + `border-slate-200`
- **Hover:** `hover:shadow-lg` + `hover:border-brand-400`
- **Active/Selected:** `border-brand-500` + `ring-2 ring-brand-500/20`

### 4.2 Botones

**Primario:**
```html
<button class="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
  Action
</button>
```

**Secundario / Outline:**
```html
<button class="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white">
  Secondary
</button>
```

**Ghost:**
```html
<button class="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
  Ghost
</button>
```

### 4.3 Tags / Badges

**Tag de concepto:**
```html
<span class="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
  concept
</span>
```

**Tag de tecnologia:**
```html
<span class="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
  python
</span>
```

### 4.4 Inputs (si se usan en el futuro)

```html
<input class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
```

### 4.5 Breadcrumbs

```html
<nav class="text-sm text-slate-500">
  <a href="/" class="text-brand-600 hover:underline">Home</a>
  <span class="mx-2 text-slate-400">/</span>
  <a href="/recipes" class="text-brand-600 hover:underline">Recipes</a>
  <span class="mx-2 text-slate-400">/</span>
  <span class="text-slate-800">Parse JSON</span>
</nav>
```

---

## 5. Layout

### 5.1 Contenedor Principal

```html
<div class="mx-auto max-w-6xl px-4 sm:px-6">
  <!-- Content -->
</div>
```

- Max width: `max-w-6xl` (72rem / 1152px)
- Padding mobile: `px-4` (1rem)
- Padding desktop: `sm:px-6` (1.5rem)

### 5.2 Grid System

Usar CSS Grid o Flexbox de Tailwind. No hay grid system custom.

**Ejemplos comunes:**
```html
<!-- Cards grid -->
<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

<!-- Footer columns -->
<div class="grid gap-8 sm:grid-cols-2 md:grid-cols-4">

<!-- Two column layout -->
<div class="grid gap-8 lg:grid-cols-3">
  <main class="lg:col-span-2">...</main>
  <aside>...</aside>
</div>
```

### 5.3 Spacing Scale

Usar la escala de Tailwind. Valores comunes:
- `gap-4` (1rem) entre elementos pequenos
- `gap-6` (1.5rem) entre cards
- `py-12` (3rem) para secciones
- `mt-10` (2.5rem) para separacion de bloques

---

## 6. Zonas de Color

### 6.1 Dark Band (Header, Footer, Hero)

```
Background: bg-slate-900
Text primary: text-white
Text secondary: text-slate-300
Text muted: text-slate-400
Borders: border-slate-700
Accent: text-brand-400 / bg-brand-500
```

### 6.2 Light Band (Content, Cards)

```
Background: bg-slate-50 / bg-white
Text primary: text-slate-900
Text secondary: text-slate-600
Text muted: text-slate-500
Borders: border-slate-200
Accent: text-brand-600 / bg-brand-500
```

### 6.3 Hero Background Animation

El hero de la home usa un fondo animado sutil:

```css
.hero-animated-bg {
  position: relative;
  overflow: hidden;
}

.hero-animated-bg::before {
  /* Radial gradients animados */
  background:
    radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.06) 0%, transparent 60%);
  animation: heroGradient 15s ease infinite;
}

.hero-animated-bg::after {
  /* Grid overlay sutil */
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
}
```

Incluye tambien elementos flotantes (dots y simbolos de codigo) con animacion CSS.

---

## 7. Accesibilidad Visual

### 7.1 Contraste

- Texto sobre fondo oscuro: minimo 4.5:1 (WCAG AA)
- Texto grande (> 18px): minimo 3:1
- Links deben ser distinguibles sin solo depender del color

### 7.2 Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-brand-600);
  outline-offset: 2px;
}
```

### 7.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Print Styles

Ver `src/styles/print.css` para estilos de impresion:
- Oculta header, footer, navegacion
- Fondo blanco, texto negro
- Muestra URLs despues de links
- Evita saltos de pagina dentro de tablas y code blocks
- Usa fuente 12pt

---

## 9. Iconografia

- Se usan SVG inline (no libreria de iconos)
- Icono de busqueda: SVG inline en Header
- Lucide podria incorporarse si se necesita mas iconografia
- Consistencia: stroke-width 2, tamano 20-24px

---

## 10. Responsive Breakpoints

Usar los breakpoints estandar de Tailwind:

| Breakpoint | Min-width | Uso principal |
|------------|-----------|---------------|
| `sm` | 640px | Ajustes menores |
| `md` | 768px | Layout de 2 columnas, nav horizontal |
| `lg` | 1024px | Layout de 3 columnas, sidebar |
| `xl` | 1280px | Max-width del contenedor |

**Mobile-first:** Disenar para mobile por defecto, usar `sm:`, `md:`, `lg:` para breakpoints superiores.

---

## 11. Animaciones y Transiciones

### 11.1 Transiciones Estandar

```css
/* Hover de cards */
transition: box-shadow 0.2s ease, border-color 0.2s ease;

/* Botones */
transition: background-color 0.2s ease;

/* Links */
transition: color 0.2s ease;
```

### 11.2 Animaciones CSS

| Animacion | Duracion | Uso |
|-----------|----------|-----|
| `heroGradient` | 15s | Fondo del hero |
| `float` | 6s | Elementos flotantes |
| `fadePulse` | 8s | Simbolos de codigo |

---

## 12. Componentes Astro Existentes

| Componente | Ubicacion | Proposito |
|------------|-----------|-----------|
| `BaseLayout` | `src/layouts/` | Layout base con SEO, nav, footer |
| `Header` | `src/components/layout/` | Navegacion principal + switch de idioma |
| `Footer` | `src/components/layout/` | Footer con links legales y de contenido |
| `Seo` | `src/components/` | Meta tags, OG, hreflang, JSON-LD |
| `CookieBanner` | `src/components/ui/` | Banner de consentimiento de cookies |
| `ListingPage` | `src/components/` | Pagina de listado (recipes, patterns, etc.) |
| `RecipeArticle` | `src/components/` | Layout de articulo de detalle |
| `ContentCard` | `src/components/` | Card individual para listados |
| `RelatedResources` | `src/components/` | Links a recursos relacionados |
| `CodeTabs` | `src/components/` | Tabs para multiples lenguajes de codigo |

---

## 13. Decisiones de Diseno Archivadas

### Por que no Dark Mode toggle?

- El sitio usa dark bands selectivas, no un tema global
- Mantener un solo tema reduce complejidad
- El contraste alto oscuro/claro es intencional y marca identidad

### Por que no component library externo?

- shadcn/ui o similar anadirian dependencias innecesarias
- Los componentes son simples y customizados
- Tailwind + Astro components son suficientes

### Por que Inter + JetBrains Mono?

- Inter: Altamente legible en pantalla, disenada para UI
- JetBrains Mono: Ligaduras, disenada para codigo, gratis
