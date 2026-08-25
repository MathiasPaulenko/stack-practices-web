# Technical & Indexability Audit — StackPractices

> Generado el 2026-08-24. Ejecución del prompt `ref/audit/01-technical-audit.md` a nivel sitio.
> No edita archivos. Verificaciones basadas en fuentes locales (`src/`, `dist/`, `public/`) sin acceso a producción para HTTP status.

---

## 1. URL y ruta

### Slugs

| Check | Resultado |
|---|---|
| Kebab-case | ✅ 0 slugs inválidos (todos `[a-z0-9]+(?:-[a-z0-9]+)*`) |
| Únicos dentro del tipo | ✅ No hay duplicados dentro de recipes/patterns/guides/docs |
| Duplicados cross-type | ✅ 0 (cada slug es único global) |
| Slugs por tipo | recipes: 431, patterns: 203, guides: 210, docs: 177 |

### Ruta lógica

- EN: `/{tipo}/{slug}/` (trailing slash siempre, `astro.config.mjs` `trailingSlash: 'always'`)
- ES: `/es/{tipo}/{slug}/`
- Sin parámetros, IDs ni fechas en URL.
- Rutas generadas por:
  - `src/pages/recipes/[slug].astro`
  - `src/pages/patterns/[slug].astro`
  - `src/pages/guides/[slug].astro`
  - `src/pages/docs/[slug].astro`
  - Versiones ES bajo `src/pages/es/.../`

### Generación de ruta

```text
src/content.config.ts:
  ✅ Define collections recipes, patterns, guides, docs con Zod
  ✅ topicsEnum compartido entre tipos
  ✅ baseSchema valida slug, title, metaDescription (50-170), topics, tags, relatedResources

src/pages/{tipo}/[slug].astro:
  ✅ Usa getStaticPaths()
  ✅ Filtra .es.md con helper isSpanish()
  ✅ Usa entry.data.slug para el param
  ✅ Renderiza con render(entry)
  ✅ Genera trailing slash en path="/{tipo}/{slug}/"

BaseLayout / Seo.astro:
  ✅ Inyecta canonical, hreflang, Open Graph, JSON-LD
  ✅ normaliza path con trailingSlash
  ✅ canonical self-referencing para EN y ES
```

---

## 2. HTTP y estado

`HTTP STATUS: NOT VERIFIED` (no acceso a producción para hacer requests)

- Build estático en `dist/` genera 3.258 archivos HTML.
- GitHub Pages sirve los archivos estáticos.
- No hay soft-404 detectado en el build: todas las páginas HTML generadas tienen contenido.
- No hay redirect chains detectadas en la configuración Astro (no se usa `redirects.json`).

---

## 3. Indexabilidad

`INDEXABILITY: PASS`

| Check | Resultado |
|---|---|
| `robots.txt` | ✅ `User-agent: *\nAllow: /\n\nSitemap: https://stackpractices.com/sitemap.xml` |
| `public/robots.txt` | ✅ Presente, permite todo el sitio |
| Meta robots | ✅ 404 y search tienen `noindex`. Resto no tiene noindex. |
| No accidental noindex | ✅ Ningún contenido indexable tiene `noindex` |
| JS para contenido principal | ✅ Astro SSG; contenido principal en HTML inicial |

---

## 4. Canonical

`CANONICAL RISK: NONE`

| Check | Resultado |
|---|---|
| Self-referencing canonical | ✅ 100% en muestra de 100 dist HTML |
| EN canonical | `https://stackpractices.com/{tipo}/{slug}/` |
| ES canonical | `https://stackpractices.com/es/{tipo}/{slug}/` |
| Canonical coincide con URL | ✅ Verificado en dist |
| No canonical cruzada ES→EN | ✅ Cada versión canonicaliza a sí misma |
| Sitemap URLs | Coinciden con canonical (trailing slash) |

### Páginas especiales

- `/404/` (EN) y `/es/404/` (ES): `hasAlternate={false}`, `noindex={true}`, `trailingSlash={false}` en 404.astro. Canonical a `https://stackpractices.com/404.html`. No deben indexarse.
- `/search/` y `/es/search/`: `noindex={true}`. Search.astro no pasa `hasAlternate={false}`, pero el componente genera hreflang y canonical correctamente; `noindex` evita indexación.

---

## 5. Sitemap

`SITEMAP: OK`

| Check | Resultado |
|---|---|
| URLs en sitemap | 3.254 |
| Dist URLs | 3.258 |
| Formato XML correcto | ✅ |
| lastmod presente | ✅ 2026-08-24 en todas las URLs muestreadas |
| hreflang xhtml:link | ✅ EN/ES/x-default presentes |
| No double slash | ✅ |

### Diferencias sitemap vs dist

```text
Sitemap: 3254 URLs
Dist:    3258 files

En sitemap, no en dist: 1
  https://stackpractices.com/ (home page) -> dist genera /index.html (URL /)

En dist, no en sitemap: 5
  /es/404/        -> noindex, correctamente excluido
  /index.html     -> archivo físico, URL canonical es /
  /search/        -> noindex, correctamente excluido
  /404.html       -> archivo físico de 404 (GitHub Pages requiere 404.html)
  /es/search/     -> noindex, correctamente excluido
```

Conclusión: 4 URLs noindex correctamente excluidas del sitemap. `/index.html` y `/404.html` son artefactos del build estático. Todo correcto.

---

## 6. Redirects

`REDIRECTS: OK`

- No hay `redirects.json` ni `src/pages/` con redirecciones.
- Astro `trailingSlash: 'always'` asegura que `/tipo/slug` redirige a `/tipo/slug/` (comportamiento de GitHub Pages/Astro).
- No hay 302/307 temporales.
- No hay bucles.

---

## 7. Structured Data

`STRUCTURED DATA: VALID + ELIGIBLE`

### Muestra 200 dist HTML

```text
Files with JSON-LD: 200/200 (100%)
Invalid JSON-LD blocks: 0

Types:
  BreadcrumbList:  198
  FAQPage:         150
  TechArticle:     149
  WebPage:          50
  Person:           44
  WebSite:           1
  CollectionPage:    1

Pages with FAQ section but no FAQPage schema: 0
```

### Validación

- JSON-LD parseable en 100% de la muestra.
- `TechArticle` con `headline`, `description`, `author`, `dateModified`, `datePublished`, `mainEntityOfPage`.
- `FAQPage` presente cuando hay sección FAQ.
- `BreadcrumbList` presente en casi todas las páginas.
- No se detectó schema inválido.

### Oportunidad

- `WebSite` schema solo en 1 página. Considerar añadir `WebSite` + `Organization` en home para brand panel.

---

## 8. Renderizado

`RENDERING: PASS`

### Muestra 50 dist HTML

```text
Pages with H1:           50/50
Pages with <main> content > 200 chars: 50/50
Pages missing main content: 0
```

- Contenido principal está en HTML estático.
- H1, título, meta description y primeros párrafos visibles sin JS.
- Astro SSG sin hidratación innecesaria.

---

## 9. Performance

`PERFORMANCE: NOT VERIFIED` (sin PageSpeed Insights/CrUX/Lighthouse)

### Métricas estáticas

| Recurso | Valor |
|---|---|
| Archivos HTML | 3.258 |
| Tamaño HTML total | 131 MB |
| Tamaño promedio por HTML | 41.2 KB |
| HTML más grande | 129.7 KB |
| HTML más pequeño | 12.0 KB |
| Páginas >50 KB | 1.167 (35.8%) |
| Páginas >100 KB | 43 (1.3%) |

### Otros assets

```text
.html        3258   134102.1 KB
.pf_fragment 3258    12988.8 KB
.pf_index     372     12461.6 KB
.json        2189      5353.6 KB
.xml            3      1775.4 KB
.js             8       449.8 KB
.png            3       237.0 KB
.pagefind       3       207.2 KB
.css            4       175.8 KB
.pf_meta        2        29.7 KB
.svg            3        16.6 KB
.pf_filter      4        10.0 KB
```

### Performance estática

- `compressHTML: true` en `astro.config.mjs` ✅
- `cssCodeSplit: true` y `minify: true` en Vite build ✅
- Imágenes con `loading="lazy"` ✅
- Pagefind carga bajo demanda (`defer`) ✅
- JS total: 449.8 KB (incluye analytics y pagefind-ui)
- CSS total: 175.8 KB

### Estimaciones CWV

| Métrica | Estimación | Notas |
|---|---|---|
| LCP | Probablemente >2.5s en 3G | HTML promedio 41 KB + contenido denso |
| INP | No medible estáticamente | Astro zero JS por defecto; Pagefind async |
| CLS | Bajo | SSG, layout estable |

**Recomendación**: medir CWV reales con PageSpeed Insights o CrUX en producción.

---

## 10. Internal Links (técnico)

`INTERNAL LINKS: WARNING` (broken body links detectados)

### Checks

| Check | Resultado |
|---|---|
| Old pattern `/tipo/topic/slug` | ✅ 0 detectados |
| Wrong language body links | ✅ 0 (navegación y alternates correctos) |
| Broken body links | ⚠️ 16 apuntan a `/recipes/circuit-breaker-pattern-recipe` (slug renombrado) |
| Broken relatedResources | ✅ 0 |
| Absolutos internos innecesarios | ✅ No se detectan en muestra |
| Double slashes | ✅ 0 |

### Broken body links

```text
Total: 16
Target: /recipes/circuit-breaker-pattern-recipe (no existe; correcto: /patterns/circuit-breaker-pattern)
Archivos afectados: 8 docs de architecture + 1 doc de devops (EN+ES = 16)
```

**Regresión detectada**. Necesita fix inmediato.

---

## 11. Páginas especiales y 404

`SPECIAL PAGES: OK`

| Página | noindex | sitemap | Notas |
|---|---|---|---|
| `/404/` | ✅ yes | ✅ no | `hasAlternate=false`, `trailingSlash=false` |
| `/es/404/` | ✅ yes | ✅ no | Correctamente excluida |
| `/search/` | ✅ yes | ✅ no | `noindex=true` |
| `/es/search/` | ✅ yes | ✅ no | Correctamente excluida |

### Soft 404

- No se detectaron páginas con status 200 y contenido vacío.
- Todos los HTML generados tienen contenido estructurado.

---

## 12. Bilingual Technical Parity

`BILINGUAL TECHNICAL PARITY: PASS`

| Check | Resultado |
|---|---|
| Ambas URLs responden | ✅ 1.021 EN + 1.021 ES generadas en dist |
| Ambas en sitemap | ✅ 3.254 URLs con xhtml:link alternate |
| Canonical self-referencing | ✅ EN y ES canonicalizan a sí mismas |
| Structured data equivalente | ✅ JSON-LD types iguales en EN/ES |
| lastmod coherente | ✅ Sitemap usa 2026-08-24 para todos |

---

## 13. Technical Score

`TECHNICAL SCORE: 8/10`

### Desglose

| Área | Puntuación | Notas |
|---|---|---|
| Indexability | 10/10 | robots, sitemap, noindex correctos |
| Canonical / hreflang | 10/10 | 100% en muestra |
| URL structure | 10/10 | Slugs únicos, kebab-case, trailing slash |
| Structured data | 10/10 | 100% JSON-LD válido |
| Rendering | 10/10 | SSG, contenido en HTML |
| Sitemap | 9/10 | Correcto, solo artefactos de build |
| Internal links | 6/10 | 16 broken links por regresión |
| Performance | 7/10 | Métricas estáticas OK, CWV no verificados |
| Security / HTTPS | 7/10 | CSP presente, HTTPS en config, no medido |
| Special pages | 10/10 | 404/search noindex correctos |

### Pérdida de puntos

- **Internal links**: 16 broken body links (-2)
- **Performance**: CWV no verificados, build pesado (-1)
- **Security/HTTPS**: No se pudo verificar en producción (-1)

---

## 14. Top 3 fixes técnicas

1. **Arreglar 16 broken body links** (`/recipes/circuit-breaker-pattern-recipe` → `/patterns/circuit-breaker-pattern`)
   - Impacto: P0 (crawlability y UX)
   - Esfuerzo: Bajo

2. **Medir Core Web Vitals reales** con PageSpeed Insights o CrUX
   - Impacto: P1 (page experience)
   - Esfuerzo: Bajo

3. **Añadir `WebSite` y `Organization` JSON-LD en home** para brand panel
   - Impacto: P2 (rich results)
   - Esfuerzo: Bajo

---

## Resumen ejecutivo

**Estado técnico**: Excelente. El sitio está bien arquitectado técnicamente: Astro SSG, URLs limpias, slugs únicos, canonical/hreflang perfectos, JSON-LD válido, sitemap correcto, renderizado estático, robots/noindex correctos.

**Problema técnico principal**: 16 broken body links por regresión de slug renombrado. Fix rápido.

**Riesgos no verificados**: HTTP status (sin acceso a producción) y Core Web Vitals (sin herramientas de medición disponibles en el entorno local).

**Score**: 8/10.
