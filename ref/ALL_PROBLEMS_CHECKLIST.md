# ALL_PROBLEMS_CHECKLIST.md

Checklist consolidada de problemas detectados en `ref/`. Actualizada el 2026-08-22.

## 1. Métricas globales del sitio

| Métrica | Valor | Fuente |
| --- | --- | --- |
| Páginas en dist | 3258 | build reciente |
| Markdown files | 2042 | conteo reciente |
| URLs en sitemap | 3254 | sitemap reciente |
| Build HTML total | 131.8 MB | ref/audit-summary.md |
| Build JS size | 449.8 KB | ref/audit-summary.md |
| Build CSS size | 179.3 KB | ref/audit-summary.md |
| Build image size | 253.6 KB | ref/audit-summary.md |
| Archivos en ref/output | 211 (37 .md / 174 .json) | conteo reciente |

## 2. Problemas técnicos / SEO

### 2.1 Issues resueltos

| Issue | Count | Estado |
| --- | --- | --- |
| inDistNotSitemap | 4 | ✅ Resuelto — son páginas `noindex` (404, search) correctamente excluidas |
| canonicalMismatch | 1 | ✅ Resuelto — hreflang eliminados de las páginas 404 |
| bidirectional link gaps | 24 | ✅ Resuelto — 42 body links añadidos en 26 archivos |
| pagesWithLowIncomingLinks | 8 | ✅ Resuelto — 48 incoming links añadidos desde same-topic resources |
| low body links (docs) | 30+ | ✅ Resuelto — 180 body links añadidos en 60 archivos (30 docs EN+ES) |
| broken body links | 118 | ✅ Resuelto — 60 links patrón `/tipo/topic/slug` + 58 links con slugs renombrados |

### 2.2 Pendiente

- [ ] **Thin content**: 1.784 archivos por debajo de los nuevos targets (recipes 1.300, patterns 1.500, guides 3.000, docs 3.000). Se abordará recurso por recurso en el workflow de mejora de contenido, no en batch.

## 3. Top-100 checklist — recursos pendientes

Total pendientes: **26**.

- [ ] **58. brotli-nginx-compression** (recipes)
  - Focus: low CTR
  - Metrics: 24 imp | pos 23.5 | CTR 0.00% | Δ impr 12
  - Words: 2,345 | Meta: 144 chars
  - EN: https://stackpractices.com/recipes/brotli-nginx-compression/
  - ES: https://stackpractices.com/es/recipes/brotli-nginx-compression/
- [ ] **76. graceful-shutdown** (recipes)
  - Focus: striking distance, low CTR
  - Metrics: 27 imp | pos 9.6 | CTR 0.00% | Δ impr 0
  - Words: 1,534 | Meta: 140 chars
  - EN: https://stackpractices.com/recipes/graceful-shutdown/
  - ES: https://stackpractices.com/es/recipes/graceful-shutdown/
- [ ] **77. encryption-at-rest** (recipes)
  - Focus: low CTR
  - Metrics: 29 imp | pos 45.1 | CTR 0.00% | Δ impr -9
  - Words: 2,139 | Meta: 158 chars
  - EN: https://stackpractices.com/recipes/encryption-at-rest/
  - ES: https://stackpractices.com/es/recipes/encryption-at-rest/
- [ ] **78. sql-cte-recursive-hierarchy** (recipes)
  - Focus: striking distance, low CTR
  - Metrics: 14 imp | pos 12.6 | CTR 0.00% | Δ impr 13
  - Words: 1,557 | Meta: 165 chars
  - EN: https://stackpractices.com/recipes/sql-cte-recursive-hierarchy/
  - ES: https://stackpractices.com/es/recipes/sql-cte-recursive-hierarchy/
- [ ] **79. model-view-viewmodel-pattern** (patterns)
  - Focus: low CTR
  - Metrics: 41 imp | pos 30.9 | CTR 0.00% | Δ impr 0
  - Words: 1,374 | Meta: 147 chars
  - EN: https://stackpractices.com/patterns/model-view-viewmodel-pattern/
  - ES: https://stackpractices.com/es/patterns/model-view-viewmodel-pattern/
- [ ] **80. python-rate-limiting-fastapi-redis** (recipes)
  - Focus: striking distance, low CTR
  - Metrics: 17 imp | pos 17.9 | CTR 0.00% | Δ impr 0
  - Words: 1,424 | Meta: 157 chars
  - EN: https://stackpractices.com/recipes/python-rate-limiting-fastapi-redis/
  - ES: https://stackpractices.com/es/recipes/python-rate-limiting-fastapi-redis/
- [ ] **81. parse-command-line-arguments** (recipes)
  - Focus: low CTR
  - Metrics: 40 imp | pos 35.3 | CTR 0.00% | Δ impr 2
  - Words: 2,876 | Meta: 128 chars
  - EN: https://stackpractices.com/recipes/parse-command-line-arguments/
  - ES: https://stackpractices.com/es/recipes/parse-command-line-arguments/
- [ ] **82. python-spark-groupby-aggregation** (recipes)
  - Focus: low CTR
  - Metrics: 22 imp | pos 21 | CTR 0.00% | Δ impr 0
  - Words: 1,215 | Meta: 154 chars
  - EN: https://stackpractices.com/recipes/python-spark-groupby-aggregation/
  - ES: https://stackpractices.com/es/recipes/python-spark-groupby-aggregation/
- [ ] **83. complete-guide-sentry-error-tracking** (guides)
  - Focus: low CTR
  - Metrics: 22 imp | pos 20.9 | CTR 0.00% | Δ impr 0
  - Words: 1,752 | Meta: 161 chars
  - EN: https://stackpractices.com/guides/complete-guide-sentry-error-tracking/
  - ES: https://stackpractices.com/es/guides/complete-guide-sentry-error-tracking/
- [ ] **84. priority-queue-pattern** (patterns)
  - Focus: low CTR
  - Metrics: 21 imp | pos 22.1 | CTR 0.00% | Δ impr 0
  - Words: 1,904 | Meta: 164 chars
  - EN: https://stackpractices.com/patterns/priority-queue-pattern/
  - ES: https://stackpractices.com/es/patterns/priority-queue-pattern/
- [ ] **85. semantic-search** (recipes)
  - Focus: low CTR
  - Metrics: 37 imp | pos 36.4 | CTR 0.00% | Δ impr 0
  - Words: 2,474 | Meta: 150 chars
  - EN: https://stackpractices.com/recipes/semantic-search/
  - ES: https://stackpractices.com/es/recipes/semantic-search/
- [ ] **86. copy-move-files** (recipes)
  - Focus: striking distance, low CTR
  - Metrics: 15 imp | pos 13.9 | CTR 0.00% | Δ impr 0
  - Words: 1,307 | Meta: 121 chars
  - EN: https://stackpractices.com/recipes/copy-move-files/
  - ES: https://stackpractices.com/es/recipes/copy-move-files/
- [ ] **87. send-emails-smtp** (recipes)
  - Focus: striking distance, low CTR
  - Metrics: 15 imp | pos 18.4 | CTR 0.00% | Δ impr 0
  - Words: 2,819 | Meta: 132 chars
  - EN: https://stackpractices.com/recipes/send-emails-smtp/
  - ES: https://stackpractices.com/es/recipes/send-emails-smtp/
- [ ] **88. distributed-lock-pattern** (patterns)
  - Focus: striking distance, low CTR
  - Metrics: 15 imp | pos 14.3 | CTR 0.00% | Δ impr 0
  - Words: 1,610 | Meta: 166 chars
  - EN: https://stackpractices.com/patterns/distributed-lock-pattern/
  - ES: https://stackpractices.com/es/patterns/distributed-lock-pattern/
- [ ] **89. connection-pooling** (recipes)
  - Focus: low CTR
  - Metrics: 20 imp | pos 28.4 | CTR 0.00% | Δ impr -3
  - Words: 2,355 | Meta: 144 chars
  - EN: https://stackpractices.com/recipes/connection-pooling/
  - ES: https://stackpractices.com/es/recipes/connection-pooling/
- [ ] **90. event-sourcing-relational** (recipes)
  - Focus: low CTR
  - Metrics: 20 imp | pos 25.9 | CTR 0.00% | Δ impr -5
  - Words: 1,572 | Meta: 152 chars
  - EN: https://stackpractices.com/recipes/event-sourcing-relational/
  - ES: https://stackpractices.com/es/recipes/event-sourcing-relational/
- [ ] **91. graphql-directives-auth** (recipes)
  - Focus: low CTR
  - Metrics: 35 imp | pos 33 | CTR 0.00% | Δ impr 0
  - Words: 1,485 | Meta: 142 chars
  - EN: https://stackpractices.com/recipes/graphql-directives-auth/
  - ES: https://stackpractices.com/es/recipes/graphql-directives-auth/
- [ ] **92. python-dask-parallel-dataframe** (recipes)
  - Focus: low CTR
  - Metrics: 19 imp | pos 20.5 | CTR 0.00% | Δ impr 0
  - Words: 1,178 | Meta: 162 chars
  - EN: https://stackpractices.com/recipes/python-dask-parallel-dataframe/
  - ES: https://stackpractices.com/es/recipes/python-dask-parallel-dataframe/
- [ ] **93. flyweight-pattern** (patterns)
  - Focus: striking distance, low CTR
  - Metrics: 14 imp | pos 13.7 | CTR 0.00% | Δ impr 0
  - Words: 1,620 | Meta: 130 chars
  - EN: https://stackpractices.com/patterns/flyweight-pattern/
  - ES: https://stackpractices.com/es/patterns/flyweight-pattern/
- [ ] **94. graphql-mutation-validation-pattern** (patterns)
  - Focus: striking distance, low CTR
  - Metrics: 13 imp | pos 13.4 | CTR 0.00% | Δ impr 0
  - Words: 1,435 | Meta: 159 chars
  - EN: https://stackpractices.com/patterns/graphql-mutation-validation-pattern/
  - ES: https://stackpractices.com/es/patterns/graphql-mutation-validation-pattern/
- [ ] **95. queue-based-load-leveling-pattern** (patterns)
  - Focus: striking distance, low CTR
  - Metrics: 13 imp | pos 15.8 | CTR 0.00% | Δ impr 0
  - Words: 1,796 | Meta: 167 chars
  - EN: https://stackpractices.com/patterns/queue-based-load-leveling-pattern/
  - ES: https://stackpractices.com/es/patterns/queue-based-load-leveling-pattern/
- [ ] **96. onion-architecture-guide** (guides)
  - Focus: striking distance, low CTR
  - Metrics: 13 imp | pos 13.2 | CTR 0.00% | Δ impr 0
  - Words: 1,498 | Meta: 162 chars
  - EN: https://stackpractices.com/guides/onion-architecture-guide/
  - ES: https://stackpractices.com/es/guides/onion-architecture-guide/
- [ ] **97. grafana-dashboards-observability** (recipes)
  - Focus: low CTR
  - Metrics: 14 imp | pos 24.1 | CTR 0.00% | Δ impr 8
  - Words: 1,193 | Meta: 153 chars
  - EN: https://stackpractices.com/recipes/grafana-dashboards-observability/
  - ES: https://stackpractices.com/es/recipes/grafana-dashboards-observability/
- [ ] **98. javascript-debounce-throttle-implementation** (recipes)
  - Focus: low CTR
  - Metrics: 17 imp | pos 21.5 | CTR 0.00% | Δ impr 0
  - Words: 1,385 | Meta: 145 chars
  - EN: https://stackpractices.com/recipes/javascript-debounce-throttle-implementation/
  - ES: https://stackpractices.com/es/recipes/javascript-debounce-throttle-implementation/
- [ ] **99. python-prometheus-metrics-exporter** (recipes)
  - Focus: low CTR
  - Metrics: 17 imp | pos 27.2 | CTR 0.00% | Δ impr 0
  - Words: 1,246 | Meta: 146 chars
  - EN: https://stackpractices.com/recipes/python-prometheus-metrics-exporter/
  - ES: https://stackpractices.com/es/recipes/python-prometheus-metrics-exporter/
- [ ] **100. complete-guide-graphql-federation** (guides)
  - Focus: low CTR
  - Metrics: 30 imp | pos 34.3 | CTR 0.00% | Δ impr 0
  - Words: 1,322 | Meta: 153 chars
  - EN: https://stackpractices.com/guides/complete-guide-graphql-federation/
  - ES: https://stackpractices.com/es/guides/complete-guide-graphql-federation/

## 4. Roadmap de contenido pendiente

- [ ] Batch 3 pending recipes: 50
- [ ] Batch 3 pending patterns: 40
- [ ] Batch 3 pending guides: 35
- [ ] Batch 3 pending docs: 25
  - Fuente: `ref/content-roadmap.md`

## 5. Artefactos de auditoría por recurso (ref/output)

- [ ] Revisar/clean 211 archivos en `ref/output/` (37 .md, 174 .json).
- [ ] Priorizar los reports de `api-documentation-openapi` (12 reports en `ref/output/`) dado que tiene la mayor impresión en GSC pero CTR bajo.
- [ ] Revisar periódicamente `content-quality-audit-*.md`, `seo-audit-*.md` e `improvement-pipeline-*.md` y convertir hallazgos en acciones.

## 6. Observaciones GA4 / GSC recientes

- [ ] GSC: CTR bajó del 0,50 % al 0,31 % a pesar de +253 % impresiones; posición media empeoró de 27,2 a 32,7.
- [ ] `/recipes/api-documentation-openapi/` tiene 1.166 impresiones y solo 2 clics (CTR 0,17 %); posición cayó a ~55-65 en agosto.
- [ ] `/recipes/optimistic-locking/` es la página con más clics (3) y subió +265 impresiones vs el período anterior.
- [ ] GA4: solo 41 sesiones, 68 pageviews, 13 usuarios activos en 28 días; tráfico todavía residual.
