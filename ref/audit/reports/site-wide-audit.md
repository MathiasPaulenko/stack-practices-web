# Site-Wide Audit — StackPractices

> Generado el 2026-08-24. Segunda pasada del prompt 99 con auditoría profunda de 169 recursos, validación técnica de 100 páginas HTML de dist, análisis de clusters, external links, placeholders, performance y accessibility.
> No edita recursos individuales: produce un checklist de acciones a nivel sitio.

---

## 0. Metadata

| Campo | Valor |
|---|---|
| Fecha del audit | 2026-08-24 |
| Repositorio | `D:\Codigo\stack-practices-web` |
| Dominio | `https://stackpractices.com` |
| Branch | `main` |
| Stack | Astro 5+ (SSG), Tailwind CSS v4+, Pagefind, GitHub Pages |
| Analytics | GA4 `G-RBE12WJ5KZ` + GTM `GTM-M66C9FWN` (Consent Mode v2) |
| AdSense | `pub-9762280383707953` (ads.txt presente) |
| Total páginas build | 3.258 |
| Total Markdown | 2.042 archivos (1.021 EN + 1.021 ES) |
| URLs en sitemap | 3.254 |
| Build time | 137s |
| Fuentes de datos | `npm run content:quality/links/validate/check/build/sitemap`; scripts custom `audit-thin-content.py`, `find-broken-body-links.py`, `audit-sample-deep.py`, `audit-dist-html.py`; análisis de frontmatter; `ref/checklist-top-recursos-mejoras.md`; `ref/docs/roadmap.md` |
| GSC/GA4 | NOT VERIFIED en vivo; datos históricos extraídos de `ref/checklist-top-recursos-mejoras.md` |

---

## 1. Global Metrics

```text
TOTAL RESOURCES: 1.021 (2.042 archivos bilingües)
WITH ES VERSION: 1.021 (100%)
WITHOUT ES: 0

RESOURCES BY TYPE:
  recipes: 431 (862 archivos)
  patterns: 203 (406 archivos)
  guides: 210 (420 archivos)
  docs: 177 (354 archivos)

AVERAGE SCORE (muestra 169 recursos): 82.9/100
RESOURCES BELOW 60: 16 (9%)
RESOURCES 60-79: 50 (30%)
RESOURCES 80-89: 31 (18%)
RESOURCES 90+: 72 (43%)

THIN CONTENT (targets: recipes 1300, patterns 1500, guides 3000, docs 3000):
  Total below target: 1.784 archivos (87.3% del total)
  recipes: 625 below (72.6% de 862)
  patterns: 385 below (94.8% de 406)
  guides:  420 below (100% de 420)
  docs:    354 below (100% de 354)

VALIDATION STATUS:
  content:quality:  0 errors, 0 warnings ✅
  content:links:    0 broken relatedResources ✅
  content:validate: PASS (warnings: H2 duplicados en 8 docs templates — esperado en placeholders)
  check:            0 errors, 0 warnings, 38 hints ✅
  build:            3258 páginas, 137s ✅
  sitemap:          3254 URLs ✅

BROKEN BODY LINKS: 16 (regresión — todos apuntan a /recipes/circuit-breaker-pattern-recipe)
BROKEN RELATED RESOURCES: 0
BIDIRECTIONAL LINK GAPS: 0 (resueltos en sesión anterior)
ORPHAN RESOURCES (0 incoming): 348 (34.0%)
LOW INCOMING (<3): 720 (70.5%)

DUPLICATE META DESCRIPTIONS: 0 ✅
DUPLICATE TITLES: 28
  - 17 EN/ES sin traducir
  - 6 colisiones cross-type (guide + recipe con mismo título)
  - 5 por otros motivos

BODY LINKS <2 (muestra): 92 de 169 (54.4%)
BODY LINKS <3 (muestra): 115 de 169 (68.0%)

AI PATTERN RISK:
  Em-dash overuse (>3 por 100 palabras): 0 en muestra
  AI vocabulary >3 palabras: 1 recurso en muestra
  Passive voice ratio >5%: bajo en muestra
  Riesgo principal: em-dashes en recursos específicos (api-documentation-openapi: 10, domain-driven-design-guide: 9)

BILINGUAL PARITY: 100% (1021/1021 ES) ✅

GA4 STATUS: OK (Consent Mode v2 + GTM + gtag configurados)
GSC AVERAGE CTR: ~0.31% (histórico, NOT VERIFIED)
GSC AVERAGE POSITION: ~32.7 (histórico, NOT VERIFIED)

EXTERNAL LINKS:
  Unique: 65
  Occurrences: 143
  Placeholders (example.com, your-domain.com, etc.): 617 archivos afectados

PLACEHOLDERS EXAMPLE.COM / YOUR-DOMAIN:
  617 archivos con placeholders (esperado en docs templates, pero puede afectar GEO/AI citations)

DIST BUILD SIZES:
  HTML: 131 MB (3.258 archivos)
  Pagefind fragments: 12.7 MB (3.258)
  Pagefind index: 12.2 MB
  JSON: 5.2 MB
  XML: 1.7 MB
  JS: 0.4 MB
  CSS: 0.2 MB
  Total dist: 162.2 MB

IMAGES:
  src + public: 6 imágenes (3 SVG, 3 PNG)
  Markdown images: 4, todas con alt text ✅
  Ko-fi donation image (/kofi3.png) presente en todas las páginas con alt text ✅

ACCESSIBILITY:
  HTML lang: 100% en muestra de dist
  Viewport: 100%
  Skip-link: presente en BaseLayout
  Images alt: 100% en muestra
  Más auditar con herramientas específicas recomendado (axe-core, Lighthouse)

STRUCTURED DATA (muestra 100 dist HTML):
  JSON-LD: 100%
  Hreflang (en + es + x-default): 100%
  Open Graph: 100%
  Canonical: 100%
  Title: 100%
  Meta description: 100%
  Viewport: 100%
  HTML lang: 100%
  JSON-LD types: TechArticle 64%, WebPage 33%, CollectionPage 3%

DUPLICATE CONTENT (fingerprint 500 chars): 0
DUPLICATE OVERVIEW PARAGRAPHS (300 chars): 0
```

---

## 2. Batch Validation Results

| Comando | Resultado | Notas |
|---|---|---|
| `npm run content:quality` | ✅ 0 errors, 0 warnings | 2042 files checked |
| `npm run content:links` | ✅ 0 broken relatedResources | 1021 indexed resources |
| `npm run content:validate` | ✅ PASS | Warnings: H2 duplicados en 8 docs templates con secciones repetibles (`dependency-audit-template`, `environment-setup-guide-template`, `feature-request-template`, `post-deployment-checklist-template`, `pull-request-template`, `readme-template`, `release-notes-template`). Placeholders de templates, no bloquean build. |
| `npm run check` | ✅ 0 errors, 0 warnings | 38 hints: unused vars en `Seo.astro` (`addBrand`, `brandSuffix`), `Header.astro` (`navPrefix`); hint `is:inline` en `BaseLayout.astro` para script analytics. |
| `npm run build` | ✅ 3258 páginas | 137s, Pagefind indexó 174.308 words |
| `npm run sitemap` | ✅ 3254 URLs | lastmod 2026-08-24, hreflang EN/ES/x-default correcto |

### Regresión detectada

**16 broken body links** — todos apuntan a `/recipes/circuit-breaker-pattern-recipe` (slug correcto: `/patterns/circuit-breaker-pattern`). Afectan 8 docs de architecture + 1 doc de devops (EN+ES). Regresión del fix anterior.

---

## 3. Critical Site-Wide Problems

### P0 — Crítico

#### 1. Thin content masivo (1.784 archivos, 87.3%)

- **Problema**: 87.3% del contenido está por debajo de los targets de palabras. Guides y docs al 100% por debajo. Patterns al 94.8%.
- **Evidencia**: `audit-thin-content.py` reporta 1.784 archivos below target. Muestra de 169: 115 THIN (68%). Top-100: 66 THIN. Guides peores: `vertical-slice-architecture-guide` al 33.2%, `sql-cte-guide` al 35.0%, `onion-architecture-guide` al 39.4%.
- **Recursos afectados**: 1.784 archivos (625 recipes, 385 patterns, 420 guides, 354 docs).
- **Impacto**: Google prioriza contenido comprehensivo. CTR histórico bajó de 0.50% a 0.31% a pesar de +253% impresiones. Posición media empeoró de 27.2 a 32.7.
- **Acción prioritaria**: Workflow `content-improvement` recurso por recurso, priorizando top-100 con tráfico/potencial.

#### 2. 16 broken body links (regresión)

- **Problema**: 16 body links apuntan a slug renombrado `circuit-breaker-pattern-recipe`.
- **Evidencia**: `find-broken-body-links.py` reporta 16 broken, 1 target, 8 docs EN+ES.
- **Recursos afectados**: 16 archivos.
- **Impacto**: UX y crawl efficiency degradados.
- **Acción prioritaria**: Script para reemplazar `/recipes/circuit-breaker-pattern-recipe` → `/patterns/circuit-breaker-pattern`.

#### 3. 348 orphan resources (34% sin incoming links)

- **Problema**: 34% de recursos sin incoming links, 70.5% con menos de 3.
- **Evidencia**: Análisis de incoming links en 1021 recursos EN.
- **Recursos afectados**: 348 orphans + 372 low-incoming.
- **Impacto**: PageRank interno débil, indexación lenta, baja discoverability.
- **Acción prioritaria**: Añadir body links contextuales desde same-topic clusters.

### P1 — Alto impacto

#### 4. Body links insuficientes (54% de muestra con <2 links)

- **Problema**: Muestra de 169 recursos: 92 (54.4%) tienen menos de 2 body links, 115 (68%) tienen menos de 3.
- **Evidencia**: `audit-sample-deep.py`.
- **Recursos afectados**: Probablemente 60-70% del sitio.
- **Impacto**: Estructura interna débil, dificulta crawl y engagement. Orphans y low-incoming son consecuencia directa.
- **Acción prioritaria**: Añadir 2-3 body links contextuales por recurso, priorizando clusters y top-100.

#### 5. Titles duplicados / EN sin traducir (28 casos)

- **Problema**: 17 titles ES son idénticos al EN. 6 colisiones cross-type (guide + recipe).
- **Evidencia**: Análisis de frontmatter.
- **Recursos afectados**: ~28 pares.
- **Impacto**: Canibalización cross-type, mala UX en ES, confusión para Google.
- **Acción prioritaria**: Traducir titles ES; diferenciar titles cross-type.

#### 6. Placeholders masivos (617 archivos con example.com/your-domain)

- **Problema**: 617 docs templates y runbooks contienen URLs placeholder (`example.com`, `grafana.example.com`, `sentry.example.com`, `your-domain.com`, `user@example.com`).
- **Evidencia**: Scan de todos los markdown files.
- **Recursos afectados**: 617 archivos, mayoría docs templates/runbooks.
- **Impacto**: Los placeholders son correctos para templates (el usuario debe rellenarlos), pero para GEO/AI search el contenido puede parecer menos útil. Además, external links con `example.com` no son clicables reales.
- **Acción prioritaria**: Documentar que los placeholders son intencionales en docs. Para SEO/GEO, considerar añadir nota de "reemplaza example.com con tu dominio" para claridad.

#### 7. Em-dash overuse en recursos específicos

- **Problema**: `api-documentation-openapi`: 10 em-dashes, `domain-driven-design-guide`: 9.
- **Evidencia**: Scan em-dash density en muestra.
- **Recursos afectados**: Al menos 2 recursos top; otros posibles.
- **Impacto**: AI pattern signal. Helpful Content Update puede penalizar.
- **Acción prioritaria**: Revisar em-dashes en top-100 durante workflow content-improvement.

### P2 — Mejoras que escalan

#### 8. Build size elevado (162.2 MB)

- **Problema**: HTML 131 MB, Pagefind index 12.2 MB, fragments 12.7 MB.
- **Evidencia**: `Get-ChildItem dist`.
- **Recursos afectados**: Todo el sitio.
- **Impacto**: Deploys lentos, alto consumo de crawl budget.
- **Acción prioritaria**: `compressHTML` ya está activo. Investigar división de Pagefind index por idioma, lazy-loading, o reducir HTML redundante.

#### 9. Hints de TypeScript sin resolver (38)

- **Problema**: Unused vars en `Seo.astro`, `Header.astro`; hint `is:inline` en `BaseLayout`.
- **Evidencia**: `npm run check`.
- **Recursos afectados**: 3 componentes.
- **Impacto**: Código muerto.
- **Acción prioritaria**: Limpiar unused vars; añadir `is:inline` explícito.

#### 10. H2 duplicados en 8 docs templates

- **Problema**: MD024 warnings por secciones repetibles en templates.
- **Evidencia**: `content:validate`.
- **Recursos afectados**: 8 templates (16 archivos EN+ES).
- **Impacto**: Lint warnings.
- **Acción prioritaria**: Renombrar H2 duplicados a únicos.

---

## 4. Top 20 Resources to Fix

| # | Recurso | Tipo | Words/Target | Score est. | GSC Clicks | Top Problem | Top Opportunity | Priority |
|---|---|---|---|---|---|---|---|---|
| 1 | `/recipes/api-documentation-openapi/` | recipes | 5156/1300 | 70/100 | 2 (1166 imp, 0.17% CTR) | CTR bajísimo con 1166 imp, em-dash overuse | Optimizar title/meta para CTR, reducir AI patterns | P0 |
| 2 | `/guides/domain-driven-design-guide/` | guides | 1305/3000 | 45/100 | NOT VERIFIED | Thin 43.5%, em-dash overuse | Expandir a 3000+ words, FAQ, ejemplos | P0 |
| 3 | `/guides/vertical-slice-architecture-guide/` | guides | 995/3000 | 40/100 | NOT VERIFIED | Thin 33.2% | Expandir con ejemplos .NET, comparativa | P0 |
| 4 | `/guides/sql-cte-guide/` | guides | 1051/3000 | 42/100 | NOT VERIFIED | Thin 35% | Expandir con recursive CTE, performance | P0 |
| 5 | `/guides/onion-architecture-guide/` | guides | 1181/3000 | 44/100 | NOT VERIFIED | Thin 39.4% | Expandir con diagramas, código, comparativas | P0 |
| 6 | `/guides/complete-guide-rabbitmq-architecture/` | guides | 1478/3000 | 48/100 | NOT VERIFIED | Thin 49.3% | Expandir exchanges, DLX, clustering | P1 |
| 7 | `/guides/complete-guide-local-llm-deployment/` | guides | 1436/3000 | 48/100 | NOT VERIFIED | Thin 47.9% | Expandir Ollama, vLLM, quantization | P1 |
| 8 | `/guides/complete-guide-graphql-federation/` | guides | 1436/3000 | 48/100 | NOT VERIFIED | Thin 47.9% | Expandir supergraph, router, entity resolution | P1 |
| 9 | `/guides/complete-guide-bundle-size-optimization/` | guides | 1304/3000 | 45/100 | NOT VERIFIED | Thin 43.5% | Expandir tree-shaking, code-splitting | P1 |
| 10 | `/guides/terraform-best-practices-guide/` | guides | 1427/3000 | 48/100 | NOT VERIFIED | Thin 47.6% | Expandir modules, state, CI/CD | P1 |
| 11 | `/recipes/parse-csv-python-pandas/` | recipes | 904/1300 | 55/100 | NOT VERIFIED | Thin 69.5% | Expandir dtypes, chunking, memory | P1 |
| 12 | `/recipes/parse-log-files/` | recipes | 1089/1300 | 60/100 | NOT VERIFIED | Thin 83.8% | Expandir regex, structured logs | P1 |
| 13 | `/recipes/password-hashing/` | recipes | 1149/1300 | 62/100 | NOT VERIFIED | Thin 88.4% | Expandir argon2, bcrypt, timing attacks | P1 |
| 14 | `/recipes/server-sent-events-node/` | recipes | 959/1300 | 55/100 | NOT VERIFIED | Thin 73.8% | Expandir reconnection, backpressure | P1 |
| 15 | `/recipes/convert-csv-to-json/` | recipes | 952/1300 | 55/100 | NOT VERIFIED | Thin 73.2% | Expandir streaming, large files | P1 |
| 16 | `/patterns/repository-pattern/` | patterns | 842/1500 | 50/100 | NOT VERIFIED | Thin 56.1% | Expandir unit testing, EF Core, Dapper | P1 |
| 17 | `/patterns/repository-pattern-typescript/` | patterns | 925/1500 | 52/100 | NOT VERIFIED | Thin 61.7% | Expandir generics, TypeORM, Prisma | P1 |
| 18 | `/recipes/caching/` | recipes | 897/1300 | 55/100 | NOT VERIFIED | Thin 69% | Expandir Redis, invalidation | P1 |
| 19 | `/recipes/handle-errors/` | recipes | 1025/1300 | 60/100 | NOT VERIFIED | Thin 78.8% | Expandir error hierarchies, logging | P1 |
| 20 | `/recipes/prometheus-api-monitoring/` | recipes | 804/1300 | 50/100 | NOT VERIFIED | Thin 61.8% | Expandir Grafana, alerting | P1 |

---

## 5. Traffic Opportunities

### Queries con impresiones pero CTR bajísimo

- **`/recipes/api-documentation-openapi/`**: 1.166 impresiones, 2 clics (0.17% CTR). 5.156 palabras (sobre target), title largo (59 chars), em-dash overuse. Oportunidad: reescribir title/meta description más clickables y reducir em-dashes.

### Clusters con potencial

- **Guides de architecture** (28 guides): todos THIN. Queries de alto volumen: DDD, Clean Architecture, Onion, Vertical Slice, Modular Monolith.
- **Guides de databases** (24 guides): SQL CTE, replication, indexing.
- **Guides de AI** (11 guides): LLM local, fine-tuning, semantic search — temas trending.
- **Recipes de data** (48 recipes): CSV, JSON, TOML, log parsing.

### Mercados

- **ES**: 100% cobertura pero 17 titles sin traducir. Fix rápido mejora relevancia.
- **AI assistants**: GA4 puede trackear `AI Assistant` channel group (May 2026). El sitio no está optimizado para AEO/GEO específicamente.

### Listing pages

- `/guides/`, `/docs/`, `/patterns/`, `/recipes/` tienen potencial pero recursos internos son THIN. La listing page retiene poco.

---

## 6. Cluster & Architecture

### Cobertura por tipo y topic

| Tipo | Topics | Huérfanos (<3) | Topic más poblado | Topic menos poblado |
|---|---|---|---|---|
| recipes | 20 | 0 | devops (56) | infrastructure (1) |
| patterns | 10 | authentication (2) | design (138) | authentication (2) |
| guides | 20 | infrastructure (1), performance (1) | devops (36) | infrastructure (1), performance (1) |
| docs | 16 | 0 | devops (71) | concurrency (3) |

### Hallazgos

- **Patterns design-heavy**: 68% de patterns son `design` (138/203). Falta diversidad en otros topics.
- **Infrastructure/performance huérfanos**: solo 1 recurso cada uno en recipes y guides.
- **Devops over-represented**: domina en 3 de 4 tipos.
- **Cross-linking débil**: 54% de recursos con <2 body links; 34% orphans.

---

## 7. Duplication & Cannibalization

### Titles duplicados — 28 casos

#### EN/ES sin traducir (17 casos)

`Chaos Engineering`, `Clean Architecture`, `Cron Jobs`, `Custom Hook Composition`, `Dead Letter Queues`, `Factory Pattern`, `GitHub Actions CI/CD`, `Golden Master Testing`, `Logging`, `Metrics Collection`, `Middleware`, `Rate Limiting`, `Security Headers`, `Service Discovery`, `Webhooks`, `Workflow Engines`, `URL Encoding`.

#### Colisiones cross-type (6 casos)

- `Blue-Green Deployment` (guide + recipe)
- `Cloud Cost Optimization` (guide + recipe)
- `Chaos Engineering` (guide ES + recipe EN + recipe ES)
- `Full-Text Search` (guide + recipe)
- `Database Replication` (guide + recipe)
- `Log Aggregation` (guide + recipe)

### Duplicate content

- Fingerprint de 500 chars: 0 duplicados.
- Overview first paragraph: 0 duplicados.
- No canibalización por contenido copiado a gran escala.

---

## 8. Definition of Done

- [x] Cada recurso tiene EN y ES (100%)
- [x] Ningún `relatedResources` roto
- [x] Sin meta descripciones duplicadas
- [ ] Sin thin content crítico (1.784 archivos below target)
- [x] Todos pasan `npm run content:quality`
- [x] `npm run build` y `npm run sitemap` exitosos
- [x] GA4 mide correctamente
- [x] Sitemap actualizado
- [ ] Cada topic tiene al menos 3-5 recursos de distintos tipos (infrastructure/performance fallan)
- [ ] Top 20 recursos priorizados tienen score ≥ 80
- [ ] Sin broken body links (16 regresión)
- [ ] Sin titles duplicados (28 casos)
- [ ] Sin orphan resources (348)
- [ ] Sin recursos con <2 body links (54% de muestra)
- [ ] Roadmap actualizado
- [ ] Hints de TypeScript resueltos

---

## 9. Global Action Plan

### P0

1. **Fix 16 broken body links** (30 min)
   - What: Reemplazar `/recipes/circuit-breaker-pattern-recipe` → `/patterns/circuit-breaker-pattern`
   - Why: Links rotos degradan UX y crawl
   - How: Script Python o edit manual
   - Impact: 0 broken body links

2. **Expandir top-20 thin content** (ongoing)
   - What: Llevar recursos a targets de palabras
   - Why: 87.3% del sitio por debajo del target
   - How: Workflow `content-improvement`
   - Impact: Mejorar rankings, CTR, dwell time

3. **Reducir orphan resources** (1-2 sesiones)
   - What: Añadir body links contextuales desde clusters
   - Why: 34% sin incoming links
   - How: Script por topic
   - Impact: Mejor crawl coverage

### P1

4. **Añadir body links (<2 a ≥2)** (1-2 sesiones)
   - What: Asegurar 2-3 body links por recurso
   - Why: 54% de recursos con <2 links
   - How: Script + revisión manual
   - Impact: Mejor arquitectura interna, menos orphans

5. **Traducir 17 titles ES y diferenciar 6 cross-type** (1.5h)
   - What: Titles ES únicos; titles cross-type con distinción
   - Why: Canibalización y UX
   - How: Edit manual
   - Impact: Claridad para Google y usuarios

6. **Revisar placeholders example.com en 617 archivos** (por decidir)
   - What: Documentar intencionalidad o reemplazar por dominio real
   - Why: Placeholders correctos para templates, pero afectan GEO
   - How: Evaluar si mantener con nota clara

7. **Reducir em-dashes en top-100** (integrado en workflow)
   - What: Reemplazar em-dashes excesivos
   - Why: AI pattern signal
   - How: Humanizer + manual
   - Impact: Menos AI detection risk

### P2

8. **Actualizar roadmap** (1h)
9. **Investigar build size / Pagefind index split** (1 sesión)
10. **Limpiar hints TypeScript** (30 min)
11. **Renombrar H2 duplicados en 8 docs templates** (1h)
12. **Diversificar patterns más allá de design** (varias sesiones)
13. **Fortalecer clusters infrastructure y performance** (varias sesiones)

---

## 10. Annex

### Muestra auditada (169 recursos)

- 100 top recursos (`ref/checklist-top-recursos-mejoras.md`)
- 50 recursos aleatorios
- 19 recursos THIN adicionales

Distribución de scores:

```
Below 60:  16 (9%)
60-79:     50 (30%)
80-89:     31 (18%)
90+:       72 (43%)
Average:   82.9/100
```

### Dist HTML audit (muestra 100)

```
JSON-LD:        100%
Hreflang:       100%
OG complete:    100%
Canonical:      100%
Title:          100%
Meta desc:      100%
Viewport:       100%
HTML lang:      100%
```

### Build size breakdown

| Extensión | Count | Size (MB) |
|---|---|---|
| .html | 3.258 | 131.0 |
| .pf_fragment | 3.258 | 12.7 |
| .pf_index | 372 | 12.2 |
| .json | 2.189 | 5.2 |
| .xml | 3 | 1.7 |
| .js | 8 | 0.4 |
| .css | 4 | 0.2 |
| **Total** | | **162.2** |

### Cluster distribution

```text
recipes (431):
  devops: 56, data: 48, api: 35, databases: 35, security: 32,
  file-handling: 30, testing: 23, ai: 20, frontend: 19, caching: 18,
  serverless: 16, concurrency: 15, observability: 14, architecture: 13,
  authentication: 13, messaging: 13, performance: 12, graphql: 10,
  design: 8, infrastructure: 1

patterns (203):
  design: 138, architecture: 13, ai: 8, frontend: 8, graphql: 8,
  testing: 8, data: 6, observability: 6, resilience: 6, authentication: 2

guides (210):
  devops: 36, architecture: 28, databases: 24, security: 22, data: 14,
  frontend: 14, ai: 11, observability: 11, api: 8, testing: 7,
  concurrency: 5, deployment: 5, caching: 4, code-quality: 4, design: 4,
  messaging: 4, planning: 4, serverless: 3, infrastructure: 1, performance: 1

docs (177):
  devops: 71, templates: 24, security: 20, ai: 8, architecture: 7,
  testing: 7, api: 5, caching: 4, data-engineering: 4, frontend: 4,
  graphql: 4, messaging: 4, observability: 4, performance: 4, serverless: 4,
  concurrency: 3
```

### Titles duplicados detalle

```text
EN/ES sin traducir:
  Chaos Engineering, Clean Architecture, Cron Jobs, Custom Hook Composition,
  Dead Letter Queues, Factory Pattern, GitHub Actions CI/CD, Golden Master Testing,
  Logging, Metrics Collection, Middleware, Rate Limiting, Security Headers,
  Service Discovery, Webhooks, Workflow Engines, URL Encoding

Cross-type canibalización:
  Blue-Green Deployment (guide + recipe)
  Cloud Cost Optimization (guide + recipe)
  Chaos Engineering (guide + recipe)
  Full-Text Search (guide + recipe)
  Database Replication (guide + recipe)
  Log Aggregation (guide + recipe)
```

---

## Resumen ejecutivo

**Estado técnico**: Excelente. Build, sitemap, hreflang, OG, JSON-LD, canonical, bilingual parity, robots.txt, ads.txt, GA4/GTM todos correctos.

**Problema central**: **Thin content masivo** (87.3% below target) y **arquitectura interna débil** (54% con <2 body links, 34% orphans) son los bloqueos principales para tráfico.

**Quick wins inmediatos**:
1. Fix 16 broken links (30 min)
2. Traducir 17 titles ES + diferenciar 6 cross-type (1.5h)
3. Update roadmap/checklist (1h)

**Trabajo continuo**: Workflow `content-improvement` sobre top-100 recursos thin + añadir body links contextuales para reducir orphans.

**Datos no inventados**: GSC/GA4 son datos históricos del checklist. Scores son estimaciones del script `audit-sample-deep.py`, no audits full con todas las 80 dimensiones CORE-EEAT.
