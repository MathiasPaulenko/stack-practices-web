# Google Search Visibility Forensic Audit — Single Resource

**Resource:** `api-documentation-openapi`
**URL (EN):** https://stackpractices.com/recipes/api-documentation-openapi/
**URL (ES):** https://stackpractices.com/es/recipes/api-documentation-openapi/
**Files:** `src/content/recipes/api/api-documentation-openapi.md` (EN, ~5,160 words), `src/content/recipes/api/api-documentation-openapi.es.md` (ES, ~5,100 words)
**Site:** StackPractices — Astro 5+ SSG, Tailwind CSS v4+, GitHub Pages, bilingual EN/ES
**Author:** Mathias Paulenko
**Audit date:** 2026-08-11

---

## GSC Data (last 28 days)

| Metric | Value |
|--------|-------|
| Impressions | 485 |
| Clicks | 2 |
| CTR | 0.62% |
| Average position | 34.4 |
| Impression delta vs prior 28 days | +472 |

**AI detection (desklib):** EN 50.9% (126 AI / 112 human / 68 skipped, 306 total sentences); ES 38.6% (74 AI / 191 human, 278 total sentences).
**Pattern findings:** 0 (EN and ES).
**Content quality score:** 90.2 / 100 (composite).

---

## PHASE 1 — Search Visibility Overview

### Executive summary

`api-documentation-openapi` is a high-impression, low-CTR page in a striking-distance position (~34). Google is showing the page for hundreds of queries but users are not clicking. The page is technically sound on the Astro SSG stack: all content ships in static HTML, canonical and hreflang use trailing slashes, JSON-LD is present, and the title rendering bug was fixed. The visibility bottleneck is not indexation — it is CTR, content depth in the FAQ section, and domain-level authority.

| Signal | Value | Source |
|--------|-------|--------|
| Indexed | Yes (EN + ES) | GSC shows 485 impressions, meaning the page is indexed and shown |
| Coverage ratio | 100% for this resource | Both EN and ES URLs are in the sitemap with correct trailing slashes |
| Average position | 34.4 | GSC |
| CTR | 0.62% | GSC (well below the ~2-3% expected for position 30-40) |
| Impressions | 485 (+472 delta) | GSC — rapid impression growth |
| Clicks | 2 | GSC |
| Growth trend | Impressions growing rapidly (+472 delta) | GSC |
| Click trend | Flat (2 clicks) | GSC |
| Visibility trend | Rising impressions, stagnant clicks | GSC |

**Key observation:** The +472 impression delta means Google is increasingly willing to show this page. The problem is that users see it in results and choose not to click. This is a CTR and snippet problem, not an indexation problem.

---

## PHASE 2 — Indexation Health

| Signal | Status | Evidence |
|--------|--------|---------|
| Indexed (EN) | Yes | 485 impressions in GSC |
| Indexed (ES) | Likely yes | ES URL has matching hreflang, sitemap entry, and content |
| Canonical | Correct | `https://stackpractices.com/recipes/api-documentation-openapi/` (trailing slash, no redirect) |
| Hreflang | Correct | en, es, x-default all present with trailing slashes, no redirect issues |
| Sitemap inclusion | Yes | Both EN and ES URLs in sitemap with correct trailing slash |
| Redirects | None | No redirect chains on this resource |
| noindex | No | No noindex directive present |
| Soft 404 | No | Page returns 200 with full content |
| Duplicate | No | Content is unique; ES is a translation, not a duplicate |

**Indexation Health Score: 95/100**

The page is fully indexable. All technical indexation signals are correct. The only minor gap is that only 3 FAQ entries are in JSON-LD while the page has ~30 FAQ questions (see Phase 5).

---

## PHASE 3 — Search Performance

### Query analysis

The page targets queries related to OpenAPI documentation, Swagger UI, and Redoc. Based on the frontmatter keywords (`openapi docs`, `swagger documentation`, `redoc`, `api documentation example`) and the content scope, the likely query categories are:

| Query category | Estimated volume | Expected CTR at pos 34 | Actual CTR |
|----------------|-----------------|----------------------|------------|
| "openapi docs" | Medium | ~2% | 0.62% |
| "swagger documentation" | Medium | ~2% | 0.62% |
| "api documentation example" | Low-medium | ~2% | 0.62% |
| "redoc" | Low | ~2% | 0.62% |
| Long-tail OpenAPI variants | Low | ~3% | 0.62% |

### CTR analysis

**Expected CTR at position 34:** ~1.5-2.5% based on industry benchmarks.
**Actual CTR:** 0.62%.
**CTR gap:** The page is underperforming CTR by approximately 3-4x.

**Root cause of low CTR (pre-fix):** The `<title>` tag was truncated to `How to Document an API with… | Recipe | StackPractices`, which removed the target keywords "OpenAPI", "Swagger UI" and "Redoc" from the SERP title. Users searching for "openapi docs" or "swagger documentation" saw a title that did not match their query.

**Current state (post-fix):** The title is now `How to Document an API with OpenAPI, Swagger UI and Redoc` (full, not truncated). This fix should improve CTR significantly, but GSC data has not yet reflected the change (the fix was applied during this audit cycle).

### Ranking distribution

- **Position 34.4:** The page is in striking distance (positions 20-40). Moving to position 15-20 could 3-5x the click volume.
- **Impression growth (+472):** Google is testing the page in more query variations, which is a positive signal.

### Quick wins

1. **CTR improvement from title fix** — The title fix alone should improve CTR from ~0.62% to ~1.5-2% if the page stays at position 34.
2. **FAQ condensing** — Reducing from ~30 to 8-10 high-value questions would reduce the AI-detection footprint and improve content quality signals.
3. **JSON-LD FAQ expansion** — Expanding from 3 to 8-10 FAQ entries in JSON-LD could earn FAQ rich results, which increase CTR by 20-80%.

---

## PHASE 4 — Googlebot Behavior

| Signal | Status | Evidence |
|--------|--------|---------|
| Crawl frequency | Normal | 485 impressions indicate regular crawling |
| Response codes | 200 OK | No redirect chains, no 404, no 503 |
| Rendering issues | None | Astro SSG ships all content in static HTML; zero JS required |
| JavaScript dependency | None | Astro ships zero JS by default; all content is in the initial HTML |
| Crawl errors | None | No errors reported for this resource |
| Page size | ~5,160 words | Large page but within normal range for a comprehensive guide |
| Blocked resources | None | robots.txt is permissive |

**Googlebot Score: 95/100**

Crawl efficiency is not limiting visibility. The Astro SSG architecture ensures Googlebot sees all content without JavaScript execution. This is a major improvement over the legacy Angular architecture and removes rendering as a visibility bottleneck.

---

## PHASE 5 — Content Visibility

| Category | Status | Evidence |
|----------|--------|---------|
| Impressions but low clicks | Yes | 485 impressions, 2 clicks — the page is shown but not clicked |
| Clicks but poor ranking | No | Only 2 clicks, position 34.4 — clicks are low because of position and CTR |
| Never shown | No | Page is being shown for hundreds of queries |
| Declining visibility | No | Impressions are growing (+472 delta) |
| Increasing visibility | Yes | Rapid impression growth |
| Deserves better rankings | Yes | Content quality score is 90.2/100; the page has comprehensive coverage |
| Google appears to ignore | No | Google is actively showing the page |

### Content quality signals

| Signal | Value | Impact |
|--------|-------|--------|
| Content quality score | 90.2/100 | Strong — Google should perceive this as quality content |
| AI detection (EN) | 50.9% | Moderate risk — FAQ section contributes most AI-like content |
| AI detection (ES) | 38.6% | Lower risk — ES version is more human-like |
| Pattern findings | 0 | No mechanical AI patterns detected |
| Word count (EN) | ~5,160 | Comprehensive |
| Word count (ES) | ~5,100 | Comprehensive |
| Bilingual parity | 100% | ES version is a complete translation |
| Build score | 100 | No build errors |
| Links score | 100 | No broken links |
| Validation score | 100 | All frontmatter valid |

### FAQ section analysis

The page contains approximately 30 FAQ questions (lines 175-341 of the source file). Key observations:

1. **Only 3 FAQ entries in JSON-LD** — The page has ~30 visible FAQ questions but only 3 are encoded in FAQPage JSON-LD structured data. This means Google cannot generate FAQ rich results for the remaining 27 questions.
2. **Mechanical Q&A patterns** — Many FAQ answers follow the pattern "Use X. For Y: `inline code`." with minimal explanation. The AI detection model flags these as AI-like (50.9% EN).
3. **Reference-dump answers** — Several answers are essentially inline YAML/JSON snippets with one sentence of introduction, which reads as reference documentation rather than helpful explanations.
4. **The first FAQ question is humanized** — "Should I use code-first or design-first?" has a proper explanation with trade-offs, code examples, and risk analysis. The remaining ~29 questions do not match this quality.

---

## PHASE 6 — Topical Authority

| Signal | Status | Evidence |
|--------|--------|---------|
| Topic coverage | Good | Covers OpenAPI, Swagger UI, Redoc, FastAPI, Express, SpringDoc |
| Cluster coverage | Moderate | 9 relatedResources in frontmatter (api-versioning, call-rest-api, graphql-api, handle-cors, handle-errors, api-logging-audit, api-rate-limiting-redis, cursor-pagination-postgresql, real-time-notifications) |
| Topic depth | Good for main body, weak for FAQ | Main sections are comprehensive; FAQ is shallow |
| Content gaps | API gateway integration, AsyncAPI comparison | Could expand into adjacent topics |
| Topic duplication | No | No cannibalization detected for this resource |
| Pillar pages | This page could serve as a pillar for API documentation topic | |
| Supporting pages | 9 related resources linked | |
| Internal linking | Good outbound, unknown inbound | The page links to 9 related resources; inbound link count is unknown |

**Topical Authority Score: 65/100**

The page has good topic coverage and outbound internal linking. The main weakness is that we cannot confirm strong inbound internal links from other pages. The API topic cluster on StackPractices includes multiple recipes (api-versioning, call-rest-api, graphql-api, handle-cors, handle-errors, etc.), which provides topical depth. However, the page would benefit from more contextual internal links from guides and patterns pages.

---

## PHASE 7 — EEAT Signals

| Signal | Status | Evidence |
|--------|--------|---------|
| Experience | Moderate | Content shows practical knowledge (DTOs vs entities, 3.0 vs 3.1 nullable, CI lint) but lacks first-person war stories |
| Expertise | Good | Correct technical details across Python, JavaScript, and Java stacks |
| Authority | Weak | Domain is relatively new; no external backlinks confirmed for this page |
| Trust | Moderate | Author is identified (Mathias Paulenko), about page exists, but no editorial policy page |
| Author visibility | Low | Single author for entire site; no external author profiles linked |
| About page | Yes | `/about` page exists |
| Editorial policy | No | No editorial policy page found |
| Contact information | Yes | Available on the site |
| Transparency | Moderate | Author name present; no contributor bylines or review dates |
| Brand consistency | Good | Consistent branding across the site |

**EEAT Score: 55/100**

Weak authority is the primary EEAT limitation. The content demonstrates expertise but the domain lacks external validation (backlinks, mentions, citations). Adding an editorial policy page and linking the author to external profiles (GitHub, LinkedIn) would improve trust signals.

---

## PHASE 8 — Brand Signals

| Signal | Status | Evidence |
|--------|--------|---------|
| Branded searches | Unknown | No GSC brand query data available for this resource |
| Direct traffic | Unknown | No GA4 data reviewed for this specific page |
| Brand mentions | Low | StackPractices is a relatively new domain |
| GitHub | Yes | Site is hosted on GitHub Pages; repository likely public |
| LinkedIn | Unknown | No author LinkedIn profile linked from the page |
| External profiles | Low | No external author profiles linked |
| Community presence | Low | No evidence of community engagement (Stack Overflow, Reddit, dev.to) |
| Open source projects | Unknown | No open source projects linked from the page |

**Brand Score: 40/100**

StackPractices is not yet recognized as a brand by Google. This is expected for a newer domain and is a long-term limitation, not an immediate fix.

---

## PHASE 9 — Authority Signals

| Signal | Status | Evidence |
|--------|--------|---------|
| Backlinks | Unknown | No backlink data available for this specific page |
| Referring domains | Unknown | No referring domain data available |
| Link quality | N/A | |
| Internal authority | Moderate | 9 outbound related resources; unknown inbound links |
| External authority | Weak | Domain-level authority is low for a newer site |
| Resource pages | No | No external resource pages linking to this content |
| Mentions | Low | No external mentions confirmed |
| Directories | No | Not listed in developer resource directories |
| Communities | No | No community references |
| Open source | No | No open source project references |
| Educational references | No | No educational institution references |

**Authority Score: 35/100**

Lack of external authority is the single biggest long-term limiting factor. This cannot be fixed quickly but is the primary reason the page is at position 34 rather than 10-15.

---

## PHASE 10 — Competitor Gap

Leading competitors for "OpenAPI documentation" queries include:

| Competitor | Content depth | Authority | Backlinks | Internal linking | EEAT | Technical quality |
|-----------|--------------|-----------|-----------|-----------------|------|-------------------|
| Swagger.io official docs | High | Very high | Thousands | Strong | High (OpenAPI Initiative) | High |
| Redocly docs | High | High | Hundreds | Strong | High (tool maintainer) | High |
| FastAPI docs | High | High | Hundreds | Strong | High (framework author) | High |
| Baeldung (SpringDoc) | Medium-high | High | Hundreds | Strong | High | Medium |
| StackPractices | High | Low | Few | Moderate | Moderate | High (Astro SSG) |

**Why competitors outperform this page:**

1. **Domain authority:** Swagger.io, Redocly, and Baeldung have established domain authority with hundreds or thousands of backlinks. StackPractices is a newer domain with minimal external authority.
2. **Brand recognition:** Users searching for "swagger documentation" expect to find swagger.io. StackPractices is an unknown brand in this space.
3. **Content depth parity:** The content quality is comparable (90.2/100), but competitors have richer internal linking ecosystems and more user engagement signals.
4. **FAQ rich results:** Competitors with FAQ schema rich results get higher CTR. StackPractices has ~30 FAQ questions but only 3 in JSON-LD, missing rich result opportunities.

---

## PHASE 11 — Root Cause Analysis

| Factor | Contribution % | Justification |
|--------|----------------|---------------|
| CTR / snippet quality | 30% | Title was truncated (now fixed), meta description is generic, only 3 FAQ in JSON-LD |
| Content quality (FAQ) | 20% | FAQ section is ~30 mechanical Q&A pairs, contributing to 50.9% AI detection score |
| Authority / backlinks | 25% | Domain lacks external authority; competitors have hundreds of backlinks |
| Position / ranking | 15% | Position 34.4 is below the first page; moving to page 1 requires authority + content depth |
| Internal linking | 5% | Good outbound links but unknown inbound link strength |
| EEAT | 5% | Single author, no editorial policy, no external author profiles |

**Total: 100%**

The visibility problem is primarily a CTR problem (30%) compounded by domain authority (25%) and FAQ content quality (20%). The title fix addresses the largest single CTR factor, but FAQ condensing and JSON-LD expansion are needed to fully address the CTR gap.

---

## PHASE 12 — Opportunity Analysis

### Quick wins (0-7 days)

| Opportunity | Impact | Effort | ROI |
|------------|--------|--------|-----|
| Title fix (already done) | High | Done | Very high |
| Expand JSON-LD FAQ from 3 to 8-10 entries | High | Low | Very high |
| Improve meta description specificity | Medium | Low | High |

### Medium-term wins (7-30 days)

| Opportunity | Impact | Effort | ROI |
|------------|--------|--------|-----|
| Condense FAQ from ~30 to 8-10 high-value questions | High | Medium | High |
| Reduce AI detection by humanizing remaining FAQ answers | Medium | Medium | Medium |
| Add contextual internal links from API guides and patterns | Medium | Medium | Medium |
| Add first-person experience or war story to the article | Medium | Medium | Medium |

### Long-term wins (30-90 days)

| Opportunity | Impact | Effort | ROI |
|------------|--------|--------|-----|
| Build external backlinks (dev.to cross-post, GitHub README links) | High | High | Medium |
| Add editorial policy page for EEAT | Medium | Low | Medium |
| Link author to external profiles (GitHub, LinkedIn) | Low | Low | Medium |
| Create supporting content (API documentation guide, OpenAPI 3.1 migration guide) | Medium | High | Medium |

---

## PHASE 13 — 90-Day Recovery Roadmap

### First 7 days

1. Expand JSON-LD FAQPage from 3 to 8-10 entries (select the highest-value questions)
2. Improve meta description to be more specific and action-oriented
3. Request indexing in GSC for both EN and ES URLs after changes

### First 30 days

4. Condense FAQ from ~30 to 8-10 high-value questions with full explanations
5. Humanize remaining FAQ answers to reduce AI detection below 40%
6. Add 3-5 contextual internal links from API-related guides and patterns
7. Monitor GSC for CTR and position changes

### First 60 days

8. Add a first-person experience section or war story (e.g., "What broke when we skipped operationId")
9. Create an editorial policy page and link it from the article
10. Cross-post a condensed version to dev.to or Medium with a canonical link back
11. Add author external profile links (GitHub, LinkedIn) to the about page

### First 90 days

12. Build 3-5 external backlinks through community engagement (Stack Overflow answers, GitHub README links, dev.to)
13. Create supporting content: "OpenAPI 3.0 vs 3.1 Migration Guide" and link to this page
14. Monitor GSC performance and adjust strategy based on data

---

## PHASE 14 — Final Scores

| Score | Value /100 | Notes |
|-------|-----------|-------|
| Visibility Score | 45 | High impressions but very low CTR |
| Indexation Score | 95 | Fully indexed, correct canonical/hreflang/sitemap |
| Authority Score | 35 | Low domain authority, minimal backlinks |
| Content Score | 75 | Strong main body, weak FAQ section |
| EEAT Score | 55 | Identified author, no editorial policy, no external profiles |
| Googlebot Score | 95 | Astro SSG, zero JS, fast crawl |
| Topical Authority Score | 65 | Good topic coverage, moderate internal linking |
| Brand Score | 40 | Newer domain, low brand recognition |
| Competition Score | 30 | Competitors have strong authority and brand recognition |
| **Overall Search Visibility Score** | **52 / 100** | |

---

## Final Questions

### 1. Why is Google not giving this page more visibility?

Google is giving the page visibility (485 impressions, +472 delta). The problem is that users are not clicking (0.62% CTR). The title was truncated, removing target keywords from the SERP snippet (now fixed). Additionally, only 3 of ~30 FAQ questions are in JSON-LD, missing FAQ rich result opportunities that would increase CTR. The page is at position 34.4, which is striking distance but requires improved content depth and domain authority to move to page 1.

### 2. What are the three biggest limiting factors?

1. **CTR / snippet quality** (30%) — Title truncation (fixed), generic meta description, missing FAQ rich results
2. **Domain authority** (25%) — Newer domain with minimal backlinks competing against established authorities
3. **FAQ content quality** (20%) — ~30 mechanical Q&A pairs contributing to 50.9% AI detection and thin-content risk

### 3. If only three things could be improved, what should they be?

1. Expand JSON-LD FAQ from 3 to 8-10 entries to earn FAQ rich results
2. Condense FAQ from ~30 to 8-10 high-value questions with full explanations
3. Build 3-5 external backlinks through community engagement and cross-posting

### 4. What issues have the highest impact on rankings?

- **Domain authority** is the primary ranking limiter. The content quality (90.2/100) is competitive, but the domain lacks the authority to compete with Swagger.io, Redocly, and Baeldung.
- **Internal linking** from guides and patterns pages would distribute more PageRank to this page.
- **Content depth in FAQ** — Condensing and humanizing the FAQ would reduce AI-detection risk and improve helpful content signals.

### 5. What opportunities could realistically increase organic traffic within 90 days?

- **FAQ rich results** (JSON-LD expansion) — Could increase CTR by 20-80% if rich results are earned
- **Title fix impact** — The title fix should improve CTR from ~0.62% to ~1.5-2%, potentially doubling or tripling clicks
- **Position improvement** — Condensing FAQ and adding internal links could move the page from position 34 to 20-25, increasing impressions and CTR
- **Cross-posting** — A dev.to or Medium cross-post with canonical link could drive referral traffic and build backlinks

### 6. Which issues should NOT be prioritized?

- **Brand building** — Important long-term but not actionable in 90 days for a single resource
- **Backlink acquisition at scale** — Requires sustained outreach; focus on 3-5 high-quality links instead
- **Adding more FAQ questions** — The FAQ is already too long; condensing is the priority, not expanding
- **Technical SEO fixes** — The page is technically sound; no technical fixes needed beyond JSON-LD FAQ expansion

### 7. Would you recommend requesting indexing for this page?

Yes. After expanding JSON-LD FAQ and condensing the FAQ section, request indexing in GSC for both EN and ES URLs to accelerate re-crawling and rich result eligibility evaluation.
