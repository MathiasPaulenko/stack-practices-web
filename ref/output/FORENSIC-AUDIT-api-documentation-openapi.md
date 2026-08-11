# FORENSIC AUDIT — `api-documentation-openapi`

**Audit type:** Single-resource forensic audit (adapted from Website Forensic Audit v2.0)
**Resource:** `api-documentation-openapi` (recipe)
**URL (EN):** https://stackpractices.com/recipes/api-documentation-openapi/
**URL (ES):** https://stackpractices.com/es/recipes/api-documentation-openapi/
**Files:** `src/content/recipes/api/api-documentation-openapi.md` (EN, 360 lines), `src/content/recipes/api/api-documentation-openapi.es.md` (ES, 1736 lines)
**Author:** Mathias Paulenko
**Audit date:** 2026-08-10
**GSC data (last 28 days):** 485 impressions, 2 clicks, 0.62% CTR, avg position 34.4, +472 impression delta
**AI detection (desklib):** EN 50.9% AI (126 AI / 112 human / 68 skipped), ES 38.6% AI (74 AI / 191 human / 13 skipped)
**Content quality score (CONTENT-360):** 82/100
**SEO score (SEO-360):** 69/100

---

## EXECUTIVE SUMMARY

`api-documentation-openapi` is a high-impression, low-CTR recipe page in striking-distance position (~34). The page has solid technical SEO infrastructure (canonical, hreflang, JSON-LD, sitemap) and a recently fixed title truncation bug. However, three critical issues are holding it back:

1. **FAQ monolith with broken code rendering (EN):** 35 FAQ questions in the EN file use inline code spans containing literal `\n` characters instead of fenced code blocks. This produces unreadable output. The ES version (1736 lines) uses proper code blocks, creating a severe EN/ES content parity problem.
2. **JSON-LD FAQPage schema mismatch:** Only 3 FAQ entries are serialized in JSON-LD, but the page has 35. This is either a truncation bug or an intentional limit that misrepresents the page to search engines.
3. **Low CTR despite high impressions:** 485 impressions and 0.62% CTR at position 34.4 indicates the SERP presentation is not compelling. The title fix should help, but the meta description lacks a differentiated value proposition.

**Overall forensic score: 72/100** — technically sound infrastructure with significant content quality and rendering issues.

---

## PHASE 1 — RESOURCE DISCOVERY

### Resource inventory

| Property | Value |
|---|---|
| Content type | Recipe (`contentType: recipes`) |
| Topic | `api` |
| Tags | `api`, `documentation`, `java`, `rest`, `http` |
| Difficulty | `beginner` |
| Slug | `api-documentation-openapi` |
| EN file | `src/content/recipes/api/api-documentation-openapi.md` (360 lines) |
| ES file | `src/content/recipes/api/api-documentation-openapi.es.md` (1736 lines) |
| Published | 2026-06-12 |
| Last updated | 2026-08-10 |
| Related resources | 9 (api-versioning, call-rest-api, graphql-api, handle-cors, handle-errors, api-logging-audit, api-rate-limiting-redis, cursor-pagination-postgresql, real-time-notifications) |

### Navigation reachability

- `/recipes/` listing page
- `/topics/api/` topic hub
- Tag pages: `/tags/api/`, `/tags/documentation/`, `/tags/rest/`, `/tags/http/`, `/tags/java/`
- 9 `relatedResources` in frontmatter
- Breadcrumb: Home → Recipes → Article

**Crawl depth:** 2-3 clicks from home.

**Verdict:** Page is well-integrated into the site architecture. No orphan risk.

---

## PHASE 2 — URL STRUCTURE

| Check | Status | Evidence |
|---|---|---|
| URL consistency | PASS | `/recipes/api-documentation-openapi/` — clean, keyword-relevant |
| Trailing slash | PASS | Canonical and hreflang all use trailing slash |
| Uppercase URLs | PASS | None |
| Lowercase URLs | PASS | All lowercase |
| Duplicate URLs | PASS | No duplicates detected |
| Redirect chains | N/A | Static SSG, no redirects |
| Redirect loops | N/A | Static SSG |
| Canonical URLs | PASS | Self-canonical, correct |
| Pretty URLs | PASS | No parameters, no file extensions |
| Parameter URLs | PASS | None — static SSG |
| Pagination | N/A | Single page |
| Orphan URLs | PASS | Reachable from listing, tags, topics, related |
| Dead URLs | PASS | None |
| Broken URLs | PASS | None observed in source |
| Duplicate paths | PASS | EN and ES use same slug with `/es/` prefix |

**URL quality rating: 9/10**

---

## PHASE 3 — CRAWLABILITY

| Check | Status | Evidence |
|---|---|---|
| robots.txt | PASS | `User-agent: * / Allow: /` + sitemap reference (`public/robots.txt`) |
| Meta robots | PASS | No `noindex` or `nofollow` observed in built HTML |
| X-Robots-Tag | N/A | GitHub Pages does not set custom X-Robots-Tag |
| Crawl depth | PASS | 2-3 clicks from home |
| Crawl traps | PASS | None — static SSG, no infinite paths |
| Blocked resources | PASS | No blocked JS/CSS/images |
| Crawl budget | PASS | Static SSG, minimal crawl budget consumption |

**Crawlability rating: 9/10**

---

## PHASE 4 — INDEXABILITY

| Check | Status | Evidence |
|---|---|---|
| Indexable | PASS | No `noindex`, canonical self-references |
| Non-indexable | N/A | Page is intended to be indexed |
| Canonical conflicts | PASS | Self-canonical |
| Duplicate canonicals | PASS | Single canonical tag |
| Soft 404 | PASS | Content is substantial (~5,100 words), no soft-404 risk |
| Hard 404 | PASS | Page exists in build output |
| Thin pages | WARN | FAQ section has many shallow one-sentence answers with code fragments |
| Duplicate pages | PASS | EN and ES are separate pages with hreflang |
| Near duplicates | PASS | EN and ES are translations, not duplicates |
| Parameter duplicates | PASS | None — static SSG |
| Indexation blockers | PASS | None observed |

**Indexability rating: 8/10**

---

## PHASE 5 — CANONICAL ANALYSIS

| Check | Status | Evidence |
|---|---|---|
| Canonical exists | PASS | `<link rel="canonical" href="https://stackpractices.com/recipes/api-documentation-openapi/">` |
| Canonical correctness | PASS | Matches the page URL |
| Self canonical | PASS | Points to itself |
| Canonical consistency | PASS | Same URL in sitemap, hreflang, canonical |
| Canonical loops | PASS | None |
| Cross canonical | PASS | EN canonical → EN, ES canonical → ES |
| HTTP vs HTTPS | PASS | HTTPS |
| www vs non-www | PASS | Non-www, consistent |
| Trailing slash | PASS | Consistent trailing slash across all references |
| Language consistency | PASS | EN canonical for EN page, ES canonical for ES page |

**Canonical rating: 10/10**

---

## PHASE 6 — HREFLANG

| Check | Status | Evidence |
|---|---|---|
| Language codes | PASS | `en`, `es` — valid ISO 639-1 |
| Country codes | PASS | None used (language-only, appropriate for bilingual site) |
| Bidirectional references | PASS | EN references ES, ES references EN |
| Self references | PASS | Each page includes its own hreflang |
| Missing alternates | PASS | Both EN and ES present |
| Wrong alternates | PASS | URLs match expected pattern |
| Wrong canonical | PASS | Each language has its own canonical |
| Missing x-default | PASS | `x-default` present, points to EN |
| Language conflicts | PASS | `lang="en"` on EN page, `lang="es"` on ES page |

**Hreflang rating: 10/10**

---

## PHASE 7 — METADATA

| Check | Status | Evidence |
|---|---|---|
| Title | PASS | `How to Document an API with OpenAPI, Swagger UI and Redoc` (56 chars, within 60-char target, includes primary keywords) |
| Meta description | PASS | 154 chars: `Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.` |
| Meta robots | PASS | No `noindex`/`nofollow` |
| OpenGraph | PASS | `og:type=article`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale`, `og:image` all present |
| Twitter Cards | PASS | Present |
| Favicons | PASS | Present |
| Manifest | PASS | Present |
| Viewport | PASS | Present |
| Theme color | PASS | Present |
| Duplicate metadata | PASS | Unique title and description |
| Missing metadata | PASS | All required fields present |
| Overlong metadata | PASS | Title 56 chars, description 154 chars — both within limits |
| Short metadata | PASS | Neither is too short |
| Keyword stuffing | PASS | Keywords used naturally |
| OG image | WARN | `og:image` is generic (`/og-image.png`) — no per-page or topic-specific image |

**Metadata rating: 9/10**

---

## PHASE 8 — HEADINGS

### EN file heading structure

| Level | Count | Examples |
|---|---|---|
| H1 | 1 | (Rendered from title: "How to Document an API with OpenAPI, Swagger UI and Redoc") |
| H2 | 14 | Overview, When to Use, Solution, Explanation, Variants, What Works, Common Mistakes, Troubleshooting, Further Reading, Production Notes, Key Takeaways, FAQ, See Also, Common Production Pitfalls |
| H3 | 38 | Python, JavaScript, Java (under Solution) + 35 FAQ questions |

### Issues

| Check | Status | Evidence |
|---|---|---|
| Single H1 | PASS | One H1 rendered from frontmatter title |
| Heading hierarchy | PASS | H1 → H2 → H3, no skipped levels |
| Heading consistency | WARN | ES file has 15 H2 sections vs EN 14 H2 — ES adds `Troubleshooting` and `Errores Comunes en Producción` as separate H2 sections, EN has `See Also` and `Common Production Pitfalls` |
| Skipped headings | PASS | None |
| Duplicate headings | WARN | EN has `Common Mistakes` (H2) and `Common Production Pitfalls` (H2) — semantically similar. ES has `Errores Comunes` (H2) and `Errores Comunes en Producción` (H2) — near-duplicate headings |
| Missing headings | PASS | All standard recipe sections present |
| Semantic structure | PASS | Logical flow: Overview → When to Use → Solution → Explanation → Variants → What Works → Common Mistakes → Troubleshooting → Further Reading → Production Notes → Key Takeaways → FAQ |
| FAQ heading depth | WARN | 35 H3 questions under a single H2 `FAQ` creates a flat, monolithic section. No sub-grouping by theme |

**Headings rating: 7/10**

---

## PHASE 9 — CONTENT STRUCTURE

### EN file content inventory

| Element | Count | Quality |
|---|---|---|
| Word count | ~5,100 | Adequate for topic depth |
| Paragraphs | ~30 | Main body is well-paragraphed; FAQ answers are single-paragraph |
| Lists | 8 | Bullet lists in When to Use, What Works, Common Mistakes, Troubleshooting, Production Notes, Key Takeaways |
| Tables | 1 | Variants table (5 rows, 4 columns) — useful but lacks trade-off guidance |
| Images | 0 | **No images, diagrams, or screenshots** |
| Videos | 0 | None |
| Code blocks | 4 fenced | Python, JavaScript, Java in Solution + 1 bash in FAQ |
| Inline code spans | 200+ | Excessive in FAQ — many contain literal `\n` characters |
| Callouts | 0 | None |
| Quotes | 0 | None |
| Examples | 4 runnable | FastAPI, Express, SpringDoc, openapi-generator-cli |
| FAQ questions | 35 | Too many; most are shallow reference snippets |
| Internal references | 9 | `relatedResources` in frontmatter |
| External references | 4 | OpenAPI spec, Redocly, FastAPI, Springdoc — all authoritative |

### Critical rendering issue — EN FAQ inline code

The EN FAQ answers use inline code spans containing literal `\n` characters instead of fenced code blocks. For example (line 205):

```
Use `securitySchemes` in the `components` section. For Bearer JWT: `components:\n  securitySchemes:\n    BearerAuth:\n      type: http\n      scheme: bearer\n      bearerFormat: JWT`.
```

This renders as a single line with visible `\n` text, not as formatted YAML. The ES version (1736 lines) uses proper fenced code blocks for the same content. This is a **critical content quality and UX issue** that makes the EN FAQ largely unreadable for code-heavy answers.

**Evidence:** EN file is 360 lines; ES file is 1736 lines for the same content. The 4.8x line difference is almost entirely due to the ES version using fenced code blocks (` ```yaml `) while the EN version compresses code into inline spans with `\n`.

### Reading difficulty

- Main body: Appropriate for beginner-to-intermediate developers. Clear prose, good sentence length variation (mean 11.0 words, CV 0.78 — natural variation per AI detection metrics).
- FAQ: Reading difficulty is high due to inline code spans with `\n` characters. Users cannot scan the YAML/JSON examples.

### Scannability

- Main body: HIGH — clear headings, bullet lists, bold key terms.
- FAQ: LOW — 35 questions in a flat list with no sub-grouping, no visual hierarchy, and unreadable code examples.

### Information density

- Main body: MEDIUM-HIGH — specific, actionable, minimal filler.
- FAQ: LOW — repetitive "How do I X in OpenAPI?" pattern with "Use Y. For Z: `code`." answers.

**Content structure rating: 5/10** (main body 8/10, FAQ 2/10)

---

## PHASE 10 — INTERNAL LINKING

### Outbound links from this page

| Type | Count | Examples |
|---|---|---|
| `relatedResources` | 9 | api-versioning, call-rest-api, graphql-api, handle-cors, handle-errors, api-logging-audit, api-rate-limiting-redis, cursor-pagination-postgresql, real-time-notifications |
| Body internal links | ~3 | `/recipes/rest-api-design/`, `/recipes/oauth2-pkce-spa/`, `/recipes/call-rest-api/`, `/guides/database-design-guide/` |
| External links | 4 | OpenAPI spec, Redocly CLI, FastAPI docs, Springdoc OpenAPI |

### Inbound links (expected)

- `/recipes/` listing page
- `/topics/api/` topic hub
- Tag pages: `/tags/api/`, `/tags/documentation/`, `/tags/rest/`, `/tags/http/`, `/tags/java/`
- `relatedResources` of 9 sibling recipes

### Issues

| Check | Status | Evidence |
|---|---|---|
| Total internal links | PASS | 9 related + ~3 body = 12 outbound |
| Broken links | PASS | None observed |
| Redirect links | PASS | None |
| Deep pages | PASS | Crawl depth 2-3 |
| Orphan pages | PASS | Not orphaned |
| Hub pages | PASS | `/topics/api/` serves as hub |
| Pillar pages | WARN | This page could be the API documentation pillar but lacks pillar depth (no comparison page, no downloadable artifact) |
| Clusters | PASS | Part of API/REST cluster with 9 related recipes |
| Anchor text diversity | PASS | Descriptive anchors, no "click here" |
| Navigation quality | PASS | TOC, breadcrumb, related resources, language switch |
| Contextual links | WARN | Only ~3 contextual body links; could add more from versioning, rate limiting, and error handling sections |
| Link distribution | WARN | Most internal links are in `relatedResources` (automated), few contextual body links |

**Internal linking rating: 7/10**

---

## PHASE 11 — STRUCTURED DATA

### JSON-LD types present

| Schema | Status | Evidence |
|---|---|---|
| TechArticle | PASS | `headline`, `description`, `author`, `publisher`, `dateModified`, `datePublished`, `inLanguage`, `educationalLevel` all present |
| BreadcrumbList | PASS | Home → Recipes → Article |
| FAQPage | WARN | Present but only 3 questions serialized; page has 35 FAQ questions |
| WebPage | PASS | Implied via TechArticle |
| Organization | PASS | Publisher info included |
| Person | PASS | Author (Mathias Paulenko) included |
| HowTo | N/A | Not applicable for this content type |
| SoftwareApplication | N/A | Not applicable |
| Product | N/A | Not applicable |
| Review | N/A | Not applicable |
| SearchAction | N/A | Site-level, not page-level |

### Issues

| Check | Status | Evidence |
|---|---|---|
| Schema.org validity | WARN | FAQPage contains only 3 of 35 FAQ questions — schema/page mismatch |
| JSON-LD syntax | PASS | Valid JSON-LD structure |
| Microdata | PASS | None used (JSON-LD only — correct approach) |
| Escaped code in answers | WARN | If FAQ answers contain inline code with `\n`, JSON-LD serialization may include malformed text |
| dateModified freshness | PASS | Matches `lastUpdated: 2026-08-10` |
| Author markup | PASS | `Person` type with name |
| Publisher markup | PASS | `Organization` type |

**Structured data rating: 7/10**

---

## PHASE 12 — PERFORMANCE

| Check | Status | Evidence |
|---|---|---|
| Static HTML | PASS | Astro SSG — all content present without JS |
| JavaScript size | PASS | Astro ships zero JS by default; only GA4 + GTM scripts |
| CSS size | PASS | Tailwind CSS v4+ — utility-first, minimal output |
| DOM size | WARN | 35 FAQ questions with long inline code spans increase DOM size |
| Image optimization | N/A | No images on page |
| Lazy loading | N/A | No images to lazy load |
| Compression | PASS | GitHub Pages serves gzip/brotli |
| Caching | PASS | Static assets cached via GitHub Pages CDN |
| LCP | PASS (inferred) | Static HTML, minimal JS, text-heavy page |
| INP | PASS (inferred) | No interactive elements requiring JS |
| CLS | PASS (inferred) | No images or dynamic content causing layout shift |
| TTFB | PASS (inferred) | GitHub Pages CDN, static files |
| Pagefind search | PASS | Static search index, no runtime cost |

**Performance rating: 8/10** (no measured data; inferred from static architecture)

---

## PHASE 13 — ACCESSIBILITY

| Check | Status | Evidence |
|---|---|---|
| Semantic HTML | PASS | Proper heading hierarchy, `<nav>`, `<main>`, `<article>` structure |
| ARIA | PASS | No unnecessary ARIA; semantic HTML used |
| Contrast | PASS (inferred) | Tailwind design system with accessible color tokens |
| Keyboard navigation | PASS | TOC, breadcrumb, related resources are keyboard-navigable |
| Screen readers | WARN | 35 FAQ questions with inline code containing `\n` will be read as "backslash n" by screen readers |
| Alt text | N/A | No images |
| Labels | PASS | Form labels present where applicable (search) |
| Focus | PASS | Visible focus states (inferred from Tailwind) |
| Code blocks | WARN | EN FAQ code is in inline spans, not `<pre><code>` blocks — not accessible |
| Language attribute | PASS | `lang="en"` on EN, `lang="es"` on ES |

**Accessibility rating: 7/10**

---

## PHASE 14 — MOBILE

| Check | Status | Evidence |
|---|---|---|
| Responsive design | PASS | Tailwind CSS v4+ mobile-first |
| Viewport | PASS | `<meta name="viewport">` present |
| Touch targets | PASS (inferred) | Standard Tailwind component sizing |
| Mobile navigation | PASS | Responsive nav, hamburger menu (inferred from site pattern) |
| Layout shifts | PASS | No images or dynamic content |
| Performance | PASS | Static HTML, minimal JS |
| Images | N/A | None |
| Typography | PASS | Tailwind responsive font sizes |
| Spacing | PASS | Tailwind responsive spacing |
| Code readability | FAIL | EN FAQ inline code with `\n` is unreadable on mobile — long horizontal scroll for inline code spans |

**Mobile rating: 7/10**

---

## PHASE 15 — SECURITY

| Check | Status | Evidence |
|---|---|---|
| HTTPS | PASS | `https://stackpractices.com` |
| HSTS | PASS (inferred) | GitHub Pages enforces HTTPS |
| Security headers | PASS | CSP present in `<meta http-equiv>` |
| CSP | PASS | Content Security Policy in meta tag |
| Mixed content | PASS | All resources over HTTPS |
| Cookies | PASS | GA4 cookies only |
| Third-party scripts | WARN | GA4 (`G-RBE12WJ5KZ`) + GTM present — tracking scripts |
| External links | PASS | All external links are HTTPS, authoritative sources |

**Security rating: 9/10**

---

## PHASE 16 — CONTENT QUALITY

| Dimension | Score | Evidence |
|---|---|---|
| Content depth | 6/10 | Main body is LEVEL 3-4 (practical + engineering considerations). FAQ is LEVEL 1-2 (reference snippets). No worked case study, no governance discussion, no migration guide. |
| Completeness | 6/10 | Covers FastAPI, Express, SpringDoc. Missing: complete `openapi.yaml`, expected output, dependency installation, error handling in snippets, "When Not to Use", alternatives. |
| Readability | 5/10 | Main body is readable. EN FAQ is unreadable due to inline code with `\n`. |
| Freshness | 9/10 | `lastUpdated: 2026-08-10`. OpenAPI 3.0/3.1 nuances are current. Tool commands are current (`actions/checkout@v4`, `@redocly/cli`). |
| Consistency | 4/10 | EN and ES versions have severe structural divergence: EN is 360 lines, ES is 1736 lines. ES has proper code blocks; EN has inline `\n` spans. ES has 15 H2 sections; EN has 14. Section names differ in the tail (EN: "See Also" + "Common Production Pitfalls"; ES: "Ver También" + "Troubleshooting" + "Errores Comunes en Producción"). |
| Originality | 5/10 | Trade-offs (code-first vs design-first, DTOs vs entities, 3.0 vs 3.1 nullable) add value. No first-person experience, no war stories, no benchmarks. FAQ is a remix of tool documentation. |
| Practical value | 7/10 | Solution code is runnable. What Works and Common Mistakes are actionable. Missing: downloadable spec, step-by-step workflow, decision tree. |
| Search intent satisfaction | 7/10 | Title and meta match intent. Main body satisfies "how to document API with OpenAPI". FAQ is too shallow for advanced queries. |
| Thin content | WARN | 35 FAQ questions, most with one-sentence answers. Programmatic content risk. |
| Duplicate content | PASS | No duplication within the page. |
| Template repetition | WARN | FAQ follows repetitive "How do I X?" / "Use Y. For Z: `code`." pattern. |

**Content quality rating: 6/10**

---

## PHASE 17 — EEAT

| Dimension | Score | Evidence |
|---|---|---|
| Experience | 5/10 | ES version has first-person voice ("En mi experiencia", "Yo uso code-first cuando..."). EN version lacks first-person voice — no "I" or "we" or team experience. |
| Expertise | 6/10 | Correct technical claims (OpenAPI 3.0/3.1, Redocly, contract testing). Missing depth on security review, performance, governance, backward compatibility. |
| Author pages | PASS | Author "Mathias Paulenko" in frontmatter and JSON-LD. About page exists at `/about`. |
| About page | PASS | Present at `/about.astro` |
| Editorial policy | WARN | No explicit editorial policy or review process stated on page |
| References | PASS | 4 authoritative external links (OpenAPI spec, Redocly, FastAPI, Springdoc) |
| Update policy | PASS | `lastUpdated` field present and visible in JSON-LD `dateModified` |
| Transparency | PASS | Author identified, dates published |
| Contact information | PASS | Available on about page |
| Trust signals | WARN | No testimonials, no citations, no GitHub repo link, no downloadable artifact |
| Brand consistency | PASS | Consistent with StackPractices recipe template |
| EN/ES EEAT parity | FAIL | ES version has first-person experience markers; EN version does not. This is an EEAT inconsistency between language versions. |

**EEAT rating: 6/10**

---

## PHASE 18 — INFORMATION ARCHITECTURE

| Dimension | Score | Evidence |
|---|---|---|
| Topic clusters | 7/10 | Part of API/REST cluster with 9 related recipes. Cluster lacks a clear pillar page. |
| Pillar pages | 6/10 | This page could be the pillar for "API documentation" but lacks pillar depth (no comparison page, no sub-topics split out). |
| Navigation | 8/10 | TOC, breadcrumb, related resources, language switch all present. |
| Taxonomy | 8/10 | Tagged with `api`, `documentation`, `java`, `rest`, `http`. Topic `api` is correct. |
| Hierarchy | 8/10 | `/recipes/` → `/recipes/<slug>/` consistent with content type. |
| URL organization | 9/10 | Clean, keyword-relevant, hyphenated, no stop words. |
| Category quality | 8/10 | Well-categorized under `api` topic. |
| Scalability | 7/10 | Recipe template scales, but 35-question FAQ monolith does not scale well for maintenance. |
| Maintainability | 5/10 | EN/ES divergence (360 vs 1736 lines) makes maintenance difficult. Adding a new FAQ question requires updating both files with different formatting approaches. |

**Information architecture rating: 7/10**

---

## PHASE 19 — PRIORITIZATION

### P0 — Critical issues

| ID | FA-001 |
|---|---|
| Title | EN FAQ code rendering is broken — inline code spans with literal `\n` |
| Category | Content Quality / UX / Accessibility |
| Description | 35 FAQ answers in the EN file use inline code spans containing `\n` characters (e.g., `` `components:\n  securitySchemes:\n    BearerAuth:...` ``) instead of fenced code blocks. These render as single-line strings with visible `\n` text, making YAML/JSON examples completely unreadable. |
| Evidence | `src/content/recipes/api/api-documentation-openapi.md` lines 197, 201, 205, 209, 213, 217, 221, 225, 229, 233, 237, 241, 245, 249, 253, 257, etc. EN file is 360 lines; ES file is 1736 lines for the same content. |
| Affected URLs | EN: https://stackpractices.com/recipes/api-documentation-openapi/ |
| Severity | Critical |
| Priority | P0 |
| Confidence | High (directly observed in source) |
| Business impact | High — unreadable FAQ destroys user experience, increases bounce rate, signals low quality to Google |
| SEO impact | High — thin/shallow content signal, poor dwell time, high bounce |
| Technical impact | Medium — no build error, but rendering is incorrect |
| Fix complexity | Medium — requires converting all inline `\n` code spans to fenced code blocks |
| Fix time | 2-3 hours |
| Dependencies | None |
| Recommended solution | Convert all inline code spans in the EN FAQ to fenced code blocks (` ```yaml ` ... ` ``` `), matching the ES version's formatting. |
| Validation method | Visual inspection of built EN page; compare line count to ES version; verify code blocks render with syntax highlighting. |

| ID | FA-002 |
|---|---|
| Title | JSON-LD FAQPage schema serializes only 3 of 35 FAQ questions |
| Category | Structured Data / SEO |
| Description | The FAQPage JSON-LD contains only 3 questions, but the page has 35 FAQ H3 questions. This creates a schema/content mismatch that can confuse search engines and miss FAQ rich result opportunities. |
| Evidence | Built HTML JSON-LD shows 3 FAQ entries; source file has 35 `### ` questions under `## FAQ`. |
| Affected URLs | EN and ES |
| Severity | High |
| Priority | P0 |
| Confidence | High (observed in built HTML and source) |
| Business impact | Medium — missed FAQ rich results in SERP |
| SEO impact | High — FAQ rich results can increase CTR and SERP real estate |
| Technical impact | Low — schema is valid but incomplete |
| Fix complexity | Low-Medium — either serialize all FAQ questions or condense to 8-10 and serialize those |
| Fix time | 1-2 hours (if condensing FAQ) or 30 min (if serializing all) |
| Dependencies | Depends on FAQ condensation decision (FA-003) |
| Recommended solution | Condense FAQ to 8-10 high-value questions (see FA-003), then serialize all remaining questions in FAQPage JSON-LD. |
| Validation method | Google Rich Results Test; compare JSON-LD question count to page FAQ count. |

### P1 — High priority issues

| ID | FA-003 |
|---|---|
| Title | FAQ monolith — 35 shallow questions with programmatic content risk |
| Category | Content Quality / SEO |
| Description | The FAQ section has 35 questions, most answered with one sentence + code snippet. The repetitive "How do I X in OpenAPI?" pattern with "Use Y. For Z: `code`." answers feels mass-produced and triggers scaled-content signals. |
| Evidence | `src/content/recipes/api/api-documentation-openapi.md` lines 177-339 (35 H3 questions). AI detection: 50.9% AI on EN, with top AI sentences being FAQ-style reference snippets. |
| Affected URLs | EN and ES |
| Severity | High |
| Priority | P1 |
| Confidence | High |
| Business impact | High — thin content signal, poor user experience, AI content footprint |
| SEO impact | High — Google's scaled-content and thin-content guidelines |
| Technical impact | Low |
| Fix complexity | Medium-High — requires editorial judgment to select, merge, and expand |
| Fix time | 4-6 hours |
| Dependencies | Should be done before FA-002 (JSON-LD update) |
| Recommended solution | Condense to 8-10 high-value questions. Group by theme (writing specs, generating docs, validating/CI, versioning, advanced patterns). Expand the best ones with real explanations. Remove YAML edge cases that belong in official docs. |
| Validation method | Word count per FAQ answer > 40 words; no repetitive "Use X. For Y:" pattern; AI detection re-run. |

| ID | FA-004 |
|---|---|
| Title | EN/ES content parity divergence — 360 vs 1736 lines |
| Category | Content Quality / Maintainability |
| Description | The EN file (360 lines) and ES file (1736 lines) contain the same content but use fundamentally different formatting. ES uses proper fenced code blocks; EN uses inline code spans with `\n`. ES has 15 H2 sections; EN has 14. ES has first-person voice; EN does not. This is not a translation difference — it is a structural divergence. |
| Evidence | EN: 360 lines, 14 H2, no first-person voice, inline `\n` code. ES: 1736 lines, 15 H2, first-person voice ("En mi experiencia"), fenced code blocks. |
| Affected URLs | Both |
| Severity | High |
| Priority | P1 |
| Confidence | High |
| Business impact | Medium — inconsistent quality between languages |
| SEO impact | Medium — EN version is lower quality than ES, which is unusual |
| Technical impact | High — maintenance burden, hard to keep in sync |
| Fix complexity | Medium — requires reformatting EN FAQ to match ES |
| Fix time | 3-4 hours (subset of FA-001) |
| Dependencies | FA-001 (fixing EN code rendering will close most of this gap) |
| Recommended solution | Reformat EN FAQ to use fenced code blocks matching ES. Align H2 section structure. Consider adding first-person voice to EN to match ES EEAT level. |
| Validation method | Line count comparison; heading structure comparison; visual diff of rendered pages. |

| ID | FA-005 |
|---|---|
| Title | Low CTR (0.62%) despite 485 impressions |
| Category | SEO / Search Performance |
| Description | The page receives 485 impressions but only 2 clicks (0.62% CTR) at average position 34.4. The title truncation bug (now fixed) was likely a major cause, but the meta description could be more compelling. |
| Evidence | GSC data: 485 impressions, 2 clicks, 0.62% CTR, avg position 34.4, +472 impression delta. |
| Affected URLs | EN |
| Severity | High |
| Priority | P1 |
| Confidence | High |
| Business impact | High — lost traffic from striking-distance position |
| SEO impact | High |
| Technical impact | None |
| Fix complexity | Low |
| Fix time | 30 min |
| Dependencies | Title fix already applied |
| Recommended solution | Monitor CTR for 2-4 weeks post-title-fix. If CTR remains below 1.5%, test a more specific meta description with a soft CTA (e.g., "Includes copy-paste examples for FastAPI, Express and SpringDoc."). |
| Validation method | GSC CTR comparison 28 days post-fix. |

### P2 — Medium priority issues

| ID | FA-006 |
|---|---|
| Title | No images, diagrams, or screenshots |
| Category | Content Quality / UX |
| Description | The page has zero images. A topic like API documentation benefits from screenshots of Swagger UI and Redoc, an architecture diagram of the spec-to-docs flow, and a decision tree for code-first vs design-first. |
| Evidence | No `![` in source file; no `<img>` in built HTML. |
| Severity | Medium |
| Priority | P2 |
| Recommended solution | Add 2-3 images: Swagger UI screenshot, Redoc screenshot, code-first vs design-first decision tree. Add `og:image` per-page. |
| Fix time | 1-2 hours |

| ID | FA-007 |
|---|---|
| Title | No downloadable `openapi.yaml` or GitHub repo link |
| Category | Content Quality / Trust signals |
| Description | The page shows code fragments but no complete, downloadable spec file. This reduces practical value and bookmark-worthiness. |
| Evidence | No link to gist, repo, or downloadable file in source. |
| Severity | Medium |
| Priority | P2 |
| Recommended solution | Add a complete `openapi.yaml` example (inline or linked to a gist). |
| Fix time | 1 hour |

| ID | FA-008 |
|---|---|
| Title | Missing "When Not to Use" and alternatives |
| Category | Content Quality / Search Intent |
| Description | The page assumes OpenAPI is the answer. No mention of Postman, GraphQL introspection, gRPC reflection, AsyncAPI, or when Markdown is sufficient. |
| Evidence | No "When Not to Use" section; no alternatives comparison. |
| Severity | Medium |
| Priority | P2 |
| Recommended solution | Add a short "When Not to Use" section or alternatives note (Postman, GraphQL, gRPC, AsyncAPI, plain Markdown). |
| Fix time | 1 hour |

| ID | FA-009 |
|---|---|
| Title | Duplicate/near-duplicate H2 headings |
| Category | Headings / Content Structure |
| Description | EN has `Common Mistakes` (H2) and `Common Production Pitfalls` (H2) — semantically overlapping. ES has `Errores Comunes` and `Errores Comunes en Producción` — same issue. |
| Evidence | EN lines 134 and 351; ES lines 135 and 1734. |
| Severity | Low |
| Priority | P2 |
| Recommended solution | Merge `Common Production Pitfalls` into `Common Mistakes` or rename to something distinct (e.g., "Production Deployment Pitfalls"). |
| Fix time | 30 min |

| ID | FA-010 |
|---|---|
| Title | Generic OG image |
| Category | Social / Metadata |
| Description | `og:image` is `/og-image.png` (site-wide generic). No per-page or topic-specific OG image. |
| Evidence | Built HTML shows generic `og:image`. |
| Severity | Low |
| Priority | P2 |
| Recommended solution | Create a topic-specific OG image for API recipes or this specific page. |
| Fix time | 1 hour (design) |

| ID | FA-011 |
|---|---|
| Title | No first-person voice in EN version |
| Category | EEAT / Content Quality |
| Description | The ES version uses first-person voice ("En mi experiencia", "Yo uso code-first cuando..."), which strengthens EEAT. The EN version lacks this entirely — no "I", "we", or team experience markers. |
| Evidence | EN file has no first-person markers. ES file has multiple ("En mi experiencia", "Yo uso", "Yo prevengo esto"). |
| Severity | Medium |
| Priority | P2 |
| Recommended solution | Add first-person experience markers to EN main body to match ES EEAT level. |
| Fix time | 1 hour |

### P3 — Low priority issues

| ID | FA-012 |
|---|---|
| Title | Variants table lacks trade-off guidance |
| Category | Content Quality |
| Description | The Variants table lists 5 tools but does not include a "choose this when" column or pros/cons. |
| Severity | Low |
| Priority | P3 |
| Fix time | 30 min |

| ID | FA-013 |
|---|---|
| Title | Troubleshooting lacks symptom-cause-fix format |
| Category | Content Quality |
| Description | Troubleshooting bullets are good but do not include actual error messages or log lines. |
| Severity | Low |
| Priority | P3 |
| Fix time | 1 hour |

| ID | FA-014 |
|---|---|
| Title | Missing dependency installation in code examples |
| Category | Content Quality |
| Description | Code snippets do not show `npm install`, `pip install`, or Maven dependencies. |
| Severity | Low |
| Priority | P3 |
| Fix time | 30 min |

---

## PHASE 20 — ROOT CAUSE ANALYSIS

### Why this page underperforms (estimated contribution)

| Factor | Contribution | Justification |
|---|---|---|
| Content | 35% | The broken EN FAQ rendering (inline `\n` code spans) is the single largest issue. 35 shallow FAQ questions trigger thin-content signals. No images, no downloadable spec, no case study reduce depth. |
| Technical SEO | 15% | The title truncation bug (now fixed) was a major CTR suppressor. JSON-LD FAQPage mismatch. Generic OG image. |
| Rendering | 15% | EN FAQ code rendering is fundamentally broken — inline code spans with `\n` do not render as code blocks. This is a rendering failure, not just a content issue. |
| EEAT | 10% | EN version lacks first-person voice and experience markers that the ES version has. No author bio link on page, no trust signals (repo, testimonials). |
| Internal Linking | 5% | Reasonable but could be stronger with more contextual body links. |
| Architecture | 5% | Solid URL structure, good cluster membership, but no clear pillar page strategy. |
| Authority | 5% | No backlinks data, but no downloadable artifact or unique resource to attract links. |
| Performance | 0% | Static SSG, no performance issues. |
| UX | 5% | Unreadable FAQ on mobile, no visual aids, flat FAQ structure. |
| Other | 5% | EN/ES maintenance divergence creates ongoing risk. |

### Root cause summary

The root cause is a **content production process issue**: the EN FAQ was generated with inline code spans containing `\n` characters (likely from a tool or AI generation that compressed multi-line YAML into single-line strings), while the ES version was either manually formatted or post-processed with proper code blocks. This created a 4.8x line count divergence and a fundamental rendering failure in the EN version. The 35-question FAQ monolith suggests a "more is better" approach to GEO/FAQ content that has backfired — the quantity dilutes quality and triggers scaled-content signals.

---

## FINAL VERDICT

### 1. What are the critical issues?

- **FA-001:** EN FAQ code rendering is broken (inline `\n` code spans instead of fenced blocks). This makes 35 FAQ answers unreadable.
- **FA-002:** JSON-LD FAQPage serializes only 3 of 35 FAQ questions — schema/content mismatch.
- **FA-003:** FAQ monolith (35 shallow questions) triggers thin-content and scaled-content risk.

### 2. What are the high priority issues?

- **FA-004:** EN/ES content parity divergence (360 vs 1736 lines, different formatting, different voice).
- **FA-005:** Low CTR (0.62%) at striking-distance position — monitor post-title-fix.

### 3. What should be fixed first?

1. **Fix EN FAQ code rendering (FA-001)** — convert all inline `\n` code spans to fenced code blocks. This is the highest-impact fix for user experience and content quality.
2. **Condense FAQ to 8-10 questions (FA-003)** — merge, expand, and remove shallow questions. This reduces thin-content risk and AI footprint.
3. **Update JSON-LD FAQPage (FA-002)** — serialize the condensed FAQ questions in structured data.
4. **Align EN/ES parity (FA-004)** — ensure both versions have the same sections, same code formatting, and same EEAT voice.
5. **Monitor CTR (FA-005)** — wait 28 days post-title-fix, then evaluate meta description.

### 4. What problems are probably false positives?

- **AI detection at 50.9% (EN):** The high AI score is likely driven by the FAQ's repetitive "How do I X?" / "Use Y. For Z: `code`." pattern, not by the main body. The main body prose has natural sentence length variation (CV 0.78). Fixing the FAQ (FA-003) should reduce the AI score significantly.
- **Thin content signal for the whole page:** The main body (~2,000 words) is substantive and well-written. The thin-content risk is concentrated in the FAQ section. The page as a whole is not thin.
- **ES version having more content:** The ES version is longer because it uses proper code blocks, not because it has more information. The content is equivalent; the formatting is different.

### 5. What evidence is missing?

- Actual Google indexation status (is the page indexed?).
- Backlink profile for this URL.
- GA4 engagement data (bounce rate, dwell time, scroll depth).
- Core Web Vitals field data (CrUX).
- Lighthouse audit scores.
- Google Rich Results Test validation for FAQPage schema.
- Robots.txt crawl test from Googlebot's perspective.

### 6. Overall assessment

The page has strong technical SEO infrastructure (canonical, hreflang, JSON-LD, sitemap, clean URLs) and a solid main body. The title truncation bug was a significant CTR suppressor that has been fixed. The page's underperformance is primarily driven by the broken EN FAQ rendering, the FAQ monolith's thin-content signal, and the EN/ES content parity divergence. Fixing FA-001 through FA-004 would likely move the page from 72/100 to 85+/100 and improve CTR and ranking within 4-8 weeks.
