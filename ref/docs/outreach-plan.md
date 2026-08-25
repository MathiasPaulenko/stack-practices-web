# P1.9 — Outbound / Linkable Asset Outreach Plan

> Date: 2026-08-25
> Status: Plan ready for execution (manual outreach by site owner)

## 1. Linkable Assets Inventory

### Tier 1 — High-value assets (≥3000 words + code + FAQ)

These 14 resources are the strongest candidates for earning backlinks.
They combine depth (3000+ words), practical code examples, and FAQ
sections that answer common search queries.

| # | URL | Words | Code blocks | Type | Why it's linkable |
|---|---|---|---|---|---|
| 1 | `/recipes/api-documentation-openapi/` | 3.405 | 83 | recipe | OpenAPI/Swagger/Redoc guide with CI linting. High search volume, 1.166 GSC impressions. |
| 2 | `/patterns/design/chain-of-responsibility-pattern/` | 6.967 | 3 | pattern | Classic GoF pattern with multi-language examples. Educational reference. |
| 3 | `/patterns/design/chain-of-responsponsibility-middleware/` | 6.624 | 2 | pattern | Middleware variant — practical ASP.NET/Express examples. |
| 4 | `/patterns/design/builder-pattern/` | 5.485 | 3 | pattern | Classic GoF pattern. Frequently referenced in OOP courses. |
| 5 | `/recipes/performance/database-indexing/` | 5.079 | 4 | recipe | Database indexing deep-dive. Evergreen, highly referenciable. |
| 6 | `/recipes/performance/web-performance/` | 4.802 | 3 | recipe | Web performance optimization. Core Web Vitals context. |
| 7 | `/recipes/testing/load-testing/` | 4.478 | 3 | recipe | Load testing guide with k6/Locust examples. DevOps reference. |
| 8 | `/patterns/design/command-pattern/` | 4.472 | 3 | pattern | Classic GoF pattern with undo/redo examples. |
| 9 | `/recipes/data/batch-processing-patterns/` | 3.909 | 2 | recipe | Batch processing patterns. Data engineering reference. |
| 10 | `/recipes/infrastructure/cost-optimization/` | 3.288 | 3 | recipe | Cloud cost optimization. Trending topic, FinOps. |
| 11 | `/patterns/design/builder-pattern-configuration/` | 3.349 | 2 | pattern | Configuration objects variant of Builder. |
| 12 | `/recipes/api/pagination/` | 3.128 | 3 | recipe | API pagination (cursor, offset, keyset). API design reference. |
| 13 | `/recipes/data/data-validation/` | 3.108 | 3 | recipe | Data validation across languages. Referenciable. |
| 14 | `/recipes/concurrency/async-patterns/` | 3.022 | 3 | recipe | Async patterns (Promise, asyncio, goroutines). |

### Tier 2 — Medium-value assets (2000-3000 words + code + FAQ)

73 additional resources with 2000-3000 words, code blocks, and FAQ.
These are good for niche/community backlinks. Full list in
`scripts/find-linkable-assets.py` output.

**Top Tier 2 picks** (by outreach potential):

| URL | Words | Why |
|---|---|---|
| `/recipes/data/parse-excel-files/` | 2.877 | Excel parsing — high SO search volume |
| `/recipes/data/parse-pdf-files/` | 2.937 | PDF parsing — high SO search volume |
| `/recipes/api/rate-limiting/` | 2.996 | Rate limiting — API design evergreen |
| `/recipes/data/convert-json-to-csv/` | 2.814 | JSON/CSV conversion — very high SO volume |
| `/recipes/authentication/session-management/` | 2.492 | Session management — security reference |
| `/recipes/data/parse-toml-files/` | 2.001 | TOML parsing — Python/Rust community |
| `/recipes/data/parse-xml-files/` | 2.501 | XML parsing — enterprise reference |
| `/recipes/data/parse-csv-files/` | 2.470 | CSV parsing — very high SO volume |
| `/recipes/messaging/dead-letter-queue/` | 2.766 | DLQ — messaging systems reference |
| `/recipes/frontend/server-side-rendering/` | 2.719 | SSR — frontend evergreen |
| `/recipes/data/validate-json-schema/` | 2.706 | JSON Schema validation — API reference |
| `/recipes/authentication/api-key-authentication/` | 2.653 | API keys — security reference |
| `/recipes/authentication/oauth2-login/` | 2.644 | OAuth2 — auth evergreen |
| `/recipes/ai/image-generation/` | 2.635 | AI image gen — trending |
| `/recipes/observability/structured-logging/` | 2.601 | Structured logging — DevOps reference |
| `/recipes/performance/cdn-edge-caching/` | 2.600 | CDN caching — performance evergreen |

### Tier 3 — Template/Runbook assets (docs)

Documentation templates are citable in GitHub repos, Slack, and internal wikis:

| URL | Type | Why |
|---|---|---|
| `/docs/security/security-incident-response-template/` | doc | Incident response template — citable in security wikis |
| `/docs/devops/architecture-decision-record-adr-template/` | doc | ADR template — citable in engineering handbooks |
| `/docs/security/vulnerability-management-process-template/` | doc | Vuln management — security ops reference |
| `/docs/devops/escalation-policy-template/` | doc | Escalation policy — SRE/DevOps reference |
| `/docs/security/penetration-test-report-template/` | doc | Pentest report — security community |

---

## 2. Outreach Targets

### Tier A — Developer communities (high authority, do-follow links)

| Platform | How | Asset fit | Link type |
|---|---|---|---|
| **Stack Overflow** | Answer questions related to OpenAPI, rate limiting, pagination, JSON/CSV parsing, async patterns. Link to relevant recipe as "more details" | Tier 1 + Tier 2 recipes | No-follow (but high referral traffic + SEO signals) |
| **GitHub** | Create "awesome-list" PRs (awesome-openapi, awesome-design-patterns, awesome-python). Add StackPractices links | Tier 1 patterns + recipes | Do-follow on GitHub READMEs |
| **Reddit** (r/programming, r/webdev, r/python, r/golang, r/devops) | Share guides as "I wrote a practical guide on X". Be genuine, not promotional | Tier 1 guides + patterns | No-follow (but high referral traffic) |
| **Hacker News** | Submit 1-2 high-quality guides (OpenAPI, database indexing, load testing). Title must be technical, not promotional | Tier 1 top picks | Do-follow (HN links are do-follow) |
| **dev.to** | Cross-post guides with canonical URL back to StackPractices | Tier 1 + Tier 2 | Do-follow (dev.to allows canonical) |
| **Medium** | Cross-post with canonical. Medium's paywall can limit reach but SEO benefit | Tier 1 | Do-follow with canonical |

### Tier B — Niche communities (targeted, engaged audience)

| Platform | Asset fit | How |
|---|---|---|
| **Python Discord / r/python** | parse-csv, parse-excel, parse-pdf, async-patterns, data-validation | Share in #resources |
| **Rust forums** | parse-toml, builder-pattern | Share in community threads |
| **ASP.NET community** | chain-of-responsibility-middleware, command-pattern | Share in GitHub Discussions |
| **FinOps community** | cost-optimization, database-indexing | Share in FinOps Slack |
| **Security community** | session-management, oauth2-login, api-key-authentication, incident-response-template | Share in security subreddits + Discord |
| **DevOps communities** | load-testing, structured-logging, dead-letter-queue, cdn-edge-caching | Share in r/devops, DevOps Discord |

### Tier C — Direct outreach (email/DM)

| Target | Asset fit | Approach |
|---|---|---|
| **Dev newsletters** (JavaScript Weekly, Python Weekly, DevOps Weekly, StatusCode) | Tier 1 guides | Submit via their "submit link" forms |
| **Tech bloggers** (write about API design, patterns, performance) | Tier 1 patterns + recipes | Email suggesting they link to StackPractices as a reference |
| **Course creators** (Udemy, Pluralsight, YouTube) | Tier 1 patterns | Suggest StackPractices as a supplementary resource |
| **Open source projects** (FastAPI, Express, Spring docs) | Recipes related to their ecosystem | PR to add "external resources" link in their docs |

---

## 3. Outreach Execution Plan

### Phase 1 — Quick wins (Week 1-2)

1. **Stack Overflow**: Find 10 unanswered questions matching Tier 1/2
   assets. Write thorough answers with link.
2. **GitHub awesome-lists**: Submit PRs to 5 awesome-lists
   (awesome-openapi, awesome-design-patterns, awesome-python,
   awesome-devops, awesome-security).
3. **dev.to**: Cross-post 3 Tier 1 guides with canonical URL.

### Phase 2 — Community engagement (Week 3-4)

1. **Reddit**: Share 3 guides in relevant subreddits
   (r/programming, r/webdev, r/python).
2. **dev.to**: Cross-post 3 more Tier 1 guides.
3. **Dev newsletters**: Submit 5 links to JavaScript Weekly,
   Python Weekly, DevOps Weekly.

### Phase 3 — Direct outreach (Week 5-8)

1. **Hacker News**: Submit 1 high-quality guide
   (database-indexing or load-testing).
2. **Open source docs**: PR to 3 projects (FastAPI, Express, Spring)
   to add StackPractices in "resources" section.
3. **Course creators**: Email 5 creators about linking to
   StackPractices patterns.

### Tracking

- Use GA4 `referral` traffic to measure impact.
- Use GSC `links` report to track new backlinks.
- Target: 10+ backlinks in 3 months.

---

## 4. Constraints

- **No spam**: Each outreach must be genuine and contextually relevant.
- **No paid links**: All links must be organic.
- **No link exchanges**: Avoid reciprocal link schemes.
- **Canonical first**: When cross-posting (dev.to, Medium), always use canonical URL pointing to StackPractices.
- **Quality over quantity**: 1 good Stack Overflow answer > 10 low-effort comments.

---

## 5. What NOT to do

- Do not mass-submit to directories.
- Do not buy backlinks.
- Do not use automated outreach tools for cold email.
- Do not post the same content on multiple subreddits.
- Do not cross-post without canonical URL.
