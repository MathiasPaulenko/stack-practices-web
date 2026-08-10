# Componentes y Layouts — StackPractices

> Documentacion de los componentes Astro, layouts, y flujo de renderizado de paginas.

---

## 1. Layouts

### 1.1 BaseLayout.astro

Ubicacion: `src/layouts/BaseLayout.astro`

**Props:**
```ts
title?: string
description?: string
metaDescription?: string
keywords?: string[]
path?: string
locale?: 'en' | 'es'
noindex?: boolean
hasAlternate?: boolean
structuredData?: object | object[]
breadcrumbs?: BreadcrumbItem[]
```

**Responsabilidades:**
- Inyecta `Seo.astro` con todas las meta tags
- Carga Google Consent Mode v2 (default denied)
- Carga GTM y GA4
- Carga AdSense condicionalmente
- Renderiza `Header.astro` y `Footer.astro`
- Importa `global.css` y `print.css`
- Provee skip-link para accesibilidad
- Envuelve el slot del contenido de pagina

### 1.2 Flujo de Slots

```
BaseLayout
  ├── Seo (meta tags)
  ├── CookieBanner (consent)
  ├── Header (navegacion)
  ├── <slot /> (contenido de pagina)
  └── Footer (links legales)
```

---

## 2. Componentes de SEO

### 2.1 Seo.astro

Ubicacion: `src/components/Seo.astro`

**Entradas:**
- `title`: titulo de pagina
- `description`: meta description
- `keywords`: array de keywords
- `path`: ruta relativa (ej. `/recipes/data/parse-json`)
- `locale`: `en` o `es`
- `noindex`: boolean
- `hasAlternate`: boolean (si existe version ES)
- `structuredData`: objeto JSON-LD o array

**Salidas:**
- `<title>` con formato `Page | StackPractices`
- `<meta name="description">`
- `<meta name="author">`
- `<meta name="robots">` (solo si noindex)
- `<link rel="canonical">`
- `<link rel="alternate" hreflang="...">` x3 (en, es, x-default)
- `<meta property="og:*">` x7 tags
- `<meta name="twitter:*">` x5 tags
- `<script type="application/ld+json">` con structured data

**Logica de URL:**
```
normalizedPath = path.endsWith('/') ? path : path + '/'
canonical = SITE.url + (locale === 'es' ? '/es' : '') + normalizedPath
enUrl = SITE.url + normalizedPath
esUrl = SITE.url + '/es' + normalizedPath
```

**⚠️ Importante:** En paginas ES, pasar `path` sin prefijo `/es`.

---

## 3. Componentes de Layout

### 3.1 Header.astro

Ubicacion: `src/components/layout/Header.astro`

**Contenido:**
- Logo / marca (texto "StackPractices")
- Navegacion principal: Home, Recipes, Patterns, Docs, Guides, Topics
- Icono de busqueda (abre overlay Pagefind)
- Switcher de idioma (EN / ES)

**Logica del switcher:**
```
Si locale === 'es':
  link EN = url.replace('/es/', '/').replace('/es', '/')
Si no:
  link ES = '/es' + path (o path con /es/ reemplazado)
```

**Estilo:**
- Fondo: `bg-slate-900`
- Texto: `text-white`
- Links activos: `text-brand-400`
- Mobile: menu hamburguesa (futuro)

### 3.2 Footer.astro

Ubicacion: `src/components/layout/Footer.astro`

**Contenido:**
- Logo + descripcion corta
- Link Ko-fi (donaciones)
- Navegacion por grupos:
  - Content: Recipes, Patterns, Docs, Guides, Topics
  - Site: About, Contact, Search
  - Legal: Privacy, Terms, Cookies, Legal Notice, Affiliate Disclosure
- Copyright dinamico: `© 2026 StackPractices`

**Estilo:**
- Fondo: `bg-slate-900`
- Texto: `text-slate-400`
- Links: `hover:text-white`

---

## 4. Componentes de Contenido

### 4.1 ListingPage.astro

Ubicacion: `src/components/ListingPage.astro`

**Props:**
```ts
heading: string
description: string
path: string
entries: Entry[]
keywords: string[]
contentType: string
```

**Uso:** Paginas de listado (recipes, patterns, docs, guides, tags, topics).

**Funcion:**
- Renderiza hero con titulo y descripcion
- Muestra grid de `ContentCard.astro`
- Genera JSON-LD `CollectionPage` + `ItemList`
- Filtros por tags (futuro)

### 4.2 ContentCard.astro

Ubicacion: `src/components/ContentCard.astro`

**Props:**
```ts
title: string
description: string
href: string
difficulty?: string
tags?: string[]
```

**Estilo:**
- `bg-white` + `border-slate-200`
- `hover:shadow-lg` + `hover:border-brand-400`
- Badge de dificultad con color segun nivel:
  - beginner: `bg-green-100 text-green-800`
  - intermediate: `bg-yellow-100 text-yellow-800`
  - advanced: `bg-red-100 text-red-800`

### 4.3 RecipeArticle.astro

Ubicacion: `src/components/RecipeArticle.astro`

**Props:**
```ts
title: string
description: string
metaDescription: string
keywords: string[]
difficulty: string
tags: string[]
topics: string[]
lastUpdated: Date
author: string
path: string
locale: string
listingHref: string
listingLabel: string
related: RelatedItem[]
faqs: FaqItem[]
contentType: string
```

**Funcion:**
- Layout de articulo individual
- Breadcrumbs
- Meta info (autor, fecha, dificultad, tags)
- Contenido Markdown (slot)
- RelatedResources
- FAQ section (si hay FAQs)
- Schema `TechArticle` + `FAQPage` (si aplica)

### 4.4 RelatedResources.astro

Ubicacion: `src/components/RelatedResources.astro`

**Props:**
```ts
resources: { title: string; href: string }[]
label: string
```

Renderiza lista de links a recursos relacionados definidos en frontmatter.

### 4.5 CodeTabs.astro

Ubicacion: `src/components/CodeTabs.astro`

**Props:**
```ts
tabs: { label: string; code: string; lang: string }[]
```

Renderiza tabs interactivos para mostrar implementaciones en multiples lenguajes. Usa CSS puro (checkbox hack) para evitar JavaScript.

---

## 5. Componentes de UI

### 5.1 CookieBanner.astro

Ubicacion: `src/components/ui/CookieBanner.astro`

**Version actual (v2):**
- Banner inferior fijo con texto explicativo
- 3 botones: Decline, Manage, Accept All
- Modal de preferencias con toggles granulares:
  - Essential (siempre activo)
  - Analytics (toggle)
  - Advertising (toggle)
- Guarda en `localStorage['sp-cookie-consent']`
- Actualiza `gtag('consent', 'update', ...)`
- Carga AdSense si `ad_storage === 'granted'`

**Version anterior:** Banner simple con texto + boton "Got it" que cargaba GA4. Reemplazada por v2 para cumplir Consent Mode.

---

## 6. Componentes Utilitarios

### 6.1 SkipLink.astro

Ubicacion: `src/components/SkipLink.astro`

Link oculto hasta que recibe focus (teclado). Permite saltar navegacion y ir directamente a `#main`.

### 6.2 LanguageSwitcher.astro

Ubicacion: `src/components/LanguageSwitcher.astro`

Botones EN/ES que redirigen a la version correspondiente de la pagina actual.

---

## 7. Paginas Estaticas

### 7.1 Home (index.astro)

- Hero con animacion CSS
- Grid de content cards destacados
- Lista de topics populares
- Call to action

### 7.2 About (about.astro)

- Mision y vision
- Tipos de contenido
- Modelo de negocio (advertising, affiliate, donations)
- Link Ko-fi

### 7.3 Contact (contact.astro)

- Formulario de contacto simple (sin backend; usa mailto: o servicio externo futuro)

### 7.4 Paginas Legales

Todas en EN + ES:
- `privacy.astro` / `es/privacy.astro`
- `terms.astro` / `es/terms.astro`
- `cookies.astro` / `es/cookies.astro`
- `legal-notice.astro` / `es/legal-notice.astro`
- `affiliate-disclosure.astro` / `es/affiliate-disclosure.astro`
- `editorial-policy.astro` / `es/editorial-policy.astro`
- `authors.astro` / `es/authors.astro`

### 7.5 404

- `404.astro` (EN)
- `es/404.astro` (ES)

---

## 8. Paginas Dinamicas

### 8.1 Content Detail

- `src/pages/[contentType]/[slug].astro`
- Carga entrada de content collection
- Renderiza via `RecipeArticle.astro`
- Genera schema `TechArticle`

### 8.2 Tags y Topics

- `src/pages/tags/[tag].astro`
- `src/pages/topics/[topic].astro`
- Listan contenido filtrado por tag o topic
- Usan `ListingPage.astro`

### 8.3 Search

- `src/pages/search/index.astro`
- Pagina dedicada para busqueda Pagefind
- Incluye UI de Pagefind

---

## 9. Decisiones de Arquitectura

### Por que Astro y no React/Next.js?

- Zero JS by default
- Mejor rendimiento para contenido estatico
- File-based routing simple
- Content collections nativas

### Por que no islands de React?

- El sitio es mayormente estatico
- Interactividad minima (solo busqueda, cookie banner, copy code)
- Todo se resuelve con CSS + JS vanilla inline

### Por que no layout de sidebar?

- Contenido es lineal (lectura)
- No hay TOC profundo que justifique sidebar
- Mobile-first: sidebar rompe en movil
