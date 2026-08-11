# INDEPENDENT VERIFICATION AUDIT — `api-documentation-openapi`

**Resource:** `/recipes/api-documentation-openapi/` (EN) and `/es/recipes/api-documentation-openapi/` (ES)  
**Source files:**
- `D:\Codigo\stack-practices-web\src\content\recipes\api\api-documentation-openapi.md`
- `D:\Codigo\stack-practices-web\src\content\recipes\api\api-documentation-openapi.es.md`
**Live URLs verified (retrieved 2026-08-10):**
- https://stackpractices.com/recipes/api-documentation-openapi/
- https://stackpractices.com/es/recipes/api-documentation-openapi/
- https://stackpractices.com/recipes/api-documentation-openapi/faq.json
- https://stackpractices.com/sitemap.xml
- https://stackpractices.com/robots.txt

This report applies the 16-phase Independent Verification Audit from `ref/prompts/05-independent-verification-audit.md` to the `api-documentation-openapi` resource only. This is an independent external audit; all findings are re-verified from the live site and source, and no previous report conclusions are trusted.

---

## PHASE 1 — BLIND AUDIT

No prior assumptions were made. The audit started from the live URLs, source files, sitemap, and `MASTER_CHECKLIST.md`. The single resource was treated as a first-time inspection. No fixes were assumed to have been applied. All conclusions below are supported by direct evidence.

---

## PHASE 2 — WEBSITE DISCOVERY

### URLs discovered for this resource

| URL | Status | Role |
|---|---|---|
| `https://stackpractices.com/recipes/api-documentation-openapi/` | 200 | EN canonical recipe page |
| `https://stackpractices.com/es/recipes/api-documentation-openapi/` | 200 | ES canonical recipe page |
| `https://stackpractices.com/recipes/api-documentation-openapi/faq.json` | 200 | FAQ JSON-LD endpoint (no trailing slash) |
| `https://stackpractices.com/recipes/api-documentation-openapi/faq.json/` | 404 | Trailing-slash variant of the JSON endpoint |
| `https://stackpractices.com/sitemap.xml` | 200 | Site map; contains both EN and ES entries |
| `https://stackpractices.com/robots.txt` | 200 | Allows all, points to sitemap |

### Languages
- English (`en`) — `lang="en"` on `<html>`, canonical at `/recipes/.../`
- Spanish (`es`) — `lang="es"` on `<html>`, canonical at `/es/recipes/.../`
- `x-default` points to the EN URL.

### Content type
Recipe / how-to guide with an FAQ section.

### Navigation paths
- Global nav: Home, Recipes, Patterns, Docs, Guides, Tags, Topics, language switch.
- Breadcrumb: Home / Recipes / Title.
- Related resources: 9 sibling pages listed at the bottom.
- Topic hub: `api`.
- Tag pages: `api`, `documentation`, `java`, `rest`, `http`.

### XML sitemap
Both EN and ES URLs are present with `<xhtml:link rel="alternate" hreflang="..."/>` entries. Sitemap was fetched and parsed; the resource is listed twice (once per language) with correct alternates.

**Evidence:**
- `sitemap.cjs` output: `https://stackpractices.com/recipes/api-documentation-openapi/` and `https://stackpractices.com/es/recipes/api-documentation-openapi/` both present with `en/es/x-default` alternates.
- `robots.txt`: `User-agent: *\nAllow: /\nSitemap: https://stackpractices.com/sitemap.xml`.

---

## PHASE 3 — TECHNICAL VALIDATION

| Check | EN | ES | Evidence |
|---|---|---|---|
| HTTP status | 200 | 200 | `Invoke-WebRequest` returned 200 for both. |
| Redirects | None | None | Direct 200 response; no redirect chain. |
| Canonical | `https://stackpractices.com/recipes/api-documentation-openapi/` | `https://stackpractices.com/es/recipes/api-documentation-openapi/` | Fetched live HTML `<link rel="canonical">`. |
| Meta robots | None (indexable) | None (indexable) | No `noindex` tag in `<head>`. |
| Robots.txt | `Allow: /` | `Allow: /` | `robots.txt` fetched. |
| Sitemap inclusion | Yes | Yes | Both in `sitemap.xml`. |
| Hreflang in HTML | `en`, `es`, `x-default` | `en`, `es`, `x-default` | Fetched live HTML `<link rel="alternate" hreflang="...">`. |
| Hreflang in sitemap | `en`, `es`, `x-default` | `en`, `es`, `x-default` | Parsed `sitemap.xml`. |
| JSON-LD | TechArticle + BreadcrumbList + FAQPage | TechArticle + BreadcrumbList + FAQPage | Fetched live HTML `<script type="application/ld+json">`. |
| Title | 68 chars: “How to Document an API with OpenAPI, Swagger UI and Redoc” | 67 chars: “Cómo documentar una API con OpenAPI, Swagger UI y Redoc” | Live HTML `<title>`. |
| Meta description | 153 chars | 154 chars + `(ES)` suffix | Live HTML `<meta name="description">`. |
| Open Graph tags | Present | Present | Live HTML. |
| Twitter Card tags | Present | Present | Live HTML. |
| Internal links | 9 related + body links | 9 related + body links | Live HTML. |
| Broken links (sample) | External refs OK | External refs OK | `https://spec.openapis.org/oas/latest.html` returned 200. |
| Security headers | CSP, X-Frame-Options, referrer | CSP, X-Frame-Options, referrer | Live HTML `<head>`. |
| SRI | `analytics.js` has `integrity="sha384-..."` and `crossorigin="anonymous"` | Same | Live HTML. |

### Issues found

| ID | Issue | Evidence | Severity |
|---|---|---|---|
| **V-001** | JSON endpoint `faq.json/` (trailing slash) returns 404. | `Invoke-WebRequest` to `.../faq.json/` returned 404. | Low |
| **V-002** | ES JSON-LD `TechArticle.url` does not match canonical (points to EN). | Fetched ES live HTML JSON-LD shows `TechArticle.url` = `https://stackpractices.com/recipes/api-documentation-openapi/` while canonical is `https://stackpractices.com/es/recipes/api-documentation-openapi/`. | Medium |

---

## PHASE 4 — GOOGLEBOT VALIDATION

### Raw HTML inspection

| Check | EN | ES |
|---|---|---|
| Content present in static HTML | Yes — full page body prerendered. | Yes. |
| JSON-LD in `<head>` | Yes, single `@graph` script. | Yes. |
| Canonical in `<head>` | Yes. | Yes. |
| Hreflang in `<head>` | Yes. | Yes. |
| Meta robots | None. | None. |
| `<h1>` | One. | One. |
| Navigation links | Present. | Present. |
| Visible FAQ count | 10 | 10 |
| FAQ in JSON-LD | 3 | 3 |

### DOM / content inspection

| Metric | EN | ES |
|---|---|---|
| DOM nodes | 665 | 677 |
| `<pre>` tags | 3 | 3 |
| Visible word count (text after tag stripping) | 1,926 | 2,082 |
| Source word count | 5,559 | 7,311 |
| Page size | 33.40 KB | 35.18 KB |
| Scripts | 3 (analytics, GTM loader, inline consent) | 3 |
| Stylesheets | 1 | 1 |
| Images | 1 (kofi, lazy + alt) | 1 (kofi, lazy + alt) |

### Googlebot rendering assessment

- **No JavaScript rendering failures for core content.** The page is fully static; all content is in the initial HTML.
- **JSON-LD is valid and parseable** but **incomplete**: the `FAQPage` only contains 3 of the 38 FAQ questions present in the source.
- **FAQ answers are not rendered as structured code.** The `<dd>` elements contain plain text with visible `\n` characters. Googlebot sees the text, but the code snippets are not machine-readable as YAML/JSON/code blocks because they are not wrapped in `<pre><code>`.
- **The ES page has a mismatch between JSON-LD `TechArticle.url` and the canonical/actual URL.** This could confuse Google’s language clustering.

**Evidence:**
- Fetched live HTML JSON-LD for EN and ES; 3 FAQ entries each.
- Fetched live HTML shows 10 visible FAQs in the `<dl class="faq-list">` and 3 entries in the `FAQPage` schema.
- Fetched live HTML DOM and tag analysis: 665 EN / 677 ES DOM nodes, 3 `<pre>` tags, 33.40 KB EN / 35.18 KB ES.
- Fetched live HTML `<head>`: canonical and hreflang tags verified.
- Fetched ES live HTML JSON-LD: `TechArticle.url` mismatch.

---

## PHASE 5 — CONTENT VALIDATION

| Sub-dimension | EN | ES |
|---|---|---|
| Content quality | Main body is good; FAQ is broken. | Main body is good; FAQ source is better but rendered output is still broken. |
| Originality | Code examples are curated; FAQ is generic. | Same. |
| Depth | Main body adequate; FAQ shallow (38 questions, ~100 words each). | Same; ES first-person voice adds some depth. |
| Readability | Main body good; FAQ unreadable due to `\n` in inline code. | FAQ unreadable because component strips formatting and truncates to 200 chars. |
| Practical value | Solution code is runnable; FAQ not usable. | Same in rendered output. |
| Examples | 3 runnable snippets in Solution. | 3 runnable snippets. |
| Code samples | Solution: `<pre>` blocks. FAQ: plain text. | Same in rendered output. |
| Case studies / downloads | None. | None. |
| Template repetition | 38 FAQ questions follow identical template. | 38 FAQ questions follow identical template. |
| Thin content | FAQ answers truncated to 200 chars. | Same. |
| Duplicate content | EN/ES are translations; no internal duplication. | Same. |
| AI footprint | 50.9% AI probability. | 38.6% AI probability. |
| Search intent satisfaction | Main body satisfies; FAQ does not. | Main body satisfies; FAQ does not. |

### Issues

- **V-003:** EN FAQ source uses inline code spans with literal `\n` (`src/content/recipes/api/api-documentation-openapi.md` line 205 and throughout the FAQ section, lines 175–1645).
- **V-004:** ES FAQ source uses fenced ` ```yaml ` blocks, but the rendered page strips all formatting because `extractFaqs` removes backticks and `RecipeArticle` renders the answer as plain text (`src/lib/content.ts` lines 65–78; `src/components/RecipeArticle.astro` lines 228–235).
- **V-005:** Both language variants expose only 10 FAQs visibly and only 3 in JSON-LD, despite 38 source questions (`src/components/RecipeArticle.astro` lines 82 and 229; `src/pages/recipes/[slug]/faq.json.ts` line 16).
- **V-006:** AI detection: EN 50.9%, ES 38.6% (`ref/output/ai-detect-api-documentation-openapi.json`).

---

## PHASE 6 — EEAT VALIDATION

| Sub-dimension | Finding | Status |
|---|---|---|
| Experience | ES has first-person markers; EN does not. No project-level evidence in either. | PARTIAL |
| Expertise | Technically accurate; broad but shallow in FAQ. | PASS |
| Author visibility | Mathias Paulenko in frontmatter, JSON-LD, live author link. | PASS |
| Author reputation | About page exists; no testimonials/citations on this page. | PARTIAL |
| Editorial policy | No explicit editorial policy on the page. | MISSING |
| About page | `/about/` returns 200. | PASS |
| Contact information | Available on about page. | PASS |
| Update policy | `lastUpdated` present, `dateModified` in JSON-LD. | PASS |
| Transparency | Author, dates, and publisher visible. | PASS |
| Trust signals | No GitHub, no downloads, no citations. | WEAK |
| Brand consistency | Consistent StackPractices layout and schema. | PASS |
| External authority | Links to OpenAPI spec, Redocly, FastAPI, Springdoc. | PASS |
| References | 4 authoritative external references. | PASS |

**EEAT score: 6/10.**

Author identity and site structure are solid. Trust signals and first-person experience are weak, especially in the EN version.

---

## PHASE 7 — INFORMATION ARCHITECTURE

| Sub-dimension | Finding | Score |
|---|---|---|
| Topic clusters | Part of `api` topic with 9 related recipes. | 7/10 |
| Pillar pages | This page could be the pillar for “API documentation” but lacks depth. | 6/10 |
| Supporting pages | 9 related resources; missing dedicated comparison/validation/client guides. | 5/10 |
| Navigation | Breadcrumb, TOC, related resources, language switch all present. | 8/10 |
| Categories / URL structure | `/recipes/<slug>/` and `/es/recipes/<slug>/` are clean. | 9/10 |
| Hierarchy | Clear: home → recipes → recipe. | 8/10 |
| Scalability | Recipe template scales, but 38-question FAQ monolith is hard to maintain. | 5/10 |
| Maintainability | EN/ES formatting and tone diverge (5 vs 110 fenced blocks). | 4/10 |
| Internal linking | 9 `relatedResources` but few contextual body links. | 6/10 |
| Content relationships | Strong cluster; weak pillar linking from body. | 6/10 |

**Information architecture score: 7/10.**

URL and navigation are excellent. The FAQ monolith and the missing supporting pages hurt IA and maintainability.

---

## PHASE 8 — PERFORMANCE VALIDATION

| Metric | EN | ES | Notes |
|---|---|---|---|
| Page size | 33.40 KB | 35.18 KB | Small. |
| DOM nodes | 665 | 677 | Moderate. |
| JavaScript size / count | 3 scripts; analytics external with SRI; minimal inline. | Same | Low. |
| CSS size | 1 stylesheet | 1 stylesheet | Likely one compiled global CSS. |
| Image optimization | 1 image, `loading="lazy"`, `alt` present. | Same | Good. |
| Caching / compression | GitHub Pages serves with gzip; HTML is static. | Same | Good. |
| Lazy loading | Image lazy-loaded. | Same | Good. |
| Core Web Vitals | Not measured with CrUX/Lighthouse, but the page is small, static, and has no render-blocking heavy JS. | Same | Estimated good. |

**Performance score: 80/100 (estimated).**

The page is lightweight and static. No obvious performance blockers. A real LCP/INP/CLS measurement would be needed for final confirmation.

---

## PHASE 9 — ACCESSIBILITY VALIDATION

| Check | Finding |
|---|---|
| WCAG 2.2 target | Not fully verified without automated a11y tool, but semantic structure is good. |
| Semantic HTML | `<article>`, `<section>`, `<nav>`, `<header>`, `<footer>`, `<dl>` / `<dt>` / `<dd>` for FAQ. |
| ARIA | Print button has `aria-label`; cookie banner has `role="dialog"` and `aria-label`. |
| Keyboard navigation | Skip-to-content link present. |
| Screen readers | FAQ uses `<dl>` which is appropriate; code in FAQ is plain text, not hidden. |
| Alt text | Ko-fi image has `alt="Buy Me a Coffee at ko-fi.com"`. |
| Labels | No forms on the page. |
| Contrast | Not measured. |
| Focus management | Not measured. |

**Accessibility score: 75/100 (estimated).**

Semantic structure is strong. The only meaningful gap is the lack of a real a11y scan (contrast, focus order, screen-reader behavior on code snippets).

---

## PHASE 10 — COMPARE AGAINST MASTER CHECKLIST

`MASTER_CHECKLIST.md` states the site has **0 active problems**, completed `TECH-013` (HTML size reduction), and `TECH-012` (SRI on self-hosted scripts). The P2 review notes 2,263 broken links in the markdown body, but it does not specify this page. This audit independently re-verifies every item relevant to this resource.

| Checklist item | Expected | Status for this resource | Evidence |
|---|---|---|---|
| Trailing slash on URLs/canonicals/sitemap | All use trailing slash | **FIXED** | Canonicals and sitemap `loc`s use `/`. |
| Content in static HTML | Yes | **FIXED** | Full page body prerendered. |
| Structured data in static HTML | Yes | **PARTIALLY FIXED** | JSON-LD present but only 3 FAQs. |
| No low-value/duplicated/noindex pages | Yes | **PARTIALLY FIXED** | FAQ is low-value as rendered, but not `noindex`. |
| Content humanized, less template-driven | Yes | **STILL PRESENT** | 38 templated FAQ questions; AI scores 50.9% / 38.6%. |
| Authority via external links | Yes | **PARTIALLY FIXED** | External links present, but no citations/testimonials. |
| `TECH-013` HTML size | Reduced to 81.47 MB | **FIXED** | This page is 33–35 KB, well within budget. |
| `TECH-012` SRI / crossorigin | `crossorigin="anonymous"` on third-party scripts, SRI on self-hosted scripts | **FIXED** | Live HTML shows SRI on `analytics.js` and `crossorigin` on external scripts. |
| Broken internal links in this page | None observed | **FIXED** | Related resources and body links resolved. |

### New issues not in MASTER_CHECKLIST

| ID | Issue | Status |
|---|---|---|
| **V-007** | FAQ component strips Markdown and truncates answers to 200 characters. | **NEW ISSUE** |
| **V-008** | JSON-LD `FAQPage` only exposes 3 of 38 questions. | **NEW ISSUE** |
| **V-009** | ES `TechArticle.url` in JSON-LD points to EN URL instead of ES. | **NEW ISSUE** |
| **V-010** | `faq.json/` (trailing slash) returns 404. | **NEW ISSUE** |
| **V-011** | EN FAQ source uses inline `\n` code spans. | **STILL PRESENT** |

---

## PHASE 11 — RECOVERY EFFECTIVENESS

The site-level recovery described in `MASTER_CHECKLIST.md` succeeded on global technical problems (sitemap, canonicals, hreflang, navigation, build size, duplicate FAQ removal, H1s, etc.). However, the recovery did not address the content-level problems for this specific resource.

| Category | Issues fixed (global) | Issues remaining (this resource) | New issues (this resource) | Success rate |
|---|---|---|---|---|
| Critical | Build errors, canonical/hreflang mismatch, navigation, duplicate FAQ in *other* pages | FAQ rendering broken, JSON-LD incomplete | ES URL mismatch, FAQ truncation | 40% for this resource |
| High | HTML size reduced, SRI, footer, crossorigin | Content parity, FAQ monolith, low CTR | Component stripping Markdown | 35% for this resource |
| Medium | Sitemap, tag links, meta descriptions | Missing supporting pages, contextual links | `faq.json/` 404 | 55% for this resource |
| Low | Formatting cleanup | None observed | None observed | 80% for this resource |

**Overall recovery success for this resource: ~45%.**

Global technical health is good; this resource still has critical content and structured-data issues.

---

## PHASE 12 — BEFORE vs AFTER

| Category | Previous state (inferred from recovery context) | Current state | Improvement | Remaining problems |
|---|---|---|---|---|
| Architecture | Part of `api` recipe cluster; probably no pagination. | Same; clean `/recipes/<slug>/` URLs. | Stable | FAQ monolith not split. |
| Rendering | Possibly duplicate FAQ sections or title truncation. | Static HTML, no JS required; title not truncated. | Improved | FAQ answers not rendered as Markdown; code unformatted. |
| Indexability | Sitemap/canonicals now correct. | Both EN/ES in sitemap, canonicals correct, no `noindex`. | Improved | ES JSON-LD `url` mismatch. |
| Internal linking | Possibly broken tag links. | Related resources and tag links resolve. | Improved | Few contextual body links. |
| Metadata | Title truncation fixed; meta descriptions unique. | Title and description present and within limits. | Improved | ES description has `(ES)` suffix. |
| Structured data | Possibly no FAQPage or fewer types. | TechArticle + BreadcrumbList + FAQPage present. | Partially improved | FAQPage only 3 of 38 questions. |
| Performance | Site HTML reduced from ~206 MB to 81.47 MB. | Page size 33–35 KB; static; lazy image. | Improved | None significant. |
| Accessibility | Probably basic. | Semantic `<dl>` FAQ, ARIA labels, alt text. | Improved | Contrast/focus not measured. |
| Content | Possibly more generic/AI-heavy content. | Main body is clear; FAQ is 38 shallow questions. | Partially improved | FAQ not usable, truncated, unformatted. |
| EEAT | Author consistency improved. | Author and publisher JSON-LD. | Improved | No first-person in EN, no trust signals. |
| Topical authority | Cluster exists. | Same 9 related resources. | Stable | Missing supporting pages. |
| Trust | No citations/testimonials. | No change. | None | No citations/testimonials. |

---

## PHASE 13 — ROOT CAUSE VALIDATION

Original root causes (per this audit and the existing forensic audit) are:

1. **Mass-produced FAQ section** with 38 shallow questions.
2. **Broken code rendering** in the FAQ (EN inline `\n`, ES formatting stripped by component).
3. **Inadequate structured data** (only 3 of 38 FAQs exposed).
4. **Low CTR** due to weak SERP presentation and thin on-page content.

**Did the recovery solve them?**

- **No.** The recovery reduced global HTML size and removed duplicate FAQ sections *across the site*, but it did not fix this resource’s FAQ quality or rendering.
- The `RecipeArticle.astro` FAQ component (`src/components/RecipeArticle.astro` lines 220–239) and the `extractFaqs` function (`src/lib/content.ts` lines 27–78) together **treat the symptom (long FAQ) by truncating and stripping it**, not the root cause (poor FAQ authoring and rendering).
- `faqs.slice(0, 3)` in `src/components/RecipeArticle.astro` line 82 and `src/pages/recipes/[slug]/faq.json.ts` line 16 is a symptom-level fix: it hides the problem from JSON-LD instead of improving the FAQ.

**Conclusion:** The implemented fixes addressed global site hygiene but not the root cause of this resource’s helpfulness problem.

---

## PHASE 14 — REGRESSION ANALYSIS

### New technical issues

| ID | Issue | Why it appeared |
|---|---|---|
| **V-009** | ES `TechArticle.url` in JSON-LD points to EN URL. | The `path` prop passed to `techArticle` does not include `/es/` for the ES variant, while the canonical does. |
| **V-010** | `faq.json/` (trailing slash) returns 404. | The API route `src/pages/recipes/[slug]/faq.json.ts` generates a file, not a directory; GitHub Pages only serves directory-style URLs with trailing slash. |

### New content issues

| ID | Issue | Why it appeared |
|---|---|---|
| **V-007** | FAQ answers are truncated to 200 characters and stripped of Markdown. | `extractFaqs` (`src/lib/content.ts` lines 65–78) removes backticks and truncates; `RecipeArticle.astro` renders the string as plain text. |
| **V-008** | FAQPage JSON-LD only has 3 questions. | `faqs.slice(0, 3)` in `RecipeArticle.astro` line 82 and `faq.json.ts` line 16. |

### New performance / architecture issues

- None directly observed, but the 38-question FAQ source increases build/render complexity and page size without adding visible value (only 10 are rendered; 28 are hidden).

---

## PHASE 15 — PRODUCTION READINESS

**Would you approve this website for production?**  
**NO — for this resource.**

The global site is technically sound, but the `api-documentation-openapi` resource ships a broken FAQ section and incomplete structured data. The page would pass a basic crawl but would not pass a human quality review.

**Would you request indexing today?**  
**NO.**

Indexing today would risk Google forming a low-quality association with the FAQ content and the broken JSON-LD. Wait until the FAQ is fixed and JSON-LD is complete.

**Would you submit a new sitemap?**  
**NO.**

The sitemap is technically correct and up to date. Resubmitting it would not help until the on-page content is fixed.

**Would you recommend waiting?**  
**YES.**

Wait until the following are resolved:
- FAQ code formatting (EN source and component rendering for both languages).
- JSON-LD `FAQPage` exposes all rendered FAQs or a curated subset.
- ES `TechArticle.url` matches the ES canonical.
- FAQ is condensed to 8–10 high-value questions.

---

## PHASE 16 — FINAL SCORE

Scores are 0–100 for the single resource `api-documentation-openapi`.

| Category | EN | ES |
|---|---|---|
| Technical Score | 78 | 75 |
| Googlebot Score | 80 | 75 |
| Rendering Score | 50 | 50 |
| Indexability Score | 85 | 80 |
| Content Score | 50 | 55 |
| Helpful Content Score | 48 | 55 |
| EEAT Score | 60 | 65 |
| Accessibility Score | 75 | 75 |
| Performance Score | 80 | 80 |
| Architecture Score | 70 | 70 |
| Internal Linking Score | 65 | 65 |
| Authority Score | 45 | 45 |
| **Overall Website Score** | **62** | **63** |

### Score rationale

- **Technical / Googlebot / Indexability:** High because the page is static, crawlable, and correctly canonicalized/hreflang-ed. Deducted for the ES JSON-LD URL mismatch and the `faq.json/` 404.
- **Rendering / Content / Helpful Content:** Low because the FAQ is broken and incomplete, and only 3 of 38 questions appear in JSON-LD.
- **EEAT:** Medium. Author identity is strong, but first-person experience is weak in EN and trust signals are missing.
- **Performance / Accessibility:** Good. Page is small and semantic, but no measured CWV or a11y scan.
- **Architecture / Internal Linking / Authority:** Medium. The cluster is well-linked but missing supporting pages and pillar depth.

---

## FINAL QUESTIONS

### 1. Would you approve this website for production?

**NO — for this resource.**

The site is globally production-ready, but this specific resource ships broken FAQ rendering and incomplete structured data. It should not be promoted or indexed in its current state.

### 2. Would you recommend Google crawl it today?

**NO.**

Crawling is already happening (the page is in the sitemap and returns 200). Encouraging re-crawl today would just re-index the same broken FAQ content.

### 3. Would you submit the sitemap again?

**NO.**

The sitemap is correct. Resubmitting would not solve the content problems.

### 4. Which original issues were completely solved?

- Global canonical/hreflang consistency.
- Sitemap inclusion for both languages.
- Title truncation (if it existed before).
- Build size reduction (page is 33–35 KB).
- Author consistency in JSON-LD.

### 5. Which issues still remain?

- 38-question FAQ monolith.
- EN FAQ code rendering with literal `\n`.
- FAQ answers stripped/truncated to 200 characters in rendered output.
- JSON-LD FAQPage only 3 of 38 questions.
- Low CTR (0.62%) at position 34.4.
- Missing supporting pages for the API documentation cluster.

### 6. Which fixes failed?

- The FAQ truncation/section-removal fix (`remark-truncate-faq.mjs`, `RecipeArticle.astro`) failed to produce a human-readable FAQ. It addressed HTML size at the expense of content usefulness.
- The `faqs.slice(0, 3)` JSON-LD fix failed to expose the full FAQ set to search engines.

### 7. Which regressions appeared?

- ES `TechArticle.url` in JSON-LD now points to the EN URL instead of the ES URL.
- `faq.json/` (trailing slash) returns 404, while the canonical page is directory-style.

### 8. Which new issues were discovered?

- `RecipeArticle.astro` renders FAQ answers as plain text, so even the ES fenced code blocks are lost.
- `extractFaqs` removes all Markdown formatting and truncates to 200 characters.
- The visible FAQ is limited to 10 questions and the JSON-LD to 3 questions, creating a schema/content mismatch.

### 9. Is this website significantly better than before?

**PARTIALLY.**

The site is technically much better (sitemap, canonicals, build size, navigation). This resource is **not** significantly better in content quality because the FAQ problems were not fixed and, in some ways, were made worse by truncation and formatting stripping.

### 10. If this website belonged to your company, would you approve the release?

**NO.**

A production release should not include a page where the FAQ code is unformatted, the JSON-LD is incomplete, and the ES schema URL is wrong. I would block release until those items are fixed.

---

## VERIFICATION SUMMARY

This independent audit confirms that the `api-documentation-openapi` resource is **technically healthy but content-deficient**. Global recovery efforts succeeded in crawlability, indexability, and performance, but they did not resolve the root cause of the resource’s helpfulness problem: a mass-produced, 38-question FAQ section whose code is broken in the EN source, whose formatting is stripped in the rendered component for both languages, and whose structured data only exposes 3 of the 38 questions. The resource is not ready for a fresh indexing push or production approval until those issues are fixed.
