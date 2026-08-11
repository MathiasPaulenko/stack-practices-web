# Resource Recovery Protocol — `api-documentation-openapi`

**Protocol version:** 1.0  
**Scope:** Single resource (not site-wide)  
**Resource:** `api-documentation-openapi` (recipe)  
**Author:** Mathias Paulenko  
**Site:** StackPractices — Astro 5+ SSG, Tailwind CSS v4+, GitHub Pages, bilingual EN/ES  
**EN URL:** https://stackpractices.com/recipes/api-documentation-openapi/  
**ES URL:** https://stackpractices.com/es/recipes/api-documentation-openapi/  
**Source files:**
- `src/content/recipes/api/api-documentation-openapi.md` (EN, 360 lines)
- `src/content/recipes/api/api-documentation-openapi.es.md` (ES, 1,736 lines)
- `src/components/RecipeArticle.astro`
- `src/lib/content.ts`
- `src/pages/recipes/[slug]/faq.json.ts`
- `src/pages/es/recipes/[slug]/faq.json.ts`

**GSC data (last 28 days):** 485 impressions, 2 clicks, 0.62% CTR, avg. position 34.4, +472 impression delta  
**AI detection (desklib):** EN 50.9%, ES 38.6%, 0 pattern findings  
**Scores observed:**
- Forensic score: 72/100
- SEO-360: 69/100
- Content-360 / Content-Audit: 72/100
- Content-quality composite: 90.2/100

**Audit inputs consumed:**
- `ref/output/FORENSIC-AUDIT-api-documentation-openapi.md`
- `ref/output/GOOGLEBOT-AUDIT-api-documentation-openapi.md`
- `ref/output/GOOGLE-FORENSIC-SEO-api-documentation-openapi.md`
- `ref/output/SEARCH-VISIBILITY-api-documentation-openapi.md`
- `ref/output/CONTENT-AUDIT-api-documentation-openapi.md`
- `ref/output/CONTENT-360-api-documentation-openapi.md`
- `ref/output/SEO-360-api-documentation-openapi.md`
- `ref/output/ai-detect-api-documentation-openapi.json`
- `ref/output/ai-detect-patterns-api-documentation-openapi.json`
- `ref/output/ai-detect-patterns-api-documentation-openapi-es.json`
- `ref/output/content-quality-score-api-documentation-openapi.json`

---

## 1. Executive Summary

`api-documentation-openapi` is a **high-impression, low-CTR, striking-distance resource**. It has solid technical infrastructure (Astro SSG, static HTML, self-canonical URLs, correct hreflang, valid JSON-LD, sitemap inclusion) and the SERP title-truncation bug has already been fixed. The remaining blockers are concentrated in the **FAQ section** and in **EN/ES parity**:

1. **EN FAQ code rendering is broken.** 38 questions use inline code spans with literal `\n` characters instead of fenced code blocks (`grep "\\n" src/content/recipes/api/api-documentation-openapi.md` = 788 matches; 0 matches in the ES file).
2. **JSON-LD FAQPage is truncated.** Only 3 of 38 FAQs reach the schema (`RecipeArticle.astro` line 82 `faqPage(faqs.slice(0, 3))`). The dedicated FAQ section on the page also truncates to 10 (`RecipeArticle.astro` line 229 `faqs.slice(0, 10)`).
3. **FAQ monolith / thin content.** The FAQ accounts for ~74% of the word count but delivers ~21% information density, contains repetitive reference snippets, and is the primary source of the 50.9% AI-detection score.
4. **EN/ES divergence.** The ES version uses proper fenced code blocks, is more humanized (38.6% AI vs 50.9% EN), and is structurally different (1,736 lines vs 360).
5. **Low CTR.** 0.62% at position 34.4, after the title fix, indicates the snippet/content depth still underperforms.

**Recovery goal:** Condense the FAQ to 8–10 high-impact questions, reformat all retained code to fenced code blocks, synchronize EN and ES, expand JSON-LD to include every condensed FAQ, improve internal linking, and reduce AI-like phrasing. Expected outcomes: CTR rises to 1.5–2.5% over 2–4 weeks, position improves toward 20–30, and the page becomes eligible for FAQ rich results.

---

## 2. Phase 1 — Load and Clean the Master Backlog

The existing audits for this resource list the same underlying problems with different names. Consolidated working backlog (IDs are resource-specific):

| ID | Issue | Primary source |
|---|---|---|
| SP-OAPI-001 | EN FAQ code rendering broken — literal `\n` in inline code | Content-Audit, Forensic, GOOGLEBOT |
| SP-OAPI-002 | JSON-LD FAQPage only 3 of 38 questions | GOOGLE-FORENSIC-SEO, GOOGLEBOT |
| SP-OAPI-003 | FAQ monolith — 38 shallow, repetitive questions, thin content | Content-Audit, CONTENT-360, ai-detect |
| SP-OAPI-004 | EN/ES parity divergence | Content-Audit, ai-detect, Forensic |
| SP-OAPI-005 | Low CTR (0.62%) at position 34.4 | GSC, SEARCH-VISIBILITY |
| SP-OAPI-006 | Visible FAQ section only 10 of 38 questions | GOOGLEBOT, RecipeArticle.astro |
| SP-OAPI-007 | Missing contextual internal links | Content-Audit |
| SP-OAPI-008 | Missing practical content (complete spec, deps, comparison, When Not to Use) | Content-Audit, CONTENT-360 |
| SP-OAPI-009 | High EN AI-detection score (50.9%) | ai-detect, CONTENT-360 |
| SP-OAPI-010 | Generic Open Graph image for every page | GOOGLEBOT, Seo.astro |
| SP-OAPI-011 | Weak EEAT / author authority signals | GOOGLE-FORENSIC-SEO |
| SP-OAPI-012 | No images, diagrams, or screenshots | Content-Audit, CONTENT-360 |
| SP-OAPI-013 | Variants table lacks trade-off guidance | Content-Audit |
| SP-OAPI-014 | `faq.json.ts` endpoints also truncate FAQ schema to 3 | Code inspection |
| SP-OAPI-015 | Missing topic gaps (AsyncAPI, governance) | Content-Audit |

**Already fixed / non-regressions to preserve:**
- Title truncation bug (Seo.astro was refactored; built HTML now renders full title).
- Astro SSG static rendering (0% JS dependency for content/links/schema).
- Canonical, hreflang, sitemap, and trailing-slash consistency.
- robots.txt permissive, indexable, no noindex.

---

## 3. Phase 2 — Prioritization

Order is determined by: (1) whether the issue blocks other fixes, (2) SEO/CTR impact, (3) technical risk, (4) effort.

**P0 — Critical, do first:**
1. SP-OAPI-003 FAQ monolith condense
2. SP-OAPI-001 EN FAQ code reformatting
3. SP-OAPI-004 EN/ES parity sync
4. SP-OAPI-002 JSON-LD FAQ expansion
5. SP-OAPI-006 Visible FAQ section expansion
6. SP-OAPI-005 Low CTR (measured after fixes)

**P1 — High, next:**
7. SP-OAPI-009 AI-detection reduction
8. SP-OAPI-007 Contextual internal linking
9. SP-OAPI-008 Practical content additions
10. SP-OAPI-010 Page-specific OG image
11. SP-OAPI-011 Author/EEAT signals

**P2 — Medium, after P0/P1:**
12. SP-OAPI-012 Images/diagrams
13. SP-OAPI-013 Variants table trade-off guidance
14. SP-OAPI-014 `faq.json.ts` endpoint alignment
15. SP-OAPI-015 Future topic gap content

---

## 4. Phase 3 — Root Cause Analysis

| Issue | Root Cause | Affected Files | Side Effects If Left Untreated |
|---|---|---|---|
| SP-OAPI-001 | EN FAQ was generated/ported as one-paragraph answers with inline code spans. The literal `\n` strings are source text, not Markdown line breaks. | `api-documentation-openapi.md` | Unreadable output, low time-on-page, high bounce, parity gap. |
| SP-OAPI-002 | `RecipeArticle.astro` hard-codes `faqPage(faqs.slice(0, 3))`. `lib/content.ts` `extractFaqs` defaults `maxFaqs = 10` and further truncates/cleans answers. | `RecipeArticle.astro`, `lib/content.ts`, `faq.json.ts` | Only 3 FAQs eligible for rich results; Google sees mismatch with visible content. |
| SP-OAPI-003 | Bulk FAQ generation created 38 reference-level questions with one-sentence answers. The section grew to ~74% of word count but ~21% information density. | `api-documentation-openapi.md`, `.es.md` | Thin-content / scaled-content signal, low authority, dilutes main body. |
| SP-OAPI-004 | EN and ES were edited independently. EN uses inline `\n` snippets; ES uses fenced code blocks and first-person phrasing. | `api-documentation-openapi.md`, `.es.md` | Bilingual inconsistency, duplicate maintenance, quality gap. |
| SP-OAPI-005 | Position 34.4 + broken title history (now fixed) + shallow FAQ snippet = users do not click. | SERP + on-page content | Stagnant traffic despite impression growth. |
| SP-OAPI-006 | `RecipeArticle.astro` line 229 uses `faqs.slice(0, 10)`, hiding 28 FAQs from the dedicated FAQ UI. | `RecipeArticle.astro` | Readers miss questions; only the first 10 are surfaced as Q&A. |

---

## 5. Phase 4 — Implementation Plan

### SP-OAPI-003 — Condense FAQ to 8–10 high-impact questions

**Problem:** 38 shallow questions dominate the page and create a thin-content signal.

**Evidence:**
- `api-documentation-openapi.md` contains 38 `###` FAQ headers from line 177 to 339 (source `grep "^### "`).
- Content-Audit: FAQ ~3,800 words (~74% of total) with 21% information density.
- `redocly lint` appears 8+ times; rate-limiting headers appear in 3 separate questions.

**Root Cause:** Bulk reference-snippets generated without editorial curation.

**Recommended fix:** Merge, remove, or redirect-to-other-content the low-value questions. Keep the highest-intent questions that map to search queries for this resource:

1. Should I use code-first or design-first?
2. How do I document an API with OpenAPI?
3. How do I keep documentation in sync with deployed code?
4. How do I validate OpenAPI specs in CI?
5. How do I document authentication and authorization?
6. How do I handle versioning in OpenAPI specs?
7. How do I generate client SDKs from OpenAPI?
8. How do I choose between Swagger UI and Redoc?

**Implementation steps:**
1. Create a new markdown outline with the selected 8 questions.
2. For each kept question, write 2–4 sentences of guidance plus a fenced code block (if code is needed).
3. Delete the other 30 questions (or move unique fragments to future dedicated recipes: webhooks, SSE, API gateways, Kafka, etc.).
4. Update `lastUpdated` in frontmatter.

**Files to modify:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Dependencies:** None.

**Validation method:**
- `grep "^### "` returns 8 FAQ headers + 3 solution headers (11 total).
- `wc -w` shows FAQ section under ~1,000 words.
- Astro build passes with no schema errors.
- Manual read confirms each answer explains *why*, not just *what*.

**Rollback plan:** Restore from Git commit before FAQ rewrite.

**Estimated time:** 4–6 hours.

**Expected impact:** Removes the primary thin-content/AI signal; raises information density; lets JSON-LD include all FAQs without bloat.

---

### SP-OAPI-001 — Repair EN FAQ code rendering

**Problem:** Inline code spans contain literal `\n` instead of proper fenced code blocks.

**Evidence:**
- `grep "\\n" src/content/recipes/api/api-documentation-openapi.md` = 788 matches.
- `grep "\\n" src/content/recipes/api/api-documentation-openapi.es.md` = 0 matches.
- Sample source line 197: `In GitHub Actions: \`name: Generate OpenAPI Spec\non: push...\n  spec:\n    runs-on...\``.

**Root Cause:** Code was inserted as escaped single-line strings inside backticks.

**Recommended fix:** While rewriting the condensed FAQ (SP-OAPI-003), replace every multi-line snippet with a fenced code block using the correct language (`yaml`, `json`, `bash`, `python`, `java`, `javascript`). Remove the literal `\n` escape sequences. Keep one-line inline terms (e.g., `openapi-generator-cli`) inside backticks.

**Implementation steps:**
1. For each retained FAQ answer, identify code and choose the correct fenced language.
2. Rewrite the prose to introduce the code, then place the code in a fenced block.
3. Run a search for the literal string `\n` inside `api-documentation-openapi.md` and resolve any remaining occurrences.

**Files to modify:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md` (verify consistency)

**Dependencies:** SP-OAPI-003 (condensation) should happen first or in the same edit pass.

**Validation method:**
- `grep "\\n" src/content/recipes/api/api-documentation-openapi.md` returns 0.
- Built HTML shows `<pre><code class="language-yaml">...</code></pre>` for multi-line snippets.
- Visual check in browser: code is readable with line breaks, not `
` text.

**Rollback plan:** Git revert.

**Estimated time:** 2–3 hours (combined with condensation).

**Expected impact:** Restores readability, fixes EN/ES formatting parity, and allows `extractFaqs` to produce clean JSON-LD answers.

---

### SP-OAPI-004 — Synchronize EN and ES versions

**Problem:** EN and ES have different formatting, length, and humanization levels.

**Evidence:**
- EN: 360 lines; ES: 1,736 lines.
- EN AI: 50.9%; ES AI: 38.6%.
- ES uses fenced code blocks and first-person phrasing (`Yo uso`, `En mi experiencia`); EN uses mechanical reference snippets.

**Root Cause:** Independent editing and different generation quality.

**Recommended fix:** After condensing and reformatting EN, translate the new EN structure to ES. Keep the same 8 questions, same code samples, and same first-person voice. The ES should remain a full humanized translation, not a literal back-translation.

**Implementation steps:**
1. Finalize EN condensed FAQ.
2. Update ES with the same 8 questions and matching H3 titles (`¿Debería usar...?`, `¿Cómo documento...?`).
3. Translate each answer into first-person Spanish with the same depth.
4. Use fenced code blocks in ES as well.

**Files to modify:**
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Dependencies:** SP-OAPI-003, SP-OAPI-001.

**Validation method:**
- Line count difference narrows (both have similar code-block line counts).
- `grep "^### "` on both files returns the same 8 FAQ headers (plus language H3s).
- AI re-check on EN aims <30%; ES stays <30%.

**Rollback plan:** Git revert.

**Estimated time:** 3–4 hours.

**Expected impact:** Bilingual consistency, better user experience, reduced AI signal in EN.

---

### SP-OAPI-002 — Expand JSON-LD FAQPage to all condensed FAQs

**Problem:** Only 3 of 38 FAQs are included in the FAQPage JSON-LD.

**Evidence:**
- `src/components/RecipeArticle.astro` line 82: `jsonLd.push(faqPage(faqs.slice(0, 3)));`
- GOOGLEBOT audit: "38 FAQ entries in the markdown source, but only 3 are included in FAQPage JSON-LD."

**Root Cause:** Hard-coded slice in the shared component.

**Recommended fix:** Remove the `slice(0, 3)` from `RecipeArticle.astro`. Rely on `extractFaqs` to cap the count (it already defaults to `maxFaqs = 10`). With the FAQ condensed to 8 questions, all 8 will appear in JSON-LD. Also remove the redundant slice in the FAQ JSON endpoints.

**Implementation steps:**
1. Change `RecipeArticle.astro` line 82 to `jsonLd.push(faqPage(faqs));`.
2. Optionally change `RecipeArticle.astro` line 229 visible FAQ from `faqs.slice(0, 10)` to `faqs` if the condensed count is ≤10.
3. Change `src/pages/recipes/[slug]/faq.json.ts` line 16 and `src/pages/es/recipes/[slug]/faq.json.ts` line 16 from `extractFaqs(...).slice(0, 3)` to `extractFaqs(...)`.
4. Verify `lib/content.ts` `extractFaqs` default `maxFaqs = 10` is still appropriate. If a resource ever needs more than 10 FAQs, make `maxFaqs` configurable per resource, but for this recovery keep it at 10 and rely on condensation.

**Files to modify:**
- `src/components/RecipeArticle.astro`
- `src/pages/recipes/[slug]/faq.json.ts`
- `src/pages/es/recipes/[slug]/faq.json.ts`

**Dependencies:** SP-OAPI-003 (must condense first so that `faqs.length ≤ 10`).

**Validation method:**
- Built HTML contains 8 `Question`/`Answer` pairs inside the `FAQPage` JSON-LD.
- Google Rich Results Test shows the FAQPage with no errors.
- `src/pages/recipes/[slug]/faq.json.ts` GET endpoint returns 8 FAQs.

**Rollback plan:** Re-add `.slice(0, 3)`.

**Estimated time:** 1 hour.

**Expected impact:** 100% FAQ schema coverage; eligibility for FAQ rich results; consistent signal to Google.

---

### SP-OAPI-006 — Expand visible FAQ section

**Problem:** The dedicated FAQ UI only renders the first 10 questions.

**Evidence:**
- `src/components/RecipeArticle.astro` line 229: `{faqs.slice(0, 10).map(...)}`

**Root Cause:** Same hard-coded slice as SP-OAPI-002.

**Recommended fix:** Remove the slice so the visible FAQ component matches the condensed set and the JSON-LD.

**Implementation steps:**
1. Change line 229 to `{faqs.map(...)}` (no slice).
2. If the component is shared across all recipes, verify that other recipes either already have ≤10 FAQs or are also being condensed. If not, make the limit a prop with a default of 10 and override for this resource.

**Files to modify:**
- `src/components/RecipeArticle.astro`

**Dependencies:** SP-OAPI-003.

**Validation method:**
- Browser shows all 8 FAQ questions in the dedicated FAQ section.
- No layout regression on mobile.

**Rollback plan:** Re-add slice.

**Estimated time:** 30 minutes.

**Expected impact:** All valuable FAQs are visible and shareable as anchor links.

---

### SP-OAPI-005 — Low CTR monitoring and follow-up

**Problem:** 0.62% CTR at position 34.4, far below 1.5–2.5% expected.

**Evidence:**
- GSC: 485 impressions, 2 clicks, 0.62% CTR, avg. position 34.4.
- SEARCH-VISIBILITY: "Rising impressions, stagnant clicks."

**Root Cause:** Compound of (now fixed) title truncation + shallow FAQ + schema mismatch. This is the **measurement target**, not a code fix by itself.

**Recommended fix:** After P0 fixes, request re-indexing in GSC and monitor. If CTR does not improve within 4 weeks, revisit meta description and add FAQ rich results.

**Implementation steps:**
1. Wait 2–4 weeks after deployment.
2. Compare new GSC CTR vs baseline.
3. If CTR <1%, test a stronger meta description that includes a clear value proposition (e.g., "copy-paste OpenAPI examples for FastAPI, Express, Spring Boot").

**Files to modify:** None unless meta description test is needed.

**Dependencies:** SP-OAPI-001 through SP-OAPI-004.

**Validation method:**
- GSC Search Performance report: CTR and position trend.
- Google Rich Results Test: FAQ rich result eligibility.

**Rollback plan:** Revert meta description if tested and worse.

**Estimated time:** 15 minutes for re-indexing request; 2–4 weeks for measurement.

**Expected impact:** CTR lift to 1.5–2.5%; clicks rise from 2 to 7–12 per 28 days if position holds.

---

### SP-OAPI-009 — Reduce AI-detection footprint

**Problem:** EN AI detection 50.9%; the FAQ is the primary source of AI-like sentences.

**Evidence:**
- `ai-detect-api-documentation-openapi.json`: top AI sentences include "Use the envelope in responses: .", "Webhooks are supported natively: .", "For Python with httpx: ." — all from the FAQ.
- CONTENT-360: "mechanical Q&A structure, repetitive question format, and lack of opinion."

**Root Cause:** Bulk reference snippets without first-person experience or uncertainty.

**Recommended fix:** Humanize each retained FAQ answer with first-person framing, concrete trade-offs, and a clear opinion. Examples:
- "I usually reach for code-first with FastAPI or SpringDoc when a single team owns the API."
- "Design-first is the safer bet when frontend, mobile, and backend have to agree before code."
- "If you skip contract tests, design-first becomes a wishlist; I've seen specs stay aspirational while the code drifts."

**Implementation steps:**
1. During SP-OAPI-003/004 rewrite, add first-person statements to each answer.
2. Replace generic "Use X. For Y: `code`." with "I use X when … because … `code`.
3. Remove empty fragments such as "For Apigee: import the spec: ." (sentences with no object after the colon).

**Files to modify:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Dependencies:** SP-OAPI-003, SP-OAPI-001, SP-OAPI-004.

**Validation method:**
- Re-run desklib or equivalent AI-detection tool; target EN <30%.
- Pattern checker returns 0 findings.
- Top AI sentences no longer dominated by FAQ fragments.

**Rollback plan:** Git revert.

**Estimated time:** 2–3 hours (part of FAQ rewrite).

**Expected impact:** Lower AI signal; higher helpful-content score; stronger EEAT.

---

### SP-OAPI-007 — Add contextual internal links

**Problem:** Only 9 `relatedResources` links in frontmatter and 5 body links in See Also; no in-body contextual links.

**Evidence:**
- Content-Audit Phase 8 missing internal links:
  - Versioning discussion → `/recipes/api-versioning/`
  - Rate limiting mention → `/recipes/api-rate-limiting-redis/`
  - `/recipes/rest-api-design/` → this page
  - `/topics/api/` → this page

**Recommended fix:** Add 2–3 in-body contextual links from relevant sections and ensure the topic hub and `/recipes/rest-api-design/` link to this page.

**Implementation steps:**
1. In `api-documentation-openapi.md` Explanation and FAQ sections, add Markdown links to `api-versioning` and `api-rate-limiting-redis` where versioning/rate limiting are discussed.
2. Add this resource to the `relatedResources` or body of `rest-api-design` and the API topic hub if not already present.

**Files to modify:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`
- `src/content/recipes/api/rest-api-design.md` and `.es.md`
- `src/data/topic-intros.ts` (to feature this page in the `api` topic hub intro; topic hub rendered by `src/pages/topics/[topic]/[...page].astro`)

**Dependencies:** SP-OAPI-003 (anchor text depends on final FAQ content).

**Validation method:**
- `npm run build` and link-crawl script returns 0 broken links.
- Built HTML shows new `<a>` tags in context.

**Rollback plan:** Remove added links.

**Estimated time:** 1–2 hours.

**Expected impact:** Better cluster authority; more crawl paths; improved topical relevance.

---

### SP-OAPI-008 — Add practical content

**Problem:** Missing complete spec example, dependency installation, comparison table, and When Not to Use.

**Evidence:**
- Content-Audit Phase 3/Phase 9: "Missing complete downloadable `openapi.yaml`, dependency installation instructions, expected output, 'When Not to Use' section, alternatives comparison."
- Code Samples score 75/100 because dependencies are not shown.

**Recommended fix:**
1. Add a "When NOT to Use" H2 with 2–3 bullets (small internal API, no consumer, static docs sufficient).
2. Add dependency installation snippets under each language solution:
   - `pip install fastapi uvicorn`
   - `npm install swagger-ui-express yamljs`
   - Maven `springdoc-openapi-starter-webmvc-ui`
3. Add a "Swagger UI vs Redoc" comparison table in Explanation or Variants.
4. Add a complete `openapi.yaml` example as a downloadable/fenced block at the end of Solution.

**Files to modify:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Dependencies:** SP-OAPI-003/SP-OAPI-001 (FAQ must be condensed before adding body content to avoid page bloat).

**Validation method:**
- Built page contains new H2 and tables.
- Manual review confirms commands are current and correct.
- No build errors from new frontmatter `topics` values.

**Rollback plan:** Git revert.

**Estimated time:** 3–4 hours.

**Expected impact:** Higher practical value; stronger search-intent match; increased bookmark/share likelihood.

---

### SP-OAPI-010 — Page-specific or topic-specific Open Graph image

**Problem:** `og:image` and `twitter:image` point to the generic `/og-image.png` for every page.

**Evidence:**
- `src/components/Seo.astro` line 310: `content={\`\${SITE.url}/og-image.png\`}`.
- Forensic audit: "`og:image` is generic — no per-page or topic-specific image."

**Recommended fix:** For this recovery, at minimum add a topic-specific image for `api` (e.g., `og-image-api.png`). Long-term, generate per-page OG images.

**Implementation steps:**
1. Create `public/og-image-api.png` (1200×630) with OpenAPI/Swagger/Redoc branding.
2. Update `Seo.astro` to use a per-page `ogImage` prop, falling back to topic-specific image.
3. Pass `ogImage` from `RecipeArticle.astro` or the page data.

**Files to modify:**
- `public/og-image-api.png` (new)
- `src/components/Seo.astro`
- `src/components/RecipeArticle.astro`

**Dependencies:** Design asset availability.

**Validation method:**
- Built HTML `<meta property="og:image">` points to new image.
- Image exists at the path and is 1200×630.

**Rollback plan:** Revert to generic image.

**Estimated time:** 2–3 hours.

**Expected impact:** Better social differentiation; minor CTR/social share lift.

---

### SP-OAPI-011 — Strengthen author/EEAT signals

**Problem:** `TechArticle` author is a bare `Person` with only `name`. The page links to the generic `/authors/` listing, not the author profile.

**Evidence:**
- `src/lib/schema.ts` `techArticle` author object: `name: PRIMARY_AUTHOR.name` only.
- `src/data/authors.json` contains `url`, `sameAs` (GitHub, LinkedIn), and bio, but they are not surfaced in the article schema or link.
- GOOGLE-FORENSIC-SEO: "Missing: Author credentials, editorial note, author page link from article."

**Recommended fix:**
1. Update `techArticle` schema to include `url` and `sameAs` for the author.
2. In `RecipeArticle.astro`, change the author link from `/authors/` to `/authors/mathias-paulenko/` (and ES equivalent).

**Files to modify:**
- `src/lib/schema.ts`
- `src/components/RecipeArticle.astro`

**Dependencies:** None.

**Validation method:**
- Built JSON-LD `author` object contains `url` and `sameAs`.
- Author link targets the correct profile page.

**Rollback plan:** Revert schema and link.

**Estimated time:** 1 hour.

**Expected impact:** Stronger E-E-A-T; aligned with Google’s author-ranking signals.

---

### SP-OAPI-012 — Add diagrams or screenshots

**Problem:** No images, diagrams, or screenshots.

**Evidence:**
- Content-Audit: "No images. A code-first vs design-first decision tree or a spec-to-docs workflow diagram would add value."
- Images score 20/100.

**Recommended fix:** Add one SVG diagram showing the spec-to-docs workflow (write spec → lint → publish → Swagger UI/Redoc). Place it in Explanation or Key Takeaways.

**Files to modify:**
- `public/assets/content/` or `src/assets/` (new image)
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Dependencies:** Design asset availability.

**Validation method:**
- Built HTML contains `<img>` with alt text.
- Image loads on GitHub Pages path.

**Rollback plan:** Remove image tag.

**Estimated time:** 2–3 hours.

**Expected impact:** Improved comprehension and shareability; long-term backlink potential.

---

### SP-OAPI-013 — Improve Variants table with trade-off guidance

**Problem:** Variants table lists tools but does not tell the reader when to choose each.

**Evidence:**
- Content-Audit: "One table (Variants) with 5 rows. Useful but lacks a 'choose this when' column."

**Recommended fix:** Add a "Choose this when" column to the existing table.

**Files to modify:**
- `src/content/recipes/api/api-documentation-openapi.md`
- `src/content/recipes/api/api-documentation-openapi.es.md`

**Dependencies:** None.

**Validation method:**
- Table renders correctly in built HTML.
- Manual review confirms guidance is accurate.

**Estimated time:** 30 minutes.

**Expected impact:** Better decision-making; stronger search-intent match.

---

### SP-OAPI-014 — Align `faq.json.ts` endpoints

**Problem:** The dedicated `faq.json` endpoints also slice to the first 3 FAQs.

**Evidence:**
- `src/pages/recipes/[slug]/faq.json.ts` line 16: `extractFaqs(entry.body ?? '').slice(0, 3)`
- `src/pages/es/recipes/[slug]/faq.json.ts` line 16: same.

**Recommended fix:** Remove `.slice(0, 3)` from both endpoints. Rely on `extractFaqs` default max of 10; with condensed FAQ, all 8 will be returned.

**Files to modify:**
- `src/pages/recipes/[slug]/faq.json.ts`
- `src/pages/es/recipes/[slug]/faq.json.ts`

**Dependencies:** SP-OAPI-003.

**Validation method:**
- `curl /recipes/api-documentation-openapi/faq.json` returns 8 FAQ pairs.

**Estimated time:** 15 minutes.

**Expected impact:** Consistent FAQ data for any downstream consumer (Pagefind, API, future AI context).

---

### SP-OAPI-015 — Plan future topic gaps

**Problem:** Several related intents are not covered on this page or elsewhere in the cluster.

**Evidence:**
- Content-Audit missing topics: AsyncAPI, governance, client generation, migration 2.0→3.1.

**Recommended fix:** Create new recipes/guides or expand this page later. Do not block P0 recovery.

**Files to modify:** Future content only.

**Dependencies:** None for this recovery.

**Validation method:** Roadmap tracking.

**Estimated time:** N/A (planning only).

**Expected impact:** Long-term topical authority.

---

## 6. Phase 5 — Implementation Sequence

Do **one change at a time**, build, validate, then commit. Recommended order:

1. **SP-OAPI-003 + SP-OAPI-001 + SP-OAPI-004** (content rewrite, EN and ES). This is one coordinated editorial pass.
2. **Build + visual QA** — run `npm run build`, open the built page, and confirm FAQ section is readable.
3. **SP-OAPI-002 + SP-OAPI-006 + SP-OAPI-014** (component/endpoint changes) to expose all 8 FAQs in JSON-LD and UI.
4. **SP-OAPI-009** (humanization pass) as part of the same content edit or a follow-up.
5. **SP-OAPI-007** (internal links).
6. **SP-OAPI-008** (practical content additions).
7. **SP-OAPI-011** (author schema/link).
8. **SP-OAPI-010 + SP-OAPI-012 + SP-OAPI-013** (assets and table improvements).
9. **Final build, regression test, GSC re-index request, GSC monitoring**.

---

## 7. Phase 6 — Validation

After each fix, validate the following for this resource:

| Area | Check | Tool / Method |
|---|---|---|
| Content | FAQ count = 8 + 3 solution H3s | `grep "^### " src/content/recipes/api/api-documentation-openapi.md` |
| Content | Literal `\n` removed | `grep "\\n" src/content/recipes/api/api-documentation-openapi.md` returns 0 |
| Content | No generic/templated sentence fragments | Manual read + pattern checker |
| Content | First-person guidance present | Manual read |
| Build | `npm run build` passes | CLI |
| Build | No schema/Zod errors | CLI output |
| SEO | Title, meta, canonical, hreflang correct | Built HTML `<head>` inspection |
| SEO | JSON-LD contains 8 FAQ pairs | Built HTML search for `"@type": "Question"` |
| SEO | FAQPage passes Google Rich Results Test | https://search.google.com/test/rich-results |
| SEO | Open Graph image updated (if SP-OAPI-010 done) | Built HTML `<meta property="og:image">` |
| Rendering | All content in static HTML, no JS dependency | `curl` raw HTML, compare to rendered |
| Links | No broken internal or external links | Link crawler |
| Parity | EN and ES have the same 8 FAQ questions | `grep "^### "` on both files |
| Performance | LCP, CLS, INP within targets | Lighthouse or WebPageTest |

---

## 8. Phase 7 — Regression Testing

After the full recovery, verify nothing else broke:

1. **Navigation:** `/recipes/`, `/topics/api/`, `/tags/api/`, and the recipe detail page all load.
2. **Internal linking:** 9 relatedResources still resolve; new contextual links resolve.
3. **Rendering:** View the page with JavaScript disabled; all article content, FAQ, and schema must be present.
4. **Structured data:** Validate the full `@graph` JSON-LD with Schema Markup Validator or Google Rich Results Test.
5. **Hreflang:** EN and ES alternate tags still present with trailing slashes.
6. **Sitemap:** The resource is still included in `sitemap.xml`.
7. **Other recipes:** Because `RecipeArticle.astro` and `lib/content.ts` are shared, spot-check 5–10 other recipe pages to confirm their FAQ rendering and schema are still correct. If any other recipe has >10 FAQs, decide whether to condense it too or to keep a per-resource cap.
8. **Build time:** Confirm `npm run build` completes in under 30 seconds.

---

## 9. Phase 8 — Recovery Documentation

For each completed issue, record:

| Field | Value |
|---|---|
| ID | SP-OAPI-00X |
| Status | FIXED / PARTIALLY FIXED / NEEDS REVIEW |
| Implementation date | YYYY-MM-DD |
| Files modified | list |
| Validation evidence | link to test result, build output, GSC screenshot |
| Regression result | PASS / FAIL |
| Notes | any caveats |

Keep this log in the same commit message or a separate `IMPLEMENTATION_LOG-api-documentation-openapi.md` if required by the project workflow.

---

## 10. Phase 9 — Master Checklist Update

After each fix, update the master checklist with the appropriate status:

- ✅ **FIXED** — validated with evidence.
- ⚠ **PARTIALLY FIXED** — improvement made but further work needed.
- ❌ **FAILED** — fix did not work or caused regression.
- 🔁 **NEEDS REVIEW** — awaiting GSC or tool re-check.
- 🆕 **NEW ISSUE** — discovered during recovery.

Do not mark any P0 issue as FIXED until it is validated in the built output.

---

## 11. Phase 10 — Recovery Phase Report

### Problems fixed (planned)
- EN FAQ `\n` code rendering.
- FAQ monolith reduced to 8 questions.
- JSON-LD/visible FAQ truncation removed.
- EN/ES parity restored.
- Internal links and practical content added.

### Problems remaining (post-recovery monitoring)
- Domain authority deficit cannot be fixed from this page alone.
- CTR lift must be confirmed in GSC after re-crawl.

### New issues to watch
- Any `RecipeArticle.astro` change may affect other recipes with >10 FAQs. Spot-check and consider a site-wide FAQ policy.

### Regressions
- None expected if the implementation sequence is followed and builds pass.

### Next priorities
1. Monitor GSC for 2–4 weeks.
2. If CTR does not improve, test meta description.
3. Build out topic gap pages (AsyncAPI, governance, client generation).

### Estimated remaining work
- Recovery implementation: 1–2 days.
- Monitoring and iteration: 2–4 weeks.

---

## 12. Phase 11 — Final Validation

Before closing recovery, re-run the full audit on this resource:

1. **Architecture:** Still Astro SSG, no backend, static output.
2. **Googlebot rendering:** All content in raw HTML, 0% JS dependency.
3. **Indexability:** No noindex, self-canonical, correct hreflang, in sitemap.
4. **Internal linking:** All related resources and new body links valid.
5. **Content quality:** FAQ ≤10 questions, information density >60%, AI detection <30%.
6. **Helpful content signal:** First-person experience, clear trade-offs, no generic reference dumps.
7. **EEAT:** Author `Person` schema with `url` and `sameAs`; link to author profile.
8. **Accessibility:** FAQ `<dl>`/`dt`/`dd` structure preserved; alt text on new images.
9. **Performance:** Lighthouse score ≥90.
10. **Structured data:** Valid `TechArticle` + `BreadcrumbList` + `FAQPage` with all 8 Q&A pairs.
11. **Core Web Vitals:** LCP, INP, CLS green.
12. **Search visibility:** GSC shows re-crawl and stable/improving CTR.

---

## 13. Phase 12 — Recovery Score

| Category | Current | Target after recovery | Weight |
|---|---|---|---|
| Technical foundation | 88 | 92 | 15% |
| Indexability / crawlability | 95 | 95 | 10% |
| Rendering | 100 | 100 | 10% |
| Structured data completeness | 60 | 95 | 10% |
| Content quality | 60 | 85 | 20% |
| Helpful content / AI footprint | 45 | 80 | 15% |
| Internal linking | 70 | 85 | 10% |
| EEAT | 55 | 75 | 5% |
| CTR / search visibility | 25 | 60 | 5% |
| **Overall recovery score** | **62** | **86** | 100% |

*Current overall is an estimate based on the averaged audit scores (Forensic 72, Content-Audit 72, SEO-360 69, CTR 0.62%).*

---

## 14. Final Questions

1. **Which issues were successfully fixed?** All P0 and most P1 issues are fixed when the recovery is complete and validated. The title-truncation bug was already fixed before this recovery.
2. **Which issues still remain?** Domain authority deficit and external EEAT signals; these require backlinks and time, not on-page changes.
3. **Which issues require manual intervention?** GSC re-index request, CTR monitoring, OG image design, diagram design, and editorial decisions about which 8 FAQs to keep.
4. **Which fixes could generate regressions?** Shared component changes (`RecipeArticle.astro`, `lib/content.ts`) may affect other recipes; spot-check is required.
5. **Which fixes produce the greatest improvement?** FAQ condensation + code reformatting (content quality, AI signal), JSON-LD expansion (rich results), and internal linking (cluster authority).
6. **Is the resource technically ready for Google to crawl again?** Yes, after P0 fixes and a successful build.
7. **Should a new sitemap be submitted?** Only if the build process regenerates `sitemap.xml` with the same `lastmod`; otherwise the existing sitemap is still valid because URLs do not change.
8. **Should indexing be requested?** Yes — request re-indexing of both EN and ES URLs via GSC after deployment.
9. **Is the resource ready for a Post-Recovery Validation Audit?** Yes, after all P0/P1 fixes and the 2–4 week monitoring window.
10. **If this resource were owned by my company, would I approve the recovery?** Yes, conditional on the FAQ being condensed to ≤10 questions with proper code formatting and all 8 included in JSON-LD. The main body is already high quality; the recovery removes the clear blockers and preserves the strong technical foundation.

---

*Generated for `api-documentation-openapi` on StackPractices. All findings are supported by evidence from the source files and existing audits. No Angular or qapractices findings were carried forward.*
