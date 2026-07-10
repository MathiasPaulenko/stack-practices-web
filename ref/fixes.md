# Recipe Expansion Roadmap — Thin Content Fix

## Context

StackPractices requires all recipe files to exceed **300 lines** to avoid thin content penalties from Google Search and AdSense. Currently **197 recipe files** (across EN + ES pairs) are below this threshold, with most sitting at 170-250 lines.

### Goals per file

- **SEO**: Expand content depth to improve keyword coverage, long-tail search visibility, and FAQ schema eligibility. Each file should have enough substance for search engines to consider it valuable.
- **No thin content**: Google AdSense and Search Quality guidelines penalize shallow pages. Files under 300 lines risk being flagged as low-value content, reducing ad eligibility and search rankings.
- **Humanization**: Expanded content must read naturally — avoid AI-isms ("comprehensive guide", "leverage", "seamless", "delve into", "game-changer", etc.). Write in a direct, practical developer-to-developer tone.

### Expansion strategy

Add meaningful content to each file:
- More code examples (multi-language variants)
- More "Common Mistakes" entries
- More FAQ entries (2-4 per file)
- Deeper explanations in existing sections
- Production considerations and debugging tips

### Rules

- Bilingual parity: EN and ES files must have matching content and line counts
- Vary line counts to avoid uniformity (target 300-380 range)
- Defer lint/SEO meta fixes until after all expansions
- Edit only files in `src/content/recipes/`

---

## Checklist

### AI (16 files)

- [x] `ai/ai-agents.md` — 308 lines
- [x] `ai/ai-agents.es.md` — 308 lines
- [x] `ai/image-generation.md` — 307 lines
- [x] `ai/image-generation.es.md` — 304 lines
- [x] `ai/llm-fine-tuning.md` — 304 lines
- [x] `ai/llm-fine-tuning.es.md` — 305 lines
- [x] `ai/prompt-engineering.md` — 301 lines
- [x] `ai/prompt-engineering.es.md` — 301 lines
- [x] `ai/python-sentiment-analysis-nltk.md` — 310 lines
- [x] `ai/python-sentiment-analysis-nltk.es.md` — 309 lines
- [x] `ai/rag-pipeline.md` — 305 lines
- [x] `ai/rag-pipeline.es.md` — 306 lines
- [x] `ai/semantic-search.md` — 312 lines
- [x] `ai/semantic-search.es.md` — 313 lines
- [x] `ai/slack-bot-openai.md` — 311 lines
- [x] `ai/slack-bot-openai.es.md` — 311 lines

### API (30 files)

- [x] `api/api-logging-audit.md` — 303 lines
- [x] `api/api-logging-audit.es.md` — 301 lines
- [x] `api/api-rate-limiting.md` — 300 lines
- [x] `api/api-rate-limiting.es.md` — 300 lines
- [x] `api/api-versioning.md` — 302 lines
- [x] `api/api-versioning.es.md` — 302 lines
- [x] `api/call-rest-api.md` — 310 lines
- [x] `api/call-rest-api.es.md` — 309 lines
- [x] `api/express-middleware-patterns.md` — 306 lines
- [x] `api/express-middleware-patterns.es.md` — 303 lines
- [x] `api/graphql-api.md` — 300 lines
- [x] `api/graphql-api.es.md` — 300 lines
- [x] `api/graphql-apollo-server.md` — 303 lines
- [x] `api/graphql-apollo-server.es.md` — 303 lines
- [x] `api/grpc-api.md` — 301 lines
- [x] `api/grpc-api.es.md` — 300 lines
- [x] `api/handle-errors.md` — 301 lines
- [x] `api/handle-errors.es.md` — 301 lines
- [x] `api/input-validation.md` — 301 lines
- [x] `api/input-validation.es.md` — 301 lines
- [x] `api/logging.md` — 301 lines
- [x] `api/logging.es.md` — 301 lines
- [x] `api/middleware.md` — 301 lines
- [x] `api/middleware.es.md` — 301 lines
- [x] `api/pagination.md` — 301 lines
- [x] `api/pagination.es.md` — 301 lines
- [x] `api/rate-limiting.md` — 301 lines
- [x] `api/rate-limiting.es.md` — 301 lines
- [x] `api/real-time-notifications.md` — 316 lines
- [x] `api/real-time-notifications.es.md` — 314 lines
- [x] `api/send-emails-smtp.md` — 301 lines
- [x] `api/send-emails-smtp.es.md` — 300 lines
- [x] `api/server-sent-events-node.md` — 339 lines
- [x] `api/server-sent-events-node.es.md` — 328 lines
- [x] `api/webhooks.md` — 322 lines
- [x] `api/webhooks.es.md` — 320 lines
- [x] `api/websocket-authentication.md` — 313 lines
- [x] `api/websocket-authentication.es.md` — 313 lines

### Authentication (14 files)

- [x] `authentication/api-key-authentication.md` — 322 lines
- [x] `authentication/api-key-authentication.es.md` — 317 lines
- [x] `authentication/implement-rbac.es.md` — 339 lines
- [x] `authentication/magic-link-authentication.md` — 307 lines
- [x] `authentication/magic-link-authentication.es.md` — 301 lines
- [x] `authentication/oauth2-login.md` — 301 lines
- [x] `authentication/oauth2-login.es.md` — 300 lines
- [x] `authentication/password-hashing.md` — 301 lines
- [x] `authentication/password-hashing.es.md` — 301 lines
- [x] `authentication/session-management.md` — 378 lines
- [x] `authentication/session-management.es.md` — 375 lines
- [x] `authentication/two-factor-authentication.md` — 322 lines
- [x] `authentication/two-factor-authentication.es.md` — 322 lines

### Concurrency (8 files)

- [x] `concurrency/async-patterns.md` — 301 lines
- [x] `concurrency/async-patterns.es.md` — 301 lines
- [x] `concurrency/concurrent-data-structures.md` — 303 lines
- [x] `concurrency/concurrent-data-structures.es.md` — 300 lines
- [x] `concurrency/csp-communication.md` — 315 lines
- [x] `concurrency/csp-communication.es.md` — 315 lines
- [x] `concurrency/locks-and-mutexes.md` — 316 lines
- [x] `concurrency/locks-and-mutexes.es.md` — 303 lines

### Data (44 files)

- [x] `data/caching.md` — 306 lines
- [x] `data/caching.es.md` — 306 lines
- [x] `data/convert-csv-to-json.md` — 311 lines
- [x] `data/convert-csv-to-json.es.md` — 311 lines
- [x] `data/convert-json-to-csv.md` — 304 lines
- [x] `data/convert-json-to-csv.es.md` — 304 lines
- [x] `data/data-validation.md` — 303 lines
- [x] `data/data-validation.es.md` — 302 lines
- [x] `data/date-formatting.md` — 307 lines
- [x] `data/date-formatting.es.md` — 307 lines
- [x] `data/deep-clone-structured.md` — 315 lines
- [x] `data/deep-clone-structured.es.md` — 305 lines
- [x] `data/diff-json-objects.md` — 302 lines
- [x] `data/diff-json-objects.es.md` — 302 lines
- [x] `data/format-phone-numbers.md` — 309 lines
- [x] `data/format-phone-numbers.es.md` — 309 lines
- [x] `data/generate-pdf-report-python.md` — 316 lines
- [x] `data/generate-pdf-report-python.es.md` — 315 lines
- [x] `data/merge-json-files-javascript.md` — 314 lines
- [x] `data/merge-json-files-javascript.es.md` — 314 lines
- [x] `data/money-currency.md` — 316 lines
- [x] `data/money-currency.es.md` — 316 lines
- [x] `data/parse-command-line-arguments.md` — 305 lines
- [x] `data/parse-command-line-arguments.es.md` — 305 lines
- [x] `data/parse-csv-files.md` — 309 lines
- [x] `data/parse-csv-files.es.md` — 309 lines
- [x] `data/parse-csv-python-pandas.md` — 301 lines
- [x] `data/parse-csv-python-pandas.es.md` — 301 lines
- [x] `data/parse-excel-files.md` — 300 lines
- [x] `data/parse-excel-files.es.md` — 300 lines
- [x] `data/parse-log-files.md` — 310 lines
- [x] `data/parse-log-files.es.md` — 310 lines
- [x] `data/parse-markdown-files.md` — 329 lines
- [x] `data/parse-markdown-files.es.md` — 329 lines
- [x] `data/parse-pdf-files.md` — 303 lines
- [x] `data/parse-pdf-files.es.md` — 303 lines
- [x] `data/parse-xml-files.md` — 302 lines
- [x] `data/parse-xml-files.es.md` — 302 lines
- [x] `data/python-excel-read-write.md` — 300 lines
- [x] `data/python-excel-read-write.es.md` — 316 lines
- [x] `data/python-generate-qr-code.md` — 304 lines
- [x] `data/python-generate-qr-code.es.md` — 304 lines
- [x] `data/regular-expressions.md` — 302 lines
- [x] `data/regular-expressions.es.md` — 303 lines
- [x] `data/serialize-deserialize-data.md` — 307 lines
- [x] `data/serialize-deserialize-data.es.md` — 307 lines
- [x] `data/sort-array.md` — 305 lines
- [x] `data/sort-array.es.md` — 305 lines
- [x] `data/truncate-text.md` — 304 lines
- [x] `data/truncate-text.es.md` — 304 lines
- [x] `data/url-encoding-decoding.md` — 314 lines
- [x] `data/url-encoding-decoding.es.md` — 304 lines
- [x] `data/url-encoding.md` — 304 lines
- [x] `data/url-encoding.es.md` — 304 lines
- [x] `data/uuid-generation-strategies.md` — 302 lines
- [x] `data/uuid-generation-strategies.es.md` — 300 lines
- [x] `data/uuid-generation.md` — 301 lines
- [x] `data/uuid-generation.es.md` — 301 lines
- [x] `data/validate-json-schema.md` — 303 lines
- [x] `data/validate-json-schema.es.md` — 303 lines

### Frontend (6 files)

- [x] `frontend/email-templates-mjml.md` — 306 lines
- [x] `frontend/email-templates-mjml.es.md` — 300 lines
- [x] `frontend/server-side-rendering.md` — 300 lines
- [x] `frontend/server-side-rendering.es.md` — 300 lines
- [x] `frontend/websockets-realtime.md` — 302 lines
- [x] `frontend/websockets-realtime.es.md` — 300 lines

### GraphQL (2 files)

- [x] `graphql/graphql-dataloader-batching.md` — 302 lines
- [x] `graphql/graphql-dataloader-batching.es.md` — 302 lines

### Infrastructure (2 files)

- [x] `infrastructure/cost-optimization.md` — 300 lines
- [x] `infrastructure/cost-optimization.es.md` — 300 lines

### Messaging (8 files)

- [x] `messaging/dead-letter-queue.md` — 300 lines
- [x] `messaging/dead-letter-queue.es.md` — 300 lines
- [x] `messaging/event-driven-microservices.md` — 305 lines
- [x] `messaging/event-driven-microservices.es.md` — 305 lines
- [x] `messaging/message-idempotency.md` — 303 lines
- [x] `messaging/message-idempotency.es.md` — 303 lines
- [x] `messaging/rabbitmq-task-queue.md` — 301 lines
- [x] `messaging/rabbitmq-task-queue.es.md` — 301 lines

### Observability (12 files)

- [x] `observability/distributed-tracing.md` — 300 lines
- [x] `observability/distributed-tracing.es.md` — 300 lines
- [x] `observability/log-aggregation.md` — 300 lines
- [x] `observability/log-aggregation.es.md` — 300 lines
- [x] `observability/metrics-collection.md` — 306 lines
- [x] `observability/metrics-collection.es.md` — 306 lines
- [x] `observability/prometheus-api-monitoring.md` — 300 lines
- [x] `observability/prometheus-api-monitoring.es.md` — 300 lines
- [x] `observability/real-user-monitoring.md` — 302 lines
- [x] `observability/real-user-monitoring.es.md` — 302 lines
- [x] `observability/structured-logging.md` — 303 lines
- [x] `observability/structured-logging.es.md` — 301 lines

### Performance (12 files) — COMPLETED

- [x] `performance/brotli-nginx-compression.md` — 300 lines
- [x] `performance/brotli-nginx-compression.es.md` — 300 lines
- [x] `performance/cdn-edge-caching.md` — 303 lines
- [x] `performance/cdn-edge-caching.es.md` — 303 lines
- [x] `performance/connection-pooling.md` — 301 lines
- [x] `performance/connection-pooling.es.md` — 301 lines
- [x] `performance/lazy-loading.md` — 302 lines
- [x] `performance/lazy-loading.es.md` — 302 lines
- [x] `performance/load-testing-k6.md` — 303 lines
- [x] `performance/load-testing-k6.es.md` — 303 lines
- [x] `performance/spa-code-splitting-lazy.md` — 304 lines
- [x] `performance/spa-code-splitting-lazy.es.md` — 304 lines

### Serverless (8 files) — COMPLETED

- [x] `serverless/cold-start-optimization.md` — 300 lines
- [x] `serverless/cold-start-optimization.es.md` — 300 lines
- [x] `serverless/event-driven-functions.md` — 302 lines
- [x] `serverless/event-driven-functions.es.md` — 301 lines
- [x] `serverless/scheduled-jobs.md` — 301 lines
- [x] `serverless/scheduled-jobs.es.md` — 300 lines
- [x] `serverless/serverless-api-gateway.md` — 300 lines
- [x] `serverless/serverless-api-gateway.es.md` — 300 lines

### Testing (12 files) — COMPLETED

- [x] `testing/api-contract-testing.md` — 300 lines
- [x] `testing/api-contract-testing.es.md` — 303 lines
- [x] `testing/api-mocking.md` — 308 lines
- [x] `testing/api-mocking.es.md` — 308 lines
- [x] `testing/integration-testing-strategies.md` — 305 lines
- [x] `testing/integration-testing-strategies.es.md` — 305 lines
- [x] `testing/integration-testing.md` — 301 lines
- [x] `testing/integration-testing.es.md` — 301 lines
- [x] `testing/jest-snapshot-testing.md` — 307 lines
- [x] `testing/jest-snapshot-testing.es.md` — 307 lines
- [x] `testing/unit-testing-mocking.md` — 300 lines
- [x] `testing/unit-testing-mocking.es.md` — 302 lines

---

## Summary

| Category | Files | Avg lines |
|----------|-------|-----------|
| AI | 16 | ~308 (done) |
| API | 30 | ~210 |
| Authentication | 14 | ~215 |
| Concurrency | 8 | ~230 |
| Data | 44 | ~190 |
| Frontend | 6 | ~190 |
| GraphQL | 2 | ~244 |
| Infrastructure | 2 | ~177 |
| Messaging | 8 | ~205 |
| Observability | 12 | ~190 |
| Performance | 12 | ~200 |
| Serverless | 8 | ~185 |
| Testing | 12 | ~200 |
| **Total** | **197** | |
