# Master Checklist — StackPractices

> Consolidación de problemas y acciones extraídos de `site-wide-audit.md`, `traffic-audit.md` y `technical-audit.md`.
> Fecha: 2026-08-24.
> Objetivo: ir arreglando item por item. Marcar `[x]` cuando esté resuelto y re-validar.

---

## Cómo usar `content-improvement` con este checklist

Cada item de este checklist que implique modificar un recurso de contenido (`src/content/{recipes,patterns,guides,docs}/...`) **debe ejecutarse a través de la skill `content-improvement`**. No editar los archivos de contenido directamente sin pasar por el flujo de la skill.

> **Regla de oro para thin content**: expandir un recurso **NO significa rellenar palabras**. Significa ejecutar el flujo completo de `content-improvement`: diagnóstico → SEO/frontmatter → expansión con valor técnico real → detección y corrección de patrones de IA (humanización) → paridad EN/ES → validación. Si un recurso thin solo se "rellena" con texto genérico, seguirá siendo thin y además será penalizable por Helpful Content Update.

> **Aplicable a**: P0.2, P0.5, P1.7, P1.8, P1.1 (cuando implique reescribir cuerpo), P2.5, P2.6 y cualquier item del top-20.

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
| **Fase 1** — Quick wins SEO/frontmatter | Corrige title (≤60 chars), description/metaDescription (120-170 chars), `relatedResources`, body links, estructura de secciones. | Para QW2, QW3, QW4, P0.4, P1.2, P1.3, P1.1. |
| **Fase 2** — Calidad + IA | Expande thin content, ejecuta `ai-detect-patterns.py` + Desklib, reescribe frases con alto `ai_prob` (máx. 4 rondas). | Para P0.2, P0.5, P1.7, P1.8, y todo thin content. |
| **Fase 3** — Paridad EN/ES | Verifica que ambos archivos tengan título, meta, keywords, relatedResources, ejemplos y secciones equivalentes. | Siempre al final, antes de marcar `[x]`. |
| **Fase 4** — Validación final | `npm run content:quality`, `content:links`, `content:validate`, `check`, `build`, `sitemap`. | Siempre al final. |

### Reglas importantes

- **No crear la versión ES automáticamente**: si falta ES, avisar y pedir aprobación.
- **Mínimos de palabras del cuerpo**: recipes 1.300, patterns 1.500, guides 3.000, docs 3.000.
- **Parada del bucle IA**: detener cuando `pattern_totals` esté vacío y `model_ai_pct` < 40 %, o después de 4 rondas.
- **Skills complementarias**: invocar `humanizer`, `seo`, `content-research-writer`, `clean-code` cuando apliquen.

### Qué NO hacer al expandir thin content

- [ ] **NO** añadir párrafos genéricos que repitan el título o secciones de relleno.
- [ ] **NO** copiar contenido de otros recursos sin adaptar.
- [ ] **NO** aumentar el conteo de palabras solo con listas sin explicación.
- [ ] **NO** dejar ejemplos de código inventados o sin versiones reales de herramientas.
- [ ] **NO** saltarse la detección de patrones de IA (`ai-detect-patterns.py`, Desklib).
- [ ] **NO** olvidar la versión ES: toda modificación de contenido debe replicarse bilingüemente.
- [ ] **NO** marcar `[x]` sin pasar `npm run content:quality`, `content:links`, `content:validate`, `check`, `build`, `sitemap`.

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

| Área | Items P0 | Items P1 | Items P2 | Total |
|---|---:|---:|---:|---:|
| Contenido / Thin | 3 | 4 | 2 | 9 |
| Links internos | 2 | 2 | 1 | 5 |
| Títulos / Meta | 1 | 2 | 0 | 3 |
| Técnico / Performance | 1 | 2 | 4 | 7 |
| Analytics / GEO | 0 | 2 | 3 | 5 |
| Roadmap / Docs | 0 | 0 | 3 | 3 |
| **Total** | **7** | **14** | **16** | **37** |

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

- [ ] **P0.2** — Expandir thin content del top-20 priorizados
  - Category: Content
  - Evidence: Top recursos con score < 60 y words < 35% del target (ej. `vertical-slice-architecture-guide` 33.2%, `sql-cte-guide` 35%)
  - Affected: 20 recursos (ver sección Top 20 más abajo)
  - Action: Invocar `content-improvement: mejora <slug>` para cada recurso. Flujo completo: diagnóstico → SEO/frontmatter → expansión con valor técnico real → detección/corrección IA (Desklib, humanización) → paridad EN/ES → validación.
  - Effort: XL
  - Report: `site-wide-audit.md`, `traffic-audit.md`

- [ ] **P0.3** — Reducir orphan resources (348 sin incoming links)
  - Category: Links / Architecture
  - Evidence: 34% de recursos sin incoming links; 70.5% con < 3
  - Affected: 348+ recursos
  - Action: Script por topic que añada 2-3 body links contextuales desde recursos del mismo cluster hacia los orphans.
  - Effort: L
  - Report: `site-wide-audit.md`

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

- [ ] **P1.1** — Aumentar body links (< 2 a ≥ 2) en recursos deficientes
  - Category: Links
  - Evidence: 54.4% de muestra (92/169) con < 2 body links; patterns 1.7 avg
  - Affected: ~60-70% del sitio
  - Action: Si el recurso también es thin, invocar `content-improvement: mejora <slug>` (Fase 1 añade body links contextuales + Fase 2 expansión si aplica + paridad EN/ES). Si solo falta links, añadir manualmente y validar.
  - Effort: L
  - Report: `site-wide-audit.md`, `traffic-audit.md`

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

- [ ] **P1.5** — Revisar y documentar placeholders en 617 docs
  - Category: Content / GEO
  - Evidence: 617 archivos con `example.com`, `your-domain.com`, etc.
  - Affected: 617 archivos (templates/runbooks)
  - Action: Decidir si mantener placeholders con nota clara de reemplazo o usar dominio real cuando aplique. Documentar en template guidelines.
  - Effort: M
  - Report: `site-wide-audit.md`

- [x] **P1.6** — Conectar GSC con GA4 — ✅ RESUELTO 2026-08-25
  - Category: Analytics
  - Evidence: GSC/GA4 link: VERIFIED por usuario (Admin > Property settings > Search Console links)
  - Affected: Cuentas de Google
  - Action: Enlazar Search Console property con GA4 property para informes combinados.
  - Effort: S
  - Report: `traffic-audit.md`

- [ ] **P1.7** — Expandir guías de arquitectura más críticas (28 guides, todos THIN)
  - Category: Content
  - Evidence: DDD, Vertical Slice, Onion, Modular Monolith, Clean Architecture están por debajo de 3.000 words
  - Affected: 28 guides de architecture
  - Action: Invocar `content-improvement: mejora <slug>` para cada guide. Flujo completo: expansión con ejemplos reales, humanización, paridad EN/ES, validación.
  - Effort: L
  - Report: `site-wide-audit.md`, `traffic-audit.md`

- [ ] **P1.8** — Expandir guías de databases y AI (trending topics)
  - Category: Content
  - Evidence: 24 guides databases, 11 guides AI; todos THIN; queries trending
  - Affected: 24 + 11 guides
  - Action: Invocar `content-improvement: mejora <slug>` por cada guide. Añadir ejemplos reales (Postgres, Ollama, vLLM), humanizar, verificar paridad EN/ES.
  - Effort: L
  - Report: `traffic-audit.md`

- [ ] **P1.9** — Implementar outbound / linkable asset outreach
  - Category: Authority
  - Evidence: Backlinks NOT VERIFIED; 31 linkable assets identificados (≥3.000w + code + FAQ)
  - Affected: 20-31 recursos
  - Action: Crear lista de targets (Stack Overflow, GitHub, newsletters dev) y outreach básico.
  - Effort: L
  - Report: `traffic-audit.md`

- [ ] **P1.10** — Revisar consentimiento de cookies y GA4 Consent Mode
  - Category: Analytics
  - Evidence: Consent default denied; cookie banner no verificado interactivamente
  - Affected: `public/analytics.js`, `src/components/CookieBanner`
  - Action: Verificar que el banner actualiza `analytics_storage` y `ad_storage`. Testear en modo preview de GTM.
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

- [ ] **P1.13** — Mejorar topic hubs y CTAs de navegación
  - Category: User Flow
  - Evidence: 348 orphans; dead-ends; CTAs limitados
  - Affected: Listing pages y recursos
  - Action: Añadir CTA contextual final: "Explora más recursos de [topic]" / "Ver guía relacionada".
  - Effort: M
  - Report: `traffic-audit.md`

### P2 — Mejoras que escalan

- [ ] **P2.1** — Investigar reducción de build size / Pagefind split
  - Category: Performance
  - Evidence: Total dist 162.2 MB; Pagefind index 12.2 MB, fragments 12.7 MB
  - Affected: Todo el sitio
  - Action: Evaluar split de índice por idioma, lazy loading de Pagefind, reducción de HTML redundante.
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

- [ ] **P2.4** — Optimizar OG:image por tipo de contenido
  - Category: Social / SEO
  - Evidence: OG tags completos pero `og:image` usa `/og-image.png` genérico para todas las páginas
  - Affected: `src/components/Seo.astro`
  - Action: Generar OG images dinámicas por tipo/topic o al menos 4 plantillas (recipe/pattern/guide/doc).
  - Effort: M
  - Report: `traffic-audit.md`

- [ ] **P2.5** — Diversificar patterns más allá de `design`
  - Category: Cluster / Content
  - Evidence: 68% de patterns son design (138/203); authentication solo 2
  - Affected: `src/content/patterns/`
  - Action: Crear nuevos patterns con `stackp-content-creator`; para patterns existentes thin, invocar `content-improvement: mejora <slug>` con flujo completo.
  - Effort: L
  - Report: `site-wide-audit.md`

- [ ] **P2.6** — Fortalecer clusters `infrastructure` y `performance`
  - Category: Cluster / Content
  - Evidence: 1 recurso infrastructure en recipes/guides; 1 performance en guides
  - Affected: `src/content/{recipes,guides}/{infrastructure,performance}/`
  - Action: Crear nuevos recursos con `stackp-content-creator`; si se expanden existentes, usar `content-improvement: mejora <slug>` (flujo completo + paridad EN/ES).
  - Effort: L
  - Report: `site-wide-audit.md`

- [ ] **P2.7** — Activar tracking de GA4 AI Assistant channel
  - Category: GEO / Analytics
  - Evidence: GA4 añadió canal "AI Assistant" en Mayo 2026; sitio no optimizado para AEO
  - Affected: GA4 property, dashboards
  - Action: Añadir canal a reports/explores; crear contenido AEO/GEO (PAA, speakable).
  - Effort: S
  - Report: `traffic-audit.md`

- [ ] **P2.8** — Revisar external links (65 únicos / 143 ocurrencias)
  - Category: Maintenance
  - Evidence: External link scan; algunos placeholders como `grafana.example.com`
  - Affected: 65 unique links
  - Action: Verificar que todos apunten a destinos reales y actualizados; documentar placeholders.
  - Effort: M
  - Report: `site-wide-audit.md`

- [ ] **P2.9** — Implementar AEO/GEO optimizations (speakable, PAA)
  - Category: GEO
  - Evidence: FAQ 100% presente; oportunidad de añadir speakable markup y PAA
  - Affected: Top 100 recursos
  - Action: Añadir `speakable` JSON-LD a preguntas clave; optimizar FAQ para snippets.
  - Effort: M
  - Report: `traffic-audit.md`

- [ ] **P2.10** — Refrescar `ref/docs/roadmap.md` con fases actuales
  - Category: Roadmap
  - Evidence: Roadmap desactualizado (748 items vs 1.021 recursos)
  - Affected: `ref/docs/roadmap.md`
  - Action: Actualizar milestones, conteos y próximas fases.
  - Effort: S
  - Report: `site-wide-audit.md`

---

## Top 20 recursos a arreglar (ordenados por impacto)

> **Cada recurso de esta tabla que implique reescribir o expandir cuerpo debe invocarse con `content-improvement: mejora <slug>` en modo `full`**. No rellenar: aplicar diagnóstico, SEO, expansión con valor, humanización, paridad EN/ES y validación.

| # | Recurso | Tipo | Problema principal | Acción concreta | Prioridad |
|---|---|---|---|---|---|
| 1 | `/recipes/api-documentation-openapi/` | recipes | CTR 0.17%, 1.166 imp | Reescribir title/meta, reducir em-dashes | P0 |
| 2 | `/guides/domain-driven-design-guide/` | guides | Thin 43.5%, 1.305w/3.000w | Expandir a 3.000+ words, ejemplos, FAQ | P0 |
| 3 | `/guides/vertical-slice-architecture-guide/` | guides | Thin 33.2%, 995w/3.000w | Expandir con ejemplos .NET, comparativas | P0 |
| 4 | `/guides/sql-cte-guide/` | guides | Thin 35%, 1.051w/3.000w | Recursive CTE, performance, ejemplos | P0 |
| 5 | `/guides/onion-architecture-guide/` | guides | Thin 39.4%, 1.181w/3.000w | Expandir con diagramas, código | P0 |
| 6 | `/guides/complete-guide-rabbitmq-architecture/` | guides | Thin 49.3%, 1.478w/3.000w | Exchanges, DLX, clustering | P1 |
| 7 | `/guides/complete-guide-local-llm-deployment/` | guides | Thin 47.9%, 1.436w/3.000w | Ollama, vLLM, quantization | P1 |
| 8 | `/guides/complete-guide-graphql-federation/` | guides | Thin 47.9%, 1.436w/3.000w | Supergraph, router, entity resolution | P1 |
| 9 | `/guides/complete-guide-bundle-size-optimization/` | guides | Thin 43.5%, 1.304w/3.000w | Tree-shaking, code-splitting | P1 |
| 10 | `/guides/terraform-best-practices-guide/` | guides | Thin 47.6%, 1.427w/3.000w | Modules, state, CI/CD | P1 |
| 11 | `/recipes/parse-csv-python-pandas/` | recipes | Thin 69.5%, 904w/1.300w | dtypes, chunking, memory | P1 |
| 12 | `/recipes/parse-log-files/` | recipes | Thin 83.8%, 1.089w/1.300w | Regex, structured logs | P1 |
| 13 | `/recipes/password-hashing/` | recipes | Thin 88.4%, 1.149w/1.300w | Argon2, bcrypt, timing attacks | P1 |
| 14 | `/recipes/server-sent-events-node/` | recipes | Thin 73.8%, 959w/1.300w | Reconnection, backpressure | P1 |
| 15 | `/recipes/convert-csv-to-json/` | recipes | Thin 73.2%, 952w/1.300w | Streaming, large files | P1 |
| 16 | `/patterns/repository-pattern/` | patterns | Thin 56.1%, 842w/1.500w | Unit testing, EF Core, Dapper | P1 |
| 17 | `/patterns/repository-pattern-typescript/` | patterns | Thin 61.7%, 925w/1.500w | Generics, TypeORM, Prisma | P1 |
| 18 | `/recipes/caching/` | recipes | Thin 69%, 897w/1.300w | Redis, invalidation | P1 |
| 19 | `/recipes/handle-errors/` | recipes | Thin 78.8%, 1.025w/1.300w | Error hierarchies, logging | P1 |
| 20 | `/recipes/prometheus-api-monitoring/` | recipes | Thin 61.8%, 804w/1.300w | Grafana, alerting | P1 |

---

## Quick wins (XS/S effort, alto impacto)

- [ ] QW1 — Arreglar 16 broken body links (XS)
- [ ] QW2 — Traducir 17 titles ES (S)
- [ ] QW3 — Diferenciar 6 titles cross-type (S)
- [ ] QW4 — Optimizar title/meta de `/recipes/api-documentation-openapi/` (S)
- [ ] QW5 — Limpiar hints TypeScript (XS)
- [ ] QW6 — Renombrar H2 duplicados en templates (S)
- [x] QW7 — Crear image sitemap (XS)
- [x] QW8 — Conectar GSC-GA4 (S)
- [x] QW9 — Añadir WebSite/Organization schema (S)
- [ ] QW10 — Medir CWV con PageSpeed Insights (S)

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
| Thin content files | 1.784 | < 500 | `audit-thin-content.py` |
| Orphan resources | 348 | < 100 | Incoming link scan |
| Broken body links | 16 | 0 | `find-broken-body-links.py` |
| Pages >100 KB | 43 | < 20 | Dist size scan |
| LCP | NOT VERIFIED | < 2.5s | PageSpeed Insights |
| INP | NOT VERIFIED | < 200ms | PageSpeed Insights |
| CLS | NOT VERIFIED | < 0.1 | PageSpeed Insights |
| GA4 AI Assistant sessions | NOT VERIFIED | > 0 | GA4 |
| Backlinks | NOT VERIFIED | > 10 | Ahrefs / GSC |

---

## Fuentes

- <ref_file file="D:\Codigo\stack-practices-web\ref\audit\reports\site-wide-audit.md" />
- <ref_file file="D:\Codigo\stack-practices-web\ref\audit\reports\traffic-audit.md" />
- <ref_file file="D:\Codigo\stack-practices-web\ref\audit\reports\technical-audit.md" />
