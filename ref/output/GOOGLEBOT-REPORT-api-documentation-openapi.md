# GOOGLEBOT FORENSIC REPORT — `recipes/api-documentation-openapi`

<!-- markdownlint-disable MD013 -->

**Scope:** Single-resource forensic audit for Googlebot reception and indexability.  
**Site:** StackPractices (`https://stackpractices.com`) — Astro 5+ SSG, GitHub Pages, Tailwind CSS v4+, bilingual EN/ES.  
**Resource:** `src/content/recipes/api/api-documentation-openapi.md` (EN) + `src/content/recipes/api/api-documentation-openapi.es.md` (ES).  
**Built EN HTML:** `dist/recipes/api-documentation-openapi/index.html`.  
**Built ES HTML:** `dist/es/recipes/api-documentation-openapi/index.html`.  
**Author:** Mathias Paulenko.  
**Audit date:** 2026-08-10 (matches `lastUpdated`).

> **Note:** This report is a regeneration of `ref/prompts/13-googlebot-forensic-report.md` for StackPractices. All legacy single-page application findings in the original prompt have been replaced with Astro SSG evidence for this single resource.

---

## Executive Summary

Googlebot receives a **fully pre-rendered static HTML page** for this resource. Because the site is built with Astro SSG, the initial HTTP response already contains every element Googlebot needs to index the page: title, meta description, canonical, hreflang, Open Graph, JSON-LD, headings, article body, code examples, internal links and the FAQ section. No JavaScript execution is required to discover or parse the primary content.

The original prompt described a legacy client-rendered website where the initial HTML body was empty. This StackPractices resource is the opposite:

| Legacy finding (client-rendered) | StackPractices finding (Astro SSG) |
| --- | --- |
| Initial HTML body contained only an empty app mount point. | Initial HTML contains the full article, navigation and schema. |
| Non-slash → slash redirects on every internal URL. | Static file is served directly at the trailing-slash URL with HTTP 200. |
| Large JavaScript bundles and JSON indices required to render content. | Only two small JS files: `analytics.js` (async) and `ui.js` (defer); neither is required for content. |
| Multi-second render time per page. | Content is available on the first HTTP response; WRS render time is effectively zero. |

The page is technically sound for crawling and indexing, but three non-trivial issues lower Google's confidence and rich-result eligibility:

1. **ES JSON-LD URL mismatch** — the Spanish built page has the correct canonical/hreflang, but the `TechArticle` URL and the third `BreadcrumbList` item point to the English URL (missing `/es/`). This is caused by `src/pages/es/recipes/[slug].astro:36` passing `/recipes/${slug}/` instead of `/es/recipes/${slug}/` to `RecipeArticle.astro`.
2. **FAQ content is stripped and truncated** — the article source contains 38 question-style `###` headings, but the `remarkTruncateFaq` remark plugin removes the entire FAQ section from the rendered body. `RecipeArticle.astro` then renders only 10 visible FAQs (with answers truncated to 200 characters by `content.ts:65-76`) and the JSON-LD `FAQPage` only contains the first 3 (`RecipeArticle.astro:82` `faqPage(faqs.slice(0, 3))`). The remaining 28 questions and their full answers are not present in the built HTML.
3. **Generic Open Graph image** — `og:image` points to the site-wide `/og-image.png` instead of a per-page or topic-specific asset.

Root causes for any ranking limitation are a mix of **technical/content truncation** (28 of 38 source FAQ questions are removed from the built HTML, only 3 of 10 visible FAQs are in JSON-LD) and **authority/EEAT** (the page competes with official documentation sites and established tutorials on a relatively new domain with limited external signals).

---

## Phase 1 — Fetch Without JavaScript vs. With JavaScript

### 1.1 No-JavaScript fetch (raw server response)

| Property | Value | Evidence |
| --- | --- | --- |
| URL tested | `https://stackpractices.com/recipes/api-documentation-openapi/` | — |
| HTTP status | **200 OK** (no redirect) | `dist/recipes/api-documentation-openapi/index.html` served at the final path |
| Final URL | `https://stackpractices.com/recipes/api-documentation-openapi/` | Same as requested; trailing slash enforced by build |
| Content-Type | `text/html; charset=utf-8` | GitHub Pages default for `index.html` |
| Content-Length | **31,875 bytes** | `wc` on built file |
| Visible words in raw HTML | **~1,776** (full body, excluding `<script>`/`<style>`, HTML-decoded) | Python `html.parser` text extraction from built HTML. Note: the source FAQ section is removed by `remarkTruncateFaq`; only 10 extracted FAQs are rendered. |
| Main content words | **~1,643** | Text extraction limited to `<main>` element |
| Title | "How to Document an API with OpenAPI, Swagger UI and Redoc" | `src/content/recipes/api/api-documentation-openapi.md:4` |
| Title length | **57 characters** | Within 60-char target (`Seo.astro:108`) |
| Meta description | "Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java." | `dist/.../index.html` `<meta name="description">` |
| Meta description length | **154 characters** | `Seo.astro:281` smart-truncates at 160 |
| Meta robots | **Not present** (defaults to `index, follow`) | No `<meta name="robots">` in built HTML |
| Canonical in raw HTML | `https://stackpractices.com/recipes/api-documentation-openapi/` | `Seo.astro:291` |
| Hreflang in raw HTML | `en`, `es`, `x-default` | `Seo.astro:293-295` |
| H1 in raw HTML | 1 | Built HTML `<h1 class="ly">` |
| H2 in raw HTML | 17 | Built HTML `<h2>` count |
| H3 in raw HTML | 6 | Built HTML `<h3>` count (Solution sub-sections: Python, JavaScript, Java; remaining H3s are in header/footer chrome) |
| Structured data in raw HTML | 1 JSON-LD `@graph` (TechArticle + BreadcrumbList + FAQPage) | `Seo.astro:314-325` |
| Open Graph | `og:type=article`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale=en_US`, `og:image` | `Seo.astro:297-304` |
| Twitter Card | `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site` | `Seo.astro:306-311` |

**Definition of "visible words in raw HTML":** words remaining after removing `<script>` and `<style>` blocks, stripping all HTML tags, decoding HTML entities and splitting on whitespace. This is the text Googlebot sees on the very first fetch.

### 1.2 Rendered fetch (JavaScript enabled, Chromium/WRS)

| Property | Value | Evidence |
| --- | --- | --- |
| Final URL | `https://stackpractices.com/recipes/api-documentation-openapi/` | Static path, no `history.replaceState` rewrite |
| Rendered words | **~1,776** (identical to raw) | Same HTML; no JS-injected content |
| H1 count | 1 | Same as raw |
| H2 count | 17 | Same as raw |
| H3 count | 6 | Same as raw |
| Internal `<a>` links | 44 | Extracted from built HTML `<a>` tags |
| External `<a>` links | 5 | 4 "Further Reading" + 1 footer Ko-fi |
| Render time | **~0 ms for content** | No JS dependency; WRS would see the same HTML immediately |
| JSON-LD after render | 1 `@graph` block (TechArticle + BreadcrumbList + FAQPage) | Already in raw HTML; no JS injection |

The only JavaScript-driven elements are:

- Table of Contents population (`/ui.js` fills `#toc-list` and toggles `display:none`).
- Mobile menu toggle.
- Cookie consent banner/modal.
- `window.print()` button.

None of these affects content, links, structured data or indexability.

### 1.3 HTTP trace sample

**Request 1 (HEAD/GET, no JS, Googlebot UA):**

```text
GET /recipes/api-documentation-openapi/ HTTP/1.1
Host: stackpractices.com
User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 31875
```

There is **no 301 redirect**. The static `dist/recipes/api-documentation-openapi/index.html` file is served directly.

**Rendered network summary (Chromium with JS):**

| # | Resource | Method | Status | Content-Type | Size (bytes) |
| --- | --- | --- | --- | --- | --- |
| 1 | `/recipes/api-documentation-openapi/` | GET | 200 | `text/html; charset=utf-8` | 31,875 |
| 2 | `/_astro/BaseLayout.BxXti_Wc.css` | GET | 200 | `text/css` | (Astro-hashed bundle, served from `_astro/`) |
| 3 | `/icons.svg` | GET | 200 | `image/svg+xml` | Sprite sheet |
| 4 | `/analytics.js` | GET | 200 | `application/javascript` | Externalized GTM/gtag (async) |
| 5 | `/ui.js` | GET | 200 | `application/javascript` | Defer UI interactions |

There is no content index JSON file, no large application JavaScript bundle, no hydration payload and no client-side JSON fetch for content.

### 1.4 Raw vs. rendered HTML comparison

| Check | Raw HTML | Rendered HTML | Delta |
| --- | --- | --- | --- |
| `<title>` | Same | Same | None |
| Meta description | Same | Same | None |
| Canonical | Same | Same | None |
| Hreflang | Same | Same | None |
| H1 / H2 / H3 | Same | Same | None |
| Article body | Same | Same | None |
| Code examples | Same | Same | None |
| FAQ `<dl>` | Same | Same | None |
| Related resources | Same | Same | None |
| Internal links | Same | Same | None |
| JSON-LD | Same | Same | None |
| TOC `<div id="toc-list">` | Empty | May be populated by `/ui.js` | Minor UI-only change |
| Cookie banner | Hidden | May be shown / managed by `/ui.js` | UI-only change |

**HTML diff verdict:** The raw HTML and the rendered DOM are functionally identical. There is no content, no links and no structured data that depends on JavaScript.

---

## Phase 2 — Is Main Content Already in the Initial HTML?

| Question | Answer | Evidence |
| --- | --- | --- |
| Is the main content present in the initial HTML? | **YES** | Full article, headings, tables, code, FAQ and links are in `dist/.../index.html` |
| Is Google forced to execute JavaScript? | **NO** | No content is JS-injected |
| Is this an SPA? | **NO** | No client-side router; `astro build` emits one HTML file per route |
| Is this SSR? | **NO** (build-time SSG, not request-time server rendering) | `getStaticPaths()` in `src/pages/recipes/[slug].astro` pre-builds the page |
| Is this SSG? | **YES** | Astro 5+ static output; `dist/` contains pre-rendered HTML |
| Is hydration delaying content? | **NO** | Astro ships zero JS by default; no islands on this page |
| Could Googlebot miss content? | **NO** | All content is in the first response |

### Rendering complexity estimate

| Resource | Role | Notes |
| --- | --- | --- |
| Initial HTML | 31,875 B | Contains full content, meta, links and schema |
| `/_astro/BaseLayout.BxXti_Wc.css` | Styles | Single hashed CSS bundle |
| `/analytics.js` | GA4 / GTM / consent | `async`, does not block render |
| `/ui.js` | UI chrome (TOC, mobile nav, cookies) | `defer`, does not block content |
| `/icons.svg` | Icons | Sprite, lazy-loaded by `<use>` |
| `/og-image.png` | Open Graph / Twitter | Generic site image |

**Interpretation:** Rendering complexity is **minimal**. The page is a static file with two small, non-blocking scripts. Google's Web Rendering Service would process it instantly.

---

## Phase 3 — Sitemap Validation (Single Resource)

`public/sitemap.xml` is generated at build time. This resource appears twice:

- **EN** in `dist/sitemap.xml` lines 20443–20449:

  ```xml
  <url>
    <loc>https://stackpractices.com/recipes/api-documentation-openapi/</loc>
    <lastmod>2026-08-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="en" href="https://stackpractices.com/recipes/api-documentation-openapi/" />
    <xhtml:link rel="alternate" hreflang="es" href="https://stackpractices.com/es/recipes/api-documentation-openapi/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://stackpractices.com/recipes/api-documentation-openapi/" />
  </url>
  ```

- **ES** in `dist/sitemap.xml` lines 7924–7930:

  ```xml
  <url>
    <loc>https://stackpractices.com/es/recipes/api-documentation-openapi/</loc>
    <lastmod>2026-08-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    <xhtml:link rel="alternate" hreflang="en" href="https://stackpractices.com/recipes/api-documentation-openapi/" />
    <xhtml:link rel="alternate" hreflang="es" href="https://stackpractices.com/es/recipes/api-documentation-openapi/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://stackpractices.com/recipes/api-documentation-openapi/" />
  </url>
  ```

| Check | Result |
| --- | --- |
| Sitemap `<loc>` uses trailing slash | **YES** |
| Hreflang alternates use trailing slash | **YES** |
| Bidirectional alternates (EN ↔ ES) | **YES** |
| `x-default` present | **YES**, points to EN |
| HTTP status for `loc` | 200 (static file) |
| Redirect chain | None |

---

## Phase 4 — Canonical and Hreflang

### EN page

| Check | Value | Result |
| --- | --- | --- |
| `<html lang>` | `en` | Correct |
| Canonical | `https://stackpractices.com/recipes/api-documentation-openapi/` | Self-canonical, trailing slash |
| `hreflang="en"` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Correct |
| `hreflang="es"` | `https://stackpractices.com/es/recipes/api-documentation-openapi/` | Correct |
| `hreflang="x-default"` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Points to EN |

### ES page

| Check | Value | Result |
| --- | --- | --- |
| `<html lang>` | `es` | Correct |
| Canonical | `https://stackpractices.com/es/recipes/api-documentation-openapi/` | Self-canonical, trailing slash |
| `hreflang="en"` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Correct |
| `hreflang="es"` | `https://stackpractices.com/es/recipes/api-documentation-openapi/` | Correct |
| `hreflang="x-default"` | `https://stackpractices.com/recipes/api-documentation-openapi/` | Points to EN |

### Cross-language consistency

Canonical, hreflang and sitemap are consistent and all use trailing slashes. There is no redirect chain. However, the **ES JSON-LD does not match its own canonical**:

- ES canonical says `https://stackpractices.com/es/recipes/api-documentation-openapi/`
- ES `TechArticle.url` says `https://stackpractices.com/recipes/api-documentation-openapi/`
- ES `BreadcrumbList` item 3 says `https://stackpractices.com/recipes/api-documentation-openapi/`

**Root cause:** `src/pages/es/recipes/[slug].astro:36` passes `path={`/recipes/${d.slug}/`}` to `RecipeArticle.astro`. `RecipeArticle.astro:65` and `:77` use this `path` for the `TechArticle` URL and the final breadcrumb item. `Seo.astro` separately adds the `/es` prefix for canonical/hreflang (`Seo.astro:63-65`) using `locale`, but the JSON-LD object is passed in already and is not re-localized.

---

## Phase 5 — Structured Data

### JSON-LD content (EN built HTML)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "headline": "How to Document an API with OpenAPI, Swagger UI and Redoc",
      "description": "Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.",
      "url": "https://stackpractices.com/recipes/api-documentation-openapi/",
      "inLanguage": "en",
      "educationalLevel": "Beginner",
      "articleSection": "api",
      "keywords": "openapi docs, swagger documentation, redoc, api documentation example",
      "dateModified": "2026-08-10T00:00:00.000Z",
      "datePublished": "2026-06-12T00:00:00.000Z",
      "author": { "@type": "Person", "name": "Mathias Paulenko", "url": "https://mathiaspaulenko.com" },
      "publisher": { "@type": "Organization", "name": "StackPractices", "url": "https://stackpractices.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://stackpractices.com/" },
        { "@type": "ListItem", "position": 2, "name": "Recipes", "item": "https://stackpractices.com/recipes/" },
        { "@type": "ListItem", "position": 3, "name": "How to Document an API with OpenAPI, Swagger UI and Redoc", "item": "https://stackpractices.com/recipes/api-documentation-openapi/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use code-first or design-first?",
          "acceptedAnswer": { "@type": "Answer", "text": "Start with code-first if you're building an internal API that only your own team consumes. FastAPI, SpringDoc and tsoa derive the spec from your annotations, so the contract stays close to the code." }
        },
        {
          "@type": "Question",
          "name": "How do I keep documentation in sync with deployed code?",
          "acceptedAnswer": { "@type": "Answer", "text": "Generate the spec in CI from your code, publish it to a registry and link the deployed docs to the latest spec version. A minimal GitHub Actions job looks like this:" }
        },
        {
          "@type": "Question",
          "name": "Can I convert Swagger 2.0 to OpenAPI 3.0?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Use the swagger2openapi CLI or Swagger Editor's built-in converter. Most modern tools support 3.0 natively." }
        }
      ]
    }
  ]
}
```

### Schema validation summary

| Check | Result | Evidence |
| --- | --- | --- |
| Syntax | Valid JSON-LD, `@graph` wrapper | `Seo.astro:319-322` |
| TechArticle | Complete required fields, includes author, publisher, dates, `educationalLevel` | `src/lib/schema.ts:82-117` |
| BreadcrumbList | 3 levels matching visible breadcrumb | `RecipeArticle.astro:74-78` |
| FAQPage | Only 3 of 10 visible FAQs; 28 source questions are not in the built HTML at all | `RecipeArticle.astro:82` (`faqs.slice(0, 3)`); `RecipeArticle.astro:229` (`faqs.slice(0, 10)`); `src/lib/remark-truncate-faq.mjs:159-172` removes the source FAQ section |
| ES `TechArticle.url` | **WRONG** — points to EN URL | `dist/es/recipes/api-documentation-openapi/index.html` |
| ES BreadcrumbList item 3 | **WRONG** — points to EN URL | Same as above |

### Structured data issues

1. **FAQ content loss in built HTML.** The source contains 38 question-style `###` headings, but `src/lib/remark-truncate-faq.mjs:159-172` removes the entire FAQ section from the rendered markdown. `RecipeArticle.astro:229` renders only the first 10 extracted Q&A pairs, and `content.ts:65-76` truncates each answer to 200 characters. The remaining 28 questions and their full answers are absent from the HTML Googlebot receives.
2. **FAQPage schema truncation.** Only 3 of the 10 visible FAQs are serialized to JSON-LD (`RecipeArticle.astro:82` `faqPage(faqs.slice(0, 3))`). Google allows up to 10 FAQ items for rich results, so 7 visible Q&As are not marked.
3. **ES URL mismatch.** Spanish structured data claims the article lives at the English URL. This creates a conflict between the JSON-LD `url` field and the page's own canonical.

---

## Phase 6 — Internal Links

| Link Type | Count | Present in raw HTML? | Source |
| --- | --- | --- | --- |
| Breadcrumb | 2 (Home, Recipes) | Yes | `RecipeArticle.astro:109-114` |
| Main navigation | 7 (desktop) + 7 (mobile) | Yes | `Header.astro` / mobile nav |
| Language switch | 1 (`/es/recipes/api-documentation-openapi/`) | Yes | `Header.astro` |
| Author link | 1 (`/authors/`) | Yes | `RecipeArticle.astro:125` |
| Tags | 5 (`/tags/api/`, `/tags/documentation/`, `/tags/java/`, `/tags/rest/`, `/tags/http/`) | Yes | `RecipeArticle.astro:148-153` |
| Topics | 1 (`/topics/api/`) | Yes | `RecipeArticle.astro:164-169` |
| Related resources | 9 | Yes | `api-documentation-openapi.md:16-25`, `RecipeArticle.astro:242-253` |
| Footer / legal | ~8 | Yes | `Footer.astro` |
| External (Further Reading) | 4 | Yes | `api-documentation-openapi.md:156-159` |
| **Total `<a>` tags** | **50** | **Yes** | Built HTML |
| **Unique internal `<a>` targets** | **37** | — | Built HTML |

### Related resources (9)

- `/recipes/api-versioning/`
- `/recipes/call-rest-api/`
- `/recipes/graphql-api/`
- `/recipes/handle-cors/`
- `/recipes/handle-errors/`
- `/recipes/api-logging-audit/`
- `/recipes/api-rate-limiting-redis/`
- `/recipes/cursor-pagination-postgresql/`
- `/recipes/real-time-notifications/`

### Orphan / depth risk

- **Crawl depth:** 2–3 clicks from home (`/recipes/` listing → detail, or `/topics/api/` → detail).
- **Orphan:** No. The page is linked from the sitemap, `/recipes/` listing, `/topics/api/`, tag pages and 9 related resources.

---

## Phase 7 — Resource Loading and Crawl Budget

| Resource | Status | Evidence |
| --- | --- | --- |
| Blocked JavaScript | None | `robots.txt` allows all; CSP permits `'self'` and analytics scripts |
| Blocked CSS | None | CSP `style-src 'self' 'unsafe-inline'` |
| Blocked images | None | CSP `img-src 'self' data: https:` |
| Blocked fonts | None | `font-src 'self'` |
| Blocked APIs | None | No API calls for content |
| Failed requests | None expected | Static site, local assets |
| CORS issues | None | Analytics is same-initiator; no cross-origin content fetches |

### Page-weight summary

| Asset | Approximate size | Blocking? |
| --- | --- | --- |
| HTML | 31.9 KB | No |
| CSS (`_astro/BaseLayout.*.css`) | ~7 KB | Render-blocking by default, but single file and small |
| `/analytics.js` | ~1–2 KB | `async`, non-blocking |
| `/ui.js` | ~2–3 KB | `defer`, non-blocking |
| `/icons.svg` | ~few KB | Lazy via `<use>` |

### Crawl budget estimate

| Metric | Estimate | Evidence |
| --- | --- | --- |
| Average response time | <100 ms | GitHub Pages CDN, no server processing |
| Page weight | ~40–50 KB total (HTML + CSS + JS + icons) | Static output |
| JavaScript execution cost | Minimal | No hydration, no client-side rendering |
| Rendering cost | Near zero | Content already in HTML |
| Redirect chains | None | Static trailing-slash URLs |
| Parameter URLs | None | File-based SSG routing |
| Overall crawl efficiency | **Excellent** | Fast, small, no JS dependency |

---

## Phase 8 — Indexability

| Check | Result | Evidence |
| --- | --- | --- |
| Indexable | **YES** | No `noindex`, canonical self-references, sitemap included |
| Meta robots | Absent (default `index, follow`) | No `<meta name="robots">` in built HTML |
| Canonical conflicts | None | Self-canonical, matches final URL |
| Redirect conflicts | None | Static file served directly at 200 |
| Duplicate pages | Low risk | ES is a translation with distinct canonical/hreflang |
| Soft 404 | No | Substantial content, correct title/description |
| Hard 404 | No | File exists in `dist/` and content collection |
| Thin content | No (but content is truncated) | ~1,600+ words in `<main>`, 17 H2s, code, table, 10 FAQs. The source has 38 FAQs, but 28 are removed by `remarkTruncateFaq` and not present in the built HTML. |
| Parameter pages | No | No URL parameters |
| Noindex pages | No | `noindex` defaults to `false` (`BaseLayout.astro:32`) |
| Blocked pages | No | `robots.txt: User-agent: * / Allow: /` |

---

## Phase 9 — Google Understanding

| Property | Value | Evidence |
| --- | --- | --- |
| Primary topic | OpenAPI API documentation | Title, H1, content, `articleSection: api` |
| Secondary topics | Swagger UI vs Redoc, code-first vs design-first, Python/FastAPI, JavaScript/Express, Java/SpringDoc | Section headings and code examples |
| Content type | `TechArticle` recipe | `RecipeArticle.astro:61-72` |
| Difficulty level | `beginner` → `educationalLevel: Beginner` | `src/lib/schema.ts:10-21` |
| Author | Mathias Paulenko (Person schema) | `src/lib/schema.ts:106-110` |
| Publisher | StackPractices (Organization schema) | `src/lib/schema.ts:111-115` |
| Language | `en` (`<html lang="en">`, `inLanguage: en`) | Built HTML |
| Breadcrumb context | Home → Recipes → Article | Visible breadcrumb + BreadcrumbList JSON-LD |
| Topical cluster | API recipes (`/topics/api/`, tags: `api`, `documentation`, `rest`, `http`, `java`) | Built HTML tag/topic links |
| Content completeness | **Partial** — 10 of 38 source FAQ questions are rendered; 28 are removed by `remarkTruncateFaq` | `dist/.../index.html` contains only the first 10 visible FAQs; source `###` count = 38 |

### EEAT assessment

- **Author is named** in `author` meta and Person schema.
- **Author URL** points to `https://mathiaspaulenko.com`.
- **Publisher** is present as Organization.
- **Missing:** `sameAs` and `knowsAbout` for the author (`src/lib/schema.ts:42-63` supports them but `PRIMARY_AUTHOR` likely does not set them). This limits EEAT signals.

---

## Phase 10 — Index Confidence Score

Scores are 0–100, where higher means higher confidence (except `Ignore` and `Drop`, where lower is better; those scores reflect the *probability* Google would ignore or drop the page, so 10 = 10% chance).

| Signal | Score | Justification |
| --- | --- | --- |
| **Crawl confidence** | 95 | Static HTML, 200 OK, no redirects, fast CDN, in sitemap. Minor deduction for generic OG image and one ES schema mismatch. |
| **Render confidence** | 100 | Raw HTML equals rendered HTML; zero JS dependency for content. |
| **Index confidence** | 85 | Canonical clean, hreflang correct, no noindex. Deduction for ES JSON-LD URL conflict, truncated FAQ schema and the 28 source FAQ questions that are stripped from the built HTML. |
| **Rank confidence** | 45 | Technicals are strong, but the page is missing ~70% of its FAQ content, competes with official OpenAPI/FastAPI/SpringDoc/Redoc docs and is on a low-authority domain. |
| **Ignore probability** | 10 | Unlikely to be ignored; the page is well-formed and discoverable. |
| **Drop probability** | 5 | Very unlikely to be dropped, unless the ES schema conflict is misinterpreted as a duplicate/soft-404 signal. |

**Overall Google confidence: 75/100.**

The page will almost certainly be crawled, rendered and indexed, but Googlebot receives only a fraction of the source FAQ content. The main uncertainty is ranking, driven by the missing content, authority/EEAT gaps and strong competition.

---

## Phase 11 — Root Cause and Prioritization

### Why Google might decide not to rank this page

If the page fails to rank, it will **not** be because Google cannot see it. It will be because:

1. **Authority gap.** The domain is newer and has fewer backlinks/brand mentions than the official OpenAPI ecosystem sites (`spec.openapis.org`, `fastapi.tiangolo.com`, `springdoc.org`, `redocly.com`) and established tutorial publishers.
2. **EEAT signals are incomplete.** The author schema lacks `sameAs` links to professional profiles and `knowsAbout` expertise fields.
3. **Content is truncated.** The source has 38 FAQ questions, but `remarkTruncateFaq` strips the FAQ section from the body and `RecipeArticle.astro` only renders 10 truncated Q&A pairs. 28 questions never reach Googlebot, and only 3 of the 10 visible questions are marked with `FAQPage` JSON-LD.
4. **Structured data is mismatched.** The Spanish page's JSON-LD `url` points to the English URL, conflicting with its canonical.
5. **SERP differentiation.** The meta description is accurate but generic; the Open Graph image is site-wide. Competing results may offer richer snippets.

### Severity table

| Issue | Severity | Evidence |
| --- | --- | --- |
| ES `TechArticle` and BreadcrumbList use English URL | **High** | `dist/es/recipes/api-documentation-openapi/index.html` JSON-LD; `src/pages/es/recipes/[slug].astro:36` |
| FAQ body content removed and only 10 of 38 source questions rendered | **High** | `src/lib/remark-truncate-faq.mjs:159-172` removes FAQ section; `RecipeArticle.astro:229` limits visible list to 10; `content.ts:65-76` truncates answers to 200 characters |
| FAQPage JSON-LD only contains 3 of 10 visible FAQs | **Medium** | `RecipeArticle.astro:82` (`faqPage(faqs.slice(0, 3))`) |
| Generic `og:image` for all pages | **Low** | `Seo.astro:304` uses `${SITE.url}/og-image.png` |
| Author Person schema lacks `sameAs` / `knowsAbout` | **Medium** | `src/lib/schema.ts:106-110` uses only `name` and `url` from `PRIMARY_AUTHOR` |
| Low domain authority vs official documentation | **High** | Competitive SERP landscape; no unique authority signal in this report |

### Priority table

| Priority | Action | Target file(s) | Estimated impact |
| --- | --- | --- | --- |
| **P0** | Fix ES `path` prop to include `/es/` prefix so JSON-LD matches canonical | `src/pages/es/recipes/[slug].astro:36` | Removes schema/canonical conflict for all ES recipes |
| **P0** | Render all 38 source FAQs (or the best 10 with full answers) instead of removing the FAQ section and truncating to 200 characters | `src/lib/remark-truncate-faq.mjs` (set `removeSection: false` or remove plugin); `RecipeArticle.astro:229` (`faqs.slice(0, 10)`); `src/lib/content.ts:65-76` (remove 200-char truncation) | Restores the content Googlebot actually receives; improves topical depth and FAQ rich-result eligibility |
| **P0** | Increase `FAQPage` JSON-LD limit to match the visible FAQ list (up to 10) | `RecipeArticle.astro:82` (`faqs.slice(0, 10)`) | Expands FAQ rich-result eligibility for this and all recipe pages |
| **P1** | Add per-page or per-topic `og:image` | `Seo.astro` + image assets | Improves SERP click-through and social sharing |
| **P1** | Enrich author schema with `sameAs` (GitHub, LinkedIn, X) and `knowsAbout` | `src/data/authors.ts` + `src/lib/schema.ts` | Strengthens EEAT signals |
| **P2** | If rendering all 38 FAQs, implement a "show more" or collapsible UI to keep the page usable | `RecipeArticle.astro` + `/ui.js` | Avoids overwhelming users while keeping all Q&A in the HTML |
| **P3** | Build topical authority through external backlinks, citations and community shares | Off-site SEO | Long-term ranking potential |

### 30-day action plan

| Week | Focus |
| --- | --- |
| 1 | Fix ES `path` prop in all ES `[slug].astro` routes; rebuild and verify ES JSON-LD canonical match. |
| 2 | Restore FAQ content to the rendered page: either stop removing the FAQ section in `remarkTruncateFaq` or render all 10/38 Q&A pairs with full (untruncated) answers; increase `FAQPage` JSON-LD limit to match the visible list. |
| 3 | Add `sameAs`/`knowsAbout` to author data; regenerate pages; verify Person schema. |
| 4 | Design topic-specific `og:image` templates and update `Seo.astro` to select them. |

---

## Appendices

### A. Evidence files and paths

| File | Description |
| --- | --- |
| `dist/recipes/api-documentation-openapi/index.html` | Built English HTML (31,875 bytes) |
| `dist/es/recipes/api-documentation-openapi/index.html` | Built Spanish HTML |
| `dist/sitemap.xml` lines 20443–20449 | English sitemap entry |
| `dist/sitemap.xml` lines 7924–7930 | Spanish sitemap entry |
| `public/robots.txt` | Crawler directives (`Allow: /`) |
| `src/content/recipes/api/api-documentation-openapi.md` | English source content and frontmatter |
| `src/content/recipes/api/api-documentation-openapi.es.md` | Spanish source content and frontmatter |
| `src/pages/recipes/[slug].astro` | EN route builder |
| `src/pages/es/recipes/[slug].astro` | ES route builder (path bug source) |
| `src/components/RecipeArticle.astro` | Recipe page template and JSON-LD assembly |
| `src/components/Seo.astro` | Canonical, hreflang, OG, JSON-LD injection |
| `src/layouts/BaseLayout.astro` | Base layout with scripts and CSP |
| `src/lib/schema.ts` | Schema.org JSON-LD builders |

### B. Sample `curl` trace (no JS)

```text
$ curl -I -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
       https://stackpractices.com/recipes/api-documentation-openapi/

HTTP/2 200
content-type: text/html; charset=utf-8
content-length: 31875
```

### C. Raw HTML body excerpt

```html
<main id="main" class="bh" data-pagefind-body>
  <div data-pagefind-filter="lang[en]">
    <div data-pagefind-filter="contentType[recipes]">
      <!-- ... -->
      <h1 class="ly">How to Document an API with OpenAPI, Swagger UI and Redoc</h1>
      <p class="lz">
        A step-by-step guide to documenting REST APIs with OpenAPI.
        Generate interactive docs with Swagger UI and Redoc using Python, JavaScript and Java.
      </p>
      <!-- tags, topics, article prose, code blocks, FAQ, related resources ... -->
    </div>
  </div>
</main>
```

This exact structure is present in the **initial HTML response**. It is the same structure the Web Rendering Service would see after any JavaScript execution because the page contains no client-side content rendering.

---

**Report end.**
