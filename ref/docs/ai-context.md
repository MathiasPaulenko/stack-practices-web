# AI Context — StackPractices

> **Leer primero este archivo** si eres una IA empezando a trabajar en StackPractices sin historial de sesion previo.
> Este documento contiene todo lo esencial para operar sin adivinar.

---

## 1. ¿Que es StackPractices?

Sitio estatico multilingue (EN/ES) de recursos para desarrolladores: recetas de codigo, patrones de diseno, plantillas de documentacion y guias. Generado con Astro 5 + Tailwind CSS v4, alojado en GitHub Pages.

**Dominio:** `https://stackpractices.com`
**Fase actual:** Phase 0 (Foundation) completo — build green, `astro check` sin errores.
**Proxima fase:** Phase 1 — Recipes content + detail pages + syntax highlighting + multi-language variant switching.

---

## 2. Stack Tecnologico (Resumen)

| Tecnologia | Version | Rol |
|------------|---------|-----|
| Astro | 5.6.1 | SSG framework (`output: 'static'`) |
| TypeScript | 5.8.3 | Strict mode |
| Tailwind CSS | 4.1.3 | CSS-first (no `tailwind.config.js`) |
| Pagefind | 1.3.0 | Busqueda estatica (postbuild) |
| Node | 20 | CI/CD y dev |

No hay backend, no hay base de datos, no hay auth.

---

## 3. Constantes e IDs Importantes

| Constante | Valor | Ubicacion |
|-----------|-------|-----------|
| Dominio | `stackpractices.com` | `src/config/site.ts` |
| GA4 ID | `G-RBE12WJ5KZ` | `src/layouts/BaseLayout.astro` |
| GTM ID | `GTM-M66C9FWN` | `src/layouts/BaseLayout.astro` |
| AdSense Publisher | `ca-pub-9762280383707953` | `src/layouts/BaseLayout.astro` + `public/ads.txt` |
| Cookie consent key | `sp-cookie-consent` | `src/components/ui/CookieBanner.astro` |
| Default locale | `en` | `src/config/site.ts` |
| Author default | `StackPractices` | `src/config/site.ts` (NOTA: el autor real es Mathias Vladimir Paulenko Echeverz) |

---

## 4. Estructura de Carpetas Clave

```
src/
  components/
    ui/           # Botones, cards, badges, CookieBanner
    content/      # RecipeArticle, ContentCard
    layout/       # Header, Footer
  layouts/
    BaseLayout.astro   # SEO, Consent Mode v2, analytics, AdSense loader
  pages/          # File-based routing
    index.astro   # Home EN
    es/index.astro # Home ES
    [contentType]/index.astro        # Listados EN
    [contentType]/[slug].astro     # Detalle EN
    es/[contentType]/index.astro   # Listados ES
    es/[contentType]/[slug].astro  # Detalle ES
    about.astro, contact.astro, privacy.astro, terms.astro, etc.
    es/about.astro, es/contact.astro, etc.
  content/
    recipes/      # Codigo .md + .es.md
    patterns/     # Patrones .md + .es.md
    docs/         # Templates .md + .es.md
    guides/       # Guias .md + .es.md
  config/
    site.ts       # SITE, MAIN_NAV, FOOTER_NAV, CONTENT_TYPES
  lib/
    schema.ts     # Builders JSON-LD (webPage, techArticle, breadcrumbList, etc.)
    content.ts    # Utilidades: isSpanish, buildResourceIndex, extractFaqs, etc.
public/
  ads.txt
  robots.txt
  sitemap.xml     # Auto-generado
  assets/content/ # Indices JSON auto-generados
docs/             # Este directorio: documentacion del proyecto
ref/              # Archivos de referencia y auditorias
```

---

## 5. Scripts de NPM (Usar siempre)

```bash
npm run dev          # Servidor local (localhost:4321)
npm run check        # Type check + validacion Astro (obligatorio antes de commit)
npm run build        # Build SSG + Pagefind index
npm run preview      # Preview del build local
npm run sitemap      # Regenera public/sitemap.xml
npm run content:index    # Regenera indices JSON de contenido
npm run content:validate # Valida frontmatter y estructura
npm run content:quality  # Valida calidad SEO de contenido
npm run content:links    # Verifica links rotos
```

**Regla de oro:** `npm run check` debe pasar **0 errores** antes de cualquier commit.

---

## 6. Convenciones Obligatorias

### 6.1 Bilingue
- **Cada archivo `.md` DEBE tener su `.es.md` correspondiente.**
- El `slug` es el mismo en ambos idiomas.
- Las colecciones cargan archivos con `isSpanish(id)` para separar EN/ES.

### 6.2 Frontmatter obligatorio (todas las colecciones)
```yaml
---
contentType: recipes | patterns | docs | guides
slug: kebab-case-name
title: "..."
description: "..."
metaDescription: "..."   # 120-160 chars, obligatorio
seo:
  metaDescription: "..."   # 120-160 chars, obligatorio
  keywords: ["..."]
difficulty: beginner | intermediate | advanced
topics: ["topic-name"]
tags: ["tag1", "tag2"]
relatedResources:
  - /recipes/other-recipe
  - /patterns/other-pattern
lastUpdated: "YYYY-MM-DD"
author: "StackPractices"
---
```

### 6.3 Canonical URLs en paginas ES
- **Las paginas ES NO deben incluir `/es` en el prop `path` de `BaseLayout`.**
- Ejemplo correcto: `es/about.astro` usa `path="/about"` (OK).
- Ejemplo incorrecto: `es/contact.astro` usa `path="/es/contact"` (BUG — genera `/es/es/contact/`).
- Ver seccion 8 para lista completa de archivos afectados.

### 6.4 SEO
- Cada pagina debe tener `title`, `description`, y `jsonLd`.
- Todas las paginas estaticas usan `webPage()` + `breadcrumbList()` del schema builder.
- `hasAlternate` debe ser `true` (default) salvo paginas que no tienen version alternativa.

### 6.5 Estilo
- Astro components (`.astro`) para UI estatica.
- Tailwind v4 CSS-first: tokens custom en `src/styles/global.css` (`@theme`).
- Colores principales: `brand-500` (#3b82f6), `slate-*` para grises.
- Zero JS por defecto; islands solo si se necesita interactividad.

---

## 7. Como Crear Contenido Nuevo

1. Copiar un archivo `.md` existente como plantilla.
2. Modificar frontmatter con nuevo `slug`, `title`, `description`, etc.
3. Asegurarse que `relatedResources` apunta a slugs reales existentes.
4. Crear la version `.es.md` con **traduccion completa** de todo (frontmatter + body).
5. Ejecutar:
   ```bash
   npm run content:validate
   npm run check
   npm run build
   ```

**Scripts de ayuda** en `.devin/skills/stackp-content-creator/scripts/`:
- `resource-wizard` — scaffolding de nuevo recurso bilingue
- `validate-content` — valida frontmatter y estructura
- `check-missing-translations` — detecta `.md` sin `.es.md`
- `check-orphan-translations` — detecta `.es.md` sin `.md`
- `check-meta-descriptions` — valida longitud de meta descriptions

---

## 8. Problemas Conocidos Actuales

### CRITICO: Canonical URLs duplicadas `/es/es/`

11 archivos ES pasan `path` con prefijo `/es`, haciendo que `Seo.astro` genere canonicals como `/es/es/contact/`.

**Archivos a corregir** (quitar `/es` del prop `path`):
- `src/pages/es/404.astro`
- `src/pages/es/affiliate-disclosure.astro`
- `src/pages/es/contact.astro`
- `src/pages/es/legal-notice.astro`
- `src/pages/es/search.astro`
- `src/pages/es/docs/index.astro`
- `src/pages/es/guides/index.astro`
- `src/pages/es/patterns/index.astro`
- `src/pages/es/recipes/index.astro`
- `src/pages/es/topics/index.astro`
- `src/pages/es/topics/[topic].astro`

**Archivos que YA ESTAN CORRECTOS** (NO tocar):
- `es/about.astro`, `es/authors.astro`, `es/cookies.astro`, `es/editorial-policy.astro`, `es/privacy.astro`, `es/terms.astro`, `es/tags/index.astro`
- Todos los `[slug].astro` dinamicos (`es/docs/[slug]`, `es/guides/[slug]`, `es/patterns/[slug]`, `es/recipes/[slug]`, `es/tags/[tag]`)
- `es/index.astro`

### MEDIO
- `/authors` y `/es/authors` describen a StackPractices como organizacion generica. Deberia mostrar la bio real de Mathias con foto, links sociales, y schema `Person`.
- `author: "StackPractices"` en frontmatter deberia ser el nombre real del autor.
- Ko-fi button image esta hotlinked desde `storage.ko-fi.com`. Recomendable descargar y servir localmente.

### BAJO
- Algunas meta descriptions estaticas podrian ser mas descriptivas para mejor CTR.

---

## 9. Checklist Antes de Commit

- [ ] `npm run check` pasa 0 errores
- [ ] `npm run build` genera sin errores
- [ ] Si se creo contenido nuevo: version `.es.md` existe
- [ ] Si se creo contenido nuevo: `relatedResources` apunta a URLs validas
- [ ] Si se toco SEO: verificar canonical, hreflang, y meta description
- [ ] Si se toco un componente: verificar responsive y contraste (WCAG)
- [ ] Si se toco estilo: Tailwind v4 CSS-first, no `tailwind.config.js`
- [ ] No se introducen nuevos errores de canonical (verificar `Seo.astro` no genera `/es/es/`)

---

## 10. Referencias a Documentacion Detallada

| Tema | Archivo |
|------|---------|
| Stack tecnico completo | `docs/tech-stack.md` |
| SEO, canonical, hreflang, sitemap | `docs/seo.md` |
| GEO (Generative Engine Optimization) | `docs/geo.md` |
| Sistema de diseno (colores, tipografia, componentes) | `docs/design-system.md` |
| Arquitectura de contenido (schemas, colecciones, flujo bilingue) | `docs/content-architecture.md` |
| Deployment, CI/CD, GitHub Pages | `docs/deployment.md` |
| Componentes y layouts | `docs/components.md` |
| Structured data (JSON-LD, Schema.org) | `docs/structured-data.md` |
| Accesibilidad (WCAG 2.2 AA) | `docs/accessibility.md` |
| Performance y Core Web Vitals | `docs/performance.md` |
| AdSense y monetizacion | `docs/adsense.md` |
| Auditoria AdSense (problemas encontrados) | `ref/adsense-full-audit.md` |

---

## 11. Contacto del Proyecto

- **Autor:** Mathias Vladimir Paulenko Echeverz
- **Email:** mathias.paulenko@outlook.com
- **Portfolio:** https://mathiaspaulenko.com
- **GitHub:** https://github.com/MathiasPaulenko
- **LinkedIn:** https://cn.linkedin.com/in/mathias-paulenko-echeverz
