# SEO-360 — Technical SEO Audit

**Resource:** `api-documentation-openapi`  
**URL:** https://stackpractices.com/recipes/api-documentation-openapi/  
**Spanish URL:** https://stackpractices.com/es/recipes/api-documentation-openapi/  
**Files:** `src/content/recipes/api/api-documentation-openapi.md`, `src/content/recipes/api/api-documentation-openapi.es.md`  
**Audit date:** 2026-08-10  
**GSC data observed (last 28 days):** 485 impressions, 2 clicks, 0.62% CTR, avg. position 34.4, +472 impression delta vs prior 28 days.  

---

## 1. Executive Summary

`api-documentation-openapi` is a high-impression, low-CTR page in a striking-distance position (~34). The recent humanization pass improved content quality, title and meta.

**Critical on-page SEO bug discovered and fixed during this audit:** the `Seo.astro` component was aggressively truncating the `<title>` tag. The rendered title was `How to Document an API with… | Recipe | StackPractices`, which removed the target keywords "OpenAPI", "Swagger" and "Redoc" from the SERP title. The component was refactored to preserve the full title (or fall back to shorter brand suffixes) so the `<title>` now reads `How to Document an API with OpenAPI, Swagger UI and Redoc` and the `og:title` includes the brand. The build has been regenerated and verified.

The page is otherwise technically sound: canonical, hreflang, structured data, sitemap inclusion and internal linking are in place.

The page is otherwise technically sound: canonical, hreflang, structured data, sitemap inclusion and internal linking are in place. The biggest SEO lever is fixing the title rendering, followed by condensing the FAQ to reduce thin-content risk and improving the internal-link graph.

---

## 2. Overall Score

| Category | Weight | Score /100 |
|---|---|---|
| Technical SEO | 30% | 75 |
| Content SEO | 30% | 65 |
| Information Architecture | 15% | 70 |
| User Experience | 10% | 70 |
| EEAT | 10% | 55 |
| Search Opportunity | 5% | 80 |
| **Overall** | **100%** | **69 / 100** |

**Verdict:** Partially prepared for sustainable organic growth. The page has strong demand and decent architecture, but the title bug and shallow FAQ are holding it back.

---

## 3. Critical Issues

### C1: `<title>` tag truncated — FIXED
- **Evidence (before fix):** Built HTML `<title>` showed `How to Document an API with… | Recipe | StackPractices` (OBSERVED from `dist/recipes/api-documentation-openapi/index.html`). H1 and `og:title` contained the full title.
- **Cause:** `src/components/Seo.astro` enforced `maxTitleLength = 60` and reserved 22 characters for the brand suffix, leaving only ~38 characters for the unique title. The long title was truncated before "OpenAPI".
- **Fix applied:** Refactored `Seo.astro` to first try the full title with the full brand suffix, then a shorter suffix, then the title alone, and finally truncate the title only as a last resort. The `<title>` for this page is now `How to Document an API with OpenAPI, Swagger UI and Redoc` and `og:title` is `How to Document an API with OpenAPI, Swagger UI and Redoc | StackPractices` (OBSERVED from rebuilt `dist/`).
- **Status:** [FIXED]

### C2: FAQ section is very long and shallow — programmatic content risk
- **Evidence:** Page contains ~30 FAQ questions, most answered with one sentence + inline YAML snippets (OBSERVED from source file). Many are reference-level snippets with little explanation.
- **Impact:** High. Thin-content / scaled-content signal, high AI footprint, low information density, poor user experience.
- **Action:** Condense FAQ to 8-10 high-value questions or expand the best ones into full sections.
- **Status:** [OBSERVED]

### C3: Low CTR relative to impressions
- **Evidence:** GSC shows 485 impressions, 2 clicks, 0.62% CTR (OBSERVED from previous GSC pull).
- **Impact:** High. The page ranks at position 34 and is being shown, but users are not clicking. Title and meta mismatch is a likely cause.
- **Action:** Fix title, improve meta description specificity, add real-world value proposition.
- **Status:** [REQUIRES DATA] (GSC data observed)

---

## 4. Technical SEO

### 4.1 HTML rendering

- **Doctype and language:** `<!DOCTYPE html><html lang="en">` [OBSERVED]. Spanish version has `lang="es"` [INFERRED, not yet verified].
- **Meta charset and viewport:** Present [OBSERVED].
- **CSP and security headers:** Present in `<meta http-equiv>` [OBSERVED].
- **No `noindex` / `nofollow`:** No `noindex` tag observed [OBSERVED].
- **Sitemap and RSS links:** `<link rel="sitemap" href="/sitemap.xml">` and RSS link present [OBSERVED].

### 4.2 Title tag

- **Current `<title>`:** `How to Document an API with… | Recipe | StackPractices` [OBSERVED].
- **Full title from frontmatter:** `How to Document an API with OpenAPI, Swagger UI and Redoc` [OBSERVED].
- **Issue:** The `<title>` is truncated before the target keywords. Critical.
- **SERP implication:** Google may display `How to Document an API with…` which does not communicate the topic.

### 4.3 Meta description

- **Current:** `Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.` (154 chars) [OBSERVED].
- **Assessment:** Good length, includes target terms and value proposition.

### 4.4 Canonical

- **Canonical:** `https://stackpractices.com/recipes/api-documentation-openapi/` [OBSERVED].
- **Assessment:** Correct, trailing slash consistent with site pattern.

### 4.5 Hreflang

- **Observed tags:** `en`, `es`, `x-default` [OBSERVED].
- **ES canonical:** `https://stackpractices.com/es/recipes/api-documentation-openapi/` [OBSERVED].
- **x-default points to EN** [OBSERVED].
- **Assessment:** Correct implementation.

### 4.6 Open Graph / Twitter

- `og:type=article`, `og:title` contains full title, `og:description` matches meta, `og:url`, `og:site_name`, `og:locale`, `og:image` present [OBSERVED].
- Twitter Card tags present [OBSERVED].
- **Note:** `og:title` is full and correct, but `og:image` is generic (`/og-image.png`). Consider a per-page or topic-specific OG image.

### 4.7 Structured data

- **JSON-LD graph includes:** `TechArticle`, `BreadcrumbList`, `FAQPage` [OBSERVED].
- **TechArticle:** `headline`, `description`, `author`, `publisher`, `dateModified`, `datePublished`, `inLanguage`, `educationalLevel` all present [OBSERVED].
- **BreadcrumbList:** Home → Recipes → Article [OBSERVED].
- **FAQPage:** Only first 3 questions visible in graph due to length; the rest may be in the JSON but the source line is truncated in build output. The FAQ schema is present and should be valid.
- **Issue:** `FAQPage` schema may reference a very long answer text. Ensure answers are concise and do not contain escaped code blocks that break schema validity. [INFERRED, requires validator check].

---

## 5. Crawlability

- **URL in sitemap:** `https://stackpractices.com/recipes/api-documentation-openapi/` [INFERRED from build + sitemap generation].
- **Navigation reachability:** `/recipes/` listing, tags (`/tags/api/`, `/tags/documentation/`), topics (`/topics/api/`), related resources [OBSERVED].
- **No orphan risk:** Page is reachable from listing pages and related resources.
- **Internal link count from page:** 9 `relatedResources` in frontmatter plus body links [OBSERVED].
- **Crawl depth:** 2-3 clicks from home (home → recipes → page) [OBSERVED].
- **Robots.txt:** [REQUIRES DATA] — not inspected in this audit.

**Score: 8 / 10**

---

## 6. Indexability

- **No `noindex` directive** [OBSERVED].
- **Canonical self-references** [OBSERVED].
- **No duplicate parameter URLs** [INFERRED] — static SSG, no query strings.
- **Indexation status:** [REQUIRES DATA] — actual Google indexation not verified.
- **Soft-404 risk:** None observed.

**Score: 9 / 10**

---

## 7. Architecture

- **URL:** `/recipes/api-documentation-openapi/` — clean, readable, keyword-relevant [OBSERVED].
- **Hierarchy:** `/recipes/` → `/recipes/<slug>/` consistent with content type [OBSERVED].
- **Topic hub:** `/topics/api/` exists and should link to this page [INFERRED].
- **Tag pages:** `/tags/api/`, `/tags/documentation/`, `/tags/rest/`, `/tags/http/`, `/tags/java/` [OBSERVED].
- **Breadcrumb:** Home / Recipes / Title [OBSERVED].

**Score: 8 / 10**

---

## 8. URLs

- **Slug:** `api-documentation-openapi` — includes target keyword, hyphenated, no stop words [OBSERVED].
- **Spanish URL:** `/es/recipes/api-documentation-openapi/` — same slug, language prefix only [OBSERVED].
- **Trailing slash:** Consistent with site (canonical has slash) [OBSERVED].
- **No unnecessary parameters** [OBSERVED].
- **Future-proof:** Yes, topic is stable.

**Score: 9 / 10**

---

## 9. Internal Linking

### 9.1 Inbound links

The page is likely linked from:
- `/recipes/` listing page.
- `/topics/api/` topic hub.
- `/tags/api/`, `/tags/documentation/`, `/tags/rest/`, `/tags/http/`, `/tags/java/` tag pages.
- `relatedResources` of sibling recipes (api-versioning, call-rest-api, graphql-api, handle-cors, handle-errors, api-logging-audit, api-rate-limiting-redis, cursor-pagination-postgresql, real-time-notifications).

### 9.2 Outbound links from this page

- `relatedResources` lists 9 internal recipes [OBSERVED].
- Body links include `/recipes/rest-api-design/`, `/recipes/oauth2-pkce-spa/`, `/recipes/call-rest-api/`, `/guides/database-design-guide/` [OBSERVED].
- `Further Reading` section now links to external authoritative sources (OpenAPI spec, Redocly, FastAPI, Springdoc) [OBSERVED].

### 9.3 Anchor text

- Anchor text is descriptive (e.g., "REST APIs", "client SDKs", "database entities").
- No generic "click here".

### 9.4 Internal linking plan

| Source | Target | Anchor | Reason | Priority |
|---|---|---|---|---|
| This page | `/recipes/api-versioning/` | "versioning" | Versioning is covered in the OpenAPI 3.0 vs 3.1 and Production Notes sections. | P2 |
| This page | `/recipes/api-rate-limiting-redis/` | "rate limiting" | FAQ mentions rate limiting headers. | P3 |
| `/recipes/call-rest-api/` | This page | "OpenAPI docs" | Strengthen cluster around API consumption. | P2 |
| `/recipes/rest-api-design/` | This page | "document your API" | Natural next step after designing REST endpoints. | P2 |

**Score: 7 / 10**

---

## 10. Content Clusters

**Cluster:** API / REST / OpenAPI / Documentation

**Pillar page candidates:**
- This page (`api-documentation-openapi`) — high impressions, broad topic.
- `/recipes/rest-api-design/` — foundational.
- `/recipes/api-versioning/` — related.

**Supporting pages:**
- `/recipes/call-rest-api/`
- `/recipes/handle-cors/`
- `/recipes/handle-errors/`
- `/recipes/api-logging-audit/`
- `/recipes/api-rate-limiting-redis/`
- `/recipes/cursor-pagination-postgresql/`
- `/recipes/graphql-api/`
- `/recipes/real-time-notifications/`

**Cluster strength:** Medium. The related resources create a connected graph, but the cluster lacks a clear pillar page and could benefit from a dedicated `/topics/api/` hub or an "API Design & Documentation" pillar article.

---

## 11. Topical Authority

**Topic breadth for OpenAPI / API docs:**

- Beginner content: Strong (this recipe).
- Intermediate content: Partial (trade-offs, CI, validation).
- Advanced content: Weak (no multi-team governance, no migration guide, no performance deep-dive).
- Comparison content: Weak (no Swagger UI vs Redoc vs Stoplight comparison).
- Troubleshooting content: Medium (new section is good but not deep).

**Entity coverage:**
- OpenAPI, Swagger, Redoc, Swagger UI, FastAPI, SpringDoc, Redocly, Spectral, OpenAPI Generator, tsoa, YAML, JSON, JSON Schema.
- Missing: SwaggerHub, Stoplight, AsyncAPI, Postman, Insomnia, Apicurio, Speakeasy.

**Assessment:** StackPractices has good coverage but not yet topical authority on OpenAPI. This page could become the pillar.

---

## 12. Search Intent

**Primary intent:** Informational + Investigational — "how do I document my API with OpenAPI/Swagger/Redoc?"

**Secondary intent:**
- Tool selection (FastAPI vs Express vs SpringDoc).
- Code-first vs design-first decision.
- CI/validation workflow.

**Does the page satisfy intent?** Partially. It answers the basics but the shallow FAQ still makes it look less authoritative. The title is now fixed.

**Format fit:** Recipe/guide is appropriate.

---

## 13. On-page SEO

### 13.1 Title

- **`<title>` after fix:** `How to Document an API with OpenAPI, Swagger UI and Redoc` [OBSERVED from rebuilt `dist/`].
- **Length:** 56 characters. Good — within the 60-character target and includes the most important keywords.
- **CTR potential:** High. The title now clearly matches the query intent.
- **og:title / twitter:title:** `How to Document an API with OpenAPI, Swagger UI and Redoc | StackPractices` [OBSERVED].
- **Remaining risk:** Google may still rewrite the title, but the source now contains the right keywords.

### 13.2 Meta description

- **Current:** 154 chars, includes keywords and value prop.
- **CTR potential:** Medium-high.
- **Recommendation:** Add a soft CTA or urgency: "Learn how to generate interactive docs with Swagger UI and Redoc — includes FastAPI, Express and SpringDoc examples."

### 13.3 Headings

- **H1:** `How to Document an API with OpenAPI, Swagger UI and Redoc` [OBSERVED].
- **H2s:** Overview, When to Use, Solution, Explanation, Variants, What Works, Common Mistakes, Troubleshooting, Further Reading, Production Notes, Key Takeaways, FAQ [OBSERVED].
- **H3s:** Language sub-sections (Python, JavaScript, Java), FAQ questions.
- **Hierarchy:** Logical.
- **Keyword relevance:** Good.
- **Issue:** Too many H3s in FAQ may dilute topical focus.

### 13.4 Content quality (SEO lens)

- Length is appropriate (~5,100 words).
- Originality and depth improved but FAQ is shallow.
- Keywords covered: OpenAPI, Swagger, Redoc, FastAPI, SpringDoc, API documentation.
- No keyword stuffing observed.

---

## 14. Content Quality

See `CONTENT-360-api-documentation-openapi.md` for full content audit.

SEO-specific summary:

- **Originality:** Medium.
- **Depth:** Medium (good main body, shallow FAQ).
- **Accuracy:** High.
- **Practical usefulness:** High for setup, Medium for production.
- **Examples:** Good code blocks, weak FAQ examples.

---

## 15. EEAT

- **Author:** Mathias Paulenko (named in meta and JSON-LD) [OBSERVED].
- **Author bio:** Not present on page [OBSERVED].
- **About page:** Link to `/about/` exists in footer/navigation [INFERRED].
- **References:** `Further Reading` now links to authoritative sources [OBSERVED].
- **Dates:** `datePublished` and `dateModified` in JSON-LD [OBSERVED].
- **Original examples:** Partial.
- **Editorial process:** Not visible.

**Missing:** Author credentials, editorial note, author page link from article.

**Score: 55 / 100**

---

## 16. Structured Data

- **TechArticle schema:** Valid and complete [OBSERVED].
- **BreadcrumbList:** Valid [OBSERVED].
- **FAQPage:** Present [OBSERVED].
- **Potential issue:** FAQ answers may be too long and contain code. JSON-LD `text` fields should be plain text. Inline code or escaped newlines could cause validation warnings.
- **Recommendation:** Run through Google Rich Results Test after fixing title.

---

## 17. Performance

- **Page weight:** HTML is ~10 KB minified [OBSERVED].
- **Images:** Generic OG image only; no article-specific images.
- **Lazy loading:** [INFERRED] likely present for images.
- **JavaScript:** Minimal (analytics, pagefind, ui). Astro ships zero JS by default.
- **Core Web Vitals:** [REQUIRES DATA] — not measured.
- **Caching / SRI:** SRI hashes present on scripts [OBSERVED].

**Score: 8 / 10** (assumed, requires measurement).

---

## 18. Mobile

- **Viewport meta:** Present [OBSERVED].
- **Responsive design:** Tailwind-based, mobile-first [INFERRED].
- **Mobile usability:** [REQUIRES DATA] — not tested.

**Score: 8 / 10** (assumed).

---

## 19. Accessibility

- **Skip link:** Present [OBSERVED].
- **ARIA labels:** Present on nav, search, language switch [OBSERVED].
- **Semantic HTML:** Header, main, nav, article structure [OBSERVED].
- **WCAG compliance:** [REQUIRES DATA] — no audit performed.

**Score: 8 / 10** (assumed).

---

## 20. Images

- **No article images** [OBSERVED].
- **Generic OG image:** `/og-image.png` [OBSERVED].
- **Recommendation:** Add a diagram or code screenshot? Not critical for this technical topic, but a workflow diagram could improve engagement.

---

## 21. Code

- **Code blocks:** Present with language tags [OBSERVED].
- **Code snippets in FAQ:** Inline code spans are excessive and reduce readability.
- **No broken code observed.**

---

## 22. External Links

- `Further Reading` links to:
  - OpenAPI Specification (latest)
  - Redocly CLI documentation
  - FastAPI OpenAPI reference
  - Springdoc OpenAPI
- **All are HTTPS, authoritative, relevant.**
- **No suspicious download links.**

---

## 23. Backlinks

- [REQUIRES DATA] — no backlink tool available.

---

## 24. Search Console

**Observed data (last 28 days):**
- Impressions: 485
- Clicks: 2
- CTR: 0.62%
- Average position: 34.4
- Impression delta vs prior 28 days: +472

**Interpretation:**
- The page is in a striking-distance position (page 3-4) and is gaining visibility.
- Very low CTR suggests the title and/or meta are not compelling, or the result is not aligned with the query.
- Average position 34 means small improvements can push it into page 2 or 1.

---

## 25. Analytics

- Google Analytics 4 tag present (`G-RBE12WJ5KZ`) [OBSERVED].
- GTM container present [OBSERVED].
- [REQUIRES DATA] — no session/engagement data supplied.

---

## 26. User Journey

- **On-page navigation:** TOC, breadcrumb, related resources, language switch [OBSERVED].
- **Next-step content:** Related resources link to 9 relevant recipes [OBSERVED].
- **No dead end:** User can continue to `/recipes/api-versioning/`, `/recipes/handle-errors/`, etc.
- **No strong CTA:** No download, email, or tool CTA (appropriate for informational content).

---

## 27. Content Freshness

- `lastUpdated: 2026-08-10` [OBSERVED].
- `dateModified` in JSON-LD matches [OBSERVED].
- Tool commands are current.
- OpenAPI 3.0/3.1 notes are current.

---

## 28. International SEO

- **Hreflang:** `en`, `es`, `x-default` correctly implemented [OBSERVED].
- **Canonicals:** Self-canonical per language [OBSERVED].
- **Translation parity:** ES file exists and is complete [OBSERVED].
- **Localized metadata:** Spanish title and meta are translated [OBSERVED].

**Score: 9 / 10**

---

## 29. Cannibalization

**Potential overlap:**
- `/recipes/api-versioning/` — targets a different intent (versioning) but could share query space.
- `/recipes/call-rest-api/` — consumer perspective, not cannibalizing.
- `/recipes/graphql-api/` — different technology.
- No strong cannibalization detected.

**Score: 9 / 10**

---

## 30. Programmatic Content Risk

- **Template usage:** The site uses a recipe template with consistent sections.
- **Risk for this page:** Low-to-medium. The FAQ is the only section that feels mass-produced.
- **Risk for site:** If many recipes have long FAQ dumps, the site could look programmatic.
- **Recommendation:** Audit other recipes for FAQ bloat.

---

## 31. Quick Wins

1. **Fix the `<title>` truncation** — highest CTR impact. [Easy]
2. **Improve meta description with a soft CTA** — small lift. [Easy]
3. **Add author link/bio to article** — EEAT. [Easy]
4. **Condense FAQ** — reduces thin-content risk. [Medium]
5. **Add one contextual internal link** to `api-versioning` from the versioning paragraph. [Easy]

---

## 32. Strategic Improvements

1. **Refactor `Seo.astro` title logic** so long titles are not silently truncated before target keywords. Options:
   - Increase `maxTitleLength` to 65-70.
   - Truncate the full title string (not just the unique prefix) so the suffix can be partially hidden but the topic words survive.
   - Use a shorter brand suffix (` | StackPractices` only = 19 chars).
2. **Build a clear API topic cluster** with this page as the pillar.
3. **Create a comparison page** (`redoc-vs-swagger-ui`) and link from this page.
4. **Add a downloadable `openapi.yaml`** or GitHub repo to increase backlinks and engagement.
5. **Implement topic-specific OG images**.

---

## 33. Content Opportunities

| Topic | Search intent | Why it matters | Related existing pages | Suggested internal links |
|---|---|---|---|---|
| OpenAPI validation in CI | Informational / How-to | Natural next step after writing a spec | This page, `api-versioning` | From this page to new page |
| Swagger UI vs Redoc | Comparison | Decision content, high CTR potential | This page | From this page to new page |
| AsyncAPI for event-driven APIs | Comparison | Differentiates site from generic OpenAPI content | `real-time-notifications` | From this page to new page |
| OpenAPI client generation | How-to | Common next step for teams | `call-rest-api` | From this page to new page |
| API spec governance | Advanced | Builds authority | `api-versioning`, `handle-errors` | From pillar page |

---

## 34. Internal Linking Plan

| Source | Target | Anchor | Reason | Priority |
|---|---|---|---|---|
| This page | `/recipes/api-versioning/` | "versioning" | Versioning is discussed. | P2 |
| This page | `/recipes/api-rate-limiting-redis/` | "rate limiting" | FAQ touches on rate limit headers. | P3 |
| `/recipes/rest-api-design/` | This page | "document your API with OpenAPI" | Natural next step. | P2 |
| `/recipes/call-rest-api/` | This page | "OpenAPI documentation" | Strengthen API cluster. | P2 |
| `/topics/api/` | This page | "How to Document an API with OpenAPI" | Pillar link. | P1 |

---

## 35. Final Verdict

**Is StackPractices technically prepared for sustainable organic growth?** **PARTIALLY**.

The site has a solid static foundation, good hreflang, proper structured data and a growing content library. However, this page has a **critical title-truncation bug** that directly harms CTR and rankings, and the shallow FAQ creates a programmatic-content risk. Fixing those two issues would move this page from "striking distance" to genuine ranking potential.

### Three biggest things preventing organic growth (for this page)
1. `<title>` truncation hiding target keywords.
2. Low CTR due to weak SERP appearance and shallow FAQ.
3. Missing EEAT signals (author bio, editorial process, external citations).

### Three highest-impact improvements
1. Fix `Seo.astro` title logic and re-verify with build.
2. Condense the FAQ into 8-10 strong questions and answers.
3. Add an author bio / editorial note and one real-world case study.

### What should NOT be changed
- The URL slug (clean and keyword-relevant).
- The canonical/hreflang strategy (correctly implemented).
- The multi-language examples in the Solution section (strong differentiator).

---

## 36. Data Required for Deeper Audit

- [ ] GSC indexation status for this URL.
- [ ] Google Rich Results Test output for JSON-LD.
- [ ] Core Web Vitals field data (PageSpeed Insights or CrUX).
- [ ] Backlink profile for the URL.
- [ ] GA4 landing-page and engagement data.
- [ ] Server log crawl data to confirm Googlebot crawl frequency.
- [ ] robots.txt to verify no blocks.

---

## Technical SEO Health Score

| Dimension | Score /10 |
|---|---|
| Crawlability | 8 |
| Indexability | 9 |
| Architecture | 8 |
| Internal Linking | 7 |
| Performance | 8 |
| Mobile | 8 |
| Structured Data | 7 |
| URLs | 9 |
| Security | 9 |
| **Technical Health** | **73 / 100** |

## Content SEO Score

| Dimension | Score /10 |
|---|---|
| Search Intent | 7 |
| Content Quality | 7 |
| Originality | 5 |
| Topical Depth | 6 |
| EEAT | 6 |
| Keyword Coverage | 7 |
| Internal Linking | 7 |
| SERP Potential | 5 |
| **Content SEO** | **50 / 100** |

*SERP Potential is low until the title truncation is fixed.*

## User Journey Score

| Dimension | Score /10 |
|---|---|
| Navigation | 8 |
| Related Content | 7 |
| Content Discovery | 7 |
| Readability | 6 |
| Next-step clarity | 7 |
| **User Journey** | **70 / 100** |
