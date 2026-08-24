# SESSION_HISTORY.md

Historial completo de trabajo en StackPractices. Última actualización: 2026-08-22.

Este archivo documenta todo el trabajo realizado para que una nueva sesión tenga contexto completo sin necesidad de leer el historial del chat.

---

## 1. Contexto del proyecto

- **Repositorio**: `D:\Codigo\stack-practices-web`
- **Dominio**: `https://stackpractices.com`
- **Branch**: `main`
- **Stack**: Astro 5+ (SSG), Tailwind CSS v4+, Pagefind, GitHub Pages
- **Analytics**: GA4 `G-RBE12WJ5KZ`, GTM `GTM-M66C9FWN`
- **Content types**: `recipes`, `patterns`, `guides`, `docs`
- **Bilingüe**: EN + ES (cada `.md` tiene su `.es.md`)
- **Total páginas**: 3.258
- **Total Markdown**: 2.042 archivos
- **URLs en sitemap**: 3.254

### Estructura de contenido

```text
src/content/{tipo}/{slug}.md          # English
src/content/{tipo}/{slug}.es.md       # Spanish
src/content/{tipo}/{topic}/{slug}.md  # Con subdirectorio de tema
```

### Rutas publicadas

- EN: `/{tipo}/{slug}/`
- ES: `/es/{tipo}/{slug}/`

### Targets de palabras (body, sin frontmatter)

Actualizados el 2026-08-22:

| Tipo | Target | Mínimo validador (build-safe) |
|---|---:|---:|
| `recipes` | 1.300 | 300 |
| `patterns` | 1.500 | 400 |
| `guides` | 3.000 | 500 |
| `docs` | 3.000 | 200 |

### Comandos de validación

```bash
npm run content:quality    # 0 errors, 0 warnings
npm run content:links      # 0 broken relatedResources
npm run content:validate   # review warnings
npm run check              # 0 errors, 0 warnings (hints OK)
npm run build              # 3258 páginas
npm run sitemap            # regenera public/sitemap.xml
```

### Scripts creados en esta sesión

```text
scripts/fix-broken-internal-links.py       # Arregla patrón /tipo/topic/slug -> /tipo/slug
scripts/fix-remaining-broken-links.py      # Arregla slugs renombrados (circuit-breaker-pattern-recipe, etc.)
scripts/find-broken-body-links.py          # Audita body links rotos
scripts/fix-bidirectional-link-gaps.py     # Arregla relatedResources bidireccionales
scripts/fix-bidirectional-gaps-v2.py       # Arregla bidirectional gaps con body links consolidados
scripts/fix-bidirectional-gaps-body.py     # Versión inicial (descartada)
scripts/fix-low-incoming-links.py          # Añade incoming links desde same-topic resources
scripts/fix-docs-body-links.py             # Añade body links a docs con 0-1 links
scripts/audit-thin-content.py              # Audita thin content contra nuevos targets
```

---

## 2. Trabajo anterior a esta sesión

### Recursos 90-95 auditados y mejorados (commit `1cd4e39e`)

### Recursos 96-100 auditados y mejorados (commit `9f86a6d9`)

- `onion-architecture-guide`
- `grafana-dashboards-observability`
- `javascript-debounce-throttle-implementation`
- `python-prometheus-metrics-exporter`
- `complete-guide-graphql-federation`

### Audit suite creada (commit `df992fb9`)

Suite completa de prompts de auditoría adaptada de QAPractices a StackPractices:

```text
ref/audit/00-master-audit.md
ref/audit/01-technical-audit.md
ref/audit/02-seo-audit.md
ref/audit/03-content-quality-audit.md
ref/audit/04-humanization-audit.md
ref/audit/05-bilingual-parity-audit.md
ref/audit/06-geo-audit.md
ref/audit/07-final-synthesis.md
ref/audit/08-gsc-ga4-traffic-audit.md
ref/audit/99-site-wide-audit.md
ref/audit/README.md
ref/audit/RESOURCE_FULL_AUDIT.md
ref/audit/reports/.gitkeep
```

Incluye checks para: SEO técnico, metadata, canonical, hreflang, sitemap, structured data, performance, content quality, humanization, bilingual parity, GEO, GSC/GA4, site-wide issues, broken links, bidirectional gaps, low incoming links, low body links, special pages, soft-404.

Markdown lint: 0 issues.

### Checklist global creada

`ref/ALL_PROBLEMS_CHECKLIST.md` — consolidación de todos los problemas detectados.

---

## 3. Trabajo de esta sesión

### Fase 1 — Técnico / SEO

#### 1.1 Canonical mismatch en /404/ — ✅ Resuelto

**Problema**: La página EN 404 usaba `path="/404.html"` con `trailingSlash={false}`. La ES usaba `path="/404"` sin `trailingSlash`. Los hreflang generaban URLs inválidas (`/es/404.html` no existe).

**Solución**: Editados `src/pages/404.astro` y `src/pages/es/404.astro` para deshabilitar la generación de hreflang alternates (`hasAlternate={false}`) ya que ambas páginas son `noindex,nofollow`.

**Commit**: `ed9df256`

#### 1.2 URLs en dist no en sitemap — ✅ Resuelto (no requería cambios)

Las 4 URLs (`/404/`, `/es/404/`, `/search/`, `/es/search/`) tienen `noindex` y correctamente NO están en el sitemap. Comportamiento correcto.

#### 1.3 Enlaces rotos — ✅ Resuelto

**Problema**: 118 body links rotos en el markdown:
- 60 links con patrón `/tipo/topic/slug` que debería ser `/tipo/slug`
- 58 links con slugs renombrados (ej: `circuit-breaker-pattern-recipe` → `circuit-breaker-pattern`)

**Solución**: Scripts `fix-broken-internal-links.py` y `fix-remaining-broken-links.py`. 70 archivos modificados.

**Verificación**: `find-broken-body-links.py` reporta 0 broken. `content:links` reporta 0 broken relatedResources.

**Commit**: `ed9df256`

### Fase 2 — Enlaces internos

#### 2.1 Bidirectional link gaps (24 pares) — ✅ Resuelto

**Problema**: 24 pares de recursos donde A enlaza a B pero B no enlaza a A.

**Solución**:
- 4 relatedResources añadidos directamente (donde había espacio)
- 38 body links añadidos con frases consolidadas naturales en el Overview:
  - EN: `Related recipes: [X](/x), [Y](/y), and [Z](/z).`
  - ES: `Recursos relacionados: [X](/x) y [Y](/y).`
- 26 archivos modificados (EN+ES)
- Títulos ES obtenidos de los archivos `.es.md` correspondientes

**Commit**: `83807eab`

#### 2.2 Páginas con pocos incoming links (8 páginas) — ✅ Resuelto

**Problema**: 8 páginas con solo 2 incoming links cada una.

**Solución**: 48 enlaces contextuales `See also` / `Ver también` añadidos desde recursos del mismo topic cluster. Cada archivo recibe un solo enlace (sin duplicación). 48 archivos modificados (EN+ES).

Targets:
- `/recipes/nodejs-caching-redis`
- `/recipes/server-sent-events-node`
- `/recipes/http-cache-control-headers`
- `/recipes/deep-clone-structured`
- `/recipes/nodejs-file-upload-validation`
- `/recipes/debounce-throttle`
- `/patterns/llm-fallback-pattern`
- `/patterns/specification-pattern`

**Commit**: `ce81c2ae`

#### 2.3 Docs con 0-1 links en el cuerpo (30 docs) — ✅ Resuelto

**Problema**: 30 docs templates con 0 o 1 body links.

**Solución**: 180 enlaces contextuales añadidos en el Overview de 60 archivos (30 docs EN+ES). Frase consolidada: `Related resources: [X](/x), [Y](/y), and [Z](/z).` / `Documentos relacionados: [X](/x), [Y](/y) y [Z](/z).`

**Nota**: El primer intento usaba secciones `## Related Resources` manuales, pero el validador `content:quality` las rechaza. Se cambió a frases inline en el Overview.

**Commit**: `784bf2b4`

### Fase 3 — Thin content — ⏭️ Deferred

**Problema**: Con los nuevos targets (recipes 1.300, patterns 1.500, guides 3.000, docs 3.000), 1.784 archivos están por debajo.

**Decisión**: El usuario decidió que el thin content se abordará recurso por recurso en el workflow de mejora de contenido, no en batch.

### Fase 4 — Top-100 CTR 0% — ⏭️ Deferred

**Decisión**: El usuario decidió que los 26 recursos top-100 con CTR 0% se auditarán poco a poco, no en batch.

### Fase 5 — Limpiar ref/output/ — Pendiente

211 archivos en `ref/output/` (37 .md, 174 .json) pendientes de revisión/limpieza.

### Actualización de targets y checklist

**Commits**: `c9334751`, `316eafd3`

Archivos actualizados con los nuevos targets de palabras:
- `.devin/skills/content-improvement/SKILL.md`
- `.devin/skills/content-improvement/reference/prompt-19-first-pass-perfect.md`
- `.devin/skills/content-improvement/reference/workflow-guide.md`
- `.devin/skills/content-improvement/reference/perfect-close-checklist.md`
- `ref/audit/03-content-quality-audit.md`
- `ref/audit/05-bilingual-parity-audit.md`

Checklist limpiada: removidos todos los items resueltos y los deferred (thin content, top-100 CTR).

---

## 4. Commits de esta sesión

| Commit | Descripción | Pusheado |
|---|---|---|
| `ed9df256` | fix: repair broken internal links and 404 hreflang | ✅ |
| `83807eab` | fix: close 24 bidirectional link gaps with contextual body links | ✅ |
| `ce81c2ae` | fix: add incoming links to 8 pages with low inbound link count | ✅ |
| `784bf2b4` | fix: add contextual body links to 30 docs with 0-1 links | ❌ |
| `c9334751` | docs: update word-count targets and clean checklist | ❌ |
| `316eafd3` | docs: remove top-100 CTR items from checklist (deferred) | ❌ |

**3 commits sin pushear** (el usuario pidió no pushear para ahorrar cuota de GitHub Actions).

---

## 5. Estado actual de ALL_PROBLEMS_CHECKLIST.md

```text
## 2.2 Pendiente
- Thin content: 1.784 archivos (deferred a workflow por-recurso)

## 3. Roadmap de contenido pendiente
- Batch 3: 50 recipes, 40 patterns, 35 guides, 25 docs

## 4. Artefactos de auditoría (ref/output)
- 211 archivos a limpiar
- Priorizar api-documentation-openapi (12 reports)

## 5. Observaciones GA4/GSC
- CTR bajó 0,50% → 0,31%
- api-documentation-openapi: 1.166 imp, 2 clics (0,17% CTR)
- optimistic-locking: página con más clics (3)
- GA4: 41 sesiones, 68 pageviews, 13 usuarios en 28 días
```

---

## 6. Pendiente para la próxima sesión

### Inmediato

- **Pushear** los 3 commits pendientes (`784bf2b4`, `c9334751`, `316eafd3`) cuando el usuario dé permiso.
- **Limpiar `ref/output/`** — 211 archivos de auditorías pasadas. Decidir qué conservar y qué borrar.

### Workflow continuo (por recurso)

- **Thin content**: Expandir contenido recurso por recurso hasta llegar a los targets (recipes 1.300, patterns 1.500, guides 3.000, docs 3.000).
- **Top-100 CTR 0%**: Auditar y mejorar los 26 recursos con 0% CTR. Priorizar `api-documentation-openapi` (1.166 impresiones, 0,17% CTR).
- **Roadmap Batch 3**: 150 recursos nuevos pendientes.

### Áreas no auditadas aún

| Área | Qué revisar |
|---|---|
| Meta descriptions | Duplicadas, fuera de rango (50-170), missing |
| Titles | Duplicados, >60 chars, missing |
| Structured data | JSON-LD válido, sin errores Rich Results Test |
| Hreflang | EN/ES pairs completos, sin URLs inválidas |
| Sitemap | URLs con lastmod real, sin entradas duplicadas |
| Open Graph | og:image, og:type, og:locale en todas las páginas |
| Accessibility | WCAG 2.2: alt text, ARIA, contraste, keyboard nav |
| Performance | Core Web Vitals, LCP, CLS, INP |
| External links | Rotos o que apuntan a sites deprecados |
| Duplicate content | Recursos con contenido muy similar |
| Image optimization | WebP/AVIF, lazy loading, dimensiones |
| Build size | 131.8 MB de HTML — ¿se puede reducir? |

---

## 7. Reglas y preferencias del usuario

- **No pushear** sin permiso explícito (ahorrar cuota de GitHub Actions).
- **AI detector**: usar Desklib, no la versión light.
- **No modificar** el repositorio QAPractices (`D:\Codigo\qa-practices-web`).
- **No modificar** `.npmrc`, CI/CD, security configuration.
- **Static-first**: no añadir backend, database, auth, etc.
- **Bilingüe siempre**: cada cambio debe aplicarse a EN y ES.
- **No secciones `## Related Resources` manuales** en el body — el validador las rechaza. Usar frases inline en el Overview.
- **Targets de palabras**: recipes 1.300, patterns 1.500, guides 3.000, docs 3.000.
- **Thin content y top-100 CTR**: se hacen recurso por recurso, no en batch.
- **Commits**: mensaje conciso, significativo, sin mencionar AI tools.
- **PowerShell**: usar `;` no `&&` para encadenar comandos.

---

## 8. Archivos clave de referencia

```text
ref/ALL_PROBLEMS_CHECKLIST.md          # Checklist global (actualizada)
ref/checklist-top-recursos-mejoras.md  # Checklist top-100 recursos
ref/audit/                              # Suite de auditoría completa
ref/content-roadmap.md                  # Roadmap de contenido
ref/docs/                               # Documentación técnica del proyecto
AGENTS.md                               # Reglas del proyecto
src/content.config.ts                   # Schemas Zod de content collections
src/layouts/BaseLayout.astro            # Layout con SEO, nav, footer
src/components/Seo.astro                # Componente SEO (canonical, hreflang, JSON-LD)
.devin/skills/content-improvement/      # Skill de mejora de contenido
.devin/skills/stackp-content-creator/   # Skill de creación de contenido
scripts/                                # Scripts de validación y fix
```
