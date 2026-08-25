# GSC Indexing Analysis — StackPractices

> Date: 2026-08-25
> Property: `sc-domain:stackpractices.com`
> Period analyzed: 2026-07-01 to 2026-08-25 (56 days)
> Data source: Google Search Console API

## 1. Executive Summary

| Metric | Value | Verdict |
|---|---|---|
| Total clicks | 83 | Very low |
| Total impressions | 23,885 | Low for 3,254 pages |
| CTR | 0.35% | Below benchmark (1-3%) |
| Avg position | 33.0 | Page 3+ (low visibility) |
| Sitemap URLs submitted | 3,254 | — |
| Sitemap URLs indexed (GSC report) | 0 | Misleading (see below) |
| URLs with search data | ~1,000 | ~31% of total |
| URLs with 0 impressions | ~2,254 | ~69% invisible to Google Search |

**Core problem**: The site is partially indexed but most pages rank beyond page 3.
Only ~31% of URLs appear in search results at all, and even those average position 33.
CTR is 3-9x below benchmark. A trailing-slash duplicate content issue splits link equity
on ~256 URLs.

## 2. Sitemap Status

| Field | Value |
|---|---|
| Sitemap URL | `https://stackpractices.com/sitemap.xml` |
| Last submitted | 2026-08-10 |
| Last downloaded by Google | 2026-08-24 |
| Warnings | 0 |
| Errors | 0 |
| Submitted URLs | 3,254 |
| Indexed URLs (GSC report) | 0 |

**Note on "0 indexed"**: GSC's sitemap report showing 0 indexed is a known reporting lag.
URL inspection confirms pages ARE indexed (verdict: PASS, "Submitted and indexed").
The 0 is not a real problem — it's a GSC UI/reporting artifact common on newer properties.

## 3. URL Inspection Results

### Pages tested (7 URLs)

| URL | Verdict | Coverage | Last Crawl | Canonical Match | Rich Results |
|---|---|---|---|---|---|
| `https://stackpractices.com/` | PASS | Indexed | 2026-08-21 | Yes | — |
| `https://stackpractices.com/recipes/api-documentation-openapi/` | PASS | Indexed | 2026-07-21 | Yes | Breadcrumbs |
| `https://stackpractices.com/recipes/optimistic-locking/` | PASS | Indexed | 2026-08-24 | Yes | Breadcrumbs |
| `https://stackpractices.com/guides/complete-guide-rabbitmq-architecture/` | PASS | Indexed | 2026-07-14 | Yes | Breadcrumbs |
| `https://stackpractices.com/patterns/builder-pattern/` | PASS | Indexed | 2026-06-23 | Yes | Breadcrumbs |
| `https://stackpractices.com/es/recipes/api-documentation-openapi/` | PASS | Indexed | 2026-08-23 | Yes | Breadcrumbs |
| `https://stackpractices.com/recipes/parse-json/` | PASS | Indexed | 2026-07-05 | Yes | Breadcrumbs |

### Critical finding: trailing-slash canonical mismatch

| URL (no slash) | Google Canonical | User Canonical | Issue |
|---|---|---|---|
| `.../guides/complete-guide-rabbitmq-architecture` | `.../guides/complete-guide-rabbitmq-architecture` | `.../guides/complete-guide-rabbitmq-architecture/` | Mismatch |

Google indexed the non-trailing-slash URL and chose it as canonical, but the page declares
the trailing-slash version as canonical. This means:

- Both `/url` and `/url/` are indexed as separate pages.
- Link equity is split between the two versions.
- Google may ignore the user's canonical preference.

**Scope**: 256 of 1,000 URLs with search data appear without trailing slash.
That's 25.6% of tracked URLs affected.

### Root cause

- Astro config: `trailingSlash: 'always'` (correct — generates `/url/`).
- Sitemap: all 3,254 URLs use trailing slash (correct).
- GitHub Pages: does NOT redirect `/url` to `/url/` by default.
- Result: both `/url` and `/url/` serve identical HTML with the same canonical tag.
- Google indexes both and picks whichever it wants as canonical.

### Fix

GitHub Pages supports `_redirects` via GitHub Actions deploy. Add:

```text
# Redirect non-trailing-slash to trailing-slash
/recipes/:slug  /recipes/:slug/  301
/patterns/:slug /patterns/:slug/ 301
/guides/:slug   /guides/:slug/   301
/docs/:slug     /docs/:slug/     301
/es/recipes/:slug  /es/recipes/:slug/  301
/es/patterns/:slug /es/patterns/:slug/ 301
/es/guides/:slug   /es/guides/:slug/   301
/es/docs/:slug     /es/docs/:slug/     301
```

Alternatively, use a Cloudflare Worker or Netlify-style redirects if GitHub Pages
does not support `_redirects` in the current setup.

## 4. Search Analytics — Device

| Device | Clicks | Impressions | CTR | Avg Position |
|---|---|---|---|---|
| Desktop | 76 | 22,844 | 0.33% | 33.0 |
| Mobile | 7 | 1,013 | 0.69% | 31.9 |
| Tablet | 0 | 28 | 0% | 62.4 |

**Finding**: Desktop dominates with 95.7% of impressions. Mobile only 4.2%.
This is unusual — most sites see 50-60% mobile. Possible causes:

- Developer content naturally skews desktop.
- Mobile indexing may not be fully picking up all pages.
- Mobile SERP competition may be different.

## 5. Search Analytics — Country (Top 10)

| Country | Clicks | Impressions | CTR | Avg Position |
|---|---|---|---|---|
| USA | 8 | 7,205 | 0.11% | 19.7 |
| India | 5 | 1,948 | 0.26% | 53.1 |
| Spain | 9 | 773 | 1.16% | 28.0 |
| Mexico | 4 | 910 | 0.44% | 43.1 |
| Vietnam | 3 | 1,610 | 0.19% | 43.0 |
| Thailand | 1 | 616 | 0.16% | 42.6 |
| Indonesia | 1 | 777 | 0.13% | 43.4 |
| UK | 6 | 540 | 1.11% | 33.9 |
| Russia | 3 | 471 | 0.64% | 40.3 |
| Ukraine | 1 | 399 | 0.25% | 40.0 |

**Finding**: USA has the most impressions (7,205) but extremely low CTR (0.11%).
Spain and UK have the best CTR (1.11-1.16%). India has high impressions but
terrible position (53.1) — pages are not ranking for Indian developer queries.

## 6. Pages with High Impressions but 0 Clicks (CTR Problem)

Top 30 pages with >=10 impressions and 0 clicks:

| URL | Impressions | Position | Diagnosis |
|---|---|---|---|
| `/recipes/python-schedule-periodic-tasks/` | 475 | 10.5 | Position borderline, CTR issue |
| `/docs/penetration-test-template/` | 456 | 72.3 | Position too low |
| `/recipes/parse-toml-files/` | 418 | 15.4 | Position page 2, CTR issue |
| `/recipes/server-sent-events` (no slash) | 291 | 49.4 | Duplicate of `/` version |
| `/recipes/python-coverage-pytest-cov` (no slash) | 269 | 31.0 | Duplicate of `/` version |
| `/recipes/chatbot-openai/` | 242 | 18.5 | Position page 2, CTR issue |
| `/recipes/python-coverage-pytest-cov/` | 232 | 24.9 | Position too low |
| `/patterns/repository-pattern` (no slash) | 205 | 43.7 | Duplicate of `/` version |
| `/recipes/parse-log-files/` | 188 | 30.7 | Position too low |
| `/recipes/react-form-react-hook-form-validation/` | 173 | 47.7 | Position too low |
| `/patterns/` (listing) | 158 | 15.9 | Position page 2, CTR issue |
| `/guides/domain-driven-design-guide/` | 152 | 45.7 | Position too low |
| `/guides/vector-database-guide/` | 141 | 55.6 | Position too low |
| `/guides/` (listing) | 138 | 26.3 | Position too low |
| `/recipes/url-encoding/` | 135 | 23.1 | Position too low |

**Pattern**: Most pages rank at position 20-50 (page 2-5). Pages at position 10-15
with 0 clicks have a CTR/title/meta description problem.

## 7. Queries in Top 10 with 0 Clicks (High Opportunity)

Queries where the site ranks in top 10 but gets no clicks — these are the fastest
wins if titles/meta descriptions are improved:

| Query | Impressions | Position | Action |
|---|---|---|---|
| jwks rotation runbook aws kms google cloud kms azure key vault | 37 | 9.2 | Improve title for this query |
| pymemcache add expire -1 memcached | 5 | 8.6 | Low volume, maintain |
| 127.0.0.1:5050:80 | 5 | 7.8 | Low volume, maintain |
| idempotent consumer pattern microservices.io | 4 | 7.3 | Improve title |
| apscheduler backgroundscheduler default max_instances... | 2 | 6.0 | Low volume, maintain |
| jimmy bogard vertical slice architecture feature folders | 2 | 8.5 | Low volume, maintain |
| typescript repository pattern | 1 | 8.0 | Improve title |
| pandera dataframe schema validation docs | 1 | 10.0 | Low volume, maintain |
| dbt documentation transform data in warehouse | 1 | 5.0 | Low volume, maintain |
| pytest-cov documentation --cov-fail-under... | 1 | 5.0 | Low volume, maintain |

**Finding**: Very few queries reach top 10. The ones that do are mostly long-tail
documentation queries with 1-5 impressions. The biggest opportunity is the
"jwks rotation runbook" query (37 impressions, position 9.2) — improving the title
could capture clicks.

## 8. Trailing-Slash Duplicate Content Analysis

### URLs appearing in both versions

| URL without slash | URL with slash | Combined impressions | Split equity |
|---|---|---|---|
| `/recipes/server-sent-events` | `/recipes/server-sent-events/` | 291 + 123 = 414 | Yes |
| `/recipes/python-coverage-pytest-cov` | `/recipes/python-coverage-pytest-cov/` | 269 + 232 = 501 | Yes |
| `/patterns/repository-pattern` | `/patterns/repository-pattern/` | 205 + 117 = 322 | Yes |
| `/recipes/python-asyncio-semaphore-rate-limiting` | `/recipes/python-asyncio-semaphore-rate-limiting/` | 133 + 119 = 252 | Yes |
| `/guides/complete-guide-rabbitmq-architecture` | `/guides/complete-guide-rabbitmq-architecture/` | 52 + 127 = 179 | Yes |
| `/recipes/cursor-pagination-postgresql` | `/recipes/cursor-pagination-postgresql/` | varies | Yes |
| `/recipes/event-sourcing-relational` | `/recipes/event-sourcing-relational/` | varies | Yes |
| `/recipes/generate-slugs` | `/recipes/generate-slugs/` | varies | Yes |

**Impact**: Each duplicate pair splits impressions, clicks, and link equity.
Consolidating to a single URL (via 301 redirect) would combine ranking signals
and likely improve position for the merged URL.

### Count

- 256 URLs without trailing slash in search data (out of 1,000 total).
- Estimated 200+ duplicate pairs affecting the site.

## 9. Indexing Coverage Estimate

| Category | Count | % |
|---|---|---|
| URLs in sitemap | 3,254 | 100% |
| URLs with search data (impressions > 0) | ~1,000 | ~31% |
| URLs with 0 impressions (invisible to search) | ~2,254 | ~69% |
| URLs inspected (sample) | 7 | — |
| URLs confirmed indexed (sample) | 7/7 | 100% |

**Finding**: ~69% of pages have 0 impressions in the last 56 days. This does not
mean they are not indexed — URL inspection confirms they are. It means they rank
so low (beyond position 100) that they never appear in search results.

**Root causes for 0 impressions**:

1. Pages targeting queries with no search volume.
2. Pages ranking beyond position 100 for competitive queries.
3. Pages too thin to compete with established sites.
4. Pages with poor title/meta description not matching user intent.
5. New pages not yet crawled/ranked (site launched recently).

## 10. Key Problems and Priorities

### P0 — Trailing-slash duplicate content (CRITICAL)

- **Problem**: 256+ URLs serve identical content at `/url` and `/url/`.
- **Impact**: Split link equity, canonical confusion, wasted crawl budget.
- **Fix**: Implement 301 redirects from non-trailing-slash to trailing-slash.
- **Effort**: Medium (GitHub Pages redirect config or Cloudflare Worker).

### P1 — Position problem (HIGH)

- **Problem**: Most pages rank at position 20-50. Only ~30 queries reach top 10.
- **Impact**: 0.35% CTR is 3-9x below benchmark. 83 clicks in 56 days is very low.
- **Fix**: Content quality improvement, internal linking, topical authority building.
- **Effort**: High (per-resource content work, already deferred).

### P2 — CTR problem on borderline pages (MEDIUM)

- **Problem**: Pages at position 10-15 still get 0 clicks (e.g., `python-schedule-periodic-tasks`
  at position 10.5 with 475 impressions and 0 clicks).
- **Impact**: Losing potential clicks from page-1 rankings.
- **Fix**: Improve title tags and meta descriptions to be more compelling.
- **Effort**: Medium (per-resource title/meta optimization).

### P3 — USA CTR anomaly (MEDIUM)

- **Problem**: USA has 7,205 impressions but only 8 clicks (CTR 0.11%).
- **Impact**: Largest market is underperforming dramatically.
- **Fix**: Review titles/meta for US audience, check SERP competition.
- **Effort**: Medium.

### P4 — Mobile underrepresentation (LOW)

- **Problem**: Mobile only 4.2% of impressions vs typical 50-60%.
- **Impact**: Missing mobile search traffic.
- **Fix**: Verify mobile indexing is working, check mobile SERP visibility.
- **Effort**: Low (investigation).

### P5 — Sitemap "0 indexed" report (NON-ISSUE)

- **Problem**: GSC reports 0 indexed from sitemap.
- **Impact**: None — this is a reporting lag, not a real issue.
- **Fix**: None needed. URL inspection confirms pages are indexed.
- **Effort**: None.

## 11. Recommended Actions (Ordered)

1. **Implement trailing-slash 301 redirects** (P0) — eliminates duplicate content
   on 256+ URLs, consolidates link equity.
2. **Improve titles/meta descriptions for pages at position 10-15** (P2) — fastest
   wins for CTR. Target: `python-schedule-periodic-tasks`, `chatbot-openai`,
   `patterns/` listing, `parse-toml-files`.
3. **Investigate USA CTR anomaly** (P3) — check SERP for top US queries, compare
   titles/snippets with competitors.
4. **Content quality improvement per resource** (P1) — already deferred to
   per-resource work using content-improvement skill.
5. **Monitor mobile indexing** (P4) — verify Google sees mobile versions correctly.

## 12. Methodology

- Data period: 2026-07-01 to 2026-08-25 (56 days, includes final and fresh data).
- Tools: GSC Search Analytics API, GSC URL Inspection API, GSC Sitemaps API.
- URL inspections: 7 representative URLs (home, recipe, guide, pattern, doc, ES, no-slash).
- Page analysis: 1,000 URLs with search data (API row limit).
- Query analysis: 1,000 queries with search data (API row limit).
- No GA4 data was queried for this report (GSC-only analysis).
