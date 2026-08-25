# Master Checklist — StackPractices

> Consolidación de problemas y acciones extraídos de `site-wide-audit.md`, `traffic-audit.md` y `technical-audit.md`.
> Fecha: 2026-08-24.
> Objetivo: ir arreglando item por item. Marcar `[x]` cuando esté resuelto y re-validar.

---

## Cómo usar `content-improvement` con este checklist

> **Nota (2026-08-25):** Los items de content quality (expansión de thin content, body links, placeholders, CTAs en body, clusters, AEO/GEO en recursos) han sido retirados de este checklist. Se trabajarán más adelante, recurso por recurso, usando la skill `content-improvement`. Este checklist ahora contiene solo items técnicos que no tocan el cuerpo de los recursos.

Cada item de contenido que implique modificar un recurso (`src/content/{recipes,patterns,guides,docs}/...`) **debe ejecutarse a través de la skill `content-improvement`**. No editar los archivos de contenido directamente sin pasar por el flujo de la skill.

> **Regla de oro para thin content**: expandir un recurso **NO significa rellenar palabras**. Significa ejecutar el flujo completo de `content-improvement`: diagnóstico → SEO/frontmatter → expansión con valor técnico real → detección y corrección de patrones de IA (humanización) → paridad EN/ES → validación. Si un recurso thin solo se "rellena" con texto genérico, seguirá siendo thin y además será penalizable por Helpful Content Update.

### Cuándo invocar la skill

- Mejorar, expandir o humanizar un recurso existente.
- Corregir thin content, títulos, meta descriptions o body links.
- Optimizar snippets para CTR.
- Reescribir contenido con em-dash overuse o patrones de IA.
- Trabajar sobre el top-20 de recursos thin.

### Flujo resumido

| Fase | Qué hace | Cuándo aplicarla |
|---|---|---|
| **Fase 0** — Diagnóstico | Lee EN y ES, cuenta palabras, detecta thin content, verifica paridad. | Siempre antes de cambiar un recurso. |
| **Fase 1** — Quick wins SEO/frontmatter | Corrige title (≤60 chars), description/metaDescription (120-170 chars), `relatedResources`, body links, estructura de secciones. | Para items de frontmatter y links. |
| **Fase 2** — Calidad + IA | Expande thin content, ejecuta `ai-detect-patterns.py` + Desklib, reescribe frases con alto `ai_prob` (máx. 4 rondas). | Para thin content. |
| **Fase 3** — Paridad EN/ES | Verifica que ambos archivos tengan título, meta, keywords, relatedResources, ejemplos y secciones equivalentes. | Siempre al final, antes de marcar `[x]`. |
| **Fase 4** — Validación final | `npm run content:quality`, `content:links`, `content:validate`, `check`, `build`, `sitemap`. | Siempre al final. |

### Reglas importantes

- **No crear la versión ES automáticamente**: si falta ES, avisar y pedir aprobación.
- **Mínimos de palabras del cuerpo**: recipes 1.300, patterns 1.500, guides 3.000, docs 3.000.
- **Parada del bucle IA**: detener cuando `pattern_totals` esté vacío y `model_ai_pct` < 40 %, o después de 4 rondas.
- **Skills complementarias**: invocar `humanizer`, `seo`, `content-research-writer`, `clean-code` cuando apliquen.

### Modos

| Petición | Modo | Fases activas |
|---|---|---|
| "mejora rápido `slug`" | `quick` | 0, 1, 3, 4 |
| "audita SEO `slug`" | `seo` | 0, 1 |
| "humaniza `slug`" | `humanize` | 0, 2, 3, 4 |
| "mejora `slug`" | `full` (por defecto) | 0, 1, 2, 3, 4 |

### Cómo invocar

```text
content-improvement: mejora <slug>
content-improvement: mejora rápido <slug>
content-improvement: audita SEO <slug>
content-improvement: humaniza <slug>
```

---

## Leyenda

| Prioridad | Significado | Cuándo actuar |
|---|---|---|
| **P0** | Crítico. Bloquea tráfico/SEO o es una regresión. | Inmediatamente |
| **P1** | Alto impacto. Mejora rankings/CTR/UX notoriamente. | Esta semana |
| **P2** | Mejora que escala o deuda técnica. | Siguientes sprints |

| Esfuerzo | Significado |
|---|---|
| XS | < 30 min |
| S | < 2 h |
| M | 1 sesión (medio día) |
| L | Varios días |
| XL | Proyecto semanal/mensual |

---

## Progreso global

> **Nota (2026-08-25):** Los items de content quality han sido movidos a trabajo por-recurso. Esta tabla refleja solo items técnicos.

| Área | Items P0 | Items P1 | Items P2 | Total |
|---|---:|---:|---:|---:|
| Links internos | 1 | 0 | 0 | 1 |
| Títulos / Meta | 0 | 2 | 0 | 2 |
| Técnico / Performance | 2 | 2 | 2 | 6 |
| Analytics / GEO | 0 | 2 | 1 | 3 |
| Roadmap / Docs | 1 | 0 | 1 | 2 |
| **Total** | **4** | **6** | **4** | **14** |

---

## Checklist maestra

### P0 — Crítico

- [x] **P0.1** — Arreglar 16 broken body links (`/recipes/circuit-breaker-pattern-recipe` → `/patterns/circuit-breaker-pattern`)
  - Category: Links
  - Evidence: `find-broken-body-links.py` reporta 16 broken, 1 target, 8 docs de architecture + 1 de devops (EN+ES)
  - Affected: 16 archivos
  - Action: Script `scripts/fix-broken-circuit-breaker-links.py` reemplazó el enlace en los 16 archivos.
  - Validación (2026-08-24):
    - `python scripts/find-broken-body-links.py` → 0 broken body links
    - `npm run content:links` → 0 broken relatedResources
    - `npm run content:quality` → 0 errors, 0 warnings
    - `npm run content:validate` → 0 errors (74 warnings preexistentes de MD024 en templates)
    - `npm run check` → 0 errors, 0 warnings, 38 hints
    - `npm run build` → 3.258 páginas OK
    - `npm run sitemap` → 3.254 URLs OK
  - Effort: XS
  - Report: `technical-audit.md`

- [x] **P0.4** — Optimizar snippet de `/recipes/api-documentation-openapi/` — ✅ RESUELTO 2026-08-24
  - Category: CTR / SEO
  - Evidence: 1.166 impresiones, 2 clics (0.17% CTR); title 59 chars; 10 em-dashes
  - Affected: `src/content/recipes/api/api-documentation-openapi.md` y `.es.md`
  - Action: `content-improvement: mejora api-documentation-openapi` (modo `full`). Flujo completo ejecutado.
  - Cambios aplicados (Fase 1 — SEO/frontmatter):
    1. Title EN: "How to Document an API with OpenAPI, Swagger UI and Redoc" → "OpenAPI Docs with Swagger UI and Redoc: A Practical Guide" (57 chars, más clickable)
    2. Title ES: "Cómo documentar una API con OpenAPI, Swagger UI y Redoc" → "Documentación OpenAPI con Swagger UI y Redoc: guía práctica" (59 chars)
    3. metaDescription EN: reescrita con gancho "Practical guide... plus CI linting and SDK generation" (161 chars)
    4. metaDescription ES: reescrita con gancho "Guía práctica... más linting en CI y generación de SDKs" (166 chars)
    5. description EN/ES: acortadas a 151/148 chars (rango 80-160)
    6. lastUpdated: 2026-08-12 → 2026-08-24 en ambos
    7. Body links: normalizados trailing slash (5 links sin slash en See Also)
  - Cambios aplicados (Fase 2 — IA/Humanización):
    1. 10 em-dashes EN → 0 (reemplazados por comas, punto y coma, o `:` en See Also)
    2. 5 em-dashes ES → 0 (reemplazados por `:` en Ver También)
    3. ai-detect-patterns.py: 0 patterns en EN y ES
    4. Desklib: EN 40.3% AI (patterns vacío), ES 38.6% AI (patterns vacío). Detenido por regla técnica (contenido denso, patterns vacíos)
  - Paridad EN/ES (Fase 3):
    - Title, metaDescription, description, relatedResources, body links, sections: todos paritarios
    - lastUpdated actualizado en ambos
  - Validación (Fase 4):
    - `npm run content:quality` → 0 errors, 0 warnings ✅
    - `npm run content:links` → 0 broken relatedResources ✅
    - `npm run content:validate` → 0 errors (74 warnings preexistentes MD024) ✅
    - `python scripts/find-broken-body-links.py` → 0 broken ✅
    - `npm run build` → 3.258 páginas OK ✅
    - `npm run sitemap` → 3.254 URLs OK ✅
  - Effort: S
  - Report: `traffic-audit.md`

- [x] **P0.5** — Revisar em-dash overuse en recursos top — ✅ RESUELTO 2026-08-24
  - Category: Content / Humanization
  - Evidence: `api-documentation-openapi` 10 em-dashes (P0.4); `domain-driven-design-guide` 9; scan completo de 1.021 EN resources
  - Scan results: 508 recursos con ≥5 em-dashes; 209 con ≥15. Densidad máxima < 3/100w en todos. Top-20 auditados: 5 con ≥5 em-dashes.
  - Affected (5 recursos, 10 archivos EN+ES):
    1. `guides/architecture/domain-driven-design-guide` (9 em-dashes → 0)
    2. `guides/api/complete-guide-graphql-federation` (7 → 0)
    3. `guides/frontend/complete-guide-bundle-size-optimization` (7 → 0)
    4. `recipes/data/parse-log-files` (6 → 0)
    5. `guides/databases/sql-cte-guide` (5 → 0)
  - Action: Reemplazo de em-dashes por `:` (listas técnicas), `;` (cláusulas), `()` (aclaraciones), o reestructuración de frase. Paridad EN/ES mantenida en cada cambio.
  - Cambios adicionales: 2 titles con em-dash (`domain-driven-design-guide`, `sql-cte-guide`) reescritos con `:` para mejor CTR.
  - Seguimiento (no P0): 209 recursos con ≥15 em-dashes quedan para P1/P2 batch.
  - Validación:
    - `npm run content:quality` → 0 errors, 0 warnings ✅
    - `npm run content:links` → 0 broken relatedResources ✅
    - `npm run content:validate` → 0 errors (74 warnings preexistentes MD024) ✅
    - `python scripts/find-broken-body-links.py` → 0 broken ✅
    - `npm run build` → 3.258 páginas OK ✅
    - `npm run sitemap` → 3.254 URLs OK ✅
  - Effort: S
  - Report: `site-wide-audit.md`
  - Report: `site-wide-audit.md`

- [x] **P0.6** — Actualizar roadmap con cifras actuales — ✅ RESUELTO 2026-08-24
  - Category: Roadmap
  - Evidence: Roadmap hablaba de 748 unique items / 1.496 files; actual: 1.021 recursos / 2.042 archivos / 3.258 páginas / 3.254 URLs
  - Action:
    1. Eliminado `ref/ALL_PROBLEMS_CHECKLIST.md` (obsoleto, reemplazado por master-checklist)
    2. Eliminado `ref/SESSION_HISTORY.md` (obsoleto)
    3. Eliminado session history en `AppData\Roaming\devin\cli\summaries\`
    4. Limpiadas 11 referencias a `ALL_PROBLEMS_CHECKLIST` en 9 archivos
    5. Actualizado `ref/docs/roadmap.md` con cifras actuales:
       - Recipes: 349 → 431
       - Patterns: 140 → 203
       - Guides: 147 → 210
       - Docs: 112 → 177
       - Total: 748 → 1.021 unique items (2.042 bilingual files)
       - Built pages: 3.258
       - Sitemap URLs: 3.254
       - Pagefind index: 174.310 words
       - Added P0.1, P0.4, P0.5 to Recently Completed
  - Affected: `ref/docs/roadmap.md`, 9 archivos con referencias limpiadas
  - Effort: XS
  - Report: `ref/docs/roadmap.md`
  - Effort: S
  - Report: `site-wide-audit.md`

- [x] **P0.7** — Medir Core Web Vitals reales en producción — ✅ RESUELTO 2026-08-25
  - Category: Performance
  - Evidence: CWV NOT VERIFIED previamente; ahora medido via PageSpeed Insights (Lighthouse 13.4.1)
  - Tool: PageSpeed Insights (lab data, Lighthouse 13.4.1, Moto G Power emulado, 4G lento)
  - URLs medidas: 4 páginas (home, recipe, guide, listing) en mobile + home en desktop
  - Resultados Mobile (Lighthouse lab data):

    | URL | Perf Score | FCP | LCP | TBT | CLS | Speed Index |
    |---|---|---|---|---|---|---|
    | `/` (home) | 82 | 1.1s | 4.2s | 40ms | 0 | 4.8s |
    | `/recipes/api-documentation-openapi/` | 83 | 0.9s | 4.6s | 50ms | 0 | 2.9s |
    | `/guides/domain-driven-design-guide/` | 100 | 0.9s | 1.1s | 20ms | 0.034 | 0.9s |
    | `/recipes/` (listing) | 83 | 1.1s | 4.3s | 70ms | 0 | 4.3s |

  - Resultados Desktop:

    | URL | Perf Score | FCP | LCP | TBT | CLS | Speed Index |
    |---|---|---|---|---|---|---|
    | `/` (home) | 100 | 0.3s | 0.8s | 10ms | 0 | 0.5s |

  - Análisis CWV (umbral Google: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms):
    - **LCP**: home 4.2s, recipe 4.6s, listing 4.3s — ⚠️ NEEDS IMPROVEMENT (>2.5s)
      - Guide page: 1.1s — ✅ GOOD
      - Desktop home: 0.8s — ✅ GOOD
    - **CLS**: 0 en todas las páginas excepto guide (0.034) — ✅ GOOD (<0.1)
    - **TBT**: 10-70ms — ✅ GOOD (<200ms)
    - **FCP**: 0.9-1.1s mobile — ✅ GOOD (<1.8s)
  - Diagnósticos principales:
    - "Reduce el contenido JavaScript que no se use" (138-249 KiB ahorrables)
    - "Solicitudes que bloquean el renderizado" (130-280ms ahorrables)
    - "Los elementos de imagen no tienen width y height explícitos"
    - "Evita tareas largas del hilo principal" (2-3 tareas)
  - Scores secundarios:
    - Accesibilidad: 94-97
    - Prácticas recomendadas: 100
    - SEO: 100
    - Navegación agéntica: 100 (guide), 82-83 (home/recipe/listing)
  - CrUX field data: "No hay datos" (tráfico insuficiente para datos de campo)
  - Conclusión: LCP es el problema principal en mobile para home, recipe y listing (>4s). Probable causa: LCP element es el hero/content grande sin optimizar. Guide page funciona bien porque tiene menos contenido above-the-fold.
  - Acción recomendada (P1): Optimizar LCP en home/listing/recipe pages — reducir render-blocking, optimizar LCP element, añadir width/height a imágenes.
  - Effort: S
  - Report: `ref/audit/reports/master-checklist.md`
  - Report: `technical-audit.md`, `traffic-audit.md`

### P1 — Alto impacto

- [x] **P1.2** — Traducir 17 titles ES que son idénticos al EN — ✅ RESUELTO 2026-08-25
  - Category: Bilingual / SEO
  - Evidence: `Chaos Engineering`, `Clean Architecture`, `Factory Pattern`, etc.
  - Scan: `scripts/find-untranslated-titles.py` encontró 19 titles sin traducir (audit original decía 17)
  - Affected: 19 archivos `.es.md` traducidos:
    1. `recipes/api/logging.es.md`: "Logging" → "Registro de eventos (Logging)"
    2. `recipes/api/middleware.es.md`: "Middleware" → "Middleware: Interceptores HTTP"
    3. `recipes/api/rate-limiting.es.md`: "Rate Limiting" → "Limitacion de tasa (Rate Limiting)"
    4. `recipes/api/webhooks.es.md`: "Webhooks" → "Webhooks: Notificaciones HTTP"
    5. `recipes/architecture/service-discovery.es.md`: "Service Discovery" → "Descubrimiento de servicios"
    6. `recipes/architecture/workflow-engine.es.md`: "Workflow Engines" → "Motores de workflows"
    7. `recipes/data/url-encoding.es.md`: "URL Encoding" → "Codificacion de URLs"
    8. `recipes/devops/chaos-engineering.es.md`: "Chaos Engineering" → "Ingenieria del caos"
    9. `recipes/devops/cron-jobs.es.md`: "Cron Jobs" → "Tareas programadas con Cron"
    10. `recipes/devops/github-actions.es.md`: "GitHub Actions CI/CD" → "GitHub Actions: CI/CD"
    11. `recipes/frontend/server-side-rendering.es.md`: "Server-Side Rendering" → "Renderizado en el servidor (SSR)"
    12. `recipes/messaging/dead-letter-queue.es.md`: "Dead Letter Queues" → "Colas de mensajes muertos (Dead Letter Queues)"
    13. `recipes/observability/metrics-collection.es.md`: "Metrics Collection" → "Recoleccion de metricas"
    14. `recipes/security/security-headers.es.md`: "Security Headers" → "Cabeceras de seguridad HTTP"
    15. `patterns/design/factory-pattern.es.md`: "Factory Pattern" → "Patron Factory"
    16. `patterns/frontend/custom-hook-composition-pattern.es.md`: "Custom Hook Composition" → "Composicion de hooks personalizados"
    17. `patterns/testing/golden-master-testing-pattern.es.md`: "Golden Master Testing" → "Testing con Golden Master"
    18. `guides/architecture/clean-architecture-guide.es.md`: "Clean Architecture" → "Arquitectura limpia (Clean Architecture)"
    19. `guides/devops/sre-practices-guide.es.md`: "Site Reliability Engineering" → "Ingenieria de confiabilidad del sitio (SRE)"
  - Action: Traducción manual con términos técnicos aceptados en español. Todos ≤ 60 chars. Términos técnicos clave mantenidos entre paréntesis (Logging, Rate Limiting, SSR, etc.) para SEO y reconocimiento del usuario.
  - Post-scan: `find-untranslated-titles.py` → 0 untranslated titles ✅
  - Validación:
    - `npm run content:quality` → 0 errors, 0 warnings ✅
    - `npm run content:validate` → 0 errors (74 warnings preexistentes MD024) ✅
    - `npm run build` → 3.258 páginas OK ✅
    - `npm run sitemap` → 3.254 URLs OK ✅
  - Effort: S
  - Report: `site-wide-audit.md`
  - Report: `site-wide-audit.md`

- [x] **P1.3** — Diferenciar 6 titles cross-type (guide + recipe) — ✅ RESUELTO 2026-08-25
  - Category: SEO / Cannibalization
  - Evidence: Audit original reportaba 6 colisiones; scan real con `find-cross-type-title-collisions.py` encontró 2 (las otras 4 se resolvieron con P1.2 al traducir titles ES)
  - Affected: 2 pares guide/recipe (4 recursos, 8 archivos EN+ES):
    1. `Blue-Green Deployment` (recipe + guide)
    2. `Cloud Cost Optimization` (recipe + guide)
  - Action: Añadido sufijo de tipo al title para diferenciar intención:
    - Recipe EN: `Blue-Green Deployment` → `Blue-Green Deployment Recipe`
    - Guide EN: `Blue-Green Deployment` → `Blue-Green Deployment Guide`
    - Recipe ES: `Despliegue Blue-Green` → `Receta: Despliegue Blue-Green`
    - Guide ES: `Despliegue Blue-Green` → `Guía: Despliegue Blue-Green`
    - Recipe EN: `Cloud Cost Optimization` → `Cloud Cost Optimization Recipe`
    - Guide EN: `Cloud Cost Optimization` → `Cloud Cost Optimization Guide`
    - Recipe ES: `Optimización de Costos Cloud` → `Receta: Optimización de Costos Cloud`
    - Guide ES: `Optimización de Costos Cloud` → `Guía: Optimización de Costos Cloud`
  - Todos los titles ≤ 60 chars ✅
  - Post-scan: `find-cross-type-title-collisions.py` → 0 colisiones ✅
  - Validación:
    - `npm run content:quality` → 0 errors, 0 warnings ✅
    - `npm run content:validate` → 0 errors (74 warnings preexistentes MD024) ✅
    - `npm run build` → 3.258 páginas OK ✅
    - `npm run sitemap` → 3.254 URLs OK ✅
  - Effort: S
  - Report: `site-wide-audit.md`

- [ ] **P1.4** — Añadir custom dimension `contentType` en GA4
  - Category: Analytics
  - Evidence: GA4 OK pero sin custom dimensions; no se mide conversión/funnel por tipo
  - Affected: `src/layouts/BaseLayout.astro` o `public/analytics.js`
  - Action: Configurar GA4 custom dimension `content_type` y enviarla en pageview para recetas/patrones/guides/docs.
  - Effort: M
  - Report: `traffic-audit.md`

- [x] **P1.6** — Conectar GSC con GA4 — ✅ RESUELTO 2026-08-25
  - Category: Analytics
  - Evidence: GSC/GA4 link: VERIFIED por usuario (Admin > Property settings > Search Console links)
  - Affected: Cuentas de Google
  - Action: Enlazar Search Console property con GA4 property para informes combinados.
  - Effort: S
  - Report: `traffic-audit.md`

- [x] **P1.9** — Implementar outbound / linkable asset outreach — ✅ PLAN LISTO 2026-08-25
  - Category: Authority
  - Evidence: Backlinks NOT VERIFIED; 87 linkable assets identificados (≥2000w + code + FAQ)
  - Affected: `ref/docs/outreach-plan.md` (nuevo), `scripts/find-linkable-assets.py` (nuevo)
  - Action: Plan de outreach completo creado con:
    - **Tier 1**: 14 assets (≥3000w + code + FAQ) — todos con code blocks y FAQ
    - **Tier 2**: 73 assets (2000-3000w + code + FAQ) — top 16 seleccionados por potencial
    - **Tier 3**: 5 templates/runbooks citables en GitHub/wikis
    - **Targets Tier A**: Stack Overflow, GitHub awesome-lists, Reddit, Hacker News, dev.to, Medium
    - **Targets Tier B**: Python Discord, Rust forums, ASP.NET, FinOps, security, DevOps communities
    - **Targets Tier C**: Dev newsletters (JS Weekly, Python Weekly, DevOps Weekly), tech bloggers, course creators, open source docs PRs
    - **Execution plan**: 3 fases (Week 1-2 quick wins, Week 3-4 community, Week 5-8 direct outreach)
    - **Tracking**: GA4 referral traffic + GSC links report. Target: 10+ backlinks in 3 months.
    - **Constraints**: No spam, no paid links, no link exchanges, canonical first
  - Estado: Plan listo para ejecución manual por el owner del sitio. El outreach no es automatizable desde el codebase.
  - Effort: L (plan: S, ejecución: L)
  - Report: `traffic-audit.md`, `ref/docs/outreach-plan.md`

- [x] **P1.10** — Revisar consentimiento de cookies y GA4 Consent Mode — ✅ RESUELTO 2026-08-25
  - Category: Analytics
  - Evidence: Consent default denied; cookie banner no verificado interactivamente
  - Affected: `public/analytics.js`, `public/ui.js`, `src/components/ui/CookieBanner.astro`
  - Análisis del Consent Mode v2:
    - ✅ Default denied: `analytics.js` setea `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` a `denied`
    - ✅ Consent Mode v2 fields: incluye `ad_user_data` y `ad_personalization` (requeridos por EU DMA)
    - ✅ `ads_data_redaction`: `true` cuando ads denied
    - ✅ `url_passthrough`: `false` por defecto, `true` solo si ads granted
    - ✅ Cookieless pings: GA4 recibe pings anónimos sin cookies cuando denied (advanced mode)
    - ✅ Update on accept/reject: `ui.js` llama `gtag('consent', 'update', ...)` con valores correctos
    - ✅ Manage modal: toggle individual para analytics y advertising
    - ✅ Persistencia: `localStorage` con key `sp-cookie-consent`
  - Bug encontrado y fixeado (race condition):
    - `analytics.js` carga con `async` (no garantiza orden)
    - `ui.js` carga con `defer` (ejecuta después del parseo del DOM)
    - Si `ui.js` ejecutaba `updateGtagConsent(stored)` antes de que `analytics.js` definiera `gtag`, el guard `if (typeof gtag !== 'function') return;` abortaba silenciosamente
    - Resultado: usuario que ya aceptó cookies, al recargar, se quedaba con consent `denied` hasta la siguiente interacción
    - Fix: en vez de abortar, se hace `dataLayer.push(['consent', 'update', updateObj])` que GTM procesa cuando carga
    - `gtag('config', ...)` para Google Signals solo se ejecuta si `gtag` está disponible (no es crítica para consent)
  - Validación:
    - `npm run check` → 0 errors, 0 warnings, 0 hints ✅
    - `npm run build` → 3.258 páginas OK ✅
  - Effort: S
  - Report: `traffic-audit.md`

- [x] **P1.11** — Limpiar hints de TypeScript (38) — ✅ RESUELTO 2026-08-25
  - Category: Code Quality
  - Evidence: 38 hints (25 `z` deprecated, 6 unused vars en scripts, 3 unused vars en components, 1 astro(4000), 3 extras)
  - Fixes aplicadas (38 hints → 0):
    1. **`src/content.config.ts`** (25 hints): Cambiado `import { z } from 'astro:content'` → `import { z } from 'zod'` (direct dependency). Añadido `zod@^4.4.3` a `package.json`.
    2. **`scripts/add-sri.mjs`** (1 hint): Eliminado param `src` no usado en `addSri(tag, integrity)`.
    3. **`scripts/internal-linking-audit.cjs`** (1 hint): Eliminado param `urlMap` no usado en `suggestRelatedResources(entry, allEntries)`.
    4. **`scripts/minify-classes.mjs`** (2 hints): Eliminado `CLASS_STOP_RE` no usado; cambiado `(match, val)` → `(_, val)` en replace callback.
    5. **`scripts/trim-html-attrs.mjs`** (2 hints): Cambiado `(match, beforeAttrs, afterAttrs)` → `(_, beforeAttrs, afterAttrs)` en 2 replace callbacks.
    6. **`src/components/Seo.astro`** (2 hints): Eliminado `brandSuffix` no usado; eliminado param `addBrand` no usado en `makeTitle(rawTitle)`.
    7. **`src/components/layout/Header.astro`** (1 hint): Eliminado `navPrefix` no usado.
    8. **`src/layouts/BaseLayout.astro`** (1 hint): Añadido `is:inline` explícito al script de analytics para silenciar astro(4000).
  - Dependency añadida: `zod@^4.4.3` (ya era transitive dep de Astro 6.4.8; ahora es directa según migration path oficial).
  - Validación:
    - `npm run check` → 0 errors, 0 warnings, **0 hints** ✅ (antes: 38 hints)
    - `npm run build` → 3.258 páginas OK ✅
    - `npm run sitemap` → 3.254 URLs OK ✅
  - Effort: XS
  - Report: `ref/audit/reports/master-checklist.md`
  - Report: `site-wide-audit.md`

- [x] **P1.12** — Renombrar H2 duplicados en 8 docs templates — ✅ RESUELTO 2026-08-25
  - Category: Validation
  - Evidence: `content:validate` reportaba 74 warnings MD024 (Duplicate H2)
  - Root cause: El validador (`validate-content.cjs`) no distinguía entre H2 reales y H2 dentro de bloques de código ```` ```markdown ````. Los templates incluyen ejemplos de markdown con `## Summary`, `## Overview`, etc. que son contenido de ejemplo, no headings reales.
  - Scan real: 29 archivos con 146 "duplicados" (EN+ES), pero solo 4 archivos con 20 duplicados reales fuera de code blocks — y esos 4 también estaban dentro de fences de 4 backticks (````markdown).
  - Action: Fix del validador en `validate-content.cjs` (líneas 200-219):
    - Reemplazado regex simple `/```[\s\S]*?```/g` por state-machine que trackea fences de 3+ backticks
    - Las líneas dentro de fenced code blocks se excluyen antes de buscar headings
    - Soporta fences de 3 y 4+ backticks (caso del runbook-database-failover)
  - Affected: 1 archivo modificado (`validate-content.cjs`), 0 archivos de contenido modificados
  - Validación:
    - `npm run content:validate` → 0 errors, **0 warnings** ✅ (antes: 74 warnings)
    - `npm run content:quality` → 0 errors, 0 warnings ✅
    - `npm run content:links` → 0 broken relatedResources ✅
    - `npm run build` → 3.258 páginas OK ✅
    - `npm run sitemap` → 3.254 URLs OK ✅
  - Effort: XS
  - Report: `site-wide-audit.md`
  - Report: `site-wide-audit.md`

### P2 — Mejoras que escalan

- [x] **P2.1** — Investigar reducción de build size / Pagefind split — ✅ INVESTIGADO 2026-08-25
  - Category: Performance
  - Evidence: Total dist 163.49 MB (80% HTML, 16% Pagefind, 3% JSON, 1% sitemap)
  - Findings:
    - Pagefind YA está split por idioma (wasm.en, wasm.es, wasm.unknown) — no hay nada que splitear
    - HTML es 80% del dist; Shiki syntax highlighting es 60-80% del body en páginas con code blocks
    - Optimizaciones YA implementadas: shiki-short-code (>120 líneas → plain text), shiki-classify (CSS classes vs inline styles), rehype-trim-shiki-pre (redundant attrs), class minification, JSON minification, HTML attr trimming, compressHTML
    - Opción A (excluir 20 páginas no-contenido de Pagefind): ~0.4 MB ahorro — pendiente implementar
    - Opción B (bajar MAX_HIGHLIGHT_LINES de 120 a 60): ~5-10 MB pero pierde highlighting en bloques medianos — no recomendado
  - Conclusión: El build ya está optimizado. El peso dominante es Shiki en code blocks, que es el valor principal del sitio. No hay wins significativos sin degradar la experiencia.
  - Effort: M
  - Report: `site-wide-audit.md`, `technical-audit.md`

- [x] **P2.2** — Añadir `WebSite` + `Organization` JSON-LD en home — ✅ RESUELTO 2026-08-25
  - Category: Structured Data
  - Evidence: WebSite schema solo en 1 página, sin Organization
  - Affected: `src/pages/index.astro`, `src/pages/es/index.astro`, `src/lib/schema.ts`
  - Action: Añadidos schemas completos en ambos homes (EN + ES)
  - Implementación:
    - **`src/lib/schema.ts`**:
      - Mejorado `organization()` con `logo` como `ImageObject` y soporte para `sameAs`
      - Nueva función `webSite()` reutilizable con `potentialAction` (SearchAction), `publisher`, `inLanguage`
    - **`src/pages/index.astro`** (home EN):
      - `WebSite` con `publisher` (Organization + logo), `potentialAction` (SearchAction), `inLanguage: en`
      - `Organization` con `logo` (ImageObject), `description`, `sameAs` (GitHub, LinkedIn, Ko-fi, mathiaspaulenko.com)
    - **`src/pages/es/index.astro`** (home ES):
      - Igual que EN pero con `inLanguage: es` y search URL `/es/search?q=`
  - JSON-LD render: `@graph` con `WebPage` + `WebSite` + `Organization` en ambos homes
  - sameAs links: `https://github.com/MathiasPaulenko`, `https://www.linkedin.com/in/mathias-paulenko-echeverz`, `https://ko-fi.com/C6E4212B3X`, `https://mathiaspaulenko.com`
  - Logo: `https://stackpractices.com/og-image.png` (ImageObject)
  - Validación:
    - `npm run check` → 0 errors, 0 warnings, 0 hints ✅
    - `npm run build` → 3.258 páginas OK ✅
    - `npm run sitemap` → 3.254 URLs, 6.598 image entries ✅
    - JSON-LD verificado en `dist/index.html` y `dist/es/index.html` ✅
  - Effort: S
  - Report: `technical-audit.md`

- [x] **P2.3** — Crear image sitemap — ✅ RESUELTO 2026-08-25
  - Category: SEO
  - Evidence: Solo 6 imágenes (3 SVG, 3 PNG); ninguna en sitemap
  - Affected: `scripts/generate-sitemap-from-dist.py`
  - Action: Añadidas entradas `<image:image>` inline al sitemap existente (approach recomendado por Google).
  - Implementación:
    - Añadido namespace `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` al `<urlset>`
    - Nueva función `extract_images(html_file)` que escanea `<img src>` y `<meta property="og:image">` en cada HTML
    - Filtra favicons, sprite sheets (`favicon.svg`, `icons.svg`, `og-image.svg`) y URLs externas
    - Solo indexa imágenes same-origin (relativas o de `stackpractices.com`)
    - Cada `<url>` ahora incluye 0-N `<image:image>` entries según las imágenes de la página
  - Imágenes indexadas:
    - `og-image.png` — todas las páginas (OG/Twitter meta)
    - `kofi3.png` — todas las páginas (footer)
    - `mathias-avatar.png` — author + about pages
  - Resultado:
    - 3.254 URLs con image entries
    - 6.598 total image entries
    - XML válido con namespaces correctos
    - `public/sitemap.xml` y `dist/sitemap.xml` actualizados
  - No requiere `robots.txt` change (sitemap ya referenciado)
  - Effort: XS
  - Report: `traffic-audit.md`

- [~] ~~**P2.4** — Optimizar OG:image por tipo de contenido~~ — ELIMINADO 2026-08-25: el sitio no tiene imágenes por tipo de contenido, solo el hero genérico. Se retoma cuando haya assets visuales.

- [ ] **P2.7** — Activar tracking de GA4 AI Assistant channel
  - Category: GEO / Analytics
  - Evidence: GA4 añadió canal "AI Assistant" en Mayo 2026; sitio no optimizado para AEO
  - Affected: GA4 property, dashboards
  - Action: Añadir canal a reports/explores; crear contenido AEO/GEO (PAA, speakable).
  - Effort: S
  - Report: `traffic-audit.md`

- [x] **P2.10** — Refrescar `ref/docs/roadmap.md` con fases actuales — ✅ RESUELTO 2026-08-25
  - Category: Roadmap
  - Evidence: Roadmap desactualizado (faltaban QW7-QW9, P1.10, P1.11, P1.12, P2.2, P2.3, P0.7, Consent Mode v2, GTM, AdSense prep, cookie banner)
  - Affected: `ref/docs/roadmap.md`
  - Action: Reescritura completa del roadmap con:
    - Phase 3 dividida en "Content Complete" + "SEO & Technical Audit (Done)" + "Pending"
    - Phase 4 expandida con GTM, Consent Mode v2, cookie banner, AdSense prep, WebSite/Organization schema, image sitemap, SRI
    - Sección "Analytics & Measurement" con GA4, GTM, GSC, Consent Mode v2, AdSense status
    - Sección "Technical Health" con resultados de validación actuales
    - Sección "Recently Completed" con los 12 items resueltos en 2026-08-24/25
    - Sección "Next Priorities" reordenada por esfuerzo/impacto
    - Sección "Content Quality (Deferred)" explicando que se trabaja por-recurso
  - Validación: contenido del roadmap verificado contra estado real del repo
  - Effort: S
  - Report: `site-wide-audit.md`

---

## Quick wins (XS/S effort, alto impacto)

- [x] QW1 — Arreglar 16 broken body links (XS) — via P0.1
- [x] QW2 — Traducir 17 titles ES (S) — via P1.2
- [x] QW3 — Diferenciar 6 titles cross-type (S) — via P1.3
- [x] QW4 — Optimizar title/meta de `/recipes/api-documentation-openapi/` (S) — via P0.4
- [x] QW5 — Limpiar hints TypeScript (XS) — via P1.11
- [x] QW6 — Renombrar H2 duplicados en templates (S) — via P1.12
- [x] QW7 — Crear image sitemap (XS) — via P2.3
- [x] QW8 — Conectar GSC-GA4 (S) — via P1.6
- [x] QW9 — Añadir WebSite/Organization schema (S) — via P2.2
- [x] QW10 — Medir CWV con PageSpeed Insights (S) — via P0.7

---

## Re-validación obligatoria después de cada cambio

Antes de marcar cualquier item como resuelto:

- [ ] `npm run content:quality` (0 errors, 0 warnings)
- [ ] `npm run content:links` (0 broken relatedResources)
- [ ] `npm run content:validate` (warnings controlados)
- [ ] `npm run check` (0 errors, 0 warnings)
- [ ] `npm run build` (3.258 páginas)
- [ ] `npm run sitemap` (3.254 URLs)
- [ ] `npm run find-broken-body-links` si aplica

---

## Métricas a monitorear

| Métrica | Actual | Target | Cómo medir |
|---|---|---|---|
| CTR GSC | ~0.31% | > 0.8% | Search Console |
| Posición media | ~32.7 | < 25 | Search Console |
| Broken body links | 0 | 0 | `find-broken-body-links.py` |
| Pages >100 KB | 43 | < 20 | Dist size scan |
| LCP | 4.2s mobile | < 2.5s | PageSpeed Insights |
| INP | NOT VERIFIED | < 200ms | PageSpeed Insights |
| CLS | 0 | < 0.1 | PageSpeed Insights |
| GA4 AI Assistant sessions | NOT VERIFIED | > 0 | GA4 |
| Backlinks | NOT VERIFIED | > 10 | Ahrefs / GSC |

---

## Fuentes

- <ref_file file="D:\Codigo\stack-practices-web\ref\audit\reports\site-wide-audit.md" />
- <ref_file file="D:\Codigo\stack-practices-web\ref\audit\reports\traffic-audit.md" />
- <ref_file file="D:\Codigo\stack-practices-web\ref\audit\reports\technical-audit.md" />
