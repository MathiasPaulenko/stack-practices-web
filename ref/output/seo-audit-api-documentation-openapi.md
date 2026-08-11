# Technical SEO Audit — /recipes/api-documentation-openapi/

**Audit target:** `https://stackpractices.com/recipes/api-documentation-openapi/`  
**Target type:** Recipe / Tutorial  
**Audited:** 2026-08-11  
**Auditor:** Senior Technical SEO Consultant (prompt-driven)  

---

## 1. Executive Summary

`/recipes/api-documentation-openapi/` is a well-structured, technically sound recipe page with strong on-page SEO, clean multilingual implementation, and useful structured data. During this audit, several immediate technical issues were discovered and fixed:

- `RelatedResources.astro` was hard-capped to 3 items, preventing the 6 declared related resources from rendering.
- A Spanish-only locale note and the ` (ES)` language tag were still being injected into the component and meta tags.
- Invalid `X-Frame-Options` and `frame-ancestors` CSP meta tags were producing console errors.
- The `Variants` comparison table caused horizontal overflow on mobile viewports.

After the fixes, the page builds cleanly, renders all 6 related resources, removes locale artifacts, and no longer throws console errors on the test build.

The wider StackPractices site still has 24 content-quality validator errors (mostly duplicate H2 headings in docs and devops recipes) and 7 warnings (low tag count / missing FAQs). These are not specific to this page but are the main risk to sustainable organic growth at scale.

**Final overall score: 80 / 100** — technically capable of growth, but not yet fully prepared without resolving site-wide content quality issues, strengthening EEAT signals, and confirming real Core Web Vitals.

---

## 2. Overall Score

| Dimension | Weight | Score | Notes |
|---|---:|---:|---|
| Technical SEO | 30% | 81 / 100 | Strong crawlability, URLs, structured data; security headers limited by GitHub Pages. |
| Content SEO | 30% | 76 / 100 | Intent-aligned, high-quality, well-linked; EEAT and originality could improve. |
| Information Architecture | 15% | 80 / 100 | Good clusters and navigation; could use a clear API pillar/hub. |
| User Experience | 10% | 76 / 100 | Readable, copyable code; mobile table overflow fixed during audit. |
| EEAT | 10% | 60 / 100 | Author present but no explicit bio/review/citations. |
| Search Opportunity | 5% | 70 / 100 | Solid long-tail coverage; cluster reinforcement needed. |
| **Overall** | **100%** | **80 / 100** | **PARTIALLY prepared for sustainable organic growth.** |

---

## 3. Critical Issues

| ID | Category | Finding | Status | Impact | Action |
|---|---|---|---|---|---|
| C1 | Related resources | `RelatedResources.astro` was limited to `VISIBLE_ITEMS = 3`, so only 3 of the 6 `relatedResources` declared in frontmatter were rendered. | [OBSERVED] | High | Increased cap to 6. |
| C2 | International SEO | Spanish pages still rendered a visible locale note (`Nota para desarrolladores hispanohablantes...`) and appended ` (ES)` to meta descriptions. | [OBSERVED] | High | Removed the component note, ` (ES)` injection in `Seo.astro`, and RSS `(ES)` titles. |
| C3 | Security / Trust | `X-Frame-Options` and `frame-ancestors 'self';` were delivered via `<meta>` tags, which browsers ignore, causing console errors and no clickjacking protection. | [OBSERVED] | Medium | Removed invalid meta directives; recommend setting these via HTTP headers if the host supports it. |
| C4 | Mobile UX | The `Variants` table on the recipe was 383 px wide on a 375 px viewport, producing horizontal page scroll. | [OBSERVED] | Medium | Added `display: block; overflow-x: auto;` responsive table styling in `global.css`. |
| C5 | Site-wide content quality | `npm run content:quality` reports 24 duplicate-H2 errors and 7 warnings (low tags / missing FAQs) across other files. | [OBSERVED] | High | Resolve duplicate headings and add missing tags/FAQs before claiming broad indexation readiness. |

---

## 4. Technical SEO

### 4.1 Crawlability — 9 / 10

[OBSERVED] `robots.txt` allows all and points to `sitemap.xml`. [OBSERVED] The sitemap includes both language versions of the recipe with `lastmod` 2026-08-11 and `priority` 0.8. [OBSERVED] Breadcrumbs (`Home > Recipes > Title`) and a primary navigation menu are present. [OBSERVED] The page is reachable from `/recipes/` and via related-resource links from other recipes. [INFERRED] No redirect chains, no 4xx/5xx on the page or its assets during testing.

### 4.2 Indexability — 9 / 10

[OBSERVED] Canonical URL is self-referencing and consistent (`https://stackpractices.com/recipes/api-documentation-openapi/`). [OBSERVED] Hreflang tags: `en`, `es`, `x-default` (x-default points to the English version). [OBSERVED] No `noindex`/`nofollow` on the page. [OBSERVED] Included in XML sitemap. [INFERRED] No canonical/noindex conflicts.

### 4.3 URLs — 9 / 10

[OBSERVED] URL `/recipes/api-documentation-openapi/` is short, keyword-rich, kebab-case, and follows the site-wide content-type-first convention. [OBSERVED] Trailing slash is consistent across all tested pages. [OBSERVED] No URL parameters. [INFERRED] Future scalability is good; adding a topic slug would help hierarchy but is not required.

### 4.4 Site Architecture — 8 / 10

[OBSERVED] The page sits under `/recipes/` and is tagged `api`, which is also a topic hub (`/topics/api/`). [OBSERVED] The recipe links to 6 related API recipes and has 5 `See Also` body links. [INFERRED] The site’s knowledge graph is logical (recipes → patterns → docs → guides, plus tags and topics). [INFERRED] A dedicated API pillar page would strengthen the cluster (see Strategic Improvements).

### 4.5 Internal Linking — 7 / 10

[OBSERVED] 6 related resources, breadcrumbs, navigation, topic/tag links, and footer. [OBSERVED] Body `See Also` links to `/recipes/api-versioning/`, `/recipes/call-rest-api/`, `/recipes/graphql-api/`, `/recipes/handle-cors/`, `/recipes/handle-errors/`. [INFERRED] Contextual links inside the solution/explanation sections are sparse; the internal-linking plan below provides opportunities.

---

## 5. On-Page SEO

### 5.1 Title

[OBSERVED] `<title>`: `How to Document an API with OpenAPI, Swagger UI and Redoc` (57 characters). [OBSERVED] `og:title`: same + ` | StackPractices`. [INFERRED] Title is specific, keyword-relevant, within recommended length, and matches H1.

### 5.2 Meta Description

[OBSERVED] English: `Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.` (154 characters). [OBSERVED] Spanish meta: translated, no ` (ES)` tag after the fix. [INFERRED] Both are within 150-160 chars and contain primary keywords.

### 5.3 Headings

[OBSERVED] H1 matches title. H2 sequence: Overview, When to Use, Solution, Explanation, Variants, What Works, Common Mistakes, Troubleshooting, Further Reading, Production Notes, Key Takeaways, See Also, Common Production Pitfalls, Frequently Asked Questions, Related Resources. [OBSERVED] One H2-level comparison table and 10 FAQ accordion entries. [INFERRED] Heading hierarchy is logical and intent-aligned.

### 5.4 Content Quality — 8 / 10

[OBSERVED] ~1,350 words, 28 code blocks, 1 comparison table, 10 FAQ items. [OBSERVED] Examples in Python, JavaScript, Java, and YAML. [OBSERVED] Covers code-first vs design-first, Swagger UI vs Redoc, client generation, linting, production notes. [INFERRED] Content is practical and reference-quality for a beginner/intermediate audience.

### 5.5 Content Length

[INFERRED] Length is appropriate for the search intent; it is not thin, not padded, and the FAQ adds depth without repetition.

### 5.6 Duplication / Cannibalization

[INFERRED] No exact duplicate of this page. [OBSERVED] `/docs/api-documentation/` exists as a documentation template; intent differs (template vs tutorial) but is worth monitoring. [INFERRED] No keyword cannibalization detected for this specific page.

### 5.7 Programmatic Content Risk

[OBSERVED] StackPractices generates 3,242 pages from content collections and pagination. [INFERRED] This recipe has unique, authorial content, but tag/topic/author listing pages may be thin if not differentiated. [INFERRED] Medium risk if many recipe pages follow identical templates with low unique value.

---

## 6. EEAT

[OBSERVED] Author `Mathias Paulenko` linked to `/authors/mathias-paulenko/` and external `https://mathiaspaulenko.com`. [OBSERVED] `datePublished` and `dateModified` in JSON-LD. [OBSERVED] Publisher `StackPractices` in structured data. [OBSERVED] About, Contact, Editorial Policy, Affiliate Disclosure, Privacy, and Terms pages exist. [INFERRED] Missing: explicit author credentials, review date, reviewer name, citations/references beyond external documentation links, and an author bio on the article itself. [INFERRED] EEAT is moderate; the site shows ownership and authorship but not deep expertise signals.

**EEAT score: 6 / 10**

---

## 7. Structured Data

[OBSERVED] JSON-LD graph includes `TechArticle`, `BreadcrumbList`, and `FAQPage`. [OBSERVED] `TechArticle` includes `headline`, `description`, `url`, `inLanguage`, `educationalLevel`, `articleSection`, `keywords`, `datePublished`, `dateModified`, `author` (`Person`), and `publisher` (`Organization`). [OBSERVED] `FAQPage` has 10 questions with `acceptedAnswer` text truncated to ~200 characters for snippet eligibility. [INFERRED] Valid, consistent, and appropriate for the page; no duplicate or misleading schema. [INFERRED] No `WebSite`, `Organization`, or `SpeakableSpecification` on this page; not required but could reinforce entity signals.

**Structured Data score: 9 / 10**

---

## 8. SERP Features

[INFERRED] The page is eligible for FAQ rich results, Breadcrumbs, Article snippets, and PAA coverage. [INFERRED] The comparison table and code examples increase the chance of table/citation snippets. [REQUIRES DATA] Eligibility does not guarantee ranking; actual SERP features require live Google measurements.

---

## 9. Performance

[OBSERVED] HTML size ~69 KB. [OBSERVED] One external CSS, 5 scripts (analytics, ui, copy, consent, search), one lazy-loaded image. [OBSERVED] Code is syntax-highlighted by Shiki; postbuild minifies classes and JSON. [OBSERVED] `ui.js` and `analytics.js` are deferred/async. [REQUIRES DATA] Core Web Vitals (LCP, INP, CLS) have not been measured. [INFERRED] The page is lightweight and should be fast, but real-world CrUX/PageSpeed data is required.

**Performance score: 8 / 10 (inferred)**

---

## 10. Mobile

[OBSERVED] Viewport meta present. [OBSERVED] Mobile menu button (`aria-label="Open navigation menu"`) present and functional. [OBSERVED] Text readable, tap targets large enough, code blocks scroll horizontally. [OBSERVED] The `Variants` table previously caused horizontal overflow at 375 px; the fix in `global.css` resolved it in local testing (table width 328 px, no document overflow). [INFERRED] Content parity between desktop and mobile. [REQUIRES DATA] Real mobile CWV and field data.

**Mobile score: 8 / 10**

---

## 11. Accessibility

[OBSERVED] Semantic HTML, `lang` attribute, `h1` present. [OBSERVED] Cookie banner has `role="dialog"`, `aria-label`, and labeled buttons. [OBSERVED] Menu button has `aria-expanded` and labels. [OBSERVED] Ko-fi image has alt text; icons use `aria-hidden="true"`. [OBSERVED] FAQ uses native `<details>`/`<summary>` with chevron. [INFERRED] No obvious keyboard traps. [REQUIRES DATA] Full WCAG 2.2 contrast and screen-reader tests.

**Accessibility score: 8 / 10**

---

## 12. Images

[OBSERVED] One image on the page (`/kofi3.png`) with alt `Buy Me a Coffee at ko-fi.com` and `loading="lazy"`. [INFERRED] No diagrams or screenshots are used; for a technical recipe this is acceptable but could be enhanced with an architecture diagram for OpenAPI tooling.

**Images score: 6 / 10**

---

## 13. Code

[OBSERVED] 28 code blocks with Shiki `github-dark` syntax highlighting and inline color spans. [OBSERVED] Copy-to-clipboard buttons (`.copy-btn`) are injected by `ui.js`. [OBSERVED] Code covers Python (FastAPI), JavaScript (Express), Java (SpringDoc), YAML, GitHub Actions, and CLI commands. [INFERRED] Examples are correct and idiomatic at a beginner level. [INFERRED] Some YAML examples in FAQ are long; the accordion keeps them collapsible.

**Code score: 9 / 10**

---

## 14. External Links

[OBSERVED] Further Reading links to `spec.openapis.org`, `redocly.com/docs/cli`, `fastapi.tiangolo.com/reference/openapi/`, `springdoc.org/`. [INFERRED] All links are authoritative and relevant. [OBSERVED] Some links lack `rel="noopener noreferrer"` and `target="_blank"`. [INFERRED] External link profile is appropriate and not overdone.

**External Links score: 8 / 10**

---

## 15. Backlinks

[REQUIRES DATA] No backlink tool data available. [INFERRED] The page is naturally link-worthy because it contains original code examples, a comparison table, and practical troubleshooting guidance. [INFERRED] To attract links, consider producing a downloadable OpenAPI 3.1 starter template or a reference comparison of Swagger UI vs Redoc.

---

## 16. Search Console / Analytics

[REQUIRES DATA] No Search Console, GA4, or server log data was supplied for this audit. [OBSERVED] GA4 tracking ID is present (`G-RBE12WJ5KZ`). [INFERRED] Without GSC, we cannot verify indexation, CTR, query coverage, or cannibalization for this page.

---

## 17. User Journey

[OBSERVED] Table of contents (collapsible), 6 related-resource cards, 5 `See Also` body links, tags, topics, footer navigation, and a language switcher. [INFERRED] The page offers multiple onward paths; there is no single primary CTA, which is appropriate for informational content. [INFERRED] The breadcrumb and listing links prevent dead ends.

**User Journey score: 76 / 100**

---

## 18. Content Freshness

[OBSERVED] `lastUpdated: 2026-08-11`, `publishedAt: 2026-06-12`. [INFERRED] The content is current. [INFERRED] OpenAPI 3.1, FastAPI, SpringDoc, and Redocly CLI references are not outdated.

---

## 19. International SEO

[OBSERVED] Two language versions: `/recipes/api-documentation-openapi/` (EN) and `/es/recipes/api-documentation-openapi/` (ES). [OBSERVED] `html lang="en"` / `html lang="es"`. [OBSERVED] Canonicals are self-referencing and use language-specific URLs. [OBSERVED] Hreflang tags: `en`, `es`, `x-default`. [INFERRED] After the fix, meta descriptions and titles no longer contain locale tags; Spanish content has parity with English. [OBSERVED] Sitemap includes both versions with `xhtml:link rel="alternate"` entries.

**International SEO score: 9 / 10**

---

## 20. Cannibalization

[INFERRED] Potential overlap with `/docs/api-documentation/` (template) and `/recipes/api-versioning/` ( versioning vs documenting). [INFERRED] Not currently cannibalizing because the search intents differ (tutorial vs template vs specific topic). [REQUIRES DATA] GSC query data would confirm.

---

## 21. Quick Wins

1. **Remove locale artifacts** — done: removed Spanish component note, ` (ES)` meta tags, RSS `(ES)` titles.
2. **Render all declared related resources** — done: `RelatedResources.astro` cap raised from 3 to 6.
3. **Fix invalid security meta tags** — done: removed `X-Frame-Options` and `frame-ancestors` from `<meta>`.
4. **Make tables responsive on mobile** — done: added `overflow-x: auto` table styling.
5. **Add `rel="noopener noreferrer"` to external Further Reading links** (if they open in a new tab) and ensure all external links have descriptive anchor text.
6. **Run PageSpeed Insights / Lighthouse on this URL and address any CWV issues**.

---

## 22. Strategic Improvements

1. **Resolve the 24 duplicate-H2 errors and 7 warnings** surfaced by `npm run content:quality` across other recipes, docs, and patterns. This is the biggest site-wide indexing/quality risk.
2. **Build a clear API topic cluster and pillar page** (`/topics/api/` or a new `/hub/api-design/`) that links to related recipes, patterns, and guides. This recipe should be one of the supporting articles.
3. **Strengthen EEAT** by adding an author bio snippet, a "Last reviewed by" note, and inline citations/references where appropriate.
4. **Measure and optimize Core Web Vitals** once the page is live and indexed; build time is fast, but field data is needed.
5. **Differentiate thin listing/tag pages** with unique introductions and avoid near-duplicate pagination pages.

---

## 23. Content Opportunities

| Topic | Search intent | Why it matters | Related existing pages | Suggested internal links |
|---|---|---|---|---|
| OpenAPI 3.0 vs 3.1 differences | Informational / Reference | High-volume comparison; supports this recipe | `/recipes/api-versioning/`, `/recipes/api-documentation-openapi/` | Link from this recipe to the new comparison |
| OpenAPI security best practices | Informational / Tutorial | Security is a natural next step after documenting an API | `/recipes/security-headers/`, `/recipes/api-security-headers/`, this recipe | Add link under `See Also` or Production Notes |
| Schemathesis / contract testing for OpenAPI | Tutorial | Extends the troubleshooting section with runnable tools | This recipe, `/recipes/api-contract-testing/` | Cross-link in `Troubleshooting` |
| OpenAPI client SDK generation guide | Tutorial | Deeper coverage of a subtopic mentioned in this recipe | This recipe, `/recipes/call-rest-api/` | New guide links back here |
| API design pillar page | Informational / Hub | Creates a central cluster page for recipes, patterns, and guides | All API recipes | Link each API recipe to the pillar and vice versa |

---

## 24. Internal Linking Plan

| Source | Target | Suggested anchor | Reason | Priority |
|---|---|---|---|---|
| `/recipes/api-documentation-openapi/` | `/recipes/rest-api-design/` | `design the API first` | Design decisions drive documentation shape. | P1 |
| `/recipes/api-documentation-openapi/` | `/recipes/input-validation/` | `validate request schemas in OpenAPI` | Natural extension of the spec discussion. | P1 |
| `/recipes/api-documentation-openapi/` | `/recipes/idempotent-api-endpoints/` | `make endpoints idempotent before documenting them` | Links API design to documentation. | P2 |
| `/recipes/rest-api-design/` | `/recipes/api-documentation-openapi/` | `document it with OpenAPI` | Design → documentation flow. | P1 |
| `/recipes/api-versioning/` | `/recipes/api-documentation-openapi/` | `keep the OpenAPI spec in sync with versions` | Versioning and documentation are tightly related. | P1 |
| `/recipes/handle-errors/` | `/recipes/api-documentation-openapi/` | `document error schemas in OpenAPI` | Error handling needs documentation. | P2 |

---

## 25. Final Verdict

**Is StackPractices technically prepared for sustainable organic growth?**

**PARTIALLY.**

This recipe is technically well-built: crawlable, indexable, fast, structured, and bilingual. The fixes applied during the audit removed several immediate blockers. However, the broader site still carries content-quality validator errors and thin listing-page risks, and EEAT/performance signals lack real-world measurement.

**Three biggest things preventing organic growth:**

1. **Site-wide content quality errors** (24 duplicate H2s and missing FAQ/tags) that suggest inconsistent editorial standards to a search engine.
2. **Weak EEAT signals** on individual recipe pages — author bio, review process, and citations are not visible enough.
3. **No measured Core Web Vitals or Search Console data**, so we cannot confirm user experience or indexation health.

**Three highest-impact improvements:**

1. Clean the content-quality validator errors and enforce a minimum FAQ/tag standard before publishing.
2. Add an author bio/review block and inline references to recipes to strengthen EEAT.
3. Set up and monitor Core Web Vitals + Search Console, and build a topic pillar/hub around API design to concentrate internal authority.

**What should NOT be changed:**

- URL structure, canonical strategy, and hreflang implementation.
- The recipe content template (Overview → When to Use → Solution → Explanation → Variants → Best Practices → Mistakes → Troubleshooting → FAQ → Related Resources).
- The FAQPage + TechArticle + BreadcrumbList structured-data pattern.
- The static-first Astro + GitHub Pages architecture.

---

## 26. Data Required for Deeper Audit

- **Google Search Console** — index coverage, queries, impressions, CTR, average position.
- **Google Analytics 4 / server logs** — organic landing sessions, bounce rate, exit pages, user paths.
- **PageSpeed Insights / Lighthouse / CrUX** — LCP, INP, CLS for desktop and mobile.
- **Backlink data** (Ahrefs, Moz, Search Console links) — authority, referring pages, anchor text.
- **A full site crawl** (Screaming Frog, Sitebulb, or custom crawler) — orphan pages, redirect chains, duplicate content at scale, H1/Title mismatches.
