# StackPractices Forensic Audit Summary

Generated: 2026-08-17T05:06:16.419Z

Site: https://stackpractices.com

## Inventory


- Dist HTML pages: 3242
- Markdown files: 2043
- Sitemap URLs: 3238
- Build JS size: 449.8 KB
- Build CSS size: 179.3 KB
- Build image size: 253.6 KB
- Build HTML size: 131.8 MB
- Astro build time: 16m 2s
- Pagefind index time: 76s


## Issue Counts

| Issue | Count |
| --- | --- |
| inSitemapNotDist | 0 |
| inDistNotSitemap | 4 |
| duplicateTitles | 0 |
| duplicateDescs | 0 |
| titleTooLong | 0 |
| descTooLong | 0 |
| descTooShort | 0 |
| missingH1 | 0 |
| multipleH1 | 0 |
| missingCanonical | 0 |
| canonicalMismatch | 1 |
| missingHreflang | 0 |
| hreflangIssues | 0 |
| thinPages | 36 |
| missingAltPages | 0 |
| pagesWithoutSchema | 0 |

## Derived Counts

| Metric | Count |
| --- | --- |
| totalPages | 3242 |
| contentDetailPages | 1021 |
| listingPages | 8 |
| tagPages | 449 |
| contentDescTooLong | 0 |
| listingDescTooLong | 0 |
| tagDescTooLong | 0 |
| contentTitleTooLong | 0 |
| contentMultipleH1 | 0 |
| contentThinByWords | 0 |
| tagMissingHreflang | 0 |

## Content Distribution


By type (EN):

| Type | Count |
| --- | --- |
| docs | 177 |
| guides | 210 |
| patterns | 203 |
| recipes | 432 |

By difficulty:

| Difficulty | Count |
| --- | --- |
| advanced | 414 |
| intermediate | 1262 |
| beginner | 366 |
|  | 1 |

AI phrase counts:

_No data._

Template heading counts:

| Heading | Count |
| --- | --- |
| overview | 1029 |
| faq | 1432 |
| when to use | 852 |
| solution | 864 |
| explanation | 552 |
| variants | 851 |
| common mistakes | 1107 |
| best practices | 406 |

Author counts:

| Author | Count |
| --- | --- |
| Mathias Paulenko | 2042 |
|  | 1 |


## Schema Types

| Type | Count |
| --- | --- |
| WebPage | 4 |

## Samples


### In dist but not in sitemap (first 50)
| URL |
| --- |
| /404/ |
| /es/404/ |
| /es/search/ |
| /search/ |

### Title too long (first 30)
_No data._

### Description too long (first 30)
_No data._

### Duplicate titles (first 20)
_No data._

### Duplicate descriptions (first 20)
_No data._

### Missing hreflang (first 30)
_No data._

### Canonical mismatch
| URL | Canonical |
| --- | --- |
| https://stackpractices.com/404/ | https://stackpractices.com/404.html |

### Missing alt
_No data._

### Multiple H1 (first 20)
_No data._

### Pages with low incoming links
| URL | Links |
| --- | --- |
| /recipes/nodejs-caching-redis | 2 |
| /recipes/server-sent-events-node | 2 |
| /recipes/http-cache-control-headers | 2 |
| /recipes/deep-clone-structured | 2 |
| /recipes/nodejs-file-upload-validation | 2 |
| /recipes/debounce-throttle | 2 |
| /patterns/llm-fallback-pattern | 2 |
| /patterns/specification-pattern | 2 |

### Bidirectional link gaps (first 30)
| From | To | Shared topics |
| --- | --- | --- |
| recipes/ai/image-generation.md | recipes/ai/chatbot-openai.md | ai |
| recipes/ai/python-sentiment-analysis-nltk.md | recipes/ai/chatbot-openai.md | ai |
| recipes/api/api-logging-audit.md | recipes/api/api-documentation-openapi.md | api |
| recipes/api/api-rate-limiting-redis.md | recipes/api/api-documentation-openapi.md | api |
| recipes/api/call-rest-api.md | recipes/api/api-documentation-openapi.md | api |
| recipes/api/cursor-pagination-postgresql.md | recipes/api/api-documentation-openapi.md | api |
| recipes/api/graphql-api.md | recipes/api/api-documentation-openapi.md | api |
| recipes/api/real-time-notifications.md | recipes/api/api-documentation-openapi.md | api |
| recipes/concurrency/concurrent-data-structures.md | recipes/concurrency/python-thread-pool-executor.md | concurrency |
| recipes/concurrency/concurrent-data-structures.md | recipes/data/race-condition-prevention.md | concurrency |
| recipes/data/date-formatting.md | recipes/data/flatten-unflatten-objects.md | data |
| recipes/data/flatten-unflatten-objects.md | recipes/data/deep-clone-javascript.md | data |
| recipes/data/money-currency.md | recipes/data/flatten-unflatten-objects.md | data |
| recipes/data/parse-excel-files.md | recipes/data/parse-log-files.md | data |
| recipes/data/parse-log-files.md | recipes/observability/log-aggregation.md | observability |
| recipes/data/parse-log-files.md | recipes/data/parse-json.md | data |
| recipes/data/parse-log-files.md | recipes/data/regular-expressions.md | data |
| recipes/data/parse-xml-files.md | recipes/data/parse-log-files.md | data |
| recipes/data/validate-json-schema.md | recipes/data/parse-log-files.md | data |
| recipes/databases/database-migrations-safely.md | recipes/databases/optimistic-locking.md | databases |
| recipes/databases/database-migrations.md | recipes/databases/optimistic-locking.md | databases |
| recipes/databases/database-views-materialized.md | recipes/databases/optimistic-locking.md | databases |
| recipes/testing/python-coverage-pytest-cov.md | recipes/testing/implement-mutation-testing.md | testing |
| recipes/testing/python-coverage-pytest-cov.md | recipes/testing/setup-test-fixtures.md | testing |

### AI phrase usage in content
_No data._

### Low body links
| File | Links |
| --- | --- |
| src/content/docs/api/api-changelog-template.md | 1 |
| src/content/docs/api/api-deprecation-notice-template.md | 1 |
| src/content/docs/api/api-error-handling-guideline.md | 1 |
| src/content/docs/api/api-rate-limiting-policy-template.md | 1 |
| src/content/docs/api/sla-definition-template.md | 1 |
| src/content/docs/architecture/api-lifecycle-management-template.md | 1 |
| src/content/docs/architecture/api-monitoring-alerting-template.md | 1 |
| src/content/docs/architecture/api-performance-budget-template.md | 1 |
| src/content/docs/architecture/microservice-contract-template.md | 1 |
| src/content/docs/architecture/service-dependency-map-template.md | 1 |
| src/content/docs/architecture/system-diagram-template.md | 1 |
| src/content/docs/architecture/technical-spec-template.md | 1 |
| src/content/docs/data-engineering/data-governance-policy-template.md | 1 |
| src/content/docs/data-engineering/data-pipeline-design-document-template.md | 1 |
| src/content/docs/data-engineering/data-quality-rules-template.md | 1 |
| src/content/docs/data-engineering/etl-job-runbook-template.md | 1 |
| src/content/docs/devops/access-control-review-template.md | 1 |
| src/content/docs/devops/architecture-decision-record-adr-template.md | 1 |
| src/content/docs/devops/auto-scaling-policy-template.md | 1 |
| src/content/docs/devops/backup-and-restore-template.md | 1 |
| src/content/docs/devops/backup-verification-test-template.md | 1 |
| src/content/docs/devops/bug-triage-template.md | 0 |
| src/content/docs/devops/capacity-planning-forecast-template.md | 1 |
| src/content/docs/devops/change-management-template.md | 1 |
| src/content/docs/devops/ci-cd-pipeline-design-template.md | 1 |
| src/content/docs/devops/ci-cd-pipeline-security-template.md | 1 |
| src/content/docs/devops/cloud-cost-allocation-template.md | 1 |
| src/content/docs/devops/cloud-resource-tagging-policy-template.md | 1 |
| src/content/docs/devops/code-review-checklist-template.md | 0 |
| src/content/docs/devops/compliance-gap-analysis-template.md | 1 |


