# Master Checklist — `api-documentation-openapi` (recipe)

**Scope:** Single resource on StackPractices (`https://stackpractices.com`)  
**Resource:** `api-documentation-openapi`  
**EN URL:** https://stackpractices.com/recipes/api-documentation-openapi/  
**ES URL:** https://stackpractices.com/es/recipes/api-documentation-openapi/  
**Source files:**
- `src/content/recipes/api/api-documentation-openapi.md` (EN, 360 lines)
- `src/content/recipes/api/api-documentation-openapi.es.md` (ES, 1,736 lines)
- `src/components/RecipeArticle.astro`
- `src/lib/content.ts`
- `src/components/Seo.astro`
- `src/pages/recipes/[slug]/faq.json.ts`
- `src/pages/es/recipes/[slug]/faq.json.ts`

**Author:** Mathias Paulenko  
**GSC (last 28 days):** 485 impressions, 2 clicks, 0.62% CTR, avg. position 34.4, +472 impression delta  
**AI detection (desklib):** EN 50.9%, ES 38.6%, 0 pattern findings  
**Audit scores:**
- Forensic score: 72/100
- SEO-360: 69/100
- Content-Audit: 72/100
- Content-360: 72/100
- Content-quality composite: 90.2/100

**Regenerated from:** `ref/prompts/16-master-checklist.md`  
**Legacy findings replaced:** All qapractices.com / Angular SPA references have been removed. This checklist contains only StackPractices- and resource-specific issues supported by evidence.

---

## Executive Summary

| Metric | Value | Notes |
|---|---|---|
| Overall Resource Health | 62/100 | Moderate; held back by FAQ quality, AI signal, and CTR. |
| Technical Health | 88/100 | Astro SSG, static HTML, canonical/hreflang, sitemap, and indexability are correct. |
| SEO Health | 68/100 | Title bug fixed; main gap is FAQ structured-data mismatch and thin content. |
| Content Health | 60/100 | Main body is strong; FAQ is bloated, low-density, and the primary AI source. |
| Bilingual Parity Health | 58/100 | EN and ES diverge in formatting, length, code rendering, and AI score. |
| Google Confidence | 40/100 | New domain, no external authority, position 34.4, low CTR. |
| CTR / Search Visibility | 25/100 | 0.62% CTR at position 34.4; title fix should help, but content depth is the next lever. |
| Critical Issues (P0) | 6 | |
| High Priority Issues (P1) | 5 | |
| Medium Priority Issues (P2) | 4 | |
| Total Issues | 15 | |

**Core problem statement**

`api-documentation-openapi` is a technically sound Astro SSG page with a strong main body, but the FAQ section has become a bloated reference dump that drags down content quality, creates an AI-like pattern, and only partially reaches the structured-data layer. The EN version uses unreadable inline `\n` snippets, while the ES version uses proper code blocks, producing a severe bilingual parity gap. As a result, Google shows the page 485 times per month but only earns 2 clicks (0.62% CTR) at position 34.4. The page is in striking distance, but it needs focused on-page recovery before it can rank in the top 20.

**What must be true before this resource can rank**

1. The FAQ section must be condensed to 8–10 high-impact questions with proper fenced code blocks and explanatory prose.
2. Every condensed FAQ question must appear in the JSON-LD `FAQPage` schema (not just 3 of 38).
3. EN and ES must have equivalent question sets, code formatting, and humanization.
4. The literal `\n` escape sequences must be removed from the EN source.
5. Contextual internal links must connect the page to the API topic cluster.
6. AI-like phrasing must be reduced to <30% on EN to avoid Helpful Content / scaled-content signals.

---

## Critical Issues (P0)

### ISSUE-001 — EN FAQ code rendering broken

- [ ] **EN FAQ code rendering broken: 788 literal `\n` escape sequences in inline code instead of fenced code blocks.**

**Category:** Content > Formatting

**Description:** The EN FAQ answers pack multi-line YAML/JSON/code into single-paragraph inline code spans using literal `\n` characters. Browsers and Markdown renderers display the literal text `\n` instead of a line break, making the code unreadable. The ES version uses proper fenced code blocks and has 0 such occurrences.

**Affected files:** `src/content/recipes/api/api-documentation-openapi.md` (FAQ section, lines 175–341)

**Evidence:**
- `grep "\\n" src/content/recipes/api/api-documentation-openapi.md` = 788 matches.
- `grep "\\n" src/content/recipes/api/api-documentation-openapi.es.md` = 0 matches.
- Sample source: `In GitHub Actions: \`name: Generate OpenAPI Spec\non: push\njobs:\n  spec:\n    runs-on: ubuntu-latest\n...\`` (line 197).

**Source reports:** CONTENT-AUDIT, FORENSIC-AUDIT, GOOGLEBOT-AUDIT, CONTENT-360

**Severity:** Critical · **Priority:** P0 · **Confidence:** 100%

**Impact:** Business High / SEO High / Technical Low / Content Critical

**Effort:** 2–3 hours

**Dependencies:** Should be fixed together with ISSUE-003 (FAQ condensation).

**Validation method:**
- `grep "\\n" src/content/recipes/api/api-documentation-openapi.md` returns 0.
- Built HTML shows `<pre><code class="language-yaml">` for multi-line snippets.
- Manual browser check confirms no literal `\n` text on the page.

---

### ISSUE-002 — JSON-LD FAQPage only 3 of 38 questions

- [ ] **JSON-LD FAQPage only 3 of 38 questions.**

**Category:** SEO > Structured Data

**Description:** The `FAQPage` JSON-LD contains only 3 questions, while the source file contains 38. The component hard-codes a `.slice(0, 3)` on the FAQ array, and the dedicated `faq.json.ts` endpoints do the same. Google sees a mismatch between visible content and schema, which can suppress FAQ rich results.

**Affected files:**
- `src/components/RecipeArticle.astro` (line 82: `faqPage(faqs.slice(0, 3))`)
- `src/pages/recipes/[slug]/faq.json.ts` (line 16: `extractFaqs(...).slice(0, 3)`)
- `src/pages/es/recipes/[slug]/faq.json.ts` (line 16: same)

**Evidence:**
- GOOGLEBOT-AUDIT: "38 FAQ entries in the markdown source, but only 3 are included in FAQPage JSON-LD."
- `src/components/RecipeArticle.astro` line 82.
- `lib/content.ts` `extractFaqs` returns max 10 by default, but the component further truncates to 3.

**Source reports:** GOOGLE-FORENSIC-SEO, GOOGLEBOT-AUDIT, SEARCH-VISIBILITY

**Severity:** High · **Priority:** P0 · **Confidence:** 100%

**Impact:** Business High / SEO Critical / Technical Medium / Content Low

**Effort:** 1 hour

**Dependencies:** Must follow ISSUE-003 (condense FAQ to ≤10 questions so the schema is not overloaded).

**Validation method:**
- Built HTML contains 8–10 `Question`/`Answer` pairs in the `FAQPage` JSON-LD.
- Google Rich Results Test reports a valid FAQPage with no errors.
- `/recipes/api-documentation-openapi/faq.json` returns 8–10 FAQ pairs.

---

### ISSUE-003 — FAQ monolith / thin content

- [ ] **FAQ section is a 38-question reference monolith with low information density and strong AI patterns.**

**Category:** Content > Helpful Content

**Description:** The FAQ accounts for ~74% of the word count (~3,800 of ~5,160 words) but only ~21% of the information density. Most answers are one declarative sentence followed by inline code fragments. The section also overlaps the main body (versioning, CI lint, rate limiting repeated 3+ times) and covers tangential topics (SSE, webhooks, API gateways, developer portals).

**Affected files:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Evidence:**
- `grep "^### " src/content/recipes/api/api-documentation-openapi.md` = 38 FAQ headers (plus 3 solution H3s).
- CONTENT-AUDIT: "FAQ section accounts for ~74% of total word count but delivers lowest information density."
- CONTENT-AUDIT: "Overall information density 39% (main body 89%, FAQ 21%)."
- ai-detect: EN 50.9%, top AI sentences mostly from FAQ.

**Source reports:** CONTENT-AUDIT, CONTENT-360, GOOGLE-FORENSIC-SEO, ai-detect

**Severity:** Critical · **Priority:** P0 · **Confidence:** 100%

**Impact:** Business High / SEO Critical / Technical Low / Content Critical

**Effort:** 4–6 hours

**Dependencies:** Blocks ISSUE-001, ISSUE-002, ISSUE-004, and ISSUE-009.

**Validation method:**
- `grep "^### "` returns 8–10 FAQ headers.
- Word count in FAQ section <1,000.
- No repeated `redocly lint` or rate-limiting fragments across multiple questions.
- Re-run ai-detection on EN; target <30%.

---

### ISSUE-004 — EN/ES bilingual parity divergence

- [ ] **EN/ES bilingual parity divergence in formatting, length, and humanization.**

**Category:** Content > Bilingual

**Description:** The EN file is 360 lines with unreadable inline `\n` code and a 50.9% AI score. The ES file is 1,736 lines with proper fenced code blocks and a 38.6% AI score. The two versions do not present the same code formatting or humanization quality.

**Affected files:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Evidence:**
- EN: 360 lines; ES: 1,736 lines.
- EN AI: 50.9%; ES AI: 38.6%.
- `grep "\\n"` EN = 788; ES = 0.
- CONTENT-AUDIT: "EN FAQ uses inline `\n` YAML; ES FAQ uses proper code blocks — a structural inconsistency between languages."

**Source reports:** CONTENT-AUDIT, ai-detect, FORENSIC-AUDIT

**Severity:** High · **Priority:** P0 · **Confidence:** 100%

**Impact:** Business High / SEO High / Technical Low / Content High

**Effort:** 3–4 hours

**Dependencies:** Must follow ISSUE-003 and ISSUE-001.

**Validation method:**
- `grep "^### "` on both files returns the same 8–10 FAQ headers.
- `grep "\\n"` on both files returns 0.
- AI scores on both languages within 10 points of each other and below 30%.
- Side-by-side EN/ES review confirms equivalent structure and tone.

---

### ISSUE-005 — Low CTR at striking-distance position

- [ ] **Low CTR (0.62%) at average position 34.4 despite 485 impressions.**

**Category:** SEO > Search Visibility

**Description:** GSC shows 485 impressions and only 2 clicks. The page is in striking distance (positions 30–40), but the SERP presentation and/or content depth are not compelling. The title-truncation bug has been fixed, so the remaining drivers are FAQ quality, structured-data eligibility, and content authority.

**Affected URLs:**
- https://stackpractices.com/recipes/api-documentation-openapi/
- https://stackpractices.com/es/recipes/api-documentation-openapi/

**Evidence:**
- GSC: 485 impressions, 2 clicks, 0.62% CTR, avg. position 34.4.
- SEARCH-VISIBILITY: "Expected CTR at position 34: ~1.5–2.5%. Actual CTR: 0.62%."
- GOOGLE-FORENSIC-SEO: "CTR gap: underperforming by approximately 3–4x."

**Source reports:** SEARCH-VISIBILITY, GOOGLE-FORENSIC-SEO, FORENSIC-AUDIT

**Severity:** High · **Priority:** P0 · **Confidence:** 100%

**Impact:** Business Critical / SEO Critical / Technical Low / Content High

**Effort:** Low (measurement after other fixes)

**Dependencies:** Requires ISSUE-002, ISSUE-003, and ISSUE-009.

**Validation method:**
- GSC Search Performance report shows CTR improvement 2–4 weeks after deployment.
- Target: 1.5–2.5% CTR at similar position.

---

### ISSUE-006 — Visible FAQ section truncated to 10 of 38 questions

- [ ] **Visible FAQ section only renders the first 10 of 38 questions.**

**Category:** UX / SEO > Content Surfacing

**Description:** The dedicated FAQ UI in `RecipeArticle.astro` slices the FAQ array to the first 10 entries. With 38 questions, 28 are hidden from the dedicated FAQ section (though they still appear in the article body). This should be removed after condensation so all retained questions are visible.

**Affected file:** `src/components/RecipeArticle.astro` (line 229: `faqs.slice(0, 10).map(...)`)

**Evidence:**
- GOOGLEBOT-AUDIT: "Only 3 of 38 FAQs are included in FAQPage JSON-LD; 10 are rendered in the visible FAQ section."
- `src/components/RecipeArticle.astro` line 229.

**Source reports:** GOOGLEBOT-AUDIT, FORENSIC-AUDIT

**Severity:** High · **Priority:** P0 · **Confidence:** 100%

**Impact:** Business Medium / SEO High / Technical Low / Content Medium

**Effort:** 30 minutes

**Dependencies:** Must follow ISSUE-003.

**Validation method:**
- Browser shows all 8–10 condensed FAQ questions in the dedicated FAQ section.
- No layout regression on mobile/tablet.

---

## High Priority Issues (P1)

### ISSUE-007 — Missing contextual internal links

- [ ] **Missing contextual internal links from the page body and inbound from the API cluster.**

**Category:** Internal Linking > Topical Authority

**Description:** The page has 9 `relatedResources` in frontmatter and 5 See Also links, but the main body lacks contextual links to related recipes. The API topic hub and `/recipes/rest-api-design/` do not appear to link back to this page.

**Affected files:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`
- `src/content/recipes/api/rest-api-design.md` and `.es.md`
- `src/data/topic-intros.ts` (to add a pillar link in the `api` topic intro)

**Evidence:**
- Content-Audit Phase 8 missing internal links table:
  - Versioning discussion → `/recipes/api-versioning/`
  - Rate limiting → `/recipes/api-rate-limiting-redis/`
  - `/recipes/rest-api-design/` → this page
  - `/topics/api/` → this page (topic hub generated by `src/pages/topics/[topic]/[...page].astro`)

**Source reports:** CONTENT-AUDIT, SEARCH-VISIBILITY

**Severity:** High · **Priority:** P1 · **Confidence:** 95%

**Impact:** Business Medium / SEO High / Technical Low / Content Medium

**Effort:** 1–2 hours

**Dependencies:** Should follow ISSUE-003 so anchor text matches the final content.

**Validation method:**
- Built HTML contains new contextual `<a>` tags.
- Link crawler returns 0 broken links.
- `/topics/api/` and `/recipes/rest-api-design/` link to this resource.

---

### ISSUE-008 — Missing practical content

- [ ] **Missing practical content: complete openapi.yaml, dependency installation, When Not to Use, and Swagger UI vs Redoc comparison.**

**Category:** Content > Practical Value

**Description:** The page is a tutorial but lacks the artifacts that make it immediately actionable: dependency install commands, a complete copy-paste `openapi.yaml`, a direct Swagger UI vs Redoc comparison, and a When Not to Use section.

**Affected files:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Evidence:**
- Content-Audit: "Missing: complete downloadable `openapi.yaml`, dependency installation instructions, expected output, 'When Not to Use' section, alternatives comparison."
- Content-Audit Code Samples score: 75/100.
- CONTENT-360: "No complete `openapi.yaml` example. No expected output shown."

**Source reports:** CONTENT-AUDIT, CONTENT-360

**Severity:** High · **Priority:** P1 · **Confidence:** 95%

**Impact:** Business High / SEO High / Technical Low / Content High

**Effort:** 3–4 hours

**Dependencies:** Should follow ISSUE-003 to avoid adding length before condensing.

**Validation method:**
- Built page contains new sections/tables.
- Manual review confirms commands are current and correct.
- No build errors from new frontmatter values.

---

### ISSUE-009 — High EN AI-detection score (50.9%)

- [ ] **High EN AI-detection score (50.9%) driven by FAQ mechanical patterns.**

**Category:** Content > Helpful Content

**Description:** The EN AI-detection score is 50.9%, with the top AI-flagged sentences concentrated in the FAQ (e.g., "Use the envelope in responses: .", "Webhooks are supported natively: ."). The mechanical "Use X. For Y: `code`." pattern is a strong scaled-content signal.

**Affected files:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Evidence:**
- `ai-detect-api-documentation-openapi.json`: model_ai_pct 50.9, top_ai_sentences dominated by FAQ fragments.
- CONTENT-360: "mechanical Q&A structure, repetitive question format, and lack of opinion or uncertainty."
- CONTENT-AUDIT: "The FAQ is the primary source of AI signals."

**Source reports:** ai-detect, CONTENT-360, CONTENT-AUDIT

**Severity:** High · **Priority:** P1 · **Confidence:** 95%

**Impact:** Business Medium / SEO High / Technical Low / Content Critical

**Effort:** 2–3 hours (combined with ISSUE-003)

**Dependencies:** Requires ISSUE-003 and ISSUE-004.

**Validation method:**
- Re-run AI detection; target EN <30%.
- Pattern checker returns 0 findings.
- Top AI sentences are no longer FAQ fragments.

---

### ISSUE-010 — Generic Open Graph image

- [ ] **Generic Open Graph image shared by every page.**

**Category:** Metadata > Social / UX

**Description:** `og:image` and `twitter:image` point to the same generic `/og-image.png` for every page, including this one. This reduces social share differentiation.

**Affected files:**
- `src/components/Seo.astro` (lines 304 and 310: `content={\`\${SITE.url}/og-image.png\`}`)
- `src/components/RecipeArticle.astro`

**Evidence:**
- `src/components/Seo.astro` lines 304 (`og:image`) and 310 (`twitter:image`).
- FORENSIC-AUDIT: "`og:image` is generic (`/og-image.png`) — no per-page or topic-specific image."

**Source reports:** GOOGLEBOT-AUDIT, FORENSIC-AUDIT

**Severity:** Medium · **Priority:** P1 · **Confidence:** 100%

**Impact:** Business Low / SEO Medium / Technical Low / Content Low

**Effort:** 2–3 hours

**Dependencies:** Requires design asset.

**Validation method:**
- Built HTML `<meta property="og:image">` points to new image.
- Image exists at the path and is 1200×630.

---

### ISSUE-011 — Weak author / EEAT signals

- [ ] **Author `Person` schema lacks `url` and `sameAs`, and recipe links to the authors listing instead of the author profile.**

**Category:** EEAT > Authority

**Description:** The `TechArticle` JSON-LD author object contains only `name`. The author has a full profile in `src/data/authors.json` with `url` and `sameAs`, but these are not emitted in the article schema. The recipe author link goes to `/authors/` instead of the specific author page (`/authors/mathias-paulenko/`).

**Affected files:**
- `src/lib/schema.ts`
- `src/components/RecipeArticle.astro`

**Evidence:**
- `src/lib/schema.ts` `techArticle` author object: `name: PRIMARY_AUTHOR.name`.
- `src/data/authors.json` contains `url` and `sameAs` (GitHub, LinkedIn).
- `src/components/RecipeArticle.astro` line 125 links to `/authors/`.
- GOOGLE-FORENSIC-SEO: "Missing: Author credentials, editorial note, author page link from article."

**Source reports:** GOOGLE-FORENSIC-SEO, GOOGLEBOT-AUDIT

**Severity:** High · **Priority:** P1 · **Confidence:** 95%

**Impact:** Business Medium / SEO Medium / Technical Low / Content Medium

**Effort:** 1 hour

**Dependencies:** None.

**Validation method:**
- Built JSON-LD `author` contains `url` and `sameAs`.
- Author link on the page points to `/authors/mathias-paulenko/`.
- Google Rich Results Test shows valid `Person` data.

---

## Medium Priority Issues (P2)

### ISSUE-012 — No images, diagrams, or screenshots

- [ ] **No images, diagrams, or screenshots on the page.**

**Category:** Content > Practical Value

**Description:** The page is text-only. A code-first vs design-first decision tree or a spec-to-docs workflow diagram would significantly improve comprehension, shareability, and backlink potential.

**Affected files:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`
- `public/` or `src/assets/` (new image)

**Evidence:**
- Content-Audit: "Images/Diagrams: 0."
- Content-Audit table: Images 20/100, Diagrams 10/100.
- CONTENT-360: "No images, diagrams, screenshots."

**Source reports:** CONTENT-AUDIT, CONTENT-360

**Severity:** Medium · **Priority:** P2 · **Confidence:** 100%

**Impact:** Business Medium / SEO Medium / Technical Low / Content Medium

**Effort:** 2–3 hours

**Dependencies:** Requires design asset.

**Validation method:**
- Built HTML contains `<img>` with alt text.
- Image loads correctly in the GitHub Pages output.

---

### ISSUE-013 — Variants table lacks trade-off guidance

- [ ] **Variants table lists tools but does not tell the reader when to choose each.**

**Category:** Content > User Value

**Description:** The existing Variants table has columns for Tool, Language, Approach, and Output. It is missing a "Choose this when" or trade-off column that helps readers make a decision.

**Affected files:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Evidence:**
- Content-Audit: "One table (Variants) with 5 rows. Useful but lacks a 'choose this when' column."

**Source reports:** CONTENT-AUDIT

**Severity:** Medium · **Priority:** P2 · **Confidence:** 95%

**Impact:** Business Low / SEO Medium / Technical Low / Content Medium

**Effort:** 30 minutes

**Dependencies:** None.

**Validation method:**
- Table renders correctly.
- New column contains accurate guidance for each tool.

---

### ISSUE-014 — `faq.json.ts` endpoints truncate FAQ schema to 3

- [ ] **`faq.json.ts` endpoints also truncate FAQ schema to the first 3 questions.**

**Category:** Technical > Structured Data

**Description:** The dedicated FAQ JSON endpoints (`/recipes/:slug/faq.json` and `/es/recipes/:slug/faq.json`) slice the extracted FAQ array to 3. This is a second hard-coded truncation and should be aligned with the main page schema.

**Affected files:**
- `src/pages/recipes/[slug]/faq.json.ts` (line 16)
- `src/pages/es/recipes/[slug]/faq.json.ts` (line 16)

**Evidence:**
- `src/pages/recipes/[slug]/faq.json.ts` line 16: `extractFaqs(entry.body ?? '').slice(0, 3)`.
- `src/pages/es/recipes/[slug]/faq.json.ts` line 16: same.

**Source reports:** Code inspection

**Severity:** Medium · **Priority:** P2 · **Confidence:** 100%

**Impact:** Business Low / SEO Medium / Technical Medium / Content Low

**Effort:** 15 minutes

**Dependencies:** Must follow ISSUE-002 and ISSUE-003.

**Validation method:**
- `curl https://stackpractices.com/recipes/api-documentation-openapi/faq.json` returns 8–10 FAQ pairs.

---

### ISSUE-015 — Missing topic gaps

- [ ] **Related topics (AsyncAPI, client generation, migration, governance) are only touched superficially or not at all.**

**Category:** Content > Topical Authority

**Description:** The page is a pillar candidate for the API documentation cluster but does not cover several adjacent intents that competitors address. Some are mentioned in the FAQ but are too thin.

**Affected files:** Future content; this page if expanded later.

**Evidence:**
- Content-Audit missing topics table: AsyncAPI, OpenAPI client generation, Swagger 2.0→3.1 migration, API spec governance.
- CONTENT-360: "No deep discussion of governance, migration, or multi-team workflow."

**Source reports:** CONTENT-AUDIT, CONTENT-360

**Severity:** Medium · **Priority:** P2 · **Confidence:** 85%

**Impact:** Business Medium / SEO Medium / Technical Low / Content Medium

**Effort:** 2–4 weeks (future roadmap, not part of immediate recovery)

**Dependencies:** None for this checklist; depends on new content creation.

**Validation method:**
- New recipes/guides are created and linked from this page.
- Topic cluster is updated in site roadmap.

---

## False Positives and Non-Issues

These were observed but are not problems for this resource:

- **Title truncation** — already fixed. `Seo.astro` now preserves the full title for this 56-character title.
- **Astro SSG static rendering** — correct. Content, links, and JSON-LD are in the raw HTML without JavaScript execution.
- **Canonical, hreflang, and sitemap** — correct. All use trailing slashes, are self-canonical, and are bidirectional EN/ES.
- **robots.txt** — permissive, no crawl blocks.
- **Indexability** — no `noindex`, no soft 404, page is in build output.
- **Rendering dependency** — 0%. No hydration, no client-side content injection.
- **Bilingual pair** — EN and ES exist and are valid alternates.
- **9 relatedResources** — resolve to existing slugs with trailing slashes via `resolveRelated` in `lib/content.ts`.
- **Meta description** — 154 characters, within the 170-character limit.

---

## Manual Validation Required

- **ISSUE-005** — Confirm CTR improvement in GSC 2–4 weeks after deployment. If no lift, test a stronger meta description.
- **ISSUE-010** — Approve or create the topic-specific OG image design.
- **ISSUE-012** — Approve or create the workflow diagram SVG.
- **ISSUE-015** — Decide which topic gaps to cover as new pages vs. expanding this page.

---

## Suggested Order of Execution

**Phase 1 — Content foundation (do first):**
- ISSUE-003: Condense FAQ to 8–10 questions.
- ISSUE-001: Repair EN FAQ code formatting.
- ISSUE-004: Sync EN/ES parity.
- ISSUE-009: Humanize and reduce AI signal.

**Phase 2 — Structured data and UI:**
- ISSUE-002: Expand JSON-LD FAQPage.
- ISSUE-006: Expand visible FAQ section.
- ISSUE-014: Align `faq.json.ts` endpoints.

**Phase 3 — Authority and practical value:**
- ISSUE-007: Add contextual internal links.
- ISSUE-008: Add practical content (deps, full spec, comparison, When Not to Use).
- ISSUE-011: Strengthen author/EEAT signals.

**Phase 4 — Polish and assets:**
- ISSUE-010: Topic-specific OG image.
- ISSUE-012: Images/diagrams.
- ISSUE-013: Variants table trade-off guidance.

**Phase 5 — Roadmap:**
- ISSUE-015: Plan and create related topic pages.

**Monitor / validate:**
- ISSUE-005: GSC CTR and position trends.

---

## Evidence Reference

| File / Tool | Key Evidence |
|---|---|
| `src/content/recipes/api/api-documentation-openapi.md` | 38 FAQ `###` headers, 788 literal `\n` matches. |
| `src/content/recipes/api/api-documentation-openapi.es.md` | 1,736 lines, 0 literal `\n`, fenced code blocks. |
| `src/components/RecipeArticle.astro` lines 82, 229 | `faqPage(faqs.slice(0, 3))` and `faqs.slice(0, 10).map(...)`. |
| `src/lib/content.ts` lines 27–78 | `extractFaqs` with `maxFaqs = 10` and `clean` that strips backticks/newlines. |
| `src/pages/recipes/[slug]/faq.json.ts` line 16 | `extractFaqs(...).slice(0, 3)`. |
| `src/components/Seo.astro` line 310 | Generic `og:image` (`/og-image.png`). |
| `src/lib/schema.ts` `techArticle` | Author object only contains `name`. |
| `src/data/authors.json` | Author has `url` and `sameAs` not used in article schema. |
| GSC | 485 impressions, 2 clicks, 0.62% CTR, position 34.4. |
| `ai-detect-api-documentation-openapi.json` | EN 50.9% AI, top sentences from FAQ. |
| `content-quality-score-api-documentation-openapi.json` | Composite 90.2, ai-human 57.5 EN / 63.7 ES. |

---

*This master checklist was regenerated for `api-documentation-openapi` on StackPractices. It contains no legacy Angular or qapractices findings; every issue is supported by evidence from the source files or the existing resource-specific audits.*
