# Googlebot Forensic Report — qapractices.com

**Objective:** Determine exactly what Googlebot sees and why Google may decide not to index or rank `https://qapractices.com`.  
**Date:** 2026-07-23  
**Method:** Fetch pages both without JavaScript (raw server response) and with JavaScript (Playwright Chromium), validate the entire live sitemap, inspect hreflang and internal links, and compare the two DOM versions.  

**Key evidence files:**

* `ref/googlebot-render-results.json` — no-JS vs rendered metrics for 12 sample URLs.
* `ref/googlebot-traces/` — saved raw and rendered HTML for each sample.
* `ref/googlebot-screenshots/` — full-page screenshots after JS rendering.
* `ref/sitemap-validation.json` — HEAD validation of all 2,352 sitemap URLs.
* `ref/hreflang-validation.json` — bidirectional and x-default hreflang checks.
* `ref/internal-link-graph.json` — incoming/outgoing link graph.

---

## Executive Summary

Googlebot is being asked to crawl a website that is **not ready to be indexed**.

* **2,349 of 2,352 sitemap URLs redirect** (non-slash → slash). The sitemap is effectively a list of 301s.
* **The initial HTML contains no content.** Every page is `<app-root></app-root>` plus scripts. Googlebot must execute JavaScript to see any article text, headings, links, or schema.
* **The rendered payload is heavy.** A detail page requires a 301 redirect, ~247 KB `main-*.js`, ~246 KB `index-en.json`, plus CSS and images. First render takes ~5.8 seconds.
* **All 14,264 internal `relatedResources` links point to redirecting URLs.**
* **All 4,700 `hreflang` alternate URLs (en + es across 2,350 pages) omit the trailing slash** and therefore redirect.
* **Canonical URLs in the static HTML also omit the trailing slash**, while the final served URL uses the slash.

Conclusion: Googlebot can discover the URLs, but the crawl is slow, expensive, and produces a low-trust, templated page after rendering. Google is economically justified in not ranking the site.

---

## Phase 1 — Fetch Without JavaScript vs. With JavaScript

### Sample URLs tested

1. `https://qapractices.com/`
2. `https://qapractices.com/checklists/ab-testing-qa-checklist`
3. `https://qapractices.com/documentation/api-testing-guide`
4. `https://qapractices.com/test-cases/login-test-cases`
5. `https://qapractices.com/templates/test-plan-template-free`
6. `https://qapractices.com/prompts/ai-prompt-api-testing`
7. `https://qapractices.com/topics/qa-fundamentals`
8. `https://qapractices.com/about`
9. `https://qapractices.com/authors`
10. `https://qapractices.com/privacy`
11. `https://qapractices.com/all-resources`
12. `https://qapractices.com/es/documentation/api-testing-guide`

### No-JavaScript fetch results (first request)

| URL | HTTP status | Final URL | Visible words in raw HTML | Title | Meta robots | Canonical in raw HTML | Structured data in raw HTML |
|-----|-------------|-----------|---------------------------|-------|-------------|------------------------|------------------------------|
| `/` | 200 | `/` | 6 | QAPractices - Quality Assurance Resources Hub | index, follow | `https://qapractices.com/` | Organization + WebPage |
| `/checklists/ab-testing-qa-checklist` | 301 → 200 | `/checklists/ab-testing-qa-checklist/` | 11 | A/B Testing QA Checklist... | index, follow | `https://qapractices.com/checklists/ab-testing-qa-checklist` | Organization + WebPage |
| `/documentation/api-testing-guide` | 301 → 200 | `/documentation/api-testing-guide/` | 11 | API Testing Guide... | index, follow | no-slash | Organization + WebPage |
| `/test-cases/login-test-cases` | 301 → 200 | `/test-cases/login-test-cases/` | 10 | Login Test Cases... | index, follow | no-slash | Organization + WebPage |
| `/templates/test-plan-template-free` | 301 → 200 | `/templates/test-plan-template-free/` | 12 | Test Plan Template... | index, follow | no-slash | Organization + WebPage |
| `/prompts/ai-prompt-api-testing` | 301 → 200 | `/prompts/ai-prompt-api-testing/` | 12 | AI Prompt for API Testing... | index, follow | no-slash | Organization + WebPage |
| `/topics/qa-fundamentals` | 301 → 200 | `/topics/qa-fundamentals/` | 10 | QA Fundamentals... | index, follow | no-slash | Organization + WebPage |
| `/about` | 301 → 200 | `/about/` | 2 | About - QAPractices | index, follow | `https://qapractices.com/about` | Organization + WebPage |
| `/authors` | 301 → 200 | `/authors/` | 2 | Authors - QAPractices | index, follow | no-slash | Organization + WebPage |
| `/privacy` | 301 → 200 | `/privacy/` | 2 | Privacy Policy - QAPractices | index, follow | no-slash | Organization + WebPage |
| `/all-resources` | 301 → 200 | `/all-resources/` | 2 | All Resources - QAPractices | index, follow | no-slash | Organization + WebPage |
| `/es/documentation/api-testing-guide` | 301 → 200 | `/es/documentation/api-testing-guide/` | 13 | Guía de Testing de API... | index, follow | no-slash | Organization + WebPage |

**Definition of "visible words in raw HTML":** words remaining after stripping `<script>`, `<style>`, and HTML tags from the server response. The only visible text in the raw HTML of detail pages is the `<title>` content. No article body, no navigation, no internal links, no lists, no tables.

### Rendered results (JavaScript enabled, Playwright Chromium)

| URL | Final URL | Rendered words | H1 count | H2 count | Internal links | Render time (ms) | JSON-LD after render |
|-----|-----------|----------------|----------|----------|----------------|------------------|----------------------|
| `/` | `/` | 1,041 | 1 | 5 | 61 | 3,745 | Organization + WebPage + Person |
| `/checklists/ab-testing-qa-checklist` | `/checklists/ab-testing-qa-checklist` | 1,764 | 2 | 10 | 36 | 5,799 | Organization + WebPage + Person + TechArticle + BreadcrumbList |
| `/documentation/api-testing-guide` | `/documentation/api-testing-guide` | 2,314 | 1 | 17 | 38 | 4,987 | Organization + WebPage + Person + TechArticle + BreadcrumbList |
| `/test-cases/login-test-cases` | `/test-cases/login-test-cases` | 2,587 | 1 | 14 | 35 | 5,213 | Organization + WebPage + Person + TechArticle + BreadcrumbList |
| `/templates/test-plan-template-free` | `/templates/test-plan-template-free` | 2,554 | 1 | 12 | 27 | 5,442 | Organization + WebPage + Person + TechArticle + BreadcrumbList |
| `/prompts/ai-prompt-api-testing` | `/prompts/ai-prompt-api-testing` | 1,563 | 1 | 9 | 24 | 5,120 | Organization + WebPage + Person + TechArticle + BreadcrumbList |
| `/topics/qa-fundamentals` | `/topics/qa-fundamentals` | 1,678 | 1 | 8 | 85 | 4,765 | Organization + WebPage + Person + CollectionPage? + ItemList + BreadcrumbList |
| `/about` | `/about` | 248 | 1 | 2 | 23 | 4,332 | Organization + WebPage + Person |
| `/authors` | `/authors` | 515 | 1 | 3 | 32 | 4,891 | Organization + WebPage + Person |
| `/privacy` | `/privacy` | 402 | 1 | 5 | 23 | 4,551 | Organization + WebPage + Person |
| `/all-resources` | `/all-resources` | 2,104 | 1 | 4 | 122 | 5,631 | Organization + WebPage + Person |
| `/es/documentation/api-testing-guide` | `/es/documentation/api-testing-guide` | 2,301 | 1 | 16 | 37 | 5,055 | Organization + WebPage + Person + TechArticle + BreadcrumbList |

**Note on final URL:** Playwright reports the originally navigated URL because the SPA uses `history.replaceState` to restore the path. The actual HTTP 200 response is the trailing-slash version (verified in the network log).

### HTTP trace sample: `/checklists/ab-testing-qa-checklist`

**Request 1 (HEAD/GET, no JS):**

```text
GET /checklists/ab-testing-qa-checklist HTTP/1.1
Host: qapractices.com
User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)

HTTP/1.1 301 Moved Permanently
Location: /checklists/ab-testing-qa-checklist/

GET /checklists/ab-testing-qa-checklist/ HTTP/1.1

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 8,349
```

**Rendered network summary (Playwright):**

| # | Resource | Method | Status | Content-Type | Size |
|---|----------|--------|--------|--------------|------|
| 1 | `/checklists/ab-testing-qa-checklist` | GET | 301 | text/html | 162 B |
| 2 | `/checklists/ab-testing-qa-checklist/` | GET | 200 | text/html; charset=utf-8 | 2,547 B |
| 3 | `/styles-QTQA2B2Z.css` | GET | 200 | text/css | 6,994 B |
| 4 | `/main-WVWP3FKM.js` | GET | 200 | application/javascript | 246,830 B |
| 5 | `/assets/content/index-en.json` | GET | 200 | application/json | 246,073 B |

### Raw vs. rendered HTML comparison sample

**Raw HTML body (no JavaScript):**

```html
  <body>
    <!-- GitHub Pages SPA redirect restoration -->
    <script type="text/javascript">
      (function() {
        var redirect = window.location.search.match(/\?\/(.+)/);
        if (redirect) { ... }
      })();
    </script>
    <app-root></app-root>
  <script src="main-WVWP3FKM.js" type="module"></script></body>
</html>
```

**Rendered HTML body excerpt (after JavaScript):**

```html
<app-root _nghost-ng-c4190635745="" ng-version="22.0.1">
  <div _ngcontent-ng-c4190635745="" class="app-container">
    <router-outlet _ngcontent-ng-c4190635745=""></router-outlet>
    <app-resource-detail _nghost-ng-c1162126237="">
      <article class="resource-page">
        <header class="page-header">
          <div class="container">
            <h1 class="page-title">A/B Testing QA Checklist for QA Engineers and Testers</h1>
            ...
            <h2>Overview</h2>
            <h2>When to Use</h2>
            <h2>Experiment Setup Checklist</h2>
            ...
          </div>
        </header>
      </article>
    </app-resource-detail>
  </div>
</app-root>
```

### Screenshots

*Rendered detail page:*

![Rendered A/B Testing Checklist](googlebot-screenshots/checklists-ab-testing-qa-checklist.png)

*Rendered home:*

![Rendered Home](googlebot-screenshots/home.png)

---

## Phase 2 — Is Main Content Already in the Initial HTML?

| Question | Answer |
|----------|--------|
| Is the main content present in the initial HTML? | **NO** |
| Is Google forced to execute JavaScript? | **YES** |
| Is this an SPA? | **YES** |
| Is this SSR? | **NO** |
| Is this SSG (pre-rendered content)? | **NO** — only `<head>` meta and scripts are pre-rendered; the body is empty. |
| Is hydration delaying content? | **YES** — Angular bootstraps, loads `index-en.json` (~246 KB), then renders. |
| Could Googlebot miss content? | **YES** — if rendering budget, timeout, or script blocking occurs, the page is blank. |

### Rendering complexity estimate

| Resource | Size (transferred) | Role |
|----------|--------------------|------|
| Initial HTML | ~2.5–8.3 KB | Shell; no body content |
| `main-*.js` | ~247 KB (gzipped) | Angular runtime + application code |
| `index-en.json` or `index-es.json` | ~246 KB (gzipped) | Entire content index loaded at runtime |
| CSS | ~7 KB | Styles |
| Images / fonts | variable | UI assets |
| Total transferred per page (after redirect) | ~500 KB minimum | Plus render time |
| Render time observed | 4.3–5.8 s | From navigation to `networkidle` |

**Interpretation:** Rendering complexity is **high** for a static content site. A 2,300+ page corpus at ~500 KB + 5 s per page is a massive crawl/render investment for Google.

## Phase 3 — Sitemap Validation

### Method

Parsed `https://qapractices.com/sitemap.xml` and issued a `HEAD` request for each of the 2,352 `<loc>` URLs. Followed up to 4 redirects per URL. Measured response time.

### Results summary

| Metric | Value |
|--------|-------|
| Total URLs tested | 2,352 |
| HTTP 200 | 2,349 |
| HTTP 503 (transient GitHub Pages) | 3 |
| URLs that performed a 301 redirect | **2,349** |
| URLs that did NOT redirect | **3** (`https://qapractices.com/`, `https://qapractices.com/es/`, and one more root route) |
| Average HEAD response time | **3,705 ms** |
| Max HEAD response time | **5,157 ms** |
| Non-slash → slash redirects | 2,349 |

### Redirect chain sample

| Sitemap URL | Chain |
|-------------|-------|
| `https://qapractices.com/about` | 301 → `https://qapractices.com/about/` → 200 |
| `https://qapractices.com/checklists/ab-testing-qa-checklist` | 301 → `/checklists/ab-testing-qa-checklist/` → 200 |
| `https://qapractices.com/documentation/api-testing-guide` | 301 → `/documentation/api-testing-guide/` → 200 |
| `https://qapractices.com/es/documentation/api-testing-guide` | 301 → `/es/documentation/api-testing-guide/` → 200 |

### Canonical and trailing slash consistency

| Check | Result |
|-------|--------|
| Sitemap URLs use trailing slash | Only 2 of 2,352 (`/` and `/es/`) |
| Canonical in HTML uses trailing slash | 0 of sample pages |
| Final served URL uses trailing slash | Yes for all directory pages |
| Canonical matches final URL | **NO** for 2,349 pages |
| Duplicate URLs in sitemap | 0 exact duplicates |

### Indexability of sitemap URLs

* All 2,349 non-root URLs are **discoverable** but **redirect before serving content**.
* A sitemap with near-universal 301s is treated by Google as a low-quality sitemap and may be ignored.

---

## Phase 4 — Internal Linking

### Graph summary (from `ref/internal-link-graph.json` and `ref/audit-data.json`)

| Metric | Value |
|--------|-------|
| Total internal `relatedResources` edges | 14,264 |
| Pages with 0 incoming related links | 813 (34.6%) |
| Pages with ≤2 incoming related links | 1,420 (60.4%) |
| Pages with ≥10 incoming related links | 328 (14.0%) |
| Pages deeper than 4 clicks from home | **0** |
| Broken internal links | **177** |
| Internal links pointing to redirecting URLs | **14,264 (100%)** |
| Internal links pointing to non-canonical final URLs | **14,264 (100%)** |

### Strongest and weakest hubs

**Strongest hubs (incoming related links):**

* `/topics/qa-fundamentals` — 260
* `/documentation/how-to-write-effective-test-scenarios` — 329
* `/documentation/api-testing-guide` — 209
* `/documentation/test-automation-guide` — 209
* `/checklists/api-testing-checklist` — 178

**Weakest hubs (0 incoming related links, sample):**

* `/test-cases/websocket-api-test-cases`
* `/prompts/generate-exploratory-testing-charter-prompt`
* `/templates/workshop-retrospective-template-qa-teams`
* `/checklists/web-form-validation-testing-checklist`
* `/documentation/webrtc-application-testing-guide`

### Broken link sample

| Source | Broken target |
|--------|---------------|
| `/checklists/bluetooth-ble-testing-checklist` | `/documentation/streaming-video-playback-testing` |
| `/checklists/mobile-app-launch-checklist` | `/documentation/appium-vs-espresso-vs-xcuitest` |
| `/documentation/agile-testing-interview-questions` | `/documentation/bugzilla-vs-jira-vs-linear` |
| `/documentation/api-testing-tools-comparison` | `/documentation/postman-vs-insomnia-vs-bruno` |

---

## Phase 5 — Hreflang Validation

### Validation method

Parsed `https://qapractices.com/sitemap.xml` and checked every `<url>` block for `en`, `es`, and `x-default` `<xhtml:link rel="alternate">` entries. Verified bidirectional references and trailing-slash consistency.

### Results

| Check | Result |
|-------|--------|
| Total URLs | 2,352 |
| URLs missing `en` or `es` alternate | **0** |
| URLs missing bidirectional reference | **0** |
| `x-default` pointing to redirecting non-slash URL | **2,350** |
| `en` alternate URLs missing trailing slash | **2,350** (non-root) |
| `es` alternate URLs missing trailing slash | **2,350** (non-root) |
| Total alternate URLs that redirect | **4,700** (en + es) |

### Hreflang sample

```xml
<url>
  <loc>https://qapractices.com/about</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://qapractices.com/about"/>
  <xhtml:link rel="alternate" hreflang="es" href="https://qapractices.com/es/about"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://qapractices.com/about"/>
</url>
```

All three alternates are **missing the trailing slash** and therefore return `301`.

---

## Phase 6 — Rendering Inspection

### SPA vs SSR vs SSG

| Architecture | Present? | Evidence |
|--------------|----------|----------|
| Single Page Application (SPA) | **YES** | `<app-root></app-root>` + `main-*.js` bootstraps Angular router |
| Server-Side Rendering (SSR) | **NO** | No pre-rendered body content; no server-rendered HTML |
| Static Site Generation (SSG) | **PARTIAL** | Only `<head>` meta and `index.html` shell are static; body is not pre-rendered |

### Hydration behavior

1. Browser/Googlebot receives `index.html` with `<app-root></app-root>`.
2. Downloads `main-*.js` and `styles-*.css`.
3. Angular bootstraps, loads `assets/content/index-{en,es}.json` (~246 KB).
4. Router resolves the route, `ResourceDetailComponent` or `TopicDetailComponent` renders.
5. `SeoService` injects canonical, meta description, keywords, hreflang, JSON-LD, FAQPage, BreadcrumbList.

### Could Googlebot miss content?

**Yes, for several reasons:**

* **Timeout:** a 5+ second render on a slow mobile connection may exceed Google's render budget.
* **Script failure:** if `main-*.js` or `index-en.json` fails to load, the page is blank.
* **Crawl budget:** 2,300+ pages × 500 KB × 5 s is an expensive corpus to render.
* **Blocking:** CSS is loaded with `media="print" onload` trick; non-blocking, but JS is fully blocking for content.

---

## Phase 7 — Content Visibility Before JavaScript

| Element | Visible before JS? | Evidence |
|---------|--------------------|----------|
| Main content (body text, headings, lists, tables) | **NO** | Raw HTML body is `<app-root></app-root>`; visible words = title only |
| Navigation | **NO** | No `<a>` tags in raw HTML body |
| Internal links | **NO** | Only `<link rel="alternate">` and canonical in `<head>`; no `<a>` |
| Schema.org JSON-LD | **PARTIAL** | Only `Organization` and `WebPage`; no `TechArticle`, `BreadcrumbList`, `FAQPage`, `Person` |
| Canonical | **YES** but wrong | Canonical tag is present but omits trailing slash |
| Title | **YES** | Present in `<title>` |
| Meta description | **YES** | Present in `<meta name="description">` |
| Meta robots | **YES** | `index, follow` |
| Open Graph / Twitter | **YES** | `og:title`, `og:description`, `og:url`, `twitter:*` present in `<head>` |

### DOM comparison table for `/checklists/ab-testing-qa-checklist`

| Property | Before JS (raw HTML) | After JS (rendered) |
|----------|----------------------|---------------------|
| HTTP status | 301 → 200 | 301 → 200 |
| HTML length | 8,347 bytes | 74,642 bytes |
| Visible words | 11 | 1,764 |
| H1 | 0 | 2 |
| H2 | 0 | 10 |
| Internal `<a>` links | 0 | 36 |
| Tables | 0 | several |
| JSON-LD objects | 2 (Organization, WebPage) | 5+ (Person, WebPage, TechArticle, BreadcrumbList, CollectionPage/ItemList on topics) |
| Body content | `<app-root></app-root>` only | Full article with sections, checklists, related resources |

---

## Phase 8 — Google Confidence Score

Score each factor from 0 to 100, where 100 is "Google can fully trust and render this efficiently."

| Factor | Score | Justification |
|--------|-------|---------------|
| Technical Quality | 20 | 2,349/2,352 URLs redirect; canonical mismatch; slow HEAD responses (3.7 s avg). |
| Rendering | 15 | Content only after JS; 5 s render; 500 KB payload per page; no static fallback. |
| Indexability | 10 | Sitemap is a redirect list; no static body; canonical/hreflang point to 301 URLs. |
| Authority | 5 | Zero indexed pages, zero external mentions, one-month domain, single author. |
| Content | 20 | 922 entries with "For related guidance, see"; 100% same four-section structure; no images. |
| Internal Linking | 25 | 34.6% semantic orphans; 100% links redirect; 177 broken links. |
| Architecture | 40 | Logical taxonomy, shallow depth, bilingual parity; execution fails at static delivery. |
| EEAT | 20 | Author page exists, but Person schema and editorial policy are JS-only or 404. |
| **Overall Google Confidence** | **15** | High crawl/render cost + low trust + templated content = very low probability of ranking. |

## Phase 9 — Root Cause

### The question: "Why would Google decide NOT to rank this website?"

Google would decide not to rank `qapractices.com` because the site is **expensive to crawl, expensive to render, and low-trust when rendered**.

1. **Crawl cost is too high**
   * 2,349 of 2,352 sitemap URLs return a `301` redirect.
   * Average `HEAD` response time is **3.7 seconds**.
   * Every internal `relatedResources` link (14,264) points to a redirect.
   * Every `hreflang` alternate (4,700) points to a redirect.
   * Canonical and Open Graph URLs point to the redirecting non-slash version.

2. **Render cost is too high**
   * The initial HTML body is `<app-root></app-root>` only. No content, no navigation, no internal links.
   * Googlebot must download and execute `main-*.js` (~247 KB gzipped) and `index-{en,es}.json` (~246 KB gzipped) to render any content.
   * Observed render time is **4.3–5.8 seconds** per page.
   * Structured data (`TechArticle`, `BreadcrumbList`, `Person`, `FAQPage`) is only available after JS execution.

3. **Content trust is too low**
   * 922 of 2,350 entries contain the exact phrase "For related guidance, see".
   * 795 English title pairs share ≥70% word overlap.
   * 147 meta descriptions are identical except for the title prefix.
   * 100% of checklists, documentation, prompts, templates, and test-cases share the same four sections (`Overview`, `When to Use`, `Best Practices`, `Common Mistakes`).
   * 99.97% of pages have zero images or screenshots.
   * A single author is credited with 2,350 bilingual resources in ~1 month.
   * The domain is ~1 month old and has zero external backlinks or brand mentions.

4. **Authority signals are absent**
   * `site:qapractices.com` returns **0 indexed results**.
   * `"qapractices.com" -site:qapractices.com` returns **0 external mentions**.
   * No Knowledge Panel, no `sameAs` beyond GitHub/LinkedIn, no citations.

**Conclusion:** Googlebot can discover the site, but the combination of redirect chains, JS-only content, heavy payload, templated content, and zero authority means Google has no incentive to keep these pages in the index. The economically rational decision is to crawl and discard.

---

## Output — Priority and Severity Tables

### Severity table

| Issue | Severity | Evidence |
|-------|----------|----------|
| Sitemap URLs redirect (2,349 / 2,352) | **Critical** | `ref/sitemap-validation.json` |
| Content not in static HTML | **Critical** | `ref/googlebot-render-results.json` |
| Canonical/hreflang use redirecting URLs | **Critical** | `ref/hreflang-validation.json`, sample HTML traces |
| All internal `relatedResources` links redirect | **High** | `ref/internal-link-graph.json` |
| 813 pages with zero incoming related links | **High** | `ref/internal-link-graph.json` |
| 177 broken internal links | **Medium** | `ref/audit-data.json` |
| Heavy JS payload (247 KB main + 246 KB JSON) | **High** | Playwright network logs |
| Render time 4.3–5.8 s | **Medium** | `ref/googlebot-render-results.json` |
| Template/AI content patterns at scale | **Critical** | `ref/audit-data.json`, `ref/body-phrase-counts.js` |
| Zero authority / backlinks | **Critical** | `site:` and `"qapractices.com"` SERP probes |

### Priority table

| Priority | Action | Target | Estimated Impact |
|----------|--------|--------|------------------|
| **P0** | Generate all URLs, canonicals, hreflangs, and sitemap `<loc>` with trailing slash | Build scripts | Fixes 2,349 redirect chains immediately |
| **P0** | Pre-render content to static HTML or enable Angular SSR/SSG | Build pipeline | Makes content visible without JS |
| **P0** | Move `TechArticle`, `BreadcrumbList`, `FAQPage`, `Person` JSON-LD into static HTML | `scripts/postbuild.js` or SSR | Schema visible before JS |
| **P1** | Fix 177 broken internal links | Content frontmatter | Reduces 404 crawl waste |
| **P1** | Add semantic inbound links to 813 orphan pages | Topic/hub pages | Distributes topical authority |
| **P1** | Reduce `main-*.js` bundle and cache hashed assets with long TTL | `angular.json`, hosting | Faster, cheaper render |
| **P1** | Humanize top 200 pages and remove repeated template phrases | Content editing | Reduces AI footprint |
| **P2** | Add `/editorial-policy` route, author bylines, citations | Routes + content | Improves EEAT |
| **P2** | Add images, screenshots, downloadable templates | Content + assets | Increases practical value |
| **P3** | Build authority through backlinks and original research | Off-site SEO | Long-term ranking potential |

### 30-day action plan

| Week | Focus |
|------|-------|
| 1 | Fix trailing slashes everywhere (sitemap, canonical, hreflang, `relatedResources`), enable pre-rendering, regenerate sitemap. |
| 2 | Move structured data to static HTML, fix stale `public/sitemap.xml`, verify `curl -I` returns 200 for all sitemap URLs. |
| 3 | Fix 177 broken links, reduce main JS bundle, implement long cache headers for hashed assets. |
| 4 | Begin humanizing the top 100 pages; remove the top 10 repeated phrases; add `/editorial-policy` route. |

### 90-day action plan

* Complete humanization and consolidation of near-duplicate title/URL pairs.
* Add author bylines and Person schema to every static page.
* Add citations and outbound links to official docs/standards.
* Add annotated screenshots to top 50 guides/checklists.
* Build one interactive tool or downloadable bundle to differentiate from competitors.
* Launch authority-building campaign (guest posts, community shares, original research).

---

## Appendices

### A. Evidence files generated

| File | Description |
|------|-------------|
| `ref/GOOGLEBOT_FORENSIC_REPORT.md` | This report |
| `ref/googlebot-render-test.js` | Playwright + no-JS fetch script |
| `ref/googlebot-render-results.json` | 12 URL no-JS vs rendered metrics |
| `ref/googlebot-traces/*.html` | Raw and rendered HTML snapshots |
| `ref/googlebot-screenshots/*.png` | Full-page rendered screenshots |
| `ref/sitemap-validate.js` | Sitemap HEAD validation script |
| `ref/sitemap-validation.json` | All 2,352 URL status/redirect/timing data |
| `ref/hreflang-validate.js` | Hreflang validation script |
| `ref/hreflang-validation.json` | Hreflang alternate and x-default analysis |
| `ref/internal-link-graph.js` | Internal link graph builder |
| `ref/internal-link-graph.json` | Incoming/outgoing link statistics |
| `ref/audit-data.json` | Corpus metadata, broken links, template phrases |

### B. Sample HTTP trace (no-JS `HEAD` on a detail page)

```text
$ curl -I -L -A "Googlebot/2.1" https://qapractices.com/checklists/ab-testing-qa-checklist

HTTP/1.1 301 Moved Permanently
Location: /checklists/ab-testing-qa-checklist/

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 8349
```

### C. SERP evidence

* `site:qapractices.com` → **0 results**
* `"qapractices.com" -site:qapractices.com` → **0 results**
