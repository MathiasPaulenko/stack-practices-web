# Content Issues — Fix Tracker

Last updated: 2026-07-09

## Summary

| Category | Count | Status |
|----------|-------|--------|
| AI-isms (EN) | 343 files | ✅ Fixed |
| AI-isms (ES) | 170 files | ✅ Fixed |
| Duplicate slugs | 7 | ✅ Fixed |
| Broken relatedResources | 29 unique links | ✅ Fixed |
| Titles >80 chars | 14 files | ✅ Fixed |
| Duplicate H2 headings | ~109 | ✅ Fixed (validator bug) |
| Thin content (<300 lines) | 759 files | In progress |
| Build fix (link-to-screenshot.png) | 2 files | ✅ Fixed |

---

## 1. AI-isms — "This recipe/guide/pattern/doc covers/shows/implements/explains" (343 EN files)

**Problem**: 343 EN files use formulaic openings like "This recipe shows..." or "This guide covers..." — classic AI writing patterns.

**Fix**: Rewrite to direct, varied openings. Remove the pattern entirely.

**Files affected** (all in `src/content/`):

### Recipes (majority)

- `recipes/testing/unit-testing.md`
- `recipes/testing/unit-testing-mocking.md`
- `recipes/testing/setup-test-fixtures.md`
- `recipes/testing/measure-test-coverage.md`
- `recipes/testing/load-testing.md`
- `recipes/testing/integration-testing-strategies.md`
- `recipes/testing/api-contract-testing.md`
- `recipes/testing/api-mocking.md`
- `recipes/testing/generate-test-data.md`
- `recipes/testing/implement-mutation-testing.md`
- `recipes/testing/implement-property-based-testing.md`
- `recipes/testing/integration-testing.md`
- `recipes/testing/java-junit5-assertions-soft.md`
- `recipes/testing/java-wiremock-stub-external.md`
- `recipes/testing/javascript-vitest-snapshot-testing.md`
- `recipes/testing/jest-snapshot-testing.md`
- `recipes/testing/python-coverage-pytest-cov.md`
- `recipes/security/sql-injection-prevention.md`
- `recipes/security/sanitize-user-input.md`
- `recipes/security/security-headers.md`
- `recipes/security/rate-limiting.md`
- `recipes/security/password-hashing-production.md`
- `recipes/security/oauth2-pkce-spa.md`
- `recipes/security/hmac-request-signing.md`
- `recipes/security/escape-html-entities.md`
- `recipes/security/encryption-at-rest.md`
- `recipes/security/data-validation-zod.md`
- `recipes/security/vault-dynamic-credentials.md`
- `recipes/security/xss-prevention.md`
- `recipes/security/request-signing-hmac.md`
- `recipes/serverless/serverless-functions.md`
- `recipes/serverless/serverless-orchestration.md`
- `recipes/serverless/serverless-api-gateway.md`
- `recipes/serverless/scheduled-jobs.md`
- `recipes/serverless/real-time-websockets.md`
- `recipes/serverless/event-sourcing-serverless.md`
- `recipes/serverless/event-driven-functions.md`
- `recipes/serverless/cold-start-optimization.md`
- `recipes/api/*.md` (multiple)
- `recipes/databases/*.md` (multiple)
- `recipes/devops/*.md` (multiple)
- `recipes/file-handling/*.md` (multiple)
- `recipes/performance/*.md` (multiple)
- `recipes/authentication/*.md` (multiple)
- `recipes/concurrency/*.md` (multiple)
- `recipes/messaging/*.md` (multiple)
- `recipes/graphql/*.md` (multiple)
- `recipes/frontend/*.md` (multiple)
- `recipes/data/*.md` (multiple)
- `recipes/design/*.md` (multiple)
- `recipes/architecture/*.md` (multiple)
- `recipes/caching/*.md` (multiple)
- `recipes/deployment/*.md` (multiple)
- `recipes/planning/*.md` (multiple)
- `recipes/ai/*.md` (multiple)
- `recipes/observability/*.md` (multiple)
- `recipes/infrastructure/*.md` (multiple)

### Guides (some)

- `guides/ai/complete-guide-*.md` (multiple)
- `guides/api/complete-guide-*.md` (multiple)
- `guides/architecture/complete-guide-*.md` (multiple)
- `guides/caching/complete-guide-*.md` (multiple)
- `guides/code-quality/complete-guide-*.md` (multiple)

**Approach**: Fix by category, 20-30 files per batch. Rewrite the opening sentence to be direct and varied.

---

## 2. Duplicate Slugs (7)

**Problem**: Same slug exists in two locations. Astro content collections will conflict.

| Slug | Location 1 | Location 2 | Fix |
|------|-----------|-----------|-----|
| `ambassador-pattern` | `patterns/architecture/` | `patterns/design/` | Delete from `patterns/design/` |
| `anti-corruption-layer-pattern` | `patterns/architecture/` | `patterns/design/` | Delete from `patterns/design/` |
| `sidecar-pattern` | `patterns/architecture/` | `patterns/design/` | Delete from `patterns/design/` |
| `strangler-fig-pattern` | `patterns/architecture/` | `patterns/design/` | Delete from `patterns/design/` |
| `bulkhead-pattern` | `patterns/design/` | `patterns/resilience/` | Delete from `patterns/design/` |
| `incident-postmortem-template` | `docs/observability/` | `docs/templates/` | Delete from `docs/templates/` |
| `security-incident-response-template` | `docs/security/` | `docs/templates/` | Delete from `docs/templates/` |

**Fix**: Delete the duplicate files (both EN and ES). Keep the canonical location.

---

## 3. Broken relatedResources Links (29 unique)

**Problem**: `relatedResources` frontmatter references slugs that don't exist.

| Broken Link | Used in (file count) |
|-------------|---------------------|
| `/recipes/observability/health-checks` | 6 files |
| `/guides/observability/prometheus-grafana-guide` | 4 files |
| `/guides/observability/structured-logging-guide` | 4 files |
| `/recipes/security/csp-headers` | 2 files |
| `/recipes/security/cors-configuration` | 2 files |
| `/recipes/security/encrypt-data-at-rest` | 2 files |
| `/recipes/security/oauth2-authorization-code-flow` | 2 files |
| `/recipes/frontend/css-grid-layouts` | 2 files |
| `/recipes/frontend/lazy-load-components` | 2 files |
| `/recipes/frontend/react-use-reducer` | 2 files |
| `/recipes/frontend/typescript-utility-types` | 2 files |
| `/recipes/frontend/type-narrowing-guards` | 2 files |
| `/recipes/frontend/aria-live-regions` | 1 file |
| `/recipes/frontend/flexbox-centering` | 1 file |
| `/recipes/frontend/semantic-html` | 1 file |
| `/guides/databases/complete-guide-database-indexing` | 1 file |
| `/guides/devops/complete-guide-kubernetes-deployment` | 1 file |
| `/guides/frontend/complete-guide-core-web-vitals` | 1 file |
| `/guides/testing/complete-guide-testing-microservices` | 1 file |
| `/guides/testing/complete-guide-test-pyramid` | 1 file |
| `/patterns/architecture/api-gateway-pattern` | 1 file |
| `/recipes/data/airflow-dag-template` | 1 file |
| `/recipes/data/csv-to-json-pipeline` | 1 file |
| `/recipes/data/pandas-data-validation` | 1 file |
| `/recipes/data/sql-window-functions` | 1 file |
| `/recipes/devops/docker-compose-template` | 1 file |
| `/recipes/devops/github-actions-deploy-kubernetes` | 1 file |
| `/recipes/devops/helm-chart-template` | 1 file |
| `/recipes/devops/kubernetes-configmap-template` | 1 file |

**Fix**: Either create the missing content or remove/replace the broken links with valid ones.

---

## 4. Titles >80 chars (14 files)

**Problem**: Title exceeds 80 chars, bad for SEO.

| File | Chars | Current Title |
|------|-------|---------------|
| `guides/code-quality/complete-guide-refactoring-techniques.md` | 81 | — |
| `guides/data/complete-guide-data-quality.es.md` | 81 | — |
| `guides/data/complete-guide-data-quality.md` | 82 | — |
| `guides/devops/complete-guide-kubernetes-config-management.es.md` | 84 | — |
| `guides/devops/complete-guide-kubernetes-config-management.md` | 85 | — |
| `guides/testing/complete-guide-property-based-testing.md` | 87 | — |
| `guides/testing/complete-guide-pytest-production.es.md` | 85 | — |
| `guides/testing/complete-guide-pytest-production.md` | 86 | — |
| `patterns/data/batch-to-streaming-bridge-pattern.es.md` | 85 | — |
| `patterns/data/batch-to-streaming-bridge-pattern.md` | 88 | — |
| `patterns/data/schema-registry-evolution-pattern.es.md` | 81 | — |
| `patterns/data/schema-registry-evolution-pattern.md` | 81 | — |
| `patterns/frontend/islands-architecture-pattern.es.md` | 85 | — |
| `patterns/testing/mock-server-pattern.es.md` | 81 | — |

**Fix**: Shorten titles to ≤80 chars. Keep EN and ES in sync.

---

## 5. Duplicate H2 Headings (~80)

**Problem**: Same H2 heading appears multiple times in one file, causing MD024 lint errors.

**Most affected files** (docs templates):

- Bug report templates
- ADR templates
- Changelog templates
- Release notes templates
- PR templates
- Security policy templates
- Incident postmortem templates

**Common duplicate headings**:
`overview`, `description`, `testing`, `verification`, `security`, `checklist`, `summary`, `environment`, `prerequisites`, `scope`, `priority`, `severity`, `decision`, `sign-off`, `troubleshooting`, `health checks`, `rollback readiness`, `enforcement`, `highlights`, `improvements`, `bug fixes`, `breaking changes`, `deprecations`, `known issues`, `new capabilities`, `deployment info`, `full changelog`, `upgrade instructions`, `quick start`, `smoke tests`, `metrics validation`, `maintenance health`, `user value`, `problem statement`, `proposed solution`, `expected behavior`, `steps to reproduce`, `additional context`, `type of change`, `attribution`, `supply chain risk`, `our pledge`, `our standards`

**Fix**: Rename duplicates to be unique (e.g., "Overview" → "Overview" and "Overview Summary" or use H3 for one instance).

---

## 6. Thin Content — Files <300 lines (759 files)

**Problem**: 37.2% of all content files are under 300 lines. Most are recipes from Batch 1-2 (pre-Jul 2026 standard).

### Breakdown by category

| Category | Files <300 |
|----------|-----------|
| design | 128 |
| devops | 117 |
| data | 78 |
| api | 70 |
| architecture | 58 |
| testing | 48 |
| templates | 38 |
| security | 38 |
| databases | 32 |
| performance | 24 |
| ai | 20 |
| observability | 18 |
| authentication | 17 |
| serverless | 16 |
| graphql | 13 |
| messaging | 12 |
| concurrency | 12 |
| frontend | 10 |
| planning | 4 |
| caching | 2 |
| infrastructure | 2 |

**Total**: 759 files (37.2% of 2,042 total files)

**Fix**: Expand content — add more code examples, variants, FAQ entries, and deeper explanations. Process by category, 10-20 files per batch.

### Priority order for expansion

1. **design** (128) — highest count
2. **devops** (117) — second highest
3. **data** (78)
4. **api** (70)
5. **architecture** (58)
6. **testing** (48)
7. **templates** (38)
8. **security** (38)
9. **databases** (32)
10. **performance** (24)
11. Remaining categories

---

## Progress Log

| Date | Batch | Files Fixed | Commit |
|------|-------|-------------|--------|
| 2026-07-06 | Duplicate slugs | 14 deleted | 68e6185 |
| 2026-07-06 | Broken relatedResources | 58 files | 68e6185 |
| 2026-07-06 | Titles >80 chars | 14 files | 68e6185 |
| 2026-07-06 | Duplicate H2 (validator fix) | 1 file | b10b30b |
| 2026-07-06 | metaDescription mismatch | 1 file | b10b30b |
| 2026-07-06 | AI-isms EN (343) + ES (170) | 513 files | feda120 |
| 2026-07-06 | Thin content — databases ES (2 files expanded) | 2 files | 2fb0e6f |
| 2026-07-06 | Thin content — databases EN (2 files expanded) | 2 files | 2fb0e6f |
| 2026-07-06 | Thin content — DevOps recipes (10 files expanded) | 10 files | 300b42f |
| 2026-07-08 | Thin content — design patterns Batch 10 | 10 files | 0aca6a4 |
| 2026-07-09 | Thin content — mvc-pattern-frontend EN/ES | 2 files | 53d9381 |
| 2026-07-09 | Thin content — decorator-pattern-pipeline EN/ES | 2 files | 2fc78b9 |
| 2026-07-09 | Thin content — Batch 11 patterns (static-content-hosting, message-queue-load-leveling, message-deduplication, async-generator) EN/ES | 8 files | pending |
