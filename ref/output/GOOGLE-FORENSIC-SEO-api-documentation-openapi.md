# Google Forensic SEO Audit — `api-documentation-openapi`

**Resource:** `api-documentation-openapi` (recipe)
**URL (EN):** https://stackpractices.com/recipes/api-documentation-openapi/
**URL (ES):** https://stackpractices.com/es/recipes/api-documentation-openapi/
**Files:** `src/content/recipes/api/api-documentation-openapi.md`, `src/content/recipes/api/api-documentation-openapi.es.md`
**Site:** StackPractices (`https://stackpractices.com`) — Astro 5+ SSG, Tailwind CSS v4+, GitHub Pages
**Author:** Mathias Paulenko
**Audit date:** 2026-08-10
**GSC data (last 28 days):** 485 impressions, 2 clicks, 0.62% CTR, avg. position 34.4, +472 impression delta vs prior period
**Content quality score:** 90.2 / 100
**AI detection (desklib):** 50.9% EN, 38.6% ES — 0 pattern findings
**Data sources:** local repo (`D:\Codigo\stack-practices-web`), built HTML (`dist/recipes/api-documentation-openapi/index.html`), `public/sitemap.xml`, GSC metrics, existing audit outputs (`ref/output/`)

---

## Executive verdict

`api-documentation-openapi` is a **high-impression, low-CTR, striking-distance** page.

The page is technically sound from a rendering standpoint — Astro SSG ships fully static HTML with all content, structured data, and internal links present without JavaScript. This is a fundamental improvement over the legacy Angular SPA architecture. However, the page is stuck at position 34.4 with 485 impressions and only 2 clicks (0.62% CTR), which is below the ~1.5–3% CTR expected for positions 30–40.

The three highest-impact root causes for this specific resource are, in order:

1. **Title truncation bug (now fixed) suppressed target keywords in the SERP.** The `Seo.astro` component was aggressively truncating the `<title>` to `How to Document an API with… | Recipe | StackPractices`, removing "OpenAPI", "Swagger" and "Redoc" — the exact keywords users search for. This has been fixed; the built HTML now shows the full title. The fix should improve CTR once Google re-crawls and re-indexes.
2. **FAQ section is excessively long and shallow (~30 questions, mostly reference snippets).** The page has ~30 FAQ questions in the body, but only 3 are included in the `FAQPage` JSON-LD schema. The remaining ~27 are thin, one-sentence answers with inline YAML/JSON snippets that read as programmatic reference dumps. This creates a scaled-content signal and dilutes information density.
3. **Domain authority deficit limits ranking ceiling.** StackPractices is a relatively new domain with limited backlink profile. At position 34.4, the page is on the cusp of page 3–4 of Google results. Without external authority signals, moving into the top 10–20 requires either significantly stronger content differentiation or backlink acquisition.

---

## 1. Resource snapshot

| Metric | Value |
|--------|-------|
| Content type | Recipe |
| Topic | `api` |
| Tags | `api`, `documentation`, `java`, `rest`, `http` |
| Difficulty | beginner |
| Word count (EN) | ~5,100 words (source); ~1,926 visible words in built HTML |
| Word count (ES) | ~5,100 words (source) |
| Author | Mathias Paulenko |
| `publishedAt` | 2026-06-12 |
| `lastUpdated` | 2026-08-10 |
| `relatedResources` | 9 outgoing links |
| FAQ questions in body | ~30 |
| FAQ questions in JSON-LD | 3 |
| H1 count | 1 |
| H2 count | 17 (12 content + 5 layout/footer) |
| H3 count | 6 |
| Internal links in HTML | 50 |
| Built HTML size | 31,875 bytes (EN), 33,180 bytes (ES) |

---

## 2. Architecture & rendering verification

### Astro SSG — static HTML confirmed

| Check | Result | Evidence |
|-------|--------|----------|
| Framework | Astro v6.4.8 (`<meta name="generator" content="Astro v6.4.8">`) | Built HTML |
| Output mode | `static` (`astro.config.mjs`: `output: 'static'`) | Config file |
| Trailing slash | `always` (`astro.config.mjs`: `trailingSlash: 'always'`) | Config file |
| Build format | `directory` (`astro.config.mjs`: `build.format: 'directory'`) | Config file |
| `<app-root>` present | **NO** | Built HTML — no Angular artifacts |
| JS framework hydration | **NONE** — Astro ships zero JS by default | Built HTML — only 3 `<script>` tags (GA consent, GTM, Pagefind) |
| Content in static HTML | **YES** — full article body, headings, code blocks, tables, links | Built HTML |
| Render time | ~0 ms (static HTML, no client-side rendering required) | Architecture |

**Key finding:** Unlike the legacy Angular SPA architecture (which required 833 KB of JS and 5+ seconds to render), this Astro SSG page delivers all content in the initial HTML response. Googlebot receives the complete page on the first request with no JavaScript execution required.

### Built HTML verification (EN)

| Element | Value | Source |
|---------|-------|--------|
| `<title>` | `How to Document an API with OpenAPI, Swagger UI and Redoc` | `dist/recipes/api-documentation-openapi/index.html` |
| `<html lang>` | `en` | Built HTML |
| Canonical | `https://stackpractices.com/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| Hreflang `en` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| Hreflang `es` | `https://stackpractices.com/es/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| Hreflang `x-default` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| H1 | `How to Document an API with OpenAPI, Swagger UI and Redoc` | Built HTML |
| Meta description | `Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.` (154 chars) | Built HTML |
| Meta author | `Mathias Paulenko` | Built HTML |
| Meta keywords | `openapi docs, swagger documentation, redoc, api documentation example` | Built HTML |
| OG type | `article` | Built HTML |
| OG title | `How to Document an API with OpenAPI, Swagger UI and Redoc | StackPractices` | Built HTML |
| OG locale | `en_US` | Built HTML |
| Twitter card | `summary_large_image` | Built HTML |
| JSON-LD types | `Organization`, `Person`, `TechArticle`, `BreadcrumbList`, `FAQPage`, `Question`, `Answer`, `ListItem` | Built HTML |
| Robots meta | Not present (defaults to `index, follow`) | Built HTML |
| `noindex` | **NO** | Built HTML |

### Built HTML verification (ES)

| Element | Value | Source |
|---------|-------|--------|
| `<html lang>` | `es` | `dist/es/recipes/api-documentation-openapi/index.html` |
| Canonical | `https://stackpractices.com/es/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| Hreflang `en` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| Hreflang `es` | `https://stackpractices.com/es/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| Hreflang `x-default` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Built HTML — trailing slash correct |
| HTML size | 33,180 bytes | Built HTML |

---

## 3. Sitemap audit

| Check | Result |
|-------|--------|
| EN URL in sitemap | `https://stackpractices.com/recipes/api-documentation-openapi/` — present, trailing slash |
| ES URL in sitemap | `https://stackpractices.com/es/recipes/api-documentation-openapi/` — present, trailing slash |
| `lastmod` | `2026-08-10` |
| `changefreq` | `weekly` |
| `priority` (EN) | `0.8` |
| `priority` (ES) | `0.5` |
| Hreflang in sitemap | `en`, `es`, `x-default` — all with trailing slash, no redirects |
| `robots.txt` references sitemap | Yes (`Sitemap: https://stackpractices.com/sitemap.xml`) |

**Observation:** The sitemap entries for this resource are clean — no redirect chains, no trailing-slash mismatches, no missing hreflang annotations. This is a significant improvement over the legacy architecture where 2,349 of 2,352 sitemap URLs redirected.

**Minor issue:** ES `priority` is `0.5` vs EN `0.8`. This is a template-driven difference (ES entries appear to use a lower default). Google ignores `priority` for ranking, but it signals lower importance for crawl budget allocation. Consider aligning.

---

## 4. Internal linking graph

| Metric | Value |
|--------|-------|
| Outgoing `relatedResources` | 9 (`/recipes/api-versioning`, `/recipes/call-rest-api`, `/recipes/graphql-api`, `/recipes/handle-cors`, `/recipes/handle-errors`, `/recipes/api-logging-audit`, `/recipes/api-rate-limiting-redis`, `/recipes/cursor-pagination-postgresql`, `/recipes/real-time-notifications`) |
| Internal links in built HTML | 50 `<a>` tags |
| Crawl depth | 2–3 clicks from home (home → /recipes/ → page) |
| Navigation reachability | `/recipes/` listing, `/tags/api/`, `/tags/documentation/`, `/topics/api/`, related resources |
| Broken internal links | None observed for this resource |

**Assessment:** The internal linking for this resource is solid. The page is reachable from listing pages, tag pages, topic pages, and 9 related resources. Crawl depth is shallow. No broken links were detected on this page.

---

## 5. Content quality analysis

### Length and structure

| Section | Present | Word estimate | Quality |
|---------|---------|---------------|---------|
| Overview | Yes | ~150 | HIGH — starts from a real pain point (docs in READMEs/Slack drifting) |
| When to Use | Yes | ~80 | MEDIUM — clear but generic bullets |
| Solution | Yes | ~300 | HIGH — three runnable code examples (FastAPI, Express, SpringDoc) |
| Explanation | Yes | ~300 | HIGH — code-first vs design-first trade-offs with concrete failure modes |
| Variants | Yes | ~100 | MEDIUM — comparison table, could add trade-off notes |
| What Works | Yes | ~150 | HIGH — specific, actionable bullets |
| Common Mistakes | Yes | ~150 | HIGH — names real failure modes (drift, DTOs, nullable, hardcoded URLs) |
| Troubleshooting | Yes | ~150 | MEDIUM-HIGH — OpenAPI-specific, but some items lack concrete error messages |
| Further Reading | Yes | ~80 | HIGH — links to authoritative sources (OpenAPI spec, Redocly, FastAPI, Springdoc) |
| Production Notes | Yes | ~100 | HIGH — versioning, CI lint, monitoring doc endpoints |
| Key Takeaways | Yes | ~100 | HIGH — concrete and specific |
| FAQ | Yes | ~3,000+ | LOW-MEDIUM — ~30 questions, mostly one-sentence + inline YAML reference dumps |

### AI / template signals

| Signal | Status |
|--------|--------|
| AI detection (desklib) | 50.9% EN, 38.6% ES |
| Pattern findings | **0** (no flagged template phrases) |
| Sentence length variation | Natural (CV 0.78 EN, 0.71 ES — "natural variation" verdict) |
| Content quality score | 90.2 / 100 |
| Bilingual parity | 100 (validation score) |
| Build score | 100 |
| Links score | 100 |

**Assessment:** The main body (Overview through Key Takeaways) has been humanized and reads naturally. The AI detection score of 50.9% is borderline but not alarming — the top AI-flagged sentences are mostly short reference snippets in the FAQ (e.g., "For Python with httpx:", "Webhooks are supported natively:"). The FAQ is the primary source of AI signals.

### FAQ section — the weakest area

The page contains approximately 30 FAQ questions in the body, but only 3 are included in the `FAQPage` JSON-LD schema. The remaining questions are visible in HTML but not in structured data. This creates two problems:

1. **Schema mismatch:** Google sees 3 FAQ entries in JSON-LD but ~30 in the visible HTML. This inconsistency may cause Google to ignore the FAQ rich result entirely.
2. **Thin content at scale:** The ~27 non-schema FAQ questions are mostly one-sentence answers with inline YAML/JSON snippets. They read as programmatic reference dumps, not human-written explanations. This is the strongest scaled-content signal on the page.

**Top AI-flagged sentences (from `ai-detect-api-documentation-openapi.json`):**

| Sentence | AI score |
|----------|----------|
| "For Apigee: import the spec as an API proxy:" | 0.945 |
| "Use the envelope in responses:" | 0.944 |
| "Webhooks are supported natively:" | 0.917 |
| "For Python with httpx:" | 0.899 |
| "Document the request header:" | 0.875 |
| "For AWS API Gateway: import the spec:" | 0.866 |
| "Create a custom ruleset:" | 0.852 |

All of these are FAQ reference snippets — short, formulaic, and lacking explanatory context.

---

## 6. Title and meta description analysis

### Title tag

| Property | Value |
|----------|-------|
| Frontmatter title | `How to Document an API with OpenAPI, Swagger UI and Redoc` |
| Built `<title>` | `How to Document an API with OpenAPI, Swagger UI and Redoc` |
| Length | 59 characters (within 60-char limit) |
| Target keywords present | `OpenAPI`, `Swagger UI`, `Redoc`, `API`, `Document` |
| Status | **FIXED** — was previously truncated to `How to Document an API with…` |

**Historical context:** The `Seo.astro` component was aggressively truncating titles by reserving 22 characters for the brand suffix (`| Recipe | StackPractices`), leaving only ~38 characters for the unique title. This removed the target keywords "OpenAPI", "Swagger" and "Redoc" from the SERP title. The component was refactored to try the full title first, then shorter suffixes, then the title alone. The fix is verified in the built HTML.

**Impact on CTR:** The title truncation is the most likely cause of the 0.62% CTR. Users searching for "openapi documentation", "swagger ui tutorial", or "redoc vs swagger" would have seen `How to Document an API with…` in the SERP — a title that communicates nothing about the specific topic. With the fix, the SERP title now includes all target keywords.

### Meta description

| Property | Value |
|----------|-------|
| Content | `Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.` |
| Length | 154 characters (within 150–170 range) |
| Target keywords | `OpenAPI`, `Swagger UI`, `Redoc`, `REST APIs`, `Python`, `JavaScript`, `Java` |
| Assessment | Good — includes target terms, value proposition, and language coverage |

---

## 7. Structured data audit

### JSON-LD types present in built HTML

| Schema type | Present | Details |
|-------------|---------|---------|
| `Organization` | Yes | Site-level publisher |
| `Person` | Yes | Author entity (Mathias Paulenko) |
| `TechArticle` | Yes | `headline`, `description`, `author`, `publisher`, `dateModified`, `datePublished`, `inLanguage`, `educationalLevel` |
| `BreadcrumbList` | Yes | Home → Recipes → Article |
| `FAQPage` | Yes | **Only 3 questions** (out of ~30 in body) |
| `Question` / `Answer` | Yes | 3 pairs in JSON-LD |
| `ListItem` | Yes | Breadcrumb items |

### Critical finding: FAQ schema mismatch

The `FAQPage` JSON-LD contains only 3 questions, while the visible HTML body contains approximately 30 FAQ questions. This is caused by the `remark-truncate-faq.mjs` plugin which limits the number of FAQ entries included in structured data.

**Impact:**
- Google may display FAQ rich results for only 3 questions (or none if the mismatch triggers a validation error).
- The ~27 non-schema FAQ questions are still visible in HTML and consume crawl budget, but do not contribute to rich results.
- The large number of thin FAQ answers creates a scaled-content signal that may hurt rankings.

**Recommendation:** Either (a) condense the FAQ to 8–10 high-value questions and include all of them in JSON-LD, or (b) expand the JSON-LD to include all FAQ questions (if they are genuinely useful). Option (a) is strongly preferred.

---

## 8. E-E-A-T signals

### Positive signals

| Signal | Status |
|--------|--------|
| Author identified | `Mathias Paulenko` in frontmatter, `<meta name="author">`, and `Person` JSON-LD |
| Author page | `/authors/` or `/about/` exists with bio |
| `TechArticle` schema | Present with `author`, `datePublished`, `dateModified` |
| `lastUpdated` | `2026-08-10` — recent and specific to this resource (not mass-updated) |
| `publishedAt` | `2026-06-12` — distinct from `lastUpdated` |
| External citations | 4 authoritative outbound links (OpenAPI spec, Redocly, FastAPI docs, Springdoc) |
| Bilingual parity | EN + ES both complete and validated |
| Content quality score | 90.2 / 100 |

### Negative signals

| Signal | Status |
|--------|--------|
| Single-author concern | All content attributed to one author (mitigated by genuine expertise signals) |
| No first-person experience in FAQ | FAQ reads as reference documentation, not expert guidance |
| No images/screenshots | Page has no visual aids, diagrams, or screenshots (only code blocks) |
| No user signals | No comments, ratings, or community engagement |
| Limited backlink profile | New domain, limited external authority |

---

## 9. Root cause analysis — why 485 impressions, 2 clicks, position 34.4

### The impression→click funnel

| Stage | Metric | Expected | Actual | Gap |
|-------|--------|----------|--------|-----|
| Impressions | 485 | — | 485 | — |
| Avg. position | 34.4 | <20 for good CTR | 34.4 | -14 positions |
| CTR | 0.62% | 1.5–3% at pos 30–40 | 0.62% | -0.9 to -2.4 pp |
| Clicks | 2 | 7–15 | 2 | -5 to -13 |

### Root cause 1: Title truncation (now fixed) — Probability 9/10

The SERP title was `How to Document an API with… | Recipe | StackPractices` — a title that:
- Removed the three most important keywords: "OpenAPI", "Swagger", "Redoc"
- Added a generic "Recipe" label that dilutes topical relevance
- Communicated nothing about the specific topic to searchers

This is the single most likely cause of the low CTR. Users searching for "openapi documentation", "swagger ui tutorial", or "redoc api docs" would not recognize the truncated title as relevant.

**Evidence:** The built HTML before the fix showed the truncated title. After the `Seo.astro` refactor, the built HTML shows the full title `How to Document an API with OpenAPI, Swagger UI and Redoc` (59 chars, verified).

**Expected impact:** CTR should improve to 1.5–2.5% once Google re-crawls and reflects the new title in SERPs. At 485 impressions, this would yield 7–12 clicks per 28-day period.

### Root cause 2: Position 34.4 — striking distance but not page 1 — Probability 7/10

At position 34.4, the page appears on page 3–4 of Google results. Most users do not scroll past page 2. The page is close enough to benefit from ranking improvements but needs a push to reach page 1–2 (positions 1–20).

Factors keeping the page at position 34:
- **Domain authority:** StackPractices is a relatively new domain with limited backlink profile. Competing pages from Swagger.io, Redocly, FastAPI docs, Springdoc.org, and established tutorial sites (Baeldung, Medium, dev.to) have stronger authority.
- **Content depth vs. competitors:** The main body is strong, but the FAQ section dilutes the page with thin content. Google may be discounting the page's overall quality score due to the ~27 thin FAQ answers.
- **No unique visual content:** Competitors often include screenshots of Swagger UI, diagrams of the spec structure, or video walkthroughs. This page has only code blocks and text.

### Root cause 3: FAQ thin-content signal — Probability 6/10

The ~30 FAQ questions, mostly one-sentence answers with inline YAML/JSON, create a scaled-content pattern. While the AI detection score (50.9%) is borderline, the FAQ section is the primary source of AI-flagged sentences. Google's Helpful Content system may be discounting the page's quality score due to this section.

### Root cause 4: Impression growth without ranking improvement — Probability 5/10

The +472 impression delta (from ~13 to 485) suggests Google is increasingly showing the page for relevant queries. This is positive — it means the page is being considered for more search terms. However, the position has not improved proportionally, which suggests Google is testing the page in results but not yet confident enough to rank it higher.

**Likely trigger for impression growth:** The `lastUpdated` date of `2026-08-10` may have triggered a re-crawl and re-evaluation, expanding the query set Google considers this page relevant for.

---

## 10. Root cause probability scoring

| Root cause | Probability (1–10) | Confidence | Notes |
|------------|-------------------:|------------|-------|
| Title truncation suppressed CTR (now fixed) | **9** | High | Directly observed in built HTML; fix verified |
| Position 34 — domain authority deficit | **7** | High | New domain, limited backlinks, competing with authoritative docs |
| FAQ thin-content / scaled-content signal | **6** | Medium | ~30 FAQ, mostly reference snippets; 50.9% AI detection |
| FAQ schema mismatch (3 in JSON-LD vs ~30 in body) | **5** | Medium | May cause Google to ignore FAQ rich results |
| No images/screenshots/diagrams | **4** | Medium | Competitors have visual content; this page is text + code only |
| Impression growth without ranking improvement | **3** | Low | Google testing page in more queries but not promoting |

**Combined verdict:** The page is technically crawlable and indexable (Astro SSG delivers full static HTML), but is held back by a now-fixed title bug, domain authority deficit, and a thin FAQ section. The title fix should provide the largest short-term CTR improvement.

---

## 11. Competitor gap analysis

| Competitor | Strength | StackPractices gap |
|------------|----------|-------------------|
| Swagger.io (official) | Official documentation, brand authority | No official status; must differentiate with practical multi-stack examples |
| Redocly docs | Authoritative tool docs, CLI reference | Links to Redocly but does not provide original benchmarks or comparisons |
| FastAPI docs | Official framework docs with OpenAPI section | Covers FastAPI but not as deeply as official docs |
| Baeldung / Spring Guides | Strong domain authority, established audience | New domain, no established audience |
| dev.to / Medium tutorials | Community engagement, author diversity | No community signals, single author |
| Stoplight / SwaggerHub | Interactive tools, spec editors | No interactive tooling |

**Strategic implication:** This page's unique value is the multi-stack approach (Python + JavaScript + Java in one place) and the practical "what works / common mistakes" sections. To compete, it should lean into this differentiation and add original content (benchmarks, migration stories, screenshots) that competitors do not have.

---

## 12. Prioritized recovery action plan

### P0 — Immediate (already done)

1. **Title truncation fix — COMPLETED.**
   - `Seo.astro` refactored to preserve full title.
   - Built HTML verified: `<title>How to Document an API with OpenAPI, Swagger UI and Redoc</title>`.
   - Monitor GSC for CTR improvement after Google re-crawls (expect 2–4 weeks).

### P1 — Short-term (1–2 weeks)

1. **Condense FAQ to 8–10 high-value questions.**
   - Remove or merge the ~20 thin reference-snippet FAQ entries.
   - Keep the 3 already in JSON-LD plus 5–7 of the best remaining questions.
   - Ensure all remaining FAQ entries are included in `FAQPage` JSON-LD (fix the `remark-truncate-faq.mjs` limit or manually curate).
   - Rewrite each remaining FAQ answer to be 2–4 sentences with context, not just a code snippet.
2. **Add at least one screenshot or diagram.**
   - Screenshot of Swagger UI rendering the example API.
   - Screenshot of Redoc rendering the same spec.
   - A simple diagram showing code-first vs design-first workflow.
3. **Add a "When Not to Use" section.**
   - When the API is internal and small (Markdown may suffice).
   - When the team lacks CI discipline (spec will rot).
   - When the API is event-driven (consider AsyncAPI).

### P2 — Medium-term (2–4 weeks)

1. **Build internal authority for the API topic cluster.**
   - Ensure `/topics/api/` links to this page prominently.
   - Add contextual body links from related recipes (`/recipes/api-versioning`, `/recipes/handle-errors`, `/recipes/handle-cors`) back to this page.
   - Create a pillar page or guide that ties the API recipe cluster together.
2. **Add a downloadable `openapi.yaml` example.**
   - A complete, working spec file that readers can download and edit.
   - This adds unique utility that competitors' text-only tutorials lack.
3. **Align ES sitemap `priority` with EN.**
   - Currently ES `priority=0.5` vs EN `priority=0.8`. Align to `0.8` for both.

### P3 — Long-term (1–3 months)

1. **Earn backlinks to this specific page.**
   - Share on Reddit (r/webdev, r/Python, r/java), Hacker News, LinkedIn.
   - Reference from GitHub repos or READMEs where appropriate.
   - Pitch guest posts on API-focused blogs (Nordic APIs, APIs You Won't Hate).
2. **Add original research or benchmarks.**
   - Compare Swagger UI vs Redoc load times, bundle sizes, accessibility.
   - "State of OpenAPI Tooling 2026" — a data-driven piece that naturally attracts links.
3. **Monitor GSC weekly.**
   - Track impression, CTR, and position trends after each change.
   - Expect title fix to show CTR improvement within 2–4 weeks of re-crawl.
   - Expect FAQ condensation to improve average position within 4–8 weeks.

---

## 13. Final forensic verdict

`api-documentation-openapi` is a technically well-built page on a sound Astro SSG architecture. Unlike the legacy Angular SPA, Googlebot receives the complete page — content, structured data, internal links, hreflang — in the initial HTML response with zero JavaScript execution required. This eliminates the primary rendering barrier that plagued the previous architecture.

The page's underperformance (485 impressions, 2 clicks, 0.62% CTR, position 34.4) is explained by three factors:

1. **The title truncation bug (now fixed)** removed target keywords from the SERP, suppressing CTR. This was the single highest-impact issue and has been resolved.
2. **The FAQ section** (~30 thin reference snippets) creates a scaled-content signal and a JSON-LD mismatch (3 in schema vs ~30 in body), which may be capping the page's quality score.
3. **Domain authority deficit** limits the ranking ceiling. At position 34.4, the page needs stronger authority signals or significantly differentiated content to break into the top 20.

**Recovery is achievable.** The sequence is:
1. Wait for Google to re-crawl and reflect the fixed title (2–4 weeks).
2. Condense the FAQ and fix the schema mismatch (1–2 weeks).
3. Add visual content and a "When Not to Use" section (1–2 weeks).
4. Build internal authority and earn backlinks (1–3 months).

The +472 impression delta is a positive signal — Google is increasingly testing this page in relevant queries. With the title fix and FAQ condensation, the page should see improved CTR and gradual position improvement.

---

## Appendices

### A. Evidence files referenced

| File | Purpose |
|------|---------|
| `dist/recipes/api-documentation-openapi/index.html` | Built EN HTML — all verification done here |
| `dist/es/recipes/api-documentation-openapi/index.html` | Built ES HTML — all verification done here |
| `public/sitemap.xml` (lines 7923–7931, 20442–20450) | Sitemap entries for this resource |
| `astro.config.mjs` | Astro SSG config: `output: 'static'`, `trailingSlash: 'always'` |
| `public/robots.txt` | `Allow: /` + sitemap reference |
| `src/content/recipes/api/api-documentation-openapi.md` | EN source (360 lines) |
| `src/content/recipes/api/api-documentation-openapi.es.md` | ES source (1,736 lines) |
| `ref/output/SEO-360-api-documentation-openapi.md` | Prior SEO audit (title fix documented) |
| `ref/output/CONTENT-360-api-documentation-openapi.md` | Prior content quality audit |
| `ref/output/content-quality-score-api-documentation-openapi.json` | Quality score: 90.2/100 |
| `ref/output/ai-detect-api-documentation-openapi.json` | AI detection: 50.9% EN, 38.6% ES, 0 patterns |

### B. Key configuration references

| File | Setting | Value |
|------|---------|-------|
| `astro.config.mjs` | `output` | `static` |
| `astro.config.mjs` | `trailingSlash` | `always` |
| `astro.config.mjs` | `build.format` | `directory` |
| `astro.config.mjs` | `compressHTML` | `true` |
| `src/components/Seo.astro` | `trailingSlash` default | `true` |
| `src/components/Seo.astro` | `maxTitleLength` | 60 (with fallback logic) |
