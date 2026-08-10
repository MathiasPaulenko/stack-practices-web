# Google Recovery Forensic SEO Audit — QAPractices

**Resumen ejecutivo (Español)**

`qapractices.com` no está siendo recompensado por Google porque, a pesar de tener más de 2.300 URLs ricas en palabras clave, el contenido real no llega en el HTML estático: Angular está configurado con `prerender: false` y el script `postbuild` solo inyecta meta etiquetas. Googlebot debe ejecutar 833 KB de JavaScript para cada página. Eso, sumado a un contenido masivo con patrones repetitivos (frases tipo "For related guidance, see" en 922 entradas, "realm" en 428, "comprehensive" en 168), a un dominio nuevo sin backlinks, a una única firma de autor para 2.350 páginas en un mes y a fechas `lastmod` todas idénticas, produce el patrón clásico de "crawlé todo, rankeé nada". El diagnóstico raíz más probable es una combinación de renderizado JavaScript obligatorio + señales de contenido automatizado de baja confianza + ausencia total de autoridad.

**Scope:** forensic audit of `qapractices.com` to explain why Google crawls but does not reward the site, with a prioritized recovery plan.  
**Date:** 2026-07-23  
**Data sources:** local repo (`D:\Codigo\qa-practices-web`), live site `https://qapractices.com`, Google SERP probes, Playwright render tests, custom audit scripts in `ref/`.  

---

## Executive verdict

`qapractices.com` is in a **"crawl-everything, rank-nothing"** state.

Googlebot appears to be visiting the site (thousands of crawl events reported), yet:

* `site:qapractices.com` returns **zero indexed results**.
* Branded queries for `qapractices.com` do **not** surface the domain in the top results.
* The static HTML served for every URL contains only `<app-root></app-root>` plus meta tags; the 833 KB `main-*.js` bundle is required to render the article body.

The three highest-impact root causes are, in order:

1. **Render-dependent content delivery** (`angular.json` has `prerender: false`; `postbuild.js` only injects `<head>` meta). Google must render every page, which is expensive for 2.3k URLs and makes structured data (`TechArticle`, `BreadcrumbList`, `FAQPage`, `Person`) invisible until JS runs.
2. **Templated, AI-signalled content at scale.** A single author produced 2,350 bilingual resources in ~1 month. 39% of entries contain the exact phrase "For related guidance, see"; 428 contain "realm"; 168 contain "comprehensive"; 147 English descriptions share the same "X: validate key areas, prevent common issues, and release with confidence" template. This is a strong negative E-E-A-T and Helpful Content signal.
3. **New-domain authority deficit** with zero external backlinks/mentions, identical `lastmod` dates (99% `2026-07-22`), and no social/community signals.

Until the site serves real content in static HTML, reduces template duplication, and builds real authority, more content will not fix the problem.

---

## 1. Site snapshot & methodology

| Metric | Value |
|--------|-------|
| Total Markdown files | **2,350** (EN 1,175 / ES 1,175) |
| Live sitemap URLs | **2,352** |
| `routes.txt` entries | **2,384** |
| Resource types | checklists 356, documentation 876, prompts 382, templates 314, test-cases 330, topics 92 |
| Avg word count | **2,298** words |
| Pages > 1,000 words | **2,209 / 2,350** (94%) |
| Duplicate titles | **0** |
| Duplicate descriptions | **0** |
| Duplicate meta descriptions | **0** |
| Missing translations | **0** |
| Broken internal links | **177** |
| `noIndex` content files | **32** (16 EN + 16 ES) |
| Pages with zero incoming `relatedResources` | **266** |
| All `lastUpdated` values | 99% `2026-07-22` |

**Methodology:**

1. Parsed `src/assets/content/**/*.{md,es.md}`, `public/assets/content/index-{en,es}.json`, `routes.txt`, `public/sitemap.xml` (repo), and live `https://qapractices.com/sitemap.xml`.
2. Ran custom scripts: `ref/audit-data.json` generator, `ref/similar-urls.js`, `ref/description-patterns.js`, `ref/body-phrase-counts.js`, `ref/template-phrase-entries.js`, `ref/live-sitemap-check.js`.
3. Verified live rendering with Playwright (`devin/mcp-playwright`) on `/checklists/ab-testing-qa-checklist`.
4. Probed Google index with `site:qapractices.com` and `"qapractices.com" -site:qapractices.com`.
5. Inspected `angular.json`, `scripts/postbuild.js`, `scripts/generate-sitemap.js`, `scripts/generate-routes.js`, `src/app/core/services/seo.service.ts`.

---

## 2. Architecture map & taxonomy

```
/                          Home (listing + topics)
├── /{resource-type}       Listing pages: test-cases, checklists, templates, prompts, documentation
│   └── /{resource-type}/{slug}  Detail pages
├── /topics                Topics directory
│   └── /topics/{slug}     Topic detail pages
├── /about, /authors, /contact, /privacy, /terms, /cookies,
│   /disclaimer, /affiliate-disclosure, /all-resources
└── /es/...                Spanish mirror of every route
```

* **Static-first Angular SSG** on GitHub Pages.
* **Markdown-driven:** each `.md` + `.es.md` pair becomes two routes.
* **Bilingual:** perfect parity between EN and ES, `hreflang` links present.
* **Listing pages** aggregate resources by type; **topic pages** aggregate cross-type resources.
* **No backend, no DB, no user accounts** (per `AGENTS.md`).

**Observations:**

* The taxonomy is logical and covers the QA domain well.
* Route depth is mostly `/type/slug`, which is crawl-friendly.
* However, **42 topic/detail pages are missing from the related-resources graph** and 266 pages have zero `relatedResources` incoming links, which limits topic clustering.

---

## 3. Sitemap audit

| Check | Result |
|-------|--------|
| XML valid | Yes |
| `robots.txt` references sitemap | Yes |
| URLs with self-canonical | Yes |
| `hreflang` annotations | Present (`en`, `es`, `x-default` → EN) |
| `noIndex` pages excluded | Yes (32 noIndex content files excluded) |
| `lastmod` uniformity | **100% `2026-07-22` on live sitemap** |
| Repo `public/sitemap.xml` | **Stale** (2,350 URLs, missing `/checklists/smoke-testing-checklist` EN/ES) |
| Live sitemap | 2,352 URLs, includes smoke checklist |

**Problem:** `lastmod` is uniform across every URL because `generate-sitemap.js` reads `lastUpdated` from frontmatter, and 99% of frontmatter uses `2026-07-22`. A one-month-old site with all 2,350 pages "updated" on the same day is a strong artificial-publication signal.

**Problem:** `priority` and `changefreq` are template-driven (`0.8` weekly for most resources) and ignored by Google, but the uniform `lastmod` is not.

---

## 4. Internal linking graph analysis

| Metric | Value |
|--------|-------|
| Total incoming `relatedResources` links | 14,264 |
| Avg incoming related links per page | 6 |
| Pages with zero incoming related links | 266 |
| Broken internal links | **177** |
| Common broken targets | `/documentation/appium-vs-espresso-vs-xcuitest`, `/documentation/streaming-video-playback-testing`, `/documentation/bugzilla-vs-jira-vs-linear`, `/documentation/postman-vs-insomnia-vs-bruno` |

**Observations:**

* Listing pages (`/checklists`, `/documentation`, etc.) link to every item, so true orphan risk is low.
* The `relatedResources` frontmatter is the only semantic cluster signal. With 266 pages receiving none, topic clusters are weak.
* 177 broken links waste crawl budget and signal poor maintenance.

---

## 5. Content quality sample analysis

### Length metrics

| Length bucket | Count |
|---------------|-------|
| < 100 words | 0 |
| 100–300 | 2 |
| 300–600 | 20 |
| 600–1,000 | 119 |
| > 1,000 | **2,209** |

The site is not thin by word count. It is **thick but templated**.

### AI / template signals

| Signal | Count | Share of entries |
|--------|-------|------------------|
| "For related guidance, see" | 922 | 39% |
| "does not exist in isolation" | 106 | 4.5% |
| "realm" | 428 | 18% |
| "comprehensive" | 168 | 7% |
| "This guide covers" | 148 | - |
| "This checklist covers" | 63 | - |
| "vital" (body occurrences) | 943 | - |

### Title & description templating

| Pattern | English entries with pattern |
|---------|-------------------------------|
| Title ends with "for QA Teams" | **255** |
| Title contains "Guide" | **235** |
| Title contains "Practical" | **174** |
| Title contains "Complete" | **112** |
| Title contains "Step-by-Step" | **52** |
| Meta description matches `"X: validate key areas..."` | **147** |

**Implication:** The content roadmap (`ref/content-roadmap.md`) explicitly forbids AI-isms like "delve into", "navigate the landscape", "in the realm of", "crucial", "vital", "comprehensive guide to". The existing corpus violates these rules at scale. A single author producing 2,350 bilingual pages in ~30 days is implausible for human-written content and further weakens trust.

---

## 6. Topical authority & cluster gaps

| Topic coverage | Count |
|----------------|-------|
| Topic pages | 92 (46 EN + 46 ES) |
| Documentation resources | 876 |
| Checklists | 356 |
| Test cases | 330 |
| Templates | 314 |
| Prompts | 382 |

**Observations:**

* **Breadth vs. depth mismatch:** the site covers almost every QA subtopic imaginable (API, mobile, AI, security, compliance, game, IoT, LLM, blockchain, etc.) within one month. This breadth is **unearned** for a new domain and looks like a topical map rather than demonstrated expertise.
* **Keyword cannibalization:** `ref/similar-urls.js` found **556 English URL pairs** with Jaccard similarity ≥ 0.6, including:
  * `/checklists/api-security-testing-checklist` ↔ `/checklists/api-security-testing-checklist-owasp` (0.8)
  * `/checklists/api-testing-checklist` ↔ `/checklists/graphql-api-testing-checklist` (0.75)
  * `/checklists/canary-release-testing-checklist` ↔ `/checklists/release-testing-checklist` (0.75)
  * `/checklists/performance-testing-checklist` ↔ `/checklists/cdn-performance-testing-checklist` (0.75)
* **Recommendation:** consolidate or strongly differentiate near-duplicate pages; build clear pillar/cluster relationships from a smaller set of core topics first.

---

## 7. E-E-A-T signals audit

### Positive signals

* `/authors` page exists with a real person, bio, photo, job title, skills, and external links (LinkedIn, GitHub, portfolio).
* `/about`, `/privacy`, `/terms`, `/cookies`, `/contact`, `/affiliate-disclosure` exist.
* `ads.txt` is configured.
* Author name is consistent on most pages (`Mathias Paulenko` on 2,323; `Mathias Paulenko Echeverz` on 27).
* Editorial policy component exists in source (`src/app/features/editorial-policy/`) but **is not routed**.

### Negative signals

* **Single-author implausibility:** one person credited for 2,350 bilingual resources in a month.
* **Person schema not in static HTML:** the static `<head>` references `https://qapractices.com/authors#person`, but the `Person` JSON-LD and `itemscope` markup are only rendered by JS. Google resolving the `@id` is unreliable without the entity in the same payload.
* **No external citations:** articles rarely reference official docs, standards, research, or recognized QA bodies.
* **Zero backlinks/brand mentions** (see Section 11).
* **Editorial policy component exists but unreachable** at `https://qapractices.com/editorial-policy` (404).

---

## 8. Technical SEO audit

### Angular / build configuration

| Setting | Value | Impact |
|---------|-------|--------|
| `angular.json` `prerender` | **false** | Critical: no static HTML for any route |
| `scripts/postbuild.js` | Injects `<head>` meta, canonical, hreflang, `WebPage` schema only | Critical: body is still `<app-root></app-root>` |
| `main-*.js` size | **833 KB** | Heavy render cost per page |
| `styles-*.css` size | 35 KB | OK |
| Cache-Control for hashed JS | `max-age=600` | Too short for immutable hashed assets |

### Live page verification

`/checklists/ab-testing-qa-checklist`:

| Metric | Value |
|--------|-------|
| Raw HTML body | `<app-root></app-root>` only |
| Rendered body text length | 12,409 characters |
| Rendered `<h1>` present | Yes |
| Links found after render | 38 |
| TTFB | ~1.93 s |
| `domContentLoaded` | ~3.43 s |
| `load` complete | ~3.84 s |

### Structured data

* **Static HTML contains:** `Organization` + `WebPage`.
* **JS injects (after render):** `TechArticle`, `BreadcrumbList`, `FAQPage`, `Person`.
* Since static HTML lacks `TechArticle`/`BreadcrumbList`, rich snippets and entity understanding depend entirely on Google rendering the Angular app. This is unreliable at 2.3k pages.

### Canonical / hreflang

* Self-referencing canonicals are correct for EN and ES.
* `x-default` always points to English. For a language-specific audience this is acceptable but not ideal.

### robots / indexability

* `robots.txt` allows all major crawlers.
* `noIndex` is respected in sitemap generation.
* 32 content files with `noIndex: true` are still reachable if linked; they should be reviewed.

---

## 9. Indexability diagnosis

### Evidence

* `site:qapractices.com` → **0 results**.
* `"qapractices.com" -site:qapractices.com` → **0 external mentions**.
* The site is ~1 month old and has >2,300 URLs.
* Google has crawled the site thousands of times (per user report) but impressions/clicks are near zero.

### Diagnosis

The combination of **JavaScript-required content** + **mass templated content** + **zero authority** creates the "crawled, not indexed" outcome. Googlebot can render a sample page, but for 2,300 pages the render cost is high. When Google does render, it sees:

* a single author,
* repetitive phrasing,
* identical `lastmod` dates,
* no external trust signals.

It is therefore economical for Google to **discover but drop** the pages rather than index them.

---

## 10. Duplication analysis

* **Exact duplication:** titles, descriptions, and meta descriptions are all unique (0 duplicates detected).
* **Semantic / near-duplicate patterns:**
  * 147 English descriptions use `"<Title>: validate key areas, prevent common issues, and release with confidence."`
  * 255 titles end with `"for QA Teams"`.
  * 556 URL pairs have ≥60% token overlap.
* **Translation duplication:** EN/ES pairs are valid bilingual content, not duplicates, but Spanish descriptions occasionally repeat the content type word (e.g. `"Consulta esta checklist de Checklist QA de A/B Testing"`).

The duplication problem is **not duplicate pages; it is duplicate *patterns* applied to 2,300 pages.** Google detects this as low-variation, programmatic content.

---

## 11. Google perception assessment

| Signal | Status |
|--------|--------|
| Indexed pages (`site:`) | 0 |
| Branded SERP presence | None |
| External backlinks/mentions | 0 detected |
| Knowledge Panel | None |
| `qapractices.com` search results | Competing `qaprep.com`, `qpractice.com`, `practiceQ.com` appear; the target domain does not. |

Google does not yet perceive `qapractices.com` as an entity. Without backlinks, social proof, or citations, the site has no off-page authority to support the volume of on-page content.

---

## 12. Competitor gap analysis

Searched competitors: BrowserStack, LambdaTest, Microsoft Learn, Atlassian, general QA tooling sites.

| Competitor strength | QAPractices gap |
|---------------------|-----------------|
| Product-led interactive tools (live device cloud, test runners) | No interactive tooling; static markdown only. |
| Certifications & training paths | No certification program or skill progression. |
| Video walkthroughs / YouTube | No video content linked or embedded. |
| Community / forums / comments | No community signals. |
| Downloadable PDFs / templates bundles | Markdown-only; no ready-to-download bundles. |
| Original research, benchmarks, data studies | No original data. |
| Strong backlink profiles from docs, blogs, universities | Zero backlinks. |

**Strategic implication:** QAPractices competes as a pure content library against sites that combine content with tools, community, and brand authority. It must either **narrow focus to underserved long-tail topics** or **add unique utility** that competitors cannot easily copy.

---

## 13. Root cause probability scoring

| Root cause | Probability (1–10) | Confidence | Notes |
|------------|-------------------:|------------|-------|
| Static HTML lacks rendered content (`prerender: false`) | **9** | High | Directly observed; main JS 833 KB. |
| Templated/AI-signalled content at scale | **9** | High | Phrase counts and title patterns. |
| New domain + zero backlinks/authority | **8** | High | No `site:` results, no mentions. |
| Implausible single-author velocity | **7** | Medium | 2,350 bilingual pages in ~1 month. |
| Mass identical `lastmod` dates | **6** | Medium | 99% `2026-07-22`. |
| Broken internal links / crawl waste | **4** | Medium | 177 broken links. |
| `x-default` hreflang points to English | **3** | Low | Minor international targeting issue. |

**Combined verdict:** the site is caught in a **technical + quality + authority** triple trap. Fixing only SEO meta tags will not work; the primary lever is making content crawlable as static HTML, followed by humanizing the corpus and building authority.

---

## 14. Prioritized recovery action plan

### P0 — Make content statically crawlable (Weeks 1–2)

1. **Enable Angular prerendering / SSR.**
   * In `angular.json`, set `prerender` to `true` (and configure `ssr` if needed) so `ng build` emits fully rendered `index.html` files per route.
   * Verify with `curl` or `Invoke-WebRequest` that `/checklists/ab-testing-qa-checklist/index.html` contains the article body, not `<app-root></app-root>`.
   * If Angular SSG cannot fully prerender dynamic markdown content, switch the build pipeline to render each markdown file to HTML at build time (e.g., Node + `marked`) and place the HTML in `dist/{route}/index.html`.
2. **Move rich structured data to static HTML.**
   * Each resource page should include, in the raw HTML:
     * `TechArticle` with `author` → `/authors#person`
     * `BreadcrumbList`
     * `Person` (author entity)
     * `FAQPage` when FAQs exist
   * Update `scripts/postbuild.js` to emit these blocks, not just `WebPage`.
3. **Fix the stale `public/sitemap.xml`.**
   * The repo file has 2,350 URLs and is missing `/checklists/smoke-testing-checklist` (EN/ES). Regenerate and commit.
4. **Reduce main bundle size.**
   * Investigate why `main-WVWP3FKM.js` is 833 KB. Split with lazy routes, tree-shake unused components, and ensure hashed assets are served with long cache headers (GitHub Pages `max-age=600` is too low; add a Cloudflare cache rule or move to a host that supports `immutable`/`long` cache).

### P1 — Content humanization & consolidation (Weeks 2–4)

1. **Remove or rewrite repetitive phrases.**
   * Replace `"For related guidance, see"` (922 entries) with context-specific CTAs.
   * Remove `"does not exist in isolation"` (106), reduce `"vital"` (943 occurrences), `"realm"` (428 entries), and `"comprehensive"` (168 entries) per `ref/content-roadmap.md` rules.
   * Rewrite the 147 English meta descriptions that use the `"validate key areas..."` template.
2. **Reduce title formula repetition.**
   * Vary the 255 titles ending with `"for QA Teams"`, 235 containing `"Guide"`, and 112 containing `"Complete"`.
3. **Fix or merge near-duplicate pages.**
   * Review the 556 similar URL pairs from `ref/similar-urls.js`. Merge thinly differentiated pairs or rewrite one to target a distinct angle.
4. **Fix 177 broken internal links.**
   * Many target docs that may exist under different slugs (e.g., `/documentation/appium-vs-espresso-vs-xcuitest` may be `/documentation/appium-vs-espresso-vs-xcuitest-guide`). Update frontmatter `relatedResources` and body links.

### P2 — E-E-A-T & trust (Weeks 3–6)

1. **Add the `/editorial-policy` route** (or remove the unreachable component). Make editorial standards, correction policy, and authorship explicit.
2. **Distribute author bylines.**
   * Ensure every resource page links to `/authors` and includes the `Person` schema in static HTML.
   * If possible, add guest contributors or topic curators to break the single-author velocity signal.
3. **Add citations and external references.**
   * Link to official docs, standards (ISTQB, WCAG, OWASP, ISO), and recognized tools in documentation and topic pages.
4. **Use realistic `lastUpdated` dates.**
   * Update `lastUpdated` only when content actually changes. Avoid mass identical dates.

### P3 — Authority building (Weeks 4–12)

1. **Earn backlinks.**
   * Publish 5–10 original, shareable pieces (e.g., "State of QA Tooling 2026", benchmark studies, free downloadable PDF bundles).
   * Share resources on Reddit (r/QualityAssurance), Hacker News, LinkedIn, QA Slack/Discord communities, and GitHub repos.
   * Pitch guest posts to established QA blogs (Ministry of Testing, TestProject, BrowserStack blog, Applitools).
2. **Create a brand entity.**
   * Add sameAs links for the site itself (Twitter/X, LinkedIn page, GitHub org).
   * Encourage mentions and citations.
3. **Launch a newsletter / YouTube series.**
   * Convert top documentation pages into video walkthroughs and embed them.

### P4 — Differentiation & monetization readiness (Months 3–6)

1. **Add unique utility.**
   * Downloadable PDF/Word bundles for templates.
   * A simple interactive checklist runner (static, client-side only).
   * Test-case generator prompt playground.
2. **Build certification / learning paths** tied to existing content.
3. **Affiliate integration** only after authority is established (per `AGENTS.md` Phase 4 guidance).

---

## 15. Final forensic verdict

`qapractices.com` is a well-structured, bilingual QA resource hub with a clear taxonomy and large word counts, but it is currently **invisible to Google because it asks Googlebot to do too much work for too little trust signal**.

The three decisive problems are:

1. **Content is not in the static HTML.** `angular.json` `prerender: false` and `postbuild.js` only inject `<head>` metadata. Every meaningful element — body text, `TechArticle`, `BreadcrumbList`, `Person`, `FAQPage` — requires JS execution. At 833 KB main bundle and 2,300 pages, Google cannot efficiently index this.
2. **The corpus reads as mass-produced template content.** 922 occurrences of "For related guidance, see", 428 of "realm", identical meta description patterns, and a single author for 2,350 bilingual pages in one month are classic AI-content signals that Google filters out.
3. **There is no authority.** Zero indexed pages, zero external mentions, zero backlinks, and a one-month-old domain cannot support the topical breadth claimed.

**Recovery is possible, but the sequence matters:**

1. Make the content fully static and crawlable first.
2. Humanize and consolidate the content second.
3. Build E-E-A-T and backlinks third.

Do not add more content until the first two are resolved. The current crawl budget is already being spent on pages Google does not keep; increasing volume will not improve rankings, only waste crawl budget.

---

## Appendices

### A. Audit scripts generated in `ref/`

| Script | Purpose |
|--------|---------|
| `ref/audit-data.json` | Aggregated content audit metrics (2,350 entries). |
| `ref/similar-urls.js` | Computes Jaccard-similar URL pairs (found 556 EN pairs). |
| `ref/description-patterns.js` | Detects template meta descriptions. |
| `ref/body-phrase-counts.js` | Counts repetitive body phrases across all Markdown. |
| `ref/template-phrase-entries.js` | Counts entries containing AI/template words. |
| `ref/live-sitemap-check.js` | Verifies live sitemap URL count and specific slugs. |
| `ref/sitemap-missing-check.js` | Compares `routes.txt` to repo/live sitemap. |

### B. Key file references

* `angular.json` — `prerender: false`.
* `scripts/postbuild.js` — meta + WebPage injection only.
* `scripts/generate-sitemap.js` — sitemap builder with `noIndex` filter.
* `src/app/core/services/seo.service.ts` — dynamic structured data injection.
* `ref/content-roadmap.md` — content rules the existing corpus violates.
