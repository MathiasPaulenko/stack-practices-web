# ALL_PROBLEMS_CHECKLIST.md

Checklist consolidada de problemas detectados en `ref/`. Generado el 2026-08-22.

## 1. Métricas globales del sitio

| Métrica | Valor | Fuente |
| --- | --- | --- |
| Páginas en dist | 3242 | ref/audit-summary.md |
| Markdown files | 2043 | ref/audit-summary.md |
| URLs en sitemap | 3238 | ref/audit-summary.md |
| Build HTML total | 131.8 MB | ref/audit-summary.md |
| Build JS size | 449.8 KB | ref/audit-summary.md |
| Build CSS size | 179.3 KB | ref/audit-summary.md |
| Build image size | 253.6 KB | ref/audit-summary.md |
| Archivos en ref/output | 211 (37 .md / 174 .json) | conteo reciente |

## 2. Problemas técnicos / SEO

### 2.1 Issue counts (ref/audit-summary.md)

| Issue | Count |
| --- | --- |
| inDistNotSitemap | 4 |
| canonicalMismatch | 1 |
| thinPages | 36 |
| pagesWithLowIncomingLinks | 8 |
| bidirectional link gaps | 24 |
| low body links | 30+ |

### 2.2 Checklist técnica

- [ ] **Canonical mismatch en `/404/`**: canonical apunta a `https://stackpractices.com/404.html` mientras la URL es `/404/`.
- [ ] **4 URLs en `dist` que no están en el sitemap**: `/404/`, `/es/404/`, `/es/search/`, `/search/`. Verificar que tengan `noindex` o agregar/ignorar correctamente.
- [ ] **36 thin pages** según `audit-summary.md`; lista concreta en `thin-content-report.txt` (17 archivos) y conteo en `MASTER_CHECKLIST.md` (687 archivos WARN con 300-349 líneas). Reconciliar y priorizar.
- [ ] **Revisar 2.263 enlaces rotos en el cuerpo del markdown** (`MASTER_CHECKLIST.md`): patrón `/contentType/categoria/slug` que debería ser `/contentType/slug` y placeholders `[texto](link)` en templates.

## 3. Thin content / contenido ligero

### 3.1 FAIL (< 300 líneas)

- [ ] `src/content/recipes/AGENTS.md` (96 líneas)
- [ ] `src/content/recipes/data/parse-log-files.es.md` (230 líneas)
- [ ] `src/content/recipes/data/parse-log-files.md` (230 líneas)

### 3.2 WARN (300–349 líneas)

- [ ] `src/content/recipes/data/parse-toml-files.es.md` (324 líneas)
- [ ] `src/content/recipes/data/parse-toml-files.md` (324 líneas)
- [ ] `src/content/patterns/design/partial-class-pattern.es.md` (341 líneas)
- [ ] `src/content/patterns/design/partial-class-pattern.md` (341 líneas)
- [ ] `src/content/recipes/api/grpc-api.md` (345 líneas)
- [ ] `src/content/patterns/design/context-object-pattern.es.md` (345 líneas)
- [ ] `src/content/docs/testing/test-strategy-document-template.es.md` (346 líneas)
- [ ] `src/content/docs/testing/test-strategy-document-template.md` (346 líneas)
- [ ] `src/content/docs/templates/penetration-test-template.es.md` (347 líneas)
- [ ] `src/content/docs/architecture/technical-spec-template.es.md` (348 líneas)
- [ ] `src/content/docs/templates/penetration-test-template.md` (348 líneas)
- [ ] `src/content/recipes/api/grpc-api.es.md` (349 líneas)
- [ ] `src/content/recipes/performance/web-performance.md` (349 líneas)
- [ ] `src/content/docs/architecture/technical-spec-template.md` (349 líneas)

## 4. Enlaces internos

### 4.1 Bidirectional link gaps (24)

- [ ] `/recipes/image-generation` ↔ `/recipes/chatbot-openai` (ai)
- [ ] `/recipes/python-sentiment-analysis-nltk` ↔ `/recipes/chatbot-openai` (ai)
- [ ] `/recipes/api-logging-audit` ↔ `/recipes/api-documentation-openapi` (api)
- [ ] `/recipes/api-rate-limiting-redis` ↔ `/recipes/api-documentation-openapi` (api)
- [ ] `/recipes/call-rest-api` ↔ `/recipes/api-documentation-openapi` (api)
- [ ] `/recipes/cursor-pagination-postgresql` ↔ `/recipes/api-documentation-openapi` (api)
- [ ] `/recipes/graphql-api` ↔ `/recipes/api-documentation-openapi` (api)
- [ ] `/recipes/real-time-notifications` ↔ `/recipes/api-documentation-openapi` (api)
- [ ] `/recipes/concurrent-data-structures` ↔ `/recipes/python-thread-pool-executor` (concurrency)
- [ ] `/recipes/concurrent-data-structures` ↔ `/recipes/race-condition-prevention` (concurrency)
- [ ] `/recipes/date-formatting` ↔ `/recipes/flatten-unflatten-objects` (data)
- [ ] `/recipes/flatten-unflatten-objects` ↔ `/recipes/deep-clone-javascript` (data)
- [ ] `/recipes/money-currency` ↔ `/recipes/flatten-unflatten-objects` (data)
- [ ] `/recipes/parse-excel-files` ↔ `/recipes/parse-log-files` (data)
- [ ] `/recipes/parse-log-files` ↔ `/recipes/log-aggregation` (observability)
- [ ] `/recipes/parse-log-files` ↔ `/recipes/parse-json` (data)
- [ ] `/recipes/parse-log-files` ↔ `/recipes/regular-expressions` (data)
- [ ] `/recipes/parse-xml-files` ↔ `/recipes/parse-log-files` (data)
- [ ] `/recipes/validate-json-schema` ↔ `/recipes/parse-log-files` (data)
- [ ] `/recipes/database-migrations-safely` ↔ `/recipes/optimistic-locking` (databases)
- [ ] `/recipes/database-migrations` ↔ `/recipes/optimistic-locking` (databases)
- [ ] `/recipes/database-views-materialized` ↔ `/recipes/optimistic-locking` (databases)
- [ ] `/recipes/python-coverage-pytest-cov` ↔ `/recipes/implement-mutation-testing` (testing)
- [ ] `/recipes/python-coverage-pytest-cov` ↔ `/recipes/setup-test-fixtures` (testing)

### 4.2 Páginas con pocos incoming links

- [ ] `/recipes/nodejs-caching-redis` (2 enlaces entrantes)
- [ ] `/recipes/server-sent-events-node` (2 enlaces entrantes)
- [ ] `/recipes/http-cache-control-headers` (2 enlaces entrantes)
- [ ] `/recipes/deep-clone-structured` (2 enlaces entrantes)
- [ ] `/recipes/nodejs-file-upload-validation` (2 enlaces entrantes)
- [ ] `/recipes/debounce-throttle` (2 enlaces entrantes)
- [ ] `/patterns/llm-fallback-pattern` (2 enlaces entrantes)
- [ ] `/patterns/specification-pattern` (2 enlaces entrantes)

### 4.3 Docs con 0–1 links en el cuerpo

- [ ] `src/content/docs/api/api-changelog-template.md` (1 link)
- [ ] `src/content/docs/api/api-deprecation-notice-template.md` (1 link)
- [ ] `src/content/docs/api/api-error-handling-guideline.md` (1 link)
- [ ] `src/content/docs/api/api-rate-limiting-policy-template.md` (1 link)
- [ ] `src/content/docs/api/sla-definition-template.md` (1 link)
- [ ] `src/content/docs/architecture/api-lifecycle-management-template.md` (1 link)
- [ ] `src/content/docs/architecture/api-monitoring-alerting-template.md` (1 link)
- [ ] `src/content/docs/architecture/api-performance-budget-template.md` (1 link)
- [ ] `src/content/docs/architecture/microservice-contract-template.md` (1 link)
- [ ] `src/content/docs/architecture/service-dependency-map-template.md` (1 link)
- [ ] `src/content/docs/architecture/system-diagram-template.md` (1 link)
- [ ] `src/content/docs/architecture/technical-spec-template.md` (1 link)
- [ ] `src/content/docs/data-engineering/data-governance-policy-template.md` (1 link)
- [ ] `src/content/docs/data-engineering/data-pipeline-design-document-template.md` (1 link)
- [ ] `src/content/docs/data-engineering/data-quality-rules-template.md` (1 link)
- [ ] `src/content/docs/data-engineering/etl-job-runbook-template.md` (1 link)
- [ ] `src/content/docs/devops/access-control-review-template.md` (1 link)
- [ ] `src/content/docs/devops/architecture-decision-record-adr-template.md` (1 link)
- [ ] `src/content/docs/devops/auto-scaling-policy-template.md` (1 link)
- [ ] `src/content/docs/devops/backup-and-restore-template.md` (1 link)
- [ ] `src/content/docs/devops/backup-verification-test-template.md` (1 link)
- [ ] `src/content/docs/devops/bug-triage-template.md` (0 links)
- [ ] `src/content/docs/devops/capacity-planning-forecast-template.md` (1 link)
- [ ] `src/content/docs/devops/change-management-template.md` (1 link)
- [ ] `src/content/docs/devops/ci-cd-pipeline-design-template.md` (1 link)
- [ ] `src/content/docs/devops/ci-cd-pipeline-security-template.md` (1 link)
- [ ] `src/content/docs/devops/cloud-cost-allocation-template.md` (1 link)
- [ ] `src/content/docs/devops/cloud-resource-tagging-policy-template.md` (1 link)
- [ ] `src/content/docs/devops/code-review-checklist-template.md` (0 links)
- [ ] `src/content/docs/devops/compliance-gap-analysis-template.md` (1 link)

## 5. Top-100 checklist — recursos pendientes

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

## 6. Roadmap de contenido pendiente

- [ ] Batch 3 pending recipes: 50
- [ ] Batch 3 pending patterns: 40
- [ ] Batch 3 pending guides: 35
- [ ] Batch 3 pending docs: 25
  - Fuente: `ref/content-roadmap.md`

## 7. Artefactos de auditoría por recurso (ref/output)

- [ ] Revisar/clean 211 archivos en `ref/output/` (37 .md, 174 .json).
- [ ] Priorizar los reports de `api-documentation-openapi` (12 reports en `ref/output/`) dado que tiene la mayor impresión en GSC pero CTR bajo.
- [ ] Revisar periódicamente `content-quality-audit-*.md`, `seo-audit-*.md` e `improvement-pipeline-*.md` y convertir hallazgos en acciones.

## 8. Observaciones GA4 / GSC recientes

- [ ] GSC: CTR bajó del 0,50 % al 0,31 % a pesar de +253 % impresiones; posición media empeoró de 27,2 a 32,7.
- [ ] `/recipes/api-documentation-openapi/` tiene 1.166 impresiones y solo 2 clics (CTR 0,17 %); posición cayó a ~55-65 en agosto.
- [ ] `/recipes/optimistic-locking/` es la página con más clics (3) y subió +265 impresiones vs el período anterior.
- [ ] GA4: solo 41 sesiones, 68 pageviews, 13 usuarios activos en 28 días; tráfico todavía residual.
