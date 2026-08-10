# SEO (Search Engine Optimization) — StackPractices

> Documento completo sobre la estrategia, implementacion y mantenimiento del SEO tecnico y on-page.

---

## 1. Estrategia SEO

StackPractices sigue una estrategia de **SEO tecnico first**, orientada a:
- Indexacion completa de contenido bilingue
- Rich snippets via Schema.org
- Long-tail keywords (ej. "how to parse json python")
- E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
- Velocidad de carga (SSG + CDN)

---

## 2. SEO Tecnico

### 2.1 Sitemap

- **Archivo:** `public/sitemap.xml`
- **Generacion:** Script Node `scripts/generate-sitemap.cjs`
- **Frecuencia:** Manual (ejecutar `npm run sitemap` cuando se anade contenido)
- **Formato:** XML con `xhtml:link` para versiones EN/ES de cada URL

**URLs incluidas:**
- Paginas estaticas (`/`, `/about`, `/contact`, etc.)
- Content collections: `/recipes/*`, `/patterns/*`, `/docs/*`, `/guides/*`
- Paginas de topicos: `/topics/*`
- Paginas de tags: `/tags/*`
- Versiones ES de todas las paginas estaticas

**Ejemplo de entrada:**
```xml
<url>
  <loc>https://stackpractices.com/recipes/data/parse-json/</loc>
  <lastmod>2026-06-12</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
  <xhtml:link rel="alternate" hreflang="en" href="https://stackpractices.com/recipes/data/parse-json/"/>
  <xhtml:link rel="alternate" hreflang="es" href="https://stackpractices.com/es/recipes/data/parse-json/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://stackpractices.com/recipes/data/parse-json/"/>
</url>
```

### 2.2 robots.txt

```
User-agent: *
Allow: /
Sitemap: https://stackpractices.com/sitemap.xml
```

- Permite crawling de todo el sitio
- No bloquea `/tags/*` ni `/topics/*`
- Referencia al sitemap para descubrimiento

### 2.3 Canonical URLs

**Implementacion:** `src/components/Seo.astro`

```astro
<link rel="canonical" href={canonical} />
```

**Logica de construccion:**
```
enUrl = SITE.url + normalizedPath
esUrl = SITE.url + "/es" + normalizedPath
canonical = locale === 'es' ? esUrl : enUrl
```

**IMPORTANTE — Bug conocido y fix parcial:**
En paginas ES, el prop `path` de `Seo.astro` NO debe incluir el prefijo `/es`. Si se pasa `path="/es/authors"`, la canonical resultante sera `/es/es/authors/` (duplicada).

**Paginas ya corregidas:**
- `src/pages/es/editorial-policy.astro`: `path="/editorial-policy"`
- `src/pages/es/authors.astro`: `path="/authors"`

**Paginas PENDIENTES de correccion:**
- `src/pages/es/404.astro`
- `src/pages/es/about.astro`
- `src/pages/es/contact.astro`
- `src/pages/es/cookies.astro`
- `src/pages/es/legal-notice.astro`
- `src/pages/es/privacy.astro`
- `src/pages/es/terms.astro`
- `src/pages/es/patterns/[slug].astro`
- `src/pages/es/recipes/[slug].astro`
- `src/pages/es/guides/[slug].astro`
- `src/pages/es/docs/[slug].astro`
- Paginas dinamicas ES de tags y topics

### 2.4 Hreflang

Cada pagina con alternativa bilingue incluye:
```html
<link rel="alternate" hreflang="en" href="https://stackpractices.com{path}/" />
<link rel="alternate" hreflang="es" href="https://stackpractices.com/es{path}/" />
<link rel="alternate" hreflang="x-default" href="https://stackpractices.com{path}/" />
```

- `x-default` apunta a la version EN (idioma principal)
- Paginas sin alternativa ES pueden desactivar hreflang con `hasAlternate={false}`

### 2.5 Meta Robots

- Por defecto: sin etiqueta `robots` (se asume `index, follow`)
- Paginas que no deben indexar: usar `noindex={true}` en `Seo.astro`
- Ejemplo: paginas de error 404, drafts

### 2.6 Meta Tags Basicos

**En `Seo.astro`:**
```astro
<title>{fullTitle}</title>
<meta name="description" content={description} />
<meta name="author" content="StackPractices" />
<meta name="keywords" content={keywords.join(', ')} />
```

**Reglas de titulo:**
- Si `title === SITE.title`, se usa tal cual
- Si no, formato: `{title} | {SITE.name}`
- Maximo recomendado: 60 caracteres

**Reglas de description:**
- Frontmatter: `metaDescription` (150-160 caracteres)
- Debe ser unica por pagina
- Debe incluir palabras clave principales

---

## 3. Open Graph (Social Sharing)

### Tags implementados

```html
<meta property="og:type" content="website" />   <!-- o "article" para contenido -->
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:site_name" content="StackPractices" />
<meta property="og:locale" content="en_US" />   <!-- o "es_ES" -->
<meta property="og:image" content="https://stackpractices.com/og-image.png" />
```

### Twitter Cards

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content="https://stackpractices.com/og-image.png" />
<meta name="twitter:site" content="@stackpractices" />
```

### OG Image

- **Archivo:** `public/og-image.png` (y `og-image.svg` como source)
- **Dimensiones recomendadas:** 1200x630px
- **Uso:** Imagen por defecto para todas las paginas
- **Futuro:** Podria generarse dinamicamente por pagina

---

## 4. Structured Data (Schema.org / JSON-LD)

**Implementacion:** Funciones en `src/lib/schema.ts`, inyectadas via `Seo.astro`

### 4.1 Tipos de Schema por Pagina

| Tipo de pagina | Schemas usados |
|----------------|----------------|
| Home | `WebPage` |
| Pagina estatica (about, contact) | `WebPage` + `BreadcrumbList` |
| Listing (recipes, patterns) | `CollectionPage` + `ItemList` + `WebPage` + `BreadcrumbList` |
| Detalle (recipe, pattern, doc, guide) | `TechArticle` + `WebPage` + `FAQPage` (si hay FAQ) + `BreadcrumbList` |
| Editorial policy | `WebPage` + `Organization` + `BreadcrumbList` |

### 4.2 Builders disponibles

```ts
// src/lib/schema.ts
breadcrumbList(items: BreadcrumbItem[])
webPage({ name, description, url, locale })
techArticle({ headline, description, url, locale, difficulty, ... })
collectionPage({ name, description, url, locale, items })
organization({ name, url, logo?, description? })
faqPage(faqs: { question, answer }[])
```

### 4.3 Mapeo difficulty -> educationalLevel

```ts
beginner     -> "Beginner"
intermediate -> "Intermediate"
advanced     -> "Advanced"
```

### 4.4 Autoria en Schema

Los schemas `TechArticle` usan:
```json
"author": {
  "@type": "Organization",
  "name": "StackPractices",
  "url": "https://stackpractices.com"
}
```

**Nota:** En el futuro, cuando se mejore la pagina `/authors`, esto deberia cambiar a `@type: "Person"` con datos reales del autor.

---

## 5. Contenido On-Page SEO

### 5.1 Frontmatter obligatorio

Cada archivo `.md` debe tener:
```yaml
---
slug: parse-json
title: How to Parse JSON in Python
description: Learn how to parse JSON...
metaDescription: Step-by-step guide to parsing JSON in Python with code examples. (150-160 chars)
difficulty: beginner
topics: [data, api]
tags: [json, parsing, python]
relatedResources: [/recipes/data/validate-json, /patterns/design/factory-pattern]
lastUpdated: 2026-06-12
author: StackPractices
seo:
  metaDescription: Alternative meta description
  keywords: [json parsing, python json]
---
```

### 5.2 Palabras clave

- Cada contenido debe tener entre 3-8 tags
- Los tags se usan para generar paginas `/tags/{tag}`
- Los topics se usan para paginas `/topics/{topic}`
- Incluir palabras clave en el titulo, primer parrafo, y headings

### 5.3 Headings

- H1: Unico por pagina (el titulo del articulo)
- H2: Secciones principales
- H3: Subsecciones
- No saltarse niveles (no H2 -> H4)

### 5.4 FAQ Sections

Las paginas de detalle deben incluir una seccion FAQ para GEO. Formato soportado:

```markdown
## Frequently Asked Questions

**Q: What is JSON parsing?**
A: JSON parsing is the process of converting a JSON string into a native data structure.

**Q: Can I parse JSON in JavaScript?**
A: Yes, use `JSON.parse()`...
```

O alternativamente:
```markdown
### What is JSON parsing?
JSON parsing is the process...
```

Estas FAQ se extraen automaticamente para generar `FAQPage` schema via `extractFaqs()` en `src/lib/content.ts`.

---

## 6. Internal Linking

### 6.1 Related Resources

Usar `relatedResources` en frontmatter para vincular contenido relacionado:
```yaml
relatedResources:
  - /recipes/data/validate-json
  - /patterns/design/factory-pattern
  - /guides/rest-api-design-guide
```

Estos se renderizan automaticamente al final de cada articulo via `RelatedResources.astro`.

### 6.2 Breadcrumbs

Cada pagina genera un `BreadcrumbList` schema. Visualmente se muestran como:
```
Home > Recipes > Data > Parse JSON
```

---

## 7. RSS Feed

- **EN:** `/rss.xml`
- **ES:** `/es/rss.xml`
- **Generacion:** `src/pages/rss.xml.ts`
- Incluye titulo, descripcion, fecha de publicacion y enlace

---

## 8. Checklist SEO por Pagina Nueva

- [ ] Titulo unico (< 60 chars)
- [ ] Meta description unica (150-160 chars)
- [ ] Canonical URL correcta
- [ ] Hreflang tags presentes (si hay version ES)
- [ ] OG tags completos
- [ ] Twitter Card tags
- [ ] JSON-LD structured data apropiado
- [ ] BreadcrumbList schema
- [ ] Keywords en frontmatter
- [ ] FAQ section (para GEO)
- [ ] Internal links via `relatedResources`
- [ ] Alt text en imagenes
- [ ] URL amigable (`/recipes/data/parse-json`)

---

## 9. Herramientas de Validacion

| Herramienta | URL | Uso |
|-------------|-----|-----|
| Google Rich Results Test | https://search.google.com/test/rich-results | Validar structured data |
| Google Search Console | https://search.google.com/search-console | Monitoreo de indexacion |
| Schema Markup Validator | https://validator.schema.org/ | Validar JSON-LD |
| PageSpeed Insights | https://pagespeed.web.dev/ | Core Web Vitals |
| Ahrefs / SEMrush | - | Keyword research y backlinks |
